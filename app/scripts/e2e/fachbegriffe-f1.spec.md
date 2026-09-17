# Fachbegriffe F1 — preuve navigateur (AC-2, 5, 7, 8)

Mesures effectuées en navigateur réel (Chromium, `playwright-cli`, headless),
contre l'app servie par `npm run dev -- --port 5182 --strictPort` et un
Supabase local (migration T1 appliquée, `functions serve` actif, contenu
publié : `GET /functions/v1/content?since=0` retourne des items). Comptes
`anna@test.local` (premium via `grantFornder.mjs`… `scripts/grantFounder.mjs`)
et `ben@test.local` (`secret123`), créés au préalable via le founder gate.
Toutes les mesures sont lues depuis le DOM de l'app (`page.evaluate`,
`getBoundingClientRect`, `performance.now()`, IndexedDB brute), jamais via un
`import("/src/…")` qui créerait une seconde instance de module.

Note d'environnement : `app/.env` ne contenait pas `VITE_AUTH_MODE=founder`
au démarrage de cette tâche (seuls `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` étaient présents) — la variable a été ajoutée pour
activer le founder gate comme prérequis par le brief, puis le serveur dev
relancé. Ce n'est pas un changement de code produit.

## AC-7 — Chargement de la liste (Anna, premium)

**Étapes** : connexion Anna (mot de passe, founder gate) → navigation
`#/fachbegriffe` → mesure `performance.now()` entre le changement de hash et
la présence de `[data-testid="term-list"] [data-term-id]`.

**Mesures** :
- 1er accès (fetch réseau inclus) : **260.7 ms**.
- 2e accès, données déjà chargées en mémoire (rejoue `location.hash` après
  retour à `#/`) : **132.6 ms** — < 200 ms comme demandé par le critère
  (« après données chargées »).
- `document.querySelectorAll('[data-term-id]').length` = **21** (liste
  virtualisée/windowée) — ≤ 60. Total annoncé : 2266 termes.

**Verdict : PASS**
Capture : `app/.playwright-cli/ac7-fachbegriffe-anna.png`

## AC-5 — Curseur alphabétique (rail)

**Étapes** :
1. Clic sur le bouton `aria-label="K"` du groupe
   `[role=group][aria-label="Aller à la lettre"]`.
2. Lettre vide : `aria-disabled="true"` trouvé sur `Y` (pas `X`, qui a des
   entrées dans ce jeu de données — `Y` est la lettre vide la plus proche) ;
   clic forcé dessus, `scrollTop` du conteneur liste avant/après comparé.
3. `page.emulateMedia({ reducedMotion: 'reduce' })` puis survol de `K` :
   lecture de `getComputedStyle(el).transform`.

**Mesures** :
- `document.querySelector('[data-letter="K"]').getBoundingClientRect().top -
  list.getBoundingClientRect().top` = **1 px** ∈ [−4, 4]. ✅
- `Y` : `aria-disabled="true"` confirmé ; `scrollTop` avant = **47400**,
  après clic = **47400** (inchangé). ✅
- Survol de `K` en `prefers-reduced-motion: reduce` :
  `transform` = **"none"** (aucun `scale`). ✅

**Verdict : PASS**
Capture : `app/.playwright-cli/ac5-rail-k-hover.png`

## AC-8 — Responsive mobile (390×844)

**Préparation** : 3 decks créés (« Deck1 », « Deck2 », « Deck3 ») via le
bouton « Nouveau deck » → 5 onglets au total (Tous, ★ Favoris, Deck1, Deck2,
Deck3).

**Étapes** : `page.setViewportSize(390, 844)`, onglet « Tous » sélectionné.

**Mesures** :
- `document.documentElement.scrollWidth` = **390** = `window.innerWidth`
  (**390**) — pas de débordement horizontal de page. ✅
- `[role=tablist]` : `scrollWidth` = **465** > `clientWidth` = **366** — la
  barre de decks déborde et défile (`scrollLeft` testé 0 → 100, appliqué à
  **99**, confirmant qu'elle est scrollable). ✅
- `[role=group][aria-label="Aller à la lettre"]` (rail alphabétique, visible
  seulement sur un deck non vide) : largeur = **44 px** — exactement au seuil
  ≥ 44 px demandé (cible tactile). ✅

**Verdict : PASS**
Captures : `app/.playwright-cli/ac8-mobile-390-tous.png` (rail + tablist,
onglet « Tous ») ; `app/.playwright-cli/ac8-mobile-390.png` (onglet « Deck3 »
vide, pour référence — rail absent, comportement attendu sur deck vide).

## AC-2 — Favoris : sync multi-appareil + isolation par compte

**Étapes** :
1. Contexte « anna » (navigateur A) : recherche « Abdomen », clic sur l'étoile
   de la ligne `fb-abdomen` → `aria-label` passe de
   « Ajouter Abdomen aux favoris » à « Retirer Abdomen des favoris ».
2. Contexte « anna2 » (navigateur B, profil distinct, même compte Anna,
   reconnexion mot de passe) : navigation `#/fachbegriffe`, attente ~4 s,
   lecture des onglets puis clic sur l'onglet Favoris.
3. Contexte « ben » (navigateur C, compte Ben) : navigation
   `#/fachbegriffe`, lecture de l'onglet Favoris et de l'IndexedDB brute
   (`indexedDB.open('fsp-cockpit-<userId-ben>')`, `objectStore('favorites').count()`).

**Mesures** :
- Contexte anna2 : onglet affiché **« ★ Favoris1 »**, contenu de l'onglet
  Favoris = `["fb-abdomen"]` — « Abdomen » bien synchronisé sur le second
  appareil d'Anna. ✅
- Contexte ben : onglet **« ★ Favoris0 »** (liste vide affichée) et
  `favorites.count()` lu directement dans l'IndexedDB de Ben
  (`fsp-cockpit-bbe85e6d-1a5a-4628-b661-10c1b18a31a2`) = **0**. ✅ (isolation
  confirmée : rien n'a fui du compte Anna vers le compte Ben).

**Verdict : PASS**
Captures : `app/.playwright-cli/ac2-anna2-favoris-synced.png`,
`app/.playwright-cli/ac2-ben-favoris-empty.png`

## Résumé

| AC | Critère | Résultat mesuré | Verdict |
|----|---------|------------------|---------|
| AC-7 | Chargement liste < 200 ms (données chargées), ≤ 60 nœuds rendus | 132,6 ms (2e accès) ; 21 nœuds | PASS |
| AC-5 | Alignement lettre rail [-4,4] px ; lettre vide désactivée + scroll figé ; pas de scale au survol (reduced motion) | 1 px ; `Y` désactivée, scrollTop inchangé ; transform=none | PASS |
| AC-8 | Pas de scroll horizontal page ; tablist scrollable ≥ 4 decks ; rail ≥ 44 px | scrollWidth=innerWidth=390 ; tablist 465>366, scrollable ; rail=44px | PASS |
| AC-2 | Favori synchronisé multi-appareil même compte ; isolation entre comptes | Anna2 voit « Abdomen » ; Ben à 0 (UI + IndexedDB) | PASS |

Aucune anomalie bloquante trouvée. Point mineur non bloquant, hors périmètre
de cette tâche de preuve : un panneau assistant IA flottant (icône en bas à
droite) a intercepté des clics/hovers pendant les manipulations et a dû être
fermé manuellement — n'affecte aucun des 4 AC testés, signalé pour
information.

Captures sous `app/.playwright-cli/` (non committées).
