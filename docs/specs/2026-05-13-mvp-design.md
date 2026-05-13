# 품 (pum) — IVF 부부 동반자 앱 MVP 설계 문서

- **날짜**: 2026-05-13
- **작성**: 김다원 (admin@teum.io)
- **상태**: Design v1 (brainstorming 완료, implementation plan 미작성)
- **다음 step**: writing-plans skill로 implementation plan 작성

---

## 1. 컨셉

**한 줄**: 아이를 간절히 기다리는 한국 IVF 부부의 동반자 앱. 익명·실데이터 founder diary가 메인 차별화.

**제품 정서 (soul)**: 부부 둘이서가 아니라 **"아이를 함께 기다리는 둘"**. couple은 means, **child-longing**이 end. 모든 작명·UX·콘텐츠·마케팅 톤은 "안다·품다·기다린다"의 정서 일관성을 유지. 제품명 `품(pum)` 자체가 이 정서의 직접 표현 — "품에 안다, 품다, 끌어안다".

**왜 만드는가**:
- 한국 IVF 시도 부부는 매일 사이클 관리·비용·정보 카더라·감정·관계 페인을 동시에 겪는데, 기존 솔루션(맘카페, 일반 임신앱, 의사 3분 진료, 영문 IVF 앱)이 cover 못 함.
- founder 본인 부부가 IVF 진행/준비 중 = **실제 페인·비용·결정 데이터를 product에 직접 심을 수 있음**.
- 한국에 부재한 "익명+실데이터 founder transparency" angle.

**왜 단기 수익에 빠른가**:
- IVF 진행자 결제 의향 ⭐⭐⭐⭐⭐ (이미 회당 300-800만원 쓰는 layer)
- Founder Diary 콘텐츠 = 마케팅 CAC 0원에 가까움
- 본인 부부 케이스로 PMF·기능 우선순위 즉시 검증 가능 (bid 카더라 함정 회피)

---

## 2. 타겟 페르소나 및 시장

### Primary 페르소나 (MVP)
한국 IVF 1-3차 진행자 부부 (양쪽 또는 한쪽 난임 진단).

### 시장 크기
- 한국 연 IVF 시행 10-15만 사이클 (대한산부인과학회 통계 기준)
- 부부 단위 5-8만쌍
- 결제 의향: 매우 높음 (이미 회당 300-800만원 IVF 비용 부담 중인 layer)

### Secondary 페르소나 (Phase 2 이후 확장)
- 난임 진단 + 인공수정(IUI) 단계 부부
- 자연임신 시도자 부부
- 임신 성공 후 안정기 부부 (LTV 연장)

---

## 3. Problem Statement — IVF 부부의 매일 페인

| 페인 | 빈도 | 결제 의향 |
|---|---|---|
| 호르몬 주사 시간·약 종류 관리 (배란유도·억제·황체기) | 매일 정시 | 매우 높음 (놓치면 사이클 실패) |
| 채취·이식 일정·컨디션·금기사항 | 사이클 후반 매일 | 매우 높음 |
| 회차당 300-800만원 비용·정부지원금·보험청구 | 사이클당 1번 | 매우 높음 |
| 1차 실패 후 다음 결정 (2차 vs 휴식 vs 병원 변경) | 결정 시점 절박 | 매우 높음 |
| 호르몬 부작용·감정 기복·OHSS 자가 모니터링 | 매일 | 높음 |
| 부부 갈등·책임 분담·일·휴직 조율 | 매일 | 높음 |
| 카더라 vs 의학 정보 해석 (PGT-A, AMH, 등급 등) | 의문마다 | 높음 |

### 기존 솔루션 한계
- **맘카페·블로그**: 카더라 천국, 검증 어려움, 비방·과장 빈번
- **일반 임신앱**: IVF 특화 부재, 페어·부부 미고려, 한국 의료수가 부재
- **의사 3분 진료**: 질문 못 함, 결과 해석 부족, 다음 진료 전까지 절문 누적
- **영문 IVF 앱**: 한국 의료·보험·지원금·휴가 제도 컨텍스트 부재

---

## 4. 차별화 6축

| | 차별화 축 | 설명 | 무게 |
|---|---|---|---|
| ⭐0 | **Founder's Transparency** | Founder 부부 익명+실데이터 timeline 공개 (실비용, 실차수 결정, 실감정 일기). 한국 부재 angle. 콘텐츠 마케팅·SEO·신뢰 자산 자동 | 메인 |
| 1 | Couple-first (Child-longing 정서로 변환) | 페어 모드 (배우자 페어 계정, 공유 일기, 알림 분담). 단, 정서 톤은 "부부 둘이서"가 아니라 **"아이를 함께 기다리는 둘"**. couple은 means, child-longing이 end | 보조 |
| 2 | Effortless 기록 | 진료기록·영수증 OCR 자동 파싱, 카톡 알림 → 자동 입력. 입력 피로 제거 | 보조 |
| 3 | Personalized AI | 본인 데이터·맥락 누적 → AI 코치가 사이클별 맞춤 응답 | 보조 |
| 4 | Trust/Safe | 익명 founder transparency가 곧 trust 자산. 별도 검증 없이 자동 충족 | 자동 |
| 5 | 한국 100% 특화 | 한국 의료수가, 정부 난임시술 지원금, 보험 청구 항목, 휴가·휴직 제도 | 보조 |

**메인 차별화 한 줄**: "카더라 vs 진짜 한 부부의 실비용·실결정·실감정 — 아이를 함께 기다리는 동행"

---

## 5. MVP Scope (3-4개월 빌드)

### 핵심 3 wedges

| Wedge | 기능 | 풀어주는 페인 | 차별화 축 |
|---|---|---|---|
| **W1** | Founder's Diary + 앱 통합 | 정보 카더라, Trust | ⭐0, 4 |
| **W2** | IVF 주사·일정·약 트래커 + 페어 알림 + OCR 자동 파싱 | 매일 주사·일정 관리 + 부부 책임 분담 | 1, 2 |
| **W3** | 한국 의료비·정부지원금·보험청구 계산기 | 회차당 수백만원 비용 관리 | 5 |

### MVP에 포함하지 않는 것 (Phase 2 이후로 미룸)
- 차수 의사결정 시뮬레이터 (의료법 부담)
- 익명 매칭 커뮤니티 (cold start 리스크)
- AI 멘탈 코치 챗 (장기 retention용이지 출시 wedge 아님)
- 외부 의사·전문가 매칭
- iOS/Android 네이티브 앱 (PWA로 시작)

---

## 6. Phase Rollout

| Phase | 기간 | 목표 | 결과물 |
|---|---|---|---|
| **Phase 0** | 즉시 시작 (4-8주) | 시드 audience 확보 | Founder Diary 인스타·블로그 채널 오픈, founder 부부 IVF timeline 공개 시작, 베타 대기명단 수집 |
| **Phase 1** | 3-4개월 | MVP 출시 | W1+W2+W3 통합 앱 출시, 베타 대기명단 → 첫 paying user conversion |
| **Phase 2** | 6-12개월 이후 | 통합 동반자 확장 | 차수 시뮬레이터, 익명 매칭, 멘탈 코치, sub-페르소나 확장 (IUI/자연시도자/임신 후) |

Phase 0과 Phase 1은 병렬 진행 (콘텐츠 = founder 부부 실시간 timeline, 앱 빌드 = 별도 트랙).

---

## 7. 수익 모델

### Tier 구조

| Tier | 가격 | 기능 |
|---|---|---|
| Free | 0원 | Founder Diary 일부 + 트래커 기본 + 비용 계산기 lite |
| **Paid (페어)** | **월 3-5만원** | 페어 모드 full / AI 코치 무제한 / OCR 자동 기록 / 한국 의료·지원금 자동 매칭 / 차수 시뮬 (Phase 2) |

### Unit Economics
- **ARPU**: 페어 월 3-5만원
- **평균 LTV**: IVF 평균 12-24개월 시도 기간 × ARPU = 36-120만원
- **CAC**: Phase 0 콘텐츠 마케팅으로 시드 audience 무료 conversion 기대. Phase 1 이후 광고 CAC 5-15만원 예상

### 보조 수익원 (Phase 2 이후 검토)
- 익명화 통계 인사이트 리포트 판매 (의료기관·연구기관)
- B2B 한국 IVF 클리닉 화이트라벨 (예약 연동, 비용 정산 등)

---

## 8. 아키텍처 스케치

| Layer | 기술 | 비고 |
|---|---|---|
| Frontend (Web) | Next.js 15 App Router + PWA | teumai 스택과 동일 → 학습 곡선 0 |
| Mobile | PWA 우선 | Phase 2에 RN 검토 |
| Backend·DB | Supabase (Postgres + RLS + Auth) | 페어 RLS 격리 핵심 |
| AI | OpenAI GPT-4 / Anthropic Claude | AI 코치 + 일반 NLU |
| OCR | GPT-4V or Vision API | 한국 영수증·진료기록 파싱 PoC 필요 |
| 결제 | Stripe (teum LLC, US Delaware) | 글로벌 확장 여지 |
| 알림 | 카톡 채널 API + Web Push (FCM) | 카톡이 한국 retention 핵심 |
| 콘텐츠 (Diary) | Markdown/Notion/Sanity 중 결정 | 빌드 시점 PoC |
| 호스팅 | Vercel | Next.js 친화, teumai와 동일 |
| 모니터링 | Sentry + Posthog | 행동 분석 필수 |

### 핵심 설계 원칙
- **페어 데이터 격리**: Supabase RLS로 `couple_id` 기반 row-level 격리
- **의료기록 보안**: 진료기록 OCR 결과 별도 암호화 저장
- **익명화**: Founder Diary 콘텐츠 시스템은 user 데이터와 분리된 별도 도메인·테이블

---

## 9. Data Model (얇게)

```
users           -- 단일 사용자
couples         -- 1:N users, 페어 모드
cycles          -- 1:N couples, IVF 사이클 (1차/2차/3차)
treatments      -- 1:N cycles, 처치 기록 (주사·약·검사·시술)
diaries         -- 1:N users, 페어 일기
costs           -- 1:N cycles, 비용·지원금·보험청구
ai_chats        -- 1:N users, AI 코치 대화
founder_posts   -- Founder Diary, user 데이터와 별도
```

세부 컬럼·관계는 implementation plan 단계에서 정의.

---

## 10. Privacy & Legal Considerations

### 의료법 회색지대 관리

**❌ 하지 않음**:
- 시술·약 직접 추천
- 진단 제공
- 의사 의견 대체

**✅ 허용 범위**:
- 일상 코칭 (주사 시간, 컨디션 관리)
- 정보 정리 (의학 용어, 한국 의료수가)
- 기록 자동화 (OCR, 트래커)
- 비용 계산기 (지원금·보험)
- 페어 일기 (사용자 간 대화)
- Founder 본인 사례 공유 (1차 자기 정보)

### 개인정보보호법
- 페어 데이터 RLS 완전 격리 (couple_id 기반)
- 의료기록·영수증 등 민감정보 별도 암호화
- 동의 기반 데이터 수집, 사용자 언제든 삭제 권리

### Founder's Transparency 익명 가이드

| | 공개 | 비공개 |
|---|---|---|
| 수치 | ✅ 난포·AMH·정자 수치·수정률·등급 | |
| 비용 | ✅ 실비용·정부지원금·보험청구 결과 | |
| 단계·일정 | ✅ 사이클 단계·약 종류·시술 일자 | |
| 감정 | ✅ 페어 일기·감정 변화 | |
| 식별자 | | ❌ 이름·얼굴 |
| 의료기관 | | ❌ 병원명·의사명 |
| 위치 | | ❌ 지역 식별 가능 정보 |

---

## 11. Founder's Diary 운영 (Phase 0 즉시 시작)

### 채널 전략

| 채널 | 콘텐츠 | 톤 |
|---|---|---|
| 인스타그램 | 감정·일상 비주얼, 짧은 카드 | 간절·따뜻·솔직 |
| 블로그 | SEO·long-form 정리 (비용·결정·후기) | 정보·분석 |
| 앱 안 통합 (Phase 1 이후) | timeline 시점별 노출 | 동반·맥락 |

### 콘텐츠 calendar
- 주 2-3회 timeline post
- 사이클 단계별 비용·결정 정리 포스트
- 부부 페어 모드 (둘 다 작성, 시점·관점 다름)

### 전환 funnel
콘텐츠 → CTA "같이 갈 부부 모집" → 베타 대기명단 → Phase 1 출시 시 우선 invite → free → paid

---

## 12. 시드 사용자 전략

| 단계 | 채널 | 타겟 |
|---|---|---|
| Phase 0 (4-8주) | 인스타·블로그 founder diary | 베타 대기명단 500-1000명 |
| Phase 1 출시 직후 | 베타 대기명단 invite | 100-300 paying user (페어) |
| Phase 1 이후 | 입소문, SEO, 난임 카페 자연 노출 | 월 100+ 신규 |

---

## 13. Open Questions (Implementation Plan 단계 결정)

1. **PWA vs Native**: Phase 1 PWA로 시작 OK인지, 카톡 알림과 호환성 확인 필요
2. **OCR 정확도**: GPT-4V로 한국 영수증·진료기록 파싱 PoC 필요 (정확도 미달 시 대안)
3. **카톡 채널 알림**: 비즈니스 채널 가입·승인 절차, 메시지 단가 검토
4. **Founder Diary 콘텐츠 시스템**: Notion CMS vs 자체 Markdown 정적 vs Sanity vs Hashnode 등 선택
5. **법무 자문**: 의료법 회색지대 톤 검토 (필요 시 의료 자문 변호사 상담)
6. **본인 부부 사이클 추적 시작 시점**: 다음 사이클 시작 시점 = Phase 0 콘텐츠 시작 타이밍 결정

---

## 14. 다음 단계

`writing-plans` skill을 호출하여 implementation plan 작성:
- W1·W2·W3 각각의 sub-task, 우선순위, dependency, milestone
- Phase 0 즉시 시작 가능한 콘텐츠 작업과 Phase 1 빌드 작업 병렬 진행 계획
- 위 Open Questions 우선순위 및 의사결정 경로
