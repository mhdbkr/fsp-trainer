# Revue indépendante de `feat/s3-programme` — liste unique pour le fixeur

> Deux revues lancées par `main` : branche (Opus) et sécurité (Opus).
> **Verdict commun : Request changes.** HEAD revu : `6a63c78`.
> Les sondes des relecteurs ont tourné sur des copies ; le worktree est intact.

## Découpage décidé par `main`

Plusieurs correctifs touchent des fichiers d'autres chantiers encore en cours de
correction. Pour tenir « un seul writer », `main` découpe :

**À TOI (fixeur programme)** — périmètre ÉLARGI : en plus du tien, `app/supabase/`
(migration + fonction `events`), `app/src/lib/sync/`, `app/src/features/cases/`,
`app/src/features/fachwissen/`, `app/src/features/aufklaerung/`, `app/src/main.tsx`.
Aucun autre chantier n'y écrit.

**À L'INTÉGRATION (`main`, après les merges)** — ne les fais PAS, mais livre
l'API nécessaire, testée, et documente son usage exact dans ton rapport :
- **R-C2** : `saveSimulation` appelle `applySimulationToJournal(sim)` (fichier du chantier simulation).
- **R-C3-drill** : le drill appelle `logTraining` (fichier du chantier primitives).
- **R-C4** : le runner pose `sim.taskId` (chantier simulation).
- **R-C5-écriture** : `saveSimulation` cesse d'écrire `Case.status`/`confidence`/`layerProgress` (chantier simulation).

## Décisions de `main`

- **D-I2 (second appareil)** — amendement de contrat accepté : **pull borné avant
  `ensureDayPlan`** au démarrage (délai court ; hors ligne on matérialise quand même),
  et au rebuild, **report de l'état « fait » par `(kind, caseId, teil)`** quand un plan
  d'un autre appareil gagne. Documente l'amendement dans ton rapport ; `main` l'applique
  au contrat.
- **D-I5 (modes)** — le mode choisi par le candidat **prime** : en `cas-complet`, un Teil
  fragile ne force jamais un `teil`. C'est le point 4.1 de la direction (le programme
  s'adapte à l'approche du candidat, pas l'inverse).
- **D-I7 (rattrapage)** — décision de direction Q4 : **proposé, jamais imposé**. À
  implémenter (aujourd'hui rien n'existe).
- **D-I9** — **un seul indice de préparation**, une seule formule, un seul nom. Retire
  l'autre.
- **D-C4 (tâche jouée)** — résolution **à l'écriture** : un événement d'entraînement
  coche la tâche du jour qui correspond (même jour **de la tâche**, même `caseId`, Teil
  compatible), et c'est **persisté**. Cela couvre la tâche lancée depuis le plan ET
  l'exercice lancé librement (point 8 de la direction). Un seul événement par exercice :
  la coche manuelle puis le jeu ne doivent pas produire deux événements (§1.2.1). Livre
  la fonction ; l'intégration la branchera.

## CRITIQUE — sécurité / perte de données (à faire EN PREMIER)

**S-C1. Les trois nouveaux types sont refusés par le serveur, et le refus fait perdre
des événements valides.** Prouvé sur la base locale (transactions annulées) :
`training.logged` / `plan.materialized` → `violates check constraint
"progress_events_type_check"` ; POST d'un lot `[srs.reviewed valide, plan.materialized]`
→ **400**, et l'événement valide n'est pas en base. Causes :
- `app/supabase/functions/events/index.ts:7-9` et la contrainte
  (`migrations/20260928000015_personal_updated_event.sql:3-10`) ignorent les 3 types ;
- **`app/src/lib/sync/queue.ts:119` retire TOUT le lot (jusqu'à 100) sur un 400**, sans
  nouvel essai — défaut **déjà présent sur `main`** : la prochaine série qui ajoute un
  type recommencerait.
Correctifs :
1. Migration `app/supabase/migrations/20260930000017_training_journal_events.sql` qui
   recrée la contrainte avec les 3 types (et **conserve `plan.done`** : des lignes
   existantes la violeraient sinon). Proposition du relecteur :
   ```sql
   alter table public.progress_events drop constraint if exists progress_events_type_check;
   alter table public.progress_events add constraint progress_events_type_check check (type in (
     'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
     'term.favorited','term.unfavorited',
     'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
     'srs.settings_changed','term.personal_created','term.personal_deleted','term.personal_updated',
     'training.logged','plan.materialized','plan.replanned'));
   ```
   Vérifie la liste exacte contre la dernière migration de `main` avant d'écrire.
2. `events/index.ts` : ajouter les 3 types, **et à la racine** : un type inconnu ou un
   payload invalide est rejeté **événement par événement** (dans `rejected`), jamais le
   lot entier en 400.
3. `queue.ts:119` : ne jamais vider un lot entier sur un 400 ; traiter le rejet par
   événement. Test rouge d'abord (le test existant `queue.test.ts:71` ne couvre que le
   refus par événement).
4. **Schéma strict par type** (S-I3) : `training.logged` `.strict()`, `kind`/`teile` en
   listes fermées (`teile` ≤ 3), `spentMin` entier 0–1440, `scores` 0–100 par Teil connu,
   ids ≤ 100 caractères ; plans : `tasks` ≤ ~50.
5. Corrige `docs/contracts/training-journal.md:447-448` (« pas de migration serveur » est
   faux) — **exception à ton périmètre accordée pour ces deux lignes**.
⚠️ **Déploiement** : `main` est EN PRODUCTION (ADR-0015, Supabase EU). La migration et
la fonction doivent être déployées **avant** le client. **Tu ne déploies RIEN en
production** : tu livres, tu testes sur le Supabase local (propriété de `main`, ne le
stoppe pas, jamais `db:reset`), et tu écris la procédure de déploiement dans ton
rapport. `main` demandera l'accord de la direction.

**S-I1.** `projectTrainingEvents` recopie le payload sans le vérifier
(`journal.ts:89-90`) ; un événement **sans** `selbstbewertet` compte comme mesuré
(`journal.ts:161`) ; le serveur accepte n'importe quel score (preuve P6). → Dans la
projection, **ignorer `scores` pour `training.logged`** : seul `simulation.completed`
porte un score mesuré.
**S-I2 = B-I8.** Filtrer `estMesuree` dans `axisScores`, `weakestAxis`,
`specialtyScores`, `progressSeries` (`stats.ts:16-29`, `StatsPage.tsx:39-43`).
**S-M1.** Pollution de prototype (`journal.ts:167-173`) : ne garder dans `teile` que
`TEIL_KEYS` ; un payload `teile: null` ne doit pas faire échouer `rebuildJournal`.
**S-M2.** `plan.replanned` n'envoie pas `doneAt`/`spentMin`/`eventId` (`dayPlan.ts:307`).

## CRITIQUE — branche

- **B-C1. Migration v5 : le journal n'est jamais construit pour un utilisateur existant.**
  `db/db.ts:81` (v5 sans `upgrade`), `rebuildProjections` n'est appelé que sur un pull
  rapportant des événements frais (`queue.ts:100-103`), et `ensureDayPlan` s'exécute
  avant `startSyncLoop` (`main.tsx:138` puis `:145`). Sonde : avec un
  `simulation.completed` dans `progress_events`, après `ensureDayPlan` →
  `training_events 0`, `case_progress 0`, le cas déjà joué revient au plan. **Pour Mehdi
  et Lydia : Historique vide, Stats « pas encore de données », axe Fachwissen à 0, plan
  qui repropose des cas solides.** → Au démarrage, `rebuildJournal(progress_events)`
  **avant** `ensureDayPlan` quand le journal est vide ou incomplet. Test de migration
  depuis des données de `main`.
- **B-C2** → R-C2 (intégration). Livre et teste `applySimulationToJournal`.
- **B-C3. Le travail hors plan n'est pas journalisé** : seul `TaskLine.tsx:99` appelle
  `logTraining`. Branche toi-même les **fiches Fachwissen** et les **Aufklärungen**
  (périmètre accordé). Le drill → R-C3-drill. `HistoriquePage.tsx:79` promet « séances
  libres et drill » : ne promets que ce qui est vrai à la fin.
- **B-C4** → D-C4 (livre la résolution à l'écriture ; l'intégration la branche).
- **B-C5. Le statut régresse encore** : `simulationSave.ts:69-72` écrit
  `Case.status`/`confidence` via `caseMastery` (formule passée de `/3` à `/joués`,
  `simScope.ts:49-51`) ; scénario : Anamnese 90 → « Maîtrisé » après un seul Teil, puis
  Dokumentation 70 réussie → « En cours ». Lu dans `CasesPage.tsx:41,59,152,156` et
  `CaseDetailPage.tsx:42`. → Fais lire `CasesPage` et `CaseDetailPage` sur
  **`case_progress`** (périmètre accordé) ; l'arrêt de l'écriture → R-C5-écriture.
  Corrige le commentaire faux `simScope.ts:30`.

## IMPORTANT — branche (dans l'ordre)

- **I1** Le jour n'est jamais matérialisé après le démarrage (programme créé —
  `ProgramPage.tsx:62` ; minuit passé app ouverte ; retour d'arrière-plan). L'accueil
  affiche « Recharge l'app » (`HomePage.tsx:82`). → `ensureDayPlan` sur événement
  (sauvegarde du programme, `visibilitychange`, changement de jour).
- **I2** → D-I2. Sonde P-E : tâche cochée sur B, après rebuild le plan de A remplace
  celui de B, les faites passent de 1 à 0.
- **I3** `replanifier` dépasse le budget : `dayPlan.ts:301` repart de `used = 0` sans les
  tâches faites. Sonde P-B : 120 min → 8 tâches pour 160 min. « Cocher libère du budget »
  renaît par ce chemin.
- **I4** INV-4 violé : examen à blanc (`dayPlan.ts:145-156`) et Fachwissen (`:193-201`)
  échappent à `pickWithDiversity`. → amorcer `specialties` avec celles déjà poussées.
- **I5** → D-I5 (`dayPlan.ts:178-179`).
- **I6** La projection des jours futurs a disparu (`projectedDay`, `dayPlan.ts:317`, sans
  appelant ; calendrier « volontairement vide », `ProgramPage.tsx:296`). Le contrat
  l'exige (§3.2, §7) : rétablis-la.
- **I7** → D-I7.
- **I8** → S-I2.
- **I9** → D-I9 (`TrajectoryStrip` `StatsPage.tsx:59` vs `ReadinessGauge` `:64`).
- **I10** Lectures directes de l'heure restantes : `ProgramPage.tsx:69,336,368`,
  `ProgramSetup.tsx:47,51`, `drillContext.ts:32`, `stats.ts:79,92,106`,
  `srs.ts:11,16,48`, `srsBudget.ts:30-46`. `ProgramPage.tsx:69` duplique `joursRestants()`
  avec un autre arrondi : J-x peut différer d'un jour entre deux écrans.
- **I11** DST : `trajectory.ts:77-81` avance par `+ i × DAY_MS` ; avec
  `TZ=Europe/Berlin` le **25 octobre apparaît deux fois** et le point du 28 est étiqueté
  27. → avancer par jour calendaire. Test avec `TZ=Europe/Berlin`.
- **I12** Coche fragile : double clic = 2 événements (sonde P-D), aucune annulation ;
  après minuit, cocher une tâche de la veille ne change rien localement
  (`journal.ts:349-356` applique la coche au jour de `event.at` au lieu de `task.date`,
  sonde P-F) → l'état local et le rebuild divergent.

## MINEUR

M1 vestiges (`plan: null` en v5, `PlanEntry`, `plan.done` dans `events.ts:2` — attention :
`plan.done` doit rester **accepté par le serveur** pour les lignes existantes) · M2 `seed`
non rejouable (ids aléatoires) · M3 `dayPlan.ts:148` condition toujours vraie → examen à
blanc de 60 min sur un jour de 45 · M4 coche manuelle `attempts:1`/`status:vierge` : le
champ de couverture dit « pas encore travaillé » pour une tâche faite, P3a passe à vide,
`observeModus` ne fait que refléter le plan · M6 abonnement mort `targetCenter` dans
`HomePage.tsx` · M7 horloge qui recule → jour matérialisé rétroactivement · M8
`programmeInvariants.mjs:46` prend la première base `fsp-cockpit*` · M9 `/historique`
absent de la navigation principale (**à corriger** : la direction a demandé l'historique
« accessible depuis la barre latérale ») · S-M3 la série compte un clic à 0 min : à
écrire dans le rapport, ne pas réutiliser pour une ligue.

## Critères à prouver avant de rendre

`programmeInvariants.mjs` **6/6**, P2 mesurée sur une **simulation** (pas drill contre
drill), P3a non vide ; test de migration depuis les données de `main` ; tests minuit,
horloge qui recule, `TZ=Europe/Berlin` ; les modes `cas-complet`, `specialite`,
`examen-blanc` au moins en test unitaire du plan ; deux appareils (rebuild) en test.
