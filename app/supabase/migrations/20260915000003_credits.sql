-- 20260915000003_credits.sql
create table public.credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  delta      int  not null,
  reason     text not null check (reason in
               ('monthly_grant','purchase','ai.arztbrief','ai.voice','community_protocol','league_reward','refund','demo_grant')),
  ref        text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index on public.credit_ledger (user_id);

create materialized view public.credit_balances as
  select user_id, sum(delta)::int as balance from public.credit_ledger group by user_id;
create unique index on public.credit_balances (user_id);

create or replace function public.refresh_credit_balances() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  refresh materialized view concurrently public.credit_balances;
  return null;
end $$;
create trigger credit_ledger_refresh after insert or delete on public.credit_ledger
  for each statement execute function public.refresh_credit_balances();

create or replace function public.credit_balance(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select balance from public.credit_balances where user_id = uid), 0)
$$;
revoke execute on function public.credit_balance(uuid) from public, anon, authenticated;

create or replace function public.my_credits() returns int
language sql stable security definer set search_path = public as $$
  select public.credit_balance(auth.uid())
$$;
grant execute on function public.my_credits() to anon, authenticated;

alter table public.credit_ledger enable row level security;
create policy "ledger: own read" on public.credit_ledger for select using (user_id = auth.uid());
-- la vue matérialisée n'a pas de RLS : on ne l'expose pas, on passe par credit_balance(uid)
revoke all on public.credit_balances from anon, authenticated;
