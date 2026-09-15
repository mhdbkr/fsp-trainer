-- 20260915000008_realtime.sql — publication Realtime
-- Le client s'abonne (watchEntitlements) aux changements de SON abonnement et
-- de SON ledger pour se débloquer sans rechargement après un paiement. Sans
-- publication, aucun événement n'est émis : c'était le trou du parcours de
-- release (paiement confirmé côté serveur, app restée Free).
alter publication supabase_realtime add table public.subscriptions;
alter publication supabase_realtime add table public.credit_ledger;
-- La RLS s'applique aux flux Realtime : chacun ne reçoit que ses lignes.
