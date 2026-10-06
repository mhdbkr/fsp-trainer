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
>
> **Amendé — S4-6 (6 oct. 2026)** · `lead-s4-6` : §14 (séances de l'Historique) et
> la table locale `termes_cherches` au §9. Décrit ce qui est livré, sans changer les sections antérieures.

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

Chacune a un **comportement provisoire** : l'implémenteur l'applique tel quel
tant que la réponse n'est pas écrite dans ce fichier. Aucun de ces comportements
provisoires n'est une décision produit : ce sont des no-op conservateurs.

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q1** | Quel `Fortschrittsmodus` est le **défaut** quand le candidat n'a jamais répondu, et **à quel moment** la question lui est posée (onboarding / première ouverture du programme / jamais) ? | **Tranchée** — d'abord en « déduit puis proposé » (30 sept., `modus.ts:1-10`), puis *[S4]* en **« observé, jamais proposé ni demandé »** (direction, 4 oct., ADR-0021). Mode du jour = `examen-blanc` ou `specialite` s'ils sont choisis explicitement, sinon le mode observé, qui vaut `cas-complet` ou `teil-first` (§12.5, décision I8 de `main`). |
| **Q2** | « Replanifier » réécrit-il **le jour courant seulement** ou **le jour courant et tous les jours futurs déjà matérialisés** ? | Le jour courant seulement. Aucun jour futur n'est matérialisé d'avance (§3.1). |
| **Q3** | Une séance **auto-déclarée** (IA externe, entraînement hors app) compte-t-elle dans l'indice de préparation et la série (streak) **au même titre** qu'une séance jouée dans l'app ? | Elle entre dans l'historique et dans le temps investi ; elle **n'entre pas** dans l'indice de préparation ni dans les scores par axe. `TrainingEvent.selbstbewertet = true` la marque. |
| **Q4** | Le rattrapage d'un jour manqué est-il **proposé** (accord explicite) ou **ignoré** ? | **Tranchée — proposé, jamais imposé** (direction, 4 oct. 2026, FB3-D10, jugement C6 point 6 ; mis en œuvre par le lot C6-B). Au retour après un jour manqué, une ligne discrète dit « N jours manqués : X et Y ont glissé », avec **[Rattraper]** / **[Laisser]**. N compte les jours **ouvrés** du programme sans plan entre le dernier jour figé et aujourd'hui (un jour off n'est pas manqué). X et Y sont les tâches non faites du dernier jour figé. Rien ne s'accumule en silence, aucun jour n'est matérialisé rétroactivement, et le vocabulaire est « manqués / ont glissé », **jamais « en retard »**. Rattraper : §12.8. |

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
  enregistreA?: number;        // [S4-3 fixeur M5] epoch ms de l'enregistrement : `occurred_at` de `simulation.completed`
                               // (posé seulement s'il suit `at`) ; lu par la complétion (§12.3), jamais par la mesure
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
  examen?: true;               // conditions d'examen : enchaîné + Autonome + ordre A→D→F + grilles saisies (§12.6)
  examenManque?: ConditionExamen[]; // conditions d'examen NON remplies (§2.3) ; présent ⇔ simulation série 4 ; [] ⇔ examen
  minutesParTeil?: Partial<Record<SimTeil, number>>; // durée mesurée par Teil (§13.4)
  manques?: Partial<Record<SimTeil, ChecklistItemId[]>>; // items NON cochés par Teil joué (§13.3)
}

export type ConditionExamen = 'enchaine' | 'autonome' | 'ordre' | 'grille';
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
| `plan.replanned` | `yyyy-MM-dd` | `{ tasks: TaskInstance[], reason: 'manuel' \| 'rattrapage' }` — *[S4]* `'rattrapage'` est écrit par `accepterRattrapage` (Q4, FB3-D10, 4 oct.) | remplace `day_plans[date].tasks` — dernier `occurred_at` gagne, bat toujours `plan.materialized` |
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
  [S4]  .at           = sim.date = Lauf.startedAt pour une simulation série 4 (m5 : le jour d'une partie = celui de son début)
        .kind         = conditionsExamen(sim) ? 'examen-blanc' : 'simulation'   (série 4 ; règle série 3 pour les anciennes)
        .spentMin     = round((sim.dauerGesamtSec ?? Σ parts[t].durationSec) / 60)   // m6 : le Teil abandonné compte
        .enchaine     = sim.enchaine === true && teile.length === 3 && !selbstbewertet ? true : absent
        .examen       = série 4 ∧ conditionsExamen(sim) ? true : absent
        .examenManque = série 4 ? conditionsManquantes(sim) : absent        // [] ⇔ examen === true
        .minutesParTeil = { t: round(parts[t].durationSec / 60) } pour chaque t joué, si durationSec > 0
        .manques      = { t: ids des items de parts[t].checklist avec checked === false } pour chaque t joué
                        dont la checklist est non vide et ne porte AUCUN id legacy `cl-N` ;
                        absent si selbstbewertet ; absent si aucun Teil ne qualifie
```

*[S4]* **Ids legacy `cl-N` et `manques`** (décision de `main`, 4 oct.,
contradiction 3 du rapport S4-1). La dérivation lit les ids **bruts** de
`sim.parts[t].checklist`, **avant** toute traduction. Une checklist dont un id
correspond à `/^cl-\d+$/` (`LEGACY_ID_PATTERN`) ne donne **pas** de
`manques[t]` : la partie n'est pas une `partieAvecChecklist` pour ce Teil
(§12.3), et elle n'entre ni dans les erreurs transversales (§13.3) ni dans
INV-63. La traduction « à la lecture » de `simulation-run.md` §4.4 vaut pour
l'**affichage** de l'historique, jamais pour le journal. Une fois traduits, les
ids ne disent plus qu'ils étaient legacy, et une checklist reconstruite
décochée signalerait tout. Code : `journal.ts` (`trainingEventFromSimulation`).

*[S4]* **`examenManque`** (ajout S4-1, accepté par `main` le 4 oct.). C'est la
liste ordonnée `enchaine`, `autonome`, `ordre`, `grille` des conditions **non**
remplies, par `conditionsManquantes(sim)` (`lib/examen.ts`). Cette fonction est
la seule source de `conditionsExamen`, qui vaut `conditionsManquantes(sim).length === 0`.
Le champ est présent **si et seulement si** la simulation est série 4. Une
ancienne partie n'en a pas : elle n'est jamais un run candidat à la soudure
(décision (e)). Comme `enchaine` et `examen`, il ne passe jamais par
`training.logged`. C'est la source de `CaseProgress.pretManque` (§12.6).

```ts
conditionsManquantes(sim): ConditionExamen[]   // dans cet ordre, chacune si non remplie :
  'enchaine' : ¬(sim.enchaine === true ∧ sim.mode !== 'external-ai' ∧ les 3 parts done)
  'autonome' : sim.assistance !== 'autonome'
  'ordre'    : sim.reihenfolge?.join() !== 'anamnese,dokumentation,fallvorstellung'
  'grille'   : ¬(grilleSaisie(parts.anamnese.languageGrid) ∧ grilleSaisie(parts.fallvorstellung.languageGrid))
```

```ts
/** UNE définition des conditions d'examen (décision (b) de la direction), partagée par
 *  `kind: 'examen-blanc'` et par l'état `prêt` (§12.6). Code : `lib/examen.ts`. */
conditionsExamen(sim) = conditionsManquantes(sim).length === 0
  // ⇔ sim.enchaine === true && sim.mode !== 'external-ai' && les 3 parts done
  //   && sim.assistance === 'autonome'
  //   && sim.reihenfolge?.join() === 'anamnese,dokumentation,fallvorstellung'
  //   && grilleSaisie(sim.parts.anamnese?.languageGrid)
  //   && grilleSaisie(sim.parts.fallvorstellung?.languageGrid)

/** Grille saisie = les CINQ critères nommés (`LANGUAGE_CRITERIA`) notés. La sentinelle −1
 *  n'est pas une note, 0 en est une. `languageGridEntered` seul ne suffit pas : il vaut
 *  `true` sur un objet vide. */
grilleSaisie(g) = languageGridEntered(g) && LANGUAGE_CRITERIA.every(c => isEntered(g[c.key]))
```

*[S4]* **« Grille saisie »** (décision de `main`, 4 oct., point 5 du rapport
S4-1) : les **cinq** critères nommés sont notés. C'est la même règle que le
score depuis C6-A, où la langue ne compte qu'une fois les cinq critères notés.
Une grille partielle ne remplit pas la condition `grille`.

*[S4]* **Discriminant série 4 (m-e)** : une `Simulation` est « série 4 » si et
seulement si `reihenfolge` est présent. Pour elle, `kind` vaut
`conditionsExamen(sim) ? 'examen-blanc' : 'simulation'`. Sinon, la règle
série 3 s'applique au genre (`isExamenBlanc`). Une `Simulation` antérieure n'a
ni `enchaine` ni `reihenfolge`. Elle n'est **jamais** enchaînée
rétroactivement (ADR-0021, contradiction 12, et
décision (e)), et son `kind` reste calculé par la règle série 3
(`isExamenBlanc`, `journal.ts:40-42`). La couche n'entre plus dans les
conditions d'examen (décision (d)). Les trois champs
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
  dUnTrait?: true;             // [S4] ne se coche que par une partie enchaînée (§12.3, §13.1)
  creeA?: number;              // [S4] instant de création de la tâche (§12.1) ; absent = début du jour
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
  tz?: string;                 // [S4] fuseau IANA de l'appareil qui a matérialisé ; bornes du jour (§12.4, m11)
}
```

### 3.2 Matérialisation

- Le `DayPlan` d'un jour est créé **une fois**, à la **première ouverture de
  l'app ce jour-là**, et jamais ailleurs.
- **Aucun jour futur n'est matérialisé.** Le calendrier affiche une projection
  non figée, marquée comme telle ; elle n'a pas d'identité et ne se coche pas.
- Le passé n'est jamais matérialisé rétroactivement : un jour sans `DayPlan`
  est un jour où l'app n'a pas été ouverte. Il s'affiche vide, jamais « en
  retard ». *[S4]* Au retour, il est **compté** dans la ligne « N jours
  manqués : X et Y ont glissé » (Q4, décision du 4 oct., FB3-D10). Il n'est
  pas matérialisé pour autant ; ce qui peut être repris vient du dernier jour
  figé, et seulement sur [Rattraper].
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

*[S4]* **Remplacé par §12.3.** `doneAt` ne se pose plus à l'écriture : il se
**dérive** à la projection, du journal synchronisé (décision I4 de `main`).
Tout ce que fait l'écriture, c'est consigner le `taskId` à titre informatif.
Le genre de l'événement ne compte pas (I3). La complétion cumule les Teile
joués depuis la création de la tâche. La série 3 appliquait déjà ce cumul
aux tâches sans `teil` (`completeAssez`, `journal.ts:346-347`).

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
`solideDepuis` et `prochaineConsolidation` (§12.6). `overall` est **déprécié**
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

*[S4-1]* **Amendé** (décision de `main`, 5 oct., P1 de la revue pédagogique de
S4-1). Un Teil **« à confirmer »** (§13.2) ne pèse plus comme un Teil jamais
travaillé :

```
detteTeil(cp, jour) = Σ_t poids(t, jour) / 3                      ∈ [0, 1]
poids(t, jour)      = status === 'solide'          ? 0
                    : aConfirmer(teile[t], jour)   ? POIDS_CONSOLIDATION
                    : 1
```

`jour` (`yyyy-MM-dd`) est **le jour du plan**. Le défaut `dayKey(now())` ne
sert qu'aux appelants de transition. **S4-2 le passe explicitement** : c'est
le déterminisme I1, où le plan de D dépend de D et jamais de l'instant de
matérialisation (INV-55). Code : `journal.ts` (`detteTeil`). S4-2 remplace
cette forme par §12.2 (`restePlan`), avec le même poids.

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
detteTeil(c) = §4.3                               ∈ [0, 1]   ([S4-1] un Teil « à confirmer » pèse POIDS_CONSOLIDATION)
fraicheur(c) = jamais joué ? 1
               : clamp(joursDepuisDernierJeu / 14, 0.2, 1)  ∈ [0.2, 1]
```

- `detteTeil === 0` ⇒ `score === 0` ⇒ le cas **sort** des candidats. C'est la
  seule exclusion ; il n'y a pas de liste d'exclus.
  *[S4]* **Amendé par §13.1** : un cas solide sort **jusqu'à sa prochaine
  consolidation**, plus pour toujours. Ce jour-là, son score vaut
  `freq × urgence × POIDS_CONSOLIDATION × fraicheur`.
- *[S4]* L'entrée du plan du jour D est le journal **antérieur** à
  `debutJour(D)` : progression, mode, durées, erreurs, consolidation, état
  SRS et config. `now` dans `SelectContext` vaut `debutJour(D)`, jamais
  l'instant de matérialisation (§12.4, INV-55). `detteTeil` devient
  `Σ poids(t, D) / 3` sur `restePlan(c, D)` (§12.2, INV-67) ; elle reçoit D, jamais l'horloge.
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

*[S4]* **Remplacé par §12.5.** `examen-blanc` et `specialite` restent des
choix **explicites**, respectés. Pour le reste, le mode est **observé**
(`cas-complet` ou `teil-first`, jamais proposé). Aucune tâche ne porte plus de Teil
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

**Modifié *[S4]*.** **INV-4** s'applique à tout plan **créé par un client
série 4** (toute tâche de cas y porte `teile`) dont `mode !== 'specialite'`.
Les plans série 3 en sont exclus (revue I, m1). C1/C2 ne sont plus suspendues
en `cas-complet` (ADR-0021, contradiction 7). Le test C6
(`invariants.programme.test.ts:113`, « en teil-first ») est réécrit sur le
mode `cas-complet`. INV-1 à INV-3 et INV-5 à INV-12 sont inchangés.

### 8.1 Invariants série 4 — le cas entier (§12)

Chaque ligne nomme la **mutation** qui doit faire rougir le test. Un test qui
reste vert sous sa mutation ne garde rien.

| Id | Propriété | Générateur | Mutation qui doit rougir |
|---|---|---|---|
| **INV-50** | Toute tâche `simulation \| revision \| examen-blanc` d'un plan série 4 porte `teile` non vide, sans `teil`. Pour `simulation`, `teile = restePlan(cas, D)` (§12.2) dans l'ordre d'examen ; pour `revision` et `examen-blanc`, les trois Teile. | 14 jours, corpus complet, journaux aléatoires | `buildTasks` repose `teil: teilDuJour` (`dayPlan.ts:185`), ou `teile` = le seul Teil fragile |
| **INV-51** | **Complétion dérivée, multi-appareils, pour toutes les tâches** : pour tout journal synchronisé `J` et toute tâche `T` (de cas ou non), `doneAt(T) !== undefined` ⇔ `faite(T, J)` (§12.3 : tâche de cas) ou `faiteHorsCas(T, J)` (§12.3 : drill, Fachwissen, Aufklärung). Le jour d'un événement se lit au fuseau `T.tz` du plan. Deux appareils qui ont reçu `J`, dans n'importe quel ordre et dans n'importe quel fuseau, projettent les mêmes `doneAt`. Une partie partielle ne coche jamais une tâche de cas incomplète. | parties d'un, deux ou trois Teile, drills, fiches et Aufklärungen répartis sur deux appareils de fuseaux différents ; arrivées permutées ; coches manuelles ; événements à 23 h 59 et 0 h 01 | `doneAt` figé à l'écriture ; `completeAssez` en `some` (`journal.ts:347`) ; `dUnTrait` cochée par des Teile séparés ; `dayKey` lu au fuseau de l'appareil ; fiche d'un autre cas qui coche la tâche Fachwissen |
| **INV-52** | **Jamais « manquée »** : `statutTache(T) ∈ {'faite', 'entamee', 'a-faire'}`, et un avancement non vide d'une tâche non faite ⇒ `'entamee'`. Le rattrapage d'une tâche entamée propose exactement `resteTache(T)`, **sans `dUnTrait`**. Avant `accepterRattrapage`, rien ne bouge. | plan de la veille avec des tâches entamées (dont `dUnTrait`), faites et vierges | `statutTache` rend `'a-faire'` pour une tâche entamée ; une reprise porte `teileDeTache(T)` en entier, ou garde `dUnTrait` |
| **INV-53** | **La maîtrise ne baisse jamais par absence d'un Teil** : `maitrise === null` ⇔ `couverture === 0` ; sinon `min(lastScore joués) ≤ maitrise ≤ max(lastScore joués)`. | tout journal, un seul Teil joué à 90 compris | `maitrise = Σ lastScore / 3` |
| **INV-54** | **Un ancien plan figé reste lisible** : pour un plan série 3 (tâches `teil` sans `teile`), la projection donne les mêmes `doneAt` que la règle série 3. `teileDeTache` vaut `[teil]`, ou les trois Teile pour un run complet sans `teil`. | fixture gelée : journal C6 série 3 et ses plans | `teileDeTache` ignore `teil` |
| **INV-55** | **Le plan d'un jour ne dépend que de ce qui précède ce jour** : `buildTasks(D, J)` = `buildTasks(D, J ∪ E)` modulo `id`, pour tout ensemble `E` d'événements tels que `at ≥ debutJour(D)`. `E` couvre les parties, les coches, les `srs.reviewed` et les `program.configured` du jour D (sauf le premier, s'il est le seul). Le résultat ne dépend pas non plus de l'instant de matérialisation dans le jour. Deux appareils qui ont le même journal antérieur au jour D **et le même contenu publié** produisent donc le même plan (limite connue m-a : un contenu différent peut donner un plan différent, §12.4). | événements du jour D tirés au hasard, instants de matérialisation dans `[00:00, 23:59]` | `selectContext` lit `input.now` (`dayPlan.ts:230`) ; `progress` lu dans `db.case_progress`, qui contient le jour D ; `counts(begriffe, input.now)` (`dayPlan.ts:136`) — **rouge sur le code actuel** |
| **INV-56** | **`prêt` exige un enchaînement réel et récent** : `etat === 'pret'` ⇔ trois Teile `solide` **et** il existe un événement avec `examen === true` (§2.3) dont chaque score est ≥ `PART_SOLIDE` et qui suit la soudure dans l'ordre total `(at, id)`, celui qui soude compris (à instants égaux, la position fait foi : revue I2 de S4-1). `pretAt` = `at` du plus récent de ces événements. Une retombée défait la soudure jusqu'au run qualifiant suivant. | runs enchaînés avant et après une retombée ; runs en Assisté ; ordre D → A → F ; grille non saisie ; trois Teile séparés le même jour | run antérieur à la dernière retombée accepté ; `enchaine` seul suffit (sans les conditions d'examen) ; `prêt` dérivé de « trois solides le même jour » |
| **INV-57** | **Le mode** : `DayPlan.mode` = `config.modus` s'il vaut `examen-blanc` ou `specialite` (choix explicite, respecté). Sinon, c'est `observeMode(J < debutJour(D))`, à valeur dans `{'cas-complet', 'teil-first'}`. L'observation ne rend jamais `examen-blanc` ni `specialite`, et un `teil-first` explicite devient `cas-complet`. Les événements du jour D ne changent pas le mode. | configs de toutes valeurs ; journaux dominés par des examens à blanc | `observeModus` brut (il rend `examen-blanc` après des examens à blanc planifiés : boucle) ; `teil-first` explicite respecté |
| **INV-58** | **Budget** : au plus **une** tâche forcée par jour dépasse le budget : l'examen à blanc en dernière ligne droite ou en mode `examen-blanc` explicite, sinon la première tâche de cas. Toutes les autres respectent `used + estMin ≤ targetMin`. À la fin du remplissage, aucun candidat restant ne tient dans le budget restant. Une reprise acceptée hors budget **remplace** la première tâche de cas **ni faite ni entamée**, et s'ajoute s'il n'y en a pas. | budgets de 15 à 180 min, cas vierges (Σ ≈ 52 min), mode `examen-blanc` explicite, reprises sur des plans avec des tâches entamées | `break` au premier candidat qui ne tient pas ; `floor(room / unitMin)` ; reprise ajoutée au lieu de remplacer ; reprise qui remplace une tâche entamée ; tâche de cas forcée en plus de l'examen à blanc |
| **INV-59** | **Le cadran lit, il ne calcule pas** : `dialData(cp, ctx)` est pure. On a `couverture = \|{t : attempts ≥ 1}\|`, `maitrise === cp.maitrise`, `soude ⇔ cp.etat === 'pret'` et `nonMesure ⇔ estNonMesure(cp.teile[t])`. Elle donne la même valeur sur une progression incrémentale et sur une progression reconstruite. | journaux aléatoires, avec et sans `rebuildJournal` | `CaseDial` lit `db.simulations` ou recalcule la maîtrise |

### 8.2 Invariants série 4 — le cerveau du programme (§13)

| Id | Propriété | Générateur | Mutation qui doit rougir |
|---|---|---|---|
| **INV-60** | **Consolidation** : un cas dont les trois Teile sont `solide` a `score > 0` à toute date `≥ prochaineConsolidation`, et `score === 0` avant. Les échéances successives d'un cas rejoué à chaque échéance sont espacées de 7, 21, 45, 45… jours. Dans la fenêtre « d'un trait », la `revision` d'un cas fréquent porte `dUnTrait` **si et seulement si** `D_UN_TRAIT_ACTIF`. | cas rendus solides puis rejoués aux échéances, en avance, en retard | retour à `detteTeil = 0 ⇒ 0` (`select.ts:79`) ; intervalle constant ; `dUnTrait` émis avec la garde à `false` |
| **INV-61** | **Solide stable** : `status === 'solide'` ⇒ il existe deux scores mesurés ≥ 80 sur ce Teil dont les `dayKey` diffèrent d'au moins `SOLIDE_ECART_JOURS` (3). | séquences de scores, de même jour et espacées | `status = statusOf(lastScore)` (`journal.ts:211`) |
| **INV-62** | **Un cran** : un Teil `solide` avant une `partieMesuree` de score `s < 80` est `acquis` après, **jamais** `fragile`, même pour `s = 0`. | Teil solide puis `s ∈ [0, 79]` | `statusOf(s)` sans tenir compte de l'état précédent |
| **INV-63** | **Erreurs transversales** : un item signalé a été manqué dans ≥ 3 des 5 dernières **`partieAvecChecklist`** (§12.3, §13.3) de son Teil, sur ≥ 2 cas distincts. Une partie sans checklist pour ce Teil, ou portant des ids legacy `cl-N`, n'entre pas dans la fenêtre. Une tâche porte au plus un `rappel`, d'un Teil de `teileDeTache`, et **jamais** sur une tâche `dUnTrait` ni `examen-blanc`. | journaux de checklists aléatoires, dont un item manqué 3 fois sur le **même** cas et des parties d'avant INV-24 | fenêtre ignorée ; seuil « 2 cas » ignoré ; lecture de `prioritizedCorrections` ; parties legacy comptées ; `rappel` sur un examen à blanc |
| **INV-64** | **Durées apprises** : `estMin` d'une tâche de cas = Σ `dureeTeil(t)` ; pour une tâche **`simulation`** en mode observé `teil-first`, c'est `dureeTeil` du Teil le plus probable seul. Une `revision` et un examen à blanc ont toujours Σ sur les trois Teile (§13.4, m-b). Avec moins de 3 mesures pour `t`, `dureeTeil(t) = TEIL_MIN[t]`. Toujours dans `[5, 45]`. Ni les séances `selbstbewertet` ni les durées nulles n'y entrent. | mesures aléatoires, dont une valeur aberrante de 300 min | moyenne au lieu de médiane ; repli absent ; Σ en mode `teil-first` sur une tâche `simulation` ; estimation réduite à un Teil sur une `revision` |
| **INV-65** | **Aucun changement de budget sans geste** : `hoursPerSession` et `intensity` ne changent que par un `program.configured` né d'un geste (`ProgramSetup`, `accepterRythme`). Aucun `DayPlan` figé ne change à l'acceptation. Une proposition n'existe que si Σ `spentMin` < 0,6 × Σ `targetMin` sur ≥ 3 jours figés de la fenêtre. La valeur proposée est `< dayTargetMin` actuel et `≥ 20`. Deux `rythme.refused` consécutifs depuis le dernier `program.configured` ⇒ aucune proposition. | semaines de temps réel aléatoires ; refus sur deux appareils | budget appliqué sans geste ; proposition à la hausse ; refus non synchronisé (l'autre appareil repropose) |
| **INV-66** | **Fréquences sourcées** : `couverturePonderee()` rend `{ pct, base, portee }` avec `0 ≤ pct ≤ 100` et `base > 0` dès que `pct` est défini. `portee = 'ville-ventilee'` ⇒ `base` = Σ des comptes ventilés de cette ville. Sinon, `portee = 'toutes-villes'` et `base` = Σ des totaux. Le texte rendu contient `base` et la portée, et passe la garde EXAM_CLAIM. | corpus avec et sans ventilation par ville, ville `Alle` | dénominateur = `centers[ville].n` (182 à Stuttgart) ; repli silencieux sans changer la phrase |
| **INV-67** | **Une seule fonction « reste »** : `detteTeil(c, D) = Σ poids(t, D) / 3` sur `restePlan(c, D)` (poids 1, ou `POIDS_CONSOLIDATION` pour un Teil « à confirmer » à D, §4.3 [S4-1]), et `teile` d'une tâche **`simulation`** = `restePlan(c, D)` (m-b ; une `revision` et un examen à blanc portent les trois Teile). Un Teil `acquis` (ou non solide) joué dans les `SOLIDE_ECART_JOURS` jours avant D n'est ni dans `teile` ni dans la dette. Dans la journée, `resteTache(T) = teileDeTache(T) \ teileJouesDepuis(T.creeA)`. | journaux avec des Teile acquis joués il y a 0, 1, 2, 3 et 4 jours | `detteTeil` garde `status ≠ solide` seul (`journal.ts:271-272`) ; deux définitions de « reste » |
| **INV-68** | **Configuration synchronisée** : deux appareils qui ont reçu les mêmes `program.configured` ont le même `db.meta['program']`, à savoir le dernier payload **valide** par `occurred_at`. Un payload invalide est ignoré et ne remplace rien. `rattrapage.refused` et `rythme.refused` sont visibles sur les deux appareils. | configurations concurrentes, payload corrompu | aucune projection de `program.configured` au retour (état actuel : seul l'envoi existe, `ProgramSetup.tsx:59`) |
| **INV-69** | **La frise passée est figée** : pour tout `at < DATE_NOUVELLE_REGLE`, `indiceAt(J, at)` applique la règle série 3 (`statusOf(lastScore)`), et le déploiement ne change aucun point passé. | journal antérieur et postérieur à la date | nouvelle règle appliquée rétroactivement à `indiceAt` |
| **INV-76** | **La config locale n'est jamais perdue** : (a) toute écriture de `db.meta['program']` émet un `program.configured` portant la config **complète** (`ProgramSetup`, `setIntensity`, `setModus`, `accepterRythme`) ; (b) au premier démarrage S4-2, la config locale est poussée **une seule fois** (garde `CONFIG_POUSSEE_S4`), **avant** toute projection distante ; (c) toute config acceptée par l'interface ou produite par `accepterRythme` est acceptée par le schéma serveur ; (d) un `program.configured` refusé, et retiré de l'outbox (`queue.ts:158-160`), ne change pas `db.meta['program']`. Seul un événement valide **plus récent** le remplace. | configs aux bornes de l'interface ; `accepterRythme` à 20 min en intensité haute ; deux démarrages concurrents ; refus serveur simulé ; config distante plus ancienne que la locale | `setIntensity` sans événement (état actuel, `programAdjust.ts:39-41`) ; payload partiel `{ intensity }` ; projection distante avant le push initial (la config locale est écrasée) ; garde absente (double push) ; borne serveur `hoursPerSession ≥ 0,5` ; projection qui retombe sur une config plus ancienne après un refus |

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
| `termes_cherches` | *[S4-6]* **ajouté** (Dexie v7, `'++id, at'`, `{ at, terme }`) : un mot passé à « Expliquer ». Local, **jamais synchronisé** (ni `syncQueue`, ni `progress_events`, ni `outbox`), vidé par `wipeDatabase()`. Voir §14.3. |
| `ProgramAdjust.doneLayers` / `.postpone` / `.extras` | **abandonnés** : remplacés par `TaskInstance.doneAt` et par `replanifier()`. `skipDrillDates` abandonné (un jour non matérialisé n'a pas de drill). |
| `ProgramBlock` | **remplacé** par `TaskInstance`. `ProgramDay` remplacé par `DayPlan`. |
| `ExtraTask` | **abandonné** : une tâche ajoutée à la main est une `TaskInstance` ordinaire posée par `replanifier()`. |
| `Case.confidence/status/layerProgress/lastSimulationId` | **dépréciés**, plus écrits (§4.1). Pas de suppression de colonne : `db.cases` est du contenu publié. |

Migration serveur REQUISE : la contrainte `progress_events_type_check` et la fonction `events` gagnent les trois types
(`20260930000017_training_journal_events.sql`, `plan.done` conservé) — déployées AVANT le client.

*[S4]* **Migration serveur REQUISE** pour S4-2 :
`20261004000018_s4_preference_events.sql` (`rythme.refused`,
`rattrapage.refused`), plus les schémas de `program.configured`, des deux refus
et de `plan.materialized.tz` dans la fonction `events` (§12.10). Elle est
appliquée au projet EU par `psql`, avant la fonction et avant le client.
Jamais `db reset`.

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
| `app/src/lib/program/tacheDeCas.test.ts` | INV-50, INV-52, INV-58, INV-67 ; `teileDeTache`, `resteTache`, `statutTache` et `lireTache` en table de vérité |
| `app/src/lib/journal/completionDerivee.test.ts` | INV-51 : deux appareils, arrivées permutées, coches manuelles, `dUnTrait` |
| `app/src/lib/program/plansAnciens.test.ts` | INV-54 sur la fixture gelée série 3 |
| `app/src/lib/program/memePlan.test.ts` | INV-55, INV-57 : événements du jour D tirés au hasard ⇒ plan identique |
| `app/src/lib/journal/etatCas.test.ts` | INV-53, INV-56, INV-59, INV-61, INV-62, INV-69 ; table de vérité de l'échelle `etat` |
| `app/tests/invariants.mesure.test.ts` | *[S4-1, à écrire par le fixeur de S4-1]* propriété sur journaux aléatoires : `etat === 'solide' ⇔ pretManque.length > 0` (§12.6), et `pretManque = []` hors de `solide` |
| `app/src/lib/sync/configProjetee.test.ts` | INV-68, INV-76 |
| `scripts/testRls.mjs` + test de la fonction `events` | contrainte SQL et schémas des trois types, séparément (m-k) ; bornes non plus strictes que l'interface (N2c) |
| `app/src/lib/program/consolidation.test.ts` | INV-60 |
| `app/src/lib/program/erreurs.test.ts` | INV-63 |
| `app/src/lib/program/durees.test.ts` | INV-64 |
| `app/src/lib/program/rythme.test.ts` | INV-65 |
| `app/src/lib/program/couverturePonderee.test.ts` | INV-66, garde EXAM_CLAIM sur le texte |
| `app/tests/parcours14j.test.ts` (C6 réécrit) | nouveau profil « un Teil ici, un cas entier là », sur deux appareils : INV-1, 2, 4, 9, 10, 12 et INV-50 à INV-59, INV-67, INV-68, chaque soir |

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

> ADR-0021 (et décisions techniques de `main` I1–I11, 4 oct.). Le candidat voit
> des cas, jamais des fractions de cas ; le plan sait au Teil près ce qui reste.

### 12.1 La tâche de cas

```ts
/** Lecture tolérante — LE SEUL point qui lit `teil`. */
export function teileDeTache(t: TaskInstance): SimTeil[] {
  if (t.teile?.length) return t.teile;
  if (t.teil) return [t.teil];                                     // plan série 3
  return ['simulation', 'revision', 'examen-blanc'].includes(t.kind) ? [...TEILE] : [];
}
```

- `TaskInstance` gagne `creeA?: number`, l'instant de création de la tâche
  (`materializedAt` du plan, ou instant du `plan.replanned` qui l'a posée).
  Absent dans un plan série 3, il vaut alors `debutJour(date)`.
- Une tâche de cas dont `teile.length === 1` reste une **tâche de cas** : elle
  s'affiche comme le cas (cadran, nom) avec « il te reste la Dokumentation »,
  jamais « Dokumentation de X ».
- `label` = nom du cas (ADR-0020 §8). Le texte « il te reste … · N min » se
  **lit** depuis `resteTache(T)` et `estMin` ; il n'est jamais concaténé.
- `TaskInstance.teil` n'est plus jamais écrit (INV-50).
- **Filtrage à la lecture, obligatoire** (m4) — tout plan venu de la synchro
  passe par `lireTache()` avant usage :
  - `teile` est filtré sur les trois clés connues, dédoublonné et remis dans
    l'ordre d'examen ; vide, il est **absent** ;
  - `rappel` est conservé seulement s'il appartient aux ids de
    `checklistFor(t)` pour un `t` de `teileDeTache` ;
  - `dUnTrait` est conservé seulement s'il vaut exactement `true` ;
  - `creeA` est conservé seulement s'il est un entier fini compris dans le
    jour du plan.

  Un champ invalide est retiré ; la tâche, jamais.
- **Lancement** (m8) : toute tâche de cas, `revision` comprise, se lance par
  `/simulation/:caseId/pre?task=<id>&depart=<premier Teil de resteTache(T)>`
  (`simulation-run.md` §10.3).

### 12.2 « Ce qui reste » — une seule fonction (I6)

```ts
/** Pour PLANIFIER le jour D, sur le journal antérieur à D (§12.4). */
restePlan(cp, D) = { t ∈ TEILE : cp.teile[t].status !== 'solide'
                     ∧ ¬(cp.teile[t].lastAt ≠ null
                         ∧ D − dayKey(lastAt) < SOLIDE_ECART_JOURS) }   // ordre d'examen

/** DANS la journée, pour une tâche T. */
resteTache(T) = T.dUnTrait && avancement(T) ⊇ TEILE
                  ? [...TEILE]                                   // « À reprendre depuis l'Anamnese » (I5)
                  : teileDeTache(T) \ avancement(T)

detteTeil(c, D) = Σ_{t ∈ restePlan(cp, D)} poids(t, D) / 3       // remplace §4.3 ; poids de §4.3 [S4-1]
                                                                 // (1, ou POIDS_CONSOLIDATION si « à confirmer » à D)
```

`restePlan` fixe les `teile` des seules tâches **`simulation`** (m-b). Une
`revision` (consolidation) et un examen à blanc portent toujours les trois
Teile, quel que soit `restePlan`.

- Un Teil non solide joué il y a moins de 3 jours vaut **0** dans la dette
  (réserve pédagogique R2). Le rejouer avant l'écart ne peut pas le rendre
  solide (§13.2). Le cas revient donc quand ce Teil peut progresser.
- `restePlan` vide ⇒ `detteTeil = 0`. Le cas sort du jour, sauf s'il est dû
  pour consolidation (§13.1).
- *[S4-1]* Un Teil « à confirmer » à D (§13.2) reste dans `restePlan`, mais il
  pèse `POIDS_CONSOLIDATION` au lieu de 1 (P1 de la revue pédagogique de S4-1).
  Sans cela, les cas redevenus `acquis` par la décision (e) envahiraient le plan.
- Les `TeilStatus` et `pointFaible` sont inchangés. La **dette** change ; la
  **faiblesse**, jamais.

### 12.3 La règle de complétion — dérivée, jamais figée (I3, I4, I5)

```
// Trois prédicats NOMMÉS (m-f) — aucun « partie mesurée » sans qualificatif
partieJouee(e)          = e.kind ∈ {'simulation','examen-blanc'} ∧ e.caseId définie ∧ !isCocheNue(e)
                          // complétion : séance IA externe COMPRISE
partieMesuree(e)        = partieJouee(e) ∧ e.selbstbewertet !== true ∧ e.scores non vide
                          // mesure : statut, maîtrise, solide, prêt, consolidation (k), durées
partieAvecChecklist(e,t)= partieMesuree(e) ∧ e.manques?.[t] défini ∧ ids d'origine stables (aucun cl-N)
                          // erreurs transversales seulement (§13.3)

jourDe(e, T)       = dayKey(e.at) au fuseau T.tz du plan (DayPlan.tz ; local s'il manque) (m-g)
dansTache(e, T)    = jourDe(e, T) === T.date ∧ e.at ≥ T.creeA
// [S4-3 fixeur M5, décision de main, 5 oct.] Une PARTIE compte par son ENREGISTREMENT aussi : commencée la veille,
// reprise et enregistrée ce matin, elle fait « Finir X » posée ce matin. Même logique que la coupure m1 de S4-2
// (l'instant d'`occurred_at`). Le JOUR de la partie reste celui de son début (m5, INV-75) pour l'historique et la mesure.
enr(e)             = e.enregistreA ?? e.at
partieDansTache(e, T) = enr(e) ≥ T.creeA ∧ (jourDe(e, T) === T.date ∨ dayKey(enr(e)) === T.date)
                     // `doneAt` = e.at si e.at ≥ T.creeA, sinon enr(e)
teileJouesDepuis(T) = ⋃ e.teile  pour partieJouee(e), e.caseId === T.caseId, partieDansTache(e, T)
avancement(T)      = teileDeTache(T) ∩ teileJouesDepuis(T)
cocheManuelle(T)   = ∃ e : isCocheNue(e) ∧ e.taskId === T.id    (ou équivalent D-I2, ci-dessous)
faite(T)           = cocheManuelle(T)
                     ∨ (T.dUnTrait
                          ? ∃ e : partieJouee(e) ∧ e.enchaine ∧ e.caseId === T.caseId ∧ partieDansTache(e, T)
                          : avancement(T) ⊇ teileDeTache(T))
statutTache(T)     = faite ? 'faite' : avancement(T).length > 0 ? 'entamee' : 'a-faire'
```

**Tâches qui ne sont pas des cas (N1)** — même modèle, dérivé à la projection :

```
genreAttendu = { drill: 'drill', fachwissen: 'fiche', aufklaerung: 'aufklaerung' }
faiteHorsCas(T) = cocheManuelle(T)
                  ∨ ∃ e : e.kind === genreAttendu[T.kind] ∧ !isCocheNue(e)
                        ∧ (T.caseId === undefined ∨ e.caseId === T.caseId)
                        ∧ dansTache(e, T)
statutTache(T)  = faiteHorsCas(T) ? 'faite' : 'a-faire'      // pas d'état « entamée » hors cas
```

Une séance de drill fait la tâche drill, une fiche lue fait la tâche
Fachwissen du même cas, une Aufklärung jouée fait la tâche Aufklärung. Le
genre compte ici, contrairement aux tâches de cas. INV-51 couvre **toutes**
les tâches.

- **`doneAt` se DÉRIVE à la projection** (`projectDayPlans`, au rebuild comme
  en incrémental), depuis le journal synchronisé. Il n'est jamais figé à
  l'écriture d'un événement. On pose `doneAt` = `at` de l'événement qui rend
  `faite` vrai, `eventId` = cet événement, et `spentMin` = Σ `spentMin` des
  parties qui ont contribué à l'avancement. Deux appareils avec le même
  journal ont les mêmes coches (INV-51).
- **Le genre ne compte pas** (I3) : une tâche `simulation` ou `revision` est
  satisfaite par toute partie du cas, `simulation` ou `examen-blanc`. Le genre
  ne sert qu'au libellé. Une tâche `dUnTrait` exige `enchaine` et rien
  d'autre (ni couche 3, ni Autonome).
- **`dUnTrait`, tout ou rien** (I5) :
  - une partie partielle fait avancer le cadran de la tâche, mais ne la coche
    pas ;
  - trois Teile joués séparément laissent la tâche **ouverte**, et
    `resteTache` = les trois ;
  - *[S4, revue direction-keeper, 6 oct.]* entamée à part (un Teil ou plus),
    la ligne de tâche porte le libellé « À reprendre depuis l'Anamnese »,
    jamais « il te reste … ». « D'un trait » est dit par la raison de la tâche
    (§13.1), une seule fois sur la ligne. L'action du cadran reste « Rejouer le
    cas d'un trait ».
- **Séance IA externe auto-déclarée** (`selbstbewertet`) — **décidé** : elle
  est une partie qui joue son Teil d'ancrage. Elle fait avancer la tâche de
  cas et **peut la cocher** quand elle complète ce qui restait. Elle n'entre
  **jamais** dans une mesure : statut, maîtrise, couverture, solide, `prêt`,
  indice. Comme `enchaine` est absent pour elle, elle ne coche jamais une
  tâche `dUnTrait`. Référence : décision de la direction Q3/Q9 du 30 sept.
  (« historique + série oui, ça coche la tâche du jour ; l'indice non »),
  confirmée par `main` le 4 oct.
- **Coche manuelle** : un événement explicite (`markTaskDone`, coche nue
  portant `taskId`) qui fait la tâche. D-I2 est conservé pour elle seule : la
  coche d'une tâche d'un plan perdant (un autre appareil) vaut pour la tâche
  équivalente du plan gagnant, de même `kind`, `caseId` et `teileDeTache`.
  D-C4 (absorption) devient : une coche nue est absorbée dans l'historique
  quand la tâche est aussi faite par des parties.
- `TrainingEvent.taskId` et `source` restent écrits à titre **informatif**
  (historique « dans le plan / libre »). Ils ne décident plus de `doneAt`.
- **Aucun état « manquée ».** `planProgress` rend `{ faites, entamees, total }`.
- **Le jour d'une partie** est celui de son **début** (m5) :
  `TrainingEvent.at` = `Simulation.date` = `Lauf.startedAt`
  (`simulation-run.md` §3.2). Une partie à cheval sur minuit compte pour le
  jour de son début.

### 12.4 Construction du plan — l'entrée d'un jour (I1, I7)

**Entrée** du plan du jour D, et rien d'autre :

```
J_D      = progress_events d'occurred_at < debutJour(D) (journal, plans, SRS, config)
journal  = projectTrainingEvents(J_D)                // progression, mode, durées, erreurs, consolidation
progress = computeCaseProgress(journal)              // JAMAIS db.case_progress (qui contient le jour D)
srs      = dernier srs.reviewed par carte dans J_D   // état SRS reconstruit
config   = dernier program.configured valide de J_D, sinon le PREMIER du jour D (jour de création)
now      = debutJour(D) pour la sélection ; finJour(D) pour compter les Fachbegriffe dus
```

- `debutJour(D)` et `finJour(D)` sont minuit local, dans le fuseau de
  l'appareil qui matérialise (m11). Ce fuseau est **écrit dans le plan** :
  `DayPlan.tz` (IANA). Les autres appareils lisent les bornes du plan avec ce
  `tz`, jamais avec le leur. Un plan série 3 sans `tz` se lit dans le fuseau
  local.
- L'instant de matérialisation n'entre que dans `seed`, `materializedAt` et
  `creeA` (INV-55).
- **Limite connue (m-a)** : le **contenu publié** (`db.cases`, la version de
  `content_items` reçue) est aussi une entrée du plan. Le même journal sur un
  contenu différent (un appareil pas encore resynchronisé après une
  publication) peut donner un plan différent. INV-7 (le premier fige) en
  limite l'effet ; INV-55 se teste à contenu égal.

**Budget** (I7) :

1. Le drill vient d'abord. Son `estMin` est borné au budget (règle M-a,
   inchangée).
2. En dernière ligne droite, l'examen à blanc a
   `estMin` = Σ `dureeTeil(t)` sur les trois Teile. `MOCK_MIN` disparaît.
3. **Une seule tâche forcée par jour** peut dépasser le budget. En dernière
   ligne droite **ou en mode `examen-blanc` choisi explicitement**, c'est
   l'examen à blanc (au plus un par jour) ; sinon, c'est la première tâche de
   cas. Ce jour-là, les tâches de cas respectent le budget (INV-58, m-c).
4. **Remplissage glouton** sur les `estMin` réels. Il remplace
   `wanted = floor(room / unitMin)` (`dayPlan.ts:176`). À chaque pas, on
   prend, dans l'ordre de `pickWithDiversity`, le premier candidat dont
   `estMin` tient dans le budget restant. On s'arrête quand aucun ne tient.
5. C1/C2 s'appliquent à toutes les tâches portant une `specialty`, sauf en
   mode `specialite`.
6. Les candidats incluent les cas solides **dus** (§13.1).
7. **Proposition « d'un trait » (m-l)**, seulement si `D_UN_TRAIT_ACTIF` :
   - **entre J-15 ouvrés et le début de la dernière ligne droite**, c'est une
     **tâche de cas** (`kind: 'revision'`, trois Teile, `dUnTrait: true`), pas
     un examen à blanc. On choisit d'abord un cas `solide` non `prêt`, de
     `freq ≥ SEUIL_FREQUENT`, par fréquence décroissante ;
   - **dans la dernière ligne droite** (`taperDays`), l'examen à blanc reste
     la seule forme. Il choisit d'abord un cas de la même sorte, et porte
     `dUnTrait: true`.

   L'examen à blanc reste propre à la dernière ligne droite et au mode
   `examen-blanc` explicite.

### 12.5 Le mode — explicite pour deux, observé pour le reste (I8)

```ts
modeDuJour(config, J_D) =
  config.modus === 'examen-blanc' || config.modus === 'specialite' ? config.modus   // choix EXPLICITE, respecté
  : observeMode(journal(J_D))                                                        // ∈ {'cas-complet','teil-first'}

observeMode(j) = observeModus(j, cases) === 'teil-first' ? 'teil-first' : 'cas-complet'
```

- L'observation ne choisit qu'entre `cas-complet` et la pondération interne
  par Teil (`teil-first`). Elle ne rend **jamais** `examen-blanc` ni
  `specialite` : un plan qui pose des examens à blanc ferait observer
  « examen-blanc », qui en poserait davantage. C'est la boucle écartée.
- Un `teil-first` (ou `strategy`) **explicite** d'une config série 3 devient
  `cas-complet` ; l'observation peut ensuite le retrouver.
- `modusAProposer` et la clé de refus sortent de l'interface. `observeModus`
  rend aussi `teilHabituel`.

| Mode du jour | Effet sur la sélection, et rien d'autre |
|---|---|
| `cas-complet` (et défaut) | aucun filtre |
| `teil-first` (observé) | candidats restreints aux cas dont `teilHabituel ∈ restePlan`, si ce sous-ensemble n'est pas vide ; la tâche reste un cas entier ; estimation sur le Teil le plus probable (§13.4) |
| `specialite` (explicite) | filtre sur la spécialité de plus forte dette ; C1/C2 suspendues |
| `examen-blanc` (explicite) | inchangé (§6) |

### 12.6 Couverture, maîtrise, échelle d'états du cas

```ts
export interface TeilProgress {
  status: TeilStatus;
  lastScore: number | null;
  lastAt: number | null;
  attempts: number;
  nonMesureAt?: number;                // déjà dans le code (journal.ts:237) ; inscrit au contrat (m10)
  solideDes?: string | null;           // [S4-1] yyyy-MM-dd ; absent ou null ⇔ pas de date ; source de CaseDialData.teile[t].solideDes (§12.7)
  premiereReussite?: { at: number; score: number }; // [S4-1] première réussite ≥ 80, jamais remise à zéro ; source de « à confirmer » (§13.2)
}

export type CaseEtat = 'vierge' | 'entame' | 'couvert' | 'solide' | 'pret';

export interface CaseProgress {
  caseId: CaseId;
  teile: Record<SimTeil, TeilProgress>;
  couverture: 0 | 1 | 2 | 3;           // Teile avec attempts ≥ 1 (MESURÉS)
  maitrise: number | null;             // 0..100 ; null ⇔ couverture === 0
  etat: CaseEtat;
  solideDepuis: number | null;         // at de l'événement qui a rendu les 3 Teile solides (dernier passage)
  pretAt: number | null;               // la soudure (I11)
  prochaineConsolidation: string | null; // §13.1
  pretManque: ConditionExamen[];       // [S4-1] source de CaseDialData.pretManque (§12.7)
  overall: 'vierge' | 'entame' | 'solide'; // DÉPRÉCIÉ, dérivé de etat (§4.1 [S4])
}
```

```
couverture = |{ t : attempts ≥ 1 }|
maitrise   = couverture === 0 ? null : round(moyenne des lastScore pour attempts ≥ 1)
etat       = couverture === 0                         → 'vierge'
             couverture < 3                           → 'entame'
             ∃ t : status ≠ 'solide'                  → 'couvert'
             ∃ e qualifiant ∈ depuisSoudure           → 'pret'      (INV-56)
             sinon                                    → 'solide'
qualifiant(e) = e.examen === true ∧ ∀ t : e.scores[t] ≥ PART_SOLIDE
depuisSoudure = les partieMesuree du cas qui suivent, dans l'ordre total (at, id), celle qui a
                soudé les trois Teile, CELLE-CI COMPRISE ; [] si non soudé
                // [S4-1, revue I2] une POSITION, pas un instant : à `at` égaux, l'id départage

premiereReussite(t) = { at, score } de la PREMIÈRE partieMesuree où scores[t] ≥ PART_SOLIDE
                      (jamais remise à zéro) ; absent tant qu'il n'y en a pas
solideDes(t) = status ≠ 'solide' ∧ premiereReussite(t) existe
                 ? dayKey(premiereReussite(t).at + SOLIDE_ECART_JOURS jours) : absent
pretManque   = etat === 'solide'
                 ? (runs = e ∈ depuisSoudure avec e.examenManque présent ET NON VIDE ;
                    runs vide ? ['enchaine','autonome','ordre','grille']
                              : e.examenManque du run qui en a le MOINS — à égalité, le plus récent)
                 : []
```

*[S4-1]* **`solideDes` et `pretManque`** (ajouts S4-1, acceptés par `main` le
4 oct.). Ce sont les sources des deux champs R1 du cadran (§12.7), qui n'en
avaient pas en §12.6. Code : `lib/progression.ts` (`finalise`, `pretManque`).

- `solideDes` découle de l'automate §13.2. Une réussite ≥ 80 rend le Teil
  solide si une réussite **antérieure** ≥ 80 a eu lieu au moins
  `SOLIDE_ECART_JOURS` jours calendaires avant. La plus ancienne,
  `premiereReussite(t)`, donne donc la date la plus tôt. Une retombée (solide → acquis) ne l'efface
  pas. La date peut être passée : « un ≥ 80 dès aujourd'hui suffit ». Le
  champ est **absent** quand il vaudrait `null`. `dialData` normalise :
  `solideDes: status === 'solide' ? null : cp.solideDes ?? null`.
- `pretManque` n'est non vide **que** pour `etat === 'solide'`. C'est la même
  fonction que la soudure : un run de `depuisSoudure` avec
  `examenManque = []` a ses trois scores mesurés. S'ils sont tous ≥ 80, il est
  qualifiant et l'état devient `pret`. Sinon, le Teil sous 80 retombe d'un cran
  (INV-62), ce qui défait `solideDepuis`. Un tel run n'est donc jamais candidat
  pour `pretManque`, puisqu'il « aurait soudé ». D'où l'invariant
  **`etat === 'solide' ⇔ pretManque.length > 0`**, y compris à instants égaux
  (revue I2).
- *[S4-1]* **`premiereReussite`** (ajout S4-1, ratifié par `main` le 5 oct.) :
  `{ at, score }` de la première réussite ≥ 80. Il est **absent** tant qu'il n'y
  en a pas, et posé même quand le Teil est solide. C'est le témoin de l'écart
  de §13.2 et la source de la phrase « à confirmer » (§13.2). Comme
  `solideDes`, c'est un champ de projection locale, optionnel et non
  synchronisé. Code : `lib/progression.ts` (`finalise`, `raisonAConfirmer`).
- Lecture tolérante : les deux champs sont optionnels dans `db/types.ts`, pour
  qu'une ligne `case_progress` d'avant la série 4 reste lisible jusqu'à la
  reconstruction du démarrage (ADR-0021, m-d). `computeCaseProgress` et
  `blankProgress` posent toujours `pretManque`.
- **Compatibilité** : ce sont des champs de projection locale (`case_progress`,
  Dexie). Ils ne sont pas synchronisés et sont reconstruits depuis le journal.
  Aucun événement, schéma serveur ou migration n'est touché. Un client
  série 3 les ignore.
- **Tests de contrat** : `lib/journal.etatCas.test.ts`, blocs « solideDes (R1) »
  et « pretManque (R1) » (moins de manques, égalité au plus récent, run d'avant
  la soudure ignoré, parties sans `examenManque` ignorées) ;
  `tests/invariants.mesure.test.ts` (décision (b) : `kind` ⇔ `examen` ⇔
  `examenManque = []`). **À écrire par le fixeur de S4-1** : une propriété sur
  journaux aléatoires pour `etat === 'solide' ⇔ pretManque.length > 0` (§10).

- Couverture et maîtrise sont deux mesures, et la maîtrise ne baisse jamais
  par absence d'un Teil (INV-53). La maîtrise lit `lastScore` : une
  Anamnese à 85 non confirmée affiche 85 avec l'état `acquis`.
- Les séances `selbstbewertet` n'entrent ni dans la couverture ni dans la
  maîtrise (INV-11).
- **Soudure** (I11) : `prêt` exige un run qualifiant postérieur ou simultané
  au moment où les trois Teile sont devenus solides, donc postérieur à toute
  retombée. Une retombée remet `solideDepuis` à `null` et défait la soudure
  jusqu'au run qualifiant suivant.
- **Conditions d'examen** (décision (b) de la direction, 4 oct.) :
  `TrainingEvent.examen` est vrai si et seulement si la partie remplit toutes
  ces conditions :
  - elle est enchaînée ;
  - elle est jouée en **Autonome** ;
  - elle suit l'ordre **A → D → F** ;
  - la **grille de langue est saisie** pour l'Anamnese et la Fallvorstellung,
    c'est-à-dire que les cinq critères nommés sont notés (§2.3, `grilleSaisie`).

  C'est la **même** définition que celle qui classe un run en `examen-blanc`
  (§2.3, `conditionsExamen`).

### 12.7 Le contrat de données du cadran (`CaseDial`)

```ts
export interface CaseDialData {
  caseId: CaseId;
  teile: Record<SimTeil, {             // position FIXE par clé : anamnese, dokumentation, fallvorstellung
    status: TeilStatus;
    lastScore: number | null;
    lastAt: number | null;
    nonMesure: boolean;                // estNonMesure()
    solideDes: string | null;          // R1 : date (yyyy-MM-dd) à partir de laquelle un ≥ 80 rendrait ce Teil solide ; null si solide ou si aucune réussite ≥ 80
  }>;
  couverture: 0 | 1 | 2 | 3;
  maitrise: number | null;             // null → aucun chiffre, jamais « 0 »
  soude: boolean;                      // etat === 'pret'
  pretAt: number | null;
  pretManque: ('enchaine' | 'autonome' | 'ordre' | 'grille')[]; // R1 : ce qui manque au meilleur run récent pour souder ; [] si soudé ou non solide
  prochaineConsolidation: string | null;
  tache?: { teile: SimTeil[]; avancement: SimTeil[]; aRejouerDUnTrait: boolean };
  vientDEtreJoue?: SimTeil[];
}

dialData(cp, ctx?: { tache?: TaskInstance; avancement?: SimTeil[]; lauf?: Lauf }): CaseDialData   // PURE (INV-59)
```

- **Une seule source** : `case_progress`, la tâche figée et le `Lauf` en fin de
  partie. Le cadran ne lit jamais `db.simulations`. `solideDes` recopie
  `TeilProgress.solideDes`, et `pretManque` recopie `CaseProgress.pretManque`
  (§12.6, ajouts S4-1). `dialData` ne les calcule pas.
- **R1, la raison et la date** : quand un Teil n'est pas encore solide, le
  détail dit pourquoi et quand. Par exemple : « solide si tu refais ≥ 80 à
  partir du jeudi 9 » (`solideDes`), ou « pour souder l'anneau : une partie
  d'un trait en Autonome » (`pretManque`). Le plafond Assisté évoqué par la
  revue n'existe pas dans la mesure (ADR-0021, contradiction 15).
- Les quatre tailles lisent le même `CaseDialData`. `CaseDial` vit dans
  `components/visuals/`, sous la règle B de `motionSafe.test.ts`.
  L'étiquette accessible se dérive de `CaseDialData` seul, et la couleur n'est
  jamais le seul signal.

### 12.8 « Finir hier » — le reste revient en tête, proposé (C1)

Le rattrapage (`rattrapage.ts`, Q4) reste limité au dernier jour figé ; le
drill en est exclu, ainsi que les cas déjà planifiés aujourd'hui. Ce qui
change :

- Chaque tâche de la veille non faite est proposée avec `teile = resteTache(T)`
  et la raison « Finir <cas> ». La reprise ne porte **jamais** `dUnTrait`
  (I5). Une tâche série 3 à `teil` devient une tâche de cas
  (`teile = [teil]`). Un reste vide n'est pas proposé.
- `accepterRattrapage` insère les reprises **avant la première tâche non
  faite**, avec un `creeA` neuf, par `plan.replanned` (raison `rattrapage`).
  Si le budget du jour est déjà atteint, la reprise **remplace** la première
  tâche de cas **ni faite ni entamée** au lieu de s'ajouter (réserve C1, m-c,
  INV-58). Elle s'ajoute s'il n'y en a aucune.
- Le refus est un événement **synchronisé** `rattrapage.refused`
  (§12.10), qui remplace la clé locale `rattrapageRefuse`.

### 12.9 Les fréquences dans les encarts (I10)

Une phrase de fréquence n'est rendue que si elle nomme sa base et sa portée,
et passe la garde EXAM_CLAIM :

- pathologie **ventilée** pour la ville cible : « revient dans 11 protocoles,
  d'après 96 protocoles ventilés de Stuttgart » ;
- sinon, **repli tous centres**, dit tel quel : « revient dans 9 protocoles,
  d'après 516 protocoles, toutes villes ».

Sans donnée, la phrase n'est pas rendue. Source : §13.6.

### 12.10 Configuration et refus synchronisés (I2)

| Type | `subject_id` | `payload` | Projection |
|---|---|---|---|
| `program.configured` (existant, **projeté désormais**) | `null` | `ProgramConfig` | `db.meta['program']` = dernier payload **valide** par `occurred_at`. Un payload invalide est ignoré (il ne remplace rien) et journalisé en avertissement. |
| `rythme.refused` (nouveau) | semaine ISO `yyyy-Www` | `{}` | additive. Deux refus consécutifs depuis le dernier `program.configured` ⇒ plus de proposition (réserve P2, §13.5). |
| `rattrapage.refused` (nouveau) | `yyyy-MM-dd` (jour refusé) | `{}` | additive. Remplace `db.meta['rattrapageRefuse']`, relu une fois à la migration. |

- **Validation à la lecture** (client) : `lireConfig(payload)`. Les champs
  connus sont typés et bornés :
  - `examDate` et `startDate` au format ISO ;
  - `hoursPerSession` dans ]0, 12] ;
  - `intensity` parmi les valeurs de l'enum ;
  - `offDays` dans [0..6], au plus 6 jours ;
  - `modus` dans l'enum.

  Le reste est ignoré.
- **Qui émet `program.configured`, et avec quoi (N2a, m-m)** : **toute**
  écriture de `db.meta['program']` émet `program.configured` avec la
  **config complète**, jamais un fragment. Cela vaut pour `ProgramSetup`
  (`ProgramSetup.tsx:59`, déjà le cas), pour `setIntensity` et `setModus`
  (`lib/programAdjust.ts:33-41`, qui n'émettent rien aujourd'hui) et pour
  `accepterRythme` (§13.5). Une seule fonction d'écriture :
  `ecrireConfig(config)`, qui écrit la clé locale puis l'événement.
- **Première synchro d'un client S4-2 (N2b)** : garde nommée
  `CONFIG_POUSSEE_S4` (`db.meta`). Au premier démarrage, **avant** toute
  projection d'une config distante, la config locale (s'il y en a une) est
  poussée une fois par `program.configured`, horodatée à l'instant du push. La
  garde est posée ensuite. Idempotence : la garde présente ⇒ rien ; un
  second démarrage concurrent ne pousse pas deux fois (garde lue et posée dans
  une transaction Dexie).
- **Bornes (N2c)** : les bornes serveur ne sont **jamais plus strictes** que
  celles de l'interface ni que les valeurs produites par `accepterRythme`.
  `ProgramSetup` borne `hoursPerSession` à [0,5 ; 6] et `weeks` à [2 ; 24]
  (`ProgramSetup.tsx:90,126`). `accepterRythme` peut produire une valeur
  inférieure à 0,5 h, d'où ]0, 12] côté serveur. Règle : bornes serveur ⊇
  bornes de `lireConfig` ⊇ bornes de l'interface et de `accepterRythme`.
- **Refus serveur (N2d)** : un `program.configured` refusé par le serveur
  **n'efface jamais** la config locale. Elle reste la référence jusqu'à ce
  qu'un `program.configured` valide soit accepté. Attention :
  `queue.ts:53,158-160` **retire** de l'outbox un événement refusé sans
  `retry`. Le refus ne laisse donc aucune trace à rejouer. La projection ne
  doit jamais remplacer la config locale par « rien » ni par une config plus
  ancienne parce qu'un événement local a disparu. Seul un événement valide
  **plus récent** qu'elle la remplace. Un refus est journalisé en
  avertissement (INV-76).
- **Schéma serveur** (`events/index.ts`) — trois changements, tous requis
  (m-i/m-j) :
  1. `TYPES` (`events/index.ts:5-9`) gagne `'rythme.refused'` et
     `'rattrapage.refused'` ;
  2. `SCHEMAS` gagne :
     - `program.configured: { subject: z.null(), payload: ConfigSchema.passthrough() }` ;
     - `rythme.refused: { subject: z.string().regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/), payload: z.object({}).strict() }` ;
     - `rattrapage.refused: { subject: Day, payload: z.object({}).strict() }` ;
  3. `plan.materialized` gagne `tz: z.string().max(64).optional()`.
- **Migration SQL proposée** (Fondations, à appliquer au projet EU **avant** la
  fonction et le client, ADR-0015) :

```sql
-- 20261004000018_s4_preference_events.sql — série 4 (training-journal.md §12.10)
-- Liste de départ : 20260930000017_training_journal_events.sql.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed',
  'term.personal_created','term.personal_deleted','term.personal_updated',
  'training.logged','plan.materialized','plan.replanned',
  'rythme.refused','rattrapage.refused'
));
```

  **Tests séparés (m-k)** :
  - *contrainte SQL* : `scripts/testRls.mjs` insère les deux types sous les
    rôles A et B (isolation RLS inchangée), et un type inconnu échoue ;
  - *fonction* : un test de la fonction `events` envoie des payloads valides
    et invalides pour les trois types (`subject_id` non nul pour
    `program.configured`, semaine ISO malformée, payload non vide), et vérifie
    que les bornes ne sont pas plus strictes que l'interface (N2c).

  **Ordre de déploiement** : migration (projet EU, `psql`) → fonction
  `events` → client. Jamais `db reset`.
- Compatibilité : un client série 3 ignore les deux nouveaux types, et
  `program.configured` projeté ne change rien pour lui.

### 12.11 Synchronisation et compatibilité

- `teile`, `rappel`, `dUnTrait` et `creeA` voyagent dans
  `plan.materialized`/`plan.replanned` (`Tasks … .passthrough()`,
  `events/index.ts:25-28`). Ils sont filtrés à la lecture (m4, §12.1).
- `enchaine`, `examen`, `reihenfolge` et `dauerGesamtSec` voyagent dans
  `simulation.completed`, qui n'a pas de schéma serveur.
- Un client série 3 qui lit un plan série 4 exige les trois Teile pour une
  tâche sans `teil` : il ne coche jamais à tort.
- Dexie : aucune version nouvelle. Les projections se reconstruisent.

### 12.12 Ordre de construction (I9)

```
S4-1 mesure ──▶ S4-4 primitive CaseDial ──▶ S4-3 partie ∥ S4-2 plan ──▶ S4-5 Programme ──▶ S4-6 Historique ──▶ S4-7 Examen
```

- **S4-1** porte la progression (§12.6, §13.2) et la dérivation de
  `enchaine`/`examen` (§2.3), même s'ils restent absents avant S4-3. Elle
  porte aussi la **mesure** de la couverture pondérée (§13.6) ; son affichage
  revient à S4-5.
- *[S4-1, livré]* S4-1 a aussi posé deux fonctions pures de mesure que **S4-2
  consomme** sans les redéfinir. La première est `prochaineConsolidation`
  (§13.1), un champ de `CaseProgress` calculé dans `lib/progression.ts`. La
  seconde est `teileDeTache` (§12.1, `lib/program/tacheDeCas.ts`), dont le
  cadran a besoin. S4-2 garde `resteTache`, `statutTache`, `lireTache` et
  `restePlan`. Un changement de ces deux fonctions passe par une proposition de
  contrat.
- *[S4-1, livré, 5 oct.]* S4-1 a aussi posé `teilAConfirmer` et
  `raisonAConfirmer` (`lib/progression.ts`), ainsi que `detteTeil(cp, jour)`
  (`journal.ts`, §4.3). **S4-2 passe le jour du plan explicitement** à
  `detteTeil` et à `raisonAConfirmer`, jamais `now()` (I1, INV-55). En
  écrivant `restePlan`, S4-2 garde le poids « à confirmer » (§12.2).
- **S4-3 ∥ S4-2** : périmètres de fichiers disjoints (S4-3 :
  `lib/lauf`, `features/simulation`, **`lib/simulationSave.ts`** ; S4-2 :
  `lib/program`, `lib/journal.ts`, `lib/programAdjust.ts`,
  `features/program`, la fonction `events` et la migration 18).
- **Propriétaire de `db/types.ts` (m-d)** : **S4-1 ajoute tous les nouveaux
  champs** de la série 4 (`TaskInstance`, `DayPlan`, `CaseProgress`,
  `TeilProgress`, `TrainingEvent`, `Simulation`, `MusterArt`), même ceux que
  S4-2 et S4-3 rempliront. S4-2 et S4-3 n'écrivent plus dans `db/types.ts` ;
  un besoin de plus est une proposition de contrat.
- **Prérequis de S4-1 (m-h)** : la branche `feat/s3-c6b-jour` (lot C6-B) est
  mergée. Elle remplace `Date.now()` par `now()` de `lib/clock` dans
  `lib/lauf/*`, ce qui rend `Lauf.startedAt` injectable et testable
  (INV-75). Sans elle, la date d'une partie n'est pas maîtrisable par le
  harnais.
- **Garde nommée** : `D_UN_TRAIT_ACTIF` (`lib/program/parametres.ts`) vaut
  `false` jusqu'à ce que S4-3 soit en production. Aucune tâche `dUnTrait`
  n'est générée tant qu'elle est fausse (INV-60). Elle passe à `true` dans un
  commit dédié, après le déploiement de S4-3.

---

## 13. *[S4]* Le cerveau du programme

> ADR-0022. Paramètres **nommés**, un seul endroit chacun
> (`app/src/lib/program/parametres.ts`, à créer). Toute valeur en dur ailleurs
> est un défaut de contrat.

| Paramètre | Valeur | § |
|---|---|---|
| `CONSOLIDATION_JOURS` | `[7, 21, 45]` (plafond : le dernier) | 13.1 |
| `POIDS_CONSOLIDATION` | `1/3` — aussi le poids d'un Teil « à confirmer » dans la dette | 13.1, 4.3, 12.2, 13.2 |
| `SEUIL_FREQUENT` | `0.5` (de `freq`) | 13.1, 12.4 |
| `FENETRE_D_UN_TRAIT_JOURS_OUVRES` | `15` — décision (a) de la direction | 13.1 |
| `D_UN_TRAIT_ACTIF` | `false` jusqu'à S4-3 en production | 12.12 |
| `SOLIDE_ECART_JOURS` | `3` (jours calendaires, `dayKey`) | 12.2, 13.2 |
| `DATE_NOUVELLE_REGLE` | **lendemain** du jour du merge de S4-1 en production (`yyyy-MM-dd`), posé par `main` au moment du merge | 13.2 |
| `ERREUR_FENETRE` / `ERREUR_SEUIL` / `ERREUR_CAS_MIN` | `5` / `3` / `2` | 13.3 |
| `DUREE_FENETRE` / `DUREE_MIN_MESURES` / `DUREE_BORNES` | `10` / `3` / `[5, 45]` min | 13.4 |
| `RYTHME_FENETRE_JOURS` / `RYTHME_SEUIL` / `RYTHME_MIN_JOURS` / `BUDGET_PLANCHER_MIN` / `RYTHME_REFUS_MAX` | `7` / `0.6` / `3` / `20` / `2` | 13.5 |

### 13.1 Consolidation espacée

```
k                      = jours calendaires distincts, STRICTEMENT après dayKey(solideDepuis),
                         portant ≥ 1 partieMesuree du cas
dernierJeu             = max(teile[t].lastAt)
prochaineConsolidation = dayKey(dernierJeu) + CONSOLIDATION_JOURS[min(k, 2)] jours
dû(c, D)               = etat ∈ {solide, pret} ∧ D ≥ prochaineConsolidation
score(c) [cas dû]      = freq × urgence × POIDS_CONSOLIDATION × fraicheur
score(c) [solide non dû] = 0
```

- La tâche est `kind: 'revision'`, avec les trois Teile et la raison
  « Solide il y a N jours : on vérifie qu'il tient. » (« Solide : … » sans
  dernier jeu daté, jamais « 0 jour »). Elle se coche par §12.3 et se lance
  par §12.1.
- *[S4]* Une tâche `dUnTrait` dit ce qu'elle exige, en une phrase :
  « Solide il y a N jours : rejoue-le d'un trait, comme à l'examen. » (dû),
  « Solide, pas encore prêt : rejoue-le d'un trait, comme à l'examen. » (choisi
  hors échéance, §12.4.7) ; un examen à blanc d'un trait :
  « Répétition générale : d'un trait et sans aide. »
- **Fenêtre « d'un trait »** (décision (a)) : les
  `FENETRE_D_UN_TRAIT_JOURS_OUVRES` derniers jours ouvrés avant l'examen,
  calculés sur la date d'examen, comme `taperDays` (INV-12). Dans cette
  fenêtre, une `revision` de `freq ≥ SEUIL_FREQUENT` porte `dUnTrait` si
  `D_UN_TRAIT_ACTIF`. Les cas solides non `prêt` sont proposés « d'un trait »
  selon §12.4.7 : en tâche de cas avant la dernière ligne droite, en examen à
  blanc pendant celle-ci (m-l).
- Limite connue : rafraîchir un seul Teil repousse l'échéance du cas entier.

### 13.2 Solide stable

Automate par Teil, appliqué dans l'ordre chronologique des événements mesurés :

```
s = score ; avant = status courant
si avant === 'solide' : s ≥ 80 → 'solide' ; s < 80 → 'acquis'          // un cran (INV-62)
sinon : s < 60 → 'fragile' ; s < 80 → 'acquis'
        s ≥ 80 → ∃ réussite antérieure ≥ 80, dayKey(s) − dayKey(antérieure) ≥ SOLIDE_ECART_JOURS
                 ? 'solide' : 'acquis'
```

- **États recalculés** avec la nouvelle règle dès S4-1 (décision (e)). Un Teil
  solide sur une seule réussite redevient `acquis`.
- **La frise passée est figée** (décision (e), INV-69). Pour
  `at < DATE_NOUVELLE_REGLE`, `indiceAt` applique la règle série 3
  (`statusOf(lastScore)`). La frise porte un repère « nouvelle règle » à
  cette date.
- **Date de bascule** (décision de `main`, 4 oct.) : `DATE_NOUVELLE_REGLE` est
  le **lendemain du jour du merge de S4-1 en production**. Le jour du merge
  lui-même garde l'ancienne règle, donc une partie déjà montrée avant le
  déploiement n'est jamais réécrite. `main` pose la constante
  (`lib/program/parametres.ts`) dans le commit de merge. La valeur portée par
  la branche (`2026-10-05`) n'est qu'une hypothèse de travail. Une date trop
  précoce réécrirait des points de frise déjà montrés (INV-69). Une date trop
  tardive figerait quelques jours de plus, ce qui est inoffensif.
- *[S4-1, revue I1]* **La pente de la projection** se lit sur les
  `slopeDays + 1` derniers jours, **recalculés avec la nouvelle règle**
  (`indiceAt(…, 'serie4')`). Elle ne traverse donc pas la marche et ne disparaît
  pas le jour de la bascule. Les points **affichés** restent figés (INV-69).
- *[S4-1]* **État « à confirmer »** (décision de `main`, 5 oct., P1 de la revue
  pédagogique de S4-1). C'est un état **dérivé**, pas un `TeilStatus` stocké :

  ```
  aConfirmer(p, jour) = p.status === 'acquis' ∧ p.solideDes != null ∧ p.solideDes ≤ jour
  ```

  Le Teil a déjà été réussi à 80 ou plus, et l'écart de `SOLIDE_ECART_JOURS`
  est passé : une seconde réussite ≥ 80 le rend solide. Ce n'est pas un Teil
  jamais travaillé. Dans la dette, il pèse `POIDS_CONSOLIDATION` (§4.3, §12.2),
  et `jour` est le jour du plan. La raison affichée par S4-2 dans le plan est
  `raisonAConfirmer(cp, jour)` (pure), qui lit `premiereReussite` :
  « Réussi à 85 le 12 sept. — une seconde partie à 80 ou plus le confirme. »
  Code : `lib/progression.ts` (`teilAConfirmer`, `raisonAConfirmer`).
- Ces changements rétroactifs sont **annoncés une fois** dans l'app
  (décision (f), `simulation-run.md` §10.7) : Teile redevenus acquis,
  `teil-first` devenu cas complet, Muster de ville devenu libre.

### 13.3 Erreurs transversales

- **Source** : `TrainingEvent.manques`, les ids sémantiques stables. **Jamais**
  `prioritizedCorrections`.
- **`partieAvecChecklist(e, t)`** (m3, m-f, défini en §12.3) : une
  `partieMesuree` dont `manques[t]` est défini, c'est-à-dire qui a une
  checklist pour le Teil `t`, et dont **tous** les ids d'origine sont stables
  (aucun `cl-N`). Concrètement, une telle partie n'a pas de `manques[t]` (§2.3).
  Une partie d'avant le pont de checklist (INV-24/INV-27) avait sa
  checklist reconstruite décochée : elle signalerait tout, elle est donc
  exclue.
- **Fenêtre** : par Teil, les `ERREUR_FENETRE` dernières `partieAvecChecklist`.
  **Signal** : manqué dans `≥ ERREUR_SEUIL` d'entre elles, sur
  `≥ ERREUR_CAS_MIN` cas distincts.
- **Sortie, tâche** : au plus un `rappel` par tâche de cas, jamais sur une
  tâche `dUnTrait` ou `examen-blanc` (réserve T1), et sans doublon dans le
  jour. Le texte est neutre (réserve T2), par exemple : « Les Allergien
  manquent dans 3 de tes 5 dernières Anamnesen ».
- **Sortie, bilan** : « cochée cette fois » ou « encore manquée (n/5) ».
  Rien n'est stocké.

### 13.4 Durées apprises

```
mesures(t)  = les DUREE_FENETRE derniers minutesParTeil[t] > 0, sur des partieMesuree
dureeTeil(t) = |mesures(t)| < DUREE_MIN_MESURES ? TEIL_MIN[t] : clamp(médiane(mesures(t)), DUREE_BORNES)
estMin(T)   = T.kind === 'simulation' ∧ mode du jour === 'teil-first'      // m-b : tâches `simulation` seulement
                ? dureeTeil(tProbable)        // m13 : tProbable = teilHabituel s'il est dans teileDeTache(T), sinon le premier de teileDeTache(T)
                : Σ dureeTeil(t) pour t ∈ teileDeTache(T)
```

Une `revision` (cas solide) et un examen à blanc portent les trois Teile :
leur `estMin` est **toujours** Σ `dureeTeil` sur les trois (m-b).
`TEIL_MIN` (20/20/12) devient le repli. `SIM_MIN` et `MOCK_MIN` disparaissent.

### 13.5 Rythme proposé

```
fenêtre = les RYTHME_FENETRE_JOURS jours calendaires finissant hier ; figés = jours avec DayPlan
propose ⇔ |figés| ≥ RYTHME_MIN_JOURS
          ∧ Σ spentByDay(figés) < RYTHME_SEUIL × Σ DayPlan.targetMin(figés)
          ∧ semaine ISO courante sans rythme.refused
          ∧ moins de RYTHME_REFUS_MAX rythme.refused consécutifs depuis le dernier program.configured   // P2
valeur  = max(BUDGET_PLANCHER_MIN, arrondi à 5 min de Σ spentByDay(figés) / |figés|), seulement si < dayTargetMin
```

- **Proposé, jamais imposé.** `accepterRythme(valeur)` écrit la **config
  complète** par `ecrireConfig` (§12.10, m-m), via `program.configured`. `refuserRythme()` écrit `rythme.refused`,
  synchronisé (§12.10). Aucun budget ne change sans geste (m2, INV-65).
- **La carte montre la conséquence, jamais l'écart** (réserve P1). Par
  exemple : « À ce rythme, les 40 cas les plus fréquents seront travaillés le
  12 déc. au lieu du 2 déc. ». Aucun pourcentage d'écart n'est affiché.
- Aucun `DayPlan` figé ne change.

### 13.6 Couverture pondérée par la fréquence (I10)

```ts
couverturePonderee(cases, progress, freqs, ville?: Center):
  { pct: number | null; base: number; portee: 'ville-ventilee' | 'toutes-villes'; ville: Center | null }

portee = ville ∧ ∃ c : freqs[c].parVille[ville] défini ? 'ville-ventilee' : 'toutes-villes'
poids(c) = portee === 'ville-ventilee' ? freqs[c].parVille[ville] : freqs[c].total   // undefined ⇒ hors calcul
base   = Σ poids(c) ; pct = base === 0 ? null : round(100 × Σ poids(c) × couverture(c)/3 / base)
```

- **Source** : `apps/site/src/data/frequencies.json` (depuis `ANALYSE.md` §3),
  `pathologies[].total` et `byCenter`. **Proposition au pôle Contenu** :
  publier côté app une table
  `FrequenceProtocoles { caseId; total: number | null; parVille: Partial<Record<Center, number>> }`
  validée en CI. Sans elle, `total = Case.frequency` et `parVille = {}`.
- **Ville** : `targetCenter` (`store/ui.ts:49`). `'Alle'` ou `'Complément'`
  ⇒ pas de ville.
- **Texte** :
  - avec une ville ventilée : « Les cas que tu as travaillés représentent
    {pct} % des protocoles, d'après {base} protocoles ventilés de Stuttgart » ;
  - en repli : « … d'après {base} protocoles, toutes villes ».

  Aucune formule EXAM_CLAIM.
- **Mesure en S4-1, affichage en S4-5** (I9). Le plan ne lit ni la ville ni
  cette mesure (INV-55).

---

## 14. *[S4-6]* Les séances de l'Historique

Source : `app/src/features/history/seances.ts`. Invariants :
`app/tests/invariants.historique.test.ts` (INV-H1 à INV-H7).

### 14.1 La séance — dérivée, jamais stockée

```ts
SEANCE_PAUSE_MIN = 30
ordre     = (at, id)
fin(e)    = max(e.at + e.spentMin × 1 min, e.enregistreA ?? 0)
séance    = chaîne maximale d'exercices, dans l'ordre, où at(suivant) − fin(séance courante) ≤ SEANCE_PAUSE_MIN
durée     = Σ spentMin            // le temps MESURÉ, jamais fin − début
```

- Les séances se recalculent depuis le journal à chaque rendu (§1.2 r. 4) ;
  elles sont rendues de la plus récente à la plus ancienne.
- **INV-H1** : toute entrée du journal est dans une séance, et une seule.
- **INV-H2** : deux exercices d'une même séance sont séparés d'au plus
  `SEANCE_PAUSE_MIN` ; deux séances, de plus.
- **INV-H3** : la durée est la somme des minutes mesurées.

### 14.2 Un cas dans la séance

- **Cadran avant** = `computeCaseProgress` du journal de ce cas antérieur à la
  séance ; **après** = le même, séance comprise (**INV-H4**). Le score affiché
  par Teil est le dernier score **mesuré** dans la séance ; un score
  auto-évalué n'est jamais présenté comme une mesure.
- **« Revoir mes N oublis »** : le bilan (`bilanErreurs`) de la dernière partie
  de la séance, restreint aux oublis encore manqués **et** toujours signalés
  aujourd'hui par `erreursTransversales` (§13.3) sur le journal entier.
  N = 0 ⇒ pas d'action.
- **« Rejouer »** : le Teil le plus faible mesuré dans la séance sous
  `PART_OK`, et toujours sous `PART_OK` aujourd'hui. Sinon, pas d'action
  (**INV-H7** : une action périmée disparaît).
- Les exercices sans cas (drill, fiche, Aufklärung) sont comptés dans le
  résumé de la séance, sans ligne de cas.

### 14.3 « Pendant cette séance » — favoris et mots cherchés

- Fenêtre : de `début` à `fin + SEANCE_PAUSE_MIN`.
- Un mot cherché est une entrée de `termes_cherches` (§9), écrite **seulement**
  au clic sur « Expliquer » (`SelectionExplainer`). Ni la sélection seule, ni
  la ★, ni les recherches qui filtrent à la frappe ne l'écrivent.
- Il est résolu vers une carte (Fachbegriff par `lookupTerm`, ou terme
  personnel `pt-…`) ; un mot sans carte n'est pas affiché.
- Sont affichés : les favoris posés dans la fenêtre, puis les cartes cherchées
  **≥ 2 fois** dans la fenêtre (**INV-H5**).
- « Envoyer au drill » = `toggleFavorite` (`term.favorited`, déjà au protocole) :
  aucun nouvel événement.

### 14.4 La ligne de semaine

- Semaine = lundi 00:00 → maintenant. Elle compte : les cas joués, les Teile
  passés à `acquis` ou plus dans la semaine, et les Fachbegriffe révisés
  (`srs.reviewed` distincts).
- La tendance compare les cas joués au **même instant** de la semaine
  précédente, jamais à la semaine entière (**INV-H6**).

### 14.5 Écart constaté, non corrigé ici

`DrillPage` journalise le drill à sa fin (`logTraining` sans `at`) alors que
§1.1 définit `at` comme le début de l'exercice. La séance le tolère (la pause de
30 min absorbe un drill), mais l'écart reste à corriger par le pôle Fondations.
