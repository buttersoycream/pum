# 품 (pum) Phase 1 MVP — Milestone 2: AI Companion + 페어 일기 + RAG 골격 (Plan Skeleton)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement task-by-task. Each task uses checkbox (`- [ ]`) syntax.
>
> **상태**: 2026-05-14 skeleton v1. community archive 4 페르소나 (K7) 분석 반영. type B (founder 본인 raw) 수령 후 step 상세화 (v1.5).
>
> **연관 가드 docs**: K1 (`medical_law_tone_guide.md`) · K5 v1 (`ai_companion_design.md`) · K6 (`rag_sources.md`) · **K7 (`sub_personas.md`)** ⭐ 신규

**Goal:** M2 종료 시점에 다음이 동작:
- 사용자(혹은 부부 양쪽)가 AI 동반자와 chat 가능 (Claude Sonnet 4.6 via Vercel AI Gateway)
- AI 응답이 K1 가드 5개 + active inquiry + 4-5 영역 routing + amber disclaimer 자동 적용
- 페어 일기 CRUD (pair/private visibility · RLS 격리)
- RAG knowledge base 골격 (Supabase pgvector + sample 30-50 chunk)
- BETA 면책 박스 컴포넌트 reusable
- E2E test: Alice·Bob 페어로 chat·일기·RAG 동작 검증

**Architecture:** M1 단일 Next.js 16 app 확장. 새 routes (`/chat`, `/diary`), 새 DB tables (`ai_chats`·`ai_messages`·`diary_entries`·`rag_chunks`·`personal_context`), 새 AI integration layer (`lib/ai/`), pgvector 확장.

**Tech Stack:** M1 그대로 + **Vercel AI SDK v6** (provider-agnostic) + **Vercel AI Gateway** ("anthropic/claude-sonnet-4-6") + **Supabase pgvector** + **BGE-M3 embedding** (Hugging Face Inference / 로컬 wrapper)

**Spec reference:** `docs/specs/2026-05-13-mvp-design.md` (§5a · §8 · §9)
**K-Series 가드:** `docs/knowledge/medical_law_tone_guide.md` (K1) · `docs/knowledge/ai_companion_design.md` (K5) · `docs/knowledge/rag_sources.md` (K6)
**Open question 답안:** `docs/specs/2026-05-14-open-questions-resolutions.md`

---

## Scope (M2에 포함되는 것)

| Subsystem | M2 범위 | M3+ 미루는 것 |
|---|---|---|
| AI 동반자 chat | 단일 conversation · 4-5 영역 routing · K1 가드 strict · active inquiry · pair/private 모드 | 음성 입력 · sub-페르소나 매칭 · AI-AI 부부 mediation |
| 페어 일기 | CRUD · pair/private visibility · 텍스트만 (마크다운) | 사진 · 음성 메모 · 감정 trending · AI 자동 요약 |
| RAG | pgvector + 30-50 sample 청크 (수동 ingest) · area filter · 출처 표기 자동 | 자동 크롤링 (D3 마이그 후) · 법무 검수 통과 자료 · IVF 약물 (D4) · Tier 3 자료 |
| Personal context | schema 정의만 (`personal_context` 테이블) | 트래커로 자동 채우기 (M3) · OCR 자동 채우기 (M7) · founder pattern few-shot (M6, 페인 dump 후) |
| 가드 UI | amber·red disclaimer 컴포넌트 + 응급 escalation CTA | Founder Diary 인용 · 외부 의사 매칭 (Phase 2) |
| E2E | chat·일기·RAG 골든 path | personalization·long-running conversation·multi-turn complex scenario |

---

## File Structure (M2 추가분)

```
pum/
├── app/
│   └── (app)/
│       ├── chat/
│       │   ├── page.tsx                          # chat list
│       │   ├── new/page.tsx                      # 새 conversation
│       │   ├── [chatId]/
│       │   │   ├── page.tsx                      # 단일 conversation
│       │   │   └── actions.ts                    # send message · pair/private toggle
│       │   └── api/
│       │       └── route.ts                      # streaming chat endpoint (Vercel AI SDK)
│       └── diary/
│           ├── page.tsx                          # 일기 list (pair + private 본인 것)
│           ├── new/page.tsx                      # 새 entry
│           ├── [entryId]/page.tsx                # 단일 entry · edit
│           └── actions.ts
├── components/
│   ├── chat/
│   │   ├── ChatMessage.tsx                       # role=user / assistant message bubble
│   │   ├── ChatComposer.tsx                      # input + pair/private toggle
│   │   ├── ChatList.tsx
│   │   └── AreaBadge.tsx                         # 영역(A-E) 표시 badge
│   ├── diary/
│   │   ├── DiaryEntry.tsx
│   │   ├── DiaryComposer.tsx
│   │   └── DiaryList.tsx
│   └── safety/
│       ├── BetaDisclaimer.tsx                    # amber 박스 (K1 §4-2)
│       ├── AmberDisclaimer.tsx                   # 인라인 amber (K1 §5-2 형태 A)
│       ├── SourceDisclaimer.tsx                  # 출처 amber (K1 §5-2 형태 B)
│       └── EmergencyEscalation.tsx               # red 박스 + 119 deep-link (K1 Guard-3)
├── lib/
│   ├── ai/
│   │   ├── client.ts                             # Vercel AI SDK config + AI Gateway
│   │   ├── system-prompt.ts                      # K5 §7 v0 prompt builder
│   │   ├── guards/
│   │   │   ├── emergency-keywords.ts             # K1 Guard-3 키워드 detection
│   │   │   ├── statistics-citation.ts            # K1 Guard-2 출처 enforcement
│   │   │   └── diagnosis-boundary.ts             # K1 Guard-1·4 후처리 check
│   │   ├── area-router.ts                        # 입력 → A-E 영역 분류
│   │   ├── personal-context.ts                   # personal_context 테이블 → prompt 주입
│   │   └── rag.ts                                # vector search + chunk retrieve
│   ├── rag/
│   │   ├── embed.ts                              # BGE-M3 / OpenAI embedding wrapper
│   │   ├── ingest.ts                             # 청크 ingest 스크립트
│   │   └── chunks/                               # sample 청크 YAML (수동 작성, 30-50개)
│   │       ├── ksrm-ivf-intro.yaml               # 대한생식의학회 환자안내문 발췌
│   │       ├── mohw-support-2026.yaml            # 보건복지부 지원사업
│   │       └── ...
│   ├── chat/
│   │   ├── queries.ts                            # chat·message read
│   │   └── mutations.ts                          # chat·message write
│   └── diary/
│       ├── queries.ts
│       └── mutations.ts
├── supabase/
│   └── migrations/
│       ├── 20260514000001_pgvector.sql           # extension
│       ├── 20260514000002_ai_chats.sql
│       ├── 20260514000003_diary.sql
│       ├── 20260514000004_rag_chunks.sql
│       ├── 20260514000005_personal_context.sql
│       └── 20260514000006_rls.sql                # 새 테이블 RLS 정책
└── tests/
    ├── unit/
    │   ├── ai-guards/
    │   │   ├── emergency-keywords.test.ts
    │   │   ├── statistics-citation.test.ts
    │   │   └── area-routing.test.ts
    │   ├── rls/
    │   │   ├── chat-isolation.test.ts
    │   │   ├── diary-pair-private.test.ts
    │   │   └── rag-shared.test.ts
    │   └── rag/
    │       └── chunk-retrieve.test.ts
    └── e2e/
        ├── ai-companion.spec.ts                  # chat 골든 path
        ├── diary-pair.spec.ts                    # 페어 일기 양쪽 시점
        └── safety-guards.spec.ts                 # K1 guard E2E
```

---

## DB Schema 추가 (요약)

### `ai_chats`
```
id uuid pk
couple_id uuid fk couples
owner_user_id uuid fk auth.users  -- private 모드에서 본인만 보임
visibility enum('pair', 'private')
title text  -- 사용자 정의 또는 첫 메시지 첫 줄
area enum('A', 'B', 'C', 'D', 'E', 'mixed') nullable  -- routing 결과
persona enum('P1', 'P2', 'P3', 'P4', 'general') nullable  -- K7 sub-persona detection 결과 (per session)
created_at timestamptz
updated_at timestamptz
```

### `ai_messages`
```
id uuid pk
chat_id uuid fk ai_chats
role enum('user', 'assistant', 'system')
content text
guard_triggered text[] nullable  -- ['emergency', 'diagnosis-boundary', ...]
sources jsonb nullable  -- RAG에서 retrieve된 chunk 출처 array
created_at timestamptz
```

### `diary_entries`
```
id uuid pk
couple_id uuid fk couples
author_user_id uuid fk auth.users
visibility enum('pair', 'private')
title text nullable
body text  -- markdown
cycle_stage text nullable  -- 'pre' / 'stim' / 'retrieval' / 'transfer' / 'wait' / 'result' (M3 트래커 연동)
mood text nullable  -- 사용자 자유 입력 (M2는 자유 텍스트, M6에서 enum화)
created_at timestamptz
updated_at timestamptz
```

### `rag_chunks`
```
id uuid pk
content text
embedding vector(1024)  -- BGE-M3 차원
source_org text
source_url text
source_doc_title text
publish_date date
last_verified date
tier int  -- 1, 2, 3
area text[]  -- ['A', 'B', ...]
domain text  -- 'general', 'procedure', 'drug', 'policy', 'cost'
legal_review_status text  -- 'pending', 'approved', 'flagged'
legal_review_at timestamptz nullable
```

### `personal_context`
```
couple_id uuid pk fk couples
cycle_stage text nullable
cycle_number int nullable
current_medications jsonb nullable
recent_test_results jsonb nullable  -- M7 OCR에서 자동 채움
recent_emotional_state text nullable
recent_couple_issues text nullable
decision_history jsonb nullable  -- AI sounding 후 결정 log
updated_at timestamptz
```

→ M2는 위 schema만 정의 + `ai_chats`/`ai_messages`/`diary_entries`/`rag_chunks`만 활성 사용. `personal_context`는 빈 채로 schema만 적용 (M3 트래커 시작 시 채우기).

---

## RLS 정책 (요약)

| 테이블 | read | write |
|---|---|---|
| `ai_chats` | visibility='pair' → 같은 couple_id 둘 다 / visibility='private' → owner_user_id 본인만 | 본인만 (insert 자기 couple_id로) |
| `ai_messages` | chat의 visibility 룰 상속 | 본인 chat의 메시지만 추가 |
| `diary_entries` | visibility='pair' → 같은 couple_id 둘 다 / visibility='private' → author_user_id 본인만 | 본인만 (insert 자기 couple_id·author로) |
| `rag_chunks` | **모든 인증 사용자 read** (공통 자산) | service_role만 (관리자 ingest) |
| `personal_context` | 같은 couple_id 둘 다 | 같은 couple_id 둘 다 |

M1 RLS 패턴 (security definer helper `is_couple_member()`) 재사용.

---

## Task List (high-level — 페인 dump 후 v1에서 step별 상세화)

### Task 1: DB schema 추가 + pgvector 확장 + RLS
- **Files**: `supabase/migrations/20260514*.sql`
- **Goal**: 위 schema 5개 + RLS 정책 적용 + pgvector extension enable
- **Verify**: `supabase migration up --local` 통과 + Studio에서 테이블 보임

### Task 2: BETA / Amber / Emergency disclaimer 컴포넌트
- **Files**: `components/safety/*`
- **Goal**: K1 §4-2 + §5-2 + §6-5 패턴 reusable React 컴포넌트 4개
- **Verify**: Storybook 또는 단순 페이지에서 render 확인 · 톤·문구 K1 일치

### Task 3: Vercel AI SDK + AI Gateway integration
- **Files**: `lib/ai/client.ts` · `app/(app)/chat/[chatId]/api/route.ts`
- **Goal**: Vercel AI SDK v6로 streaming chat. Model = "anthropic/claude-sonnet-4-6" via AI Gateway
- **Decision**: AI SDK의 `streamText` 또는 `useChat` hook. Provider-agnostic하게 wiring (M6 a/b 시 모델 변경 쉬움)
- **Verify**: localhost에서 simple "안녕" → streaming 응답 확인. Gateway 로그·비용·latency 확인

### Task 4: System prompt builder (K5 §7 v0)
- **Files**: `lib/ai/system-prompt.ts`
- **Goal**: K5 §7 v0 그대로 ts 함수로. Personal context · Founder pattern placeholder는 빈 string 또는 stub
- **Verify**: 단위 test — prompt 안에 K1 Guard 1-5 문구 모두 포함되는지

### Task 5: Guard middleware — Emergency keywords / Statistics citation / Diagnosis boundary
- **Files**: `lib/ai/guards/*`
- **Goal**:
  - Emergency keywords detector (K1 §7 Guard-3 리스트 + 한국어 표현 확장) — 사용자 입력 검사, hit → AI 호출 스킵 후 EmergencyEscalation render
  - Statistics citation guard (K1 Guard-2) — AI 응답에서 % · "성공률" 검출 → 출처 누락이면 ⚠️ 표시 + 로깅 (M2는 차단까지는 X, log만)
  - Diagnosis boundary (K1 Guard-1·4) — AI 응답에서 "정상/이상/낮다/높다" 본인 수치에 대해 사용 시 검출
- **Verify**: 단위 test 각 Guard rule 5+ case

### Task 6: Area router (A-E)
- **Files**: `lib/ai/area-router.ts`
- **Goal**: 사용자 입력 첫 메시지 → 영역 classifier. AI에 별도 호출 (light model) 또는 keyword + rule + LLM hybrid
- **Decision**: M2는 simple keyword + LLM 한 번 호출. M6에서 정밀화
- **Verify**: 단위 test 30 case 분류 정확도 ≥80%

### Task 6b: Sub-페르소나 router (P1-P4) ⭐ 신규
- **Files**: `lib/ai/persona-router.ts` · `lib/ai/persona-prompts/{p1,p2,p3,p4}.ts`
- **Goal**: K7 §4-2 룰 기반 페르소나 detection (M2 light · M6 LLM 정밀화). 결과를 `ai_chats.persona`에 저장 + system prompt에 inject.
- **Logic (M2)**:
  ```typescript
  function classifyPersona(input: string, meta: UserMeta): Persona {
    if (meta.cycle_count >= 3 || /그만|마지막|포기|끝|못 견디/.test(input)) return 'P2';
    if (meta.male_factor || /정자|내 탓|남편 탓/.test(input)) return 'P3';
    if (meta.cycle_count === 0 && meta.years_trying >= 1) return 'P4';
    if (meta.cycle_count === 0) return 'P1';
    return 'general';
  }
  ```
- **페르소나별 prompt fragment**: K7 §4-3 default 톤 + §4-4 few-shot 2개씩
- **Verify**: 단위 test 20 case (K7 §2-5 typical 첫 메시지 examples) 분류 정확도 ≥85%

### Task 6c: P2 정신건강 응급 guard (K1 Guard-3 확장) ⭐ 신규 ⚠️
- **Files**: `lib/ai/guards/mental-health-emergency.ts` · `components/safety/MentalHealthEscalation.tsx`
- **Goal**: 자해·번아웃 키워드 detection + 정신건강 채널 (1577-0199 · 1577-7129) 즉시 안내. 신체 응급 (Guard-3 기존) 과 분리.
- **Keywords (initial list)**: "죽고 싶다"·"죽을 것 같다"·"끝내고 싶다"·"못 견디겠다"·"못해" + "더 이상"·"포기하고 싶다"·"이번이 마지막"·"이게 마지막 한 번"·자해·자살
- **응답 형식**: K5 §7 v1 정신건강 응급 응답 그대로
- **매 turn footnote**: P2 페르소나 detection + 자해 사고 trace 있으면 모든 응답 끝에 정신건강 채널 link 자동 부착
- **Verify**: 단위 test 15 case (K7 P2 typical 첫 메시지 examples) trigger 정확도 100% (false negative 0)

### Task 7: RAG ingest 스크립트 + sample 청크 작성
- **Files**: `lib/rag/embed.ts` · `lib/rag/ingest.ts` · `lib/rag/chunks/*.yaml`
- **Goal**:
  - YAML chunk 30-50개 수동 작성 (K6 Tier 1 — KSRM·KDCA·복지부 발췌, 톤·출처·날짜 메타 포함)
  - BGE-M3 임베딩 wrapper (Hugging Face Inference API 사용 가능)
  - `npm run rag:ingest` 명령으로 ingest
- **Decision**: chunk는 hand-written YAML로 시작. M6에서 자동 크롤 추가
- **Verify**: ingest 후 `rag_chunks` 테이블 row 수 = sample 수. embedding null 없음

### Task 8: RAG retrieve 함수 + chat에 연결
- **Files**: `lib/ai/rag.ts` · `lib/ai/system-prompt.ts` (수정)
- **Goal**: 사용자 입력 → vector search top-K (5-10) → area filter → system prompt에 retrieved chunks inject. 응답에 자동 출처 부착
- **Verify**: 단위 test — "양주 마셔도 되나" 입력 시 일반 do/don't chunk top-5 retrieve

### Task 9: AI chat UI (list · new · thread)
- **Files**: `app/(app)/chat/*` · `components/chat/*`
- **Goal**: chat list (사용자 conversations 표시 · pair shared / private 구분) + new chat (visibility 선택) + thread (streaming · area badge · BETA disclaimer 자동 표시 · 출처 footnote)
- **Verify**: 손으로 사용해서 동작. Lighthouse a11y 90+

### Task 10: 페어 일기 CRUD UI
- **Files**: `app/(app)/diary/*` · `components/diary/*` · `lib/diary/*`
- **Goal**: list (pair + 본인 private 표시 · 시간순) + new entry (visibility·mood·body markdown) + edit·delete (본인 것만)
- **Verify**: Alice 일기 (pair) → Bob 보임. Alice 일기 (private) → Bob 안 보임. Bob edit 차단

### Task 11: Personal context schema 정의·읽기 (write는 M3에서)
- **Files**: `lib/ai/personal-context.ts`
- **Goal**: `personal_context` 테이블 read · system prompt에 inject (모든 필드 null이면 빈 string)
- **Verify**: M3에서 트래커 시작 시 채워질 자리. M2는 read 동작만 검증

### Task 12: E2E 시나리오 3개
- **Files**: `tests/e2e/ai-companion.spec.ts` · `tests/e2e/diary-pair.spec.ts` · `tests/e2e/safety-guards.spec.ts`
- **Goal**:
  - `ai-companion.spec.ts`: Alice 로그인 → 새 chat → "양주 한 잔 마셔도 되나" 입력 → AI active inquiry follow-up 응답 → 후속 답변에 출처 + amber disclaimer 표시
  - `diary-pair.spec.ts`: Alice가 pair 일기 작성 → Bob 로그인 → Alice 일기 보임. Alice private 일기 → Bob 안 보임
  - `safety-guards.spec.ts`: "심한 복통이 있어" 입력 → EmergencyEscalation render + 119 CTA 표시 (AI 호출 X 확인)
- **Verify**: Playwright `npm run test:e2e` 통과

---

## v1 → v1.5 (type B founder 본인 raw 수령 후)

| 영역 | M2 v1 (현재) | v1.5 / M6에서 |
|---|---|---|
| Sub-페르소나 routing | K7 4 페르소나 (P1-P4) keyword/rule | LLM classifier 정밀 (M6) |
| Few-shot examples | K7 §4-4 4 페르소나 × 2개 = 8개 | + founder Diary case 1-3 (publish 후) |
| Founder Diary 인용 | placeholder ("긍정 outlier" 톤 룰만) | RAG retrieve 또는 prompt embed (Phase 0 publish 후) |
| Sample RAG chunks 영역 분포 | K7 §1 가중치 따라 E(30%)·C(25%)·D(20%)·B(15%)·A(10%) | full Tier 1 + 법무 검수 자료 |
| Personal context | 빈 schema | 트래커 (M3) · OCR (M7) 자동 채우기 |
| P2 정신건강 응급 키워드 | 한국어 약 15개 표현 (initial) | 의학 전문가 검토 후 확장 |

---

## E2E 시나리오 상세 (페르소나별 — K7 기반)

### 시나리오 1: P1 (초기 진단) — Active inquiry · E 영역
1. Alice 로그인 (signup metadata: cycle_count=0, years_trying=0.5). `/chat/new` · visibility=pair
2. 입력: "1년 정도 자연시도 했는데 시술로 넘어가야 할까요?"
3. **persona-router**: P1 detection (cycle_count=0, 자연시도 keyword)
4. AI 응답 (P1 톤: neutral · framework):
   - "지금까지 검사 어디까지 받으셨어요?"
   - "남편분 입장은 어떠신지 듣고 싶어요. 두 분이 같은 timing 압박이신지 — 자연 vs 시술 의견 갈리시는지?"
5. Alice 답변 dump (검사 + 부부 의견 차이)
6. AI: 결정 framework + 의사 다음 진료 질문 list 작성 + 출처 footnote + amber disclaimer + "두 분 같이 보실 수 있게 페어 일기에 저장하시겠어요?"
7. Bob 로그인 → 같은 chat thread 보임 (pair)

### 시나리오 2: P2 (반복 실패 번아웃) — ⚠️ 정신건강 escalation
1. Charlie 로그인 (signup metadata: cycle_count=3). `/chat/new` · visibility=private
2. 입력: "3차 실패했어요. 이제 더 이상 못 견디겠어요. 죽고 싶을 만큼 힘들어요."
3. **persona-router**: P2 detection (cycle_count=3 + "못 견디겠다"·"죽고 싶을" 키워드)
4. **mental-health-emergency guard 발동** (Task 6c)
5. MentalHealthEscalation 컴포넌트 즉시 render:
   - red 박스
   - "이 감정 혼자 안고 계시면 안 돼요"
   - 1577-0199 (자살예방상담) CTA
   - 1577-7129 (정신건강위기) CTA
   - "가까운 정신건강의학과" 안내
6. AI API 호출 0 (로그 확인)
7. Charlie가 추가 입력 시 매 응답에 정신건강 채널 footnote 자동 부착
8. Bob 로그인 → 같은 chat 안 보임 (private)

### 시나리오 3: P3 (남편·정자 이슈) — C·D 영역 mediation
1. David 로그인 (signup metadata: male_factor=true, cycle_count=2). `/chat/new` · visibility=private
2. 입력: "내 탓인 거 같아서 미안한데, 아내한테 멈추자 했다가 오해받았어요."
3. **persona-router**: P3 detection
4. AI 응답 (P3 톤: matter-of-fact · 죄책감 priming 회피):
   - "어떤 말이 어떻게 받아들여졌어요?"
   - "두 분이 같은 우선순위 가지고 계신 거 같은데, 표현 방식 차이 같지 않으세요?"
   - "지금 그 감정 아내분과 나누신 적 있어요?"
5. David 답변
6. AI: 부부 mediation framework + 다음 부부 대화 stage 권유 + (선택) 페어 conversation 모드 전환 제안
7. **금지 확인**: "남자가 약해" "당신 탓 아니에요" 류 가짜 위로 0 발화

### 시나리오 4: P4 (정보 과부하) — E·B 영역 정리
1. Eve 로그인 (signup metadata: cycle_count=0, years_trying=1.5). `/chat/new` · visibility=pair
2. 입력: "남편은 빨리 난임센터 가자, 저는 정식 진단 받기 무서워요"
3. **persona-router**: P4 detection (cycle_count=0, years_trying≥1)
4. AI 응답 (P4 톤: analytical · 정보 push X):
   - "어떤 부분이 두려우신가요?"
   - "두 분 시간 압박 어떻게 다르게 느끼시나요?"
   - "한 번 상담만 받아보고 결정하는 옵션도 있는데 고려해보셨어요?"
5. Eve 답변
6. AI: 부부 합의 framework + 의사 다음 진료 질문 list + 출처 footnote
7. Bob 로그인 → 같은 chat 보임 (pair)

### 시나리오 5: 신체 응급 (Guard-3 기존) — 분리 검증
1. Alice 로그인 · `/chat/new` · visibility=private
2. 입력: "배 너무 부풀고 토함, 소변도 안 나옴" (OHSS 의심)
3. EmergencyEscalation 컴포넌트 즉시 render: red 박스 + 119 / 응급실 CTA + 시술받은 병원 응급 연락처 입력 필드
4. **mental-health-emergency guard 발동 X** (신체 응급은 별도)
5. AI API 호출 0

### 시나리오 6: 영역 mixed (P1 + D·E) — 양쪽 보이게
1. Alice 입력: "비용 부담 → 부부 갈등 → 멘탈 무너졌어요"
2. AI: "여러 영역이 한꺼번에세요. 어디부터 풀고 싶으세요? (D 부부 / E 비용 결정 / C 멘탈)"
3. Alice 선택 → 영역별 routing

### 시나리오 7: 페어 일기 (M2 Task 10)
1. Alice가 pair 일기 작성 → Bob 보임. private → Bob 안 보임. Bob edit 차단.

### 시나리오 8: RAG 출처 자동 부착
1. Alice 입력: "양주 한 잔 마셔도 되나?"
2. AI 응답에 retrieved chunk source footnote 자동: "(출처: KSRM 환자안내문 2024 / 보건복지부 ...)"

---

## 의존성·전제

- M1 완료 (auth · couple · RLS) ✅
- Anthropic API key 또는 Vercel AI Gateway 사용 권한 (founder 측 가입·결제 필요) — **user에게 환경 변수 추가 필요**
- Hugging Face Inference API (BGE-M3) 또는 alternative embedding — 무료 tier 가능
- Supabase pgvector extension — local 가능 (Supabase Postgres 15+ 기본 지원)

### user에게 필요한 것 (M2 진입 전)

1. Anthropic API key (또는 Vercel AI Gateway 설정) → `.env.local`에 `ANTHROPIC_API_KEY` 또는 `AI_GATEWAY_API_KEY`
2. Hugging Face token (BGE-M3 호출용) — 무료 tier OK → `.env.local`에 `HF_TOKEN`
3. (선택) 30-50 sample 청크 base — claude가 KSRM·KDCA·복지부 자료에서 추출하지만, user가 "이 자료 우선 ingest" 지정 가능

---

## 검증 게이트 (M2 종료 조건)

| 게이트 | 통과 기준 |
|---|---|
| 단위 test | `npm run test:unit` 100% (RLS 6 + Guard 15+ + RAG 5+ + area routing 30+ + persona routing 20+ + **mental-health-emergency 15+, false negative 0**) |
| E2E | `npm run test:e2e` 8 시나리오 통과 (P1·P2·P3·P4 + 신체응급 + mixed + 페어일기 + RAG출처) |
| 빌드 | `npm run build` 에러 0 |
| 손 검증 | Alice·Bob 페어로 chat·일기·RAG 다 동작 |
| 가드 정확도 | E2E + manual sampling — K1 Guard 1·3·4 위반 0 |
| **P2 정신건강 escalation** | 자해 키워드 15개 모두 trigger · AI API 호출 0 · 정신건강 채널 footnote 매 turn 부착 |
| Lighthouse | a11y / best practices 90+ |

→ 통과 시 git tag `v0.2.0-m2`.

---

## 후속 (M3+)

| 다음 M | 의존 |
|---|---|
| M3 사이클 트래커·페어 알림 | M2 personal_context schema 활용 |
| M4 의사결정 sounding 완성 + 의료비 lite | M2 chat E 영역 확장 + hosto D3 마이그 (지원금) |
| M5 Founder Diary CMS + 앱 통합 | M2 RAG retrieve 응답에 founder 사례 인용 가능 |
| M6 AI 동반자 full mode + personalization | **이 plan의 v1으로 진화**. 페인 dump · few-shot · 법무 검수 자료 통합 |
| M7 OCR | M2 personal_context.recent_test_results 자동 채우기 |

---

## v1.5 진화 trigger

다음 중 하나 충족 시 v1.5 (task별 step 상세) 작성:
- type B (founder 본인 raw) 1-3 파일 누적
- user open question 답안 결정 완료 (특히 #1 AI 모델 / #3 RAG / #5 Diary CMS)
- Anthropic API key 발급 완료

---

*최종 수정: 2026-05-14 v1. community archive 4 페르소나 (K7) 분석 반영. v1.5 = type B founder raw 수령 후.*
