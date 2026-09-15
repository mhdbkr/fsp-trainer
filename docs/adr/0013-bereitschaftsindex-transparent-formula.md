# ADR-0013 — Bereitschaftsindex : formule publique, plafonnée sans Prüfungstag

**Statut** : brouillon (proposé par `spec-pruefungstag`, en attente G2) · **Date** : 2026-09-16

## Contexte

L'indice « Suis-je prêt » actuel (`lib/readiness.ts`) moyenne six axes sur des simulations jouées avec guides et coups de pouce. Il ne distingue pas un 70 % assisté d'un 70 % tenu en conditions d'examen, et rien n'oblige le candidat à avoir jamais enchaîné 60 minutes réelles pour être déclaré « Prêt ». C'est la feature de conversion n° 1 (`PRODUCT-VISION.md` §3) : sa crédibilité est le produit.

## Décision

1. Le Bereitschaftsindex se calcule **côté client**, par une fonction pure, avec une formule **affichée au candidat** telle quelle : `BI = 0,5·S + 0,25·C + 0,25·L` (S simulations pondérées Prüfungstag 3 / Autonome 2 / Assisté 1 avec décroissance par ancienneté ; C couverture des spécialités pondérée par fréquence dans les protocoles ; L courbe de langue sur les 5 dernières parties orales).
2. Sans **Prüfungstag réussi dans les 30 derniers jours**, l'indice est plafonné à **79** — le verdict « Prêt » exige d'avoir tenu 60 minutes réelles.
3. Le chiffre, le verdict et les trois composantes sont **gratuits** ; le plan d'actions chiffré, l'historique et la projection sont **Pro** (`readiness.plan`). Rien de nécessaire à la compréhension du chiffre n'est retenu derrière le paywall.
4. Un Prüfungstag est une `Simulation` (`context:'pruefungstag'`) et émet un événement résumé `exam_day.completed` en plus de `simulation.completed`.

## Alternatives écartées

- Formule opaque ou apprise : incompatible avec « le candidat peut recalculer son indice à la main » et avec le veto pédagogique (ADR-0008).
- Pas de plafond : un « Prêt » obtenu sans jamais avoir enchaîné les trois parties est une promesse que l'app ne peut pas tenir.
- Cacher les composantes en Free : dark pattern ; la conversion doit venir du temps gagné (plan), pas de l'information retenue.

## Conséquences

- La formule est un contrat produit : toute modification passe par une révision de cet ADR et une note visible au candidat (« la formule a changé le … »).
- `computeReadiness` (accueil, stats) reste ; le Bereitschaftsindex est une seconde mesure, plus stricte, expliquée.
- Le serveur reçoit la valeur (dans `exam_day.completed`) mais ne la recalcule pas dans ce sous-projet.
