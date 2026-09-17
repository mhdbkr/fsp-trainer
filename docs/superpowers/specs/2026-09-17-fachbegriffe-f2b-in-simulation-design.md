# Fachbegriffe rafraîchi — F2b : dans la simulation, hover-card ★, réglages quotidiens

Date : 2026-09-17 · Statut : validé par la direction (chat) · Epic : #4 · Chantier ADR-0015 n° 2 (suite de F1 PR #36, F2a PR #38)
Suite : F3 (explication en contexte pré-générée, registre double)

## 1. Intention

Le but réel (F2a §1) : **apprendre les mots pendant le cas et les retenir**. F2a a posé les fondations (Neu ≠ dû, budget, pertinence, termes du cas, `caseId`). F2b construit l'expérience :
- consulter et marquer les termes **pendant** la simulation, sans pénalité ;
- réviser **depuis** la simulation sans la perdre (pause de session), et **après** (résultat), ancré sur le cas puis la spécialité ;
- marquer d'une ★ n'importe quel terme rencontré dans un texte (hover-card), le retrouver en tête du drill suivant ;
- rendre les quantités quotidiennes **réglables** (façon Anki) ou automatiques selon l'intensité de préparation.

## 2. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| D1 | Panneau des termes du cas **dans le runner** = référence libre (F2a D6) ; le **drill** se fait **en pause de session** (`minimize`), jamais dans le runner | une seule implémentation de flashcard ; un drill n'a pas sa place à côté d'un chrono d'examen ; la pause existe |
| D2 | Hover-card ★ : **★ = favori immédiat** (+`caseId` en contexte de cas), la carte **s'étend** ensuite (deck, fiche) ; second appui = retrait | marquer d'abord, préciser ensuite ; zéro geste pour le cas courant |
| D3 | Sur mobile, le **tap** sur un terme ouvre la hover-card (le tiroir reste via « Voir la fiche ») ; sur ordinateur, survol = carte, clic = tiroir (inchangé) | pas de survol tactile ; ne pas casser le clic existant |
| D4 | Drill ancré : `?case=<id>` → pool = `termsOfCase` ; rien à réviser → proposer `?specialty=` | « cas puis spécialité » (direction) |
| D5 | Réglages quotidiens `srsSettings` par personne, **synchronisés** (`srs.settings_changed`) : `mode auto` (budget F2a × intensité du programme) ou `manual` (`newPerDay`, `maxReviewsPerDay`) | Anki-like, réglable des deux côtés (page Fachbegriffe, Ajuster), automatique par défaut |
| D6 | `maxReviewsPerDay` plafonne les **dus présentés** ; les dus au-delà restent dus (jamais perdus) | un plafond n'efface pas la dette SRS |

## 3. Modèle

### 3.1 Contrat (`sync-protocol.md`, via `arch`)

Nouveau type `srs.settings_changed` — subject_id `'srs'`, payload `{ mode: 'auto' | 'manual'; newPerDay?: number; maxReviewsPerDay?: number }` (SQL check, zod `events`, `ProgressEventType`). Projection : dernier événement par `occurred_at` → `meta['srs.settings']` (base du compte), reconstruit par `rebuildProjections`. Défaut sans événement : `{ mode: 'auto' }`.

### 3.2 Réglages effectifs (`lib/srsSettings.ts`)

```ts
export interface SrsSettings { mode: 'auto' | 'manual'; newPerDay?: number; maxReviewsPerDay?: number }
export const SRS_LIMITS = { newPerDay: [0, 50], maxReviewsPerDay: [0, 200] } as const;
export function effectiveDaily(s: SrsSettings, auto: { budget: number; intensity: Intensity }): { newPerDay: number; maxReviewsPerDay: number; source: 'auto' | 'manual'; explain: string }
```
- `auto` : `newPerDay = round(budget × INTENSITY_FACTOR[intensity])` (0,8 / 1 / 1,3), borné [0, 50] ; `maxReviewsPerDay = 200` ; `explain = "auto : 12/jour = 10 × intensif"`.
- `manual` : valeurs stockées, bornées ; `explain = "manuel"`.
- `remainingToday` (F2a) utilise `newPerDay` effectif à la place de `budget`. `buildDrillQueue` reçoit `maxReviews` : `due = due.slice(0, maxReviews − reviewedToday)` (compteur `meta['srs.reviewedToday:<date>']` incrémenté à chaque note d'un terme non-Neu).
- `setSrsSettings(s)` = événement + projection locale immédiate (comme les collections).

### 3.3 Drill ancré (`DrillPage`, `drillQueue`)

`?case=<id>` : `pool = termsOfCase(id, all, case, events)` ; titre « Termes de <cas> » ; file = dus du pool → nouveaux du pool par pertinence (les ★ posés pendant ce cas ont +100 : premiers) ; `newLimit` = `remainingToday` ; 3 places réservées (F2a). File vide → écran : « Rien à réviser dans ce cas aujourd'hui » + bouton **« Réviser la spécialité <specialty> »** (`?specialty=`) + « Drill global ». `?case` prime sur `?deck`.

### 3.4 Session en pause pendant le drill

`useSimSession.minimize()` (existant) fige le snapshot (partie, phase, Bogen, texte, chrono `elapsed`). Depuis le panneau du runner : `minimize()` puis `navigate('/fachbegriffe/drill?case=<id>')`. `ResumeSessionBar` (existant) reste visible sur le drill ; « Reprendre » → runner à l'état exact. « Quitter » du drill → `/simulation/<id>/run?teil=<teil>` (même cible que `ResumeSessionBar` ; le runner appelle `resume()`). Aucun événement `simulation.completed` n'est émis par le drill.

### 3.5 Termes du cas dans le runner (`CaseTermsPanel`)

Composant partagé : liste des `termsOfCase` (ordre publié), recherche locale, ligne = terme · formulation patient · étiquette SRS · ★ (`toggleFavorite(id, { caseId })`) ; en-tête « Fachbegriffe du cas (n) · k dus » + bouton **« Drill ces termes »** (3.4). Aucune écriture dans `results`/`assistance`. Réutilisé par la page d'un cas (onglet/section « Fachbegriffe ») pour remplacer la liste alphabétique actuelle.

### 3.6 Hover-card (`TermHoverCard`, `components/AutoLink.tsx`)

- Déclencheurs : `mouseenter` (délai 150 ms) / `focus` sur ordinateur ; `click` sur mobile (`pointer: coarse`). Fermeture : `mouseleave` après 300 ms (sauf si la carte est survolée), Échap, clic extérieur, blur.
- Contenu compact : terme (gras) · formulation patient · étiquette SRS · ★ (44 px). Après ★ : section étendue « Ajouter à un deck… » (listes manuelles, ✓ si présent, « Nouveau deck » inline) · « Voir la fiche ».
- `caseId` : fourni par un `CaseContext` React (posé par la page d'un cas et le runner) ; absent ailleurs.
- Une seule carte ouverte à la fois (store `ui.hoverTerm`) ; positionnée au-dessus/au-dessous selon la place (`getBoundingClientRect`), 280 px max, jamais hors viewport.

### 3.7 Réglages — interface

- Page Fachbegriffe : bouton **« Répétitions »** (icône réglage) à côté de Drill → feuille : mode auto/manuel (radios), `newPerDay`, `maxReviewsPerDay` (champs numériques bornés, pas de curseur), ligne d'explication du calcul auto, « Enregistrer ».
- Programme → « Ajuster » : même feuille, section « Fachbegriffe » sous l'intensité.
- L'en-tête de la page et l'écran d'accueil du drill lisent les valeurs effectives.

### 3.8 Résultat de simulation et programme

- `ResultScreen` : « Drill des termes du cas → » → `/fachbegriffe/drill?case=<id>`.
- Programme : le bloc drill du jour porte `caseId` du bloc simulation du même jour (s'il existe) → lien `?case=` ; sinon `?specialty=`.

## 4. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Runner : chip « Fachbegriffe (n) », n = `termsOfCase` ; ouvrir/fermer ne change ni `elapsed` ni `assistance`/résultats | test composant + navigateur |
| AC-2 | ★ dans le panneau → `term.favorited{caseId}` ; drill `?case=` le présente en premier des nouveaux | test Dexie + `drillQueue` |
| AC-3 | « Drill ces termes » : snapshot figé (partie, `elapsed` identique après 30 s de drill), barre « Reprendre » présente, retour à l'état exact | navigateur (mesure `elapsed` DOM) |
| AC-4 | Drill `?case=` ⊆ termes du cas ; vide → bouton spécialité présent et fonctionnel | tests + navigateur |
| AC-5 | Résultat de simulation : lien `?case=<id>` | test composant |
| AC-6 | Hover-card : survol ouvre (150 ms), ★ = favori immédiat + extension, second ★ retire, Échap/extérieur ferment ; mobile 390 px : tap ouvre, aucun débordement ; une seule carte à la fois | tests + navigateur |
| AC-7 | Réglages manual `newPerDay=5` → ≤ 5 nouveaux au drill ; `maxReviewsPerDay=20` avec 60 dus → 20 présentés, 40 toujours dus demain ; auto × intensif = round(budget × 1,3), explication affichée | tests `srsSettings`/`drillQueue` |
| AC-8 | Réglages identiques sur un 2ᵉ appareil après sync | navigateur, 2 contextes |
| AC-9 | Mode public inchangé ; contrat (`srs.settings_changed`) appliqué en EU + fonction `events` redéployée avant merge | CI + MCP |
| AC-10 | Charte : cibles 44 px, tons existants, mouvement `transform/opacity` ≤ 150 ms, reduced-motion respecté | `front-design-keeper` |

## 5. Hors périmètre

F3 (registre double, explication en contexte), flashcards dans le runner, sélection groupée, réglages par deck, plafond de temps.

## 6. Risques

| Risque | Parade |
|---|---|
| Runner déjà volumineux | le panneau est un composant séparé (`CaseTermsPanel`), le runner n'ajoute qu'un chip + un état |
| Hover-card sur des textes denses (Muster) : cartes qui s'ouvrent au moindre passage | délai 150 ms, une seule carte, fermeture 300 ms, pas de carte pendant une sélection de texte |
| Compteur `reviewedToday` par appareil | même tolérance que `newIntroduced` (F2a) ; recalcul depuis le journal possible |
| `minimize` + navigation : oubli de reprendre | `ResumeSessionBar` déjà persistante ; le drill affiche un rappel « Simulation en pause » |
