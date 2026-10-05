-- 20261004000018_s4_preference_events.sql — série 4, S4-2 (training-journal.md §12.10, ADR-0021, ADR-0022)
-- Deux types nouveaux : rythme.refused et rattrapage.refused (les refus deviennent des événements
-- SYNCHRONISÉS : un refus fait sur un appareil vaut sur l'autre).
-- Liste de départ : 20260930000017_training_journal_events.sql (dernière de main). `plan.done` est
-- CONSERVÉ : retiré du client, mais des lignes existantes pourraient le porter.
-- Ordre de déploiement (ADR-0015) : CETTE migration (psql, projet EU) -> fonction `events` -> client.
-- Jamais `db reset`. Rejouable : drop constraint if exists, puis la liste complète.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed',
  'term.personal_created','term.personal_deleted','term.personal_updated',
  'training.logged','plan.materialized','plan.replanned',
  'rythme.refused','rattrapage.refused'
));
