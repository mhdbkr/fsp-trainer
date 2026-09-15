-- 20260915000002_plans.sql
create table public.plans (
  id              text primary key,
  stripe_price_id text,
  monthly_credits int not null default 0
);
create table public.entitlements (
  plan_id     text references public.plans on delete cascade,
  feature     text not null,
  limit_value int,
  primary key (plan_id, feature)
);
create table public.subscriptions (
  user_id                uuid primary key references public.profiles on delete cascade,
  plan_id                text not null references public.plans,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  status                 text not null check (status in ('active','trialing','past_due','canceled','incomplete')),
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Plan effectif : active/trialing → plan ; past_due → plan pendant 7 jours de grâce ; sinon free.
create or replace function public.effective_plan(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when s.status in ('active','trialing') then s.plan_id
      when s.status = 'past_due' and s.updated_at > now() - interval '7 days' then s.plan_id
      else 'free' end
    from public.subscriptions s where s.user_id = uid
  ), 'free')
$$;

create or replace function public.tier_of(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select e.limit_value from public.entitlements e
    where e.plan_id = public.effective_plan(uid) and e.feature = 'content.tier'
  ), 1)
$$;

alter table public.plans          enable row level security;
alter table public.entitlements   enable row level security;
alter table public.subscriptions  enable row level security;
create policy "plans: public read"        on public.plans        for select using (true);
create policy "entitlements: public read" on public.entitlements for select using (true);
create policy "subscriptions: own read"   on public.subscriptions for select using (user_id = auth.uid());
-- aucune policy d'écriture : seules les Edge Functions (service role) écrivent
