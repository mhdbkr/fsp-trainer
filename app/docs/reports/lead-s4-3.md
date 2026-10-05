# S4-3 — la partie, le cas entier · rapport du lead

**Statut (fixeur, voir §8) : DONE_WITH_CONCERNS.** Les deux revues de `141c78b5` (mécanique « Needs fixes », direction « à corriger ») sont traitées selon les décisions de `main` ; les points restants sont listés en §8.4. Les §1–§7 ci-dessous décrivent la livraison initiale ; ce que le fixeur a changé ou tranché est en §8.
Branche `feat/s4-3-partie`, worktree `doctopus-s4-3-partie`, base `b64ed948` (#77 sur #76). `git merge-tree` contre `origin/main` (`0e846533`, revérifié après la dernière passe) : sans conflit.
Rien n'a été déployé. Aucun serveur Supabase n'a été démarré, aucune prod touchée. `D_UN_TRAIT_ACTIF` reste à `false` (`lib/program/parametres.ts:24`, non modifié).

Sources : `simulation-run.md` §10 (10.1–10.7, §7.1 INV-70 à INV-75), ADR-0021 décisions 1–9, `training-journal.md` §2.3, §12.1, §12.11, §12.12, §13.3, la proposition `2026-10-04-cas-entier-cadran.html`.

## 1. Livré, point par point

| # | Demande | Fait | Où |
|---|---|---|---|
| 1 | Entrée unique (INV-70) | `erstelleLauf` planifie toujours les trois Teile en `komplett` ; `useLauf` ne passe plus de périmètre ; `?depart=` (l'ancien `?teil=` lu de même, `departDe`) ne choisit que le Teil de `demarrer`, lu une fois, hors des dépendances de l'effet (§10.3). La reprise exige le même **cas** (§3.1 S4). `ModeChooser` et la carte retournable de `SimulationHub` retirés (`components/ModeChooser.tsx` supprimé). | `lib/lauf/automat.ts`, `features/simulation/useLauf.ts`, `SimulationHub.tsx` |
| 2 | « Terminer ici » (INV-71) | `versChecklist` permis à chaque bilan, quel que soit le reste (déjà vrai dans l'automate ; désormais gardé par test et mutation). `parts` = `teileGespielt`. Les deux sorties du bilan : « Continuer — X → » (dans le bilan) et « Terminer ici → » (en-tête, une seule fois, règle 8). | `Abschluss.tsx`, `SimulationRunner.tsx` |
| 3 | Départ sur un autre Teil (INV-72) | `springeZu(t)`, exception nommée nº 4 ; `partieSuivante(t')` avec ses gardes (Teil non joué ; après une Aufklärung, le Teil interrompu d'abord). `wegZu(lauf, t)` : une pastille du fil d'étapes est un bouton ssi l'automate a une transition vers ce Teil (« Commencer par la … » en partie, « Continuer par la … » au bilan). | `lib/lauf/automat.ts`, `SimulationRunner.tsx` |
| 4 | Marqueur d'enchaînement (§10.4) | `enchainiert`, `nimmWiederAuf` (point d'entrée unique, appelé par la seule branche de reprise de `useLauf`), `REPRISE_TOLERANZ_MIN = 5`, `zuletztAktiv` posé à chaque persistance. Projection : `date = startedAt`, `reihenfolge`, `dauerGesamtSec` (Teil quitté et Aufklärung compris), `enchaine` seulement s'il est vrai. La dérivation `examen` / `examenManque` / `kind` du journal (S4-1) est prouvée de bout en bout (A → D → F Autonome, grilles saisies ⇒ `examen: true`, `kind: 'examen-blanc'` ; D → A → F ⇒ `examenManque: ['ordre']`). | `lib/lauf/{automat,speichern,types}.ts`, `lib/simulationSave.ts` |
| 5 | Pré-simulation réordonnée | cas + `CaseDial` 96 + `CaseDialDetail` (détail ouvert) + « Démarrer » → « Avec qui tu joues » → niveau d'assistance → Muster → (le médecin) → échauffement. | `PreSimulationPage.tsx`, `SimulationSetup.tsx` |
| 6 | Muster guidé ou libre (§10.6, INV-74) | Deux specs `guide` / `libre` ; `musterArt()` total ; feuilles de ville en lecture seule (`MUSTER_BOGEN_LEGACY`) ; `BogenPreview` rend **toute** note non vide ; `AnamneseBogen` garde éditables les clés hors du Muster (« Autres notes ») ; `ImmersiveMode` se replie sur `hauptbeschwerde` / `freitext` ; `store/ui` lit la ville par `musterArt` et ne la réécrit qu'au premier `setMuster` ; sélecteur à deux choix. `musterModels.ts` et `MusterModelPicker.tsx` supprimés. | `data/guides/musterBogen.ts`, `components/BogenPreview.tsx`, `store/ui.ts`, `features/simulation/*` |
| 7 | Retirer « Couche » | Plus de bloc ni de mot « Couche » en pré-simulation ; la couche conseillée (`layerAdvice`) est écrite en silence dans `Lauf.layer`, et le niveau d'assistance conseillé est présélectionné (badge « Conseillé »). Retiré aussi de la puce d'en-tête du runner (« Assisté · Couche 1 », relevé par C6-A). | `SimulationSetup.tsx`, `SimulationRunner.tsx` |
| 8 | « tournures officielles » (`SimulationSetup.tsx:119`) | → « les formulations types sont proposées ». Test EXAM_CLAIM sur la pré-simulation. | `SimulationSetup.tsx` |
| 9 | `CaseDial` pré-simulation et fin | Pré-simulation : 96, `action={false}`. Fin (`ResultScreen`) : 160, `vientDEtreJoue` par `dialData(cp, { lauf })`, `vientDeSouder` = `etat === 'pret' ∧ pretAt ≥ sim.date`. Un Teil n'est plus annoncé comme résultat isolé (« Cette partie… compte pour un tiers… » retiré). Sortie « bilan » des erreurs transversales : `bilanErreurs` (pur) consomme `erreursTransversales` et `libelleItem` de S4-2 — signal du journal **antérieur** à la partie (ordre `(at, id)`), « cochée cette fois » / « encore manquée (n/sur) ». | `SimulationRunner.tsx`, `bilanErreurs.ts` |
| 10 | Annonce unique (§10.7) | **Déjà faite par S4-1** (`lib/annonceS4.ts`, `features/home/AnnonceS4.tsx`, sujet `muster`). Non dupliquée. Sa garde `ANNONCE_MUSTER_ACTIVE` est restée à `false` : voir §3, point A. | — |
| 11 | `D_UN_TRAIT_ACTIF` | Reste `false`. | — |
| — | Lancement depuis une tâche (§12.1, m8) | `taskLink` : `?depart=<premier Teil de ce qui reste>&task=<id>` remplace le `?teil=` transitoire de S4-2 (I1) ; les tâches `revision` passent aussi par la pré-simulation (elles menaient à `/cas/:id`). Diff de 4 lignes. | `features/program/TaskLine.tsx` |

## 2. Hypothèses (surfacées, appliquées)

- **H1 — Couche « déduite de ce choix ».** La couche écrite est celle de `layerAdvice` (`advice.layer`), pas une fonction du niveau choisi. Le niveau est présélectionné par `advice.suggestAutonome` **à chaque ouverture de la pré-simulation d'un cas** : un candidat qui avait choisi Autonome retrouve le conseil. Les textes de `layerAdvice.reason` contiennent « couche N » : ils ne sont plus affichés ; restent « N passages · meilleur X % » et le badge « Conseillé ». `lib/layerAdvice.ts` n'est pas à moi.
- **H2 — Textes d'aide et `PartnerCard`** lisent le départ, ou l'Anamnese (§10.1, à la lettre). Le texte du simulant dit toujours « le patient puis le médecin examinateur » : la partie porte les trois Teile. L'IA reste masquée quand on part de la Dokumentation (comportement série 3, gardé à la lettre de §10.1), bien que la partie contienne ensuite l'Anamnese et la Fallvorstellung.
- **H3 — Guidé = Standard + `medikamente`**, dans l'ordre du Standard, `vorerkrankungen` relibellé « Vorerkrankungen · Voroperationen » (les médicaments ont leur rubrique). Libre = `personalia` + `freitext` (14 lignes). « La liste exacte est un contenu, au pôle Expérience » : à relire par lui.
- **H4 — `?teil=` des liens existants** (accueil « Points faibles », `CoverageField`, `CaseDialText.lienAction`, `ResumeSessionBar`) n'a pas été réécrit : il est lu comme `?depart=` (§10.3), ce qui suffit. Ces fichiers ne sont pas à moi.
- **H5 — Fichiers de test** : `automat.s4.test.ts`, `speichern.s4.test.ts` (au lieu d'étendre deux fichiers de plus de 400 lignes), `lib/lauf/enchaine.test.tsx` (par le hook), et les invariants dans `app/tests/` (`invariants.partie.test.tsx`, `invariants.muster.test.tsx`) parce que le harnais de mutation ne rejoue que ce dossier. §8 du contrat nomme `lib/muster.legacy.test.ts` : `musterArt` vit dans `data/guides/musterBogen.ts`, son test dans `tests/`.

## 3. À trancher par `main`

- **A. `ANNONCE_MUSTER_ACTIVE` (`lib/program/parametres.ts:56`) est encore `false`.** Le Muster de ville devient « libre » dès le déploiement de S4-3 ; sans la garde, l'annonce ne le dit à personne. Le fichier est au périmètre de S4-2 (`lib/program`) et son commentaire dit « dans le commit qui les déploie, comme `D_UN_TRAIT_ACTIF` » : je ne l'ai pas touché. **Proposition** : la passer à `true` dans le commit de déploiement de S4-3, avec `D_UN_TRAIT_ACTIF`. L'annonce lit `localStorage['fsp-muster']` brut ; `store/ui` ne le réécrit qu'au premier choix, donc elle reste montrable tant que le candidat n'a pas rechoisi.
- **B. Fichiers hors du périmètre §12.12 touchés**, tous nommés par la table du §10.6 que le brief demande d'appliquer (item 6), ou par un test existant qui exprimait l'ancien périmètre :
  `data/guides/musterBogen.ts` (et `musterModels.ts` supprimé), `components/BogenPreview.tsx`, `components/MusterModelPicker.tsx` (supprimé), `components/ModeChooser.tsx` (supprimé, plus aucun appelant), `store/ui.ts` (type `MusterArt`, lecture `musterArt`), `features/program/TaskLine.tsx` (`taskLink` : `?depart=`, `revision` comprise — le lancement transitoire de S4-2, autorisé par le brief ; oubli relevé par la revue, M8), `features/home/HomePage.test.tsx` (une assertion : `teil=` → `depart=`, conséquence de `taskLink`), `app/tests/*` et `app/scripts/parcours-mutations.mjs` (harnais, demandé), `app/scripts/parcours-actes.mjs` et `scripts/e2e/programmeInvariants.mjs` (libellés « Démarrer » / « Continuer — » / « Terminer ici » du candidat navigateur). `db/types.ts` n'a pas été touché.
- **C. `CaseDial` n'a pas de mode « détail ouvert, statique ».** En pré-simulation, le cadran 96 est monté avec `CaseDialDetail` à côté (consigne de S4-4) ; survoler le cadran ouvre en plus son détail flottant — le même texte deux fois pendant le survol. **Proposition à S4-4** : une prop qui désactive l'ouverture. Je n'ai rien écrit dans `CaseDial` (INV-59).
- **D. La séance IA externe et `Simulation.date = début`.** Voir §4, point 1 : corrigé dans mon périmètre, mais la garde compare désormais `trace.at` (`lib/clock`) à `progress_events.occurred_at` (`queue.ts:18`, `Date.now()`). En production c'est la même horloge ; sous une horloge injectée sans `Date` simulé, elles divergent (le principe « une horloge » de C6-B). **Proposition** : que `stamp()` de `lib/sync/queue.ts` lise `lib/clock` (hors périmètre, sync).

## 4. Contradictions et silences du contrat — non tranchés en silence

1. **`date = startedAt` (m5, INV-75) casse une garde que le contrat n'inventorie pas.** `PendingExternalSimCard` taisait la carte « tu as simulé… » si une partie du cas couvrant le Teil avait `date ≥ trace.at` : « enregistrée après le lancement ». Avec `date` = début, une partie commencée avant d'ouvrir le lanceur IA et finie dans l'app redemandait son évaluation. **Trouvé par C6** (`invariants.ia-externe`, graine 1), corrigé (`6b202f8d`) : la garde lit aussi l'instant d'enregistrement, celui de l'événement `simulation.completed`. Mutations FB3 suivies, une nouvelle (`FB3-debut-S4`). Les autres lecteurs de `Simulation.date` (`stats.ts`, `relevance.ts`, `layerAdvice`, journal) la prennent comme un jour ou un ordre : le début est ce que veut m5.
2. **INV-23 « `serialize ∘ deserialize` est l'identité stricte » contre §3.1 « `speichereAktivenLauf` met à jour `zuletztAktiv` à chaque persistance ».** Un Lauf écrit puis relu porte un `zuletztAktiv` qu'il n'avait pas. Appliqué : la marque est posée à l'écriture, et INV-23 se lit **modulo `zuletztAktiv`** (en plus de `unterbrochen`, que la lecture ne pose pas). Tests réécrits en le citant (`speichern.test.ts:191`, `parcours14j.test.ts`).
3. **INV-71 et l'Aufklärung seule.** « Permis dès qu'un `SimTeil` est joué » dit une condition suffisante. L'automate (inchangé) permet aussi `versChecklist` depuis `bilanz('aufklaerung')` quand seule l'Aufklärung est jouée : l'enregistrement donne une `Simulation` à `parts = { aufklaerung }` et `reihenfolge = []`, donc « série 4 » sans aucun Teil, alors que l'abandon (`gibAuf`) ne l'écrit pas. À trancher : refuser `versChecklist` sans `SimTeil` joué, ou l'accepter.
4. **L'Aufklärung hors du runner et l'interruption.** La zone Aufklärung du runner mène à `/aufklaerung?open=…` : on QUITTE le runner. Une Aufklärung consultée 5 minutes ou plus marque la partie `unterbrochen` (définition §3.1 : reprise après une pause ≥ 5 min), alors que §10.4 dit qu'une Aufklärung intercalée n'interrompt pas l'enchaînement. Pas corrigé : la page Aufklärung n'est pas à moi, et la tolérance est une décision de contrat.
5. **§10.1 « textes d'aide lisent le départ »** alors que la partie est entière : voir H2 (IA masquée en départ Dokumentation).
6. **`ImmersiveMode` et `noxen` en guidé.** En guidé, `noxen` est un champ à deux sous-cases (`noxen.rauchen`, `noxen.drogen`) ; le mode focus écrit la clé nue `noxen` (comportement série 3 avec le Standard). Cette note n'avait pas de case dans le Bogen ; elle apparaît maintenant dans « Autres notes » de l'`AnamneseBogen` (et dans l'aperçu). Plus de note invisible, mais une rubrique en double possible : contenu à revoir par Expérience (`bogenKeys.ts`).

## 5. Tests — rouge, vert, mutation

| Invariant | Rouge (avant le code) | Vert | Mutation tuée (`parcours-mutations.mjs`) |
|---|---|---|---|
| INV-70 | `automat.s4.test.ts` (16/16 rouges), `useLauf.test.tsx` (4 rouges), `PreSimulationPage.test.tsx`, `SimulationRunner.partie.test.tsx` | `b9999ba0`, `6b202f8d`, `7e2cf3a5` | `INV-70` : `useLauf` relit le départ comme périmètre |
| INV-71 | idem | idem | `INV-71` : `versChecklist` refusé tant que `naechsterTeil !== null` |
| INV-72 | idem, `speichern.s4.test.ts` (6 rouges) | `b9999ba0`, `0cbc0353` | `INV-72a` Teil joué deux fois · `72b` Teil interrompu sauté · `72c` `springeZu` après un Teil · `72d` pendant une Aufklärung · `72e` `dauerGesamtSec` sans le Teil quitté |
| INV-73 | `automat.s4.test.ts`, `speichern.s4.test.ts` | `b9999ba0`, `6b202f8d` | `73a` `enchaine = istVollstaendig` · `73b` `unterbrochen` à toute reprise · `73c` reprise sans `nimmWiederAuf` · `73d` marque remise à `undefined` |
| INV-74 | **écrit après** le nouveau `BogenPreview` (honnêteté) ; la mutation remet l'ancien comportement | `22d284a1` | `INV-74` aperçu limité au Muster courant · `INV-74-total` ville relue « guidé » |
| INV-75 (écriture) | `speichern.s4.test.ts` (23 h 50 → 0 h 20) | `0cbc0353` | `INV-75-ecriture` : `date = now()` |
| FB3 (garde IA) | C6 `invariants.ia-externe` rouge après `0cbc0353` | `6b202f8d` | `FB3-3oct`, `FB3-teil`, `FB3-temoin` (réécrites), `FB3-debut-S4` (nouvelle) |
| INV-20b (série 3, revisitée) | la passe complète du harnais l'a trouvée **survivante** : ma garde de `partieSuivante(t')` refusait en silence un `naechsterTeil` faux (candidat bloqué au bilan) | `2a52fb8b` : propriété de vivacité dans C6 (« Continuer » mène au Teil interrompu, sinon au premier planifié non joué) ; elle a trouvé une régression (un Teil interrompu non planifié — Lauf série 3 — n'était plus repris, règle 7), rétablie | `INV-20b` tuée |
| `bilanErreurs` | **écrit après** le module ; mutation manuelle « lit le journal postérieur » d'abord **survivante**, test renforcé (`6b97bd06`), puis tuée ; « cochée inversée » tuée | `7e2cf3a5` | (src : hors harnais) |

C6 réécrit en citant le contrat : 500 suites aléatoires avec `springeZu` et `partieSuivante(t')`, INV-71 vérifié à chaque bilan, « aucun Teil joué deux fois » ; `parcours14j` joue comme le client (départ, `partieSuivante(t')`, « Terminer ici ») ; INV-21 « Teil seul » = trois planifiés, un joué. Tests réécrits sur l'ancien périmètre, chacun commenté par sa décision : `useLauf.test.tsx` (reprise par cas), `PartnerCard.test.tsx` (`?depart=`), `Abschluss.test.tsx` (« Terminer ici »), `TaskLink.test.ts`, `HomePage.test.tsx`, `automat.test.ts` (table de transitions + `springeZu`).

## 6. Vérification par code de sortie (code au sommet `2a52fb8b`)

| Commande | Sortie |
|---|---|
| `tsc -b` | 0 |
| `vitest run --dir src --maxWorkers=2` | 0 — 172 fichiers, 1 694 tests |
| `npm run test:c6 -- --maxWorkers=2` | 0 — 12 fichiers, 134 tests |
| `npm run build` | 0 |
| `scripts/check*.mjs` (22 validateurs) | 0 partout, sauf `checkProbeOverlap` = 1 (informatif ; il ne lit que `anamneseProbes.ts`, non touché) |
| `node scripts/parcours-mutations.mjs` (complet) | 0 — baseline vert, 126/126 mutations tuées (dont 15 nouvelles de S4-3 et 3 FB3 réécrites). Une première passe complète (sur `ff903c2c`) avait laissé survivre `INV-20b` : corrigé en `2a52fb8b` |
| `git merge-tree --write-tree origin/main HEAD` | 0, aucun conflit |

## 7. Commits

| Sha | Objet |
|---|---|
| `b9999ba0` | automate : entrée unique, `springeZu`, `partieSuivante(t')`, `enchainiert`, `nimmWiederAuf` |
| `0cbc0353` | écriture : `date`, `reihenfolge`, `dauerGesamtSec`, `enchaine`, `zuletztAktiv` |
| `6b202f8d` | hook : entrée unique, reprise par cas, `wegZu` ; garde IA externe ; C6 |
| `22d284a1` | Muster guidé / libre, INV-74 |
| `7e2cf3a5` | pré-simulation, fil d'étapes, « Terminer ici », écran de fin |
| `f5ca4efc` | programme : `?depart=`, `revision` comprise |
| `3f5eca15` | mutations INV-70 à INV-75, INV-74, FB3 |
| `6b97bd06` | étapes masquées non cliquables ; test de `bilanErreurs` renforcé |
| `ff903c2c` | candidat navigateur : nouveaux libellés |
| `2a52fb8b` | « Continuer » jamais refusé en silence ; Teil interrompu toujours repris (INV-20b) |

`b9999ba0` seul ne compile pas (`Lauf.muster` élargi avant les composants, qui suivent dans `22d284a1`). Chaque vérification ci-dessus porte sur le sommet.

## 8. Fixeur — revues de `141c78b5` (décisions de `main`, 5 oct.)

Sources : revue mécanique (Needs fixes) et revue direction et design (à corriger). Chaque point : test rouge d'abord, puis vert ; toute logique a sa mutation tuée (harnais pour `app/tests/`, mutations manuelles notées pour `src/`).

### 8.1 Direction

| Point | Fait | Preuve |
|---|---|---|
| **B1** Muster guidé raisonné | `specFuerFall` (`AnamneseBogen.tsx`) : Frauenanamnese masquée si `geschlecht !== 'w'`, visible si une note y est (INV-74) ; aide de Hauptbeschwerde = mots-clés de la variante `aktuell` du cas (`aktuellChapterFor(leitsymptomOf(c))`), repli `Seit wann · Verlauf · Begleitbeschwerden` ; Noxen `rauchen / alkohol / drogen`. Le mode focus lit le même Bogen. | `AnamneseBogen.test.tsx` : COPD sans Frauenanamnese ni Ausstrahlung (« Luftnot »…), Leberzirrhose avec Alkohol, patiente avec Frauenanamnese, note `frauen` d'un homme à sa place. Mutations manuelles tuées : filtre, note gardée (survivante d'abord, test renforcé), aide. |
| **B2** phrase accordée | `vorstellungsSatz(c)` : « Herr Aupperle ist ein 58-jähriger Patient, der sich mit … vorgestellt hat. » | Tests homme et femme ; mutation « genre ignoré » tuée. |
| **B3** | `ANNONCE_MUSTER_ACTIVE = true` dans cette branche ; `D_UN_TRAIT_ACTIF` reste `false`. | `annonceS4.test.ts` : gardes par défaut ⇒ `mode` et `muster` ; garde fermée ⇒ rien sur le Muster. |
| **I1** cadran ×2 | `CaseDial ouvrable={false}` (exception accordée) : `role="img"`, ni handlers ni `DetailFlottant`. | `CaseDial.test.tsx` (survol, appui long, clavier : aucun détail) ; `PreSimulationPage.test.tsx` (aucun `.case-dial-detail` au survol). Mutation tuée. |
| **I2** niveau | `niveau.ts` : la tâche qui prescrit l'emporte (raison dite) ; sinon conseil + l'une des 5 phrases ; 0 passage : dernier choix, sans badge. M7 : `couchePour` — couche de la tâche, sinon Assisté ⇒ 1, Autonome ⇒ max(2, conseil). | `niveau.test.ts` (chaque branche, aucune phrase avec « couche ») ; `PreSimulationPage.test.tsx` (0 passage, essai raté + couche suivant le clic, examen à blanc). Mutations tâche, 0 passage, couche tuées. |
| **I3** | `aide = depart ?? 'komplett'`, les 4 textes de la revue. | Test RTL. |
| **I4** | « Finir l'Anamnese ✓ », « Score de l'Anamnese », « Chaque épreuve jouée atteint 60 % (seuil Doctopus). » / « Au moins une épreuve est sous 60 % : reprends-la. » | Tests runner, `PartEvaluation.saisi`, `ResultScreen` réécrits. |
| **I5** | `ARTICLE` exporté de `CaseDialText.ts` (avec `aufklaerung`), seule table ; `TaskLine` l'emploie. « Commencer par l'Anamnese ». | Test runner (la faute n'est plus figée). |
| **I6** | `NotizFeld` (mode focus) : un champ `split` écrit dans ses sous-clés. | Test : une note Alkohol → `noxen.alkohol`, une seule rubrique Noxen. Mutation tuée. |
| **I7** | « Terminer ici » en `btn-outline` tant que `partieSuivante` est permis. | Test runner ; mutation tuée. |
| **I8** | « Couche N » retiré de `TaskLine` et `TaskLabel` (exception accordée). | `TaskLabel.test.tsx` réécrit, test `TaskAnatomy`. |
| **I9 / M1** | L'IA toujours proposée ; texte de la revue. | `PartnerCard.test.tsx` réécrit ; mutation tuée. |
| **I10** | « Ta langue n'est pas notée : le verdict complet viendra quand tu auras rempli la grille de langue. » | `ResultScreen.test.tsx`. |
| **I11 / M6** | `springeZu` refusé dès que le chrono du départ a tourné ; le chrono du Teil de DÉPART attend « Lancer le chrono » (sinon il démarrait seul et la pastille n'aurait vécu qu'une seconde — voir 8.4) ; au bilan, `wegZu` ne propose pas le Teil de « Continuer — X ». §10.2 amendé. | Tests automate, runner, C6 (propriétés I11 et M6 dans les 500 suites) ; mutations `fixeur-I11`, `fixeur-M6` tuées. |
| Mineurs | `aria-pressed` sur `ModeCard` ; « Lancer le chrono » ; pas de pastille « frei » ; « Tu joues les deux rôles. » ; partenaire mémorisé (`localStorage['fsp-partenaire']`) ; « 60 % » ; « Aucune note d'anamnèse pour l'instant. » ; Assistance dans une `card` comme Partenaire et Muster ; l'aperçu animé des Muster n'est pas restauré. | Tests RTL (partenaire, rôles, aria-pressed). |

### 8.2 Mécanique

| Point | Fait | Preuve |
|---|---|---|
| **I1** Aufklärung | Liens de la zone Aufklärung en `target="_blank" rel="noreferrer"` : le runner reste monté. Le `SidePanel` n'a pas été retenu : la fiche (`AufkCard`) n'est pas exportée de `features/aufklaerung` (hors périmètre), et la recopier dupliquerait la trame. | Test runner (liens) ; C6 : Aufklärung de 6 min runner monté ⇒ `enchaine`. Mutation « sans `_blank` » tuée. |
| **I2** flake | `speichereAktivenLauf` date à l'appel ; `persiste()` attend le dernier état (`enchaine.test.tsx`, `invariants.partie`). `horloge.test.tsx` : le flake vient de « Copier » cliqué encore désactivé (`TeilAiLauncher.tsx:185`, `disabled={!text}`) ; correction triviale : attendre qu'il soit actif. Non reproduit en 5 passes isolées avant correction. | `enchaine.test.tsx` vert 3/3. |
| **I3** | = B3. | |
| **I4** | `versChecklist` refusé sans `SimTeil` joué. | Test automate ; C6 `invariants.lauf` ajusté ; mutation `fixeur-I4` tuée. |
| **M2** | `vientDeSouder` : `pretAt === sim.date` (`bilanErreurs.ts`). | Test ; mutation tuée. |
| **M3** | `nimmWiederAuf` ne marque rien s'il ne reste aucun Teil ; §3.1 amendé. | Test automate et C6 (pause de 20 min au bilan final) ; mutation `fixeur-M3` tuée. |
| **M4** | Noté, pas de code (consigne) : un Lauf série 3 complet abandonné sans reprise (`gibAuf` par l'âge ou par changement de cas) peut être écrit `enchaine: true`, car `nimmWiederAuf` n'est jamais appelé sur ce chemin. Décision de contrat requise (INV-73 interdit un second chemin qui pose `unterbrochen`). | — |
| **M5** | `TrainingEvent.enregistreA` (`occurred_at` de `simulation.completed`, relu par `applySimulationToJournal` au même événement que la reconstruction) ; `completion.ts` compte une partie enregistrée dans la tâche après `creeA` ; `deriverPlan`, `evenementsDuPlan`, `applyEventToLocalState` et `fait_avancer` suivent. `training-journal.md` §1.1, §12.3 amendés ; l'oracle d'INV-51 aussi. | `tests/invariants.reprise-lendemain.test.ts` (rouge d'abord) ; mutations `fixeur-M5-*` (4) tuées. |
| **M8** | `TaskLine.tsx` ajouté à la liste §3B. | — |
| **M9** | Commentaires `ModeChooser` mis à jour (`index.css:76`, `motionSafe.test.ts:17`). | — |

### 8.3 Contradictions de contrat réglées

- §4.1 (garde IA / `date` = début) : réglée en livraison, inchangée.
- §4.2 (INV-23 modulo `zuletztAktiv`) : §7 « Modifiés » amendé.
- §4.3 (Terminer ici sur la seule Aufklärung) : refusé (I4), INV-71 amendé.
- §4.4 (Aufklärung hors du runner) : la fiche s'ouvre sans démonter le runner (méca I1), §10.4 amendé.
- §4.5 (IA masquée en départ Dokumentation) : l'IA est toujours proposée (I9/M1), §10.1 amendé.
- §4.6 (`noxen` nu en focus) : réglé (I6).
- §3 A (annonce Muster) : réglé (B3). §3 C (cadran statique) : réglé (I1). §3 D (horloge de la file) : reste une proposition (8.4).
- H1 (couche) : remplacée par la décision M7 ; H2 : remplacée par I3 et I9.

### 8.4 Restant, à relire

1. **I11 et le chrono du départ.** La revue supposait un chrono lancé à la main ; il démarrait seul (`SimTimer`, autoStart). Pour que « tant que le chrono n'a pas démarré » ait un sens, le chrono du **premier** Teil d'une partie (aucun Teil joué, 0 s) attend « Lancer le chrono » ; les suivants démarrent seuls comme avant. Changement de comportement à confirmer par `main` à la passe navigateur.
2. **M5 et minuit.** Une partie commencée à 23 h 50 et enregistrée à 0 h 20 compte pour la tâche du jour de son début (comme avant) ET pour une tâche du même cas posée le lendemain avant 0 h 20. Rare (même cas deux jours de suite) ; je ne l'ai pas exclu.
3. **M5 et `db/types.ts`.** Le champ `TrainingEvent.enregistreA` est ajouté dans `db/types.ts` (fichier de S4-1, hors des deux fichiers accordés) : sans lui, la complétion n'a aucune trace de l'instant d'enregistrement. Champ optionnel, posé seulement s'il suit `at`.
4. **M4** : décision de contrat (8.2).
5. **§3 D** : `stamp()` de `lib/sync/queue.ts` lit `Date.now()` ; la garde de la carte IA externe et désormais `enregistreA` le comparent à des instants de `lib/clock`. Même horloge en production ; proposition inchangée.
6. **Mutation du flake I2** non écrite : réintroduire la date dans la file ne rougit que sous charge (non déterministe).
7. **Fixtures de `journal.write.test.ts`** : `subject_id` des `simulation.completed` passé de `'c1'` à l'id de la partie, comme le contrat (§3.2) ; `applySimulationToJournal` y lit l'instant d'enregistrement.

### 8.5 Vérification par code de sortie (sommet de code `15a46b31`)

| Commande | Sortie |
|---|---|
| `tsc -b` | 0 |
| `vitest run --dir src --maxWorkers=2` | 0 — 174 fichiers, 1 729 tests |
| `npm run test:c6 -- --maxWorkers=2` | 0 — 13 fichiers, 140 tests |
| `npm run build` | 0 |
| `scripts/check*.mjs` (22 validateurs) | 0, sauf `checkProbeOverlap` = 1 (informatif, inchangé) ; `check*.test.mjs` (11) : 0 partout |
| `node scripts/parcours-mutations.mjs` (complet) | 0 — baseline vert, **134/134 tuées** (8 nouvelles du fixeur). Une passe précédente avait signalé `INV-73d` INAPPLICABLE (la date à l'appel avait changé la ligne) : chaîne remise à jour, passe complète relancée. |
| Mutations manuelles (`src/`) | 13/13 tuées après renforcement d'un test (B1a-note survivait) |
| `git merge-tree --write-tree origin/main HEAD` | 0, aucun conflit (`origin/main` = `5d01e757`) |

### 8.6 Commits du fixeur

| Sha | Objet |
|---|---|
| `cbcc7cdc` | automate et persistance : I4, M3, I11, M6, flake I2 |
| `8ae7cef3` | M5 : complétion par l'enregistrement |
| `a8171493` | Muster guidé raisonné (B1), focus (I6) |
| `38eec3e1` | `CaseDial ouvrable={false}` (I1) |
| `809b105b` | pré-simulation : B2, I2/M7, I3, I9, mineurs, B3 |
| `d1d8f887` | runner et programme : I4, I5, I7, I8, I10, I11, méca I1, M2, M9 |
| `15a46b31` | mutations, candidat navigateur, contrat §10 amendé |
| (ce commit) | mutation `INV-73d` suivie (date à l'appel) ; ce rapport |

## Non vérifié

- **Aucune vérification navigateur.** Ni `playwright-cli` headless, ni deux onglets (médecin + simulant) : sans Supabase, et la machine est chargée. Les écrans touchés sont couverts par RTL (`PreSimulationPage`, runner complet sur un vrai cas du corpus, `ResultScreen`). Le rendu visuel (ordre, cadran 96 à côté du détail, mobile 375 px, thème sombre) n'a été vu par personne.
- `parcours-mutations.mjs --navigateur` et le candidat synthétique (Supabase local requis) ; `parcours-actes.mjs` et `programmeInvariants.mjs` mis à jour mais seulement `node --check`.
- `checkFixedOverlays.mjs` n'existe pas dans ce worktree (fichier non suivi de l'arbre principal) ; je n'ajoute aucun overlay fixe.
- `graphify update app/src` non lancé : il écrirait un dossier non suivi dans le worktree. À lancer depuis l'arbre principal après fusion.
- La présélection du niveau d'assistance (H1) n'a pas été jugée par `direction-keeper`.
