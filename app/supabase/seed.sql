-- seed.sql
insert into public.plans (id, stripe_price_id, monthly_credits) values
  ('free',    null,              0),
  ('pro',     'price_PRO_TODO',  200),
  ('premium', 'price_PREM_TODO', 1000)
on conflict (id) do update set monthly_credits = excluded.monthly_credits;

insert into public.entitlements (plan_id, feature, limit_value) values
  ('free',    'content.tier',    1),
  ('free',    'credits.monthly', 0),
  ('pro',     'content.tier',    2),
  ('pro',     'sim.online',      null),
  ('pro',     'league',          null),
  ('pro',     'ai.arztbrief',    null),
  ('pro',     'credits.monthly', 200),
  ('premium', 'content.tier',    3),
  ('premium', 'sim.online',      null),
  ('premium', 'league',          null),
  ('premium', 'ai.arztbrief',    null),
  ('premium', 'ai.voice',        null),
  ('premium', 'credits.monthly', 1000)
on conflict (plan_id, feature) do update set limit_value = excluded.limit_value;
