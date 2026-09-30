# fix-s3-primitives : corrections de la revue de charte (front-design-keeper)

Branche `feat/s3-primitives` · worktree `doctopus-s3-primitives` · un seul writer.
**Statut : DONE_WITH_CONCERNS** (les réserves sont en §4 et §5).

## 1 · Item par item

| Item | Commit | Preuve |
|---|---|---|
| **B1** : le nom de page supprimait le flou | `28ba7fe` | Mesure en pixels, voir §2. `Shell.tsx:62` → `className="vt-page …"`, sans `style` ; `html:active-view-transition .vt-page { view-transition-name: page; }`. |
| **I1** : touche pendant la sortie du drill | `2e606cd` | Test rouge d'abord : `DrillPage.test.tsx`, « Espace pendant la sortie… » → `Expected "recto", Received "verso"` avant le correctif, vert après. `KeyboardShortcuts off={leaving}` ignore toutes les touches ; Espace n'y fait pas non plus défiler la page. |
| **I2** : jetons d'élévation sans variante sombre | `d50961f` | `boxShadow.eN = var(--eN)`, avec `:root` et `.dark` posés par un `addBase` qui lit `tokens.json` (une seule source). Les jumeaux `-dark` sont supprimés (`.card`, `.card-interactive:hover`, `.glass`). DOM mesuré : le cran actif de `.seg` rend `inset … / 0.55` en clair et `inset … / 0.1` en sombre. `ResumeSessionBar` et `MusterModelPicker` sont bien dans `components/` : corrigés à la racine, sans toucher leur code. `check-parity` → 0. |
| **I3** : le popover est le rôle 1 | `610ee1b` | `.glass glass-edge` sur `AccountSwitcher:67`, `DeckChecklist:47`, `SelectionExplainer:168`, `CardToast:17` et `NewCardSheet:136`. Règle écrite dans la charte (`index.css`, « LE POPOVER EST LE RÔLE 1 »). |
| **I4** : la palette générait des ombres portées | `d50961f` + `bb076a2` | `boxShadow` est sorti de `extend` : `{ ...elevation, inner, none }`. Dans `dist/assets/*.css`, les classes `shadow-*` générées sont `e1 e2 e3 inner` et `hover:shadow-e2`, sans aucun `box-shadow` littéral non-`inset`. `components/` et `styles/` n'en employaient aucune (grep : 0). Verrou mécanique ajouté dans `elevation.test.mjs` (garde d) ; mutation vérifiée : remettre `boxShadow` sous `extend` fait passer la suite au rouge. |
| **I5 / I6** : passation | `8e778b7`, `7e2e569` | `lead-s3-primitives.md` §3 : ajout de `TimeCapsule.tsx:43-47` (ombre inline). `PreSimulationPage:40` → `card`. `AnamneseGuide:56` → `card` : aucun ancêtre `.card`, vérifié en remontant `SimulationRunner:478` → `div.min-w-0` → `div.flex` → `div.space-y-4`. Ancêtre `.card` vérifié ligne par ligne pour `SimulationSetup:135` (`:117`), `HomePage:126` (`:112`), `WeekCalendar:101` (`:61`) et `StatsPage:132` (`:128`). `ArztbriefGuide:55` perd `font-mono`. |
| **M1** : commentaires de charte | `bb076a2`, `fa72191` | Les trois gardes nommées (a, b, c, plus d) ; 23 classes d'ombre dans 15 fichiers, pas 25 ; 41 et non 44 ; `components/useSwap.ts` ; `.swap-in` EST posée sous mouvement réduit, c'est la garde globale `*` qui la neutralise (`index.css` et `useSwap.ts:28-33`). `TaskLabel:22` est aligné sur `:110` (`truncate` reste, en dernier recours). |
| **M2** : barre du drill | `b839c64` | `origin-left` + `transform: scaleX(…)`, `transition-transform duration-300 ease-fluid`. |
| **M3** : `BLOCK_META` | `8e778b7` | Note de passation (§3.3) : il doit lire `TASK_GLYPH`. |
| **M4** : `TaskLabel` | `e91cda2` | Tests rouges d'abord (2 échecs), verts ensuite. Compteurs : `<span class="sr-only"> cartes dues</span>`. `Icon` accepte `aria-hidden`, ce qui retire `role="img"` et le nom. |
| **M6** : `.btn-glass` sans appelant | `bb076a2` | Commentaire de charte : gardée par `safelist`, la Simulation la branchera, et la ligne de `safelist` sera retirée ce jour-là. |

## 2 · B1, la mesure

Sonde : `lead-s3-primitives.verify.mjs` (inscrite pour ne plus régresser), log dans `lead-s3-primitives.verify.log`. Protocole :

- on vide la première `.card` de l'accueil de son contenu (`visibility: hidden` sur ses enfants, la boîte ne bouge pas) ;
- on capture un recadrage intérieur à 14 px du bord ;
- on compare l'état **au repos** avec le **témoin**, c'est-à-dire le même recadrage avec `view-transition-name: page` forcé sur `.vt-page`, ce qui correspond à l'état d'avant.

La porte est l'énergie de gradient de luminance (moyenne des |Δ| entre pixels voisins). Le flou tue d'abord les hautes fréquences, donc les lignes de la grille. L'écart-type est aussi relevé, mais il garde la pente lente des radiaux : sur desktop il ne tranchait qu'à 0,76-0,78, trop près du bruit pour servir de porte.

| Combinaison | Gradient au repos / témoin | Ratio | Écart-type au repos / témoin |
|---|---|---|---|
| clair, 390 | 0,009 / 0,078 | **0,12** | 0,277 / 0,450 |
| sombre, 390 | 0,034 / 0,196 | **0,17** | 0,533 / 0,948 |
| clair, desktop | 0,028 / 0,255 | **0,11** | 0,619 / 0,791 |
| sombre, desktop | 0,052 / 0,477 | **0,11** | 1,183 / 1,552 |

La porte passe si le ratio est inférieur à 0,7.

- **La transition de page s'anime toujours** : on la déclenche par un vrai clic sur un `NavLink viewTransition` (et non par le hash). `vt-page-out` et `vt-page-in` sont observés via `document.getAnimations()` sur `::view-transition-old(page)` et `::view-transition-new(page)`, dans les 4 combinaisons. Une fois `:active-view-transition` éteint, `view-transition-name` de `.vt-page` vaut `none`.
- **`app-chrome` garde son nom permanent**, et c'est mesuré : sur le flou propre de la barre du haut, retirer ce nom ne change rien (ratio 1,00 dans les 4 combinaisons). Une backdrop root borne ses descendants, pas elle-même.
- **Serveur** : `vite preview --port 4317` lancé depuis ce worktree (cwd du PID vérifié par `lsof`). Le CSS servi est `index-DZefjVc5.css`, identique à `dist/`. Le commit du cache Vite par worktree est déjà présent sur la branche (`0b4140f`). Un seul navigateur headless à la fois.
- **Résultat final : 80 OK / 0 KO, code de sortie 0.**

Deux réparations de la sonde ont été nécessaires pour obtenir ce résultat. Elles concernent l'environnement, pas l'app :

- Le Supabase local (celui de `main`) renvoie par moments un 503 sur `content?since=0`. L'app affiche alors sa carte « besoin d'une connexion », qui est elle-même une `.card`, et la sonde mesurait ce faux état. La sonde attend maintenant la navigation et clique « Réessayer ».
- Les 4 KO « `net::ERR_FAILED` » du log précédent venaient de la sonde elle-même, qui coupe la fonte `rsms.me`. Ces requêtes sont désormais décomptées via `requestfailed`. Toute autre requête en échec reste un KO.

## 3 · Portes mécaniques (par code de sortie, sur `a454131`)

| Porte | Résultat |
|---|---|
| `npx tsc -b --noEmit` | 0 |
| `npm run build` | 0 |
| `packages/tokens` : `node --test` | 0 (14/14) |
| `node scripts/check-parity.mjs` | 0 |
| `npx vitest run --dir src/components` | 0 (26 fichiers, 176 tests) |
| `npx vitest run src/features/fachbegriffe/DrillPage.test.tsx` | 0 (14) |
| sonde navigateur | 0 (80 OK / 0 KO) |

## 4 · Hors périmètre, à passer

- **`ResumeSessionBar.tsx:31`** (dans `components/`, non demandé) : il porte `bg-white` + `shadow-e3`, c'est-à-dire le même filet blanc sur blanc que les toasts. C'est de la chrome flottante. Candidat `.glass glass-edge`, mais pas fait, faute d'avoir été demandé.
- Les 23 classes d'ombre de `features/` ne peignent plus rien depuis I4. C'est voulu (gate G2-a), mais cela reste du code mort à nettoyer par chaque chantier (liste au §3.6 du rapport de tranche 1). Les survols comme `hover:shadow-md` (`CasesPage:141`) perdent leur seul signal d'affordance s'ils n'en avaient pas d'autre. À vérifier chez Contenu.
- `TimeCapsule.tsx:43-47` : dernière ombre portée réellement peinte (inline). Elle revient au chantier Simulation.
- Effet de bord voulu de M4 : `visuals/Timeline.tsx:26` passait déjà `aria-hidden="true"` à `Icon`, qui l'ignorait. L'attribut est maintenant honoré.

## 5 · Non vérifié

- Les popovers passés en `.glass glass-edge` (I3) n'ont **pas** été ouverts un par un dans le navigateur : il faut plusieurs comptes pour `AccountSwitcher`, un terme sélectionné pour `SelectionExplainer`, un deck pour `DeckChecklist`. Les matériaux `.glass` et `.glass-edge` eux-mêmes sont mesurés par la sonde : filet supérieur plus clair que le bord, flou rendu. Leur lisibilité au-dessus d'une carte chargée n'est pas mesurée.
- `html:active-view-transition` n'a été mesuré que dans Chromium (headless shell 1243), pas dans Safari ni Firefox. Attendu, non mesuré : un navigateur qui a les View Transitions sans `:active-view-transition` ne pose jamais le nom et retombe sur le fondu racine par défaut, sans perdre le flou.
- La suite `vitest` complète de `src/` n'a pas été relancée : seuls `src/components` et `DrillPage.test.tsx` l'ont été, conformément au brief.
