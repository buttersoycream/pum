"""DRG(질병군 포괄수가) 본인부담금 lookup 모듈.

룰엔진 결정표와 다르게, DRG는 HIRA가 이미 *모든* 조합의 본인부담금을
계산해서 배포한다. 우리가 할 일은 단가 산정이 아니라 **표 lookup**.

scope (Phase 1):
    - 건강보험 환자만 (의료급여 입원 DRG 마스터는 별도 zip).
    - 부담률은 일반 20% / 산정특례 5%·10% / 제왕절개 0% 만 결정.
      차상위 본인부담 경감(14%·3%)은 입력 필드 부재로 다음 단계.
    - modifier (시간대/부인과 가산) 는 사용자가 명시 — 자동 추정 X.

분기:
    drg_code + admission_days 둘 다 있고 매칭 가능하면 BillingDecision
    리턴, 아니면 None (legacy 흐름으로 fallback).
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_RATES_PATTERN = "drg_rates_*.json"
_META_PATTERN = "drg_meta_*.json"


# DRG 코드 중 "제왕절개 질병군" — 본인부담 0% 트랙. HIRA 「붙임7/13」
# 적용 대상. 정확한 목록은 보건복지부 고시 별표에 있고, 일반적으로 O01~
# O14 류 산과 DRG 가 해당. Phase 1 단계에선 보수적으로 비워두고, 환자
# 입력에서 명시적으로 0% 선택할 수 있게 한다 (false 0원 청구 사고 방지).
_CESAREAN_DRG_PREFIXES: tuple[str, ...] = ()


@dataclass(frozen=True)
class DRGDecision:
    """DRG lookup 성공 시 반환되는 결정."""

    drg_code: str
    drg_name: str
    institution_type: str
    modifier: str
    copay_rate_pct: int
    admission_days: int
    copayment_amount: int  # 본인부담금 (원)
    source_label: str


@dataclass(frozen=True)
class DRGMeta:
    version: str
    effective_from: str
    record_count: int
    drg_count: int
    verification_status: str


class _DRGCache:
    def __init__(self) -> None:
        self._lock = Lock()
        self._rates: dict | None = None
        self._meta_doc: dict | None = None
        self._summary: DRGMeta | None = None

    def load(self, force: bool = False) -> None:
        if self._rates is not None and not force:
            return
        with self._lock:
            if self._rates is not None and not force:
                return
            rates_path = _resolve_latest(_RATES_PATTERN)
            meta_path = _resolve_latest(_META_PATTERN)
            if rates_path is None or meta_path is None:
                self._rates = {}
                self._meta_doc = {}
                self._summary = None
                logger.info("[drg-calc] DRG JSON not found under %s", _DATA_DIR)
                return
            with rates_path.open("r", encoding="utf-8") as f:
                rates_doc = json.load(f)
            with meta_path.open("r", encoding="utf-8") as f:
                meta_doc = json.load(f)
            self._rates = rates_doc.get("rates") or {}
            self._meta_doc = meta_doc.get("drg") or {}
            src = rates_doc.get("source") or {}
            self._summary = DRGMeta(
                version=rates_doc.get("version", ""),
                effective_from=src.get("effective_from", ""),
                record_count=int(src.get("record_count", 0)),
                drg_count=len(self._meta_doc),
                verification_status=src.get("verification_status", "unverified"),
            )
            logger.info(
                "[drg-calc] loaded %d DRG codes, %d rate records (effective %s)",
                self._summary.drg_count,
                self._summary.record_count,
                self._summary.effective_from,
            )

    @property
    def rates(self) -> dict:
        self.load()
        return self._rates or {}

    @property
    def meta_doc(self) -> dict:
        self.load()
        return self._meta_doc or {}

    @property
    def summary(self) -> DRGMeta | None:
        self.load()
        return self._summary


_cache = _DRGCache()


def _resolve_latest(pattern: str) -> Path | None:
    if not _DATA_DIR.exists():
        return None
    candidates = sorted(_DATA_DIR.glob(pattern))
    return candidates[-1] if candidates else None


def reload(force: bool = True) -> None:
    _cache.load(force=force)


def summary() -> DRGMeta | None:
    return _cache.summary


def is_available() -> bool:
    return bool(_cache.rates)


def determine_copay_rate_pct(patient: dict, drg_code: str) -> int | None:
    """환자 조건 → 부담률 (%) 결정.

    Phase 1 우선순위:
        1. 제왕절개 질병군 (`_CESAREAN_DRG_PREFIXES`) → 0%
        2. 산정특례 + 15세 이하 → 5%
        3. 산정특례 (희귀질환/중증난치 등) → 10%
        4. 일반 → 20%

    Returns None 이면 라우팅을 거부하고 legacy 로 fallback. 현재
    수용 안 하는 케이스:
        - 차상위 (14%/3%) — 별도 입력 필드 없음
        - 의료급여 — 본 lookup 셋에 의료급여 환자 별표 미포함
    """
    if patient.get("insurance_type") != "건강보험":
        return None

    if drg_code and drg_code.startswith(_CESAREAN_DRG_PREFIXES):
        return 0

    sanjeong = (patient.get("sanjeong_special") or "없음").strip()
    age = int(patient.get("age", 0) or 0)
    is_severe = sanjeong in {"암", "뇌혈관", "심장", "중증화상"}
    is_rare = sanjeong in {"희귀질환", "중증난치"}

    if is_severe or is_rare:
        if age <= 15:
            return 5
        return 10

    return 20


def lookup_amount(
    drg_code: str,
    institution_type: str,
    modifier: str,
    copay_rate_pct: int,
    admission_days: int,
) -> int | None:
    """rates 평탄 dict에서 본인부담금 lookup. 모든 차원 정확히 일치해야."""
    rates = _cache.rates
    if not rates:
        return None
    try:
        return int(
            rates[drg_code][institution_type][modifier][str(copay_rate_pct)][
                str(admission_days)
            ]
        )
    except (KeyError, TypeError, ValueError):
        return None


def try_calculate(
    patient: dict,
    drg_code: str | None,
    admission_days: int | None,
    modifier: str = "기본",
) -> DRGDecision | None:
    """DRG 라우팅 진입점. 매칭 불가시 None.

    Codex 검수 블로커 1 차단:
        DRG 일자별수가 표는 *입원* 정액제 전용. 외래/응급에서 drg_code 가
        들어와도 같은 코드 lookup 으로 우연히 매칭되면 외래 청구를 입원
        정액으로 압축하는 사고가 발생한다. 진료구분이 입원이 아니면 즉시
        라우팅 거부.
    """
    if not drg_code or not admission_days or admission_days <= 0:
        return None
    if (patient.get("treatment_type") or "") != "입원":
        return None
    institution_type = patient.get("institution_type") or ""
    if not institution_type:
        return None
    # 우리 lookup 셋 종별만 처리
    if institution_type not in {"상급종합", "종합병원", "병원", "의원", "요양·정신병원"}:
        # billing_calculator는 "상급종합병원" 같은 표기도 쓰므로 단순 정규화
        normalized = institution_type.replace("병원", "").strip()
        if normalized == "상급종합":
            institution_type = "상급종합"
        elif normalized == "종합":
            institution_type = "종합병원"
        else:
            return None

    rate_pct = determine_copay_rate_pct(patient, drg_code)
    if rate_pct is None:
        return None

    amount = lookup_amount(
        drg_code=drg_code,
        institution_type=institution_type,
        modifier=modifier,
        copay_rate_pct=rate_pct,
        admission_days=admission_days,
    )
    if amount is None:
        return None

    meta = _cache.meta_doc.get(drg_code) or {}
    drg_name = meta.get("name", drg_code)
    source_label = (
        f"HIRA DRG 일자별수가 / {drg_code} / {institution_type} / "
        f"modifier={modifier} / 부담률 {rate_pct}% / 입원 {admission_days}일"
    )
    return DRGDecision(
        drg_code=drg_code,
        drg_name=drg_name,
        institution_type=institution_type,
        modifier=modifier,
        copay_rate_pct=rate_pct,
        admission_days=admission_days,
        copayment_amount=amount,
        source_label=source_label,
    )
