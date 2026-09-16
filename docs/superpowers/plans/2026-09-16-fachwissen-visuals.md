# Plan — Fachwissen visuel (#7, epic #8)

Spec : `docs/superpowers/specs/2026-09-16-fachwissen-visuals-design.md` (fe22692).
Contrat : `docs/contracts/fachwissen-visuals.md` (v1, aligné sur le spec — repli
par entrée, `source`, `anchor`). Le contrat fait foi pour les types.
Branche `feat/fachwissen-visuals` · worktree `../doctopus-fachwissen-visuals`.

Périmètre d'écriture : `app/src/components/visuals/`, `app/src/data/fachwissenVisuals/`,
`app/src/features/fachwissen/` (intégration), `app/scripts/checkFachwissenVisuals.mjs`.
Interdit : `seedFachwissen.ts`, `characters/`, `akademie/`, `.github/`, `docs/contracts/` (arch).

Routage : implémenteurs Sonnet (`front-implementer`, `content-fachwissen-visualizer`,
`ux-motion-designer`), relecture par tâche `quality-task-reviewer` (Sonnet),
revue de branche Opus. Un implémenteur par tâche, contexte frais, brief par fichier.

## Tranches et tâches

| # | Tâche | Fichiers | Dépend de | AC couverts |
|---|---|---|---|---|
| T1 | Types + résolution des refs | `data/fachwissenVisuals/types.ts`, `resolve.ts`, `resolve.test.ts`, `reviewed.ts` (vide) | contrat v1 | AC-2, AC-7 |
| T2 | Primitives + cadre + registre | `components/visuals/primitives.tsx` (Grid, Readout, Tone classes), `VisualBlockFrame.tsx` (h3, role=region, aria-label, data-visual, ErrorBoundary, merke), `registry.ts` | — | AC-16 |
| T3 | DecisionTree, CompareTable, TherapyToggles | `components/visuals/DecisionTree.tsx`, `CompareTable.tsx`, `TherapyToggles.tsx` + tests | T1, T2 | AC-9, AC-10 |
| T4 | ScoreGauge, Timeline | `ScoreGauge.tsx`, `Timeline.tsx` + tests | T1, T2 | AC-8 |
| T5 | AnatomyMap (3 figures SVG, régions fermées), SyndromeMap | `AnatomyMap.tsx`, `anatomyFigures.ts`, `SyndromeMap.tsx` + tests | T1, T2 | AC-11 |
| T6 | Specs pilotes ×3 | `data/fachwissenVisuals/fw-khk.ts`, `fw-leberzirrhose.ts`, `fw-depression.ts`, `index.ts` | T1 | AC-3, AC-4 |
| T7 | Validateur CI + fixture négative | `app/scripts/checkFachwissenVisuals.mjs`, `scripts/fixtures/visuals-broken.ts`, test vitest du validateur | T1, T6 | AC-1, AC-14, AC-17 |
| T8 | Intégration page : `useVisualSpec`, insertion avant `anchor`, repli `<details>` « Text anzeigen », dégradé | `features/fachwissen/useVisualSpec.ts`, `FachwissenDetailPage.tsx`, `visualSections.tsx` (extraction Section/SymptomList si > 500 lignes) + tests | T2–T6 | AC-5, AC-6, AC-7 |
| T9 | Mouvement : dépliage, toggles, jauge ; `motion-safe:` ; reduced-motion | fichiers de T3–T5 (retouches) | T3–T5, T8 | AC-12 |
| T10 | Vérification navigateur (playwright-cli, DOM de l'app) : 3 pilotes, 390 px, dark, clavier, reduced-motion | rapport uniquement | T8, T9 | AC-3…AC-5, AC-11…AC-13, AC-15 |
| T11 | Relecture clinique des `ergänzt` (Child-Pugh) → `reviewed.ts` | `reviewed.ts` | T6 | AC-17 |

Parallélisme : T1 ∥ T2 ; puis T3 ∥ T4 ∥ T5 ∥ T6 (fichiers disjoints) ; puis T7 ∥ T8 ;
puis T9 ; puis T10 ∥ T11.

## Definition of Done par tâche
- `npm run typecheck` exit 0 ; `npx vitest run --dir src` exit 0 ; fichiers < 500 lignes.
- Aucun emoji ; aucune couleur hex nouvelle ; texte clinique en allemand.
- Rapport de l'implémenteur dans `.superpowers/teams/fachwissen-visuals/reports/<tâche>.md`.
- Revue `quality-task-reviewer` : conformité au brief puis qualité ; fix ; re-revue.

## Pre-mortem (« le sous-projet a échoué — pourquoi ? »)

| Mode d'échec | Parade |
|---|---|
| Les visuels inventent du contenu clinique | `source` obligatoire, `ergänzt` bloquant en CI hors `reviewed.ts` (T7), relecture `fsp-clinical-reviewer` (T11) |
| Une republication de fiche casse silencieusement un bloc | refs par clé stable, dégradé sans exception (T1, T8), test AC-7 |
| La page sans spec change | snapshot DOM `fw-pankreatitis` avant/après (T8, AC-6) |
| Composants « génériques » qui ne ressemblent pas à Doctopus | primitives communes (T2) : grille 8 px, Readout mono, pétrole structure, coral unique ; `front-design-keeper` en étape 5 |
| Mobile inutilisable | pile verticale sous 640 px, AC-13 mesuré (T10) |
| a11y ignorée | rôles/clavier dans chaque brief, mesure DOM (T10) |
| Dépassement 500 lignes (`FachwissenDetailPage.tsx` = 247) | extraction `visualSections.tsx` (T8) |
| Validateur qui lit du texte au lieu des données | esbuild via pattern `loadCases.mjs` (T7) |
| Contrat et spec divergent pendant le build | arch v2 livré AVANT T1 ; T1 lit le contrat, pas le spec |
| CI ne lance pas le validateur | ligne proposée dans la PR (workflow hors périmètre — décision main) |

Accepté par écrit : impression (T6 du spec), visuels dans les cas (T5), Supabase (T4), badge dev désynchronisation (T1 spec) — issues à ouvrir à la PR.

## Vérification (à remplir en étape 6)
- [ ] AC-1…AC-18 : preuve par commande + code de sortie ou mesure DOM.
