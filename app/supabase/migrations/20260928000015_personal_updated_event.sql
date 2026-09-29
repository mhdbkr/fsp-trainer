-- 20260928000015_personal_updated_event.sql — Fachbegriffe F4a : la Bedeutung
-- d'une carte personnelle se corrige (term.personal_updated) ; le mot, jamais.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed',
  'term.personal_created','term.personal_deleted','term.personal_updated'
));
