# Fachbegriffe F1 — collections & page A→Z · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Favoris et decks (listes manuelles + decks intelligents) par personne, synchronisés en événements ; page Fachbegriffe refaite en liste A→Z virtualisée avec onglets de decks, étiquettes SRS et curseur alphabétique à zoom ; drill restreint à un deck.

**Architecture:** Huit nouveaux types d'événements dans le journal existant (`progress_events` → outbox → `POST /events`) projetés en trois tables Dexie (`decks`, `deck_terms`, `favorites`) par une fonction pure et idempotente ; l'UI n'écrit jamais ces tables directement, elle émet un événement et applique la projection localement. La page devient une liste virtualisée (`@tanstack/react-virtual`) groupée par lettre, pilotée par `?deck=<id>`.

**Tech Stack:** React 18, Vite 7, Dexie 4 + dexie-react-hooks, Zustand, `@tanstack/react-virtual` (nouveau), Vitest + @testing-library/react, Supabase Edge Function `events` (Deno, zod), playwright-cli.

Spec : `docs/superpowers/specs/2026-09-17-fachbegriffe-f1-collections-design.md`

## Global Constraints

- Branche `feat/fachbegriffe-f1` depuis `main` ; worktree `../doctopus-fachbegriffe` (copier `app/.env`, `app/supabase/.env`). Commandes depuis `app/`. Node ≥ 22.
- Gates après chaque tâche : `npm run typecheck`, `npx vitest run --dir src`, `npm run build` → exit 0. Tâche 1 : `node scripts/testRls.mjs` → exit 0 (Supabase local démarré, `supabase functions serve --env-file supabase/.env` en arrière-plan).
- `docs/contracts/` n'est modifié que par la Tâche 1 (rôle `arch`).
- Types d'événements (verbatim) : `term.favorited`, `term.unfavorited`, `deck.created`, `deck.renamed`, `deck.query_changed`, `deck.deleted`, `deck.term_added`, `deck.term_removed`. Id réservé : `deck-favorites`. Nom de deck : 1–40 caractères après `trim()` + espaces normalisés.
- `DeckQuery = { q?: string; specialty?: Specialty; state?: Srs['state']; center?: Center }`.
- Ordre de projection : `occurred_at` croissant, puis `received_at` (absent = plus grand), puis `id`. Rejouer dans un ordre mélangé donne le même état.
- Tons SRS partagés : Neu = sky, Gelernt = emerald, Zu wiederholen = amber (classes existantes).
- Curseur : clic = défilement instantané (pas de `smooth`) ; zoom `transform: scale(1.6)` lettre pointée, `1.25` voisines, 120 ms ; aucun `scale` sous `prefers-reduced-motion` ; zone tactile ≥ 44 px de large ; lettres vides `aria-disabled="true"`.
- Groupement de lettres : Ä→A, Ö→O, Ü→U, ß→S ; tri `localeCompare('de')`.
- Drill d'un deck : dus (priorité existante) puis Neu du deck ; jamais un terme hors deck ; pas de « tout revoir ».
- Stager fichier par fichier ; pas de trailer Co-Authored-By ; vérifier par code de sortie ; mesurer depuis le DOM.
- Livraison (Tâche 10) : migration appliquée au projet EU **et** fonction `events` redéployée **avant** le merge (sinon le serveur rejette les nouveaux types en 400).

---

### Task 1 : Contrat — huit types d'événements (arch)

**Files:**
- Modify: `docs/contracts/sync-protocol.md` (ligne « **Synchronisé** »)
- Create: `app/supabase/migrations/20260917000010_collections_events.sql`
- Modify: `app/supabase/functions/events/index.ts:7` (enum zod)
- Modify: `app/src/lib/sync/events.ts:1` (`ProgressEventType`)
- Test: `app/supabase/tests/events.test.ts` (nouveau cas)
- Regenerate: `docs/contracts/schema.sql` via `node scripts/dumpSchema.mjs` (si le script existe et que Supabase local tourne)

**Interfaces:**
- Produces: `ProgressEventType` élargi (13 valeurs) ; le serveur accepte les 8 nouveaux types.

- [ ] **Step 1 : test d'intégration qui échoue**

Dans `app/supabase/tests/events.test.ts`, après le cas « un type inconnu est refusé en 400 » :

```ts
  it('accepte les événements de collections (favoris, decks)', async () => {
    const deckId = crypto.randomUUID();
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'term.favorited', subject_id: 'fb-abdominal', payload: {}, occurred_at: '2026-09-17T10:00:00Z' },
      { id: crypto.randomUUID(), type: 'deck.created', subject_id: deckId, payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2026-09-17T10:00:01Z' },
      { id: crypto.randomUUID(), type: 'deck.term_added', subject_id: deckId, payload: { termId: 'fb-abdominal' }, occurred_at: '2026-09-17T10:00:02Z' },
      { id: crypto.randomUUID(), type: 'deck.query_changed', subject_id: deckId, payload: { query: { specialty: 'Kardiologie' } }, occurred_at: '2026-09-17T10:00:03Z' },
    ]);
    expect(r.rejected).toEqual([]);
    expect(r.acked).toHaveLength(4);
  });
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `node scripts/testRls.mjs; echo exit=$?`
Expected: le nouveau cas échoue (400 `bad_request`, `rejected`/`acked` absents), exit ≠ 0.

- [ ] **Step 3 : migration**

`app/supabase/migrations/20260917000010_collections_events.sql` :

```sql
-- 20260917000010_collections_events.sql — Fachbegriffe F1 : favoris et decks
-- sont des événements du journal (spec 2026-09-17-fachbegriffe-f1). La
-- contrainte `type` est élargie ; rien d'autre ne change côté serveur : les
-- projections vivent dans la base Dexie de chaque compte.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed'
));
```

Vérifier le nom réel de la contrainte : `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "\d public.progress_events"` — si le nom diffère de `progress_events_type_check`, utiliser le nom affiché.

- [ ] **Step 4 : fonction `events` et type client**

`app/supabase/functions/events/index.ts` ligne 7 :

```ts
  type: z.enum(['simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
    'term.favorited','term.unfavorited','deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed']),
```

`app/src/lib/sync/events.ts` ligne 1 :

```ts
export type ProgressEventType =
  | 'simulation.completed' | 'srs.reviewed' | 'plan.done' | 'case.layer_reached' | 'program.configured'
  | 'term.favorited' | 'term.unfavorited'
  | 'deck.created' | 'deck.renamed' | 'deck.query_changed' | 'deck.deleted' | 'deck.term_added' | 'deck.term_removed';
```

- [ ] **Step 5 : contrat**

`docs/contracts/sync-protocol.md`, remplacer la ligne « **Synchronisé** : … » par :

```
**Synchronisé** : `simulation.completed`, `srs.reviewed`, `plan.done`, `case.layer_reached`, `program.configured`, et les collections Fachbegriffe (F1) : `term.favorited` / `term.unfavorited` (subject = termId, payload `{}`), `deck.created` (subject = deckId, `{ name, kind: 'manual'|'smart', query? }`), `deck.renamed` (`{ name }`), `deck.query_changed` (`{ query }`), `deck.deleted` (`{}`), `deck.term_added` / `deck.term_removed` (`{ termId }`). `deck-favorites` est un id réservé (jamais créé/supprimé/renommé). Projection : ordre `occurred_at`, puis `received_at` (absent = dernier), puis `id` ; dernier événement gagne par (deck), par (deck, terme), par (terme) — un `term_added` postérieur à `deck.deleted` est ignoré.
```

- [ ] **Step 6 : appliquer localement, relancer**

Run: `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/migrations/20260917000010_collections_events.sql` (base vivante — pas de `db reset`), puis redémarrer `supabase functions serve --env-file supabase/.env`, puis `node scripts/testRls.mjs; echo exit=$?`
Expected: exit=0, nouveau cas vert. Si `scripts/dumpSchema.mjs` existe : `node scripts/dumpSchema.mjs` et vérifier `git diff docs/contracts/schema.sql` (la contrainte seulement).

- [ ] **Step 7 : commit**

```bash
git add docs/contracts/sync-protocol.md supabase/migrations/20260917000010_collections_events.sql supabase/functions/events/index.ts src/lib/sync/events.ts supabase/tests/events.test.ts
git add docs/contracts/schema.sql 2>/dev/null
git commit -m "feat(contrat): événements de collections Fachbegriffe — favoris et decks (F1)"
```

---

### Task 2 : Projection pure des collections + tables Dexie v3

**Files:**
- Create: `app/src/lib/collections/project.ts`
- Test: `app/src/lib/collections/project.test.ts`
- Modify: `app/src/db/db.ts` (version 3 + 3 tables + types)
- Modify: `app/src/db/types.ts` (types `Deck`, `DeckTerm`, `Favorite`, `DeckQuery`)
- Modify: `app/src/lib/sync/projections.ts` (`rebuildProjections` réécrit les 3 tables)

**Interfaces:**
- Consumes: `ProgressEvent` (Task 1)
- Produces:
  ```ts
  // db/types.ts
  export interface DeckQuery { q?: string; specialty?: Specialty; state?: Srs['state']; center?: Center }
  export interface Deck { id: string; name: string; kind: 'manual' | 'smart'; query?: DeckQuery; createdAt: string; updatedAt: string }
  export interface DeckTerm { deckId: string; termId: string; addedAt: string }
  export interface Favorite { termId: string; since: string }
  export const FAVORITES_DECK_ID = 'deck-favorites';
  // lib/collections/project.ts
  export interface CollectionsState { decks: Deck[]; deckTerms: DeckTerm[]; favorites: Favorite[] }
  export function sortEvents(events: ProgressEvent[]): ProgressEvent[];            // occurred_at, received_at (absent = dernier), id
  export function projectCollections(events: ProgressEvent[]): CollectionsState;   // pure, idempotente, ignore les autres types
  export async function writeCollections(state: CollectionsState): Promise<void>; // remplace les 3 tables en une transaction
  ```
  `db.decks`, `db.deck_terms`, `db.favorites` (Dexie).

- [ ] **Step 1 : test qui échoue**

```ts
// app/src/lib/collections/project.test.ts
import { describe, it, expect } from 'vitest';
import { projectCollections, sortEvents } from './project';
import type { ProgressEvent } from '@/lib/sync/events';

const ev = (type: ProgressEvent['type'], subject_id: string, payload: unknown, t: number, id = `${type}-${subject_id}-${t}`): ProgressEvent =>
  ({ id, user_id: 'u', type, subject_id, payload, occurred_at: new Date(Date.UTC(2026, 8, 17, 10, 0, t)).toISOString() });

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = (i * 7919) % (i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

describe('projectCollections', () => {
  it('ignore les autres types et part vide', () => {
    expect(projectCollections([ev('srs.reviewed', 'fb-1', {}, 1)])).toEqual({ decks: [], deckTerms: [], favorites: [] });
  });

  it('favori : le dernier événement par terme gagne', () => {
    const s = projectCollections([ev('term.favorited', 'fb-1', {}, 1), ev('term.unfavorited', 'fb-1', {}, 2), ev('term.favorited', 'fb-2', {}, 3)]);
    expect(s.favorites.map((f) => f.termId)).toEqual(['fb-2']);
  });

  it('deck : créé, renommé, termes ajoutés/retirés, supprimé — état exact', () => {
    const d = 'd1';
    const events = [
      ev('deck.created', d, { name: 'Kardio', kind: 'manual' }, 1),
      ev('deck.term_added', d, { termId: 'fb-1' }, 2),
      ev('deck.term_added', d, { termId: 'fb-2' }, 3),
      ev('deck.term_added', d, { termId: 'fb-3' }, 4),
      ev('deck.renamed', d, { name: 'Kardio II' }, 5),
      ev('deck.term_removed', d, { termId: 'fb-2' }, 6),
    ];
    const s = projectCollections(events);
    expect(s.decks).toEqual([{ id: d, name: 'Kardio II', kind: 'manual', query: undefined, createdAt: events[0].occurred_at, updatedAt: events[5].occurred_at }]);
    expect(s.deckTerms.map((t) => t.termId).sort()).toEqual(['fb-1', 'fb-3']);
    const after = projectCollections([...events, ev('deck.deleted', d, {}, 7), ev('deck.term_added', d, { termId: 'fb-9' }, 8)]);
    expect(after.decks).toEqual([]);
    expect(after.deckTerms).toEqual([]);
  });

  it('idempotence : ordre mélangé → même état', () => {
    const d = 'd2';
    const events = [
      ev('deck.created', d, { name: 'Gastro', kind: 'smart', query: { specialty: 'Gastroenterologie' } }, 1),
      ev('deck.query_changed', d, { query: { specialty: 'Gastroenterologie', state: 'Zu wiederholen' } }, 2),
      ev('term.favorited', 'fb-1', {}, 3),
      ev('deck.term_added', d, { termId: 'fb-1' }, 4),
      ev('term.unfavorited', 'fb-1', {}, 5),
      ev('term.favorited', 'fb-1', {}, 6),
    ];
    const a = projectCollections(events), b = projectCollections(shuffle(events));
    expect(b).toEqual(a);
    expect(a.decks[0].query).toEqual({ specialty: 'Gastroenterologie', state: 'Zu wiederholen' });
    expect(a.favorites).toHaveLength(1);
  });

  it('deck-favorites : term_added/removed sans deck.created sont acceptés (deck implicite)', () => {
    const s = projectCollections([ev('deck.term_added', 'deck-favorites', { termId: 'fb-1' }, 1)]);
    expect(s.deckTerms).toEqual([{ deckId: 'deck-favorites', termId: 'fb-1', addedAt: s.deckTerms[0].addedAt }]);
    expect(s.decks).toEqual([]);   // le deck Favoris est virtuel : l'UI le fabrique
  });

  it('sortEvents : occurred_at, puis received_at (absent = dernier), puis id', () => {
    const a = { ...ev('plan.done', 'p', {}, 1, 'b'), received_at: '2026-09-17T10:00:00Z' };
    const b = { ...ev('plan.done', 'p', {}, 1, 'a') };
    const c = { ...ev('plan.done', 'p', {}, 1, 'c'), received_at: '2026-09-17T09:00:00Z' };
    expect(sortEvents([a, b, c]).map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/collections/project.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : types et Dexie**

Dans `app/src/db/types.ts`, après `interface Fachbegriff` :

```ts
// ----------------------------------------------------------------------------
// Collections Fachbegriffe (F1) — projetées depuis le journal d'événements.
// ----------------------------------------------------------------------------
export interface DeckQuery { q?: string; specialty?: Specialty; state?: Srs['state']; center?: Center }
export interface Deck { id: string; name: string; kind: 'manual' | 'smart'; query?: DeckQuery; createdAt: string; updatedAt: string }
export interface DeckTerm { deckId: string; termId: string; addedAt: string }
export interface Favorite { termId: string; since: string }
/** Deck manuel réservé : jamais créé/renommé/supprimé par événement, fabriqué par l'UI. */
export const FAVORITES_DECK_ID = 'deck-favorites';
```

Dans `app/src/db/db.ts` : importer `Deck, DeckTerm, Favorite` ; déclarer `decks!: Table<Deck, string>; deck_terms!: Table<DeckTerm, [string, string]>; favorites!: Table<Favorite, string>;` ; ajouter après `this.version(2)…` :

```ts
    this.version(3).stores({
      decks: 'id, kind, name',
      deck_terms: '[deckId+termId], deckId, termId',
      favorites: 'termId',
    });
```

- [ ] **Step 4 : projection pure**

```ts
// app/src/lib/collections/project.ts
// ============================================================================
// Projection PURE des collections Fachbegriffe depuis le journal. Idempotente :
// même ensemble d'événements, même état, quel que soit l'ordre d'arrivée
// (tri occurred_at → received_at → id). L'UI n'écrit jamais decks/deck_terms/
// favorites autrement que par writeCollections après une émission d'événement.
// ============================================================================
import { db } from '@/db/db';
import type { Deck, DeckTerm, Favorite, DeckQuery } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';

export interface CollectionsState { decks: Deck[]; deckTerms: DeckTerm[]; favorites: Favorite[] }

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function sortEvents(events: ProgressEvent[]): ProgressEvent[] {
  return [...events].sort((a, b) =>
    cmp(a.occurred_at, b.occurred_at)
    || cmp(a.received_at ?? '￿', b.received_at ?? '￿')
    || cmp(a.id, b.id));
}

const COLLECTION_TYPES = new Set(['term.favorited', 'term.unfavorited', 'deck.created', 'deck.renamed', 'deck.query_changed', 'deck.deleted', 'deck.term_added', 'deck.term_removed']);

export function projectCollections(events: ProgressEvent[]): CollectionsState {
  const decks = new Map<string, Deck>();
  const deleted = new Set<string>();
  const terms = new Map<string, DeckTerm>();          // clé `${deckId} ${termId}`
  const favorites = new Map<string, Favorite>();
  for (const e of sortEvents(events)) {
    if (!COLLECTION_TYPES.has(e.type) || !e.subject_id) continue;
    const id = e.subject_id; const p = (e.payload ?? {}) as Record<string, unknown>;
    switch (e.type) {
      case 'term.favorited': favorites.set(id, { termId: id, since: e.occurred_at }); break;
      case 'term.unfavorited': favorites.delete(id); break;
      case 'deck.created':
        if (id === FAVORITES_DECK_ID) break;
        deleted.delete(id);
        decks.set(id, { id, name: String(p.name ?? ''), kind: p.kind === 'smart' ? 'smart' : 'manual', query: p.query as DeckQuery | undefined, createdAt: e.occurred_at, updatedAt: e.occurred_at });
        break;
      case 'deck.renamed': { const d = decks.get(id); if (d) { d.name = String(p.name ?? d.name); d.updatedAt = e.occurred_at; } break; }
      case 'deck.query_changed': { const d = decks.get(id); if (d && d.kind === 'smart') { d.query = p.query as DeckQuery; d.updatedAt = e.occurred_at; } break; }
      case 'deck.deleted':
        if (id === FAVORITES_DECK_ID) break;
        decks.delete(id); deleted.add(id);
        for (const k of [...terms.keys()]) if (k.startsWith(id + ' ')) terms.delete(k);
        break;
      case 'deck.term_added': {
        if (deleted.has(id) || (id !== FAVORITES_DECK_ID && !decks.has(id))) break;
        const termId = String(p.termId ?? ''); if (!termId) break;
        terms.set(`${id} ${termId}`, { deckId: id, termId, addedAt: e.occurred_at });
        break;
      }
      case 'deck.term_removed': terms.delete(`${id} ${String(p.termId ?? '')}`); break;
    }
  }
  return { decks: [...decks.values()], deckTerms: [...terms.values()], favorites: [...favorites.values()] };
}

/** Remplace les trois tables par l'état projeté (une transaction). */
export async function writeCollections(state: CollectionsState): Promise<void> {
  await db.transaction('rw', [db.decks, db.deck_terms, db.favorites], async () => {
    await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear();
    await db.decks.bulkPut(state.decks); await db.deck_terms.bulkPut(state.deckTerms); await db.favorites.bulkPut(state.favorites);
  });
}
```

Note sur le test « deck : créé… » : `query: undefined` — `toEqual` traite `undefined` et clé absente comme égaux ; garder le champ.

- [ ] **Step 5 : brancher `rebuildProjections`**

Dans `app/src/lib/sync/projections.ts`, importer `import { projectCollections, writeCollections } from '@/lib/collections/project';` et ajouter à la fin de `rebuildProjections`, après la boucle des couches :

```ts
  // Collections Fachbegriffe (F1) : favoris, decks, termes de decks
  await writeCollections(projectCollections(events));
```

- [ ] **Step 6 : lancer, vérifier**

Run: `npx vitest run src/lib/collections src/lib/sync && npm run typecheck`
Expected: exit 0 (6 nouveaux tests verts ; `projections.test.ts` existant toujours vert).

- [ ] **Step 7 : commit**

```bash
git add src/db/types.ts src/db/db.ts src/lib/collections/project.ts src/lib/collections/project.test.ts src/lib/sync/projections.ts
git commit -m "feat(fachbegriffe): projection pure et idempotente des collections (favoris, decks) ; Dexie v3"
```

---

### Task 3 : Mutations, requêtes de deck, tons SRS (`lib/collections`)

**Files:**
- Create: `app/src/lib/collections/index.ts`
- Create: `app/src/lib/collections/query.ts`
- Create: `app/src/lib/srsTone.ts`
- Test: `app/src/lib/collections/index.test.ts`, `app/src/lib/collections/query.test.ts`

**Interfaces:**
- Consumes: `syncQueue.push(NewEvent)`, `projectCollections`, `writeCollections`, `db`
- Produces:
  ```ts
  // lib/collections/index.ts — chaque mutation = événement + reprojection locale immédiate
  export function normalizeDeckName(raw: string): string;               // trim, espaces normalisés ; lève Error('deck_name') hors 1–40
  export async function toggleFavorite(termId: string): Promise<boolean>; // retourne le nouvel état
  export async function createDeck(name: string, kind: 'manual'|'smart', query?: DeckQuery): Promise<string>; // deckId
  export async function renameDeck(deckId: string, name: string): Promise<void>;
  export async function setDeckQuery(deckId: string, query: DeckQuery): Promise<void>;
  export async function deleteDeck(deckId: string): Promise<void>;       // refuse FAVORITES_DECK_ID
  export async function addToDeck(deckId: string, termId: string): Promise<void>;
  export async function removeFromDeck(deckId: string, termId: string): Promise<void>;
  export async function reprojectCollections(): Promise<void>;           // relit progress_events → writeCollections
  // lib/collections/query.ts
  export function applyQuery(q: DeckQuery, all: Fachbegriff[]): Fachbegriff[];
  export function termsOfDeck(deck: Deck | { id: typeof FAVORITES_DECK_ID }, all: Fachbegriff[], deckTerms: DeckTerm[], favorites: Favorite[]): Fachbegriff[];
  // lib/srsTone.ts
  export const SRS_TONE: Record<Srs['state'], { chip: string; dot: string }>;
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/collections/query.test.ts
import { describe, it, expect } from 'vitest';
import { applyQuery, termsOfDeck } from './query';
import { FAVORITES_DECK_ID, type Fachbegriff } from '@/db/types';
import { freshSrs } from '@/lib/srs';

const fb = (id: string, term: string, specialty: string, state: Fachbegriff['srs']['state'] = 'Neu', centers: string[] = ['Freiburg']): Fachbegriff =>
  ({ id, term, translationSimple: 's', specialty: specialty as never, pathologyTags: [], centers: centers as never, linkedCaseIds: [], srs: { ...freshSrs(), state } });
const all = [fb('a', 'Abdomen', 'Gastroenterologie'), fb('b', 'Bradykardie', 'Kardiologie', 'Zu wiederholen'), fb('c', 'Cholezystitis', 'Gastroenterologie', 'Gelernt', ['Stuttgart'])];

describe('applyQuery', () => {
  it('vide → tout', () => expect(applyQuery({}, all)).toHaveLength(3));
  it('spécialité + état', () => expect(applyQuery({ specialty: 'Gastroenterologie' as never, state: 'Gelernt' }, all).map((x) => x.id)).toEqual(['c']));
  it('recherche insensible à la casse sur terme et traduction', () => expect(applyQuery({ q: 'brady' }, all).map((x) => x.id)).toEqual(['b']));
  it('centre', () => expect(applyQuery({ center: 'Stuttgart' as never }, all).map((x) => x.id)).toEqual(['c']));
});

describe('termsOfDeck', () => {
  it('manuel → jointure deck_terms', () => {
    const deck = { id: 'd', name: 'x', kind: 'manual' as const, createdAt: '', updatedAt: '' };
    expect(termsOfDeck(deck, all, [{ deckId: 'd', termId: 'c', addedAt: '' }, { deckId: 'z', termId: 'a', addedAt: '' }], []).map((x) => x.id)).toEqual(['c']);
  });
  it('smart → applyQuery', () => {
    const deck = { id: 'd', name: 'x', kind: 'smart' as const, query: { state: 'Zu wiederholen' as const }, createdAt: '', updatedAt: '' };
    expect(termsOfDeck(deck, all, [], []).map((x) => x.id)).toEqual(['b']);
  });
  it('favoris → table favorites', () => {
    expect(termsOfDeck({ id: FAVORITES_DECK_ID }, all, [], [{ termId: 'a', since: '' }]).map((x) => x.id)).toEqual(['a']);
  });
});
```

```ts
// app/src/lib/collections/index.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { toggleFavorite, createDeck, renameDeck, deleteDeck, addToDeck, removeFromDeck, setDeckQuery, normalizeDeckName } from './index';
import { FAVORITES_DECK_ID } from '@/db/types';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => {
    const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never;
    await db.progress_events.put(ev); return ev;
  }) } };
});

describe('collections mutations', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); });

  it('toggleFavorite émet term.favorited puis term.unfavorited et projette', async () => {
    expect(await toggleFavorite('fb-1')).toBe(true);
    expect(await db.favorites.get('fb-1')).toBeTruthy();
    expect((await db.progress_events.toArray()).map((e) => e.type)).toEqual(['term.favorited']);
    expect(await toggleFavorite('fb-1')).toBe(false);
    expect(await db.favorites.get('fb-1')).toBeUndefined();
  });

  it('cycle de vie d\'un deck manuel', async () => {
    const id = await createDeck('  Kardio   II ', 'manual');
    expect((await db.decks.get(id))?.name).toBe('Kardio II');
    await addToDeck(id, 'fb-1'); await addToDeck(id, 'fb-2'); await removeFromDeck(id, 'fb-1');
    expect((await db.deck_terms.where('deckId').equals(id).toArray()).map((t) => t.termId)).toEqual(['fb-2']);
    await renameDeck(id, 'Herz');
    expect((await db.decks.get(id))?.name).toBe('Herz');
    await deleteDeck(id);
    expect(await db.decks.get(id)).toBeUndefined();
    expect(await db.deck_terms.where('deckId').equals(id).count()).toBe(0);
  });

  it('deck intelligent : query modifiable ; Favoris non supprimable', async () => {
    const id = await createDeck('Gastro', 'smart', { specialty: 'Gastroenterologie' as never });
    await setDeckQuery(id, { specialty: 'Gastroenterologie' as never, state: 'Zu wiederholen' });
    expect((await db.decks.get(id))?.query).toEqual({ specialty: 'Gastroenterologie', state: 'Zu wiederholen' });
    await expect(deleteDeck(FAVORITES_DECK_ID)).rejects.toThrow();
  });

  it('normalizeDeckName : bornes', () => {
    expect(normalizeDeckName('  a  b ')).toBe('a b');
    expect(() => normalizeDeckName('   ')).toThrow('deck_name');
    expect(() => normalizeDeckName('x'.repeat(41))).toThrow('deck_name');
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/collections`
Expected: FAIL — `./index`, `./query` introuvables

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/srsTone.ts
import type { Srs } from '@/db/types';
/** Tons SRS partagés (page, tiroir, drill, barre de simulation). Sémantique existante, jamais redéfinie ailleurs. */
export const SRS_TONE: Record<Srs['state'], { chip: string; dot: string }> = {
  Neu: { chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', dot: 'bg-sky-500' },
  Gelernt: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Zu wiederholen': { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
};
```

```ts
// app/src/lib/collections/query.ts
import type { Deck, DeckQuery, DeckTerm, Fachbegriff, Favorite } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';

/** Les mêmes filtres que la page Fachbegriffe — un deck intelligent n'est qu'une requête enregistrée. */
export function applyQuery(q: DeckQuery, all: Fachbegriff[]): Fachbegriff[] {
  const needle = q.q?.trim().toLowerCase();
  return all.filter((b) =>
    (!needle || `${b.term} ${b.translationSimple}`.toLowerCase().includes(needle))
    && (!q.specialty || b.specialty === q.specialty)
    && (!q.state || b.srs.state === q.state)
    && (!q.center || b.centers.includes(q.center)));
}

export function termsOfDeck(deck: Deck | { id: typeof FAVORITES_DECK_ID }, all: Fachbegriff[], deckTerms: DeckTerm[], favorites: Favorite[]): Fachbegriff[] {
  if (deck.id === FAVORITES_DECK_ID) { const ids = new Set(favorites.map((f) => f.termId)); return all.filter((b) => ids.has(b.id)); }
  const d = deck as Deck;
  if (d.kind === 'smart') return applyQuery(d.query ?? {}, all);
  const ids = new Set(deckTerms.filter((t) => t.deckId === d.id).map((t) => t.termId));
  return all.filter((b) => ids.has(b.id));
}
```

```ts
// app/src/lib/collections/index.ts
// ============================================================================
// Mutations des collections : UN événement dans le journal (sync) + reprojection
// locale immédiate. Aucune écriture directe dans decks/deck_terms/favorites.
// ============================================================================
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { newId } from '@/lib/sync/events';
import type { DeckQuery } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import { projectCollections, writeCollections } from './project';

export async function reprojectCollections(): Promise<void> {
  await writeCollections(projectCollections(await db.progress_events.toArray()));
}
const emit = async (type: Parameters<typeof syncQueue.push>[0]['type'], subject_id: string, payload: unknown) => {
  await syncQueue.push({ type, subject_id, payload });
  await reprojectCollections();
};

export function normalizeDeckName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 40) throw new Error('deck_name');
  return name;
}

export async function toggleFavorite(termId: string): Promise<boolean> {
  const is = !!(await db.favorites.get(termId));
  await emit(is ? 'term.unfavorited' : 'term.favorited', termId, {});
  return !is;
}
export async function createDeck(name: string, kind: 'manual' | 'smart', query?: DeckQuery): Promise<string> {
  const id = newId();
  await emit('deck.created', id, { name: normalizeDeckName(name), kind, ...(kind === 'smart' ? { query: query ?? {} } : {}) });
  return id;
}
export const renameDeck = (deckId: string, name: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); return emit('deck.renamed', deckId, { name: normalizeDeckName(name) }); };
export const setDeckQuery = (deckId: string, query: DeckQuery) => emit('deck.query_changed', deckId, { query });
export const deleteDeck = async (deckId: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); await emit('deck.deleted', deckId, {}); };
export const addToDeck = (deckId: string, termId: string) => emit('deck.term_added', deckId, { termId });
export const removeFromDeck = (deckId: string, termId: string) => emit('deck.term_removed', deckId, { termId });
```

Note : `renameDeck`/`deleteDeck` sur `FAVORITES_DECK_ID` — `renameDeck` lève de façon synchrone (test n'en dépend pas) ; `deleteDeck` est `async` pour que `rejects.toThrow()` fonctionne.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/collections && npm run typecheck`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/lib/srsTone.ts src/lib/collections/query.ts src/lib/collections/query.test.ts src/lib/collections/index.ts src/lib/collections/index.test.ts
git commit -m "feat(fachbegriffe): mutations de collections (événement + reprojection), requêtes de deck, tons SRS partagés"
```

---

### Task 4 : Hooks de données et drill par deck

**Files:**
- Modify: `app/src/hooks/useData.ts` (3 hooks)
- Create: `app/src/lib/collections/drillQueue.ts`
- Test: `app/src/lib/collections/drillQueue.test.ts`
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (paramètre `deck`, file, état vide)

**Interfaces:**
- Consumes: Task 3
- Produces:
  ```ts
  // hooks/useData.ts
  export const useDecks = () => useLiveQuery(() => db.decks.toArray(), [], undefined);
  export const useDeckTerms = () => useLiveQuery(() => db.deck_terms.toArray(), [], undefined);
  export const useFavorites = () => useLiveQuery(() => db.favorites.toArray(), [], undefined);
  // lib/collections/drillQueue.ts
  export function buildDrillQueue(pool: Fachbegriff[], opts: { prioritySpecialty?: string | null; priorityPathology?: string | null; now?: number; limit?: number }): Fachbegriff[];
  export function nextDueAt(pool: Fachbegriff[], now?: number): number | null;   // epoch ms du prochain dû non encore dû, sinon null
  ```

- [ ] **Step 1 : test qui échoue**

```ts
// app/src/lib/collections/drillQueue.test.ts
import { describe, it, expect } from 'vitest';
import { buildDrillQueue, nextDueAt } from './drillQueue';
import type { Fachbegriff } from '@/db/types';
import { freshSrs, DAY_MS } from '@/lib/srs';

const now = Date.UTC(2026, 8, 17, 12);
const mk = (id: string, state: Fachbegriff['srs']['state'], dueOffsetDays: number, specialty = 'X'): Fachbegriff =>
  ({ id, term: id, translationSimple: '', specialty: specialty as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: { ...freshSrs(now), state, dueDate: now + dueOffsetDays * DAY_MS } });

describe('buildDrillQueue', () => {
  it('dus d\'abord (par date), puis Neu ; jamais un terme appris pas encore dû', () => {
    const pool = [mk('later', 'Gelernt', +3), mk('due2', 'Zu wiederholen', -1), mk('due1', 'Gelernt', -5), mk('new', 'Neu', 0)];
    expect(buildDrillQueue(pool, { now }).map((b) => b.id)).toEqual(['due1', 'due2', 'new']);
  });
  it('priorité spécialité sur les dus', () => {
    const pool = [mk('a', 'Gelernt', -1, 'Gastro'), mk('b', 'Gelernt', -2, 'Kardio')];
    expect(buildDrillQueue(pool, { now, prioritySpecialty: 'Gastro' }).map((b) => b.id)).toEqual(['a', 'b']);
  });
  it('limite 20 par défaut', () => {
    const pool = Array.from({ length: 30 }, (_, i) => mk(`n${i}`, 'Neu', 0));
    expect(buildDrillQueue(pool, { now })).toHaveLength(20);
  });
  it('ne sort jamais du pool', () => {
    const pool = [mk('only', 'Neu', 0)];
    expect(buildDrillQueue(pool, { now }).every((b) => b.id === 'only')).toBe(true);
  });
});

describe('nextDueAt', () => {
  it('prochain dû futur, sinon null', () => {
    expect(nextDueAt([mk('a', 'Gelernt', +3), mk('b', 'Gelernt', +1)], now)).toBe(now + DAY_MS);
    expect(nextDueAt([mk('a', 'Neu', 0)], now)).toBeNull();
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/collections/drillQueue.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/collections/drillQueue.ts
import type { Fachbegriff } from '@/db/types';
import { isDue } from '@/lib/srs';

/** File de drill : dus (priorité pathologie > spécialité > reste, puis date) puis Neu. Le pool borne tout — un deck n'ajoute jamais de terme. */
export function buildDrillQueue(pool: Fachbegriff[], opts: { prioritySpecialty?: string | null; priorityPathology?: string | null; now?: number; limit?: number } = {}): Fachbegriff[] {
  const now = opts.now ?? Date.now();
  const priority = (b: Fachbegriff) => (opts.priorityPathology && b.pathologyTags.includes(opts.priorityPathology) ? 0 : opts.prioritySpecialty && b.specialty === opts.prioritySpecialty ? 1 : 2);
  const due = pool.filter((b) => isDue(b.srs, now)).sort((a, b) => priority(a) - priority(b) || a.srs.dueDate - b.srs.dueDate);
  const dueIds = new Set(due.map((b) => b.id));
  const news = pool.filter((b) => b.srs.state === 'Neu' && !dueIds.has(b.id)).sort((a, b) => priority(a) - priority(b));
  return [...due, ...news].slice(0, opts.limit ?? 20);
}

export function nextDueAt(pool: Fachbegriff[], now = Date.now()): number | null {
  const future = pool.filter((b) => b.srs.state !== 'Neu' && b.srs.dueDate > now).map((b) => b.srs.dueDate);
  return future.length ? Math.min(...future) : null;
}
```

Dans `hooks/useData.ts`, après `useFachbegriffe` :

```ts
export const useDecks = () => useLiveQuery(() => db.decks.toArray(), [], undefined);
export const useDeckTerms = () => useLiveQuery(() => db.deck_terms.toArray(), [], undefined);
export const useFavorites = () => useLiveQuery(() => db.favorites.toArray(), [], undefined);
```

Dans `DrillPage.tsx` :
- imports : `useDecks, useDeckTerms, useFavorites` ; `buildDrillQueue, nextDueAt` ; `termsOfDeck` ; `FAVORITES_DECK_ID`.
- `const deckId = params.get('deck');` puis `const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();`
- `const deck = deckId === FAVORITES_DECK_ID ? { id: FAVORITES_DECK_ID, name: 'Favoris' } : decks?.find((d) => d.id === deckId);`
- remplacer `buildQueue` par : `const pool = useMemo(() => !begriffe ? [] : deck ? termsOfDeck(deck as never, begriffe, deckTerms ?? [], favorites ?? []) : begriffe, [begriffe, deck, deckTerms, favorites]);` et `const buildQueue = useCallback(() => buildDrillQueue(pool, { prioritySpecialty, priorityPathology }), [pool, prioritySpecialty, priorityPathology]);` — adapter les deux appels existants (`setQueue(buildQueue())`).
- Titre de l'écran d'accueil : `Drill Fachbegriffe{deck ? ` · ${deck.name}` : ''}`.
- Remplacer le paragraphe « Rien à réviser pour l'instant… » par : quand `deck` et `queue.length === 0` : `Rien à réviser dans « {deck.name} » aujourd'hui.{next ? ` Prochain terme dû : ${new Date(next).toLocaleDateString('fr-FR')}.` : ''}` avec `const next = nextDueAt(pool);` et un `<Link to="/fachbegriffe/drill" className="btn-outline mt-3">Drill global</Link>` ; sans deck, texte existant.
- Lien « ✕ Quitter » et « ← Glossaire » : `to={deckId ? `/fachbegriffe?deck=${deckId}` : '/fachbegriffe'}`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/collections && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/hooks/useData.ts src/lib/collections/drillQueue.ts src/lib/collections/drillQueue.test.ts src/features/fachbegriffe/DrillPage.tsx
git commit -m "feat(fachbegriffe): drill par deck — file bornée au deck (dus puis Neu), état vide avec prochain dû ; hooks decks/favoris"
```

---

### Task 5 : Composants de liste — `TermList` (virtualisée, groupée) et `AlphabetRail`

**Files:**
- Create: `app/src/features/fachbegriffe/letters.ts`
- Create: `app/src/features/fachbegriffe/AlphabetRail.tsx`
- Create: `app/src/features/fachbegriffe/TermList.tsx`
- Test: `app/src/features/fachbegriffe/letters.test.ts`, `app/src/features/fachbegriffe/AlphabetRail.test.tsx`
- Modify: `app/package.json` (`npm i @tanstack/react-virtual@3`)

**Interfaces:**
- Consumes: `SRS_TONE` (Task 3)
- Produces:
  ```ts
  // letters.ts
  export const LETTERS: readonly string[];                        // 'A'..'Z'
  export function letterOf(term: string): string;                 // Ä→A, Ö→O, Ü→U, ß→S, autre → '#'
  export function sortDe(a: Fachbegriff, b: Fachbegriff): number; // localeCompare('de')
  export type Row = { kind: 'letter'; letter: string } | { kind: 'term'; term: Fachbegriff };
  export function buildRows(terms: Fachbegriff[]): { rows: Row[]; firstIndexByLetter: Map<string, number> };
  // AlphabetRail.tsx
  export function AlphabetRail(props: { available: Set<string>; onJump: (letter: string) => void }): JSX.Element;
  // TermList.tsx
  export function TermList(props: { terms: Fachbegriff[]; favorites: Set<string>; onOpen: (t: Fachbegriff) => void; onToggleFavorite: (t: Fachbegriff) => void; onRemove?: (t: Fachbegriff) => void }): JSX.Element;
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/features/fachbegriffe/letters.test.ts
import { describe, it, expect } from 'vitest';
import { letterOf, buildRows, sortDe } from './letters';
import type { Fachbegriff } from '@/db/types';
import { freshSrs } from '@/lib/srs';
const t = (term: string): Fachbegriff => ({ id: term, term, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() });

describe('letters', () => {
  it('umlauts et ß se rangent sous la lettre de base', () => {
    expect(letterOf('Ärztin')).toBe('A'); expect(letterOf('Ödem')).toBe('O'); expect(letterOf('Übelkeit')).toBe('U'); expect(letterOf('ßx')).toBe('S'); expect(letterOf('abdominal')).toBe('A'); expect(letterOf('1-Zimmer')).toBe('#');
  });
  it('buildRows : en-têtes de lettre + index du premier terme', () => {
    const { rows, firstIndexByLetter } = buildRows([t('Bauch'), t('Ärztin'), t('Abdomen')].sort(sortDe));
    expect(rows.map((r) => (r.kind === 'letter' ? `#${r.letter}` : r.term.term))).toEqual(['#A', 'Abdomen', 'Ärztin', '#B', 'Bauch']);
    expect(firstIndexByLetter.get('A')).toBe(0); expect(firstIndexByLetter.get('B')).toBe(3);
  });
});
```

```tsx
// app/src/features/fachbegriffe/AlphabetRail.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlphabetRail } from './AlphabetRail';

const setReducedMotion = (v: boolean) => { window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce') ? v : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never; };
afterEach(() => { setReducedMotion(false); });

describe('AlphabetRail', () => {
  it('26 lettres ; lettres vides désactivées ; clic → onJump', () => {
    setReducedMotion(false);
    const onJump = vi.fn();
    render(<AlphabetRail available={new Set(['A', 'K'])} onJump={onJump} />);
    expect(screen.getAllByRole('button')).toHaveLength(26);
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'K' }));
    expect(onJump).toHaveBeenCalledWith('K');
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onJump).toHaveBeenCalledTimes(1);
  });
  it('survol : la lettre pointée grossit (scale 1.6), voisines 1.25 ; rien sous reduced-motion', () => {
    setReducedMotion(false);
    const { unmount } = render(<AlphabetRail available={new Set(['A', 'B', 'C', 'D'])} onJump={() => {}} />);
    fireEvent.mouseMove(screen.getByRole('button', { name: 'C' }));
    expect(screen.getByRole('button', { name: 'C' }).style.transform).toContain('scale(1.6)');
    expect(screen.getByRole('button', { name: 'B' }).style.transform).toContain('scale(1.25)');
    expect(screen.getByRole('button', { name: 'A' }).style.transform).toBe('');
    unmount();
    setReducedMotion(true);
    render(<AlphabetRail available={new Set(['A', 'B', 'C'])} onJump={() => {}} />);
    fireEvent.mouseMove(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByRole('button', { name: 'B' }).style.transform).toBe('');
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npm i @tanstack/react-virtual@3 && npx vitest run src/features/fachbegriffe/letters.test.ts src/features/fachbegriffe/AlphabetRail.test.tsx`
Expected: FAIL — modules introuvables

- [ ] **Step 3 : implémentation**

```ts
// app/src/features/fachbegriffe/letters.ts
import type { Fachbegriff } from '@/db/types';

export const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)) as readonly string[];
const BASE: Record<string, string> = { Ä: 'A', Ö: 'O', Ü: 'U', ẞ: 'S', ß: 'S' };

/** Lettre de groupement (allemand) : Ä→A, Ö→O, Ü→U, ß→S ; hors alphabet → '#'. */
export function letterOf(term: string): string {
  const c = (term.trim()[0] ?? '').toUpperCase();
  const l = BASE[c] ?? c;
  return /^[A-Z]$/.test(l) ? l : '#';
}
const collator = new Intl.Collator('de', { sensitivity: 'base' });
export const sortDe = (a: Fachbegriff, b: Fachbegriff) => collator.compare(a.term, b.term);

export type Row = { kind: 'letter'; letter: string } | { kind: 'term'; term: Fachbegriff };
/** Lignes de la liste (en-tête de lettre + termes) et index de la première ligne de chaque lettre. `terms` doit déjà être trié. */
export function buildRows(terms: Fachbegriff[]): { rows: Row[]; firstIndexByLetter: Map<string, number> } {
  const rows: Row[] = []; const firstIndexByLetter = new Map<string, number>();
  let current = '';
  for (const term of terms) {
    const l = letterOf(term.term);
    if (l !== current) { current = l; firstIndexByLetter.set(l, rows.length); rows.push({ kind: 'letter', letter: l }); }
    rows.push({ kind: 'term', term });
  }
  return { rows, firstIndexByLetter };
}
```

```tsx
// app/src/features/fachbegriffe/AlphabetRail.tsx
import { useRef, useState } from 'react';
import { LETTERS } from './letters';

// Curseur alphabétique vertical (instrument : clic = saut instantané). Le zoom
// « dock » n'est que du transform, 120 ms, et disparaît sous reduced-motion.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function AlphabetRail({ available, onJump }: { available: Set<string>; onJump: (letter: string) => void }) {
  const [hot, setHot] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const scaleFor = (i: number) => {
    if (hot === null || reduced()) return '';
    const d = Math.abs(i - hot);
    return d === 0 ? 'scale(1.6)' : d === 1 ? 'scale(1.25)' : '';
  };
  const letterAt = (clientY: number): number | null => {
    const el = ref.current; if (!el) return null;
    const r = el.getBoundingClientRect(); const i = Math.floor(((clientY - r.top) / r.height) * LETTERS.length);
    return i >= 0 && i < LETTERS.length ? i : null;
  };
  const onTouch = (e: React.TouchEvent) => {
    const i = letterAt(e.touches[0].clientY); setHot(i);
    if (i !== null && available.has(LETTERS[i])) onJump(LETTERS[i]);
  };

  return (
    <div ref={ref} role="group" aria-label="Aller à la lettre"
      className="sticky top-20 flex h-[min(70vh,520px)] w-11 select-none flex-col items-center justify-between py-1 text-[11px] font-semibold text-slate-400"
      onMouseLeave={() => setHot(null)} onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => setHot(null)}>
      {LETTERS.map((l, i) => {
        const on = available.has(l);
        return (
          <button key={l} type="button" aria-label={l} aria-disabled={!on}
            onMouseMove={() => setHot(i)} onClick={() => on && onJump(l)}
            style={{ transform: scaleFor(i), transition: reduced() ? undefined : 'transform 120ms ease-out' }}
            className={`grid h-4 w-8 place-items-center rounded leading-none ${on ? (hot === i ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400') : 'text-slate-300 dark:text-slate-700'}`}>
            {l}
          </button>
        );
      })}
      {hot !== null && (
        <div aria-hidden className="pointer-events-none absolute right-12 grid h-10 w-10 place-items-center rounded-xl bg-ink text-base font-bold text-white shadow-lg dark:bg-ink-600" style={{ top: `${(hot / LETTERS.length) * 100}%` }}>{LETTERS[hot]}</div>
      )}
    </div>
  );
}
```

```tsx
// app/src/features/fachbegriffe/TermList.tsx
import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Fachbegriff } from '@/db/types';
import { SRS_TONE } from '@/lib/srsTone';
import { buildRows } from './letters';

export interface TermListHandle { jumpTo: (letter: string) => void }
interface Props { terms: Fachbegriff[]; favorites: Set<string>; onOpen: (t: Fachbegriff) => void; onToggleFavorite: (t: Fachbegriff) => void; onRemove?: (t: Fachbegriff) => void }

// Liste A→Z virtualisée (2 266 termes : ≤ 60 lignes montées). En-têtes de
// lettre collants ; ligne 44 px ; étoile et « Retirer » sont des boutons
// distincts de la ligne (pas d'imbrication de boutons).
export const TermList = forwardRef<TermListHandle, Props>(function TermList({ terms, favorites, onOpen, onToggleFavorite, onRemove }, ref) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { rows, firstIndexByLetter } = useMemo(() => buildRows(terms), [terms]);
  const v = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: (i) => (rows[i].kind === 'letter' ? 32 : 44), overscan: 10 });
  useImperativeHandle(ref, () => ({ jumpTo: (letter) => { const i = firstIndexByLetter.get(letter); if (i !== undefined) v.scrollToIndex(i, { align: 'start' }); } }), [firstIndexByLetter, v]);

  return (
    <div ref={parentRef} data-testid="term-list" className="card h-[min(70vh,640px)] overflow-y-auto p-0">
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map((it) => {
          const row = rows[it.index];
          const style = { position: 'absolute' as const, top: 0, left: 0, width: '100%', transform: `translateY(${it.start}px)`, height: it.size };
          if (row.kind === 'letter') return <div key={`L${row.letter}`} data-letter={row.letter} style={style} className="sticky z-10 flex items-center border-b border-slate-100 bg-paper/95 px-4 text-xs font-bold tracking-wider text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">{row.letter}</div>;
          const t = row.term; const fav = favorites.has(t.id); const tone = SRS_TONE[t.srs.state];
          return (
            <div key={t.id} data-term-id={t.id} style={style} className="flex items-center gap-2 border-b border-slate-50 px-2 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-white/5">
              <button type="button" onClick={() => onOpen(t)} className="flex min-w-0 flex-1 flex-col items-start px-2 text-left">
                <span className="truncate font-semibold text-brand-700 dark:text-brand-300">{t.term}</span>
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">{t.translationSimple}</span>
              </button>
              <span className={`chip shrink-0 ${tone.chip}`} title={t.srs.state}>{t.srs.state === 'Zu wiederholen' ? '↻' : t.srs.state[0]}</span>
              {onRemove && <button type="button" aria-label={`Retirer ${t.term} du deck`} onClick={() => onRemove(t)} className="btn-ghost h-11 w-11 shrink-0 justify-center text-slate-400">−</button>}
              <button type="button" aria-label={fav ? `Retirer ${t.term} des favoris` : `Ajouter ${t.term} aux favoris`} aria-pressed={fav} onClick={() => onToggleFavorite(t)}
                className={`h-11 w-11 shrink-0 text-lg ${fav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
});
```

Vérifier que la classe `bg-paper` existe (`grep -n "paper" tailwind.config.js`) ; sinon `bg-white/95`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/fachbegriffe && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add package.json package-lock.json src/features/fachbegriffe/letters.ts src/features/fachbegriffe/letters.test.ts src/features/fachbegriffe/AlphabetRail.tsx src/features/fachbegriffe/AlphabetRail.test.tsx src/features/fachbegriffe/TermList.tsx
git commit -m "feat(fachbegriffe): liste A→Z virtualisée groupée par lettre + curseur alphabétique à zoom (reduced-motion respecté)"
```

---

### Task 6 : Page Fachbegriffe — onglets de decks, filtres, gestion, URL

**Files:**
- Rewrite: `app/src/features/fachbegriffe/FachbegriffePage.tsx`
- Create: `app/src/features/fachbegriffe/DeckTabs.tsx`
- Create: `app/src/features/fachbegriffe/DeckSheet.tsx` (créer / renommer / filtres / supprimer)
- Test: `app/src/features/fachbegriffe/FachbegriffePage.test.tsx`

**Interfaces:**
- Consumes: Tasks 3–5 (`useDecks/useDeckTerms/useFavorites/useFachbegriffe`, `termsOfDeck`, `applyQuery`, mutations, `TermList`, `AlphabetRail`, `FAVORITES_DECK_ID`)
- Produces: route `/fachbegriffe?deck=<id>` ; `DeckTabs({ decks, activeId, counts, onSelect, onCreate })` ; `DeckSheet({ mode: 'create' | 'edit', deck?, initialQuery?, onClose })`.

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/features/fachbegriffe/FachbegriffePage.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { FachbegriffePage } from './FachbegriffePage';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});
// Virtualisation en jsdom : pas de layout → on force un viewport de mesure
vi.mock('@tanstack/react-virtual', async (orig) => { const m = await orig<typeof import('@tanstack/react-virtual')>(); return { ...m, useVirtualizer: (o: Parameters<typeof m.useVirtualizer>[0]) => m.useVirtualizer({ ...o, initialRect: { width: 800, height: 600 } }) }; });

const seed = async () => {
  await db.fachbegriffe.bulkPut([
    { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() },
    { id: 'fb-k', term: 'Kardiomyopathie', translationSimple: 'Herzmuskelerkrankung', specialty: 'Kardiologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: { ...freshSrs(), state: 'Zu wiederholen' } },
  ] as never);
};
const renderAt = (url = '/fachbegriffe') => render(<MemoryRouter initialEntries={[url]}><FachbegriffePage /></MemoryRouter>);

describe('FachbegriffePage', () => {
  beforeEach(async () => { await db.fachbegriffe.clear(); await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await seed(); });

  it('liste A→Z avec onglets Tous et Favoris ; ★ ajoute aux favoris et à l\'onglet', async () => {
    renderAt();
    await screen.findByText('Abdomen');
    expect(screen.getByRole('tab', { name: /tous/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ajouter abdomen aux favoris/i }));
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    expect((await db.progress_events.toArray()).map((e) => e.type)).toContain('term.favorited');
    fireEvent.click(screen.getByRole('tab', { name: /favoris/i }));
    await screen.findByText('Abdomen');
    expect(screen.queryByText('Kardiomyopathie')).toBeNull();
  });

  it('créer un deck manuel depuis « + » puis y ajouter depuis la ligne (menu) ; onglet actif via URL', async () => {
    renderAt();
    await screen.findByText('Abdomen');
    fireEvent.click(screen.getByRole('button', { name: /nouveau deck/i }));
    fireEvent.change(screen.getByLabelText(/nom du deck/i), { target: { value: 'Kardio' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    const tab = await screen.findByRole('tab', { name: /kardio/i });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    const decks = await db.decks.toArray(); expect(decks).toHaveLength(1);
    // deck vide → état vide
    expect(screen.getByText(/ajoute des termes/i)).toBeTruthy();
  });

  it('deck intelligent : filtres enregistrés suivent le SRS', async () => {
    renderAt();
    await screen.findByText('Abdomen');
    fireEvent.click(screen.getByRole('button', { name: /nouveau deck/i }));
    fireEvent.change(screen.getByLabelText(/nom du deck/i), { target: { value: 'À revoir' } });
    fireEvent.click(screen.getByLabelText(/deck intelligent/i));
    fireEvent.change(screen.getByLabelText(/^état$/i), { target: { value: 'Zu wiederholen' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    await screen.findByText('Kardiomyopathie');
    expect(screen.queryByText('Abdomen')).toBeNull();
    await db.fachbegriffe.update('fb-k', { srs: { ...freshSrs(), state: 'Gelernt' } });
    await waitFor(() => expect(screen.queryByText('Kardiomyopathie')).toBeNull());
  });

  it('?deck=<id> restaure l\'onglet ; bouton drill pointe sur le deck', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Mon deck', kind: 'manual' }, occurred_at: '2026-09-17T10:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    renderAt('/fachbegriffe?deck=d1');
    const tab = await screen.findByRole('tab', { name: /mon deck/i });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('link', { name: /drill/i }) as HTMLAnchorElement).getAttribute('href')).toContain('deck=d1');
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/features/fachbegriffe/FachbegriffePage.test.tsx`
Expected: FAIL (onglets/boutons absents)

- [ ] **Step 3 : implémentation**

```tsx
// app/src/features/fachbegriffe/DeckTabs.tsx
import type { Deck } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';

interface Props { decks: Deck[]; activeId: string | null; counts: Record<string, number>; onSelect: (id: string | null) => void; onCreate: () => void }
/** Onglets : Tous · ★ Favoris · manuels · intelligents · +. `activeId` null = Tous. */
export function DeckTabs({ decks, activeId, counts, onSelect, onCreate }: Props) {
  const manual = decks.filter((d) => d.kind === 'manual').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const smart = decks.filter((d) => d.kind === 'smart').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const Tab = ({ id, label }: { id: string | null; label: string }) => {
    const on = activeId === id;
    return (
      <button role="tab" aria-selected={on} onClick={() => onSelect(id)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
        {label}{id !== null && counts[id] !== undefined ? <span className="ml-1.5 opacity-70">{counts[id]}</span> : null}
      </button>
    );
  };
  return (
    <div role="tablist" aria-label="Decks" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      <Tab id={null} label="Tous" />
      <Tab id={FAVORITES_DECK_ID} label="★ Favoris" />
      {manual.map((d) => <Tab key={d.id} id={d.id} label={d.name} />)}
      {smart.map((d) => <Tab key={d.id} id={d.id} label={`⚡ ${d.name}`} />)}
      <button type="button" onClick={onCreate} aria-label="Nouveau deck" className="shrink-0 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700">+</button>
    </div>
  );
}
```

```tsx
// app/src/features/fachbegriffe/DeckSheet.tsx
import { useState } from 'react';
import type { Deck, DeckQuery, Specialty, Srs, Center } from '@/db/types';
import { createDeck, renameDeck, setDeckQuery, deleteDeck } from '@/lib/collections';

interface Props { mode: 'create' | 'edit'; deck?: Deck; initialQuery?: DeckQuery; specialties: Specialty[]; centers: Center[]; onClose: (createdId?: string) => void }
const STATES: Srs['state'][] = ['Neu', 'Gelernt', 'Zu wiederholen'];

/** Feuille de création / gestion d'un deck. Une seule responsabilité : nom, type, filtres, suppression. */
export function DeckSheet({ mode, deck, initialQuery, specialties, centers, onClose }: Props) {
  const [name, setName] = useState(deck?.name ?? '');
  const [kind, setKind] = useState<'manual' | 'smart'>(deck?.kind ?? 'manual');
  const [query, setQuery] = useState<DeckQuery>(deck?.query ?? initialQuery ?? {});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof DeckQuery, v: string) => setQuery((q) => ({ ...q, [k]: v || undefined }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      if (mode === 'create') { const id = await createDeck(name, kind, kind === 'smart' ? query : undefined); onClose(id); return; }
      if (deck) { if (deck.name !== name) await renameDeck(deck.id, name); if (deck.kind === 'smart') await setDeckQuery(deck.id, query); }
      onClose();
    } catch (err) { setError((err as Error).message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : (err as Error).message); }
  };
  const remove = async () => { if (deck && confirm(`Supprimer le deck « ${deck.name} » ? Les termes restent dans le glossaire.`)) { await deleteDeck(deck.id); onClose(); } };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={() => onClose()} />
      <form onSubmit={submit} role="dialog" aria-label={mode === 'create' ? 'Nouveau deck' : 'Gérer le deck'} className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md space-y-3 rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-1/3 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="label">{mode === 'create' ? 'Nouveau deck' : 'Deck'}</div>
        <label className="block text-sm"><span className="label">Nom du deck</span><input aria-label="Nom du deck" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="input w-full" autoFocus /></label>
        {mode === 'create' && (
          <div role="radiogroup" aria-label="Type" className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'manual'} onChange={() => setKind('manual')} aria-label="Liste manuelle" />Liste manuelle</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'smart'} onChange={() => setKind('smart')} aria-label="Deck intelligent" />Deck intelligent</label>
          </div>
        )}
        {kind === 'smart' && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label><span className="label">Recherche</span><input aria-label="Recherche" value={query.q ?? ''} onChange={(e) => set('q', e.target.value)} className="input w-full" /></label>
            <label><span className="label">Spécialité</span><select aria-label="Spécialité" value={query.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)} className="input w-full"><option value="">Toutes</option>{specialties.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">État</span><select aria-label="État" value={query.state ?? ''} onChange={(e) => set('state', e.target.value)} className="input w-full"><option value="">Tous</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">Centre</span><select aria-label="Centre" value={query.center ?? ''} onChange={(e) => set('center', e.target.value)} className="input w-full"><option value="">Tous</option>{centers.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-signal-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {mode === 'edit' && deck ? <button type="button" onClick={remove} className="text-xs text-signal-600 hover:underline">Supprimer</button> : <span />}
          <div className="flex gap-2"><button type="button" onClick={() => onClose()} className="btn-outline">Annuler</button><button type="submit" className="btn-primary">{mode === 'create' ? 'Créer' : 'Enregistrer'}</button></div>
        </div>
      </form>
    </>
  );
}
```

```tsx
// app/src/features/fachbegriffe/FachbegriffePage.tsx (réécriture complète)
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFachbegriffe, useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { Icon } from '@/components/icons';
import { useUi } from '@/store/ui';
import { dueCount } from '@/lib/stats';
import type { Specialty, Srs, Center, DeckQuery, Fachbegriff } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import { EmptyState } from '@/components/ui';
import { applyQuery, termsOfDeck } from '@/lib/collections/query';
import { toggleFavorite, removeFromDeck, setDeckQuery } from '@/lib/collections';
import { sortDe, letterOf } from './letters';
import { TermList, type TermListHandle } from './TermList';
import { AlphabetRail } from './AlphabetRail';
import { DeckTabs } from './DeckTabs';
import { DeckSheet } from './DeckSheet';

const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };

export function FachbegriffePage() {
  const begriffe = useFachbegriffe(); const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const openGlossary = useUi((s) => s.openGlossary);
  const [params, setParams] = useSearchParams();
  const activeId = params.get('deck');
  const [filters, setFilters] = useState<DeckQuery>({});
  const [sheet, setSheet] = useState<null | { mode: 'create' } | { mode: 'edit' }>(null);
  const listRef = useRef<TermListHandle>(null);

  const activeDeck = activeId === FAVORITES_DECK_ID ? FAV_DECK : decks?.find((d) => d.id === activeId);
  const isSmart = activeDeck?.kind === 'smart' && activeDeck.id !== FAVORITES_DECK_ID;
  // Sur un deck intelligent, la barre affiche la requête du deck ; ailleurs, les filtres locaux.
  const effective: DeckQuery = isSmart ? { ...(activeDeck as { query?: DeckQuery }).query, ...filters } : filters;
  const dirty = isSmart && JSON.stringify(effective) !== JSON.stringify((activeDeck as { query?: DeckQuery }).query ?? {});

  const specialties = useMemo(() => [...new Set((begriffe ?? []).map((b) => b.specialty))].sort() as Specialty[], [begriffe]);
  const centers = useMemo(() => [...new Set((begriffe ?? []).flatMap((b) => b.centers))].sort() as Center[], [begriffe]);
  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.termId)), [favorites]);

  const shown = useMemo(() => {
    if (!begriffe) return [];
    const base = activeDeck && !isSmart ? termsOfDeck(activeDeck, begriffe, deckTerms ?? [], favorites ?? []) : begriffe;
    return applyQuery(effective, base).sort(sortDe);
  }, [begriffe, activeDeck, isSmart, deckTerms, favorites, effective]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {}; if (!begriffe) return c;
    c[FAVORITES_DECK_ID] = favSet.size;
    for (const d of decks ?? []) c[d.id] = termsOfDeck(d, begriffe, deckTerms ?? [], favorites ?? []).length;
    return c;
  }, [begriffe, decks, deckTerms, favorites, favSet]);
  const available = useMemo(() => new Set(shown.map((b) => letterOf(b.term))), [shown]);

  if (!begriffe || !decks) return <div className="text-slate-400">Chargement…</div>;
  const due = dueCount(shown);
  const select = (id: string | null) => { setFilters({}); setParams(id ? { deck: id } : {}); };
  const drillHref = activeId ? `/fachbegriffe/drill?deck=${activeId}` : '/fachbegriffe/drill';
  const set = (k: keyof DeckQuery, v: string) => setFilters((f) => ({ ...f, [k]: v || undefined }));

  const empty = shown.length === 0 && (
    activeId === FAVORITES_DECK_ID ? <EmptyState icon="nav-abc" title="Aucun favori" hint="Marque un terme d'une ★ pour le retrouver ici." />
    : isSmart ? <EmptyState icon="nav-abc" title="Aucun terme ne correspond aujourd'hui" />
    : activeDeck ? <EmptyState icon="nav-abc" title="Deck vide" hint="Ajoute des termes depuis une fiche ou avec ★." />
    : <EmptyState icon="nav-abc" title="Aucun terme" />);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Vocabulaire</div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Fachbegriffe</h1>
          <p className="text-slate-500 dark:text-slate-400">{shown.length} termes · <b className="text-amber-600 dark:text-amber-400">{due}</b> dus aujourd'hui</p>
        </div>
        <div className="flex items-center gap-2">
          {activeDeck && activeId !== FAVORITES_DECK_ID && <button type="button" onClick={() => setSheet({ mode: 'edit' })} className="btn-outline" aria-label="Gérer le deck">⋯</button>}
          <Link to={drillHref} className="btn-primary gap-1.5"><Icon name="nav-abc" className="h-4 w-4" />Drill{activeDeck ? ` · ${activeDeck.name}` : ''}{due > 0 ? ` (${due})` : ''}</Link>
        </div>
      </header>

      <DeckTabs decks={decks} activeId={activeId} counts={counts} onSelect={select} onCreate={() => setSheet({ mode: 'create' })} />

      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[160px] flex-1"><label className="label">Recherche</label><input value={effective.q ?? ''} onChange={(e) => set('q', e.target.value)} placeholder="Terme, traduction…" className="input mt-1" /></div>
        <div><label className="label">Spécialité</label><select value={effective.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)} className="input mt-1"><option value="">Toutes</option>{specialties.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label">État</label><select value={effective.state ?? ''} onChange={(e) => set('state', e.target.value)} className="input mt-1"><option value="">Tous</option>{(['Neu', 'Gelernt', 'Zu wiederholen'] as Srs['state'][]).map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label">Centre</label><select value={effective.center ?? ''} onChange={(e) => set('center', e.target.value)} className="input mt-1"><option value="">Tous</option>{centers.map((c) => <option key={c}>{c}</option>)}</select></div>
        {dirty && <div className="flex gap-2"><button type="button" onClick={async () => { await setDeckQuery(activeId!, effective); setFilters({}); }} className="btn-primary text-xs">Enregistrer dans le deck</button><button type="button" onClick={() => setFilters({})} className="btn-outline text-xs">Annuler</button></div>}
      </div>

      {empty || (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <TermList ref={listRef} terms={shown} favorites={favSet} onOpen={openGlossary}
              onToggleFavorite={(t: Fachbegriff) => { void toggleFavorite(t.id); }}
              onRemove={activeDeck && !isSmart && activeId !== FAVORITES_DECK_ID ? (t) => { void removeFromDeck(activeId!, t.id); } : undefined} />
          </div>
          <AlphabetRail available={available} onJump={(l) => listRef.current?.jumpTo(l)} />
        </div>
      )}

      {sheet && <DeckSheet mode={sheet.mode} deck={sheet.mode === 'edit' ? (activeDeck as never) : undefined} initialQuery={filters} specialties={specialties} centers={centers}
        onClose={(createdId) => { setSheet(null); if (createdId) select(createdId); else if (sheet.mode === 'edit' && !decks.find((d) => d.id === activeId)) select(null); }} />}
    </div>
  );
}
```

Vérifier la signature de `EmptyState` (`grep -n "export function EmptyState" -A 3 src/components/ui.tsx`) : si elle n'accepte pas `hint`, passer le texte via la prop existante (`description`/`children`) — adapter sans changer `ui.tsx`.

Après suppression d'un deck actif, `onClose` retombe sur « Tous » (le `decks` du closure peut être périmé : utiliser `db.decks.get(activeId)` si nécessaire, ou simplement `select(null)` quand `sheet.mode === 'edit'` et que la suppression a été confirmée — le plus simple : `DeckSheet.onClose(undefined, { deleted: true })` → étendre la signature `onClose: (createdId?: string, opts?: { deleted?: boolean }) => void` et `select(null)` si `deleted`).

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/fachbegriffe && npx vitest run --dir src && npm run typecheck && npm run build`
Expected: exit 0. Si un test échoue sur la virtualisation en jsdom (aucune ligne rendue), vérifier que le mock `initialRect` est bien pris ; sinon rendre `TermList` sans virtualisation quand `import.meta.env.MODE === 'test'` n'est PAS acceptable — préférer corriger le mock.

- [ ] **Step 5 : commit**

```bash
git add src/features/fachbegriffe/FachbegriffePage.tsx src/features/fachbegriffe/DeckTabs.tsx src/features/fachbegriffe/DeckSheet.tsx src/features/fachbegriffe/FachbegriffePage.test.tsx
git commit -m "feat(fachbegriffe): page A→Z — onglets de decks (Favoris, manuels, intelligents), filtres enregistrables, gestion, ?deck= dans l'URL"
```

---

### Task 7 : Tiroir Glossaire — étoile, « Ajouter à un deck… », ton SRS

**Files:**
- Modify: `app/src/components/GlossaryDrawer.tsx`
- Test: `app/src/components/GlossaryDrawer.test.tsx`

**Interfaces:**
- Consumes: `useFavorites`, `useDecks`, `useDeckTerms`, `toggleFavorite`, `addToDeck`, `removeFromDeck`, `createDeck`, `SRS_TONE`

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/components/GlossaryDrawer.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { freshSrs } from '@/lib/srs';
import { GlossaryDrawer } from './GlossaryDrawer';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() } as never;

describe('GlossaryDrawer collections', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); useUi.setState({ glossaryTerm: fb }); });

  it('★ bascule le favori', async () => {
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter aux favoris/i }));
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    expect(await screen.findByRole('button', { name: /retirer des favoris/i })).toBeTruthy();
  });

  it('« Ajouter à un deck… » liste les decks manuels et ajoute', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2026-09-17T10:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter à un deck/i }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /kardio/i }));
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/components/GlossaryDrawer.test.tsx`
Expected: FAIL (boutons absents)

- [ ] **Step 3 : implémentation**

Dans `GlossaryDrawer.tsx` : importer `useState`, `useFavorites, useDecks, useDeckTerms`, `toggleFavorite, addToDeck, removeFromDeck, createDeck`, `SRS_TONE`. Dans le composant :

```tsx
  const favorites = useFavorites(); const decks = useDecks(); const deckTerms = useDeckTerms();
  const [menu, setMenu] = useState(false);
  // (après `if (!fb) return null;`)
  const fav = !!favorites?.some((f) => f.termId === fb.id);
  const manual = (decks ?? []).filter((d) => d.kind === 'manual');
  const inDeck = (id: string) => !!deckTerms?.some((t) => t.deckId === id && t.termId === fb.id);
```

Dans l'en-tête, à droite du titre (avant le ✕) :

```tsx
          <div className="flex items-center gap-1">
            <button type="button" aria-label={fav ? `Retirer ${fb.term} des favoris` : `Ajouter ${fb.term} aux favoris`} aria-pressed={fav} onClick={() => { void toggleFavorite(fb.id); }}
              className={`h-11 w-11 text-xl ${fav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="btn-ghost h-11 px-2 text-sm">Ajouter à un deck…</button>
              {menu && (
                <div role="menu" className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {manual.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-500">Aucune liste. Crée-en une :</p>}
                  {manual.map((d) => (
                    <button key={d.id} role="menuitemcheckbox" aria-checked={inDeck(d.id)} onClick={() => { void (inDeck(d.id) ? removeFromDeck(d.id, fb.id) : addToDeck(d.id, fb.id)); }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10">{d.name}<span>{inDeck(d.id) ? '✓' : ''}</span></button>
                  ))}
                  <button role="menuitem" onClick={async () => { const name = prompt('Nom du nouveau deck'); if (name) { const id = await createDeck(name, 'manual'); await addToDeck(id, fb.id); } }}
                    className="mt-1 w-full rounded-lg border-t border-slate-100 px-2 py-1.5 text-left text-sm text-brand-600 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-white/10">+ Nouveau deck</button>
                </div>
              )}
            </div>
            <button onClick={close} className="btn-ghost -mr-2 -mt-1 text-lg">✕</button>
          </div>
```

Remplacer le `chip` d'état par `<span className={`chip ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/components/GlossaryDrawer.test.tsx && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/components/GlossaryDrawer.tsx src/components/GlossaryDrawer.test.tsx
git commit -m "feat(fachbegriffe): tiroir Glossaire — étoile favori, « Ajouter à un deck… », ton SRS partagé"
```

---

### Task 8 : Documentation

**Files:**
- Modify: `CONTEXT.md` (vocabulaire)
- Modify: `app/docs/PRODUCT-VISION.md` §3 point 9 (une ligne : F1 livré, F2/F3 à venir)

- [ ] **Step 1 : CONTEXT.md** — sous `## Contenu` (ou la section où vivent « Fachbegriff », « SRS ») :

```
- **Favori** : Fachbegriff marqué ★ par la personne ; événement `term.favorited`/`term.unfavorited` ; deck réservé `deck-favorites`.
- **Deck** : collection personnelle de Fachbegriffe — **liste manuelle** (termes choisis, `deck.term_added`) ou **deck intelligent** (requête enregistrée `DeckQuery` = les filtres de la page, évaluée à la lecture). Un deck est une lentille sur le même SRS, jamais un second planning.
```

- [ ] **Step 2 : PRODUCT-VISION.md** — au point 9, ajouter en fin : « — *F1 (favoris, decks, page A→Z) livré ; F2 ancrage au cas et F3 explication en contexte pré-générée à suivre.* »

- [ ] **Step 3 : commit**

```bash
git add CONTEXT.md app/docs/PRODUCT-VISION.md
git commit -m "docs(fachbegriffe): vocabulaire favori/deck ; vision — F1 livré"
```

---

### Task 9 : Preuve navigateur (AC-2, 5, 7, 8)

**Files:**
- Create: `app/scripts/e2e/fachbegriffe-f1.spec.md`

Pré-requis : Supabase local (migration T1 appliquée, `functions serve` relancé), `app/.env` mode founder, `npm run dev -- --port 5182 --strictPort`, comptes `anna@test.local` / `ben@test.local` (`secret123`) ; playwright-cli headless ; mesures depuis le DOM.

- [ ] **Step 1 : AC-7** — ouvrir `/#/fachbegriffe` en Anna (premium via `grantFounder` local) : mesurer `performance.now()` entre la navigation et la présence de `[data-testid="term-list"] [data-term-id]` (< 200 ms après données chargées) ; compter `document.querySelectorAll('[data-term-id]').length` ≤ 60.
- [ ] **Step 2 : AC-5** — clic sur la lettre « K » du curseur : `document.querySelector('[data-letter="K"]').getBoundingClientRect().top - list.getBoundingClientRect().top` ∈ [−4, 4] px ; lettre « X » (si vide) a `aria-disabled="true"` et un clic ne change pas `scrollTop` ; émuler `prefers-reduced-motion: reduce` (`playwright-cli` : `--reduced-motion=reduce` ou `page.emulateMedia`) et survoler « K » : aucun `style.transform` contenant `scale`.
- [ ] **Step 3 : AC-8** — viewport 390×844 : `document.documentElement.scrollWidth <= window.innerWidth` ; `[role=tablist]` a `scrollWidth > clientWidth` avec ≥ 4 decks (créer 3 decks) et défile ; largeur de `[role=group][aria-label="Aller à la lettre"]` ≥ 44 px.
- [ ] **Step 4 : AC-2** — Anna ★ « Abdomen » ; second contexte navigateur (Anna, autre profil) : après sync, l'onglet Favoris montre « Abdomen » ; contexte Ben : Favoris vide et `indexedDB` de Ben `favorites.count() === 0`.
- [ ] **Step 5 : consigner et committer**

```bash
git add scripts/e2e/fachbegriffe-f1.spec.md
git commit -m "test(fachbegriffe): preuve navigateur F1 — AC-2/5/7/8 (playwright-cli, mesures DOM)"
```

---

### Task 10 : Fin de branche et livraison ordonnée

- [ ] Gates complets : `npm run typecheck && npx vitest run --dir src && npm run build` → 0 ; `node scripts/testRls.mjs` → 0.
- [ ] `quality-branch-reviewer` (Opus) sur `main..HEAD` ; `front-design-keeper` + `ux-motion-designer` (curseur, densité, tons) ; `ux-user-advocate` (créer un deck, ★, drill d'un deck, mobile) ; `product-pedagogy-designer` sur D4 (SRS maître). Un seul fixeur, re-revue.
- [ ] PR `gh pr create --base main --title "feat(fachbegriffe): F1 — favoris, decks, page A→Z (spec 2026-09-17)"`, CI verte.
- [ ] **Avant le merge** : appliquer `20260917000010_collections_events.sql` au projet EU (MCP `apply_migration`) et redéployer la fonction `events` (MCP `deploy_edge_function`, imports `./_shared/`, `verify_jwt: true`) — vérifier avec un `POST /events` de type `term.favorited` → 200.
- [ ] Merge par la direction ; déploiement Pages ; vérifier sur l'URL publique : ★ sur un terme, onglet Favoris, création d'un deck (AC-9 réel).
- [ ] Issue de suivis (mineurs différés, preuves non strictes) ; `MEMORY.md` : F1 livré, F2 suivant.
