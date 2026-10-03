# Audit du module Programme — série 3 (30 sept. 2026)

> Audit lecture seule sur `main`. Chaque constat porte son `fichier:ligne`.
> Conclusion en une phrase : **le plan est une fonction pure recalculée depuis
> `now`, jamais un état matérialisé** — et les six défauts rapportés par la
> direction en découlent tous.

## 1. Ce qui est réellement persisté

| Quoi | Où | Clé | Quand |
|---|---|---|---|
| Config + ajustements | `db.meta` | `'program'` (`programAdjust.ts:5`) | à chaque action manuelle (`programAdjust.ts:25`) |
| Simulations | `db.simulations` | `sim-${Date.now()}` (`simulationSave.ts:44`) | fin de simulation |
| Avancement du cas | `db.cases` | `confidence`, `status`, `layerProgress` (`simulationSave.ts:72`) | idem |
| Compteurs drill | `db.meta` | `srs.newIntroduced:<jour>`, `srs.reviewedToday:<jour>` (`srsBudget.ts:29,35`) | par carte |
| Journal | `db.progress_events` | `simulation.completed`, `srs.reviewed`, `case.layer_reached` (`sync/events.ts:2`) | idem |
| `db.plan` (`PlanEntry`) | **table morte** — seed de démo (`seed.ts:127,152`), vidée à la connexion (`auth/session.ts:145`) |

**Le plan n'est jamais écrit.** `ProgramDay[]` est calculé à la volée
(`program.ts:307`).

Ce qui manque structurellement :
- **« fait le J »** — `ProgramAdjust` (`types.ts:566-571`) ne stocke que
  `doneLayers: caseId → number`, **sans date** ; `ProgramBlock`
  (`types.ts:586-600`) n'a ni `done`, ni `doneAt`, ni `source`.
- **« Teil couvert »** — `Case` porte `layerProgress` (`types.ts:249`) et
  `confidence`, jamais un état par Teil. La couverture par Teil n'existe qu'en
  dérivation volatile (`caseMastery`, `simScope.ts:29`).
- **« source de la tâche »** — `ExtraTask` (`types.ts:574-582`) marque
  `manual: true` à l'affichage (`program.ts:295`), mais rien ne distingue
  « issu du plan » / « lancé librement » dans `Simulation`.
- L'événement `plan.done` est **déclaré et jamais émis** (`sync/events.ts:2`,
  seuls les tests l'utilisent) : le crochet d'historique a été prévu puis
  abandonné.

## 2. Défaut 1 — la tâche cochée est remplacée

**Coupable : `schedule()` — `program.ts:122-299`**, appelée par
`generateProgram` (`program.ts:317`) à chaque rendu (`ProgramPage.tsx:51-54`,
`HomePage.tsx:39-41`, `WeekCalendar.tsx:29-33`).

Non idempotente parce qu'elle repart de zéro depuis `now` :

1. `program.ts:134-135` — `workingDays` commence à
   `nextWorkingDay(startOfDay(now))` ; le passé n'existe pas
   (`generateProgram` boucle `i = 0..lastOffset` depuis aujourd'hui,
   `program.ts:330`).
2. `program.ts:152-161` — `placeFrom()` est un **bin-packing glouton** : il
   pose la tâche sur le premier jour ouvré où il reste du budget. Toute minute
   libérée aujourd'hui est immédiatement reprise.
3. `program.ts:230-282` — `markLayerDone` (`programAdjust.ts:29`) fait passer
   `effectiveDoneLayers` de 0 à 1 (`program.ts:82-84`) ; la couche 1 disparaît
   (`program.ts:261`), **40 min se libèrent**, et `introCount`
   (`program.ts:204-205,233,235`) décale la file d'introduction d'un cran →
   **le cas suivant du classement prend la place**.
4. **L'effet existe sans rien cocher** : `drillBudget` vient de `ctx.remaining`
   (`ProgramPage.tsx:35`, `drillContext.ts:81`) et décroît à chaque carte ;
   `program.ts:186-191` recalcule `estMin` et le déduit du budget — **faire son
   drill attire de nouvelles simulations dans la journée**.
5. Frère : `taperLen(workingDays.length)` (`program.ts:35-37,136`) est calculé
   sur les jours **restants** → la fenêtre « dernière ligne droite » se
   rétrécit et glisse chaque jour ; le badge (`ProgramPage.tsx:237`)
   apparaît/disparaît tout seul.
6. Frère : `terms.due` est figé à `now` puis réutilisé pour **tous** les jours
   futurs (`program.ts:184,286`).

**La majorité des blocs n'a même pas d'action « fait »** : le bouton n'est
rendu que si `b.kind === 'simulation' && b.caseId && b.layer`
(`ProgramPage.tsx:375-380`). Fachwissen, examen à blanc (`mock:`, sans
`layer`) et reprises de partie faible (`${id}:R:${teil}`, `program.ts:217-221`)
sont **incochables**.

## 3. Défaut 2 — enchaînements de la même spécialité

`casePriority()` `program.ts:71-78`, tri `program.ts:196-200`, distribution
`program.ts:202-205,233` :

```
score = (weakness + freq) × prioBoost × statusBoost × disciplineBoost
  weakness   = lastScore === null ? 75 : max(5, 100 − lastScore)   // 5..95
  freq       = min(30, c.frequency)                                 // 0..30
  disciplineBoost = 1 + specialtyWeakness/100                       // program.ts:57-69
```

- **La fréquence est additive et plafonnée à 30**, la faiblesse monte à 95 :
  l'épidémiologie pèse au mieux **30/105 ≈ 29 %**, et disparaît dès que des
  scores existent. Sur le corpus, les fréquences vont de 26 à ~2
  (`seedCases.ts`) — écart utile de ~24 points contre 90.
- **`disciplineBoost` est une boucle de rétroaction par spécialité**
  (`program.ts:57-69,76`) : un mauvais score en Gastro relève **tous** les cas
  de Gastro. Or 13 des 130 cas sont Gastro, et ce sont les plus fréquents
  (`case-leberzirrhose` 26, `case-gib` 19, `case-magenkarzinom` 15) → le
  classement devient monochrome.
- **Aucune contrainte de diversité** : `program.ts:233` prend les 2 premiers de
  `ranked` en séquence pure. La seule anti-collision (`program.ts:215`) porte
  sur le **cas**, pas la spécialité, et seulement dans le taper.
- Frère : le tri est global — une simulation réordonne `ranked` en entier,
  donc tous les jours futurs.

## 4. Défaut 3 — « Leberzirrhose » colle à la session du jour

**Deux moteurs de sélection coexistent.**

- Accueil : `pickSessionCase` — `HomePage.tsx:50`,
  `features/simulation/pickSession.ts:10-42`.
- Programme : `casePriority` + `schedule` — `program.ts:71,122`.

`HomePage.tsx:39-41` calcule `programToday` mais ne s'en sert que pour la
liste « À faire aujourd'hui » (`HomePage.tsx:117-137`) : **le hero
« Session du jour » (`HomePage.tsx:93,102`) l'ignore totalement.**

| | `pickSession.ts` | `program.ts` |
|---|---|---|
| score | `(freq×1.2 + weakness) × centerBoost × dueBoost` (`:38`) | `(weakness + freq) × prio × status × discipline` (`:77`) |
| maîtrise | moyenne des parties de la **dernière** sim (`:20-23`) | prorata 3 Teile (`:51`) |
| exclusion | `status === 'Maîtrisé'` (`:32`) | `effectiveDoneLayers < 3` (`:197`) |

Pourquoi **ce** cas : `case-leberzirrhose` a `frequency: 26`, maximum du
corpus (`seedCases.ts:14`) ; jamais joué → `weakness = 70`
(`pickSession.ts:34`) → `score = 101,2`, strictement supérieur au 2ᵉ
(`case-tvt`, 100). Le `>` strict (`pickSession.ts:39`) verrouille le vainqueur,
la boucle est déterministe et **sans mémoire** : tant que `status` n'est pas
`Maîtrisé` (il faut `confidence ≥ 80`, donc les trois Teile excellents,
`simulationSave.ts:70-71`), il revient chaque jour.

## 5. Défaut 4 — un Teil volontaire compté comme inachevé

**Cause racine : `simScope.ts:42`**

```ts
return { score: any ? Math.round(sum / TEILE.length) : null, parts };
```

La somme des Teile **joués** est divisée par **3 systématiquement** : une
Anamnese seule réussie à 90 % donne `score = 30`.

Propagation :
- `stats.ts:117` `weakCases()` → le cas remonte en tête des **Points faibles**
  (`HomePage.tsx:194-203`, « dernier score 30 % »).
- `program.ts:51,72` → `weakness = 70` → repoussé en tête du plan.
- `simulationSave.ts:69-71` → `confidence = 30`, `status = 'À faire'` : le cas
  **régresse après une session réussie**.

Le commentaire `simScope.ts:5-8` annonce pourtant la règle inverse — la règle
écrite et le code divergent.

Frères, même famille :
- `simulationSave.ts:72` écrit `layerProgress: i.layer` **sans condition**, y
  compris en `scope: 'teil'` **et en échec** : une couche 2 ratée à 30 % marque
  `layerProgress = 2`, `effectiveDoneLayers` (`program.ts:82`) saute à la 3 —
  contredit `layerAdvice.ts:54-59`.
- Marquer « Fait » un bloc Teil valide **toute la couche** : les blocs
  `teil-first` (`program.ts:251-255`) portent `layer: 1`, donc le bouton
  (`ProgramPage.tsx:377`) appelle `markLayerDone(config, caseId, 1)` et efface
  les deux Teile restants.
- Aucune progression par Teil persistée : pas de `Case.teilProgress`.
  `weakParts` (`program.ts:209-212`) ignore les Teile jamais joués (`s != null`)
  — une partie jamais travaillée n'est **jamais** programmée en reprise.
- `readiness.ts:29-44` agrège par axe, jamais par cas × Teil ; `backlogUnits`
  (`program.ts:396`) compte `3 − layers`, jamais `9 − teile`.

## 6. Défaut 5 — le travail hors programme n'est ni historisé ni compté

- Un cas lancé librement produit une `Simulation` (`simulationSave.ts:58`)
  mais **rien ne le relie au bloc du jour** : `ProgramBlock` n'a pas d'id
  d'exécution, et aucun état `done` n'existe.
- Un drill ne produit **aucune ligne d'historique** : seulement des compteurs
  `meta` par jour (`srsBudget.ts:29-40`). Conséquences mesurables :
  - `program.ts:320-327` — `spentByDay` et `workedDays` dérivent
    **exclusivement** de `data.sims` : une journée entière de drill affiche
    `worked: false`, `spentMin: 0`.
  - `program.ts:392,402` — `adherencePct = workedDaySet.size / plannedDaysElapsed`
    : un candidat qui ne fait que du drill affiche **0 % d'assiduité** et
    déclenche le bandeau « Léger retard » (`ProgramPage.tsx:175-178`).
  - `ProgramPage.tsx:104` « Temps investi » n'additionne que
    `PartResult.durationSec` (`program.ts:394`).
- Fachwissen, Aufklärung, guides : **aucune écriture**. Les blocs
  (`program.ts:278`) n'ont ni action, ni trace, ni compteur.
- Les `extras` manuels (`program.ts:290-297`) sont réinjectés indéfiniment :
  on ne peut que les **retirer** (`ProgramPage.tsx:385`), jamais les terminer.

## 7. Défaut 6 — pas d'historique

Routes `main.tsx:56-81` : aucune route `/historique`, `/journal`, `/activite`.
Aucun composant ne liste les sessions passées.

Le plus proche : `StatsPage.tsx:44` (deux compteurs), `stats.ts:104-112`
`progressSeries()` (courbe de scores, axe X formaté et non unique, sans cas,
sans Teil, sans lien). `generateProgram` ne produit **que le futur**
(`program.ts:330`) : la vue Mois (`ProgramPage.tsx:551-583`) affiche des jours
passés toujours vides, alors que `ProgramDay.worked` et `spentMin` existent
dans le type (`types.ts:607-608`). `db.progress_events` contient de quoi
reconstruire l'historique (`sync/projections.ts`) — **rien ne le lit pour
l'afficher**.

## 8. Les visualisations, une par une

| Visualisation | Emplacement | Apport réel |
|---|---|---|
| Bandeau de sérénité | `ProgramPage.tsx:170-197` | **Trompeur** : basé sur `adherencePct`, aveugle au drill (§6) — punit le travail réel. |
| « Assiduité » | `:103` | **Négatif**, même cause. |
| « Temps investi » | `:104` | Partiel : simulations seules. |
| « Reste à couvrir » | `:105` | Unité « couche » fausse (§5), non monotone. |
| Jauge « Prêt·e » | `:71,106,190` | **Redondante** : c'est « Reste à couvrir » inversé (`1 − backlog/(cases×3)`). Deux tuiles pour une information. |
| Surface du jour | `:217-270` | **Le cœur utile**, ruiné par l'absence d'état « fait » (§2). |
| « Où le plan met l'accent » | `:278-311`, `program.ts:358-378` | Le seul honnête, mais la barre hérite du bug `layerProgress` (§5) et **l'explication ne décrit pas l'algorithme** : seuil binaire `< 60` (`program.ts:371-372`) contre `disciplineBoost` continu (`program.ts:76`). |
| Calendrier + `LoadBar` | `:439-587` | Bon pour la charge à venir ; **passé toujours vide** (§7). `LoadBar` encode deux dimensions dans 1,5 px — illisible en vue Mois (`:574`). |
| « Prochaines échéances » | `:128-154` | Doublon de la vue Semaine en desktop. |
| **Heatmap spécialité × axe** | `HomePage.tsx:235-280` | **À supprimer.** `:261` lit `axisScores[a]`, valeur **globale** : les 5 spécialités affichent **le même chiffre**. Le commentaire `:259-260` l'admet. 5 spécialités en dur (`:23`) sur 17. |
| `ReadinessGauge` | `HomePage.tsx:170` | Utile ; pénalise à 30 les axes non testés (`readiness.ts:51`) — assumé et expliqué. |
| « Points faibles » | `HomePage.tsx:188-205` | **Empoisonné** par le `/3` de `caseMastery` (§5). |
| `WeekCalendar` (accueil) | `WeekCalendar.tsx` | Duplique la vue Semaine : **troisième** appel concurrent à `generateProgram`. |

## 9. Cause racine unique

Il manque l'entité :

```ts
TaskInstance { id, date, kind, caseId, teil, layer, source, doneAt, spentMin }
```

Sans support de persistance, « figer le jour » (1), « garantir la
diversité » (2), « accorder accueil et plan » (3), « suivre Teil par Teil »
(4), « capter le hors-programme » (5) et « afficher l'historique » (6) n'ont
aucune prise. `db.plan`, `PlanEntry` et l'événement `plan.done` sont les
vestiges de cette entité, déclarés puis abandonnés.
