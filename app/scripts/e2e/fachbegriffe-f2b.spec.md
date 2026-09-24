# Preuve navigateur — Fachbegriffe F2b (AC-1, 3, 6, 7, 8)

Outil : `playwright-cli` (headless, mesures depuis le DOM de l'app, jamais via
sonde `import("/src/…")`). Compte : `ux-advocate-f2a@test.local` / `secret123`
(premium). Cas : `case-tvt`. Environnement : Supabase local (worktree
`doctopus-fachbegriffe-f2b`, 12 migrations appliquées y compris
`20260917000012_srs_settings_event.sql`), `functions serve` et `npm run dev
-- --port 5191 --strictPort` lancés depuis ce worktree.

Captures sous `app/.playwright-cli/` (non committées) : `ac1-panel-state.png`,
`ac3-resumebar.png`, `ac6-mobile-dialog.png`, `ac7-srs-settings.png`,
`ac8-ctx2-srs-settings.png`.

## AC-1 — chip « Fachbegriffe (n) » + chrono non réinitialisé — PASS

1. `#/simulation/case-tvt/pre` → « Entrer en simulation » → `#/simulation/case-tvt/run`.
2. Chip visible à côté d'« Aufklärung » : **« Fachbegriffe (80) »** (n = 80).
3. Chrono lu avant ouverture : `19:47` (« Temps maîtrisé »). Clic sur le chip
   → panneau `<aside class="glass …">` « Fachbegriffe du cas » avec bouton
   « Drill ces termes » (screenshot `ac1-panel-state.png`).
4. Attente 3 s, fermeture via le bouton `aria-label="Fermer"` (l'`Escape`
   seul ne ferme pas ce panneau — voir Anomalies).
5. Chrono après fermeture : `19:43` (décroissance de 4 s ≈ le temps réel
   écoulé — chrono qui a avancé normalement, pas de reset à 20:00).
6. Marqueur « Assisté · Couche 1 » identique avant/après (`assistedBefore ===
   assistedAfter`).

## AC-3 — Drill ces termes / ResumeSessionBar / élapsed préservé — PASS

1. Depuis le panneau, clic « Drill ces termes » → URL
   `#/fachbegriffe/drill?case=case-tvt` (contient bien `/fachbegriffe/drill?case=`).
2. `ResumeSessionBar` visible avec « Reprendre » (screenshot `ac3-resumebar.png`) :
   « Simulation en pause · Einseitig geschwollenes Bein » / « Anamnese · 0/3 parties ».
3. Chrono relevé juste avant la pause (dans le Runner) : `19:57`.
4. Attente réelle de 30 s (horodatage terminal `22:09:36` → `22:10:09`).
5. Clic « Reprendre » → retour sur `#/simulation/case-tvt/run`, même partie
   (« Anamnese » visible).
6. Chrono au retour : `19:55` — écart de 2 s avec l'état pré-pause (`19:57`),
   à comparer aux 30 s d'attente réelle : le chrono n'a **pas** avancé
   pendant la pause (l'écart de 2 s vient des interactions de clic avant la
   pause effective, pas du temps d'attente). Élapsed donc préservé dans la
   tolérance opérationnelle visée par le critère (le budget de 30 s ne s'est
   pas retrouvé décompté).

## AC-6 — hover/tap terme lié, favoris, Escape, mobile — PASS

Terme testé : « Erysipel » (bouton `button.underline` inline dans le texte
Fallvorstellung, cas `case-tvt`).

1. Survol → `[role="dialog"]` apparu. La hover-card s'ouvre après le délai
   d'intention de **150 ms** (`setTimeout(…, 150)` dans `lib/autolink.tsx`) ;
   le « 36 ms » relevé initialement a été mesuré depuis le rappel du timer
   (après ce délai), pas depuis `mouse.move` — il ne mesure donc que le rendu
   de la carte, et ne prouve pas le délai lui-même. Aucune nouvelle mesure
   bout-en-bout n'a été prise (revue de branche, M8). Le dialog apparaît, la
   carte est unique : PASS sur l'apparition ; le délai de 150 ms est établi
   par lecture du code seulement (`lib/autolink.tsx`, `setTimeout(…, 150)`) — non testé
   (aucun test à faux timers), non mesuré de bout en bout.
2. Clic ★ → `aria-pressed` passe de `false` à `true`, section « Ajouter à un
   deck… » visible dans le dialog (texte relevé : *"Erysipel\nWundrose\nNeu\n★\nAjouter
   à un deck…\nCréer\nVoir la fiche →"*).
3. Reclic ★ → bascule `true` → `false` → `true` sur trois clics successifs
   (avec 300 ms d'attente entre chaque clic pour laisser la persistance
   Dexie/serveur se faire — voir Anomalies pour le piège du délai court).
4. `Escape` ferme le dialog (`[role="dialog"]` count = 0 après).
5. Mobile 390×844, `pointer:coarse` (device iPhone 15 émulé + resize exact
   390×844) : tap sur le terme → dialog ouvert (count = 1),
   `document.documentElement.scrollWidth` (390) `<= window.innerWidth` (390).
   Screenshot `ac6-mobile-dialog.png`.
6. Un seul dialog à la fois : hover sur « Erysipel » puis sur « Fieber » →
   `dialogsAfterFirstHover = 1`, `dialogsAfterSecondHover = 1` (jamais 2).

## AC-7 — Répétitions Manuel 5/20 → subtitle et drill welcome — PASS

1. `#/fachbegriffe` → « Répétitions » → radio **Manuel** coché, champs
   « Nouveaux termes par jour » = `5`, « Dus présentés par jour » = `20` →
   « Enregistrer ».
2. Sous-titre page Fachbegriffe : **« 0 dus · 5 nouveaux proposés · 10
   appris »** (contient bien « 5 nouveaux proposés »).
3. `#/fachbegriffe/drill` : texte d'accueil **« 0 dus · 5 nouveaux · budget
   du jour 5 · ≈ 2 min. »** — ≤ 5 nouveaux et « budget du jour 5 » bien
   présents. Screenshot `ac7-srs-settings.png`.

## AC-8 — second contexte navigateur, même compte, sync — PASS

1. Nouvelle session `playwright-cli` avec profil frais (`-s=ctx2`, sans
   `--persistent` → profil en mémoire isolé du premier contexte).
2. Connexion avec `ux-advocate-f2a@test.local` / `secret123`.
3. `#/fachbegriffe` → sous-titre déjà **« 5 nouveaux proposés »** après la
   synchronisation Realtime (aucune action manuelle).
4. Ouverture « Répétitions » : radio **Manuel** coché, `5` / `20` confirmés
   dans les champs. Screenshot `ac8-ctx2-srs-settings.png`.

## Anomalies observées (non bloquantes pour les AC testés tels que spécifiés)

- **`Escape` ne ferme pas** le panneau « Fachbegriffe du cas » ouvert depuis
  le Runner (AC-1) — seul le bouton `aria-label="Fermer"` fonctionne. Le
  dialog de survol de terme (AC-6), lui, se ferme bien avec `Escape`. Deux
  mécanismes de fermeture différents, cohérence à vérifier côté produit
  (hors périmètre de cette preuve).
- **`ResumeSessionBar` peut rester invisible sur une page courte** : le flag
  `atPageBottom` (`src/store/ui.ts` / `src/components/Shell.tsx`, calculé sur
  `scrollHeight - scrollTop - clientHeight < 120`) reste à `true` s'il a été
  positionné sur une page précédente et qu'aucun évènement de scroll ne se
  déclenche sur la page suivante (ex. la page d'accueil du Drill, courte,
  qui ne nécessite pas de scroll). Reproduit une fois pendant cette session
  (après une série d'interactions de scroll sur AC-6 mobile) : la barre
  restait à `opacity:0; pointer-events:none` bien que `snapshot`/`minimized`
  soient corrects en mémoire. Non reproduit sur le parcours AC-3 « propre »
  (partie ci-dessus, PASS) — donc pas un blocage des critères tels que
  spécifiés, mais un défaut latent d'UI à surveiller. Détail : la session de
  simulation (`useSimSession`, `src/store/simSession.ts`) est purement en
  mémoire (pas de `persist`) — un rechargement de page pendant une pause
  perd la session (« Reprendre » disparaît). Comportement non testé par les
  AC listés, signalé pour information.
- Environnement : le `functions serve` tournait initialement depuis le
  MAUVAIS worktree (`Claude FSP` au lieu de `doctopus-fachbegriffe-f2b`) et
  la base locale n'avait que 5 des 12 migrations appliquées (jusqu'à
  `20260915000005`). Corrigé en début de session : `functions serve`
  relancé depuis le bon worktree, migrations 6 à 12 appliquées sur la base
  vivante via `psql` (jamais de `db:reset`). État final vérifié cohérent
  (contrainte `progress_events_type_check` = version de la migration 12,
  incluant `srs.settings_changed`).
- Erreurs console 403 sur les polices `@fontsource*` : le serveur Vite de ce
  worktree résout `@fs/…/Claude FSP/app/node_modules/@fontsource…` (chemin
  d'un AUTRE worktree) au lieu de son propre `node_modules` (qui ne contient
  pas ces paquets). Cosmétique (police de repli utilisée), n'a bloqué aucun
  AC, mais signale un souci de cache/résolution Vite propre à ce worktree.

## Rejeu après correctifs (A1/A2)

Contexte : rejeu de vérification après les correctifs `f46728e` (tiroirs
fermés par `Échap`) et `2d6dc90` (session en pause persistée en
`sessionStorage`, barre « Reprendre » déterministe). Outil : `playwright-cli`
(session nommée `f2b`, profil en mémoire), mesures depuis le DOM et le
`sessionStorage` de l'app (`fsp.simSession`), jamais via sonde `import`.
Compte `ux-advocate-f2a@test.local` / `secret123`, cas `case-tvt`.
Environnement : `functions serve` et `npm run dev -- --port 5194
--strictPort` relancés depuis CE worktree (`doctopus-fachbegriffe-f2b`) ;
`GET /functions/v1/content?since=0` → `200` vérifié avant de commencer.

### 1. AC-3 depuis une page scrollée en bas — PASS

1. `#/cas/case-tvt` (page longue, `main.scrollHeight` = 2467 px pour un
   `clientHeight` de 720 px) : scroll du conteneur `<main>` (celui qu'écoute
   `Shell.tsx`, pas `document.body`) jusqu'au fond — `scrollTop` 1747,
   `isAtBottom` (formule `scrollHeight - scrollTop - clientHeight < 120`)
   → `true`.
2. `#/simulation/case-tvt/pre` → « Entrer en simulation » →
   `#/simulation/case-tvt/run`. Chrono lu avant de quitter le runner :
   **19:51** (« Temps maîtrisé »).
3. Chip « Fachbegriffe (80) » à côté d'« Aufklärung » et d'« IA » →
   panneau « Fachbegriffe du cas » → « Drill ces termes » → URL
   `#/fachbegriffe/drill?case=case-tvt` (contient bien
   `/fachbegriffe/drill?case=`).
4. `ResumeSessionBar` visible dès l'arrivée sur le drill : « Simulation en
   pause · … » / « Anamnese · 0/3 parties » / bouton « Reprendre ».
   Bounding box relevée (`getBoundingClientRect`) : `x=381.06, y=649.5,
   width=517.875, height=50.5` ; `visibility: visible`, `opacity: 1`,
   `pointer-events: auto` (screenshot
   `.playwright-cli/ac3-resumebar-rejeu.png`).
5. Valeur de vérité relevée dans `sessionStorage.fsp.simSession` juste après
   l'arrivée sur le drill : `elapsed.anamnese = 55` (secondes, compteur qui
   monte en stockage — l'affichage « Temps maîtrisé » est un décompte
   dérivé).
6. Attente réelle de 30 s (boucle shell chronométrée, aucune interaction
   page pendant l'attente).
7. Relevé de `sessionStorage` **sans navigation ni clic**, juste après les
   30 s : `elapsed.anamnese = 55` — **inchangé**, dérive 0 s (dans la
   tolérance ±1 s).
8. Clic « Reprendre » → retour sur `#/simulation/case-tvt/run`, même partie
   (« Anamnese », onglet Fallvorstellung actif). `sessionStorage` :
   `elapsed.anamnese = 56` (+1 s dû au clic/rendu, dans la tolérance ±1 s).

Le chrono ne dérive pas pendant la pause elle-même (0 s sur 30 s réels) ; le
delta de 14–15 s observé dans une première passe manuelle (comparant les
valeurs affichées « 19:51 » → « 19:37 ») venait des interactions/rendus
`playwright-cli` entre la lecture du chrono dans le runner et l'arrivée
effective sur le drill (plusieurs clics, navigation, capture de snapshot) —
confirmé en isolant la mesure sur `sessionStorage` directement au moment de
l'arrivée en pause (étape 5) puis juste avant de reprendre (étape 7) : 0 s de
dérive sur les 30 s d'attente réelle.

### 2. Reload pendant le drill (persistance de session) — PASS

1. Depuis le runner (suite de la session ci-dessus), rouverture du chip
   « Fachbegriffe (80) » → « Drill ces termes » → `#/fachbegriffe/drill?case=case-tvt`.
   `sessionStorage.fsp.simSession.state.snapshot.elapsed.anamnese = 68` juste
   après l'arrivée (session en pause).
2. `playwright-cli reload` (rechargement complet de la page, pas une
   navigation SPA) → URL inchangée
   (`#/fachbegriffe/drill?case=case-tvt`).
3. Après reload : `ResumeSessionBar` toujours visible (« Reprendre » /
   « Anamnese · 0/3 parties »), et `sessionStorage.fsp.simSession` relu tel
   quel : `elapsed.anamnese = 68` — **persisté à l'identique** à travers le
   rechargement complet (confirme le correctif `2d6dc90`,
   `sessionStorage` au lieu d'un état mémoire pur ; l'anomalie « un
   rechargement de page pendant une pause perd la session » notée dans la
   preuve précédente n'est plus reproduite).
4. Clic « Reprendre » → retour sur `#/simulation/case-tvt/run`, même cas
   (`caseId: case-tvt`), même partie (« Anamnese »/Fallvorstellung),
   `sessionStorage.elapsed.anamnese = 69` (+1 s, dans la tolérance).

### 3. Cohérence de fusion (Fachbegriffe × IA) — PASS

1. Dans le runner (`#/simulation/case-tvt/run`) : les deux chips
   « Fachbegriffe (80) » et « IA » sont visibles côte à côte dans la barre
   d'outils (confirmé par recherche DOM, tous deux avec icône + libellé).
2. Sur la page du cas (`#/cas/case-tvt`) : le bouton « Simuler avec ton IA »
   (icône « spark ») et le panneau « Fachbegriffe du cas (80) » (« 0 dus ·
   80 nouveaux ») sont tous les deux présents dans le DOM.

### Environnement de ce rejeu

- `functions serve` lancé depuis ce worktree, `GET
  /functions/v1/content?since=0` → `200` avant de commencer.
- `npm run dev -- --port 5194 --strictPort` (le port de la consigne, distinct
  du `5191` utilisé dans la preuve initiale AC-1/3/6/7/8 — même worktree).
- OrbStack (Docker) était arrêté en début de session ; démarré manuellement,
  services Supabase relevés stables (`API_URL` 54321) avant de lancer les
  fonctions et le serveur dev.
- Même erreurs 403 cosmétiques sur `@fontsource*` (résolution vers le
  `node_modules` du worktree `Claude FSP`) que dans la preuve précédente —
  non bloquant, déjà noté ci-dessus.
- Navigateur et serveurs fermés en fin de session (`playwright-cli close`,
  `pkill` sur `vite --port 5194` et `supabase functions serve`).
