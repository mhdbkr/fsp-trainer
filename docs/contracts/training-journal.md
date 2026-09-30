# Contrat — Journal d'entraînement, plan du jour figé, progression par Teil

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Sources mesurées : `app/docs/reports/audit-programme-serie3.md`,
> `app/docs/reports/audit-simflow-serie3.md`,
> `docs/superpowers/specs/2026-09-30-serie3-analyse-et-chantiers.md` §4 et §6.2.
> Consommé par : C1 (programme & historique), C2 (simulation), C3 (pont IA), C6 (harnais).

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

Chacune a un **comportement provisoire** : l'implémenteur l'applique tel quel
tant que la réponse n'est pas écrite dans ce fichier. Aucun de ces comportements
provisoires n'est une décision produit : ce sont des no-op conservateurs.

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q1** | Quel `Fortschrittsmodus` est le **défaut** quand le candidat n'a jamais répondu, et **à quel moment** la question lui est posée (onboarding / première ouverture du programme / jamais) ? | `mode = 'teil-first'` (c'est la seule valeur déjà présente dans `ProgramConfig.strategy`), **jamais demandé**. Un écran de choix n'est pas construit tant que Q1 n'est pas tranchée. |
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
```

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
  teil?: SimTeil;              // absent = run complet
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
| **INV-11** | `selbstbewertet === true` ⇒ le `CaseProgress` du cas est inchangé par cet événement. | séances IA externe |
| **INV-12** | `taperLen` et toute fenêtre de phase se calculent sur la **date d'examen**, jamais sur les jours restants : la phase d'un jour figé ne change plus. (corrige `program.ts:35-37,136`) | horloge avancée d'un jour |

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
