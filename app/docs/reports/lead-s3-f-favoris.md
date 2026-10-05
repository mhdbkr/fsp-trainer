# Lot F — favoris → drill · rapport d'implémentation

**Statut : DONE_WITH_CONCERNS** — points 1 à 4 livrés et branchés (point 4 affiché depuis le passage « Fusion S4-2 », voir en fin de rapport). Pas de vérification navigateur : l'app exige Supabase pour se connecter.
Branche `feat/s3-f-favoris` (worktree `doctopus-s3-f-favoris`), poussée, pas de PR.

## Hypothèses (à valider par la direction)

1. *(Remplacée par la revue I3, voir §Fixeur.)* **« Favoris de la séance » = favoris posés il y a moins de 48 h** (même fenêtre que le bonus ★ existant, `relevance.ts` `H48`). Le favori ne porte pas de lien à la séance dans la projection (`Favorite = { termId, since }`, `db/types.ts:340`) ; seule la fenêtre temporelle est disponible sans toucher au contrat. Un Neu favori de plus de 48 h n'est plus forcé (il garde son ordre de pertinence normal).
2. **Point 1 — les favoris forcés consomment le budget du jour mais ne sont jamais coupés par lui** : budget 3, 2 favoris → 2 favoris + 1 autre nouveau ; budget 0, 6 favoris → les 6 entrent. Ils ne sont pas non plus coupés par la borne d'affichage (`limit` 20) : la file s'allonge plutôt que d'en perdre un. *(Revue I1 : ils ne prennent plus non plus la place des dus.)*
3. **Point 2 — l'échéance avancée est calculée à la lecture, jamais écrite.** Le SRS est une projection du dernier `srs.reviewed` (`lib/sync/projections.ts:9-12`) : écrire une échéance demanderait un événement `srs.*` dans le journal (hors périmètre, et il polluerait `reviewedToday`/`retention7d`). `effectiveDue` (dans `drillQueue.ts`) = `min(échéance SRS, minuit suivant le favori)` tant que le terme n'a pas été revu depuis le favori.
   - « Revu depuis » se déduit du SRS lui-même : `reviewSrs` pose `dueDate = revue + interval·j` (réussite) ou `revue + 60 s` avec `interval 0` (raté) — `lib/srs.ts:26,43`. Donc dernière revue = `dueDate − interval·DAY_MS` (exacte en réussite, +60 s en raté : sans effet pratique, l'échéance est alors dans la minute).
   - Idempotent : re-favoriser un favori est un no-op (`planAddTermToDeck`, `index.ts`) ; même état → même file (testé).
   - Ne recule jamais : `min(...)`. Défavoriser retire l'avance (le favori n'est plus « à revoir bientôt »).
4. *(Validée par la revue : elle protège le SRS.)* **Point 3 — un favori appris du cas suit le point 2** : dans le drill qui suit le cas le même jour, il n'apparaît pas encore (dû demain) ; « commence par les favoris de ce cas » s'applique à ceux présents dans la file (les Neu y sont toujours, forcés hors budget, même au-delà de 48 h). « Favoris de ce cas » = `term.favorited` portant `payload.caseId` = ce cas, toujours favori, en ordre d'événement (`caseFavoriteIds`, `caseTerms.ts`).
5. *(Complétée par la revue I2 : le plan lit maintenant les favoris d'avant minuit de D.)* **Point 4 — le plan figé n'est pas touché.** `buildTasks` compte les termes par `counts(begriffe, now)` de `lib/stats` (`dayPlan.ts:155`), qui ne lit ni les favoris ni `buildDrillQueue` : la sélection et le budget du plan restent indépendants d'un favori posé aujourd'hui (INV-55). Le libellé est une fonction pure à appeler **à l'affichage** avec `queueCounts(...).favorites`.

## Commits

| SHA | Objet |
|---|---|
| `40ca97ad` | feat(drill) : favoris Neu de la séance tous forcés ; appris dû au lendemain (`effectiveDue`) ; `queueCounts.favorites` |
| `5dba0e08` | feat(drill) : `caseFavoriteIds` + `leadIds` ; `DrillPage` les branche ; `nextDueAt` tient compte des favoris |
| `f4ef3f74` | feat(programme) : `drillFavorisNote(n)` (pur) |
| `d26c7b80` | test(drill) : fixtures qui prouvent l'ordre d'événement et l'échéance jamais reculée |

Fichiers : `app/src/lib/collections/{drillQueue,relevance,caseTerms}.ts` (+ tests), `app/src/features/fachbegriffe/DrillPage.tsx`, `app/src/lib/program/dayPlan.ts` + `dayPlan.favoris.test.ts`.

## TDD RED → GREEN

- RED (avant code) : `drillQueue.test.ts` → 5 échecs (`queueCounts` sans `favorites`, point 1 « TOUS les favoris », point 2 « dû dès demain », point 3 `leadIds`, point 4 compteur) ; `caseTerms.test.ts` → 1 échec (`caseFavoriteIds` absent) ; `dayPlan.favoris.test.ts` → 2 échecs (`drillFavorisNote is not a function`).
- GREEN : `src/lib/collections` 100/100 puis suite complète.
- **Incident corrigé** : après GREEN, j'ai ajouté `sortEvents` à `caseFavoriteIds` sans relancer ; la fixture partageait un seul `occurred_at`, donc le tri retombait sur l'ordre des ids → test rouge, vu à la suite complète. Ma première passe de mutation tournait donc sur une base ROUGE (résultats invalides). Fixture corrigée (horodatages distincts, passés mélangés), script de mutation durci (refuse de tourner si la base n'est pas verte), mutation relancée.

## Preuves par mutation (base verte vérifiée, `src/lib/collections` + `dayPlan.favoris.test.ts`)

| Mutant | Résultat |
|---|---|
| M1 favoris de la séance non forcés | tué |
| M2 favoris hors budget (ne le consomment plus) | tué |
| M3 réserve limitée à 3 places | tué |
| M4 pas d'avance au lendemain | tué |
| M5 ignore une revue postérieure au favori | tué |
| M6 recule une échéance plus proche | **survivant à la 1re passe** → fixture corrigée (favori posé avant la dernière revue, il n'exerçait pas la règle) → tué |
| M7 SRS muté par la file | tué |
| M8 pas de tête `leadIds` | tué |
| M9 fenêtre 48 h ignorée | tué |
| M10 `caseFavoriteIds` sans filtre « encore favori » | tué |
| M11 `caseFavoriteIds` sans filtre de cas | tué |
| M12 `queueCounts.favorites` à 0 | tué |
| M13 libellé affiché à N = 0 | tué |
| M14 `caseFavoriteIds` sans ordre d'événement | tué |

## Gates (code de sortie)

- `npx tsc -b --noEmit` → 0
- `npx vitest run --dir src --maxWorkers=2` → 0 (158 fichiers, 1 540 tests)
- ~~`node scripts/check*.mjs` (23 scripts, un par un) → tous 0~~ **FAUX, corrigé en §Fixeur (m5)** : ma boucle `echo "$(basename $f)=$?"` lisait le code de sortie de `basename`, pas du script. `node --test scripts/check*.test.mjs` → 0 (lui était mesuré correctement).
- `git merge-tree --write-tree origin/main HEAD` → 0 (origin/main a 1 commit d'avance, aucun conflit)

## Ce qui reste (hors périmètre — proposition, non implémenté)

1. **Affichage du point 4** : brancher `drillFavorisNote(queueCounts(pool, { relevance, newLimit, maxReviews }).favorites)` sous la tâche drill dans `features/program/TaskLine.tsx` (ligne `task.reason`, l. 91) et le hero `features/home/HomePage.tsx:100`. Lecture à l'affichage via `loadDrillContext()` + `useAllTerms()`. Ces deux fichiers sont hors de mon périmètre.
2. Si la direction veut une notion de « séance » plus exacte que 48 h (ex. favoris posés pendant la dernière simulation), il faut soit la `caseId` dans la projection `Favorite` (contrat collections), soit lire les événements — à trancher.
3. `markIntroduced` compte les favoris forcés : un jour avec beaucoup de favoris consomme le budget de nouveaux suivant (`remaining` à la replanification). Voulu selon l'hypothèse 2 ; à confirmer.

## Non vérifié

- **Vérification navigateur** : l'app exige Supabase dans les deux modes d'auth (`lib/auth/session.ts:10`, `lib/supabase.ts:8` lève sans `VITE_SUPABASE_URL`) ; le brief interdit de démarrer un serveur Supabase et de toucher la prod. Le changement d'écran est limité au branchement (`leadIds`, `nextDueAt(..., favorites)`) dans `DrillPage.tsx` ; la logique est couverte par les tests unitaires ci-dessus, pas par une mesure DOM.
- Pas de revue `impeccable` : aucun élément visuel ajouté.

---

## §Fixeur — revue Opus de `336adf0a` (« Needs fixes », sans bloquant)

Chaque point : test rouge, puis code, puis mutation (le script refuse de tourner si la base n'est pas verte), puis un commit.

| Point | Commit | RED (avant code) | Mutants |
|---|---|---|---|
| I1 + m1 | `8443a95d` | 30 dus + 40 favoris (`limit` 20) → 0 dû au lieu de 17 ; `queueCounts` ≠ file réelle | I1-a (forcés soustraits des places de dus), I1-b (`queueCounts` sans borne), m1 (`.slice(0, limit)`) : tous tués |
| I2 (+ m4) | `1e2db2d3` | `counts` sans favori → 0 dû le lendemain ; `effectiveDue`/`favoritesBefore` absents ; plan D+1 sans « 1 terme dû » | I2-a à I2-f : tous tués |
| I3 | `1e1c359e` | week-end off (favori vendredi, drill lundi) non forcé ; favori antérieur au dernier drill encore forcé ; `lastDrillAt` absent | I3-a à I3-g : tous tués |
| m2 | `f0b8b451` | contexte chargé sans favori, budget 0 : « À jour ✓ » au lieu de la carte du favori vivant | m2 (instantané du contexte) : tué |

**I1.** Les places des dus se calculent sur `limit`, moins la réserve de 3 Neu. Les favoris forcés s'ajoutent et ne sont jamais coupés ; les autres Neu remplissent le reste. Exemple : 30 dus + 40 favoris donnent 17 dus + 40 favoris avec `limit` 20, et 30 + 40 avec `limit` 100. `queueCounts` compte la file servie avec les mêmes options, donc l'en-tête « à revoir » et la durée annoncée sont exacts. Un ancien test (20 cartes = 14 dus + 6 favoris) encodait l'éviction ; il dit maintenant 23 = 17 + 6.

**I2.** `effectiveDue(srs, favoriteSince?)` et `favoriteSinceMap` sont dans `lib/srs.ts`, et `isDue` lit l'échéance effective. La `Map` est construite une fois par appel de `counts`, de `buildDrillQueue` et de `nextDueAt` (règle m4). `counts`/`dueCount` acceptent `favorites` en option. Ils le reçoivent de `HomePage.tsx` (hook + appel), de `FachbegriffePage.tsx` (une ligne) et de `CaseTermsPanel.tsx` (import + hook + appel). `loadBuildInput` passe `favoritesBefore(events, date)`, c'est-à-dire la projection des seuls événements `occurred_at < startOfDay(D)`. Le test d'intégration passe par `ensureDayPlan` : un favori posé le jour D laisse le plan de D sans drill, et le plan de D+1 dit « 1 terme dû ».
- *Constat* : la coupe de minuit est redondante avec la règle elle-même, puisque l'échéance avancée est toujours au moins le lendemain du favori. Le test d'intégration ne peut donc pas tuer la mutation « coupe retirée » (I2-e). C'est le test unitaire de `favoritesBefore` qui la tue. Je l'ai gardée : elle écrit en clair le contrat d'entrée d'INV-55, et elle tiendra si la règle change un jour.

**I3.** Un favori Neu est forcé s'il a été posé après la dernière séance de drill terminée. Cette séance est lue dans le journal par `lastDrillAt(training_events, now)` (`drillContext.ts`) : événement `kind 'drill'`, coche nue exclue (`isCocheNue`, `lib/journal.ts:149`), `at ≤ now`. Sans drill antérieur, la fenêtre de 48 h sert de repli. Le journal l'expose proprement (index `[kind+at]`), il n'y a rien eu à bricoler. Un test d'intégration vérifie que `loadDrillContext` la remplit.
- *Limite* : n'importe quel drill termes compte comme « dernière séance », y compris un drill de deck ou de cas dont le pool ne contenait pas le favori. Un favori Neu absent de ce pool cesse alors d'être forcé, mais garde son bonus de pertinence de 48 h. Pour faire mieux, il faudrait savoir dans le journal quel pool la séance couvrait (`training` porte `caseId`, pas le deck), ce qui touche au contrat. Je le signale, je ne l'ai pas fait.
- `TrainingEvent.at` est commenté « début de l'exercice », mais `DrillPage` n'en passe pas : c'est l'heure de journalisation, donc la fin de séance ou le démontage (`lib/journal.ts` `input.at ?? now()`). Conséquence : un favori posé pendant une séance, avant sa fin, n'est pas forcé au drill suivant. Cas marginal.

**m2.** `DrillPage` n'a plus qu'une source de favoris, la liste vivante (`useFavorites`). Elle alimente la file, l'en-tête, `nextDueAt` et `leadIds`, et la file attend qu'elle soit chargée. Les tests « pas de boucle de rendu » (≤ 3 appels) restent verts.

**m3 (assumé, pas de code).** Au premier chargement après le merge, chez un compte qui a déjà des favoris Neu, tous ceux posés après sa dernière séance de drill sont forcés, ou ceux de moins de 48 h s'il n'a jamais fait de drill. Il peut donc y avoir un pic ponctuel. Il reste borné par le nombre de favoris Neu, et les dus ne sont plus évincés (I1).

**m5 (correction du rapport).** Mon tableau « tous 0 » était faux : la boucle lisait `$?` après `$(basename …)`. Mesure refaite (`rc=$?` juste après `node`) sur la branche :
- `checkProbeOverlap.mjs` → **1**. Script informatif, toléré par la CI (`node scripts/checkProbeOverlap.mjs || true`, `quality.yml:113`), sans lien avec ce lot.
- `checkBudgetFloor.mjs` (sans argument) → **1** sur la copie de travail. Il est bloquant en CI, mais pas à cause de ce lot : la branche ne touche ni `app/scripts` ni `app/src/data` (diff vide depuis `9aee4cfb`). Lancé contre la base de branchement (`checkBudgetFloor.mjs 9aee4cfb`), il sort à **0**. Il ne sort à 1 que contre l'`origin/main` mis à jour (K2), que la branche n'a pas encore fusionné. Sur l'arbre fusionné (ci-dessous), il sort à **0**.
- Les 21 autres → 0 ; `node --test scripts/check*.test.mjs` → 0.

### Gates du fixeur (code de sortie)
- Branche (`f0b8b451`) : `tsc -b --noEmit` → 0 ; `vitest run --dir src --maxWorkers=2` → 0 (159 fichiers, 1 555 tests).
- `git merge-tree --write-tree origin/main HEAD` → 0, contre l'`origin/main` qui contient K2 (27 commits d'avance, aucun fichier en commun avec ce lot).
- **Arbre fusionné** (commit temporaire construit depuis l'arbre de `merge-tree`, worktree détaché jetable, supprimé ensuite) : `tsc` → 0 ; vitest complet → 0 (160 fichiers, 1 566 tests) ; `checkBudgetFloor.mjs origin/main` → 0.

### Toujours reporté
- Libellé du point 4 dans `TaskLine`/`HomePage`, non branché (consigne).
- Vérification navigateur : même raison qu'au premier passage (auth Supabase obligatoire, aucun serveur autorisé).

---

## Fusion avec S4-2 (#76) et point 4 affiché

### Fusion — `f92ca4a7`
Le conflit portait sur `lib/program/dayPlan.ts` ; `HomePage.tsx` a fusionné automatiquement, avec les deux intentions présentes (`useFavorites` + `dueCount(..., favorites)` d'un côté, `TaskList`/`lectureDuPlan` de S4-2 de l'autre). Pour résoudre, j'ai repris la version de main et rejoué le lot F dessus. Main avait sorti `modusOf` et `teilLePlusEnDette` de `dayPlan.ts` ; je ne les ai pas réintroduits.
- **Une seule coupure.** S4-2 coupe le journal source dans `entreeDuJour` (`entree.ts`) : `avant = events.filter(occurred_at < coupure)`, avec par défaut `coupure = debutJour(date, tz)`, c'est-à-dire l'heure d'enregistrement et le fuseau du plan (m1 de S4-2). `Entree` porte désormais `favorites = projectCollections(avant).favorites`, soit le même `avant` que le journal et le SRS. `loadBuildInput` passe `e.favorites` et `buildTasks` appelle `counts(begriffe, finJour(D), favorites)`. Ma seconde coupure, `favoritesBefore` (minuit local, sans fuseau), est supprimée.
- Avec S4-2, les dus se comptent à `finJour(D) = debutJour(D+1)`. L'échéance avancée d'un favori posé le jour D (`debutJour(D+1)` en fuseau local) tombe pile sur cette borne. La coupure n'est donc plus redondante (constat du §Fixeur sur I2-e) : **sans elle, un favori posé le jour D compterait dans le plan de D**. Le mutant MG-a (favoris pris dans tout le journal) est maintenant tué par le test d'intégration `ensureDayPlan`.
- Test unitaire réécrit sur `entreeDuJour(...).favorites` : le favori du jour D n'entre pas, celui de la veille entre, et un retrait d'avant minuit compte.
- Mutants MG-a (favoris non coupés), MG-b (`buildTasks` sans favoris), MG-c (`loadBuildInput` ne les passe pas) : tous tués.
- *Limite héritée de S4-2* : « replanifier » lit tout le journal (`coupure: Infinity`, choix de S4-2). Un favori posé aujourd'hui sur un terme appris compte donc dans le plan **replanifié** du jour, puisque son échéance avancée = `finJour(D)` et que les dus se comptent `≤ finJour(D)`. Le plan figé de D, lui, n'est pas touché. Je n'ai rien changé : replanifier est une action explicite qui prend « tout ce qu'on sait ».

### Point 4 — `b0cd0612`
- **Où.** `TaskLine.tsx` monte le sous-composant `DrillFavoris` (défini hors du composant parent), seulement sur la tâche drill **à faire, du jour, pas en lecture seule**. `TaskLine` sert à l'accueil (via `TaskList`, `HomePage.tsx:133`) et au programme (`ProgramPage.tsx:189`) : le libellé apparaît dans les deux sans être dupliqué. La projection et les jours passés sont en `readOnly`, donc exclus. Le bandeau de l'accueil (`session.reason`) n'est pas touché.
- **Quoi.** `drillFavorisNote(queueCounts(glossaire + termes perso, { newLimit: remaining, maxReviews: reviewsRemaining, relevance: { ...ctx.relevance, favorites: favoris vivants } }).favorites)`. C'est la file que le drill global servirait maintenant, avec les mêmes options que `DrillPage`. Le texte est lu à l'affichage et jamais stocké : la sélection et le budget du plan n'en dépendent pas.
- **TDD.** RED : « dont 2 favoris de ta séance » absent (le test trouvait seulement « ✓ Fait »). Puis GREEN. Mutants P4-a (pas monté), P4-b (en lecture seule), P4-c (autre jour), P4-d (autres types de tâche), P4-e (favoris de l'instantané au lieu de la liste vivante), P4-f (affiché à 0) : tous tués.
- *Coût* : le glossaire est lu (`useAllTerms`) seulement quand une tâche drill du jour est à faire, en plus de ce que l'accueil lit déjà. Pas de mesure faite.

### Gates après fusion (code de sortie, sommet `b0cd0612` + rapport)
- `tsc -b --noEmit` → 0
- `vitest run --dir src --maxWorkers=2` → 0 (166 fichiers, 1 635 tests)
- `test:c6` (`vitest run --dir tests`, Supabase mocké par `tests/helpers/mocks.ts`, sans variables d'environnement) → 0 (10 fichiers, 124 tests)
- `check*.mjs` et `checkBudgetFloor.mjs origin/main` : voir ci-dessous
- `check*.mjs` (le code de sortie est relevé juste après chaque `node`) : 22 scripts → 0. `checkProbeOverlap.mjs` → 1 : il est informatif et toléré par la CI (`|| true`), sans lien avec ce lot.
- `checkBudgetFloor.mjs origin/main` → **0** (sur la branche fusionnée, plus d'écart de base) ; `node --test scripts/check*.test.mjs` → 0.
- `git merge-tree --write-tree origin/main HEAD` → 0 (main n'a avancé que de deux commits de registre, `app/docs/reports/serie3-avancement.md`).
