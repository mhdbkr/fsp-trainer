# Série 3 — avancement et file d'attente

> Registre de traçabilité tenu par `main`. Chaque élément en attente porte son
> **déclencheur** : il est lancé dès que celui-ci tombe, sans nouvelle demande.
> Analyse : `docs/superpowers/specs/2026-09-30-serie3-analyse-et-chantiers.md`.
> Constats : `app/docs/BACKLOG-FEEDBACK.md` § Série 3.

## 1. Chantiers en cours (au 3 oct. 2026)

| Chantier | Branche | Étape | Prochaine marche |
|---|---|---|---|
| P0 contrats | `feat/s3-contrats` | ✅ mergé (`4fad5b1`) | amendements à appliquer à l'intégration (§4) |
| C5 primitives | `feat/s3-primitives` | ✅ fixeur terminé — **filet encre validé par la direction (3 oct.)** | vérification finale + plan de passation post-merge → PR |
| C2 simulation | — | ✅ **MERGÉ** (PR #54, 3 oct.) | — |
| C4 contenu | — | ✅ **MERGÉ** (PR #55, 3 oct.) — contenu publié | lots suivants (§6) |
| C1 programme | `feat/s3-programme` | fixeur terminé (6/6, 698 tests) | revue de clôture + plan d'intégration → PR |
| C3 IA externe | — | ✅ **MERGÉ** (PR #56, 3 oct.) — lanceur dans la partie jouée | test de 5 min de la direction pour le pré-collage ChatGPT (Q-7) |

## 2. File d'attente — déclencheurs

| # | Élément | Déclencheur | Pourquoi pas maintenant |
|---|---|---|---|
| Q-1 | ✅ **déclenché le 3 oct.** — L0 (Fachanamnese selon la nature du motif) en cours, `feat/s3-lot0-fach-nature` · **Lots de contenu suivants** (faire descendre le budget A=522 / B=118 / C=8 ; Fachanamnese choisie selon la nature du motif — ex. `case-karpaltunnel` reçoit la Fachanamnese Ortho/Trauma : « Helm », « Reithosen », « Hand oder Fuß ») | `feat/s3-contenu` **Approve** puis mergé dans `main` | un seul writer par fichier : les lots touchent `seedCases.ts` / `anamneseChapters.ts`, où le fixeur travaille encore. Le classement par visibilité est mesuré en avance. |
| Q-2 | ~~Déploiement production serveur~~ — **FAIT le 3 oct. 2026** : migration `20260930000017` appliquée (contrainte à 20 types, 167 événements intacts, `lock_timeout 5s`) puis fonction `events` v9 (`verify_jwt`). Fumée : 401 propre sans utilisateur, CORS 204, trafic réel en 200 après déploiement. **Reste : le client**, avec le merge de `feat/s3-programme` (il corrige aussi la perte de lot sur 401/429 du client en prod) | — | — |
| Q-3 | **Intégration** dans l'ordre primitives → contenu → programme → simulation → IA, avec les branchements transversaux (§4) | chaque branche **Approve** ; primitives d'abord (les autres consomment ses surfaces) | — |
| Q-4 | **Passation de charte** (segmentés → `.seg`, surfaces → `.panel`, ombres mortes) dans les écrans Programme/Simulation | intégration de `feat/s3-primitives` | les écrans appartiennent à d'autres chantiers |
| Q-5 | **C6 — l'agent qui teste à la place de la direction** : candidat synthétique 14 jours, horloge injectable, invariants | intégration terminée | il doit jouer l'app intégrée, pas des branches séparées |
| Q-7 | **ChatGPT « s'ouvre avec le prompt collé »** (`?q=`) : un seul réglage à basculer | test de 5 min **par la direction** dans un navigateur connecté (protocole : `doctopus-s3-ia/app/docs/reports/lead-s3-ia-sources.md` §6) | Cloudflare bloque la mesure automatique de la limite de longueur ; le contrat interdit de pré-remplir sans limite connue |
| Q-8 | Raccourcir 5 cas dont le prompt patient dépasse 10 000 car. (devient une pièce jointe dans ChatGPT) : delir, karpaltunnel, metabolisches-syndrom, pankreaskarzinom, ulcus-cruris | merge de `feat/s3-contenu` (même déclencheur que Q-1) | contenu, même writer que Q-1 |
| Q-9 | `setModus` / `setIntensity` n'émettent aucun événement : la configuration du programme ne se synchronise pas entre appareils | après merge du programme (suivi, gravité à confirmer par la re-revue) | hors liste de revue |
| Q-10 | **Fonction `ai` (assistant intégré) en 503** à répétition en prod (3 fois, 15:49–15:50 le 3 oct.) | dès que possible — diagnostic | hors série 3, relevé dans les journaux |
| Q-11 | ✅ **fait — PR #56** · **PR du chantier IA** (rebase sur main + montage `TeilAiLauncher` dans `PlayArea` + retrait de la puce `SimulationRunner.tsx:275`) | merge de **PR #54** | le lanceur vit dans le runner de la simulation |
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
- Lanceur IA monté dans `PlayArea` : `{(part === 'anamnese' || part === 'fallvorstellung') && <TeilAiLauncher caseId={c.id} teil={part} />}` ; retirer la puce d'en-tête `SimulationRunner.tsx:275`.
- Séance IA externe exclue de la confiance du cas (réglé par l'arrêt d'écriture de `Case.status`/`confidence` dans `saveSimulation`) — sinon la carte de retour affirme à tort « pas dans l'indice ».
- Amendements de contrat : `simulation-run.md` (règle 8, INV-20, INV-26, règle 7, §3.1), `frage-atomique.md` §3.3, `training-journal.md` (second appareil ; « pas de migration serveur » est faux).
- Lignes CI : `checkQuestionAtomicity`, `checkBudgetFloor` (base de PR / `github.event.before`, `fetch-depth: 0`), tests de mutation, `checkQuestionOrder` informatif, `check-materials`.

## 5. Journal des décisions de la direction (série 3)

Q11 salves d'Oberarzt gardées · Q5 Arztbrief étape optionnelle · Q3/Q9 séance IA :
historique + série, pas l'indice · Q1 mode d'avancement déduit puis proposé · G2-a
zéro ombre portée sous le verre · G2-b relance par défaut, sonde neuve si l'examen
note la dimension à part · Q8 Gemini + ChatGPT · accord pour la prod (1ᵉʳ oct.) ·
lots : temporiser ce qui ne peut pas tourner, tracer, lancer dès que possible (3 oct.).

## 6. Plan des lots de contenu (mesuré le 3 oct. — déclencheur : merge de PR #55)

Le budget (648 lignes : A=522 B=118 C=8) s'affiche **4 526 fois** sur les 130
trames jouées, et c'est très concentré : **19 textes = 50 % de l'écran, 83 = 80 %**.
Le tronc commun pèse **58× plus** à l'écran qu'une question de cas (57,8 contre
1,0 apparition par ligne). Ordre : par ce que voit le candidat.

| Lot | Contenu | Budget | À l'écran | Nature |
|---|---|---|---|---|
| **L0** | **Fachanamnese choisie selon la nature du motif** (47 cas, 91 paires absurdes : « Helm » aux 11 cas d'ortho dont aucun n'est concerné, Reithosen à 6 cas sans rachis, nitro sans douleur thoracique, FSME/Tetanus à l'hépatite B…) + sondes ortho/neuro-kraft | −21 (**C → 0**) | 104 + 91 paires retirées | règle mécanique (champ déclaré `motiv` pour 13 cas Ortho/Angio + `fachSkip` pour le résidu) + 17 textes relus |
| **L1** | Tronc commun (pers, veg, vor, med, all, nox, fam) | −44 | **2 543** + 2 600 répliques patient | réécriture relue, même id (0 réponse nouvelle) |
| **L2** | Aktuell commun + Frauen — dont `FRUEHER()` : **1 édition = −10** | −58 | 717 + 982 | réécriture relue |
| **L1b** | `seedGuides.ts` (page Guides), aligné sur L1/L2 | −24 | page Guides | quasi-copie |
| **L4–L9** | Fachanamnesen par poids à l'écran | −230 | ≈ 900 | clinique |
| **L10–L15** | Questions propres aux cas | −271 | 271 | clinique, en dernier |

**L0 + L1 + L2 ≈ 75 % de ce qui s'affiche.** Décision de `main` (révocable) :
`motiv` déclaré (13 cas, réutilisable pour les futurs imports) **et** `fachSkip`
pour le résidu clinique. Rapport complet : sortie de l'agent `plan-lots-contenu`,
scripts dans le scratchpad de session (`lots/`).

## 7. Journal

- 3 oct. — PR #54 et #55 mergées (autorisation de la direction) ; filet encre du verre validé ; lot L0 lancé ; PR #56 ouverte. Incident évité : un `npm install` local avait élagué `ansi-regex` du `node_modules` partagé par les worktrees — réparé par `npm ci`, la CI n'a jamais été touchée.

## 8. Après la série 3 — feuille de route proposée (3 oct., à valider par la direction)

1. **Finir la série 3** : primitives (intégration en cours : 9 conflits avec #53, résolutions tranchées par la vérif finale), programme (clôture → intégration + branchements transversaux → client qui corrige la perte d'événements), lots de contenu L0→L2 puis L4–L15, **C6 l'agent testeur** (candidat synthétique 14 jours).
2. **Série 4** : usage réel de l'app intégrée par la direction (1–2 semaines) + agent testeur en parallèle → retours.
3. **Un seul gros chantier ensuite (ADR-0015)** — recommandé : **Prüfungstag** (examen de 60 min, trois parties enchaînées), rebâti sur le programme refondu au lieu de le doubler.
4. Puis **Arztbrief corrigé par IA** (épic #5).
5. **Signal stratégique** : à partir du 1ᵉʳ nov. 2026 la Kenntnisprüfung devient la voie normale (diplômes hors UE) → l'extension KP passe avant tout le SaaS (ligue, marketing, pricing), qui reste en pause.

**À trancher par la direction** : les trois branches V1 dormantes depuis le 16 sept. — `feat/pruefungstag` (71 commits), `feat/characters` (71), `feat/site-v2` (291) : reprendre, réutiliser en partie, ou archiver ; et les PR ouvertes #48 (grille d'évaluation), #49 (audit glossaire), #52 (corrections de la revue du site).

## 9. Reprise après la limite hebdomadaire (6 oct., 6 h) — dans cet ordre

Agents arrêtés le 3 oct. par la limite hebdomadaire ; tout est sur disque.

1. **Primitives** — BLOQUÉ : un second writer dans `doctopus-s3-primitives` (commit `1ca6d35e` de mhdbkr à 19:02 + fusion de `ae0fd2dd` en cours, non lancée par l'intégrateur). **Question à la direction : qui écrit là ?** Fait par l'intégrateur : `bb9afa10` (fusion main, M1–M5) et `7d279283` (passation simulation S1–S13). Restent : 2 fichiers non commités (`index.css` commentaires, `quality.yml` tokens), finir la fusion de `ae0fd2dd` (garder `viewTransition` dans `entrer()`), preuve navigateur, push, PR.
2. **Programme** — revue de clôture interrompue (dernière sonde : trou `taskId` explicite, kind `external-ai`) → relancer, puis intégration + branchements transversaux.
3. **Lot L0** — relecture clinique interrompue → relancer ; revue mécanique : vérifier si elle a abouti.
4. **Nouveaux constats FB3-G1→G7** (registre `BACKLOG-FEEDBACK.md` § G) → **nouveau lot en tête de file : les questions « pour ce cas », dans l'ordre d'affichage** (décision de la direction, 3 oct.), qui remplace l'ordre L1→L2 prévu au §6 : audit région/organe ↔ cas (« wirklich im Knie » pour une hanche), présuppositions (« zweiten Stock »), puis irradiation selon la région (FB3-G1, extension de L0), le bug d'affichage de la relance alcool (FB3-G4), et `case-leberzirrhose` (FB3-G5/G6) en premier des « premiers cas » (FB3-G7).

## 10. Objectif de couverture — décision de la direction (3 oct.) : **100 %**

Les lots s'enchaînent jusqu'à épuisement, sans saut : **L0** (en revue) →
**questions « pour ce cas » dans l'ordre d'affichage** (+ FB3-G) → **L1** tronc
commun → **L2** motif de consultation → **L1b** guides → **L4–L9** Fachanamnesen
→ **L10–L15** questions de cas restantes. Critère de fin : budget A = B = C = 0
(seules exceptions : salves d'Oberarzt `D2`/`D3`, autorisées par la direction le
30 sept., comptées et jamais à la hausse) ; les 130 cas passés au crible de
cohérence (région, présupposition, ordre, nature du motif) ; audit des premiers
cas (FB3-G7) soldé.

**Découpage du lot « questions pour ce cas »** (audit rendu le 3 oct. :
[`audit-questions-du-cas-serie3.md`](audit-questions-du-cas-serie3.md) — 874
questions, 271 composées, 8 présuppositions, 1 région fausse) :

| Lot | Contenu | Nature |
|---|---|---|
| **Q0** | « Falls ja » sur la relance alcool (`:675`) + 12 relances sœurs ; `CaseQuestion.followUp` ; +3 `FACH_COVERS` (irradiation posée 2-3 fois dans 17 cas) ; `checkQuestionOrder` étendu (adjectifs, ordinal, « Sie nehmen… », exclusion par trame) ; garde CI territoire ⊂ région | mécanique |
| **Q1** | P0 de `aktuell` : 8 présuppositions, coxarthrose ×3, 9 irradiations, 6 répétitions, leberzirrhose ×7 | clinique |
| **Q2** | 40 composées « fermée ? + W- ? » → relance « Falls ja » | mécanique relue |
| **Q3–Q5** | composées cliniques de `aktuell` (A 110, B 34), cas tier 1 d'abord | clinique |
| **Q6–Q8** | chapitres suivants dans l'ordre d'affichage + arbitrage des 6 natures de motif | clinique |
| **Lc1–Lc3** | FB3-G6/G7 : leberzirrhose (fiche, Fachwissen, `syndrome-map` au lieu du bonhomme), fiches C0 tier 1, puis C1/C2 < 15 k | clinique |

Décisions de `main` : leberzirrhose passe en `motiv` **schmerz** (relecteur
clinique confirme au lot) ; la note « Vor jedem Schmerzmittel » (`:91`) se
rattache à la branche « sehr stark » ; la relance automutilation (psy `:1464`)
est tranchée par le relecteur clinique de Q0. **Q0 démarre au merge de L0**
(mêmes fichiers : `anamneseChapters.ts`). Ensuite L1 → L15 reprennent ce qui
reste du budget hors questions du cas.

## 11. Registre des workflows en vol — à relancer sans exception

**Conflits d'autostash résolus par `main`** : `index.css` (3 oct., `.reveal` en `backwards` + `.swap-*` de #58) ; `ProgramPage.tsx` (4 oct., `ReporterMenu` supprimé par #60 → version de `main`). `stash@{0}`/`stash@{1}` = copies intactes de l'autre session, à ne pas supprimer sans elle.

**Ne jamais utiliser `git stash` dans un worktree** : les stashs sont partagés ; `stash@{0}` (autostash du 3 oct.) contient le travail en cours d'une autre session (`index.css`, `checkFixedOverlays`).

Règle : à chaque reprise (limite d'usage, coupure), `main` relit cette table et
relance chaque ligne non close, par son identifiant d'agent (`SendMessage`).
**Tenue du registre** : la session `main` de la série 3 (confirmé par la direction
le 3 oct.) ; les autres sessions travaillent sur d'autres features et ne relancent
rien de cette table.

| Workflow | Worktree / branche | Agent | Étape | Clos ? |
|---|---|---|---|---|
| Intégration primitives | `doctopus-s3-primitives` · `feat/s3-primitives` | `ad901ff9c385851ac` | **PR #58 mergée** (`8e7474f7`, 3 oct.) | **oui** |
| Intégration programme | `doctopus-s3-programme` · `feat/s3-programme` | `a276d650bc56bda9b` | **PR #60 mergée** (`2604ff8c`, 4 oct.) ; CI de `main` rouge après coup (`9f975394`, autre session, a retiré « Verso » au drill) → test réaligné par `main` (`76899950`) | **oui** |
| Lot L0 — revue mécanique | `doctopus-s3-lot0` | `a85f52786072e2105` | rendue : Request changes (I1 fiche simulant « Fuß » sur la main, I2 plancher des paires, I3 `fachSkip` non validé) | **oui** |
| Lot L0 — fixeur | `doctopus-s3-lot0` · `feat/s3-lot0-fach-nature` | `ac508d333980d928d` | **PR #59 mergée** (`1b9c03a7`, 3 oct.) | **oui** |
| Audit questions du cas + FB3-G | lecture seule | `ac7225d1457bf293d` | rendu → `audit-questions-du-cas-serie3.md` | **oui** |
| Suivis programme | — | — | `StatusBadge` sans usage (`components/ui.tsx`) ; tâche figée sur un autre appareil non rapatriée → cochée par le contenu seulement | à lancer après merge |
| Réserves primitives (suivi) | — | — | `CardFlip` (`.card`) dans le verre de `CardToast` : choisir sa matière en petit ; `.input` flouté dans cartes floutées (antérieur) ; « Dokumentation » touche sa tuile à 390 (`ModeChooser`) | à lancer après merge |
| Lot Q0 — implémenteur (devient fixeur) | `doctopus-s3-q0` · `feat/s3-q0-questions-du-cas` | `acd90f173726a129a` | **PR #62 mergée** (4 oct.) | **oui** |
| Lot Q0 — revue mécanique | lecture seule | `a77b1f874a424ae16` | rendue : Request changes (I-1 relance de cas hors atomicité) + m1–m7 | **oui** |
| Lot Q0 — revue clinique | lecture seule | `a5ac25017eaaac724` | rendue : approuvé avec réserves (hodentorsion, épaule péricardite, NOTFALL) ; 3 décisions confirmées | **oui** |
| Lot Q1 — implémenteur | `doctopus-s3-q1` · `feat/s3-q1-aktuell` | `aa77839d0d370c0e3` | **PR #63 mergée** (`3ac9f820`, 4 oct.) | **oui** |
| Lot Q1 — revues | lecture seule | clinique `ae3f2807f69066acc` · langue `a751050b5532bf3d0` · mécanique `a291c2076b053b0db` | rendues : clinique 3 réserves (coxarthrose persona/medicalView, bws → règle Fach), langue 6, méca Approve with minors | **oui** |
| Mécanique à ajouter (revues Q1) | — | — | (a) `checkCaseQuestionAnswers.mjs` informatif + compteur gravé (129/866 questions de cas sans mot retrouvé dans la fiche, ≈ 20 trous réels) ; (b) relance « W-, und W- ? » à un seul « ? » non détectée par la règle A ; (c) ~~contrat §3.6~~ fait dans #63 | avec Q2 |
| **Série 4 — contrat** | `doctopus-s4-contrat` · `feat/s4-contrat-structure` | `a4f5342846f51c81c` | **PR #64 mergée** (`8ef10cdb`, 4 oct.) | **oui** |
| Suivi contenu (S4-2) | — | — | table de fréquences par cas × ville dans l'app depuis `apps/site/src/data/frequencies.json` (20/81 pathologies ventilées) | à planifier avec S4-2 |
| Lot C6-A — revue | lecture seule | `af6bb30623f1df590` | rendue : Needs fixes (I1 Fachwissen point faible par absence ; I2 contrat → S4-0 ; I3 bascule `it.fails` après C6) | **oui** |
| Lot Q2 — implémenteur | `doctopus-s3-q2` · `feat/s3-q2-relances` | `a49100e50b7d8eee7` | **PR #67 mergée** (`395aadf0`, 4 oct.) | **oui** |
| Lot Q-gyn | `doctopus-s3-qgyn` · `feat/s3-qgyn` | `a901861e0ac10b346` | **PR #70 mergée** (5 oct.) | **oui** |
| Reliquat sans lot (Q2) | — | — | 24 relances de guide à deux « ? » ; 22 énoncés de `guide-anamnese-v4` ; sondes en A2 ; `CaseQuestion.followUp` en `string | string[]` (contrat §3.2) pour récupérer ~15 sous-questions abandonnées | à placer dans Q3 |
| **Moteur de cohérence — contrat** | `doctopus-s3-coherence` · `feat/s3-coherence` | `aa3e71100abae223a` | **PR #69 mergée** (5 oct.) | **oui** |
| Moteur de cohérence — K0 lexique + mesure | `doctopus-s3-k0` · `feat/s3-k0-lexique` | `a6c1d1e7b69d620b7` | **PR #72 mergée** (5 oct.) | **oui** |
| Moteur de cohérence — K1 annotation | `doctopus-s3-k1` · `feat/s3-k1-annotation` | `ac46962a736716e72` | **PR #74 mergée** (`81914bc4`, 5 oct.) | **oui** |
| Moteur de cohérence — K2 profils | — | — | **#75 MERGÉE** (5 oct., CI verte) | oui |
| Lot F — favoris → drill | — | — | **#77 MERGÉE** (5 oct., CI verte) | oui |
| **K3 — cohere au montage** | `doctopus-s3-k3` · `feat/s3-k3-cohere` | — | **PR #78** : main (S4-3) fusionnée dans la branche (`fa0be537`, conflit auto `db/types.ts`) ; CI relancée (attente avec relance auto des jobs annulés sans runner) → merge | non |
| **S4-3 — la partie** | — | — | **#79 MERGÉE** (CI verte) ; Pages en file (incident Actions) — prod encore à `4e695c80` | oui (déploiement en attente) |
` · `feat/s4-3-partie` | Opus | `141c78b5` → revues : méca Needs fixes (Aufklärung casse l'enchaînement, flake, Terminer ici Aufklärung seule refusé, reprise le lendemain laisse « Finir X » ouverte) ; direction À CORRIGER (Muster guidé non raisonné : Frauenanamnese à un homme, Auss| D_UN_TRAIT_ACTIF = true | `doctopus-s4-dun-trait` · `feat/s4-dun-trait` | Opus (agent S4-3) | flip + test + mutation prêts ; `SimulationRunner.partie` « fil d'étapes » casse avec la garde vraie (déterministe) → cause racine en cours ; PR après déploiement réel de S4-3 | non |
trahlung en dyspnée, pas d'alcool ; « ein/e Patient/in » ; cadran ×2 ; assistance : la tâche prescrit, raison affichée, 0 passage = dernier choix) → fixeur → passe navigateur main (Supabase local) → PR | non |
| Lots Q3 → Q8, Lc1 → Lc3 | — | — | §10, l'un après l'autre après Q2 | à lancer |
| Reports vers Q1/Q2 (revues Q0) | — | — | Q1 : rheumatoide-arthritis « Schuppenflechte », karpaltunnel « Bruch », malaria « Milz », hypothyreose « Entbindungen » ; 10 irradiations avec question de cas ; osteoporose bws. Q2 : relances à 2 questions (alcool, gastro, Kopfschmerz, onko, chir-op, Fieber, Kraft, suizid, `veg-fieber`) | tracé |
| C6 — candidat synthétique | `doctopus-s3-c6` · `feat/s3-c6-candidat` | `a92b4c2e4d2f21ebc` | **PR #65 mergée** (`4bf3473b`, 4 oct.) — premier run CI vert d'`invariants-c6` et `candidat-c6` | **oui** |
| C6 — jugement UX | lecture seule | `a06644a85b277a992` | rendu → `c6-jugement-ux-2026-10-04.md` (7 ruptures) | **oui** |
| Lot C6-A « chiffres honnêtes » | `doctopus-s3-c6a-chiffres` · `feat/s3-c6a-chiffres` | `a09833e671b2389b9` | **PR #66 mergée** (4 oct.) | **oui** |
| Lot C6-B « le jour du candidat » | `doctopus-s3-c6b-jour` · `feat/s3-c6b-jour` | `ad84ab89cbdc39047` | **PR #68 mergée** (`bc5382ed`, 4 oct.) — **voie B close : série 3 fiabilité terminée** | **oui** |
| **S4-1 — la mesure** | `doctopus-s4-1` · `feat/s4-1-mesure` | `aba008b91b1b3b76a` | **PR #71 mergée** (`f99364e1`, 5 oct.) — bascule de la frise le 6 oct. | **oui** |
| **S4-4 — le cadran** | `doctopus-s4-4-cadran` · `feat/s4-4-cadran` | `ab290bfc85b932af4` | **PR #73 mergée et EN LIGNE** (déploiement `ccef1b0b` réussi ; textes du cadran présents dans le bundle de prod `index-BN3xaDUw.js`) ; m2 (seconde source de `vientDEtreJoue`) à inscrire au contrat | **oui** |
| Suivi hors périmètre | — | — | `checkFixedOverlays.mjs` (non suivi, travail en cours de l'autre session) signale 10 manquements dans `CasePreviewPanel.tsx`, 3 fichiers `fachbegriffe/`, `.reveal`/`.stagger` — à reprendre avec cette session quand elle commitera | tracé |
| **S4-2 — le plan** (critique) | — | — | **#76 MERGÉE** (5 oct.) — CI verte ; prod : migration 18 appliquée et vérifiée (contrainte contient les 2 refus + plan.done), fonction `events` v10 déployée (verify_jwt, 401 sans jeton, préflight 204) ; client publié par Pages. Fumée A/B non faite (aucun compte de test en prod, création interdite) → vérif via logs après usage réel | oui |
| Critères pour S4-4 (cadran) | — | — | `solideDes` futur : « Solide si tu refais 80 ou plus à partir du … » ; passé : « Solide à ta prochaine partie à 80 ou plus » ; jamais « ≥ » ni « % » ; maîtrise jamais sans couverture : « 74 en moyenne sur 2 Teile » | à transmettre à S4-4 |
| Diagnostic e2e programme | `doctopus-baseline` | `aaa8ca7770f3949ab` | cause : dimanche = jour off par défaut → plan vide (pas de régression) ; script corrigé, intégré à #68 ; suivi : `aria-pressed` sur les boutons de jours off (S4-5) | **oui** |
| `main` après C6 | — | — | `test:c6` dans `package.json`, `tests` dans tsconfig ; test instable `ExternalAiSheet` corrigé (`48a36bd3`) | à faire au merge de C6 |
| Lots L1 → L15 | — | — | §10, l'un après l'autre (mêmes fichiers) | à lancer |

**Charge machine (5 oct.)** : 8 Go / 8 cœurs saturés par ~190 navigateurs de test et 5 serveurs orphelins (nettoyés) ; au plus 2 agents locaux à la fois, chaque agent ferme ses serveurs/navigateurs ; option « Continuer dans le cloud » proposée à la direction.

**Modèle des agents (direction, 5 oct.)** : selon la complexité, Opus en cas de doute ; Sonnet seulement pour des tâches claires et cadrées.

## 12. Plan d'ensemble (4 oct. 2026) — trois voies, fichiers disjoints

Décisions du 4 oct. : les 4 recommandations « cas entier » ; pré-simulation réordonnée ; Muster guidé / libre ; Examen en dernier ; état `prêt` (anneau soudé) ; les 6 ajouts du cerveau (consolidation espacée, solide stable, erreurs transversales, durées apprises, rythme proposé, couverture pondérée par la fréquence).

**Voie A — Contenu (un lot à la fois, `seedCases.ts` / guides / `check*.mjs`)** : Q2 (en vol) → Q3 → Q4 → Q5 → Q6 → Q7 → Q8 → Lc1 (leberzirrhose : fiche, Fachwissen, visuel) → Lc2 (fiches C0 gratuites) → Lc3 (C1/C2 < 15 k) → reliquat L1–L15 jusqu'à A = B = C = 0 et 130 cas audités. Q-8 (5 prompts > 10 k car.) entre dans Lc. Indépendante des voies B et C.

**Voie B — Clôture série 3 (fiabilité)**, dans cet ordre (mêmes fichiers) : PR C6 (harnais) → PR C6-A (chiffres honnêtes) → PR C6-B (le jour du candidat). Puis la série 3 est close.

**Voie C — Série 4 « le cas entier, mesuré au Teil »**, chaque chantier = implémenteur → revues (mécanique Opus + métier) → C6 étendu au nouveau parcours → PR → merge par la direction :
- S4-0 contrat + ADR-0021/0022 (en vol) → revue → PR.
- S4-1 la mesure : échelle vierge/entamé/couvert/solide/prêt, solide stable, couverture et maîtrise séparées. Après C6-A.
- S4-2 le plan : tâche de cas (« il te reste… »), règle de complétion, consolidation espacée, « d'un trait », durées apprises, rythme proposé, erreurs transversales, couverture pondérée par la fréquence ; absorbe Q-9 (config non synchronisée) et M-b (refus de rattrapage multi-appareils). Après C6-B. **Chantier critique : invariants d'abord.**
- S4-3 la partie : entrée unique, « Terminer ici », départ sur un autre Teil, marqueur d'enchaînement ; pré-simulation réordonnée, Muster guidé/libre ; retire « Couche 1 ».
- S4-4 le cadran `CaseDial` : carte de cas, ligne de tâche, pré-simulation, fin de partie, anneau soudé.
- S4-5 Programme refait (aujourd'hui / semaine / jusqu'à l'examen / carte de couverture) ; absorbe Q-6 (débord 390 px).
- S4-6 Historique « carnet de séances » (+ événement local « terme cherché »).
- S4-7 Examen (audit `feat/pruefungstag` puis remplacement de la page Simulation). En dernier.
S4-1 peut démarrer pendant la voie B (fichiers `lib/journal`, `lib/stats` après C6-A) ; S4-2 et S4-3 attendent C6-B.

**Décisions du 4 oct. (suite)** : voies A, B, C d'abord, **KP après** ; verdict d'une partie sans langue notée = **réussite sur le contenu** (le verdict complet attend la langue).

**Ajouts du 4 oct. (retours d'usage)** :
- **Voie A, lot Q-gyn, juste après Q2** (même fichier `anamneseChapters.ts`) : quand la Fach Gynäkologie est jouée, la Frauenanamnese s'y FOND — un seul bloc gynéco dans l'ordre clinique, sans doublon (`frau-wechseljahre` « Frauenarzt » ⊂ `fach-gyn-vorsorge` ; `frau-periode` recoupe `fach-gyn-blutung` ; `frau-verhuetung` / `fach-gyn-kinderwunsch` / « Hormone » de `fach-gyn-eingriffe` à départager) ; les 2–3 questions propres à la Frauenanamnese (dernières règles, possibilité de grossesse, contraception) restent, placées en tête du bloc. Mécanisme existant étendu (`FACH_COVERS` ou repli de chapitre), garde CI : aucun signe demandé deux fois quand la Fach gynéco est jouée. Relecture clinique gynéco obligatoire.
- **Lot F « favoris → drill », juste après le merge de C6-B** (fichiers `lib/collections/*`, `DrillPage`, partie drill de `dayPlan.ts`) : un terme mis en favori est « à revoir bientôt » — jamais vu : il entre au drill suivant, TOUS les favoris de la séance (pas 3 places) ; déjà appris : son échéance SRS est avancée au lendemain ; le drill qui suit le cas commence par les favoris de ce cas ; la tâche drill du programme compte « dont N favoris de ta séance ». Aujourd'hui : bonus de pertinence 48 h seulement sur les termes `Neu` et 3 places réservées (`drillQueue.ts:RESERVED_NEW`, `relevance.ts:36`).

**Restent à la direction** : Q-7 (test ChatGPT 5 min) ; Q-10 (secrets de la fonction `ai`, 503) ; PR #48, #49, #52 ; branches dormantes `feat/characters`, `feat/site-v2` ; ~~calendrier KP~~ (tranché : après A, B, C).
**Suivis techniques** (absorbés quand le fichier est rouvert) : `StatusBadge` mort ; `CardFlip` dans le verre de `CardToast` ; `.input` flouté dans cartes floutées ; « tournures officielles » `SimulationSetup.tsx:119` (S4-3) ; `Hero.astro:21` (site) ; contrat `simulation-run.md` sentinelle `-1` (S4-0).

> 5 oct. — direction : « merge 75, et enchaîne automatiquement jusqu'à la fin de toutes les phases ». Mode autonome : merge à CI verte, déploiement S4-2 selon la procédure §6 (migration psql → fonction → client), sans attendre de commande.

> 5 oct. ~23 h — **K4 livré** (`feat/s3-k4-cas` @ `7e40d224`, depuis K3) : questions muettes 794→1, nonReduit 103→0, doublons 203→1, horsProfil 44→2, brauchtViole 19→22 (documenté) ; +262 signes (`signesDefsCas.ts`). Décisions main : anorexia n°7 reste muette (sécurité), gastro n°27/31 accepté en résidu (jamais posé). **À faire** : revues clinique + méca Opus, puis PR après merge de K3.
> **Limite d'usage atteinte.** En vol : PR #78 (K3) en CI avec relance auto ; agent S4-3 sur `feat/s4-dun-trait` (test runner cassé avec la garde vraie) ; déploiement Pages de S4-3 en file (incident GitHub Actions). Reprise : merge #78 si vert → revues K4 → PR K4 → K5 ; vérifier S4-3 en prod puis PR « d'un trait » ; puis S4-5, S4-6, S4-7, lots Q/L.
> « D'un trait » : `feat/s4-dun-trait` @ `aa57cdc3` prêt (garde vraie, tests verts, mutations 134/134). La casse venait d'une fuite de fixture (`beforeEach` effaçait `db.meta` hors de la file d'écriture), corrigée en `ea73eaec` ; le runner n'avait pas de défaut. **Avant PR** : textes du pôle Expérience pour annoncer la tâche « d'un trait » (raison, libellé « à rejouer d'un trait » sur la ligne de tâche, « Il te reste… » trompeur), puis PR après S4-3 en prod. Suivi : même course possible dans `useLauf.test.tsx` et `clearLocalProgress`.
> PR #78 (K3) : CI rouge sur « Types & build » — 1 test, `SimulationRunner.partie.test.tsx` « bilan : Continuer et Terminer ici ». C'est la fuite de fixture de S4-3 (déjà sur main), corrigée par `ea73eaec` sur `feat/s4-dun-trait` ; ce n'est pas K3. **Reprise** : PR séparée avec `ea73eaec` seul → merge → relancer #78 → merge.

> 6 oct. — reprise (direction : « effectue tes tâches de 1 à 5 »). (1) **PR #80** : correctif de fixture seul (`1822b234`, 3/3 en local) → CI. (2) #78 relancée après #80. (3) revues K4 clinique + méca Opus lancées. (4) **S4-3 vérifié en prod** : Pages a publié `0a1a44ba`, le bundle contient « Terminer ici », « formulations types », « Lancer le chrono », « Finir ». (5) textes « d'un trait » confiés à un implémenteur Opus (raison, libellé de ligne, « Il te reste » remplacé) → revue direction-keeper → PR.
> K4 : revues rendues — clinique NON (P0 urine mousseuse perdue en néphrotique ; P1 irradiation colique néphrétique, intervalle asthme, immobilisation TVT, écoulement mammaire, saignements intermenstruels myome, vaccins/tique malaria, vertige positionnel présupposé, doublon cystite) ; méca Needs fixes (parts non découpées strictement, critère « la fiche dit plus » masque des doublons, tests K4 ne rougissent pas sur la trame jouée). Décisions main : anorexia n°7 → signe `todeswunsch` (gradation sans retrait) ; parts = découpe + complément grammatical minimal inscrit au §10.4 ; critère = identité de la question ; compteur informatif `doublonsMasques`. → fixeur. Ordre de fusion : #80 → #78 (K3) → K4.
> **#80 MERGÉE** (correctif fixture) puis **#78 MERGÉE — K3 en prod** (6 oct., CI verte sur `c9f6c4e7`). Le job « Publier le contenu » de main publie les profils, `sucht` et le contenu K3. K4 fusionne main.
> K3 : job « Publier le contenu » du merge `85cc45a9` = **succès** (contenu K3 publié en prod). Échec isolé du run #80 sur main = `supabase/setup-cli` « latest » limité par l'API GitHub (infra) → suivi : épingler la version du CLI dans `quality.yml` (fichier avec WIP local de la direction, non touché).
> K4 : contre-revue clinique **mergeable** ; relecture de langue : 4 bloquants + 16 importants (parts elliptiques posées en ouverture) → dernier fixeur (remplacements exacts + garde-fou « part en ouverture = question autonome » + P2 adnexitis, metabolisches, sturz).
> « D'un trait » : textes livrés `0036ad86` (raison, « À rejouer d'un trait, en entier », Lancer repart de l'Anamnese) → revue direction-keeper.
> « D'un trait » : revue direction = à corriger (« d'un trait » ×2 sur la ligne entamée → libellé « À reprendre depuis l'Anamnese » ; raison hors échéance « Solide, pas encore prêt : rejoue-le d'un trait… » ; examen à blanc = une seule raison) → fixeur → PR.
> K4 : dernier fixeur `59999103` (61 reformulations de langue, garde-fou bloquant « part en ouverture = question autonome », P2 adnexitis/metabolisches/sturz) → **PR #81** → CI → merge. Suivis : `checkGuideDuplicates.test.mjs` à ajouter à `quality.yml` ; « oder Schmerzen » (l. 423) au lot de contenu.
> « D'un trait » : fixeur `6c4a837f` (« À reprendre depuis l'Anamnese », raisons corrigées, mutation `I5-libelle`, 135/135) → **PR #82** → CI → merge. Point de revue contesté avec preuve (la pré-sim affiche la raison prescrite) : accepté par main.
> **#81 MERGÉE — K4** (CI verte). **K5 lancé** (`doctopus-s3-k5` · `feat/s3-k5-pipeline`, Opus) : `sucht` requis au type, porte bloquante sans `|| true`, détecteur de présupposition informatif sans plancher, reliquats « Pour K5 », DM3 `PIPELINE.md` + agent content-case-author.
> **#82 MERGÉE — « d'un trait » activé** (CI verte, aucun fichier commun avec K4). Vérifier le déploiement Pages puis le bundle (« À reprendre depuis l'Anamnese »).
> **Vérifié en prod** : bundle `index-DM0cqcDS.js` contient « À reprendre depuis », « rejoue-le d'un trait », « Répétition générale : d'un trait » ; run main de K4 (`ee18372b`) vert, publication du contenu comprise. Tâches 1–5 de la reprise : faites. En cours : K5.
> K5 livré `f5cc6d7a` (sucht requis au type + lecture tolérante, résidu bloquant, INV-89 complet, plancher brauchtViole = violations réelles 22→0 et détecteur texte informatif, tags `schwindel`/`sturz` pour la Fach neuro, PIPELINE.md + content-case-author). Écarts acceptés par main : anorexia n°2 déclare `erbrechen` (fiche), schlaganfall `braucht: ['sturz']` sans réécriture. → revues méca + clinique ciblée Opus.
> K5 revues : clinique mergeable (4 questions changent, 0 perte) ; méca Needs fixes (lotAssembler jette `profil`, `followUpSucht` inexistant dans la doc, piège MOTIF_DECLARE sur akt-motiv, détecteur à affiner, D4-bis à amender au contrat). Décisions main : akt-motiv jamais perdante en r2 (option robuste), epilepsie tag `sturz`, schlaganfall `kapitel: 'fach'`. Lot de contenu : anaphylaxie « Asthmaspray » (vraie présupposition en prod), anorexia, schlaganfall akt-einfluss, hypothyreose, malaria, sturz-im-alter. → fixeur.
> K5 : fixeur `44eaf681` (I1–I5 + mineurs, epilepsie `sturz`, schlaganfall `kapitel: 'fach'`, part d'alarme `gang` autonome) → **PR #83** → CI → merge.
> **#83 MERGÉE — K5 : moteur de cohérence complet (K0→K5) en prod.**
> Lancés (Opus, en parallèle) : **S4-5 Programme refait** (`doctopus-s4-5-programme` · `feat/s4-5-programme` ; absorbe Q-6 390 px, `aria-pressed` jours off, mineurs S4-2) et **lot de contenu Q3** (`doctopus-s3-q3-contenu` · `feat/s3-q3-contenu` ; composées `aktuell` re-mesurées + tous les renvois contenu des revues K3–K5 + tentative de suicide antérieure dans les 10 cas psy + reliquat Q2).
> Q3 livré `ab98887d` : 149 composées restantes re-mesurées, 53 traitées (96 → Q4/Q5), tous les renvois contenu K3–K5, `suizidversuch` dans les 10 cas psy, Q2 reliquat (followUps). Phrase de Fallvorstellung = code (`PreSimulationPage.tsx:132`), à corriger hors Q3. → revues clinique + langue Opus.
> S4-5 livré `2d85868d` (page en 3 questions + carte de couverture, Q-6 corrigé, aria-pressed, m6). Passe navigateur main : candidat C6 sur Supabase local (OrbStack relancé, fonctions servies), 5 jours, **63/63** ; captures 1280/390 sans débord. Décisions main : fenêtre de rythme 14 j → paramètre au contrat §13 ; « Lancer » au lieu de « Ajouter demain » (événement `cas.demande` = proposition future). → revue direction/design.
> Q3 : relecture langue rendue (0 bloquant, 6 importants dont les négations « Versucht habe ich es nie » mal rattachées dans 6 cas psy) ; revue clinique en cours.
> Q3 revue clinique : mergeable après 3 P1 (copd, parkinson, anaphylaxie : la réponse patient révèle ce que la question suivante demande). Décisions main : tentative antérieure avant la consigne NOTFALL ; anorexia n°2 = 2 relances (« Lösen Sie das Erbrechen manchmal selbst aus » + « Seit wann ») ; phrase de Fallvorstellung (`PreSimulationPage.tsx:132`) corrigée dans Q3. → fixeur.
> S4-5 revue direction : à corriger. **Bloquant : « 776 protocoles » faux** (somme des fréquences par cas ; la source compte 580 ; pathologies partagées comptées deux fois) → contrat §13.6/§12.9 + code corrigés, vérifier si déjà affiché en prod. Décisions main : encart au-dessus + 6 spécialités + « Voir les N autres » + cadrans 24 px ; une seule action dans Aujourd'hui ; encart sans « Lancer » (`cas.demande` = proposition à Mehdi) ; une seule phrase « jusqu'à l'examen » ; pied « Replanifié à … » ; semaine avec le travail hors plan. → fixeur.
> Q3 : fixeur `d19d125c` (P1 copd/parkinson/anaphylaxie, ordre psy, langue, zystitis, Fallvorstellung ≤ 200 car. sans coupe sur abréviation) → **PR #84** → CI → merge. Suivi : champ court « titre du diagnostic » dans le contenu.
> **#84 MERGÉE — Q3** (CI verte). S4-5 : fixeur `e53b02f2` (base 580 + pathologie pesée une fois, carte 6 spécialités / 24 px / 779 px à 390, une seule action, semaine hors plan) ; passe navigateur main C6 63/63 → **PR #85** → CI → merge. Suivis direction : `cas.demande` ; `FreqBadge` (`Case.frequency` ≠ source, pAVK 20/18, TVT 25/8) au lot de contenu.
> Lancés (Opus, parallèle) : **S4-6 Historique** (`doctopus-s4-6-historique` · `feat/s4-6-historique` ; carnet de séances, événement LOCAL « terme cherché ») et **lot de contenu Q4** (`doctopus-s3-q4-contenu` · `feat/s3-q4-contenu` ; ~moitié des 96 composées restantes, garde anti-doublon générique, renvois Q4/Q5, alignement `Case.frequency` sur la source, Q8 si possible).
> **Incident disque plein (ENOSPC)** : copies `c6-mut-*` du harnais de mutations + bundles `fsp-dump-*` des scripts d'analyse dans `$TMPDIR` ; S4-6 et Q4 bloqués avant push. Nettoyé (worktrees mergés K2–K5, F, S4-2, S4-3, d'un trait, fix-fixture, Q3 supprimés ; temporaires supprimés) → 4 Go libres. Agents relancés avec consigne de nettoyage.
> **#85 MERGÉE — S4-5 Programme refait** (CI verte, course d'affichage corrigée). Worktree retiré.
> Q4 poussé `55aaf95a` (47 composées → 49 restent pour Q5 ; garde anti-doublon générique, plafond 87 ; « vorbereitet » dans les 10 cas psy ; `Case.frequency` aligné sur la source, 37 écarts) → revues clinique + langue Opus. Décision main : masquer le FreqBadge des 72 cas sans fréquence sourcée (valeur interne gardée pour le plan). Note : plus de trailer `Co-Authored-By` dans les commits (règle `~/CLAUDE.md`, `attribution.commit` absent).
> **Disque** : vraie cause = vitest 5.0.1 laisse `$TMPDIR/<nanoid>/client` à chaque run (7 404 dossiers, 59 Go) ; purge des > 2 h → 53 Go libres. OrbStack/Supabase local relancés.
> S4-6 poussé `66c5bb29` (carnet de séances, `termes_cherches` local Dexie v7, 150/150 mutations, contrat §9/§14 + sync-protocol) → revue direction + passe navigateur main.
> Q4 revues : clinique pas encore mergeable (5 P1 : présupposition de perte de poids diabetes/achalasie, doublon metabolisches et uterus, NOTFALL sans « Vorbereitungen ») ; langue 9 importants. Décision main fréquences : cas non sourcés = valeur plancher (classés derniers) + badge masqué. → fixeur.
> S4-6 : passe navigateur main C6 63/63 ; revue direction à corriger (3 bloquants : 12 950 px à 390 pour 65 séances, ligne de semaine qui ment, « Rejouer » en double). Décisions main : 2 semaines + « Voir les N plus anciennes », filtre unique par spécialité (Teil et source retirés : à confirmer par Mehdi), « Revoir mes oublis » fait défiler jusqu'à la carte, étoile pour « Envoyer au drill ». → fixeur.
> S4-6 : fixeur `67159a3a` (pagination 2 semaines, ligne de semaine juste, « Rejouer » unique, oublis ciblés, ☆ drill, filtre spécialité, sondes 390 en CI) ; passe navigateur main 7 j **114/114** → **PR #86** → CI → merge. À confirmer par Mehdi : retrait des filtres Teil/source (FB3-D6).
> Q4 : fixeur `bbc60bb6` (P1 corrigés, garde anti-doublon étendue aux sondes de banque, réponses « vorbereitet », FREQUENCE_PLANCHER = 1 + badge masqué pour 72 cas, langue). Décisions main : polymyalgia (fatigue en akt-begleit, négatifs pour fach-rheuma-systemisch), I8 non appliqué accepté, metabolisches et leistenhernie acceptés, plafond parseur 40→48 accepté. → dernière retouche puis PR.
> **#88 MERGÉE** (CLI Supabase épinglé 2.117.0 en CI — fin des échecs « rate limit exceeded »). **#86 MERGÉE — S4-6 Historique.** Worktrees retirés ; disque 63 Go libres. Q4 (#87) : CI relancée.
> **#87 MERGÉE — Q4.** Lancés : **Q5 + Q8** (`doctopus-s3-q5-contenu` · `feat/s3-q5-contenu`, Opus : 49 composées restantes, constats de la garde anti-doublon, doublons préexistants, natures de motif tvt/sturz/gib/mamma/malaria) et **audit S4-7** de `feat/pruefungstag` (lecture seule, Opus) avant de décider reprise ou reconstruction.
> **S4-7 Examen** : audit de `feat/pruefungstag` (71 commits, 16 sept.) → repartir de main et porter ~450 lignes (horloge murale, durées sourcées, tirage, vues figées, garde statique) ; le reste double S4-3 ou contredit main (migration qui retirerait des types d'événements en prod, persistance hors journal, Bereitschaftsindex abandonné). Branche archivée sous le tag `archive/pruefungstag-2026-09-16`. 10 décisions produit prises par défaut par main (tirage par pathologie, vierge ×2 ; abandon = règle de main ; grilles obligatoires ; menu « Examen » ; tâche examen à blanc = cas du plan ; Bereitschaftsindex abandonné…) — **à confirmer par Mehdi**. Lancé : `doctopus-s4-7-examen` · `feat/s4-7-examen` (Opus).
> **Décisions de la direction sur S4-7 (6 oct.)** : (1) tirage pondéré par la fréquence ; les centres n'existent que dans l'app personnelle — en prod ils seront retirés (une série pour tous les Bundesländer) → fréquence tous centres par défaut, ventilation par centre isolée et retirable ; (3) **l'Aufklärung est incluse dans l'Examen** quand le cas en a une ; (5) le reste validé ; (7) simulant et (10) fréquence des examens : explications demandées. Agents Q5 et S4-7 relancés après une coupure réseau.
> Direction : décisions 7 (partenaire non enregistré) et 10 (aucune limite ni message) confirmées — toutes les décisions S4-7 sont arrêtées.
> Q5 + Q8 livré `61edf409` : composées d'`aktuell` 49 → 0 ; garde anti-doublon (questions du cas) 81 → 0 non admis ; banque 442 → 367 ; Q8 (sturz-im-alter « Anfall » renommé, gib, mammakarzinom, malaria voyage 19ᵉ → 5ᵉ, nature Veränderung, 13 `aktuellSkip`). Décisions main : tvt = saut entier de « Befund » (accepté, contrat §10.8) ; les 367 constats de banque (motif redemandé par la Fach) = futur lot de guide. → revues clinique + langue Opus.
> Q5 revues : clinique mergeable après 2 P1 (myokardinfarkt « Sonst nichts » contredit 3 répliques ; lyme doublon + ADMIS faux), langue 1 bloquant (sturz-im-alter cite encore « Anfall ») + 6 importants → fixeur.
> S4-7 livré `1442bd92` : Examen = `Lauf` ordinaire + `Lauf.examen`, `/examen`, menu « Examen », Aufklärung incluse (120/130, 5 min non sourcée), `checkExamen` en CI, sonde `examen390` ; mutations 180/180 (INV-20a rejouée par main). → revues méca + direction Opus.
> Q5 : fixeur `dacd81ea` (2 P1, bloquant langue, importants, P2, mineurs) ; dernière retouche malaria (moustiquaire seulement à sa question) puis PR.
> S4-7 revues : méca (I1 Aufklärung jamais jouée enregistrée comme faite) ; direction 2 bloquants (phrase du jury non accordée, « Seul » injouable). **Décision main : dans l'Examen, partenaire = simulant ou IA (l'IA joue le patient puis l'examinateur, diagnostic jamais montré) ; « Seul » retiré.** Minuterie 20:00 avec interruption du jury à 05:00, transition, écran de fin à une rangée d'actions, a11y. → fixeur. Hors lot : checklist OPQRST proposée pour un cas sans douleur (contenu).
> Q5 + Q8 : `abdf1932` → **PR #89** → CI → merge.
