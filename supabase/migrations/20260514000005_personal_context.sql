-- ============================================================
-- personal_context — 1 row per couple. M3 트래커가 채움.
-- ============================================================

create table public.personal_context (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  cycle_stage text,
  cycle_number int,
  current_medications jsonb,
  recent_test_results jsonb,
  recent_emotional_state text,
  recent_couple_issues text,
  decision_history jsonb,
  updated_at timestamptz not null default now()
);
