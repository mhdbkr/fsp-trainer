# Lot C6-B « le jour du candidat » — rapport

Branche `feat/s3-c6b-jour` (base `origin/main` @ `faa53727`), un seul writer. Sources : `c6-jugement-ux-2026-10-04.md` (ruptures 4, 6, 7b) et le rapport de parcours C6 (bugs « 0 terme dû », « dûs », dette `Date.now()`).

**Statut : DONE_WITH_CONCERNS.** Les 5 points et les 2 décisions de `main` sont livrés, rouge → vert, mesurés dans le DOM à 390 et 1280 px. Une porte n'a pas pu tourner (voir « Non vérifié »).

## Point × cause × correction × preuve

| # | Cause (constatée) | Correction | Preuve |
|---|---|---|---|
| 2 | `dayPlan.ts:142` : `dû${s}` donne « dûs » au pluriel. | `termes dus` / `terme dû`. Commit `ba50556d`. | Test `C6-B · l'accord de « dus »` ROUGE (`'4 termes dûs aujourd'hui…'` ≠ `/4 termes dus/`), puis vert. `grep -rIn "dûs" app/src` : plus aucune occurrence hors rapports. |
| 1 | La tâche annonçait ce qu'elle n'a pas (« 0 terme dû aujourd'hui, plus les nouveaux du budget »), et le hero ne disait pas sa durée. | `drillReason(due, fresh)` : « 10 nouveaux termes », « 3 termes dus · 2 nouveaux termes ». Le hero affiche « raison · N min ». Commit `9180be38`. | 2 tests ROUGES (`'0 terme dû…'` ≠ `'10 nouveaux termes'`), puis verts. DOM 1er oct. : hero « 10 nouveaux termes · 4 min ». |
| 5 | `Date.now()` dans `lib/lauf/{automat,speichern}.ts` (startedAt, endedAt, reprise, abandon à 24 h), `TeilAiLauncher` (`at` de la trace), `PendingExternalSimCard` (expiration 12 h, snooze) : la garde du 3 oct. compare `sim.date` (`lib/clock`) à `trace.at` (horloge réelle). | `now()` de `@/lib/clock` partout. Commit `634013b0`. | `features/simulation/horloge.test.tsx` : 7 tests ROUGES (horloge injectée en 2099 et en 2025, vraie horloge 2026), puis verts. Ils avancent l'horloge injectée : endedAt − startedAt = 90 min ; abandon à 24 h pile ; trace à −1 h affichée, à −13 h expirée ; snooze 1 h ; une partie jouée après la trace la rend caduque. |
| 3 | Un rattrapage existait (`lib/program/rattrapage.ts`, carte du Programme) mais : seulement sur le Programme, aucun mot sur les jours manqués, et **silencieux quand les tâches oubliées sont déjà dans le plan du jour** (c'est le cas du jour 6 du parcours : rien à ajouter, donc rien dit). | Branché sur l'existant : `glissement()` réutilise `rattrapageAProposer`, compte les jours **ouvrés** sans plan (le week-end off ne compte pas), et dit ce qui est déjà repris. Composant `RattrapageLine`, monté sur l'accueil **et** le Programme (remplace l'ancienne carte). [Rattraper] / [Laisser] ; si tout est déjà au plan : « … — déjà au plan d'aujourd'hui » + [Compris]. Aucune tâche n'est ajoutée sans clic. La reprise ne dit plus « de la veille » quand ce n'est pas la veille. Commits `0c6007a4`, `9bc18dd1`. | 6 tests lib + 4 tests UI ROUGES puis verts. Navigateur, horloge pilotée : jeu. 1er → lun. 5 : « 2 jours manqués : Obere GI-Blutung…, Ambulant… et 4 autres — déjà au plan d'aujourd'hui. » [Compris], retenu après rechargement, 7 tâches inchangées. Jeu. 1er → mer. 7 (mode « Cas complet ») : « 1 jour manqué : Depressive Episode, Akute Pyelonephritis et 1 autre ont glissé. » [Laisser] [Rattraper] ; clic : 4 → 7 tâches, ligne disparue. Boutons 44 px, 0 élément hors écran à 390 et 1280 px. |
| 4 | `TaskAnatomy` : titre `truncate`. Et `lg:col-span-2` sans `min-w-0` : retirer `truncate` faisait déborder la grille à 390 px (+71 px, mesuré). | Titre entier (retour à la ligne), ligne qui passe à la ligne sur mobile, colonnes de grille `min-w-0`. `TaskList` : une raison partagée par ≥ 3 lignes se dit une fois (« Même raison pour les 5 cas · … »). Titres des « points faibles » non coupés non plus. Commits `1b1c6633`. | Tests ROUGES puis verts (`TaskList.test.tsx`). DOM : `scrollWidth ≤ clientWidth` pour les 7 titres, `text-overflow` ≠ ellipsis, 390 px : 1 à 2 lignes, 1280 px : 1 ligne, `documentElement.scrollWidth ≤ innerWidth`. Captures : `…/scratchpad/c6b/home-390.png`, `home-1280.png`, `retour-*.png`, `rattraper-*.png`. |

### Invariants
- **Plan figé (INV-9/10)** : seule la génération change (`buildTasks`) et l'affichage. Un plan déjà matérialisé garde son texte (« 0 terme dû… » reste lisible dans un jour déjà figé). Les tests INV-9 de `dayPlan.test.ts` et `dayPlan.revue.test.ts` passent. Le rattrapage écrit toujours `plan.replanned` (raison `rattrapage`) et laisse intactes les tâches du jour.
- **Q4** : proposé, jamais imposé. Vérifié : aucun `db.day_plans` modifié sans clic (test et DOM).

## À trancher / à noter
1. **Tranché par `main` et livré** (`c1974694`) : sans terme DÛ, la tâche Fachbegriffe (nouveaux seuls) passe juste après la première partie ; avec des dus, elle reste en tête (y compris en mode examen à blanc : l'examen d'abord). Budget du drill toujours réservé, ids rejouables. Tests : `C6-B · rien de dû…` (rouges avant).
2. **Tranché par `main` et livré** (dernier commit) : « N nouveaux termes » suit `effectiveDaily().newPerDay` (auto ou manuel), lu à la matérialisation et passé par `BuildInput.newPerDay` ; repli 10 ; 0 = pas de tâche. Import paresseux de `drillContext` (cycle avec `@/lib/program`).
3. **Jours déjà figés** : le texte « 0 terme dû » / « dûs » reste dans les plans matérialisés avant ce commit (volontaire, INV-9). Les plans de Mehdi du jour en gardent la trace jusqu'à demain.
4. **Hors périmètre, non touché** (relevé) : `store/simSession.ts:81` (`startedAt: Date.now()`), `lib/externalAi/targets.ts:73` (`launchPlan(now = Date.now())`), `lib/sync/queue.ts` (horodatage d'événement), `lib/collections/drillQueue.ts` (`Date.now()` par défaut). Même dette, pas dans la liste ; `simSession` est le candidat le plus probable pour une incohérence d'horloge.
5. **À brancher après le merge de C6-A** (consigne de `main`, C6-A n'est pas dans `main` : `git merge-base --is-ancestor origin/feat/s3-c6a-chiffres origin/main` → non). Appels exacts, la signature C6-A étant `streakFromDays(workedDays, now = nowDate(), offDays = [])` :
   - `features/home/HomePage.tsx:44` : `streakFromDays(workedDayKeys(events), nowDate(), config?.offDays ?? [])` (`nowDate` est déjà importé).
   - `features/program/HistoriquePage.tsx:61` : idem avec la config du programme (`useProgramConfig`).
   - `lib/lauf/automat.ts:145` et `:175` : `feeling: 50` et `e?.feeling ?? 50` → sentinelle `NOT_ENTERED` (`-1`, `scoring.ts` de C6-A) ; retirer en même temps le contournement de `SimulationRunner` posé par C6-A.
   Non fait ici pour ne pas casser la compilation (`NOT_ENTERED` et le 3e argument n'existent pas sur cette base).
6. **Rattraper et jours off** : `glissement` ne compte que les jours ouvrés du programme ; un jour off travaillé a un plan, donc il n'est pas « manqué ». Le prochain jour figé peut venir avant un jour sans plan sans que la ligne le signale : par construction (« un jour jamais ouvert n'a pas de plan », contrat §3.2).

## Portes (par code de sortie)
| Porte | Résultat |
|---|---|
| `npx tsc -b --noEmit` | 0 |
| `npm run build` | 0 |
| `scripts/check*.mjs` (21 scripts, dont `checkUiTells`) | 0 pour les 21. `checkFixedOverlays` n'existe pas sur cette base (non commité dans le dépôt de `main`). |
| `npx vitest run --dir src --maxWorkers=2` | **1 re-jeu nécessaire** : machine très chargée (load 25–30 pendant le run, jusqu'à 128 ensuite). 1er passage : 25 échecs dans 11 fichiers, tous « Test timed out in 5000ms » (ou assertion de délai). Re-jeu de ces 11 fichiers seuls, `--testTimeout=30000` : 16 fichiers, 171 tests, code 0. Les fichiers que j'ai touchés passent aussi seuls, et en lot (`src/features/program src/lib/program` : 101 tests, 2 passages consécutifs verts). |
| `node scripts/e2e/programmeInvariants.mjs` | **Non obtenu : échec d'environnement.** Voir ci-dessous. |

## Non vérifié
- **`programmeInvariants.mjs`** : 4 essais, 0 vert. Causes constatées, dans l'ordre : (a) démarrage de son propre `vite` dev trop lent sous charge (`ARRANGEMENT — timeout`) ; (b) dans ce worktree, `node_modules` est un lien hors du dossier : le dev server refuse les polices (« outside of Vite serving allow list ») ; contourné avec une config hors dépôt (`fs.strict: false`) ; (c) Supabase local de `main` ne répond plus (`/functions/v1/content` 500, puis timeout à 30 s, `entitlements` idem) alors que la charge machine est à 128 : l'app reste sur « besoin d'une connexion pour le premier chargement », l'arrangement du script ne peut pas commencer. Je n'ai pas redémarré Supabase (consigne). **Cette porte reste à rejouer sur une machine calme** ; mes changements touchent le plan (`buildTasks`, texte du drill) donc elle compte. Les tests INV-9 vitest du même contrat passent.
- Le rattrapage avec **tâches d'un jour manqué ET partiellement faites** n'est vérifié qu'en jsdom, pas en navigateur.
- Mode sombre et lecteur d'écran sur la ligne de retour (`aria-live="polite"` posé, non écouté).
- La carte flottante de l'assistant masque le bas-droit à 390 px (déjà là avant ce lot).
