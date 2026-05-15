# spec §13 Open Questions — 답안 제안 v0

> spec `docs/specs/2026-05-13-mvp-design.md` §13에 정리된 8개 open question에 대한 claude 제안.
>
> **상태**: 2026-05-14. M2 plan 진입 전 user 결정 대기.
>
> **사용법**: 각 항목에서 옵션·trade-off·추천 확인 → user가 결정/수정 → spec doc에 반영.

---

## 추천 한눈 (TL;DR)

| # | 항목 | 추천 |
|---|---|---|
| 1 | AI 모델 | **M2 = Claude Sonnet 4.6 (1M)**, M6 직전 Sonnet vs Opus 4.7 a/b 측정 후 결정 |
| 2 | System prompt 구조 | **단일 통합 + 영역 routing** (K5 v0 구조 그대로) |
| 3 | RAG 구성 | **Supabase pgvector + 한국어 embedding (BGE-M3)** |
| 4 | PWA vs Native | **PWA (Phase 1) → Phase 2에 RN 검토** (Vercel·Next.js와 가장 매끄러움) |
| 5 | Founder Diary CMS | **Markdown + Next.js 정적 빌드** (M5에서 검토) |
| 6 | 법무 자문 | **Phase 0 후반·M5 직전**. 의료광고법·개인정보보호법 함께 |
| 7 | 본인 부부 사이클 추적 | **다음 사이클 시작과 동시 = Phase 0 시작 시점** |
| 8 | AI fail-safe | **K1 Guard-1·3 직접 trigger + 외부 응급 CTA (M2 chat 골격에 이미 반영)** |

---

## 1. AI 모델 선택

> **질문**: Claude (Sonnet/Opus) vs GPT-4o — 한국어 IVF 도메인·active inquiry pattern·의료법 가드 성능

### 옵션

| 옵션 | 강점 | 약점 | 비용 (대략) |
|---|---|---|---|
| **Claude Sonnet 4.6 (1M)** | 한국어 자연스러움 ⭐⭐⭐⭐⭐ · 장문 컨텍스트 (page dump 가능) · 가드 룰 준수 ⭐⭐⭐⭐ | API 비용 (Opus보다 낮지만 GPT-4o보단 높음) | $3/M input, $15/M output (1M tier) |
| **Claude Opus 4.7** | 가드·뉘앙스 최강 · 의료 도메인 정확도 ⭐⭐⭐⭐⭐ | 비용 ↑ · latency ↑ | $15/M input, $75/M output |
| **GPT-4o** | 비용 낮음 · 한국어 OK · ecosystem 풍부 | 가드 룰 회피 빈도 ↑ (Claude 대비) · 의료 뉘앙스 약함 | $2.5/M input, $10/M output |
| **GPT-4.1 / o-series** | reasoning 강 (E. 의사결정 영역에 좋음) | 비용·latency ↑ | varies |
| **자체 fine-tuned** | 도메인 특화 · privacy↑ | 학습 데이터·MLOps 부담 | Phase 2 이후 |

### 추천

- **M2 chat 골격: Claude Sonnet 4.6 (1M context)** — 한국어 + 가드 준수 + 비용 균형. Vercel AI Gateway 통해 provider-agnostic하게 wiring (Claude 외 추후 추가 쉬움)
- **M6 직전 a/b 측정**: K5 §8 검증 체크리스트 7개 시나리오 + founder 페인 dump 기반 30-50개 시나리오로 Sonnet 4.6 vs Opus 4.7 vs GPT-4o 비교. 가드 위반·active inquiry 품질·tone 평가
- **Phase 2 검토**: 페어 retention·conversation 데이터 누적 후 한국 IVF 특화 fine-tuning (Claude/OpenAI API → 자체 모델 학습 dataset 확보)

### 결정 timing

- M2 시작 전: Sonnet 4.6 commit
- M6 시작 전 (3-4개월 후): 측정 결과로 최종 결정

---

## 2. AI Companion System Prompt 구조

> **질문**: 4-5 영역별 분리 vs 단일 통합 + 모드 switch

### 옵션

| 옵션 | 강점 | 약점 |
|---|---|---|
| **단일 통합 + 영역 routing** (K5 v0) | system prompt 하나로 관리 · 영역 섞이는 케이스 처리 자연스러움 · maintenance 쉬움 | prompt 길이 ↑ (1M context면 문제 없음) · 영역별 깊이 어느 정도 한계 |
| **영역별 분리 prompt** | 영역별 깊이 ↑ · prompt 짧음 (latency↓) | 영역 routing 별도 (classifier) · 영역 섞이는 케이스 어색 · maintenance ×5 |
| **하이브리드** (공통 가드 + 영역별 sub-prompt) | 가드는 공통 · 영역 깊이도 확보 | 복잡도 ↑ |

### 추천

**단일 통합 + 영역 routing** (K5 v0 구조 그대로 진행).

이유:
- 사용자 입력이 4-5 영역 섞이는 케이스 빈번 (예: "비용 부담 → 부부 갈등 → 멘탈 무너짐")
- K1 가드 룰 5개를 모든 영역에 일관 적용해야 함. 통합 prompt가 자연스러움
- Sonnet 4.6 1M context면 prompt 길어도 OK
- maintenance·iteration 속도 우선

M6에서 영역별 답변 품질 부족 발견 시 → 하이브리드로 진화 검토.

### 결정 timing

M2 시작 시 commit. M6에서 재평가.

---

## 3. RAG knowledge base 구성

> **질문**: hosto K2 자료 + 추가 IVF 자료(대한생식의학회·ASRM·ESHRE) — 어디까지 수집·검증 후 RAG?

→ **이 항목은 별도 K6 문서로 정리**: `docs/knowledge/rag_sources.md`

### 핵심 결정

| 결정 | 내용 |
|---|---|
| Vector DB | **Supabase pgvector** (이미 Supabase 사용 중, 별도 서비스 X) |
| Embedding | **BGE-M3 또는 KURE (한국어 특화)** vs OpenAI text-embedding-3-small — M6 직전 측정 |
| 초기 수집 (M2) | Tier 1 한국 sample 50-100 청크 (대한생식의학회 환자안내문·KDCA·보건복지부 지원사업) |
| Full 수집 (M6) | Tier 1 + Tier 2 hosto 자산 통합 + Tier 3 검수 후 일부 |
| 법무 검수 | Tier 1 자료 변호사 검수 후 ingest (Phase 0 후반·M5 직전) |

### 결정 timing

M2 시작 시 Supabase pgvector·BGE-M3 commit (가설). M6 직전 embedding 모델 재측정.

---

## 4. PWA vs Native

> **질문**: Phase 1 PWA로 시작 OK인지 (M3 카톡 알림 추가 시 재검토)

### 옵션

| 옵션 | 강점 | 약점 |
|---|---|---|
| **PWA (Next.js)** | 빠른 빌드 · Vercel 매끄러움 · 한 codebase · 업데이트 즉시 | iOS web push (16.4+) 제약 · 앱스토어 비노출 · 일부 native API 없음 |
| **React Native** | 앱스토어 노출 · push notification full · native API | 별도 codebase · 빌드·심사 cycle · iOS 개발자 등록 ($99/년) |
| **하이브리드 (PWA + Capacitor)** | Web → 앱스토어 wrap · 한 codebase | 일부 native 한계 여전 · build·심사 cycle |

### 추천

**Phase 1 = PWA. M3 카톡 알림 추가 시 재검토. Phase 2에 RN 검토.**

이유:
- founder = 9년차 PO/기획자, RN 학습 곡선 + 별 codebase 관리 부담 ↑
- Phase 1 베타 100-300 페어는 PWA로 충분 (회원가입·페어·chat·일기·트래커 다 web 기본)
- iOS web push 16.4+ 부터 지원 (대부분 사용자 cover)
- 앱스토어 노출 가치는 Phase 2 마케팅에서 검토 (그 시점에 RN으로 wrap)

### M3 재검토 trigger

- 카톡 채널 API 가입·승인 어려우면 Web Push로만 가야 함 → iOS 호환성 측정
- 사용자 retention 측정 결과 mobile-first 명백하면 RN 우선순위 ↑

### 결정 timing

이미 PWA 가정으로 M1 빌드됨 (Next.js + Tailwind + Vercel). M2-M3 그대로 진행, M3 끝에서 재평가.

---

## 5. Founder Diary 콘텐츠 시스템

> **질문**: Notion CMS vs 자체 Markdown 정적 vs Sanity 등 — AI 코치 raw material 추출 가능성 고려

### 옵션

| 옵션 | 강점 | 약점 | AI 코치 raw material 호환 |
|---|---|---|---|
| **Notion CMS** | UX 친숙 (founder 부부) · 협업 쉬움 · DB 형태 | API 호출 latency · 외부 의존 · 갑작스러운 변경 risk | ⚠️ API export 필요 |
| **Markdown + Git** | 정적 빌드 (빠름) · 버전 관리 · AI 코치 raw material 직접 활용 · 외부 의존 0 | UX 약함 (편집기 필요) | ⭐⭐⭐⭐⭐ 그대로 활용 |
| **Sanity / Contentful** | 풍부한 schema · 미디어 관리 · 한국어 i18n | 비용 · 외부 의존 · 추가 복잡도 | ⚠️ export 필요 |
| **자체 admin in app** | full 통합 · 데이터 한 곳 | 빌드 부담 (M5에서?) | ⭐⭐⭐⭐⭐ |

### 추천

**Markdown + Git** (정적 빌드, M5에서 통합).

이유:
- founder 부부 raw material과 동일한 파일 시스템 (`docs/raw/pain-dumps/` ↔ Founder Diary post)
- AI 코치 system prompt few-shot 자동 ingest 가능
- 외부 의존 0
- 익명화 가드를 git PR review로 적용 가능
- Phase 0 (인스타) → 인스타 캡션은 별도 작성, 블로그는 Markdown
- 빠른 빌드 / Vercel 친화

**예외**: founder 부부가 Notion 편집 UX 강하게 선호 → Notion으로 시작 후 Markdown export로 마이그도 가능

### 결정 timing

M5 시작 시 commit. Phase 0 (즉시) 인스타·블로그 채널은 외부 (Wordpress·Ghost·Substack 가능)로 시작 가능 — pum 앱 in-app feed는 M5에서.

---

## 6. 법무 자문

> **질문**: 의료법 회색지대 톤 검토 (특히 AI 코치 출력)

### 자문 범위

| 분야 | 검토 대상 | 위험 |
|---|---|---|
| **의료법 §27 (무면허 의료행위)** | AI 코치 출력 (진단·처방 회피) | 보건복지부 조사·민사 |
| **의료광고법** | 앱 마케팅 카피·헤드라인·기능명 | 앱스토어 reject·과징금 |
| **개인정보보호법 (PIPA)** | 민감 의료정보 처리 (§23 별도 동의) | 행정 처분·민사 |
| **의료기기법** | AI 코치를 "의료기기"로 분류할 위험 | 인허가 필요 가능성 |
| **표시광고법** | "AI 정확도", "성공률" 류 표현 | 공정위 |

### 추천 자문 timing

| Phase | 자문 | 이유 |
|---|---|---|
| **Phase 0 후반 (2-3개월 내)** | 마케팅 카피 + 인스타 콘텐츠 첫 N개 검토 | Founder Diary publish 전 안전 확보 |
| **M5 직전 (3-4개월 내)** | AI 코치 system prompt + K1 가이드 검토 | M6 출시 전 가장 critical |
| **M8 직전** | Stripe 결제·약관·환불·해지 | Paid tier 출시 전 |
| **M9 직전** | 전체 앱 종합 검토 + privacy policy | Soft launch 전 |

### 자문 변호사 후보 type

- IT·헬스케어 전문 변호사 (의료법 + 개인정보보호법 둘 다)
- 의료기기 인허가 경험자 (의료기기법 회피 자문)
- AI/SaaS 경험자 (AI 코치 책임 범위 자문)

→ founder 측 진행. claude는 자문 결과를 K1·spec·prompt에 반영.

### 결정 timing

founder가 Phase 0 시작 시점에 변호사 후보 리서치 시작. 첫 자문 = Phase 0 후반.

---

## 7. 본인 부부 사이클 추적 시작 시점

> **질문**: 다음 사이클 시작 시점 = Phase 0 콘텐츠 + AI 코치 raw material 수집 타이밍

### 옵션

| 옵션 | Pro | Con |
|---|---|---|
| **다음 사이클 시작과 동시** | 실시간 raw material · 콘텐츠 timeliness ↑ | founder 본인 IVF 부담 ↑ (사이클 중 콘텐츠 작성 어려움) |
| **다음 사이클 종료 후 회고** | 부담 ↓ · 콘텐츠 정제도 ↑ | 실시간성 ↓ · raw material 정확도 ↓ (기억 의존) |
| **하이브리드** | dump는 실시간, 콘텐츠 publish는 1-2주 지연 | 실시간성 보존 + 부담 적정 |

### 추천

**하이브리드: dump는 실시간 (`docs/raw/pain-dumps/`), Founder Diary publish는 1-2주 지연.**

이유:
- raw material 정확도가 product의 핵심 자산 → 실시간 dump 필수
- 콘텐츠 publish는 정제·익명화·법무 검수 시간 필요 → 1-2주 buffer 안전
- 사이클 중 부담은 dump (5-10분/day) 수준에서 관리. 콘텐츠 작성은 사이클 사이 휴식 기간에

### Trigger

- 본인 부부 다음 사이클 시작 시점 (founder 결정) = Phase 0 가속 점
- 즉시 시작 가능한 dump: 현재 시점부터 (과거 사이클 회고 + 현재 상태)

### 결정 timing

founder 결정. claude는 dump 누적되면 K5 system prompt v1·M2 plan에 반영.

---

## 8. AI 코치 fail-safe

> **질문**: 의료법 가드 회피 못 하는 user 입력 시 (예: "이 약 먹어도 돼?") — 명시적 "의사 상담 권장" + AI는 답변 안 함 패턴 design

### 이미 K5에 반영

K5 §7 system prompt v0 draft에 K1 Guard 1·3 적용됨:

```
[K1 Guard-1 발동 시]
"[해당 질문]은 담당 의료진/주민센터에 직접 확인이 필요해요.
다음 방문 때 물어볼 질문 목록 같이 정리해드릴까요?"

[K1 Guard-3 응급 escalation 시]
"지금 증상은 즉시 병원 응급실 또는 119 연락이 필요할 수 있어요.
시술받은 병원 응급 연락처를 바로 누르세요. (AI는 응급 판단 불가)"
```

### 추가 UI fail-safe 제안

| Trigger | UI 동작 |
|---|---|
| K1 Guard-1·2·4·5 발동 | Chat 응답 + amber disclaimer 박스 표시 |
| K1 Guard-3 (응급) | Chat 응답 + **red** escalation 박스 + "병원 응급 연락처 등록" CTA + 119 다이얼 deep-link |
| 약 직접 질문 ("○○ 먹어도 돼?") | "약은 처방받은 분량/시점대로 복용하세요. 변경은 의사와 상의." 표준 응답 + 약 기록 저장 옵션 |
| 진단 직접 질문 ("나 ○○인가?") | "진단은 의사 영역이에요. 다음 진료 때 물어볼 질문 정리해드릴까요?" 표준 응답 |
| 응급 키워드 분류 confidence 낮음 | 안전 측 (escalation) — false positive 허용 |

### 측정·iteration

- M6 출시 후 응답 sampling → K1 Guard 위반 발견 시 prompt patch
- founder + 베타 사용자 feedback → fail-safe pattern 추가

### 결정 timing

M2 chat 골격에 이미 반영. M6에서 검증·patch.

---

## 9. 다음 행동

1. **user 결정 대기**: 위 8개 추천 중 수정·반대 의견 있으면 표시
2. user 결정 후 → claude:
   - spec doc §13 → §13 (resolved) 로 update
   - CLAUDE.md §11 미해결 → 정리된 것만 별도 위치
   - M2 plan 작성 시 본 답안 활용 (특히 1·2·3·8)

---

*최종 수정: 2026-05-14*
