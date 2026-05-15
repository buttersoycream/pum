# pum (품) → hosto 데이터·지식 마이그레이션 요청 brief

이 문서는 **`C:\Users\butte\home\hosto\`** 작업 디렉토리의 Claude에게 넘기는 handoff용입니다.
hosto 측 Claude는 이 문서를 읽고 hosto의 conversation 히스토리·문서·코드를 뒤져, pum에 마이그레이션 가능한 데이터·지식·코드 자산을 골라 답해주세요.

---

## 1. pum이 뭐인지

**한 줄**: 아이를 간절히 기다리는 한국 IVF 부부의 동반자 앱. 익명·실데이터 founder diary가 메인 차별화.

**제품 정서 (soul)**: 부부 둘이서가 아니라 "아이를 함께 기다리는 둘". couple은 means, child-longing이 end. 톤은 "안다·품다·기다린다".

**왜 만드는가**:
- 한국 IVF 시도 부부는 매일 사이클 관리·비용·정보 카더라·감정·관계 페인을 동시에 겪는데, 기존 솔루션이 cover 못 함
- founder 본인 부부가 IVF 진행/준비 중 = 실제 페인·비용·결정 데이터를 product에 직접 심을 수 있음
- 한국에 부재한 "익명+실데이터 founder transparency" angle

---

## 2. 타겟·시장

| | |
|---|---|
| Primary 페르소나 | 한국 IVF 1-3차 진행자 부부 (양쪽 또는 한쪽 난임 진단) |
| 시장 | 연 IVF 시행 10-15만 사이클, 부부 5-8만쌍 |
| 결제 의향 | ⭐⭐⭐⭐⭐ (회당 300-800만원 IVF 비용 부담 중인 layer) |
| Secondary (Phase 2 이후) | IUI 단계, 자연시도자, 임신 안정기 부부 |

---

## 3. MVP scope (Phase 1, 3-4개월)

| Wedge | 기능 | 데이터 의존도 |
|---|---|---|
| **W1** | Founder's Diary + 앱 통합 | 콘텐츠 중심 (hosto에서 가져올 게 적음) |
| **W2** | IVF 주사·일정·약 트래커 + 페어 알림 + OCR | 의료 용어·약물 사전·IVF 프로토콜 |
| **W3** | 한국 의료비·정부지원금·보험청구 계산기 | **한국 의료수가 + 정부 지원금 + 보험 보장 항목** ← 가장 hosto와 겹침 |

### MVP에 포함하지 않는 것 (Phase 2 이후)
- 차수 의사결정 시뮬레이터 (의료법 부담)
- 익명 매칭 커뮤니티
- AI 멘탈 코치
- 외부 의사·전문가 매칭
- iOS/Android 네이티브 앱 (PWA 우선)

---

## 4. Phase 출시 전략

| Phase | 기간 | 목표 |
|---|---|---|
| Phase 0 | 즉시 시작 (4-8주) | Founder Diary 인스타·블로그 → 시드 audience |
| Phase 1 | 3-4개월 | W1+W2+W3 통합 앱 출시 |
| Phase 2 | 6-12개월 후 | 차수 시뮬·익명 매칭·멘탈 코치 확장 |

---

## 5. 기술 스택 (참고)

- Next.js 15/16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (New York)
- Supabase (Postgres + RLS + Auth)
- Stripe (teum LLC, US Delaware) — 글로벌 확장 여지
- OpenAI GPT-4 / Anthropic Claude (AI 코치)
- GPT-4V 또는 Naver Clova (OCR)
- 카톡 채널 API + Web Push (FCM) — 알림
- Vercel (host)

---

## 6. 데이터 모델 (얇게)

```
users           -- 단일 사용자
profiles        -- email, display_name (auth.users 미러)
couples         -- 부부 단위
couple_members  -- 페어 1:N junction
couple_invites  -- 페어 초대 토큰
cycles          -- IVF 사이클 (1차/2차/3차)
treatments      -- 처치 기록 (주사·약·검사·시술)
diaries         -- 페어 일기
costs           -- 회차당 비용·지원금·보험청구
ai_chats        -- AI 코치 대화
founder_posts   -- Founder Diary
```

세부 컬럼은 각 milestone 단계에서 정의. 모든 페어 데이터 테이블에 `couple_id`로 RLS isolation.

---

## 7. 의료법 회피 톤 (가장 중요한 가드)

| ❌ 하지 않음 | ✅ 허용 범위 |
|---|---|
| 시술·약 직접 추천 | 일상 코칭 (주사 시간, 컨디션) |
| 진단 제공 | 정보 정리 (의학 용어, 의료수가) |
| 의사 의견 대체 | 기록 자동화 (OCR, 트래커) |
| | 비용 계산기 (지원금·보험) |
| | 페어 일기 (사용자 간) |
| | Founder 본인 사례 공유 (1차 자기 정보) |

→ **hosto에서 이미 정리한 "의료법 회색지대 톤 가이드"가 있다면 그게 가장 high-value 마이그레이션 자산.**

---

## 8. pum에서 필요한 데이터·지식·코드 (hosto 후보)

각 카테고리에 대해 (a) hosto 보유 여부, (b) 형식/schema, (c) 출처, (d) 갱신 빈도를 알려주세요.

### 8.1 데이터 (raw) — 우선순위 high

| # | 카테고리 | 용도 (pum) | 형식 예상 |
|---|---|---|---|
| D1 | **한국 의료수가 코드 table** (행위·검사·약물 코드 → 단가) | W3 의료비 계산기 직접 사용 | CSV / SQL table |
| D2 | **국민건강보험 보장 항목** (급여/비급여 분류, 본인부담률) | W3 보험 청구 시뮬 | CSV / SQL table |
| D3 | **정부 난임 시술 지원금 정책** (소득 분위, 회차 한도, 신청 절차, 지원 금액) | W3 지원금 자동 계산 | JSON 또는 rule table |
| D4 | **약물 사전 (IVF 호르몬·관련 약물)** — 가나비프·고나도트로핀·프로게스테론 등 — 용법·시간·부작용 | W2 트래커 + AI 코치 정보 | JSON |
| D5 | **의료 용어 사전 (한국어 + 한자 + 영문, IVF 영역 중심)** — AMH·PGT-A·OHSS 등 | W2/W6 AI 코치 정보 라이브러리 | JSON |

### 8.2 지식·conversation summary — 우선순위 high

| # | 카테고리 | 용도 |
|---|---|---|
| K1 | **의료법 회색지대 톤 가이드** (어디까지가 SaaS OK, 어디부터가 의료행위 alleg risk) | pum 마케팅·UX·AI 코치 톤 정합 |
| K2 | **한국 의료 system 이해** (의료수가 체계, 보험 청구 흐름, 정부 지원금 신청 경로) | W3 설계 정합 |
| K3 | **OCR PoC 결과** — 한국 영수증·진료기록·처방전 파싱 정확도 측정 데이터 (hosto에서 시도했다면) | pum M7 OCR 우선순위·대안 결정 |
| K4 | **의료기록 보안·privacy 처리 방식** (암호화, RLS, GDPR/PIPA 컴플라이언스) | pum §10 Privacy 정합 |

### 8.3 코드·schema 예시 — 우선순위 medium

| # | 카테고리 | 용도 |
|---|---|---|
| C1 | **의료비 계산 로직** (수가 코드 → 본인부담금 → 보험청구액 → 정부지원금 차감) | W3 implementation 참고 |
| C2 | **약물 스케줄링·알림 로직** | W2 트래커 참고 |
| C3 | **OCR → 구조화 데이터 파싱 코드** | M7 참고 |
| C4 | **의료 데이터 schema 예시** (테이블 디자인, RLS 정책) | pum data model 정합 |

### 8.4 외부 자료 list — 우선순위 low

| # | 카테고리 | 용도 |
|---|---|---|
| L1 | **한국 IVF 전문 병원 list** (병원명·위치·특화 영역) | Phase 2 페르소나 매칭 |
| L2 | **대한산부인과학회·대한생식의학회 데이터·통계** | 마케팅·시장 검증 |
| L3 | **참고 외국 IVF 앱·SaaS 리스트** (벤치마크·UI 참조) | UX 디자인 참고 |

---

## 9. hosto Claude 답변 형식 가이드

위 표의 각 항목 (D1~D5, K1~K4, C1~C4, L1~L3)에 대해 다음 4가지 중 하나로 답해주세요:

**A. 즉시 export 가능**
> 데이터 보유 + 형식 정리됨. 다음 형식으로 export 가능: JSON / CSV / SQL dump.
> 파일 위치: `[hosto 폴더 안 path]`
> 출처: `[정부 사이트, 학회, 본인 정리 등]`
> 갱신: `[최근 update 일자, 갱신 주기]`
> 마이그레이션 권장 위치: `pum/data/seed/[filename]` 또는 `pum/supabase/migrations/[timestamp]_[name].sql`

**B. 유사 데이터 있지만 가공 필요**
> 보유 형식: `[현재 형식]`
> pum에 맞추려면 필요한 가공: `[변환 절차]`
> 예상 작업량: `[XX시간]`

**C. 보유 안 함, but 출처 안내 가능**
> 보유 없음. 단, `[정부 사이트 / 학회 publication / 다른 source]`에서 얻을 수 있음.
> 접근 방법: `[직접 다운로드 / API / 크롤링 / 수기]`

**D. 보유 안 함 + source 모름**
> 해당 자료 없음. 별도 조사 필요.

답변 끝에 **종합 요약 표** 부탁 — 어떤 항목이 즉시 마이그 가능한지 한눈에 보이게.

---

## 10. 마이그레이션 후 pum 측 처리

hosto Claude가 export한 자산을 pum 측에서 받는 방식:

1. **데이터 (D1~D5)**: `pum/data/seed/[name].json` 또는 `pum/supabase/migrations/2026XXXX_[name].sql`로 저장. M3 (페어 알림 일정), M4 (의료비 계산기) milestone에서 활용.
2. **지식·문서 (K1~K4)**: `pum/docs/knowledge/[topic].md`로 정리. spec/plan 톤·가드에 반영.
3. **코드 예시 (C1~C4)**: `pum/docs/references/[name]/`에 참고 코드 보관. implementation 시 참조 (직접 복붙은 안 함, 참고만).
4. **외부 자료 list (L1~L3)**: `pum/docs/research/[topic].md`로 link·요약 정리.

---

## 11. pum 본 source of truth

| | |
|---|---|
| Spec | `C:\Users\butte\home\pum\docs\specs\2026-05-13-mvp-design.md` |
| M1 plan | `C:\Users\butte\home\pum\docs\plans\2026-05-13-m1-repo-auth-couple.md` |
| 작성자 | 김다원 (admin@teum.io) |
| 작성 일자 | 2026-05-13 |
| 본 handoff 위치 | `C:\Users\butte\home\pum\docs\handoff\2026-05-13-hosto-data-request.md` |

hosto Claude 답변은 회신 시 이 문서 path를 reference로 명시해주세요 (pum 측에서 어떤 요청에 대한 답인지 매칭하기 위함).

---

## 12. 주의 사항

- **개인정보·환자 데이터 절대 마이그하지 않기**: hosto는 병원 수납 앱이라 실제 환자 데이터를 다뤘을 가능성 있음. pum으로 넘기는 건 **익명화·집계·일반 정책·일반 의료수가 등 비식별 정보만**.
- **저작권**: 출처가 명확하고 재배포 허용된 것만 (정부 공개 데이터, 본인 정리 자료 등).
- **의료법 톤 가드**: 마이그된 자료가 pum의 의료법 회피 톤(§7)에 어긋나지 않는지 마이그 시 1차 필터링.
