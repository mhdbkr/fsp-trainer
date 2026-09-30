# C1 — Programme & historique (`s3-programme`)

> `lead-s3-programme` · branche `feat/s3-programme` (base `main` @ 4fad5b1) ·
> worktree `../doctopus-s3-programme` · 20 commits.
> Contrats : `docs/contracts/training-journal.md` (49 règles, INV-1..INV-12),
> ADR-0017 (journal source + plan figé), ADR-0020 (frise + champ de couverture).
> Audit source : `app/docs/reports/audit-programme-serie3.md`.

## Ce qui est livré

| Tranche | Contenu | Commits |
|---|---|---|
| T1 | `lib/clock.ts`, types + Dexie v5, `lib/journal.ts`, projections sync, 29 tests d'invariants | `647f6a6`..`324ecf7` |
| T2 | plan figé, moteur de sélection, progression par Teil, mode d'avancement, « pourquoi aujourd'hui » | `bb48dd9`..`13247a8` |
| T3 | page Historique, frise de trajectoire, champ de couverture, aperçu d'accueil | `08429cd`..`f89e45c` |
| T4 | `<TaskLabel>` — constat, rien à faire (voir §3) | — |
| T5 | les quatre preuves navigateur, rejouables | `da12fc9`, `f7a3d05` |
| — | `applySimulationToJournal()` + le gate qu'elle ouvre | `87bb8b9` |

---

## 1. Les quatre preuves navigateur

`app/scripts/e2e/programmeInvariants.mjs` — un script, pas une manipulation.
Il ARRANGE l'état par l'interface (remise à zéro de la progression, formulaire
de programme, clics), puis MESURE depuis l'app elle-même : le DOM rendu, et les
object stores IndexedDB que l'app a écrits, par l'API native. Aucune sonde ne
fait `import("/src/…")` — ce serait une seconde instance de module, qui
recalculerait sa propre réponse au lieu d'observer celle de l'app. Le verdict
est le **code de sortie**.

```
$ node scripts/e2e/programmeInvariants.mjs --port 5183 --no-server
État figé : 7 tâches, 119 min prévues.

PASS  P4  — deux spécialités identiques ne se suivent jamais dans un plan généré
            5 sélections, suite = Gastroenterologie → Pneumologie → Psychiatrie → Urologie → Orthopädie
PASS  P2  — la session du jour appartient au plan du jour
            accueil et programme lisent la même tâche : « Fachbegriffe »
PASS  P1  — cocher une tâche n'en fait pas apparaître une autre
            7 tâches / 119 min avant, pendant et après redémarrage ; faits 0 → 1
PASS  P1b — faire son drill ne libère aucun budget qui attirerait des simulations
            drill coché, 5 simulations avant et après, budget 119 min inchangé
PASS  P3a — travailler un seul Teil ne rend fautif aucun autre Teil
            Ambulant erworbene Pneumonie (CAP) (anamnese) : anamnese=vierge,
            dokumentation=vierge, fallvorstellung=vierge, overall=vierge
FAIL  P3b — une session réussie sur un seul Teil ne fait régresser aucun statut
            timeout: case_progress de case-depression (gate G-JOURNAL-SIM)

5/6 preuves passées.
EXIT=1
```

Ce que chaque preuve mesure exactement :

- **P1** lit la barre du jour telle qu'elle est écrite dans le DOM
  (`N/M fait · X min prévues`), coche une tâche, relit, puis **recharge l'app**
  — le seul endroit où `ensureDayPlan()` repasse. `M` et `X` sont identiques
  aux trois instants, et le multiensemble des sujets aussi.
- **P1b** est le cas frère, celui que l'audit §2.4 avait mesuré sans qu'on coche
  quoi que ce soit : le drill coché, l'app rechargée, le nombre de simulations
  du plan figé (lu dans `day_plans`) est le même, 5 → 5.
- **P2** compare le `<h2>` du hero d'accueil (sous le bandeau « Session du
  jour ») à la première ligne du programme sans bouton « Marquer faite », puis
  aux tâches de `day_plans` : trois lectures, une seule tâche.
- **P3a** coche une tâche portée par un seul Teil et lit le `case_progress`
  que l'app vient d'écrire : aucun Teil n'est `fragile`, les deux Teile jamais
  travaillés restent `vierge`. **L'absence n'accuse pas.**
- **P4** lit les tâches de `day_plans` dans l'ordre de sélection et vérifie
  qu'aucune paire consécutive ne partage sa spécialité, sauf si la tâche porte
  `diversityRelaxed: true` — le relâchement est tracé, pas silencieux.

### Pourquoi P3b échoue — et c'est le résultat, pas un raté

C'est la preuve qui a rapporté le plus : elle a trouvé un défaut que ni les
tests unitaires ni la lecture du code n'avaient vu.

---

## 2. Constats

### [BLOQUANT] G-JOURNAL-SIM — une simulation terminée n'alimente aucune projection locale

- **Où** : `app/src/lib/simulationSave.ts:58-61`, `app/src/lib/sync/queue.ts:100-103`
- **Constat** : `saveSimulation()` écrit `simulation.completed` dans
  `progress_events`, mais la dérivation §2.3 du journal n'est appliquée que par
  `rebuildProjections()`, appelée au seul endroit où un **pull distant** rapporte
  des événements frais. Hors ligne — ou simplement non connecté —
  `training_events` et `case_progress` ne bougent jamais. Champ de couverture
  vide, `detteTeil` figée à 1, indice de préparation aveugle à une simulation
  réellement jouée.
- **Preuve** (navigateur, état lu dans l'IndexedDB de l'app) : plan figé, run
  Anamnese réel sur `case-gib`, écran de bilan affichant
  `« Obere GI-Blutung bei Ulcus ventriculi · score moyen 81% »` et
  `« Cette partie ≥ 60 % … remet ton programme à jour »`.
  Lecture immédiate :
  ```
  progress_events : [program.configured, plan.materialized,
                     simulation.completed(case-gib), case.layer_reached(case-gib)]
  db.simulations  : [sim-1790789841763 (case-gib, scope=teil, teil=anamnese), …]
  training_events : []
  case_progress   : []
  ```
  Reproduit à chaque exécution du script (`P3b`, `timeout: case_progress de …`).
- **Correctif** : la moitié dans mon périmètre est livrée et testée —
  `applySimulationToJournal()` (`app/src/lib/journal.ts`, commit `87bb8b9`),
  dérivation strictement identique à `trainingEventFromSimulation()`, id
  déterministe, idempotente au rebuild (INV-10, testé). Il reste **une ligne**,
  hors de mon périmètre d'écriture :

  ```diff
  // app/src/lib/simulationSave.ts
  + import { applySimulationToJournal } from '@/lib/journal';
    ...
      await db.simulations.put(sim);
  +   await applySimulationToJournal(sim);
  ```

  Je ne l'ai pas écrite : `lib/simulationSave.ts` n'est pas dans mon périmètre
  (`lib/program*`, `srs*`, `readiness.ts`, `intensity.ts`, `layerAdvice.ts`,
  `simScope.ts`, `stats.ts`, `lib/journal.ts`, `lib/clock.ts`, `db/`,
  `features/{program,stats,home}/`, `features/simulation/pickSession.ts`, route
  Historique). **La branche ne doit pas fusionner sans ce gate.**

### [MAJEUR] G-TASKID-SIM — jouer la simulation d'une tâche ne coche pas la tâche

- **Où** : `app/src/lib/simulationSave.ts` (`SaveInput`),
  `app/src/features/simulation/SimulationRunner.tsx:193-200`
- **Constat** : le runner n'envoie pas de `taskId` à `saveSimulation()`. Le
  contrat §3.4 (« un exercice libre qui fait ce qui était prévu coche la tâche
  tout seul ») n'est honoré que par `logTraining()`.
- **Preuve** (navigateur) : après le run réel d'Anamnese sur `case-gib` —
  qui EST la deuxième tâche du plan du jour — la ligne
  « Obere GI-Blutung bei Ulcus ventriculi » du programme porte toujours son
  bouton « ✓ Fait » (`done: "todo"` dans la lecture du DOM), et la barre reste
  `0/7 fait`.
- **Correctif** : `SaveInput` gagne `taskId?: string`, le runner le passe depuis
  la tâche d'origine. **La résolution par le contenu ne peut PAS être faite dans
  la dérivation** : `projectTrainingEvents()` s'exécute AVANT `projectDayPlans()`
  au rebuild, donc un `taskId` deviné à la dérivation ne serait pas rejouable et
  la tâche se décocherait à la reconstruction. Elle doit être résolue à
  l'écriture, comme `logTraining()` le fait déjà. Hors périmètre.

### [MINEUR] P2 s'est mesurée sur la tâche de drill

- **Où** : `scripts/e2e/programmeInvariants.mjs`, preuve P2
- **Constat** : la première tâche non faite du plan est le drill
  (`buildTasks` le pousse en premier), donc P2 a comparé
  « Fachbegriffe » à « Fachbegriffe ». L'égalité est vraie mais le cas le plus
  intéressant — une simulation — n'est pas celui qui a été mesuré.
- **Preuve** : `accueil et programme lisent la même tâche : « Fachbegriffe »`.
- **Correctif** : faire tourner P2 une seconde fois après avoir coché le drill,
  pour que la tâche comparée soit une simulation. Non fait : chaque appel
  `playwright-cli` coûte 5 à 20 s et l'invariant mesuré est le même code
  (`sessionDuJour()` = première tâche sans `doneAt`, un seul appelant pour les
  deux écrans).

---

## 3. `<TaskLabel>` — constat, rien à faire

Le brief demandait de cesser de concaténer dans `lib/program.ts`
(`:167,218,252,268,278,286`) et de supprimer le doublon de
`ProgramPage.tsx:368,:369`. **Ces lignes n'existent plus** :

- `app/src/lib/program.ts` a été supprimé (T2) et remplacé par
  `app/src/lib/program/` (`dayPlan.ts`, `select.ts`, `modus.ts`, `coverage.ts`,
  `trajectory.ts`, `index.ts`). Les quatre seules occurrences de `label` dans
  `dayPlan.ts` (`:137,150,184,197`) posent un **nom de sujet nu** :
  `'Fachbegriffe'`, `best.c.name`, `scored.c.name`, `…!.pathology`.
- `ProgramPage.tsx:368-369` est aujourd'hui la vue Mois du calendrier ; la ligne
  de tâche a migré dans `features/program/TaskLine.tsx`.
- `TaskAnatomy` (`TaskLine.tsx:55-68`) rend le sujet, la portée (le Teil seul,
  absent sur un run complet), l'état et le coût dans des **champs séparés** :
  aucune concaténation, et la vue ne les ré-affiche pas à côté.

Le composant `<TaskLabel>` de C5 (`feat/s3-primitives`) n'est **pas dupliqué**.
`TaskLine.tsx:1-18` porte le point de raccord et les **trois changements de
contrat** demandés à C5 : accepter `TaskInstance` (et non `ProgramBlock`,
remplacé par ADR-0017) ; ajouter la clé `'examen-blanc'` à `TASK_GLYPH`
(`TaskKind` a six valeurs, `ProgramBlockKind` en avait cinq) ; faire de
`TaskInstance.label` l'identité du sujet, ce qui rend la cale `taskSubject()`
inutile. Au merge, `TaskAnatomy` devient `<TaskLabel task={task} />`, une ligne.

---

## 4. Vérification mécanique — codes de sortie

| Commande | Résultat | Code |
|---|---|---|
| `npx tsc -b --noEmit` | — | **0** |
| `npx vitest run --dir src` | 90 fichiers, **628 tests passés**, 0 échec, 23,53 s | **0** |
| `npm run build` | `✓ built in 11.88s` | **0** |
| `node scripts/e2e/programmeInvariants.mjs` | 5/6 — seul P3b (gate G-JOURNAL-SIM) échoue | **1** |

**Je n'ai rien cassé, et rien n'était cassé.** Une première exécution de la
suite, faite pendant que Docker, vite et deux navigateurs headless se
disputaient les 8 Go de la machine, avait rendu `1` avec 19 fichiers et 32 tests
en échec en **931 s** — durées relevées sur ces fichiers : 26 896 ms, 28 361 ms,
30 077 ms, 41 151 ms, 48 179 ms, 52 020 ms, soit 5 à 10 fois le seuil de
5 000 ms. Aucun de ces fichiers n'appartient à mon périmètre
(`components/AccountSwitcher`, `NewCardSheet`, `StarButton`,
`SelectionExplainer`, `features/fachbegriffe/*`, `lib/collections/*`, …).
La même suite, RAM libérée, passe **intégralement en 23,53 s** : ces 32 échecs
étaient des timeouts de charge, pas des régressions. C'est la mesure à retenir,
et elle dit qu'il n'y avait pas de dette de base à distinguer de la mienne.

`src/lib/journal.test.ts` seul : **31 tests passés, 3,80 s** (les 29 invariants
+ les 2 tests de `applySimulationToJournal`).

Les validateurs de contenu de la CI (`checkProbeCoverage`, `checkMusterCoverage`,
`checkCaseCoherence`, `checkGuideCoverage`, …) portent sur `src/data/**` ;
cette branche ne touche aucun fichier de contenu (`git diff --stat 4fad5b1..HEAD`
→ 40 fichiers, tous sous `src/{lib,features,db,components}` plus `main.tsx` et
`scripts/e2e/`).

---

## 5. Périmètre — deux extensions à déclarer

La branche écrit dans trois fichiers qui ne sont pas nommés dans le périmètre :

- `app/src/lib/sync/events.ts` (+10) et `app/src/lib/sync/projections.ts` (+5) —
  l'enregistrement des trois types d'événements du contrat (`training.logged`,
  `plan.materialized`, `plan.replanned`) et le branchement de `rebuildJournal()`.
  Sans eux le contrat `training-journal.md` §2 n'a aucun porteur.
- `app/src/lib/collections/drillContext.ts` (+26/−26) — le contexte du jour
  lisait le plan par un second calcul ; il lit maintenant le plan figé.
  C'était la deuxième source de la discordance que l'audit nomme.
- `app/src/main.tsx` (+7) — `ensureDayPlan()` au démarrage, **une fois**, jamais
  par un composant (contrat §3.2), et la route `/historique`.

Commits antérieurs à ma reprise ; je les signale plutôt que de les taire.

---

## 6. Ce que je n'ai pas pu faire

- **La revue de branche `quality-branch-reviewer` (Opus), le fixeur, la
  re-revue.** Aucun outil de dispatch d'agent n'est disponible dans ce runtime
  (`ToolSearch` désactivé, pas d'outil `Agent`/`Task`). Je suis l'implémenteur :
  je ne signe pas ma propre revue. **Gate ouvert pour `main`.**

## Non vérifié

- **P3b en vert.** L'invariant « un statut ne régresse pas après une session
  réussie » n'est vérifié aujourd'hui que par le test unitaire
  (`lib/journal.test.ts`, « applySimulationToJournal : … un seul Teil mesuré ne
  touche que lui » et « INV-10 : appliquer puis reconstruire … »). La preuve
  navigateur existe, elle est écrite, et elle passera dès que G-JOURNAL-SIM sera
  fermé. Je ne l'ai pas simulée en vert.
- **La diversité sur un corpus adverse.** P4 mesure le corpus réellement publié
  (12 cas, 8 spécialités) : aucune paire adjacente ne partage sa spécialité, et
  aucun `diversityRelaxed` n'a été nécessaire. Le chemin de relâchement
  (`relax: 'C2'` puis `'C1'`) n'est donc **pas** exercé par le navigateur ; il
  l'est par `lib/program/select.test.ts`.
- **Les modes `cas-complet`, `specialite` et `examen-blanc` au navigateur.**
  P4 ne vaut que pour `teil-first`, le seul mode où la diversité est une
  contrainte dure (`select.ts:127`, `enforceDiversity = modus === 'teil-first'`).
  Le script le vérifie et refuse de conclure autrement.
- **Un second appareil, la synchro et le rejeu distant.** `projectDayPlans()`
  porte l'exception au dernier-gagne (INV-7 : sur `plan.materialized`, le plus
  ANCIEN gagne) et elle est testée unitairement, jamais avec deux navigateurs.
- **La suite `vitest` au commit de base, RAM libérée.** Je n'ai pas rejoué la
  mesure de base dans de bonnes conditions : je constate seulement qu'après mes
  changements tout passe. La conclusion « rien n'était cassé » se lit donc sur
  l'état final, pas sur une comparaison propre de deux états.

## Environnement

Le Supabase local est tombé en cours de session : le worker edge atteignait sa
limite CPU en servant `functions/v1/content` (1,4 Mo), se retirait, puis
répondait `name resolution failed` après redémarrage ; `supabase stop` puis
`start` ont échoué au health check. Rétabli en libérant la RAM (navigateurs
headless et serveur vite tués) puis en redémarrant le seul conteneur
`supabase_edge_runtime_app`. **Aucun `db reset` n'a été tenté** — la base porte
du contenu publié. `main` est désormais propriétaire de cette stack.

Le correctif `cacheDir: '.vite-cache'` de `main` (`d74c2ae`) est cherry-pické
dans la branche (`b01153f`) : `node_modules` est un lien partagé entre les
worktrees, donc `node_modules/.vite` l'était aussi. Le script vérifie
maintenant qu'un serveur qui répond 200 sert bien CE worktree, en demandant
`src/lib/journal.ts` et en y cherchant un symbole propre à la branche.
