-- 20260915000004_content.sql
create table public.content_versions (
  version      int primary key,
  published_at timestamptz not null default now(),
  notes        text
);
create table public.content_items (
  id      text primary key,
  kind    text not null check (kind in ('case','fachwissen','fachbegriff','aufklaerung','guide','muster')),
  tier    int  not null default 2 check (tier between 1 and 3),
  version int  not null references public.content_versions,
  payload jsonb not null,
  deleted boolean not null default false
);
create index on public.content_items (kind, tier);
create index on public.content_items (version);

alter table public.content_versions enable row level security;
alter table public.content_items    enable row level security;
create policy "versions: public read" on public.content_versions for select using (true);
-- lecture par tier ; les lignes deleted restent visibles pour que le client purge
-- Note : RLS policy quals s'exécutent avec les privilèges du rôle appelant ; tier_of()
-- reste REVOKE pour anon/authenticated (accessible seulement au service role), donc on
-- passe par le wrapper my_tier() déjà GRANTé (= tier_of(auth.uid())) plutôt que d'élargir
-- tier_of() à des appels directs avec un uid arbitraire.
create policy "content: read by tier" on public.content_items for select
  using (tier <= public.my_tier());
-- pas d'écriture client

/** Delta : tout ce qui a changé après `since`, dans le tier autorisé. */
create or replace function public.content_since(since int)
returns setof public.content_items
language sql stable security invoker as $$
  select * from public.content_items where version > since
$$;
