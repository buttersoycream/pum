# 매거진형 동반자 — 기반 + 홈 (첫 조각) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pum을 혼자서도 쓸 수 있게 열고(self-space), 따뜻·포근한 톤으로 바꾸고, 사이클 단계에 맞춘 매거진 홈 + 콘텐츠 4종을 얹는다.

**Architecture:** 기존 Supabase couple 구조를 재사용해 가입 시 1인 couple(self-space)을 자동 생성 → 페어 없이도 모든 기능 동작. 콘텐츠는 저장소 내 마크다운(`content/articles/*.md`)을 `lib/content/` 인터페이스로 읽어 나중 CMS 전환에 대비. 하단 4탭 네비 + Tailwind v4 테마 토큰으로 따뜻 톤.

**Tech Stack:** Next.js 16(App Router) · Supabase(Postgres+RLS) · Tailwind v4 · gray-matter(마크다운 frontmatter) · Vitest · Playwright.

**Spec:** `docs/specs/2026-05-26-magazine-companion-foundation.md`

**전제·주의:** K1 의료법 톤 가이드(`docs/knowledge/medical_law_tone_guide.md`) strict. 기존 RLS/couple 격리 패턴 유지. 비개발자 친화 — 보고 시 비유.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `supabase/migrations/2026..._self_couple_trigger.sql` | 가입 시 self-couple 자동 생성 trigger | 신규 |
| `lib/couple/queries.ts` | `getCoupleForUser` → `getOrCreateCoupleForUser` 보강 | 수정 |
| `lib/personal-context/mutations.ts` | cycle_stage 저장 | 신규 |
| `lib/content/articles.ts` | 마크다운 글 read 인터페이스(목록·단건·필터) | 신규 |
| `content/articles/*.md` | 콘텐츠(4 카테고리 샘플) | 신규 |
| `app/globals.css` | 따뜻 톤 테마 토큰 | 수정 |
| `components/nav/BottomTabs.tsx` | 하단 4탭 | 신규 |
| `app/(app)/layout.tsx` | 헤더 → 하단탭 구조 | 수정 |
| `app/(app)/home/page.tsx` | 맞춤 홈 | 신규 |
| `app/(app)/articles/page.tsx`·`[slug]/page.tsx` | 글 목록·상세 | 신규 |
| `app/(app)/me/page.tsx` + `actions.ts` | 사이클 단계 설정·페어·설정 | 신규 |
| `lib/cycle/stages.ts` | 단계 라벨 상수 | 신규 |
| 테스트 | 단위(content·cycle·self-couple) + E2E(혼자 흐름) | 신규 |

---

## Task 0: 의존 설치 + 사이클 단계 상수

**Files:** Modify `package.json`, Create `lib/cycle/stages.ts`

- [ ] **Step 1: gray-matter 설치**

Run: `npm install gray-matter`
Expected: `package.json`에 추가, 에러 0.

- [ ] **Step 2: 단계 상수 작성**

```typescript
// lib/cycle/stages.ts
export const CYCLE_STAGES = [
  { value: "pre", label: "준비 중" },
  { value: "stim", label: "난소자극" },
  { value: "retrieval", label: "채취 후" },
  { value: "transfer", label: "이식 후" },
  { value: "wait", label: "결과 대기" },
  { value: "result", label: "결과 확인" },
] as const;

export type CycleStage = (typeof CYCLE_STAGES)[number]["value"];
export const CYCLE_STAGE_VALUES = CYCLE_STAGES.map((s) => s.value);
export function stageLabel(value: string | null): string | null {
  return CYCLE_STAGES.find((s) => s.value === value)?.label ?? null;
}
```

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json lib/cycle/stages.ts
git commit -m "feat: 매거진 - gray-matter + 사이클 단계 상수"
```

---

## Task 1: self-couple 자동 생성 (혼자 쓰기) — TDD

**Files:** Create `supabase/migrations/<ts>_self_couple_trigger.sql`, Modify `lib/couple/queries.ts`, Create `tests/unit/couple/self-couple.test.ts`

기존 가입 시 `auth.users` insert → `profiles`가 생성되는 trigger가 있을 것. 그 흐름에 self-couple 생성을 잇는다(없으면 신규 trigger).

- [ ] **Step 1: 기존 가입 trigger 확인**

Run: 읽기 — `supabase/migrations/20260513000001_profiles.sql` 및 profiles 생성 trigger.
확인: `handle_new_user()` 류 함수가 있는지, profiles를 어떻게 만드는지. 그 패턴에 맞춰 Step 2 작성.

- [ ] **Step 2: 실패 테스트 작성** (`couple-isolation.test.ts` 패턴: admin client, makeUser)

```typescript
// tests/unit/couple/self-couple.test.ts
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

describe("self-couple on signup", () => {
  it("새 유저는 가입 즉시 자기 couple의 멤버다", async () => {
    const { data: u } = await admin.auth.admin.createUser({
      email: `self-${Date.now()}@example.com`,
      password: "TestPass123!",
      email_confirm: true,
    });
    const userId = u!.user!.id;
    const { data: m } = await admin
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", userId)
      .maybeSingle();
    expect(m?.couple_id).toBeTruthy();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx dotenv -e .env.local -- vitest run tests/unit/couple/self-couple.test.ts`
Expected: FAIL — couple_members 행 없음(현재 가입 시 couple 미생성).

- [ ] **Step 4: 마이그레이션 작성** (Step 1에서 본 기존 trigger 패턴에 맞춰. security definer 함수)

```sql
-- supabase/migrations/<ts>_self_couple_trigger.sql
create or replace function public.handle_new_user_couple()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_couple_id uuid;
begin
  insert into public.couples (created_by) values (new.id) returning id into new_couple_id;
  insert into public.couple_members (couple_id, user_id) values (new_couple_id, new.id);
  return new;
end; $$;

create trigger on_auth_user_created_couple
  after insert on auth.users
  for each row execute function public.handle_new_user_couple();
```

> 주의: profiles trigger가 이미 `auth.users` after insert를 쓰면 trigger가 둘 다 실행됨(문제 없음, 순서 무관). profiles row가 FK로 필요하면 함수 안에서 profiles 보장 후 couple 생성.

- [ ] **Step 5: 로컬 적용 + 통과 확인**

Run: `supabase migration up --local` → `npx dotenv -e .env.local -- vitest run tests/unit/couple/self-couple.test.ts`
Expected: PASS.

- [ ] **Step 6: `getOrCreateCoupleForUser` 보강** (기존 유저·trigger 누락 대비 안전망)

```typescript
// lib/couple/queries.ts 에 추가
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function getOrCreateCoupleForUser(userId: string): Promise<string> {
  const existing = await getCoupleForUser(userId);
  if (existing) return existing;
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: c, error } = await admin
    .from("couples").insert({ created_by: userId }).select("id").single();
  if (error) throw error;
  await admin.from("couple_members").insert({ couple_id: c.id, user_id: userId });
  return c.id as string;
}
```

- [ ] **Step 7: 페어 차단 제거** — `app/(app)/chat/new/actions.ts`의 `getCoupleForUser`(+null 에러)를 `getOrCreateCoupleForUser`로 교체. 동일 패턴이 다른 곳에 있으면 함께 교체.

Run: `npx tsc --noEmit` → 에러 0.

- [ ] **Step 8: 커밋**

```bash
git add supabase/migrations lib/couple/queries.ts "app/(app)/chat/new/actions.ts" tests/unit/couple/self-couple.test.ts
git commit -m "feat: 매거진 - self-couple 자동 생성(혼자 쓰기) + 페어 차단 제거 [TDD]"
```

---

## Task 2: 사이클 단계 저장 (write) — TDD

**Files:** Create `lib/personal-context/mutations.ts`, `tests/unit/personal-context/set-stage.test.ts`

- [ ] **Step 1: 실패 테스트** (admin client + makeCouple 패턴 — `personal-context.test.ts` 참고)

```typescript
// tests/unit/personal-context/set-stage.test.ts
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { setCycleStage } from "@/lib/personal-context/mutations";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function makeCouple() {
  const { data: u } = await admin.auth.admin.createUser({
    email: `cs-${Date.now()}@example.com`, password: "TestPass123!", email_confirm: true,
  });
  const { data: c } = await admin.from("couples").insert({ created_by: u!.user!.id }).select().single();
  return c!.id as string;
}

describe("setCycleStage", () => {
  it("upsert 로 단계를 저장한다", async () => {
    const coupleId = await makeCouple();
    await setCycleStage(admin, coupleId, "stim");
    const { data } = await admin.from("personal_context").select("cycle_stage").eq("couple_id", coupleId).single();
    expect(data?.cycle_stage).toBe("stim");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx dotenv -e .env.local -- vitest run tests/unit/personal-context/set-stage.test.ts`
Expected: FAIL — `setCycleStage` 없음.

- [ ] **Step 3: 구현**

```typescript
// lib/personal-context/mutations.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function setCycleStage(
  db: SupabaseClient, coupleId: string, stage: string,
) {
  const { error } = await db
    .from("personal_context")
    .upsert(
      { couple_id: coupleId, cycle_stage: stage, updated_at: new Date().toISOString() },
      { onConflict: "couple_id" },
    );
  if (error) throw error;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx dotenv -e .env.local -- vitest run tests/unit/personal-context/set-stage.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/personal-context/ tests/unit/personal-context/set-stage.test.ts
git commit -m "feat: 매거진 - 사이클 단계 저장(setCycleStage) [TDD]"
```

---

## Task 3: 콘텐츠 마크다운 모듈 + 샘플 글 — TDD

**Files:** Create `lib/content/articles.ts`, `content/articles/*.md`, `tests/unit/content/articles.test.ts`

- [ ] **Step 1: 샘플 글 4개 작성** (카테고리별 1개, K1 톤. cycle_stages 태깅)

```markdown
<!-- content/articles/coffee-caffeine.md -->
---
slug: coffee-caffeine
title: 커피, 하루 한 잔은 괜찮을까요
category: tips
cycle_stages: [pre, stim]
summary: 카페인과 난임에 대해 알려진 것과, 부담 없이 줄이는 법.
published: true
order: 1
---
시술을 준비하면서 가장 자주 듣는 질문 중 하나예요. ...(K1 톤: 단정적 의학 조언 회피, "알려진 바로는", 의사 상담 권유)
```

(같은 형식으로 `mind-after-fail.md`(category: mind, cycle_stages:[wait,result]), `husband-support.md`(category: couple), `temple-drive-buseoksa.md`(category: places, cycle_stages:[])도 작성.)

- [ ] **Step 2: 실패 테스트**

```typescript
// tests/unit/content/articles.test.ts
import { describe, it, expect } from "vitest";
import { listArticles, getArticle, articlesForStage } from "@/lib/content/articles";

describe("articles", () => {
  it("전체 목록을 읽는다", () => {
    const all = listArticles();
    expect(all.length).toBeGreaterThanOrEqual(4);
    expect(all[0]).toHaveProperty("slug");
    expect(all[0]).toHaveProperty("category");
  });
  it("slug 로 단건 + 본문을 읽는다", () => {
    const a = getArticle("coffee-caffeine");
    expect(a?.title).toContain("커피");
    expect(a?.body.length).toBeGreaterThan(0);
  });
  it("사이클 단계로 필터한다(태그 없으면 전체 노출)", () => {
    const forStim = articlesForStage("stim");
    expect(forStim.some((a) => a.slug === "coffee-caffeine")).toBe(true);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run tests/unit/content/articles.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 구현** (빌드 시 파일시스템 읽기. server-only)

```typescript
// lib/content/articles.ts
import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Article = {
  slug: string; title: string; category: string;
  cycleStages: string[]; summary: string; order: number; body: string;
};

const DIR = path.join(process.cwd(), "content/articles");

function read(file: string): Article {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  return {
    slug: data.slug, title: data.title, category: data.category,
    cycleStages: data.cycle_stages ?? [], summary: data.summary ?? "",
    order: data.order ?? 99, body: content.trim(),
  };
}

export function listArticles(): Article[] {
  return fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))
    .map(read).filter((a) => (a as Article & { published?: boolean }))
    .sort((a, b) => a.order - b.order);
}
export function getArticle(slug: string): Article | null {
  return listArticles().find((a) => a.slug === slug) ?? null;
}
/** stage 매칭(태그 비었으면 전체 대상). */
export function articlesForStage(stage: string | null): Article[] {
  return listArticles().filter(
    (a) => a.cycleStages.length === 0 || (stage ? a.cycleStages.includes(stage) : false),
  );
}
export function articlesByCategory(category: string): Article[] {
  return listArticles().filter((a) => a.category === category);
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run tests/unit/content/articles.test.ts`
Expected: PASS. (`server-only` import가 vitest에서 문제되면 테스트 환경에서 mock 처리 또는 import 분리 — 확인 후 정합)

- [ ] **Step 6: 커밋**

```bash
git add lib/content/ content/articles/ tests/unit/content/articles.test.ts
git commit -m "feat: 매거진 - 콘텐츠 마크다운 모듈 + 샘플 글 4종 [TDD]"
```

---

## Task 4: 따뜻·포근 테마 (Tailwind v4)

**Files:** Modify `app/globals.css`, (폰트) `app/layout.tsx`

- [ ] **Step 1: 현재 테마 확인**

Run: 읽기 — `app/globals.css` (Tailwind v4 `@theme`/CSS 변수 구조 파악).

- [ ] **Step 2: 토큰 교체** (확인한 변수명에 맞춰. 방향값)

크림 배경/테라코타 primary/따뜻한 muted/큰 radius로 교체:
```css
/* app/globals.css — :root(라이트) 토큰 예시 (실제 변수명은 Step1 확인값 사용) */
--background: oklch(0.985 0.012 70);    /* 크림 */
--foreground: oklch(0.30 0.02 50);      /* 따뜻한 다크 */
--primary: oklch(0.62 0.13 35);         /* 테라코타 */
--primary-foreground: oklch(0.99 0 0);
--muted-foreground: oklch(0.52 0.03 55);/* 회갈색 */
--radius: 1rem;
```

- [ ] **Step 3: Pretendard 폰트** — `app/layout.tsx`에 Pretendard(웹폰트 또는 `next/font`) 적용.

- [ ] **Step 4: 빌드 + 눈 확인**

Run: `npm run build` → 에러 0. `npm run dev` → 로그인/대화 화면이 크림·테라코타 톤인지.

- [ ] **Step 5: 커밋**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: 매거진 - 따뜻·포근 테마(크림/테라코타/Pretendard)"
```

---

## Task 5: 하단 4탭 네비

**Files:** Create `components/nav/BottomTabs.tsx`, Modify `app/(app)/layout.tsx`

- [ ] **Step 1: BottomTabs 작성**

```tsx
// components/nav/BottomTabs.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/articles", label: "글", icon: "📚" },
  { href: "/chat", label: "대화", icon: "💬" },
  { href: "/me", label: "나", icon: "👤" },
];

export function BottomTabs() {
  const path = usePathname();
  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t backdrop-blur sm:mx-auto sm:max-w-md">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
            <span className="text-lg">{t.icon}</span>{t.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: layout 적용** — `app/(app)/layout.tsx`에서 상단 헤더 단순화(로고/로그아웃만 또는 제거) + `<main className="pb-20">{children}</main>` + `<BottomTabs />`. 기존 헤더 이메일/로그아웃은 '나' 탭으로 이동.

- [ ] **Step 3: 빌드 + 확인**

Run: `npm run build` → 에러 0. dev에서 탭 전환 동작.

- [ ] **Step 4: 커밋**

```bash
git add components/nav/ "app/(app)/layout.tsx"
git commit -m "feat: 매거진 - 하단 4탭 네비"
```

---

## Task 6: '나' 탭 (사이클 단계 + 페어 + 로그아웃)

**Files:** Create `app/(app)/me/page.tsx`, `app/(app)/me/actions.ts`

- [ ] **Step 1: server action 작성**

```typescript
// app/(app)/me/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { setCycleStage } from "@/lib/personal-context/mutations";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { CYCLE_STAGE_VALUES } from "@/lib/cycle/stages";

const admin = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } });

export async function setStageAction(formData: FormData) {
  const stage = String(formData.get("stage") ?? "");
  if (!CYCLE_STAGE_VALUES.includes(stage as never)) return { error: "알 수 없는 단계예요." };
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  await setCycleStage(admin(), coupleId, stage);
  revalidatePath("/home");
  return { ok: true };
}
```

- [ ] **Step 2: '나' 페이지 작성** — 현재 단계 표시 + 단계 선택(라디오/칩, `CYCLE_STAGES`) + 배우자 연결 링크(`/couple/invite`) + 로그아웃(`logoutAction`).

```tsx
// app/(app)/me/page.tsx
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { mapPersonalContext } from "@/lib/ai/personal-context";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { CYCLE_STAGES, stageLabel } from "@/lib/cycle/stages";
import { setStageAction } from "./actions";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MePage() {
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const pc = await mapPersonalContext(admin, coupleId);
  const current = stageLabel(pc.cycleStage ?? null);

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-semibold">나</h1>
      <section className="space-y-3">
        <h2 className="font-medium">지금 사이클 단계 {current && <span className="text-primary">· {current}</span>}</h2>
        <form action={setStageAction} className="flex flex-wrap gap-2">
          {CYCLE_STAGES.map((s) => (
            <button key={s.value} name="stage" value={s.value}
              className={`rounded-full border px-3 py-1 text-sm ${pc.cycleStage === s.value ? "border-primary text-primary" : "text-muted-foreground"}`}>
              {s.label}
            </button>
          ))}
        </form>
        <p className="text-muted-foreground text-xs">단계를 고르면 홈이 그 시기에 맞춰져요.</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">배우자와 함께</h2>
        <Button asChild variant="outline"><Link href="/couple/invite">배우자 초대하기</Link></Button>
      </section>
      <form action={logoutAction}><Button type="submit" variant="ghost">로그아웃</Button></form>
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build` → 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add "app/(app)/me/"
git commit -m "feat: 매거진 - '나' 탭(사이클 단계 설정·페어·로그아웃)"
```

---

## Task 7: 맞춤 홈

**Files:** Create `app/(app)/home/page.tsx`

- [ ] **Step 1: 작성** (사이클 매칭 콘텐츠 + 대화 유도. 미설정 fallback)

```tsx
// app/(app)/home/page.tsx
import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateCoupleForUser } from "@/lib/couple/queries";
import { mapPersonalContext } from "@/lib/ai/personal-context";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stageLabel } from "@/lib/cycle/stages";
import { articlesForStage, listArticles } from "@/lib/content/articles";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function HomePage() {
  const user = await requireUser();
  const coupleId = await getOrCreateCoupleForUser(user.id);
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const pc = await mapPersonalContext(admin, coupleId);
  const label = stageLabel(pc.cycleStage ?? null);
  const recommended = pc.cycleStage ? articlesForStage(pc.cycleStage) : listArticles().slice(0, 4);

  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">안녕하세요 🌿</h1>
        <p className="text-muted-foreground">
          {label ? `지금은 ${label} 시기예요. 오늘도 곁에 있을게요.` : "오늘도 곁에 있을게요."}
        </p>
      </header>

      <Card>
        <CardHeader><h2 className="font-medium">💬 오늘 마음은요?</h2></CardHeader>
        <CardContent><Button asChild><Link href="/chat">대화하기</Link></Button></CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-medium">지금 도움될 이야기</h2>
        {recommended.length === 0 ? (
          <p className="text-muted-foreground text-sm">곧 더 많은 이야기를 준비할게요.</p>
        ) : (
          <ul className="space-y-2">
            {recommended.map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="hover:bg-muted block rounded-lg border p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground text-sm">{a.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!pc.cycleStage && (
          <p className="text-muted-foreground text-xs">
            <Link href="/me" className="underline">사이클 단계를 설정</Link>하면 더 맞춰드려요.
          </p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: 로그인 후 기본 진입을 /home 으로** — `safeInternalPath` 기본값 또는 미들웨어/로그인 성공 redirect를 `/dashboard` → `/home`으로 조정(기존 dashboard는 유지하되 진입만 home). 확인 후 정합.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build` → 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add "app/(app)/home/"
git commit -m "feat: 매거진 - 맞춤 홈(사이클 매칭 추천 + 대화 유도)"
```

---

## Task 8: 글 탭 (목록 + 상세)

**Files:** Create `app/(app)/articles/page.tsx`, `app/(app)/articles/[slug]/page.tsx`

- [ ] **Step 1: 목록 페이지** (카테고리 섹션)

```tsx
// app/(app)/articles/page.tsx
import { listArticles } from "@/lib/content/articles";
import Link from "next/link";

const CATEGORY_LABEL: Record<string, string> = {
  tips: "꿀팁", mind: "마음 돌봄", couple: "부부", places: "함께 갈 곳",
};

export default function ArticlesPage() {
  const all = listArticles();
  const cats = [...new Set(all.map((a) => a.category))];
  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-semibold">이야기</h1>
      {cats.map((c) => (
        <section key={c} className="space-y-2">
          <h2 className="font-medium">{CATEGORY_LABEL[c] ?? c}</h2>
          <ul className="space-y-2">
            {all.filter((a) => a.category === c).map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="hover:bg-muted block rounded-lg border p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground text-sm">{a.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 상세 페이지** (마크다운 렌더 — `react-markdown` 설치 또는 간단 변환)

```bash
npm install react-markdown
```

```tsx
// app/(app)/articles/[slug]/page.tsx
import { getArticle, listArticles } from "@/lib/content/articles";
import { BetaDisclaimer } from "@/components/safety/BetaDisclaimer";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return listArticles().map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  return (
    <article className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{a.title}</h1>
      <div className="prose prose-sm max-w-none leading-relaxed">
        <ReactMarkdown>{a.body}</ReactMarkdown>
      </div>
      <BetaDisclaimer />
    </article>
  );
}
```

> v1.5 `BetaDisclaimer` props 확인 후 정합(없으면 prop 없이).

- [ ] **Step 3: 빌드 확인**

Run: `npm run build` → 에러 0.

- [ ] **Step 4: 커밋**

```bash
git add "app/(app)/articles/" package.json package-lock.json
git commit -m "feat: 매거진 - 글 탭(목록 + 마크다운 상세)"
```

---

## Task 9: E2E — 혼자 흐름 골든 패스

**Files:** Create `tests/e2e/magazine-solo.spec.ts`

- [ ] **Step 1: 작성** (`couple-flow.spec.ts` 패턴. 이메일 확인은 로컬에서 꺼져 있거나 자동확인)

```typescript
// tests/e2e/magazine-solo.spec.ts
import { test, expect, type Page } from "@playwright/test";
const TS = Date.now();
const PASS = "TestPass123!";

async function signup(page: Page, email: string) {
  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASS);
  await page.click("button[type=submit]");
}

test("혼자 가입 → 홈/글 접근, 페어 없이 대화 시작 가능", async ({ page }) => {
  await signup(page, `solo-${TS}@example.com`);
  await page.waitForURL(/\/(home|dashboard)/, { timeout: 15_000 });
  // 하단 탭 글로 이동
  await page.click("text=글");
  await page.waitForURL("**/articles");
  await expect(page.getByText("이야기")).toBeVisible();
  // 나 탭에서 단계 설정
  await page.click("text=나");
  await page.waitForURL("**/me");
  await page.click("text=난소자극");
  // 홈에서 맞춤 확인
  await page.click("text=홈");
  await page.waitForURL("**/home");
  await expect(page.getByText(/난소자극/)).toBeVisible();
  // 대화 시작 (페어 없이) — 차단 없어야
  await page.goto("/chat/new");
  await page.click("text=시작하기");
  await expect(page).toHaveURL(/\/chat\//);
});
```

- [ ] **Step 2: 실행**

Run: `npm run test:e2e -- magazine-solo`
Expected: PASS. (실패 시 self-couple trigger·라우팅 점검)

- [ ] **Step 3: 커밋**

```bash
git add tests/e2e/magazine-solo.spec.ts
git commit -m "test: 매거진 - 혼자 흐름 E2E 골든 패스"
```

---

## Task 10: 검증 게이트 + 마무리

- [ ] **Step 1: 전체 단위** — Run: `npm run test:unit` → 기존 + 신규(self-couple·set-stage·articles) PASS.
- [ ] **Step 2: 빌드** — Run: `npm run build` → 에러 0.
- [ ] **Step 3: E2E** — Run: `npm run test:e2e` → 기존 + magazine-solo PASS.
- [ ] **Step 4: gitignore** — `.playwright-mcp/` 추가.
- [ ] **Step 5: 최종 커밋** (push·배포·태그는 user 확인 후)

```bash
git add -A
git commit -m "chore: 매거진 첫 조각 완료 - 검증 게이트 통과"
```

---

## Self-Review (작성자 점검)

- **Spec 커버리지:** §2 4탭(Task5·6·7·8) · §3 혼자쓰기(Task1) · §4 사이클 단계(Task2·6) · §5 콘텐츠(Task3·8) · §6 따뜻 톤(Task4) · §7 맞춤 홈(Task7) 모두 task로 커버. 비범위(커뮤니티·위로·트래커·CMS)는 plan에 없음(의도).
- **확인 step:** 기존 trigger(Task1-1)·globals.css(Task4-1)·로그인 redirect(Task7-2)·BetaDisclaimer props(Task8-2)는 추정 → "확인 후 정합" 검증 step(placeholder 아님). 구현자는 건너뛰지 말 것.
- **타입 일관성:** `getOrCreateCoupleForUser`(Task1)·`setCycleStage`(Task2)·`Article`/`articlesForStage`(Task3)·`CYCLE_STAGES`(Task0)가 Task6·7·8에서 일관.
- **리스크:** self-couple trigger가 기존 profiles trigger와 공존(Task1-4 주의). `server-only` 모듈의 vitest 처리(Task3-5). Tailwind v4 변수명 실제 확인(Task4-1).
