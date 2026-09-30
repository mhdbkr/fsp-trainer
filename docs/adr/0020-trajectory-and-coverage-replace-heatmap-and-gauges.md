# ADR-0020 — Retrait de la heatmap et des jauges empilées ; frise de trajectoire et champ de couverture

**Statut** : proposé · **Date** : 2026-09-30 · **Chantier** : P0 série 3

## Contexte

La direction critique le module Programme sur ses visualisations (FB3-D8) :
« Où le plan met l'accent » et la heatmap donnent une impression de tableau de
bord sans jamais répondre à la seule question qui compte : *pourquoi ça,
aujourd'hui ?*

L'audit mesure, une par une
(`app/docs/reports/audit-programme-serie3.md` §8) :

| Visualisation | Mesure |
|---|---|
| **Heatmap spécialité × axe** (`HomePage.tsx:235-280`) | `:261` lit `axisScores[a]`, une valeur **globale** : les 5 spécialités affichent **le même chiffre**. Le commentaire `:259-260` l'admet. 5 spécialités en dur (`:23`) sur 17. |
| **« Où le plan met l'accent »** (`ProgramPage.tsx:278-311`) | Le seul honnête, mais la barre hérite du bug `layerProgress` et **l'explication ne décrit pas l'algorithme** : seuil binaire `< 60` (`program.ts:371-372`) contre `disciplineBoost` continu (`program.ts:76`). |
| Bandeau de sérénité / « Assiduité » | **Trompeurs** : basés sur `adherencePct`, aveugles au drill — un candidat qui ne fait que du drill affiche **0 %** et déclenche « Léger retard ». |
| « Reste à couvrir » | Unité « couche » fausse, non monotone. |
| Jauge « Prêt·e » | **Redondante** : c'est « Reste à couvrir » inversé. Deux tuiles pour une information. |
| « Points faibles » | **Empoisonné** par le `/3` de `caseMastery`. |
| Calendrier + `LoadBar` | Bon pour la charge à venir ; **passé toujours vide** ; `LoadBar` encode deux dimensions dans 1,5 px — illisible en vue Mois. |
| `WeekCalendar` (accueil) | Duplique la vue Semaine : **troisième** appel concurrent à `generateProgram`. |

Une heatmap de régularité mesure l'assiduité, pas la préparation. Elle
culpabilise, et ce qu'elle culpabilise est faux (le drill ne compte pas).

## Décision

1. **La heatmap spécialité × axe est supprimée.** Elle affiche cinq fois la
   même valeur globale sur cinq spécialités en dur parmi dix-sept. Elle n'est
   pas réparée : il n'y a rien à réparer, l'information qu'elle prétend porter
   n'existe pas dans sa source.
2. **Les jauges empilées « Où le plan met l'accent » sont supprimées**, avec la
   tuile « Prêt·e » (redondante), « Assiduité » et le bandeau de sérénité (tous
   dérivés d'un `adherencePct` aveugle au drill).
3. **Elles sont remplacées par deux objets, et deux seulement** :
   - une **frise de trajectoire** — l'indice de préparation dans le temps, avec
     la date d'examen comme horizon et la projection « à ce rythme » ;
   - un **champ de couverture** — le corpus en spécialités × Teile, qui se
     remplit ; on y lit d'un coup ce qui est `vierge`, `entamé`, `solide`.
     Interactif : toucher une cellule propose l'exercice correspondant.
4. **Les trois états du champ de couverture sont la projection de
   `case_progress`** (ADR-0017) : `vierge` / `entamé` (= `fragile` ∪ `acquis`) /
   `solide`. `vierge` est affiché en **teinte neutre** — c'est « pas encore
   travaillé », jamais un défaut. Le champ ne peut pas accuser par absence.
5. **L'aperçu d'accueil est resserré** : la tâche du jour, son explication en
   une ligne, l'état d'avancement du plan figé. Rien d'autre. `WeekCalendar` ne
   recalcule plus rien.
6. **Une page d'historique est ajoutée** : frise inversée des `TrainingEvent`,
   filtres (Teil, spécialité, source), et le total honnête de ce qui a été fait.
   Elle lit le journal ; elle n'a pas de calcul propre.
7. **Chaque proposition s'explique en une ligne**, figée avec la tâche
   (`TaskInstance.reason`). La confiance ne vient pas de la précision de
   l'algorithme, elle vient de sa lisibilité.
8. **L'étiquette de tâche cesse d'être une chaîne concaténée.**
   `lib/program.ts` construit aujourd'hui huit chaînes qui fondent titre et
   type (`program.ts:167,218,252,268,278,286`,
   `ProgramPage.tsx:259`, `simScope.ts:47`) alors que le type porte déjà les
   champs — puis la vue les ré-affiche à côté, en double. Le champ `label`
   redevient le **seul nom du sujet** ; type, Teil, couche et coût se lisent
   dans les champs de `TaskInstance`.

## Alternatives écartées

- **Corriger la heatmap** en lui donnant de vraies valeurs par spécialité. Ce
  serait le champ de couverture, avec un nom et une forme qui culpabilisent.
- **Garder « Où le plan met l'accent » en corrigeant son explication.** Son
  explication décrit un seuil binaire quand l'algorithme est continu : le
  désaccord n'est pas rédactionnel, il est structurel. Et l'ADR-0017 remplace
  l'algorithme.
- **Ajouter une visualisation d'assiduité correcte** (drill compris). Mesurer
  l'assiduité est possible ; l'afficher en tête reste une mesure de présence,
  pas de préparation. Elle n'est pas remise, elle est remplacée.

## Conséquences

- Suppressions : `HomePage.tsx:235-280` (heatmap), `ProgramPage.tsx:103-106`
  (quatre tuiles), `:170-197` (bandeau), `:278-311` (jauges), `:128-154`
  (« Prochaines échéances », doublon de la vue Semaine en desktop).
- Ajouts : frise de trajectoire, champ de couverture, page `/historique`
  accessible depuis la barre latérale.
- Dépendance dure : la frise et le champ ne sont pas implémentables avant le
  journal (ADR-0017) — ils en sont des lectures. C1 les livre dans le même
  chantier.
- `DIRECTION-STYLE.md` §2.3 s'applique aux deux objets : discret au repos,
  élégant à l'usage. La matière (verre, profondeur) marque le moment, jamais le
  fond de chaque carte.
- Ce qui est supprimé ne revient pas « en option » : deux façons d'afficher la
  même chose est exactement le défaut mesuré (jauge « Prêt·e » = « Reste à
  couvrir » inversé).
