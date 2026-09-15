# ADR-0004 — Un compte = une personne

**Statut** : accepté · **Date** : 2026-09-15

## Contexte

L'app avait des profils locaux (plusieurs personnes sur un appareil), conçus pour un usage personnel avant l'idée de commercialiser.

## Décision

Un compte Doctopus est une personne. Les profils locaux disparaissent ; le profil actif migre vers le compte ; le binôme = deux comptes. Les simulations de démonstration ne sont jamais migrées.

## Conséquences

Modèle de données simple pour les crédits, la ligue et les données ; sur un appareil partagé, la déconnexion efface la progression locale (sinon l'outbox de A partirait sous le jeton de B).
