-- 20260929000016_progress_events_payload_size.sql — F4a (revue sécurité E1) :
-- un compte connecté peut insérer dans progress_events directement par REST
-- (grant INSERT + politique own insert) : sans borne, une ligne de plusieurs Mo
-- passe. Plafond 64 Ko par payload (le plus gros en EU au 29/09 : 2 Ko,
-- simulation.completed). NOT VALID : n'examine pas l'existant, contrôle les
-- nouvelles lignes.
alter table public.progress_events drop constraint if exists progress_events_payload_size;
alter table public.progress_events add constraint progress_events_payload_size
  check (octet_length(payload::text) <= 65536) not valid;
