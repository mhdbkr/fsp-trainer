-- 20260925000014_ai_cache.sql — Fachbegriffe F3 : cache des gloses « brief » de
-- la fonction `ai` (30 jours). Lu et écrit UNIQUEMENT par la fonction (service role).
create table public.ai_cache (
  key        text primary key,
  text       text not null check (char_length(text) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.ai_cache enable row level security;       -- aucune policy : ni anon ni authenticated
revoke all on public.ai_cache from anon, authenticated;
create index ai_cache_created_at on public.ai_cache (created_at);
