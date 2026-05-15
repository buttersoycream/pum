"""Phase 1 — Declarative billing rule engine.

This package replaces the procedural ``billing_calculator.py`` if/elif chain
with three explicit layers, following the user's spec:

    expressions.py        — pure functions encapsulating medical/legal
                            knowledge. Returns booleans, integers, enums.
                            Reusable across decision tables.

    decision_tables/      — JSON tables: "if these conditions match, the
                            outcome is X". Human-readable, version-stamped,
                            sourceable to a specific 고시/규정.

    priority_matrix.py    — when multiple programs (산정특례 / 의료급여 /
                            보훈 / 장애 / 노인외래정액 / 난임 …) overlap on
                            the same line item, this layer decides which
                            applies. Encodes the legal "exclusive vs stack"
                            rules separately from the per-program math.

    engine.py             — orchestrator. Evaluates expressions, matches
                            decision tables, resolves priorities, returns a
                            Decision dataclass with full provenance
                            (which rule id, which table version applied).

    versions.py           — rule/table version registry. Every Decision
                            carries the table version IDs used so historical
                            calculations can be reproduced.

    types.py              — internal dataclasses (Patient/Visit/LineItem/
                            Decision). NOT to be confused with SQLAlchemy
                            models or Pydantic schemas — those live in
                            ``app.models`` and ``app.schemas`` respectively.
                            The engine works on these typed dataclasses so
                            it can be unit-tested without a database.

Migration plan (Phase 1.5):
    The existing ``billing_calculator.calculate_billing_breakdown`` will
    progressively delegate to the engine, one domain at a time. Until full
    migration we keep both code paths behind a feature toggle so we can
    diff results on every encounter.
"""

from app.core.rules.engine import RuleEngine, evaluate
from app.core.rules.types import (
    Decision,
    LineDecision,
    LineItem,
    Patient,
    Visit,
)

__all__ = [
    "Decision",
    "LineDecision",
    "LineItem",
    "Patient",
    "RuleEngine",
    "Visit",
    "evaluate",
]
