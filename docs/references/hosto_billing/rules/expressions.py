"""Pure expression library for the rule engine.

Each function encapsulates one piece of medical/legal domain knowledge so
decision tables can reference simple booleans/integers instead of
duplicating logic. All functions are:

    - Pure: no side effects, no DB access. Safe to call thousands of
      times during a single evaluation.
    - Frozen-input safe: never mutate Patient / Visit / LineItem.
    - Deterministic: given the same inputs, same output. Required for
      reproducing historical analyses against archived rule versions.

Naming convention: predicate functions are named ``is_*`` and return
bool. Lookups return Optional[X]. Categorization functions return
small enums (str literals).

If a function needs a date, accept it explicitly as a parameter rather
than calling ``date.today()`` — historical re-evaluation must give
the same answer regardless of when the function runs.
"""

from __future__ import annotations

from datetime import date

from app.core.rules.types import LineItem, Patient, Visit


# ---------------------------------------------------------------------------
# Insurance / eligibility
# ---------------------------------------------------------------------------


def is_nhi_insured(patient: Patient) -> bool:
    """건강보험 가입자인지."""
    return patient.insurance_type == "건강보험"


def is_medical_aid_recipient(patient: Patient) -> bool:
    """의료급여 수급자 (1종/2종 어느 쪽이든)."""
    return patient.insurance_type in ("의료급여1종", "의료급여2종")


def get_medical_aid_tier(patient: Patient) -> str | None:
    """의료급여 수급자라면 '1종' / '2종' 반환, 아니면 None."""
    if patient.insurance_type == "의료급여1종":
        return "1종"
    if patient.insurance_type == "의료급여2종":
        return "2종"
    return None


def is_차상위본인부담경감(patient: Patient) -> bool:
    return patient.insurance_type == "차상위본인부담경감"


# ---------------------------------------------------------------------------
# Institution
# ---------------------------------------------------------------------------


_TIER_BY_TYPE: dict[str, str] = {
    "상급종합병원": "tertiary",
    "종합병원": "general",
    "병원": "hospital",
    "의원": "clinic",
    "보건기관": "public_health",
    "약국": "pharmacy",
}

# 의료급여 차수와 기관 종별의 1:1 대응 — 단일 출처.
#
# Public 상수로 노출한다. 이 표를 참조하는 곳:
#     - app.core.input_validation (API 진입부 차단)
#     - app.core.billing_calculator (calculator 진입부 차단)
#     - app.core.rules.engine + 결정표 applicability (엔진 매칭 가드)
#
# 모두 이 표 한 곳에서 import하므로, 법령 변경으로 매핑이 바뀌면 여기만
# 갱신하면 세 가드가 동시에 따라간다. 표가 split되면 한쪽 가드만 풀려
# 나머지가 막아주지 못하는 sync 위험이 있다.
AID_LEVEL_BY_INSTITUTION: dict[str, str] = {
    "상급종합병원": "3차",
    "종합병원": "2차",
    "병원": "2차",
    "의원": "1차",
    "보건기관": "보건기관",
    "약국": "약국",
}

# Backward-compat private alias. 이 모듈 내부 코드만 사용 — 외부 import는
# public 상수를 써야 한다.
_AID_LEVEL_BY_INSTITUTION = AID_LEVEL_BY_INSTITUTION


def get_institution_tier(institution_type: str) -> str | None:
    """tertiary / general / hospital / clinic / public_health / pharmacy."""
    return _TIER_BY_TYPE.get(institution_type)


def is_clinic(visit: Visit) -> bool:
    return visit.institution_type == "의원"


def is_general_hospital(visit: Visit) -> bool:
    return visit.institution_type == "종합병원"


def is_tertiary_hospital(visit: Visit) -> bool:
    return visit.institution_type == "상급종합병원"


def is_pharmacy(visit: Visit) -> bool:
    return visit.institution_type == "약국"


def is_public_health(visit: Visit) -> bool:
    return visit.institution_type == "보건기관"


def derived_medical_aid_level(visit: Visit) -> str | None:
    """기관 종별로부터 자연 파생되는 의료급여 차수."""
    return _AID_LEVEL_BY_INSTITUTION.get(visit.institution_type)


def is_aid_level_consistent_with_institution(
    patient: Patient, visit: Visit
) -> bool:
    """기관 종별과 의료급여 차수가 모순되지 않는지.

    의료급여 환자가 아니면 검증 대상이 아니므로 True 반환.
    """
    if not is_medical_aid_recipient(patient):
        return True
    if patient.medical_aid_institution_level is None:
        return True  # 차수 미입력은 별도 차단
    expected = derived_medical_aid_level(visit)
    if expected is None:
        return True
    return patient.medical_aid_institution_level == expected


def is_eupmyeon(visit: Visit) -> bool:
    """읍면 지역 가산 적용 대상."""
    return visit.institution_region == "읍면"


def is_in_house_dispensing(visit: Visit) -> bool:
    """원내 직접 조제 (약사법 의약분업 예외)."""
    return visit.dispensing_type == "in_house"


# ---------------------------------------------------------------------------
# Patient demographics / age brackets
# ---------------------------------------------------------------------------


def is_under_age(patient: Patient, threshold: int) -> bool:
    return patient.age < threshold


def is_at_least_age(patient: Patient, threshold: int) -> bool:
    return patient.age >= threshold


def is_under_one(patient: Patient) -> bool:
    return patient.age < 1


def is_under_two(patient: Patient) -> bool:
    return patient.age < 2


def is_under_six(patient: Patient) -> bool:
    """만 6세 미만 영유아 (UI의 is_infant 플래그보다 나이 기준이 권위)."""
    return patient.age < 6


def is_pediatric_under_15(patient: Patient) -> bool:
    """입원 본인부담 5% 적용 대상 (만 15세 이하)."""
    return patient.age <= 15


def is_elderly(patient: Patient) -> bool:
    """노인외래정액제 등에서 사용하는 65세 이상."""
    return patient.age >= 65


def is_general_adult(patient: Patient) -> bool:
    """건강보험 일반 성인 본인부담률 적용 대상.

    영유아 차등(만 6세 미만)과 노인외래정액제(만 65세 이상)는 별도
    결정표가 우선 매칭되도록 일반 성인 결정표는 이 두 구간을 제외한다.
    """
    return 6 <= patient.age < 65


def is_infant_under_one(patient: Patient) -> bool:
    """만 1세 미만 — 기관 종별 차등 본인부담률 적용 대상.

    HIRA 기준 (만 1세 미만 외래): 의원 5% / 병원 10% / 종합병원 15% /
    상급종합병원 20% / 보건기관 21% / 약국 30%.
    """
    return patient.age < 1


def is_infant_one_to_five(patient: Patient) -> bool:
    """만 1세 이상 6세 미만 — 일반 본인부담률의 70% 적용.

    HIRA 기준: 외래 본인부담률 = 일반률 × 0.70. 결정표는 종별 × 70%
    결과를 미리 계산해 박는다 (의원 21% / 종합 35% / 상급종합 42% 등).
    """
    return 1 <= patient.age < 6


def has_no_special_program(patient: Patient) -> bool:
    """일반 본인부담률 결정표가 적용되는 케이스.

    산정특례/보훈/중증장애 어느 것이든 등록되어 있으면 별도 결정표가
    우선해야 하므로 이 결정표 매칭 자체를 막는다. Phase 2에서 priority
    matrix가 들어오면 이 가드는 풀고 매칭 후 우선순위로 처리.
    """
    if patient.sanjeong_special not in ("없음", None, ""):
        return False
    if patient.veteran_type not in ("없음", None, ""):
        return False
    if patient.disability_grade == "중증":
        return False
    return True


# ---------------------------------------------------------------------------
# Sanjeong special copayment
# ---------------------------------------------------------------------------


# 본인부담률 5% 적용 카테고리 (NHIS 산정특례 안내 기반).
SANJEONG_5_PERCENT = frozenset({"암", "뇌혈관", "심장", "중증화상", "중증외상"})

# 본인부담률 10% 적용 카테고리.
SANJEONG_10_PERCENT = frozenset({"희귀질환", "중증난치", "중증치매"})

# 본인부담 면제 카테고리 (결핵 등록 환자).
SANJEONG_EXEMPT = frozenset({"결핵"})


def is_sanjeong_registered(patient: Patient) -> bool:
    """산정특례 등록 여부 (카테고리만 입력돼도 등록으로 간주)."""
    return patient.sanjeong_special not in ("없음", None, "")


def is_sanjeong_active(patient: Patient, on_date: date) -> bool:
    """등록기간이 유효한지.

    기간 정보가 없으면 (None) "현재 시스템이 기간을 모름" — 활성으로 간주
    하되 호출자가 confidence 를 낮춰야 한다. 여기서 기간 미입력만으로
    바로 expired 처리하면 데이터 누락이 환자 손해로 이어진다.
    """
    if not is_sanjeong_registered(patient):
        return False
    if patient.sanjeong_expires_at is None:
        return True  # 기간 정보 없음 — 호출자가 metadata_missing 처리
    return on_date <= patient.sanjeong_expires_at


def get_sanjeong_base_rate(patient: Patient) -> float | None:
    """카테고리에 따른 산정특례 기본 본인부담률.

    Returns None when the patient is not registered. The decision table
    uses ``is_sanjeong_registered`` to gate the row, so this function
    only runs for registered patients.
    """
    cat = patient.sanjeong_special
    if cat in SANJEONG_5_PERCENT:
        return 0.05
    if cat in SANJEONG_10_PERCENT:
        return 0.10
    if cat in SANJEONG_EXEMPT:
        return 0.0
    return None


def is_line_eligible_for_sanjeong(line_item: LineItem) -> bool:
    """이 라인에 산정특례 본인부담률을 적용할 수 있는지.

    NHIS 기준: 비급여, 100분의100 본인부담, 선별급여, 그리고 산정특례
    대상 상병과 인과관계 없는 항목은 제외. 인과관계는 시스템이 알기
    어려우므로 ``excluded_from_sanjeong`` 플래그로 사용자가 표시한다.
    """
    if line_item.excluded_from_sanjeong:
        return False
    if line_item.coverage_type in ("비급여", "선별급여", "100분의100본인부담"):
        return False
    return True


# ---------------------------------------------------------------------------
# Disability / veteran reductions
# ---------------------------------------------------------------------------


def is_severe_disability(patient: Patient) -> bool:
    """중증 장애인 (의료비 면제 대상)."""
    return patient.disability_grade == "중증"


def is_mild_disability(patient: Patient) -> bool:
    return patient.disability_grade == "경증"


def is_veteran_eligible(patient: Patient) -> bool:
    """보훈/유공자 감면 대상 (면제)."""
    return patient.veteran_type not in ("없음", None, "")


# ---------------------------------------------------------------------------
# Line item categorization
# ---------------------------------------------------------------------------


def is_covered(line_item: LineItem) -> bool:
    """급여 항목."""
    return line_item.coverage_type == "급여"


def is_non_covered(line_item: LineItem) -> bool:
    """비급여 항목 — 환자 100% 부담."""
    return line_item.coverage_type == "비급여"


def is_selective_coverage(line_item: LineItem) -> bool:
    """선별급여 — 본인부담 50% 기본."""
    return line_item.coverage_type == "선별급여"


def is_full_self_pay(line_item: LineItem) -> bool:
    """100분의100 본인부담 (산정특례 적용 제외 행위)."""
    return line_item.coverage_type == "100분의100본인부담"


# ---------------------------------------------------------------------------
# Treatment type
# ---------------------------------------------------------------------------


def is_outpatient(visit: Visit) -> bool:
    return visit.treatment_type == "외래"


def is_inpatient(visit: Visit) -> bool:
    return visit.treatment_type == "입원"


def is_emergency(visit: Visit) -> bool:
    return visit.treatment_type == "응급"
