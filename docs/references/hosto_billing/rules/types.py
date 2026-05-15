"""Internal dataclasses for the rule engine.

Kept deliberately separate from ``app.schemas`` (Pydantic, API surface)
and ``app.models`` (SQLAlchemy, DB) so the engine can be unit-tested
without a database and so changes to API/DB shape don't ripple into
rule logic.

Convention: the engine never mutates these. Everything is rebuilt each
evaluation. ``Decision`` records the trace so we can answer
"why was 1,000원 the answer" months later.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Patient:
    """Snapshot of patient state used by the rule engine.

    Frozen so that during a single evaluation no expression can
    accidentally rewrite eligibility data (a real bug we have to avoid:
    "we mutated sanjeong_special to '없음' for an excluded line and then
    the next line saw '없음' too").
    """

    age: int
    gender: str  # male / female / unknown
    insurance_type: str  # 건강보험 / 의료급여1종 / 의료급여2종 / 차상위본인부담경감
    medical_aid_institution_level: str | None = None  # 1차 / 2차 / 3차 / 보건기관 / 약국
    sanjeong_special: str = "없음"  # 카테고리: 암 / 뇌혈관 / 심장 / ...
    sanjeong_code: str | None = None  # V코드 / 특정기호 (V193 등). None이면 카테고리만
    sanjeong_registered_at: date | None = None
    sanjeong_expires_at: date | None = None
    disability_grade: str = "없음"  # 없음 / 중증 / 경증
    veteran_type: str = "없음"  # 없음 / 국가유공자 / 보훈보상대상자 / ...
    is_pregnant: bool = False
    is_infant: bool = False  # 6세 미만 (UI default — engine recalcs from age)
    kcd_codes: tuple[str, ...] = ()
    spouse_id: int | None = None  # 부부 단위 시술 처리용 (난임 등)


@dataclass(frozen=True)
class Visit:
    """Encounter-level context."""

    treatment_type: str  # 외래 / 입원 / 응급
    institution_type: str  # 의원 / 병원 / 종합병원 / 상급종합병원 / 보건기관 / 약국
    institution_region: str  # 동 / 읍면
    dispensing_type: str = "none"  # none / prescription / in_house
    service_date: date | None = None
    emr_copayment_amount: int | None = None


@dataclass(frozen=True)
class LineItem:
    """A single line on the bill."""

    category: str  # 진찰료 / 검사비 / 약값 / 처치료 / 입원료 / 식대 / 기타
    amount: int  # 정가 (원)
    coverage_type: str  # 급여 / 비급여 / 선별급여 / 100분의100본인부담
    fee_code: str | None = None  # HIRA 수가코드 (있으면 정확 산정)
    item_name: str | None = None
    catalog_status: str = "emr_verify_only"  # official_calculable / emr_verify_only / manual
    excluded_from_sanjeong: bool = False
    quantity: int = 1


# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------


@dataclass
class LineDecision:
    """Per-line outcome with full provenance."""

    line_item: LineItem
    copayment_amount: int  # 환자 본인부담
    copayment_rate: float  # 0.0 ~ 1.0 (정액일 경우 0.0)
    applied_program: str | None  # "산정특례" / "의료급여1종" / "노인외래정액" / "일반" / None
    discount_source: str  # 사람이 읽을 수 있는 한 줄 설명
    matched_rule_id: str | None  # 결정표의 row id (재현/감사용)
    rule_version: str | None  # 결정표 버전 ID
    excluded_reasons: list[str] = field(default_factory=list)
    # 다른 후보 프로그램들 — 이 라인에 적용 가능했지만 우선순위에서 밀린 것들.
    # 화면에 "다른 후보: 노인외래정액 (적용 안 됨 — 산정특례 우선)" 식으로 보여줄 때 사용.
    candidate_programs: list[str] = field(default_factory=list)


@dataclass
class Decision:
    """Encounter-level outcome."""

    line_decisions: list[LineDecision]
    total_original: int
    total_copayment: int
    total_claim: int  # 공단/보험자 청구액 = total_original - total_copayment
    expected_refund: int | None  # 본인부담상한제 환급 추정 (단건은 보통 None)
    confidence: str  # 확정 / 확인 필요 / 수동 확인 권장
    applied_programs: list[str]  # 이번 분석에 실제 적용된 프로그램들 (중복 제거)
    warnings: list[str]
    rule_versions: dict[str, str] = field(default_factory=dict)
    # 결정표별 검수 상태. table_name → "unverified" / "verified" / "rejected".
    # admin/감사 화면에서 "이 분석이 미검수 룰을 사용했나" 즉시 확인 가능.
    rule_verification: dict[str, str] = field(default_factory=dict)
    # 진단/디버그용. 각 라인이 어떤 결정표/룰을 거쳤는지 요약.
    trace: list[dict[str, Any]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Rule provenance
# ---------------------------------------------------------------------------


@dataclass
class RuleSource:
    """Where a rule comes from. Attached to every decision row in JSON.

    ``verification_status`` is the curation state — "unverified" until a
    human curator dual-checks the decision table values against the
    actual 고시 PDF. Decision results expose this so admin UI can flag
    "이 분석은 미검수 룰을 사용했습니다" rather than treating every
    rule as authoritative.
    """

    legal_basis: str  # "보건복지부 고시 제2026-XX호" / "국민건강보험법 시행령 제19조" 등
    source_url: str | None = None
    verification_status: str = "unverified"  # unverified / verified / rejected
    verified_at: date | None = None
    verified_by: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None


@dataclass(frozen=True)
class TableMeta:
    """Decision table header — always loaded with the table."""

    name: str
    version: str  # e.g. "2026.01-medical-aid-outpatient"
    description: str
    source: RuleSource
