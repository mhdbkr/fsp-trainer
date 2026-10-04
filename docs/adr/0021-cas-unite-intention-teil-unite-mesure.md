# ADR-0021 — Le cas comme unité d'intention, le Teil comme unité de mesure

**Statut** : accepté — décisions de la direction du 4 oct. 2026 (y compris
l'échelle d'états jusqu'à `prêt` et l'anneau soudé, validés le même jour)
· **Date** : 2026-10-04 · **Chantier** : série 4 « le cas entier à l'écran,
mesuré au Teil en dessous »
· **Source** : `docs/superpowers/specs/2026-10-04-cas-entier-cadran.html`
· **Amende** : ADR-0017 §4 et §7, ADR-0018 §2, ADR-0020 §3 et §4
· **Compagnon** : ADR-0022 (le cerveau du programme)
· **Contrats** : `docs/contracts/training-journal.md` §12, `docs/contracts/simulation-run.md` §10

## Contexte

La série 3 a rendu la mesure honnête : un état par Teil (`case_progress`), un
journal append-only, un plan du jour figé. Elle a aussi mis le Teil **en
surface** : choix « complète ou un Teil » à la pré-simulation (FB2-P, carte
retournable de `SimulationHub`), tâches « Anamnese de Leberzirrhose »
(`dayPlan.ts:173-195`, mode `teil-first` par défaut, `modusOf` :
`dayPlan.ts:39-42`), proposition « tu avances par Teil, je cale le
programme ? » (`modus.ts:97-104`, `ProgramPage.tsx:107`).

La direction juge cette surface morcelée : la journée se lit en fractions de
cas et l'avancement se brouille. Le Teil reste la bonne unité de **mesure**
(trois gestes distincts à l'examen, un candidat solide sur l'un et fragile sur
l'autre) ; il est une mauvaise unité d'**intention**.

Le code ne demande aucun changement de mémoire : le suivi par Teil existe
(`journal.ts:223-246`), et la règle de complétion d'une tâche « cas complet »
cumule déjà les Teile joués le même jour (`completeAssez`,
`journal.ts:346-347`). Le changement porte sur l'interface, la génération du
plan et l'automate de partie.

## Décision

1. **L'interface montre le cas entier.** La pré-simulation ne propose plus de
   choix de Teil, le programme ne pose plus de tâche d'un seul Teil et aucun
   mode « par Teil » n'apparaît en surface. Le mode reste **observé** en
   interne et oriente la sélection en silence. La proposition de mode disparaît.
2. **Pendant la partie, les trois Teile s'enchaînent.** À la fin de chacun :
   « Continuer » ou « Terminer ici ». Le fil d'étapes permet de commencer par un
   autre Teil (`springeZu`, nouvelle transition nommée de l'automate,
   `simulation-run.md` §10.2).
3. **Une tâche est un cas, et son texte dit ce qui reste.** « Leberzirrhose ·
   il te reste la Dokumentation · 10 min ». **Une tâche de cas est faite quand
   tout ce qui restait au moment du plan est joué.** Une partie partielle fait
   avancer le cadran de la tâche. Elle n'est jamais comptée manquée, et le reste
   revient en tête le lendemain, proposé et jamais imposé. Les plans déjà figés
   avec des tâches d'un seul Teil restent valides jusqu'à la fin de leur
   journée (lecture tolérante, INV-54).
4. **La couverture et la maîtrise sont séparées.** Couverture = nombre de Teile
   travaillés (0–3). Maîtrise = moyenne des derniers scores des Teile joués. Un
   cas inachevé ne baisse jamais la maîtrise (INV-53).
5. **L'échelle d'états d'un cas**, dérivée du journal :
   `vierge` → `entamé` (≥ 1 Teil joué) → `couvert` (3 Teile joués) → `solide`
   (3 Teile solides) → **`prêt`** (les 3 Teile joués **d'un trait**, dans une
   même partie sans interruption, chacun ≥ seuil solide, et le cas encore
   solide). Raison : l'examen enchaîne les trois Teile, et l'endurance fait
   partie de la préparation. Un `prêt` exige un enchaînement réel (INV-56) :
   la donnée est `Simulation.enchaine`, posée par l'automate (INV-73).
6. **Le cadran `CaseDial`** est une primitive unique en quatre tailles : carte
   de cas, ligne de tâche, pré-simulation, fin de partie. La position dit le
   Teil, toujours au même endroit, et la couleur dit l'état (vierge neutre,
   fragile, acquis, solide). Le centre affiche la **maîtrise** et l'anneau
   extérieur la couverture. Des Teile complétés séparément donnent trois arcs
   séparés. Un cas `prêt` donne des arcs **soudés** en anneau continu. Le
   contrat fixe la **donnée** lue par le cadran (`CaseDialData`,
   `training-journal.md` §12.6), pas son rendu.
7. **Les fréquences** peuvent figurer dans les encarts (« revient souvent dans
   les protocoles de ta ville »). Elles sont toujours sourcées par le nombre de
   protocoles et ne sont jamais présentées comme « ce que le jury note »
   (garde EXAM_CLAIM).
8. **Ordre de la pré-simulation** : en-tête du cas (cadran) → « Avec qui tu
   joues » → niveau d'assistance → Muster.
9. **Le Muster offre deux choix au lieu de cinq.** **Guidé** : toutes les
   rubriques de l'anamnèse, un champ par rubrique. **Libre** : les rubriques
   d'identité, puis un grand champ de rédaction libre. Les simulations
   existantes sont lues avec tolérance et aucune note n'est perdue (INV-74).
10. **Ordre des chantiers** : contrat → mesure (couverture et maîtrise) →
    plan → partie (avec la pré-simulation et le Muster) → cadran → Programme →
    Historique → **Examen en dernier**. L'Examen remplace la page Simulation,
    après un audit préalable de `feat/pruefungstag`.

## Ce qui est retiré de la série 3, et pourquoi

| Retiré | Où | Pourquoi |
|---|---|---|
| Choix « complète / un Teil » à la pré-simulation (`ModeChooser`, `?teil=`) | `PreSimulationPage.tsx:41-72` | Décision 1. `?teil=` survit comme **départ** (`?depart=`), jamais comme périmètre. |
| Carte retournable pour choisir un Teil (FB2-P) | `SimulationHub.tsx` | Sa seule raison d'être était le choix de Teil. La page entière est remplacée par « Examen » en dernier chantier. |
| Tâches d'un seul Teil (`TaskInstance.teil`) | `dayPlan.ts:173-195` | Décision 3. Le champ est **lu** pour les anciens plans, et n'est plus jamais écrit. |
| Proposition de mode (`modusAProposer`, refus retenu) | `modus.ts:97-104`, `ProgramPage.tsx:107`, `ProgramSetup.tsx:121` | Décision 1 : l'adaptation devient silencieuse. `observeModus` est conservé. |
| Mode par défaut `teil-first` (`modusOf`) | `dayPlan.ts:39-42` | Le mode effectif devient le mode observé, `cas-complet` à défaut (§12.4 du contrat). |
| Champ de couverture spécialités × Teile | ADR-0020 §3–4, `lib/program/coverage.ts` | L'axe des Teile quitte la surface. La carte de couverture est faite de cadrans, au chantier Programme. |
| `Lauf.modus = 'teil'` pour les parties nouvelles | `useLauf.ts:100-107` | Toute partie nouvelle planifie les trois Teile. `'teil'` reste lisible pour un `lauf.aktiv` antérieur. |

La mesure construite par la série 3 (`case_progress`, journal, plan figé,
cumul des Teile du jour) est **conservée** : elle porte la nouvelle surface.

## Alternatives rejetées

- **Cocher la tâche dès qu'un Teil est joué.** C'est plus gratifiant, mais
  l'avancement devient moins honnête : une tâche « cas entier » cochée après
  l'Anamnese seule ment.
- **Mettre au centre du cadran un taux de complétion.** L'accent irait sur
  « finir » plutôt que sur « bien faire ». La complétion se lit déjà sur
  l'anneau extérieur.
- **Donner une couleur à chaque Teil.** La couleur aurait deux sens à décoder
  à la fois. La position porte le Teil et la couleur porte l'état.
- **Garder le mode « par Teil » en option dans les réglages.** Deux surfaces
  pour la même intention : c'est exactement le défaut mesuré en série 3.
- **Définir `prêt` comme « trois Teile solides le même jour ».** Ce critère ne
  prouve pas l'endurance : trois Teile joués à six heures d'intervalle ne
  préparent pas à 60 minutes d'affilée.
- **Supprimer la page Simulation, ou la fondre dans l'Historique.** La fondre
  mélange « ce que j'ai fait » et « ce que je vais faire ». La remplacer par
  « Examen » (cas tiré au sort, conditions réelles) lui donne la seule chose
  qu'aucune autre page ne fait.
- **Garder les cinq Muster-Bogen par ville.** La direction les juge trop
  semblables. Le choix réel est entre « guidé » et « libre ».

## Conséquences

- `TaskInstance` gagne `teile` (ce qui restait au moment du plan), ainsi que
  `rappel` et `dUnTrait` (ADR-0022). `teil` devient lecture seule.
  `Simulation` gagne `enchaine`. `Lauf` gagne `unterbrochen`. `MusterCity`
  devient `MusterArt`, avec une lecture tolérante des villes.
- `CaseProgress` gagne `couverture`, `maitrise`, `etat`, `pretAt`,
  `solideDepuis` et `prochaineConsolidation`. `overall` est déprécié et dérivé
  de `etat`.
- **Aucune table Supabase, aucune migration SQL.** `plan.materialized` accepte
  déjà des champs de tâche supplémentaires (`events/index.ts:25-28`,
  `.passthrough()`), et `simulation.completed` n'a pas de schéma serveur. Une
  validation de `teile` côté serveur est **proposée** (`training-journal.md`
  §12.9) ; elle n'est pas requise.
- Un client série 3 qui lit un plan série 4 voit des tâches sans `teil`. Il les
  traite comme des runs complets, donc il exige les trois Teile : il ne coche
  jamais **à tort**. `doneAt` se dérivant du journal, il ne décoche jamais non
  plus.
- Le harnais C6 (`feat/s3-c6-candidat`) est réécrit **avant** le code, avec un
  nouveau profil : quelqu'un qui joue librement un Teil ici et un cas entier
  là. Liste des invariants : `training-journal.md` §8 et
  `simulation-run.md` §7.

## Propositions non tranchées

N'y figure que ce que `main` a soumis à l'architecte. L'échelle jusqu'à
`prêt`, l'anneau soudé et la proposition « d'un trait » ont été **décidés** le
4 oct. Il ne reste qu'un paramètre, posé par l'architecte :

- **Fenêtre « d'un trait » = la dernière ligne droite existante**
  (`taperDays`, `dayPlan.ts:66-73` : 15 % des jours ouvrés, entre 3 et 8). Elle
  est cohérente avec INV-12 (la fenêtre se calcule sur la date d'examen et ne
  glisse pas). Si elle paraît trop courte pour proposer tous les cas `solide`
  non `prêt`, l'alternative est de la doubler. **À confirmer.**

## Contradictions relevées — nommées, non tranchées en silence

1. **Q1 et ADR-0017 §7 contre la décision 1.** ADR-0017 §7 écrit « Le mode
   d'avancement est explicite… On ne suppose pas la stratégie du candidat ».
   Q1 a ensuite été tranchée (30 sept.) en « déduit puis **proposé** »
   (`modus.ts:1-10`). La série 4 retire la proposition : le mode est supposé,
   en silence. **Tranché par la direction (4 oct.)**. ADR-0017 §7 est amendé
   par celui-ci, et `ProgramSetup.tsx:121` tient encore le texte de la
   proposition.
2. **ADR-0020 §3–4 contre la décision 1.** ADR-0020 impose « deux objets, et
   deux seulement » : la frise et le champ spécialités × Teile. Le champ
   disparaît. **La frise de trajectoire n'est ni confirmée ni retirée** par la
   proposition. La page Programme (§4 de la proposition) parle d'une
   « projection sur ton rythme réel », sans dire si elle remplace la frise.
   Question pour la direction, au chantier Programme.
3. **FB2-P (carte retournable) et `Simulation.scope/teil`.** La décision 1
   retire la carte. `scope`/`teil` restent écrits comme **fait** (portée
   jouée, `speichern.ts:162-165`), jamais comme intention : il n'y a pas de
   contradiction de donnée, seulement de surface.
4. **Le terme « maîtrise du cas »** figure dans les « Termes à éviter » de
   `CONTEXT.md` (ADR-0017 : « un cas n'a pas de pourcentage »). La décision 4
   en fait la mesure centrale du cadran. **Résolu dans `CONTEXT.md`** : la
   maîtrise est une moyenne **des Teile joués**, jamais un pourcentage du cas.
   « % du cas » et « confiance » restent proscrits.
5. **Le budget du jour contre la tâche de cas entier.** `SIM_MIN = 40` pour un
   run complet (`dayPlan.ts:31`), alors que Σ `TEIL_MIN` = 52
   (`dayPlan.ts:32`). Avec `used + estMin > targetMin ⇒ break`
   (`dayPlan.ts:187`), un budget de 40 min ne pose **aucune** tâche de cas
   entier vierge. **Tranché ici par l'architecture** (§12.3 du contrat) : la
   première tâche de cas d'un jour ouvré est posée même au-delà du budget. Cela
   déroge à M3 (« jamais au-delà du budget »), qui ne visait que l'examen à
   blanc.
6. **INV-55 (deux appareils, même journal, même plan) échoue sur le code
   actuel.** `selectContext` lit `input.now`, l'instant de matérialisation
   (`dayPlan.ts:230`), pour la fraîcheur, et `counts(begriffe, input.now)` pour
   le drill (`dayPlan.ts:136`). Deux appareils qui ouvrent à 8 h et à 14 h ne
   calculent pas le même plan. INV-7 (le premier fige) masquait le défaut ; le
   report des coches entre appareils (D-I2, `journal.ts:184`) en dépend.
   **Tranché ici** : la sélection lit le début du jour `date`, et le drill la
   fin du jour (§12.3).
7. **INV-4 et la diversité selon le mode.** C1/C2 étaient suspendues en
   `cas-complet` (contrat §6), au motif d'un choix **déclaré**. Un mode observé
   en silence ne doit pas rendre un plan monochrome. **Tranché ici** : C1/C2
   s'appliquent dans tous les modes, sauf `specialite`.
8. **Le Muster porte deux sens.** `CONTEXT.md` : « Muster » désigne la phrase
   modèle d'Arztbrief/Fallvorstellung (`caseMuster.ts`, `musterSaetze`) ;
   « Muster-Bogen » désigne la feuille de notes par ville (`MusterCity`). La
   décision 7 de la direction vise **la feuille de notes**. Inventaire :
   `caseMuster.ts` ne lit pas `MusterCity` (vérifié). **Résolu dans
   `CONTEXT.md`** : « Muster guidé / libre » s'applique à la feuille de notes,
   et les phrases modèles deviennent « Mustersätze ».
9. **La couche (`Layer`) n'est pas dans l'ordre de la décision 6.**
   `SimulationSetup.tsx` règle assistance · couche · Muster. La décision 6 ne
   cite pas la couche. **Comportement provisoire** : la couche reste dans le
   bloc « niveau d'assistance », sans nouvelle position. Question pour la
   direction.
10. **Q7 est périmée dans `simulation-run.md` §0.** Q7 y figure encore « non
    tranchée ». Or `motionSafe.test.ts:6-30` l'a tranchée le 30 sept. (règle
    A globale, règle B `motion-safe:` pour `components/visuals/*`).
    Conséquence : `CaseDial` vit dans `components/visuals/`, et la règle B
    s'y applique. Amendé dans `simulation-run.md`.
11. **Le « solide stable » (ADR-0022 §2) contredit trois sources.** D'abord le
    contrat §4.1 (« status = f(lastScore) », « aucun seuil neuf ») : un écart
    de 3 jours est un paramètre neuf. Ensuite la frise `indiceAt`
    (`trajectory.ts:46-52`) : à son déploiement, l'indice se recalcule sur
    tout le journal et **la courbe passée descend** (une réussite unique pèse
    0,7 au lieu de 1). Enfin, une Anamnese à 85 affichée « acquis » quand le
    centre du cadran dit 85. **La direction a tranché (4 oct.)** ; la descente
    rétroactive de la frise est une conséquence à annoncer, pas un défaut.
12. **Un enchaînement ne se prouve pas sur l'historique.** Les simulations
    antérieures n'ont ni `enchaine` ni trace d'interruption. Aucune n'est
    `prêt` rétroactivement : les runs complets déjà joués par Mehdi et Lydia ne
    soudent pas l'anneau. **Tranché ici** (lecture conservatrice, INV-56) ;
    conséquence à annoncer.
13. **Fréquences par ville : la donnée est partielle.** `frequencies.json`
    (site) ne ventile par centre que **20 pathologies sur 81**. Cela représente
    39/91 protocoles à Freiburg, 97/169 à Karlsruhe, 79/151 à Reutlingen et
    96/182 à Stuttgart. L'app n'a que `Case.frequency` (total) et
    `Case.centers` (liste sans comptes). **Tranché ici** (ADR-0022 §6) : la
    base affichée est la base ventilée, nommée dans le texte, et jamais le
    total du centre.
14. **Sentinelle « non saisi » (lot C6-A) contre les valeurs par défaut du
    `Lauf`.** `setzeEntwurf`/`bewerte` (`automat.ts:144,174`) donnent
    `feeling: 50` par défaut. Un indice consulté pendant l'Anamnese crée le
    brouillon avant l'amorce `NOT_ENTERED` du runner
    (`SimulationRunner.tsx:189,401` sur `feat/s3-c6a-chiffres`). Un ressenti
    jamais touché compterait alors 50. Non vérifié en exécution. Détail et
    correctif : `simulation-run.md` §9.5. Garde : INV-29.
