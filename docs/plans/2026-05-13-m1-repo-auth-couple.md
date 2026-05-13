# 품 (pum) Phase 1 MVP — Milestone 1: Repo + Auth + Couple Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `pum` Next.js 15 app with Supabase auth, couple gating, and RLS-enforced couple data isolation. End state: two separate users can sign up, one invites the partner via a tokenised link, both land on a shared dashboard, and RLS provably blocks either from reading the other's couple data.

**Architecture:** Single Next.js 15 app (App Router, TypeScript, Tailwind, shadcn/ui) with Supabase for Postgres + Auth + RLS. `couples` is a separate table; members joined via `couple_members` junction. All future data tables (cycles, treatments, diaries, costs) will carry `couple_id` and RLS policies enforce that `auth.uid()` belongs to the couple before reads/writes.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth + RLS) · Vitest (unit) · Playwright (E2E) · Vercel (host)

**Spec reference:** `docs/specs/2026-05-13-mvp-design.md`

---

## Scope Note (Multiple Subsystems)

The spec covers W1 Founder Diary integration, W2 IVF tracker + pair alerts + OCR, W3 cost calculator, AI coach, Stripe, katalk alerts — all independent subsystems. **This plan covers only Milestone 1 (M1):** repo init, auth, couple gating, RLS. M2-M9 will be separate plans, each producing testable working software on its own.

Phase 0 (Founder Diary content marketing) is a parallel non-software track and is NOT covered by this plan series — that will be a separate ops playbook.

---

## Phase 1 MVP Milestone Roadmap

| Milestone | Scope | Plan Status |
|---|---|---|
| **M1** | Repo init · Auth · Couple gating · RLS isolation | **This plan** |
| M2 | IVF cycle data model + cycle CRUD + treatment log + 페어 일기 | Future plan |
| M3 | Pair alerts (web push + 카톡 channel PoC) + 일정 스케줄링 | Future plan |
| M4 | 한국 의료비 계산기 (정부지원금·보험청구) | Future plan |
| M5 | Founder Diary content integration (앱 in-app feed + CMS) | Future plan |
| M6 | AI coach (OpenAI/Anthropic) + chat history | Future plan |
| M7 | OCR PoC (GPT-4V) + auto-import receipts/records | Future plan |
| M8 | Stripe paid tier (월 페어 결제) + entitlement gating | Future plan |
| M9 | Polish · accessibility · SEO · soft launch | Future plan |

---

## File Structure (M1)

```
pum/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── signup/page.tsx
│   │   ├── login/page.tsx
│   │   └── actions.ts
│   └── (app)/
│       ├── layout.tsx
│       ├── dashboard/page.tsx
│       └── couple/
│           ├── invite/page.tsx
│           ├── invite/actions.ts
│           └── accept/[token]/
│               ├── page.tsx
│               └── actions.ts
├── components/
│   ├── ui/                          # shadcn (button, input, label, card, alert, form, sonner)
│   └── couple/
│       └── PartnerCard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── auth/
│   │   └── current-user.ts
│   ├── couple/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── invite-token.ts
│   └── env.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260513000001_profiles.sql
│       ├── 20260513000002_couples.sql
│       └── 20260513000003_rls.sql
├── tests/
│   ├── e2e/
│   │   └── couple-flow.spec.ts
│   └── unit/
│       └── rls/
│           └── couple-isolation.test.ts
├── docs/
│   ├── specs/2026-05-13-mvp-design.md
│   └── plans/2026-05-13-m1-repo-auth-couple.md
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── playwright.config.ts
├── vitest.config.ts
├── .env.example
├── .env.local                       # gitignored
├── .gitignore
└── README.md
```

---

## Task 1: Repo Init (Next.js 15 + Tailwind + shadcn/ui)

**Files:**
- Create via scaffolding: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `components/ui/*`
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Bootstrap Next.js 15**

Run from `C:\Users\butte\home\pum`:

```powershell
npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
```

If prompted "Turbopack: Yes". Expected: scaffolds into the existing `pum/` directory.

- [ ] **Step 2: Initialize shadcn/ui**

```powershell
npx shadcn@latest init -d
```

Accept defaults: New York style, Neutral base, CSS variables yes. Creates `components.json` and `lib/utils.ts`.

- [ ] **Step 3: Install starter shadcn components**

```powershell
npx shadcn@latest add button input label card alert form sonner
```

- [ ] **Step 4: Replace `app/page.tsx` with landing**

```tsx
// app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-semibold tracking-tight">품</h1>
      <p className="text-muted-foreground max-w-md text-center">
        아이를 함께 기다리는 부부의 IVF 동반자.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">시작하기</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">로그인</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Replace `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "품 — 아이를 함께 기다리는 부부의 동반자",
  description: "IVF 시도 부부를 위한 한국 동반자 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Verify dev server**

```powershell
npm run dev
```

Open `http://localhost:3000`. Verify landing shows "품" with two buttons. Stop with Ctrl+C.

- [ ] **Step 7: Commit**

```powershell
git init
git branch -M main
git add -A
git commit -m "chore: bootstrap pum Next.js 15 app with Tailwind and shadcn/ui"
```

---

## Task 2: Supabase Local Setup + Client Library + Middleware

**Files:**
- Create via CLI: `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, `lib/env.ts`, `.env.example`, `.env.local`

- [ ] **Step 1: Install Supabase CLI (skip if installed)**

```powershell
npm install -g supabase
supabase --version
```

Expected: 1.x.x or higher.

- [ ] **Step 2: Init Supabase locally**

```powershell
supabase init
```

Creates `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`.

- [ ] **Step 3: Install Supabase npm packages**

```powershell
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 4: Start local Supabase stack**

```powershell
supabase start
```

First run pulls Docker images (1-3 min). Output includes API URL, DB URL, Studio URL, anon key, service_role key. Keep this output visible.

- [ ] **Step 5: Create `.env.example`**

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 6: Create `.env.local` (gitignored)**

```env
# .env.local — paste from supabase start output
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from output>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Verify `.gitignore` contains `.env*.local` (Next.js default does).

- [ ] **Step 7: Create `lib/env.ts`**

```ts
// lib/env.ts
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  SITE_URL: required("NEXT_PUBLIC_SITE_URL"),
};
```

- [ ] **Step 8: Create `lib/supabase/client.ts`**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 9: Create `lib/supabase/server.ts`**

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore (middleware refreshes)
          }
        },
      },
    },
  );
}
```

- [ ] **Step 10: Create `lib/supabase/middleware.ts`**

```ts
// lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh auth token
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/couple");
  const isAuthPage =
    path.startsWith("/login") || path.startsWith("/signup");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 11: Create root `middleware.ts`**

```ts
// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 12: Verify and commit**

```powershell
npm run dev
```

Open `http://localhost:3000` — landing still loads, no 500s. Stop server.

```powershell
git add .
git commit -m "feat: add Supabase local setup, SSR clients, and auth middleware"
```

---

## Task 3: Database Schema (profiles, couples, members, invites)

**Files:**
- Create: `supabase/migrations/20260513000001_profiles.sql`
- Create: `supabase/migrations/20260513000002_couples.sql`

- [ ] **Step 1: Write profiles migration**

```sql
-- supabase/migrations/20260513000001_profiles.sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Write couples + members + invites migration**

```sql
-- supabase/migrations/20260513000002_couples.sql
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create table public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  role text not null default 'partner' check (role in ('partner')),
  primary key (couple_id, user_id)
);

-- M1 constraint: one couple per user (can lift later)
create unique index couple_members_user_unique on public.couple_members (user_id);

create table public.couple_invites (
  token text primary key,
  couple_id uuid not null references public.couples(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id)
);

create index couple_invites_couple_idx on public.couple_invites (couple_id);
```

- [ ] **Step 3: Apply migrations**

```powershell
supabase migration up
```

Verify in Studio at `http://127.0.0.1:54323` → Tables: `profiles`, `couples`, `couple_members`, `couple_invites`.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/
git commit -m "feat: add profiles, couples, couple_members, couple_invites schema"
```

---

## Task 4: RLS Policies + Isolation Test

**Files:**
- Create: `supabase/migrations/20260513000003_rls.sql`
- Create: `tests/unit/rls/couple-isolation.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (test scripts)

- [ ] **Step 1: Write RLS migration**

```sql
-- supabase/migrations/20260513000003_rls.sql

-- ============ profiles ============
alter table public.profiles enable row level security;

create policy profiles_self_read
  on public.profiles for select
  using (auth.uid() = id);

create policy profiles_self_update
  on public.profiles for update
  using (auth.uid() = id);

-- Partner can read each other's profile (for dashboard "partner email/name")
create policy profiles_couple_mate_read
  on public.profiles for select
  using (
    exists (
      select 1
      from public.couple_members cm1
      join public.couple_members cm2 on cm1.couple_id = cm2.couple_id
      where cm1.user_id = auth.uid()
        and cm2.user_id = profiles.id
    )
  );

-- ============ couples ============
alter table public.couples enable row level security;

create policy couples_member_read
  on public.couples for select
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couples.id and cm.user_id = auth.uid()
    )
  );

create policy couples_authenticated_insert
  on public.couples for insert
  with check (auth.uid() = created_by);

-- ============ couple_members ============
alter table public.couple_members enable row level security;

create policy couple_members_same_couple_read
  on public.couple_members for select
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_members.couple_id and cm.user_id = auth.uid()
    )
  );

-- A user can only insert THEMSELVES (no inserting a different user_id)
create policy couple_members_self_insert
  on public.couple_members for insert
  with check (user_id = auth.uid());

-- ============ couple_invites ============
alter table public.couple_invites enable row level security;

create policy couple_invites_member_read
  on public.couple_invites for select
  using (
    exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_invites.couple_id and cm.user_id = auth.uid()
    )
  );

create policy couple_invites_member_insert
  on public.couple_invites for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.couple_members cm
      where cm.couple_id = couple_invites.couple_id and cm.user_id = auth.uid()
    )
  );
-- Token-based accept will go through service_role Server Action; no public update policy.
```

- [ ] **Step 2: Apply migration**

```powershell
supabase migration up
```

Verify in Studio: each table's RLS toggle is ON and policies are listed.

- [ ] **Step 3: Install Vitest + dotenv-cli**

```powershell
npm install -D vitest @types/node dotenv-cli
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Update `package.json` scripts (add):
```json
{
  "scripts": {
    "test:unit": "dotenv -e .env.local -- vitest run",
    "test:unit:watch": "dotenv -e .env.local -- vitest"
  }
}
```

- [ ] **Step 5: Write RLS isolation test**

```ts
// tests/unit/rls/couple-isolation.test.ts
import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function makeUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "TestPass123!",
    email_confirm: true,
  });
  if (error) throw error;
  return { id: data.user!.id, email };
}

async function signInAs(email: string) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "TestPass123!",
  });
  if (error) throw error;
  return client;
}

describe("Couple RLS isolation", () => {
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };
  let mallory: { id: string; email: string };
  let coupleId: string;

  beforeAll(async () => {
    const ts = Date.now();
    alice = await makeUser(`alice-${ts}@example.com`);
    bob = await makeUser(`bob-${ts}@example.com`);
    mallory = await makeUser(`mallory-${ts}@example.com`);

    const { data: couple, error: cErr } = await admin
      .from("couples")
      .insert({ created_by: alice.id })
      .select()
      .single();
    if (cErr) throw cErr;
    coupleId = couple.id;

    await admin.from("couple_members").insert([
      { couple_id: coupleId, user_id: alice.id },
      { couple_id: coupleId, user_id: bob.id },
    ]);
  });

  it("Alice reads her own couple", async () => {
    const c = await signInAs(alice.email);
    const { data, error } = await c
      .from("couples")
      .select()
      .eq("id", coupleId)
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBe(coupleId);
  });

  it("Bob (member) reads the same couple", async () => {
    const c = await signInAs(bob.email);
    const { data } = await c
      .from("couples")
      .select()
      .eq("id", coupleId)
      .single();
    expect(data?.id).toBe(coupleId);
  });

  it("Mallory (non-member) cannot read the couple", async () => {
    const c = await signInAs(mallory.email);
    const { data } = await c
      .from("couples")
      .select()
      .eq("id", coupleId)
      .maybeSingle();
    expect(data).toBeNull();
  });

  it("Mallory cannot insert Bob as a member of her own couple", async () => {
    const c = await signInAs(mallory.email);
    const { data: malloryCouple } = await c
      .from("couples")
      .insert({ created_by: mallory.id })
      .select()
      .single();

    const { error } = await c.from("couple_members").insert({
      couple_id: malloryCouple!.id,
      user_id: bob.id,
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/row-level security/i);
  });

  it("Alice can read Bob's profile (couple mate)", async () => {
    const c = await signInAs(alice.email);
    const { data } = await c
      .from("profiles")
      .select("email")
      .eq("id", bob.id)
      .maybeSingle();
    expect(data?.email).toBe(bob.email);
  });

  it("Mallory cannot read Bob's profile", async () => {
    const c = await signInAs(mallory.email);
    const { data } = await c
      .from("profiles")
      .select("email")
      .eq("id", bob.id)
      .maybeSingle();
    expect(data).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests**

```powershell
npm run test:unit
```

Expected: 6 tests pass. If any fail, inspect the RLS policy or test data setup.

- [ ] **Step 7: Commit**

```powershell
git add supabase/migrations/ tests/ vitest.config.ts package.json package-lock.json
git commit -m "feat: add couple RLS policies and isolation tests"
```

---

## Task 5: Auth — Signup, Login, Logout, Protected Layout

**Files:**
- Create: `app/(auth)/layout.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/actions.ts`
- Create: `app/(app)/layout.tsx`, `app/(app)/dashboard/page.tsx`
- Create: `lib/auth/current-user.ts`

- [ ] **Step 1: Create `app/(auth)/layout.tsx`**

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/actions.ts`**

```ts
// app/(auth)/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { error: "이메일과 비밀번호를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    },
  });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { error: "이메일과 비밀번호를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

- [ ] **Step 3: Create `app/(auth)/signup/page.tsx`**

```tsx
// app/(auth)/signup/page.tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { signupAction } from "../actions";
import Link from "next/link";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold">시작하기</h1>
        <p className="text-muted-foreground text-sm">
          품에 오신 것을 환영합니다.
        </p>
      </CardHeader>
      <form
        action={(fd) =>
          startTransition(async () => {
            const r = await signupAction(fd);
            if (r?.error) setError(r.error);
          })
        }
      >
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "가입 중..." : "가입하고 시작"}
          </Button>
          <p className="text-muted-foreground text-sm">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Create `app/(auth)/login/page.tsx`**

```tsx
// app/(auth)/login/page.tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { loginAction } from "../actions";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-semibold">로그인</h1>
      </CardHeader>
      <form
        action={(fd) =>
          startTransition(async () => {
            const r = await loginAction(fd);
            if (r?.error) setError(r.error);
          })
        }
      >
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "로그인 중..." : "로그인"}
          </Button>
          <p className="text-muted-foreground text-sm">
            아직 계정이 없으신가요?{" "}
            <Link href="/signup" className="underline">
              가입하기
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

- [ ] **Step 5: Create `lib/auth/current-user.ts`**

```ts
// lib/auth/current-user.ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 6: Create `app/(app)/layout.tsx`**

```tsx
// app/(app)/layout.tsx
import { requireUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <Link href="/dashboard" className="text-xl font-semibold">
            품
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">{user.email}</span>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7: Create stub `app/(app)/dashboard/page.tsx`**

```tsx
// app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4 py-8">
      <h1 className="text-3xl font-semibold">환영합니다</h1>
      <p className="text-muted-foreground">대시보드 (Task 8에서 채워집니다)</p>
    </div>
  );
}
```

- [ ] **Step 8: Manual smoke test**

```powershell
npm run dev
```

1. Open `http://localhost:3000`, click "시작하기".
2. Fill `test1@example.com` / `password123` → submit. Lands on `/dashboard` with email in header.
3. Click "로그아웃" → back to landing.
4. Click "로그인" → same creds → back to dashboard.
5. While logged in, visit `/login` directly → redirects to `/dashboard`.
6. Logout, visit `/dashboard` → redirects to `/login`.

Stop server.

- [ ] **Step 9: Commit**

```powershell
git add app/ lib/
git commit -m "feat: add signup, login, logout, and protected app layout"
```

---

## Task 6: Couple — Invite Flow

**Files:**
- Create: `lib/couple/invite-token.ts`, `lib/couple/queries.ts`, `lib/couple/mutations.ts`
- Create: `app/(app)/couple/invite/page.tsx`, `app/(app)/couple/invite/actions.ts`

- [ ] **Step 1: Create `lib/couple/invite-token.ts`**

```ts
// lib/couple/invite-token.ts
import { randomBytes } from "node:crypto";

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export const INVITE_EXPIRY_HOURS = 72;
```

- [ ] **Step 2: Create `lib/couple/queries.ts`**

```ts
// lib/couple/queries.ts
import { createClient } from "@/lib/supabase/server";

export async function getCoupleForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.couple_id ?? null;
}

export async function getPartner(coupleId: string, currentUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("couple_members")
    .select("user_id, profiles!inner ( email, display_name )")
    .eq("couple_id", coupleId)
    .neq("user_id", currentUserId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
```

- [ ] **Step 3: Create `lib/couple/mutations.ts`**

```ts
// lib/couple/mutations.ts
import { createClient } from "@/lib/supabase/server";
import { generateInviteToken, INVITE_EXPIRY_HOURS } from "./invite-token";

export async function createCoupleAndInvite(
  creatorId: string,
): Promise<{ token: string; coupleId: string }> {
  const supabase = await createClient();

  const { data: couple, error: cErr } = await supabase
    .from("couples")
    .insert({ created_by: creatorId })
    .select()
    .single();
  if (cErr) throw cErr;

  const { error: mErr } = await supabase
    .from("couple_members")
    .insert({ couple_id: couple.id, user_id: creatorId });
  if (mErr) throw mErr;

  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  const { error: iErr } = await supabase.from("couple_invites").insert({
    token,
    couple_id: couple.id,
    invited_by: creatorId,
    expires_at: expiresAt.toISOString(),
  });
  if (iErr) throw iErr;

  return { token, coupleId: couple.id };
}
```

- [ ] **Step 4: Create `app/(app)/couple/invite/actions.ts`**

```ts
// app/(app)/couple/invite/actions.ts
"use server";

import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser } from "@/lib/couple/queries";
import { createCoupleAndInvite } from "@/lib/couple/mutations";

export async function createInviteAction(): Promise<{
  token?: string;
  error?: string;
}> {
  const user = await requireUser();
  const existing = await getCoupleForUser(user.id);
  if (existing) return { error: "이미 페어가 있습니다." };

  try {
    const { token } = await createCoupleAndInvite(user.id);
    return { token };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "초대 생성 실패" };
  }
}
```

- [ ] **Step 5: Create `app/(app)/couple/invite/page.tsx`**

```tsx
// app/(app)/couple/invite/page.tsx
"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "./actions";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function InvitePage() {
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const r = await createInviteAction();
      if (r.error) {
        toast.error(r.error);
        return;
      }
      setToken(r.token ?? null);
    });

  const inviteUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/couple/accept/${token}`
      : "";

  return (
    <Card className="mt-8">
      <CardHeader>
        <h1 className="text-2xl font-semibold">배우자 초대</h1>
        <p className="text-muted-foreground text-sm">
          초대 링크를 만들어 배우자에게 보내세요. 72시간 동안 유효합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token && (
          <Button onClick={onClick} disabled={pending}>
            {pending ? "생성 중..." : "초대 링크 만들기"}
          </Button>
        )}
        {token && (
          <>
            <p className="text-sm font-medium">초대 링크</p>
            <div className="bg-muted rounded p-3 text-xs break-all" data-testid="invite-url">
              {inviteUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success("복사되었습니다");
              }}
            >
              복사
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Manual smoke test**

```powershell
npm run dev
```

1. Login as `test1@example.com`.
2. Visit `/couple/invite` → click "초대 링크 만들기".
3. URL displayed (`http://localhost:3000/couple/accept/<token>`). Copy.
4. In Studio, `couples` has 1 row, `couple_members` has 1 row (test1), `couple_invites` has 1 row with token.
5. Click button again → toast "이미 페어가 있습니다."

- [ ] **Step 7: Commit**

```powershell
git add app/ lib/
git commit -m "feat: add couple invite flow with tokenized link generation"
```

---

## Task 7: Couple — Accept Flow

**Files:**
- Create: `app/(app)/couple/accept/[token]/page.tsx`
- Create: `app/(app)/couple/accept/[token]/actions.ts`

- [ ] **Step 1: Create `app/(app)/couple/accept/[token]/actions.ts`**

```ts
// app/(app)/couple/accept/[token]/actions.ts
"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/current-user";

const admin = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

export async function acceptInviteAction(
  token: string,
): Promise<{ coupleId?: string; error?: string }> {
  const user = await requireUser();
  const supabase = admin();

  const { data: invite, error: iErr } = await supabase
    .from("couple_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (iErr) return { error: iErr.message };
  if (!invite) return { error: "초대 링크를 찾을 수 없습니다." };
  if (invite.accepted_at) return { error: "이미 사용된 초대 링크입니다." };
  if (new Date(invite.expires_at) < new Date())
    return { error: "초대 링크가 만료되었습니다." };
  if (invite.invited_by === user.id)
    return { error: "본인이 보낸 초대는 수락할 수 없습니다." };

  const { data: existing } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { error: "이미 페어에 속해 있습니다." };

  const { error: mErr } = await supabase
    .from("couple_members")
    .insert({ couple_id: invite.couple_id, user_id: user.id });
  if (mErr) return { error: mErr.message };

  const { error: uErr } = await supabase
    .from("couple_invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("token", token);
  if (uErr) return { error: uErr.message };

  return { coupleId: invite.couple_id };
}
```

- [ ] **Step 2: Create `app/(app)/couple/accept/[token]/page.tsx`**

```tsx
// app/(app)/couple/accept/[token]/page.tsx
"use client";

import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "./actions";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function AcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onAccept = () =>
    startTransition(async () => {
      const r = await acceptInviteAction(token);
      if (r.error) {
        setError(r.error);
        return;
      }
      router.push("/dashboard");
    });

  return (
    <Card className="mt-8">
      <CardHeader>
        <h1 className="text-2xl font-semibold">배우자 초대 수락</h1>
        <p className="text-muted-foreground text-sm">
          이 링크를 보내준 사람과 페어가 됩니다. 수락 후 함께 시작합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive">{error}</Alert>}
      </CardContent>
      <CardFooter>
        <Button
          onClick={onAccept}
          disabled={pending || !!error}
          className="w-full"
        >
          {pending ? "수락 중..." : "수락하기"}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 3: Manual smoke test (cross-browser pair)**

```powershell
npm run dev
```

1. Browser A (regular): login as `test1@example.com`. Visit `/couple/invite`, generate link, copy URL.
2. Browser B (incognito): signup as `test2@example.com`. Paste invite URL → "수락하기".
3. Should redirect to `/dashboard`.
4. In Studio: `couple_members` has 2 rows for the same `couple_id`. `couple_invites.accepted_at` is set.
5. From a fresh browser, paste same URL while logged in as a third user → "이미 사용된 초대 링크입니다."

- [ ] **Step 4: Commit**

```powershell
git add app/
git commit -m "feat: add couple accept flow with tokenized invite validation"
```

---

## Task 8: Dashboard — Couple State Display

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Create: `components/couple/PartnerCard.tsx`

- [ ] **Step 1: Create `components/couple/PartnerCard.tsx`**

```tsx
// components/couple/PartnerCard.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface PartnerCardProps {
  hasPartner: boolean;
  partnerEmail?: string | null;
}

export function PartnerCard({ hasPartner, partnerEmail }: PartnerCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium">페어 상태</h2>
      </CardHeader>
      <CardContent>
        {hasPartner ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">함께 가는 배우자</p>
            <p className="font-medium" data-testid="partner-email">
              {partnerEmail}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            아직 배우자가 연결되지 않았습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Replace `app/(app)/dashboard/page.tsx`**

```tsx
// app/(app)/dashboard/page.tsx
import { requireUser } from "@/lib/auth/current-user";
import { getCoupleForUser, getPartner } from "@/lib/couple/queries";
import { PartnerCard } from "@/components/couple/PartnerCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser();
  const coupleId = await getCoupleForUser(user.id);
  const partner = coupleId ? await getPartner(coupleId, user.id) : null;
  const partnerEmail =
    (partner?.profiles as { email?: string } | undefined)?.email ?? null;

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-semibold">환영합니다</h1>
        <p className="text-muted-foreground">
          {coupleId ? "함께 시작합시다." : "먼저 배우자를 초대해주세요."}
        </p>
      </div>

      <PartnerCard hasPartner={!!partnerEmail} partnerEmail={partnerEmail} />

      {!coupleId && (
        <Button asChild>
          <Link href="/couple/invite">배우자 초대하기</Link>
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

```powershell
npm run dev
```

1. Browser A logged in as `test1@example.com` (Task 5). Visit `/dashboard`.
2. Verify "아직 배우자가 연결되지 않았습니다." + 배우자 초대하기 button visible.
3. Click button → generate invite link → copy.
4. Browser B incognito: signup as `test2@example.com`, paste URL, accept.
5. Browser B `/dashboard` shows partner card with `test1@example.com`.
6. Browser A refresh `/dashboard` → shows partner card with `test2@example.com`.

- [ ] **Step 4: Commit**

```powershell
git add app/ components/
git commit -m "feat: dashboard shows couple state and partner email"
```

---

## Task 9: E2E Test (Playwright Full Flow)

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/couple-flow.spec.ts`
- Modify: `package.json` (test:e2e script)

- [ ] **Step 1: Install Playwright**

```powershell
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "test:e2e": "dotenv -e .env.local -- playwright test"
  }
}
```

- [ ] **Step 3: Write E2E test**

```ts
// tests/e2e/couple-flow.spec.ts
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TS = Date.now();
const ALICE = `alice-e2e-${TS}@example.com`;
const BOB = `bob-e2e-${TS}@example.com`;
const PASS = "TestPass123!";

async function signup(page: Page, email: string) {
  await page.goto("/signup");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASS);
  await page.click('button[type=submit]');
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

test("Full couple flow: Alice invites, Bob accepts, both see partner", async ({
  browser,
}) => {
  // Alice's session
  const aliceCtx: BrowserContext = await browser.newContext();
  const alice: Page = await aliceCtx.newPage();
  await signup(alice, ALICE);
  await expect(alice.locator("h1")).toHaveText("환영합니다");
  await alice.click("text=배우자 초대하기");
  await alice.waitForURL("**/couple/invite");
  await alice.click("text=초대 링크 만들기");
  const inviteUrl = await alice.locator('[data-testid="invite-url"]').innerText();
  expect(inviteUrl).toContain("/couple/accept/");

  // Bob's session (separate context)
  const bobCtx: BrowserContext = await browser.newContext();
  const bob: Page = await bobCtx.newPage();
  await signup(bob, BOB);
  await bob.goto(inviteUrl);
  await bob.click("text=수락하기");
  await bob.waitForURL("**/dashboard");
  await expect(bob.locator('[data-testid="partner-email"]')).toHaveText(ALICE);

  // Alice refreshes — sees Bob
  await alice.goto("/dashboard");
  await expect(alice.locator('[data-testid="partner-email"]')).toHaveText(BOB);

  await aliceCtx.close();
  await bobCtx.close();
});
```

- [ ] **Step 4: Run E2E**

```powershell
npm run test:e2e
```

Expected: 1 test passes (covers full Alice→Bob flow). If it fails, inspect `playwright-report/` (auto-opens trace viewer).

- [ ] **Step 5: Commit**

```powershell
git add playwright.config.ts tests/e2e/ package.json package-lock.json
git commit -m "test: add E2E coverage for full signup-invite-accept-dashboard flow"
```

---

## Task 10: Vercel Deploy + Remote Supabase

**Files:**
- Modify: `.gitignore` (add `.vercel/`)
- Create: `README.md`

- [ ] **Step 1: Create remote Supabase project**

Via https://supabase.com web UI:
1. New project `pum-prod`, region `Northeast Asia (Seoul)` (ap-northeast-2)
2. Save the DB password somewhere safe
3. Settings → API: note Project URL, anon key, service_role key

- [ ] **Step 2: Link local CLI and push migrations**

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

Verify in remote Studio that all 3 migrations applied and tables exist.

- [ ] **Step 3: Install Vercel CLI and link**

```powershell
npm install -g vercel
vercel link
```

Accept creating a new Vercel project for the `pum` directory.

- [ ] **Step 4: Add env vars to Vercel**

For each variable below, run:
```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production
```

Paste values from Step 1. For `NEXT_PUBLIC_SITE_URL` use the Vercel domain you'll get after first deploy (placeholder OK for first deploy; redeploy after).

Repeat for `preview` environment.

- [ ] **Step 5: First production deploy**

```powershell
vercel --prod
```

Note the production URL. Re-run Step 4 if you need to update `NEXT_PUBLIC_SITE_URL` with the real domain, then `vercel --prod` again.

- [ ] **Step 6: Smoke test on production**

In two separate browser sessions:
1. Sign up `alice-prod-<ts>@example.com` and `bob-prod-<ts>@example.com`.
2. Alice generates invite, Bob accepts via the production URL.
3. Both dashboards show the partner's email.

- [ ] **Step 7: Add `.vercel/` to gitignore**

```
# .gitignore (append)
.vercel/
```

- [ ] **Step 8: Write `README.md`**

```markdown
# 품 (pum)

아이를 간절히 기다리는 한국 IVF 부부의 동반자 앱.

## Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + RLS)
- Vercel (host)
- Playwright (E2E) · Vitest (unit)

## Local dev

```powershell
npm install
supabase start
cp .env.example .env.local
# Paste local Supabase credentials from `supabase status`
npm run dev
```

## Tests

```powershell
npm run test:unit       # RLS isolation
npm run test:e2e        # Full couple flow
```

## Deploy

```powershell
vercel --prod
```

## Docs
- Spec: `docs/specs/2026-05-13-mvp-design.md`
- M1 plan: `docs/plans/2026-05-13-m1-repo-auth-couple.md`
```

- [ ] **Step 9: Commit and tag M1**

```powershell
git add README.md .gitignore
git commit -m "chore: deploy M1 to Vercel and add README"
git tag v0.1.0-m1
```

---

## Next Milestones (Future Plan Outlines)

### M2 — IVF Cycle Data Model + Cycle CRUD + Treatment Log + 페어 일기
- Tables: `cycles`, `treatments`, `diary_entries` (all carry `couple_id` with RLS)
- Cycle lifecycle states: 준비 → 자극 → 채취 → 이식 → 결과
- Treatment log (주사·약·검사) with timestamp
- 페어 일기 (both partners write/read)
- Dashboard: "현재 사이클" card

### M3 — Pair Alerts (Web Push + 카톡 PoC) + 일정 스케줄링
- Treatment scheduling (반복 주사 시간)
- Web Push via Service Worker + VAPID for both partners
- 카톡 알림 PoC: business channel apply + Kakao Bizmessage API
- Toggle: carry alerts over to both partners

### M4 — 한국 의료비 계산기 (정부지원금·보험청구)
- `costs` table with line items (검사·약·시술·교통·휴직)
- 정부 난임시술 지원금 auto-calc (소득 분위, 차수 기준)
- 보험 청구 항목 정리 (실손 청구 가능)
- 회차별 누적 비용 visualization

### M5 — Founder Diary CMS + 앱 In-app Feed
- CMS PoC choice (Notion / Sanity / Markdown)
- 인스타·블로그 외 앱 내 피드 노출
- 페르소나 매칭 (어떤 시점 stage가 본인과 비슷한지)

### M6 — AI Coach (OpenAI / Anthropic)
- AI chat UI + history (per user, scoped by `couple_id` permission check)
- System prompt: 한국 IVF 컨텍스트, 의료법 회피 가드
- 사이클 단계별 mode auto-switching

### M7 — OCR PoC (GPT-4V) + Auto-import
- 영수증 · 진료기록 · 처방전 PoC
- 정확도 측정: founder 부부 실데이터 100건
- < 80% → Naver Clova OCR 대안 검토

### M8 — Stripe Paid Tier + Entitlement Gating
- Stripe checkout (teum LLC, 글로벌 확장 여지)
- 월 페어 결제 (페어 1계정 = 2 user invoice)
- Webhooks for status sync
- Entitlement guard middleware (free vs paid)

### M9 — Polish · Accessibility · SEO · Soft Launch
- WCAG AA audit
- SEO (OG meta, sitemap, robots)
- Posthog + Sentry integration
- 베타 대기명단 invite, 첫 결제 conversion 측정

---

## Spec Coverage Check (Internal)

- Spec §1 컨셉 (제품명 품, 정서) → M1 제품명 사용 (landing, header, metadata)
- Spec §2 페르소나·시장 → M1엔 anonymous user level
- Spec §3 페인 → M2+ 실제 해결 (M1은 인프라)
- Spec §4 차별화 1 Couple-first → M1 RLS isolation 본질
- Spec §5 W1·W2·W3 → M2+ (M5 W1, M2 W2, M4 W3)
- Spec §6 Phase Rollout → 이 plan은 Phase 1의 M1
- Spec §7 수익 → M8
- Spec §8 아키텍처 → M1에서 Next.js + Supabase + RLS stack 확립
- Spec §9 Data Model → M1: profiles·couples·members·invites
- Spec §10 Privacy → M1: 페어 RLS isolation 본질, 의료법 회색지대는 M2+
- Spec §11·12 Founder Diary → 별도 Phase 0 ops playbook
- Spec §13 Open Questions → M1 직결 X
- Spec §14 다음 단계 → 이 plan

All M1-relevant spec sections are addressed. Other sections deferred to M2-M9 with explicit milestone mapping above.
