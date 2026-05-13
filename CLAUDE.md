@AGENTS.md

# 품 (pum) — Claude Code 진입 가이드

> 이 폴더에서 `claude` 켜면 본 파일이 자동 로드됨. 현재 상태·다음 할 일·핵심 file 위치·user 모드 다 여기 있음. 작업 시작 전 한 번 읽고 진행.

---

## 사용자 모드 (필수 — 매 응답에 적용)

- **비개발자 친화 설명 모드** ⭐: user는 9년차 PO/기획자이지만 코드 직접 안 짬. 결과 보고·다음 step 설명은 **비즈니스 의미·일상 비유**로 풀어서. **코드 block 최소화**. 자세한 가이드: `~/.claude/projects/C--Users-butte-home/memory/feedback_explain_as_non_developer.md`
- 한국어 + 영어 기술용어 mix OK
- 간결한 테이블·불릿 선호. 핵심 추천 먼저, detail은 뒤에
- subagent dispatch는 계속 technical OK (subagent가 직접 실행); user에게 reporting할 때만 풀어 설명

---

## 현재 상태 (2026-05-14)

### M1 인프라 ✅ 완료
- Repo + Supabase Auth + 부부 페어 시스템 + RLS isolation + E2E 테스트
- 14 commits + git tag `v0.1.0-m1`
- GitHub: https://github.com/buttersoycream/pum
- 로컬에서 완전 작동 (`supabase start && npm run dev`)
- E2E 1개 + RLS 단위 6개 테스트 모두 통과

### Spec (제품 정의) v2 — AI 코치 중심
- 메인 wedge: **AI 동반자 (active inquiry chat)** — 일상·시술·멘탈·부부·비용 4-5 영역 cover
- 트래커·의료비 계산기·OCR은 M3-M7로 후순위 (user가 명시적으로 deprioritized)
- 한국 IVF 부부 컨텍스트 + founder 부부 본인 사례가 product raw material

### Founder context (founder = user 김다원)
- 본인 부부 IVF 진행/준비 중 (양쪽 난임 진단)
- 본인 부부 케이스가 product의 가장 큰 자산 (Founder Transparency + AI 코치 raw material)
- 익명+실데이터 공개 동의

---

## 다음 할 일 (우선순위)

### 1. 본인 + 아내 페인 dump (가장 시급, AI 코치 raw material)
- 최근 7일 안에 IVF 관련 질문·고민·결정 dump
- 형식 자유 (한 줄 메모·음성 받아쓰기·카톡 paste·일기 prose 다 OK)
- 본인 + 아내 각자 또는 같이
- 본 dump가 W2 AI 동반자 system prompt base + Founder Diary 콘텐츠 raw material
- **수집 위치**: `docs/raw/pain-dumps/YYYY-MM-DD-*.md` (폴더 만들고 자유롭게 저장)

### 2. M2 plan 새로 작성 (페인 dump 일부 받은 후)
- 새 spec에 맞춰 M2 milestone 정의: **AI 동반자 chat + 페어 일기 + RAG knowledge base 골격**
- `writing-plans` skill로 작성 → `docs/plans/YYYY-MM-DD-m2-*.md`
- M2 끝나면 user가 본인+아내랑 직접 AI 동반자 사용 가능 (=PMF 검증 시작)

### 3. Vercel 배포 (인터넷 공개) — user 직접
- 5-10분 작업. README §"Production deploy" 가이드:
  1. supabase.com에서 `pum-prod` project 생성 (region: Northeast Asia/Seoul, ap-northeast-2)
  2. `supabase login` → `supabase link --project-ref <ref>` → `supabase db push`
  3. vercel.com에서 GitHub repo import (`buttersoycream/pum`)
  4. Production scope에 env 변수 4개 설정: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`
  5. Deploy → 도메인 받으면 `NEXT_PUBLIC_SITE_URL` update 후 redeploy
- 인터넷 공개 = Phase 0 Founder Diary CTA 받을 수 있는 베타 대기명단 페이지로 활용 가능

### 4. Phase 0 Founder Diary (병렬, user 직접)
- 인스타그램·블로그 채널 오픈
- founder 부부 IVF timeline 익명 공개 시작
- 본인+아내 페인 dump가 Diary 콘텐츠로 변환 가능
- 시드 audience 4-8주 안 500-1000명 목표
- **콘텐츠 톤 가드**: `docs/knowledge/medical_law_tone_guide.md` strict 따라가기

---

## 핵심 file 위치

### 제품 정의
- **Spec doc (v2)**: `docs/specs/2026-05-13-mvp-design.md` — AI 코치 중심으로 rewrite됨
- **M1 plan (완료)**: `docs/plans/2026-05-13-m1-repo-auth-couple.md`
- **M2 plan**: 미작성

### 핵심 가드 — 모든 작업·콘텐츠·AI 코치 prompt에 적용 ⭐
- **`docs/knowledge/medical_law_tone_guide.md`** — 의료법 톤 가이드. anti-pattern 6개 (절대 금지) + BETA 면책 박스 + B2C 추가 가드. AI 코치 system prompt 작성 시 핵심
- **`docs/knowledge/korean_medical_system.md`** — 한국 의료수가 체계, 보험·지원금 구조, IVF별도 고시 컨텍스트
- **`docs/knowledge/privacy_compliance.md`** — Supabase RLS + 한국 PIPA + 비식별화 원칙

### hosto 마이그 reference (참고용 — 직접 복붙 X, 패턴 학습용)
- `docs/references/hosto_billing/` — 의료비 계산 룰 엔진 + DRG 패턴
- `docs/references/hosto_ocr/ocr_service.py` — Claude multimodal OCR system prompt (M7 시 starter)
- `docs/references/hosto_schema/models.py` — 의료 데이터 schema 예시

### 데이터 seed
- `data/seed/conversion_factors_2026.json` — 한국 환산지수 7종 (M5 의료비 계산기 시 활용)
- `data/seed/sanjeong_codes_2026.json` — 산정특례 V코드 (IVF 비대상이지만 reference)
- `data/seed/coverage_rules/*.json` — NHI 외래 보장 결정표 4개 (일반 외래; IVF 별도 룰 필요)

### Cross-project 자료
- `docs/handoff/2026-05-13-hosto-data-request.md` — hosto에 보낸 마이그 요청 brief

---

## 작업 시 주의 사항

1. **`docs/knowledge/medical_law_tone_guide.md`를 항상 참조** — AI 코치·UI·마케팅 톤 작업 시 anti-pattern 6개 회피. 진단·시술·약 직접 추천 X
2. **RLS isolation 무너지지 않게** — 새 페어 데이터 테이블 추가 시 `couple_id` + RLS 정책 패턴 따라가기 (참고: `supabase/migrations/20260513000003_rls.sql`). RLS 작성 시 `couple_members` 자기 참조 피하기 (security definer helper 패턴 권장; 이미 `is_couple_member()` 존재)
3. **트래커·OCR·의료비 계산기는 후순위** — user가 명시적으로 deprioritized. M3-M7로 미룸. MVP wedge로 끌어올리지 말 것
4. **남성난임 지원 한도 차별 인식** — pum 정서·기능 design 시 "남성난임 미지원 case 많음" 반영 (user 본인 부부도 영향)
5. **Founder transparency = product 핵심 자산** — founder 부부 사례를 product에 심을수록 차별화 강함. 단 익명 가이드 (이름·얼굴·병원명 비공개)
6. **commit 직접 만들지 말 것** — user 명시적 요청 시에만. push도 마찬가지

---

## Tech Stack 메모

- Next.js 16 (Turbopack) + React 19 + TypeScript
- Tailwind v4 + shadcn New York (`base-nova` 아님 — asChild 패턴 사용)
- Supabase (Postgres + Auth + RLS) — local dev에 Docker Desktop 필요
- `proxy.ts` (Next.js 16 convention, `middleware.ts` 아님)
- E2E: Playwright (`localhost`, **127.0.0.1 X** — Turbopack 하이드레이션 fail)
- Tests: `npm run test:unit` (Vitest, 6 RLS isolation tests) + `npm run test:e2e` (Playwright, 1 full flow)
- 결제 (M8): Stripe — teum LLC (US Delaware) 활용 예정
- 알림 (M3): 카톡 채널 API + Web Push (FCM)

---

## 빠른 명령어

```powershell
supabase start                  # 로컬 DB 켜기 (Docker 필요)
supabase migration up --local   # 마이그레이션 적용
npm run dev                     # 개발 서버 (localhost:3000)
npm run test:unit               # RLS 단위 테스트
npm run test:e2e                # 전체 흐름 E2E (Alice→Bob)
npm run build                   # 빌드 검증
git log --oneline               # 변경 이력
git push                        # GitHub에 push
```

---

## Commit & Push 패턴

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`
- Push 시 GitHub origin (`buttersoycream/pum`) 자동 동기화
- Milestone 완료 시 tag: M1 = `v0.1.0-m1`. M2 끝나면 `v0.2.0-m2` 식으로

---

## 진입 시 첫 행동 (Claude에게)

이 폴더에서 처음 진입 시:
1. user의 task가 무엇인지 묻기 — 위 "다음 할 일" 4개 중 어디 또는 다른 것
2. 진행 전에 `docs/specs/2026-05-13-mvp-design.md` 한 번 확인 (spec 변경됐을 수도)
3. `docs/knowledge/medical_law_tone_guide.md`는 AI·콘텐츠·UI 작업 시 항상 strict 참조
4. 비개발자 친화 설명 모드 유지
5. commit·push는 user 명시 요청 시에만
