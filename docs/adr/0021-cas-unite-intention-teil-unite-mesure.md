# ADR-0021 — Le cas comme unité d'intention, le Teil comme unité de mesure

**Statut** : accepté — décisions de la direction du 4 oct. 2026 (voir
« Journal des décisions ») ; corrigé après deux revues (voir « Revues »)
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
   mode « par Teil » n'apparaît en surface. L'observation, silencieuse, ne
   choisit qu'entre `cas-complet` et une pondération interne par Teil.
   `examen-blanc` et `specialite` restent des choix **explicites** du
   candidat, respectés (I8). La proposition de mode disparaît.
2. **Pendant la partie, les trois Teile s'enchaînent.** À la fin de chacun :
   « Continuer » ou « Terminer ici ». Le fil d'étapes permet de commencer par un
   autre Teil (`springeZu`, exception nommée nº 4 de l'automate,
   `simulation-run.md` §10.2).
3. **Une tâche est un cas, et son texte dit ce qui reste.** Par exemple :
   « Leberzirrhose · il te reste la Dokumentation · 10 min ».
   - **Une tâche de cas est faite quand tout ce qui restait au moment du plan
     est joué.** Cette complétion est **dérivée du journal synchronisé** et
     jamais figée à l'écriture (I4). Le genre de la partie n'y compte pas (I3).
   - Une partie partielle fait avancer le cadran de la tâche. Elle n'est jamais
     comptée manquée, et le reste revient en tête le lendemain, proposé et
     jamais imposé.
   - Une tâche « d'un trait » se fait en une seule partie, tout ou rien (I5).
   - Les plans déjà figés avec des tâches d'un seul Teil restent valides
     jusqu'à la fin de leur journée (INV-54).
4. **La couverture et la maîtrise sont séparées.** Couverture = nombre de Teile
   travaillés (0–3). Maîtrise = moyenne des derniers scores des Teile joués. Un
   cas inachevé ne baisse jamais la maîtrise (INV-53).
5. **L'échelle d'états d'un cas**, dérivée du journal :
   `vierge` → `entamé` (≥ 1 Teil joué) → `couvert` (3 Teile joués) → `solide`
   (3 Teile solides) → **`prêt`**.
   - `prêt` exige un cas encore solide et un run **en conditions d'examen**,
     chaque Teil ≥ 80.
   - Les conditions d'examen sont : une même partie sans interruption,
     Autonome, ordre A → D → F, grille de langue saisie (décision (b)). C'est
     **une** définition, partagée avec le classement « examen à blanc ».
   - Ce run doit être **postérieur** au moment où les trois Teile sont devenus
     solides. Une retombée défait la soudure jusqu'au run suivant (I11,
     INV-56).
   - Raison : l'examen enchaîne les trois Teile, et l'endurance fait partie de
     la préparation.
6. **Le cadran `CaseDial`** est une primitive unique en quatre tailles : carte
   de cas, ligne de tâche, pré-simulation, fin de partie.
   - La position dit le Teil, toujours au même endroit, et la couleur dit
     l'état.
   - Le centre affiche la **maîtrise** et l'anneau extérieur la couverture.
   - Des Teile complétés séparément donnent trois arcs séparés ; un cas
     `prêt` a ses arcs **soudés**.
   - Quand un Teil n'est pas encore solide, le cadran dit pourquoi et
     à partir de quand (R1).
   - Le contrat fixe la **donnée** (`CaseDialData`, `training-journal.md`
     §12.7), pas le rendu.
7. **Les fréquences** peuvent figurer dans les encarts. Chacune nomme toujours
   sa base et sa portée : ventilée par ville, ou toutes villes (I10). Aucune
   n'est présentée comme « ce que le jury note » (garde EXAM_CLAIM).
8. **Ordre de la pré-simulation** : en-tête du cas (cadran) → « Avec qui tu
   joues » → niveau d'assistance → Muster. La couche se fond dans le niveau
   d'assistance, présélectionnée par `layerAdvice`, sans le mot « Couche »
   (décision (d)).
9. **Le Muster offre deux choix au lieu de cinq.** **Guidé** : toutes les
   rubriques de l'anamnèse, un champ par rubrique. **Libre** : les rubriques
   d'identité, puis un grand champ de rédaction libre. Les simulations
   existantes sont lues avec tolérance et aucune note n'est perdue (INV-74).
10. **Ordre des chantiers** (I9) : contrat → **S4-1** mesure (avec la
    dérivation de l'enchaînement et la mesure de la couverture pondérée) →
    **S4-4** primitive `CaseDial` → **S4-3** partie ∥ **S4-2** plan (fichiers
    disjoints) → **S4-5** Programme → **S4-6** Historique → **S4-7** Examen,
    en dernier. L'Examen remplace la page Simulation, après un audit préalable
    de `feat/pruefungstag`. Les tâches « d'un trait » ne sont générées qu'une
    fois S4-3 en production (garde `D_UN_TRAIT_ACTIF`).
11. **La frise de trajectoire** quitte le Programme. Le Programme n'a plus
    qu'une projection, en cas et en jours. La frise survit dans l'Historique,
    sans projection, et son passé est figé (décisions (c) et (e)).
12. **Les changements rétroactifs** sont annoncés une fois dans l'app :
    Teile solides redevenus acquis, `teil-first` explicite devenu cas complet,
    Muster de ville devenu libre (décision (f)).

## Ce qui est retiré de la série 3, et pourquoi

| Retiré | Où | Pourquoi |
|---|---|---|
| Choix « complète / un Teil » à la pré-simulation (`ModeChooser`, `?teil=`) | `PreSimulationPage.tsx:41-72` | Décision 1. `?teil=` survit comme **départ** (`?depart=`), jamais comme périmètre. |
| Carte retournable pour choisir un Teil (FB2-P) | `SimulationHub.tsx` | Sa seule raison d'être était le choix de Teil. La page entière est remplacée par « Examen » en dernier chantier. |
| Tâches d'un seul Teil (`TaskInstance.teil`) | `dayPlan.ts:173-195` | Décision 3. Le champ est **lu** pour les anciens plans, et n'est plus jamais écrit. |
| Proposition de mode (`modusAProposer`, refus retenu) | `modus.ts:97-104`, `ProgramPage.tsx:107`, `ProgramSetup.tsx:121` | Décision 1 : l'adaptation devient silencieuse. `observeModus` est conservé. |
| Mode par défaut `teil-first` (`modusOf`) | `dayPlan.ts:39-42` | Le mode du jour devient le mode observé (`cas-complet` ou `teil-first`). `examen-blanc` et `specialite` restent explicites (§12.5 du contrat). |
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

- **Nouveaux champs :**
  - `TaskInstance` gagne `teile` (ce qui restait au moment du plan) et
    `creeA` ; ADR-0022 lui ajoute `rappel` et `dUnTrait`. `teil` passe en
    lecture seule. `DayPlan` gagne `tz`.
  - `Simulation` gagne `enchaine`, `reihenfolge` et `dauerGesamtSec`.
    `date` = début de la partie.
  - `Lauf` gagne `unterbrochen` et `zuletztAktiv`.
  - `MusterCity` devient `MusterArt`, avec une lecture tolérante des villes.
  - `CaseProgress` gagne `couverture`, `maitrise`, `etat`, `pretAt`,
    `solideDepuis` et `prochaineConsolidation`. `overall` est déprécié et
    dérivé de `etat`.
- **Le plan d'un jour ne dépend que du journal antérieur à ce jour** (I1).
  Deux appareils qui ont le même journal produisent le même plan.
- **La configuration devient synchronisée** (I2) : `program.configured` est
  projeté, et les refus de rythme et de rattrapage deviennent des événements.
- **Une migration SQL est requise** pour S4-2 :
  `20261004000018_s4_preference_events.sql`, avec deux types d'événements et
  les schémas de la fonction `events` (`training-journal.md` §12.10). Elle
  est appliquée au projet EU avant la fonction et le client. Les autres champs
  passent par `.passthrough()` ou par des payloads sans schéma.
- **Compatibilité série 3** : un client série 3 qui lit un plan série 4
  exige les trois Teile ; il ne coche jamais à tort. Il ignore les nouveaux
  types d'événements.
- **Harnais C6** : réécrit **avant** le code, avec un profil « un Teil ici, un
  cas entier là » sur deux appareils. Liste : `training-journal.md` §8 et
  `simulation-run.md` §7.

## Journal des décisions

| Date | Qui | Décision |
|---|---|---|
| 4 oct. 2026 | direction | Décisions 1 à 8 de la proposition « le cas entier, mesuré au Teil » (cas entier, mesure au Teil, couverture et maîtrise, cadran, fréquences, ordre de la pré-simulation, Muster guidé/libre, ordre des chantiers) |
| 4 oct. 2026 | direction | État `prêt`, anneau soudé, proposition « d'un trait » à l'approche de l'examen |
| 4 oct. 2026 | direction | Les six améliorations du cerveau du programme (ADR-0022) |
| 4 oct. 2026 | `main` | Décisions techniques I1 à I11 et mineurs m1 à m13 après la revue de cohérence (m9 résolu par (f)) |
| 4 oct. 2026 | `main` | R1 sans plafond Assisté (contradiction 15) ; la séance IA externe coche la tâche de cas sans mesure (contradiction 17, réf. Q3/Q9 du 30 sept.) ; une seule tâche forcée en dernière ligne droite (18) ; annonce (f) locale, une fois par appareil |
| 4 oct. 2026 | `main` | Réserves pédagogiques adoptées : R1, R2, T1, T2, P1, P2, C1, tolérance de 5 min pour INV-73 |
| 4 oct. 2026 | `main` | Après la re-revue de `1656bfae` (I1–I11 résolus) : N1, N2, m-a à m-m (ci-dessous, « Re-revue ») |
| 4 oct. 2026 | direction | (a) fenêtre « d'un trait » = 15 derniers jours ouvrés ; (b) `prêt` = Autonome, ordre A → D → F, grille saisie, une seule définition des conditions d'examen ; (c) la frise quitte le Programme et survit dans l'Historique sans projection ; (d) la couche se fond dans le niveau d'assistance ; (e) états recalculés, frise passée figée avec un repère, anciens runs non soudés ; (f) changements rétroactifs annoncés une fois |
| 4 oct. 2026 | `main` | Amendement du contrat après S4-1 (rapport `app/docs/reports/lead-s4-1.md`, « À trancher » 1, 2, 3, 5, 7 et 9). **(1)** `TrainingEvent.examenManque`, `CaseProgress.pretManque` et `TeilProgress.solideDes` sont acceptés : ils sont les sources de `pretManque` et `solideDes` du cadran (TJ §1.1, §2.3, §12.6, §12.7). **(2)** Une partie dont la checklist porte des ids legacy `cl-N` n'a pas de `manques[t]` : elle sort des erreurs transversales et d'INV-63. La traduction de SR §4.4 vaut pour l'affichage, pas pour le journal (TJ §2.3, §13.3). **(3)** `DATE_NOUVELLE_REGLE` est le **lendemain** du jour du merge de S4-1 en production, pour qu'aucune partie déjà montrée ne soit réécrite ; `main` la pose au merge (TJ §13, §13.2). **(5)** « Grille saisie » veut dire que les cinq critères nommés sont notés, comme le code et comme le score depuis C6-A ; `conditionsExamen` vaut `conditionsManquantes(sim).length === 0` (TJ §2.3, §12.6). L'invariant `etat === 'solide' ⇔ pretManque` non vide est à écrire par le fixeur de S4-1 (TJ §10). **(4)** `prochaineConsolidation` et `teileDeTache` sont posés par S4-1, et S4-2 les consomme (TJ §12.12). |
| 5 oct. 2026 | `main` | Ratification de deux ajouts de S4-1 après ses revues (rapport `lead-s4-1.md`, « Revues et corrections »). **(1)** `TeilProgress.premiereReussite { at, score }` : la première réussite ≥ 80, source de la phrase « Réussi à 85 le 12 sept. — une seconde partie à 80 ou plus le confirme » (TJ §12.6, §13.2). **(2)** L'état **« à confirmer »** est décidé : un Teil `acquis` déjà réussi à 80 ou plus, dont `solideDes` est passé. C'est un état dérivé, pas un `TeilStatus`. Il pèse `POIDS_CONSOLIDATION` dans la dette (P1 de la revue pédagogique de S4-1). `detteTeil(cp, jour)` reçoit le jour du plan, et S4-2 le passe **explicitement** (déterminisme I1, INV-55) (TJ §4.3, §5.1, §12.2, INV-67, §12.12). Le contrat s'aligne aussi sur les corrections I1 et I2 : la pente se lit sur des jours recalculés avec la nouvelle règle, et la soudure est une position dans l'ordre `(at, id)` (TJ §12.6, §13.2, INV-56). |
| 6 oct. 2026 | `main` | **S4-7 « Examen »** (rapport `app/docs/reports/lead-s4-7.md`, contrat `simulation-run.md` §11). Décisions de `main`, réversibles, **à confirmer par la direction** : (1) tirage — une pathologie pèse une fois (`frequencesProtocoles.ts`, ville visée si ventilée), cas vierge ×2, cas hors source au plancher, cas joués depuis moins de 14 jours exclus (exclusion levée si tous le sont), cas `prêt` non exclus ; (2) une seule table de durées sourcée pour l'Examen, BW 20/20/20, transition automatique de 60 s, `FLOW` d'entraînement inchangé ; (3) abandon selon `gibAuf`, l'examen interrompu visible dans l'Historique ; (4) grilles de langue A et F obligatoires à la fin ; (5) « Simulation » devient « Examen » dans le menu, `/simulation` redirige vers `/examen`, `SimulationHub` disparaît ; (6) la tâche « examen à blanc » lance l'Examen sur son cas, sans tirage ; (7) le partenaire n'est pas enregistré ; (8) **le Bereitschaftsindex est abandonné formellement** (suite d'ADR-0020, D-I9) : l'état `prêt` du cas reste la seule mesure de préparation ; (9) pas d'Aufklärung dans l'Examen ; (10) aucune limite ni message sur la fréquence des examens. Ajout de `lead-s4-7` : `Simulation.modeExamen` / `TrainingEvent.modeExamen`, seule façon de nommer un examen interrompu sans nouvel événement (contrat §11.6). |

## Propositions non tranchées

Aucune. La fenêtre « d'un trait » est tranchée par la décision (a) du 4 oct.

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

### Statut des contradictions après revue (4 oct.)

- **Résolues par une décision** :
  - n° 2 : décision (c) ;
  - n° 6 : I1 (entrée = journal antérieur au jour) ;
  - n° 9 : décision (d) ;
  - n° 11 : décision (e) (états recalculés, frise passée figée) ;
  - n° 12 : décision (e) (anciens runs non soudés) ;
  - n° 13 : I10 (portée dite dans la phrase) ;
  - n° 14 : m12 (corrigée par le lot C6-A, déjà dispatché).
- **n° 5** : I7 précise la dérogation. Il y a une seule tâche forcée par jour
  (première tâche de cas, ou examen à blanc en dernière ligne droite), puis
  un remplissage glouton.
- **n° 7** : restreinte aux plans série 4 (m1).

15. **Le plafond Assisté évoqué par la revue pédagogique (R1) n'existe pas dans
    la mesure.** `creditMultiplier`/`weightedPartScore` (`scoring.ts:64-73`)
    n'ont **aucun appelant** hors de `scoring.ts` (vérifié par `grep`).
    `case_progress` lit `partScore`, sans pondération (`journal.ts:52`). Un
    Teil joué en Assisté peut donc devenir solide. Afficher « en Assisté le
    plafond est 80,75 » serait faux. **Tranché ici** : R1 est inscrit pour
    l'écart de 3 jours (`solideDes`) et pour les conditions d'examen
    (`pretManque`, qui exige l'Autonome), pas pour un plafond. **Confirmé par
    `main` le 4 oct.**
16. **Les URL par état (`simulation-run.md` §2.2) ne sont pas implémentées.**
    Seules `/simulation/:caseId/pre` et `/simulation/:caseId/run` existent
    (`main.tsx:64-66`). Le contrat décrit désormais les routes réelles (m7),
    et §2.2 reste une cible hors de la série 4.
17. **« Partie mesurée » (I3) et la séance IA externe.** I3 parle de « partie
    mesurée ». Une séance `selbstbewertet` n'est pas une mesure (INV-11), mais
    elle joue son Teil en série 3, et elle fait avancer une tâche aujourd'hui
    (`teileJouesLeJour` n'exclut que les coches nues). **Décidé** (direction,
    Q3/Q9 du 30 sept. : « historique + série oui, ça coche la tâche du jour ;
    l'indice non », confirmée par `main` le 4 oct.) : elle fait avancer et
    peut cocher la tâche de cas, sans jamais entrer dans une mesure (statut,
    maîtrise, solide, `prêt`).
18. **Dernière ligne droite** : une seule tâche forcée par jour. Ce jour-là,
    c'est l'examen à blanc, et les tâches de cas respectent le budget.
    **Confirmé par `main` le 4 oct.** (INV-58).

## Revues

Deux revues de `0ff1dd08`, puis les corrections de ce commit. Les textes des
revues n'ont pas été transmis à l'architecte, seulement les décisions de
`main`. Le tableau suit ces décisions.

**Cohérence (Opus)** — *à corriger avant merge* : 11 points importants (I1–I11)
et 13 mineurs (m1–m13).

| Point | Décision | Où |
|---|---|---|
| I1 Déterminisme | Le plan du jour D a pour entrée le journal d'`occurred_at < debutJour(D)`, l'état SRS reconstruit compris. INV-55 et INV-57 sont reformulés ; leur générateur fait varier les événements **du** jour. | TJ §12.4, INV-55, INV-57 |
| I2 Config synchronisée | `program.configured` est projeté, validé à la lecture et doté d'un schéma serveur. `rythme.refused` et `rattrapage.refused` sont synchronisés. Migration 18. | TJ §12.10, INV-68 |
| I3 Genre de tâche | Toute partie du cas satisfait une tâche de cas ; le genre ne sert qu'au libellé. `dUnTrait` n'exige qu'`enchaine`. La séance IA externe coche aussi, sans mesure (décidé). | TJ §12.3 ; contradiction 17 |
| I4 Complétion | `doneAt` est dérivé à la projection. La coche manuelle est un événement explicite qui compte. INV-51 devient une équivalence multi-appareils. | TJ §12.3, INV-51 |
| I5 `dUnTrait` | Tout ou rien. La reprise ne porte pas `dUnTrait`. Trois Teile joués séparément laissent la tâche ouverte : « à rejouer d'un trait ». | TJ §12.2, §12.3, §12.8, INV-52 |
| I6 « Ce qui reste » | Une fonction, deux usages : `resteTache` dans la journée, `restePlan` pour planifier. Un Teil non solide joué depuis moins de 3 jours vaut 0 dans la dette. | TJ §12.2, INV-67 |
| I7 Budget | Une seule tâche forcée par jour (première tâche de cas, ou examen à blanc en dernière ligne droite) ; `estMin` de l'examen = Σ durées apprises ; remplissage glouton ; une reprise hors budget remplace. | TJ §12.4, §12.8, INV-58 |
| I8 Mode observé | L'observation choisit entre `cas-complet` et `teil-first`. `examen-blanc` et `specialite` sont explicites. Un `teil-first` explicite devient `cas-complet`. Pas de boucle. | TJ §12.5, INV-57 |
| I9 Ordre | S4-1 → S4-4 → S4-3 ∥ S4-2 → S4-5 → S4-6 → S4-7 ; garde `D_UN_TRAIT_ACTIF`. | TJ §12.12, décision 10 |
| I10 Fréquences | La base ventilée par ville, sinon le repli toutes villes, est dite dans la phrase. L'exemple et le texte sont corrigés. | TJ §12.9, §13.6, INV-66 |
| I11 Soudure | Un run qualifiant postérieur à `solideDepuis` ; une retombée défait la soudure. | TJ §12.6, INV-56 |
| m1 | INV-4 restreint aux plans série 4. | TJ §8 |
| m2 | Aucun changement de budget sans geste. | INV-65 |
| m3 | « Partie mesurée » définie pour les erreurs transversales : checklist présente, ids stables. | TJ §13.3, INV-63 |
| m4 | Filtrage obligatoire de `teile`, `rappel`, `dUnTrait` et `creeA` à la lecture (`lireTache`). | TJ §12.1 |
| m5 | `TrainingEvent.at` = début de la partie (`Lauf.startedAt`). | TJ §2.3, SR §3.2, INV-75 |
| m6 | `dauerGesamtSec` garde le Teil abandonné. `partieSuivante` est refusé hors du Teil interrompu par l'Aufklärung. INV-72 est complété. | SR §3.2, §10.2, INV-72 |
| m7 | `nimmWiederAuf`, point d'entrée unique ; `?depart` hors des dépendances de l'effet ; routes réelles décrites. | SR §3.1, §10.3 |
| m8 | Lien de lancement des tâches `revision`. | TJ §12.1, SR §10.3 |
| m9 | **Résolu par (f)** : annoncer une fois les Teile solides redevenus acquis (qui reviennent dans le plan), le `teil-first` explicite devenu cas complet et le Muster de ville par défaut devenu libre. | SR §10.7 |
| m10 | `nonMesureAt` inscrit dans `TeilProgress` ; INV-59 pour `CaseDialData`. | TJ §12.6, §12.7 |
| m11 | Fin du jour = minuit local du fuseau de l'appareil qui a matérialisé, `DayPlan.tz`. | TJ §3.1, §12.4 |
| m12 | La sentinelle `?? 50` est corrigée par C6-A, déjà dispatché. | SR §9.5 |
| m13 | En mode observé « par Teil », l'estimation porte sur le Teil le plus probable. | TJ §13.4, INV-64 |

**Pédagogie (droit de veto)** — *accord avec réserves, aucun veto*.

| Réserve | Décision | Où |
|---|---|---|
| R1 | Le cadran dit la raison et la date (`solideDes`, `pretManque`). Pas de plafond Assisté, qui n'existe pas dans la mesure (confirmé par `main`). | TJ §12.7 ; contradiction 15 |
| R2 | Un Teil non solide joué depuis moins de 3 jours vaut 0 dans la dette. | TJ §12.2, INV-67 |
| T1 | Aucun `rappel` sur une tâche `dUnTrait` ou `examen-blanc`. | TJ §13.3, INV-63 |
| T2 | Formulation neutre : « 3 de tes 5 dernières Anamnesen ». | TJ §13.3 |
| P1 | La carte de rythme montre la conséquence sur la projection, jamais l'écart en %. | TJ §13.5 |
| P2 | Deux refus de suite : plus de proposition jusqu'à la prochaine modification du programme. | TJ §13.5, INV-65 |
| C1 | Une reprise hors budget remplace la première tâche de cas. | TJ §12.8, INV-58 |
| INV-73 | Une reprise de moins de 5 min ne casse pas l'enchaînement. | SR §3.1, INV-73 |

*TJ = `training-journal.md`, SR = `simulation-run.md`.*

### Re-revue de `1656bfae` (cohérence, Opus)

Verdict : **I1 à I11 résolus**. S4-1 peut démarrer une fois m-e et m-f
inscrits. Deux points nouveaux (N1, N2) étaient à trancher avant S4-2. Les
décisions de `main` sont inscrites comme décidées.

| Point | Décision | Où |
|---|---|---|
| N1 Tâches hors cas | Drill, Fachwissen et Aufklärung sont faits à la projection par un événement du **même genre**, du même cas s'il y en a un, du même jour (fuseau du plan) avec `at ≥ creeA`, ou par une coche manuelle. INV-51 couvre toutes les tâches. | TJ §12.3, INV-51 |
| N2 Config | (a) `setIntensity`, `setModus` et `accepterRythme` émettent la config **complète** (`ecrireConfig`) ; (b) push initial unique avant toute projection distante (garde `CONFIG_POUSSEE_S4`) ; (c) bornes serveur jamais plus strictes que l'interface ; (d) un refus serveur n'efface jamais la config locale. `queue.ts:158-160` retire l'événement refusé, ce qui est dit. | TJ §12.10, INV-76 |
| m-a | Le contenu publié est une entrée du plan : limite connue d'INV-55. | TJ §12.4, INV-55 |
| m-b | INV-67 et l'estimation réduite à un Teil ne valent que pour les tâches `simulation`. `revision` et examen à blanc : Σ sur les trois Teile. | TJ §12.2, §13.4, INV-64, INV-67 |
| m-c | La reprise remplace la première tâche de cas **ni faite ni entamée**. En mode `examen-blanc` explicite, l'examen à blanc est la tâche forcée. | TJ §12.4, §12.8, INV-58 |
| m-d | S4-1 ajoute tous les nouveaux champs de `db/types.ts`. `lib/simulationSave.ts` appartient à S4-3. | TJ §12.12, SR §10 |
| m-e | Une simulation est « série 4 » si et seulement si `reihenfolge` est présent ; sinon, règle série 3 pour le genre. | TJ §2.3 |
| m-f | Trois prédicats nommés : `partieJouee` (complétion), `partieMesuree` (mesure), `partieAvecChecklist` (erreurs transversales). | TJ §12.3, §13.1, §13.3, §13.4 |
| m-g | `dayKey(e.at)` est lu au fuseau `DayPlan.tz` (`jourDe`). | TJ §12.3 |
| m-h | `feat/s3-c6b-jour` (`now()` de `lib/clock` dans `lib/lauf/*`) est un prérequis de S4-1. | TJ §12.12, SR §3.2 |
| m-i, m-j, m-k | `TYPES` **et** `SCHEMAS` de `events/index.ts` ; `subject_id` de `program.configured` = `z.null()` ; regex de semaine ISO pour `rythme.refused` ; tests séparés contrainte SQL / fonction ; ordre migration → fonction → client. | TJ §12.10 |
| m-l | Entre J-15 ouvrés et la dernière ligne droite, « d'un trait » est une **tâche de cas `dUnTrait`**. L'examen à blanc reste propre à la dernière ligne droite. | TJ §12.4, §13.1 |
| m-m | `accepterRythme` écrit la config complète. | TJ §13.5 |

