"""OCR extraction service.

Uses Claude (multimodal) to read an uploaded receipt / billing slip
image or PDF and return a strict JSON payload shaped like ``PatientInput``.

Key discipline (see CLAUDE.md 정확성 최우선):
    * Never hallucinate amounts. If a field cannot be read confidently, the
      model is instructed to return ``null`` / placeholder and describe the
      gap in ``confidence_notes``.
    * All exceptions raised by the LLM client are normalised into
      :class:`OCRExtractionError` so callers can map them to HTTP errors
      without leaking internal stack traces.
"""

from __future__ import annotations

import json

from app.core import llm_client


class OCRExtractionError(RuntimeError):
    """Raised when LLM-based OCR extraction fails or returns an unusable payload."""


# OCR system instruction: hard-nosed anti-hallucination + JSON schema lock.
OCR_SYSTEM_PROMPT = """당신은 대한민국 병원 원무과의 영수증 / 진료비 계산서 OCR 전문가입니다.
업로드된 이미지나 PDF에서 환자 정보와 청구 항목을 추출합니다.

[절대 규칙 — 정확성 최우선]
1. 추측하지 마세요. 읽을 수 없거나 확실하지 않은 값은 반드시 null로 남기고 confidence_notes 에 사유를 적습니다.
2. 금액은 절대 추측하지 마세요. 문서에 명시된 숫자만 사용합니다. 원화 기호, 콤마, 공백은 제거하고 정수로 변환합니다.
3. 이름/주민번호/전화번호 같은 개인식별정보는 절대 응답에 포함하지 마세요. (비식별화 원칙)
4. 환자 정보가 보이지 않으면 해당 필드는 null 로 둡니다.
5. 청구 항목이 0개라도 괜찮습니다 — 빈 배열을 반환하고 confidence_notes 에 설명합니다.

[출력 포맷 — 반드시 이 JSON 만 출력, 마크다운 금지]
{
  "patient_input": {
    "age": <정수 또는 null>,
    "gender": "male" | "female" | null,
    "insurance_type": "건강보험" | "의료급여1종" | "의료급여2종" | "차상위본인부담경감" | null,
    "disability_grade": "없음" | "중증" | "경증" | null,
    "veteran_type": "없음" | "국가유공자" | "보훈보상대상자" | "5.18민주유공자" | "특수임무유공자" | null,
    "sanjeong_special": "없음" | "암" | "뇌혈관" | "심장" | "희귀질환" | "중증난치" | "결핵" | "중증화상" | null,
    "is_pregnant": <true/false, 불확실하면 false>,
    "is_infant": <true/false, 불확실하면 false>,
    "kcd_codes": [<문자열>, ...],
    "treatment_type": "외래" | "입원" | "응급" | null,
    "institution_type": "상급종합병원" | "종합병원" | "병원" | "의원" | "보건기관" | "약국" | null,
    "institution_region": "동" | "읍면" | null,
    "medical_aid_institution_level": "1차" | "2차" | "3차" | "보건기관" | "약국" | null,
    "dispensing_type": "none" | "prescription" | "in_house" | null,
    "emr_copayment_amount": <정수 또는 null>,
    "billing_items": [
      {
        "category": "진찰료" | "검사비" | "약값" | "처치료" | "입원료" | "식대" | "기타",
        "amount": <양의 정수>,
        "coverage_type": "급여" | "비급여" | "선별급여",
        "excluded_from_sanjeong": <true/false, 산정특례 대상 상병과 무관하다고 문서에 명확히 표시된 경우만 true>
      }
    ]
  },
  "confidence_notes": "<어느 필드가 불확실한지, 원본에서 무엇이 가려졌는지 자연어로 설명>",
  "raw_text": "<문서에서 읽은 전체 원문 텍스트 요약. 개인정보 제외>"
}

[필드 매핑 가이드]
- "진료비 계산서", "영수증" 등에서 환자의 나이, 성별, 보험 유형을 찾습니다.
- 항목 구분이 "급여/비급여/선별급여" 로 명확히 쓰여있지 않으면 "급여" 를 기본값으로 사용합니다.
- 항목명이 불명확하면 "기타" 로 분류합니다.
- 금액 합계나 "본인부담액" 은 billing_items 에 포함하지 마세요. 세부 항목만 포함합니다.
- 문서에 "환자부담총액", "본인부담금", "수납금액" 처럼 실제/예정 수납액이 명시된 경우 emr_copayment_amount 에만 넣습니다.
- excluded_from_sanjeong 은 문서에 특례 제외/비대상/상병 무관이 명시된 경우만 true 로 둡니다. 추정하지 마세요.
"""


def _default_payload(reason: str) -> dict:
    """Return a minimal, safe payload when extraction cannot proceed."""
    return {
        "patient_input": {
            "age": None,
            "gender": None,
            "insurance_type": None,
            "disability_grade": None,
            "veteran_type": None,
            "sanjeong_special": None,
            "is_pregnant": False,
            "is_infant": False,
            "kcd_codes": [],
            "treatment_type": None,
            "institution_type": None,
            "institution_region": None,
            "medical_aid_institution_level": None,
            "dispensing_type": None,
            "emr_copayment_amount": None,
            "billing_items": [],
        },
        "confidence_notes": reason,
        "raw_text": "",
    }


async def extract_patient_from_image(image_bytes: bytes, mime_type: str) -> dict:
    """Extract structured PatientInput-like payload from an image or PDF.

    Parameters
    ----------
    image_bytes:
        Raw bytes of the uploaded file (image/* or application/pdf).
    mime_type:
        MIME type string. Must already be validated by the caller.

    Returns
    -------
    dict
        ``{"patient_input": {...}, "confidence_notes": "...", "raw_text": "..."}``

    Raises
    ------
    OCRExtractionError
        On configuration, network, or parse errors.
    """

    if not image_bytes:
        raise OCRExtractionError("업로드된 파일이 비어 있습니다.")

    if not llm_client.is_configured():
        # Graceful degradation: we return a placeholder payload so the UI can
        # still render an editable form. This matches how verify_billing_with_ai
        # handles a missing key.
        return _default_payload("LLM API 키가 설정되지 않아 OCR을 수행할 수 없습니다. 수동으로 입력해주세요.")

    user_prompt = (
        "아래 문서에서 환자 정보와 청구 항목을 지정된 JSON 형식으로 정확히 추출하세요. "
        "확신이 없는 값은 반드시 null 로 남기고 confidence_notes 에 사유를 적습니다."
    )

    try:
        response = await llm_client.generate_json(
            user_prompt,
            system=OCR_SYSTEM_PROMPT,
            max_output_tokens=4096,
            temperature=0.1,
            image_bytes=image_bytes,
            image_mime_type=mime_type,
        )
    except OCRExtractionError:
        raise
    except Exception as exc:
        raise OCRExtractionError(f"LLM OCR 호출 실패: {exc}") from exc

    raw_text = response.text
    if not raw_text:
        raise OCRExtractionError("LLM OCR 응답이 비어있습니다.")

    try:
        payload = json.loads(raw_text.strip())
    except json.JSONDecodeError as exc:
        raise OCRExtractionError(f"LLM OCR 응답 JSON 파싱 실패: {exc}") from exc

    if not isinstance(payload, dict) or "patient_input" not in payload:
        raise OCRExtractionError("LLM OCR 응답 구조가 올바르지 않습니다.")

    # Make sure the nested shape exists even if the model omitted fields.
    patient_input = payload.get("patient_input") or {}
    if not isinstance(patient_input, dict):
        raise OCRExtractionError("patient_input 필드 형식이 올바르지 않습니다.")

    patient_input.setdefault("age", None)
    patient_input.setdefault("gender", None)
    patient_input.setdefault("insurance_type", None)
    patient_input.setdefault("disability_grade", None)
    patient_input.setdefault("veteran_type", None)
    patient_input.setdefault("sanjeong_special", None)
    patient_input.setdefault("is_pregnant", False)
    patient_input.setdefault("is_infant", False)
    patient_input.setdefault("kcd_codes", [])
    patient_input.setdefault("treatment_type", None)
    patient_input.setdefault("institution_type", None)
    patient_input.setdefault("institution_region", None)
    patient_input.setdefault("medical_aid_institution_level", None)
    patient_input.setdefault("dispensing_type", None)
    patient_input.setdefault("billing_items", [])

    if not isinstance(patient_input.get("kcd_codes"), list):
        patient_input["kcd_codes"] = []
    if not isinstance(patient_input.get("billing_items"), list):
        patient_input["billing_items"] = []

    payload["patient_input"] = patient_input
    payload.setdefault("confidence_notes", "")
    payload.setdefault("raw_text", "")
    return payload
