# Lot Q0 — questions du cas : code et règles mécaniques

Branche `feat/s3-q0-questions-du-cas` (base `dbf87df7`). Statut : **DONE_WITH_CONCERNS** — tout est vert après les deux revues (section « Revues »), mais des écarts de périmètre restent à valider (section « Écarts de périmètre »).

## Commits

| # | Commit | Point |
|---|---|---|
| 1 | `3504ccf8` | G4 : 15 relances « Falls ja » (+ « Vor jedem Schmerzmittel », « Falls Auswurf ») |
| 2 | `0b171131` | `CaseQuestion.followUp` |
| 3 | `b6bfadf4` | +3 `FACH_COVERS` (irradiation) |
| 5 | `c4ee3d26` | garde CI G1 « territoire ⊂ région » |
| 4 | `6757cb6d` | `checkQuestionOrder` étendu (+ `questionOrderDetect.mjs`, fixture, test) |
| I-1 | `52aa7b84` | `checkQuestionAtomicity` lit la relance des questions du cas |
| C-1 | `a719835a` | hodentorsion garde son irradiation |
| C-2 | `cd26e567` | l'irradiation angineuse nomme l'épaule |
| C-3 | `8c9436df` | NOTFALL psy : « Falls konkrete Absicht oder Plan » |
| m1 | `730a72e1` | prurit nocturne, accouchement sous leur condition |
| m7 | `730fb949` | « die letzte Dosis » |
| m2 | `0ad63f91` | « Ist Blut dabei ? » sous « Auswurf » |
| m3 | `c160ba26`, `bbf63117` | relance visible (Oberarzt, échauffement, Rollenskript) et scannée par `checkTrameSymptoms` |
| m4 | `a2b83cde` | garde G1 : composés Unterarm, Oberarm, Brust… |
| m5 | `c2c4f984` | affirmation en tête : seulement si un mot est neuf |
| m6 | `79786ace` | précision du détecteur ≈ 50 % |

## Mesures avant / après

| Mesure | Avant | Après |
|---|---|---|
| Cas qui jouent l'irradiation 2 fois (par sonde) | 17 | **1** (hodentorsion, exception écrite — revue C-1) |
| Relances inconditionnelles (`immer`) jouées, chaînes distinctes | 58 | 44 |
| « Trinken Sie täglich… » affichée dans les trames | 130 | 0 tant que « Ja » n'est pas choisi (test DOM) |
| Présuppositions de l'audit détectées par `checkQuestionOrder` | **0 / 8** (Tier B : 4, brut : 5) | **8 / 8** |
| Candidats de `checkQuestionOrder` | — | 28 (30 avant la règle m5 ; audit : ≈ 28) |
| Budget d'atomicité A / B / C | 510 / 114 / 0 | 510 / 114 / 0 (inchangé, ne monte pas) |
| G1 « territoire ⊂ région » | non gardé | gardé, 0 incohérence ; échoue sur mutation |

Mesures par `playedTrame` (le montage réel) sur les 130 cas.

## Point 1 — G4 « Falls ja »

Préfixées (`anamneseChapters.ts`, lignes re-localisées par `grep`) : alcool `nox-alkohol`, Fach gastro `fach-gastro-uebelkeit`, onko `fach-onko-knoten`, atemnot `akt-atemnot-husten` (×2), uro `fach-uro-frequenz`, neuro `fach-neuro-kopfschmerz` et `fach-neuro-kraft`, chirurgie `fach-chir-op` et `fach-chir-blutverduenner`, infektio `fach-infekt-fieber`, kardio `fach-kardio-brust`, infekt `akt-infekt-fieber` (×2).

- « Falls Sie etwas abhusten: » devient « Falls Auswurf: » : l'interrupteur s'intitule « Auswurf » au lieu de « Sie etwas abhusten ».
- « Vor jedem Schmerzmittel zuerst fragen » est rattachée à la branche « sehr stark » par le préfixe `Falls sehr stark:`. `groupFollowUps` range les deux notes dans un seul contrôle `skala`. Aucun nouveau code.
- Tests : DOM (`features/simulation/FollowUpDom.test.tsx`) — la relance alcool est masquée avant « Ja » et après « Nein », visible après « Ja ». Unitaires (`followUp.test.ts`) — 15 relances corrigées, la fusion des deux notes de l'échelle, l'interrupteur « Auswurf ». Rouge avant (19 échecs), vert après.

## Point 2 — `CaseQuestion.followUp?: string`

Champ ajouté au type et copié en `followUp: [q.followUp]` dans `caseQuestionsByKapitel`. Même composant, même parseur. Aucune donnée migrée. Test : cas fictif, relance présente sur la question jouée, lue en `ja`, masquée avant « Ja ».

## Point 3 — irradiation

`fach-ortho-ausstrahlung`, `fach-kardio-ausstrahlung`, `fach-uro-flanke` couvrent `akt-ausstrahlung`. `checkProbeCoverage` reste vert (130 cas, aucune sonde jouée sans réponse). Les réponses `akt-ausstrahlung` des fiches restent dans les fiches (elles servent encore au simulant, qui lit toutes les sondes) : aucune orpheline bloquante.

## Point 4 — `checkQuestionOrder`

Détecteur extrait en fonction pure `scripts/questionOrderDetect.mjs`. Les 4 règles du point 6 de l'audit y sont ; l'exclusion des mots des questions générales remplace `maxDf`. Les tiers `--tier A|B|brut` sont supprimés (l'ancien détecteur lisait aussi les questions générales, qui ne présupposent rien). Seul `--case <id>` reste.

- Les 8 cas détectés : coxarthrose (ordinal et SN), covid19, reaktive-arthritis, influenza, prostatakarzinom (affirmation), achalasie (affirmation), ptbs, metabolisches-syndrom.
- `scripts/checkQuestionOrder.test.mjs` : 8 fixtures (textes réels, `scripts/fixtures/question-order-presuppositions.json`), 3 contrôles sans candidat, la porte sur les données réelles, et 3 mutations en bac à sable. Sans la règle « affirmation » : manquent prostatakarzinom et achalasie. Sans adjectifs ni ordinal : manque coxarthrose. Sans l'exclusion de trame : le nombre de candidats monte.
- Reste informatif : sortie 0.

## Point 5 — garde G1

`src/data/guides/irradiationRegion.test.ts` : pour les 13 cas à `motiv.region`, tout territoire nommé par une question d'irradiation jouée (sonde, ou question du cas qui parle de « strahlt / zieht ») appartient à la région. Mutation prouvée : la règle ortho « untere » changée en « in den Arm » fait échouer le test sur 3 cas (osg-fraktur, gonarthrose, schenkelhalsfraktur). Le test vit dans un fichier voisin plutôt que dans `fachNature.test.ts`, pour que chaque commit contienne son seul point.

## Revues (`7026a1bb`)

- **Mécanique (Opus) : Request changes, 1 important** — I-1, `CaseQuestion.followUp` échappait à `checkQuestionAtomicity` (relance de 6 items → rc 0). Corrigé : la relance est un énoncé « followUp » (plafond 2 items, un « ? »), trois mutations (six items → règle B, deux « ? » → règle A, relance propre → vert).
- **Clinique (Sonnet) : approuvé avec réserves.** Mes trois décisions sont confirmées : automutilation inconditionnelle, `veg-fieber` inconditionnelle, « Vor jedem Schmerzmittel » derrière « sehr stark ».
- **Corrigé** : C-1 (hodentorsion : la couverture ne s'applique pas si `schmerz.ort` matche `hoden|skrot` ; test : la trame contient `akt-ausstrahlung`), C-2 (« die Schulter » dans la liste kardio, question de Fach et sonde canonique), C-3 (« Falls konkrete Absicht oder Plan » : 28 caractères, sous le plafond de 40 du parseur ; « Falls konkrete Suizidgedanken (Plan oder Absicht) » en faisait 43 et aurait été classé en note), m1, m2, m3, m4, m5, m6, m7.
- **m3** : `cqFollowUp` (à côté de `cqText`) ; la relance s'affiche sous sa question dans la fiche de l'Oberarzt, l'échauffement (`CaseQuestionList`, extraite pour être testable) et l'écran du simulant (`RoleLine.nachfrage`). Filet pétrole, sans glyphe : `checkUiTells` a refusé « ↳ » à la première version. `checkTrameSymptoms` scanne la relance comme la question (mutation : une relance qui cite la fièvre rouvre la porte).
- **m5** : la règle « affirmation » ne se déclenche que si la phrase contient un mot neuf (ni déjà dit, ni de trame) ; comparaison par mot entier, le lemme tronqué à 6 lettres confondait « Magenschmerzen » et « Magenschutztabletten ». Une vingtaine de lignes.
- **Note m2** : « Auswurf » reste visible avant « Husten = Ja » (imbrication antérieure, non corrigée).
- **Hors Q0, tracé par `main`** : relances à 2 questions → Q2 ; nouveaux vrais positifs du détecteur (rheumatoide-arthritis « Schuppenflechte », karpaltunnel « Bruch », malaria « Milz », hypothyreose « Entbindungen ») → Q1 ; 10 irradiations avec questions propres au cas → Q1 ; osteoporose bws → Q1.

## Vérifications (par code de sortie) — sommet `bbf63117` + ce rapport

`uptime` : charge 12 (< 40), suite complète lancée avec `--maxWorkers=2`.

- Tous les `app/scripts/check*.mjs` : 0, sauf `checkProbeOverlap` : **1, informatif, identique au socle** (5 répétitions non marquées).
- `checkUiTells` a d'abord sorti 1 (« ↳ » ×3, voir m3) ; corrigé, 0.
- `checkBudgetFloor.mjs origin/main` : 0. `checkQuestionAtomicity` : 0, A/B/C = 510 / 114 / 0.
- `node --test` (checkQuestionOrder, checkQuestionAtomicity, checkTrameSymptoms, checkBudgetFloor, checkProbeCoverage) : 61/61, exit 0.
- `npx tsc -b --noEmit` : 0. `npx vitest run --dir src --maxWorkers=2` : 109 fichiers, 1 018 tests, exit 0.
- `git merge-tree --write-tree origin/main HEAD` : exit 0 (aucun conflit).

## Décisions de main, confirmées par la revue clinique

1. **Fach psy `fach-psych-suizid`** (automutilation, ~:1464) : « Haben Sie sich selbst verletzt… » laissée inconditionnelle, comme demandé. Jouée dans 10 cas. À trancher.
2. **vegetativ `veg-fieber`** (~:566) : l'audit la classe « sûre » (90 cas). **Je ne l'ai pas préfixée.** La relance est « Waren Sie kürzlich im Ausland? Sind Sie regelmäßig geimpft? » : le voyage et les vaccins se demandent même sans fièvre (paludisme, typhus), et la question est déjà une `part` indépendante (`sucht: ['reise']`). Préfixer la masquerait chez tout patient qui répond « Nein » à la fièvre. Le test `laissées inconditionnelles à dessein` fige cette décision. Si le relecteur préfère « Falls ja », c'est un mot. Remarque annexe : c'est une question composée (voyage + vaccins) qui relève de Q2.
3. **« Vor jedem Schmerzmittel »** : désormais derrière l'échelle ≥ 7. La note ne s'affiche donc plus quand la douleur est modérée. Cohérent avec « Falls sehr stark » (on ne donne un antalgique qu'à partir de là), mais c'est un changement de ce que le candidat voit dans 52 cas.
4. **Relances `immer` restantes hors liste de l'audit** (44 chaînes distinctes ; les plus jouées : « Können Sie mir zeigen, wo genau? » 52, « Bessert es sich nach Ruhe oder Schlaf? » 16, « Hat sich die Urinmenge verändert? » 12…). L'audit les déclare complètes ; je ne les ai pas touchées. Beaucoup sont des approfondissements inconditionnels légitimes ; certaines (« Husten Sie Blut ab? », « Ist es vollständig weggegangen… ») mériteraient un coup d'œil.

## Écarts de périmètre et propositions de contrat

- **`app/src/db/types.ts`** (hors du périmètre `lib/rolePlay`, `simulationStep`, `features/simulation`, `data/guides`) : une ligne pour le champ `followUp`, demandée explicitement par le brief du lot. À valider par le coordinateur ; `app/src/lib/caseQuestions.ts` (helper `cqFollowUp`, m3) et `app/src/components/RolePlayView.tsx` (affichage de `nachfrage` à l'écran du simulant, m3) sont dans le même cas, sur décision de `main`.
- **`docs/contracts/frage-atomique.md`** (amendé par `main`) : il annonce « 30 candidats » ; la mesure est maintenant **28**, avec une précision ≈ 50 % sur échantillon. À ajuster par `main`.
- `checkProtocolCoverage.py` sort 1 (`ZeroDivisionError`) dans ce worktree : les protocoles bruts n'y sont pas. Même résultat avant mes commits ; sans lien avec le lot.

## Non vérifié

- Pas de vérification navigateur à deux onglets (médecin + simulant). `rolePlay.ts` est maintenant touché (`nachfrage`) mais `simulationStep.ts` non ; le comportement est couvert par des tests DOM (jsdom) et un test du Rollenskript. Le rendu réel de l'interrupteur « Auswurf », de la branche « sehr stark » et de la relance sur l'écran du simulant n'a pas été vu dans un navigateur.
- La liste de territoires de la garde G1 (`TERRITOIRES`/`ERLAUBT`) est écrite à la main d'après les 13 cas actuels ; un cas futur d'une autre région peut demander d'y ajouter un mot.
- Le détecteur d'ordre a 28 candidats, comme l'audit ; les 8 attendus y sont tous. Je n'ai pas relu les 20 autres un par un (la revue donne ≈ 50 % de vrais positifs).

## Incident

Une commande `git stash` / `git stash pop` lancée dans ce worktree a dépilé le `stash@{0}` « autostash » **de l'arbre principal** (les piles de stash sont partagées entre worktrees) et l'a appliqué ici, avec un conflit sur `index.css`. Annulé par `git reset --hard HEAD` dans ce worktree (rien d'autre n'y était non commité). Le stash d'origine est intact (`git stash list` : 1 entrée, « autostash »). À savoir si Mehdi le cherche.
