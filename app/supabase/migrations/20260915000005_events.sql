create table public.progress_events (
  id          uuid primary key,
  user_id     uuid not null references public.profiles on delete cascade,
  type        text not null check (type in ('simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured')),
  subject_id  text,
  payload     jsonb not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index on public.progress_events (user_id, occurred_at);
create index on public.progress_events (user_id, type, subject_id);

alter table public.progress_events enable row level security;
create policy "events: own read"   on public.progress_events for select using (user_id = auth.uid());
create policy "events: own insert" on public.progress_events for insert with check (user_id = auth.uid());
-- pas d'update/delete : journal insert-only

-- rate limiting simple : compteur par (clé, fenêtre)
create table public.rate_limits (key text, window_start timestamptz, count int not null default 0, primary key (key, window_start));
create or replace function public.rate_hit(k text, max_hits int, window_sec int) returns boolean
language plpgsql security definer set search_path = public as $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / window_sec) * window_sec); c int;
begin
  insert into public.rate_limits(key, window_start, count) values (k, ws, 1)
    on conflict (key, window_start) do update set count = public.rate_limits.count + 1 returning count into c;
  return c <= max_hits;
end $$;
