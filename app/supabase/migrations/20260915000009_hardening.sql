-- 20260915000009_hardening.sql — revue finale de branche
-- (1) rate_limits était public, sans RLS, GRANT ALL à anon : énumération des
--     user ids par la clé et contournement du rate limit. Service role uniquement.
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from public, anon, authenticated;
revoke execute on function public.rate_hit(text, int, int) from public, anon, authenticated;

-- (9) consume_credits : un rejeu de la même ref doit répondre le solde (200),
--     pas 409 — l'idempotence passe AVANT le contrôle de solde.
create or replace function public.consume_credits(uid uuid, amount int, reason text, ref text) returns int
language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if amount <= 0 then raise exception 'invalid_amount'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  -- déjà débité pour cette ref → idempotent, on renvoie simplement le solde
  if exists (select 1 from public.credit_ledger l where l.user_id = uid and l.reason = consume_credits.reason and l.ref = consume_credits.ref) then
    select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid; return bal;
  end if;
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  if bal < amount then raise exception 'insufficient_credits' using detail = bal::text; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -amount, reason, ref);
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  return bal;
end $$;
revoke all on function public.consume_credits(uuid, int, text, text) from public, anon, authenticated;

-- (minor) profiles : le client ne peut pas réécrire created_at / id
create or replace function public.profiles_guard() returns trigger
language plpgsql as $$
begin
  new.id := old.id; new.created_at := old.created_at;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

-- (minor) progress_events : received_at est SERVEUR, jamais le client
create or replace function public.progress_events_stamp() returns trigger
language plpgsql as $$ begin new.received_at := now(); return new; end $$;
create trigger progress_events_stamp before insert on public.progress_events for each row execute function public.progress_events_stamp();
