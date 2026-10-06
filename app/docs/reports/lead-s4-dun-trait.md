# S4 « d'un trait » : les textes qui annoncent la tâche (rapport de tâche)

Branche `feat/s4-dun-trait` (base `aa57cdc3`, garde `D_UN_TRAIT_ACTIF = true`). origin/main est fusionnée deux fois : après le merge de #80, puis après celui de #78 (K3). Statut : **DONE_WITH_CONCERNS** (voir « Point contesté »).

Sources : `training-journal.md` §12.1, §12.3 (I5), §12.4.7, §12.12, §13.1 ; ADR-0021, ADR-0022 ; `DIRECTION-STYLE.md`. Revue `direction-keeper` de `0036ad86`, corrections appliquées (2e passe).

## Textes : avant / après (garde vraie)

| Où | Situation | AVANT | APRÈS |
|---|---|---|---|
| Raison (plan figé) | Consolidation due, cas fréquent, dans la fenêtre (`dUnTrait`) | « Solide il y a 47 jours : on vérifie qu'il tient. » | « Solide il y a 47 jours : rejoue-le d'un trait, comme à l'examen. » |
| Raison | Idem, sans dernier jeu daté | « Solide : on vérifie qu'il tient. » | « Solide : rejoue-le d'un trait, comme à l'examen. » |
| Raison | Cas solide choisi HORS échéance (m-l) | « Pour la fin de la préparation : ce cas, d'un trait, comme à l'examen. » | « Solide, pas encore prêt : rejoue-le d'un trait, comme à l'examen. » |
| Raison | Cas choisi (m-l) ET dû | « Pour la fin de la préparation : ce cas, d'un trait, comme à l'examen. » | « Solide il y a N jours : rejoue-le d'un trait, comme à l'examen. » |
| Raison | Examen à blanc d'un trait (dernière ligne droite, ou mode `examen-blanc` dans la fenêtre) | « Répétition générale : conditions réelles, sans aide. » ; en mode `examen-blanc`, le « pourquoi » ordinaire (ex. « Solide il y a 12 jours : … »), même pour un cas jamais joué | « Répétition générale : d'un trait et sans aide. » : une seule raison, jamais « Solide » à tort |
| Ligne de tâche | Tâche d'un trait à faire | rien | rien de plus : la raison le dit, une fois |
| Ligne de tâche | Tâche d'un trait entamée à part (1 ou 2 Teile) | `[Il te reste la Dokumentation et la Fallvorstellung]` · 32 min | `[À reprendre depuis l'Anamnese]` · 52 min (temps du cas entier) |
| Ligne de tâche | Les trois Teile joués séparément (I5) | rien (le libellé n'existait que dans le cadran) | `[À reprendre depuis l'Anamnese]` · 52 min |
| Lien « Lancer » (ligne et accueil) | Tâche d'un trait entamée à part | `?depart=dokumentation` (repartait du reste) | sans `depart` : le cas repart de l'Anamnese |
| Accueil (hero) | Tâche d'un trait entamée à part | la raison · 32 min (le reste) | la raison · 52 min ; aucun libellé ajouté |
| Cadran | Trois Teile joués séparément | « Rejouer le cas d'un trait » | inchangé |

Garde fausse : textes d'avant, mot pour mot (testé).

Sur une ligne entamée, « d'un trait » n'apparaît qu'une fois, dans la raison. Le libellé dit ce qui change concrètement : le cas reprend au début. Ce qui a été joué à part ne compte pas pour la tâche, et le libellé ne le présente pas comme une faute. Il porte la même classe `.dim-tag` que « Il te reste… », qu'il remplace.

Où la raison est lue : la ligne de tâche (programme et accueil), le hero de l'accueil et la pré-simulation. Dans la pré-simulation, elle apparaît sous le choix du niveau quand la tâche prescrit un niveau (`niveau.ts:26` ; `PreSimulationPage.test.tsx:198-205`). Voir « Point contesté ».

## Fichiers
| Fichier | Changement |
|---|---|
| `app/src/lib/program/select.ts` | `raisonDUnTrait(s, ctx)` ; `solideDepuis` partagé avec `pourquoiAujourdhui` (« Solide il y a N jours », jamais « 0 jour ») |
| `app/src/lib/program/dayPlan.ts` | toute tâche de cas `dUnTrait` prend `raisonDUnTrait`. Tout examen à blanc d'un trait prend une seule raison : `dansFenetre ? « Répétition générale : d'un trait et sans aide. » : isTaper ? « … conditions réelles … » : pourquoiAujourdhui`. Le cas m-l ajouté hors échéance porte `du: false` ; `decrire` le traite quand même en révision entière, via `unTrait` |
| `app/src/features/program/TaskLine.tsx` | `LectureTache.aRejouer` ; `lectureDuPlan` : d'un trait entamée ⇒ `aRejouer`, jamais `reste` ; `TaskAnatomy` rend « À reprendre depuis l'Anamnese » |
| `app/src/lib/dialData.ts` | commentaire de `aRejouerDUnTrait` : cadran « Rejouer le cas d'un trait », ligne « À reprendre depuis l'Anamnese » |
| `docs/contracts/training-journal.md` | §12.2 (commentaire de `resteTache`), §12.3 I5 (libellé de ligne, « d'un trait » dit par la raison, cadran inchangé), §13.1 (raisons « Solide il y a N jours … » et variantes d'un trait) |
| `app/src/lib/program/select.test.ts` | les quatre textes de `raisonDUnTrait` |
| `app/src/features/program/DUnTrait.test.tsx` | génération (fenêtre, dernière ligne droite, examen à blanc sur cas jamais joué, garde fausse), ligne (à faire, entamée, I5, tâche ordinaire : « d'un trait » une fois), accueil (`TaskList` sur le plan figé) |
| `app/tests/invariants.d-un-trait.test.tsx` | garde C6 : entamée à part, la ligne dit « À reprendre depuis l'Anamnese », jamais « il te reste », « d'un trait » une fois |
| `app/scripts/parcours-mutations.mjs` | mutation `I5-libelle` : supprimer le libellé de la ligne (tuée) |
| `app/scripts/parcours-candidat.mjs` | une tâche entamée se reconnaît à `/Il te reste\|À reprendre depuis/` |

Commits :
- 1re passe : `3a850c45` (raison), `dcc7360b` (ligne), `0036ad86` (rapport).
- 2e passe : `4930814f` (raisons), `4bd28dc7` (libellé et garde C6), `4c62eea8` (contrat), `bfc296b3` (mutation et parcours), `e09234c1` (fusion d'origin/main).

## TDD
1re passe :
- **RED** : 6 échecs pour la bonne raison (`raisonDUnTrait is not a function`, ancienne raison, « Il te reste » encore présent).
- **GREEN** : 28/28.

2e passe :
- **RED, étape 1** : seulement `occurrences(/d'un trait/g) === 1` ajouté aux tests « entamée » et « I5 », sur le texte de `0036ad86`. Résultat : 2 échecs, `expected 2 to be 1`.
- **RED, étape 2** : nouveaux textes attendus. Résultat : 6 échecs, dont « Expected: Solide, pas encore prêt… / Received: Pour la fin de la préparation… » et, pour l'examen à blanc sur un cas jamais joué, « Expected: Répétition générale : d'un trait et sans aide. / Received: Pour la fin de la préparation… ».
- **GREEN** : 29/29.

**Mutations manuelles** (sur le code final ; chaque mutation est appliquée, testée, puis le fichier est restauré) :

| Mutation | Effet | Résultat |
|---|---|---|
| M1 : `TaskAnatomy` ne rend plus le libellé | « À reprendre depuis l'Anamnese » disparaît | exit 1, 3 tests rouges |
| M5 : l'examen à blanc de la fenêtre reprend `raisonDUnTrait` | cas jamais joué dit « Pour la fin… / Solide… » | exit 1, 1 test rouge |
| M6 : texte hors échéance remis à « Pour la fin de la préparation » | | exit 1, 2 tests rouges |
| 1re passe, M2 : `lectureDuPlan` ne pose plus `aRejouer` | retour de « Il te reste… » | exit 1, 3 tests rouges |
| 1re passe, M3 : la tâche de cas reprend `pourquoiAujourdhui` | la raison ne dit plus « d'un trait » | exit 1, 1 test rouge |

**Mutation en CI** : `node scripts/parcours-mutations.mjs --only I5-libelle` donne « OK I5-libelle — TUÉE ». Le test rouge est celui de `invariants.d-un-trait`, avec « expected 'Leberzirrhose bei Alkoholabhängigkeit…' to match /À reprendre depuis l'Anamnese/ ».

## Vérification par code de sortie (sommet après fusion d'origin/main @ `acc4d6dd`)
| Commande | Sortie |
|---|---|
| `npx tsc -b --noEmit` | 0 |
| `vitest run --dir src --maxWorkers=2 --testTimeout=30000` | 0 : 179 fichiers, 1832 tests |
| `vitest run --dir tests --maxWorkers=2 --testTimeout=60000` (`test:c6`) | 0 : 14 fichiers, 144 tests |
| `scripts/check*.mjs` (23 scripts, `checkBudgetFloor origin/main`) | 0 partout ; `checkProbeOverlap` = 1, informatif (`|| true` en CI) |
| `checkTermRegister --require-all` | 0 |
| `node --test scripts/check*.test.mjs` (10) | 0 partout |
| `node scripts/parcours-mutations.mjs` | 0 : baseline vert, 135/135 mutations tuées (dont `I5-libelle`) |
| `git merge-tree --write-tree origin/main HEAD` | 0 (aucun conflit) |

Note : avant la 2e fusion, `checkBudgetFloor origin/main` sortait 1. La branche n'avait pas encore le fixture `coherence-budget.json` de K3 (#78, mergée entre-temps). Après la fusion, il sort 0.

## Point contesté
- **« La pré-simulation n'affiche pas la raison »** (mineur de la revue) : contredit par le code. `depart()` (`app/src/features/simulation/niveau.ts:26`) renvoie `raison: tache.reason` quand la tâche prescrit un niveau. Le test `PreSimulationPage.test.tsx:198-205` vérifie que « Répétition générale : conditions réelles, sans aide. » est affiché. Les tâches de cas portent toutes `assistance` (`dayPlan.ts`, push). Je n'ai donc pas retiré la pré-simulation du rapport ; je l'ai précisée (« sous le choix du niveau »). À trancher par la revue.

## Restes connus
- **ADR-0021** (ligne 337, tableau I5) dit encore « à rejouer d'un trait ». Une ADR enregistre une décision ; je ne l'ai pas réécrite. Le contrat fait foi pour le libellé.
- **Plans déjà figés** : les raisons sont figées avec la tâche (INV-55). En production, la garde était fausse jusqu'ici : aucune tâche `dUnTrait` n'existe encore.

## Non vérifié
- **Navigateur** : aucun serveur (consigne du brief). Il n'y a ni mesure DOM de l'app ni capture. Le rendu est prouvé en RTL (jsdom), y compris la classe `.dim-tag` du libellé.
- Retour à la ligne du libellé à 375 px : non mesuré. Le libellé a le même conteneur `flex-wrap` et la même `.dim-tag shrink-0` que « Il te reste… ».
