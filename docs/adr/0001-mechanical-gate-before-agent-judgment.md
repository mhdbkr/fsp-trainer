# ADR-0001 — La couche mécanique tranche avant tout jugement d'agent

**Statut** : accepté · **Date** : 2026-09-08

## Contexte

Sur les lots 5 à 12 de production de cas, les agents de vérification ont
échoué 9 fois sur 12 (limites de session, veille machine) sans jamais bloquer
une livraison : les validateurs déterministes attrapaient tout ce qui comptait,
dont deux erreurs médicales bloquantes. Quand les agents tournaient, ils
produisaient aussi des faux positifs (2 sur 5 sur la revue de la cystite).

## Décision

Tout ce qui est vérifiable sans jugement (couverture des sondes, des Muster,
cohérence chiffrée, contrat guide ↔ fiche, conflits allergie ↔ thérapie,
types, build) tourne en CI à chaque push et **bloque**. Les agents de
jugement n'interviennent qu'après, sur ce qu'un script ne peut pas trancher,
et rendent des constats **avec citation exacte** et une section « Non vérifié ».

Quand un défaut se répète, on écrit un validateur, on ne re-briefe pas un agent.

## Conséquences

- Un agent qui refait le travail de la CI est mal employé.
- Les résultats se lisent par **code de sortie** — un pipe vers `tail`
  masquait une régression réelle (sondes neuro sans réponse).
