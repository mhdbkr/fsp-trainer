# ADR-0002 — Les agents communiquent par contrats écrits, pas par messages

**Statut** : accepté · **Date** : 2026-09-09

## Contexte

Les sous-agents sont lancés isolément et rendent un livrable ; il n'existe pas
de conversation entre eux. Concevoir une organisation qui suppose le contraire
produirait une structure qui ne tourne pas.

## Décision

`docs/contracts/` (schéma SQL, OpenAPI, matrice d'entitlements, protocole de
sync) est le seul canal inter-départements. Seul l'architecte plateforme y
écrit, sur validation du coordinateur. Chaque agent est **implémenteur ou
relecteur, jamais les deux**. Le coordinateur (session principale) fait
l'éventail, fusionne, arbitre, applique.

## Conséquences

- Une interface est toujours explicite, versionnée, diffable, testable.
- Un besoin de « parler » à un autre département = une proposition de
  changement de contrat.
