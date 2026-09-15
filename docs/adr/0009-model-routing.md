# ADR-0009 — Routage des modèles — Opus juge, Sonnet exécute, Haiku trie

**Statut** : accepté · **Date** : 2026-09-10

## Contexte

Chaque dispatch coûte ; un modèle omis hérite du plus cher. Les tâches dont le code est intégralement dans le brief sont de la transcription plus des tests.

## Décision

Opus : orchestrateur, architectes, relecteur clinique, avocat de l'utilisateur, pédagogue, auditeur sécurité, relecteur final de branche, analystes marché/pricing. Sonnet : implémenteurs, auteur de cas, rédacteurs, relecteurs par tâche, QA, motion. Haiku : classification, extraction, tri. Le modèle est toujours explicite dans le dispatch.

## Conséquences

Efficience des tokens sans perte de jugement là où il compte ; la couche mécanique (CI, validateurs) attrape ce qu'un Sonnet laisserait passer.
