# Phase 0 Setup Guide (C 액션 all-in-one)

> user 1-2시간 작업으로 Phase 0 인프라 전체 켜기.
>
> **순서**: ① Vercel 배포 → ② 채널 이름 결정 → ③ Tally 베타 대기명단 → ④ 첫 Intro publish → ⑤ 첫 2주 publish 일정.
>
> **Vercel 배포 가이드**: `README.md §Production deploy` (이미 작성됨). 본 문서는 마케팅 인프라.

---

## ① Vercel 배포 (5-10분)

`README.md §Production deploy` 따라가기. 핵심 6 step:

1. Supabase remote project 생성 (Northeast Asia / Seoul)
2. `supabase db push` — migrations 적용
3. Vercel에 GitHub repo `buttersoycream/pum` import
4. Vercel env vars 4개 설정 (URL · anon · service_role · SITE_URL)
5. 첫 deploy
6. `NEXT_PUBLIC_SITE_URL` 실제 도메인으로 update + redeploy

→ 결과: `https://<your-vercel>.vercel.app` 에서 M1 회원가입·페어·dashboard 다 작동

### custom domain (선택, 나중에 가능)
- pum.kr · pumda.kr · pumcouple.com 등 결정 후 Vercel "Domains" 에서 add
- DNS A record 또는 CNAME 설정 (Vercel 안내 따라)
- SSL 자동

---

## ② 채널 이름·핸들 후보

### 인스타 핸들 후보 (느낌별)

| 후보 | 톤 | 비고 |
|---|---|---|
| **@pum.ivf** | 직접·명확 | IVF 검색에 잡힘. 영문 알아보기 쉬움 |
| **@pum.couple** | 부부 중심 | couple-first 정서. 다른 부부도 cover 가능 |
| **@pum.diary** | 일기 angle | Founder Diary 자산 강조 |
| **@andapumda** | 한국적 정서 | "안다·품다·기다린다" 직접 표현. 외국인 친화 X |
| **@pum.kr** | 영토 | 한국 특화 명시. 일부러 두루두루 |
| **@pumda.ivf** | 한국+IVF | 동사형, 친근. IVF 검색 leverage |
| **@pum_journey** | journey | 여정·동반자 angle. positive outlier 톤과 부합 |
| **@함께품다** | 한글 | 한국어 사용자만 cover. Korean SEO ↑ |

**추천**: `@pum.couple` 또는 `@pum.diary` — founder = 긍정 outlier 통찰과 부합 (어두운 IVF 톤 보다는 부부·일기 정서 자산)

### 블로그 도메인 후보

| 도메인 | 비고 |
|---|---|
| `pum.kr` | 가장 깔끔. 가용성 체크 필요 |
| `pumda.kr` | 동사형. 정서 |
| `pum.co.kr` | 비즈니스 톤 |
| `pumda.co.kr` | 위와 같음 |
| `pumcouple.com` | 영문 SEO 가능 |
| `andapumda.kr` | full-message. 길지만 brand |

→ 도메인 결정은 인스타 핸들과 일치시키는 게 brand 자산 ↑. 인스타 → 도메인 순서.

### 블로그 플랫폼

| 옵션 | Pro | Con |
|---|---|---|
| **Vercel (Next.js MDX)** | 같은 codebase · M5 통합 매끄러움 · SEO 최강 | 빌드 부담 |
| **Substack** | 빠른 시작 · email subscriber 무료 | 도메인 자유도 ↓ · pum app 통합 어려움 |
| **Ghost (selfhost or pro)** | 풍부한 기능 | 비용·유지 |
| **WordPress** | 가장 많은 plugin | 별도 host · 보안 부담 |

**추천**: 첫 4-8주 = **Substack** (가장 빠름) → M5 (Founder Diary CMS 통합) 시점에 Vercel MDX로 마이그.

---

## ③ Tally 베타 대기명단 form

Tally (tally.so) — 무료·5분에 form 만들기·email collect.

### Form 제목
```
품(pum) 베타 대기명단
한국 IVF 부부의 동반자 앱
```

### Form 설명
```
'품(pum)'은 한국 IVF 부부의 동반자 앱이에요.
질문 던지고 같이 고민해주는 AI 동반자 + 부부 일기 + 비용·지원금 정리.

founder 부부가 IVF 진행 중. 익명·실데이터 공개하며 만드는 중.
출시 시 우선 invite 드릴게요.
```

### Fields (8개)

| # | 필드 | 타입 | 필수 | 비고 |
|---|---|---|---|---|
| 1 | 이메일 | email | ✓ | 출시 알림 |
| 2 | 호칭 | short text (예: 아내·남편·부부·기타) | - | persona 추적 |
| 3 | 현재 stage | radio | ✓ | "자연시도 중 / 검사 단계 / 시술 진행 중 / 시술 사이 휴식 / 결정 보류 / 기타" — K7 P1-P4 매핑 |
| 4 | 어느 영역 가장 필요? | multi-checkbox | - | "AI 동반자 chat / 부부 일기 / 비용·지원금 정리 / 시술 트래커 / 의사결정 sounding / 기타" |
| 5 | 본 글에서 가장 와닿은 것 | long text (optional) | - | feedback 수집 + 마케팅 reference |
| 6 | 카톡 알림 동의 (출시 시) | checkbox | - | M3 이후 카톡 채널 가입자 미리 확보 |
| 7 | 어떻게 알게 되셨어요? | radio (인스타·블로그·검색·지인·기타) | - | acquisition 추적 |
| 8 | 페어 모드 — 배우자 이메일 함께 적기 (선택) | email | - | couple-first 대기명단 가능성 |

### Tally settings
- Embed code 또는 직접 link
- Webhook → 나중에 (M9 또는 출시 시점) Supabase로 sync
- 또는 Tally export CSV → invite 시 일괄 send

### Link 결정
- Tally 기본: `https://tally.so/r/xxxxx`
- Custom subdomain (Pro): `pum.tally.so/waitlist`
- 그 link를 인스타 bio · 블로그 sidebar · 모든 Phase 0 글 CTA에

---

## ④ 첫 Intro publish 체크리스트

### Step 1: Template 채우기 (30분)

`docs/content/phase0/01-intro-template.md` 의 `[BRACKETS]` 본인 부부 내용으로 교체:

- [ ] `[N]년차 기획자` → 본인 직군
- [ ] `[직군 한 단어]` → 아내 직군 (식별 어렵게 broad)
- [ ] `[N]개월` → IVF 시작 후 경과
- [ ] `[N]차` → 현재까지 사이클 차수
- [ ] `[년] [월] [둘 중 한 명] 검진실` → 시작 시점
- [ ] 베타 대기명단 link (Tally URL)
- [ ] 인스타·블로그 URL 결정

### Step 2: 안전 체크 (10분)

`docs/content/phase0/persona-hooks.md §9 검수 체크리스트` 따라가기. Founder Diary 행:

- [ ] 실명·병원명·지역 0건
- [ ] 결과 보장 표현 0건
- [ ] 진단·처방 publish 0건
- [ ] 통계 인용 시 출처
- [ ] 호들갑·과장 X
- [ ] **긍정 outlier 톤 명시** (다른 부부 어두운 톤 미러링 X)
- [ ] persona 명시 (자기 case로 위장 X — 다른 부부 페인 인용 시 "다른 부부들이 community에서 자주 dump하는 패턴" 명시)

### Step 3: claude 검수 (선택, 10분)

publish 직전 claude에게 "이 글 K1 톤 가드 검수해줘" 요청. claude가:
- K1 anti-pattern 6개 위반 체크
- 익명화 가이드 위반 체크
- 톤 일관성 (긍정 outlier vs 어두움) 체크
- SEO 키워드 빈도 체크

### Step 4: 인스타 5 카드 디자인 (30-60분)

도구: Canva (무료) · Figma · ChatGPT-4o 이미지 생성

- 카드 비율: 1080×1080 square 또는 1080×1350 portrait
- 첫 카드 hook 가장 strong copy
- 5번째 카드 CTA (link in bio)
- **얼굴·실명 X** — 손·물건·풍경·일러스트만
- brand color 결정 (`품` 정서에 부합 — 따뜻한 베이지·오프화이트 또는 차분한 그레이 톤 권장)

### Step 5: publish

- 인스타: 카드 5장 + 캡션 + hashtag (persona-hooks.md §7 Founder set)
- 블로그 (Substack): long-form 전체 publish + 인스타 link
- 발행 시간: 평일 저녁 7-9시 · 주말 오전 10-12시 권장

---

## ⑤ Phase 0 첫 2주 publish 일정 (제안)

| Day | publish | 페르소나 vertical | 작업 시간 |
|---|---|---|---|
| D1 (오늘) | Vercel·인스타·Tally setup | - | 1-2h |
| D2 (내일) | **Intro post** ⭐ | Founder Diary | 30분 template + 30-60분 design |
| D4 | 비용 분석 첫 블로그 (founder 사이클 N차 회당) | Founder + P4 cross-ref | 1-2h |
| D7 | **P1 hook intro** | P1 (초기 진단) | 30분 + design |
| D10 | 의사결정 framework — 자연 vs 시술 timing | P4 | 1-2h 블로그 |
| D14 | **P3 hook intro** (남편 시점) | P3 | 30분 + design |

→ 2주 후 5 publish 완료. 베타 대기명단 50-100명 목표 (페르소나 cover 따라).

### P2 publish 보류 (법무 자문 후)

- 4 페르소나 중 P2 (반복 실패 번아웃)는 가장 sensitive
- 자해·정신건강 응급 표현 검수 필요
- Phase 0 후반 (W4-W5) + 법무 1차 자문 후 publish 권장
- 모든 P2 글 끝에 **자살예방상담 1577-0199 · 정신건강위기 1577-7129** footnote 필수

---

## ⑥ 측정 지표 (Phase 0 첫 1개월)

| 지표 | 측정 | 목표 (Phase 0 끝) |
|---|---|---|
| 인스타 follower | 자체 | 200-500 |
| 블로그 visitor (Substack subscriber 또는 Posthog) | Substack analytics 또는 Posthog | 500-1000 |
| 베타 대기명단 (Tally submissions) | Tally export | 50-150 |
| 가장 popular post | 인스타·Substack stats | refer 표시 |
| persona 분포 (Tally Q3) | Tally export 분석 | P1·P4 우위 예상 (Phase 0 entry stage) |
| acquisition channel (Tally Q7) | Tally export | 인스타 우위 예상 |

→ user가 Tally export 보내주면 claude가 분석·Phase 1 인사이트 추출.

---

## ⑦ 도구 비용 (예상)

| 도구 | 비용 | 비고 |
|---|---|---|
| Vercel | 무료 (Hobby) | $0/월. Pro $20/월은 베타 사용자 늘면 검토 |
| Supabase | 무료 (500MB DB·1GB storage) | 베타 100-300 페어면 무료 가능 |
| Substack | 무료 (subscribers 무료) · Substack 결제 시 5% | Phase 0는 무료 |
| Tally | 무료 (월 unlimited 500 submission) | Phase 0 충분 |
| Canva | 무료 (Pro $13/월) | 무료 충분 |
| Custom domain | $10-30/년 | 선택 |
| **합계** | **~$10-30/년** | Vercel·Supabase 무료 tier 안에서 |

추가 비용 (M2 이후):
- Anthropic API (M2): ~$50-200/월 (베타 100 페어 chat usage 기준)
- Hugging Face (RAG embedding): 무료 (Inference API)

---

## ⑧ user 작업 순서 (총 1-2시간)

```
D1 오전 (30분):
  ├─ Vercel 배포 (README 따라 6 step)
  └─ Supabase remote 연결 verify

D1 오후 (30분):
  ├─ 인스타 핸들 결정 + 가입
  ├─ 블로그 플랫폼 선택 (Substack 추천)
  └─ custom domain 검색·구매 (선택)

D1 저녁 (30분):
  ├─ Tally form 만들기 (8 fields)
  ├─ link 받기
  └─ 인스타 bio·블로그 sidebar에 link 부착

D2 (1-2시간):
  ├─ Intro template 본인 부부 내용 채우기 (30분)
  ├─ claude에게 검수 요청 (10분)
  ├─ 인스타 카드 5장 design (30-60분)
  └─ publish (인스타 + 블로그) ⭐
```

---

## ⑨ 막힐 때 claude에게

- "Tally form 어떻게 만드는지 step-by-step 알려줘"
- "이 글 K1 톤 가드 검수해줘" (publish 직전)
- "Canva 카드 디자인 brief 만들어줘"
- "베타 대기명단 50명 모이면 어떻게 invite 보내야 해?"
- "Substack vs Ghost vs Vercel MDX 다시 비교해줘"

---

*최종 수정: 2026-05-14. user가 1-2시간 안에 Phase 0 setup 완료 가능.*
