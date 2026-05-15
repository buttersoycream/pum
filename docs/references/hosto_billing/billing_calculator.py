"""항목별 본인부담금 계산 엔진.

진료비 세부 항목(진찰료, 검사비, 약값 등)과 환자 조건(산정특례, 의료급여 등)을
매칭하여 항목별 본인부담률/본인부담금을 산출한다.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import settings
from app.core import action_master, drug_master


@dataclass
class BillingItemCalc:
    category: str
    original_amount: int
    coverage_type: str  # 급여, 비급여, 선별급여
    copayment_rate: float  # 0.0 ~ 1.0
    copayment_amount: int
    discount_source: str
    fee_code: str | None = None
    item_name: str | None = None
    catalog_status: str = "emr_verify_only"
    # 약제 마스터 enrichment. fee_code가 약제 제품코드로 마스터에 등재된
    # 경우 채워진다. UI에서 "상한금액 X원 / 업체 Y / 전문약" 같은 검증
    # 보조 정보로 노출. 자동 단가 초과 차단은 별도 게이트에서 다룬다 —
    # 라인 amount만 가지고는 (수량 정보가 없어) false positive 위험.
    drug_info: dict | None = None
    # 행위 마스터 enrichment. 약값이 아닌 라인 (진찰료/검사료/처치료/
    # 입원료 등) 에서 fee_code 가 HIRA 행위코드(5자리, AA154 등)로 매칭
    # 되면 상대가치점수·분류번호 등을 부착. 단가 = 점수 × 환산지수 로
    # 정밀 비교 가능 (다만 자동 차단은 별도 게이트에서 결정).
    action_info: dict | None = None


@dataclass
class TotalCopayCandidate:
    amount: int
    source: str
    effective_rate: float | None = None


# 산정특례 본인부담률 (급여 항목만 적용)
SANJEONG_SEVERE = {"암", "뇌혈관", "심장", "중증화상"}  # 5%
SANJEONG_MODERATE = {"희귀질환", "중증난치"}  # 10%

# 선별급여 기본 본인부담률 (항목별로 다를 수 있으나 기본값)
SELECTIVE_COPAY_DEFAULT = 0.50


class PolicyRuleLookup:
    """PolicyRule DB에서 환자 조건에 맞는 룰을 조회.

    기본값은 비활성이다. 현재 PolicyRule 테이블에는 크롤러/AI가 생성한
    룰도 같이 들어오므로, 수동 검수 승격 체계가 생기기 전까지 계산 금액을
    바꾸지 못하게 막는다.
    """

    def __init__(self, db: Session | None = None):
        self.db = db
        self._cache: list[dict] | None = None

    def find_rules(self, patient: dict, category: str = "") -> list[dict]:
        """환자 조건에 매칭하는 DB 룰 조회."""
        if not self.db or not settings.allow_policy_db_rules_in_calculation:
            return []

        if self._cache is None:
            self._load_rules(patient)

        results: list[dict] = []
        for rule in self._cache or []:
            if category and rule["item_category"] and rule["item_category"] != category:
                continue
            results.append(
                {
                    "rate": rule["copayment_rate"],
                    "copayment_type": rule["copayment_type"],
                    "source": f"[DB] {rule['source']}",
                    "status": rule["verification_status"],
                }
            )
        return results

    def _load_rules(self, patient: dict):
        """환자 조건에 맞는 active+유효한 룰을 DB에서 한번에 로드."""
        from app.models.models import PolicyRule

        now = datetime.now()
        query = (
            self.db.query(PolicyRule)
            .filter(PolicyRule.verification_status != "rejected")
            .filter(
                (PolicyRule.effective_date.is_(None)) | (PolicyRule.effective_date <= now)
            )
            .filter(
                (PolicyRule.expiry_date.is_(None)) | (PolicyRule.expiry_date > now)
            )
        )

        insurance = patient.get("insurance_type", "")
        sanjeong = patient.get("sanjeong_special", "없음")

        condition_filters = []
        if insurance:
            condition_filters.append(insurance)
        if sanjeong != "없음":
            condition_filters.append(sanjeong)

        if condition_filters:
            from sqlalchemy import or_

            query = query.filter(
                or_(
                    PolicyRule.condition_value.in_(condition_filters),
                    PolicyRule.insurance_type == insurance,
                    PolicyRule.condition_type == "general",
                )
            )

        rows = query.all()
        self._cache = []
        for rule in rows:
            source = f"{rule.condition_type}:{rule.condition_value}"
            if rule.policy_metadata:
                source = rule.policy_metadata.title[:50]

            self._cache.append(
                {
                    "item_category": rule.item_category,
                    "copayment_rate": rule.copayment_rate if rule.copayment_rate is not None else 1.0,
                    "copayment_type": rule.copayment_type or "percentage",
                    "source": source,
                    "verification_status": rule.verification_status,
                }
            )


def calculate_billing_breakdown(
    patient: dict,
    billing_items: list[dict],
    db: Session | None = None,
) -> dict | None:
    """환자 조건과 진료비 항목을 받아 항목별 본인부담금을 계산한다.

    Phase 1.5 routing: medical-aid outpatient encounters are evaluated by
    the declarative rule engine (``app.core.rules``) when the engine
    returns ``confidence == "확정"``. Anything else (NHI, inpatient,
    sanjeong overlap, fallback) stays on the legacy if/elif path until
    further phases land. The legacy code path is kept fully intact so a
    feature-flag flip can revert immediately.
    """
    if not billing_items:
        return None

    # Calculator-level safety: 의료급여 기관 종별과 차수가 모순되는 입력
    # (예: 상급종합병원 + 의료급여1차)이 legacy fallback으로 떨어져 1차
    # 정액 1,000원을 confidence="확정"으로 박는 사고를 차단. API 레벨의
    # input_validation 게이트가 같은 룰을 적용하지만, 분석 서비스를 거치지
    # 않는 직접 호출(테스트/스크립트/내부 도구)에서도 안전망이 필요하다.
    blocked = _check_medical_aid_institution_consistency(patient, billing_items)
    if blocked is not None:
        return blocked

    # DRG (질병군 포괄수가) 분기. drg_code + admission_days 가 있고
    # HIRA 일자별수가 표에 매칭되면 단일 정액으로 압축한 결과를 반환.
    # 매칭 실패(코드 미등재/부담률 결정 실패/입원일수 범위 초과 등)면 None
    # 으로 떨어져 기존 흐름이 처리. 라인 입력은 EMR 비교용으로만 보존.
    drg_result = _try_drg_lookup(patient, billing_items)
    if drg_result is not None:
        return drg_result

    if settings.phase1_rule_engine_enabled:
        engine_result = _try_phase1_engine(patient, billing_items)
        if engine_result is not None:
            return engine_result

    insurance = patient.get("insurance_type", "건강보험")
    sanjeong = patient.get("sanjeong_special", "없음")
    disability = patient.get("disability_grade", "없음")
    veteran = patient.get("veteran_type", "없음")
    treatment = patient.get("treatment_type", "외래")
    age = _to_int(patient.get("age", 0))
    is_under_six = bool(patient.get("is_infant", False)) or age < 6
    institution_type = patient.get("institution_type", "의원")
    institution_region = patient.get("institution_region", "동")
    medical_aid_level = patient.get("medical_aid_institution_level")
    if not medical_aid_level:
        medical_aid_level = _infer_medical_aid_level(institution_type)
    dispensing_type = patient.get("dispensing_type", "none")

    db_lookup = PolicyRuleLookup(db)

    results: list[BillingItemCalc] = []
    for item in billing_items:
        category = item.get("category", "기타")
        amount = max(int(item.get("amount", 0) or 0), 0)
        coverage = item.get("coverage_type", "급여")
        # 산정특례는 비급여/100분의100/선별급여, 그리고 산정특례 대상 상병과
        # 인과관계가 없는 행위에는 적용되지 않는다. 항목 단위 플래그가 켜진
        # 경우 sanjeong 보너스 후보를 만들지 않도록 sanjeong 입력을 무력화한다.
        item_excluded_from_sanjeong = bool(item.get("excluded_from_sanjeong", False))
        sanjeong_for_item = "없음" if item_excluded_from_sanjeong else sanjeong

        if coverage == "비급여":
            rate = 1.0
            source = "비급여 (전액 본인부담)"
        elif coverage == "선별급여":
            rate = SELECTIVE_COPAY_DEFAULT
            source = "선별급여 (50% 본인부담)"
        else:
            rate, source = _calculate_percentage_copayment(
                insurance=insurance,
                sanjeong=sanjeong_for_item,
                disability=disability,
                veteran=veteran,
                treatment=treatment,
                age=age,
                is_under_six=is_under_six,
                institution_type=institution_type,
                institution_region=institution_region,
                medical_aid_level=medical_aid_level,
                category=category,
                db_lookup=db_lookup,
            )
            if item_excluded_from_sanjeong and sanjeong != "없음":
                source = f"{source} (산정특례 적용 제외 항목)"

        # 마스터 enrichment — 카테고리에 따라 약제 또는 행위 마스터 중
        # 하나만 시도. category="약값"은 drug_master (제품코드 9자리),
        # 그 외는 action_master (HIRA 행위코드 5자리). 두 키 space가
        # 다르므로 카테고리 가드로 false hit 방지.
        drug_info_payload: dict | None = None
        action_info_payload: dict | None = None
        fee_code_value = item.get("fee_code")
        if fee_code_value:
            if category == "약값":
                drug_hit = drug_master.lookup(fee_code_value)
                if drug_hit is not None:
                    drug_info_payload = drug_master.to_enrichment_dict(drug_hit)
            else:
                action_hit = action_master.lookup(fee_code_value)
                if action_hit is not None:
                    action_info_payload = action_master.to_enrichment_dict(action_hit)

        results.append(
            BillingItemCalc(
                category=category,
                original_amount=amount,
                coverage_type=coverage,
                copayment_rate=rate,
                copayment_amount=round(amount * rate),
                discount_source=source,
                fee_code=fee_code_value,
                item_name=item.get("item_name"),
                catalog_status=item.get("catalog_status", "emr_verify_only"),
                drug_info=drug_info_payload,
                action_info=action_info_payload,
            )
        )

    covered_original_total = sum(
        r.original_amount for r in results if r.coverage_type == "급여"
    )
    total_candidates = _get_total_copay_candidates(
        insurance=insurance,
        sanjeong=sanjeong,
        treatment=treatment,
        age=age,
        institution_type=institution_type,
        medical_aid_level=medical_aid_level,
        dispensing_type=dispensing_type,
        covered_original_total=covered_original_total,
        db_lookup=db_lookup,
        category="",
    )
    _apply_best_total_copay_if_beneficial(results, total_candidates)

    total_original = sum(r.original_amount for r in results)
    total_copayment = sum(r.copayment_amount for r in results)
    total_discount = total_original - total_copayment
    # 공단/보험자에게 청구되는 금액. 비급여 항목은 copayment_rate=1.0 이라
    # 자연스럽게 0원으로 떨어진다. 선별급여는 50%만 청구된다.
    claim_amount = total_original - total_copayment
    emr_copayment_amount = _to_optional_int(patient.get("emr_copayment_amount"))
    collection_check = _build_collection_check(
        emr_copayment_amount=emr_copayment_amount,
        calculated_copayment=total_copayment,
    )

    has_unverified = any(
        r.discount_source
        and "[DB]" in r.discount_source
        and "[미검증]" in r.discount_source
        for r in results
    )

    if has_unverified:
        confidence = "확인 필요"
    elif db and any("[DB]" in (r.discount_source or "") for r in results):
        confidence = "확정"
    else:
        confidence = "확정"

    return {
        "items": [
            {
                "category": r.category,
                "original_amount": r.original_amount,
                "coverage_type": r.coverage_type,
                "copayment_rate": r.copayment_rate,
                "copayment_amount": r.copayment_amount,
                "discount_source": r.discount_source,
                "fee_code": r.fee_code,
                "item_name": r.item_name,
                "catalog_status": r.catalog_status,
                "drug_info": r.drug_info,
                "action_info": r.action_info,
            }
            for r in results
        ],
        "total_original": total_original,
        "total_copayment": total_copayment,
        "total_discount": total_discount,
        "claim_amount": claim_amount,
        "expected_refund_amount": None,
        "confidence": confidence,
        **collection_check,
    }


def _calculate_percentage_copayment(
    insurance: str,
    sanjeong: str,
    disability: str,
    veteran: str,
    treatment: str,
    age: int,
    is_under_six: bool,
    institution_type: str,
    institution_region: str,
    medical_aid_level: str,
    category: str,
    db_lookup: PolicyRuleLookup | None = None,
) -> tuple[float, str]:
    """급여 항목의 퍼센트 본인부담률을 계산한다."""
    candidates: list[tuple[float, str]] = []

    base_rate, base_source = _get_base_copayment_rate(
        insurance=insurance,
        treatment=treatment,
        age=age,
        is_under_six=is_under_six,
        institution_type=institution_type,
        institution_region=institution_region,
        medical_aid_level=medical_aid_level,
    )
    candidates.append((base_rate, base_source))

    if sanjeong == "결핵":
        candidates.append((0.0, "결핵 등록환자 무료치료"))

    if sanjeong in SANJEONG_SEVERE:
        candidates.append((0.05, f"산정특례 ({sanjeong}) 5%"))
    elif sanjeong in SANJEONG_MODERATE:
        candidates.append((0.10, f"산정특례 ({sanjeong}) 10%"))

    if insurance == "의료급여1종" and treatment == "입원":
        candidates.append((0.0, "의료급여1종 입원 면제"))
    if insurance in ("의료급여2종", "차상위본인부담경감") and treatment == "입원":
        label = (
            "의료급여2종 입원 10%"
            if insurance == "의료급여2종"
            else "차상위 본인부담경감 입원 10%"
        )
        candidates.append((0.10, label))

    if veteran != "없음":
        candidates.append((0.0, f"보훈대상자 ({veteran}) 면제"))

    if disability == "중증":
        candidates.append((0.0, "중증장애인 의료비 면제"))

    if db_lookup:
        patient_stub = {
            "insurance_type": insurance,
            "sanjeong_special": sanjeong,
        }
        db_rules = db_lookup.find_rules(patient_stub, category)
        for rule in db_rules:
            copayment_type = rule["copayment_type"]
            if copayment_type == "flat":
                continue

            rate = 0.0 if copayment_type == "exempt" else float(rule["rate"])
            source = rule["source"]
            if rule["status"] != "verified":
                source = f"{source} [미검증]"
            candidates.append((rate, source))

    return _pick_best_percentage_rate(candidates)


def _get_total_copay_candidates(
    insurance: str,
    sanjeong: str,
    treatment: str,
    age: int,
    institution_type: str,
    medical_aid_level: str,
    dispensing_type: str,
    covered_original_total: int,
    db_lookup: PolicyRuleLookup | None = None,
    category: str = "",
) -> list[TotalCopayCandidate]:
    """급여 합계에 1회 적용되는 정액/구간제 후보를 수집한다."""
    candidates: list[TotalCopayCandidate] = []

    if treatment == "외래" and insurance in ("의료급여1종", "의료급여2종"):
        fixed_amount = _get_medical_aid_outpatient_fixed_amount(
            insurance=insurance,
            medical_aid_level=medical_aid_level,
            dispensing_type=dispensing_type,
        )
        if fixed_amount is not None:
            candidates.append(
                TotalCopayCandidate(
                    amount=fixed_amount,
                    source=(
                        f"{insurance} {medical_aid_level} 외래 "
                        f"정액 {fixed_amount:,}원"
                    ),
                )
            )

    elderly_candidate = _get_elderly_clinic_outpatient_candidate(
        age=age,
        treatment=treatment,
        insurance=insurance,
        institution_type=institution_type,
        covered_original_total=covered_original_total,
    )
    if elderly_candidate is not None:
        candidates.append(elderly_candidate)

    if db_lookup:
        db_rules = db_lookup.find_rules(
            {
                "insurance_type": insurance,
                "sanjeong_special": sanjeong,
            },
            category,
        )
        for rule in db_rules:
            if rule["copayment_type"] != "flat":
                continue
            flat_amount = int(float(rule["rate"]))
            if flat_amount <= 0:
                continue
            source = rule["source"]
            if rule["status"] != "verified":
                source = f"{source} [미검증]"
            candidates.append(TotalCopayCandidate(amount=flat_amount, source=source))

    return candidates


def _apply_best_total_copay_if_beneficial(
    results: list[BillingItemCalc],
    total_candidates: list[TotalCopayCandidate],
) -> None:
    """정액/구간제가 유리한 경우 급여 항목 전체에 대해 1회 적용한다."""
    if not total_candidates:
        return

    covered_indexes = [
        idx
        for idx, item in enumerate(results)
        if item.coverage_type == "급여" and item.original_amount > 0
    ]
    if not covered_indexes:
        return

    covered_original_total = sum(results[idx].original_amount for idx in covered_indexes)
    covered_current_total = sum(results[idx].copayment_amount for idx in covered_indexes)

    best_candidate: TotalCopayCandidate | None = None
    best_amount = None
    for candidate in total_candidates:
        normalized = min(candidate.amount, covered_original_total)
        if best_amount is None or normalized < best_amount:
            best_amount = normalized
            best_candidate = TotalCopayCandidate(
                amount=normalized,
                source=candidate.source,
                effective_rate=candidate.effective_rate,
            )

    if best_candidate is None or best_candidate.amount >= covered_current_total:
        return

    if best_candidate.effective_rate is not None:
        remaining = best_candidate.amount
        for position, idx in enumerate(covered_indexes):
            item = results[idx]
            if position == len(covered_indexes) - 1:
                assigned = min(item.original_amount, remaining)
            else:
                assigned = min(
                    item.original_amount,
                    _round_amount(item.original_amount * best_candidate.effective_rate),
                    remaining,
                )
            item.copayment_rate = best_candidate.effective_rate
            item.copayment_amount = assigned
            item.discount_source = best_candidate.source
            remaining -= assigned
        return

    remaining = best_candidate.amount
    for idx in covered_indexes:
        item = results[idx]
        assigned = min(item.original_amount, remaining)
        item.copayment_amount = assigned
        item.copayment_rate = 0.0
        item.discount_source = best_candidate.source
        remaining -= assigned


def _get_base_copayment_rate(
    *,
    insurance: str,
    treatment: str,
    age: int,
    is_under_six: bool,
    institution_type: str,
    institution_region: str,
    medical_aid_level: str,
) -> tuple[float, str]:
    if insurance in ("의료급여1종", "의료급여2종"):
        return _get_medical_aid_percentage_rate(
            insurance=insurance,
            treatment=treatment,
            medical_aid_level=medical_aid_level,
        )

    return _get_health_insurance_base_rate(
        treatment=treatment,
        age=age,
        is_under_six=is_under_six,
        institution_type=institution_type,
        institution_region=institution_region,
    )


def _get_health_insurance_base_rate(
    *,
    treatment: str,
    age: int,
    is_under_six: bool,
    institution_type: str,
    institution_region: str,
) -> tuple[float, str]:
    """건강보험 기본 본인부담률.

    HIRA 기본표의 큰 분기만 반영한다. 항목별 예외(식대, 2·3인실,
    CT/MRI/PET, 의약분업 예외 등)는 별도 항목 모델이 생기기 전까지
    source 문구에 확인 필요성을 남긴다.
    """
    if treatment == "입원":
        if age < 2:
            return 0.0, "건강보험 입원 2세 미만 영유아 면제"
        if age <= 15:
            return 0.05, "건강보험 입원 15세 이하 5%"
        return 0.20, "건강보험 입원 일반 20%"

    if treatment == "응급":
        return 0.20, "건강보험 응급 기본 20% (세부 기준 확인 필요)"

    base_rates = {
        "상급종합병원": 0.60,
        "종합병원": 0.45 if institution_region == "읍면" else 0.50,
        "병원": 0.35 if institution_region == "읍면" else 0.40,
        "의원": 0.30,
        "보건기관": 0.30,
        "약국": 0.30,
    }
    rate = base_rates.get(institution_type, 0.30)
    source = f"건강보험 외래 {institution_type} 기본 {rate:.0%}"

    if age < 1:
        infant_rates = {
            "상급종합병원": 0.20,
            "종합병원": 0.15,
            "병원": 0.10,
            "의원": 0.05,
            "보건기관": 0.21,
            "약국": 0.30,
        }
        infant_rate = infant_rates.get(institution_type, min(rate, 0.05))
        return infant_rate, f"건강보험 외래 1세 미만 {institution_type} {infant_rate:.0%}"

    if is_under_six:
        under_six_rate = rate * 0.70
        return (
            under_six_rate,
            f"건강보험 외래 1세 이상 6세 미만 {institution_type} 일반률의 70%",
        )

    return rate, source


def _get_medical_aid_percentage_rate(
    *,
    insurance: str,
    treatment: str,
    medical_aid_level: str,
) -> tuple[float, str]:
    if treatment == "입원":
        if insurance == "의료급여1종":
            return 0.0, "의료급여1종 입원 면제"
        return 0.10, "의료급여2종 입원 10%"

    if treatment == "외래" and insurance == "의료급여2종" and medical_aid_level in {"2차", "3차"}:
        return 0.15, f"의료급여2종 {medical_aid_level} 외래 15%"

    # 1종 외래와 2종 1차 외래는 총액 정액 후보에서 처리한다.
    return 0.30, f"{insurance} {treatment} 기본 산정 전 정액/기관 기준 확인"


def _get_medical_aid_outpatient_fixed_amount(
    *,
    insurance: str,
    medical_aid_level: str,
    dispensing_type: str,
) -> int | None:
    if medical_aid_level == "보건기관":
        return 0
    if medical_aid_level == "약국":
        return 900 if dispensing_type == "in_house" else 500

    in_house = dispensing_type == "in_house"
    if insurance == "의료급여1종":
        if medical_aid_level == "1차":
            return 1500 if in_house else 1000
        if medical_aid_level == "2차":
            return 2000 if in_house else 1500
        if medical_aid_level == "3차":
            return 2500 if in_house else 2000

    if insurance == "의료급여2종" and medical_aid_level == "1차":
        return 1500 if in_house else 1000

    return None


def _get_elderly_clinic_outpatient_candidate(
    *,
    age: int,
    treatment: str,
    insurance: str,
    institution_type: str,
    covered_original_total: int,
) -> TotalCopayCandidate | None:
    if (
        insurance != "건강보험"
        or treatment != "외래"
        or institution_type != "의원"
        or age < 65
        or covered_original_total <= 0
    ):
        return None

    if covered_original_total <= 15000:
        return TotalCopayCandidate(
            amount=min(1500, covered_original_total),
            source="노인외래정액제 의원급 15,000원 이하 정액 1,500원",
        )
    if covered_original_total <= 20000:
        rate = 0.10
    elif covered_original_total <= 25000:
        rate = 0.20
    else:
        return None

    return TotalCopayCandidate(
        amount=_truncate_to_unit(covered_original_total * rate, 100),
        source=f"노인외래정액제 의원급 구간 {rate:.0%}",
        effective_rate=rate,
    )


def _infer_medical_aid_level(institution_type: str) -> str:
    if institution_type == "상급종합병원":
        return "3차"
    if institution_type in {"종합병원", "병원"}:
        return "2차"
    if institution_type == "약국":
        return "약국"
    if institution_type == "보건기관":
        return "보건기관"
    return "1차"


# 의료급여 기관 종별 ↔ 차수 매핑은 ``app.core.rules.expressions`` 가
# 단일 출처. 여기서는 import만 하여 alias로 노출 — 표가 split되어 한
# 가드만 풀리는 sync 사고를 막는다.
from app.core.rules.expressions import AID_LEVEL_BY_INSTITUTION as _MEDICAL_AID_LEVEL_BY_INSTITUTION  # noqa: E402


def _check_medical_aid_institution_consistency(
    patient: dict, billing_items: list[dict]
) -> dict | None:
    """의료급여 환자에서 기관 종별 ↔ 차수 모순 검출.

    모순이면 blocked 결과 dict 반환 (legacy로도 새 엔진으로도 위임 X).
    문제없으면 None 반환 → 정상 흐름 유지.
    """
    insurance = patient.get("insurance_type")
    if insurance not in ("의료급여1종", "의료급여2종"):
        return None
    institution_type = patient.get("institution_type")
    aid_level = patient.get("medical_aid_institution_level")
    if not institution_type or not aid_level:
        # 차수 미입력은 별도 케이스 (legacy의 _infer_medical_aid_level이 처리).
        # 여기서는 명시 입력된 값들의 모순만 차단.
        return None
    expected = _MEDICAL_AID_LEVEL_BY_INSTITUTION.get(institution_type)
    if expected is None or aid_level == expected:
        return None

    # 모순 감지 — calculator 레벨에서 즉시 차단.
    items_out = [
        {
            "category": item.get("category", "기타"),
            "original_amount": max(_to_int(item.get("amount", 0)), 0),
            "coverage_type": item.get("coverage_type", "급여"),
            "copayment_rate": 0.0,
            "copayment_amount": 0,
            "discount_source": "입력 모순으로 계산 보류",
            "fee_code": item.get("fee_code"),
            "item_name": item.get("item_name"),
            "catalog_status": item.get("catalog_status", "emr_verify_only"),
        }
        for item in billing_items
    ]
    total_original = sum(it["original_amount"] for it in items_out)
    emr = _to_optional_int(patient.get("emr_copayment_amount"))
    return {
        "items": items_out,
        "total_original": total_original,
        "total_copayment": 0,
        "total_discount": 0,
        "claim_amount": 0,
        "expected_refund_amount": None,
        "confidence": "수동 확인 권장",
        "engine": "blocked_at_calculator",
        "block_reason": (
            f"{institution_type}은(는) 의료급여 {expected}에 해당하는데, "
            f"입력값은 {aid_level}입니다. 둘 중 하나가 잘못 입력되었습니다."
        ),
        "emr_copayment_amount": emr,
        "copayment_difference": None,  # blocked 시 차액 숫자 노출 X
        "collection_status": "blocked",
        "collection_action": (
            f"의료급여 차수를 {expected}로 보정하거나 기관 종별을 다시 확인하세요."
        ),
    }


def _try_phase1_engine(patient: dict, billing_items: list[dict]) -> dict | None:
    """Route eligible outpatient encounters through the Phase 1 engine.

    Domains currently covered by decision tables:
        - 의료급여 외래 (medical_aid_outpatient.json) — overlap-free cases
          (no 산정특례/보훈/중증장애).
        - 건강보험 외래 일반 성인 (nhi_outpatient_general.json) — 만 6세
          이상 65세 미만, overlap-free.

    Returns the legacy-shaped breakdown dict when the engine produces a
    confident result for *every* line. Returns ``None`` to delegate to
    legacy whenever:
        - patient is outside the routed domains (NHI 영유아/노인, 입원,
          응급, 산정특례/보훈/중증장애 overlap),
        - any line falls back (engine confidence != "확정"), e.g. a 비급여
          line in a covered visit that mixes 급여+비급여,
        - the engine raises (try/except — never let an engine bug break
          analysis).

    Both paths must continue to produce identical results on the engine's
    covered domains during Phase 1.5. Parity is enforced by the existing
    골든 테스트 set + the routing tests in
    ``test_billing_calculator_phase1_routing.py``.
    """
    # Lazy import to avoid pulling rules package into modules that don't
    # need it during cold start.
    from app.core.rules import (
        Decision,
        LineItem as RuleLineItem,
        Patient as RulePatient,
        Visit as RuleVisit,
        evaluate as rules_evaluate,
    )

    insurance = patient.get("insurance_type", "건강보험")
    treatment = patient.get("treatment_type", "외래")
    if insurance not in ("의료급여1종", "의료급여2종", "건강보험"):
        return None
    if treatment != "외래":
        return None
    # Special programs (산정특례/보훈/중증장애) overlap with the 일반 결정표는
    # Phase 2 priority matrix가 들어오면 풀린다. Phase 1.5 단계에서는 일반
    # 케이스만 새 엔진으로 라우팅하고 특수 케이스는 legacy 유지.
    if patient.get("sanjeong_special", "없음") not in ("없음", None, ""):
        return None
    if patient.get("veteran_type", "없음") not in ("없음", None, ""):
        return None
    if patient.get("disability_grade", "없음") == "중증":
        return None
    # NHI 외래: 일반 성인(6~64) + 영유아(<6)는 새 엔진. 노인외래정액제
    # (>=65)는 구간 룰이라 다음 트랙. 라우팅 가드를 비대해지지 않게
    # 단일 조건 (65세 미만)으로 단순화.
    age = _to_int(patient.get("age", 0))
    if insurance == "건강보험" and age >= 65:
        return None

    rule_patient = RulePatient(
        age=_to_int(patient.get("age", 0)),
        gender=str(patient.get("gender") or "unknown"),
        insurance_type=insurance,
        medical_aid_institution_level=patient.get("medical_aid_institution_level"),
        sanjeong_special=patient.get("sanjeong_special", "없음") or "없음",
        disability_grade=patient.get("disability_grade", "없음") or "없음",
        veteran_type=patient.get("veteran_type", "없음") or "없음",
        is_pregnant=bool(patient.get("is_pregnant", False)),
        is_infant=bool(patient.get("is_infant", False)),
        kcd_codes=tuple(patient.get("kcd_codes", []) or []),
    )
    rule_visit = RuleVisit(
        treatment_type=treatment,
        institution_type=patient.get("institution_type", "의원"),
        institution_region=patient.get("institution_region", "동"),
        dispensing_type=patient.get("dispensing_type", "none"),
        emr_copayment_amount=_to_optional_int(patient.get("emr_copayment_amount")),
    )
    rule_lines = [
        RuleLineItem(
            category=item.get("category", "기타"),
            amount=max(_to_int(item.get("amount", 0)), 0),
            coverage_type=item.get("coverage_type", "급여"),
            fee_code=item.get("fee_code"),
            item_name=item.get("item_name"),
            catalog_status=item.get("catalog_status", "emr_verify_only"),
            excluded_from_sanjeong=bool(item.get("excluded_from_sanjeong", False)),
            quantity=int(item.get("quantity", 1) or 1),
        )
        for item in billing_items
    ]

    try:
        decision: Decision = rules_evaluate(rule_patient, rule_visit, rule_lines)
    except Exception:
        # Engine bug must never break analysis — fall back to legacy.
        return None

    # If any line fell back to the no-rule path, defer to legacy. This
    # preserves the Phase 1 invariant: the engine only owns cases it can
    # answer with full provenance.
    if decision.confidence != "확정":
        return None

    # Adapter — translate the engine Decision into the legacy dict shape
    # so downstream code (Tier 2 / Tier 3 / API serialization) stays
    # unchanged. Field names match billing_calculator's existing output.
    items_out = []
    for d in decision.line_decisions:
        # legacy 흐름과 동일하게 카테고리별 마스터 enrichment 부착.
        # 약값=drug_master, 그 외=action_master. 엔진 자체는 메타데이터
        # 를 모르므로 adapter 단계에서 한 번에 합친다.
        drug_info_payload: dict | None = None
        action_info_payload: dict | None = None
        if d.line_item.fee_code:
            if d.line_item.category == "약값":
                drug_hit = drug_master.lookup(d.line_item.fee_code)
                if drug_hit is not None:
                    drug_info_payload = drug_master.to_enrichment_dict(drug_hit)
            else:
                action_hit = action_master.lookup(d.line_item.fee_code)
                if action_hit is not None:
                    action_info_payload = action_master.to_enrichment_dict(action_hit)
        items_out.append(
            {
                "category": d.line_item.category,
                "original_amount": d.line_item.amount,
                "coverage_type": d.line_item.coverage_type,
                "copayment_rate": d.copayment_rate,
                "copayment_amount": d.copayment_amount,
                "discount_source": d.discount_source,
                "fee_code": d.line_item.fee_code,
                "item_name": d.line_item.item_name,
                "catalog_status": d.line_item.catalog_status,
                "drug_info": drug_info_payload,
                "action_info": action_info_payload,
            }
        )
    total_original = decision.total_original
    total_copayment = decision.total_copayment

    collection_check = _build_collection_check(
        emr_copayment_amount=_to_optional_int(patient.get("emr_copayment_amount")),
        calculated_copayment=total_copayment,
    )

    return {
        "items": items_out,
        "total_original": total_original,
        "total_copayment": total_copayment,
        "total_discount": total_original - total_copayment,
        "claim_amount": decision.total_claim,
        "expected_refund_amount": decision.expected_refund,
        "confidence": decision.confidence,
        # Phase 1 trace — preserve which decision table / rule applied.
        # Legacy callers ignore unknown keys; Phase 1.7 verbose UI may use them.
        "engine": "phase1",
        "rule_versions": decision.rule_versions,
        "rule_verification": decision.rule_verification,
        **collection_check,
    }


def _try_drg_lookup(patient: dict, billing_items: list[dict]) -> dict | None:
    """DRG(질병군 포괄수가) 일자별수가 lookup 라우팅.

    settings.enable_drg_routing 가 False 면 즉시 None. UI/import 필드가
    프론트에 아직 노출되지 않은 상태로 활성화하면 BillingBreakdown 의
    total_original/claim_amount 가 UI 의 '총 진료비'/'공단 청구액' 과
    충돌하는 사고 (Codex 검수 블로커 2) 가 발생한다. flag on 시점에
    UI 통합 + 결과 dict 의미 정렬을 함께 진행.

    매칭 성공시 단일 정액 본인부담금을 BillingBreakdown 형식으로 반환.
    실패(코드 미등재 / 부담률 결정 실패 / 입원일수 범위 초과 / 외래·
    응급 / 프론트 가드 미통과 등)면 None 으로 떨어져 기존 흐름(phase1/
    legacy)이 처리한다.

    입력 라인(billing_items)은 라우팅 결과에 보존 상태로 노출하지 않는다 —
    DRG는 본질적으로 묶음 정액이라 라인별 본인부담 분해가 의미 없음.
    대신 EMR 청구 합계와 HIRA 정액을 ``copayment_difference`` 로 비교.
    """
    from app.core import drg_calculator

    if not settings.enable_drg_routing:
        return None

    drg_code = patient.get("drg_code")
    admission_days = _to_optional_int(patient.get("admission_days"))
    drg_modifier = patient.get("drg_modifier") or "기본"
    if not drg_code or not admission_days:
        return None

    decision = drg_calculator.try_calculate(
        patient,
        drg_code=drg_code,
        admission_days=admission_days,
        modifier=drg_modifier,
    )
    if decision is None:
        return None

    amount = decision.copayment_amount
    item_out = {
        "category": "입원 (DRG 정액)",
        "original_amount": amount,
        "coverage_type": "급여",
        "copayment_rate": decision.copay_rate_pct / 100.0,
        "copayment_amount": amount,
        "discount_source": decision.source_label,
        "fee_code": decision.drg_code,
        "item_name": decision.drg_name,
        "catalog_status": "official_calculable",
        "drug_info": None,
        "action_info": None,
    }

    emr_copayment_amount = _to_optional_int(patient.get("emr_copayment_amount"))
    collection_check = _build_collection_check(
        emr_copayment_amount=emr_copayment_amount,
        calculated_copayment=amount,
    )

    return {
        "items": [item_out],
        "total_original": amount,
        "total_copayment": amount,
        "total_discount": 0,
        "claim_amount": 0,  # DRG 정액은 본인부담만 환자가 부담 — 라인 분해 X
        "expected_refund_amount": None,
        "confidence": "확정",
        "engine": "drg",
        "rule_versions": {
            "drg_rates": (drg_calculator.summary().version if drg_calculator.summary() else "unknown")
        },
        "rule_verification": {
            "drg_rates": (
                drg_calculator.summary().verification_status
                if drg_calculator.summary()
                else "unverified"
            )
        },
        **collection_check,
    }


def _to_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _to_optional_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed >= 0 else None


def _build_collection_check(
    *,
    emr_copayment_amount: int | None,
    calculated_copayment: int,
) -> dict:
    if emr_copayment_amount is None:
        return {
            "emr_copayment_amount": None,
            "copayment_difference": None,
            "collection_status": "missing_emr_amount",
            "collection_action": "EMR 수납 예정액을 입력하면 계산액과 차액을 비교할 수 있습니다.",
        }

    difference = emr_copayment_amount - calculated_copayment
    if difference == 0:
        return {
            "emr_copayment_amount": emr_copayment_amount,
            "copayment_difference": 0,
            "collection_status": "match",
            "collection_action": "EMR 수납 예정액과 계산액이 일치합니다.",
        }

    if difference > 0:
        return {
            "emr_copayment_amount": emr_copayment_amount,
            "copayment_difference": difference,
            "collection_status": "overcharge_risk",
            "collection_action": (
                f"EMR 수납 예정액이 계산액보다 {difference:,}원 높습니다. "
                "감면·본인부담 기준을 확인하고 수납액을 낮출지 검토하세요."
            ),
        }

    return {
        "emr_copayment_amount": emr_copayment_amount,
        "copayment_difference": difference,
        "collection_status": "undercharge_risk",
        "collection_action": (
            f"EMR 수납 예정액이 계산액보다 {abs(difference):,}원 낮습니다. "
            "기관 종별, 의료급여 차수, 산정특례 적용을 확인한 뒤 수납하세요."
        ),
    }


def _round_amount(value: float) -> int:
    return round(value)


def _truncate_to_unit(value: float, unit: int) -> int:
    if unit <= 1:
        return int(value)
    return int(value // unit) * unit


def _pick_best_percentage_rate(candidates: list[tuple[float, str]]) -> tuple[float, str]:
    """후보 퍼센트 중 환자에게 가장 유리한(낮은) 부담률을 선택."""
    best_rate = 1.0
    best_source = "기본"
    for rate, source in candidates:
        if rate < best_rate:
            best_rate = rate
            best_source = source
    return best_rate, best_source
