# Série 3 — avancement et file d'attente

> Registre de traçabilité tenu par `main`. Chaque élément en attente porte son
> **déclencheur** : il est lancé dès que celui-ci tombe, sans nouvelle demande.
> Analyse : `docs/superpowers/specs/2026-09-30-serie3-analyse-et-chantiers.md`.
> Constats : `app/docs/BACKLOG-FEEDBACK.md` § Série 3.

## 1. Chantiers en cours (au 3 oct. 2026)

| Chantier | Branche | Étape | Prochaine marche |
|---|---|---|---|
| P0 contrats | `feat/s3-contrats` | ✅ mergé (`4fad5b1`) | amendements à appliquer à l'intégration (§4) |
| C5 primitives | `feat/s3-primitives` | fixeur terminé, 84/0 | **décision direction : filet encre du verre** (§3) puis revue finale |
| C2 simulation | `feat/s3-simulation` | ✅ **Approve with minors** | dernier passage du fixeur (7 points courts) |
| C4 contenu | `feat/s3-contenu` | revue finale : 1 point (I-7) | fixeur sur I-7 → revue de clôture |
| C1 programme | `feat/s3-programme` | fixeur (sécurité + journal) | re-revue → **déploiement prod** (§2) |
| C3 IA externe | `feat/s3-ia` | faits sources committés | prompt, lanceur, retour → revue |

## 2. File d'attente — déclencheurs

| # | Élément | Déclencheur | Pourquoi pas maintenant |
|---|---|---|---|
| Q-1 | **Lots de contenu suivants** (faire descendre le budget A=522 / B=118 / C=8 ; Fachanamnese choisie selon la nature du motif — ex. `case-karpaltunnel` reçoit la Fachanamnese Ortho/Trauma : « Helm », « Reithosen », « Hand oder Fuß ») | `feat/s3-contenu` **Approve** puis mergé dans `main` | un seul writer par fichier : les lots touchent `seedCases.ts` / `anamneseChapters.ts`, où le fixeur travaille encore. Le classement par visibilité est mesuré en avance. |
| Q-2 | **Déploiement production** : migration `progress_events` (3 types) + fonction `events` (rejet par événement) sur Supabase EU | `feat/s3-programme` **Approve** | accord direction donné le 1ᵉʳ oct. ; **serveur avant client**, jamais l'inverse |
| Q-3 | **Intégration** dans l'ordre primitives → contenu → programme → simulation → IA, avec les branchements transversaux (§4) | chaque branche **Approve** ; primitives d'abord (les autres consomment ses surfaces) | — |
| Q-4 | **Passation de charte** (segmentés → `.seg`, surfaces → `.panel`, ombres mortes) dans les écrans Programme/Simulation | intégration de `feat/s3-primitives` | les écrans appartiennent à d'autres chantiers |
| Q-5 | **C6 — l'agent qui teste à la place de la direction** : candidat synthétique 14 jours, horloge injectable, invariants | intégration terminée | il doit jouer l'app intégrée, pas des branches séparées |
| Q-6 | Débord de la carte « À faire aujourd'hui » à 390 px (103 px) | intégration de `feat/s3-programme` | relevé par le chantier primitives, appartient au programme |

## 3. Décisions en attente de la direction

| Sujet | Où | Ce qui en dépend |
|---|---|---|
| **Filet encre sur le bord du verre** (clair) : il rend l'arête des popovers visible (−26 de luminance contre +2) mais apparaît aussi sur la barre du haut et la barre latérale. Garder partout / popovers seulement / plus léger. Captures : `doctopus-s3-primitives/app/docs/reports/fix-s3-primitives/` | C5 | le merge de `feat/s3-primitives`, donc toute l'intégration |

## 4. Branchements transversaux à poser à l'intégration (par `main`)

- `saveSimulation` → `applySimulationToJournal(sim)` (une simulation alimente le journal sans attendre la synchro).
- Drill → `logTraining` (le travail hors plan est journalisé).
- Runner → `sim.taskId` ; résolution à l'écriture (une tâche jouée, du plan ou librement, se coche).
- `saveSimulation` cesse d'écrire `Case.status` / `confidence` / `layerProgress`.
- Lanceur IA monté dans `PlayArea`, Teils Anamnese et Fallvorstellung.
- Amendements de contrat : `simulation-run.md` (règle 8, INV-20, INV-26, règle 7, §3.1), `frage-atomique.md` §3.3, `training-journal.md` (second appareil ; « pas de migration serveur » est faux).
- Lignes CI : `checkQuestionAtomicity`, `checkBudgetFloor` (base de PR / `github.event.before`, `fetch-depth: 0`), tests de mutation, `checkQuestionOrder` informatif, `check-materials`.

## 5. Journal des décisions de la direction (série 3)

Q11 salves d'Oberarzt gardées · Q5 Arztbrief étape optionnelle · Q3/Q9 séance IA :
historique + série, pas l'indice · Q1 mode d'avancement déduit puis proposé · G2-a
zéro ombre portée sous le verre · G2-b relance par défaut, sonde neuve si l'examen
note la dimension à part · Q8 Gemini + ChatGPT · accord pour la prod (1ᵉʳ oct.) ·
lots : temporiser ce qui ne peut pas tourner, tracer, lancer dès que possible (3 oct.).
