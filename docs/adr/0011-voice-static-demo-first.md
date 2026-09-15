# ADR-0011 — Voix : démo statique pré-générée d'abord, chantier complet à part

**Statut** : accepté · **Date** : 2026-09-10

## Contexte

Le patient IA vocal exige une architecture immersion/coût qui mérite son propre chantier. Mais le mode doit être visible dès maintenant, grisé « bientôt », avec un avant-goût.

## Décision

Démo sur un cas fictif, 5–6 questions, audio pré-généré et servi en statique (zéro LLM, zéro coût par écoute). Le `Rollenskript` déterministe est le levier : pré-générer et cacher les répliques fixes ; le TTS temps réel ne sert que les réponses libres du patient IA (chantier #13).

## Conséquences

Le mode voix existe dans l'UI et le contrat des entitlements sans engager de coût variable ; la rentabilité du premium repose sur ce cache.
