# 한국 의료시스템 이해 — pum용

> 출처: hosto 프로젝트의 `PHASE_A_PLAN.md`, `CLAUDE.md`를 pum의 IVF 도메인 컨텍스트로 재정리.

## 1. 수가 산정 공식

한국 의료수가는 다음 공식으로 산정:

```
수가 = 상대가치 × 환산지수 × 가산
```

| 요소 | 결정 주체 | 내용 |
|---|---|---|
| 상대가치 | HIRA (건강보험심사평가원) | 행위별 점수 |
| 환산지수 | NHIS (국민건강보험공단) | 연도별·기관 종별 원/점 |
| 가산 | 고시 | 종별가산, 야간/공휴일가산, 시술 가산 등 |

## 2. 환산지수 (2026년)

| 기관 종별 | 환산지수 (원/점) |
|---|---|
| 의원 | 95.6 |
| 병원 | 83.8 |
| 치과 | 101.1 |
| 한방 | 104.3 |
| 약국 | 105.5 |
| 보건기관 | 98.6 |
| 조산원 | 185.1 |

→ pum 데이터: `pum/data/seed/conversion_factors_2026.json`

## 3. 보험 유형 구분 (본인부담률에 영향)

| 유형 | 설명 | 적용 |
|---|---|---|
| 건강보험 | 일반 가입자 | 외래/입원 기본 부담률 |
| 의료급여 | 차상위 1·2종 | 더 낮은 부담률 |
| 산정특례 | V코드 (V190~V900) | 본인부담률 5% (암 등), 10% (희귀질환 등) |
| 장애인 | 등록장애인 | 추가 감면 |
| 보훈 | 국가유공자 등 | 추가 감면 |
| 본인부담상한제 | 소득분위 1~10 | 연간 누적 상한 |

→ pum 데이터: `pum/data/seed/sanjeong_codes_2026.json` (reference), `pum/data/seed/coverage_rules/*.json` (일반 외래 결정표; reference)

## 4. ⚠️ IVF는 산정특례 대상 X

IVF (체외수정·인공수정) 시술은 **산정특례 V코드 적용 안 됨**. 별도 고시 체계:

- 2017년부터 건강보험 적용 (만 45세 미만 기준; 한도 확장 추세)
- 회당 본인부담률 30%~50% (소득 수준·시술 종류별 변동)
- 정부 「난임부부 시술비 지원사업」으로 추가 지원
- 광역지자체별 자체 사업 추가 (서울·부산·경기 등)

→ pum W3 (의료비 계산기)는 일반 외래 본인부담률 표가 아닌 **IVF 별도 룰**이 필요. D3 (난임 지원금) 데이터와 결합 (마이그 대기 중).

## 5. catalog_status (수가 코드 검증 상태)

hosto가 도입한 검증 상태 개념. pum도 동일 패턴 권장:

| status | 의미 | pum 활용 |
|---|---|---|
| `official_calculable` | HIRA 공식 수가 + 환산지수로 deterministic 계산 가능 | W3에서 "정확 가격 표시" |
| `emr_verify_only` | EMR 입력값 신뢰 (검증 불가) | W3에서 "참고 가격, 확인 필요" 표기 |
| `unverified` | 자동 수집했으나 사람 검수 전 | W3에서 BETA 면책 박스 표시 |

## 6. 수납 흐름 (참고)

```
EMR 청구 → 보험유형 확인 → 산정특례/장애/보훈 등 추가 감면
       → 본인부담금 산출 → 본인부담상한제 누적
       → 환급 가능성 추정 → 최종 수납액
```

→ pum W3은 환자 측에서 이 흐름의 일부만 시뮬레이션 (실제 청구는 병원·HIRA 진행). pum 톤은 **"이런 정도가 예상됨"**이지 **"이게 정확하다"**가 아님 (의료법 톤 가이드 §2 anti-pattern 참고).

## 7. 데이터 출처 (pum이 정기 갱신해야 할 곳)

| 데이터 | 출처 | 갱신 주기 |
|---|---|---|
| 환산지수 | NHIS 연도별 환산지수 결정 현황 | 매년 1월 |
| 산정특례 V코드 | NHIS 산정특례 안내 + 보건복지부 고시 | 수시 |
| 수가 마스터 | HIRA OpenAPI (data.go.kr 15021028) | 일자별 |
| 약제 급여 목록 | 보건복지부 고시 | 월간 |
| 난임 지원금 | 보건복지부 「난임부부 시술비 지원사업」 | 연도별 |
| 광역지자체 추가 지원 | 시·도 자체 사업 페이지 | 연도별 |

## 8. pum이 hosto 인프라에서 활용할 자산

| 자산 | hosto 위치 | pum 활용 |
|---|---|---|
| 환산지수 JSON | `backend/data/conversion_factors_2026.json` | `pum/data/seed/conversion_factors_2026.json` |
| 산정특례 JSON | `backend/data/sanjeong_codes_2026.json` | `pum/data/seed/sanjeong_codes_2026.json` (reference만; IVF 비대상) |
| NHI 외래 결정표 4종 | `backend/app/core/rules/decision_tables/*.json` | `pum/data/seed/coverage_rules/` (reference만; IVF 별도 룰 필요) |
| 룰 엔진 패턴 | `backend/app/core/rule_engine.py`, `rules/engine.py` | `pum/docs/references/hosto_billing/` (참고용; 직접 복붙 X) |
| OCR 시스템 프롬프트 패턴 | `backend/app/services/ocr_service.py` | `pum/docs/references/hosto_ocr/` (M7 OCR 작업 시 starter) |
| schema 패턴 | `backend/app/models/models.py` | `pum/docs/references/hosto_schema/` (참고용; pum은 couple ownership으로 변형) |
| bokjiro 크롤러 (예정) | `crawler/sources/bokjiro.py` | D3 난임 지원금 수집 시 재사용 |

## 9. 출처 file

- `hosto/docs/PHASE_A_PLAN.md`
- `hosto/CLAUDE.md` (핵심 원칙 §1·§2·§3)
- hosto Claude 답변 (2026-05-13, K2·K4 카테고리)
