# Preuve navigateur — Fachbegriffe F4b « premium » (AC-1 à AC-10)

Branche `feat/fachbegriffe-premium` @ `064f7a2`. Méthode : `playwright-cli` headless
(Chromium), Supabase local (`supabase start`), mesures faites depuis le DOM de l'app
(`getComputedStyle`, `getBoundingClientRect`, `document.getAnimations()`, lecture directe
des object stores IndexedDB) — jamais d'`import("/src/…")`.

## Environnement local (jamais le projet EU, jamais `db reset`)

```bash
cd app
npx supabase start                                  # pile docker
npx supabase db push --local                        # migrations 13 à 16
npx supabase functions serve --env-file supabase/.env   # AI_ALLOW_MOCK=1, AI_CHAIN_BRIEF=mock:brief
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<clé locale de `supabase status`> \
  node scripts/publishContent.mjs                   # contenu publié en local
# compte de test : POST /auth/v1/admin/users (e-mail confirmé) puis
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/grantFounder.mjs <e-mail>   # premium
VITE_AUTH_MODE=founder npm run dev -- --port 5180 --strictPort
```

Points d'environnement (pas des défauts de l'app) :
- La pile locale est partagée entre worktrees : `db push` a buté sur une ligne
  `progress_events` `term.personal_updated` laissée par un autre worktree et sur `ai_cache`
  déjà créée (`supabase migration repair --status applied 20260925000014`).
- `functions serve` tombe en `WORKER_LIMIT` / `CPU time limit` après quelques minutes (cf. F4a) :
  le relancer ; le contenu ne se synchronise pas tant que `content` répond 546.
- `serverAiAvailable()` exige `AUTH_MODE === 'founder'` : en build `public` la glose IA est
  indisponible (« IA indisponible : ajoute une clé… »). La preuve tourne donc en `founder`
  (connexion par mot de passe), ce qui active le mock IA local.
- Le conteneur de défilement est `<main>` (pas `window`) : les sondes règlent `main.scrollTop`.
- Identifiants du compte de test : uniquement dans le scratchpad de session, jamais ici.

Fichiers : captures et clips dans `app/scripts/e2e/f4b/` (clair : `*-clair.png`/`*-light.png` ;
sombre : `*-dark.png`, `mobile-*-sombre.png`).

## Tableau AC → résultat

| AC | Résultat | Mesure |
|---|---|---|
| AC-1 verre + repli | **PASS** | `[data-pill]` : `backdrop-filter: blur(12px) saturate(1.8)` ; `.glass-full` (carte d'explication, mini-fiche, tiroir d'un terme, DeckManager) : `blur(24px) saturate(1.8)`. `box-shadow` = une seule ombre **inset** (`rgba(255,255,255,0.7) 0 1px 0 0 inset` clair, `…0.1…` sombre) — le navigateur sérialise le mot `inset` en fin de valeur, pas au début. Repli `prefers-reduced-transparency: reduce` (CDP `Emulation.setEmulatedMedia`) : pilule `backdrop-filter: none`, fond `rgba(244,245,242,0.98)` ; carte clair `0.98`, sombre `rgba(18,33,30,0.98)` (alpha ≥ 0,97). |
| AC-2 étoile | **PASS** | Vide (cristal, `data-star="crystal"`) : trait `rgb(100,116,139)` sur fond effectif → **4,76:1** clair, **11,21:1** sombre. Pleine (ambre, `data-star="amber"`) : `rgb(168,111,12)` → **3,88:1** clair ; `rgb(241,184,74)` → **9,95:1** sombre. Aucune classe `signal` sur les boutons-étoile (`text-star-600 dark:text-star-400`). |
| AC-3 pilule / carte | **PASS** | Pilule `role=toolbar` 96 × 50 px (≤ 120) ; 2 boutons 44 × 44. « Expliquer » étend en carte `glass-full` 256 px, `role=group`, région `aria-live=polite` qui porte l'explication (annoncée). Sélection à y = 349 → carte au-dessus (top 202) ; sélection près du haut (bas à 98) → carte **sous** la sélection (top 106 ≥ 98). Échap ferme. |
| AC-4 confirmation / miniature / Changer / Annuler | **PASS** | ★ sur `Acidose`/`Aszites` → pilule une ligne **50 px** (≤ 52), `<p role=status class=sr-only>` persistante « Rangée dans Favoris ». Toucher → miniature + `Révéler`, `Changer` ; `Révéler` → `data-card-flip` `recto` → `verso`. `Changer` sur `Ileus` → `favorites` sans `fb-ileus`, `deck_terms` contient `fb-ileus` (déplacé, pas dupliqué). Corbeille de la carte perso → « Carte « Diabetesschulung » supprimée » + Annuler : `term.personal_deleted` = 0 avant expiration ; Annuler → 0 et carte revenue ; sans Annuler (~7 s) → 1 événement, `personal_terms` = 0. La pilule ne dure que quelques secondes : captures prises dans la vidéo `clip1`. |
| AC-5 onglets de decks | **PASS** | Ordinateur 1440 : rail à gauche du tiroir `rail.right = 1057 ≤ aside.left + 1 = 1057`. Onglets : `Favoris✓` (`aria-pressed=true`), `Deck…`, puis `Gérer` **en dernier** ; aucun deck intelligent dans le rail (aucun n'existait dans les données de la preuve — cas non exercé). Toucher `Favoris` → `aria-pressed=false`, `favorites` sans le terme ; retoucher → rangé. `⋯`/`Decks` de la page (`aria-label="Gérer les decks"`) → DeckManager ; `Gérer` du rail → DeckManager ; renommer (Entrée) → `decks` mis à jour ; création via « Nouveau deck » → DeckSheet (`Nouveau deck`) → deck ajouté. Suppression : onglet absent du rail et de la page, pilule « Deck « X » supprimé » avec **focus sur « Annuler »** ; Annuler → `deck.deleted` = 0 ; sans Annuler : 0 événement à 3 s, **1 à 7,5 s**, `favorites`/`deck_terms`/`personal_terms` des autres decks intacts. **Tab piégé** : 25 Tab dans le tiroir → 0 sortie ; 20 Tab dans DeckManager → 0 sortie ; 15 Tab dans DeckManager ouvert depuis la page → 0 sortie. 1280×720 avec 13 decks : `rail.scrollHeight 717 > clientHeight 640`, `overflow-y: auto`, 14 boutons sur 14 lignes. 390×844 : une rangée (1 valeur de `top`), `scrollWidth 1322 > clientWidth 383` (défile), `document.documentElement.scrollWidth = 390`. ★ pleine dans une liste (`Voir la fiche de Aszites`) → le tiroir s'ouvre sur ce terme. |
| AC-6 carte d'embarquement | **PASS avec écart de libellé** | 3 `[data-readout]` (« à revoir 0 », « nouveaux 10 », « min environ 4 ») ; bascule « Fachbegriff → Bedeutung » avec exemple `A. carotis interna sinistra → ?` et « Bedeutung → Fachbegriff » `linke innere Halsschlagader → ?` ; la 1re carte de la file est `Acidose` : l'exemple n'est **jamais** la 1re carte. Aucun « SM-2 ». Deck à jour (une carte revue « Gut ») : « À jour ✓ — prochain terme dû le 1 octobre ». Deck vide : « Ce deck est encore vide… ». **Écart** : le bouton s'intitule « Commencer » et non « Commencer (N cartes) » (spec P7 et plan G2) — voir FAIL-1. |
| AC-7 mini-fiche / vol / ancre | **PASS (partiel)** | Sélection de 6 mots → `Touche le mot à garder` + 6 pastilles ; toucher `Diabetesschulung` : un seul élément porte 1 animation dans la frame suivant le clic (`Corriger`, le mot en grand — le vol natif), `Mot` = mot choisi, `Bedeutung` = `mock:brief` repris, `Contexte` = la phrase avec `<mark>`. Ordinateur : mini-fiche ancrée sous la sélection (`dialog.top 395 ≥ selection.bottom 387`). 390 px : mini-fiche depuis le bas (`top 634, bottom 828, vh 844`), `scrollWidth 390`. `Créer la carte` → 8 animations en cours à 250 ms puis pilule « Rangée dans Favoris » ; `term.personal_created` + `term.favorited` émis. **Non mesuré** : position x/y exacte de la carte en descente vers la pilule ; création par Entrée (visible sur vidéo uniquement). |
| AC-8 interruption / mouvement réduit | **PASS avec nuance** | Interruption : ouvrir « Expliquer » puis Échap à 50 ms et à 120 ms → au milieu 1 carte + 1 pilule (fondu croisé), puis **0 calque** après 523 ms / 617 ms. Mouvement réduit (`emulateMedia reducedMotion: reduce` + rechargement) : après chaque état (pilule, carte, fermeture, mini-fiche, pastille, tiroir, bascule d'onglet, fermeture) aucune animation **en cours** (`playState === 'running'` : 0) et styles finaux immédiats (`opacity 1, transform none`). Nuance : `document.getAnimations().length` vaut 1, constant même au repos — `reveal-up` sur la racine de la page, `playState: finished`, durée 0,001 ms (règle globale `prefers-reduced-motion`) ; voir FAIL-2 si le critère est lu à la lettre. |
| AC-9 bundle | **Hors G2** | Mesuré par la tâche G3 (+29,8 Kio annoncé). Non refait ici. |
| AC-10 pas de régression F4a | **PASS** | AC-4 F4a : mot hors glossaire `Nierenretentionswerte` → pastille → mini-fiche `Mot`, `Contexte` ; fermer ✕ → 0 événement. AC-5 F4a : phrase de 6 mots → pastilles → choix (cf. AC-7). AC-6 F4a : ★ → confirmation, `Révéler`, `Changer`. AC-7 F4a : Bedeutung modifiée → `personal_terms.explanation` mis à jour. AC-8 F4a : « Carte » du tiroir → `recto` → `verso`. AC-9 F4a : suppression + Annuler (0 `term.personal_deleted`), expiration (1). AC-12 F4a : 390 px `scrollWidth 390` sur liste, tiroir, drill, mini-fiche. |

## FAIL / écarts détaillés

- **FAIL-1 (mineur, libellé)** — `DrillPage.tsx:181` : le bouton d'action affiche `Commencer`, la spec P7 et le plan G2 attendent « Commencer (N cartes) ». Aucune occurrence de `cartes)` dans `DrillPage.tsx`/son test. Le nombre figure déjà dans le relevé « nouveaux » et le lien « Drill (10) » de la page.
- **FAIL-2 (lecture littérale de AC-8)** — `document.getAnimations().length === 0` n'est jamais vrai : 1 animation `reveal-up` **terminée** (`fill: both`, 0,001 ms) reste listée sur la racine de chaque page. Aucune animation n'est en cours ; critère « en cours » tenu. Si la direction veut `length === 0`, il faut retirer la classe `reveal` sous `prefers-reduced-motion` (hors F4b, CSS globale préexistante).
- **Observation (pas un FAIL)** — interruption : carte et pilule coexistent brièvement à la fermeture (fondu croisé) ; tout est retiré en ≤ 617 ms.
- **Non exercé** : deck intelligent inerte (aucun créé ; le rail n'en affiche plus par décision amendée) ; création de la carte par Entrée ; trajectoire x/y de « se poser ».

## Vidéos (3 clips)

- `app/scripts/e2e/f4b/clip1-desktop-clair.webm` (1,5 Mo, versionné) : ordinateur clair — sélection → pilule → Expliquer → Échap → interruption à 50 ms → pilule → mini-fiche → pastilles → Créer → pilule « Rangée dans Favoris » → Révéler.
- `app/scripts/e2e/f4b/clip2-decks-tiroir.webm` (7,1 Mo, **hors git**) : tiroir d'un terme — ranger/retirer, Gérer, renommer, créer (DeckSheet), supprimer + Annuler, supprimer et expirer, bouton Decks de la page, onglets à 1280×720 et 390×844.
- `app/scripts/e2e/f4b/clip3-telephone-sombre.webm` (0,8 Mo, versionné) : téléphone sombre 390×844 — liste, bande de decks du tiroir, bascule d'un onglet, carte d'embarquement du drill, première carte, sélection, pilule, mini-fiche depuis le bas.
