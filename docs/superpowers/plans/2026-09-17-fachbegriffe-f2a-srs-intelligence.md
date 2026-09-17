# Fachbegriffe F2a — intelligence SRS et liaison cas↔termes · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un SRS qui ne réclame que ce qu'il a présenté (Neu ≠ dû), un quota adaptatif de nouveaux termes, une file de drill ordonnée par pertinence (favoris, decks, cas récents, programme du jour), et une liaison cas↔termes par occurrence textuelle calculée par la pipeline — pour que « apprendre pendant le cas » ait des fondations.

**Architecture:** Fonctions pures (`isDue/counts`, `newBudget`, `relevanceScore`, `buildDrillQueue`) alimentées par un `RelevanceContext` construit depuis la base Dexie du compte ; le budget du jour est compté dans `meta`. La liaison par texte est un script Node qui réutilise `buildLinkIndex` de l'autolink sur les textes des cas, produit `src/data/caseTermLinks.json`, que `publishContent.mjs` fusionne dans le payload de chaque cas ; un validateur CI garde l'invariant.

**Tech Stack:** React 18, Vite 7, Dexie 4, Vitest, Node 22 scripts (esbuild loader existant), Supabase (publish), playwright-cli.

Spec : `docs/superpowers/specs/2026-09-17-fachbegriffe-f2a-srs-intelligence-design.md`

## Global Constraints

- Branche `feat/fachbegriffe-f2a` depuis `main` ; worktree `../doctopus-fachbegriffe-f2a` (copier `app/.env`, `app/supabase/.env`). Commandes depuis `app/`. Node ≥ 22.
- Gates après chaque tâche : `npm run typecheck`, `npx vitest run --dir src`, `npm run build` → exit 0 (flake connu #33 `queue.test.ts` toléré). Tâche 4 : les validateurs de contenu existants (`node scripts/check*.mjs`) restent verts.
- `docs/contracts/` n'est modifié que par la Tâche 5 (rôle `arch`).
- Sémantique (verbatim spec D1) : `isDue = state !== 'Neu' && dueDate <= now` ; `isNew = state === 'Neu'`.
- Budget (spec 3.2) : sans examen 10 ; sinon `ceil(freshRemaining / max(1, workingDaysToExam))` ; rétention `< 0.6 → ×0.7`, `> 0.85 → ×1.2`, sinon ×1 ; borné **[5, 30]** ; clé meta `srs.newIntroduced:<YYYY-MM-DD>`.
- Pertinence (spec 3.3) : ★ < 48 h +100 · deck < 48 h +80 · cas simulé < 7 j +60 × (1 − âge/7 j) · cas du programme du jour +40 · spécialité du jour +20 · égalité → `sortDe`.
- File (spec 3.4) : dus (ordre F1) puis nouveaux triés par pertinence, au plus `newLimit` ; `limit` 20 par défaut ; jamais hors pool.
- Liaison (spec 3.5) : occurrences ∪ tags ∪ réciproques ; chaque cas ≥ **8** termes (bloquant) ; < 15 informatif ; `--check` compare le JSON régénéré au fichier.
- Contrat (spec 3.6) : `payload.caseId?: string` optionnel sur `term.favorited` / `deck.term_added` ; projection F1 inchangée.
- Programme (spec 3.7) : bloc « Drill · k dus + n nouveaux (≈ m min) », `m = ceil((k+n) × 0,4)`, absent si `k + n = 0`.
- Stager fichier par fichier ; pas de Co-Authored-By ; vérifier par code de sortie ; mesurer depuis le DOM.
- Livraison (Tâche 8) : contenu republié sur le projet EU (nouvelle `content_versions`) **avant** « fait » ; ligne CI du validateur ajoutée sur `main` au merge (un seul writer sur `.github/`).

---

### Task 1 : Sémantique SRS — Neu n'est jamais dû

**Files:**
- Modify: `app/src/lib/srs.ts:47-49` (`isDue`), ajouter `isNew`
- Modify: `app/src/lib/stats.ts:74-76` (`dueCount` → `counts`, garder `dueCount` comme alias)
- Test: `app/src/lib/srs.test.ts` (créer si absent ; sinon ajouter les cas)
- Callers à vérifier sans changement de signature : `HomePage.tsx:38`, `FachbegriffePage.tsx:65`, `pickSession.ts`, `program.ts:241`, `drillQueue.ts`

**Interfaces:**
- Produces:
  ```ts
  export function isDue(srs: Srs, now?: number): boolean;   // state !== 'Neu' && dueDate <= now
  export function isNew(srs: Srs): boolean;
  // stats.ts
  export function counts(begriffe: Fachbegriff[], now?: number): { due: number; fresh: number; learned: number };
  export const dueCount = (b: Fachbegriff[], now?: number) => counts(b, now).due;
  ```

- [ ] **Step 1 : test qui échoue**

```ts
// app/src/lib/srs.test.ts (ajouter au fichier existant s'il y en a un)
import { describe, it, expect } from 'vitest';
import { freshSrs, reviewSrs, isDue, isNew, DAY_MS } from './srs';
import { counts } from './stats';
import type { Fachbegriff } from '@/db/types';

const now = Date.UTC(2026, 8, 17, 12);
const fb = (srs: Fachbegriff['srs'], id = 'x'): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs });

describe('isDue / isNew (D1)', () => {
  it('un terme Neu n\'est jamais dû, même avec dueDate passée', () => {
    expect(isDue(freshSrs(now - DAY_MS), now)).toBe(false);
    expect(isNew(freshSrs(now))).toBe(true);
  });
  it('noté Gut → dû à sa dueDate, pas avant', () => {
    const s = reviewSrs(freshSrs(now), 4, now);
    expect(isDue(s, now)).toBe(false);
    expect(isDue(s, s.dueDate)).toBe(true);
    expect(isNew(s)).toBe(false);
  });
  it('raté → Zu wiederholen et dû (repetitions remis à 0 ne le rend pas Neu)', () => {
    const s = reviewSrs(reviewSrs(freshSrs(now), 4, now), 0, now + DAY_MS);
    expect(s.state).toBe('Zu wiederholen');
    expect(isDue(s, now + 2 * DAY_MS)).toBe(true);
  });
});

describe('counts', () => {
  it('sépare dus / nouveaux / appris', () => {
    const learned = reviewSrs(freshSrs(now - 10 * DAY_MS), 4, now - 10 * DAY_MS);   // dû depuis longtemps
    const future = reviewSrs(freshSrs(now), 5, now);                                  // appris, pas dû
    const c = counts([fb(freshSrs(now), 'a'), fb(freshSrs(now), 'b'), fb(learned, 'c'), fb(future, 'd')], now);
    expect(c).toEqual({ due: 1, fresh: 2, learned: 2 });
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/srs.test.ts`
Expected: FAIL — `isNew`/`counts` absents, et « Neu jamais dû » faux.

- [ ] **Step 3 : implémentation**

`srs.ts` :
```ts
/** Dû = déjà présenté (state ≠ Neu) et échéance passée. Un Neu n'est jamais réclamé (spec F2a D1). */
export function isDue(srs: Srs, now = Date.now()): boolean {
  return srs.state !== 'Neu' && srs.dueDate <= now;
}
export const isNew = (srs: Srs): boolean => srs.state === 'Neu';
```
`stats.ts` :
```ts
import { isDue, isNew } from './srs';
export function counts(begriffe: Fachbegriff[], now = Date.now()): { due: number; fresh: number; learned: number } {
  let due = 0, fresh = 0, learned = 0;
  for (const b of begriffe) { if (isNew(b.srs)) fresh++; else { learned++; if (isDue(b.srs, now)) due++; } }
  return { due, fresh, learned };
}
export const dueCount = (begriffe: Fachbegriff[], now = Date.now()): number => counts(begriffe, now).due;
```
Vérifier `pickSession.ts` et `program.ts:241` : ils appellent `isDue` — sémantique voulue (dus réels), rien à changer. `drillQueue.ts` : les Neu passent par la branche « news », inchangé.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib && npm run typecheck`
Expected: exit 0. Si un test existant supposait « Neu = dû » (ex. `stats.test.ts`, `program.test.ts`), le corriger vers la nouvelle sémantique et le noter dans le rapport.

- [ ] **Step 5 : commit**

```bash
git add src/lib/srs.ts src/lib/stats.ts src/lib/srs.test.ts
git commit -m "feat(srs): Neu n'est jamais dû — isDue/isNew/counts (F2a D1)"
```

---

### Task 2 : Budget adaptatif de nouveaux (`srsBudget.ts`) + compteur du jour

**Files:**
- Create: `app/src/lib/srsBudget.ts`
- Test: `app/src/lib/srsBudget.test.ts`
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (`grade()` : marquer l'introduction à la première note)

**Interfaces:**
- Produces:
  ```ts
  export interface BudgetInput { freshRemaining: number; workingDaysToExam: number | null; retention7d: number | null }
  export function newBudget(i: BudgetInput): number;                    // [5, 30]
  export const introducedKey = (day: Date) => `srs.newIntroduced:${YYYY-MM-DD}`;
  export async function introducedToday(now?: Date): Promise<number>;   // meta
  export async function markIntroduced(now?: Date): Promise<void>;      // +1
  export async function remainingToday(budget: number, now?: Date): Promise<number>; // max(0, budget − introduced)
  export function retention7d(events: ProgressEvent[], now?: number): number | null; // Gut/Sehr gut ratio sur srs.reviewed 7 j (payload.grade si présent, sinon repetitions>0 && lapses inchangé) — voir Step 3
  ```

- [ ] **Step 1 : test qui échoue**

```ts
// app/src/lib/srsBudget.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { newBudget, introducedToday, markIntroduced, remainingToday, introducedKey } from './srsBudget';
import { db } from '@/db/db';

describe('newBudget (D2)', () => {
  it('sans examen → 10', () => expect(newBudget({ freshRemaining: 2000, workingDaysToExam: null, retention7d: null })).toBe(10));
  it('600 Neu, 30 j ouvrés → 20', () => expect(newBudget({ freshRemaining: 600, workingDaysToExam: 30, retention7d: null })).toBe(20));
  it('rétention 0,5 → ×0,7 (600/30 = 20 → 14)', () => expect(newBudget({ freshRemaining: 600, workingDaysToExam: 30, retention7d: 0.5 })).toBe(14));
  it('rétention 0,9 → ×1,2 (20 → 24)', () => expect(newBudget({ freshRemaining: 600, workingDaysToExam: 30, retention7d: 0.9 })).toBe(24));
  it('borné 5–30', () => {
    expect(newBudget({ freshRemaining: 20, workingDaysToExam: 60, retention7d: null })).toBe(5);
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 10, retention7d: 0.9 })).toBe(30);
    expect(newBudget({ freshRemaining: 0, workingDaysToExam: 10, retention7d: null })).toBe(5);
  });
});

describe('compteur du jour', () => {
  beforeEach(() => db.meta.clear());
  it('clé par jour ; remainingToday décroît à chaque markIntroduced', async () => {
    const d = new Date(Date.UTC(2026, 8, 17, 12));
    expect(introducedKey(d)).toBe('srs.newIntroduced:2026-09-17');
    expect(await introducedToday(d)).toBe(0);
    await markIntroduced(d); await markIntroduced(d);
    expect(await introducedToday(d)).toBe(2);
    expect(await remainingToday(10, d)).toBe(8);
    expect(await remainingToday(1, d)).toBe(0);
    expect(await introducedToday(new Date(Date.UTC(2026, 8, 18, 12)))).toBe(0);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/srsBudget.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/srsBudget.ts
// ============================================================================
// Budget quotidien de NOUVEAUX Fachbegriffe (spec F2a D2). Les dus ne sont
// jamais limités ; seule l'introduction de termes Neu l'est, pour ne pas
// présenter 2 266 cartes le premier jour. Compteur local par jour (meta).
// ============================================================================
import { db, getMeta, setMeta } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { Srs } from '@/db/types';

export interface BudgetInput { freshRemaining: number; workingDaysToExam: number | null; retention7d: number | null }

export function newBudget(i: BudgetInput): number {
  const base = i.workingDaysToExam === null ? 10 : Math.ceil(i.freshRemaining / Math.max(1, i.workingDaysToExam));
  const f = i.retention7d === null ? 1 : i.retention7d < 0.6 ? 0.7 : i.retention7d > 0.85 ? 1.2 : 1;
  return Math.max(5, Math.min(30, Math.round(base * f)));
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const introducedKey = (d: Date) => `srs.newIntroduced:${dayKey(d)}`;
export const introducedToday = (now = new Date()) => getMeta<number>(introducedKey(now), 0);
export async function markIntroduced(now = new Date()): Promise<void> { await setMeta(introducedKey(now), (await introducedToday(now)) + 1); }
export async function remainingToday(budget: number, now = new Date()): Promise<number> { return Math.max(0, budget - (await introducedToday(now))); }

/** Taux de réussite (répétition qui n'est pas un échec) sur les 7 derniers jours ; null si < 10 notes. */
export function retention7d(events: ProgressEvent[], now = Date.now()): number | null {
  const since = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const notes = events.filter((e) => e.type === 'srs.reviewed' && e.occurred_at >= since);
  if (notes.length < 10) return null;
  const ok = notes.filter((e) => (e.payload as Srs).state !== 'Zu wiederholen').length;
  return ok / notes.length;
}
void db;
```
Vérifier que `getMeta`/`setMeta` existent dans `db.ts` (elles sont importées par l'ancien `store/profile.ts`) ; sinon les définir : `getMeta = async <T>(key, def) => (await db.meta.get(key))?.value ?? def`, `setMeta = (key, value) => db.meta.put({ key, value })`. Retirer `void db` si `db` est inutile.

`DrillPage.tsx` `grade()` : avant `reviewSrs`, `const wasNew = card.srs.state === 'Neu';` ; après la mise à jour : `if (wasNew) void markIntroduced();`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/srsBudget.test.ts && npm run typecheck`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/lib/srsBudget.ts src/lib/srsBudget.test.ts src/features/fachbegriffe/DrillPage.tsx
git commit -m "feat(srs): budget adaptatif de nouveaux termes (5–30, examen + rétention) et compteur du jour"
```

---

### Task 3 : Pertinence + file de drill unifiée + écrans

**Files:**
- Create: `app/src/lib/collections/relevance.ts`
- Test: `app/src/lib/collections/relevance.test.ts`
- Modify: `app/src/lib/collections/drillQueue.ts` (+ `newLimit`, `relevance`), `drillQueue.test.ts`
- Create: `app/src/lib/collections/drillContext.ts` (construit `RelevanceContext` + budget depuis Dexie)
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (file + écran d'accueil), `FachbegriffePage.tsx` (sous-titre + bouton), `app/src/features/home/HomePage.tsx:38` (compteur)

**Interfaces:**
- Consumes: Tasks 1–2, `sortDe` (F1), `useDecks/useDeckTerms/useFavorites`, `db.simulations`, `db.plan`, `useProgramConfig`
- Produces:
  ```ts
  // relevance.ts
  export interface RelevanceContext { now: number; favorites: Favorite[]; deckTerms: DeckTerm[]; recentSimulations: { caseId: string; date: number }[]; todayCaseIds: string[]; todaySpecialty?: Specialty; cases: Pick<Case, 'id' | 'linkedFachbegriffeIds'>[] }
  export function relevanceScore(term: Fachbegriff, ctx: RelevanceContext): number;
  export function sortByRelevance(terms: Fachbegriff[], ctx: RelevanceContext): Fachbegriff[]; // score desc, puis sortDe
  // drillQueue.ts
  export function buildDrillQueue(pool, opts: { prioritySpecialty?; priorityPathology?; now?; limit?; newLimit?: number; relevance?: RelevanceContext }): Fachbegriff[];
  export function queueCounts(pool, opts): { due: number; fresh: number };  // ce que la file contiendra
  // drillContext.ts
  export async function loadDrillContext(now?: Date): Promise<{ relevance: RelevanceContext; budget: number; remaining: number }>;
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/collections/relevance.test.ts
import { describe, it, expect } from 'vitest';
import { relevanceScore, sortByRelevance, type RelevanceContext } from './relevance';
import type { Fachbegriff } from '@/db/types';
import { freshSrs, DAY_MS } from '@/lib/srs';

const now = Date.UTC(2026, 8, 17, 12);
const H = 3600_000;
const t = (id: string, specialty = 'Gastro'): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: specialty as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(now) });
const base: RelevanceContext = { now, favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [{ id: 'c1', linkedFachbegriffeIds: ['a'] }, { id: 'c2', linkedFachbegriffeIds: ['b'] }] };

describe('relevanceScore (D3)', () => {
  it('★ < 48 h = +100 ; ★ ancienne = 0', () => {
    expect(relevanceScore(t('a'), { ...base, favorites: [{ termId: 'a', since: new Date(now - 10 * H).toISOString() }] })).toBe(100);
    expect(relevanceScore(t('a'), { ...base, favorites: [{ termId: 'a', since: new Date(now - 3 * DAY_MS).toISOString() }] })).toBe(0);
  });
  it('deck < 48 h = +80', () => expect(relevanceScore(t('a'), { ...base, deckTerms: [{ deckId: 'd', termId: 'a', addedAt: new Date(now - H).toISOString() }] })).toBe(80));
  it('cas simulé hier = +60 × (1 − 1/7) ≈ 51 ; il y a 8 jours = 0', () => {
    expect(relevanceScore(t('a'), { ...base, recentSimulations: [{ caseId: 'c1', date: now - DAY_MS }] })).toBeCloseTo(60 * (1 - 1 / 7), 0);
    expect(relevanceScore(t('a'), { ...base, recentSimulations: [{ caseId: 'c1', date: now - 8 * DAY_MS }] })).toBe(0);
  });
  it('cas du programme du jour = +40 ; spécialité du jour = +20 ; cumul', () => {
    expect(relevanceScore(t('a'), { ...base, todayCaseIds: ['c1'] })).toBe(40);
    expect(relevanceScore(t('a'), { ...base, todaySpecialty: 'Gastro' as never })).toBe(20);
    expect(relevanceScore(t('a'), { ...base, todayCaseIds: ['c1'], todaySpecialty: 'Gastro' as never, favorites: [{ termId: 'a', since: new Date(now).toISOString() }] })).toBe(160);
  });
  it('sortByRelevance : score desc puis alphabétique', () => {
    const ctx = { ...base, favorites: [{ termId: 'zeta', since: new Date(now).toISOString() }] };
    expect(sortByRelevance([t('beta'), t('alpha'), t('zeta')], ctx).map((x) => x.id)).toEqual(['zeta', 'alpha', 'beta']);
  });
});
```

Ajouter à `drillQueue.test.ts` :
```ts
  it('newLimit borne les nouveaux ; relevance ordonne les nouveaux', () => {
    const ctx: RelevanceContext = { now, favorites: [{ termId: 'n3', since: new Date(now).toISOString() }], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] };
    const pool = [mk('n1', 'Neu', 0), mk('n2', 'Neu', 0), mk('n3', 'Neu', 0), mk('due', 'Gelernt', -1)];
    expect(buildDrillQueue(pool, { now, newLimit: 2, relevance: ctx }).map((b) => b.id)).toEqual(['due', 'n3', 'n1']);
    expect(buildDrillQueue(pool, { now, newLimit: 0 }).map((b) => b.id)).toEqual(['due']);
  });
  it('queueCounts reflète la file', () => {
    const pool = [mk('n1', 'Neu', 0), mk('n2', 'Neu', 0), mk('due', 'Gelernt', -1)];
    expect(queueCounts(pool, { now, newLimit: 1 })).toEqual({ due: 1, fresh: 1 });
  });
```
(importer `RelevanceContext` depuis `./relevance` ; `mk` existe déjà dans ce fichier — noter que `mk(id, 'Gelernt', -1)` produit un terme dû sous la nouvelle sémantique car `state ≠ Neu`.)

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/collections`
Expected: FAIL — `relevance` introuvable, `newLimit` inconnu

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/collections/relevance.ts
import type { Case, DeckTerm, Fachbegriff, Favorite, Specialty } from '@/db/types';
import { sortDe } from '@/features/fachbegriffe/letters';

const H48 = 48 * 3600_000; const D7 = 7 * 24 * 3600_000;
export interface RelevanceContext {
  now: number; favorites: Favorite[]; deckTerms: DeckTerm[];
  recentSimulations: { caseId: string; date: number }[];
  todayCaseIds: string[]; todaySpecialty?: Specialty;
  cases: Pick<Case, 'id' | 'linkedFachbegriffeIds'>[];
}
/** Points de pertinence d'un terme NEU (spec F2a 3.3). Les dus ne passent pas par ici. */
export function relevanceScore(term: Fachbegriff, ctx: RelevanceContext): number {
  let s = 0;
  const fav = ctx.favorites.find((f) => f.termId === term.id);
  if (fav && ctx.now - Date.parse(fav.since) < H48) s += 100;
  if (ctx.deckTerms.some((d) => d.termId === term.id && ctx.now - Date.parse(d.addedAt) < H48)) s += 80;
  const casesOf = ctx.cases.filter((c) => c.linkedFachbegriffeIds.includes(term.id)).map((c) => c.id);
  let simBest = 0;
  for (const sim of ctx.recentSimulations) if (casesOf.includes(sim.caseId)) { const age = ctx.now - sim.date; if (age >= 0 && age < D7) simBest = Math.max(simBest, 60 * (1 - age / D7)); }
  s += simBest;
  if (ctx.todayCaseIds.some((id) => casesOf.includes(id))) s += 40;
  if (ctx.todaySpecialty && term.specialty === ctx.todaySpecialty) s += 20;
  return s;
}
export function sortByRelevance(terms: Fachbegriff[], ctx: RelevanceContext): Fachbegriff[] {
  const score = new Map(terms.map((t) => [t.id, relevanceScore(t, ctx)]));
  return [...terms].sort((a, b) => (score.get(b.id)! - score.get(a.id)!) || sortDe(a, b));
}
```

`drillQueue.ts` :
```ts
import { sortByRelevance, type RelevanceContext } from './relevance';
export interface DrillOpts { prioritySpecialty?: string | null; priorityPathology?: string | null; now?: number; limit?: number; newLimit?: number; relevance?: RelevanceContext }
export function buildDrillQueue(pool: Fachbegriff[], opts: DrillOpts = {}): Fachbegriff[] {
  const now = opts.now ?? Date.now();
  const priority = (b: Fachbegriff) => (opts.priorityPathology && b.pathologyTags.includes(opts.priorityPathology) ? 0 : opts.prioritySpecialty && b.specialty === opts.prioritySpecialty ? 1 : 2);
  const due = pool.filter((b) => isDue(b.srs, now)).sort((a, b) => priority(a) - priority(b) || a.srs.dueDate - b.srs.dueDate);
  let news = pool.filter((b) => b.srs.state === 'Neu');
  news = opts.relevance ? sortByRelevance(news, opts.relevance) : news.sort((a, b) => priority(a) - priority(b));
  if (opts.newLimit !== undefined) news = news.slice(0, Math.max(0, opts.newLimit));
  return [...due, ...news].slice(0, opts.limit ?? 20);
}
export function queueCounts(pool: Fachbegriff[], opts: DrillOpts = {}): { due: number; fresh: number } {
  const q = buildDrillQueue(pool, { ...opts, limit: Number.MAX_SAFE_INTEGER });
  return { due: q.filter((b) => b.srs.state !== 'Neu').length, fresh: q.filter((b) => b.srs.state === 'Neu').length };
}
```
(garder `nextDueAt` tel quel.)

```ts
// app/src/lib/collections/drillContext.ts
// Construit le contexte de pertinence et le budget du jour depuis la base du compte.
import { db } from '@/db/db';
import type { RelevanceContext } from './relevance';
import { newBudget, remainingToday, retention7d } from '@/lib/srsBudget';
import { isNew } from '@/lib/srs';
import { workingDaysUntilExam } from '@/lib/program';   // voir note

export async function loadDrillContext(now = new Date()): Promise<{ relevance: RelevanceContext; budget: number; remaining: number }> {
  const [favorites, deckTerms, sims, plan, cases, begriffe, events, config] = await Promise.all([
    db.favorites.toArray(), db.deck_terms.toArray(), db.simulations.orderBy('date').reverse().limit(30).toArray(),
    db.plan.toArray(), db.cases.toArray(), db.fachbegriffe.toArray(), db.progress_events.toArray(), (await db.meta.get('program'))?.value as { examDate?: string } | undefined,
  ]);
  const dayKey = now.toISOString().slice(0, 10);
  const today = plan.filter((p) => p.date === dayKey && p.caseId);
  const todayCaseIds = today.map((p) => p.caseId!);
  const todaySpecialty = cases.find((c) => c.id === todayCaseIds[0])?.specialty;
  const relevance: RelevanceContext = {
    now: now.getTime(), favorites, deckTerms,
    recentSimulations: sims.map((s) => ({ caseId: s.caseId, date: typeof s.date === 'number' ? s.date : Date.parse(String(s.date)) })),
    todayCaseIds, todaySpecialty, cases: cases.map((c) => ({ id: c.id, linkedFachbegriffeIds: c.linkedFachbegriffeIds })),
  };
  const budget = newBudget({ freshRemaining: begriffe.filter((b) => isNew(b.srs)).length, workingDaysToExam: config?.examDate ? workingDaysUntilExam(config.examDate, now) : null, retention7d: retention7d(events, now.getTime()) });
  return { relevance, budget, remaining: await remainingToday(budget, now) };
}
```
Note : vérifier dans `program.ts` s'il existe déjà un helper « jours ouvrés jusqu'à l'examen » (`isWorkingDay`, `nextWorkingDay`, `programEnd`) ; sinon ajouter et exporter `workingDaysUntilExam(examDateISO, now)` (compte les jours `isWorkingDay` avec la config par défaut entre demain et la date). Vérifier aussi le type réel de `Simulation.date` et de `PlanEntry.date`/`caseId` dans `types.ts` et adapter les deux lignes concernées.

Écrans :
- `DrillPage.tsx` : `const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadDrillContext>> | null>(null); useEffect(() => { loadDrillContext().then(setCtx); }, []);` ; `buildQueue` passe `{ prioritySpecialty, priorityPathology, newLimit: ctx?.remaining ?? 0, relevance: ctx?.relevance }` ; attendre `ctx` avant de construire la file. Écran d'accueil : `const qc = queueCounts(pool, …)` → « {qc.due} dus · {qc.fresh} nouveaux · budget du jour {ctx.budget} » ; si la file est vide et qu'aucun deck : « Rien à réviser aujourd'hui — les nouveaux termes reviennent demain (budget {ctx.budget}/jour). » (garder le message deck de F1 quand `deck`).
- `FachbegriffePage.tsx` : `const c = counts(activeDeck ? shown : begriffe)` → sous-titre « **{c.due} dus** · **{fresh} nouveaux proposés** · {c.learned} appris » où `fresh = min(c.fresh, remaining)` (charger `loadDrillContext` une fois dans la page, `useEffect`) ; bouton « Drill ({c.due + fresh}) ».
- `HomePage.tsx:38` : `counts(begriffe).due` (le badge n'affiche plus 2 266).

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/collections src/lib src/features/fachbegriffe && npm run typecheck && npm run build`
Expected: exit 0 ; `FachbegriffePage.test.tsx` peut nécessiter un mock de `loadDrillContext` (`vi.mock('@/lib/collections/drillContext', () => ({ loadDrillContext: async () => ({ relevance: {…vide…}, budget: 10, remaining: 10 }) }))`) — l'ajouter.

- [ ] **Step 5 : commit**

```bash
git add src/lib/collections/relevance.ts src/lib/collections/relevance.test.ts src/lib/collections/drillQueue.ts src/lib/collections/drillQueue.test.ts src/lib/collections/drillContext.ts src/lib/program.ts src/features/fachbegriffe/DrillPage.tsx src/features/fachbegriffe/FachbegriffePage.tsx src/features/fachbegriffe/FachbegriffePage.test.tsx src/features/home/HomePage.tsx
git commit -m "feat(fachbegriffe): file de drill unifiée — dus puis nouveaux par pertinence, bornés par le budget du jour ; compteurs page/accueil"
```

---

### Task 4 : Pipeline — liaison cas↔termes par occurrence textuelle

**Files:**
- Create: `app/scripts/linkCaseTerms.mjs`
- Create: `app/scripts/checkCaseTermLinks.mjs`
- Create: `app/src/data/caseTermLinks.json` (généré)
- Modify: `app/scripts/publishContent.mjs:46` (fusion des liens dans le payload des cas)
- Modify: `app/package.json` (scripts `content:link`, `check:caselinks`)
- Test: `app/scripts/linkCaseTerms.test.mjs` (node:test) — extraction pure sur un mini-corpus

**Interfaces:**
- Consumes: `loadAll()` (`scripts/loadCases.mjs`), `src/data/fachbegriffe.json`, `src/data/seedFachwissen.ts` (via loadAll), l'algorithme de `buildLinkIndex` (réimplémenté en Node, même regex Unicode)
- Produces: `caseTermLinks.json` = `{ "<caseId>": ["fb-…", …] }` trié ; fonction pure exportée `linkTerms(caseTexts: string[], terms: { id: string; term: string }[]): string[]`.

- [ ] **Step 1 : test qui échoue**

```js
// app/scripts/linkCaseTerms.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTerms, caseTexts } from './linkCaseTerms.mjs';

const terms = [{ id: 'fb-haematemesis', term: 'Hämatemesis' }, { id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-magen', term: 'Magen' }, { id: 'fb-puls', term: 'Puls' }, { id: 'fb-in', term: 'in' }];

test('occurrence entière, insensible à la casse, umlauts ; pas dans les composés', () => {
  assert.deepEqual(linkTerms(['Der Patient berichtet über hämatemesis und ein Ulkus.'], terms), ['fb-haematemesis', 'fb-ulkus']);
  assert.deepEqual(linkTerms(['Magenspiegelung geplant'], terms), []);            // « Magen » dans un composé = autre mot
  assert.deepEqual(linkTerms(['Puls 80/min'], terms), ['fb-puls']);
});
test('formes fléchies simples -e/-en/-s/-n', () => {
  assert.deepEqual(linkTerms(['zwei Ulkusse? nein: Ulzera; aber Ulkusen'], terms), ['fb-ulkus']);
});
test('termes < 4 lettres ignorés ; liste d\'exclusion', () => {
  assert.deepEqual(linkTerms(['in der Nacht'], terms), []);
});
test('caseTexts aplatit antworten, questions, muster, medicalView, examinerSheet', () => {
  const c = { antworten: { a: 'Hämatemesis seit gestern' }, caseSpecificQuestions: [{ q: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], medicalView: { x: { y: 'Magen' } }, examinerSheet: [{ title: 't', items: ['Ulkus'] }] };
  const txt = caseTexts(c, { dokumentation: 'Muster A', fallvorstellung: 'Muster B' }).join('\n');
  for (const w of ['Hämatemesis', 'Ulkus', 'Puls', 'Magen', 'Muster A', 'Muster B']) assert.ok(txt.includes(w), w);
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `node --test scripts/linkCaseTerms.test.mjs`
Expected: FAIL — module introuvable

- [ ] **Step 3 : implémentation**

```js
// app/scripts/linkCaseTerms.mjs
// ============================================================================
// Liaison cas ↔ Fachbegriffe PAR OCCURRENCE TEXTUELLE (spec F2a 3.5). La
// liaison par tags de pathologie ne couvre que 38 termes sur 2 266 : ce script
// scanne les textes réels de chaque cas avec la même règle de mot entier
// Unicode que l'autolink de l'app, et écrit src/data/caseTermLinks.json.
// Usage : node scripts/linkCaseTerms.mjs [--check]   (--check : exit 1 si le
// fichier diffère du résultat régénéré — utilisé par checkCaseTermLinks.mjs)
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../src/data/caseTermLinks.json');
/** Mots trop ambigus pour lier un cas (homographes du quotidien). */
const EXCLUDE = new Set(['in', 'vor', 'nach', 'bei', 'seit', 'ohne', 'mit', 'oder', 'und', 'aber', 'dann', 'noch', 'schon', 'sehr', 'gut', 'ganz']);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Index des termes → regex Unicode mot entier + formes fléchiées simples. */
export function buildIndex(terms) {
  const byKey = new Map(); const alts = [];
  for (const t of terms) {
    const key = t.term.trim(); if (key.length < 4 || EXCLUDE.has(key.toLowerCase())) continue;
    const lower = key.toLowerCase(); if (byKey.has(lower)) continue;
    byKey.set(lower, t.id); alts.push(key);
  }
  alts.sort((a, b) => b.length - a.length);
  const re = new RegExp('(?<![\\p{L}\\p{N}])(' + alts.map(escapeRe).join('|') + ')(?:e|en|s|n)?(?![\\p{L}\\p{N}])', 'giu');
  return { re, byKey };
}

export function linkTerms(texts, terms) {
  const { re, byKey } = buildIndex(terms);
  const found = new Set();
  for (const text of texts) for (const m of String(text ?? '').matchAll(re)) { const id = byKey.get(m[1].toLowerCase()); if (id) found.add(id); }
  return [...found].sort();
}

const flatten = (v, out = []) => { if (v == null) return out; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => flatten(x, out)); else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out)); return out; };
/** Textes d'un cas où un terme peut apparaître. */
export function caseTexts(c, muster) {
  return [
    ...flatten(c.antworten), ...flatten(c.antwortenEmotional),
    ...flatten(c.caseSpecificQuestions), ...flatten(c.examinerQuestions),
    ...flatten(c.medicalView), ...flatten(c.examinerSheet), ...flatten(c.musterSaetze),
    ...flatten(muster),
  ];
}

async function main() {
  const check = process.argv.includes('--check');
  const { loadAll } = await import('./loadCases.mjs');
  const { cases, fachwissen, muster } = await loadAll();
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => ({ id: r.id, term: r.t }));
  const fwByPath = new Map(fachwissen.map((f) => [f.pathology, f]));
  const result = {};
  for (const c of cases) {
    const fw = fwByPath.get(c.pathology);
    const texts = [...caseTexts(c, muster?.[c.id]), ...flatten(fw)];
    result[c.id] = linkTerms(texts, fb);
  }
  const json = JSON.stringify(result, null, 0) + '\n';
  if (check) {
    let current = ''; try { current = readFileSync(OUT, 'utf8'); } catch { /* absent */ }
    if (current !== json) { console.error('caseTermLinks.json est périmé : relancer `npm run content:link`'); process.exit(1); }
    console.log('caseTermLinks.json à jour'); return;
  }
  writeFileSync(OUT, json);
  const sizes = Object.values(result).map((a) => a.length);
  console.log(`${cases.length} cas liés · min ${Math.min(...sizes)} · médiane ${sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)]} · max ${Math.max(...sizes)}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e); process.exit(1); });
```
Vérifier la forme réelle de `muster` renvoyé par `loadAll()` (`CASE_MUSTER` : clé = caseId ? champs `dokumentation`/`fallvorstellung` ?) et de `caseSpecificQuestions` (champ `q` ou `question`) — `flatten` est agnostique, seul le test unitaire suppose `q`.

```js
// app/scripts/checkCaseTermLinks.mjs
// Invariant CI (bloquant) : chaque cas a ≥ 8 Fachbegriffe liés par texte,
// aucun id orphelin, JSON à jour. Informatif : cas < 15, termes liés à > 60 cas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
const ids = new Set(JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => r.id));
let errors = 0;
for (const [caseId, termIds] of Object.entries(links)) {
  if (termIds.length < 8) { console.error(`✗ ${caseId} : ${termIds.length} termes (< 8)`); errors++; }
  else if (termIds.length < 15) console.log(`ℹ ${caseId} : ${termIds.length} termes (< 15)`);
  for (const t of termIds) if (!ids.has(t)) { console.error(`✗ ${caseId} : terme inconnu ${t}`); errors++; }
}
const byTerm = new Map(); for (const arr of Object.values(links)) for (const t of arr) byTerm.set(t, (byTerm.get(t) ?? 0) + 1);
for (const [t, n] of byTerm) if (n > 60) console.log(`ℹ ${t} lié à ${n} cas (homographe probable ?)`);
try { execFileSync('node', [join(here, 'linkCaseTerms.mjs'), '--check'], { stdio: 'inherit' }); } catch { errors++; }
if (errors) { console.error(`❌ ${errors} manquement(s)`); process.exit(1); }
console.log(`✓ ${Object.keys(links).length} cas, liaison par texte valide`);
```

`publishContent.mjs` ligne 46 : charger `const links = JSON.parse(readFileSync('src/data/caseTermLinks.json', 'utf8'));` et mapper les cas avec `payload: { ...c, linkedFachbegriffeIds: [...new Set([...(c.linkedFachbegriffeIds ?? []), ...(links[c.id] ?? [])])] }`.

`package.json` scripts : `"content:link": "node scripts/linkCaseTerms.mjs"`, `"check:caselinks": "node scripts/checkCaseTermLinks.mjs"`.

- [ ] **Step 4 : générer, vérifier**

Run: `node --test scripts/linkCaseTerms.test.mjs && npm run content:link && npm run check:caselinks; echo exit=$?`
Expected: tests verts ; `130 cas liés · min ≥ 8` ; validateur exit 0. Si un cas est < 8 : lire ses textes, élargir `caseTexts` (champ oublié) plutôt que baisser le seuil ; si un terme est lié à > 60 cas et n'est pas médical, l'ajouter à `EXCLUDE`. Rapporter la distribution (min/médiane/max) et 3 exemples (Ulcus ventriculi doit contenir `fb-haematemesis` ou équivalent réel de l'id — vérifier l'id dans `fachbegriffe.json`).

Puis `node scripts/publishContent.mjs --dry; echo exit=$?` → 0 (le dry-run charge et mappe sans publier).

- [ ] **Step 5 : commit**

```bash
git add scripts/linkCaseTerms.mjs scripts/linkCaseTerms.test.mjs scripts/checkCaseTermLinks.mjs src/data/caseTermLinks.json scripts/publishContent.mjs package.json
git commit -m "content(pipeline): liaison cas↔Fachbegriffe par occurrence textuelle — caseTermLinks.json, validateur CI, fusion au publish"
```

---

### Task 5 : Contrat `caseId` optionnel + « termes du cas » (arch)

**Files:**
- Modify: `docs/contracts/sync-protocol.md` (ligne F1 : `payload.caseId?` sur `term.favorited` / `deck.term_added`)
- Create: `app/src/lib/collections/caseTerms.ts`
- Test: `app/src/lib/collections/caseTerms.test.ts`
- Modify: `app/src/lib/collections/index.ts` (`toggleFavorite(termId, opts?: { caseId? })`, `addToDeck(deckId, termId, opts?: { caseId? })` — payload enrichi)

**Interfaces:**
- Produces:
  ```ts
  export function termsOfCase(caseId: string, all: Fachbegriff[], c: Pick<Case,'linkedFachbegriffeIds'>, events: ProgressEvent[]): Fachbegriff[];
  // index.ts
  toggleFavorite(termId: string, opts?: { caseId?: string }): Promise<boolean>;
  addToDeck(deckId: string, termId: string, opts?: { caseId?: string }): Promise<void>;
  ```

- [ ] **Step 1 : test qui échoue**

```ts
// app/src/lib/collections/caseTerms.test.ts
import { describe, it, expect } from 'vitest';
import { termsOfCase } from './caseTerms';
import type { Fachbegriff } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { freshSrs } from '@/lib/srs';
const t = (id: string): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() });
const ev = (type: ProgressEvent['type'], subject_id: string, payload: unknown): ProgressEvent => ({ id: `${type}-${subject_id}`, user_id: 'u', type, subject_id, payload, occurred_at: '2026-09-17T10:00:00Z' });

describe('termsOfCase (D5)', () => {
  it('liés ∪ marqués pendant ce cas ; sans doublon ; jamais un terme d\'un autre cas', () => {
    const all = [t('a'), t('b'), t('c'), t('d')];
    const events = [ev('term.favorited', 'b', { caseId: 'c1' }), ev('deck.term_added', 'd1', { termId: 'c', caseId: 'c1' }), ev('term.favorited', 'd', { caseId: 'c9' }), ev('term.favorited', 'a', {})];
    expect(termsOfCase('c1', all, { linkedFachbegriffeIds: ['a'] }, events).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});
```
Et dans `index.test.ts` (Task 3 F1) ajouter : `await toggleFavorite('fb-9', { caseId: 'c1' }); expect((await db.progress_events.toArray()).at(-1)?.payload).toEqual({ caseId: 'c1' });`.

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/collections/caseTerms.test.ts src/lib/collections/index.test.ts`
Expected: FAIL

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/collections/caseTerms.ts
import type { Case, Fachbegriff } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
/** Termes du cas = liés par le contenu ∪ marqués (★ / deck) pendant une session sur ce cas (spec F2a D5). */
export function termsOfCase(caseId: string, all: Fachbegriff[], c: Pick<Case, 'linkedFachbegriffeIds'>, events: ProgressEvent[]): Fachbegriff[] {
  const ids = new Set(c.linkedFachbegriffeIds);
  for (const e of events) {
    const p = (e.payload ?? {}) as { caseId?: string; termId?: string };
    if (p.caseId !== caseId) continue;
    if (e.type === 'term.favorited' && e.subject_id) ids.add(e.subject_id);
    if (e.type === 'deck.term_added' && p.termId) ids.add(p.termId);
  }
  return all.filter((b) => ids.has(b.id));
}
```
`index.ts` : `toggleFavorite(termId, opts = {})` → `emit(is ? 'term.unfavorited' : 'term.favorited', termId, opts.caseId ? { caseId: opts.caseId } : {})` ; `addToDeck(deckId, termId, opts = {})` → payload `{ termId, ...(opts.caseId ? { caseId: opts.caseId } : {}) }`.

`sync-protocol.md` : dans la phrase F1, après `term.favorited` / `term.unfavorited` et `deck.term_added`, ajouter « (payload `caseId?` optionnel : le cas pendant lequel le terme a été marqué — F2a ; ignoré par la projection des collections) ».

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/collections && npm run typecheck`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add docs/contracts/sync-protocol.md src/lib/collections/caseTerms.ts src/lib/collections/caseTerms.test.ts src/lib/collections/index.ts src/lib/collections/index.test.ts
git commit -m "feat(contrat): caseId optionnel sur term.favorited/deck.term_added ; termsOfCase (liés ∪ marqués pendant le cas)"
```

---

### Task 6 : Programme — bloc drill sur les vrais compteurs

**Files:**
- Modify: `app/src/lib/program.ts:176-185` (bloc drill), signature `generateProgram` (+ `budget?: { remaining: number }` dans `data`)
- Modify: `app/src/features/program/ProgramPage.tsx` (passer le budget ; lien `?specialty=`)
- Test: `app/src/lib/program.test.ts` (ajouter des cas)

**Interfaces:**
- Consumes: `counts` (T1), `loadDrillContext` (T3)
- Produces: `generateProgram(config, data: { cases; sims; begriffe; drillBudget?: number }, …)` — le bloc drill : `label: \`Drill · ${k} dus + ${n} nouveaux (≈ ${m} min)\``, `estMin: m`, `specialty` du bloc simulation du même jour ; absent si `k + n = 0`.

- [ ] **Step 1 : test qui échoue**

```ts
// dans app/src/lib/program.test.ts (créer si absent, sinon ajouter)
import { describe, it, expect } from 'vitest';
import { generateProgram } from './program';
import { freshSrs, reviewSrs } from '@/lib/srs';
import type { Fachbegriff, Case } from '@/db/types';

const now = new Date(Date.UTC(2026, 8, 17, 12));   // jeudi
const fb = (id: string, srs: Fachbegriff['srs']): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs });
const config = { examDate: '2026-10-30', weekdays: [1, 2, 3, 4, 5] } as never;   // adapter aux champs réels de ProgramConfig

describe('bloc drill (F2a 3.7)', () => {
  it('libellé sur les vrais compteurs, estMin = ceil((k+n)×0,4)', () => {
    const due = reviewSrs(freshSrs(now.getTime() - 20 * 86400e3), 4, now.getTime() - 20 * 86400e3);
    const begriffe = [fb('a', due), fb('b', due), fb('c', freshSrs(now.getTime())), fb('d', freshSrs(now.getTime()))];
    const days = generateProgram(config, { cases: [] as Case[], sims: [], begriffe, drillBudget: 1 }, 7, now);
    const drill = days.flatMap((d) => d.blocks).find((b) => b.kind === 'drill')!;
    expect(drill.label).toBe('Drill · 2 dus + 1 nouveaux (≈ 2 min)');
    expect(drill.estMin).toBe(2);
  });
  it('absent quand rien à faire (0 dus, budget 0)', () => {
    const days = generateProgram(config, { cases: [] as Case[], sims: [], begriffe: [fb('c', freshSrs(now.getTime()))], drillBudget: 0 }, 7, now);
    expect(days.flatMap((d) => d.blocks).some((b) => b.kind === 'drill')).toBe(false);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/program.test.ts`
Expected: FAIL — libellé « Drill Fachbegriffe » et présence du bloc

- [ ] **Step 3 : implémentation**

Dans `program.ts`, remplacer la boucle drill (l.178-185) :
```ts
  // Drill quotidien : libellé sur les VRAIS compteurs (dus réels + nouveaux
  // dans le budget du jour) ; absent si rien à faire (spec F2a 3.7).
  const c = counts(data.begriffe, now.getTime());
  const fresh = Math.min(c.fresh, data.drillBudget ?? 10);
  const total = c.due + fresh;
  if (total > 0) for (let d = nextWorkingDay(start, config); d <= end; d = addDays(d, 1)) {
    if (!isWorkingDay(d, config)) continue;
    const dk = key(d);
    if (adj.skipDrillDates?.includes(dk)) continue;
    const simOfDay = (map.get(dk) ?? []).find((b) => b.kind === 'simulation');
    const estMin = Math.ceil(total * 0.4);
    add(d, { kind: 'drill', label: `Drill · ${c.due} dus + ${fresh} nouveaux (≈ ${estMin} min)`, estMin, axis: 'Fachbegriffe', id: `drill:${dk}`, specialty: simOfDay?.specialty, reason: 'Rappel espacé des termes dus, plus les nouveaux du budget du jour' });
  }
```
(adapter `map.get(dk)`/`simOfDay` au vrai nom de la structure des blocs du jour ; supprimer le relabel `Drill Fachbegriffe (${…} cartes)` l.249 devenu inutile.) Signature : `data: { cases: Case[]; sims: Simulation[]; begriffe: Fachbegriff[]; drillBudget?: number }`.

`ProgramPage.tsx` : là où `generateProgram` est appelé, charger `loadDrillContext()` (useEffect/useState) et passer `drillBudget: ctx?.remaining`. Lien du bloc drill : `/fachbegriffe/drill${b.specialty ? `?specialty=${encodeURIComponent(b.specialty)}` : ''}`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/program.test.ts src/features/program && npm run typecheck && npm run build`
Expected: exit 0 (si `ProgramPage` a des tests qui rendent le bloc drill, mocker `loadDrillContext`).

- [ ] **Step 5 : commit**

```bash
git add src/lib/program.ts src/lib/program.test.ts src/features/program/ProgramPage.tsx
git commit -m "feat(programme): bloc drill libellé sur les vrais compteurs (dus + nouveaux du budget), absent si rien à faire"
```

---

### Task 7 : Docs, preuve navigateur (AC-1, 7), contrat

**Files:**
- Modify: `CONTEXT.md` (vocabulaire : dû, nouveau, budget du jour, termes du cas)
- Create: `app/scripts/e2e/fachbegriffe-f2a.spec.md`

- [ ] **Step 1 : CONTEXT.md** — sous les bullets Favori/Deck :
```
- **Dû** : Fachbegriff déjà présenté (`state ≠ Neu`) dont l'échéance SM-2 est passée. Un **nouveau** (`Neu`) n'est jamais dû : il entre au drill dans le **budget du jour** (5–30, adaptatif), par ordre de pertinence (★, deck, cas récents, programme du jour).
- **Termes du cas** : termes liés au cas par occurrence dans ses textes (pipeline `linkCaseTerms`) ∪ termes marqués pendant une session sur ce cas (`payload.caseId`).
```
- [ ] **Step 2 : navigateur** (playwright-cli, dev server port libre, Supabase local avec contenu republié localement via `publishContent.mjs` pour avoir les liens ; compte premium) : AC-1 — base neuve : sous-titre « 0 dus · 10 nouveaux proposés » et accueil sans « 2266 » (mesure DOM du texte) ; AC-7 — ouvrir le tiroir d'un terme lié (ex. Hämatemesis) : « Erscheint in Fällen » non vide ; page d'un cas : « n Fachbegriffe » > 0. Consigner valeurs + captures dans le spec.md.
- [ ] **Step 3 : commit**

```bash
git add CONTEXT.md scripts/e2e/fachbegriffe-f2a.spec.md
git commit -m "docs(fachbegriffe): vocabulaire dû/nouveau/budget/termes du cas ; preuve navigateur F2a AC-1/7"
```

---

### Task 8 : Fin de branche et livraison

- [ ] Gates : `npm run typecheck && npx vitest run --dir src && npm run build` → 0 ; `node scripts/check*.mjs` (tous) → 0 ; `node scripts/testRls.mjs` → 0.
- [ ] Revues : `quality-branch-reviewer` (Opus) ; `product-pedagogy-designer` sur D2/D3 (budget, pertinence) ; `fsp-clinical-reviewer` sur un échantillon de 10 cas de `caseTermLinks.json` (faux positifs) ; `ux-user-advocate` (page, drill, programme). Un fixeur, re-revue.
- [ ] PR `gh pr create --base main --title "feat(fachbegriffe): F2a — SRS intelligent (Neu ≠ dû, budget, pertinence) et liaison cas↔termes par texte"`, CI verte.
- [ ] Au merge (main) : ajouter dans `.github/workflows/quality.yml` job `contrats` après `checkAllergyConflicts.mjs` : `- name: Liaison cas ↔ Fachbegriffe (texte)` / `run: node scripts/checkCaseTermLinks.mjs` ; le job `publish` republie le contenu (nouvelle version) → vérifier `content_versions` sur le projet EU et un cas avec ses liens (`select jsonb_array_length(payload->'linkedFachbegriffeIds') …`).
- [ ] Vérifier sur l'URL publique : compteurs de la page, tiroir d'un terme avec ses cas. Issue de suivis ; mémoire.
