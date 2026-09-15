-- 20260915000007_credits_consume.sql
create or replace function public.consume_credits(uid uuid, amount int, reason text, ref text) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  bal int;
  v_reason text := reason;   -- évite l'ambiguïté PL/pgSQL entre le paramètre et la colonne credit_ledger.reason
  v_ref text := ref;         -- idem pour ref
begin
  if amount <= 0 then raise exception 'invalid_amount'; end if;
  -- verrou par utilisateur : deux débits concurrents ne peuvent pas passer sous zéro
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  if bal < amount then raise exception 'insufficient_credits' using detail = bal::text; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -amount, v_reason, v_ref)
    on conflict (user_id, reason, ref) do nothing;   -- même ref = déjà débité, pas de double débit
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  return bal;
end $$;
revoke all on function public.consume_credits(uuid, int, text, text) from anon, authenticated;
