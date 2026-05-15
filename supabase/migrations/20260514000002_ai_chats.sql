-- ============================================================
-- ai_chats + ai_messages
-- ============================================================

create type ai_chat_visibility as enum ('pair', 'private');
create type ai_chat_area as enum ('A', 'B', 'C', 'D', 'E', 'mixed');
create type ai_persona as enum ('P1', 'P2', 'P3', 'P4', 'general');
create type ai_message_role as enum ('user', 'assistant', 'system');

create table public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  visibility ai_chat_visibility not null default 'pair',
  title text,
  area ai_chat_area,
  persona ai_persona,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_chats_couple_idx on public.ai_chats(couple_id);
create index ai_chats_owner_idx on public.ai_chats(owner_user_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.ai_chats(id) on delete cascade,
  role ai_message_role not null,
  content text not null,
  guard_triggered text[],
  sources jsonb,
  created_at timestamptz not null default now()
);
create index ai_messages_chat_idx on public.ai_messages(chat_id, created_at);
