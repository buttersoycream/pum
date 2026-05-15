"""Program priority resolution.

When a single line item is eligible for multiple programs (e.g. 산정특례
+ 의료급여 + 노인외래정액), the legal answer is *not* "pick the lowest
copayment" — it's a specific exclusivity rule per program pair.
This module encodes those rules separately from the per-program math
so changes to overlap policy don't ripple into individual decision
tables.

Phase 1 scope: medical_aid only. As we add 산정특례/노인/보훈/장애 결정표,
each new program-pair gets a row here with explicit ``selection`` and
``legal_basis``. Never default to "best for patient" — that is exactly
the silent-bug pattern the user wants to avoid.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


SelectionPolicy = Literal["exclusive", "stack", "best_for_patient", "forbidden"]


@dataclass(frozen=True)
class PriorityRule:
    """One row in the priority matrix.

    programs:    set of program names this rule applies to.
    selection:   how to resolve the overlap.
    primary:     when ``selection == "exclusive"``, which program wins.
    legal_basis: short citation. Required — every priority decision must
                 be traceable to a regulation, not "we figured it'd be
                 nice".
    """

    programs: frozenset[str]
    selection: SelectionPolicy
    primary: str | None
    legal_basis: str
    notes: str = ""


# Phase 1 — only medical_aid programs are wired up. Future phases will
# append rows for 산정특례 ↔ 의료급여, 노인외래정액 ↔ 산정특례, 등.
_PRIORITY_RULES: tuple[PriorityRule, ...] = (
    # When both fixed-amount and rate-based medical-aid rules match (e.g.
    # 의료급여2종 2차 외래 has a 정률 row but no 정액 row), the rate-based
    # row applies. This is structural — only one MA row should ever match
    # a given (insurance, level, dispensing) tuple. Ambiguity is treated
    # as a bug in the decision table, not as a runtime priority decision.
    PriorityRule(
        programs=frozenset({"의료급여1종", "의료급여2종", "의료급여_약국", "의료급여_보건기관_면제"}),
        selection="exclusive",
        primary=None,  # decided by which MA row matched, not by program name
        legal_basis="의료급여 본인부담금 고시: 동일 환자/방문에 두 개 이상의 의료급여 분류는 결정표 구조상 불가",
        notes="Phase 1 — 의료급여 단일 프로그램 안에서만 동작. Phase 2 이후 다른 프로그램과의 overlap 추가",
    ),
)


def resolve(applied_programs: list[str]) -> tuple[list[str], list[str]]:
    """Given the candidate programs that matched on a line, decide which
    survive and which are dropped.

    Returns: (kept_programs, dropped_programs)
    """
    if len(applied_programs) <= 1:
        return list(applied_programs), []

    program_set = set(applied_programs)
    kept = list(applied_programs)
    dropped: list[str] = []

    # Phase 1: any time multiple medical-aid programs collide, that's a
    # decision-table bug — surface it. Don't silently pick one.
    for rule in _PRIORITY_RULES:
        overlap = program_set & rule.programs
        if len(overlap) > 1 and rule.selection == "exclusive":
            # Multiple medical-aid programs matched the same line. Decision
            # tables should be exclusive within MA. Keep the first matched
            # for now and surface the conflict.
            primary = applied_programs[0]
            for p in applied_programs[1:]:
                if p in overlap:
                    dropped.append(p)
            return [primary], dropped

    return kept, dropped


def applicable_programs() -> set[str]:
    """All programs the priority matrix knows about. Used by audit."""
    out: set[str] = set()
    for rule in _PRIORITY_RULES:
        out |= rule.programs
    return out
