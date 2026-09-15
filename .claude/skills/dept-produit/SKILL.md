---
name: dept-produit
description: Standards du pôle Produit (spec, pédagogie, fidélité à l'examen) — comment écrire un PRD Doctopus, le veto pédagogique, le vocabulaire FSP. À invoquer avant tout spec, PRD ou décision de gamification.
---

# Produit & Pédagogie — standards

## Avant d'écrire un spec
- `interview-me` puis `idea-refine` : ce que le candidat veut VRAIMENT (pas la feature demandée).
- `superpowers:brainstorming` : une question à la fois ; 2–3 approches ; design par sections validées.
- Vocabulaire = `CONTEXT.md` (sonde, Muster, Bogen, couche, Rollenskript, crédits, Bereitschaftsindex…). Un terme absent = signal pour `mattpocock:domain-modeling`.
- Faits d'examen = `fsp-simulation` / `fsp-trainer` (ODAK V4 ; 60 pts, ≥ 60 % par partie, langue uniquement). Ne jamais inventer une structure d'examen.

## Un PRD Doctopus contient
problème (avec la rupture de symbiose visée) · persona (candidat à 3 semaines / binôme à distance / non-natif mobile) · critères d'acceptation TESTABLES · hors-périmètre explicite · impact sur les contrats (`docs/contracts/`) · ce qui reste local vs synchronisé · coût en crédits si IA.

## Veto pédagogique (ADR-0008)
Toute mécanique de rétention (streak, ligue, notification, badge) doit répondre : « récompense-t-elle une action qui fait RÉUSSIR l'examen ? » Une simulation complète en Autonome vaut beaucoup ; un login vaut zéro. Le pédagogue et l'avocat utilisateur relisent chaque page de pricing.

## Fidélité par Land
Toute affirmation sur le déroulé, le Bogen, le minutage ou le jury est indexée par Landesärztekammer (`docs/exam/<land>.md`). BW est la base ; le reste est vérifié avant d'être affiché.
