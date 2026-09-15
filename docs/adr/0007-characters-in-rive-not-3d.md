# ADR-0007 — Personnages en Rive, pas en 3D

**Statut** : accepté · **Date** : 2026-09-10

## Contexte

Le patient croqué doit changer de posture, désigner la zone douloureuse et grimacer à la bonne question ; l'Oberarzt doit poser les questions du cas ; le même personnage sert la démo vocale, la simulation IA, l'Aufklärung et le site.

## Décision

Machine à états Rive (ou Lottie) : `posture`, `douleur:zone`, `émotion`. Vectoriel, ~40 Ko, identité Doctopus jusque dans le trait. Le 3D est réservé à la signature du hero du site.

## Conséquences

Un seul système, cinq usages ; coût et poids maîtrisés ; le contrat `characters.md` définit les états.
