# ADR-0016 — Libellés d'interface en Plex Sans ; le mono réservé aux données

**Statut** : accepté · **Date** : 2026-09-17

## Contexte

La charte « instrument clinique » faisait des libellés structurels (`.label`, `.eyebrow`, en-têtes de sections) un « readout d'instrument » : IBM Plex Mono, capitales, tracking large. À l'usage réel (série 2 de retours, FB2-O6), la direction l'a jugé « robotique, générique, AI slop » sur toute l'app (« Recherche », « Centre », « Statut », « Tri », « Méthode », « CONSENTEMENT ÉCLAIRÉ »…). C'est aussi le tell n° 1 des interfaces générées (eyebrow mono-caps au-dessus de chaque bloc).

## Décision

1. Les libellés d'interface passent en **IBM Plex Sans, casse normale, semi-bold, 11,5 px, gris retenu** (`.label`) ; l'eyebrow garde son filet pétrole mais suit la même typographie.
2. **Aucun `uppercase` de libellé** dans l'app : un texte structurant se lit tel qu'il est écrit.
3. Le **mono** (`font-mono`, `.mono-tag`) est réservé aux **données** : chiffres, chronos, compteurs, codes, terminologie affichée comme donnée (numéro d'option, `0/11`, `15:58`).
4. Quand la direction tranche contre la charte à l'usage, **la charte change** ; `fsp-brand-identity` et `dept-experience` sont mis à jour dans le même commit.

## Conséquences

- `styles/index.css` (`.label`, `.eyebrow`), 23 libellés inline convertis, 24 `uppercase` retirés (17 fichiers). Aucun libellé mono ne subsiste (`grep uppercase` = 0 hors tests).
- Les libellés écrits en minuscules pour la casse CSS s'affichent désormais tels quels : à relire au fil de l'eau (« prêt·e », « conseillée »), pas de migration en bloc.
- Le « readout » reste une signature là où il porte une donnée (chrono, compteurs) — c'est là qu'il avait du sens.
