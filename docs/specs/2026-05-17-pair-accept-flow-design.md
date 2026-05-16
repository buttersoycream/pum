# 페어 수락 흐름 재설계 — 설계 문서

> 2026-05-17 · brainstorming 산출 · **접근 B (환영 동선) 확정**
> 관련: `CLAUDE.md` §8 (UX 위험 — 페어 수락 흐름 혼동), M1 Task 6·7·8

---

## 1. 배경 — 무엇이 깨졌나

페어 만들기는 현재 이렇게 동작한다:

- **"초대 링크 만들기" = 즉시 새 couple 생성** (`lib/couple/mutations.ts` `createCoupleAndInvite`). 링크 생성자가 그 couple의 첫 멤버가 된다.
- 받는 사람이 그 토큰으로 수락하면 같은 couple의 두 번째 멤버가 된다 (정상).

두 곳이 깨진다:

| | 메커니즘 | 결과 |
|---|---|---|
| **원인 1 — 토큰 유실** ⭐ (CLAUDE.md §8에 없던 것, 더 근본) | `lib/supabase/middleware.ts` 가 보호경로 미로그인 접근 시 `/login` 으로 보내며 **목적지(`redirect_to`)를 보존하지 않음** + 로그인 후 무조건 `/dashboard` 로 보냄 | 받는 사람이 수락 화면에 도달조차 못 함 |
| **원인 2 — 길 잃은 사람에게 "새 가정" 버튼만** (CLAUDE.md §8) | `app/(app)/dashboard/page.tsx` 가 couple 없는 사람 *누구에게나* "배우자 초대하기" 버튼만 노출 → 받는 사람이 눌러 자기 couple 생성 → `acceptInviteAction` 의 "이미 페어" 차단으로 수락 영구 불가 | 앱 안에서 복구 경로 없음 (DB 수동 개입 필요) |

결과: 보내는 사람·받는 사람이 각자 다른 couple에 묶여 영구 분리. 베타 사용자 상당수가 이 경로로 빠질 것으로 예상.

---

## 2. 목표 / 비범위

**목표**

- 받는 사람이 *가입만 하면* 자동으로 올바른 couple에 합류한다 (토큰 유실 없음).
- 받는 사람이 "새 가정 차리기" 경로를 구조적으로 마주치지 않는다.
- 한번 꼬여도 (빈 자기 couple 생성) 앱 안에서 복구된다.
- 받는 사람이 처음 보는 화면이 품의 정서(부부 동반, child-longing)와 정합한다.

**비범위 (이번에 안 함)**

- iOS 네이티브 앱 — 별도 의제. 단 §9 future-proof 원칙은 준수.
- 가입 흐름 전면 재설계 (접근 C) — 회귀 위험·M2 전 과투자.
- PWA 셋업 (manifest/service worker) — 막바지(M9) 또는 별도 작업.
- 초대 재발송·만료 연장 등 초대 관리 기능 — 후순위.

---

## 3. 사용자 동선 (확정)

### 3.1 받는 사람 (Bob)

```
Bob 이 Alice 의 초대 링크 클릭
            │
            ▼
 ┌───────────────────────────────────┐
 │  환영 화면  (로그인 불필요·공개)      │
 │  "배우자가 품에서 함께하자고          │
 │   초대했어요."                       │
 │   [ 가입하고 함께 시작 ]             │
 │   [ 이미 회원이면 로그인 ]           │
 └───────────────────────────────────┘
            │
       ┌────┴─────┐
    비회원        이미 회원
       │            │
     가입         로그인     ← 초대 토큰을 redirect_to 로 운반
       │            │
       └─────┬──────┘
             ▼
   인증 완료 → 환영 화면으로 자동 복귀 (인증 상태)
             ▼
   [ 수락하기 ] 한 번  ← 명시적 동의 (품 정서: 함께 가기로 하는 결정)
             ▼
   대시보드 ("함께 가는 배우자" 카드)
```

> "자동 합류"가 아니라 **자동 복귀 + 한 번의 명시적 수락**: 가입/로그인을 마치면 토큰을 잃지 않고 환영 화면으로 되돌아오고(원인 1 해결), 거기서 [수락하기]를 한 번 누르면 합류한다. 클릭 없는 완전 자동 수락은 §10 참고(베타 관찰 후 검토).

### 3.2 보내는 사람 — 대시보드 두 갈래

couple 없는 사용자의 대시보드 빈 상태를 두 갈래로 분리한다:

| 갈래 | 문구(초안) | 동작 |
|---|---|---|
| 초대 **보내기** | "배우자를 초대하기" | 링크 생성 (기존 `/couple/invite`) |
| 초대 **받기** | "이미 초대 링크를 받으셨나요? 받은 그 링크를 그대로 여세요" | 안내 (안전망 — 받는 사람은 이미 환영 동선으로 진입하므로 여기 거의 안 옴) |

### 3.3 엣지

- **만료·이미 사용된 링크**: 환영 화면에서 *즉시* 안내 (가입 권유 전 차단 → 헛걸음 방지).
- **본인이 본인 링크 클릭**: "본인이 보낸 초대는 수락할 수 없어요" (기존 가드 유지).
- **이미 진짜 페어인 사람이 다른 초대 클릭**: "이미 배우자와 연결되어 있어요" 명확 안내.

---

## 4. 안전장치 — 꼬임 복구

`acceptInviteAction` 의 "이미 페어" 차단을 정교화한다:

- 수락하려는 사용자가 *이미 couple 멤버*일 때, 그 couple의 **멤버가 본인 1명뿐**(= 실수로 만든 빈 자기 couple)이면 → 그 `couples` row 를 삭제하고 **정상 합류를 계속 진행**한다.
- 그 couple에 **멤버가 2명**(진짜 페어)이면 → 기존대로 차단하고 "이미 배우자와 연결되어 있어요" 안내.

**orphan 안전 (탐색으로 확인됨):** `couple_members`·`couple_invites`·`ai_chats`·`ai_messages`(간접)·`diary_entries`·`personal_context` 가 모두 `couple_id → couples(id) ON DELETE CASCADE`. 즉 `couples` row 한 줄만 지우면 딸린 데이터가 원자적으로 cascade 정리된다 — **orphan 없음**. 실수로 만든 빈 couple엔 애초에 콘텐츠가 없어 이중 안전.

**트랜잭션 결정 (베타: 간단 / 나중: 견고):** `acceptInviteAction` 은 이미 service-role admin client(RLS 우회) 사용. 베타 단계는 **순차 처리**로 간다 — 안전 순서: ① 본인 멤버십·멤버 수 재확인 → ② 멤버 1명이면 `couples` DELETE(cascade) → ③ 새 `couple_members` insert → ④ invite `accepted_at` 마킹. supabase-js 는 다중 쿼리 트랜잭션이 없으므로 ② 후 ③ 실패 시 빈 couple만 손실되는데 *이는 무해*(어차피 버릴 빈 가정). **절대 불변식**: 멤버 2명 couple은 어떤 경우에도 삭제 금지(②의 멤버 수 재확인이 가드). 원자성 견고화(Postgres `accept_invite()` security-definer RPC 로 일괄)는 retention 늘면 §10 따라 후속. M1 `is_couple_member()` security-definer 패턴 재사용 가능.

---

## 5. 변경 대상 (파일 단위 — 탐색으로 경로 확정)

| 파일 | 변경 |
|---|---|
| `app/(app)/couple/accept/[token]/` → **`app/couple/accept/[token]/`** | 디렉터리를 루트 레벨(어떤 route group에도 안 속함)로 **이동**. URL 경로 `/couple/accept/[token]` 그대로 유지. `(app)` layout 의 `requireUser()` 미적용 → 공개. `page.tsx` 는 미인증/인증 모두 처리하는 **환영 UI**로 개편(인증 진입 시 자동 수락). `actions.ts` 동반 이동 + §4 복구 분기. |
| `lib/auth/current-user.ts` | `getCurrentUser()` **신규 추가** — `requireUser()` 와 달리 미인증 시 redirect 안 하고 `null` 반환(공개 환영 페이지용). `requireUser()` 는 유지. |
| `lib/supabase/middleware.ts` (L33–37, 44–48) | protected 목록에서 `/couple/accept` **제외**(`/couple/invite`·`/dashboard` 는 계속 보호). 보호경로 미로그인 → `/login?redirect_to=<원래경로>`(목적지 보존). authPage+인증 진입 시 유효한 `redirect_to` 우선, 없으면 `/dashboard`. |
| `app/(auth)/actions.ts` (L6–39) | `loginAction`·`signupAction` 이 FormData `redirect_to` 읽어 **내부 상대경로만** 허용(`/` 로 시작 && `//` 아님 && 외부 URL 아님) 후 그곳으로 `redirect()`, 없으면 `/dashboard`. ✅ 이메일 인증은 `supabase/config.toml` 에서 비활성(`enable_confirmations=false`) → 가입 직후 세션 생성·자동 수락 가능. |
| `app/(auth)/login/page.tsx`·`signup/page.tsx` | 현재 client component·`searchParams` 미수신. `redirect_to` 를 폼→액션으로 전달하도록 수정(server wrapper로 `searchParams` 읽어 prop 전달, 또는 hidden input). 환영 화면 링크는 `/signup?redirect_to=/couple/accept/<token>` 형태로 발급. |
| `app/(app)/dashboard/page.tsx` (L25–29) | couple 없는 빈 상태를 §3.2 두 갈래로. |

> 디렉터리만 옮기고 URL 경로(`/couple/accept/[token]`)는 **불변** — 이미 발급된 링크·기존 E2E·§9 iOS Universal Links 매핑이 안 깨지도록. `invite/page.tsx` 의 링크 생성(`${origin}/couple/accept/${token}`)은 그대로 유효.

---

## 6. 토큰 운반 · 보안

- 운반 수단: **URL 쿼리** `redirect_to=/couple/accept/<token>` (Next.js 표준 패턴, 쿠키보다 단순·디버깅 쉬움).
- 토큰 자체는 현행 유지 (`randomBytes(24).toString("base64url")`, 추측 불가, 72h 만료).
- `redirect_to` 는 **앱 내부 상대경로만** 허용 (절대 URL·외부 도메인 거부 → open-redirect 차단).
- 환영 화면(공개)의 초대자 정보 노출은 **최소화**: 실명·이메일 노출 금지, "배우자" 일반 표현 사용 (privacy 가이드 K4 정합). 토큰 유효성(만료/사용됨)만 조회.

---

## 7. 에러·엣지 처리

| 상황 | 처리 |
|---|---|
| 토큰 없음/위조 | 환영 화면: "초대 링크를 찾을 수 없어요" |
| 토큰 만료 | 환영 화면: "이 초대는 만료됐어요 (72시간)" — 가입 권유 안 함 |
| 이미 사용된 토큰 | 환영 화면: "이미 사용된 초대예요" |
| 본인이 본인 초대 수락 | "본인이 보낸 초대는 수락할 수 없어요" |
| 이미 진짜 페어(2인) | "이미 배우자와 연결되어 있어요" |
| 빈 자기 couple 보유 | §4 자동 정리 후 합류 (사용자에겐 매끄럽게) |
| 가입 도중 이탈 후 재방문 | 링크 재클릭 시 동일 환영 화면 (토큰 72h 내 유효) |
| `redirect_to` 외부 URL 주입 | 무시하고 `/dashboard` 로 |

---

## 8. 테스트 계획

기존 패턴 준수: 단위는 `tests/unit/rls/couple-isolation.test.ts` 의 `admin`(service client)·`makeUser`·`signInAs` 패턴, E2E는 `tests/e2e/couple-flow.spec.ts` 의 `signup()` 헬퍼·`Date.now()` 동적 이메일·`browser.newContext()` 격리 패턴.

**단위 (Vitest)** — 신규 `tests/unit/couple/accept-invite.test.ts` (`acceptInviteAction` 직접 호출):
- 빈 자기 couple(멤버 1명) 보유 시 자동 정리 후 합류 성공 + 빈 couple·딸린 invite cascade 삭제 확인
- 진짜 페어(2인) 보유 시 차단(불변식: 2인 couple 미삭제 검증)
- 만료/이미 사용됨/본인 초대 가드 (회귀)

**E2E (Playwright, `localhost:3100`)** — `tests/e2e/`:
- **신규**: Bob 비회원 → 초대 링크 클릭 → 환영 화면 표시 → [가입] → 가입 후 자동 합류 → 대시보드 `[data-testid="partner-email"]` 확인
- **신규(복구)**: Bob 가입 → 대시보드에서 빈 couple 생성(실수 재현) → Alice 초대 링크 → 수락 → 자동 정리되어 정상 페어
- **회귀(중요)**: 기존 `couple-flow.spec.ts` 는 Bob 이 *먼저 가입*(→`**/dashboard`) 후 `inviteUrl` 방문→`text=수락하기` 클릭. 새 동선에서도 *인증 상태로 환영 화면 진입 시 [수락하기] 버튼 노출* 되어야 이 테스트가 통과 → 환영 UI는 인증 사용자에게 수락 버튼을 반드시 제공(자동 수락과 별개로 버튼도 유지). 기존 spec은 가급적 수정 없이 통과시키되, 동선 변화로 불가피하면 최소 수정.
- **회귀**: 만료 링크·본인 초대 가드

---

## 9. iOS future-proof 노트

(메모리: `project_ios_native_consideration` 정합)

- 초대 링크는 **항상 웹 도메인 URL**로만 발급 (앱 전용 스킴 금지). 향후 iOS Universal Links 로 `/couple/accept/[token]` 경로를 매핑하면 본 동선 그대로 재사용.
- 환영 화면·수락 페이지는 웹 표준 컴포넌트로 — 네이티브 wrap(Capacitor) 시 추가 작업 최소화.
- 푸시 알림은 본 설계 비범위. iOS 네이티브 가치 판단점(M3 재검토 trigger)임을 기록만.

---

## 10. 미해결 — "해보고 나중에 조정"

(user 합의: 일단 진행, 이상하면 나중에 변경)

- 환영 화면 최종 카피·정서 톤 (품 브랜드 보이스 — 구현 후 실제 화면에서 미세 조정).
- 대시보드 "초대 받기" 갈래를 *안내 문구만* 둘지 *링크 붙여넣기 입력칸*까지 줄지 — 일단 안내 문구로, 베타 관찰 후 결정.
- 빈 couple 정리 — 베타는 순차 처리(§4). 원자성 견고화(Postgres `accept_invite()` security-definer RPC 일괄 처리)는 retention/동시성 압력 생기면 후속 작업으로.
- 가입/로그인 페이지에 `redirect_to` 전달 방식 — client page + `use(searchParams)` + 폼 hidden 채택(코드베이스 `use()` 패턴과 일관).
- 클릭 없는 완전 자동 수락(인증 상태로 환영 화면 진입 시 즉시 합류, 버튼 생략) — 베타에서 [수락하기] 한 번의 마찰이 실제 문제로 관찰되면 도입 검토.
