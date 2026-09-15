# ADR-0010 — Monorepo app + site + tokens partagés

**Statut** : accepté · **Date** : 2026-09-10

## Contexte

Le site marketing doit porter la même identité que l'app (Bricolage, Plex, pétrole, coral, verre) sans dupliquer la charte.

## Décision

Monorepo : `apps/app`, `apps/site`, `packages/tokens`, `packages/content-schema`, `supabase/`. Le site est un projet distinct (SEO, performance mobile < 3 s) qui consomme les tokens.

## Conséquences

Une charte, deux surfaces ; le site évolue sans toucher à l'app ; migration de `app/` vers `apps/app` à planifier dans le sous-projet #8.
