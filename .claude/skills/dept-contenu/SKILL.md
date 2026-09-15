---
name: dept-contenu
description: Standards du pôle Contenu clinique (cas, fiches, glossaire, visuels Fachwissen, protocoles communautaires) — pipeline v3, validateurs, relecteurs, tiers. À invoquer avant tout lot de contenu ou spec visuelle.
---

# Contenu clinique — standards

> Tout sous-projet passe par `/doctopus-feature` (étapes et gates) ; ce skill fixe les standards du pôle, pas la chaîne.

## Pipeline v3 (fsp-phase2)
Recherche mutualisée → rédaction par lot → JSON validé par schéma → `lotAssembler.py` (style hand-authored, virgules de fin, whitelist des champs, dates valides) → 8 validateurs par CODE DE SORTIE → tsc/build → bump `SEED_VERSION` → `publishContent.mjs` (delta par hash).
Référence de style : `app/scripts/STYLE_SAMPLE.ts` (75 Ko), jamais les seeds complets (1,5–6 Mo).

## Contrats de contenu (non négociables)
Chaque cas répond à TOUTES ses sondes applicables · 9 chapitres Arztbrief + 12 Fallvorstellung · cohérence chiffrée (âge, IMC, py, seuils) · toute question affichée par le guide a sa réponse · sections thérapeutiques identiques fiche ↔ cas · aucun conflit allergie ↔ thérapie · aucun nom réel (`checkNoRealNames`, à créer).

## Relecture (AGENTIC-TEAM.md)
`fsp-clinical-reviewer` (contradictions internes d'abord), `fsp-language-reviewer` (registre écrit/oral/patient, C1), `fsp-concision-editor`. Aucun constat sans citation exacte ; section « Non vérifié » obligatoire. Ne jamais supprimer un contenu clinique sans avoir vérifié ce qu'il apporte.

## Tiers (ADR-0006)
Cas `tier: 1` explicite ; dérivés au tier minimal des cas référents ; Fachbegriffe Free = Allgemein ; guides Free.

## Visuels Fachwissen (#7)
Une SPEC JSON par pathologie (composants + données), jamais une illustration à la main ; le rendu est le code, donc le style est constant. `dataviz` pour les chartes de couleurs et formes. Le texte se décharge de ce qui est devenu visuel.
