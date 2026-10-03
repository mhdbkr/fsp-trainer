-- 20260930000017_training_journal_events.sql — série 3, journal d'entraînement
-- (docs/contracts/training-journal.md §2.2, revue s3-programme S-C1).
-- Trois types nouveaux : training.logged, plan.materialized, plan.replanned.
-- `plan.done` est CONSERVÉ : retiré du client, mais des lignes existantes
-- pourraient le porter — les exclure ferait échouer la recréation.
-- Liste de départ : 20260928000015_personal_updated_event.sql (dernière de main).
-- À DÉPLOYER AVANT la fonction `events` et avant le client (ADR-0015).
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed',
  'term.personal_created','term.personal_deleted','term.personal_updated',
  'training.logged','plan.materialized','plan.replanned'
));
