-- ============================================================
-- Helper: is_couple_member(couple_id, user_id)
-- security definer so it bypasses RLS on couple_members,
-- avoiding infinite recursion in the couple_members policy.
-- ============================================================
create or replace function public.is_couple_member(p_couple_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple_id and user_id = p_user_id
  );
$$;

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
  using (public.is_couple_member(couples.id, auth.uid()));

-- Creator can read their own couple even before joining couple_members
create policy couples_creator_read
  on public.couples for select
  using (auth.uid() = created_by);

create policy couples_authenticated_insert
  on public.couples for insert
  with check (auth.uid() = created_by);

-- ============ couple_members ============
alter table public.couple_members enable row level security;

create policy couple_members_same_couple_read
  on public.couple_members for select
  using (public.is_couple_member(couple_members.couple_id, auth.uid()));

-- A user can only insert THEMSELVES (no inserting a different user_id)
create policy couple_members_self_insert
  on public.couple_members for insert
  with check (user_id = auth.uid());

-- ============ couple_invites ============
alter table public.couple_invites enable row level security;

create policy couple_invites_member_read
  on public.couple_invites for select
  using (public.is_couple_member(couple_invites.couple_id, auth.uid()));

create policy couple_invites_member_insert
  on public.couple_invites for insert
  with check (
    invited_by = auth.uid()
    and public.is_couple_member(couple_invites.couple_id, auth.uid())
  );
-- Token-based accept will go through service_role Server Action; no public update policy.
