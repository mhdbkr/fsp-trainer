-- 20260916000010_exam_day_event.sql — pipeline pruefungstag (sous réserve G2)
--
-- APPLICATION : sur la base VIVANTE, avec psql :
--   psql "$DATABASE_URL" -f app/supabase/migrations/20260916000010_exam_day_event.sql
-- JAMAIS `supabase db reset` (efface le contenu publié).
-- Puis : redéployer la fonction `events` (z.enum étendu) AVANT qu'un client émette
-- `exam_day.completed` — sinon le lot entier est rejeté en 400 sans rejeu (queue.ts).
-- Enfin : `node app/scripts/dumpSchema.mjs` pour régénérer docs/contracts/schema.sql.
--
-- (1) progress_events.type : nouveau type `exam_day.completed` (résumé d'un Prüfungstag).
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check
  check (type in ('simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured','exam_day.completed'));

-- (2) entitlements : feature `readiness.plan` (plan d'actions chiffré, historique,
--     projection du Bereitschaftsindex) — Free absent, Pro/Premium illimité (null).
insert into public.entitlements (plan_id, feature, limit_value) values
  ('pro',     'readiness.plan', null),
  ('premium', 'readiness.plan', null)
on conflict (plan_id, feature) do update set limit_value = excluded.limit_value;
