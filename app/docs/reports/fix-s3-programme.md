# Fixeur `feat/s3-programme` — rapport

> `fix-s3-programme` · worktree `../doctopus-s3-programme` · base revue `6a63c78` → HEAD `04619c9` (88 commits).
> Liste traitée : `app/docs/reports/revue-s3-programme.md` (committée `0d500b4`).
> Règle suivie : test rouge d'abord (sur le chemin que l'app emprunte), puis vert ; commit fichier par fichier.
> **Statut : DONE_WITH_CONCERNS** — voir « Non vérifié » et « Constats hors liste ».

## 0. Verdict mécanique (codes de sortie, HEAD `04619c9`)

| Commande | Code | Détail |
|---|---|---|
| `npx tsc -b --noEmit` | **0** | |
| `npx vitest run --dir src --maxWorkers=2` | **0** | 104 fichiers, 684/684, 80 s |
| `npx vitest run --dir src` (parallélisme par défaut) | 1 | 683/684 : `components/SelectionExplainer.test.tsx` « Créer → carte + deck » — course préexistante du test (lit `favorites` juste après `personal_terms`), fichier hors de mes changements, **5/5 vert seul**. Sous pression mémoire (8 Go, ~60 Mo libres) d'autres tests Fachbegriffe ont aussi dépassé leurs délais ; tous verts en série (54/54). |
| `node scripts/e2e/programmeInvariants.mjs --port 5183` | **0** | **6/6** (sortie ci-dessous) |
| `npx vitest run supabase/tests/events.test.ts` (fonction servie en local depuis ce worktree, migration 17 appliquée par psql) | **0** | 15/15 |

```
État figé : 7 tâches, 119 min prévues.
PASS  P4  — 5 sélections, Gastroenterologie → Pneumologie → Psychiatrie → Urologie → Orthopädie
PASS  P1b — drill coché, 5 simulations avant et après, budget 119 min inchangé
PASS  P2  — accueil et programme lisent la même tâche, une simulation : « Obere GI-Blutung bei Ulcus ventriculi » (case-gib, anamnese)
PASS  P1  — 7 tâches / 119 min avant, pendant et après redémarrage ; faits 1 → 2
PASS  P3a — Ambulant erworbene Pneumonie (CAP) (anamnese) joué → … ; anamnese=solide, dokumentation=vierge, fallvorstellung=vierge, overall=entame
PASS  P3b — case-pneumonie : anamnese=solide, dokumentation=vierge, fallvorstellung=vierge ; carte « Entamé » ; overall=entame
6/6 preuves passées.
```

Le serveur servait CE worktree : l'arrangement fige la journée **sans rechargement** après création du programme (I1), ce que le code de `6a63c78` ne fait pas. P2 est mesurée sur une **simulation** (P1b coche le drill avant), P3a sur un **Teil réellement joué** (≥ 1 mesure). P3a/P3b rechargent l'app après la simulation : tant que R-C2 n'est pas intégré, c'est la reconstruction du démarrage (B-C1) qui projette la simulation.

## 1. Items → commits, rouge → vert

| Item | Rouge (preuve) | Vert | Commits |
|---|---|---|---|
| **S-C1** serveur | `events.test.ts` 5/15 : lot mixte en 400, types refusés par la contrainte | 15/15 | `4cc4790` migration · `2d448b5` fonction · `f70f1b0` tests |
| **S-C1** client | `queue.test.ts` 5/16 : 400 de lot vidait l'outbox, 401/429 aussi, `retry` ignoré, orpheline jamais retirée | 16/16 | `c2b1312` · `70cdcf9` |
| S-C1 contrat (l. 447-448) | — | — | `eb3c714` |
| **B-C1** | `boot.test.ts` contre la séquence de `main.tsx:138` : `training_events = []`, plan qui ne reprend pas celui de B, plan reconstruit ≠ plan rendu | 5/5 (+10 000 événements en 421 ms, fake-indexeddb) | `3fe6a2e` · `123acce` · `cb6c8e6` · `e47b2d9` |
| B-C1 (écriture) | `logTraining` rendait avant que l'événement soit dans `progress_events` → effacé au rebuild | vert | `4998e32` · `fbc2c6a` |
| **D-I2** (pull borné + report du « fait ») | sonde P-E reproduite : plan de A gagne, faits 1 → 0 | vert | `3fe6a2e` `123acce` (pull) · `7a5176f` `e01f07c` (report) |
| **S-I1** | score d'un `training.logged` projeté tel quel | ignoré, payload assaini | `7a5176f` `df14dbd` `e01f07c` |
| **S-M1** | `teile: ['__proto__']`, `teile: null`, payload `null` | filtrés, rebuild intact | `7a5176f` `e01f07c` |
| **S-I2 = B-I8** | `stats.mesure.test.ts` 3/3 rouges | vert | `809a9c8` · `2c989ba` |
| **S-M2** | **non reproduit**, y compris sur `6a63c78` : le payload `plan.replanned` porte `doneAt/spentMin/eventId` des tâches conservées. Test gardé comme garde. | — | `8fc377b` |
| **B-C3** | `MarkWorked.test.tsx` sur les vraies pages : aucun bouton, aucun événement | « Fiche lue » / « Aufklärung travaillée » → un `training.logged`, temps mesuré depuis l'ouverture ; la fiche coche la tâche Fachwissen du cas | `28909d9` `ed0bdb4` `0262ebc` `ce6bd6b` `d796da3` ; copie Historique `fc1ef2b` |
| fraîcheur (trouvé en B-C3) | une fiche lue repoussait le cas dans la sélection | « dernier jeu » = dernier Teil joué | `12a8eee` · `3bb8fd9` |
| **B-C5** | `CaseProgress.test.tsx` : « Maîtrisé » affiché | pages Cas sur `case_progress` (« Entamé », pastilles par Teil, filtre/tri progression) ; commentaire `simScope` corrigé | `3871338` `31eb32f` `0d1da09` `5104580` `7a3e585` |
| **D-C4** | 7 rouges (`journal.write.test.ts`) | API livrée (§2), coche nue absorbée par l'exercice réel | `7a5176f` · `e01f07c` |
| **I1** | `watchDayPlan` absent ; « Recharge l'app » | visibilitychange + minuit local + création de programme | `a1e3701` `1e882e1` `aaea75a` `405a6a7` `e106090` |
| **I3** | 160 min pour 120 (sonde P-B) | budget restant = cible − Σ estMin faits | `8fc377b` · `07f4de4` |
| **I4** | 14 violations INV-4 (examen à blanc, Fachwissen) | amorçage des spécialités, Fachwissen sous C1/C2 | `8fc377b` · `a3bcd27` · `07f4de4` |
| **D-I5** | Teil fragile forcé en `cas-complet` | le mode prime | `8fc377b` · `07f4de4` |
| **I6** | `projectedDays` absent, calendrier vide | projection non figée, en pointillé, jamais cochable | `c33f065` `e4c3653` `e72bb66` `193ffd9` |
| **D-I7** | module absent | proposé, jamais imposé (§4) | `43cba90` `02324a3` `930fb10` `d7ec2a3` |
| replanifier (trouvé en D-I7) | `replannedAt` reconstruit ≠ rendu | événement d'abord, horodaté au geste | `5a0a8e3` · `aa5a105` |
| **D-I9** | jauge et frise coexistent | la frise est le seul indice ; `computeReadiness`/`weightedAxisScores`/`ReadinessGauge` retirés | `b5516f3` `9b688a0` `3e42d7e` `3f2fbd9` |
| **I10** | `J-61` lu sur l'horloge réelle au lieu de `J-11` ; défauts SRS/stats sur `Date.now()` | tout via `lib/clock` ; J-x = `joursRestants()` | `09baac8` `5a73d50` `4a35b55` `6e65182` `60d2780` `7eb4d3f` `ec22509` `2c76d8f` |
| **I11** | `TZ=Europe/Berlin` : 25 oct. en double ; un point au **lendemain** | jour calendaire ; départ la veille du premier événement | `a464b26` · `489ed9f` |
| **I12** | double clic = 2 événements ; coche de la veille après minuit non appliquée localement | `markTaskDone` idempotent ; coche au plan qui porte la tâche ; local = rebuild | `7a5176f` · `e01f07c` |
| **M1** | table `plan` présente | `plan: null` en v5, `PlanEntry`/`usePlan`/seed retirés, `plan.done` hors du type client (accepté serveur) | `d853dbd` … `f625632` |
| **M2** | ids aléatoires, graine non rejouable | graine `date:mode:n:instant`, ids dérivés de la graine | `674d294` · `084859d` |
| **M3** | 60 min sur un jour de 45 | dans le budget | `8fc377b` · `07f4de4` |
| **M4** | coche sans score : `attempts 1 / vierge` ; `observeModus` vote sur les coches | seules les mesures comptent (`vierge ⇔ attempts 0`) | `84d84d2` `bca4850` `c25113c` `7e3b8b8` |
| **M6** | — (suppression, tsc) | | `5902105` |
| **M7** | plan du 1er créé après le 2 | jamais antérieur au dernier figé | `a1e3701` · `456af03` |
| **M8** | — | prélude = base du compte actif (`fsp-cockpit[-<uid>]`) | `04619c9` |
| **M9** | `NAV` sans `/historique` | entrée après Programme | `d48530d` · `f50c577` |
| S-M3 | **à écrire, pas à corriger** : la série (`workedDayKeys`) compte un jour où l'on a seulement coché une tâche à 0 min. Ne pas la réutiliser pour une ligue ou un classement. | | — |

## 2. API livrée pour l'intégration (R-*) — appels exacts

Toutes dans `app/src/lib/journal.ts`, testées (`journal.write.test.ts`, `journal.test.ts`).

**R-C2 + D-C4 + R-C4 + R-C5-écriture — `app/src/lib/simulationSave.ts` :**

```ts
import { applySimulationToJournal, resolveSimulationTask } from '@/lib/journal';

export interface SaveInput { /* … */ taskId?: string }          // R-C4 : posé par le runner

export async function saveSimulation(i: SaveInput): Promise<Simulation> {
  const parts = { ...i.parts };
  // D-C4 : la tâche est résolue AVANT l'écriture — persistée dans simulation.completed.
  // Un taskId explicite (R-C4, lancé depuis le plan) n'est jamais remplacé.
  const sim = await resolveSimulationTask({
    id: `sim-${Date.now()}`, caseId: i.c.id, date: Date.now(), parts, /* … champs inchangés … */
    ...(i.taskId ? { taskId: i.taskId } : {}),
  });
  await db.simulations.put(sim);
  // AWAIT (et non .catch flottant) : le journal se reconstruit à chaque démarrage
  // depuis progress_events (B-C1) ; un événement non écrit serait effacé.
  await syncQueue.push({ type: 'simulation.completed', subject_id: i.c.id, payload: sim }).catch((e) => console.warn('[sync]', e));
  await applySimulationToJournal(sim);                           // R-C2 : projection locale immédiate
  // R-C5-écriture : SUPPRIMER le bloc caseMastery → db.cases.update(confidence/status/lastSimulationId/layerProgress).
  // case.layer_reached peut rester poussé s'il a encore un lecteur.
  return sim;
}
```

- **R-C4 (runner)** : passer `taskId` à `saveSimulation`. Source proposée : `taskLink()` (`features/program/TaskLine.tsx`) ajoute `&task=<task.id>` à l'URL de simulation, le runner le lit dans la query. Sans R-C4, `resolveSimulationTask` coche quand même la tâche du jour par le contenu (même `caseId`, Teil compatible).
- **R-C3-drill** : en fin de séance de drill,
  ```ts
  await logTraining({ kind: 'drill', spentMin: minutesMesurées /* jamais estMin */, ...(caseId ? { caseId } : {}) });
  ```
  La tâche drill du jour est cochée automatiquement (une tâche drill sans `caseId` accepte toute séance de drill). Puis rétablir « et drill » dans `HistoriquePage.tsx` (`fc1ef2b` l'a retiré parce que c'était faux).
- **Coche manuelle puis jeu** : un seul exercice dans le journal — la coche nue (`isCocheNue` : `taskId`, 0 min, ni score ni run) est absorbée par l'exercice réel qui satisfait la même tâche, en local comme au rebuild. La source (`progress_events`) reste append-only.

## 3. Amendements de contrat à appliquer par `main`

**D-I2 — `training-journal.md` §3.2 et §2.2 (décision de main, implémentée) :**
> Au démarrage, avant `ensureDayPlan`, l'app fait un **pull borné** (2,5 s, `BOOT_PULL_MS`) puis reconstruit le journal ; hors ligne ou serveur muet, elle matérialise quand même. Le jour se rouvre aussi au retour au premier plan et à minuit local (`watchDayPlan`). `ensureDayPlan` ne re-matérialise jamais un jour dont un `plan.materialized` est déjà dans le journal local, ni un jour antérieur au dernier jour figé.
> Au rebuild, quand le plan d'un autre appareil gagne (premier `occurred_at`), un `TrainingEvent` dont le `taskId` désigne une tâche du plan perdant **coche la première tâche non faite du plan gagnant de même `(kind, caseId, teil)`**. Sans tâche équivalente, rien n'est coché ; l'exercice reste dans l'historique.

Autres amendements à acter (écarts assumés au contrat, tous testés) :
1. **`sync-protocol.md` — Push** : « 4xx (lot) : tout le lot rejeté » devient : *seul un refus PAR ÉVÉNEMENT sans `retry` retire une ligne ; tout refus de lot (400/401/429/5xx/réseau) garde le lot avec backoff ; un 400 sur un lot de plusieurs lignes est isolé ligne par ligne ; `rejected[].retry: true` (type inconnu, contrainte non migrée) garde la ligne ; les lignes jamais retentées partent d'abord.* Réponse serveur : `rejected: { id, reason, retry? }[]` ; un corps malformé reste un 400.
2. **§2.2 payloads** : schéma strict serveur de `training.logged` (pas de clé inconnue ; `scores` accepté mais **jamais projeté**, S-I1) ; `plan.*` : sujet `yyyy-MM-dd`, `tasks ≤ 50` ; `plan.materialized` porte `targetMin` ; `plan.replanned.reason` ∈ {`manuel`, `rattrapage`} (≤ 40 car.).
3. **§3.1** : `TaskInstance.id` n'est plus un uuid pour un plan matérialisé : `t-<fnv1a32(seed)>-<n>`, la graine valant `date:mode:nbÉvénements:instant` (M2). Les tâches de `replanifier`/rattrapage gardent un uuid.
4. **§3.4** : la satisfaction s'étend à tous les genres (fiche ↔ fachwissen même cas, drill ↔ drill, aufklaerung, examen-blanc) ; une coche nue est absorbable (D-C4).
5. **§4.1** : `attempts`, `lastScore`, `lastAt` ne comptent que les Teile **scorés** (M4) — `vierge ⇔ attempts = 0 ⇔ lastScore = null`. Conséquence affichée : une tâche cochée sans jeu laisse le Teil « pas encore travaillé » dans le champ de couverture. **Décision de direction à prendre** si ce libellé doit devenir « pas encore mesuré ».
6. **Q4 tranchée (D-I7)** : rattrapage = tâches non faites du **dernier jour figé** avant aujourd'hui (hors drill, hors cas déjà au programme), proposé par une carte ; accepter écrit `plan.replanned` (`rattrapage`), refuser se retient pour ce jour.
7. **D-I9** : l'indice de préparation unique est `indiceAt` (frise, ADR-0020).

## 4. Procédure de déploiement production (Supabase EU `hwpwoblpygvxwbztconc`) — NON exécutée

Ordre impératif : **migration → fonction → client**. Accord de la direction requis (ADR-0015, `main` en production).

1. **Pré-vérification (lecture seule)** :
   `select type, count(*) from public.progress_events group by type order by 1;` — chaque type doit figurer dans la liste de `20260930000017`. (La table est petite ; l'`ADD CONSTRAINT` la parcourt sous verrou exclusif bref.)
2. **Migration** : depuis `app/` lié au projet EU, `npx supabase db push` (applique `20260930000017_training_journal_events.sql` seule — la 16 est déjà en EU). Vérifier :
   `select pg_get_constraintdef(oid) from pg_constraint where conname = 'progress_events_type_check';` contient `training.logged`, `plan.materialized`, `plan.replanned`, `plan.done`.
3. **Fonction** : `npx supabase functions deploy events --project-ref hwpwoblpygvxwbztconc` (sans `--no-verify-jwt` : la config fait foi).
4. **Fumée** (compte de test, jamais Mehdi/Lydia) : POST `[srs.reviewed valide, plan.materialized valide]` → 200, `acked` = les deux ; POST `[valide, type 'hack']` → 200, `rejected[0].retry === true`, le valide en base.
5. **Client** : seulement ensuite, fusion et publication Pages.
6. **Premier démarrage de Mehdi et Lydia** : `bootJournal` reconstruit leur historique depuis `progress_events` (B-C1). À vérifier sur leur appareil : Historique non vide, Stats renseignées, aucun cas déjà solide reproposé.

Retour arrière : redéployer la version précédente de `events` ; la contrainte élargie peut rester (sur-ensemble, inoffensive). Si le client part avant le serveur par erreur : plus de perte — la file garde les événements refusés et les renvoie après le déploiement du serveur (`queue.test.ts`, « 400 de lot »).

## 5. Non vérifié

- **Deux appareils en navigateur** (deux contextes) : D-I2 n'est prouvé qu'en tests unitaires (fetch simulé, rebuild). Pas de mesure avec deux contextes playwright réels — RAM 8 Go, un seul navigateur à la fois.
- Chemin `retry` sur violation de **contrainte DB** (fonction déployée avant la migration) : codé (`progress_events_type_check` dans le message), non exercé.
- 10 000 événements mesurés sur fake-indexeddb (421 ms), pas sur un IndexedDB de navigateur réel.
- Production : rien déployé.
- R-C2/R-C3-drill/R-C4/R-C5-écriture : non intégrés (hors périmètre) ; l'e2e P3 dépend du redémarrage tant que R-C2 manque.

## 6. Constats hors liste

- `setModus` / `setIntensity` (`lib/programAdjust.ts`) écrivent `meta.program` sans pousser `program.configured` : un changement de mode ou d'intensité n'est pas synchronisé. Et `rebuildProjections` ne projette pas `program.configured` vers `meta.program` : un second appareil sans configuration locale ne matérialise rien.
- `ReadinessGauge.tsx` a été supprimé dans le commit du test `b5516f3` (le `git rm` était déjà indexé) — sans effet, à savoir pour la relecture.
- `components/nav.ts` est hors du périmètre élargi listé ; touché pour M9 (« à corriger » dans la liste) parce qu'aucun autre chantier ne le modifie (`git diff main...feat/s3-*` : seul `Sidebar.tsx` l'est, par primitives).
- Le conteneur `supabase_edge_runtime_app` ne tournait pas à mon arrivée ; je l'ai servi depuis ce worktree le temps des tests puis arrêté. Le reste de la pile n'a pas été touché ; aucun `db reset`.

---

## Re-revue (`39a8b19` → `20b17df`) — correctifs demandés par `main`

Migration `20260930000017` et fonction `events` **non modifiées** (déploiement prod en cours par `main`).

### Codes de sortie (HEAD `20b17df`)

| Commande | Code | Détail |
|---|---|---|
| `npx tsc -b --noEmit` | **0** | |
| `npx vitest run --dir src --maxWorkers=2` | **0** | 108 fichiers, 698/698 |
| `TZ=Europe/Berlin npx vitest run --maxWorkers=2 src/lib/program src/lib/sync/boot.test.ts src/lib/journal.test.ts src/lib/journal.write.test.ts src/features/program` | **0** | 15 fichiers, 139/139 |
| `node scripts/e2e/programmeInvariants.mjs --port 5183` | **0** | **6/6** (P2 sur une simulation, P3a sur un Teil joué) |

### Items

| Item | Rouge (preuve) | Correctif | Commits |
|---|---|---|---|
| **I-2** rebuild concurrent | `rebuildRace.test.ts`, par `rebuildProjections` (le chemin du pull) : un `logTraining` et un `ensureDayPlan` lancés pendant la reconstruction sont absents des projections — 2/2, reproductible | `rebuildJournal` relit `progress_events` **dans** sa transaction `rw` (portée : `progress_events` + les trois projections) ; les appelants de l'app ne passent plus d'instantané ; contournement de `ensureDayPlan` retiré | `0211d71` `e593b89` `5339893` `39bba1e` |
| **I-1** l'écran change de jour | `Today.test.tsx` (**rendu DOM**) : 23 h → 1 h + `visibilitychange`, plan du 2 en base, l'accueil affiche « jeudi 1 octobre » et la tâche de la veille en « Session du jour » ; le Programme reste sur la veille | `lib/today.ts` (`useToday`, `refreshToday`) ; `watchDayPlan` rafraîchit **après** la matérialisation ; `useDayPlan`, `HomePage` (date d'en-tête comprise), `ProgramPage` (le jour choisi suit s'il valait l'ancien aujourd'hui) | `e780d68` `62c369d` `de3fd46` `89b96cc` `d854a83` `8d0ae6e` `c8d34d7` |
| **I-3** une tâche faite n'est jamais perdue | deux appareils, plan de A gagnant sans équivalent : la tâche faite sur B disparaissait (faits 1 → 0) | ajoutée au plan gagnant avec son `doneAt`, sans doublon si plusieurs exercices | `b9b2c29` `ea9b573` |
| **I-4** « faite — non mesurée » | 4/4 rouges : projection, `markTaskDone` sans `teil`, carte de la page Cas, compteur du champ | `TeilProgress.nonMesureAt` posé par `computeCaseProgress` pour une coche et une séance `selbstbewertet` — `status`, `attempts`, `lastScore`, l'indice et la série inchangés ; `estNonMesure()` ; 4e compteur `nonMesure` (`coverage.ts`), titre et légende (`CoverageField`), badge « Faite — non mesurée » et pastille en pointillé (`CaseProgressView`), compte d'en-tête (`CasesPage`) ; `markTaskDone` écrit les trois Teile pour une tâche simulation / révision / examen à blanc sans `teil` | `24c81ae` `26fb8ab` `2fd4b70` `3284770` `9e451ea` `b3a4909` `edcf2f9` `0759a3c` |
| **D-C4 révisé** le mode prime | une Anamnese seule cochait une tâche « cas complet » | coche seulement si les trois Teile sont joués dans la partie **ou le même jour** (coches exclues) — `resolveSimulationTask` comme la résolution par le contenu, **taskId explicite compris** ; une partie seule progresse et entre dans l'historique | `95dd3b6` `5e42042` `c322817` |
| **M-a** drill | 120 min sur un jour de 45 | `estMin` borné à `targetMin` | `7de8cd6` `9c606d8` |
| **M-b** refus du rattrapage | — | **non fait** : le pousser demande un nouveau type d'événement, donc la contrainte et la fonction `events` gelées pour le déploiement. Le refus reste local (`meta.rattrapageRefuse`) : un second appareil peut reproposer un rattrapage déjà refusé. À faire avec la prochaine migration de types. | — |
| **M-c** double lecture | — (refactor, couvert par 51 tests du journal) | une lecture | `b32d5f2` |
| **m5** sécurité | `pullGuard.test.ts` : session de B dans le tab de A → fetch appelé, événement de B inséré | `if (!sessionMatchesActive()) return 0;` | `c99a79a` `20b17df` |

### Conséquences sur les tests existants (assumées, liées aux décisions)

- INV-11 compare désormais les **mesures** (`status`, `lastScore`, `lastAt`, `attempts`) et vérifie que `nonMesureAt` est la seule trace d'une séance auto-déclarée (`3284770`).
- `journal.test.ts` : « une tâche sans `teil` est satisfaite par n'importe quel Teil » est renversé par D-C4 révisé (`5e42042`).
- Les tests de page qui figent l'horloge appellent `refreshToday()` (le store est initialisé à l'import) (`c8d34d7`).

### Amendements de contrat (en plus du §3)

- §3.4 / D-C4 : une tâche simulation / révision / examen à blanc **sans `teil`** n'est satisfaite que par les trois Teile joués, dans la partie ou le même jour — y compris avec un `taskId` explicite.
- §4.1 : `TeilProgress.nonMesureAt?: number` — « faite — non mesurée » ⇔ `status === 'vierge'` et `nonMesureAt` posé. Remplace la question ouverte du §3 point 5.
- D-I2 (texte du §3) : « sans tâche équivalente, rien n'est coché » devient « sans équivalent, la tâche faite est **ajoutée** au plan gagnant ».

### Non vérifié (re-revue)

- I-1 au navigateur réel (le test est un rendu DOM jsdom avec horloge injectée ; l'e2e ne franchit pas minuit).
- Deux appareils en navigateur réel pour I-3 (tests unitaires seulement, comme D-I2).
