# Fachbegriffe F3 — ★ depuis « Expliquer », termes personnels, IA serveur gratuite, double registre · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en favori n'importe quelle sélection depuis la bulle « Expliquer » (terme du glossaire ou terme personnel synchronisé et révisé au drill), servir « Expliquer » et Doctopus par une Edge Function `ai` gratuite (Groq → Gemini) sans clé navigateur, et afficher un double registre Vorstellung / Anamnese pour les 1 354 termes liés à un cas.

**Architecture:** Tranche A — deux nouveaux événements (`term.personal_created` / `term.personal_deleted`) projetés dans une table Dexie `personal_terms` (v4) ; une source fusionnée `allTerms` (glossaire publié + vues de termes personnels au format `Fachbegriff`) alimente drill, liste, favoris ; `rateTerm` aiguille le SRS par préfixe `pt-`. Tranche B — module feuille `_shared/prompts.ts` (partagé Deno ↔ Vite ↔ eval), adaptateur OpenAI-compatible `_shared/aiChain.ts` (chaîne configurable, bascule), fonction `ai` (JWT + premium + quota + cache `ai_cache` + SSE relayé) ; `onlineAi.ts` route serveur d'abord, clé navigateur en repli, conversation épinglée à son fournisseur. Tranche C — champ `r` → `Fachbegriff.register`, validateur CI `checkTermRegister.mjs`, composant `TermRegister` partout, puis production de contenu par lots (pilote → revue direction → 13 lots).

**Tech Stack:** React 18, Vite 7, TypeScript, Dexie 4 + dexie-react-hooks, Zustand, Vitest + @testing-library/react + fake-indexeddb, Supabase Edge Functions (Deno 2, zod 3), Postgres, playwright-cli, MCP Supabase (`apply_migration`, `deploy_edge_function`).

Spec : `docs/superpowers/specs/2026-09-25-fachbegriffe-f3-design.md` (source de vérité).

## Global Constraints

- Branche `feat/fachbegriffe-f3`, worktree `/Users/MehdiBoukari/Downloads/FSP VB/doctopus-fachbegriffe-f3` (copier `app/.env` avec `VITE_AUTH_MODE=founder` et `app/supabase/.env` depuis le dépôt principal). Commandes depuis `app/` sauf mention. Node ≥ 22.
- Gates après chaque tâche de code : `npm run typecheck; echo exit=$?`, `npx vitest run --dir src; echo exit=$?`, `npm run build; echo exit=$?` → `exit=0` (vérifier le **code de sortie**, jamais un message lu via un pipe). Tâches serveur : `node scripts/testRls.mjs; echo exit=$?` → 0 (Supabase local démarré, `supabase functions serve --env-file supabase/.env` lancé **depuis ce worktree**).
- `docs/contracts/` modifié seulement en Tâche A1 (rôle `platform-architect`). Aucun autre agent n'y écrit.
- Stager **fichier par fichier** (`git add <chemin>`), jamais `git add -A` ; pas de trailer `Co-Authored-By` dans les commits de tâches (règle du dépôt) ; un seul writer par worktree.
- Termes personnels : id = `'pt-' + fnv1a32(term.toLowerCase()).toString(16).padStart(8,'0')` ; `term` 1–80 car. (sélection nettoyée) ; `context` tronqué à 300 ; `explanation` **tronquée** (jamais rejetée) à 600 ; `caseId?` ; `createdAt` ISO ; `srs`.
- Événements : `term.personal_created` (subject = id `pt-…`, payload `{ term, context?, explanation?, caseId?, createdAt }`) ; `term.personal_deleted` (payload `{}`). Projection : par id, dernier par `sortEvents` gagne ; re-créer après suppression autorisé, `srs` repart de `freshSrs`. Favori = `term.favorited` subject `pt-…` (inchangé).
- `srs.reviewed` : id qui commence par `pt-` → `personal_terms`, sinon `fachbegriffe` (inchangé).
- La purge de contenu (`lib/content/apply.ts`) ne touche jamais `personal_terms`.
- Résolution de sélection : `lookupTerm` = exact, puis base sans suffixe `e`/`en`/`s`/`n` (des deux côtés, base ≥ 4 lettres), **jamais de flou** (FB2-M3). Aucune chaîne de terme en double dans le glossaire (validateur).
- Bulle : déclenchement `selectionchange` (anti-rebond 250 ms) + `pointerup` (souris et tactile) ; pastille `[★] [Expliquer]` ; ★ plein si déjà favori ; confirmation « Ajouté aux favoris » / « Carte créée » + « Ajouter à un deck… ». Sélection 2–220 car. ; ★ désactivée si la sélection nettoyée dépasse 80 car.
- Fonction `ai` : entrée zod stricte `{ kind:'brief', selection ≤ 220 }` | `{ kind:'chat', turns: {role:'user'|'assistant', text ≤ 2000}[] ≤ 20 }` ; tout autre champ (dont `system`) → 400 ; `verify_jwt = true` déclaré ; user id du JWT ; `my_tier() = 3` sinon 403 ; quota `rate_hit('ai:<uid>', 300, 86400)` via service role ; `max_tokens` brief 300, chat 1 200 ; cache `brief` 30 jours (`ai_cache`) consulté **avant** le quota ; CORS limité à `https://mhdbkr.github.io` et `http://localhost:*` / `http://127.0.0.1:*` ; OPTIONS 204 ; SSE relayé, amont annulé si le client se déconnecte ; chaîne en env `AI_CHAIN_BRIEF` / `AI_CHAIN_CHAT` (`provider:model,provider:model`) ; secrets `GROQ_API_KEY`, `GEMINI_API_KEY` posés **par la direction uniquement**.
- Client IA : interface `askBrief`, `askOnline`, `askConversation` conservée ; mode fondateur connecté + plan `premium` → fonction `ai`, sinon clé navigateur ; repli clé navigateur seulement pour `brief` ou une conversation **nouvelle** ; une conversation garde le fournisseur (`via`) de son premier tour ; historique envoyé en texte simple, jamais de `reasoningDetails` vers le serveur. Mode public inchangé.
- Registre : `r: { pa, vo, an }` → `register: { patient, vorstellung, anamnese }` ; `pa` ≤ 60 car. et ≠ terme ; `vo` contient le terme (mot entier, formes fléchies) ; `an` ne contient pas le terme et finit par « ? » ; bornes `vo` ≤ 160, `an` ≤ 140. Sans `register` : ligne « Reformulation · <translationSimple> ».
- Charte : ★ en ton `signal`, cibles ≥ 44 px, mouvement `transform/opacity` ≤ 150 ms, `prefers-reduced-motion` respecté, 390 px sans débordement.
- Stripe non concerné. Aucun moyen de paiement chez Groq/Google (gratuité par construction).
- Livraison : migrations `20260925000013` et `20260925000014` appliquées au projet EU `hwpwoblpygvxwbztconc`, fonctions `events` et `ai` redéployées **avant merge**.

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `docs/contracts/sync-protocol.md` | contrat des 2 événements | A1 |
| `app/supabase/migrations/20260925000013_personal_terms_events.sql` | check `type` étendu | A1 |
| `app/supabase/functions/events/index.ts` | enum zod | A1 |
| `app/src/lib/sync/events.ts` | `ProgressEventType` | A1 |
| `app/src/db/types.ts` | `PersonalTerm`, `TermRegisterData`, `Fachbegriff.register?` | A2, C1 |
| `app/src/db/db.ts` | Dexie v4 `personal_terms` | A2 |
| `app/src/lib/collections/personalTerms.ts` | id, nettoyage, projection pure, écriture, create/delete/star | A2, A5 |
| `app/src/lib/sync/projections.ts` | reconstruction `personal_terms`, SRS par préfixe | A2 |
| `app/src/lib/collections/allTerms.ts` | `AnyTerm`, `toView`, `mergeTerms`, `rateTerm` | A3 |
| `app/src/hooks/useData.ts` | `usePersonalTerms`, `useAllTerms` | A3 |
| `app/src/features/fachbegriffe/{DrillPage,FachbegriffePage}.tsx` | lecture fusionnée, notation | A3 |
| `app/src/lib/dictionary.ts` | `lookupTerm` ; ré-export des prompts | A4, B1 |
| `app/src/components/SelectionExplainer.tsx` | déclenchement tactile, pastille ★, confirmation, registre | A5, B6, C2 |
| `app/src/components/GlossaryDrawer.tsx` | suppression d'un terme personnel ; registre | A6, C2 |
| `app/supabase/functions/_shared/prompts.ts` | prompts système (feuille) | B1 |
| `app/supabase/functions/_shared/aiChain.ts` | chaîne, adaptateur OpenAI-compat, SSE | B2 |
| `app/supabase/migrations/20260925000014_ai_cache.sql` | table cache | B3 |
| `app/supabase/functions/ai/index.ts`, `app/supabase/config.toml` | fonction `ai` | B3 |
| `app/src/lib/onlineAi.ts`, `app/src/lib/serverAi.ts` | routage client | B4 |
| `app/src/components/Doctopus.tsx` | « Repli (optionnel) », conversation épinglée | B5 |
| `app/scripts/evalDoctopus.mjs` | `--chain` | B6 |
| `app/src/data/seedFachbegriffe.ts`, `app/scripts/publishContent.mjs`, `app/src/data/fachbegriffe.json` | `r` → `register`, dédoublonnage | C1 |
| `app/scripts/checkTermRegister.mjs`, `.github/workflows/quality.yml` | validateur CI | C1 |
| `app/src/components/TermRegister.tsx` | affichage double registre | C2 |
| `app/src/components/TermHoverCard.tsx`, `features/fachbegriffe/{TermList,CaseTermsPanel,DrillPage}.tsx` | câblage registre | C2 |
| `app/scripts/registerLots.mjs` | sélection et découpage des lots | C3 |

---

# Tranche A — ★ depuis « Expliquer » + termes personnels

### Task A1 : Contrat `term.personal_created` / `term.personal_deleted` (platform-architect)

**Files:**
- Modify: `docs/contracts/sync-protocol.md` (phrase « **Synchronisé** », ligne 5)
- Create: `app/supabase/migrations/20260925000013_personal_terms_events.sql`
- Modify: `app/supabase/functions/events/index.ts` (enum zod)
- Modify: `app/src/lib/sync/events.ts` (`ProgressEventType`)
- Test: `app/supabase/tests/events.test.ts` (nouveau cas)

**Interfaces:**
- Produces: `ProgressEventType` inclut `'term.personal_created' | 'term.personal_deleted'` ; le serveur les accepte.

- [ ] **Step 1 : test qui échoue** — dans `app/supabase/tests/events.test.ts`, dans le `describe('events')` :

```ts
  it('accepte term.personal_created et term.personal_deleted (F3)', async () => {
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'term.personal_created', subject_id: 'pt-0a1b2c3d', payload: { term: 'Belastungsdyspnoe', createdAt: '2026-09-25T10:00:00Z' }, occurred_at: '2026-09-25T10:00:00Z' },
      { id: crypto.randomUUID(), type: 'term.personal_deleted', subject_id: 'pt-0a1b2c3d', payload: {}, occurred_at: '2026-09-25T10:01:00Z' },
    ]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(2);
  });
```

- [ ] **Step 2 : lancer, vérifier l'échec** — `node scripts/testRls.mjs; echo exit=$?` → ≠ 0 (400 : type inconnu).

- [ ] **Step 3 : implémentation**

```sql
-- 20260925000013_personal_terms_events.sql — Fachbegriffe F3 : termes personnels
-- créés depuis la bulle « Expliquer » (★ sur une sélection hors glossaire).
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed',
  'term.personal_created','term.personal_deleted'
));
```

`events/index.ts` — l'enum devient :
```ts
  type: z.enum(['simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
    'term.favorited','term.unfavorited','deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
    'srs.settings_changed','term.personal_created','term.personal_deleted']),
```

`src/lib/sync/events.ts` :
```ts
export type ProgressEventType =
  | 'simulation.completed' | 'srs.reviewed' | 'plan.done' | 'case.layer_reached' | 'program.configured'
  | 'term.favorited' | 'term.unfavorited'
  | 'deck.created' | 'deck.renamed' | 'deck.query_changed' | 'deck.deleted' | 'deck.term_added' | 'deck.term_removed'
  | 'srs.settings_changed'
  | 'term.personal_created' | 'term.personal_deleted';
```

`sync-protocol.md` — ajouter à la fin de la phrase « **Synchronisé** » :
« Termes personnels (F3) : `term.personal_created` (subject = `pt-<fnv1a32 hex du terme en minuscules>`, payload `{ term (1–80), context? (≤ 300, tronqué), explanation? (≤ 600, tronqué), caseId?, createdAt }`) et `term.personal_deleted` (`{}`) ; projection → Dexie `personal_terms` : par id, dernier événement par l'ordre de projection gagne ; re-créer après suppression est autorisé (même id, `srs` repart de `freshSrs`). `srs.reviewed` dont le subject commence par `pt-` s'applique à `personal_terms`, sinon à `fachbegriffe`. Un favori de terme personnel est un `term.favorited` de subject `pt-…`. La synchronisation de contenu ne touche jamais `personal_terms`. »

- [ ] **Step 4 : appliquer localement, vérifier** — `docker exec -i supabase_db_app psql -U postgres < supabase/migrations/20260925000013_personal_terms_events.sql; echo exit=$?` → 0 ; relancer `supabase functions serve --env-file supabase/.env` ; `node scripts/testRls.mjs; echo exit=$?` → 0 ; `npm run typecheck; echo exit=$?` → 0 ; `node scripts/dumpSchema.mjs && git diff --stat ../docs/contracts/schema.sql` → la contrainte seulement.

- [ ] **Step 5 : commit**
```bash
git add ../docs/contracts/sync-protocol.md
git add ../docs/contracts/schema.sql
git add supabase/migrations/20260925000013_personal_terms_events.sql
git add supabase/functions/events/index.ts
git add src/lib/sync/events.ts
git add supabase/tests/events.test.ts
git commit -m "feat(contrat): term.personal_created / term.personal_deleted — termes personnels (F3)"
```

---

### Task A2 : Modèle, table Dexie v4, projection des termes personnels (platform-sync-engineer)

**Files:**
- Modify: `app/src/db/types.ts` (après `Favorite`)
- Modify: `app/src/db/db.ts` (table + `version(4)` + `wipeDatabase`)
- Create: `app/src/lib/collections/personalTerms.ts`
- Modify: `app/src/lib/sync/projections.ts`
- Test: `app/src/lib/collections/personalTerms.test.ts`, `app/src/lib/content/apply.test.ts` (cas AC-4)

**Interfaces:**
- Consumes: `sortEvents` (`lib/collections/project.ts`), `freshSrs` (`lib/srs.ts`), `syncQueue.push`, `ProgressEvent`.
- Produces:
  ```ts
  // db/types.ts
  export interface PersonalTerm { id: string; term: string; context?: string; explanation?: string; caseId?: string; createdAt: string; srs: Srs }
  // lib/collections/personalTerms.ts
  export const PERSONAL_PREFIX = 'pt-';
  export const isPersonalId: (id: string) => boolean;
  export function fnv1a32(s: string): number;
  export function personalTermId(term: string): string;              // 'pt-' + 8 hex
  export function cleanSelection(raw: string): string;               // bords/ponctuation retirés, espaces normalisés
  export const PT_LIMITS = { term: 80, context: 300, explanation: 600 } as const;
  export interface PersonalTermInput { term: string; context?: string; explanation?: string; caseId?: string }
  export function sanitizePersonalTerm(input: PersonalTermInput): Omit<PersonalTerm, 'id' | 'srs' | 'createdAt'> | null; // null si terme vide ou > 80
  export function projectPersonalTerms(events: ProgressEvent[]): PersonalTerm[];
  export async function writePersonalTerms(list: PersonalTerm[]): Promise<void>;
  export async function reprojectPersonalTerms(): Promise<void>;
  export async function createPersonalTerm(input: PersonalTermInput): Promise<{ id: string; created: boolean }>;
  export async function deletePersonalTerm(id: string): Promise<void>;
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/collections/personalTerms.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import { rebuildProjections } from '@/lib/sync/projections';
import {
  personalTermId, cleanSelection, sanitizePersonalTerm, projectPersonalTerms,
  createPersonalTerm, deletePersonalTerm, isPersonalId, PT_LIMITS,
} from './personalTerms';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const at = (s: number) => new Date(Date.UTC(2026, 8, 25, 10, 0, s)).toISOString();
const ev = (type: ProgressEvent['type'], subject: string, payload: unknown, s: number, id = `${type}-${s}`): ProgressEvent =>
  ({ id, user_id: 'u', type, subject_id: subject, payload, occurred_at: at(s) });

describe('id et nettoyage', () => {
  it('même mot (casse ignorée) → même id pt-<8 hex>', () => {
    expect(personalTermId('Belastungsdyspnoe')).toMatch(/^pt-[0-9a-f]{8}$/);
    expect(personalTermId('belastungsdyspnoe')).toBe(personalTermId('BELASTUNGSDYSPNOE'));
    expect(isPersonalId(personalTermId('x'))).toBe(true);
    expect(isPersonalId('fb-aszites')).toBe(false);
  });
  it('cleanSelection retire guillemets/ponctuation de bord et normalise les espaces', () => {
    expect(cleanSelection('  „Belastungs  dyspnoe“, ')).toBe('Belastungs dyspnoe');
  });
  it('sanitize : tronque context/explanation, rejette un terme vide ou trop long', () => {
    const s = sanitizePersonalTerm({ term: 'Wort', context: 'c'.repeat(400), explanation: 'e'.repeat(900) })!;
    expect(s.context!.length).toBe(PT_LIMITS.context);
    expect(s.explanation!.length).toBe(PT_LIMITS.explanation);
    expect(sanitizePersonalTerm({ term: '  ' })).toBeNull();
    expect(sanitizePersonalTerm({ term: 'x'.repeat(81) })).toBeNull();
  });
});

describe('projectPersonalTerms', () => {
  const id = personalTermId('Belastungsdyspnoe');
  const created = (s: number, eid?: string) => ev('term.personal_created', id, { term: 'Belastungsdyspnoe', createdAt: at(s) }, s, eid);
  it('création → un terme avec srs neuf', () => {
    const [t] = projectPersonalTerms([created(1)]);
    expect(t).toMatchObject({ id, term: 'Belastungsdyspnoe' });
    expect(t.srs.state).toBe('Neu');
  });
  it('deux créations du même mot (deux appareils) → un seul terme (AC-3)', () => {
    expect(projectPersonalTerms([created(1, 'a'), created(2, 'b')])).toHaveLength(1);
  });
  it('suppression puis re-création → présent, srs repart de zéro', () => {
    const reviewed = ev('srs.reviewed', id, { interval: 6, easeFactor: 2.5, dueDate: 1, repetitions: 2, lapses: 0, state: 'Gelernt' }, 2);
    expect(projectPersonalTerms([created(1), reviewed, ev('term.personal_deleted', id, {}, 3)])).toEqual([]);
    const [t] = projectPersonalTerms([created(1), reviewed, ev('term.personal_deleted', id, {}, 3), created(4, 'c')]);
    expect(t.srs.state).toBe('Neu');
  });
  it('srs.reviewed postérieur à la création → état conservé (AC-4b)', () => {
    const [t] = projectPersonalTerms([created(1), ev('srs.reviewed', id, { interval: 6, easeFactor: 2.5, dueDate: 9, repetitions: 2, lapses: 0, state: 'Gelernt' }, 2)]);
    expect(t.srs.interval).toBe(6);
  });
});

describe('create / delete / rebuild', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.fachbegriffe.clear(); });
  it('createPersonalTerm est idempotent : un seul événement', async () => {
    const a = await createPersonalTerm({ term: 'Belastungsdyspnoe', context: 'Er hat Belastungsdyspnoe.' });
    const b = await createPersonalTerm({ term: 'belastungsdyspnoe' });
    expect(a).toEqual({ id: b.id, created: true }); expect(b.created).toBe(false);
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_created')).toHaveLength(1);
    expect(await db.personal_terms.get(a.id)).toMatchObject({ context: 'Er hat Belastungsdyspnoe.' });
  });
  it('deletePersonalTerm retire le terme et son favori', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    await db.progress_events.put(ev('term.favorited', id, {}, 5));
    await rebuildProjections();
    expect(await db.favorites.get(id)).toBeTruthy();
    await deletePersonalTerm(id);
    expect(await db.personal_terms.get(id)).toBeUndefined();
    expect(await db.favorites.get(id)).toBeUndefined();
  });
  it('rebuildProjections : srs.reviewed pt-… écrit dans personal_terms, jamais dans fachbegriffe', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    await db.progress_events.put({ ...ev('srs.reviewed', id, { interval: 1, easeFactor: 2.5, dueDate: 5, repetitions: 1, lapses: 0, state: 'Gelernt' }, 59), occurred_at: new Date(Date.now() + 1000).toISOString() });
    await rebuildProjections();
    expect((await db.personal_terms.get(id))!.srs.state).toBe('Gelernt');
    expect(await db.fachbegriffe.count()).toBe(0);
  });
});
```

Dans `app/src/lib/content/apply.test.ts`, ajouter dans le `describe` (et `await db.personal_terms.clear()` dans le `beforeEach`) :
```ts
  it('ne touche jamais personal_terms, même en purge de tier (AC-4)', async () => {
    await db.personal_terms.put({ id: 'pt-00000001', term: 'Wort', createdAt: '2026-09-25T10:00:00Z', srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } });
    await applyContent(db, [item('fb-x', 'fachbegriff', 3), item('fb-x', 'fachbegriff', 3, true)], 1);
    expect(await db.personal_terms.get('pt-00000001')).toBeTruthy();
  });
```

- [ ] **Step 2 : lancer, vérifier l'échec** — `npx vitest run src/lib/collections/personalTerms.test.ts src/lib/content/apply.test.ts` → FAIL (module et table introuvables).

- [ ] **Step 3 : implémentation**

`db/types.ts`, après `FAVORITES_DECK_ID` :
```ts
/** Terme personnel (F3) : créé par ★ sur une sélection hors glossaire. Projeté
 *  depuis le journal (term.personal_created / _deleted) — jamais écrit dans
 *  `fachbegriffe`, que la sync de contenu réécrit. */
export interface PersonalTerm { id: string; term: string; context?: string; explanation?: string; caseId?: string; createdAt: string; srs: Srs }
```

`db/db.ts` : importer `PersonalTerm` ; ajouter `personal_terms!: Table<PersonalTerm, string>;` ; après `version(3)` :
```ts
    this.version(4).stores({
      personal_terms: 'id, term, srs.state, srs.dueDate',
    });
```
et ajouter `db.personal_terms.clear()` dans `wipeDatabase`.

```ts
// app/src/lib/collections/personalTerms.ts
// ============================================================================
// Termes personnels (F3, spec §3.1). Mutations = UN événement + reprojection.
// L'id est DÉTERMINISTE (FNV-1a du terme en minuscules) : le même mot créé sur
// deux appareils, même hors ligne, converge vers un seul terme.
// ============================================================================
import { db } from '@/db/db';
import type { PersonalTerm, Srs } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { syncQueue } from '@/lib/sync/queue';
import { freshSrs } from '@/lib/srs';
import { sortEvents } from './project';
import { reprojectCollections } from './index';

export const PERSONAL_PREFIX = 'pt-';
export const isPersonalId = (id: string): boolean => id.startsWith(PERSONAL_PREFIX);
export const PT_LIMITS = { term: 80, context: 300, explanation: 600 } as const;

export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
export const personalTermId = (term: string): string =>
  PERSONAL_PREFIX + fnv1a32(cleanSelection(term).toLowerCase()).toString(16).padStart(8, '0');

export function cleanSelection(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().replace(/^[\s„“"'«»(\[]+|[\s“”"'«»)\].,;:!?]+$/g, '');
}

export interface PersonalTermInput { term: string; context?: string; explanation?: string; caseId?: string }
const cut = (s: string | undefined, n: number) => { const t = s?.trim(); return t ? t.slice(0, n) : undefined; };
export function sanitizePersonalTerm(input: PersonalTermInput): Omit<PersonalTerm, 'id' | 'srs' | 'createdAt'> | null {
  const term = cleanSelection(input.term);
  if (!term || term.length > PT_LIMITS.term) return null;
  const out: Omit<PersonalTerm, 'id' | 'srs' | 'createdAt'> = { term };
  const context = cut(input.context, PT_LIMITS.context); if (context) out.context = context;
  const explanation = cut(input.explanation, PT_LIMITS.explanation); if (explanation) out.explanation = explanation;
  if (input.caseId) out.caseId = input.caseId;
  return out;
}

/** Projection PURE : par id, dernier created/deleted gagne (ordre sortEvents) ;
 *  srs = dernier srs.reviewed APRÈS la dernière création, sinon freshSrs. */
export function projectPersonalTerms(events: ProgressEvent[]): PersonalTerm[] {
  const live = new Map<string, { ev: ProgressEvent; srs: Srs | null }>();
  for (const e of sortEvents(events)) {
    const id = e.subject_id;
    if (!id || !isPersonalId(id)) continue;
    if (e.type === 'term.personal_created') live.set(id, { ev: e, srs: null });
    else if (e.type === 'term.personal_deleted') live.delete(id);
    else if (e.type === 'srs.reviewed') { const cur = live.get(id); if (cur) cur.srs = e.payload as Srs; }
  }
  const out: PersonalTerm[] = [];
  for (const [id, { ev, srs }] of live) {
    const p = sanitizePersonalTerm(ev.payload as PersonalTermInput);
    if (!p) continue;
    const createdAt = (ev.payload as { createdAt?: string }).createdAt ?? ev.occurred_at;
    out.push({ id, ...p, createdAt, srs: srs ?? freshSrs(Date.parse(createdAt)) });
  }
  return out;
}

export async function writePersonalTerms(list: PersonalTerm[]): Promise<void> {
  await db.transaction('rw', db.personal_terms, async () => { await db.personal_terms.clear(); await db.personal_terms.bulkPut(list); });
}
export async function reprojectPersonalTerms(): Promise<void> {
  await writePersonalTerms(projectPersonalTerms(await db.progress_events.toArray()));
}

export async function createPersonalTerm(input: PersonalTermInput): Promise<{ id: string; created: boolean }> {
  const clean = sanitizePersonalTerm(input);
  if (!clean) throw new Error('personal_term_invalid');
  const id = personalTermId(clean.term);
  if (await db.personal_terms.get(id)) return { id, created: false };
  await syncQueue.push({ type: 'term.personal_created', subject_id: id, payload: { ...clean, createdAt: new Date().toISOString() } });
  await reprojectPersonalTerms();
  return { id, created: true };
}

export async function deletePersonalTerm(id: string): Promise<void> {
  if (!isPersonalId(id)) throw new Error('not_personal');
  if (await db.favorites.get(id)) await syncQueue.push({ type: 'term.unfavorited', subject_id: id, payload: {} });
  await syncQueue.push({ type: 'term.personal_deleted', subject_id: id, payload: {} });
  await reprojectPersonalTerms();
  await reprojectCollections();
}
```

`lib/sync/projections.ts` — dans `rebuildProjections`, remplacer la boucle SRS par :
```ts
  await db.transaction('rw', db.fachbegriffe, async () => {
    for (const [id, e] of byTerm) {
      if (isPersonalId(id)) continue;                 // F3 : routé vers personal_terms (projection dédiée)
      const fb = await db.fachbegriffe.get(id); if (fb) await db.fachbegriffe.update(id, { srs: e.payload as Srs });
    }
  });
```
et, après `writeCollections(...)` : `await writePersonalTerms(projectPersonalTerms(events));` (imports `isPersonalId`, `projectPersonalTerms`, `writePersonalTerms` depuis `@/lib/collections/personalTerms`).

- [ ] **Step 4 : lancer, vérifier** — `npx vitest run src/lib/collections src/lib/content src/lib/sync; echo exit=$?` → 0 ; gates globaux → 0.

- [ ] **Step 5 : commit**
```bash
git add src/db/types.ts
git add src/db/db.ts
git add src/lib/collections/personalTerms.ts
git add src/lib/collections/personalTerms.test.ts
git add src/lib/sync/projections.ts
git add src/lib/content/apply.test.ts
git commit -m "feat(fachbegriffe): termes personnels — id déterministe, Dexie v4, projection, SRS routé par préfixe (F3)"
```

---

### Task A3 : Source unique `allTerms` + `rateTerm` (drill, liste, favoris)

**Files:**
- Create: `app/src/lib/collections/allTerms.ts`
- Modify: `app/src/hooks/useData.ts`
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (l. 25 et 170-175)
- Modify: `app/src/features/fachbegriffe/FachbegriffePage.tsx` (l. 24)
- Test: `app/src/lib/collections/allTerms.test.ts`, `app/src/features/fachbegriffe/DrillPage.test.tsx` (nouveau cas)

**Interfaces:**
- Consumes: `PersonalTerm`, `isPersonalId` (A2), `reviewSrs`, `Grade`, `syncQueue`.
- Produces:
  ```ts
  export type PersonalTermView = Fachbegriff & { personal: true; context?: string; caseId?: string };
  export type AnyTerm = Fachbegriff | PersonalTermView;
  export const isPersonalView: (t: AnyTerm) => t is PersonalTermView;
  export function toView(pt: PersonalTerm): PersonalTermView;   // specialty 'Allgemein', translationSimple = explanation ?? '', pathologyTags/centers/linkedCaseIds []
  export function mergeTerms(fb: Fachbegriff[], pts: PersonalTerm[]): AnyTerm[];
  export async function rateTerm(card: AnyTerm, g: Grade): Promise<void>;
  // hooks/useData.ts
  export const usePersonalTerms: () => PersonalTerm[] | undefined;
  export function useAllTerms(): AnyTerm[] | undefined;         // undefined tant qu'une des deux sources charge
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/collections/allTerms.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import type { Fachbegriff, PersonalTerm } from '@/db/types';
import { freshSrs } from '@/lib/srs';
import { toView, mergeTerms, rateTerm, isPersonalView } from './allTerms';
import { buildDrillQueue } from './drillQueue';

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
import { syncQueue } from '@/lib/sync/queue';

const fb = { id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as Fachbegriff;
const pt: PersonalTerm = { id: 'pt-0000abcd', term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) };

describe('allTerms', () => {
  beforeEach(async () => { await db.fachbegriffe.clear(); await db.personal_terms.clear(); vi.mocked(syncQueue.push).mockClear(); });
  it('toView : format Fachbegriff, personal=true, reformulation = explication', () => {
    const v = toView(pt);
    expect(v).toMatchObject({ id: pt.id, term: pt.term, translationSimple: 'Atemnot bei Belastung', specialty: 'Allgemein', personal: true });
    expect(isPersonalView(v)).toBe(true); expect(isPersonalView(fb)).toBe(false);
  });
  it('mergeTerms : glossaire + personnels ; le drill accepte les deux (AC-2)', () => {
    const all = mergeTerms([fb], [pt]);
    expect(all.map((t) => t.id)).toEqual(['fb-aszites', 'pt-0000abcd']);
    expect(buildDrillQueue(all).map((t) => t.id)).toContain('pt-0000abcd');
  });
  it('rateTerm : pt- écrit dans personal_terms et émet srs.reviewed', async () => {
    await db.personal_terms.put(pt);
    await rateTerm(toView(pt), 4);
    expect((await db.personal_terms.get(pt.id))!.srs.repetitions).toBe(1);
    expect(syncQueue.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'srs.reviewed', subject_id: pt.id }));
  });
  it('rateTerm : fb- écrit dans fachbegriffe (inchangé)', async () => {
    await db.fachbegriffe.put(fb);
    await rateTerm(fb, 4);
    expect((await db.fachbegriffe.get(fb.id))!.srs.repetitions).toBe(1);
  });
});
```

Dans `DrillPage.test.tsx` ajouter un cas qui pose un `personal_terms` dû (`srs: freshSrs(0)`) et zéro Fachbegriff, rend `/fachbegriffe/drill`, puis `expect(await screen.findByText('Belastungsdyspnoe')).toBeInTheDocument()` (utiliser le rendu/routeur déjà présents dans ce fichier).

- [ ] **Step 2 : lancer, vérifier l'échec** — `npx vitest run src/lib/collections/allTerms.test.ts src/features/fachbegriffe/DrillPage.test.tsx` → FAIL.

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/collections/allTerms.ts
// ============================================================================
// Source UNIQUE des termes révisables (F3 §3.1) : glossaire publié + termes
// personnels vus au format Fachbegriff. drill, liste, favoris, pertinence lisent
// ceci ; la notation passe par rateTerm (aiguillage par préfixe pt-).
// ============================================================================
import { db } from '@/db/db';
import type { Fachbegriff, PersonalTerm } from '@/db/types';
import { reviewSrs, type Grade } from '@/lib/srs';
import { syncQueue } from '@/lib/sync/queue';
import { isPersonalId } from './personalTerms';

export type PersonalTermView = Fachbegriff & { personal: true; context?: string; caseId?: string };
export type AnyTerm = Fachbegriff | PersonalTermView;
export const isPersonalView = (t: AnyTerm): t is PersonalTermView => (t as PersonalTermView).personal === true;

export function toView(pt: PersonalTerm): PersonalTermView {
  return {
    id: pt.id, term: pt.term, translationSimple: pt.explanation ?? '', specialty: 'Allgemein',
    pathologyTags: [], centers: [], linkedCaseIds: [], srs: pt.srs, personal: true,
    ...(pt.context ? { context: pt.context } : {}), ...(pt.caseId ? { caseId: pt.caseId } : {}),
  };
}
export const mergeTerms = (fb: Fachbegriff[], pts: PersonalTerm[]): AnyTerm[] => [...fb, ...pts.map(toView)];

export async function rateTerm(card: AnyTerm, g: Grade): Promise<void> {
  const srs = reviewSrs(card.srs, g);
  if (isPersonalId(card.id)) await db.personal_terms.update(card.id, { srs });
  else await db.fachbegriffe.update(card.id, { srs });
  syncQueue.push({ type: 'srs.reviewed', subject_id: card.id, payload: srs }).catch((e) => console.warn('[sync]', e));
}
```
(Si `'Allgemein'` n'est pas dans l'union `Specialty`, vérifier `db/types.ts` : il y figure — `fb-palliativ` a `sp: 'Allgemein'`.)

`hooks/useData.ts` :
```ts
import { mergeTerms, type AnyTerm } from '@/lib/collections/allTerms';
export const usePersonalTerms = () => useLiveQuery(() => db.personal_terms.toArray(), [], undefined);
/** Glossaire publié + termes personnels (F3). undefined tant que l'un charge. */
export function useAllTerms(): AnyTerm[] | undefined {
  const fb = useFachbegriffe(); const pts = usePersonalTerms();
  return useMemo(() => (fb && pts ? mergeTerms(fb, pts) : undefined), [fb, pts]);
}
```

`DrillPage.tsx` : `const begriffe = useAllTerms();` (import depuis `@/hooks/useData`) ; remplacer les lignes 172-174 par `await rateTerm(card, g);` (import `rateTerm` depuis `@/lib/collections/allTerms`), en gardant le reste de `grade` (compteur `reviewedToday`, avance). Retirer les imports devenus inutiles (`reviewSrs`, `syncQueue`, `db` si plus utilisé) pour `noUnusedLocals`.

`FachbegriffePage.tsx` l. 24 : `const begriffe = useAllTerms();` — favoris, decks et liste reçoivent ainsi les termes personnels (types compatibles : `AnyTerm` est un `Fachbegriff`).

`CaseTermsPanel`, `relevance`, `drillQueue` : inchangés en signature (ils prennent `Fachbegriff[]`, `AnyTerm` y est assignable). Le panneau du cas reste le glossaire lié au cas (spec : termes liés).

- [ ] **Step 4 : lancer, vérifier** — tests ciblés → PASS ; gates globaux → 0.

- [ ] **Step 5 : commit**
```bash
git add src/lib/collections/allTerms.ts
git add src/lib/collections/allTerms.test.ts
git add src/hooks/useData.ts
git add src/features/fachbegriffe/DrillPage.tsx
git add src/features/fachbegriffe/DrillPage.test.tsx
git add src/features/fachbegriffe/FachbegriffePage.tsx
git commit -m "feat(fachbegriffe): source unique glossaire + termes personnels, rateTerm aiguillé (F3)"
```

---

### Task A4 : `lookupTerm` — exact puis formes fléchies simples

**Files:**
- Modify: `app/src/lib/dictionary.ts` (après `exactLookup`)
- Test: `app/src/lib/dictionary.exact.test.ts`

**Interfaces:**
- Produces: `export function lookupTerm(selection: string, begriffe: Fachbegriff[]): Fachbegriff | null;` — `exactLookup` reste inchangé (FB2-M3).

- [ ] **Step 1 : tests qui échouent** — ajouter :
```ts
import { lookupTerm } from './dictionary';
describe('lookupTerm (F3) — exact, puis base sans e/en/s/n, jamais de flou', () => {
  const g = [fb('Aszites'), fb('Sonde'), fb('Sondenernährung'), fb('Ödem')];
  it('exact d’abord', () => expect(lookupTerm('Aszites', g)?.term).toBe('Aszites'));
  it('« Asziten » résout « Aszites » (AC-4c)', () => expect(lookupTerm('Asziten', g)?.term).toBe('Aszites'));
  it('« Sonden » résout « Sonde »', () => expect(lookupTerm('Sonden', g)?.term).toBe('Sonde'));
  it('jamais de préfixe ni de composé', () => {
    expect(lookupTerm('Sond', g)).toBeNull();
    expect(lookupTerm('Sondenernähr', g)).toBeNull();
  });
  it('« Ödems » résout « Ödem » (base de 4 lettres)', () => expect(lookupTerm('Ödems', g)?.term).toBe('Ödem'));
  it('base < 4 lettres : pas de dérivation', () => expect(lookupTerm('Tbcs', [fb('Tbc')])).toBeNull());
});
```

- [ ] **Step 2** — `npx vitest run src/lib/dictionary.exact.test.ts` → FAIL (`lookupTerm` absent).

- [ ] **Step 3 : implémentation**
```ts
const SUFFIXES = ['en', 'e', 's', 'n'];
const norm = (s: string) => s.trim().replace(/^[\s„“"'«»(\[]+|[\s“”"'«»)\].,;:!?]+$/g, '').toLowerCase();
/** Bases candidates d'un mot : lui-même, puis sans suffixe e/en/s/n (base ≥ 4 lettres). */
function stems(w: string): string[] {
  const out = [w];
  for (const s of SUFFIXES) if (w.endsWith(s) && w.length - s.length >= 4) out.push(w.slice(0, -s.length));
  return out;
}
/** Résolution d'une sélection (F3 §3.4) : exact, puis formes fléchies simples
 *  des DEUX côtés (« Asziten » ↔ « Aszites » par la base « aszite »). Jamais de
 *  préfixe, d'inclusion ni de distance d'édition (FB2-M3). */
export function lookupTerm(selection: string, begriffe: Fachbegriff[]): Fachbegriff | null {
  const exact = exactLookup(selection, begriffe);
  if (exact) return exact;
  const q = norm(selection);
  if (!q || /\s/.test(q)) return null;
  const want = new Set(stems(q).slice(1).concat(stems(q)));
  for (const b of begriffe) {
    const t = b.term.trim().toLowerCase();
    if (stems(t).some((s) => want.has(s))) return b;
  }
  return null;
}
```
Ambiguïté possible (deux termes partageant une base) : le premier dans l'ordre du glossaire gagne ; le validateur C1 interdit déjà les doublons exacts.

- [ ] **Step 4** — tests → PASS ; typecheck → 0.

- [ ] **Step 5 : commit**
```bash
git add src/lib/dictionary.ts
git add src/lib/dictionary.exact.test.ts
git commit -m "feat(dictionnaire): lookupTerm — formes fléchies simples e/en/s/n, sans flou (F3)"
```

---

### Task A5 : Bulle « Expliquer » — tactile, pastille ★, confirmation, lien deck (front-implementer)

**Files:**
- Modify: `app/src/lib/collections/personalTerms.ts` (ajout `starSelection`)
- Modify: `app/src/components/SelectionExplainer.tsx` (réécriture du déclenchement et de la pastille)
- Test: `app/src/components/SelectionExplainer.test.tsx` (créer), `app/src/lib/collections/personalTerms.test.ts` (cas `starSelection`)

**Interfaces:**
- Consumes: `lookupTerm` (A4), `createPersonalTerm`, `personalTermId`, `cleanSelection` (A2), `toggleFavorite` (F1), `toView` (A3), `useUi().openGlossary`.
- Produces:
  ```ts
  export type StarResult = { id: string; kind: 'glossary' | 'personal'; created: boolean; favorite: boolean };
  export async function starSelection(input: { selection: string; context?: string; explanation?: string; caseId?: string }, begriffe: Fachbegriff[]): Promise<StarResult>;
  export async function isStarred(selection: string, begriffe: Fachbegriff[]): Promise<boolean>;
  ```

- [ ] **Step 1 : tests qui échouent**

Dans `personalTerms.test.ts` :
```ts
import { starSelection } from './personalTerms';
describe('starSelection', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); });
  const g = [{ id: 'fb-aszites', term: 'Aszites', translationSimple: 'x' } as never];
  it('terme du glossaire (y compris fléchi) → term.favorited sur fb-… (AC-1)', async () => {
    const r = await starSelection({ selection: 'Asziten', caseId: 'case-leberzirrhose' }, g);
    expect(r).toEqual({ id: 'fb-aszites', kind: 'glossary', created: false, favorite: true });
    expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'case-leberzirrhose' });
  });
  it('hors glossaire → terme personnel + favori (AC-2)', async () => {
    const r = await starSelection({ selection: 'Belastungsdyspnoe', context: 'Seit Wochen Belastungsdyspnoe.' }, g);
    expect(r.kind).toBe('personal'); expect(r.created).toBe(true); expect(r.favorite).toBe(true);
    expect(await db.favorites.get(r.id)).toBeTruthy();
  });
  it('★ à nouveau → bascule du favori, aucun doublon (AC-3)', async () => {
    const a = await starSelection({ selection: 'Belastungsdyspnoe' }, g);
    const b = await starSelection({ selection: 'belastungsdyspnoe' }, g);
    expect(b).toEqual({ id: a.id, kind: 'personal', created: false, favorite: false });
    expect(await db.personal_terms.count()).toBe(1);
  });
});
```

```tsx
// app/src/components/SelectionExplainer.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { SelectionExplainer } from './SelectionExplainer';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

function selectText(el: HTMLElement) {
  const range = document.createRange(); range.selectNodeContents(el);
  range.getBoundingClientRect = () => ({ left: 10, top: 100, width: 60, height: 16, right: 70, bottom: 116, x: 10, y: 100, toJSON() {} }) as DOMRect;
  const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
}

describe('SelectionExplainer', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await db.fachbegriffe.clear(); await db.favorites.clear(); await db.personal_terms.clear(); await db.progress_events.clear();
    await db.fachbegriffe.put({ id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never);
  });
  it('selectionchange (sans souris) → pastille ★ + Expliquer après 250 ms (AC-4c)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    expect(await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expliquer/ })).toBeInTheDocument();
  });
  it('★ → favori + confirmation + lien deck (AC-1)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ }));
    expect(await screen.findByText('Ajouté aux favoris')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter à un deck…' })).toBeInTheDocument();
    expect(await db.favorites.get('fb-aszites')).toBeTruthy();
  });
  it('hors glossaire → « Carte créée » (AC-2)', async () => {
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris : Belastungsdyspnoe/ }));
    expect(await screen.findByText('Carte créée')).toBeInTheDocument();
    expect(await db.personal_terms.count()).toBe(1);
  });
});
```

- [ ] **Step 2** — `npx vitest run src/components/SelectionExplainer.test.tsx src/lib/collections/personalTerms.test.ts` → FAIL.

- [ ] **Step 3 : implémentation**

`personalTerms.ts` (ajout ; importer `lookupTerm` depuis `@/lib/dictionary`, `toggleFavorite` depuis `./index`, `Fachbegriff` depuis `@/db/types`) :
```ts
export type StarResult = { id: string; kind: 'glossary' | 'personal'; created: boolean; favorite: boolean };
/** ★ de la bulle (F3 D2/D3) : glossaire → favori du terme publié ; sinon terme
 *  personnel (créé une seule fois) + favori. Un 2ᵉ ★ bascule le favori. */
export async function starSelection(input: { selection: string; context?: string; explanation?: string; caseId?: string }, begriffe: Fachbegriff[]): Promise<StarResult> {
  const opts = input.caseId ? { caseId: input.caseId } : {};
  const hit = lookupTerm(input.selection, begriffe);
  if (hit) return { id: hit.id, kind: 'glossary', created: false, favorite: await toggleFavorite(hit.id, opts) };
  const { id, created } = await createPersonalTerm({ term: input.selection, context: input.context, explanation: input.explanation, caseId: input.caseId });
  return { id, kind: 'personal', created, favorite: await toggleFavorite(id, opts) };
}
export async function isStarred(selection: string, begriffe: Fachbegriff[]): Promise<boolean> {
  const hit = lookupTerm(selection, begriffe);
  const id = hit ? hit.id : personalTermId(selection);
  return !!(await db.favorites.get(id));
}
```
Attention au cycle d'import `index.ts` ↔ `personalTerms.ts` : `index.ts` n'importe pas `personalTerms.ts` — pas de cycle.

`SelectionExplainer.tsx` — remplacer le premier `useEffect` (écoute `mouseup`) par :
```tsx
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const seldom = window.getSelection();
      const text = seldom?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!text || text.length < 2 || text.length > 220) return;
      const node = seldom?.anchorNode?.parentElement;
      if (node?.closest('input, textarea, [contenteditable="true"]')) return;
      if (rootRef.current && node && rootRef.current.contains(node)) return;
      try {
        const rect = seldom!.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        const context = (node?.closest('p, li, td, blockquote, div')?.textContent ?? '').replace(/\s+/g, ' ').trim();
        setAnchor({ text, context, x: Math.min(Math.max(rect.left + rect.width / 2, 110), window.innerWidth - 110), y: rect.top });
        setBubble(null); setDone(null);
      } catch { /* sélection vide */ }
    };
    // selectionchange : clavier, souris ET poignées tactiles (mobile) ; anti-rebond 250 ms.
    const onSelChange = () => { clearTimeout(timer); timer = setTimeout(read, 250); };
    const onPointerUp = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      clearTimeout(timer); timer = setTimeout(read, 10);
    };
    const onScroll = () => { setAnchor(null); setBubble(null); setDone(null); };
    document.addEventListener('selectionchange', onSelChange);
    document.addEventListener('pointerup', onPointerUp);
    window.addEventListener('scroll', onScroll, true);
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', onSelChange); document.removeEventListener('pointerup', onPointerUp); window.removeEventListener('scroll', onScroll, true); };
  }, []);
```
Le `useEffect` de fermeture passe de `mousedown` à `pointerdown`.

État et ★ (en tête de composant) :
```tsx
interface Anchor { text: string; context: string; x: number; y: number }
// …
  const favorites = useFavorites();
  const caseId = useContext(CaseContext)?.caseId;          // CaseContext de F2b (features/fachbegriffe/CaseContext.tsx) ; undefined hors cas
  const openGlossary = useUi((s) => s.openGlossary);
  const [done, setDone] = useState<null | { label: string; id: string }>(null);
  const hit = anchor ? lookupTerm(anchor.text, begriffe) : null;
  const clean = anchor ? cleanSelection(anchor.text) : '';
  const starId = hit ? hit.id : clean ? personalTermId(clean) : '';
  const starred = !!favorites?.some((f) => f.termId === starId);
  const canStar = !!clean && clean.length <= PT_LIMITS.term;

  const star = async () => {
    if (!anchor || !canStar) return;
    const r = await starSelection({ selection: anchor.text, context: anchor.context, explanation: bubble?.source === 'IA' ? bubble.text : undefined, caseId }, begriffe);
    setDone(r.favorite ? { label: r.created ? 'Carte créée' : 'Ajouté aux favoris', id: r.id } : { label: 'Retiré des favoris', id: r.id });
  };
  const openDeckPicker = async () => {
    if (!done) return;
    const target = hit ?? (await db.personal_terms.get(done.id).then((p) => (p ? toView(p) : null)));
    if (target) openGlossary(target);                        // le tiroir porte déjà « Ajouter à un deck… » (F1)
    setAnchor(null); setBubble(null); setDone(null);
  };
```
(Vérifier le nom exact exporté par `CaseContext.tsx` avant d'écrire l'import ; si le contexte expose un autre champ, l'adapter — c'est celui que `TermHoverCard` lit.)

Rendu de la pastille (remplace le bouton seul) :
```tsx
      {!bubble ? (
        <div className="flex items-center gap-1 rounded-full bg-brand-600 p-0.5 text-xs font-semibold text-white shadow-lg ring-1 ring-brand-700 motion-safe:animate-fade-in">
          <button type="button" onClick={() => { void star(); }} disabled={!canStar}
            aria-pressed={starred} aria-label={starred ? `Retirer des favoris : ${clean}` : `Ajouter aux favoris : ${clean}`}
            className={`grid h-11 w-11 place-items-center rounded-full text-lg hover:bg-brand-700 disabled:opacity-40 ${starred ? 'text-signal-300' : 'text-white'}`}>{starred ? '★' : '☆'}</button>
          <button type="button" onClick={() => { void explain(); }} className="flex h-11 items-center gap-1 rounded-full px-3 hover:bg-brand-700">
            <Icon name="search" className="h-3.5 w-3.5" />Expliquer
          </button>
        </div>
      ) : ( /* bulle existante inchangée */ )}
      {done && (
        <div role="status" className="mt-1 flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-[12px] shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <span>{done.label}</span>
          <button type="button" onClick={() => { void openDeckPicker(); }} className="min-h-11 font-medium text-brand-600 dark:text-brand-300">Ajouter à un deck…</button>
        </div>
      )}
```
Dans `explain()`, remplacer `exactLookup(term, begriffe)` par `lookupTerm(term, begriffe)`. Importer `useContext`, `useFavorites`, `db`, `lookupTerm`, `starSelection`, `cleanSelection`, `personalTermId`, `PT_LIMITS`, `toView`, `CaseContext`.

- [ ] **Step 4** — tests → PASS ; gates globaux → 0.

- [ ] **Step 5 : commit**
```bash
git add src/lib/collections/personalTerms.ts
git add src/lib/collections/personalTerms.test.ts
git add src/components/SelectionExplainer.tsx
git add src/components/SelectionExplainer.test.tsx
git commit -m "feat(expliquer): ★ dans la pastille — glossaire ou carte personnelle, tactile via selectionchange (F3)"
```

---

### Task A6 : Supprimer un terme personnel depuis le tiroir (front-implementer)

**Files:**
- Modify: `app/src/components/GlossaryDrawer.tsx` (bloc d'en-tête, près du ★ l. 94)
- Test: `app/src/components/GlossaryDrawer.test.tsx` (créer si absent, sinon ajouter)

**Interfaces:**
- Consumes: `deletePersonalTerm` (A2), `isPersonalView` (A3).

- [ ] **Step 1 : test qui échoue**
```tsx
// app/src/components/GlossaryDrawer.test.tsx (cas ajouté)
it('terme personnel : « Supprimer ma carte » émet term.personal_deleted et ferme', async () => {
  await db.personal_terms.put({ id: 'pt-0000abcd', term: 'Belastungsdyspnoe', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) });
  useUi.getState().openGlossary(toView((await db.personal_terms.get('pt-0000abcd'))!));
  renderDrawer();                                           // helper du fichier (MemoryRouter + GlossaryDrawer)
  fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ma carte' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmer la suppression' }));
  await waitFor(async () => expect(await db.personal_terms.get('pt-0000abcd')).toBeUndefined());
  expect(useUi.getState().glossaryTerm).toBeNull();
});
it('terme du glossaire : pas de bouton de suppression', async () => {
  useUi.getState().openGlossary({ id: 'fb-aszites', term: 'Aszites', translationSimple: 'x', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never);
  renderDrawer();
  expect(screen.queryByRole('button', { name: 'Supprimer ma carte' })).toBeNull();
});
```
(Même `vi.mock('@/lib/sync/queue', …)` que A2 en tête de fichier ; `renderDrawer = () => render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>)`.)

- [ ] **Step 2** — `npx vitest run src/components/GlossaryDrawer.test.tsx` → FAIL.

- [ ] **Step 3 : implémentation** — dans `GlossaryDrawer` :
```tsx
  const [confirmDelete, setConfirmDelete] = useState(false);
  const personal = fb ? isPersonalView(fb) : false;
  // … dans le corps, sous la définition :
  {personal && (
    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
      {(fb as PersonalTermView).context && <p className="mb-2 text-xs italic text-slate-500">« {(fb as PersonalTermView).context} »</p>}
      {!confirmDelete ? (
        <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 text-sm text-rose-600 dark:text-rose-400">Supprimer ma carte</button>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => { void deletePersonalTerm(fb!.id).then(close); }} className="btn-primary min-h-11 bg-rose-600">Confirmer la suppression</button>
          <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline min-h-11">Annuler</button>
        </div>
      )}
    </div>
  )}
```
Réinitialiser `confirmDelete` à `false` quand `fb?.id` change (`useEffect(() => setConfirmDelete(false), [fb?.id])`).

- [ ] **Step 4** — tests → PASS ; gates → 0.

- [ ] **Step 5 : commit**
```bash
git add src/components/GlossaryDrawer.tsx
git add src/components/GlossaryDrawer.test.tsx
git commit -m "feat(fachbegriffe): supprimer une carte personnelle depuis la fiche (F3)"
```

---

### Task A7 : [CONTRÔLEUR] Migration A en EU + redéploiement `events`

Étape réservée au contrôleur (MCP Supabase), jamais à un sous-agent. Aucun code.

- [ ] `list_migrations` (projet `hwpwoblpygvxwbztconc`) → vérifier que `20260917000012` est la dernière appliquée.
- [ ] `apply_migration` : `name = "personal_terms_events"`, `query` = contenu exact de `supabase/migrations/20260925000013_personal_terms_events.sql`.
- [ ] `execute_sql` : `select pg_get_constraintdef(oid) from pg_constraint where conname = 'progress_events_type_check';` → contient `term.personal_created` et `term.personal_deleted`.
- [ ] `deploy_edge_function` : `name = "events"`, `entrypoint_path = "index.ts"`, `verify_jwt = true`, `files` = `[{ name: "index.ts", content: <supabase/functions/events/index.ts> }, { name: "../_shared/supabase.ts", … }, { name: "../_shared/validate.ts", … }, { name: "../_shared/ratelimit.ts", … }]` — les imports sont `../_shared/*.ts` : reprendre exactement la forme des chemins utilisée lors du déploiement F2b (voir `get_edge_function events` avant, et comparer).
- [ ] `get_edge_function events` → nouvelle version ; POST réel d'un `term.personal_created` depuis l'app (compte Mehdi) → `acked`.
- [ ] Consigner dans le ledger (version de fonction, horodatage).

---

# Tranche B — IA serveur gratuite

Sources officielles (source-driven, à relire au moment d'implémenter ; citer dans les commentaires) :
- Groq, API compatible OpenAI : https://console.groq.com/docs/openai — base `https://api.groq.com/openai/v1`, `POST /chat/completions`, `GET /models`, `stream: true` en SSE.
- Groq, modèles et limites gratuites : https://console.groq.com/docs/models et https://console.groq.com/docs/rate-limits
- Gemini, compatibilité OpenAI : https://ai.google.dev/gemini-api/docs/openai — base `https://generativelanguage.googleapis.com/v1beta/openai`, `POST /chat/completions`, `GET /models`, clé en `Authorization: Bearer`.
- Gemini, modèles et quotas gratuits : https://ai.google.dev/gemini-api/docs/models et https://ai.google.dev/gemini-api/docs/rate-limits
- Supabase Edge Functions, CORS et streaming : https://supabase.com/docs/guides/functions/cors et https://supabase.com/docs/guides/functions/examples/streaming (ou page « Server-Sent Events » équivalente).

**Noms de modèles** (`llama-3.3-70b-versatile`, `gemini-flash-lite-latest`, `gemini-2.5-flash`…) : **à confirmer par le smoke test B7** contre `GET /models` de chaque fournisseur ; seule la variable d'environnement change si un nom diffère.

### Task B1 : Prompts système en module feuille partagé Deno ↔ app ↔ eval

**Décision de partage :** le module feuille vit côté serveur, `app/supabase/functions/_shared/prompts.ts` (aucun import → valide en Deno, en Vite et pour esbuild). `src/lib/dictionary.ts` **ré-exporte** depuis ce fichier (chemin relatif `../../supabase/functions/_shared/prompts.ts`, permis par `allowImportingTsExtensions`) : une seule source, pas de copie ni de script de synchronisation. `evalDoctopus.mjs` continue d'importer `dictionary.ts` (esbuild suit le ré-export).

**Files:**
- Create: `app/supabase/functions/_shared/prompts.ts`
- Modify: `app/src/lib/dictionary.ts` (retrait de `DOCTOPUS_SYSTEM`, `buildLlmPrompt`, `BriefKind`, `briefKind`, `buildBriefPrompt` → ré-export)
- Test: `app/src/lib/prompts.shared.test.ts`

**Interfaces:**
- Produces (dans `_shared/prompts.ts`, signatures inchangées) : `DOCTOPUS_SYSTEM: string`, `buildLlmPrompt(query)`, `type BriefKind`, `briefKind(selection)`, `buildBriefPrompt(term, kind?)`.

- [ ] **Step 1 : test qui échoue**
```ts
// app/src/lib/prompts.shared.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DOCTOPUS_SYSTEM as fromApp, buildBriefPrompt as appBrief } from './dictionary';
import { DOCTOPUS_SYSTEM as fromShared, buildBriefPrompt as sharedBrief } from '../../supabase/functions/_shared/prompts.ts';

describe('prompts partagés (F3 §3.5)', () => {
  it('app et serveur lisent la même source', () => {
    expect(fromApp).toBe(fromShared);
    expect(appBrief('Aszites')).toEqual(sharedBrief('Aszites'));
  });
  it('le module serveur est une feuille (aucun import)', () => {
    const src = readFileSync(new URL('../../supabase/functions/_shared/prompts.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
  });
});
```
- [ ] **Step 2** — `npx vitest run src/lib/prompts.shared.test.ts` → FAIL (fichier absent).
- [ ] **Step 3** — créer `_shared/prompts.ts` en **déplaçant** tel quel le bloc de `dictionary.ts` depuis le commentaire « Prompt système de Doctopus » jusqu'à la fin de `buildBriefPrompt` (y compris `buildLlmPrompt`, `BriefKind`, `briefKind`), avec en tête :
```ts
// ============================================================================
// Prompts système de Doctopus — module FEUILLE (aucun import) partagé par
// l'Edge Function `ai` (Deno), l'app (via src/lib/dictionary.ts) et
// scripts/evalDoctopus.mjs. Le client n'envoie JAMAIS de prompt système au
// serveur (spec F3 §3.5) : le serveur lit ce fichier.
// ============================================================================
```
Dans `dictionary.ts`, à la place du bloc :
```ts
export { DOCTOPUS_SYSTEM, buildLlmPrompt, briefKind, buildBriefPrompt, type BriefKind } from '../../supabase/functions/_shared/prompts.ts';
```
- [ ] **Step 4** — `npx vitest run src/lib; echo exit=$?` → 0 ; `node scripts/evalDoctopus.mjs --dry; echo exit=$?` → 0 ; `deno check supabase/functions/_shared/prompts.ts; echo exit=$?` → 0 (si `deno` absent : `npx supabase functions serve` le charge en B3) ; `npm run build` → 0.
- [ ] **Step 5 : commit**
```bash
git add supabase/functions/_shared/prompts.ts
git add src/lib/dictionary.ts
git add src/lib/prompts.shared.test.ts
git commit -m "refactor(ia): prompts système en module feuille partagé serveur/app/eval (F3)"
```

---

### Task B2 : Adaptateur de chaîne OpenAI-compatible (`_shared/aiChain.ts`)

**Files:**
- Create: `app/supabase/functions/_shared/aiChain.ts` (feuille : `fetch`, `ReadableStream`, `TextEncoder/Decoder` globaux, aucun import)
- Test: `app/src/lib/aiChain.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProviderId = 'groq' | 'gemini' | 'mock';
  export interface ChainEntry { provider: ProviderId; model: string }
  export const BASE_URL: Record<Exclude<ProviderId, 'mock'>, string>;
  export const KEY_ENV: Record<Exclude<ProviderId, 'mock'>, string>;      // groq → GROQ_API_KEY, gemini → GEMINI_API_KEY
  export function parseChain(spec: string | undefined, allowMock?: boolean): ChainEntry[];
  export interface OAIMessage { role: 'system' | 'user' | 'assistant'; content: string }
  export class NoProvider extends Error { constructor(public lastStatus: number | null) }
  export async function openStream(chain: ChainEntry[], messages: OAIMessage[], maxTokens: number, keys: Partial<Record<string, string>>, signal?: AbortSignal, fetchImpl?: typeof fetch): Promise<{ entry: ChainEntry; body: ReadableStream<Uint8Array> }>;
  export function sseDeltas(buffer: string): { deltas: string[]; rest: string; done: boolean };
  export const normalizeSelection: (s: string) => string;
  ```

- [ ] **Step 1 : test qui échoue**
```ts
// app/src/lib/aiChain.test.ts
import { describe, it, expect, vi } from 'vitest';
import { parseChain, openStream, sseDeltas, NoProvider, normalizeSelection } from '../../supabase/functions/_shared/aiChain.ts';

const sse = (...parts: string[]) => new Response(parts.map((p) => `data: ${p}\n\n`).join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } });

describe('aiChain', () => {
  it('parseChain : ordre conservé, fournisseurs inconnus et mock (hors test) ignorés', () => {
    expect(parseChain('groq:llama-3.3-70b-versatile, gemini:gemini-flash-lite-latest,foo:x,mock:m')).toEqual([
      { provider: 'groq', model: 'llama-3.3-70b-versatile' }, { provider: 'gemini', model: 'gemini-flash-lite-latest' }]);
    expect(parseChain('mock:m', true)).toEqual([{ provider: 'mock', model: 'm' }]);
    expect(parseChain(undefined)).toEqual([]);
  });
  it('bascule sur le suivant si le premier échoue (429) ou n’a pas de clé', async () => {
    const f = vi.fn(async (url: string) => (String(url).includes('groq') ? new Response('quota', { status: 429 }) : sse('{"choices":[{"delta":{"content":"ok"}}]}', '[DONE]')));
    const chain = parseChain('groq:a,gemini:b');
    const r = await openStream(chain, [{ role: 'user', content: 'x' }], 50, { GROQ_API_KEY: 'k1', GEMINI_API_KEY: 'k2' }, undefined, f as never);
    expect(r.entry.provider).toBe('gemini');
    const [, init] = f.mock.calls[1] as [string, RequestInit];
    expect(f.mock.calls[1][0]).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'b', stream: true, max_tokens: 50 });
    const noKey = await openStream(chain, [{ role: 'user', content: 'x' }], 50, { GEMINI_API_KEY: 'k2' }, undefined, f as never);
    expect(noKey.entry.provider).toBe('gemini');
  });
  it('tout échoue → NoProvider avec le dernier statut', async () => {
    const f = vi.fn(async () => new Response('down', { status: 503 }));
    await expect(openStream(parseChain('groq:a'), [], 10, { GROQ_API_KEY: 'k' }, undefined, f as never)).rejects.toMatchObject({ lastStatus: 503 });
    await expect(openStream(parseChain('groq:a'), [], 10, {}, undefined, f as never)).rejects.toBeInstanceOf(NoProvider);
  });
  it('sseDeltas : fragments, reste partiel, [DONE]', () => {
    const r = sseDeltas('data: {"choices":[{"delta":{"content":"Hal"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: {"cho');
    expect(r).toEqual({ deltas: ['Hal', 'lo'], rest: 'data: {"cho', done: false });
    expect(sseDeltas('data: [DONE]\n\n').done).toBe(true);
  });
  it('normalizeSelection', () => expect(normalizeSelection('  Aszites \n ')).toBe('aszites'));
});
```
- [ ] **Step 2** — `npx vitest run src/lib/aiChain.test.ts` → FAIL.
- [ ] **Step 3 : implémentation**
```ts
// app/supabase/functions/_shared/aiChain.ts
// ============================================================================
// Chaîne de fournisseurs IA GRATUITS appelés en direct (spec F3 D7). Les deux
// parlent l'API compatible OpenAI — un seul adaptateur :
//   Groq   https://console.groq.com/docs/openai
//   Gemini https://ai.google.dev/gemini-api/docs/openai
// Module FEUILLE : aucun import (Deno + Vitest + esbuild).
// ============================================================================
export type ProviderId = 'groq' | 'gemini' | 'mock';
export interface ChainEntry { provider: ProviderId; model: string }
export const BASE_URL = { groq: 'https://api.groq.com/openai/v1', gemini: 'https://generativelanguage.googleapis.com/v1beta/openai' } as const;
export const KEY_ENV = { groq: 'GROQ_API_KEY', gemini: 'GEMINI_API_KEY' } as const;
export interface OAIMessage { role: 'system' | 'user' | 'assistant'; content: string }
export class NoProvider extends Error { constructor(public lastStatus: number | null) { super('no_provider'); } }

export function parseChain(spec: string | undefined, allowMock = false): ChainEntry[] {
  const out: ChainEntry[] = [];
  for (const raw of (spec ?? '').split(',')) {
    const [p, ...m] = raw.trim().split(':'); const model = m.join(':').trim();
    if (!model) continue;
    if (p === 'groq' || p === 'gemini' || (p === 'mock' && allowMock)) out.push({ provider: p, model });
  }
  return out;
}

const enc = new TextEncoder();
function mockStream(model: string): ReadableStream<Uint8Array> {
  const chunks = [`data: ${JSON.stringify({ choices: [{ delta: { content: `mock:${model}` } }] })}\n\n`, 'data: [DONE]\n\n'];
  return new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(enc.encode(ch)); c.close(); } });
}

export async function openStream(chain: ChainEntry[], messages: OAIMessage[], maxTokens: number, keys: Partial<Record<string, string>>, signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<{ entry: ChainEntry; body: ReadableStream<Uint8Array> }> {
  let lastStatus: number | null = null;
  for (const entry of chain) {
    if (entry.provider === 'mock') return { entry, body: mockStream(entry.model) };
    const key = keys[KEY_ENV[entry.provider]];
    if (!key) continue;
    try {
      const res = await fetchImpl(`${BASE_URL[entry.provider]}/chat/completions`, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: entry.model, messages, temperature: 0.3, max_tokens: maxTokens, stream: true }),
      });
      if (res.ok && res.body) return { entry, body: res.body };
      lastStatus = res.status; await res.body?.cancel();
    } catch (e) {
      if (signal?.aborted) throw e;
      lastStatus = null;
    }
  }
  throw new NoProvider(lastStatus);
}

/** Découpe un tampon SSE OpenAI en fragments de texte ; renvoie le reste incomplet. */
export function sseDeltas(buffer: string): { deltas: string[]; rest: string; done: boolean } {
  const deltas: string[] = []; let done = false;
  const events = buffer.split('\n\n'); const rest = events.pop() ?? '';
  for (const ev of events) for (const line of ev.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') { done = true; continue; }
    try { const c = JSON.parse(data)?.choices?.[0]?.delta?.content; if (typeof c === 'string' && c) deltas.push(c); } catch { /* ligne non JSON ignorée */ }
  }
  return { deltas, rest, done };
}
export const normalizeSelection = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();
```
- [ ] **Step 4** — tests → PASS ; typecheck → 0.
- [ ] **Step 5 : commit**
```bash
git add supabase/functions/_shared/aiChain.ts
git add src/lib/aiChain.test.ts
git commit -m "feat(ia): chaîne de fournisseurs gratuits OpenAI-compatible avec bascule (F3)"
```

---

### Task B3 : Fonction `ai` + table `ai_cache` + `config.toml` (platform-implementer, puis security-auditor)

**Files:**
- Create: `app/supabase/migrations/20260925000014_ai_cache.sql`
- Create: `app/supabase/functions/ai/index.ts`
- Modify: `app/supabase/config.toml` (après `[functions.stripe-webhook]`)
- Modify: `app/supabase/.env.ci` (ajout `AI_CHAIN_BRIEF=mock:brief`, `AI_CHAIN_CHAT=mock:chat`, `AI_ALLOW_MOCK=1`) ; faire de même dans `app/supabase/.env` local (non versionné)
- Modify: `app/supabase/tests/helpers.ts` (ajout `grantPremium`)
- Test: `app/supabase/tests/ai.test.ts`

**Interfaces:**
- Consumes: `openStream`, `parseChain`, `sseDeltas`, `normalizeSelection`, `NoProvider` (B2) ; `DOCTOPUS_SYSTEM`, `buildBriefPrompt`, `briefKind` (B1) ; `userClient`, `serviceClient` ; `rateLimit`, `TooMany` ; `z`, `parse`, `BadRequest`.
- Produces (HTTP) : `POST /functions/v1/ai` corps `{kind:'brief',selection}` | `{kind:'chat',turns:[{role,text}]}` → 200 `text/event-stream` (format SSE OpenAI, ligne finale `data: [DONE]`), en-tête `x-ai-provider: <provider>` ; 400 `{error:'bad_request'}` ; 401 `{error:'unauthorized'}` ; 403 `{error:'premium_only'}` ; 429 `{error:'quota'}` ; 503 `{error:'no_provider'}`. Toutes les réponses portent les en-têtes CORS de l'origine autorisée.

- [ ] **Step 1 : tests qui échouent**

`helpers.ts` :
```ts
/** Abonnement premium actif sans Stripe (tests uniquement — comme grantFounder.mjs). */
export async function grantPremium(userId: string): Promise<void> {
  const { error } = await serviceClient().from('subscriptions').upsert({ user_id: userId, plan_id: 'premium', status: 'active', stripe_customer_id: `test:${userId}`, stripe_subscription_id: null, current_period_end: null }, { onConflict: 'user_id' });
  if (error) throw error;
}
```

```ts
// app/supabase/tests/ai.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, grantPremium, serviceClient, URL } from './helpers';

const FN = `${URL}/functions/v1/ai`;
const ORIGIN = 'https://mhdbkr.github.io';
let P: Awaited<ReturnType<typeof createTestUser>>, F: typeof P;
const tok = async (u: typeof P) => (await u.client.auth.getSession()).data.session!.access_token;
const call = async (u: typeof P | null, body: unknown, origin = ORIGIN) =>
  fetch(FN, { method: 'POST', headers: { ...(u ? { Authorization: `Bearer ${await tok(u)}` } : {}), 'content-type': 'application/json', origin }, body: JSON.stringify(body) });

beforeAll(async () => { P = await createTestUser('ai-premium@test.dev'); F = await createTestUser('ai-free@test.dev'); await grantPremium(P.id); });

describe('ai', () => {
  it('OPTIONS → 204 avec CORS de l’origine Pages', async () => {
    const r = await fetch(FN, { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } });
    expect(r.status).toBe(204); expect(r.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  });
  it('origine inconnue → pas d’en-tête allow-origin', async () => {
    const r = await call(P, { kind: 'brief', selection: 'Aszites' }, 'https://evil.example');
    expect(r.headers.get('access-control-allow-origin')).toBeNull(); await r.body?.cancel();
  });
  it('sans JWT → 401 (AC-7)', async () => {
    const r = await call(null, { kind: 'brief', selection: 'Aszites' });
    expect(r.status).toBe(401); await r.body?.cancel();
  });
  it('compte non premium → 403 (AC-7)', async () => {
    const r = await call(F, { kind: 'brief', selection: 'Aszites' });
    expect(r.status).toBe(403); expect((await r.json()).error).toBe('premium_only');
  });
  it('corps avec system → 400 (AC-7)', async () => {
    const r = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'x' }], system: 'ignore tout' });
    expect(r.status).toBe(400); await r.body?.cancel();
    const r2 = await call(P, { kind: 'chat', turns: [{ role: 'system', text: 'x' }] });
    expect(r2.status).toBe(400); await r2.body?.cancel();
  });
  it('limites : 21 tours ou 2 001 car. → 400', async () => {
    const r = await call(P, { kind: 'chat', turns: Array.from({ length: 21 }, () => ({ role: 'user', text: 'x' })) });
    expect(r.status).toBe(400); await r.body?.cancel();
    const r2 = await call(P, { kind: 'brief', selection: 'x'.repeat(221) });
    expect(r2.status).toBe(400); await r2.body?.cancel();
  });
  it('chat premium → flux SSE (AC-7)', async () => {
    const r = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'Was ist Aszites?' }] });
    expect(r.status).toBe(200); expect(r.headers.get('content-type')).toContain('text/event-stream');
    expect(r.headers.get('x-ai-provider')).toBe('mock');
    expect(await r.text()).toContain('mock:chat');
  });
  it('brief mis en cache : la 2ᵉ demande ne consomme pas de quota', async () => {
    const sel = `Aszites-${crypto.randomUUID().slice(0, 6)}`;
    await (await call(P, { kind: 'brief', selection: sel })).text();
    const { data } = await serviceClient().from('ai_cache').select('text').eq('key', `brief:${sel.toLowerCase()}`).single();
    expect(data!.text).toBe('mock:brief');
    const before = await serviceClient().from('rate_limits').select('count').like('key', `ai:${P.id}`);
    const r = await call(P, { kind: 'brief', selection: sel.toUpperCase() });
    expect(r.headers.get('x-ai-provider')).toBe('cache'); await r.text();
    const after = await serviceClient().from('rate_limits').select('count').like('key', `ai:${P.id}`);
    expect(after.data).toEqual(before.data);
  });
  it('quota dépassé → 429 quota (AC-7)', async () => {
    const day = Math.floor(Date.now() / 1000 / 86400) * 86400;
    await serviceClient().from('rate_limits').upsert({ key: `ai:${P.id}`, window_start: new Date(day * 1000).toISOString(), count: 300 });
    const r = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'x' }] });
    expect(r.status).toBe(429); expect((await r.json()).error).toBe('quota');
    await serviceClient().from('rate_limits').delete().eq('key', `ai:${P.id}`);
  });
});
```

- [ ] **Step 2** — `node scripts/testRls.mjs; echo exit=$?` → ≠ 0 (fonction absente).

- [ ] **Step 3 : implémentation**

```sql
-- 20260925000014_ai_cache.sql — Fachbegriffe F3 : cache des gloses « brief » de
-- la fonction `ai` (30 jours). Lu et écrit UNIQUEMENT par la fonction (service role).
create table public.ai_cache (
  key        text primary key,
  text       text not null check (char_length(text) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.ai_cache enable row level security;       -- aucune policy : ni anon ni authenticated
revoke all on public.ai_cache from anon, authenticated;
create index ai_cache_created_at on public.ai_cache (created_at);
```

`config.toml`, après `[functions.stripe-webhook]` :
```toml
[functions.ai]
verify_jwt = true
```

```ts
// app/supabase/functions/ai/index.ts
// ============================================================================
// IA serveur GRATUITE (spec F3 §3.5) — pas un proxy ouvert : prompts système
// côté serveur (_shared/prompts.ts), premium seulement (my_tier() = 3), quota
// 300/jour, cache brief 30 j, flux SSE relayé, amont annulé à la déconnexion.
// ============================================================================
import { userClient, serviceClient } from '../_shared/supabase.ts';
import { z, parse, BadRequest } from '../_shared/validate.ts';
import { rateLimit, TooMany } from '../_shared/ratelimit.ts';
import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind } from '../_shared/prompts.ts';
import { parseChain, openStream, sseDeltas, normalizeSelection, NoProvider, type OAIMessage } from '../_shared/aiChain.ts';

const ALLOWED = /^(https:\/\/mhdbkr\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const corsFor = (req: Request): Record<string, string> => {
  const o = req.headers.get('origin') ?? '';
  return ALLOWED.test(o)
    ? { 'access-control-allow-origin': o, vary: 'origin', 'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-expose-headers': 'x-ai-provider' }
    : { vary: 'origin' };
};
const j = (req: Request, body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...corsFor(req) } });

const Turn = z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1).max(2000) }).strict();
const Body = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('brief'), selection: z.string().trim().min(1).max(220) }).strict(),
  z.object({ kind: z.literal('chat'), turns: z.array(Turn).min(1).max(20) }).strict(),
]);
const MAX_TOKENS = { brief: 300, chat: 1200 } as const;
const CACHE_DAYS = 30;
const allowMock = Deno.env.get('AI_ALLOW_MOCK') === '1';
const keys = { GROQ_API_KEY: Deno.env.get('GROQ_API_KEY'), GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') };

const sseOf = (text: string) => new ReadableStream<Uint8Array>({ start(c) {
  const e = new TextEncoder();
  c.enqueue(e.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)); c.enqueue(e.encode('data: [DONE]\n\n')); c.close();
} });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsFor(req) });
  if (req.method !== 'POST') return j(req, { error: 'method' }, 405);
  try {
    const sb = userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return j(req, { error: 'unauthorized' }, 401);
    const { data: tier } = await sb.rpc('my_tier');
    if (tier !== 3) return j(req, { error: 'premium_only' }, 403);
    const body = parse(Body, await req.json().catch(() => { throw new BadRequest('json'); }));
    const admin = serviceClient();

    let messages: OAIMessage[]; let cacheKey: string | null = null;
    if (body.kind === 'brief') {
      cacheKey = `brief:${normalizeSelection(body.selection)}`;
      const since = new Date(Date.now() - CACHE_DAYS * 86400_000).toISOString();
      const { data: hit } = await admin.from('ai_cache').select('text').eq('key', cacheKey).gt('created_at', since).maybeSingle();
      if (hit) return new Response(sseOf(hit.text), { headers: { 'content-type': 'text/event-stream', 'x-ai-provider': 'cache', ...corsFor(req) } });
      const { system, user: u } = buildBriefPrompt(body.selection, briefKind(body.selection));
      messages = [{ role: 'system', content: system }, { role: 'user', content: u }];
    } else {
      messages = [{ role: 'system', content: DOCTOPUS_SYSTEM }, ...body.turns.map((t) => ({ role: t.role, content: t.text }))];
    }

    try { await rateLimit(admin, `ai:${user.id}`, 300, 86400); }
    catch (e) { if (e instanceof TooMany) return j(req, { error: 'quota' }, 429); throw e; }

    const chain = parseChain(Deno.env.get(body.kind === 'brief' ? 'AI_CHAIN_BRIEF' : 'AI_CHAIN_CHAT'), allowMock);
    const upstreamAbort = new AbortController();
    req.signal.addEventListener('abort', () => upstreamAbort.abort());
    let opened;
    try { opened = await openStream(chain, messages, MAX_TOKENS[body.kind], keys, upstreamAbort.signal); }
    catch (e) { if (e instanceof NoProvider) return j(req, { error: 'no_provider', status: e.lastStatus }, 503); throw e; }

    // Relais : on renvoie les octets tels quels ; pour brief, on accumule le texte pour le cache.
    const reader = opened.body.getReader(); const dec = new TextDecoder();
    let buf = ''; let text = '';
    const out = new ReadableStream<Uint8Array>({
      async pull(c) {
        const { value, done } = await reader.read();
        if (done) {
          if (cacheKey && text.trim()) await admin.from('ai_cache').upsert({ key: cacheKey, text: text.trim().slice(0, 4000), created_at: new Date().toISOString() });
          c.close(); return;
        }
        if (cacheKey) { buf += dec.decode(value, { stream: true }); const r = sseDeltas(buf); buf = r.rest; text += r.deltas.join(''); }
        c.enqueue(value);
      },
      cancel() { upstreamAbort.abort(); void reader.cancel(); },
    });
    return new Response(out, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-ai-provider': opened.entry.provider, ...corsFor(req) } });
  } catch (e) {
    if (e instanceof BadRequest) return j(req, { error: 'bad_request' }, 400);
    console.error(e);
    return j(req, { error: 'internal' }, 500);
  }
});
```
Note : le cas « 401 sans JWT » est d'abord tranché par la passerelle (`verify_jwt = true`) ; le test B3 vérifie le statut ; la présence d'en-têtes CORS sur ce 401 de passerelle est vérifiée en B7 (voir risques).

- [ ] **Step 4** — `docker exec -i supabase_db_app psql -U postgres < supabase/migrations/20260925000014_ai_cache.sql; echo exit=$?` → 0 ; relancer `supabase functions serve --env-file supabase/.env` ; `node scripts/testRls.mjs; echo exit=$?` → 0 ; `node scripts/dumpSchema.mjs` puis `git diff --stat ../docs/contracts/schema.sql` → table `ai_cache` seulement.
- [ ] **Step 5 : revue sécurité** — dispatcher `security-auditor` (lecture seule) sur `ai/index.ts`, la migration et `config.toml` : pas de proxy ouvert, pas de fuite de clé dans les réponses/logs, RLS `ai_cache`, CORS, quota avant appel amont. Corriger avant commit.
- [ ] **Step 6 : commit**
```bash
git add supabase/migrations/20260925000014_ai_cache.sql
git add supabase/functions/ai/index.ts
git add supabase/config.toml
git add supabase/.env.ci
git add supabase/tests/helpers.ts
git add supabase/tests/ai.test.ts
git add ../docs/contracts/schema.sql
git commit -m "feat(ia): fonction ai — premium, quota, cache brief, SSE relayé, prompts serveur (F3)"
```

---

### Task B4 : Client — routage serveur d'abord, repli clé, conversation épinglée

**Files:**
- Create: `app/src/lib/serverAi.ts`
- Modify: `app/src/lib/onlineAi.ts` (`ChatTurn.via`, `chat` → routage, `askBrief`, `askConversation`, `canAskAi`)
- Test: `app/src/lib/onlineAi.route.test.ts`

**Interfaces:**
- Consumes: `sseDeltas` (B2) ; `getAccessToken`, `AUTH_MODE`, `useSession` (`lib/auth/session`) ; `getEntitlements` (`lib/entitlements`).
- Produces:
  ```ts
  // serverAi.ts
  export class ServerAiError extends Error { constructor(public status: number, public code: string) }
  export function serverAiAvailable(): boolean;   // AUTH_MODE==='founder' && session && plan==='premium'
  export async function serverStream(body: { kind: 'brief'; selection: string } | { kind: 'chat'; turns: { role: 'user' | 'assistant'; text: string }[] }, onToken?: (d: string) => void, signal?: AbortSignal): Promise<string>;
  // onlineAi.ts
  export interface ChatTurn { role: 'user' | 'assistant'; content: string; reasoningDetails?: unknown[]; via?: 'server' | 'key' }
  export function canAskAi(): boolean;             // serverAiAvailable() || hasKey()
  export function honestAiError(e: unknown): string;
  ```

- [ ] **Step 1 : tests qui échouent**
```ts
// app/src/lib/onlineAi.route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('./serverAi', async (orig) => {
  const real = await orig<typeof import('./serverAi')>();
  return { ...real, serverAiAvailable: vi.fn(() => true), serverStream: vi.fn() };
});
import { serverAiAvailable, serverStream, ServerAiError } from './serverAi';
import { askBrief, askConversation, setKey, canAskAi, type ChatTurn } from './onlineAi';

const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'via clé' } }] }), { status: 200 }));
beforeEach(() => {
  localStorage.clear(); vi.mocked(serverStream).mockReset(); vi.mocked(serverAiAvailable).mockReturnValue(true);
  fetchSpy.mockClear(); vi.stubGlobal('fetch', fetchSpy);
  localStorage.setItem('doctopus-provider', 'groq');
});

describe('routage IA (F3 D7/D8)', () => {
  it('serveur disponible → brief via serveur, sans clé', async () => {
    vi.mocked(serverStream).mockResolvedValue('die Aszites = Bauchwasser');
    expect(await askBrief('Aszites')).toBe('die Aszites = Bauchwasser');
    expect(serverStream).toHaveBeenCalledWith({ kind: 'brief', selection: 'Aszites' }, undefined);
    expect(canAskAi()).toBe(true);
  });
  it('serveur en panne + clé → repli clé pour brief (AC-8)', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    expect(await askBrief('Aszites')).toBe('via clé');
  });
  it('serveur en panne sans clé → message honnête (AC-8)', async () => {
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    await expect(askBrief('Aszites')).rejects.toThrow(/IA serveur indisponible/);
  });
  it('quota → message clair', async () => {
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(429, 'quota'));
    await expect(askBrief('Aszites')).rejects.toThrow(/quota du jour/i);
  });
  it('conversation nouvelle : repli autorisé ; tour marqué via', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    const r = await askConversation([{ role: 'user', content: 'Frage' }]);
    expect(r).toMatchObject({ content: 'via clé', via: 'key' });
  });
  it('conversation en cours via serveur : jamais de bascule (AC-8)', async () => {
    setKey('gsk_testkey_123456');
    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
    const h: ChatTurn[] = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b', via: 'server' }, { role: 'user', content: 'c' }];
    await expect(askConversation(h)).rejects.toThrow(/IA serveur indisponible/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('conversation en cours via clé : reste sur la clé même si le serveur est dispo', async () => {
    setKey('gsk_testkey_123456');
    const h: ChatTurn[] = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b', via: 'key' }, { role: 'user', content: 'c' }];
    expect((await askConversation(h)).via).toBe('key');
    expect(serverStream).not.toHaveBeenCalled();
  });
  it('au serveur : texte simple, sans reasoningDetails', async () => {
    vi.mocked(serverStream).mockResolvedValue('ok');
    await askConversation([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b', reasoningDetails: [{ x: 1 }], via: 'server' }, { role: 'user', content: 'c' }]);
    expect(vi.mocked(serverStream).mock.calls[0][0]).toEqual({ kind: 'chat', turns: [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'user', text: 'c' }] });
  });
});
```
- [ ] **Step 2** — `npx vitest run src/lib/onlineAi.route.test.ts` → FAIL.
- [ ] **Step 3 : implémentation**
```ts
// app/src/lib/serverAi.ts
// Appel de la fonction `ai` (F3 §3.5) : JWT du compte, corps sans prompt système,
// réponse SSE lue au fil de l'eau.
import { getAccessToken, useSession, AUTH_MODE } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { sseDeltas } from '../../supabase/functions/_shared/aiChain.ts';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai`;
export class ServerAiError extends Error { constructor(public status: number, public code: string) { super(`ai ${status} ${code}`); } }
export function serverAiAvailable(): boolean {
  return AUTH_MODE === 'founder' && !!useSession.getState().user && getEntitlements().plan === 'premium';
}
type Body = { kind: 'brief'; selection: string } | { kind: 'chat'; turns: { role: 'user' | 'assistant'; text: string }[] };
export async function serverStream(body: Body, onToken?: (d: string) => void, signal?: AbortSignal): Promise<string> {
  const t = await getAccessToken();
  if (!t) throw new ServerAiError(401, 'unauthorized');
  let res: Response;
  try { res = await fetch(FN, { method: 'POST', signal, headers: { Authorization: `Bearer ${t}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new ServerAiError(0, 'network'); }
  if (!res.ok || !res.body) { const code = await res.json().then((x) => x?.error ?? 'error', () => 'error'); throw new ServerAiError(res.status, code); }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = '', text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const r = sseDeltas(buf); buf = r.rest;
    for (const d of r.deltas) { text += d; onToken?.(d); }
  }
  if (!text.trim()) throw new ServerAiError(502, 'empty');
  return text;
}
```

`onlineAi.ts` — modifications :
```ts
import { serverAiAvailable, serverStream, ServerAiError } from './serverAi';

export interface ChatTurn { role: 'user' | 'assistant'; content: string; reasoningDetails?: unknown[]; via?: 'server' | 'key' }
export function canAskAi(): boolean { return serverAiAvailable() || hasKey(); }

/** Message affichable, jamais technique (FB2-M3 : dire honnêtement). */
export function honestAiError(e: unknown): string {
  if (e instanceof ServerAiError) {
    if (e.status === 429) return 'Quota du jour atteint (300 questions). Réessaie demain, ou ajoute une clé de repli dans les réglages Doctopus.';
    return 'IA serveur indisponible pour le moment. Réessaie dans un instant' + (hasKey() ? '.' : ', ou ajoute une clé de repli dans les réglages Doctopus.');
  }
  return (e as Error)?.message ?? String(e);
}
const toServerTurns = (turns: ChatTurn[]) => turns.map((t) => ({ role: t.role, text: t.content }));
const pinned = (turns: ChatTurn[]): 'server' | 'key' | null => turns.find((t) => t.role === 'assistant' && t.via)?.via ?? null;

export async function askConversation(turns: ChatTurn[], onToken?: (delta: string) => void): Promise<ChatTurn> {
  const pin = pinned(turns);
  if (pin !== 'key' && serverAiAvailable()) {
    try { return { role: 'assistant', content: await serverStream({ kind: 'chat', turns: toServerTurns(turns) }, onToken), via: 'server' }; }
    catch (e) { if (pin === 'server' || !hasKey()) throw new Error(honestAiError(e)); }
  } else if (pin === 'server') {
    throw new Error(honestAiError(new ServerAiError(0, 'unavailable')));
  }
  return { ...(await chat(DOCTOPUS_SYSTEM, turns, 800, pickReasoning(turns), onToken)), via: 'key' };
}

export async function askBrief(selection: string): Promise<string> {
  if (serverAiAvailable()) {
    try { return (await serverStream({ kind: 'brief', selection })).trim(); }
    catch (e) { if (!hasKey()) throw new Error(honestAiError(e)); }
  }
  const kind = briefKind(selection);
  const { system, user } = buildBriefPrompt(selection, kind);
  return (await chat(system, [{ role: 'user', content: user }], kind === 'phrase' ? 220 : 120, 'none')).content.trim();
}
```
(`askOnline` inchangé : il délègue à `askConversation`. Le test « serveur disponible → brief » attend l'appel `serverStream(body, undefined)` : garder `serverStream({ kind:'brief', selection })` avec un second argument implicite `undefined` — ajuster l'assertion en `toHaveBeenCalledWith({ kind: 'brief', selection: 'Aszites' })` si l'arité diffère.)

- [ ] **Step 4** — `npx vitest run src/lib/onlineAi.route.test.ts src/lib/onlineAi.key.test.ts; echo exit=$?` → 0 ; gates → 0.
- [ ] **Step 5 : commit**
```bash
git add src/lib/serverAi.ts
git add src/lib/onlineAi.ts
git add src/lib/onlineAi.route.test.ts
git commit -m "feat(ia): client — fonction ai d'abord, repli clé, conversation épinglée à son fournisseur (F3)"
```

---

### Task B5 : UI — « Expliquer » et Doctopus sans clé ; réglages « Repli (optionnel) » (front-implementer)

**Files:**
- Modify: `app/src/components/SelectionExplainer.tsx` (`explain()`)
- Modify: `app/src/components/Doctopus.tsx` (l. 45, 79, 128, 136, 207-220)
- Test: `app/src/components/Doctopus.test.tsx` (créer), `app/src/components/SelectionExplainer.test.tsx` (cas ajouté)

**Interfaces:**
- Consumes: `canAskAi`, `honestAiError`, `askBrief`, `askConversation` (B4) ; `serverAiAvailable` (B4).

- [ ] **Step 1 : tests qui échouent**
```tsx
// SelectionExplainer.test.tsx (ajout ; mock de '@/lib/onlineAi' : canAskAi → true, askBrief → 'die Dyspnoe = Atemnot')
it('hors glossaire sans clé mais serveur dispo → explication IA (AC-7)', async () => {
  render(<><p data-testid="t">Dyspnoe unter Belastung</p><SelectionExplainer /></>);
  selectText(screen.getByTestId('t'));
  act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
  fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
  expect(await screen.findByText('die Dyspnoe = Atemnot')).toBeInTheDocument();
});
```
```tsx
// app/src/components/Doctopus.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
vi.mock('@/lib/serverAi', () => ({ serverAiAvailable: () => true }));
vi.mock('@/lib/onlineAi', async (o) => ({ ...(await o<typeof import('@/lib/onlineAi')>()), canAskAi: () => true, hasKey: () => false }));
import { Doctopus } from './Doctopus';
import { useUi } from '@/store/ui';

describe('Doctopus (F3)', () => {
  it('serveur dispo sans clé : pas de réglages imposés, bouton Demander actif, section « Repli (optionnel) »', async () => {
    useUi.getState().openDoctopus('Aszites');
    render(<Doctopus />);
    expect(screen.getByRole('button', { name: /Demander/ })).not.toBeDisabled();
    expect(screen.queryByText(/Ajoute ta clé/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /réglages/i }));
    expect(await screen.findByText('Repli (optionnel)')).toBeInTheDocument();
  });
});
```
(Vérifier le nom de l'export et l'`aria-label` du bouton engrenage dans `Doctopus.tsx` avant d'écrire le test ; aligner le sélecteur.)

- [ ] **Step 2** — tests → FAIL.
- [ ] **Step 3 : implémentation**
  - `SelectionExplainer.explain()` : remplacer `if (!hasKey()) {…}` par `if (!canAskAi()) { setBubble({ loading: false, error: 'IA indisponible : connecte-toi (compte premium) ou ajoute une clé de repli dans les réglages Doctopus.' }); return; }` et `catch (e) { setBubble({ loading: false, error: honestAiError(e) }); }`.
  - `Doctopus.tsx` : `useState(!canAskAi())` pour `showSettings` ; `disabled={!q.trim() || loading || !canAskAi()}` ; ligne 136 : `{!canAskAi() && <p …>Connecte-toi (premium) ou ajoute une clé de repli dans …</p>}` ; l. 79 : conserver `reply` (qui porte `via`) dans l'historique tel quel ; `catch` → `honestAiError(e)`.
  - Panneau de réglages (l. 207+) : titre `<div className="label">Repli (optionnel)</div>` puis `<p className="text-[11px] text-slate-500">{serverAiAvailable() ? 'Ton compte utilise l’IA Doctopus du serveur. Une clé ici ne sert qu’en cas de panne.' : 'Sans compte premium connecté, Doctopus utilise cette clé.'}</p>` au-dessus du sélecteur de fournisseur existant.
- [ ] **Step 4** — tests → PASS ; gates → 0.
- [ ] **Step 5 : commit**
```bash
git add src/components/SelectionExplainer.tsx
git add src/components/SelectionExplainer.test.tsx
git add src/components/Doctopus.tsx
git add src/components/Doctopus.test.tsx
git commit -m "feat(ia): Expliquer et Doctopus sans clé en compte premium ; clé = repli optionnel (F3)"
```

---

### Task B6 : Évaluation rejouable sur la chaîne (`evalDoctopus.mjs --chain`) (ai-eval-engineer)

**Files:**
- Modify: `app/scripts/evalDoctopus.mjs`

**Interfaces:**
- Consumes: `openStream`, `parseChain`, `sseDeltas` (B2), `DOCTOPUS_SYSTEM` (B1).
- Produces: `node scripts/evalDoctopus.mjs --chain groq:llama-3.3-70b-versatile` (clés `GROQ_API_KEY` / `GEMINI_API_KEY` lues dans l'environnement) → même grille, même seuil 16/20 ; `--dry` inchangé.

- [ ] **Step 1** — `node scripts/evalDoctopus.mjs --dry; echo exit=$?` → 0 (référence avant modification).
- [ ] **Step 2 : implémentation**
  - Dans le bloc esbuild, ajouter à `entry.ts` : `export { openStream, parseChain, sseDeltas } from ${JSON.stringify(join(root, 'supabase/functions/_shared/aiChain.ts'))};` et les déstructurer avec le reste.
  - Après le bloc `if (dry) {…}` :
```js
const chainSpec = args.includes('--chain') ? args[args.indexOf('--chain') + 1] : undefined;
async function askChain(q) {
  const { entry, body } = await openStream(parseChain(chainSpec), [{ role: 'system', content: DOCTOPUS_SYSTEM }, { role: 'user', content: q }], 1200, process.env);
  const reader = body.getReader(); const dec = new TextDecoder(); let buf = '', text = '';
  for (;;) { const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); const r = sseDeltas(buf); buf = r.rest; text += r.deltas.join(''); }
  return { text: text.trim(), model: `${entry.provider}:${entry.model}` };
}
if (chainSpec) {
  let pass = 0;
  for (const it of set) {
    let r; try { r = await askChain(it.q); } catch (e) { console.log(`! ${it.id.padEnd(12)} ERREUR ${e.message}`); continue; }
    const fails = r.text ? grade(it, r.text) : ['réponse vide'];
    if (!fails.length) pass++;
    console.log(`${fails.length ? '✗' : '✓'} ${it.id.padEnd(12)} ${fails.join(' · ') || 'passe'}  [${r.model}]`);
    if (args.includes('--verbose')) console.log('   ' + r.text.replace(/\n/g, '\n   ') + '\n');
  }
  console.log(`\n${pass >= 16 ? '✅' : '❌'} ${pass}/${set.length} (seuil 16) — chaîne ${chainSpec}`);
  process.exit(pass >= 16 ? 0 : 1);
}
```
  - Mettre à jour le commentaire d'usage en tête (ligne « Usage »).
- [ ] **Step 3** — `node scripts/evalDoctopus.mjs --dry; echo exit=$?` → 0.
- [ ] **Step 4 : commit**
```bash
git add scripts/evalDoctopus.mjs
git commit -m "test(ia): evalDoctopus --chain — jeu de référence rejoué sur la chaîne serveur (F3)"
```

---

### Task B7 : [CONTRÔLEUR + DIRECTION] Secrets, migration `ai_cache` en EU, déploiement `ai`, smoke test, éval

Aucun sous-agent ne pose de secret ni ne déploie.

- [ ] **Direction** : créer les clés gratuites (console Groq, Google AI Studio), **sans** moyen de paiement ; poser dans le projet EU : `GROQ_API_KEY`, `GEMINI_API_KEY`, `AI_CHAIN_BRIEF`, `AI_CHAIN_CHAT` (tableau de bord Supabase → Edge Functions → Secrets). Ne jamais poser `AI_ALLOW_MOCK` en EU.
- [ ] **Smoke test `models`** (direction ou contrôleur avec clés en env local, jamais committées) :
```bash
curl -sS -o /tmp/groq-models.json -w '%{http_code}\n' -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
curl -sS -o /tmp/gemini-models.json -w '%{http_code}\n' -H "Authorization: Bearer $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/openai/models
node -e 'for (const f of ["/tmp/groq-models.json","/tmp/gemini-models.json"]) console.log(f, require(f).data.map((m) => m.id).filter((id) => /llama-3.3-70b|flash/.test(id)).join(" "))'
```
Attendu : `200` deux fois ; les ids retenus pour `AI_CHAIN_*` apparaissent dans la liste (sinon corriger la variable, pas le code). Consigner les ids exacts et les quotas gratuits lus sur les pages rate-limits.
- [ ] **Éval** : `GROQ_API_KEY=… GEMINI_API_KEY=… node scripts/evalDoctopus.mjs --chain "$AI_CHAIN_CHAT"; echo exit=$?` → 0 et score ≥ score actuel de Gemma 4 26B (relancer `OPENROUTER_API_KEY=… node scripts/evalDoctopus.mjs` pour la référence le même jour). Consigner les deux scores dans `app/docs/reports/f3-eval-chaine.md`.
- [ ] `apply_migration` (EU) : `name = "ai_cache"`, contenu de `20260925000014_ai_cache.sql` ; `list_tables` → `ai_cache` présent, RLS activée ; `get_advisors` (security) → aucun nouvel avertissement sur `ai_cache`.
- [ ] `deploy_edge_function` : `name = "ai"`, `verify_jwt = true`, fichiers `index.ts`, `../_shared/supabase.ts`, `../_shared/validate.ts`, `../_shared/ratelimit.ts`, `../_shared/prompts.ts`, `../_shared/aiChain.ts` (même forme de chemins que `events`).
- [ ] Vérifications prod (curl) : OPTIONS depuis `Origin: https://mhdbkr.github.io` → 204 + `access-control-allow-origin` ; POST sans JWT → 401 **et** noter si l'en-tête CORS est présent (si absent : c'est la passerelle ; consigner, le client traite déjà l'échec comme « indisponible ») ; POST avec JWT d'un compte free de test → 403 ; POST avec `system` → 400 ; POST brief avec JWT Mehdi → flux SSE, `x-ai-provider: groq`.

---

# Tranche C — Double registre

### Task C1 : Modèle `register`, dédoublonnage, validateur CI `checkTermRegister.mjs`

**Files:**
- Modify: `app/src/db/types.ts` (`TermRegisterData`, `Fachbegriff.register?`)
- Modify: `app/src/data/seedFachbegriffe.ts` (type `Raw` + mapping)
- Modify: `app/scripts/publishContent.mjs` (l. 25 : mapping `r`)
- Modify: `app/src/data/fachbegriffe.json` (supprimer `fb-palliativ-2`, fusionner ses `tags` dans `fb-palliativ`)
- Create: `app/scripts/checkTermRegister.mjs`
- Create: `app/scripts/checkTermRegister.test.mjs`
- Modify: `.github/workflows/quality.yml` (après l'étape `checkCaseTermLinks`)
- Test: `app/src/data/seedFachbegriffe.test.ts` (créer)

**Interfaces:**
- Produces:
  ```ts
  export interface TermRegisterData { patient: string; vorstellung: string; anamnese: string }
  // Fachbegriff : register?: TermRegisterData
  ```
  CLI : `node scripts/checkTermRegister.mjs [--require-all]` — exit 1 si violation ; sans `--require-all`, les termes liés **sans** `r` sont comptés (info), pas bloquants ; les `r` présents sont toujours validés ; les doublons de terme sont toujours bloquants.
  Module : `export function checkEntry(entry: {t:string, r?:{pa,vo,an}}): string[]` et `export function termForms(term: string): RegExp`.

- [ ] **Step 1 : tests qui échouent**
```js
// app/scripts/checkTermRegister.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEntry, termForms } from './checkTermRegister.mjs';

const ok = { t: 'Aszites', r: { pa: 'Wasser im Bauch', vo: 'Sonographisch zeigte sich ein Aszites.', an: 'Haben Sie bemerkt, dass Ihr Bauch dicker geworden ist?' } };
test('entrée valide', () => assert.deepEqual(checkEntry(ok), []));
test('pa = terme → erreur', () => assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'aszites' } }).some((e) => e.includes('pa')));
test('vo sans le terme → erreur ; forme fléchie acceptée', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, vo: 'Sonographisch unauffällig.' } }).some((e) => e.includes('vo')));
  assert.deepEqual(checkEntry({ t: 'Ödem', r: { pa: 'Schwellung', vo: 'Es bestehen beidseitige Ödeme.', an: 'Sind Ihre Beine geschwollen?' } }), []);
});
test('an contient le terme ou ne finit pas par ? → erreur', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, an: 'Haben Sie Aszites?' } }).some((e) => e.includes('an')));
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, an: 'Ihr Bauch ist dick.' } }).some((e) => e.includes('an')));
});
test('longueurs bornées', () => assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'x'.repeat(61) } }).some((e) => e.includes('pa'))));
test('termForms : mot entier seulement', () => {
  assert.ok(termForms('Sonde').test('eine Sonde legen')); assert.ok(termForms('Sonde').test('zwei Sonden'));
  assert.ok(!termForms('Sonde').test('Sondenernährung'));
});
```
```ts
// app/src/data/seedFachbegriffe.test.ts
import { describe, it, expect } from 'vitest';
import { seedFachbegriffe } from './seedFachbegriffe';
describe('seedFachbegriffe (F3)', () => {
  const all = seedFachbegriffe();
  it('aucun terme en double (casse ignorée)', () => {
    const seen = new Set<string>(); for (const b of all) { const k = b.term.trim().toLowerCase(); expect(seen.has(k), k).toBe(false); seen.add(k); }
  });
  it('r → register quand présent', () => {
    const withR = all.filter((b) => b.register);
    for (const b of withR) expect(Object.keys(b.register!).sort()).toEqual(['anamnese', 'patient', 'vorstellung']);
  });
});
```
- [ ] **Step 2** — `node --test scripts/checkTermRegister.test.mjs` → FAIL ; `npx vitest run src/data/seedFachbegriffe.test.ts` → FAIL (doublon `palliativ`).
- [ ] **Step 3 : implémentation**

`types.ts` (avant `Fachbegriff`) :
```ts
/** Double registre (F3 §3.2) : parole du patient, phrase de Vorstellung/Doku, question d'anamnèse sans le terme. */
export interface TermRegisterData { patient: string; vorstellung: string; anamnese: string }
```
et dans `Fachbegriff` : `register?: TermRegisterData;       // termes liés à ≥ 1 cas (F3)`.

`seedFachbegriffe.ts` : `Raw` gagne `r?: { pa: string; vo: string; an: string };` ; mapping : `...(r.r ? { register: { patient: r.r.pa, vorstellung: r.r.vo, anamnese: r.r.an } } : {}),`.

`publishContent.mjs` l. 25 : ajouter `...(r.r ? { register: { patient: r.r.pa, vorstellung: r.r.vo, anamnese: r.r.an } } : {}),` dans l'objet.

`fachbegriffe.json` : via un script jetable (scratchpad) — retirer l'entrée `id === 'fb-palliativ-2'`, ajouter ses `tags` (`Ösophaguskarzinom`, `Pankreaskarzinom`) à `fb-palliativ` ; réécrire avec la même indentation que le fichier (vérifier `git diff --stat` : 1 fichier, ~12 lignes). `fb-palliativ-2` n'est lié à aucun cas (`caseTermLinks.json`) ; `publishContent` le marquera `deleted` au prochain push.

```js
// app/scripts/checkTermRegister.mjs
// Invariant CI (F3 §3.2) : double registre des termes liés à un cas.
//  - `r` présent → pa ≤ 60 et ≠ terme ; vo ≤ 160 contient le terme (mot entier,
//    formes fléchies e/en/s/n/es) ; an ≤ 140 sans le terme, finit par « ? ».
//  - aucun terme en double dans le glossaire (casse ignorée).
//  - --require-all : tout terme de caseTermLinks.json a `r` (activé au dernier lot).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LIM = { pa: 60, vo: 160, an: 140 };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const termForms = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(term.trim())}(e|en|n|s|es)?(?![\\p{L}\\p{N}])`, 'iu');

export function checkEntry(e) {
  const errs = []; const r = e.r; if (!r) return errs;
  for (const k of ['pa', 'vo', 'an']) {
    if (typeof r[k] !== 'string' || !r[k].trim()) { errs.push(`${k} vide`); continue; }
    if (r[k].length > LIM[k]) errs.push(`${k} > ${LIM[k]} car.`);
  }
  if (errs.length) return errs;
  const f = termForms(e.t);
  if (r.pa.trim().toLowerCase() === e.t.trim().toLowerCase()) errs.push('pa = terme');
  if (!f.test(r.vo)) errs.push('vo ne contient pas le terme');
  if (f.test(r.an)) errs.push('an contient le terme');
  if (!r.an.trim().endsWith('?')) errs.push('an ne finit pas par « ? »');
  return errs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8'));
  const linked = new Set(Object.values(JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'))).flat());
  const requireAll = process.argv.includes('--require-all');
  let errors = 0, missing = 0, withR = 0;
  const seen = new Map();
  for (const e of fb) {
    const k = e.t.trim().toLowerCase();
    if (seen.has(k)) { console.error(`✗ terme en double « ${e.t} » : ${seen.get(k)} / ${e.id}`); errors++; } else seen.set(k, e.id);
    if (e.r) { withR++; for (const m of checkEntry(e)) { console.error(`✗ ${e.id} : ${m}`); errors++; } }
    else if (linked.has(e.id)) { missing++; if (requireAll) { console.error(`✗ ${e.id} lié à un cas sans registre`); errors++; } }
  }
  console.log(`ℹ registre : ${withR} termes renseignés, ${missing} liés sans registre (sur ${linked.size})`);
  if (errors) { console.error(`❌ ${errors} manquement(s)`); process.exit(1); }
  console.log('✓ registre valide');
}
```

`quality.yml`, après l'étape `checkCaseTermLinks.mjs` (même indentation et même clé `name:` que les voisines) :
```yaml
      - name: Registre des Fachbegriffe (F3)
        run: node scripts/checkTermRegister.mjs
      - name: Tests du validateur de registre
        run: node --test scripts/checkTermRegister.test.mjs
```
- [ ] **Step 4** — `node --test scripts/checkTermRegister.test.mjs; echo exit=$?` → 0 ; `node scripts/checkTermRegister.mjs; echo exit=$?` → 0 ; `node scripts/checkCaseTermLinks.mjs; echo exit=$?` → 0 ; `npx vitest run src/data; echo exit=$?` → 0 ; gates → 0.
- [ ] **Step 5 : commit**
```bash
git add src/db/types.ts
git add src/data/seedFachbegriffe.ts
git add src/data/seedFachbegriffe.test.ts
git add scripts/publishContent.mjs
git add src/data/fachbegriffe.json
git add scripts/checkTermRegister.mjs
git add scripts/checkTermRegister.test.mjs
git add ../.github/workflows/quality.yml
git commit -m "feat(fachbegriffe): modèle register + validateur CI, dédoublonnage « palliativ » (F3)"
```

---

### Task C2 : Composant `TermRegister` câblé partout (front-implementer, puis front-design-keeper)

**Files:**
- Create: `app/src/components/TermRegister.tsx`
- Modify: `app/src/components/TermHoverCard.tsx` (l. 101)
- Modify: `app/src/components/GlossaryDrawer.tsx` (l. 136)
- Modify: `app/src/features/fachbegriffe/TermList.tsx` (l. 56)
- Modify: `app/src/features/fachbegriffe/CaseTermsPanel.tsx` (l. 53)
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (l. 167-168 : dos de carte)
- Modify: `app/src/components/SelectionExplainer.tsx` (bulle glossaire)
- Test: `app/src/components/TermRegister.test.tsx` ; cas ajoutés dans `CaseTermsPanel.test.tsx`, `DrillPage.test.tsx`

**Interfaces:**
- Consumes: `Fachbegriff.register?` (C1).
- Produces:
  ```ts
  export function TermRegister(props: { term: Pick<Fachbegriff, 'translationSimple' | 'register'>; variant?: 'full' | 'line'; narrow?: boolean }): JSX.Element;
  export const registerLine: (t: Pick<Fachbegriff, 'translationSimple' | 'register'>) => string;  // register.patient ?? translationSimple
  ```

- [ ] **Step 1 : tests qui échouent**
```tsx
// app/src/components/TermRegister.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TermRegister, registerLine } from './TermRegister';

const reg = { translationSimple: 'Bauchwasser', register: { patient: 'Wasser im Bauch', vorstellung: 'Sonographisch zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' } };
describe('TermRegister (F3 §3.3)', () => {
  it('full : colonnes Vorstellung / Anamnese + parole patient', () => {
    render(<TermRegister term={reg} />);
    expect(screen.getByText('Vorstellung')).toBeInTheDocument();
    expect(screen.getByText('Anamnese')).toBeInTheDocument();
    expect(screen.getByText('Sonographisch zeigte sich ein Aszites.')).toBeInTheDocument();
    expect(screen.getByText('Ist Ihr Bauch dicker geworden?')).toBeInTheDocument();
    expect(screen.getByText(/Wasser im Bauch/)).toBeInTheDocument();
  });
  it('sans register : « Reformulation · … », jamais présentée comme parole patient (D6)', () => {
    render(<TermRegister term={{ translationSimple: 'zum Bauch gehörend' }} />);
    expect(screen.getByText('Reformulation')).toBeInTheDocument();
    expect(screen.queryByText('Vorstellung')).toBeNull();
  });
  it('registerLine', () => {
    expect(registerLine(reg)).toBe('Wasser im Bauch');
    expect(registerLine({ translationSimple: 'x' })).toBe('x');
  });
});
```
Dans `DrillPage.test.tsx` : carte avec `register`, direction `term2simple`, cliquer « Montrer » (libellé existant du bouton de révélation) → le dos affiche `Wasser im Bauch` **et** `Ist Ihr Bauch dicker geworden?`. Dans `CaseTermsPanel.test.tsx` : la ligne d'un terme avec `register` affiche `register.patient` au lieu de `translationSimple`.

- [ ] **Step 2** — tests → FAIL.
- [ ] **Step 3 : implémentation**
```tsx
// app/src/components/TermRegister.tsx
// ============================================================================
// Double registre (F3 §3.3) — un SEUL composant pour carte, fiche, liste,
// panneau du cas, dos du drill. Deux colonnes Vorstellung / Anamnese (une
// colonne sous 360 px), parole patient au-dessus. Sans registre : la
// définition simple est honnêtement nommée « Reformulation » (D6).
// ============================================================================
import type { Fachbegriff } from '@/db/types';

type T = Pick<Fachbegriff, 'translationSimple' | 'register'>;
export const registerLine = (t: T): string => t.register?.patient ?? t.translationSimple;

export function TermRegister({ term, variant = 'full', narrow = false }: { term: T; variant?: 'full' | 'line'; narrow?: boolean }) {
  const r = term.register;
  if (!r) {
    return (
      <p className="text-xs text-slate-600 dark:text-slate-300">
        <span className="label mr-1">Reformulation</span>· {term.translationSimple}
      </p>
    );
  }
  if (variant === 'line') return <span className="truncate text-xs text-slate-500 dark:text-slate-400">« {r.patient} »</span>;
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-slate-600 dark:text-slate-300"><span className="label mr-1">Patient</span>« {r.patient} »</p>
      <div className={`grid grid-cols-1 gap-2 ${narrow ? '' : 'min-[360px]:grid-cols-2'}`}>
        <div className="min-w-0 rounded-lg bg-slate-50 p-2 dark:bg-white/5">
          <div className="label">Vorstellung</div>
          <p className="break-words text-slate-700 dark:text-slate-200">{r.vorstellung}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-slate-50 p-2 dark:bg-white/5">
          <div className="label">Anamnese</div>
          <p className="break-words text-slate-700 dark:text-slate-200">{r.anamnese}</p>
        </div>
      </div>
    </div>
  );
}
```
`min-[360px]` est une media query de viewport : dans les conteneurs étroits (carte de survol ≤ 280 px, bulle `w-64`), passer `narrow` pour forcer une colonne.

Câblage :
- `TermHoverCard.tsx` l. 101 : `<TermRegister term={fb} narrow />` à la place de la ligne `translationSimple`.
- `GlossaryDrawer.tsx` l. 136 : `<TermRegister term={fb} />`.
- `TermList.tsx` l. 56 : `<span className="truncate text-xs text-slate-500 dark:text-slate-400">{registerLine(t)}</span>`.
- `CaseTermsPanel.tsx` l. 53 : remplacer `{t.translationSimple}` par `{registerLine(t)}` ; la recherche l. 23 inclut `registerLine(t)`.
- `DrillPage.tsx` l. 167-168 : `const back = direction === 'term2simple' ? registerLine(card) : card.term;` et, sous le dos révélé en `term2simple`, si `card.register` : `<p className="mt-2 text-sm text-slate-500">{card.register.anamnese}</p>`.
- `SelectionExplainer.tsx` : pour une réponse glossaire, stocker `hit` dans la bulle (`Bubble` gagne `fb?: Fachbegriff`) et rendre `<TermRegister term={bubble.fb} narrow />` sous `bubble.text`.

- [ ] **Step 4** — tests → PASS ; gates → 0 ; `node scripts/checkUiTells.mjs; echo exit=$?` → 0.
- [ ] **Step 5 : revue charte** — `front-design-keeper` (lecture seule) : tons, `label`, 44 px, pas de doublon de composant. Corriger.
- [ ] **Step 6 : commit**
```bash
git add src/components/TermRegister.tsx
git add src/components/TermRegister.test.tsx
git add src/components/TermHoverCard.tsx
git add src/components/GlossaryDrawer.tsx
git add src/components/SelectionExplainer.tsx
git add src/features/fachbegriffe/TermList.tsx
git add src/features/fachbegriffe/CaseTermsPanel.tsx
git add src/features/fachbegriffe/CaseTermsPanel.test.tsx
git add src/features/fachbegriffe/DrillPage.tsx
git add src/features/fachbegriffe/DrillPage.test.tsx
git commit -m "feat(fachbegriffe): TermRegister — Vorstellung / Anamnese partout, Reformulation sinon (F3)"
```

---

### Task C3 : Outil de lots + lot pilote (~100 termes) (content-case-author × fsp-language-reviewer × fsp-clinical-reviewer)

**Règle de sélection (déterministe, rejouable) :** termes de `caseTermLinks.json` classés par **nombre de cas liés décroissant**, puis par `id` croissant ; le pilote = les 100 premiers **sans** `r`, en garantissant ≥ 3 spécialités (`sp`) différentes (sinon compléter par le suivant d'une spécialité absente). Les lots suivants = les 100 suivants sans `r`, même ordre.

**Files:**
- Create: `app/scripts/registerLots.mjs`
- Create: `app/scripts/registerLots.test.mjs`
- Modify: `app/src/data/fachbegriffe.json` (champ `r` des 100 termes)
- Create: `app/docs/reports/f3-register-lot-01.md` (rapports des relecteurs)

**Interfaces:**
- Produces: `node scripts/registerLots.mjs next [--size 100]` → écrit `scratchpad/register-lot.json` = `[{ id, t, s, def, sp, cases: [caseId…], sample: "<phrase de cas contenant le terme>" }]` ; `node scripts/registerLots.mjs apply <fichier>` → fusionne `{ id: { pa, vo, an } }` dans `fachbegriffe.json` (champ `r`), refuse un id inconnu, exit 1 si `checkEntry` échoue sur une entrée. Export `export function nextLot(fb, links, size): Entry[]`.

- [ ] **Step 1 : test qui échoue**
```js
// app/scripts/registerLots.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextLot } from './registerLots.mjs';
const fb = [{ id: 'a', t: 'A', sp: 'X' }, { id: 'b', t: 'B', sp: 'Y', r: { pa: 'p', vo: 'B.', an: 'q?' } }, { id: 'c', t: 'C', sp: 'Z' }, { id: 'd', t: 'D', sp: 'X' }];
const links = { k1: ['a', 'b', 'c'], k2: ['a', 'c'], k3: ['a', 'd'] };
test('ordre : nb de cas décroissant puis id ; ignore les termes déjà renseignés', () => {
  assert.deepEqual(nextLot(fb, links, 2).map((e) => e.id), ['a', 'c']);
});
test('taille respectée', () => assert.equal(nextLot(fb, links, 10).length, 3));
```
- [ ] **Step 2** — `node --test scripts/registerLots.test.mjs` → FAIL.
- [ ] **Step 3 : implémentation**
```js
// app/scripts/registerLots.mjs — production du double registre par lots (F3 §3.2)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkEntry } from './checkTermRegister.mjs';

export function nextLot(fb, links, size = 100) {
  const count = new Map(); const casesOf = new Map();
  for (const [c, ids] of Object.entries(links)) for (const id of ids) { count.set(id, (count.get(id) ?? 0) + 1); (casesOf.get(id) ?? casesOf.set(id, []).get(id)).push(c); }
  return fb.filter((e) => !e.r && count.has(e.id))
    .sort((a, b) => (count.get(b.id) - count.get(a.id)) || (a.id < b.id ? -1 : 1))
    .slice(0, size)
    .map((e) => ({ id: e.id, t: e.t, s: e.s, def: e.def, sp: e.sp, cases: casesOf.get(e.id) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fbPath = join(here, '../src/data/fachbegriffe.json');
  const fb = JSON.parse(readFileSync(fbPath, 'utf8'));
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'next') {
    const size = process.argv.includes('--size') ? Number(process.argv[process.argv.indexOf('--size') + 1]) : 100;
    const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
    const lot = nextLot(fb, links, size);
    mkdirSync(join(here, '../scratchpad'), { recursive: true });
    writeFileSync(join(here, '../scratchpad/register-lot.json'), JSON.stringify(lot, null, 2));
    console.log(`lot : ${lot.length} termes → scratchpad/register-lot.json (${new Set(lot.map((e) => e.sp)).size} spécialités)`);
  } else if (cmd === 'apply') {
    const patch = JSON.parse(readFileSync(arg, 'utf8')); const byId = new Map(fb.map((e) => [e.id, e])); let bad = 0;
    for (const [id, r] of Object.entries(patch)) {
      const e = byId.get(id); if (!e) { console.error(`✗ id inconnu ${id}`); bad++; continue; }
      const errs = checkEntry({ t: e.t, r }); if (errs.length) { console.error(`✗ ${id} : ${errs.join(', ')}`); bad++; continue; }
      e.r = { pa: r.pa.trim(), vo: r.vo.trim(), an: r.an.trim() };
    }
    if (bad) { console.error(`❌ ${bad} entrée(s) refusée(s) — rien écrit`); process.exit(1); }
    writeFileSync(fbPath, JSON.stringify(fb, null, 2) + '\n');
    console.log(`✓ ${Object.keys(patch).length} registres appliqués`);
  } else { console.error('usage: registerLots.mjs next [--size N] | apply <patch.json>'); process.exit(2); }
}
```
Avant d'écrire, vérifier le format d'écriture de `fachbegriffe.json` (indentation, une entrée par ligne ?) avec `head -c 300 src/data/fachbegriffe.json` et reproduire **exactement** ce format dans `writeFileSync` pour un diff minimal. Le champ `sample` (phrase de cas) est ajouté par l'agent de contenu en lisant le cas (`grep -n` dans `seed*.ts`, jamais la lecture entière).

- [ ] **Step 4** — `node --test scripts/registerLots.test.mjs; echo exit=$?` → 0 ; `node scripts/registerLots.mjs next; echo exit=$?` → 0.

- [ ] **Step 5 : génération du pilote** — dispatcher `content-case-author` (Sonnet) avec **ce brief exact** et le fichier `scratchpad/register-lot.json` :

> Tu rédiges le double registre de 100 Fachbegriffe pour la Fachsprachprüfung (Baden-Württemberg, C1). Pour chaque entrée, lis 1 phrase d'au moins un cas lié (`grep -n "<terme>" app/src/data/seed*.ts`, plage utile seulement) pour ancrer l'usage clinique. Produis un JSON `{ "<id>": { "pa": "...", "vo": "...", "an": "..." } }` dans `scratchpad/register-lot-01.patch.json`.
> - `pa` (≤ 60 car.) : ce qu'un **patient** dirait vraiment, oral, sans Fachbegriff ni latin (« Wasser im Bauch », « mir bleibt die Luft weg »). Jamais une définition de dictionnaire. Jamais le terme lui-même.
> - `vo` (≤ 160 car.) : **une** phrase de Fallvorstellung ou d'Arztbrief, registre écrit/jury, qui **contient le terme** (forme fléchie permise), au passé ou présent clinique (« Sonographisch zeigte sich ein ausgeprägter Aszites. »). Konjunktiv I si discours rapporté.
> - `an` (≤ 140 car.) : **une** question au patient, vouvoiement (« Sie »), sans le terme ni aucun Fachbegriff, finissant par « ? » — la question qu'on pose réellement au lit pour explorer ce que le terme désigne.
> - Adjectifs/procédures : adapter (procédure → `an` = question sur le vécu/antécédent : « Wurde bei Ihnen schon einmal … gemacht? »).
> - Interdits : anglicismes, « bzw. », doublons de formulation entre termes voisins, parenthèses, emoji.
> - Vérifie toi-même : `node app/scripts/registerLots.mjs apply scratchpad/register-lot-01.patch.json` sur une **copie** n'est pas autorisé — rends seulement le patch ; le contrôleur l'applique.

- [ ] **Step 6 : validation mécanique** — `node scripts/registerLots.mjs apply ../scratchpad/register-lot-01.patch.json; echo exit=$?` → 0 (sinon renvoyer les refus à l'auteur) ; `node scripts/checkTermRegister.mjs; echo exit=$?` → 0.

- [ ] **Step 7 : relectures (lecture seule, en parallèle)** — `fsp-language-reviewer` : registre oral patient vs écrit jury, naturel de `pa`, question d'anamnèse réellement posable, C1, vouvoiement ; `fsp-clinical-reviewer` : exactitude de `vo` (le terme est-il employé dans le bon contexte clinique ?), `pa` ne trahit pas le sens ; tous deux rendent une liste `id → constat → correction proposée` dans `app/docs/reports/f3-register-lot-01.md`. Un auteur (`content-case-author`) applique les corrections en un nouveau patch ; re-`apply` ; re-validateur.

- [ ] **Step 8 : commit**
```bash
git add scripts/registerLots.mjs
git add scripts/registerLots.test.mjs
git add src/data/fachbegriffe.json
git add docs/reports/f3-register-lot-01.md
git commit -m "content(fachbegriffe): double registre — lot pilote 01 (100 termes), relu langue + clinique (F3)"
```

---

### Task C4 : [GATE DIRECTION] Revue du rendu du pilote

Rien n'avance en Tranche C tant que la direction n'a pas validé.

- [ ] `direction-keeper` (lecture seule) passe le lot pilote contre `app/docs/DIRECTION-STYLE.md` (anti-slop, concision, raisonnement sur le cas, zéro doublon) et rend ses constats.
- [ ] Préparer pour la direction : 10 termes tirés au hasard du pilote (`node -e` avec graine fixe), captures à 390 px et desktop de la fiche, de la carte de survol et du dos du drill (playwright-cli, app locale sur ce worktree).
- [ ] **Direction** : valide, ou ajuste le brief (Task C3 Step 5). Tout changement de brief → re-générer les termes concernés du pilote avant de continuer. Consigner la décision et le brief final dans `app/docs/reports/f3-register-lot-01.md`.

---

### Task C5 : Lots 02 → 14 (gabarit répétable, ~100 termes par lot)

Répéter pour `N = 02 … 14` jusqu'à ce que `node scripts/checkTermRegister.mjs` affiche `0 liés sans registre`. Chaque lot est une tâche indépendante (un writer à la fois sur `fachbegriffe.json`).

- [ ] **1.** `node scripts/registerLots.mjs next; echo exit=$?` → 0 ; noter le nombre de termes et de spécialités.
- [ ] **2.** `content-case-author` (Sonnet) avec le **brief validé en C4** → `scratchpad/register-lot-N.patch.json`.
- [ ] **3.** `node scripts/registerLots.mjs apply ../scratchpad/register-lot-N.patch.json; echo exit=$?` → 0 ; `node scripts/checkTermRegister.mjs; echo exit=$?` → 0.
- [ ] **4.** `fsp-language-reviewer` + `fsp-clinical-reviewer` en parallèle → `app/docs/reports/f3-register-lot-N.md` ; corrections par l'auteur ; re-apply ; re-validateur.
- [ ] **5.** `npx vitest run src/data; echo exit=$?` → 0.
- [ ] **6.** Commit :
```bash
git add src/data/fachbegriffe.json
git add docs/reports/f3-register-lot-N.md
git commit -m "content(fachbegriffe): double registre — lot N (≈100 termes), relu langue + clinique (F3)"
```
- [ ] **Dernier lot** : dans `.github/workflows/quality.yml`, passer l'étape à `node scripts/checkTermRegister.mjs --require-all` ; `node scripts/checkTermRegister.mjs --require-all; echo exit=$?` → 0 ; commit `ci(fachbegriffe): registre exigé pour les 1 354 termes liés (F3)` (`git add ../.github/workflows/quality.yml`).

---

# Fin de branche

### Task F1 : Revue de branche

- [ ] Gates complets **avec et sans** `app/.env` (`mv .env .env.bak` puis restaurer) : typecheck, `vitest --dir src`, build, `node scripts/testRls.mjs`, tous les `scripts/check*.mjs` de la CI → exit 0.
- [ ] `quality-branch-reviewer` (Opus) sur la branche entière ; `security-review` + `security-auditor` (fonction `ai`, `ai_cache`, CORS, quotas, secrets) ; `front-design-keeper` + `ux-motion-designer` (pastille, confirmation, `TermRegister`, AC-10) ; `ux-user-advocate` (sélection → ★ → drill, mobile) ; `direction-keeper`. Un seul fixeur par série de constats, puis re-revue.

### Task F2 : Preuve navigateur par AC (playwright-cli, mesures depuis le DOM de l'app)

Créer `app/scripts/e2e/fachbegriffe-f3.spec.md` (même forme que `fachbegriffe-f2b.spec.md`) ; Supabase local avec migrations 13 et 14, `functions serve --env-file supabase/.env` de ce worktree (`AI_ALLOW_MOCK=1`, chaîne `mock:`), compte premium local (`grantFounder.mjs`), app sur port libre. Ne jamais `import("/src/…")` dans une sonde : lire le DOM et IndexedDB via `indexedDB.open`.

- [ ] **AC-1** : cas Leberzirrhose, sélectionner « Aszites » (double-clic) → pastille ★ + Expliquer ; ★ → « Ajouté aux favoris » ; onglet Favoris contient Aszites.
- [ ] **AC-2** : sélectionner « Belastungsdyspnoe » (hors glossaire) → ★ → « Carte créée » ; Favoris et `/fachbegriffe/drill` la montrent ; **2ᵉ contexte navigateur** même compte → après sync, présente.
- [ ] **AC-3** : ★ à nouveau → favori retiré, un seul terme ; deux contextes hors ligne (`context.setOffline(true)`) créent le même mot → reconnexion → un seul terme dans les deux.
- [ ] **AC-4** : forcer une resync de contenu (`contentLoader.sync({ full: true })` déclenché par l'UI existante ou changement de plan) → le terme personnel demeure.
- [ ] **AC-4b** : noter la carte personnelle « Gut » au drill → 2ᵉ contexte après sync : même `dueDate` (lu dans IndexedDB `personal_terms`).
- [ ] **AC-4c** : `--viewport 390x844` + `hasTouch` : sélection par appui long sur « Asziten » → pastille ; ★ → favori sur `fb-aszites`.
- [ ] **AC-6** : fiche, carte de survol, liste, panneau du cas, dos du drill montrent `TermRegister` ; à 390 px, `document.documentElement.scrollWidth <= 390` sur chaque écran.
- [ ] **AC-7 (local)** : sans clé navigateur (localStorage vidé), Expliquer hors glossaire → texte `mock:brief` ; Doctopus → flux `mock:chat` affiché progressivement (au moins 1 rendu intermédiaire observé) ; **(prod, après T-F3)** idem sur les deux comptes (Mehdi, Lydia) avec la vraie chaîne.
- [ ] **AC-8** : couper `functions serve` → avec clé de repli : Expliquer répond via la clé ; conversation déjà commencée via serveur → message honnête, pas de bascule ; sans clé → message honnête.
- [ ] **AC-9** : build `VITE_AUTH_MODE=public` → Doctopus et Expliquer se comportent comme avant (clé seule), pas d'appel à `/functions/v1/ai` (vérifier les requêtes réseau).
- [ ] Commit : `git add scripts/e2e/fachbegriffe-f3.spec.md` puis `git commit -m "test(fachbegriffe): preuve navigateur F3 — AC-1 à AC-9"`.

### Task F3 : [CONTRÔLEUR] Application en EU, PR, livraison

- [ ] Vérifier que A7 et B7 sont faits (migrations 13 et 14 listées par `list_migrations` ; `events` et `ai` à jour par `get_edge_function`) — **avant** merge (AC-9).
- [ ] `git push -u origin feat/fachbegriffe-f3` ; `gh pr create` (corps : résumé par tranche, tableau AC → preuve, risques résiduels, rappel secrets posés par la direction) ; CI verte.
- [ ] Merge par la direction ; vérification sur `https://mhdbkr.github.io/…` (AC-7 prod sur les deux comptes) ; `publishContent` publie les registres (delta par hash) ; issue de suivis ; mémoire.

---

## Couverture des critères d'acceptation

| AC | Tâches | Preuve |
|---|---|---|
| AC-1 | A4, A5, F2 | `starSelection` + `SelectionExplainer.test` ; navigateur |
| AC-2 | A1, A2, A3, A5, A7, F2 | `personalTerms.test`, `allTerms.test`, `DrillPage.test` ; navigateur 2 contextes |
| AC-3 | A2, A5, F2 | projection idempotente, `starSelection` bascule ; navigateur hors ligne |
| AC-4 | A2, F2 | `apply.test` (purge) ; navigateur resync |
| AC-4b | A2, A3, F2 | projection srs + `rateTerm` ; navigateur 2ᵉ contexte |
| AC-4c | A4, A5, F2 | `lookupTerm` « Asziten » ; `selectionchange` ; navigateur 390 px tactile |
| AC-5 | C1, C3, C4, C5 | `checkTermRegister --require-all` en CI ; rapports `f3-register-lot-*.md` |
| AC-6 | C2, F2 | `TermRegister.test`, `DrillPage.test`, `CaseTermsPanel.test` ; 390 px |
| AC-7 | B1–B5, B7, F2 | `ai.test.ts` (401/403/400/429/SSE), `onlineAi.route.test`, smoke `/models`, prod |
| AC-8 | B4, B5, F2 | `onlineAi.route.test` (repli, épinglage) ; navigateur |
| AC-9 | A7, B7, F2, F3 | MCP `list_migrations` / `get_edge_function` ; build public |
| AC-10 | A5, C2, F1 | `front-design-keeper`, `ux-motion-designer` |

## Auto-revue (faite)

- Couverture : chaque décision D1–D8 et chaque AC ont une tâche (tableau ci-dessus). Hors périmètre (§7) respecté : pas d'édition de terme personnel, l'explication tardive n'est pas réécrite (A5 : `explanation` n'est passée qu'au moment du ★).
- Cohérence des noms : `personalTermId`, `cleanSelection`, `PT_LIMITS`, `createPersonalTerm`, `deletePersonalTerm`, `starSelection`, `projectPersonalTerms`, `writePersonalTerms` (A2/A5) ; `toView`, `mergeTerms`, `rateTerm`, `isPersonalView`, `AnyTerm` (A3) ; `lookupTerm` (A4) ; `openStream`, `parseChain`, `sseDeltas`, `NoProvider`, `normalizeSelection` (B2) ; `serverStream`, `serverAiAvailable`, `ServerAiError`, `canAskAi`, `honestAiError`, `ChatTurn.via` (B4) ; `TermRegister`, `registerLine`, `TermRegisterData` (C1/C2) ; `checkEntry`, `termForms`, `nextLot` (C1/C3).
- Points à vérifier à l'exécution, signalés dans les tâches : nom exact exporté par `CaseContext.tsx` (A5), libellés d'accessibilité existants de `Doctopus.tsx` et `DrillPage.tsx` (B5, C2), forme des chemins `_shared` au déploiement MCP (A7, B7), format d'écriture de `fachbegriffe.json` (C3), noms de modèles (B7).
