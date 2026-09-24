-- 20260917000012_srs_settings_event.sql — Fachbegriffe F2b : réglages quotidiens
-- du SRS (auto/manuel, nouveaux/jour, plafond de dus) synchronisés par événement.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed'
));
