# 품 (pum)

아이를 간절히 기다리는 한국 IVF 부부의 동반자 앱.

> Spec: `docs/specs/2026-05-13-mvp-design.md`
> M1 plan: `docs/plans/2026-05-13-m1-repo-auth-couple.md`

## Stack
- Next.js 16 (App Router, TypeScript)
- Tailwind CSS + shadcn/ui (New York)
- Supabase (Postgres + Auth + RLS)
- Vercel (host)
- Playwright (E2E) · Vitest (unit)

## Local dev

Prerequisites: Node 20+, Docker Desktop (for local Supabase), Supabase CLI.

```powershell
npm install
supabase start
```

Copy local Supabase keys from `supabase status` output into `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

Apply migrations + run dev server:
```powershell
supabase migration up --local
npm run dev
```

Open http://localhost:3100. (pum 전용 port — 3000은 다른 프로젝트가 사용 중일 수 있어 회피)

## Tests

```powershell
npm run test:unit       # RLS isolation (6 tests)
npm run test:e2e        # Full couple flow (1 test, ~5s)
```

## Production deploy (Vercel)

### One-time setup

1. **Create remote Supabase project** at https://supabase.com:
   - Project name: `pum-prod` (or your choice)
   - Region: Northeast Asia (Seoul) — `ap-northeast-2`
   - Save the DB password
   - From Settings → API: copy Project URL, anon key, service_role key

2. **Push migrations to remote Supabase**:
   ```powershell
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   Verify in remote Studio that 4 tables exist with RLS enabled.

3. **Import to Vercel** at https://vercel.com:
   - Import GitHub repo `buttersoycream/pum`
   - Framework preset: Next.js
   - Don't deploy yet — set env vars first

4. **Set Vercel env vars** (Production scope):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon key from step 1)
   - `SUPABASE_SERVICE_ROLE_KEY` = (service_role key from step 1)
   - `NEXT_PUBLIC_SITE_URL` = `https://<your-vercel-domain>.vercel.app` (you'll know after first deploy; update after)

   Repeat for Preview scope if you want PR previews.

5. **Trigger first deploy** — push to `main` (or hit "Deploy" in Vercel dashboard).

6. **Update `NEXT_PUBLIC_SITE_URL`** with the real Vercel domain, redeploy.

### Subsequent deploys

Every push to `main` triggers automatic production deploy.

## Project structure

```
pum/
├── app/                    # Next.js App Router routes
│   ├── (auth)/             # /signup, /login (logged-out only)
│   └── (app)/              # /dashboard, /couple/* (auth required)
├── components/
│   ├── ui/                 # shadcn components
│   └── couple/             # Couple-specific UI
├── lib/
│   ├── supabase/           # Auth + DB clients
│   ├── auth/               # requireUser helper
│   └── couple/             # Couple queries, mutations, invite tokens
├── supabase/
│   └── migrations/         # SQL migrations (RLS, schema)
├── tests/
│   ├── unit/rls/           # Vitest: RLS isolation
│   └── e2e/                # Playwright: full flow
├── docs/
│   ├── specs/              # Product spec
│   ├── plans/              # Implementation plans
│   ├── knowledge/          # Medical law tone, Korean medical system, privacy
│   ├── references/         # hosto migration: billing logic, OCR, schema
│   └── handoff/            # Cross-project handoff briefs
├── data/seed/              # Reference data: 환산지수, NHI coverage rules
├── proxy.ts                # Next.js 16 middleware (auth redirect)
└── README.md
```

## Architecture highlights

- **Couple isolation**: Supabase RLS enforces `couple_id`-based row-level isolation. Verified by 6 unit tests in `tests/unit/rls/couple-isolation.test.ts`.
- **Invite flow**: 24-byte crypto-random token, 72h expiry, single-use, validated server-side via service role.
- **Auth**: Supabase Auth + `proxy.ts` middleware redirects unauthenticated users from `/dashboard` and `/couple/*` to `/login`.

## License

Private.
