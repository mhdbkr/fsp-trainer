# ADR-0022 — Le cerveau du programme : consolidation, solide stable, erreurs transversales, durées, rythme, couverture pondérée

**Statut** : accepté — six améliorations retenues par la direction le
4 oct. 2026 · **Date** : 2026-10-04 · **Chantier** : série 4, lot « plan »
(et « mesure » pour §2 et §6)
· **Amende** : ADR-0017 §4 (calcul de l'état par Teil) et §6 (sélection)
· **Compagnon** : ADR-0021 · **Contrat** : `docs/contracts/training-journal.md` §13

## Contexte

Le moteur de la série 3 (`select.ts`, `dayPlan.ts`, `journal.ts`) est honnête
et déterministe. Il garde pourtant six angles morts, tous lisibles dans le code :

1. **Un cas solide sort du plan pour toujours.** `detteTeil = 0` ⇒
   `score = 0` ⇒ le cas est exclu (`select.ts:79`, `rankCandidates`). Rien ne
   le ramène avant l'examen.
2. **Un Teil devient solide sur un seul score.** `statusOf(lastScore)`
   (`journal.ts:210-211`) : une réussite chanceuse suffit, et une seule
   mauvaise partie fait tomber un Teil solide à `fragile`.
3. **Les erreurs récurrentes d'un cas à l'autre sont invisibles.** La
   checklist de chaque partie est enregistrée (`Simulation.parts[t].checklist`),
   mais aucune lecture ne la croise entre cas. `prioritizedCorrections` ne
   garde que deux libellés par Teil et six au total (`simulationSave.ts:41-53`).
4. **Les durées sont des constantes.** `TEIL_MIN = 20/20/12` et
   `SIM_MIN = 40` (`dayPlan.ts:31-32`), quel que soit le temps réel du candidat.
5. **Le budget du jour ne suit pas le rythme réel.** Un candidat qui travaille
   30 minutes par jour garde un plan de 90 minutes jamais tenu.
6. **La couverture ignore la fréquence.** Avoir travaillé dix cas rares et
   dix cas fréquents donne la même couverture.

## Décision

Chaque règle est spécifiée avec ses paramètres nommés dans
`training-journal.md` §13, et gardée par un invariant (INV-60 à INV-69).

1. **Consolidation espacée.** Un cas dont les trois Teile sont solides revient
   dans le plan après **7, 21, puis 45 jours**
   (`CONSOLIDATION_JOURS = [7, 21, 45]`, plafonné à 45), comme une carte SRS à
   l'échelle du cas. La tâche est un cas entier (`kind: 'revision'`, les trois
   Teile). Dans la **fenêtre « d'un trait »**, les cas fréquents solides
   reviennent d'un trait (`dUnTrait: true`, faits seulement par une partie
   enchaînée). Cette fenêtre couvre les 15 derniers jours ouvrés (décision
   (a) de la direction, 4 oct.). Les cas solides jamais `prêt` y sont proposés
   en priorité (ADR-0021 §5). Aucune tâche `dUnTrait` n'est générée avant que
   l'enchaînement soit en production (garde nommée `D_UN_TRAIT_ACTIF`).
   *Pourquoi 7/21/45* : une suite qui s'élargit d'environ ×3 puis ×2, du même
   ordre que l'expansion SM-2 déjà utilisée pour les Fachbegriffe. Sur une
   préparation typique de 8 à 12 semaines, un cas rendu solide en semaine 2
   revient deux ou trois fois avant l'examen. Plus serré, les cas solides
   satureraient le budget. Plus lâche, ils ne reviendraient qu'une fois.
2. **Solide stable.** Un Teil n'est `solide` qu'après **deux réussites
   ≥ 80**, dont les jours calendaires diffèrent d'**au moins 3 jours**
   (`SOLIDE_ECART_JOURS = 3`). Une seule mauvaise partie fait descendre un Teil
   solide d'**un cran seulement** (`solide → acquis`), quel que soit le score.
   La réussite unique ≥ 80 donne `acquis`. Les seuils 60 et 80 ne changent pas.
   Un Teil non solide joué il y a moins de 3 jours ne compte pas dans la dette
   du jour (réserve pédagogique R2) : le rejouer avant l'écart ne pourrait pas
   le rendre solide. Le cadran dit la raison et la date (« solide si tu refais
   ≥ 80 à partir du jeudi 9 », réserve R1).
3. **Erreurs transversales.** La source est l'item de checklist, **jamais**
   `prioritizedCorrections` (libellés tronqués, mêlés à la grille de langue).
   Un item est signalé quand il a été **manqué dans ≥ 3 des 5 dernières parties
   mesurées du même Teil, sur ≥ 2 cas distincts**. Les parties sans checklist
   pour ce Teil, ou d'avant le pont de checklist (ids `cl-N`), sont exclues.
   La tâche suivante qui contient ce Teil le dit, avec un rappel au plus, figé
   avec la tâche. Jamais sur un examen à blanc ni une tâche « d'un trait »
   (réserve T1). La formulation est neutre (T2) : « Les Allergien manquent dans
   3 de tes 5 dernières Anamnesen ». Le bilan suit le point jusqu'à ce qu'il
   repasse sous le seuil.
4. **Durées apprises.** L'estimation d'une tâche = Σ, sur ses Teile, de la
   **médiane** des 10 dernières durées mesurées du candidat pour ce Teil. Quand
   le mode observé est « par Teil », c'est la durée du Teil le plus probable
   seul (revue, m13). On applique un repli sur `TEIL_MIN` tant qu'il y a moins
   de 3 mesures. Le résultat est borné à [5, 45] min par Teil. La médiane
   plutôt que la moyenne : une partie oubliée ouverte toute une nuit ne doit
   pas fausser l'estimation.
5. **Rythme proposé.** Une semaine où le temps mesuré est **< 60 %** du
   budget des jours figés (au moins 3 jours figés sur 7), l'app **propose** de
   caler le budget sur le rythme réel. Elle n'impose jamais. La proposition
   n'est jamais à la hausse, ni sous un plancher de 20 min.
   - La carte montre la **conséquence sur la projection**, jamais l'écart en %
     (réserve P1).
   - Deux refus de suite suspendent les propositions jusqu'à la prochaine
     modification du programme (réserve P2).
   - Accepter écrit `program.configured`, désormais **projeté** sur tous les
     appareils. Refuser écrit `rythme.refused`, synchronisé (décision I2 de
     `main`).
   - Aucun budget ne change sans geste, et aucun jour figé ne change.
6. **Couverture pondérée par la fréquence.** « Les cas que tu as travaillés
   représentent X % des protocoles, d'après N protocoles ventilés de
   <ville> ».
   - Le poids d'un cas vaut son compte **ventilé** dans la ville cible.
   - Quand la ville n'a pas de données ventilées, ou sans ville, on se replie
     sur les totaux, et la phrase le dit : « d'après N protocoles, toutes
     villes » (décision I10 de `main`).
   - Chaque Teil travaillé compte pour un tiers du poids.
   - La source est `apps/site/src/data/frequencies.json`, générée depuis
     `ANALYSE.md` §3. Sa mise à disposition dans l'app est une **proposition
     au pôle Contenu**.
   - Le texte n'emploie jamais de formule EXAM_CLAIM.
   - **Le plan ne lit pas la ville** (INV-55). La mesure est construite en
     S4-1, et l'affichage en S4-5.

## Alternatives écartées

- **(1) Laisser `fraicheur` ramener seule les cas solides.** Elle multiplie un
  score dont `detteTeil = 0` fait déjà zéro : elle ne peut rien ramener.
  **Un plancher de dette** (un cas solide garde `detteTeil = 1/3`) le
  ramènerait chaque jour, sans espacement. Le score d'un cas dû garde donc
  ce poids (`POIDS_CONSOLIDATION = 1/3`), mais uniquement à l'échéance.
- **(2) Moyenne des k derniers scores.** Elle lisse sans prouver la durée :
  deux réussites le même soir comptent comme deux réussites espacées.
  L'écart de trois jours est le seul critère qui teste la rétention.
- **(3) Lire `prioritizedCorrections`.** Ce sont des chaînes concaténées,
  tronquées à deux par Teil. Le même item, sous deux libellés, ne se
  rapproche pas. L'id sémantique stable (`anam-allergien`, INV-27) est fait
  pour cela.
- **(4) Moyenne des durées.** Une seule partie restée ouverte trois heures
  ferait déborder tous les plans suivants.
- **(5) Ajuster le budget automatiquement.** Ce serait la machine qui
  impose, à l'inverse de la règle de symbiose.
- **(6) Pondérer la sélection par la ville.** Le réglage est local, non
  synchronisé : deux appareils divergeraient. Et la donnée par ville est
  partielle (ADR-0021, contradiction 13).

## Conséquences

- `TrainingEvent` gagne quatre champs **dérivés** de `simulation.completed` :
  `manques` (ids d'items non cochés, par Teil), `minutesParTeil`, `enchaine`
  et `examen`. `training.logged` est inchangé (son schéma serveur est
  `.strict()`).
- `TaskInstance` gagne `rappel`, `dUnTrait` et `creeA`. `CaseProgress` gagne
  `solideDepuis`, `pretAt` et `prochaineConsolidation`.
- **Les états sont recalculés avec la nouvelle règle, mais la frise passée est
  figée** (décision (e), 4 oct.). Avant `DATE_NOUVELLE_REGLE`, `indiceAt`
  applique la règle série 3, avec un repère « nouvelle règle » (INV-69). Les
  Teile redevenus acquis sont annoncés une fois (décision (f)). La frise quitte
  le Programme et vit dans l'Historique, sans projection (décision (c)).
- `observeModus` ne pilote plus de proposition. L'observation ne choisit
  qu'entre `cas-complet` et la pondération par Teil (décision I8).
- Migration serveur `20261004000018_s4_preference_events.sql`
  (`rythme.refused`, `rattrapage.refused`), et schémas ajoutés à la fonction
  `events` (`training-journal.md` §12.10).
- La donnée de fréquences par ville est à produire côté app (pôle Contenu).
  Tant qu'elle manque, §6 se replie sur `Case.frequency`, « toutes villes ».
- Les contradictions relevées sont tenues dans un seul registre : ADR-0021
  §« Contradictions relevées ».
