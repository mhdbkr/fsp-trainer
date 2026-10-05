# S4 « d'un trait » : les textes qui annoncent la tâche (rapport de tâche)

Branche `feat/s4-dun-trait` (base `aa57cdc3`, garde `D_UN_TRAIT_ACTIF = true` ; origin/main fusionnée après le merge de #80, seul `serie3-avancement.md` entre). Statut : **DONE_WITH_CONCERNS** (voir « À trancher »).

Sources : `training-journal.md` §12.1, §12.3 (I5), §12.4.7, §12.12, §13.1 ; ADR-0021, ADR-0022 ; `DIRECTION-STYLE.md`.

## Textes : avant / après (garde vraie)

| Où | Situation | AVANT | APRÈS |
|---|---|---|---|
| Raison (plan figé : ligne, accueil, pré-simulation) | Consolidation due, cas fréquent, dans la fenêtre (`dUnTrait`) | « Solide il y a 47 jours : on vérifie qu'il tient. » | « Solide il y a 47 jours : rejoue-le d'un trait, comme à l'examen. » |
| Raison | Idem, sans dernier jeu daté | « Solide : on vérifie qu'il tient. » | « Solide : rejoue-le d'un trait, comme à l'examen. » |
| Raison | Cas solide choisi HORS échéance (m-l) | « Pour la fin de la préparation : ce cas, d'un trait, comme à l'examen. » | inchangé |
| Raison | Cas choisi (m-l) ET dû | « Pour la fin de la préparation : ce cas, d'un trait, comme à l'examen. » | « Solide il y a N jours : rejoue-le d'un trait, comme à l'examen. » (la date reste, une seule phrase) |
| Raison | Examen à blanc, dernière ligne droite | « Répétition générale : conditions réelles, sans aide. » | « Répétition générale : d'un trait et sans aide. » |
| Raison | Examen à blanc en mode `examen-blanc`, dans la fenêtre | le « pourquoi aujourd'hui » ordinaire (ex. « Solide il y a 12 jours : on vérifie qu'il tient. ») | la raison d'un trait ci-dessus (consolidation ou fin de préparation) |
| Ligne de tâche | Tâche d'un trait à faire | rien | rien de plus : la raison, sur la ligne, le dit (une seule mention) |
| Ligne de tâche | Tâche d'un trait entamée à part (1 ou 2 Teile) | `[Il te reste la Dokumentation et la Fallvorstellung]` · 32 min | `[À rejouer d'un trait, en entier]` · 52 min (temps du cas entier) |
| Ligne de tâche | Les trois Teile joués séparément (I5) | rien (le libellé n'existait que dans le cadran) | `[À rejouer d'un trait, en entier]` · 52 min |
| Lien « Lancer » (ligne et accueil) | Tâche d'un trait entamée à part | `?depart=dokumentation` (repartait du reste) | sans `depart` : le cas repart de l'Anamnese |
| Accueil (hero) | Tâche d'un trait entamée à part | la raison · 32 min (le reste) | la raison · 52 min ; aucun libellé ajouté |

Garde fausse : textes d'avant, mot pour mot (testé).

Le libellé reprend la formulation du contrat (« à rejouer d'un trait », §12.2, §12.3) et du cadran (« Rejouer le cas d'un trait », `CaseDialText.ts`), avec la même classe `.dim-tag` que « Il te reste… » qu'il remplace. « En entier » répond au défaut 3 : ce qui a été joué à part ne compte pas pour cette tâche, sans le dire comme une faute.

## Fichiers
| Fichier | Changement |
|---|---|
| `app/src/lib/program/select.ts` | `raisonDUnTrait(s, ctx)` ; `solideDepuis` partagé avec `pourquoiAujourdhui` (« Solide il y a N jours », jamais « 0 jour ») |
| `app/src/lib/program/dayPlan.ts` | toute tâche `dUnTrait` prend `raisonDUnTrait` ; examen à blanc de la dernière ligne droite ; le cas m-l ajouté hors échéance porte `du: false` (sa raison est la fin de préparation), `decrire` le traite en révision entière via `unTrait` |
| `app/src/features/program/TaskLine.tsx` | `LectureTache.aRejouer` ; `lectureDuPlan` : d'un trait entamée ⇒ `aRejouer`, jamais `reste` ; `TaskAnatomy` rend le libellé |
| `app/src/lib/program/select.test.ts` | les quatre textes de `raisonDUnTrait` |
| `app/src/features/program/DUnTrait.test.tsx` | génération (fenêtre, dernière ligne droite, garde fausse), ligne (à faire, entamée, I5, tâche ordinaire), accueil (`TaskList` sur le plan figé) |

Commits : `3a850c45` (raison), `dcc7360b` (ligne).

## TDD
- **RED** (avant le code) : 6 échecs pour la bonne raison. `raisonDUnTrait is not a function` ; « Cas 1 : la raison ne dit pas « d'un trait » : expected 'Solide il y a 47 jours : on vérifie q…' » ; « expected 'Répétition générale : conditions réel…' » ; « le cas entier se rejoue : rien ne « reste » : expected { …(2) } to be undefined » ; I5 et `TaskList` sans libellé.
- **GREEN** : 28/28 (`DUnTrait.test.tsx` + `select.test.ts`).
- **Mutations** (chaque mutation appliquée puis retirée par `git checkout`, exit vitest) :

| Mutation | Effet | Résultat |
|---|---|---|
| M1 : `TaskAnatomy` ne rend plus le libellé | l'indication « d'un trait » disparaît de la ligne | exit 1, 3 tests rouges |
| M2 : `lectureDuPlan` ne pose plus `aRejouer` | retour de « Il te reste… » | exit 1, 3 tests rouges |
| M3 : la tâche de cas reprend `pourquoiAujourdhui` | la raison ne dit plus « d'un trait » | exit 1, 1 test rouge |
| M4 : l'examen à blanc reprend « conditions réelles » | idem | exit 1, 1 test rouge |

## Vérification par code de sortie
| Commande | Sortie |
|---|---|
| `npx tsc -b --noEmit` | 0 |
| `vitest run --dir src --maxWorkers=2 --testTimeout=30000` | 0 : 175 fichiers, 1738 tests |
| `npm run test:c6` (`--maxWorkers=2 --testTimeout=60000`) | 0 : 14 fichiers, 143 tests |
| `scripts/check*.mjs` (22 scripts, `checkBudgetFloor origin/main`) | 0 partout ; `checkProbeOverlap` = 1, informatif (`|| true` en CI) |
| `checkTermRegister --require-all` | 0 |
| `node --test scripts/check*.test.mjs` (10) | 0 partout |
| `node scripts/parcours-mutations.mjs` (après le merge d'origin/main) | 0 : baseline vert, 134/134 mutations tuées |
| `git merge-tree --write-tree origin/main HEAD` | 0 (aucun conflit) |

## À trancher (direction-keeper)
1. **« d'un trait » deux fois sur une ligne entamée.** La raison figée (« … rejoue-le d'un trait … ») et le libellé (« À rejouer d'un trait, en entier ») se suivent. Je l'ai gardé parce que le brief demande les deux et que le libellé dit un état, pas une raison. Autre option : un libellé sans « d'un trait » (« Joué à part : à reprendre en entier »), mais il s'écarte de la formulation du contrat.
2. **« En entier »** ajouté au libellé du contrat. Il sert le défaut 3 ; on peut l'enlever si « à rejouer d'un trait » suffit à lui seul.
3. **Plans déjà figés.** Les raisons sont figées avec la tâche (INV-55) : un plan matérialisé avant ce commit garde l'ancienne raison. En production la garde était fausse, donc aucune tâche `dUnTrait` n'existe encore : sans effet.

## Hors périmètre (propositions)
- `app/scripts/parcours-candidat.mjs:180` repère une tâche entamée par `/Il te reste/`. Une tâche d'un trait entamée dit maintenant « À rejouer d'un trait » : le parcours pourrait la cocher comme « une autre ». Proposition : élargir la regex à `/Il te reste|À rejouer d'un trait/`.
- Ajouter M1 à `MUTATIONS` (`parcours-mutations.mjs`, préfixe `INV-51-…`) pour que la disparition du libellé rougisse en CI, et pas seulement dans ce rapport.

## Non vérifié
- **Navigateur** : aucun serveur (consigne du brief). Pas de mesure DOM de l'app ni de capture. Le rendu est prouvé en RTL (jsdom), y compris la classe `.dim-tag` du libellé.
- Retour à la ligne du libellé à 375 px : non mesuré (même conteneur `flex-wrap` et même `.dim-tag shrink-0` que « Il te reste… »).
