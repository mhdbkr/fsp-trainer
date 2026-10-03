# integ-s3-primitives — intégration de `feat/s3-primitives` dans `main`

Rôle : intégrateur, writer unique du worktree `doctopus-s3-primitives`.
Base : `a262432` (approuvée par la vérification finale). Sommet : voir `git log`.
Statut : **DONE_WITH_CONCERNS** (voir « Réserves »).

## 1. Commits

| Commit | Objet |
|---|---|
| `bb9afa10` | Fusion `origin/main` @ `1e81e43` (PR #53) — M1 à M5 |
| `7d279283` | Passation `features/simulation` — S1–S6, S8–S13 |
| `1ca6d35e` | `AccountSwitcher` : focus du menu à l'ouverture + test ; commentaire `Portal` |
| `a46240f6` | Fusion `origin/main` @ `ae0fd2dd` (PartnerCard) — faite pendant mon arrêt, vérifiée (§3) |
| `63947cef` | Commentaires périmés de `index.css` |
| `5fe60f85` | CI : toute la suite `packages/tokens/test` puis `check-parity` |
| `a4ab12c5`, `bf852e51` | `DeckRail:145` (menu) et `:265` (erreur) : plus de verre dans le tiroir en verre |

## 2. Fusion #53 (M1–M5)

- **M1** : `.glass-thin, .glass-full` en clair → `border: 1px solid rgb(12 26 23 / 0.12); border-top-color: rgb(255 255 255 / 0.88)`.
  `check-parity` lit les deux propriétés. Je l'ai vérifié en rouge : sur une copie avec l'ancien `white/0.55`, il sort en code 1
  (`✗ glass-thin/full.light.border`).
- **M2** : `.btn-primary:hover` reste `inset` et `.btn-primary-glass` est supprimé. Il avait **trois** appelants, pas deux :
  `NewCardSheet:221`, `DeckManager:90` et aussi `DeckSheet:60`. Sans ce troisième changement, le bouton « Créer » perdait
  tout style. Les deux tests ont été mis à jour.
- **M3** : `Shell`, `<main ref tabIndex={-1} … className="flex-1 overflow-y-auto outline-none">`. Pas de `key` ni de `.reveal`, `vt-page` est gardé.
- **M4** : la version `main` est prise pour CardToast, NewCardSheet, SelectionExplainer, TermHoverCard et DrillPage, sur les seuls blocs
  en conflit (les morceaux de HEAD fusionnés automatiquement sont conservés). `GlossaryDrawer:121` garde HEAD.
  `DeckChecklist` est supprimé.
- **M5** : les pages de `DeckRail` passent de `glass-full` à `panel`, avec `rounded-r-none` / `rounded-b-none` pour garder le coin
  collé au tiroir. La bulle d'aide de la pilule de sélection (`SelectionExplainer:43`) passe de `glass-thin` à `panel`.

## 3. Passation simulation (S1–S13)

Toutes les lignes ont été re-vérifiées après les deux fusions.

- **S1** `TimeCapsule` : seul `inset 0 1px 0 0 rgb(255 255 255 / 0.55)` reste. `glow` est supprimé, et `box-shadow` sort de `DRIFT`
  (la valeur est désormais constante).
- **S2** `PatientScreen` : les onglets deviennent `seg seg-xl mt-2 w-full` + `aria-pressed`. `seg-xl` est nécessaire parce que
  `.seg > button` (hors couche) écrase les utilitaires de taille. Le flou imbriqué est retiré.
- **S3, S10** `SimulationSetup` : tuile d'icône en `bg-slate-100 dark:bg-slate-800`, fiche simulant en `panel mt-3 …`.
- **S4, S5** `AnamneseBogen` : `panel bg-paper/70 …` et `panel p-2 focus-within:border-brand-400`.
- **S6** `ArztbriefGuide` : `font-mono` retiré.
- **S7 sans objet** : la ligne `ExternalAiSheet:159` a disparu avec #56 (le fichier fait 41 lignes). Je n'ai pas cherché de remplaçant.
- **S8** `KommunikationPanel` → `panel p-2.5`. **S9** `PreSimulationPage` → `card mx-auto max-w-lg p-3`.
  **S11** verso du Hub → `card flex flex-col p-3 …`. **S12** `shadow-md` retiré.
- **S13** : `viewTransition` posé sur `entrer()`, sur les liens de `SimulationHub:75`, `PreSimulationPage:47` et
  `SimulationRunner:638,639,641`, **et sur les deux `<Link>` de `ModeChooser`**. Ces deux liens portent le passage Hub → pré-écran,
  qui avait la même régression. `PartnerCard.test` attend désormais `{ viewTransition: true }`.
  Après `a46240f6` : `SimulationSetup.tsx:146` garde `{ viewTransition: true }`, et les 4 assertions `toHaveBeenCalledWith` de
  `PartnerCard.test` le portent (8/8 vert).

### Note de mouvement — S13, passage pré-écran → runner

- **But** : dire « tu changes de pièce » au seuil de la partie. Depuis le retrait de `key={pathname}`, ce passage n'animait plus rien.
- **Propriétés** : `opacity` et `transform` (translateY) sur `::view-transition-old/new(page)`. La disposition n'est pas animée.
  La chrome (`app-chrome`) est figée.
- **Courbe et durée** : `var(--ease-out)`, sortie 120 ms, entrée 260 ms (`index.css:579-583`).
- **Interruption** : une nouvelle navigation pendant la transition la remplace (`skipTransition` implicite du navigateur).
  Aucun état React n'en dépend.
- **`prefers-reduced-motion`** : `::view-transition-*` → `animation: none !important` (`index.css:594-596`).
- Aucune transition nouvelle autre que `viewTransition` dans `features/simulation`.

## 4. Mineurs

- **`AccountSwitcher`** : dans l'effet `[open]`, le focus va au premier `[role="menuitem"]`.
  Un test le couvre ; il est rouge sans la ligne (1 échec sur 8), vert avec (8/8).
- **Commentaires** : `Portal.tsx` (la raison est maintenant la chaîne containing block / backdrop root, plus `.reveal`) ;
  `AccountSwitcher.tsx:76` et `index.css:156` (plus de `DeckChecklist`).
  Dans `index.css:196-207`, les ombres sont recomptées : 15 classes dans 9 fichiers `.tsx` de `features/`, hors tests.
  `PatientScreen` sort de la liste des segmentés, et TimeCapsule n'a plus que son filet `inset`.
- **CI** (`quality.yml`, job site) : `node --test test/*.test.mjs` puis `node scripts/check-parity.mjs`.
  Les deux sortent à 0 en local et le YAML se charge.
- **`DeckRail` menu (`:145`) et erreur (`:265`)** : ils étaient en `glass-full` dans le tiroir `glass-full`.
  - Premier essai en `panel` nu : en sombre, le fond du menu tombait à `rgba(255,255,255,0.035)` et la page dessous transparaissait
    à travers « Renommer ».
  - Décision : `panel` + `bg-white/95 dark:bg-ink-800/95`. C'est un aplat opaque, aux valeurs du repli `prefers-reduced-transparency` de `.panel`.
  - Mesuré : `rgba(255,255,255,0.95)` en clair, `rgba(18,33,30,0.95)` en sombre, `backdrop-filter: none`.
  - Le menu porte aussi `transition-none` : `.panel` transitionne `transform`, ce qui aurait traîné le ressort `expand`
    de framer-motion (`transitionProperty` mesuré : `none`).

## 5. Preuve navigateur

Conditions : `vite preview` du build sur le port 4396, avec le Supabase local de `main` (non stoppé).
Un seul Chromium headless. Tout est lu depuis le DOM et les captures de l'app, sans `import()` de module.
Sondes : `scratchpad/integ/probe.mjs` et `drawer.mjs`, sorties `probe.json` et `drawer.json`. Le serveur est arrêté (port 4396 libre).

| Mesure | Clair | Sombre |
|---|---|---|
| `CardToast` miniature (`glass-full`), Δ bord − extérieur g/d/bas | **−23,2 / −23,8 / −24,4** | +25,9 / +26,2 / +33,7 (filet clair voulu) |
| `CardToast` pilule (`glass-thin`, `rounded-full`), bas | **−25,0** (côtés −6 : colonne prise dans l'arrondi) | +25,9 |
| `TermHoverCard` (`glass-full`), droite | **−25,5** (gauche et bas recouvrent la table et la pilule : non significatif) | +25,8 |
| `border-left` / `border-top` calculés | `rgba(12,26,23,0.12)` / `rgba(255,255,255,0.88)` | `rgba(255,255,255,0.12)` |
| Cartes de `/simulation` qui floutent | 29/29, `.vt-page` au repos `view-transition-name: none` | 29/29 |
| Pré-écran → « Démarrer la simulation » | `:active-view-transition` vrai ; `vt-page-out 120`, `vt-page-in 260` ; arrivée `#/simulation/case-gib/run` | idem |

- **Écrans hub, pré-écran, runner, patient** (390 et bureau, clair et sombre) : 0 erreur de page, 0 ombre portée calculée,
  0 débordement horizontal.
- **Onglets de `PatientScreen`** : `aria-pressed="true"`, cran `rgb(255,255,255)` sur piste `rgb(241,245,249)` en clair ;
  `rgb(18,33,30)` sur `rgb(27,47,43)` en sombre ; aucun flou.
- **Pages `DeckRail` en `.panel`** (deux decks créés pour les voir empilées) : les libellés « Favoris », « Kardio … » et « Gastro … »
  sont lisibles en clair et en sombre (captures `drawer-{light,dark}.png`).

## 6. Portes mécaniques (sommet `bf852e51`)

- `npx tsc -b --noEmit` → 0. `npm run build` → 0.
- `node --test packages/tokens/test/*.test.mjs` → 0. `check-parity` → 0.
- `npx vitest run --maxWorkers=4 src/components src/styles src/features/simulation src/features/fachbegriffe` → **0, 349/349, 46 fichiers**
  (charge 17, 21 h 51).

## 7. Réserves

1. **Instabilité sous charge, pas de régression** : à charge 34–54, trois runs ont échoué, chacun sur un jeu de tests différent.
   En cause : `Test timed out`, `Failed to start forks worker`, et `waitFor` dépassé à 1 s.
   Les 8 fichiers touchés repassent ensuite 106/106 ; le run complet passe 349/349 quand la charge tombe à 17.
   La CI, qui tourne sur une machine non saturée, tranchera.
2. **Une `.card` dans un `glass-full`, hors consigne** : la `CardFlip` mini (`.card`) est dans la miniature de `CardToast`
   (`glass-full w-64`, code #53). La sonde la voit sous une backdrop root. C'est la même classe de défaut que M5, mais non traitée
   ici : c'est une décision de matière pour `CardFlip size="mini"`.
3. **`.input` floutés dans des cartes floutées** (runner et barre latérale, `input mt-1 …`) : la sonde les compte comme flous imbriqués.
   Ils sont antérieurs à cette branche et hors consigne.
4. **Fusion `a46240f6` faite par un autre agent** pendant que je me croyais seul writer (voir l'échange avec `main`).
   Vérifiée a posteriori (§3), pas refaite.

## Non vérifié

- La lisibilité du menu `DeckRail` au téléphone (axe `y`). Seul le bureau a été capturé.
- Le comportement de `viewTransition` sur Safari et Firefox (Chromium seul).
- `DeckRail.test` a échoué une fois sur un premier run à froid, puis est passé 3 fois sur 3 (29/29). Je le classe instable,
  sans l'avoir prouvé.
