-- 20260917000011_content_policy_initplan.sql — performance RLS du contenu
-- `tier <= my_tier()` était évalué PAR LIGNE (2 688 lignes pour un compte
-- premium, chaque appel = sous-requête sur subscriptions) : 500 ms par page,
-- timeouts (57014) sur la fonction `content` après la republication F2a.
-- `(select my_tier())` devient un InitPlan évalué UNE fois : 18 ms par page.
alter policy "content: read by tier" on public.content_items
  using (tier <= (select public.my_tier()));
