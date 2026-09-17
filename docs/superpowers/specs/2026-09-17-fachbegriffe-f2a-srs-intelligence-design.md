# Fachbegriffe rafraîchi — F2a : intelligence SRS et liaison cas↔termes

Date : 2026-09-17 · Statut : validé par la direction (chat) · Epic : #4 · Chantier ADR-0015 n° 2 (suite de F1, PR #36)
Suite : F2b (dans la simulation : barre, panneau, flashcards, hover-card ★, drill post-sim) · F3 (explication en contexte pré-générée, registre double)

## 1. Intention

But réel exprimé par la direction : **apprendre les mots pendant le cas et les retenir** — pratiquer drill et flashcards depuis une simulation sans attendre sa fin, et retrouver au drill suivant ce qu'on a marqué pendant un cas.

Deux défauts bloquent ce but aujourd'hui, confirmés dans le code :

1. `freshSrs()` pose `dueDate = maintenant` et `isDue()` ne distingue pas `Neu` : **les 2 266 termes sont « dus aujourd'hui »** dès l'installation ; page, en-tête et programme héritent du même compteur. Rien n'est « intelligent ».
2. Seuls **38 termes sur 2 266** portent un tag de pathologie et la liaison cas↔termes ne passe que par ces tags : **la plupart des cas n'ont aucun terme lié** alors que leurs textes en sont pleins.

F2a corrige ces deux fondations ; F2b construira l'expérience en simulation dessus.

## 2. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| D1 | `Neu` n'est **jamais dû**. Dû = `state !== 'Neu'` et `dueDate ≤ maintenant` (un terme raté, `Zu wiederholen`, reste dû) | le SRS ne réclame que ce qu'il a déjà présenté |
| D2 | **Quota adaptatif** de nouveaux termes par jour, calculé depuis la date d'examen et la rétention ; 10 sans date ; borné 5–30 | évite le mur des 2 266 sans réglage manuel |
| D3 | **Priorité par pertinence** dans le quota : ★ récente, deck récent, cas simulé récent, cas du programme du jour, spécialité du jour | les termes rencontrés en cas passent devant (choix « C » de la direction) |
| D4 | Liaison cas↔termes **par occurrence dans les textes**, calculée par la **pipeline de contenu** (script + validateur CI), stockée dans `linkedFachbegriffeIds` | déterministe, hors-ligne, relu ; zéro coût client |
| D5 | « Termes du cas » = liés ∪ termes marqués (★ / deck) **pendant une session sur ce cas** ; les événements `term.favorited` / `deck.term_added` portent un `caseId` optionnel | mémoire de ce qu'on a appris *dans* ce cas (F2b s'en sert) |
| D6 | Le panneau en simulation (F2b) est une **référence libre**, sans effet sur la confiance du cas | choix « B » de la direction |
| D7 | Une seule file de drill (`buildDrillQueue`) pour le global, les decks et, plus tard, le cas : dus → nouveaux triés par pertinence, bornés par le budget du jour | pas de second planning (D4 de F1) |

## 3. Modèle

### 3.1 SRS (`lib/srs.ts`, `lib/stats.ts`)

```ts
export const isDue = (srs: Srs, now = Date.now()) => srs.state !== 'Neu' && srs.dueDate <= now;
export const isNew = (srs: Srs) => srs.state === 'Neu';
export function counts(begriffe: Fachbegriff[], now = Date.now()): { due: number; fresh: number; learned: number }
```
`dueCount` devient `counts().due`. `reviewSrs` inchangé.

### 3.2 Budget de nouveaux (`lib/srsBudget.ts`)

```ts
export interface BudgetInput { freshRemaining: number; workingDaysToExam: number | null; retention7d: number | null /* 0..1, taux de Gut/Sehr gut sur 7 j, null si < 10 notes */ }
export function newBudget(i: BudgetInput): number
```
Règle : base = `workingDaysToExam` null → 10 ; sinon `ceil(freshRemaining / max(1, workingDaysToExam))`. Facteur rétention : `< 0.6 → 0.7`, `> 0.85 → 1.2`, sinon 1. Résultat borné **[5, 30]**. Introductions du jour comptées dans `meta['srs.newIntroduced:<YYYY-MM-DD>']` (base du compte) ; `remainingToday = budget − introduced`. Un terme est « introduit » à sa première note.

### 3.3 Pertinence (`lib/collections/relevance.ts`)

```ts
export interface RelevanceContext { now: number; favorites: Favorite[]; deckTerms: DeckTerm[]; recentSimulations: { caseId: string; date: number }[]; todayCaseIds: string[]; todaySpecialty?: Specialty; cases: Pick<Case,'id'|'linkedFachbegriffeIds'>[] }
export function relevanceScore(term: Fachbegriff, ctx: RelevanceContext): number
```
Points (cumulables) : ★ < 48 h **+100** · deck < 48 h **+80** · lié à un cas simulé < 7 j **+60 × (1 − âge/7 j)** · lié à un cas du programme du jour **+40** · spécialité du jour **+20**. Égalité → `sortDe`.

### 3.4 File de drill (`lib/collections/drillQueue.ts`, évolution de F1)

```ts
export function buildDrillQueue(pool: Fachbegriff[], opts: { prioritySpecialty?; priorityPathology?; now?; limit?; newLimit: number; relevance?: RelevanceContext }): Fachbegriff[]
```
Dus (ordre F1 : pathologie > spécialité > date) puis nouveaux du pool triés par `relevanceScore`, au plus `newLimit` (= `remainingToday`). `limit` (20) borne le total. Le drill global et le drill de deck passent `newLimit` ; l'écran d'accueil du drill dit « k dus · n nouveaux (budget du jour : b) ».

### 3.5 Liaison par texte (pipeline)

- `scripts/linkCaseTerms.mjs` : charge cas + termes (comme `publishContent.mjs`), construit l'index de l'autolink (`buildLinkIndex`, bornes Unicode, insensible à la casse, formes fléchies simples `-e/-en/-s/-n`), scanne pour chaque cas : `antworten` (valeurs), questions du cas, Muster (Doku + Vorstellung), `medicalView` (texte aplati), `examinerSheet`, `guide` s'il est propre au cas, fiche Fachwissen liée. `linkedFachbegriffeIds` = occurrences ∪ tags de pathologie ∪ réciproques (comportement actuel conservé). Écrit le résultat dans `src/data/caseTermLinks.json` (`{ caseId: termId[] }`) que `seed.ts` applique (au lieu du calcul par tags seul) ; `SEED_VERSION` bumpé ; le publish republie.
- `scripts/checkCaseTermLinks.mjs` (CI, bloquant) : chaque cas ≥ **8** termes ; aucun id orphelin ; JSON à jour (le script de liaison relancé ne change rien : `--check`). Informatif : cas < 15 termes.

### 3.6 « Termes du cas » (`lib/collections/caseTerms.ts`)

```ts
export function termsOfCase(caseId: string, all: Fachbegriff[], c: Case, events: ProgressEvent[]): Fachbegriff[]
```
= `c.linkedFachbegriffeIds` ∪ termIds des événements `term.favorited` / `deck.term_added` dont `payload.caseId === caseId`. **Contrat** (`sync-protocol.md`, via `arch`) : `payload.caseId?: string` optionnel sur ces deux types ; la projection F1 l'ignore ; le serveur l'accepte tel quel (`z.record`). F1 n'émet pas encore ce champ ; F2b l'émettra depuis la simulation.

### 3.7 Programme (`lib/program.ts`, `ProgramPage.tsx`)

Le bloc quotidien « Drill Fachbegriffe » est libellé « Drill · k dus + n nouveaux (≈ m min) » avec `n = min(remainingToday, freshRemaining)` et `m = ceil((k + n) × 0,4)` ; si `k + n = 0`, le bloc n'est pas généré ce jour-là. Le bloc porte `specialty` du jour (celle du bloc simulation du même jour, s'il existe) → `?specialty=` déjà lu par le drill.

## 4. Interface (F2a seulement)

- Page Fachbegriffe : sous-titre « **k dus** · **n nouveaux proposés** · m appris » ; bouton drill « Drill (k + n) ».
- Écran d'accueil du drill : « k dus · n nouveaux · budget du jour b » ; s'il n'y a rien : « Rien à réviser aujourd'hui — les nouveaux termes reviennent demain (budget b/jour) ».
- Page d'un cas : ligne « n Fachbegriffe liés » (déjà prévue par le type, maintenant remplie) ; tiroir Glossaire : « Erscheint in Fällen » rempli.
- Programme : libellé du bloc drill (3.7). Rien d'autre ne change visuellement.

## 5. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Installation neuve : page « 0 dus · 10 nouveaux proposés », pas 2 266 ; badge/programme cohérents | test `counts` + navigateur |
| AC-2 | Terme noté « Gut » → dû exactement à sa `dueDate`, pas avant ; terme raté → dû (state Zu wiederholen) | tests `isDue` |
| AC-3 | Budget : sans examen 10 ; 600 Neu et 30 j ouvrés → 20 ; rétention 0,5 → ×0,7 ; borné 5–30 ; `remainingToday` décroît à chaque première note | tests `srsBudget` |
| AC-4 | ★ posée sur un terme Neu → premier des nouveaux du prochain drill (global et deck) | test `relevance` + `drillQueue` |
| AC-5 | Cas simulé hier → ses termes Neu précèdent les autres ; cas du programme du jour → +40 | tests `relevance` |
| AC-6 | Pipeline : 130/130 cas ≥ 8 termes ; `checkCaseTermLinks --check` exit 0 en CI ; cas Ulcus ventriculi lie « Hämatemesis » ; aucun orphelin | script + CI |
| AC-7 | Tiroir d'un terme lié montre ses cas ; page d'un cas montre « n Fachbegriffe » | navigateur |
| AC-8 | Programme : bloc drill libellé sur les vrais compteurs ; absent le jour où k + n = 0 | test `program` |
| AC-9 | Mode public et suites existantes inchangés ; validateurs CI existants verts | CI |
| AC-10 | Contenu republié sur le projet EU (nouvelle `content_versions`) avant « fait » ; le contrat `caseId` optionnel documenté | MCP + `sync-protocol.md` |

## 6. Hors périmètre

F2b (barre de simulation, panneau, flashcards en sim, hover-card ★ et popup, drill post-sim), F3, réglage manuel du quota (suivi si D2 ne convient pas), tags de pathologie manquants sur les 2 228 termes (la liaison par texte les rend inutiles pour ce but).

## 7. Risques

| Risque | Parade |
|---|---|
| Faux positifs de l'autolink (termes courts, homographes : « Puls », « Ohr ») | liste d'exclusion courte dans le script ; validateur informatif des termes liés à > 60 cas ; relecture `fsp-clinical-reviewer` d'un échantillon |
| Bump de seed + republication = lourde diff de contenu | delta par hash déjà en place (publish) ; seul `linkedFachbegriffeIds` change |
| Budget trop bas les premiers jours (500 Neu, examen lointain → 5) | borne basse 5 est volontaire ; les termes rencontrés en cas passent devant, le quota ne bloque pas les dus |
| `meta.newIntroduced` par appareil, pas synchronisé | acceptable : dérive ≤ 1 budget/jour entre appareils ; le journal (`srs.reviewed` avec `repetitions === 1`) permet de recalculer si besoin (suivi) |
