# ADR-0017 — Le journal d'entraînement est la source ; le plan du jour est figé

**Statut** : proposé · **Date** : 2026-09-30 · **Chantier** : P0 série 3

## Contexte

L'audit du module Programme (`app/docs/reports/audit-programme-serie3.md`)
conclut en une phrase : **le plan est une fonction pure recalculée depuis `now`,
jamais un état matérialisé**. `schedule()` (`program.ts:122-299`) est appelée à
chaque rendu, depuis trois endroits concurrents (`ProgramPage.tsx:51-54`,
`HomePage.tsx:39-41`, `WeekCalendar.tsx:29-33`), et repart de zéro : le passé
n'existe pas, le placement est un bin-packing glouton, toute minute libérée est
immédiatement reprise.

Six défauts rapportés par la direction en découlent, tous mesurés :

- cocher une tâche libère 40 min et décale `introCount` → **le cas suivant du
  classement prend la place** (`program.ts:230-282`) ;
- deux moteurs de sélection coexistent — `pickSessionCase`
  (`pickSession.ts:10-42`) pour l'accueil, `casePriority` + `schedule` pour le
  programme, avec des barèmes différents → la session du jour diverge du plan ;
- `caseMastery` divise la somme des Teile **joués** par 3 systématiquement
  (`simScope.ts:42`) : une Anamnese seule réussie à 90 % donne 30, le cas
  **régresse après une session réussie** et remonte en point faible ;
- la fréquence épidémiologique pèse au mieux **30/105 ≈ 29 %** et disparaît dès
  que des scores existent ; `disciplineBoost` (`program.ts:57-69`) relève tous
  les cas d'une spécialité → classement monochrome ;
- un drill ne produit aucune ligne d'historique : une journée entière de drill
  affiche `worked: false`, `spentMin: 0`, `adhérence 0 %` ;
- aucune route d'historique n'existe, alors que `db.progress_events` contient de
  quoi le reconstruire.

L'entité manquante, nommée par l'audit :
`TaskInstance { id, date, kind, caseId, teil, layer, source, doneAt, spentMin }`.
`db.plan`, `PlanEntry` et l'événement `plan.done` en sont les vestiges : déclarés
puis abandonnés.

## Décision

1. **Un journal d'entraînement append-only est la seule source.** Tout exercice
   écrit exactement un `TrainingEvent`, y compris hors plan. Statistiques,
   historique, indice de préparation, sélection, champ de couverture en
   dérivent. Aucun écran ne lit `db.simulations` directement.
2. **Le plan du jour est matérialisé une fois**, à la première ouverture de la
   journée, et stocké. Il n'est jamais recalculé au rendu. Cocher une tâche pose
   `doneAt` ; **rien d'autre ne bouge**. « Replanifier » est une action nommée,
   déclenchée par un geste explicite, qui conserve les tâches déjà faites.
   Aucun jour futur n'est matérialisé.
3. **La session du jour est la première tâche non faite du plan figé.**
   `pickSessionCase` est supprimée. Un seul moteur de sélection dans le dépôt.
4. **Un cas n'a plus de pourcentage : il a un état par Teil.** `caseMastery`,
   `Case.confidence`, `Case.status`, `Case.layerProgress` disparaissent du
   chemin d'écriture, remplacés par la projection `case_progress`
   (`vierge | fragile | acquis | solide` par Teil).
5. **Un point faible se décide sur la performance, jamais sur l'absence.**
   `'vierge'` n'est jamais un point faible ; c'est « pas encore travaillé », en
   teinte neutre. La **dette** (qui ordonne le travail) et la **faiblesse** (qui
   nomme un défaut) sont deux notions distinctes qui ne se confondent pas.
6. **La diversité est une contrainte dure, pas une pondération.** Score =
   fréquence × urgence × dette de Teil × fraîcheur — quatre facteurs
   multiplicatifs, aucun terme additif plafonné. Jamais deux spécialités
   identiques consécutives ; au plus deux par fenêtre de cinq. Relâchement
   uniquement quand le pool éligible est épuisé, et tracé
   (`diversityRelaxed: true`).
7. **Le mode d'avancement est explicite** (`teil-first`, `cas-complet`,
   `specialite`, `examen-blanc`), figé avec chaque jour. On ne suppose pas la
   stratégie du candidat.
8. **Les invariants sont écrits avant le code qu'ils gardent** : douze
   propriétés testables (INV-1 à INV-12), exécutées par le harnais C6 avec une
   horloge injectable.

Contrat : `docs/contracts/training-journal.md`.

## Alternatives écartées

- **Rendre `schedule()` idempotente sans matérialiser.** Une fonction pure de
  `now` ne peut pas se souvenir de ce qui a été coché : il faudrait lui injecter
  un état, c'est-à-dire matérialiser, avec une indirection en plus.
- **Un `TrainingEvent` synchronisé pour chaque simulation, en doublon de
  `simulation.completed`.** Deux événements pour un fait ; la projection les
  dédoublonnerait. On dérive plutôt le `TrainingEvent` de
  `simulation.completed`, avec un id déterministe.
- **Table `task_instances` séparée.** Une tâche n'est jamais lue hors de son
  jour ; `day_plans` porte ses tâches en ligne.
- **Garder `disciplineBoost` avec un coefficient plus faible.** L'audit mesure
  que c'est une boucle de rétroaction : elle ne se règle pas, elle se retire.

## Conséquences

- Dexie v5 : `training_events`, `day_plans`, `case_progress` ajoutés ;
  `plan: null`. Aucune table Supabase touchée.
- Trois types d'événements ajoutés au `sync-protocol.md`, un retiré
  (`plan.done`). `plan.materialized` introduit la **seule exception au
  dernier-gagne** : le plus ancien `occurred_at` gagne, parce que « figé » veut
  dire que le premier appareil qui ouvre la journée la fige.
- `ProgramBlock`, `ProgramDay`, `ExtraTask`, `ProgramAdjust` sont remplacés.
  L'étiquette de tâche cesse d'être une chaîne concaténée dans `lib/program.ts`
  et redevient une lecture de champs typés (voir ADR-0020).
- Une page d'historique devient possible sans code neuf : elle lit le journal.
- Un client antérieur ignore les nouveaux types d'événements : pas de
  régression multi-appareils.
- Périmètre d'écriture : C1 (`app/src/lib/program*`, `features/program`,
  `features/stats`, aperçu de `HomePage`), C6 (harnais).
