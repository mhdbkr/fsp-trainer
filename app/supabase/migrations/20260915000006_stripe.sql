-- 20260915000006_stripe.sql — idempotence des webhooks Stripe
-- Un événement Stripe peut être livré plusieurs fois : on n'en traite qu'un
-- (insert-or-ignore sur event_id AVANT tout traitement, cf. Task 19).
create table public.stripe_events (
  event_id    text primary key,
  type        text,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- aucune policy : uniquement service role (webhook)
