# 품 (pum) RAG knowledge base 소스 정리 — K6

> AI 동반자(W2)가 참조할 한국 IVF·임신·의료비·지원금 자료원 목록 + 수집 우선순위.
>
> **상태**: v0 draft (2026-05-14). 실제 RAG ingestion 작업은 M2 후반 / M6 직전.
>
> **연관**: K1 (`medical_law_tone_guide.md`) · K2 (`korean_medical_system.md`) · K5 (`ai_companion_design.md`)

---

## 0. 원칙

| 원칙 | 내용 |
|---|---|
| **공식 소스 우선** | 학회·정부·공적 기관 자료가 첫 tier. 블로그·카더라·맘카페는 비대상 |
| **출처·날짜 강제** | RAG chunk마다 source · publish_date · last_verified 메타 필수 (K1 Guard-2 만족) |
| **한국 컨텍스트 우선** | 글로벌 자료(ASRM·ESHRE)는 보조. 본 자료가 한국과 다르면 한국 자료 우선 |
| **갱신 주기 명시** | 정책·지원금은 연 1회 이상 verify. 의학 지식은 가이드라인 개정 시 |
| **법무 검수 trail** | 톤·의료법 회색지대 챕터는 법무 자문 후 ingest (M5+) |

---

## 1. Tier 1 — 공식 의학·정책 (필수, M6 출시 전 ingest 필수)

### 1-1. 한국 의료 가이드라인 / 학회 자료

| 출처 | 자료 종류 | 활용 | 수집 방법 | 갱신 주기 |
|---|---|---|---|---|
| **대한생식의학회 (KSRM)** | IVF 가이드라인·통계·환자안내문 | 시술 절차·검사 해석 base | 학회 사이트·연차총회 자료 PDF | 연 1-2회 |
| **대한산부인과학회 (KSOG)** | 임신·산전 가이드라인 | 임신 안정기 페르소나 (Phase 2) | 학회 사이트 | 연 1회 |
| **대한비뇨의학회** | 남성난임 가이드라인 | 정자 검사·치료 (남성난임 지원 한도 차별 컨텍스트) | 학회 사이트 | 연 1회 |
| **국립중앙의료원** | 환자 의학 정보 (한국어 정제) | 일반 가이드 답변 | 사이트 크롤 | 분기 |
| **국가건강정보포털 (health.kdca.go.kr)** | 정부 검증 의학 정보 | 일반 가이드 답변 | 사이트 크롤 | 분기 |

### 1-2. 정부 정책·지원금 (남성난임 한도 차별 포함)

| 출처 | 자료 | 활용 | 수집 | 갱신 |
|---|---|---|---|---|
| **보건복지부 난임부부 시술비 지원사업** | 지원 한도·조건·신청 절차 | E. 의사결정·비용 영역 | 공식 페이지 + 보건복지부 고시 PDF | 연 1회 (1-3월 갱신) |
| **광역지자체 자체 지원 (서울·경기·부산·인천 등)** | 추가 지원·소득기준·연령기준 | E. 비용 sounding | 각 시도 사이트 (수동) | 연 1회 |
| **건강보험심사평가원 (HIRA)** | IVF 보험 적용 범위·본인부담률 고시 | E. 비용·시술 가능 범위 | HIRA OpenAPI + 고시 | 수시 (수가 개정 시) |
| **국민건강보험공단 (NHIS)** | 환산지수·약제 급여 목록 | 비용 계산 (M4) | NHIS 사이트 | 매년 1월 |
| **bokjiro.go.kr** | 복지 통합 안내 (휴직·휴가·지원) | 의사결정 sounding (휴직 결정) | hosto 크롤러 재사용 | 수시 |
| **고용노동부** | 난임 휴가·휴직 제도 | 부부 갈등·휴직 결정 영역 | 사이트 | 연 1회 |

### 1-3. 글로벌 가이드라인 (한국 자료 보완용)

| 출처 | 자료 | 활용 | 한국 자료와 충돌 시 |
|---|---|---|---|
| **ASRM (American Society for Reproductive Medicine)** | Practice Committee Opinions · ART 통계 | 글로벌 통계 인용 + 한국 가이드라인이 침묵하는 영역 cover | 한국 우선 |
| **ESHRE (European Society of Human Reproduction)** | 가이드라인·환자안내문 | 동일 | 한국 우선 |
| **SART (CDC ART Report)** | 미국 IVF 성공률 통계 (나이대별) | 일반 통계 인용 시 (출처 명시) | 한국 통계 우선 사용 |
| **WHO** | 정자 분석 기준값 등 | 검사 기준값 일반 안내 | 그대로 사용 가능 |
| **Cochrane Reviews** | IVF 관련 RCT 메타분석 | "근거 수준" 명시 답변 시 | 한국 컨텍스트 보조 |

---

## 2. Tier 2 — hosto에서 재사용 (M2 시작 시 즉시 가용)

| hosto 자산 | pum 위치 | 활용 |
|---|---|---|
| 환산지수 JSON | `data/seed/conversion_factors_2026.json` | 의료비 계산 (M4) |
| NHI 외래 결정표 4종 | `data/seed/coverage_rules/*.json` | IVF는 비대상이지만 reference로 RAG에 ingest 가능 (사용자 일반 외래 질문 시) |
| 산정특례 V코드 | `data/seed/sanjeong_codes_2026.json` | IVF는 비대상이지만 사용자 외 질환 (예: 다낭성난소증후군) 관련 답변 시 |
| K1 의료법 톤 가이드 | `docs/knowledge/medical_law_tone_guide.md` | system prompt 가드 (RAG로 retrieve X, prompt에 항상 embed) |
| K2 한국 의료시스템 | `docs/knowledge/korean_medical_system.md` | 수가·산정특례·IVF 별도 룰 설명 |
| hosto bokjiro 크롤러 (D3 마이그 대기) | `docs/references/hosto_billing/` (참고만) | D3 마이그 완료 후 난임 지원금 자동 수집 |
| hosto IVF 약물 (D4 마이그 대기) | TBD | D4 마이그 완료 후 약물 데이터베이스 ingest |

---

## 3. Tier 3 — 보조 (M6 이후 검토)

| 출처 | 자료 | 활용 | 위험 |
|---|---|---|---|
| 차이의학연구원·차의과학대 | 한국 IVF 임상 데이터 | 통계 보강 | 출처 공개 범위 확인 필요 |
| 삼성서울병원·서울대병원 등 IVF 센터 환자안내문 | 시술 절차·약 안내 | 환자 perspective 답변 보강 | 병원별 차이; "본인 병원과 다를 수 있음" 명시 필수 |
| PubMed 한국인 IVF 관련 논문 | 메타분석·case study | 의사결정 sounding 깊이 | 톤 가드 어려움. 환자에게 그대로 출력 X |

---

## 4. ❌ 제외 — RAG에 절대 ingest 하지 않는 것

| 출처 | 이유 |
|---|---|
| **맘카페·블로그·카페 게시글** | 카더라 천국. 검증 불가. AP-1·AP-2 위반 위험 |
| **유튜브 영상 자막** | 동일 위 |
| **의사 1인 블로그·SNS** | 단일 의견 편향. 환자가 의사 지시와 충돌 |
| **약 광고·시술 홍보 자료** | AP-3·AP-4 (결과 보장·과도한 마케팅) 위반 위험 |
| **founder 부부 raw 페인 dump** (`docs/raw/pain-dumps/`) | RAG에 ingest X. **system prompt few-shot embed로 사용** (K5 §4 참조). RAG로 retrieve하면 K1 가드 회피 가능성 |

---

## 5. 수집·검수 워크플로

### 5-1. 단계

```
1. Source 선택 (위 Tier 표)
2. PDF/HTML → 청크 단위 추출 (semantic chunking)
3. 메타 부착:
   - source_org · source_url · publish_date · last_verified
   - tier · 영역 (A-E) · 도메인 (일반·시술·약·정책·비용)
4. 법무·의료 자문 (Tier 1 자료 한정)
5. Embedding (model TBD — open question §1)
6. Vector DB ingest (Supabase pgvector 또는 별도 서비스)
7. RAG retrieval test (K1 가드 위반 없는지 sample 검증)
```

### 5-2. 메타 schema (제안)

```typescript
type RagChunk = {
  id: string;
  content: string;             // 청크 본문
  source_org: string;          // "대한생식의학회"
  source_url: string;
  source_doc_title: string;    // "체외수정 가이드라인 2024"
  publish_date: string;        // ISO
  last_verified: string;       // ISO
  tier: 1 | 2 | 3;
  area: ('A' | 'B' | 'C' | 'D' | 'E')[];  // K5 §2 영역
  domain: 'general' | 'procedure' | 'drug' | 'policy' | 'cost';
  legal_review_status: 'pending' | 'approved' | 'flagged';
  legal_review_at?: string;
  embedding: number[];
};
```

### 5-3. 검수 체크리스트 (chunk 단위)

| 체크 | 통과 기준 |
|---|---|
| 출처 신뢰성 | Tier 1·2 only, Tier 3은 법무 검수 후 |
| 톤 가드 (K1) | 진단·처방·결과보장·비교판정 언어 없음 |
| 한국 컨텍스트 | 한국 IVF에 적용 가능 (글로벌만 ingest 시 명시) |
| 출처·날짜 메타 | 빠지면 reject |
| 환자 perspective | 의사용 전문 자료 그대로 ingest X (환자 친화 paraphrase) |

---

## 6. RAG retrieval 동작 룰 (M6에서 구현)

| 룰 | 동작 |
|---|---|
| **신체 응급 키워드** | RAG 스킵. K1 Guard-3 직행 (119 안내) |
| **정신건강 응급 (P2 확장)** | RAG 스킵. K5 §7 Guard-3 확장 직행 (1577-0199 · 1577-7129) |
| **영역 routing 후** | 해당 영역 청크 우선 retrieve (area filter) |
| **Sub-페르소나 detection 후** | 페르소나별 weighted 영역 우선 retrieve (예: P2면 C·E 우선, P3면 C·D 우선) |
| **본인 데이터 우선** | personal_context > RAG retrieve 결과 (K1 §6-4 본인 사례 vs 일반 분리) |
| **출처 표기 강제** | retrieved chunk를 답변에 반영 시 "(출처: source_org, publish_date)" 자동 부착 |
| **Tier 3 chunk 활용 시** | "병원별 차이 있음 / 본인 의료진에게 확인" disclaimer 강제 |
| **충돌 시** | Tier 1 (한국) > Tier 1 (글로벌) > Tier 2 > Tier 3 순. 충돌 chunk 발견 시 사용자에게 "기관별 차이" 안내 |
| **카더라 vs 의사 충돌 chunk** | 사용자 입력이 카더라 표현 hit 시 (예: "AMH 1.0 이하면 끝") 별도 chunk 우선 retrieve → "본 정보와 다른 표현이 있을 수 있어요" 명시 |
| **founder 사례 retrieve** | type B 수령 후 검토. RAG 또는 system prompt embed 선택. 인용 시 "긍정 outlier" angle 톤 유지 |

---

## 7. M2 - M6 단계별 ingestion 우선순위 (K7 weighted matrix 반영)

### 7-1. 영역별 분포 (M2 sample 50-100 청크 기준)

K7 §1 4 페르소나 영역 가중치 합산:

| 영역 | 가중치 합 | M2 청크 비중 | M2 sample (n=80 기준) |
|---|---|---|---|
| **E. 의사결정 sounding** | 18 | **30%** | 24 청크 |
| **C. 멘탈 케어** | 15 | **25%** | 20 청크 |
| **D. 부부 갈등·역할** | 16 | **20%** | 16 청크 |
| **B. 시술·검사 해석** | 14 | **15%** | 12 청크 |
| **A. 일상 do/don't** | 9 | **10%** | 8 청크 |
| **합계** | — | 100% | 80 |

### 7-2. Special category chunks (K7 §6 공통 패턴)

별도로 ingest. 영역 분포와 겹치되 cross-tag:

| 카테고리 | M2 청크 수 | 우선순위 |
|---|---|---|
| **의사 못 물은 질문 template** (K7 §6-1, universal mode) | 8 | ⭐⭐⭐ — 4 페르소나 모두 강한 demand |
| **카더라 vs 의사 충돌 list** (K7 §6-4) | 6 | ⭐⭐⭐ — AMH·차수·PGT-A·커피·남성난임 |
| **부부 룰·sign·약속 examples** (K7 §6-3) | 4 | ⭐⭐ — universal good practice |
| **멘탈 trigger·회복 패턴** (K7 §6-5) | 6 | ⭐⭐ — C 영역 보강 |
| **자해 사고·번아웃 응급 채널** (K5 §7 P2 확장) | 1 (immutable) | ⭐⭐⭐⭐⭐ — life-critical |

→ M2 총 청크: 영역별 80 + special 25 = **약 100 청크** (M2 target)

### 7-3. 페르소나별 retrieve weight (M6 시점 active)

사용자 페르소나 detection 결과에 따라 retrieve 가중치 조정:

| 페르소나 | 우선 retrieve 영역 |
|---|---|
| **P1** | E > D > B > C > A |
| **P2** | C > E > D > B + 매 응답 자해 응급 채널 chunk 강제 부착 |
| **P3** | C > D > B > E > A + 남성난임 지원 차별 chunk |
| **P4** | E > B > D > A > C + 의사 못 물은 질문 template |

### 7-4. 단계별 Ingest 마일스톤

| Milestone | 목표 | Ingest 대상 |
|---|---|---|
| **M2 (chat 골격)** | 최소 RAG로 chat 동작 검증 | 위 §7-1·7-2 = 약 100 청크 (Tier 1 한국 가이드라인 + special category) |
| **M3-M5** | 점진 확장 | + bokjiro 크롤러 자동화 (D3 마이그 완료 후) + hosto D4 IVF 약물 (29개 → 약 50 청크) |
| **M6 (AI coach full)** | 4-5 영역 cover · 법무 검수 완료 + 페르소나별 retrieve 활성 | Tier 1 전체 + Tier 2 hosto 자산 통합 + Tier 3 검토 후 일부 |
| Phase 0 publish 후 | Founder Diary chunk | founder 본인 raw (type B) 검토 후 RAG/few-shot 선택 |
| M6 출시 후 | 정기 갱신 | 매년 1-3월 정책 갱신 + 가이드라인 개정 시 |

---

## 8. 미해결 / 다음 결정

| # | 항목 | 결정 시점 |
|---|---|---|
| 1 | Embedding 모델 — OpenAI text-embedding-3-small vs Anthropic vs 한국어 특화 (BGE-M3, KURE) | M6 시작 전 |
| 2 | Vector DB — Supabase pgvector vs Pinecone vs Vercel Vector | M6 시작 전 (Supabase 기반이라 pgvector 우선 검토) |
| 3 | Tier 1 자료 법무 검수 process — 자문 변호사 선임 시점 | Phase 0 후반 / M5 시작 전 |
| 4 | 한국 학회 자료 라이센스 — 환자안내문 재배포 권한 확인 필요 | Tier 1 ingest 직전 |
| 5 | RAG 응답에 출처 URL 직접 노출 여부 — 사용자 출처 직접 확인 (trust↑) vs 외부 페이지로 이탈 (engagement↓) | M6 UX 설계 시 |
| 6 | Tier 3 (병원 환자안내문) 라이센스·인용 범위 | M6 이후 |
| 7 | "의사 못 물은 질문 template" 별도 feature 분리 — 4 페르소나 universal demand | M3 또는 M6 |
| 8 | 카더라 vs 의사 충돌 chunk — 어디까지 cover (P2 자해 표현 회피 vs 사용자 인지 trade-off) | 법무 자문 시 |

---

*최종 수정: 2026-05-14. 실제 ingestion 작업은 M2-M6 진행.*
