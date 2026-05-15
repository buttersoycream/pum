-- ============================================================
-- RLS for M2 tables. Uses is_couple_member(p_couple_id, p_user_id)
-- helper from 20260513000003_rls.sql (security definer, 2 args).
-- ============================================================

-- ============ ai_chats ============
alter table public.ai_chats enable row level security;

create policy ai_chats_select
  on public.ai_chats for select
  using (
    case visibility
      when 'pair' then public.is_couple_member(couple_id, auth.uid())
      when 'private' then owner_user_id = auth.uid()
    end
  );

create policy ai_chats_insert
  on public.ai_chats for insert
  with check (
    owner_user_id = auth.uid()
    and public.is_couple_member(couple_id, auth.uid())
  );

create policy ai_chats_update
  on public.ai_chats for update
  using (owner_user_id = auth.uid());

create policy ai_chats_delete
  on public.ai_chats for delete
  using (owner_user_id = auth.uid());

-- ============ ai_messages (chat visibility 상속) ============
alter table public.ai_messages enable row level security;

create policy ai_messages_select
  on public.ai_messages for select
  using (
    exists (
      select 1 from public.ai_chats c
      where c.id = chat_id
        and (
          (c.visibility = 'pair' and public.is_couple_member(c.couple_id, auth.uid()))
          or (c.visibility = 'private' and c.owner_user_id = auth.uid())
        )
    )
  );

create policy ai_messages_insert
  on public.ai_messages for insert
  with check (
    exists (
      select 1 from public.ai_chats c
      where c.id = chat_id and c.owner_user_id = auth.uid()
    )
  );

-- ============ diary_entries ============
alter table public.diary_entries enable row level security;

create policy diary_select
  on public.diary_entries for select
  using (
    case visibility
      when 'pair' then public.is_couple_member(couple_id, auth.uid())
      when 'private' then author_user_id = auth.uid()
    end
  );

create policy diary_insert
  on public.diary_entries for insert
  with check (
    author_user_id = auth.uid()
    and public.is_couple_member(couple_id, auth.uid())
  );

create policy diary_update
  on public.diary_entries for update
  using (author_user_id = auth.uid());

create policy diary_delete
  on public.diary_entries for delete
  using (author_user_id = auth.uid());

-- ============ rag_chunks (인증 사용자 read · service_role만 write) ============
alter table public.rag_chunks enable row level security;

create policy rag_chunks_select
  on public.rag_chunks for select
  to authenticated
  using (true);

-- ============ personal_context ============
alter table public.personal_context enable row level security;

create policy personal_context_select
  on public.personal_context for select
  using (public.is_couple_member(couple_id, auth.uid()));

create policy personal_context_insert
  on public.personal_context for insert
  with check (public.is_couple_member(couple_id, auth.uid()));

create policy personal_context_update
  on public.personal_context for update
  using (public.is_couple_member(couple_id, auth.uid()));
