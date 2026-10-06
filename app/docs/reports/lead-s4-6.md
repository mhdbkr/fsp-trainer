# S4-6 — la page Historique en carnet de séances · rapport

**Statut : DONE_WITH_CONCERNS.** Les concerns sont des hypothèses à valider par `main` (§3) et trois amendements de contrat que je propose sans les écrire (§4). Aucun défaut ouvert.
Branche `feat/s4-6-historique`, worktree `doctopus-s4-6-historique`, partie de `origin/main` `0174bf6c`. Poussée, sans PR.
Aucun serveur Supabase lancé, rien déployé, aucune prod touchée.

Sources : la proposition validée (`docs/superpowers/specs/2026-10-04-cas-entier-cadran.html`, « 5 · Historique »), `training-journal.md` §1.2 (r. 4 : tout dérive du journal), §12.7, §13.3, ADR-0021, ADR-0022, `DIRECTION-STYLE.md`, et la revue direction de S4-5 (`lead-s4-5.md` §0, lue sur `origin/feat/s4-5-programme`).

## 1. Ce que fait la page

Captures : `app/docs/reports/s4-6-historique-390.png` et `s4-6-historique-1280.png`, prises par la sonde (journal semé, 5 séances).

- **En haut, une seule ligne de semaine**, avec sa tendance. Exemple capturé : « Cette semaine : 3 cas, 4 Teile acquis. ↑ 3 cas de plus qu’à ce stade la semaine dernière ».
  - Semaine = lundi → maintenant, comme S4-5 (`startOfWeek`, `weekStartsOn: 1`).
  - « cas » : les cas distincts joués, hors plan compris.
  - « Teile acquis » : les Teile passés à `acquis` ou `solide` cette semaine, alors qu’ils ne l’étaient pas lundi.
  - « Fachbegriffe révisés » : les termes distincts notés au drill (`srs.reviewed`) cette semaine.
  - Un compte à zéro n’est pas écrit. Une semaine vide donne « Cette semaine : pas encore de séance. ».
  - La tendance compare les cas **au même instant de la semaine dernière**, jamais à une semaine entière (sinon elle baisserait chaque lundi).
- **Une carte par séance**, de la plus récente à la plus ancienne :
  - le titre (« Mardi 6 oct. · soirée ») et le résumé (« 68 min · 2 cas · 1 drill »). Les minutes sont la somme mesurée (`spentMin`), jamais l’écart entre le début et la fin ;
  - une ligne par cas joué, avec le cadran **avant** (36 px, non ouvrable) → **après** (36 px, ouvrable, sans action), le nom du cas (lien vers sa fiche) et le dernier score mesuré de chaque Teil ;
  - au plus deux actions par cas, chacune seulement si elle a encore un sens aujourd’hui :
    - « Revoir mes N oublis » → l’écran de résultat de la partie (`/simulation/<cas>/run?sim=<id>`), dont la section « Ce que tu oublies souvent » liste ces N items. N = les lignes « encore manquée » de `bilanErreurs`, si elles sont **toujours** un signal (`erreursTransversales` du journal entier) ;
    - « Rejouer la Fallvorstellung » → `/simulation/<cas>/pre?depart=<Teil>`, pour le Teil le plus faible sous 60, s’il l’est **encore**.
  - le bloc **« Pendant cette séance »**, seulement s’il a quelque chose à montrer :
    - les termes mis en favori pendant la séance (« Aszites ★ ») ;
    - les mots cherchés au moins deux fois. « Ikterus · cherché 2 fois » est un bouton (`aria-label` « Envoyer Ikterus au drill ») : un toucher le met en favori, puis il passe en ★.
- **Garde-fous de la revue S4-5** :
  - aucun lien en double dans une séance (test RTL) ;
  - aucun chiffre sans source ni action. « hors plan » sur chaque ligne a été retiré : sans programme, tout l’est, et l’étiquette ne menait à rien ;
  - aucun texte de conception affiché (test RTL : ni « Chaque chiffre », ni « un toucher », ni « mène à une action »).
- **Retiré de l’ancienne page** : les 4 tuiles (Exercices, Temps mesuré, Jours travaillés, Série en cours) et les 3 filtres. La série reste sur l’accueil, sans doublon. Le temps mesuré est dans chaque séance.

## 2. L’événement « terme cherché »

- `db.termes_cherches` (Dexie **v7**, `'++id, at'`) : `{ at, terme }`. Le type `TermeCherche` est dans `db/types.ts`. La table est vidée par `wipeDatabase`.
- Écrit par `noterTermeCherche` (`lib/termesCherches.ts`) **dans `SelectionExplainer`, au clic sur « Expliquer », et nulle part ailleurs**. Une simple sélection, ou la ★, ne note rien (test).
- **Jamais poussé** : ni `syncQueue`, ni `progress_events`, ni `outbox`. Le test `termesCherches.test.ts` espionne `syncQueue.push` et compte les deux tables. Le test du `SelectionExplainer` vérifie aussi qu’il n’écrit aucun `progress_events`.
- **Montée de version testée** : une base v6 réelle (`training_events`, `favorites` remplis) s’ouvre en v7, ne perd rien, et gagne la table.
- Un mot cherché ne s’affiche que s’il mène à une carte : un Fachbegriff (`lookupTerm`, la même résolution que « Expliquer ») ou une carte personnelle (`personalTermId`). Un mot sans carte n’aurait rien à envoyer au drill.

## 3. Hypothèses à valider (surfacées, pas tranchées en silence)

1. **`features/program` touché, sur deux fichiers que S4-5 ne modifie pas.**
   - La page Historique vivait dans `features/program/HistoriquePage.tsx`. Elle est réécrite dans `features/history/`.
   - L’ancien fichier est supprimé, avec le test de série qui le rendait (`SerieLundi.test.tsx`, cas « historique » ; le cas « accueil » reste).
   - C’est un commit à part (`6f302058`), facile à retirer.
   - `git merge-tree --write-tree origin/feat/s4-5-programme HEAD` sort à 0, sans conflit. La consigne était de ne pas toucher `features/program` ; je l’ai lue comme « pas de conflit avec #85 ». Si elle était stricte, retirer ce commit laisse un fichier mort.
2. **Seule « Expliquer » journalise.** La recherche du panneau Doctopus et celle du glossaire filtrent à chaque frappe, et ⌘K sert à naviguer : les compter aurait fabriqué des « cherché N fois ».
3. **« Envoyer au drill » = mettre en favori** (`toggleFavorite`, lot F). Les favoris de la séance entrent tous au drill suivant, et un terme déjà appris redevient dû le lendemain. Je n’ai créé aucun mécanisme de drill.
4. **« Revoir mes N oublis » plutôt que « corrections prioritaires ».** Le chiffre vient du journal (`manques`, §13.3), qui ne lit jamais `prioritizedCorrections`. La page d’arrivée affiche ces items sous « Ce que tu oublies souvent » ; le même mot évite un chiffre qui ne correspond à rien.
5. **`SEANCE_PAUSE_MIN = 30`** : au-delà de 30 min entre la fin d’un exercice et le début du suivant, une nouvelle séance commence. C’est un choix produit.
6. **Fenêtre des mots et des favoris** : du début de la séance à sa fin + 30 min (ce qui suit d’un trait lui appartient).
7. Les exercices sans ligne de cas (drill, fiche, Aufklärung) sont **comptés** dans le résumé de la séance, sans le nom de la fiche lue.
8. **Toutes les séances sont rendues**, sans pagination. `ponytail` : paginer quand un profil en aura des centaines.

## 4. Amendements de contrat — écrits sur décision de `main`

`main` a validé les hypothèses 1, 3 et 4 du §3 et demandé d'écrire les amendements. Ils décrivent ce qui est livré.
- `docs/contracts/training-journal.md` §9 : ligne `termes_cherches` (Dexie v7, local, jamais synchronisé, vidé par `wipeDatabase`) — commit `fe2026c6`.
- `training-journal.md` §14 « Les séances de l'Historique » : définition de la séance, cadrans avant/après, actions, « Pendant cette séance », ligne de semaine, INV-H1 à H7 — même commit.
- `docs/contracts/sync-protocol.md`, ligne « **Local uniquement** » : mots cherchés — commit `50fd5877`.
- **Écart pour Fondations**, noté seulement (décision de `main`), consigné au §14.5 du contrat : `DrillPage` journalise le drill **à la fin** (`logTraining` sans `at`), alors que §1.1 dit `at` = début de l'exercice. Preuve : `DrillPage.tsx`, `journaliser.current`, appel `logTraining({ kind: 'drill', spentMin, … })` sans `at`.

## 5. TDD — RED puis GREEN

| Test | RED | GREEN |
|---|---|---|
| `src/lib/termesCherches.test.ts` (local, jamais poussé, v6 → v7) | exit 1, module absent | exit 0, 10/10 avec `src/db` |
| `SelectionExplainer.test.tsx`, « Expliquer note le mot » | exit 1, 1 échec sur 23 | exit 0, 23/23 |
| `src/features/history/HistoriquePage.test.tsx` (7 blocs) | exit 1, module absent | exit 0, 7/7 |
| `tests/invariants.historique.test.ts`, « une action périmée disparaît » | exit 1, 1 échec sur 14 | exit 0, 14/14 |
| `tests/invariants.historique.test.ts`, INV-H1 à H6 | **pas de RED exécuté** : le fichier a été écrit avant le module, mais lancé seulement après | exit 0 ; la morsure est prouvée par les mutations ci-dessous |

**Mutations** :
- harnais `parcours-mutations.mjs` : 16 nouvelles, toutes tuées. Ce sont INV-H2a/b, H3, H4a/b, H5a/b, H6a/b/c et H7a/b/c/d/e. INV-5d et D5 visent maintenant la nouvelle page ;
- deux survivantes ont durci les tests : H7b (60 dans la séance, 50 ensuite) et H7c (un score auto-évalué n’est pas affiché comme mesure) ;
- 6 à la main sur la page, toutes rouges : bloc vide affiché, lien en double, « Envoyer » sans effet, cadran avant = après (tuée après un test durci), tendance masquée, « Revoir » vers la pré-simulation ;
- la sonde e2e sort à 1 sous la mutation `flex-wrap` → `whitespace-nowrap` sur les actions : débord de 13 px à 390 px, de 28 px à 375 px.

**C6, sondes adaptées sans affaiblir** :
- INV-5 rendu exige l’ensemble **exact** des ids du journal (`data-te`), chacun une fois, plus la durée de la séance. L’ancienne version ne vérifiait qu’un compte de tuile.
- Le nom du cas reste exigé pour chaque partie jouée. Il ne l’est plus pour une fiche liée à un cas, qui n’est que comptée.
- `parcours-candidat.mjs` D5 compare de même les ids rendus aux `training_events`.
- `copyApp` du harnais copie `supabase/functions/_shared`, comme `copyAppFull` : `lib/dictionary` l’importe, et le baseline d’INV-5 était rouge sans lui.

## 6. Vérifications (codes de sortie, sur `e7bc7690`)

| Vérification | Résultat |
|---|---|
| `tsc -b --noEmit` | 0 |
| `vitest run --dir src --maxWorkers=2` | 0, 185 fichiers, 1924 tests |
| `npm run test:c6 -- --maxWorkers=2` | 0, 15 fichiers, 158 tests |
| `npm run build` | 0 |
| les 17 validateurs de `quality.yml`, `checkTermRegister --require-all`, `checkBudgetFloor origin/main`, `evalDoctopus --dry`, les 4 `node --test` | tous à 0 |
| `parcours-mutations.mjs` complet (une passe, sans `--keep`) | 0 : baseline vert, **150/150 mutations tuées** ; aucun `c6-mut-*` restant après le run |
| `scripts/e2e/historique390.mjs` | 0 : 390, 375 et 1280 px, débord 0, 8 exercices sur 8, 2 favoris, aucune action sous 44 px |
| `git merge-tree --write-tree origin/main HEAD` | 0, contre `origin/main` `3935db34`, puis de nouveau contre `f060c12d` |
| `git merge-tree --write-tree origin/feat/s4-5-programme HEAD` | 0, contre `a0975e5f` |
| fusion S4-5 + S4-6, sans checkout (consigne de `main` : pas de worktree jetable) | `merge-tree` 0, arbre `122f5179`. Un seul fichier est touché par les deux branches, `scripts/parcours-mutations.mjs`, et il fusionne sans conflit. `git grep "program/HistoriquePage"` sur l'arbre fusionné sort à 1 : plus aucune référence au fichier supprimé |

## Non vérifié

- **`tsc` et `test:c6` sur l'arbre fusionné S4-5 + S4-6** : pas lancés, faute de checkout (consigne). La CI de la seconde PR à fusionner les rejouera.

- **`parcours-candidat` D5 en navigateur** : il demande un Supabase local, et cette tâche n’en lance aucun. Le code est adapté (`node --check` à 0), mais il n’a pas été rejoué.
- **Thème sombre** : aucune capture. Les classes `dark:` suivent celles des pages voisines.
- **Appareil réel** : la mesure est headless (Chromium de playwright-core).
- `graphify update app/src` n’a pas été lancé : le graphe vit dans le dépôt principal, hors de ce worktree.

## Constat — saturation du disque (pour `main`)

- **Ce n'est pas le harnais.** `parcours-mutations.mjs` supprime chaque copie `c6-mut-*` (aucune ne reste après la passe complète). Il ne nettoie pas en cas d'exception (pas de `try/finally` autour de `copyApp`/`run`), mais ce n'est pas ce qui a rempli le disque.
- **C'est vitest 5.0.1.** Chaque lancement crée `$TMPDIR/<nanoid>/client/<hash>` (`node_modules/vitest/dist/chunks/index.DzobfTyw.js:20431`, `_tmpDir = join(tmpdir(), nanoid())`) et ne le supprime jamais. Seul le `tmpDir` du projet est effacé (`clearTmpDir`, l. 12288).
- Mesure : `$TMPDIR` pèse 64 Go, dont 7 404 dossiers de ce type (59 Go). Cette passe à elle seule en a laissé environ 300 (3,6 Go) ; l'espace libre est passé de 4,0 à 3,0 Go.
- **Correctifs proposés, non appliqués** :
  - dans le harnais, lancer vitest avec `env: { ...process.env, TMPDIR: dir }`, pour que la copie emporte ce qu'il laisse ;
  - côté poste, purger les dossiers périmés, par exemple : `find "$TMPDIR" -maxdepth 1 -type d -mmin +120 -name '?????????????????????' -exec test -d {}/client \; -prune -exec rm -rf {} +`.
