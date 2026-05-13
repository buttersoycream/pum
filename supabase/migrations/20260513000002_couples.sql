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
