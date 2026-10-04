# Contrat — Journal d'entraînement, plan du jour figé, progression par Teil

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Sources mesurées : `app/docs/reports/audit-programme-serie3.md`,
> `app/docs/reports/audit-simflow-serie3.md`,
> `docs/superpowers/specs/2026-09-30-serie3-analyse-et-chantiers.md` §4 et §6.2.
> Consommé par : C1 (programme & historique), C2 (simulation), C3 (pont IA), C6 (harnais).
>
> **Amendé — série 4 (4 oct. 2026)** · `platform-architect` · ADR-0021 et ADR-0022.
> Le cas devient l'unité d'intention, et le Teil reste l'unité de mesure.
> Nouvelles sections : §12 (tâche de cas, complétion, couverture et maîtrise,
> échelle d'états, cadran) et §13 (le cerveau du programme). Les sections
> amendées sont marquées *[S4]* ; la règle série 4 l'emporte sur le texte
> d'origine qui la précède.

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

Chacune a un **comportement provisoire** : l'implémenteur l'applique tel quel
tant que la réponse n'est pas écrite dans ce fichier. Aucun de ces comportements
provisoires n'est une décision produit : ce sont des no-op conservateurs.

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q1** | Quel `Fortschrittsmodus` est le **défaut** quand le candidat n'a jamais répondu, et **à quel moment** la question lui est posée (onboarding / première ouverture du programme / jamais) ? | **Tranchée** — d'abord en « déduit puis proposé » (30 sept., `modus.ts:1-10`), puis *[S4]* en **« observé, jamais proposé ni demandé »** (direction, 4 oct., ADR-0021). Mode effectif = `observeModus(journal)`, ou `'cas-complet'` à défaut (§12.4). |
| **Q2** | « Replanifier » réécrit-il **le jour courant seulement** ou **le jour courant et tous les jours futurs déjà matérialisés** ? | Le jour courant seulement. Aucun jour futur n'est matérialisé d'avance (§3.1). |
| **Q3** | Une séance **auto-déclarée** (IA externe, entraînement hors app) compte-t-elle dans l'indice de préparation et la série (streak) **au même titre** qu'une séance jouée dans l'app ? | Elle entre dans l'historique et dans le temps investi ; elle **n'entre pas** dans l'indice de préparation ni dans les scores par axe. `TrainingEvent.selbstbewertet = true` la marque. |
| **Q4** | Le rattrapage d'un jour manqué est-il **proposé** (accord explicite) ou **ignoré** ? | Ignoré : un jour non matérialisé n'existe pas, rien ne s'accumule. Aucune notion de « retard » n'est affichée. |

---

## 1. Le journal — `TrainingEvent`

### 1.1 Type

```ts
export type TrainingKind =
  | 'simulation'      // une partie ou un run, joués dans l'app
  | 'drill'           // une séance de répétition espacée (PAS une carte)
  | 'fiche'           // Fachwissen / guide lu de bout en bout
  | 'aufklaerung'     // une Aufklärung jouée
  | 'examen-blanc';   // run complet en conditions d'examen

export type TrainingSource = 'plan' | 'libre';

export interface TrainingEvent {
  id: string;                  // uuid v4 ; JAMAIS `${prefix}-${Date.now()}`
  at: number;                  // epoch ms, début de l'exercice
  kind: TrainingKind;
  caseId?: CaseId;             // absent pour un drill non lié à un cas
  teile: SimTeil[];            // ce qui a RÉELLEMENT été joué (fait, pas intention)
  source: TrainingSource;
  taskId?: string;             // TaskInstance satisfaite, si une l'a été (§3.4)
  spentMin: number;            // entier ≥ 0, minutes réellement passées
  laufId?: string;             // run de simulation associé (simulation-run.md)
  scores?: Partial<Record<SimTeil, number>>; // 0..100 par Teil joué
  selbstbewertet?: boolean;    // true = score déclaré par le candidat, pas mesuré
  profileId?: string;          // profil crédité
  // [S4] — DÉRIVÉS de `simulation.completed` (§2.3), jamais écrits par `training.logged`
  enchaine?: true;             // les 3 Teile joués d'un trait (simulation-run.md §10.4)
  minutesParTeil?: Partial<Record<SimTeil, number>>; // durée mesurée par Teil (§13.4)
  manques?: Partial<Record<SimTeil, ChecklistItemId[]>>; // items NON cochés par Teil joué (§13.3)
}
```

### 1.2 Règles opposables

1. **Un exercice = exactement un `TrainingEvent`.** Un run de trois Teile écrit
   **un** événement à `teile: ['anamnese','dokumentation','fallvorstellung']`,
   pas trois. Une partie seule écrit un événement à un seul Teil.
2. **Append-only.** Aucun `TrainingEvent` n'est jamais modifié ni supprimé.
   Une correction est un nouvel événement ; il n'y a pas de rectification.
3. **Hors plan compris.** `source: 'libre'` est un événement comme un autre :
   il entre dans l'historique, dans le temps investi, dans la série, et il peut
   satisfaire une tâche du plan (§3.4).
4. **Tout ce qui est dérivé l'est du journal.** Statistiques, historique, indice
   de préparation, sélection du programme, champ de couverture : un seul amont.
   Aucun écran ne lit `db.simulations` directement.
5. `spentMin` est **mesuré**, jamais estimé. Un exercice sans mesure de durée
   écrit `spentMin: 0` — il ne se voit pas attribuer `estMin`.

---

## 2. Où vit le journal — stockage et synchronisation

### 2.1 Dexie — version 5

```ts
this.version(5).stores({
  training_events: 'id, at, kind, caseId, [kind+at]',
  day_plans: 'date',            // une ligne par jour ouvré matérialisé
  case_progress: 'caseId',      // projection : état par Teil (§4)
  plan: null,                   // ABANDONNÉ (table morte, seed de démo)
});
```

- `training_events` est une **projection** (reconstructible), pas une source.
  `rebuildProjections()` la vide et la reconstruit intégralement.
- `day_plans` porte ses `TaskInstance[]` **en ligne** : une tâche n'est jamais
  lue hors de son jour. Pas de seconde table.
- `case_progress` est une projection de `training_events`.

### 2.2 Ce qui est ajouté au protocole de synchronisation

Deux types d'événements nouveaux dans `ProgressEventType`
(`app/src/lib/sync/events.ts`) — et un retrait :

| Type | `subject_id` | `payload` | Projection |
|---|---|---|---|
| `training.logged` | `TrainingEvent.id` | le `TrainingEvent` **sans** `id` | insère dans `training_events` |
| `plan.materialized` | `yyyy-MM-dd` | `{ tasks: TaskInstance[], mode, seed }` | insère dans `day_plans` — **le PLUS ANCIEN `occurred_at` gagne** |
| `plan.replanned` | `yyyy-MM-dd` | `{ tasks: TaskInstance[], reason: 'manuel' }` | remplace `day_plans[date].tasks` — dernier `occurred_at` gagne, bat toujours `plan.materialized` |
| ~~`plan.done`~~ | — | — | **RETIRÉ** : déclaré depuis la v1, jamais émis (`sync/events.ts:2`). |

**Motivation du premier-gagne sur `plan.materialized`** : deux appareils ouvrant
l'app le même jour matérialisent chacun. « Figé » veut dire que le premier fige.
C'est la seule exception au dernier-gagne du `sync-protocol.md` ; elle y est
référencée.

**Ce qui n'est PAS ajouté.** `simulation.completed` existe déjà et porte toute
la `Simulation`. Il n'est **pas** doublé par un `training.logged` : la projection
`training_events` dérive un `TrainingEvent` de chaque `simulation.completed`
(règle §2.3). `training.logged` ne sert qu'aux genres qui n'émettent rien
aujourd'hui : `drill` (séance), `fiche`, `aufklaerung`, `examen-blanc`, et les
séances auto-déclarées.

Compatibilité client : un client ancien reçoit `training.logged`,
`plan.materialized`, `plan.replanned` et les **ignore** (types inconnus →
insérés dans `progress_events`, non projetés). Aucune régression.

### 2.3 Dérivation depuis `simulation.completed`

```
TrainingEvent.id      = `te-${sim.id}`        // déterministe, idempotent
        .at           = sim.date
        .kind         = sim.mode === 'external-ai' ? 'simulation' : (examen blanc → 'examen-blanc')
        .caseId       = sim.caseId
        .teile        = Teile dont parts[t].done === true      // le FAIT
        .source       = sim.taskId ? 'plan' : 'libre'
        .spentMin     = round(Σ parts[t].durationSec / 60)
        .laufId       = sim.id
        .scores       = { t: partScore(parts[t]) } pour chaque t joué
        .selbstbewertet = sim.mode === 'external-ai'
        .profileId    = sim.profileId
  [S4]  .enchaine     = sim.enchaine === true && teile.length === 3 && !selbstbewertet ? true : absent
        .minutesParTeil = { t: round(parts[t].durationSec / 60) } pour chaque t joué, si durationSec > 0
        .manques      = { t: ids des items de parts[t].checklist avec checked === false } pour chaque t joué,
                        ids legacy `cl-N` traduits à la lecture (simulation-run.md §4.4) ; absent si selbstbewertet
```

*[S4]* Une `Simulation` antérieure n'a pas `enchaine` : elle n'est **jamais**
enchaînée rétroactivement (ADR-0021, contradiction 12). Les trois champs
dérivés ne passent pas par `training.logged` : son schéma serveur est
`.strict()` (`events/index.ts:30-37`) et n'a pas à changer.

Rétrocompatibilité de l'historique : les `Simulation` déjà enregistrées se
projettent par la même règle. Aucune migration destructive, aucun backfill
d'événements serveur.

---

## 3. Le plan du jour figé

### 3.1 Types

```ts
export type TaskKind = 'simulation' | 'drill' | 'fachwissen' | 'aufklaerung' | 'revision' | 'examen-blanc';

export interface TaskInstance {
  id: string;                  // uuid v4, stable pour toujours
  date: string;                // ISO yyyy-MM-dd, = la clé du DayPlan porteur
  kind: TaskKind;
  caseId?: CaseId;
  teil?: SimTeil;              // [S4] LECTURE SEULE (plans série 3) ; jamais écrit — voir `teileDeTache` §12.1
  teile?: SimTeil[];           // [S4] ce qui RESTAIT au moment du plan, ordre d'examen ; non vide sur toute tâche de cas
  rappel?: ChecklistItemId;    // [S4] erreur transversale à rappeler, au plus une, figée (§13.3)
  dUnTrait?: true;             // [S4] ne se coche que par une partie enchaînée (§12.2, §13.1)
  layer?: Layer;
  specialty?: Specialty;
  estMin: number;
  source: 'plan';              // une TaskInstance vient toujours du plan
  reason: string;              // l'explication en une ligne, FIGÉE avec la tâche
  doneAt?: number;             // epoch ms ; absent = non faite
  spentMin?: number;           // renseigné en même temps que doneAt
  eventId?: string;            // TrainingEvent qui l'a satisfaite
  diversityRelaxed?: boolean;  // §5.3
}

export interface DayPlan {
  date: string;                // ISO yyyy-MM-dd — clé primaire
  materializedAt: number;      // epoch ms de la matérialisation
  mode: Fortschrittsmodus;     // §6, figé avec le jour
  seed: string;                // graine de la sélection, rejouable
  targetMin: number;
  tasks: TaskInstance[];
  replannedAt?: number;
}
```

### 3.2 Matérialisation

- Le `DayPlan` d'un jour est créé **une fois**, à la **première ouverture de
  l'app ce jour-là**, et jamais ailleurs.
- **Aucun jour futur n'est matérialisé.** Le calendrier affiche une projection
  non figée, marquée comme telle ; elle n'a pas d'identité et ne se coche pas.
- Le passé n'est jamais matérialisé rétroactivement : un jour sans `DayPlan`
  est un jour où l'app n'a pas été ouverte. Il s'affiche vide, pas « en retard ».
- La matérialisation est **pure de tout rendu** : elle ne peut être déclenchée
  par un composant. Un rendu qui ne trouve pas le `DayPlan` du jour affiche
  l'état « pas encore ouvert », il ne le crée pas.

### 3.3 Immuabilité

- `tasks` n'est jamais réordonné, jamais complété, jamais réduit après
  matérialisation — sauf par `replanifier()`.
- `replanifier()` est une **action nommée**, déclenchée par un geste explicite
  de l'utilisateur, qui écrit `plan.replanned` et pose `replannedAt`.
  Elle **conserve** les tâches déjà faites (`doneAt` présent) et ne remplace que
  les non faites.
- Cocher une tâche pose `doneAt`/`spentMin`/`eventId`. **Rien d'autre ne bouge.**

### 3.4 Satisfaction d'une tâche par un exercice libre

À l'écriture d'un `TrainingEvent` `kind: 'simulation'`, chercher dans le
`DayPlan` du jour la première `TaskInstance` telle que :

```
task.doneAt === undefined
&& task.kind === 'simulation'
&& task.caseId === event.caseId
&& (task.teil === undefined || event.teile.includes(task.teil))
```

Si trouvée : poser `doneAt = event.at`, `spentMin = event.spentMin`,
`eventId = event.id`, et basculer `event.source` à `'plan'` et `event.taskId`.
Sinon : l'événement reste `'libre'`. **La machine s'adapte à l'humain** ; aucune
tâche n'est créée pour absorber un exercice libre.

*[S4]* La dernière condition devient
`teileDeTache(task) ⊆ teileJouesLeJour(task.date, task.caseId)`, cet
événement compris (règle de complétion, §12.2). Pour une tâche `dUnTrait`, la
condition est `event.enchaine === true`. Le code série 3 applique déjà ce
cumul aux tâches sans `teil` (`completeAssez`, `journal.ts:346-347`). La
série 4 l'étend à toute tâche de cas.

---

## 4. La progression par Teil

### 4.1 Ce qui remplace `confidence` / `status` / `caseMastery`

**Supprimé du chemin d'écriture** (`simulationSave.ts:69-72` ne fait plus de
`db.cases.update`) :

| Champ | Devenir |
|---|---|
| `Case.confidence` | **déprécié**, plus jamais écrit. Lecture tolérée sur l'historique, jamais affichée. |
| `Case.status` (`CaseStatus`) | **déprécié**, plus jamais écrit. Les filtres passent sur `CaseProgress.overall`. |
| `Case.layerProgress` | **déprécié**, plus jamais écrit (c'est la source du saut de couche, audit §5). |
| `Case.lastSimulationId` | **déprécié**. |
| `caseMastery(sims, caseId)` → `{score, parts}` | **supprimée.** Le `sum / TEILE.length` de `simScope.ts:42` disparaît avec elle. |

L'index Dexie `cases: '… status …'` reste (inoffensif) ; les champs cessent
d'être écrits. Aucune migration de `db.cases` n'est nécessaire.

**Ajouté** — projection `case_progress` :

```ts
export type TeilStatus = 'vierge' | 'fragile' | 'acquis' | 'solide';

export interface TeilProgress {
  status: TeilStatus;
  lastScore: number | null;    // null ⇔ status === 'vierge'
  lastAt: number | null;
  attempts: number;
}

export interface CaseProgress {
  caseId: CaseId;
  teile: Record<SimTeil, TeilProgress>;   // les TROIS clés, toujours présentes
  overall: 'vierge' | 'entame' | 'solide';
}
```

Règles de calcul, sur les `TrainingEvent` du cas, par Teil :

```
attempts  = nombre d'événements où ce Teil est dans `teile`
lastScore = score du plus récent de ces événements ; null si attempts === 0
status    = attempts === 0        → 'vierge'
            lastScore <  60       → 'fragile'
            lastScore <  80       → 'acquis'
            sinon                 → 'solide'
overall   = tous 'vierge'                     → 'vierge'
            tous 'solide'                     → 'solide'
            sinon                             → 'entame'
```

60 = seuil de réussite déjà porté par `simulationPassed()` (`scoring.ts:77-81`).
80 = seuil de maîtrise déjà porté par `simulationSave.ts:71`. Aucun seuil neuf.

*[S4]* **`status` n'est plus une fonction du seul `lastScore`** : il suit
l'automate « solide stable » de §13.2 (deux réussites espacées de ≥ 3 jours,
descente d'un cran). `attempts`, `lastScore` et `lastAt` gardent la définition
ci-dessus. `CaseProgress` gagne `couverture`, `maitrise`, `etat`, `pretAt`,
`solideDepuis` et `prochaineConsolidation` (§12.5). `overall` est **déprécié**
et se dérive de `etat` : `vierge → 'vierge'`, `entame | couvert → 'entame'`,
`solide | pret → 'solide'`. Ainsi, `coverage.ts` et `layerFor`
(`dayPlan.ts:110-111`) restent lisibles sans changement.

Les événements `selbstbewertet: true` sont **exclus** du calcul de
`case_progress` — de `attempts`, de `lastScore`, de `lastAt`. Sans quoi un Teil
passerait de `vierge` à `fragile` sans qu'aucune performance ait été mesurée
(Q3). Ils n'entrent que dans l'historique et le temps investi.

### 4.2 La règle opposable

> **Un point faible se décide sur la performance, jamais sur l'absence.**

Forme testable :

```
pointFaible(caseId, teil) ⇒ case_progress[caseId].teile[teil].status === 'fragile'
```

`'vierge'` n'est **jamais** un point faible. Il est affiché « pas encore
travaillé », en teinte neutre, avec un libellé neutre. `weakCases()`
(`stats.ts:117`) filtre sur `status === 'fragile'` et sur rien d'autre.

### 4.3 Dette ≠ faiblesse

La **dette** sert à ordonner le travail à venir ; la **faiblesse** sert à
nommer un défaut. Elles ne se confondent pas.

```
detteTeil(caseId) = |{ t ∈ Teile : case_progress[caseId].teile[t].status !== 'solide' }| / 3
```

La dette inclut les Teile `'vierge'` (il reste du travail). La faiblesse jamais.

---

## 5. La sélection — formule et contrainte

### 5.1 Score d'un cas candidat

```
score(c) = freq(c) × urgence(c) × detteTeil(c) × fraicheur(c)
```

**Multiplicatif, quatre facteurs, aucun terme additif.** Un terme additif
plafonné noie la fréquence : mesuré à ≤ 29 % de poids dans l'implémentation
actuelle (`program.ts:71-78`).

```
freq(c)      = c.frequency / FREQ_MAX            ∈ (0, 1]   FREQ_MAX = max du corpus (26)
urgence(c)   = 1 + 2 × pressionExamen             ∈ [1, 3]  pressionExamen = clamp(1 − joursRestants/90, 0, 1)
detteTeil(c) = §4.3                               ∈ {0, 1/3, 2/3, 1}
fraicheur(c) = jamais joué ? 1
               : clamp(joursDepuisDernierJeu / 14, 0.2, 1)  ∈ [0.2, 1]
```

- `detteTeil === 0` ⇒ `score === 0` ⇒ le cas **sort** des candidats. C'est la
  seule exclusion ; il n'y a pas de liste d'exclus.
  *[S4]* **Amendé par §13.1** : un cas solide sort **jusqu'à sa prochaine
  consolidation**, plus pour toujours. Ce jour-là, son score vaut
  `freq × urgence × POIDS_CONSOLIDATION × fraicheur`.
- *[S4]* `now` dans `SelectContext` = **début du jour `date`**, jamais
  l'instant de matérialisation (INV-55, §12.3).
- **`disciplineBoost` est supprimé** (`program.ts:57-69,76`) : une boucle de
  rétroaction par spécialité rend le classement monochrome (13 cas de Gastro,
  les plus fréquents du corpus).
- **`weakness` additif est supprimé** (`program.ts:72-74`) : la performance
  n'entre dans la sélection que par `detteTeil`.
- `urgence` ne dépend pas du SRS des Fachbegriffe : le drill est une tâche à
  part, son budget n'influence pas la sélection de cas
  (corrige `program.ts:186-191`).

### 5.2 La diversité est une CONTRAINTE, pas une pondération

Sur la liste `tasks` d'un `DayPlan`, restreinte aux tâches portant une
`specialty`, dans l'ordre :

- **C1 — adjacence** : `tasks[i].specialty !== tasks[i+1].specialty`.
- **C2 — fenêtre** : dans toute fenêtre glissante de 5 tâches consécutives,
  une même spécialité apparaît au plus 2 fois.

Algorithme opposable : classement par `score` décroissant, puis **choix glouton
qui saute tout candidat violant C1 ou C2**. La contrainte n'est jamais convertie
en malus de score.

### 5.3 Relâchement, et lui seul

Si aucun candidat de la liste ne satisfait les contraintes, elles sont relâchées
**dans cet ordre, une à la fois** : C2 d'abord, C1 ensuite. Toute tâche placée
sous relâchement porte `diversityRelaxed: true`.

Propriété testable : `diversityRelaxed === true` ⇒ **tous** les candidats de
score > 0 violaient la contrainte relâchée. Il n'existe pas d'autre chemin vers
`diversityRelaxed`.

---

## 6. Le mode d'avancement

```ts
export type Fortschrittsmodus =
  | 'teil-first'     // un geste à la fois : le même Teil sur plusieurs cas
  | 'cas-complet'    // les trois Teile d'un cas avant de passer au suivant
  | 'specialite'     // une spécialité travaillée à fond, puis la suivante
  | 'examen-blanc';  // runs complets chronométrés, sans assistance
```

Stocké dans `ProgramConfig.modus`. Figé dans chaque `DayPlan.mode` au moment de
la matérialisation : changer de mode ne réécrit **aucun** jour déjà figé.

Effet, et rien d'autre :

| Mode | Effet sur la sélection | Effet sur C1/C2 (§5.2) |
|---|---|---|
| `teil-first` | le Teil de la tâche est le Teil de plus forte dette **du corpus**, identique sur toutes les tâches du jour | inchangé |
| `cas-complet` | `teil` absent : la tâche est un run complet | **C1 et C2 suspendues** (un jour = souvent un seul cas) |
| `specialite` | filtre les candidats sur la spécialité courante (celle de plus forte dette agrégée) | **C1 et C2 suspendues** |
| `examen-blanc` | `kind: 'examen-blanc'`, `layer: 3`, `assistance: 'autonome'` | inchangé |

`ProgramConfig.strategy` (`'teil-first' | 'full'`) est **remplacé** par `modus`.
Lecture tolérante : `strategy === 'full'` → `modus = 'cas-complet'`.

*[S4]* **Remplacé par §12.4.** Le mode n'est plus choisi, ni proposé, ni lu
dans `ProgramConfig` : il est **observé**. Aucune tâche ne porte plus de Teil
seul. Le tableau ci-dessus vaut pour les plans série 3 déjà figés, et pour eux
seuls.

---

## 7. La source unique de la session du jour

```ts
sessionDuJour(dayPlan: DayPlan): TaskInstance | null
  = dayPlan.tasks.find(t => t.doneAt === undefined) ?? null
```

- **`pickSessionCase` (`features/simulation/pickSession.ts`) est supprimée**,
  avec son second barème (`pickSession.ts:38`) et son exclusion par
  `status === 'Maîtrisé'` (`:32`). Un seul moteur de sélection dans le dépôt.
- `HomePage` n'appelle plus qu'une fois le programme et affiche la valeur de
  `sessionDuJour`. Le hero et la liste « À faire aujourd'hui » lisent le **même**
  `DayPlan`.
- `WeekCalendar` ne recalcule rien : il lit `day_plans` pour le passé et la
  projection non figée pour le futur.
- Si `sessionDuJour` retourne `null`, la journée est finie. Aucune tâche
  supplémentaire n'est proposée automatiquement.

---

## 8. Invariants — propriétés testables

Format : chaque invariant est un test de propriété, exécutable par le harnais
C6 (horloge injectable + candidat synthétique). `INV-*` est l'identifiant
opposable ; un test qui ne porte pas cet identifiant ne compte pas.

| Id | Propriété | Générateur |
|---|---|---|
| **INV-1** | Cocher une tâche ne fait jamais croître `tasks.filter(t => !t.doneAt).length`. | n coches aléatoires sur un `DayPlan` quelconque |
| **INV-2** | `sessionDuJour(dp)` ∈ `dp.tasks` ∪ `{null}`, toujours. | tout état de plan |
| **INV-3** | `pointFaible(c, t)` ⇒ `case_progress[c].teile[t].attempts ≥ 1`. | tout journal |
| **INV-4** | Dans `dp.tasks`, jamais deux `specialty` identiques consécutives, sauf `diversityRelaxed === true` sur la seconde. | 14 jours, corpus complet |
| **INV-5** | Tout `TrainingEvent` apparaît dans l'historique ET dans le temps investi du jour de son `at`, quel que soit `source`. | mélange plan/libre |
| **INV-6** | `spentByDay(d) > 0` ⇔ il existe un `TrainingEvent` au jour `d`. Un drill seul suffit. (corrige `program.ts:320-327`) | journées 100 % drill |
| **INV-7** | Deux matérialisations concurrentes du même jour produisent **un seul** `DayPlan`, celui du plus ancien `occurred_at`. | deux appareils, même jour |
| **INV-8** | `replanifier()` conserve toutes les tâches `doneAt !== undefined`, à l'identique (id compris). | plan partiellement fait |
| **INV-9** | Le `DayPlan` d'un jour, une fois matérialisé, est **bit-identique** après n re-rendus de n'importe quelle page. | rendus répétés, horloge qui avance dans la journée |
| **INV-10** | Aucun `TrainingEvent` n'est jamais modifié ni supprimé : `training_events` reconstruit depuis `progress_events` est identique à lui-même. | `rebuildProjections()` ×2 |
| **INV-11** | `selbstbewertet === true` ⇒ les MESURES du `CaseProgress` (`status`, `lastScore`, `lastAt`, `attempts`, `overall`) sont inchangées par cet événement ; seul `TeilProgress.nonMesureAt` le note (« faite — non mesurée », décision I-4). Un cas joué seulement en IA externe a donc une ligne `case_progress` « vierge » portant `nonMesureAt`. | séances IA externe |
| **INV-12** | `taperLen` et toute fenêtre de phase se calculent sur la **date d'examen**, jamais sur les jours restants : la phase d'un jour figé ne change plus. (corrige `program.ts:35-37,136`) | horloge avancée d'un jour |

**Modifié *[S4]*.** **INV-4** s'applique à **tout** plan dont `mode !== 'specialite'`,
et plus seulement à `teil-first` : C1/C2 ne sont plus suspendues en
`cas-complet` (ADR-0021, contradiction 7). Le test C6
(`invariants.programme.test.ts:113`, « en teil-first ») est réécrit sur le
mode observé `cas-complet`. INV-1 à INV-3 et INV-5 à INV-12 sont inchangés.

### 8.1 Invariants série 4 — le cas entier (§12)

Chaque ligne nomme la **mutation** qui doit faire rougir le test. Un test qui
reste vert sous sa mutation ne garde rien.

| Id | Propriété | Générateur | Mutation qui doit rougir |
|---|---|---|---|
| **INV-50** | Toute tâche `simulation \| revision \| examen-blanc` matérialisée par un client série 4 porte `teile` non vide, sans `teil`. Pour `simulation`, `teile` = les Teile non `solide` du cas au moment du plan, dans l'ordre d'examen. Pour `revision` et `examen-blanc`, `teile` = les trois. | 14 jours, corpus complet, journaux aléatoires | `buildTasks` repose `teil: teilDuJour` (`dayPlan.ts:185`), ou `teile` = le seul Teil fragile |
| **INV-51** | **Une partie partielle ne coche jamais une tâche de cas incomplète** : `T.doneAt !== undefined` ⇔ `teileDeTache(T) ⊆ teileJouesLeJour(T.date, T.caseId)`, ou, si `T.dUnTrait`, ⇔ il existe un événement `enchaine` du cas ce jour-là. | parties libres d'un, deux ou trois Teile, réparties dans la journée, dans tous les ordres | `completeAssez` en `some` au lieu de `every` (`journal.ts:347`), ou bien `dUnTrait` ignoré |
| **INV-52** | **Une partie partielle n'est jamais comptée manquée** : `statutTache(T) ∈ {'faite', 'entamee', 'a-faire'}`, et l'avancement non vide d'une tâche non faite ⇒ `'entamee'`. Aucun état « manquée » n'existe. Le rattrapage d'une tâche entamée propose **exactement** `teileDeTache(T) \ avancement(T)`, sans rien modifier avant `accepterRattrapage`. | plan de la veille avec des tâches entamées, faites et vierges | `statutTache` rend `'a-faire'` pour une tâche entamée, ou une reprise porte `teileDeTache(T)` en entier |
| **INV-53** | **La maîtrise d'un cas ne baisse jamais par absence d'un Teil** : `maitrise === null` ⇔ `couverture === 0`. Sinon, `min(lastScore joués) ≤ maitrise ≤ max(lastScore joués)`. | tout journal, un seul Teil joué à 90 compris | `maitrise = Σ lastScore / 3` (le `/3` de `simScope.ts:42`, série 2) |
| **INV-54** | **Un ancien plan figé reste lisible** : pour un plan série 3 (tâches `teil` sans `teile`), `projectDayPlans` et `satisfiedTask` donnent exactement les mêmes `doneAt` que la règle série 3. `teileDeTache` vaut `[teil]`, ou les trois pour un run complet sans `teil`. | fixture gelée : journal C6 série 3 et ses plans | `teileDeTache` ignore `teil` (toute tâche ancienne exigerait les trois Teile) |
| **INV-55** | **Deux appareils, même journal, même plan** : `buildTasks` appelé à deux instants du même jour `date`, avec le même journal, la même config et le même état SRS, rend les mêmes tâches **modulo `id`**. | paires d'instants dans `[00:00, 23:59]` du même jour | `selectContext` lit `input.now` (`dayPlan.ts:230`) ou `counts(begriffe, input.now)` (`dayPlan.ts:136`) — **rouge sur le code actuel** (ADR-0021, contradiction 6) |
| **INV-56** | **Un cas `prêt` exige un enchaînement réel** : `etat === 'pret'` ⇒ trois Teile `solide`, **et** il existe un `TrainingEvent` non `selbstbewertet` avec `enchaine === true`, `teile.length === 3` et chaque score ≥ `PART_SOLIDE`. `pretAt` = `at` du plus récent de ces événements. | journaux mêlant runs complets enchaînés, interrompus, et trois Teile séparés le même jour | `prêt` dérivé de « trois Teile solides le même jour » ou de `isFullSimulation` |
| **INV-57** | **Le mode est observé, jamais lu dans la config** : `DayPlan.mode === observeModus(journal à materializedAt) ?? 'cas-complet'`, quel que soit `ProgramConfig.modus` ou `strategy`. | configs portant `modus`/`strategy` de toutes valeurs | `modusOf(config)` (`dayPlan.ts:39-42`) reste la source du mode |
| **INV-58** | **Une tâche de cas existe chaque jour ouvré où un candidat existe**, même si son `estMin` dépasse `targetMin` (ADR-0021, contradiction 5). Les tâches suivantes respectent le budget. | budgets de 15 à 180 min, cas vierges (Σ ≈ 52 min) | `if (used + estMin > targetMin) break` avant la première tâche de cas |

### 8.2 Invariants série 4 — le cerveau du programme (§13)

| Id | Propriété | Générateur | Mutation qui doit rougir |
|---|---|---|---|
| **INV-60** | **Consolidation** : un cas dont les trois Teile sont `solide` a `score > 0` à toute date `≥ prochaineConsolidation`, et `score === 0` avant. Les échéances successives d'un cas rejoué à chaque échéance sont espacées de 7, 21, 45, 45… jours. | cas rendus solides puis rejoués aux échéances, en avance, en retard | retour à `detteTeil = 0 ⇒ 0` (`select.ts:79`), ou intervalle constant |
| **INV-61** | **Solide stable** : `status === 'solide'` ⇒ il existe deux scores mesurés ≥ 80 sur ce Teil dont les `dayKey` diffèrent d'au moins `SOLIDE_ECART_JOURS` (3). | séquences de scores, de même jour et espacées | `status = statusOf(lastScore)` (`journal.ts:211`) |
| **INV-62** | **Un cran** : si un Teil est `solide` avant une partie mesurée de score `s < 80`, il est `acquis` après, **jamais** `fragile`, même pour `s = 0`. | Teil solide puis `s ∈ [0, 79]` | `statusOf(s)` appliqué sans tenir compte de l'état précédent |
| **INV-63** | **Erreurs transversales** : un item signalé a été manqué dans ≥ 3 des 5 dernières parties mesurées de son Teil, sur ≥ 2 cas distincts. Un item coché dans ≥ 3 de ces 5 parties n'est jamais signalé. Une tâche porte au plus un `rappel`, d'un Teil de `teileDeTache`. | journaux de checklists aléatoires, dont un item manqué 3 fois sur le **même** cas | fenêtre ignorée (compte sur toute la vie), seuil « 2 cas distincts » ignoré, ou lecture de `prioritizedCorrections` |
| **INV-64** | **Durées apprises** : `estMin` d'une tâche de cas = Σ `dureeTeil(t)`. Avec moins de 3 mesures pour `t`, `dureeTeil(t) = TEIL_MIN[t]`. Toujours dans `[5, 45]`. Ni les séances `selbstbewertet` ni les durées nulles n'y entrent. | mesures aléatoires, dont une valeur aberrante de 300 min | moyenne au lieu de médiane (la valeur de 300 déplace l'estimation), ou repli absent |
| **INV-65** | **Rythme proposé, jamais imposé** : `hoursPerSession` ne change que par `accepterRythme()`, et aucun `DayPlan` figé ne change à l'acceptation. Une proposition n'existe que si Σ `spentMin` < 0,6 × Σ `targetMin` sur ≥ 3 jours figés de la fenêtre. La valeur proposée est `< targetMin` actuel et `≥ 20`. | semaines de temps réel aléatoires | budget appliqué sans geste, ou proposition à la hausse |
| **INV-66** | **Couverture pondérée sourcée** : `couverturePonderee()` rend `{ pct, base, ville }` avec `0 ≤ pct ≤ 100` et `base > 0` dès que `pct` est défini. Un cas sans donnée de fréquence ne change ni le numérateur ni la base. Sans ville, `base` = Σ des totaux. Le texte rendu contient `base` et passe la garde EXAM_CLAIM. | corpus avec et sans ventilation par ville, ville `Alle` | dénominateur = `centers[ville].n` (182 à Stuttgart) au lieu de la base ventilée |

---

## 9. Migration Dexie — ce qui est ajouté, dérivé, abandonné

| Élément | Action |
|---|---|
| `training_events` | **ajouté** (v5), projection reconstructible |
| `day_plans` | **ajouté** (v5), source locale + `plan.materialized` |
| `case_progress` | **ajouté** (v5), projection de `training_events` |
| `db.plan`, `PlanEntry` | **abandonnés** — `plan: null` en v5. Table morte : seed de démo (`seed.ts:127,152`), vidée à la connexion (`auth/session.ts:145`). Retirer aussi de `wipeDatabase()` et de `seed.ts`. |
| événement `plan.done` | **retiré** de `ProgressEventType` — déclaré, jamais émis, seuls les tests le citent |
| `db.simulations` | **conservé** : source de la dérivation §2.3 et de l'historique existant. Index ajouté : `'id, caseId, date, role, profileId, teil'`. |
| `db.progress_events`, `db.outbox` | **inchangés** |
| `ProgramAdjust.doneLayers` / `.postpone` / `.extras` | **abandonnés** : remplacés par `TaskInstance.doneAt` et par `replanifier()`. `skipDrillDates` abandonné (un jour non matérialisé n'a pas de drill). |
| `ProgramBlock` | **remplacé** par `TaskInstance`. `ProgramDay` remplacé par `DayPlan`. |
| `ExtraTask` | **abandonné** : une tâche ajoutée à la main est une `TaskInstance` ordinaire posée par `replanifier()`. |
| `Case.confidence/status/layerProgress/lastSimulationId` | **dépréciés**, plus écrits (§4.1). Pas de suppression de colonne : `db.cases` est du contenu publié. |

Migration serveur REQUISE : la contrainte `progress_events_type_check` et la fonction `events` gagnent les trois types
(`20260930000017_training_journal_events.sql`, `plan.done` conservé) — déployées AVANT le client.

---

## 10. Tests de contrat à écrire (C1 / C6)

| Fichier | Ce qu'il prouve |
|---|---|
| `app/src/lib/program/dayPlan.test.ts` | INV-1, INV-8, INV-9 |
| `app/src/lib/program/select.test.ts` | INV-4 sur les 130 cas réels ; `diversityRelaxed` seulement sur pool épuisé |
| `app/src/lib/program/progress.test.ts` | INV-3, INV-11 ; table de vérité complète des quatre `TeilStatus` |
| `app/src/lib/journal/projection.test.ts` | INV-5, INV-6, INV-10 ; dérivation §2.3 idempotente |
| `app/src/lib/sync/planMaterialized.test.ts` | INV-7 (premier `occurred_at` gagne) |
| `app/tests/parcours14j.test.ts` (C6) | INV-2, INV-12 + le candidat synthétique 14 jours |

Porte mécanique : ces tests sont dans le job existant ; ils tournent **sans
`.env`** (mocker `@/lib/supabase`).

*[S4]* — écrits **avant** le code, avec la mutation de chaque ligne vérifiée
rouge :

| Fichier | Ce qu'il prouve |
|---|---|
| `app/src/lib/program/tacheDeCas.test.ts` | INV-50, INV-51, INV-52, INV-58 ; `teileDeTache` et `statutTache` en table de vérité |
| `app/src/lib/program/plansAnciens.test.ts` | INV-54 sur la fixture gelée série 3 |
| `app/src/lib/program/memePlan.test.ts` | INV-55, INV-57 |
| `app/src/lib/journal/etatCas.test.ts` | INV-53, INV-56, INV-61, INV-62 ; table de vérité de l'échelle `etat` |
| `app/src/lib/program/consolidation.test.ts` | INV-60 |
| `app/src/lib/program/erreurs.test.ts` | INV-63 |
| `app/src/lib/program/durees.test.ts` | INV-64 |
| `app/src/lib/program/rythme.test.ts` | INV-65 |
| `app/src/lib/program/couverturePonderee.test.ts` | INV-66, garde EXAM_CLAIM sur le texte |
| `app/tests/parcours14j.test.ts` (C6 réécrit) | nouveau profil « un Teil ici, un cas entier là » : INV-1, 2, 4, 9, 10, 12 et INV-50 à INV-58, chaque soir |

---

## 11. Contradictions relevées entre sources — non tranchées en silence

1. **`simScope.ts` se contredit lui-même.** L'entête (`:5-8`) écrit « une session
   d'UN Teil … ne fait pas évoluer la maîtrise du cas » ; le docstring de
   `caseMastery` (`:25-28`) écrit « Toute session fait donc avancer le cas » ; le
   code (`:42`) divise par 3 en toutes circonstances. Trois règles dans un
   fichier. **Tranché ici par l'architecture** (§4.1) : il n'y a plus de score
   agrégé par cas, donc plus de règle à choisir. Aucune des trois ne survit.
2. **`ProgramConfig.strategy` vs mode d'avancement.** `strategy: 'teil-first' |
   'full'` existe déjà et n'a que deux valeurs ; le dossier §4.2(f) en demande
   quatre. **Tranché ici** : `modus` remplace `strategy`, avec la lecture
   tolérante §6. Ce n'est pas une décision produit — la sémantique des deux
   valeurs existantes est préservée.
3. *[S4]* Les contradictions de la série 4 (Q1, ADR-0020, budget contre cas
   entier, INV-55 rouge sur le code actuel, solide stable contre frise,
   historique non enchaîné, fréquences par ville partielles, etc.) sont tenues
   dans **un seul registre** : ADR-0021, « Contradictions relevées ».

---

## 12. *[S4]* Le cas entier — tâche de cas, complétion, mesure, cadran

> ADR-0021. Le candidat voit des cas, jamais des fractions de cas ; le plan sait
> au Teil près ce qui reste.

### 12.1 La tâche de cas

```ts
/** Lecture tolérante — LE SEUL point qui lit `teil`. */
export function teileDeTache(t: TaskInstance): SimTeil[] {
  if (t.teile?.length) return t.teile;
  if (t.teil) return [t.teil];                                     // plan série 3
  return ['simulation', 'revision', 'examen-blanc'].includes(t.kind) ? [...TEILE] : [];
}
```

- Une tâche `simulation` porte `teile` = les Teile **non `solide`** du cas
  au moment du plan (vierge, fragile ou acquis), dans l'ordre d'examen. C'est
  la dette de §4.3, rendue explicite. **Un Teil fragile revient dans la tâche
  du cas, jamais en tâche à part.**
- `revision` (consolidation, §13.1) et `examen-blanc` portent les trois Teile.
- Une tâche de cas dont `teile.length === 1` reste une **tâche de cas**. Elle
  s'affiche comme le cas (cadran, nom), avec « il te reste la
  Dokumentation ». Elle ne s'affiche jamais comme « Dokumentation de X ».
- `label` = le nom du cas (ADR-0020 §8). Le texte « il te reste … · N min »
  se **lit** depuis `teile` et `estMin` : il n'est jamais concaténé dans
  `label` ni dans `reason`.
- `estMin` = Σ `dureeTeil(t)` sur `teile` (§13.4).
- `TaskInstance.teil` n'est plus jamais écrit (INV-50).

### 12.2 La règle de complétion

```ts
teileJouesLeJour(date, caseId) = ⋃ e.teile  pour e : e.caseId === caseId,
                                 dayKey(e.at) === date, !isCocheNue(e)
avancement(T)  = teileDeTache(T) ∩ teileJouesLeJour(T.date, T.caseId)
faite(T)       = T.dUnTrait
                   ? ∃ e enchaîné du cas, dayKey(e.at) === T.date
                   : avancement(T) ⊇ teileDeTache(T)
statutTache(T) = faite ? 'faite' : avancement(T).length > 0 ? 'entamee' : 'a-faire'
```

- **Une tâche de cas est faite quand tout ce qui restait au moment du plan est
  joué**, dans une ou plusieurs parties du même jour, dans n'importe quel ordre.
  Le `taskId` est posé sur l'événement qui **complète** l'ensemble (§3.4). Les
  parties précédentes restent `libre` : elles alimentent l'avancement,
  qui est dérivé et jamais stocké.
- « Joué » ne dépend pas du score. Une séance `selbstbewertet` joue son Teil
  d'ancrage (règle série 3 inchangée : `teileJouesLeJour` n'exclut que les
  coches nues).
- **Aucun état « manquée ».** `planProgress` rend `{ faites, entamees, total }`.
  Une tâche entamée et non finie à minuit n'est **ni** manquée **ni** en
  retard. Son reste peut revenir le lendemain (§12.7).
- La coche manuelle (`markTaskDone`) d'une tâche de cas déclare
  `teileDeTache(T)`, comme la série 3 (I-4).
- Report entre appareils (D-I2, `journal.ts:184`) : l'équivalence de tâche
  devient `kind`, `caseId` **et** `teileDeTache` égaux.
- **Limite connue** : après `replanifier()` en cours de journée, un Teil joué
  le matin compte pour la tâche replanifiée du même cas. Cette limite est
  acceptée : le jour reste l'unité du plan.

### 12.3 Construction du plan — ce qui change dans `buildTasks`

Ordre inchangé : drill → (dernière ligne droite) examen à blanc → cas →
Fachwissen. Ce qui change :

1. `SelectContext.now` = **début du jour `date`**. `counts(begriffe, …)` lit
   la **fin** du jour `date`. Aucune lecture de l'instant de matérialisation
   n'entre dans le contenu du plan (INV-55). L'instant reste dans `seed` et
   `materializedAt`.
2. **La première tâche de cas est toujours posée** si un candidat existe, même
   si son `estMin` dépasse le budget. Les suivantes respectent
   `used + estMin ≤ targetMin` (INV-58).
3. C1/C2 (§5.2) s'appliquent à **toutes** les tâches portant une `specialty`,
   dans tous les modes sauf `specialite` (INV-4 amendé).
4. Les candidats incluent les cas solides **dus** pour consolidation (§13.1).
5. Dans la dernière ligne droite (`taperDays`), la tâche `examen-blanc`
   choisit d'abord un cas `solide` et non `prêt`, de `freq ≥ SEUIL_FREQUENT`,
   par fréquence décroissante. À défaut, elle prend le meilleur classé. Elle
   porte `dUnTrait: true`.

### 12.4 Le mode, observé en silence

```ts
modeEffectif(journal) = observeModus(journal, cases) ?? 'cas-complet'
```

- Calculé à la matérialisation et figé dans `DayPlan.mode`, dont l'enum ne
  change pas (le schéma serveur de `plan.materialized` est `.strict()`).
- `ProgramConfig.modus` et `ProgramConfig.strategy` ne sont **plus lus** et ne
  sont plus écrits par l'interface (dépréciés, conservés dans les données).
  `modusAProposer` et la clé de refus sortent de l'interface.
- `observeModus` est étendu pour rendre aussi `teilHabituel` (le Teil dominant
  qui justifie `teil-first`). Ses seuils sont inchangés (`modus.ts:21-26`).

| Mode observé | Effet sur la sélection, et rien d'autre |
|---|---|
| `cas-complet` (et défaut) | aucun filtre |
| `teil-first` | les candidats sont restreints aux cas dont `teilHabituel` n'est pas `solide`, **si** ce sous-ensemble n'est pas vide. La tâche reste un cas, avec tous ses Teile restants. La durée suit l'habitude (§13.4). |
| `specialite` | filtre sur la spécialité de plus forte dette (§6) ; C1/C2 suspendues |
| `examen-blanc` | inchangé (§6) |

### 12.5 Couverture, maîtrise, échelle d'états du cas

```ts
export type CaseEtat = 'vierge' | 'entame' | 'couvert' | 'solide' | 'pret';

export interface CaseProgress {
  caseId: CaseId;
  teile: Record<SimTeil, TeilProgress>;
  couverture: 0 | 1 | 2 | 3;           // Teile avec attempts ≥ 1 (MESURÉS)
  maitrise: number | null;             // 0..100, arrondi ; null ⇔ couverture === 0
  etat: CaseEtat;
  pretAt: number | null;               // la soudure : `at` de l'enchaînement qui fonde `prêt`
  solideDepuis: number | null;         // §13.1
  prochaineConsolidation: string | null; // yyyy-MM-dd, §13.1 ; null si etat ∉ {solide, pret}
  overall: 'vierge' | 'entame' | 'solide'; // DÉPRÉCIÉ, dérivé de etat (§4.1 [S4])
}
```

```
couverture = |{ t : teile[t].attempts ≥ 1 }|
maitrise   = couverture === 0 ? null : round(moyenne des teile[t].lastScore pour attempts ≥ 1)
etat       = couverture === 0                                → 'vierge'
             couverture < 3                                  → 'entame'
             ∃ t : status ≠ 'solide'                         → 'couvert'
             ∃ e enchaîné, 3 scores ≥ PART_SOLIDE (INV-56)   → 'pret'
             sinon                                           → 'solide'
```

- **Couverture et maîtrise sont deux mesures.** Un cas inachevé ne baisse
  jamais la maîtrise (INV-53). La maîtrise est une moyenne **des Teile joués**
  et jamais un pourcentage du cas (`CONTEXT.md`).
- La maîtrise lit `lastScore`, pas `status` : une Anamnese à 85 non encore
  confirmée affiche 85, avec l'état `acquis` (§13.2).
- Les séances `selbstbewertet` n'entrent ni dans la couverture ni dans la
  maîtrise (INV-11). `nonMesureAt` les signale à part.
- `prêt` exige que le cas soit **encore** solide : un Teil qui retombe défait
  la soudure, et `pretAt` repasse à `null`.

### 12.6 Le contrat de données du cadran (`CaseDial`)

Le cadran **lit** une valeur et ne calcule rien. Il ne lit jamais
`db.simulations` ni le journal brut.

```ts
export interface CaseDialData {
  caseId: CaseId;
  teile: Record<SimTeil, {             // position FIXE par clé : anamnese, dokumentation, fallvorstellung
    status: TeilStatus;                // couleur : vierge neutre, fragile, acquis, solide
    lastScore: number | null;
    lastAt: number | null;
    nonMesure: boolean;                // estNonMesure(), journal.ts:408
  }>;
  couverture: 0 | 1 | 2 | 3;           // anneau extérieur
  maitrise: number | null;             // centre ; null → aucun chiffre, jamais « 0 »
  soude: boolean;                      // etat === 'pret' : arcs soudés en anneau continu
  pretAt: number | null;
  prochaineConsolidation: string | null;
  tache?: { teile: SimTeil[]; avancement: SimTeil[] };  // taille « ligne de tâche » : le cadran de LA TÂCHE
  vientDEtreJoue?: SimTeil[];          // fin de partie / retour liste : arcs à dessiner une fois
}

dialData(cp: CaseProgress, ctx?: { tache?: TaskInstance; avancement?: SimTeil[]; lauf?: Lauf }): CaseDialData
```

- **Une seule source** : `case_progress` (projection) + la tâche figée + le
  `Lauf` en fin de partie. `vientDEtreJoue` = `lauf.teileGespielt` limité aux
  `SimTeil`.
- Les quatre tailles (carte de cas, ligne de tâche, pré-simulation, fin de
  partie) lisent **le même** `CaseDialData`. Le rendu est hors contrat.
  `CaseDial` vit dans `components/visuals/`, et la règle B de
  `motionSafe.test.ts` (préfixe `motion-safe:`) s'y applique.
- Étiquette accessible : se dérive de `CaseDialData` seul (état, couverture,
  maîtrise, Teile). La couleur n'est jamais le seul signal.

### 12.7 « Finir hier » — le reste revient en tête, proposé

Le rattrapage (`rattrapage.ts`, Q4) est amendé ; le reste est inchangé
(dernier jour figé seulement, refus retenu, drill exclu, cas déjà planifié
aujourd'hui exclu) :

- Une tâche **entamée** de la veille est proposée avec
  `teile = teileDeTache(T) \ avancement(T)`, avec la raison « Finir <cas> ».
  Une tâche **à faire** est proposée avec `teileDeTache(T)`. Une tâche
  série 3 à `teil` devient une tâche de cas : `teile = [teil]`, sans `teil`.
- `accepterRattrapage` insère les reprises **avant la première tâche non
  faite** du jour (en tête), par `plan.replanned` (raison `rattrapage`). Avant
  le geste, rien ne bouge (INV-52).

### 12.8 Les fréquences dans les encarts

Une phrase de fréquence (« revient souvent dans les protocoles de ta ville »)
n'est rendue que si elle nomme sa base (« … dans 11 des 182 protocoles de
Stuttgart ») et passe la garde EXAM_CLAIM. Source et ville : §13.6. Sans
donnée, la phrase n'est pas rendue : le texte ne fait jamais de repli
générique.

### 12.9 Synchronisation et compatibilité

- **Aucune migration SQL, aucun type d'événement nouveau.** `teile`, `rappel`
  et `dUnTrait` voyagent dans `plan.materialized`/`plan.replanned`, que le
  serveur laisse passer (`Tasks … .passthrough()`, `events/index.ts:25-28`).
  `enchaine` voyage dans `simulation.completed`, sans schéma serveur.
- **Proposé** (Fondations, non requis) : ajouter
  `teile: z.array(Teil).max(3).optional()` au schéma `Tasks`. À la lecture,
  le client filtre `teile` sur les trois clés connues, comme `sanitizeLogged`.
- Client série 3 face à un plan série 4 : une tâche sans `teil` y exige les
  trois Teile. Il ne coche jamais à tort, et ne décoche jamais : `doneAt` se
  dérive du journal.
- Dexie : aucune version nouvelle. `case_progress` et `training_events` sont
  des projections reconstruites (`rebuildJournal`) avec leurs nouveaux champs.

---

## 13. *[S4]* Le cerveau du programme

> ADR-0022. Paramètres **nommés**, un seul endroit chacun
> (`app/src/lib/program/parametres.ts`, à créer). Toute valeur en dur ailleurs
> est un défaut de contrat.

| Paramètre | Valeur | § |
|---|---|---|
| `CONSOLIDATION_JOURS` | `[7, 21, 45]` (plafond : le dernier) | 13.1 |
| `POIDS_CONSOLIDATION` | `1/3` | 13.1 |
| `SEUIL_FREQUENT` | `0.5` (de `freq`, déjà le seuil de `pourquoiAujourdhui`) | 13.1, 12.3 |
| `SOLIDE_ECART_JOURS` | `3` (jours calendaires, `dayKey`) | 13.2 |
| `ERREUR_FENETRE` / `ERREUR_SEUIL` / `ERREUR_CAS_MIN` | `5` / `3` / `2` | 13.3 |
| `DUREE_FENETRE` / `DUREE_MIN_MESURES` / `DUREE_BORNES` | `10` / `3` / `[5, 45]` min | 13.4 |
| `RYTHME_FENETRE_JOURS` / `RYTHME_SEUIL` / `RYTHME_MIN_JOURS` / `BUDGET_PLANCHER_MIN` | `7` / `0.6` / `3` / `20` | 13.5 |

### 13.1 Consolidation espacée

```
solideDepuis           = at de l'événement qui a fait passer les 3 Teile à 'solide'
                         (le plus récent passage) ; null si etat ∉ {solide, pret}
k                      = nombre de jours calendaires distincts, STRICTEMENT après dayKey(solideDepuis),
                         portant ≥ 1 partie mesurée du cas
dernierJeu             = max(teile[t].lastAt)
prochaineConsolidation = dayKey(dernierJeu) + CONSOLIDATION_JOURS[min(k, 2)] jours
dû(c, date)            = etat ∈ {solide, pret} ∧ date ≥ prochaineConsolidation
score(c) [cas dû]      = freq × urgence × POIDS_CONSOLIDATION × fraicheur
score(c) [solide non dû] = 0
```

- La tâche est `kind: 'revision'`, avec les trois Teile et la raison
  « Consolidation : vu il y a N jours ». Elle se coche par §12.2.
- Une partie d'un seul Teil compte pour un passage (k + 1). Limite connue :
  rafraîchir un Teil repousse l'échéance du cas entier.
- Dernière ligne droite : une `revision` d'un cas de `freq ≥ SEUIL_FREQUENT`
  porte `dUnTrait: true`. Les cas solides non `prêt` passent par la tâche
  examen à blanc (§12.3.5).

### 13.2 Solide stable

Automate par Teil, appliqué dans l'ordre chronologique des événements mesurés
(non `selbstbewertet`, score présent) :

```
s = score de l'événement ; avant = status courant
si avant === 'solide' :
    s ≥ 80 → 'solide'
    s < 80 → 'acquis'                        // un cran, quel que soit s (INV-62)
sinon :
    s < 60 → 'fragile'
    s < 80 → 'acquis'
    s ≥ 80 → ∃ réussite antérieure ≥ 80 sur ce Teil avec
             dayKey(s.at) − dayKey(antérieure.at) ≥ SOLIDE_ECART_JOURS
             ? 'solide' : 'acquis'
```

`attempts`, `lastScore` et `lastAt` sont inchangés (§4.1). INV-3 tient
toujours. `pointFaible` (= `fragile`) ne change pas de définition.

### 13.3 Erreurs transversales

- **Source** : `TrainingEvent.manques` (§2.3), c'est-à-dire les ids sémantiques
  stables de `ChecklistItem` (`anam-allergien`…, `simulation-run.md` §4).
  **Jamais** `prioritizedCorrections`. La grille de langue n'entre pas ici :
  limite connue.
- **Fenêtre** : par Teil `t`, les `ERREUR_FENETRE` dernières parties
  **mesurées** où `t` a été joué, tous cas confondus.
- **Signal** : un item est récurrent s'il est manqué dans
  `≥ ERREUR_SEUIL` parties de la fenêtre, sur `≥ ERREUR_CAS_MIN` cas
  distincts.

```ts
erreursTransversales(events): { itemId: ChecklistItemId; teil: SimTeil; manque: number; sur: number }[]
  // tri : manque décroissant, puis itemId
```

- **Sortie, tâche** : à la matérialisation, chaque tâche de cas reçoit au plus
  un `rappel`, la première erreur dont le `teil` appartient à
  `teileDeTache(T)`, sans doublon dans le jour. Le libellé se lit depuis
  `checklistFor(teil)`, jamais figé en texte. Exemple : « Cette fois : pense
  aux Allergien ».
- **Sortie, bilan** : en `bilanz(t)`, pour chaque erreur active de `t` :
  « cochée cette fois » ou « encore manquée (n/5) ». Le point disparaît de
  lui-même quand il repasse sous le seuil. Aucun état n'est stocké.

### 13.4 Durées apprises

```
mesures(t) = les DUREE_FENETRE derniers TrainingEvent.minutesParTeil[t] > 0, hors selbstbewertet
dureeTeil(t) = |mesures(t)| < DUREE_MIN_MESURES ? TEIL_MIN[t]
             : clamp(médiane(mesures(t)), DUREE_BORNES)
```

`TEIL_MIN` (20/20/12) devient le repli, et `SIM_MIN` (40) disparaît. Un run
complet vaut Σ `dureeTeil`, soit 52 min par défaut (ADR-0021, contradiction 5).

### 13.5 Rythme proposé

```
fenêtre   = les RYTHME_FENETRE_JOURS jours calendaires finissant hier
figés     = jours de la fenêtre ayant un DayPlan
propose   ⇔ |figés| ≥ RYTHME_MIN_JOURS
            ∧ Σ spentByDay(figés) < RYTHME_SEUIL × Σ DayPlan.targetMin(figés)
            ∧ semaine ISO courante non refusée
valeur    = max(BUDGET_PLANCHER_MIN, arrondi à 5 min (Σ spentByDay(figés) / |figés|))
            et seulement si valeur < dayTargetMin(config)
```

- **Proposé, jamais imposé** : une carte sur la page Programme, avec deux
  gestes. `accepterRythme(valeur)` écrit
  `hoursPerSession = valeur / 60 / INTENSITY_FACTOR[intensity]` par
  `program.configured`. `refuserRythme()` retient la semaine ISO
  (`db.meta['rythmeRefuse']`, local).
- Aucun `DayPlan` figé ne change. Les jours projetés (`projectedDays`) et
  le budget des jours suivants suivent la config. La frise de trajectoire
  dépend du gain réel et non du budget : elle n'a rien à recalculer.

### 13.6 Couverture pondérée par la fréquence

```ts
couverturePonderee(cases, progress, freqs, ville?: Center):
  { pct: number | null; base: number; ville: Center | null }

poids(c)  = ville ? freqs[c].parVille[ville] : freqs[c].total      // undefined ⇒ le cas est HORS calcul
base      = Σ poids(c)            sur les cas où poids défini
pct       = base === 0 ? null : round(100 × Σ poids(c) × couverture(c)/3 / base)
```

- **Source** : `apps/site/src/data/frequencies.json` (généré depuis
  `ANALYSE.md` §3, sept invariants dans `check-frequencies.mjs`), avec
  `pathologies[].total` et `byCenter`. **Proposition au pôle Contenu** :
  publier côté app, avec le contenu, une table
  `FrequenceProtocoles { caseId; total: number | null; parVille: Partial<Record<Center, number>> }`,
  rapprochée par `Case.pathology` → `pathologies[].id`, et validée en CI.
  Tant qu'elle n'existe pas, `freqs[c].total = Case.frequency` et
  `parVille = {}`.
- **Ville** : `targetCenter` (`store/ui.ts:49`). `'Alle'` ou `'Complément'`
  ⇒ pas de ville. Avec une ville **sans donnée ventilée**, la ville est
  ignorée : `ville: null`, base « tous centres ». Jamais un pourcentage de ville
  sur une base vide.
- **Texte** : « Les cas que tu as travaillés représentent {pct} % des {base}
  protocoles {de Stuttgart | des quatre centres} rattachés à un cas. » Aucune
  formule du type « ce que le jury note », « ce qui tombe à coup sûr » (garde
  EXAM_CLAIM, mémoire `fsp-official-grading`).
- **Le plan ne lit ni la ville ni `couverturePonderee`** : la ville est un
  réglage local non synchronisé (INV-55). La sélection garde `freq` sur
  `Case.frequency`.
