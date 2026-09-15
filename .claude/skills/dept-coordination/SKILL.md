---
name: dept-coordination
description: Standards du coordinateur Doctopus — la chaîne de méthode (Superpowers × Matt Pocock × Agent Skills), le routage des modèles, les rituels, le ledger. À invoquer en début de toute session de développement ou d'orchestration.
---

# Coordination — comment on développe chez Doctopus

## La chaîne (ne pas sauter d'étape)
1. Comprendre : `interview-me` → `idea-refine` → `mattpocock:grilling`
2. Concevoir : `superpowers:brainstorming` (une question à la fois ; si > 1 sous-système, DÉCOMPOSER d'abord)
3. Modéliser : `mattpocock:domain-modeling` (→ `CONTEXT.md`), `documentation-and-adrs` (→ `docs/adr/`)
4. Spécifier : critères d'acceptation testables (`spec-driven-development`, `mattpocock:to-spec`)
5. Planifier : `superpowers:writing-plans` → tâches 2–5 min avec code ; `mattpocock:to-tickets` → issues GitHub
6. Construire : `superpowers:subagent-driven-development` — un implémenteur frais par tâche, revue par tâche, ledger `.superpowers/sdd/progress.md`
7. Revoir : revue finale de branche sur Opus ; `security-review` si auth/paiement/données
8. Livrer : `superpowers:finishing-a-development-branch` → PR → CI verte

## Routage (ADR-0009) — TOUJOURS explicite dans le dispatch
Opus = jugement (architecte, relecteur clinique, avocat utilisateur, pédagogue, sécurité, revue finale). Sonnet = exécution. Haiku = tri/masse.

## Dispatch d'un agent
- Brief par fichier (`task-brief`), jamais le plan entier. Rapport par fichier. Diff par fichier (`review-package`).
- Un implémenteur écrit dans SON périmètre (voir `DOCTOPUS-AGENTIC-ORG.md` §4). Un relecteur ne modifie rien.
- Les consignes de commit/git dans un prompt d'agent déclenchent parfois le classificateur : les garder minimales, ou committer soi-même.

## Règles opposables à tout agent (CLAUDE.md)
Vérifier par code de sortie · mesurer depuis le DOM de l'app · paginer PostgREST · un writer par worktree · stager par fichier · jamais `db reset` sur une base avec contenu publié · jamais le contexte Stripe live · surfacer ses hypothèses avant d'agir.

## Definition of Done (toute tâche)
tests verts (exit 0) · tsc · validateurs · vérification navigateur quand observable · revue sans Critical/Important · ledger à jour · commit atomique.
