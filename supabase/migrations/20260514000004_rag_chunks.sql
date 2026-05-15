-- ============================================================
-- rag_chunks (pgvector)
-- BGE-M3 dim=1024. OpenAI text-embedding-3-small이면 1536으로 변경.
-- ============================================================

create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1024),
  source_org text not null,
  source_url text,
  source_doc_title text,
  publish_date date,
  last_verified date,
  tier int not null check (tier in (1, 2, 3)),
  area text[],
  domain text not null check (domain in ('general', 'procedure', 'drug', 'policy', 'cost', 'persona_specific')),
  persona text[],
  legal_review_status text not null default 'pending' check (legal_review_status in ('pending', 'approved', 'flagged')),
  legal_review_at timestamptz,
  created_at timestamptz not null default now()
);

create index rag_chunks_embedding_idx on public.rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index rag_chunks_area_idx on public.rag_chunks using gin (area);
create index rag_chunks_persona_idx on public.rag_chunks using gin (persona);
create index rag_chunks_domain_idx on public.rag_chunks(domain);
