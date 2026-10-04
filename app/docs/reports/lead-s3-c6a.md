# Lot C6-A « des chiffres honnêtes » : rapport

Branche `feat/s3-c6a-chiffres` (base `origin/main` @ `faa53727`), 7 commits, rien de poussé en PR.
Les outils Skill et ctx_* n'étaient pas disponibles dans cette session : `dept-coordination` et `dept-experience` n'ont pas été invoqués. Je me suis appuyé sur `.claude/skills/dept-experience/SKILL.md`, lu à la main, et sur DIRECTION-STYLE.

**Statut : DONE_WITH_CONCERNS.** Les 6 points sont livrés et prouvés. Deux ne sont pas branchés de bout en bout, car le câblage touche des fichiers interdits par le lot (point 5 : la série ; point 3 : le défaut `?? 50` de `lib/lauf`). Voir « Reste à faire » ci-dessous.

## Point × cause × correction × preuve

| # | Cause racine | Correction (commit) | Preuve |
|---|---|---|---|
| 1 BUG-C6-1 | `ensureDemoData()` (`main.tsx`, `data/seed.ts`) semait 3 `sim-demo-*` chez tout visiteur anonyme. `useSimulations`, `estMesuree` (donc `axisScores`, `specialtyScores`, `progressSeries`) et `loadDrillContext` les lisaient comme les siennes. | `2e19daea`, `14129865`. Plus de seed (`demoSimulations`, `mkPart` et `ensureDemoData` supprimés). Migration Dexie v6 qui supprime les `sim-demo-*`. `isDemoSimulation` déplacé dans `db/db.ts` (réexporté par `migrateLocal`). Garde dans `estMesuree` (stats), dans `useSimulations` (écrans) et dans `loadDrillContext`. Courbe vide : « Ta première partie dessinera ta courbe. » ; Stats vide : même phrase. | Tests rouges puis verts : `stats.demo.test.ts` (axes, spécialités, courbe, migration) et `StatsPage.chiffres.test.tsx` (« 0 simulations complètes · 1 par partie »). Test C6 `it.fails` basculé en `it` : vert (`tests/invariants.journal.test.tsx -t BUG-C6-1`, 1 passed). Navigateur : une base IndexedDB v50 posée à la main avec 3 démos et 1 vraie séance passe en v60 et ne garde que `["vraie-1"]`. Premier lancement : `simulations: []` (avant : 3). Aucune démo dans `progress_events` : `migrateLocal` les écarte, et sur le Supabase local `select … like '%sim-demo-%'` renvoie 0 sur 587 (lecture seule ; la prod n'a pas été interrogée). |
| 2 Axe Fachbegriffe | Part de termes « Gelernt » sur TOUT le glossaire (2 000 cartes) : 4 cartes par jour ne la bougent pas, d'où « Point faible (0 %) » 14 soirs de suite. | `0ef0b139`. Rétention des cartes déjà vues (dernière révision réussie, `repetitions > 0` selon SM-2). Seuil nommé `FACHBEGRIFFE_MIN_VUES = 20`. En dessous, l'axe vaut `null` : jamais « point faible », et la barre dit « Fachbegriffe · 4/20 cartes vues ». | `stats.fachbegriffe.test.ts` (2 000 cartes neuves donnent `null`, 15 sur 20 retenues donnent 75 %, travailler change le chiffre). DOM rendu : 4 cartes vues, aucune alerte. Navigateur : « Fachbegriffe · 0/20 cartes vues », aucun « Point faible » sur cet axe. |
| 3 Score fantôme | `emptyLanguageGrid()` renvoyait 3/5 partout et le Ressenti démarrait à 50 : environ 25 points sur 100 n'étaient pas les siens. | `d810aba4`. `NOT_ENTERED = -1`, curseurs vides affichés « — » (composant `Curseur`). La langue ne compte qu'une fois les 5 critères notés. La pondération 55/30/15 (80/20 sans grille orale) est renormalisée sur ce qui est saisi. Le bilan dit « Calculé sur : contenu seul ». Les « Corrections prioritaires » (`Sprache`) et le « langue X % » du résultat ignorent les critères non notés. | `scoring.saisi.test.ts` (30 % de contenu donnent 30 %, plus 43 % ; tout saisi donne l'ancienne formule au point près sur tout le domaine ; un 0 saisi reste une note). `PartEvaluation.saisi.test.tsx` (DOM : « —/5 » ×5, score 30 %). Navigateur : 31 % de contenu donnent 31 % « contenu seul » ; avec le ressenti, 35 % « contenu et ressenti » ; les 5 critères notés donnent 37 % « contenu, langue et ressenti ». Une partie enregistrée sans toucher aux curseurs donne 27 % « contenu seul », stockée avec `feeling -1` et grille `-1`. Captures `bilan-*.png`. |
| 4 EXAM_CLAIM | `PartEvaluation.tsx` : « barème officiel · Ce que le jury note vraiment ». `SimulationRunner.tsx` : « (règle FSP) » ×2. | `da18bcc0`. « Grille Doctopus · langue », « Notre grille de travail, pas le barème du jury », « seuil Doctopus ». Commentaire de `scoring.ts` corrigé. | `PartEvaluation.examclaim.test.tsx`, `ResultScreen.test.tsx`. Navigateur : le texte rendu contient « Grille Doctopus · langue ». |
| 5 Série | `streakFromDays` ne connaissait pas le programme : le week-end, jours off du candidat, cassait la série. | `86d30cde`. 3e paramètre `offDays` (`[]` = comportement d'avant). Un jour off au repos est sauté, un jour off travaillé compte, un jour ouvré manqué casse toujours. Garde contre un programme où les 7 jours sont off. | `stats.streak.test.ts` : lundi après 5/5 jours ouvrés donne 5 (avant : 0). **Non branché dans l'app** (voir ci-dessous). |
| 6 Trajectoire | Le chiffre n'est pas relié aux scores et ne dit pas ce qu'il mesure. | `e9015c67`. Sous la frise de Stats : « Ce chiffre mesure la part de toutes les parties de tous les cas que tu maîtrises déjà — pas la moyenne de tes scores : une partie jamais jouée compte pour zéro. » | Test DOM (la phrase est le frère suivant de la frise, sans « couche » ni « budget »). Navigateur : phrase présente. |

## Vérification (par code de sortie)
- `npx tsc -b --noEmit` : 0.
- `npx vitest run --dir src --maxWorkers=2` : 0, 138 fichiers et 1 222 tests verts. Charge machine d'environ 25 à 30, sous le seuil de 40 : suite complète lancée. Sous cette charge, quelques tests du dossier `features/simulation` dépassent leurs 5 s au premier passage (ExternalAiSheet, PartEvaluation) ; ils passent seuls et dans la suite complète.
- `npm run build` : 0 (log `build2.log`, même arbre que HEAD, hors ce rapport).
- Tous les `app/scripts/check*.mjs` de la CI : exit 0 (`checkUiTells` compris, `checkBudgetFloor` contre `merge-base` avec `origin/main`). `checkFixedOverlays.mjs` n'existe pas dans cette base (non suivi dans l'arbre de `main`).
- Navigateur : `playwright-cli` headless sur `vite preview` du build de ce worktree (port 5921), Supabase local en lecture. Captures dans `/private/tmp/claude-501/-Users-MehdiBoukari-Downloads-FSP-VB-Claude-FSP/fab928bf-94b4-4f3f-b28b-69e62e6e776f/scratchpad/c6a/` : `bilan-contenu-seul.png`, `bilan-saisi.png`, `bilan-vide.png`, `stats-vide.png`, `stats-apres-2-parties.png`. Sur `stats-apres-2-parties.png` : « 0 simulations complètes · 2 par partie », courbe à 2 points, axes non mesurés dits « pas encore mesuré ».
- Tests C6 de `origin/feat/s3-c6-candidat` rejoués contre cette branche (`app/tests`, copiés puis retirés) : `invariants.journal` (BUG-C6-1 en `it`), `invariants.lauf`, `invariants.ia-externe` et `invariants.programme` verts. **`parcours14j` non concluant** : il a atteint son plafond de 300 s sous charge, sans assertion en échec. À rejouer sur machine calme.

## Reste à faire (hors périmètre de ce lot)
1. **Série (point 5), câblage à faire par C6-B.**
   - `HomePage.tsx:43` : `streakFromDays(workedDayKeys(events))` devient `streakFromDays(workedDayKeys(events), undefined, config?.offDays)`. `config` y existe déjà (`useProgramConfig`, ligne 33).
   - `HistoriquePage.tsx:61` : même appel. Il faut y lire `config` (le hook est dans `@/hooks/useData`).
   - Tant que ce n'est pas fait, la tuile corail retombe encore à 0 le lundi.
2. **`lib/lauf/automat.ts` retombe sur 50.**
   - Lignes 144 et 174 : `feeling: e?.feeling ?? 50`. Ligne 168 : `emptyLanguageGrid()`, déjà vide maintenant.
   - Contournement dans `SimulationRunner.tsx` : à l'ouverture du bilan, un brouillon vide est posé (`effet sansBrouillon`).
   - Quand C6-B aura remplacé `?? 50` par `NOT_ENTERED`, supprimer cet effet.
3. **Contrat à amender (`docs/contracts/simulation-run.md:63-66`).**
   - `feeling` et chaque critère de `languageGrid` valent `-1` quand ils ne sont pas saisis.
   - Les parties enregistrées avant ce lot portent de vraies valeurs (3 et 50, indiscernables de vraies saisies). Elles ne sont ni recalculées ni distinguées. C'est une conséquence de « ne pas recalculer en silence ». Le serveur ne valide pas ces champs (`grep` sur `supabase/` et sur les contrats).
4. **Après le merge de C6 dans `main`**, autorisé par `main` : `git merge origin/main`, passer `it.fails` en `it` dans `invariants.journal.test.tsx`, retirer `CONNUS.D5s` et la vérification D5r de `parcours-candidat.mjs:193-196`. La garde dans `estMesuree` et dans `useSimulations` couvre ce test, qui insère lui-même ses démos : confirmé par la bascule faite ici.

## À trancher par la direction
- **Verdict « Bestanden » sur le contenu seul.** Une partie dont le contenu coché dépasse 60 % et dont la langue n'est pas notée est maintenant « réussie » (`simulationPassed`). Faut-il exiger la langue notée pour le verdict, ou le laisser tel quel ?
- **Fachwissen.** Étendu au même principe sans que le lot le demande : part de cas solides parmi les cas déjà travaillés, minimum `FACHWISSEN_MIN_TENTES = 5`. Sans cela, la bannière « Point faible » aurait simplement désigné Fachwissen (0 %) à la place de Fachbegriffe. À révoquer si ce n'est pas voulu.
- **Fachbegriffe.** Le seuil 20 et la définition « dernière révision réussie » sont des choix d'implémentation. Le modèle SM-2 ne garde pas l'historique des notes : `repetitions > 0` est le seul indicateur de réussite de la dernière révision.
- **Contenu seul.** Libellé honnête de la base du score : « Calculé sur : contenu seul ». Si seuls le contenu et le ressenti sont saisis, le ressenti compte (renormalisé). Alternative possible : ignorer le ressenti tant que la langue n'est pas notée.
- **Jargon restant** (`Assisté · Couche 1` dans l'en-tête de la simulation, « budget » côté programme et accueil). La phrase du point 6 n'est ajoutée que sous la frise de Stats, car `TrajectoryStrip` est dans `features/program`. L'accueil affiche toujours la frise sans la phrase.
- **Autres occurrences de la famille EXAM_CLAIM.**
  - Hors périmètre : `apps/site/src/components/Hero.astro:21` (« Ce que le jury d'examen fait de son côté… »), à relire par `direction-keeper`.
  - Dans le périmètre, non modifiées : `SimulationSetup.tsx:119` (« tournures officielles »), `db/types.ts:452` (commentaire « officielle-like »), et le nom historique du champ `officialPct`.

## Non vérifié
- La prod n'a pas été interrogée (aucune démo dans `progress_events` vérifié seulement sur le Supabase local et par lecture du code de migration).
- Mobile 375 px : le bilan et le nouveau composant `Curseur` n'ont été vus qu'à 1 280 px.
- Les curseurs vides sont atténués (opacité) mais gardent une poignée au milieu : aucun avis du `direction-keeper` sur leur rendu (voir `bilan-contenu-seul.png`).

## Passe fixeur (revue Opus + décisions de `main` et de la direction)
Cette passe remplace les points suivants du rapport ci-dessus, devenus obsolètes : le contournement `sansBrouillon` (reste à faire n°2), la définition de Fachwissen et la question du verdict sans langue.

| Item | Correction | Commit / preuve |
|---|---|---|
| I1 Fachwissen par absence | Part des Teile joués qui sont acquis ou solides ; `FACHWISSEN_MIN_TENTES = 5` Teile joués, sinon `null`. | Test « 5 cas, Anamnese seule à 90 % ⇒ pas un point faible » rouge sur l'ancienne mesure, vert ensuite (`stats.fachbegriffe.test.ts`). |
| m2 radar | `radarData()` écarte les axes `null` ; sous 3 axes mesurés, une phrase remplace le polygone. | `stats.radar.test.ts` + test DOM `StatsPage.chiffres`. |
| m4 | Balayage du contenu par pas de 5, délai explicite 20 s. | `scoring.saisi.test.ts` : 11 tests verts. |
| m5 | `isDemoSimulation` dans `lib/demoSimulation.ts` (sans dépendance) ; `db.ts` et `readiness.ts` l'importent. | tsc 0. |
| m7 | Commentaire + test : la série relit le passé avec les jours off actuels. | `stats.streak.test.ts`. |
| Verdict (direction, 4 oct.) | Sans langue notée : « Réussi sur le contenu » (langue non notée). Langue notée : « Au-dessus du seuil Doctopus ». « Bestanden-Simulation ! » supprimé. | `ResultScreen.test.tsx` (3 tests, rouge puis vert). |
| Brouillon à la racine | `automat.ts` : `NOT_ENTERED` dans `setzeEntwurf` et `bewerte` ; contournement de `SimulationRunner` supprimé. | `automat.test.ts` : scénario « indice consulté pendant l'Anamnese, ressenti non touché ⇒ contenu seul » rouge (50) puis vert. |

Vérification de cette passe : `tsc -b --noEmit` 0 ; tests touchés verts, lancés seuls (charge machine 20 à 35 : la suite complète n'a pas été relancée, et sous charge des tests de `features/simulation` dépassent leur délai de 5 s, ils passent seuls avec un délai plus long).
