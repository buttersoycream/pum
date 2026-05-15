# pum (품) → hosto D4 마이그 brief: IVF 약물 사전 추출

> 이 문서는 `C:\Users\butte\home\hosto\` 작업 디렉토리의 Claude에게 넘기는 handoff입니다.
>
> **기존 brief**: `pum/docs/handoff/2026-05-13-hosto-data-request.md` (D1-D5 포함, D4는 한 줄 언급)
>
> **이 brief 범위**: D4 (IVF 호르몬·관련 약물 사전) **단독 깊이 추출**. 약 4-8h 예상.

---

## 0. 배경

### pum이 D4를 필요로 하는 이유

pum M2 (AI 동반자 + RAG 골격)에서 사용자가 "○○ 약 먹어도 되나" / "이 부작용 정상인가" / "주사 시간 놓쳤어" 류 질문을 던질 때, RAG가 약물별 정확한 정보를 retrieve해야 함. 의료법 톤 가드(K1 Guard-1, -2, -5)에 부합하는 형태로.

### pum M2~M6에서 D4 활용처

| M | 활용 |
|---|---|
| M2 (chat 골격) | RAG sample 청크에 IVF 약물 10-20개 포함. 사용자 질문 시 retrieve |
| M3 (사이클 트래커) | 약 schedule 알림. 약물별 빈도·시간·복용 룰 reference |
| M6 (AI 코치 full) | RAG knowledge base 약물 영역 full coverage. founder 부부 약물 케이스 few-shot 연결 |
| M7 (OCR) | 처방전 OCR 결과 → 약물명 정규화 (한글·한자·영문 trade name 매핑) |

---

## 1. hosto Claude에게 부탁할 것

hosto의 약물 DB·conversation·문서에서 **IVF 관련 약물만 필터링**해서 pum 형식으로 변환·export.

### 1-1. 필터링 기준 — IVF 관련만

다음 카테고리 중 하나라도 해당하면 포함:

| 카테고리 | 예시 약물 (참고) |
|---|---|
| **배란유도제 (자극)** | Gonal-F · Puregon · Pergoveris · Menopur · Elonva · Clomid · Letrozole |
| **배란억제·다운레귤레이션** | GnRH agonist (Lucrin·Diphereline) · GnRH antagonist (Cetrotide·Orgalutran) |
| **배란 trigger (성숙 유도)** | Ovidrel · Pregnyl · Decapeptyl |
| **황체기 지지** | Crinone · Utrogestan · Endometrin · Cyclogest · Progesterone IM |
| **에스트로겐 보충** | Estradiol valerate · Estraderm patch · Climara · Progynova |
| **착상 보조 (적응증외 포함)** | Aspirin · Heparin · Prednisolone · Intralipid 등 (사용 시 disclaimer 필수) |
| **사이클 동반 (선택적)** | DHEA · CoQ10 · Vitamin D · 엽산 · 이노시톨 (보충제이나 IVF 클리닉 권유 빈번 → 별도 카테고리) |
| **OHSS 예방·대응** | Cabergoline · 알부민 등 |
| **시술 전후 항생제·진통제** | 시술 직후 사용 표준 약 (clinical context 한국 protocol) |

### 1-2. 제외하는 것

- 일반 임신 후 약물 (입덧·산전 비타민 등) — pum Phase 1 미대상
- IVF와 무관한 약물 (감기·소화제 등)
- 한방·민간요법 — disclaimer 부담 너무 큼, pum에서 안 다룸
- 환자 개인 처방 데이터 (PII)

---

## 2. 약물별 필요한 schema (pum 측 ingest 형식)

각 약물에 대해 다음 fields 채워주세요. 모르면 `null` 또는 `"확인 필요"`로 명시.

```yaml
# 예시: gonal-f.yaml
drug_id: gonal-f
name_kr: 고날에프
name_kr_alt: ["고날-F", "고날F"]
name_en: Gonal-F
generic_name: Follitropin alfa  # 성분명
atc_code: G03GA05  # WHO ATC 분류
category: stimulation  # K1 §6-1 진단 표현 회피, "stimulation" 같은 영역 분류로
ivf_purpose: |
  난소 자극 단계에서 다수 난포 발달을 유도하는 재조합 FSH 호르몬 주사제.
  본인 사이클 protocol에 따라 용량·기간이 다릅니다.
form: injection_subcutaneous  # 주사·경구·질좌제 등
dosage_form: pen | vial | tablet | etc
typical_dose_range_text: |
  사이클 1-3차에서 흔히 사용되는 일일 용량은 150-300 IU. 본인 protocol은
  담당 의사 처방을 따르세요. (출처: KSRM 가이드라인 ...)
common_dose_units: IU  # IU, mg, mL 등
typical_administration_time: |
  매일 같은 시간 (저녁 7-10시 흔함). 일정 흐트러지면 다음 진료 시 보고.
storage: |
  냉장 2-8°C. 사용 직전 실온 15-30분.
self_inject_difficulty: medium  # easy | medium | hard
common_side_effects_kr:
  - 주사 부위 발적·통증
  - 복부 팽창감
  - 두통·피로
  - 기분 변동
serious_warning_signs:  # K1 Guard-3 응급 escalation trigger
  - 극심한 복통 + 구토 (OHSS 의심)
  - 호흡 곤란
  - 한쪽 다리 부종 (혈전 의심)
contraindications_kr:
  - 호르몬 의존 종양 병력
  - 임신 확인 시 즉시 중단
interactions_short: |
  다른 자극제와 병용 시 OHSS risk 증가. 의사 처방 외 자가 조정 금지.
ivf_protocol_context:
  - long_protocol  # 자극 1-12일
  - short_protocol  # 자극 1-10일
  - antagonist_protocol
nhi_coverage: partial  # full | partial | none — 본인부담률은 별도 D1·D2 자료
notes_for_couples: |
  주사 시간 관리에 부부 협력이 도움됩니다. 알림 설정·배우자 동행
  주사 등이 흔한 패턴입니다.
source:
  primary: KSRM IVF 가이드라인 2024
  secondary: ["EMA Gonal-F SmPC", "식약처 의약품안전나라"]
  url: https://...
  publish_date: 2024-05-01
  last_verified: 2026-05-14
legal_review_status: pending  # pending | approved | flagged
# K1 톤 가드 적용 완료 표시:
tone_guard_passed:
  no_diagnosis_language: true     # "정상"·"이상" 사용 X
  no_dose_prescription: true       # "권장량 ~~" 사용 X (본인 의사 처방 따르라고 명시)
  emergency_warnings_explicit: true # serious_warning_signs 채워짐
  source_required: true             # source.primary 채워짐
```

### Schema 핵심 룰 (K1 톤 가드 미리 적용)

| 필드 | 작성 룰 |
|---|---|
| `typical_dose_range_text` | "**~~을 권장합니다**" X · "본인 의사 처방을 따르세요" 명시 필수 |
| `common_side_effects_kr` | 발생 빈도 % 표기 시 출처 필수. 없으면 % 생략하고 "흔히 보고됩니다" 정도 |
| `serious_warning_signs` | K1 Guard-3 응급 escalation 키워드와 매핑 가능한 형태 |
| `contraindications_kr` | 절대 금기 — 사용자가 봐도 명확한 한국어 |
| `notes_for_couples` | 부부 협력 angle 강조. 호들갑·과장 X (예: "함께 이겨내요" X) |
| `legal_review_status` | 초기 ingest는 `pending`. 법무 자문 후 `approved` |

---

## 3. 카테고리별 최소 우선순위 (M2/M6 RAG ingest 목표량)

| 카테고리 | M2 ingest 최소 | M6 ingest 권장 |
|---|---|---|
| 배란유도제 | 4 (Gonal-F · Puregon · Menopur · Clomid) | 8 |
| 배란억제 | 2 (Cetrotide · Lucrin) | 4 |
| 배란 trigger | 2 (Ovidrel · Pregnyl) | 3 |
| 황체기 지지 | 3 (Crinone · Utrogestan · Endometrin) | 5 |
| 에스트로겐 | 1 (Progynova) | 3 |
| 보충제 (DHEA 등) | 0 (M2는 제외) | 4 |
| OHSS 대응 | 1 (Cabergoline) | 2 |
| **합계** | **13** | **29** |

→ M2는 13개. M6에 29개 + 한방·보충제 영역 확장 검토.

---

## 4. 출력 형식·위치

### 4-1. 형식 옵션

| 옵션 | Pro | Con |
|---|---|---|
| **YAML per drug** (1 file/drug) | git diff 친화 · 사람 review 쉬움 · 명시적 | file 수 많음 (29개) |
| JSON array | 한 파일 · programmatic | git diff 어려움 · 사람 review 부담 |
| SQL migration | DB 즉시 ingest | review·수정 부담 |

**추천: YAML per drug** (`pum/data/seed/drugs/ivf/[drug_id].yaml`). M2 ingest 스크립트에서 일괄 읽기.

### 4-2. 저장 위치 (pum 측)

```
pum/
└── data/
    └── seed/
        └── drugs/
            └── ivf/
                ├── gonal-f.yaml
                ├── puregon.yaml
                ├── menopur.yaml
                ├── cetrotide.yaml
                ├── ovidrel.yaml
                ├── crinone.yaml
                └── ... (M2: 13개, M6: 29개)
```

### 4-3. 추가로 export

`pum/data/seed/drugs/ivf/CATEGORIES.md` — 카테고리·protocol 간 관계 다이어그램·요약 (사람용 reference).

---

## 5. K1 톤 가드 사전 적용 — hosto Claude에게 부탁

작성 시 다음 표현 회피·대체:

| 회피 | 대체 |
|---|---|
| "정상 용량" | "흔히 사용되는 용량 범위" |
| "권장 시간" | "흔히 보고되는 사용 시간대" |
| "이 약이 좋다 / 효과적이다" | "본 약제는 ~ 목적으로 사용됩니다" (사실 description) |
| "부작용이 거의 없다" | "흔히 보고되는 부작용은 ~. 본인 차이 있을 수 있음" |
| 결과 보장 ("이 약으로 ~성공") | 사용 X (K1 AP-3) |
| 비교 ("A가 B보다 좋다") | 사용 X (K1 §6-2) |

각 약물 yaml의 `tone_guard_passed` block 채울 때 위 4가지 확인.

---

## 6. 출처·라이센스 가드

### 안전한 출처 (재배포 OK)

| 출처 | 안전성 | 비고 |
|---|---|---|
| KSRM (대한생식의학회) 환자안내문 | ⭐⭐⭐⭐⭐ | 학회 publication, 한국 표준 |
| 식약처 의약품안전나라 (nedrug.mfds.go.kr) | ⭐⭐⭐⭐⭐ | 정부 공식 |
| WHO ATC 분류 | ⭐⭐⭐⭐⭐ | 국제 표준 |
| EMA / FDA SmPC (영문) | ⭐⭐⭐⭐ | 영문 출처, 한국 번역 시 disclaimer |
| 제약사 한국법인 공식 환자안내문 | ⭐⭐⭐ | 마케팅 톤 섞여있을 수 있음, 검수 필요 |

### 위험한 출처 (사용 금지)

- 맘카페·블로그·유튜브 자막 — K1 §RAG 제외 규칙
- 단일 의사 의견·SNS — 편향 risk
- 약 광고·시술 홍보 자료 — K1 AP-3·AP-4

---

## 7. hosto Claude 답변 형식

기존 brief §9 형식 그대로:

- **A. 즉시 export 가능** — 약물 별 yaml 작성 완료, 파일 위치 명시
- **B. 유사 데이터 있지만 가공 필요** — 어느 카테고리는 hosto에 있고 어느 건 외부 자료 추가 필요
- **C. 보유 안 함, but 출처 안내 가능** — KSRM·식약처에서 어떻게 가져올지 path 안내
- **D. 보유 안 함 + source 모름** — 별도 조사 필요

**답변 끝에 종합 요약 표**:
- 13개 M2 ingest 약물 list × 4 분류 status

---

## 8. 예상 work breakdown (참고)

| 단계 | 예상 시간 |
|---|---|
| hosto 측 conversation·DB 뒤져 IVF 약물 후보 list화 | 1-2h |
| KSRM·식약처에서 약물별 fields 보충 | 2-3h |
| K1 톤 가드 사전 적용 (표현 다듬기) | 1h |
| yaml 13개 작성 | 1-2h |
| **합계** | **5-8h** |

M6에 추가 16개 (29개 - 13개) 작성하려면 추가 3-4h.

---

## 9. M2 plan과의 연결

pum M2 plan (`pum/docs/plans/2026-05-14-m2-ai-companion-skeleton.md`) Task 7 (RAG ingest 스크립트 + sample 청크) — 이 D4 export 결과 yaml들이 sample chunks의 일부가 됨.

ingest script:
```typescript
// lib/rag/ingest.ts (M2 Task 7)
const drugs = await loadDrugYamlsFromDir('data/seed/drugs/ivf/');
for (const drug of drugs) {
  // 각 drug yaml에서 1-3개 청크 생성 (purpose · dose · side effects 영역별)
  const chunks = buildChunksFromDrug(drug);
  for (const chunk of chunks) {
    const embedding = await embed(chunk.content);
    await insertRagChunk({
      ...chunk,
      embedding,
      tier: 1,
      domain: 'drug',
      legal_review_status: drug.legal_review_status,
      // ...
    });
  }
}
```

---

## 10. pum 본 source of truth

| | |
|---|---|
| Spec | `pum/docs/specs/2026-05-13-mvp-design.md` |
| M2 plan | `pum/docs/plans/2026-05-14-m2-ai-companion-skeleton.md` |
| K1 톤 가이드 | `pum/docs/knowledge/medical_law_tone_guide.md` |
| K5 AI 동반자 설계 | `pum/docs/knowledge/ai_companion_design.md` |
| K6 RAG 소스 | `pum/docs/knowledge/rag_sources.md` |
| 작성자 | 김다원 (admin@teum.io) |
| 작성 일자 | 2026-05-14 |
| 본 handoff | `pum/docs/handoff/2026-05-14-hosto-d4-ivf-drugs.md` |

hosto Claude 답변 시 본 문서 path를 reference로 명시.

---

## 11. 주의 사항

- **PII 절대 X**: hosto 환자 처방 데이터·환자 식별자 미마이그
- **저작권**: KSRM·식약처는 정부·학회 공개 자료. 제약사 자료는 출처 명시 + paraphrase
- **K1 톤 가드 사전 적용**: pum 측에서 다시 검수하지만 hosto에서 1차 필터링 부탁
- **법무 검수**: 모든 약물 yaml은 `legal_review_status: pending`으로 export. pum 측 법무 자문 후 `approved`
- **버전 관리**: 약 정보는 갱신 빈도가 있음 (식약처 허가 변경 등). yaml에 `last_verified` 필수
