from dataclasses import dataclass, field

from app.core.normalization import UNKNOWN_GENDER, is_female, is_male, normalize_gender


@dataclass
class RuleResult:
    exemptions: list[dict] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    alert_level: str = "green"  # green / red / blue


def run_rules(patient: dict) -> RuleResult:
    result = RuleResult()
    has_exemption = False
    gender = normalize_gender(patient.get("gender"))

    # --- Gender-voucher mismatch check ---
    if patient.get("is_pregnant") and is_male(gender):
        result.warnings.append(
            "성별 불일치: 남성 환자에게 임산부 바우처를 적용할 수 없습니다"
        )
        result.alert_level = "red"
    elif patient.get("is_pregnant") and gender == UNKNOWN_GENDER:
        result.warnings.append(
            "성별 확인 필요: 성별이 확인되지 않아 임산부 바우처 적용 여부를 확정할 수 없습니다"
        )
        result.alert_level = "red"

    # --- 산정특례 ---
    sanjeong = patient.get("sanjeong_special", "없음")
    if sanjeong != "없음":
        rate = "5%" if sanjeong in ("암", "뇌혈관", "심장", "중증화상") else "10%"
        result.exemptions.append(
            {
                "name": "산정특례",
                "applicable": True,
                "reason": f"{sanjeong} 산정특례 등록 환자 — 본인부담률 {rate}",
                "copayment_rate": rate,
            }
        )
        has_exemption = True

    # --- 결핵 무료치료 ---
    if sanjeong == "결핵":
        result.exemptions.append(
            {
                "name": "결핵등록무료치료",
                "applicable": True,
                "reason": "결핵관리법에 따른 등록 환자 무료 치료 대상",
                "copayment_rate": "면제",
            }
        )

    # --- 의료급여 ---
    insurance = patient.get("insurance_type", "건강보험")
    if insurance in ("의료급여1종", "의료급여2종"):
        treatment = patient.get("treatment_type", "외래")
        if insurance == "의료급여1종":
            rate = "면제" if treatment == "입원" else "1,000원 정액"
        else:
            rate = "10%" if treatment == "입원" else "1,000원 정액"
        result.exemptions.append(
            {
                "name": "의료급여",
                "applicable": True,
                "reason": f"{insurance} 수급자 — {treatment} {rate}",
                "copayment_rate": rate,
            }
        )
        has_exemption = True

    # --- 차상위 본인부담경감 ---
    if insurance == "차상위본인부담경감":
        result.exemptions.append(
            {
                "name": "차상위본인부담경감",
                "applicable": True,
                "reason": "차상위 본인부담경감 대상자 — 의료급여 2종에 준하는 감면",
                "copayment_rate": "의료급여2종 준용",
            }
        )
        has_exemption = True

    # --- 장애인 의료비 지원 ---
    disability = patient.get("disability_grade", "없음")
    if disability != "없음":
        if disability == "중증":
            detail = "중증장애인 — 의료비 본인부담 경감 대상"
        else:
            detail = "경증장애인 — 일부 의료비 지원 대상"
        result.exemptions.append(
            {
                "name": "장애인의료비지원",
                "applicable": True,
                "reason": detail,
                "copayment_rate": "감면" if disability == "중증" else "일부 감면",
            }
        )
        has_exemption = True

    # --- 보훈대상자 ---
    veteran = patient.get("veteran_type", "없음")
    if veteran != "없음":
        result.exemptions.append(
            {
                "name": "보훈대상자감면",
                "applicable": True,
                "reason": f"{veteran} — 국가보훈부 의료지원 감면 대상",
                "copayment_rate": "면제 또는 감면",
            }
        )
        has_exemption = True

    # --- 노인 외래 정액제 (65세 이상 + 외래) ---
    age = patient.get("age", 0)
    treatment_type = patient.get("treatment_type", "외래")
    if age >= 65 and treatment_type == "외래":
        result.exemptions.append(
            {
                "name": "노인외래정액제",
                "applicable": True,
                "reason": f"{age}세 — 65세 이상 외래 정액제 적용 대상",
                "copayment_rate": "정액 1,500원",
            }
        )
        has_exemption = True

    # --- 영유아 본인부담 경감 (6세 미만) ---
    if age < 6 or patient.get("is_infant"):
        result.exemptions.append(
            {
                "name": "영유아본인부담경감",
                "applicable": True,
                "reason": "6세 미만 영유아 — 입원/외래 본인부담 경감",
                "copayment_rate": "면제 또는 5%",
            }
        )
        has_exemption = True

    # --- 임산부 바우처 (성별 불일치가 아닌 경우만) ---
    if patient.get("is_pregnant") and is_female(gender):
        result.exemptions.append(
            {
                "name": "임산부국민행복카드",
                "applicable": True,
                "reason": "임산부 — 국민행복카드(임신출산 진료비) 지원 대상",
                "copayment_rate": "바우처 100만원",
            }
        )
        has_exemption = True

    # Set alert level if not already red
    if result.alert_level != "red" and has_exemption:
        result.alert_level = "blue"

    return result
