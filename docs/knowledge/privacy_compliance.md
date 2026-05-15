# pum privacy & compliance 정책

> 출처: hosto의 비식별화 원칙 + Supabase RLS 구조로 변환. hosto는 자체 JWT + ownership 필터를 썼지만 pum은 Supabase Auth + RLS 패턴이라 carry over는 정책 부분만.

## 1. 핵심 원칙

**민감 식별자 절대 저장 X**:
- 이름 (display_name은 nickname OK, 본명 권장 안 함)
- 주민등록번호
- 연락처 (전화번호·주소)
- 얼굴 사진 (Founder Diary 포함)

**저장 가능**:
- email (Supabase Auth 필수)
- nickname / display_name
- 의료 수치 (AMH·정자 수치·수정률·등급 등; 본인 정보 1차 = OK)
- 비용 (회차당 금액)
- 사이클 단계·일정
- 감정 일기 (페어 간만 공유)

## 2. 페어 데이터 격리 (Supabase RLS)

페어 단위 isolation은 모든 페어 테이블에 `couple_id` 컬럼 + RLS 정책으로 강제:

```sql
-- 모든 페어 데이터 테이블의 RLS 정책 패턴
alter table public.<table> enable row level security;

create policy <table>_couple_member_only
  on public.<table> for select
  using (
    couple_id in (
      select couple_id from public.couple_members
      where user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE도 같은 패턴
```

→ 사용자는 본인 `couple_id`에 속한 row만 read/write 가능. 다른 페어 데이터 접근 시 RLS가 row를 hide.

**⚠️ hosto는 RLS 안 씀**: Supabase 미사용, 자체 JWT + `created_by_id` ownership 필터. pum의 RLS 패턴은 hosto에서 carry over X — 별도 설계.

## 3. 민감정보 별도 처리

| 데이터 | 처리 방식 |
|---|---|
| 의료 수치 (AMH·정자 등) | DB 평문 저장, RLS로 격리. 추가 암호화는 Phase 2 검토 |
| 진료기록·영수증 이미지 (OCR 입력) | Supabase Storage with restricted access. JSON 파싱 결과만 long-term 저장, 원본 이미지는 30일 후 자동 삭제 |
| AI 코치 대화 | 사용자별 격리, 30일 후 자동 삭제 옵션 (M6 단계) |
| Founder Diary 콘텐츠 | 별도 콘텐츠 시스템 (user 데이터 테이블과 분리). 익명화 보장 |

## 4. 한국 PIPA (개인정보보호법) 컴플라이언스

| 항목 | pum 적용 |
|---|---|
| 동의 기반 수집 | 가입 시 명시적 동의 (의료정보 처리 동의 별도 체크박스) |
| 수집 목적 명시 | IVF 사이클 관리·페어 일기·비용 정산 |
| 보유 기간 | 계정 활성 + 탈퇴 후 30일 (즉시 삭제 옵션 제공) |
| 삭제 권리 | 사용자가 언제든 본인 데이터 전체 삭제 요청 가능 (Setting 화면) |
| 제3자 제공 | 원칙 안 함. AI 추론 시 OpenAI/Anthropic으로 전송되는 부분은 별도 동의 + anonymization |
| 의료정보 동의 | "민감정보" 분류 (PIPA §23) — 명시적 동의 필수 |

## 5. 보안 헤더 (hosto에서 carry over)

Next.js middleware 또는 Vercel 헤더 설정:

```ts
// middleware/proxy.ts (예시)
response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set(
  "Content-Security-Policy",
  "default-src 'self'; img-src 'self' data: https:; ...",
);
response.headers.set(
  "Permissions-Policy",
  "camera=(self), microphone=(), geolocation=()",
);
```

→ M9 (polish) 단계에서 정밀 CSP 정의.

## 6. Rate Limit + Auth

| 항목 | 구현 |
|---|---|
| 인증 | Supabase Auth (JWT + bcrypt 기본 제공) |
| Server Actions rate limit | Upstash Ratelimit + Vercel Edge Config |
| Admin 작업 | service_role key (server-side only, 절대 client 노출 X) |
| 가입 confirm | Supabase email confirm (M1 로컬 dev는 비활성 OK, prod는 활성) |

## 7. ⚠️ hosto에서 carry over **안 할 것**

| hosto 패턴 | 안 가져가는 이유 | pum 대체 |
|---|---|---|
| 자체 JWT + ownership 필터 | Supabase Auth + RLS로 충분 | Supabase Auth + RLS |
| `STORE_PATIENT_DATA` flag | pum은 페어 단위 always store (구조적 격리됨) | 페어 데이터 = 항상 저장, 의료기관 데이터 = 저장 X |
| SQLite 로컬 DB | pum은 cloud first | Supabase Postgres |
| Electron 데스크탑 보안 모델 | pum은 web/PWA — 다른 위협 모델 | Vercel + Supabase 표준 보안 |
| `created_by_id` 필터 | RLS로 대체 (선언적) | RLS 정책 |

## 8. M1 단계의 정책 적용 범위

| 항목 | M1 적용 | 후속 |
|---|---|---|
| Supabase RLS isolation (페어 단위) | ✅ M1 Task 3-4 | — |
| profiles에 email만 저장 | ✅ M1 Task 3 | — |
| HTTPS 자동 (Vercel) | ✅ M1 Task 10 | — |
| 한국 PIPA 동의 UI | ⏸️ | M9 polish |
| 30일 자동 삭제 cron | ⏸️ | M8 entitlement |
| Founder Diary 익명화 검증 | ⏸️ | Phase 0 콘텐츠 시작 전 |
| 정밀 CSP·보안 헤더 | ⏸️ | M9 polish |
| 의료정보 동의 별도 체크박스 | ⏸️ | M2 (IVF 사이클 입력 직전) |

## 9. 출처

- `hosto/CLAUDE.md` (비식별화 원칙 §1)
- `hosto/backend/app/config.py` (`STORE_PATIENT_DATA` 패턴)
- `hosto/backend/app/main.py` (보안 헤더 설정)
- `hosto/backend/app/api/auth.py` (JWT + bcrypt + slowapi 패턴)
- `hosto/DEPLOY.md §11` (알려진 갭 — PII scrubber Phase 2)
- hosto Claude 답변 (2026-05-13, K4 카테고리)
- 한국 PIPA (개인정보보호법) §23 민감정보 처리 조항
