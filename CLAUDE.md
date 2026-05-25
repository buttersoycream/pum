@AGENTS.md

# 품 (pum) — Claude Code 진입 가이드

> 이 폴더에서 `claude` 켜면 본 파일이 자동 로드됨. 초기 기획·진행 history·Roadmap·역할 분담·고도화 비전·위험 의제 다 여기. 매 session 시작 시 한 번 읽고 진행.

---

## 0. 사용자 모드 (필수 — 매 응답에 적용)

- **비개발자 친화 설명 모드** ⭐: user는 9년차 PO/기획자이지만 코드 직접 안 짬. 결과 보고·다음 step 설명은 **비즈니스 의미·일상 비유**로 풀어서. **코드 block 최소화**. 자세한 가이드: `~/.claude/projects/C--Users-butte-home/memory/feedback_explain_as_non_developer.md`
- 한국어 + 영어 기술용어 mix OK
- 간결한 테이블·불릿 선호. 핵심 추천 먼저, detail은 뒤에
- subagent dispatch는 계속 technical OK (subagent가 직접 실행); user에게 reporting할 때만 풀어 설명
- commit·push는 user 명시 요청 시에만

---

## 1. 초기 기획 (Brainstorming → Product 정의 v2)

### 시작 (2026-05-13)
user 질문: "단기간 실제로 돈이 될 만한 프로젝트?" → teum 5개 portfolio (teum·bid·hosto·amoa·message) reality check 후 신규 프로젝트로 결정.

### Brainstorming 흐름
1. 일반인 페인 candidates 10개 → 임신/난임·반려동물·부모부양 3 영역에 user 도메인 소스 있음
2. **임신/난임 선택** — founder-market fit 최강 (본인 부부가 IVF 시험관 진행/준비 중)
3. 통합 동반자 (A) → 익명+실데이터 founder transparency 결정
4. **브랜드 `품(pum)`** — "안다·품다" 정서, "아이를 간절히 기다리는 부부"
5. user가 8 페인 dump → product 재정의 (v2): **AI 동반자 (active inquiry) 메인**. 트래커·의료비 계산기·OCR 후순위
6. `결(gyeol)`은 추후 웨딩플래너 프로젝트로 reserve

### Product 한 줄 (v2)
> "한국 IVF 부부 컨텍스트에 깊이 들어가서, 질문을 던지고 같이 고민해주는 단 한 명의 AI 동반자."

### 차별화 축 (v2)
| | 축 | 무게 |
|---|---|---|
| ⭐0 | **Active Inquiry AI 동반자** (4-5 영역 cover, 한국 IVF 컨텍스트, K1 톤 가드) | 메인 |
| ⭐0a | **Founder's Transparency** (본인 부부 실데이터 익명 공개) | 메인 보조 |
| 1 | Couple-first (child-longing 정서) | 보조 |
| 2 | Trust/Safe (K1 톤 strict) | 자동 |
| 3 | 한국 100% 특화 | 보조 |
| 4 | Effortless 기록 (M3+) | 보조 |

### 시장
- 한국 IVF 시도 5-8만쌍/년 (회당 300-800만원 결제 의향 ⭐⭐⭐⭐⭐)
- founder 부부 = **긍정 outlier** (community 대비 멘탈·갈등 패턴 약함). raw material은 별도 angle (Founder Diary trust 자산)

### Sub-페르소나 (community archive 분석, K7 sub_personas.md)
| ID | 핵심 | Stage | Guard 위험 |
|---|---|---|---|
| **P1** | 33세 초기 진단 직후 (아내) | pre-IVF | 낮음 |
| **P2** | 36세 반복 실패 번아웃 (아내) | 3차 후 | ⚠️ **높음** (자해 사고) |
| **P3** | 38세 남편 정자 이슈 + 경제 압박 | 남성난임 | 중간 (catastrophic) |
| **P4** | 32세 자연시도 1년 정보 과부하 | pre-IVF | 낮음 |

→ system prompt few-shot 메인 source. founder 본인 raw (type B)는 별도 수령 후 보조.

### 8 페인 (user dump, 2026-05-13)
1. 일상 do/don't (영양·습관·운동)
2. 정자·난자 질 개선 시도
3. 시술 성공 확률 높이는 것
4. 멘탈 케어
5. 부부 갈등·싸움
6. "이게 하는게 맞나, 이 돈 들여가면서?" 의사결정
7. "안되면 어떡하지?" 실패 대응
8. 정보 비대칭·카더라

→ 6/8이 AI 코치 영역. 의료비 계산기는 deprioritized (지원금 변동·남성난임 미지원 케이스 많음).

---

## 2. 지금까지 한 것 (2026-05-13 ~ 2026-05-14)

### 문서·기획
- Spec doc v1 → v2 (AI 코치 중심)
- M1 implementation plan (10 tasks)
- hosto 마이그 brief
- 의료법 톤 가이드 K1 (357 lines, hosto 5곳 자료 통합)
- 한국 의료시스템 이해 K2
- privacy compliance K4

### hosto 마이그 (의료 도메인 자산)
- 25 file copy: D1 환산지수·산정특례 / D2 NHI 보장 결정표 / C1 룰 엔진 / C3 OCR / C4 schema
- 3 knowledge docs 새 작성
- 대기: D4 (IVF 약물 필터링 4-8h) / D3 (난임 지원금 정책 8-16h)

### M1 구현 ✅ 완료 (14 commits)
| Task | 비유 | 결과 |
|---|---|---|
| 1 | 빈 부지에 골조 + UI 부품 카탈로그 | Next.js 16 + Tailwind + shadcn New York |
| 2 | 자물쇠 + 데이터 창고 | Supabase local + SSR clients + proxy.ts |
| 3 | 빈 상자 4개 | profiles · couples · couple_members · couple_invites 테이블 |
| 4 | 잠금 규칙 + 안전 검사 | RLS 10 정책 + 6 단위 테스트 |
| 5 | 현관문 | 회원가입·로그인·로그아웃 + 보호된 layout |
| 6 | 배우자 초대 링크 생성 | 72시간 토큰, 32자리 비밀 코드 |
| 7 | 초대 받기 | 4가지 안전 체크 + 페어 합류 |
| 8 | 거실 페어 상태판 | "함께 가는 배우자" 카드 |
| 9 | 전체 흐름 자동 검사 | Playwright E2E (Alice→Bob 전체 시나리오) — 3 버그 발견·수정 |
| 10 | README + Vercel CLI 연결 | tag `v0.1.0-m1`, GitHub push |

### E2E가 발견한 3 버그
1. RLS 무한 루프 (Task 4) → security definer helper fix
2. Next.js 16 + 127.0.0.1 React 하이드레이션 실패 → `localhost` 사용
3. dashboard partner email 안 보이던 PostgREST join 버그 → 2단계 쿼리로 fix

### 인프라
- GitHub: https://github.com/buttersoycream/pum (private, push 동기화)
- Vercel CLI 연결됨 (`butter-kims-projects/pum`) — 실제 deploy는 user 직접. ⚠️ pum 과 gyeol 은 Vercel·Supabase 계정(아이디)이 **서로 다름** (2026-05-25 확인)
- Supabase local stack (Docker) 작동
- 로컬에서 회원가입·페어 만들기·dashboard 완전 작동

---

## 3. 앞으로 할 것 (Roadmap)

### Phase 1 MVP (4-5개월)
| M | 무엇 | 핵심 |
|---|---|---|
| M1 | ✅ Repo·Auth·Couple·RLS | 인프라 |
| **M2** | **AI 동반자 chat + 페어 일기 + RAG knowledge base 골격** | W2 첫 출시 단계 ⭐ |
| M3 | IVF 사이클 트래커 + 페어 알림 (Web Push) | 후순위 기능 |
| M4 | 의사결정 sounding board (W3 완성) + 한국 의료비 lite | "이게 맞나/안 되면?" |
| M5 | Founder Diary CMS + 앱 통합 | 콘텐츠·SEO·trust |
| M6 | AI 동반자 4-5 영역 full mode + personalization | W2 완성 |
| M7 | OCR PoC (영수증·진료기록·처방전) | hosto OCR 패턴 재사용 |
| M8 | Stripe paid tier (월 페어 결제) | 수익 시작 |
| M9 | Polish · accessibility · SEO · soft launch | 베타 100-300 페어 |

### Phase 0 (병렬, 즉시 시작)
- Founder Diary 인스타·블로그 채널 오픈
- founder 부부 IVF timeline 익명 공개
- 시드 audience 500-1000명 (4-8주)
- 베타 대기명단 → Phase 1 출시 시 우선 invite

### Phase 2 (6-12개월 후)
- 익명 매칭 커뮤니티
- sub-페르소나 확장 (IUI · 자연시도자 · 임신 후)
- 의사·전문가 매칭
- iOS/Android 네이티브 앱 — **Phase 2 Capacitor wrap 확정** (iOS+Android 동시, 트리거 기반): `docs/specs/2026-05-18-ios-android-native-strategy.md`
- B2B 한국 IVF 클리닉 화이트라벨

---

## 4. user (김다원·아내)가 해야 하는 것

### 즉시 (다음 1주)
1. **본인+아내 페인 dump** ⭐ — 최근 7일 IVF 질문·고민·결정. 형식 자유 (한 줄·음성받아쓰기·카톡 paste·일기 prose). 본인+아내 각자 또는 같이. **저장 위치**: `docs/raw/pain-dumps/YYYY-MM-DD-*.md`
2. Vercel 배포 (5-10분, README §"Production deploy" 가이드)
3. Phase 0 채널 결정 (인스타 핸들·블로그 도메인 등) + 첫 post draft

### 중기 (1개월 내)
- Phase 0 콘텐츠 작성 (주 2-3회 timeline)
- 베타 대기명단 수집 시작
- founder 부부 사이클 일정에 맞춰 raw material 누적

### 장기 (3-6개월)
- 법무 자문 (의료법 톤 검토, 특히 AI 코치 출력)
- 의료 자문 (대한생식의학회·생식의학회 자료 검증)
- 첫 베타 100-300 페어 invite + feedback 수집
- founder 부부 사이클 결과 timeline 공개 (성공·실패 모두)

---

## 5. claude가 해야 하는 것

### 코드·빌드
- M2 plan 작성 (writing-plans skill, user 페인 dump 일부 받은 후)
- M2-M9 subagent driven implementation (M1과 동일 패턴)
- subagent dispatch 시 K1 의료법 톤 가이드 strict 참조

### 가드·일관성
- 매 작업에서 `docs/knowledge/medical_law_tone_guide.md` strict 적용
- RLS isolation 패턴 따라가기 (페어 단위)
- founder transparency 정서 일관 (익명 가이드 따름)
- 비개발자 친화 설명 모드 유지

### 정리·문서
- 변경 시 spec doc·plan·CLAUDE.md sync
- 학습된 메모리 저장 (user feedback·중요 결정)
- knowledge docs 보강 (K1·K2·K4 + 추가)

### 안 함
- commit·push 임의로
- 의료 자문·법무 결정
- Vercel·Supabase 계정 작업 (user auth 필요)
- founder 부부 실데이터 임의 수정·삭제

---

## 6. 역할 분담

| 영역 | user | claude |
|---|---|---|
| Product direction·정서·brand | 결정 | 정리·반영 |
| Founder Diary 콘텐츠 | 작성 (본인 부부) | 톤 가드·검토 |
| 페인 dump (raw material) | dump | AI 코치 prompt에 반영 |
| 코드·테스트·DB | — | 작성·실행 |
| 배포 (Vercel·Supabase remote) | 직접 (계정 인증) | 가이드·README |
| 법무·의료 자문 | 진행 | 톤 결과 반영 |
| Phase 0 마케팅·SEO | 진행 | 콘텐츠 검토 |
| 사용자 feedback 수집 | 진행 | 분석·반영 |

---

## 7. 고도화 / Phase 2+ 비전

### AI 동반자 진화
- 본인 부부 sub-페르소나 자동 매칭 (어떤 timeline stage가 비슷한지)
- 음성 입력·답변 (운전 중·집안일 중)
- AI vs AI 부부 mediation (양쪽 의도 통역)
- 사이클 단계 자동 mode switch

### 확장 페르소나
- IUI 단계 부부 (M-?)
- 자연임신 시도자
- 임신 안정기 부부 (LTV 연장)
- 산후 부부 (다음 사이클 결정)
- 입양 고려 부부

### 상품 확장
- 글로벌 (영문 IVF 앱·미국·일본 — teum LLC 활용)
- B2B 한국 IVF 클리닉 화이트라벨 (예약 연동·비용 정산)
- 익명화 통계 인사이트 리포트 (의료기관·연구기관 판매)

### 기술 고도화
- 자체 fine-tuned 한국 IVF 모델 (Claude/GPT API → 본인 모델 학습)
- PII scrubber 강화 (M9 미해결)
- 의료기록 암호화 보강
- 신뢰 인증 (보건복지부·학회 협업)

---

## 8. 위험·미해결 의제

### 법적
- 의료법 회색지대 — AI 코치 출력이 의료 자문으로 비치면 보건복지부 조사 위험
- 개인정보보호법 — 민감 의료정보 처리 (PIPA §23) 별도 동의
- 의료 자문업 라이센스 검토 가능성 (amoa 투자자문업 라이센스 자문과 유사)

### 기술
- AI 모델 한국 IVF 도메인 정확도 (Claude vs GPT-4 측정 필요)
- RAG knowledge base 검증·갱신 시스템
- OCR 정확도 (한국 영수증·진료기록 — 미측정)
- 카톡 비즈니스 채널 가입·승인 (M3)

### UX (M1.5 보강 후보)
- ✅ **페어 수락 흐름 혼동 — 해결 (2026-05-17, 접근 B)**: 원인이 2개였음 — (1) middleware가 미로그인 보호경로 접근 시 목적지 미보존(토큰 유실, 문서에 없던 더 근본 원인) (2) dashboard가 couple 없는 누구에게나 초대 버튼만 노출. 수정: 수락 페이지 `(app)` 밖 공개 이동 + "배우자가 초대했어요" 환영 화면, middleware `redirect_to` 보존, login/signup 복귀, dashboard 보내기/받기 두 갈래, 빈 self-couple 자동 복구(`acceptInvite`, ON DELETE CASCADE). 단위 102 통과·build OK·E2E 3/3. 스펙: `docs/specs/2026-05-17-pair-accept-flow-design.md`. 후속 여지(스펙 §10): 클릭 없는 완전 자동 수락, 빈 couple 정리 RPC 원자화.

### 비즈니스
- CAC 검증 — Phase 0 콘텐츠 → 무료 conversion 효과 측정 필요
- Paid conversion — 월 5만원 가격 검증 필요
- LTV — IVF 평균 12-24개월 retention 검증 필요
- **남성난임 지원 한도 차별** → product 정서·기능에 반영 필요 (user 부부 직접 영향)

### 의료·정서
- founder 부부 실데이터 공개 부담 (privacy fatigue 가능)
- founder 부부 사이클 결과 실패 시 product 정서 변화 어떻게 다룰지
- 사용자 멘탈 risk (앱이 우울증 유발 가능성) — K1 톤 가이드 + K5 §7 P2 정신건강 응급 escalation 가드. 베타 모니터링 필수
- **founder = 긍정 outlier 통찰** (2026-05-14): founder 본인 raw에 over-fit 시 product가 typical 부부에게 distance. system prompt few-shot 메인 source = K7 4 페르소나 (community archive). founder는 Founder Diary 별도 angle (긍정 outlier도 IVF 결정·비용·정보 마주한다의 contrast trust 자산)

---

## 9. 핵심 file 위치

### 제품 정의
- **Spec doc (v2)**: `docs/specs/2026-05-13-mvp-design.md`
- **M1 plan (완료)**: `docs/plans/2026-05-13-m1-repo-auth-couple.md`
- **M2 plan v1 (skeleton)**: `docs/plans/2026-05-14-m2-ai-companion-skeleton.md` — 12 task overview + DB schema + 8 E2E 시나리오
- **M2 plan v1.5 (foundation, API key 불필요)**: `docs/plans/2026-05-14-m2-v1.5-foundation.md` — Task 1·2·4·5·6b·6c step-by-step (DB·Safety UI·System prompt code·Guards·Persona router·Mental health emergency). 즉시 implementation 진입 가능
- **M2 plan v1.6 (API key 필요)**: 미작성. Anthropic key + HF token 발급 후 Task 3·6·7·8·9·10·11·12

### 핵심 가드 ⭐
- `docs/knowledge/medical_law_tone_guide.md` (K1) — 의료법 anti-pattern 6개 + BETA 면책 박스 + B2C 가드
- `docs/knowledge/korean_medical_system.md` (K2) — 환산지수·산정특례·IVF 별도 고시
- `docs/knowledge/privacy_compliance.md` (K4) — Supabase RLS + PIPA + 비식별화
- `docs/knowledge/ai_companion_design.md` (K5 v1) — AI 동반자 4-5 영역·active inquiry·sub-페르소나 routing·system prompt v1·P2 정신건강 응급 확장 (M2/M6 backbone)
- `docs/knowledge/rag_sources.md` (K6) — RAG knowledge base 소스 tier·페르소나 weighted 분포·special category chunks·갱신 룰
- `docs/knowledge/sub_personas.md` (K7) ⭐ — 4 sub-페르소나 (P1·P2·P3·P4) 분석 · 영역 가중치 · 페르소나별 톤·few-shot · 응급 escalation 룰 · 공통 패턴 (의사 못 물은 질문·부부 룰·카더라 충돌·멘탈 trigger)

### 페인 dump (raw material — 두 type 분리)

**Type A (community archive)** — user가 카페·블로그·SNS·댓글 정리한 secondary research:
- `docs/raw/pain-dumps/README.md` — dump 가이드·형식·익명화
- `docs/raw/pain-dumps/TEMPLATE.md` — frontmatter 템플릿
- `docs/raw/pain-dumps/QUESTIONS.md` — 5 영역 × 영역당 5-7 구체 질문
- `docs/raw/pain-dumps/2026-05-14-다원.md` (1419 줄) — 4 페르소나 archetype dump. K7 sub_personas.md의 source.

**Type B (founder 본인 raw)** — 별도 수령 예정. founder 부부 timeline 진행 시 정리. founder = 긍정 outlier 통찰로 Founder Diary 별도 angle. 저장 위치: `docs/raw/founder-timeline/` (예정).

### Phase 0 콘텐츠 (Founder Diary 시작 패키지)
- `docs/content/phase0/README.md` — 톤 가이드·익명화·publish 워크플로
- `docs/content/phase0/01-intro-template.md` — 우리 부부 소개 (인스타 5 카드 + 블로그)
- `docs/content/phase0/02-cycle-event-template.md` — 사이클 event (채취일 등)
- `docs/content/phase0/03-cost-breakdown-template.md` — 회당 비용 분석 (SEO)
- `docs/content/phase0/04-emotional-reflection-template.md` — 감정 reflection (raw)
- `docs/content/phase0/05-decision-sounding-template.md` — 의사결정 sounding (E 영역)
- `docs/content/phase0/persona-hooks.md` ⭐ — 4 페르소나 + Founder Diary 5 vertical hook 분기 (인스타 Card 1·블로그 제목·SEO 키워드·hashtag·publish 순서)

### 의사결정 정리
- `docs/specs/2026-05-14-open-questions-resolutions.md` — spec §13 8개 open question 답안 제안 (M2 plan 진입 전 결정 대기)

### hosto 마이그 reference
- `docs/references/hosto_billing/` — 의료비 룰 엔진 패턴
- `docs/references/hosto_ocr/ocr_service.py` — OCR system prompt (M7 starter)
- `docs/references/hosto_schema/models.py` — 의료 schema 예시

### 데이터 seed
- `data/seed/conversion_factors_2026.json` — 환산지수 7종
- `data/seed/sanjeong_codes_2026.json` — 산정특례 V코드 (IVF 비대상)
- `data/seed/coverage_rules/*.json` — NHI 외래 보장 결정표 4개

### Cross-project · Setup guides
- `docs/handoff/2026-05-13-hosto-data-request.md` — hosto 마이그 brief (D1-D5·K1-K4·C1-C4 전체)
- `docs/handoff/2026-05-14-hosto-d4-ivf-drugs.md` — D4 IVF 약물 사전 단독 깊이 brief (M2 RAG ingest 형식 명시)
- `docs/handoff/c-setup-guide.md` — Phase 0 setup all-in-one (Vercel·인스타 핸들·Tally 베타 대기명단·첫 publish·첫 2주 일정)

---

## 10. Tech Stack

- Next.js 16 (Turbopack) + React 19 + TypeScript
- Tailwind v4 + shadcn New York
- Supabase (Postgres + Auth + RLS) — local: Docker Desktop 필요
- `proxy.ts` (Next.js 16 convention, **`middleware.ts` 아님**)
- E2E: Playwright (`localhost`, **127.0.0.1 X**)
- 테스트: Vitest (단위) + Playwright (E2E)
- 결제 (M8): Stripe — teum LLC 활용
- 알림 (M3): 카톡 채널 API + Web Push (FCM)
- 호스팅: Vercel (GitHub 자동 deploy)

---

## 11. 빠른 명령어

```powershell
supabase start                  # 로컬 DB 켜기 (Docker 필요)
supabase migration up --local   # 마이그레이션 적용
npm run dev                     # 개발 서버 (localhost:3100 — pum 전용 port, 3000 회피)
npm run test:unit               # RLS 단위 테스트 (6개)
npm run test:e2e                # 전체 흐름 E2E (Alice→Bob)
npm run build                   # 빌드 검증
git log --oneline               # 변경 이력
git push                        # GitHub origin에 push
```

---

## 12. 작업 시 주의 사항

1. **`docs/knowledge/medical_law_tone_guide.md`를 항상 참조** — AI 코치·UI·마케팅·콘텐츠 작업 시 anti-pattern 6개 회피
2. **RLS isolation 무너지지 않게** — 새 페어 데이터 테이블 추가 시 `couple_id` + RLS 정책 패턴. `couple_members` 자기 참조 피하기 (security definer helper `is_couple_member()` 사용)
3. **트래커·OCR·의료비 계산기는 후순위** — user 명시적 deprioritized. M3-M7로
4. **남성난임 지원 한도 차별 인식** — pum 정서·기능 design 시 "남성난임 미지원 case 많음" 반영
5. **Founder transparency = product 핵심 자산** — 익명 가이드 따름 (이름·얼굴·병원명·의사명 비공개; 수치·비용·일정·감정 공개 OK)
6. **commit·push는 user 명시 요청 시에만**
7. **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`
8. **Milestone 완료 시 tag**: M1 = `v0.1.0-m1`. M2 끝나면 `v0.2.0-m2`

---

## 13. 진입 시 첫 행동 (Claude에게)

이 폴더에서 처음 진입 시:
1. user의 task가 무엇인지 묻기 — §4 "user가 해야 하는 것" 또는 §5 "claude가 해야 하는 것" 또는 다른 것
2. 진행 전에 `docs/specs/2026-05-13-mvp-design.md` 확인 (spec 변경됐을 수도)
3. `docs/knowledge/medical_law_tone_guide.md`는 AI·콘텐츠·UI 작업 시 항상 strict 참조
4. 비개발자 친화 설명 모드 유지 (§0)
5. commit·push는 user 명시 요청 시에만
