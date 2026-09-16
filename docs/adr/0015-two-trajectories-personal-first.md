# ADR-0015 — Deux trajectoires : app personnelle d'abord, SaaS en pause

**Statut** : accepté · **Date** : 2026-09-16

## Contexte

La vague V1 (quatre sous-projets en parallèle) a produit des résultats en deçà des attentes de la direction, et le développement SaaS perturbait la préparation personnelle de la FSP (l'app de tous les jours changeait sous les pieds de ses deux utilisateurs). La direction veut se concentrer sur **un chantier à la fois** et perfectionner d'abord l'app qu'elle utilise.

## Décision

1. **Deux trajectoires, un seul code.**
   - `main` = **app personnelle** (2 à quelques personnes), tronc de travail, déployée sur GitHub Pages. Bâtie sur `main` d'aujourd'hui, Fondations SaaS incluses — on ne revient pas en arrière.
   - `saas` = **production commerciale**, photo de `main` au jour de cette décision (tag `v2-saas-pause`), **en pause**. Les pipelines V1 (site, characters, pruefungstag) sont gelés dans leur worktree.
2. **Remontée** : quand la production reprend, `git merge main` dans `saas`. Toute feature de l'app personnelle est conçue pour y remonter telle quelle (drapeaux de mode plutôt que branches divergentes, ex. `VITE_AUTH_MODE`).
3. **Supabase reste le dos** de l'app personnelle (sync multi-appareils, isolation par compte, contenu par tier : déjà prouvés). Comptes réels, création immédiate sans lien magique ; accès complet par abonnement posé à la main (spec `2026-09-16-fondateur-comptes-design.md`).
4. **Chantiers autorisés sur `main`, dans l'ordre et un à la fois** : socle comptes fondateurs → Fachbegriffe rafraîchi → correction d'Arztbrief → Fachwissen visuel (reprise avec les retours de la direction) → site marketing. Tout autre sous-projet attend.
5. **Méthode inchangée** : la chaîne `dept-coordination` (brainstorming → modélisation → spec → plan → SDD → revue → livraison) s'applique à chaque chantier, sans exception « c'est simple ».

## Conséquences

- ADR-0004 (un compte = une personne) reste vrai ; les « profils locaux » ne reviennent pas — le besoin (plusieurs personnes sur un appareil, sans mélange) est couvert par plusieurs comptes réels avec bascule locale sans re-login.
- `docs/contracts/` reste la vérité partagée ; `saas` et `main` en partagent l'historique.
- Les gates de la V1 (écoute voix, encart 60 %) sont gelés, non annulés (`.superpowers/teams/GATES.md`).
- Le déploiement Pages doit recevoir les variables Supabase (aujourd'hui page vide).
