# Fachbegriffe F2b — dans la simulation, hover-card ★, réglages quotidiens · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consulter et marquer les termes du cas pendant la simulation, réviser depuis la simulation (pause de session) et après (résultat, ancré cas → spécialité), marquer d'une ★ tout terme rencontré dans un texte (hover-card), et régler les quantités quotidiennes (auto × intensité, ou manuel façon Anki), synchronisées.

**Architecture:** Un nouvel événement `srs.settings_changed` projeté dans `meta['srs.settings']` ; `effectiveDaily()` fusionne réglages + budget F2a + intensité ; `buildDrillQueue` gagne `maxReviews`. Le drill accepte `?case=` (pool = `termsOfCase`). Un composant partagé `CaseTermsPanel` sert le runner (chip « Fachbegriffe (n) ») et la page du cas ; `TermHoverCard` remplace le `title` de l'autolink et lit un `CaseContext` pour le `caseId`. La pause de session existante (`minimize` + `ResumeSessionBar`) porte le drill « depuis la simulation ».

**Tech Stack:** React 18, Vite 7, Dexie 4 + dexie-react-hooks, Zustand, Vitest + @testing-library/react, Supabase Edge Function `events` (zod), playwright-cli.

Spec : `docs/superpowers/specs/2026-09-17-fachbegriffe-f2b-in-simulation-design.md`

## Global Constraints

- Branche `feat/fachbegriffe-f2b` depuis `main` ; worktree `../doctopus-fachbegriffe-f2b` (copier `app/.env` + `VITE_AUTH_MODE=founder`, `app/supabase/.env`). Commandes depuis `app/`. Node ≥ 22.
- Gates après chaque tâche : `npm run typecheck`, `npx vitest run --dir src` (**aussi sans `.env`** avant la PR), `npm run build` → exit 0 (flake #33 toléré). Tâche 1 : `node scripts/testRls.mjs` → 0.
- `docs/contracts/` modifié seulement en Tâche 1 (rôle `arch`). `.github/` intouché (main au merge).
- Événement `srs.settings_changed` : subject `'srs'`, payload `{ mode: 'auto' | 'manual'; newPerDay?: number; maxReviewsPerDay?: number }` ; projection = dernier par `occurred_at` → `meta['srs.settings']` ; défaut `{ mode: 'auto' }`.
- `SRS_LIMITS = { newPerDay: [0, 50], maxReviewsPerDay: [0, 200] }` ; auto : `newPerDay = round(budget × INTENSITY_FACTOR)` (leicht 0,8 / mittel 1 / intensiv 1,3), `maxReviewsPerDay = 200` ; `explain` = `"auto : 12/jour = 10 × intensif"` / `"manuel"`.
- `maxReviewsPerDay` plafonne les **dus présentés** (`reviewedToday` compté dans `meta['srs.reviewedToday:<date>']`, incrémenté à chaque note d'un terme non-Neu) ; les dus au-delà restent dus.
- Drill : `?case=` prime sur `?deck` ; pool = `termsOfCase` ; vide → bouton « Réviser la spécialité <specialty> » (`?specialty=`) + « Drill global ».
- Pause de session = `useSimSession.minimize()` existant ; aucun `simulation.completed` émis par le drill ; le chrono (`elapsed` du snapshot) ne bouge pas pendant le drill.
- Panneau et hover-card = référence libre : aucune écriture dans `results`/`assistance`.
- Hover-card : ouverture survol 150 ms / focus / tap (`pointer: coarse`) ; fermeture `mouseleave` 300 ms sauf carte survolée, Échap, clic extérieur, blur ; une seule carte (store `ui.hoverTerm`) ; ★ = `toggleFavorite(id, { caseId })` immédiat puis extension ; ≤ 280 px, jamais hors viewport ; cibles 44 px.
- Charte : tons existants (★ en `signal`), mouvement `transform/opacity` ≤ 150 ms, `prefers-reduced-motion` respecté.
- Stager fichier par fichier ; pas de Co-Authored-By ; vérifier par code de sortie ; mesurer depuis le DOM.
- Livraison : migration appliquée en EU + `events` redéployée **avant** merge.

---

### Task 1 : Contrat `srs.settings_changed` + projection (arch)

**Files:**
- Modify: `docs/contracts/sync-protocol.md` (ligne « Synchronisé »)
- Create: `app/supabase/migrations/20260917000012_srs_settings_event.sql`
- Modify: `app/supabase/functions/events/index.ts` (enum zod)
- Modify: `app/src/lib/sync/events.ts` (`ProgressEventType`)
- Create: `app/src/lib/srsSettings.ts` (type, limites, projection pure, `getSrsSettings`, `setSrsSettings`)
- Modify: `app/src/lib/sync/projections.ts` (`rebuildProjections` écrit `meta['srs.settings']`)
- Test: `app/src/lib/srsSettings.test.ts`, `app/supabase/tests/events.test.ts` (nouveau cas)

**Interfaces:**
- Produces:
  ```ts
  export interface SrsSettings { mode: 'auto' | 'manual'; newPerDay?: number; maxReviewsPerDay?: number }
  export const SRS_LIMITS = { newPerDay: [0, 50], maxReviewsPerDay: [0, 200] } as const;
  export const DEFAULT_SRS_SETTINGS: SrsSettings = { mode: 'auto' };
  export function projectSrsSettings(events: ProgressEvent[]): SrsSettings;     // dernier srs.settings_changed par occurred_at (sortEvents), sinon défaut ; valeurs bornées
  export async function getSrsSettings(): Promise<SrsSettings>;                 // meta['srs.settings'] ?? défaut
  export async function setSrsSettings(s: SrsSettings): Promise<void>;          // événement + meta immédiat
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/srsSettings.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { projectSrsSettings, getSrsSettings, setSrsSettings, DEFAULT_SRS_SETTINGS } from './srsSettings';
import type { ProgressEvent } from '@/lib/sync/events';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});
const ev = (payload: unknown, t: number, id = `s${t}`): ProgressEvent => ({ id, user_id: 'u', type: 'srs.settings_changed', subject_id: 'srs', payload, occurred_at: new Date(Date.UTC(2026, 8, 17, 10, 0, t)).toISOString() });

describe('projectSrsSettings', () => {
  it('défaut auto sans événement', () => expect(projectSrsSettings([])).toEqual(DEFAULT_SRS_SETTINGS));
  it('dernier par occurred_at gagne, valeurs bornées', () => {
    const s = projectSrsSettings([ev({ mode: 'manual', newPerDay: 5, maxReviewsPerDay: 20 }, 1), ev({ mode: 'manual', newPerDay: 99, maxReviewsPerDay: -3 }, 2)]);
    expect(s).toEqual({ mode: 'manual', newPerDay: 50, maxReviewsPerDay: 0 });
  });
  it('payload inconnu → défaut', () => expect(projectSrsSettings([ev({ mode: 'weird' }, 1)])).toEqual(DEFAULT_SRS_SETTINGS));
});

describe('get/setSrsSettings', () => {
  beforeEach(async () => { await db.meta.clear(); await db.progress_events.clear(); });
  it('set émet srs.settings_changed et met meta à jour ; get relit', async () => {
    await setSrsSettings({ mode: 'manual', newPerDay: 8, maxReviewsPerDay: 40 });
    expect((await db.progress_events.toArray()).find((e) => e.type === 'srs.settings_changed')?.payload).toEqual({ mode: 'manual', newPerDay: 8, maxReviewsPerDay: 40 });
    expect(await getSrsSettings()).toEqual({ mode: 'manual', newPerDay: 8, maxReviewsPerDay: 40 });
  });
});
```

Dans `app/supabase/tests/events.test.ts`, après le cas « accepte les événements de collections » :
```ts
  it('accepte srs.settings_changed', async () => {
    const r = await post(A, [{ id: crypto.randomUUID(), type: 'srs.settings_changed', subject_id: 'srs', payload: { mode: 'manual', newPerDay: 5 }, occurred_at: '2026-09-17T11:00:00Z' }]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(1);
  });
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/srsSettings.test.ts` → FAIL (module introuvable) ; `node scripts/testRls.mjs; echo exit=$?` → ≠ 0 (400 sur le nouveau type).

- [ ] **Step 3 : implémentation**

Migration `20260917000012_srs_settings_event.sql` :
```sql
-- 20260917000012_srs_settings_event.sql — Fachbegriffe F2b : réglages quotidiens
-- du SRS (auto/manuel, nouveaux/jour, plafond de dus) synchronisés par événement.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed'
));
```
Zod (`events/index.ts`) et `ProgressEventType` (`events.ts`) : ajouter `'srs.settings_changed'` en fin de liste.

```ts
// app/src/lib/srsSettings.ts
// ============================================================================
// Réglages quotidiens du SRS (spec F2b D5/D6) : auto (budget × intensité) ou
// manuel (nouveaux/jour, plafond de dus présentés). Par personne, synchronisés
// via l'événement srs.settings_changed ; projection = meta['srs.settings'].
// ============================================================================
import { getMeta, setMeta } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import type { ProgressEvent } from '@/lib/sync/events';
import { sortEvents } from '@/lib/collections/project';

export interface SrsSettings { mode: 'auto' | 'manual'; newPerDay?: number; maxReviewsPerDay?: number }
export const SRS_LIMITS = { newPerDay: [0, 50], maxReviewsPerDay: [0, 200] } as const;
export const DEFAULT_SRS_SETTINGS: SrsSettings = { mode: 'auto' };
export const SRS_SETTINGS_KEY = 'srs.settings';

const clamp = (v: unknown, [lo, hi]: readonly [number, number]) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined);
export function sanitize(p: unknown): SrsSettings {
  const o = (p ?? {}) as Record<string, unknown>;
  if (o.mode !== 'auto' && o.mode !== 'manual') return DEFAULT_SRS_SETTINGS;
  const s: SrsSettings = { mode: o.mode };
  const n = clamp(o.newPerDay, SRS_LIMITS.newPerDay); if (n !== undefined) s.newPerDay = n;
  const m = clamp(o.maxReviewsPerDay, SRS_LIMITS.maxReviewsPerDay); if (m !== undefined) s.maxReviewsPerDay = m;
  return s;
}
export function projectSrsSettings(events: ProgressEvent[]): SrsSettings {
  const last = sortEvents(events).filter((e) => e.type === 'srs.settings_changed').at(-1);
  return last ? sanitize(last.payload) : DEFAULT_SRS_SETTINGS;
}
export const getSrsSettings = () => getMeta<SrsSettings>(SRS_SETTINGS_KEY, DEFAULT_SRS_SETTINGS);
export async function setSrsSettings(s: SrsSettings): Promise<void> {
  const clean = sanitize(s);
  await syncQueue.push({ type: 'srs.settings_changed', subject_id: 'srs', payload: clean });
  await setMeta(SRS_SETTINGS_KEY, clean);
}
```
(`.at(-1)` : si le tsconfig `lib` ne l'a pas, utiliser `arr[arr.length - 1]`.)

`projections.ts` : après `writeCollections(...)`, ajouter `await setMeta('srs.settings', projectSrsSettings(events));` (importer `setMeta`, `projectSrsSettings`).

`sync-protocol.md` : ajouter à la phrase « **Synchronisé** » : « `srs.settings_changed` (subject `srs`, payload `{ mode: 'auto'|'manual', newPerDay?, maxReviewsPerDay? }`, dernier par `occurred_at` → `meta['srs.settings']`) — F2b. »

- [ ] **Step 4 : appliquer localement, vérifier**

Run: `docker exec supabase_db_app psql -U postgres -f - < supabase/migrations/20260917000012_srs_settings_event.sql` (ou `docker exec -i … psql … < fichier`) ; redémarrer `supabase functions serve --env-file supabase/.env` depuis ce worktree ; `node scripts/testRls.mjs; echo exit=$?` → 0 ; `npx vitest run src/lib/srsSettings.test.ts src/lib/sync && npm run typecheck` → 0 ; `node scripts/dumpSchema.mjs` → `git diff docs/contracts/schema.sql` = la contrainte seulement.

- [ ] **Step 5 : commit**

```bash
git add docs/contracts/sync-protocol.md docs/contracts/schema.sql supabase/migrations/20260917000012_srs_settings_event.sql supabase/functions/events/index.ts src/lib/sync/events.ts src/lib/srsSettings.ts src/lib/srsSettings.test.ts src/lib/sync/projections.ts supabase/tests/events.test.ts
git commit -m "feat(contrat): srs.settings_changed — réglages quotidiens du SRS synchronisés (F2b)"
```

---

### Task 2 : Réglages effectifs, plafond de dus, drill `?case=`

**Files:**
- Modify: `app/src/lib/srsSettings.ts` (+ `effectiveDaily`)
- Modify: `app/src/lib/program.ts` (exporter `INTENSITY_FACTOR`)
- Modify: `app/src/lib/srsBudget.ts` (+ `reviewedKey`, `reviewedToday`, `markReviewed`)
- Modify: `app/src/lib/collections/drillQueue.ts` (+ `maxReviews`)
- Modify: `app/src/lib/collections/drillContext.ts` (`DrillContext` + `settings`, `daily`, `reviewsRemaining`, `caseName?`)
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (`?case=`, pool, titre, état vide → spécialité, `markReviewed`)
- Test: `app/src/lib/srsSettings.test.ts` (+), `app/src/lib/collections/drillQueue.test.ts` (+), `app/src/features/fachbegriffe/DrillPage.test.tsx` (+)

**Interfaces:**
- Consumes: Task 1 ; F2a (`newBudget`, `remainingToday`, `termsOfCase`, `RelevanceContext`, `loadDrillContext`)
- Produces:
  ```ts
  // srsSettings.ts
  export function effectiveDaily(s: SrsSettings, auto: { budget: number; intensity: Intensity }): { newPerDay: number; maxReviewsPerDay: number; source: 'auto' | 'manual'; explain: string };
  // program.ts
  export const INTENSITY_FACTOR: Record<Intensity, number>;
  // srsBudget.ts
  export const reviewedKey = (d: Date) => `srs.reviewedToday:${dayKey(d)}`;
  export const reviewedToday = (now?: Date) => Promise<number>;
  export async function markReviewed(now?: Date): Promise<void>;
  // drillQueue.ts — DrillOpts gagne `maxReviews?: number` (dus présentés ≤ maxReviews)
  // drillContext.ts
  export interface DrillContext { relevance; budget; remaining; settings: SrsSettings; daily: ReturnType<typeof effectiveDaily>; reviewsRemaining: number }
  // remaining = min(remainingToday(daily.newPerDay), …) ; reviewsRemaining = max(0, daily.maxReviewsPerDay − reviewedToday)
  ```

- [ ] **Step 1 : tests qui échouent**

Ajouter à `srsSettings.test.ts` :
```ts
import { effectiveDaily } from './srsSettings';
describe('effectiveDaily', () => {
  it('auto = budget × intensité, arrondi, expliqué', () => {
    expect(effectiveDaily({ mode: 'auto' }, { budget: 10, intensity: 'intensiv' })).toEqual({ newPerDay: 13, maxReviewsPerDay: 200, source: 'auto', explain: 'auto : 13/jour = 10 × intensif' });
    expect(effectiveDaily({ mode: 'auto' }, { budget: 10, intensity: 'leicht' }).newPerDay).toBe(8);
  });
  it('manuel = valeurs stockées (défauts 10 / 200 si absentes)', () => {
    expect(effectiveDaily({ mode: 'manual', newPerDay: 5, maxReviewsPerDay: 20 }, { budget: 30, intensity: 'mittel' })).toEqual({ newPerDay: 5, maxReviewsPerDay: 20, source: 'manual', explain: 'manuel' });
    expect(effectiveDaily({ mode: 'manual' }, { budget: 30, intensity: 'mittel' })).toMatchObject({ newPerDay: 10, maxReviewsPerDay: 200 });
  });
});
```
Ajouter à `drillQueue.test.ts` :
```ts
  it('maxReviews plafonne les dus présentés ; les nouveaux restent possibles', () => {
    const pool = [...Array.from({ length: 60 }, (_, i) => mk(`d${i}`, 'Gelernt', -1)), mk('n1', 'Neu', 0)];
    const q = buildDrillQueue(pool, { now, newLimit: 1, maxReviews: 20, limit: 100 });
    expect(q.filter((b) => b.srs.state !== 'Neu')).toHaveLength(20);
    expect(q.some((b) => b.id === 'n1')).toBe(true);
  });
```
Ajouter à `DrillPage.test.tsx` (mock `loadDrillContext` comme F2a, avec `settings`, `daily`, `reviewsRemaining`) :
```tsx
  it('?case= restreint le pool aux termes du cas et titre « Termes de <cas> » ; vide → bouton spécialité', async () => {
    await db.cases.put({ id: 'c1', name: 'Ulcus ventriculi', specialty: 'Gastroenterologie', linkedFachbegriffeIds: ['fb-a'] } as never);
    await db.fachbegriffe.bulkPut([{ id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }, { id: 'fb-z', term: 'Zyste', translationSimple: 'Z', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }] as never);
    render(<MemoryRouter initialEntries={['/fachbegriffe/drill?case=c1']}><DrillPage /></MemoryRouter>);
    expect(await screen.findByText(/Termes de Ulcus ventriculi/)).toBeTruthy();
    expect(screen.getByText(/1 nouveaux/)).toBeTruthy();          // fb-a seulement, jamais fb-z
    // pool vide (budget 0) → spécialité proposée
  });
  it('?case= sans rien à réviser → « Réviser la spécialité »', async () => {
    // remaining: 0 dans le mock → file vide
    await db.cases.put({ id: 'c2', name: 'Angina', specialty: 'Kardiologie', linkedFachbegriffeIds: ['fb-k'] } as never);
    await db.fachbegriffe.put({ id: 'fb-k', term: 'Koronar', translationSimple: 'K', specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never);
    render(<MemoryRouter initialEntries={['/fachbegriffe/drill?case=c2']}><DrillPage /></MemoryRouter>);
    const btn = await screen.findByRole('link', { name: /Réviser la spécialité Kardiologie/ });
    expect(btn.getAttribute('href')).toContain('specialty=Kardiologie');
  });
```
(Le second test utilise un mock `loadDrillContext` avec `remaining: 0` — exposer deux mocks ou `vi.mocked(loadDrillContext).mockResolvedValueOnce(...)`.)

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/srsSettings.test.ts src/lib/collections/drillQueue.test.ts src/features/fachbegriffe/DrillPage.test.tsx` → FAIL

- [ ] **Step 3 : implémentation**

`program.ts` : `export const INTENSITY_FACTOR …` (retirer `const`). Libellés : `const INTENSITY_LABEL: Record<Intensity, string> = { leicht: 'léger', mittel: 'moyen', intensiv: 'intensif' }` dans `srsSettings.ts`.

`srsSettings.ts` :
```ts
import { INTENSITY_FACTOR } from '@/lib/program';
import type { Intensity } from '@/db/types';
const INTENSITY_LABEL: Record<Intensity, string> = { leicht: 'léger', mittel: 'moyen', intensiv: 'intensif' };
export function effectiveDaily(s: SrsSettings, auto: { budget: number; intensity: Intensity }) {
  if (s.mode === 'manual') return { newPerDay: s.newPerDay ?? 10, maxReviewsPerDay: s.maxReviewsPerDay ?? 200, source: 'manual' as const, explain: 'manuel' };
  const newPerDay = Math.max(SRS_LIMITS.newPerDay[0], Math.min(SRS_LIMITS.newPerDay[1], Math.round(auto.budget * INTENSITY_FACTOR[auto.intensity])));
  return { newPerDay, maxReviewsPerDay: 200, source: 'auto' as const, explain: `auto : ${newPerDay}/jour = ${auto.budget} × ${INTENSITY_LABEL[auto.intensity]}` };
}
```
Attention à l'import circulaire `program.ts` ↔ `srsSettings.ts` : `program.ts` ne doit pas importer `srsSettings` ; si nécessaire, placer `INTENSITY_FACTOR` dans `src/lib/intensity.ts` importé des deux côtés.

`srsBudget.ts` :
```ts
export const reviewedKey = (d: Date) => `srs.reviewedToday:${dayKey(d)}`;
export const reviewedToday = (now = new Date()) => getMeta<number>(reviewedKey(now), 0);
export async function markReviewed(now = new Date()): Promise<void> { await setMeta(reviewedKey(now), (await reviewedToday(now)) + 1); }
```

`drillQueue.ts` : dans `DrillOpts`, `maxReviews?: number` ; après le tri des dus : `const dueShown = opts.maxReviews !== undefined ? due.slice(0, Math.max(0, opts.maxReviews)) : due;` et utiliser `dueShown` partout où `due` servait (réserve de 3 Neu incluse).

`drillContext.ts` : lire `getSrsSettings()` et `config?.intensity ?? 'mittel'` ; `const daily = effectiveDaily(settings, { budget, intensity })` ; `remaining = await remainingToday(daily.newPerDay, now)` ; `reviewsRemaining = Math.max(0, daily.maxReviewsPerDay - await reviewedToday(now))` ; retourner `{ relevance, budget, remaining, settings, daily, reviewsRemaining }`. Les appelants existants (Fachbegriffe page, programme) continuent de lire `remaining`/`budget`.

`DrillPage.tsx` :
- `const caseId = params.get('case');` ; charger `const theCase = useLiveQuery(() => caseId ? db.cases.get(caseId) : undefined, [caseId])` et `events` (`db.progress_events.toArray()` une fois, `useLiveQuery`) ; `pool = caseId && theCase ? termsOfCase(caseId, begriffe, theCase, events ?? []) : deck ? … : begriffe` (`?case` prime).
- `buildQueue` passe `maxReviews: ctx?.reviewsRemaining`.
- Titre : `Drill Fachbegriffe · Termes de ${theCase.name}` quand `caseId`.
- État vide en mode cas : « Rien à réviser dans ce cas aujourd'hui. » + `<Link to={`/fachbegriffe/drill?specialty=${encodeURIComponent(theCase.specialty)}`} className="btn-primary">Réviser la spécialité {theCase.specialty}</Link>` + « Drill global ».
- `grade()` : `if (!wasNew) void markReviewed();`.
- « ✕ Quitter » en mode cas : `to={`/simulation/${caseId}`}` si une session est en pause pour ce cas (`useSimSession.getState().snapshot?.caseId === caseId && minimized`), sinon `/cas/${caseId}`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib src/features/fachbegriffe && npm run typecheck && npm run build` → 0

- [ ] **Step 5 : commit**

```bash
git add src/lib/srsSettings.ts src/lib/srsSettings.test.ts src/lib/program.ts src/lib/intensity.ts src/lib/srsBudget.ts src/lib/collections/drillQueue.ts src/lib/collections/drillQueue.test.ts src/lib/collections/drillContext.ts src/features/fachbegriffe/DrillPage.tsx src/features/fachbegriffe/DrillPage.test.tsx
git commit -m "feat(fachbegriffe): réglages effectifs (auto × intensité / manuel), plafond de dus, drill ancré ?case= → spécialité"
```
(retirer `src/lib/intensity.ts` de la liste s'il n'a pas été créé.)

---

### Task 3 : `CaseTermsPanel` + chip dans le runner + drill en pause de session + résultat

**Files:**
- Create: `app/src/features/fachbegriffe/CaseTermsPanel.tsx`
- Create: `app/src/features/fachbegriffe/CaseContext.tsx` (`CaseContext`, `useCaseId()`)
- Modify: `app/src/features/simulation/SimulationRunner.tsx` (chip « Fachbegriffe (n) », état `termsOpen`, `<CaseContext.Provider>`, `ResultScreen` lien `?case=`)
- Modify: `app/src/features/cases/CaseDetailPage.tsx` (section termes → `CaseTermsPanel` inline + Provider)
- Test: `app/src/features/fachbegriffe/CaseTermsPanel.test.tsx`, `app/src/features/simulation/ResultScreen.test.tsx` (lien)

**Interfaces:**
- Consumes: `termsOfCase`, `toggleFavorite(id, { caseId })`, `useFavorites`, `SRS_TONE`, `useSimSession.minimize`, `counts`
- Produces:
  ```tsx
  export const CaseContext = createContext<string | null>(null); export const useCaseId = () => useContext(CaseContext);
  export function CaseTermsPanel(props: { caseId: string; mode: 'drawer' | 'inline'; onClose?: () => void; onDrill: () => void }): JSX.Element;
  ```

- [ ] **Step 1 : tests qui échouent**

```tsx
// app/src/features/fachbegriffe/CaseTermsPanel.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { CaseTermsPanel } from './CaseTermsPanel';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } }; });

describe('CaseTermsPanel', () => {
  beforeEach(async () => {
    await db.cases.clear(); await db.fachbegriffe.clear(); await db.progress_events.clear(); await db.favorites.clear();
    await db.cases.put({ id: 'c1', name: 'Ulcus', specialty: 'Gastroenterologie', linkedFachbegriffeIds: ['fb-b', 'fb-a'] } as never);
    await db.fachbegriffe.bulkPut([{ id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }, { id: 'fb-b', term: 'Blutung', translationSimple: 'B', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }] as never);
  });
  it('liste les termes du cas dans l\'ordre publié, compteur, ★ émet term.favorited avec caseId', async () => {
    const onDrill = vi.fn();
    render(<MemoryRouter><CaseTermsPanel caseId="c1" mode="inline" onDrill={onDrill} /></MemoryRouter>);
    expect(await screen.findByText(/Fachbegriffe du cas \(2\)/)).toBeTruthy();
    const rows = screen.getAllByRole('listitem'); expect(rows[0].textContent).toContain('Blutung');
    fireEvent.click(screen.getByRole('button', { name: /Ajouter aux favoris : Blutung/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c1' }));
    fireEvent.click(screen.getByRole('button', { name: /Drill ces termes/ }));
    expect(onDrill).toHaveBeenCalled();
  });
  it('recherche locale filtre', async () => {
    render(<MemoryRouter><CaseTermsPanel caseId="c1" mode="inline" onDrill={() => {}} /></MemoryRouter>);
    await screen.findByText('Abdomen');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'blut' } });
    expect(screen.queryByText('Abdomen')).toBeNull(); expect(screen.getByText('Blutung')).toBeTruthy();
  });
});
```

```tsx
// app/src/features/simulation/ResultScreen.test.tsx — vérifier d'abord si ResultScreen est exporté ; sinon l'exporter.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
import { ResultScreen } from './SimulationRunner';
it('le lien drill est ancré sur le cas', () => {
  render(<MemoryRouter><ResultScreen sim={{ id: 's', caseId: 'c1', date: Date.now(), role: 'arzt', parts: {} } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Drill des termes du cas/ }).getAttribute('href')).toContain('case=c1');
});
```
(Adapter les props réelles de `ResultScreen` en lisant sa signature — le test doit rendre sans crash ; mocker ce qui manque.)

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/features/fachbegriffe/CaseTermsPanel.test.tsx src/features/simulation/ResultScreen.test.tsx` → FAIL

- [ ] **Step 3 : implémentation**

```tsx
// app/src/features/fachbegriffe/CaseContext.tsx
import { createContext, useContext } from 'react';
/** Cas courant (page du cas, runner) : la hover-card et le panneau y attachent `caseId` aux ★. */
export const CaseContext = createContext<string | null>(null);
export const useCaseId = () => useContext(CaseContext);
```

```tsx
// app/src/features/fachbegriffe/CaseTermsPanel.tsx
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useFachbegriffe, useFavorites } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { termsOfCase } from '@/lib/collections/caseTerms';
import { toggleFavorite } from '@/lib/collections';
import { counts } from '@/lib/stats';
import { SRS_TONE } from '@/lib/srsTone';
import { Icon } from '@/components/icons';

// Termes du cas (liés ∪ marqués pendant ce cas), ordre publié : diagnostic →
// spécifiques → contextuels. Référence LIBRE (F2a D6) : n'écrit ni résultat ni
// assistance. Partagé par le runner (tiroir) et la page du cas (inline).
interface Props { caseId: string; mode: 'drawer' | 'inline'; onClose?: () => void; onDrill: () => void }
export function CaseTermsPanel({ caseId, mode, onClose, onDrill }: Props) {
  const begriffe = useFachbegriffe(); const favorites = useFavorites();
  const theCase = useLiveQuery(() => db.cases.get(caseId), [caseId]);
  const events = useLiveQuery(() => db.progress_events.where('type').anyOf(['term.favorited', 'deck.term_added']).toArray(), []);
  const openGlossary = useUi((s) => s.openGlossary);
  const [q, setQ] = useState('');
  const terms = useMemo(() => (begriffe && theCase ? termsOfCase(caseId, begriffe, theCase, events ?? []) : []), [begriffe, theCase, events, caseId]);
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return n ? terms.filter((t) => `${t.term} ${t.translationSimple}`.toLowerCase().includes(n)) : terms; }, [terms, q]);
  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.termId)), [favorites]);
  const c = counts(terms);
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 p-3">
        <div><div className="label">Fachbegriffe du cas ({terms.length})</div><div className="text-xs text-slate-500">{c.due} dus · {c.fresh} nouveaux</div></div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onDrill} className="btn-primary min-h-11 gap-1.5 text-sm"><Icon name="nav-abc" className="h-4 w-4" />Drill ces termes</button>
          {onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="btn-ghost min-h-11 min-w-11 justify-center">✕</button>}
        </div>
      </div>
      <div className="px-3 pb-2"><input type="search" role="searchbox" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="input w-full" /></div>
      <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {shown.map((t) => { const fav = favSet.has(t.id); const tone = SRS_TONE[t.srs.state]; return (
          <li key={t.id} className="flex min-h-11 items-center gap-2 px-2">
            <button type="button" onClick={() => openGlossary(t)} className="flex min-w-0 flex-1 flex-col items-start px-2 text-left"><span className="truncate font-semibold text-brand-700 dark:text-brand-300">{t.term}</span><span className="truncate text-xs text-slate-500">{t.translationSimple}</span></button>
            <span role="img" aria-label={t.srs.state} className={`chip shrink-0 ${tone.chip}`}>{t.srs.state === 'Zu wiederholen' ? '↻' : t.srs.state[0]}</span>
            <button type="button" aria-pressed={fav} aria-label={fav ? `Retirer des favoris : ${t.term}` : `Ajouter aux favoris : ${t.term}`} onClick={() => { void toggleFavorite(t.id, { caseId }); }} className={`h-11 w-11 shrink-0 text-lg ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
          </li>); })}
        {shown.length === 0 && <li className="p-4 text-sm text-slate-500">Aucun terme.</li>}
      </ul>
    </>
  );
  if (mode === 'inline') return <div className="card flex max-h-[60vh] flex-col p-0">{body}</div>;
  return (<>
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
    <aside className="glass glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col">{body}</aside>
  </>);
}
```
Vérifier l'index `type` sur `progress_events` (`db.ts` version 2 : `progress_events: 'id, user_id, type, subject_id, …'` — oui) ; sinon `toArray()` + filtre.

`SimulationRunner.tsx` :
- imports `CaseTermsPanel`, `CaseContext`, `useNavigate` (déjà ?), `useSimSession`.
- état `const [termsOpen, setTermsOpen] = useState(false);`
- chip à côté d'Aufklärung (même bloc `absolute right-4 top-[8px]`) : `<button onClick={() => setTermsOpen(true)} className="chip shrink-0 bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" title="Termes du cas — référence libre"><Icon name="nav-abc" className="h-3.5 w-3.5" />Fachbegriffe ({termCount})</button>` où `termCount` = `termsOfCase(...)`.length via un petit `useLiveQuery` (ou `c.linkedFachbegriffeIds.length` comme approximation acceptable — préférer le vrai compte).
- rendu : `{termsOpen && <CaseTermsPanel caseId={c.id} mode="drawer" onClose={() => setTermsOpen(false)} onDrill={() => { useSimSession.getState().minimize(); navigate(`/fachbegriffe/drill?case=${c.id}`); }} />}` — le snapshot est déjà synchronisé par l'effet existant (`useSimSession.getState().sync(...)`) ; s'assurer qu'un `sync` a eu lieu avant `minimize` (appeler l'effet de sync explicitement si nécessaire).
- Envelopper le rendu du runner dans `<CaseContext.Provider value={c.id}>`.
- `ResultScreen` : `to={`/fachbegriffe/drill?case=${c.id}`}` ; exporter `ResultScreen`.

`CaseDetailPage.tsx` : remplacer la liste de termes par `<CaseContext.Provider value={c.id}><CaseTermsPanel caseId={c.id} mode="inline" onDrill={() => navigate(`/fachbegriffe/drill?case=${c.id}`)} /></CaseContext.Provider>` (garder le titre de section existant).

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/fachbegriffe src/features/simulation src/features/cases && npm run typecheck && npm run build` → 0

- [ ] **Step 5 : commit**

```bash
git add src/features/fachbegriffe/CaseContext.tsx src/features/fachbegriffe/CaseTermsPanel.tsx src/features/fachbegriffe/CaseTermsPanel.test.tsx src/features/simulation/SimulationRunner.tsx src/features/simulation/ResultScreen.test.tsx src/features/cases/CaseDetailPage.tsx
git commit -m "feat(fachbegriffe): panneau des termes du cas dans le runner (référence libre), drill en pause de session, résultat ancré ?case="
```

---

### Task 4 : `TermHoverCard` sur l'autolink

**Files:**
- Create: `app/src/components/TermHoverCard.tsx`
- Modify: `app/src/store/ui.ts` (`hoverTerm: { fb: Fachbegriff; anchor: DOMRect } | null`, `openHover`, `closeHover`)
- Modify: `app/src/lib/autolink.tsx` (`AutoLinkText` : `onHover?`, `onTap?` ; retirer `title`)
- Modify: `app/src/components/AutoLink.tsx` (branche hover/tap, rend `<TermHoverCard/>` une fois via `Shell` — voir note)
- Modify: `app/src/components/Shell.tsx` (monter `<TermHoverCard />` à côté de `<GlossaryDrawer />`)
- Test: `app/src/components/TermHoverCard.test.tsx`

**Interfaces:**
- Consumes: `toggleFavorite(id, { caseId })`, `useCaseId()`, `useFavorites`, `useDecks/useDeckTerms`, `addToDeck/removeFromDeck/createDeck`, `useUi.openGlossary`
- Produces: `export function TermHoverCard(): JSX.Element | null` (lit `ui.hoverTerm`).

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/components/TermHoverCard.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { freshSrs } from '@/lib/srs';
import { TermHoverCard } from './TermHoverCard';
import { CaseContext } from '@/features/fachbegriffe/CaseContext';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } }; });
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never;
const anchor = { top: 100, left: 100, width: 60, height: 20, bottom: 120, right: 160 } as DOMRect;

describe('TermHoverCard', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.favorites.clear(); await db.decks.clear(); useUi.setState({ hoverTerm: null }); });
  it('rien sans hoverTerm ; ouverte → terme, formulation, ★', async () => {
    const { rerender } = render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useUi.getState().openHover(fb, anchor));
    rerender(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Abdomen')).toBeTruthy(); expect(screen.getByText('Bauch')).toBeTruthy();
  });
  it('★ = favori immédiat avec caseId du contexte, puis extension deck ; second ★ retire', async () => {
    act(() => useUi.getState().openHover(fb, anchor));
    render(<MemoryRouter><CaseContext.Provider value="c9"><TermHoverCard /></CaseContext.Provider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c9' }));
    expect(await screen.findByRole('button', { name: /Ajouter à un deck/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Retirer des favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).some((e) => e.type === 'term.unfavorited')).toBe(true));
  });
  it('Échap et clic extérieur ferment', async () => {
    act(() => useUi.getState().openHover(fb, anchor));
    render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    act(() => useUi.getState().openHover(fb, anchor));
    await screen.findByRole('dialog');
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/components/TermHoverCard.test.tsx` → FAIL

- [ ] **Step 3 : implémentation**

`ui.ts` : `hoverTerm: { fb: Fachbegriff; anchor: DOMRect } | null; openHover: (fb, anchor) => void; closeHover: () => void;` (init `null`).

```tsx
// app/src/components/TermHoverCard.tsx
import { useEffect, useRef, useState } from 'react';
import { useUi } from '@/store/ui';
import { useFavorites, useDecks, useDeckTerms } from '@/hooks/useData';
import { toggleFavorite, addToDeck, removeFromDeck, createDeck } from '@/lib/collections';
import { useCaseId } from '@/features/fachbegriffe/CaseContext';
import { SRS_TONE } from '@/lib/srsTone';

// Hover-card ★ (spec F2b D2/D3) : une seule carte, ancrée sur le terme survolé
// ou tapé ; ★ = favori immédiat (+caseId en contexte de cas) puis extension
// (deck, fiche). Mouvement : opacity/transform ≤ 150 ms, reduced-motion respecté.
const W = 280;
export function TermHoverCard() {
  const hover = useUi((s) => s.hoverTerm); const close = useUi((s) => s.closeHover); const openGlossary = useUi((s) => s.openGlossary);
  const caseId = useCaseId();
  const favorites = useFavorites(); const decks = useDecks(); const deckTerms = useDeckTerms();
  const [expanded, setExpanded] = useState(false); const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setExpanded(false); setNewName(''); }, [hover?.fb.id]);
  useEffect(() => {
    if (!hover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [hover, close]);
  if (!hover) return null;
  const { fb, anchor } = hover;
  const fav = !!favorites?.some((f) => f.termId === fb.id);
  const manual = (decks ?? []).filter((d) => d.kind === 'manual');
  const inDeck = (id: string) => !!deckTerms?.some((t) => t.deckId === id && t.termId === fb.id);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024, vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const left = Math.max(8, Math.min(anchor.left, vw - W - 8));
  const below = anchor.bottom + 8 + 160 < vh;
  const style: React.CSSProperties = { position: 'fixed', left, width: W, ...(below ? { top: anchor.bottom + 8 } : { bottom: vh - anchor.top + 8 }), zIndex: 60 };
  const star = async () => { await toggleFavorite(fb.id, caseId ? { caseId } : undefined); if (!fav) setExpanded(true); };
  return (
    <div ref={ref} role="dialog" aria-label={fb.term} style={style} onMouseEnter={() => useUi.setState({ hoverPinned: true } as never)} className="glass rounded-xl border border-slate-200 p-3 text-sm shadow-lg motion-safe:animate-fade-in dark:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><div className="truncate font-semibold text-brand-700 dark:text-brand-300">{fb.term}</div><div className="text-xs text-slate-600 dark:text-slate-300">{fb.translationSimple}</div><span role="img" aria-label={fb.srs.state} className={`chip mt-1 ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span></div>
        <button type="button" aria-pressed={fav} aria-label={fav ? `Retirer des favoris : ${fb.term}` : `Ajouter aux favoris : ${fb.term}`} onClick={() => { void star(); }} className={`h-11 w-11 shrink-0 text-xl ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
      </div>
      {(expanded || fav) && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          <div className="label">Ajouter à un deck…</div>
          {manual.map((d) => (<button key={d.id} type="button" role="menuitemcheckbox" aria-checked={inDeck(d.id)} onClick={() => { void (inDeck(d.id) ? removeFromDeck(d.id, fb.id) : addToDeck(d.id, fb.id, caseId ? { caseId } : undefined)); }} className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">{d.name}<span>{inDeck(d.id) ? '✓' : ''}</span></button>))}
          <div className="flex gap-1"><input aria-label="Nom du nouveau deck" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={40} placeholder="Nouveau deck" className="input min-h-11 flex-1" /><button type="button" onClick={async () => { if (!newName.trim()) return; try { const id = await createDeck(newName, 'manual'); await addToDeck(id, fb.id, caseId ? { caseId } : undefined); setNewName(''); } catch { /* nom invalide : bornes du champ */ } }} className="btn-outline min-h-11">Créer</button></div>
          <button type="button" onClick={() => { close(); openGlossary(fb); }} className="btn-ghost min-h-11 w-full justify-start">Voir la fiche →</button>
        </div>
      )}
    </div>
  );
}
```
Retirer `onMouseEnter … hoverPinned` si le store ne le prévoit pas ; la « carte survolée = ne pas fermer » se gère dans `AutoLinkText` (ci-dessous) par un timer partagé.

`autolink.tsx` `AutoLinkText` : ajouter des props `onHover?: (fb, rect) => void`, `onLeave?: () => void`, `onTap?: (fb, rect) => void` ; sur le `<button>` : retirer `title` ; `onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); timer = setTimeout(() => onHover?.(p.fb!, r), 150); }}`, `onMouseLeave={() => { clearTimeout(timer); onLeave?.(); }}`, `onFocus` idem que `mouseenter` sans délai ; `onClick={(e) => { if (coarse) { e.preventDefault(); onTap?.(p.fb!, e.currentTarget.getBoundingClientRect()); } else onOpen(p.fb!); }}` avec `const coarse = matchMedia('(pointer: coarse)').matches` (garde `typeof window`).

`AutoLink.tsx` : `const openHover = useUi((s) => s.openHover); const closeHover = useUi((s) => s.closeHover);` ; `onLeave` = fermer après 300 ms **sauf** si la souris est sur la carte : implémenter avec un `leaveTimer` module-level et, dans `TermHoverCard`, `onMouseEnter={() => clearTimeout(leaveTimer)}` / `onMouseLeave={() => leaveTimer = setTimeout(close, 300)}` — exporter `armClose()/disarmClose()` depuis un petit module `src/components/hoverTimer.ts` pour partager le timer proprement.

`Shell.tsx` : `<TermHoverCard />` à côté de `<GlossaryDrawer />`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/components src/lib/autolink* && npm run typecheck && npm run build` → 0 (les tests existants de l'autolink — `splitAutoLink` — restent verts).

- [ ] **Step 5 : commit**

```bash
git add src/store/ui.ts src/components/TermHoverCard.tsx src/components/TermHoverCard.test.tsx src/components/hoverTimer.ts src/lib/autolink.tsx src/components/AutoLink.tsx src/components/Shell.tsx
git commit -m "feat(fachbegriffe): hover-card ★ sur tout terme auto-lié — favori immédiat (+caseId), extension deck/fiche, tap sur mobile"
```

---

### Task 5 : Réglages — feuille « Répétitions » (page + Ajuster) et lecture par les écrans

**Files:**
- Create: `app/src/features/fachbegriffe/SrsSettingsSheet.tsx`
- Modify: `app/src/features/fachbegriffe/FachbegriffePage.tsx` (bouton « Répétitions » + sous-titre sur `daily`)
- Modify: `app/src/features/program/ProgramSetup.tsx` (section « Fachbegriffe » sous l'intensité, même feuille inline)
- Modify: `app/src/lib/program.ts` (bloc drill du jour : `caseId` du bloc simulation → lien `?case=`), `app/src/features/program/ProgramPage.tsx` (lien)
- Test: `app/src/features/fachbegriffe/SrsSettingsSheet.test.tsx`, `app/src/lib/program.test.ts` (+)

**Interfaces:**
- Consumes: Task 1–2 (`getSrsSettings`, `setSrsSettings`, `effectiveDaily`, `SRS_LIMITS`, `loadDrillContext().daily`)
- Produces: `export function SrsSettingsSheet(props: { onClose: () => void; inline?: boolean }): JSX.Element` ; bloc drill `ProgramBlock.caseId` renseigné quand un bloc simulation existe le même jour.

- [ ] **Step 1 : tests qui échouent**

```tsx
// app/src/features/fachbegriffe/SrsSettingsSheet.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { SrsSettingsSheet } from './SrsSettingsSheet';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } }; });
vi.mock('@/lib/collections/drillContext', () => ({ loadDrillContext: async () => ({ budget: 10, remaining: 10, reviewsRemaining: 200, settings: { mode: 'auto' }, daily: { newPerDay: 13, maxReviewsPerDay: 200, source: 'auto', explain: 'auto : 13/jour = 10 × intensif' }, relevance: { now: 0, favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] } }) }));

describe('SrsSettingsSheet', () => {
  beforeEach(async () => { await db.meta.clear(); await db.progress_events.clear(); });
  it('affiche le calcul auto ; passer en manuel et enregistrer émet srs.settings_changed borné', async () => {
    render(<SrsSettingsSheet onClose={() => {}} />);
    expect(await screen.findByText(/auto : 13\/jour = 10 × intensif/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Manuel/));
    fireEvent.change(screen.getByLabelText(/Nouveaux termes par jour/), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText(/Dus présentés par jour/), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'srs.settings_changed')?.payload).toEqual({ mode: 'manual', newPerDay: 50, maxReviewsPerDay: 20 }));
  });
});
```
Ajouter à `program.test.ts` : « le bloc drill du jour porte `caseId` du bloc simulation du même jour » (config avec un cas planifié le jour J → `drill.caseId === 'c1'`).

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/features/fachbegriffe/SrsSettingsSheet.test.tsx src/lib/program.test.ts` → FAIL

- [ ] **Step 3 : implémentation**

```tsx
// app/src/features/fachbegriffe/SrsSettingsSheet.tsx
import { useEffect, useState } from 'react';
import { getSrsSettings, setSrsSettings, SRS_LIMITS, type SrsSettings } from '@/lib/srsSettings';
import { loadDrillContext } from '@/lib/collections/drillContext';

// Réglages quotidiens façon Anki (spec F2b 3.7). Une seule feuille, utilisée
// par la page Fachbegriffe (modale) et par « Ajuster » du programme (inline).
export function SrsSettingsSheet({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const [s, setS] = useState<SrsSettings>({ mode: 'auto' });
  const [explain, setExplain] = useState(''); const [autoNew, setAutoNew] = useState(10);
  useEffect(() => { getSrsSettings().then(setS); loadDrillContext().then((c) => { setExplain(c.daily.source === 'auto' ? c.daily.explain : ''); setAutoNew(c.daily.newPerDay); }); }, []);
  const save = async () => { await setSrsSettings(s); onClose(); };
  const num = (k: 'newPerDay' | 'maxReviewsPerDay', v: string) => setS((p) => ({ ...p, [k]: v === '' ? undefined : Number(v) }));
  const form = (
    <div className="space-y-3">
      <div className="label">Répétitions</div>
      <div role="radiogroup" className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5"><input type="radio" name="srs-mode" aria-label="Automatique" checked={s.mode === 'auto'} onChange={() => setS({ mode: 'auto' })} />Automatique</label>
        <label className="flex items-center gap-1.5"><input type="radio" name="srs-mode" aria-label="Manuel" checked={s.mode === 'manual'} onChange={() => setS((p) => ({ mode: 'manual', newPerDay: p.newPerDay ?? autoNew, maxReviewsPerDay: p.maxReviewsPerDay ?? 200 }))} />Manuel</label>
      </div>
      {s.mode === 'auto' ? <p className="text-xs text-slate-500">{explain || 'auto : selon la date d\'examen, la rétention et l\'intensité du programme'}</p> : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label><span className="label">Nouveaux termes par jour</span><input aria-label="Nouveaux termes par jour" type="number" min={SRS_LIMITS.newPerDay[0]} max={SRS_LIMITS.newPerDay[1]} value={s.newPerDay ?? ''} onChange={(e) => num('newPerDay', e.target.value)} className="input w-full" /></label>
          <label><span className="label">Dus présentés par jour</span><input aria-label="Dus présentés par jour" type="number" min={SRS_LIMITS.maxReviewsPerDay[0]} max={SRS_LIMITS.maxReviewsPerDay[1]} value={s.maxReviewsPerDay ?? ''} onChange={(e) => num('maxReviewsPerDay', e.target.value)} className="input w-full" /></label>
          <p className="col-span-2 text-xs text-slate-500">Les dus au-delà du plafond restent dus demain — rien n'est perdu.</p>
        </div>
      )}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-outline min-h-11">Annuler</button><button type="button" onClick={() => { void save(); }} className="btn-primary min-h-11">Enregistrer</button></div>
    </div>
  );
  if (inline) return <div className="card p-4">{form}</div>;
  return (<><div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} /><div role="dialog" aria-modal="true" aria-label="Répétitions" className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-1/3 sm:-translate-x-1/2 sm:rounded-2xl">{form}</div></>);
}
```
`FachbegriffePage.tsx` : bouton `<button onClick={() => setSrsSheet(true)} className="btn-outline min-h-11 gap-1.5" aria-label="Répétitions"><Icon name="gear" className="h-4 w-4" />Répétitions</button>` près de Drill ; `{srsSheet && <SrsSettingsSheet onClose={() => { setSrsSheet(false); reloadCtx(); }} />}` ; le sous-titre lit `ctx.daily.newPerDay` pour « n nouveaux proposés ».
`ProgramSetup.tsx` : sous l'intensité, `<SrsSettingsSheet inline onClose={() => {}} />` (titre de section « Fachbegriffe »).
`program.ts` : dans la boucle drill, `caseId: simOfDay?.caseId` ; `ProgramPage.tsx` : lien drill → `?case=` si `b.caseId`, sinon `?specialty=`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/fachbegriffe src/features/program src/lib/program.test.ts && npm run typecheck && npm run build` → 0

- [ ] **Step 5 : commit**

```bash
git add src/features/fachbegriffe/SrsSettingsSheet.tsx src/features/fachbegriffe/SrsSettingsSheet.test.tsx src/features/fachbegriffe/FachbegriffePage.tsx src/features/program/ProgramSetup.tsx src/lib/program.ts src/lib/program.test.ts src/features/program/ProgramPage.tsx
git commit -m "feat(fachbegriffe): réglages quotidiens (auto × intensité / manuel) — page Fachbegriffe et Ajuster ; drill du jour ancré sur le cas planifié"
```

---

### Task 6 : Docs + preuve navigateur (AC-1/3/6/7/8)

- [ ] `CONTEXT.md` : « **Réglages SRS** — par personne, `srs.settings_changed` : auto (budget × intensité) ou manuel (nouveaux/jour, dus présentés/jour) ; le plafond de dus ne perd rien. **Hover-card** — carte ★ sur tout terme auto-lié (survol / tap) ; ★ = favori immédiat avec le cas courant. »
- [ ] `app/scripts/e2e/fachbegriffe-f2b.spec.md` (playwright-cli, port libre, Supabase local avec migration T1 + `functions serve` de ce worktree, compte premium) : AC-1 chip « Fachbegriffe (n) » dans le runner et `elapsed` inchangé après ouverture ; AC-3 « Drill ces termes » → drill, barre « Reprendre », attendre 30 s, reprendre → même partie, `elapsed` identique (mesure DOM du chrono) ; AC-6 hover-card : survol 150 ms, ★, extension, Échap ; mobile 390 px tap ; AC-7 réglages manuel 5/20 → drill ≤ 5 nouveaux ; AC-8 2ᵉ contexte navigateur → mêmes réglages après sync.
- [ ] Commit `test(fachbegriffe): preuve navigateur F2b — AC-1/3/6/7/8` + docs.

---

### Task 7 : Fin de branche et livraison

- [ ] Gates complets (avec et sans `.env`) ; `testRls`.
- [ ] `quality-branch-reviewer` (Opus) ; `front-design-keeper` + `ux-motion-designer` (hover-card, panneau, feuille) ; `ux-user-advocate` (simulation → drill → reprise ; ★ dans un Muster ; réglages) ; `product-pedagogy-designer` (plafond de dus, auto × intensité). Un fixeur, re-revue.
- [ ] Migration `20260917000012` appliquée en EU (MCP) + `events` redéployée **avant** merge ; PR ; CI verte ; merge par la direction ; vérification sur l'URL publique ; issue de suivis ; mémoire.
