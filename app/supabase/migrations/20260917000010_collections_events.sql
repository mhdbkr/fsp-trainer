-- 20260917000010_collections_events.sql — Fachbegriffe F1 : favoris et decks
-- sont des événements du journal (spec 2026-09-17-fachbegriffe-f1). La
-- contrainte `type` est élargie ; rien d'autre ne change côté serveur : les
-- projections vivent dans la base Dexie de chaque compte.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed'
));
