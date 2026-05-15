-- ============================================================
-- diary_entries
-- ============================================================

create type diary_visibility as enum ('pair', 'private');

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  visibility diary_visibility not null default 'pair',
  title text,
  body text not null,
  cycle_stage text,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index diary_couple_idx on public.diary_entries(couple_id, created_at desc);
create index diary_author_idx on public.diary_entries(author_user_id);
