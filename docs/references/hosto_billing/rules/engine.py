"""Rule engine — orchestrates expressions × decision tables × priority.

Evaluation flow:

    1. ``load_decision_tables()`` — read every JSON in
       ``decision_tables/`` once, parse into ``DecisionTable`` dataclass.
       Cached at module level for the process lifetime.

    2. For each ``LineItem`` in a Visit:

       a. Check each table's ``applicability.predicates``. If any
          predicate is False, skip the table. (e.g. medical_aid_outpatient
          skipped for an NHI patient.)

       b. For each ``rule`` in the surviving tables, evaluate
          ``rule.conditions`` against (Patient, Visit, LineItem). All
          conditions must match for the rule to fire.

       c. Collect every (rule, table) match into a ``MatchSet``.

    3. ``priority_matrix.resolve()`` reduces the MatchSet to one
       ``LineDecision`` per line item.

    4. Aggregate line decisions into a ``Decision`` carrying full trace
       (which rule id, which table version) so historical analyses can
       be reproduced and auditors can see *why*.

Design rules:

    - The engine is read-only over its inputs. It NEVER mutates a
      Patient/Visit/LineItem. Frozen dataclasses enforce this.
    - The engine never picks "best for patient" by default. Every
      reduction step has a named ``priority_rule`` it can cite.
    - Unmatched lines (no decision table fired) are returned as
      ``LineDecision`` with copayment_rate based on coverage_type
      fallback (비급여=1.0, 선별급여=0.5, 급여=fallback or unset).
      Phase 1 scope: only 의료급여 외래. NHI / sanjeong / elderly
      flat-rate are still served by the legacy calculator until later
      phases land.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

from app.core.rules import expressions as expr
from app.core.rules.priority_matrix import resolve as resolve_priority
from app.core.rules.types import (
    Decision,
    LineDecision,
    LineItem,
    Patient,
    RuleSource,
    TableMeta,
    Visit,
)


# ---------------------------------------------------------------------------
# Decision table dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DecisionRule:
    id: str
    description: str
    conditions: dict[str, Any]
    outcomes: dict[str, Any]


@dataclass(frozen=True)
class DecisionTable:
    meta: TableMeta
    applicability: tuple[str, ...]  # predicate names (Patient/Visit-level)
    rules: tuple[DecisionRule, ...]


# ---------------------------------------------------------------------------
# Predicate registry
# ---------------------------------------------------------------------------

# Applicability predicates take (Patient, Visit) and return bool.
# Conditions inside rules take (Patient, Visit, LineItem) implicitly via
# field comparison. Adding a new predicate name here lets a JSON table
# reference it — so the JSON is human-readable but the matching is
# Python-typed.

_ApplicabilityFn = Callable[[Patient, Visit], bool]

_APPLICABILITY_PREDICATES: dict[str, _ApplicabilityFn] = {
    "is_medical_aid_recipient": lambda p, v: expr.is_medical_aid_recipient(p),
    "is_nhi_insured": lambda p, v: expr.is_nhi_insured(p),
    "is_outpatient": lambda p, v: expr.is_outpatient(v),
    "is_inpatient": lambda p, v: expr.is_inpatient(v),
    "is_emergency": lambda p, v: expr.is_emergency(v),
    "is_aid_level_consistent_with_institution": expr.is_aid_level_consistent_with_institution,
    "is_elderly": lambda p, v: expr.is_elderly(p),
    "is_general_adult": lambda p, v: expr.is_general_adult(p),
    "is_infant_under_one": lambda p, v: expr.is_infant_under_one(p),
    "is_infant_one_to_five": lambda p, v: expr.is_infant_one_to_five(p),
    "has_no_special_program": lambda p, v: expr.has_no_special_program(p),
    "is_clinic": lambda p, v: expr.is_clinic(v),
    "is_pharmacy": lambda p, v: expr.is_pharmacy(v),
    "is_public_health": lambda p, v: expr.is_public_health(v),
}


def _eval_applicability(predicates: tuple[str, ...], p: Patient, v: Visit) -> bool:
    for name in predicates:
        fn = _APPLICABILITY_PREDICATES.get(name)
        if fn is None:
            raise RuleEngineError(f"Unknown applicability predicate: {name}")
        if not fn(p, v):
            return False
    return True


# ---------------------------------------------------------------------------
# Condition matching
# ---------------------------------------------------------------------------


def _resolve_condition_value(
    field_name: str, patient: Patient, visit: Visit, line: LineItem
) -> Any:
    """Map a JSON condition key to the corresponding input attribute.

    Adding a new condition key requires adding a row here. Keeping the
    map explicit prevents JSON typos from silently matching nothing.
    """
    if field_name == "insurance_type":
        return patient.insurance_type
    if field_name == "medical_aid_level":
        return patient.medical_aid_institution_level
    if field_name == "treatment_type":
        return visit.treatment_type
    if field_name == "institution_type":
        return visit.institution_type
    if field_name == "institution_region":
        return visit.institution_region
    if field_name == "dispensing_type":
        return visit.dispensing_type
    if field_name == "coverage_type":
        return line.coverage_type
    if field_name == "category":
        return line.category
    if field_name == "sanjeong_special":
        return patient.sanjeong_special
    raise RuleEngineError(f"Unknown condition field: {field_name}")


def _condition_matches(expected: Any, actual: Any) -> bool:
    """JSON condition value can be a scalar (exact match) or a list
    (set membership). ``None`` in JSON only matches ``None`` actual.
    """
    if isinstance(expected, list):
        return actual in expected
    return actual == expected


def _rule_matches(
    rule: DecisionRule, patient: Patient, visit: Visit, line: LineItem
) -> bool:
    for field_name, expected in rule.conditions.items():
        actual = _resolve_condition_value(field_name, patient, visit, line)
        if not _condition_matches(expected, actual):
            return False
    return True


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


class RuleEngineError(RuntimeError):
    """Raised when a decision table is malformed or references unknown
    predicates/fields. These are bugs in the table, not user input
    issues — they should fail loud at load time."""


_TABLES_DIR = Path(__file__).parent / "decision_tables"
_LOADED_TABLES: list[DecisionTable] | None = None


def load_decision_tables(force_reload: bool = False) -> list[DecisionTable]:
    """Read every ``*.json`` in the decision_tables directory.

    Cached at module level. Pass ``force_reload=True`` in tests / hot
    reload scenarios.
    """
    global _LOADED_TABLES
    if _LOADED_TABLES is not None and not force_reload:
        return _LOADED_TABLES

    tables: list[DecisionTable] = []
    for path in sorted(_TABLES_DIR.glob("*.json")):
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        tables.append(_parse_table(data))
    _LOADED_TABLES = tables
    return tables


def _parse_table(data: dict[str, Any]) -> DecisionTable:
    src = data.get("source") or {}
    verification_status = src.get("verification_status", "unverified")
    if verification_status not in ("unverified", "verified", "rejected"):
        # 알 수 없는 값은 안전한 default 로 강등 — 결정표 작성자가 typo
        # 했다고 verified 로 통과시키지 않는다.
        verification_status = "unverified"
    meta = TableMeta(
        name=data["name"],
        version=data["version"],
        description=data.get("description", ""),
        source=RuleSource(
            legal_basis=src.get("legal_basis", ""),
            source_url=src.get("source_url"),
            verification_status=verification_status,
            verified_by=src.get("verified_by"),
            effective_from=None,  # date parsing skipped in Phase 1
            effective_to=None,
        ),
    )
    applicability = tuple((data.get("applicability") or {}).get("predicates", []))
    rules = tuple(
        DecisionRule(
            id=rule["id"],
            description=rule.get("description", ""),
            conditions=rule.get("conditions", {}),
            outcomes=rule.get("outcomes", {}),
        )
        for rule in data.get("rules", [])
    )
    return DecisionTable(meta=meta, applicability=applicability, rules=rules)


@dataclass
class _LineMatch:
    table: DecisionTable
    rule: DecisionRule


def _find_matches_for_line(
    tables: list[DecisionTable], patient: Patient, visit: Visit, line: LineItem
) -> list[_LineMatch]:
    matches: list[_LineMatch] = []
    for table in tables:
        if not _eval_applicability(table.applicability, patient, visit):
            continue
        for rule in table.rules:
            if _rule_matches(rule, patient, visit, line):
                matches.append(_LineMatch(table=table, rule=rule))
    return matches


# ---------------------------------------------------------------------------
# Outcome interpretation — translates rule outcomes into a copayment number
# ---------------------------------------------------------------------------


def _apply_outcome_to_line(
    line: LineItem,
    rule: DecisionRule,
    table: DecisionTable,
    flat_already_applied: bool,
) -> LineDecision:
    """Translate one rule's ``outcomes`` block into a LineDecision.

    Outcome shapes supported:
        copayment_type=flat_per_visit, copayment_amount=N
            정액 1회 적용. ``flat_already_applied=True`` 이면 같은 방문의
            추가 라인에는 0원으로 (정액은 한 번만).
        copayment_type=rate_per_line, copayment_rate=R
            라인별 금액 × R.
        copayment_type=exempt
            본인부담 0원.
    """
    outcomes = rule.outcomes
    copayment_type = outcomes.get("copayment_type")
    applied_program = outcomes.get("applied_program", "")
    source_label = f"{table.meta.name} / {rule.id}"

    if copayment_type == "flat_per_visit":
        flat_amount = int(outcomes.get("copayment_amount", 0))
        amount = 0 if flat_already_applied else min(flat_amount, line.amount)
        return LineDecision(
            line_item=line,
            copayment_amount=amount,
            copayment_rate=0.0,
            applied_program=applied_program,
            discount_source=outcomes.get("description") or rule.description or source_label,
            matched_rule_id=rule.id,
            rule_version=table.meta.version,
        )

    if copayment_type == "rate_per_line":
        rate = float(outcomes.get("copayment_rate", 1.0))
        return LineDecision(
            line_item=line,
            copayment_amount=round(line.amount * rate),
            copayment_rate=rate,
            applied_program=applied_program,
            discount_source=outcomes.get("description") or rule.description or source_label,
            matched_rule_id=rule.id,
            rule_version=table.meta.version,
        )

    if copayment_type == "exempt":
        return LineDecision(
            line_item=line,
            copayment_amount=0,
            copayment_rate=0.0,
            applied_program=applied_program,
            discount_source=rule.description or source_label,
            matched_rule_id=rule.id,
            rule_version=table.meta.version,
        )

    raise RuleEngineError(
        f"Rule {rule.id}: unknown copayment_type {copayment_type!r}"
    )


def _fallback_decision(line: LineItem) -> LineDecision:
    """No table matched. Use coverage_type as a structural fallback.

    This is the only place where the engine produces a number without a
    rule-id citation. The Decision-level confidence drops to "확인 필요"
    when any line falls back.
    """
    if line.coverage_type == "비급여":
        return LineDecision(
            line_item=line,
            copayment_amount=line.amount,
            copayment_rate=1.0,
            applied_program=None,
            discount_source="비급여 (전액 본인부담)",
            matched_rule_id=None,
            rule_version=None,
        )
    if line.coverage_type == "선별급여":
        amount = round(line.amount * 0.5)
        return LineDecision(
            line_item=line,
            copayment_amount=amount,
            copayment_rate=0.5,
            applied_program=None,
            discount_source="선별급여 (50% 본인부담)",
            matched_rule_id=None,
            rule_version=None,
        )
    # 급여 / 100분의100 등 — 결정표 미커버. Phase 1 한계.
    return LineDecision(
        line_item=line,
        copayment_amount=line.amount,
        copayment_rate=1.0,
        applied_program=None,
        discount_source="규칙 매칭 없음 — 추가 결정표 필요",
        matched_rule_id=None,
        rule_version=None,
        excluded_reasons=["no_decision_table_matched"],
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


@dataclass
class RuleEngine:
    """Stateless wrapper. Re-loads tables on construction so tests can
    pass alternative table sets."""

    tables: list[DecisionTable] = field(default_factory=load_decision_tables)

    def evaluate(
        self, patient: Patient, visit: Visit, line_items: list[LineItem]
    ) -> Decision:
        return evaluate(patient, visit, line_items, tables=self.tables)


def evaluate(
    patient: Patient,
    visit: Visit,
    line_items: list[LineItem],
    *,
    tables: list[DecisionTable] | None = None,
) -> Decision:
    """Run the engine for one encounter."""
    tables = tables if tables is not None else load_decision_tables()

    line_decisions: list[LineDecision] = []
    applied_programs_set: set[str] = set()
    rule_versions: dict[str, str] = {}
    rule_verification: dict[str, str] = {}
    trace: list[dict[str, Any]] = []
    flat_used = False  # 정액제는 같은 방문에서 1회만

    for line in line_items:
        matches = _find_matches_for_line(tables, patient, visit, line)
        if not matches:
            decision = _fallback_decision(line)
            line_decisions.append(decision)
            trace.append(
                {
                    "line_category": line.category,
                    "fee_code": line.fee_code,
                    "matched_table": None,
                    "matched_rule": None,
                    "fallback": decision.discount_source,
                }
            )
            continue

        # Multiple matches → priority resolution. Phase 1 expects at most
        # 1 match per line under medical_aid; >1 means a table-level
        # ambiguity bug we want to surface, not silently dedupe.
        candidate_programs = [
            m.rule.outcomes.get("applied_program", "") for m in matches
        ]
        kept, dropped = resolve_priority(candidate_programs)

        # Pick the match whose program survived priority resolution. If
        # multiple survive (shouldn't in Phase 1), take the first stable.
        winner = matches[0]
        for m in matches:
            if m.rule.outcomes.get("applied_program") in kept:
                winner = m
                break

        decision = _apply_outcome_to_line(
            line, winner.rule, winner.table, flat_already_applied=flat_used
        )
        if decision.applied_program:
            applied_programs_set.add(decision.applied_program)
        if winner.rule.outcomes.get("copayment_type") == "flat_per_visit":
            flat_used = True
        if winner.table.meta.name not in rule_versions:
            rule_versions[winner.table.meta.name] = winner.table.meta.version
            rule_verification[winner.table.meta.name] = (
                winner.table.meta.source.verification_status
            )
        decision.candidate_programs = [
            p for p in candidate_programs if p and p != decision.applied_program
        ]
        if dropped:
            decision.excluded_reasons.append(
                f"priority_dropped: {', '.join(dropped)}"
            )

        line_decisions.append(decision)
        trace.append(
            {
                "line_category": line.category,
                "fee_code": line.fee_code,
                "matched_table": winner.table.meta.name,
                "matched_rule": winner.rule.id,
                "table_version": winner.table.meta.version,
                "applied_program": decision.applied_program,
            }
        )

    total_original = sum(line.amount for line in line_items)
    total_copayment = sum(d.copayment_amount for d in line_decisions)
    total_claim = total_original - total_copayment

    has_fallback = any(d.matched_rule_id is None for d in line_decisions)
    confidence = "확정" if not has_fallback else "확인 필요"

    return Decision(
        line_decisions=line_decisions,
        total_original=total_original,
        total_copayment=total_copayment,
        total_claim=total_claim,
        expected_refund=None,
        confidence=confidence,
        applied_programs=sorted(applied_programs_set),
        warnings=[],
        rule_versions=rule_versions,
        rule_verification=rule_verification,
        trace=trace,
    )
