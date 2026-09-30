import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, URL } from './helpers';

const FN = `${URL}/functions/v1/events`;
let A: Awaited<ReturnType<typeof createTestUser>>, B: Awaited<ReturnType<typeof createTestUser>>;
const tok = async (u: typeof A) => (await u.client.auth.getSession()).data.session!.access_token;
const post = async (u: typeof A, events: unknown[]) =>
  fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${await tok(u)}`, 'content-type': 'application/json' }, body: JSON.stringify({ events }) }).then((r) => r.json());
const get = async (u: typeof A, since: string) =>
  fetch(`${FN}?since=${encodeURIComponent(since)}`, { headers: { Authorization: `Bearer ${await tok(u)}` } }).then((r) => r.json());
const ev = (id: string) => ({ id, type: 'plan.done', subject_id: 'p', payload: {}, occurred_at: '2026-09-15T10:00:00Z' });
const EPOCH = '1970-01-01T00:00:00Z';

beforeAll(async () => { A = await createTestUser('ev-a@test.dev'); B = await createTestUser('ev-b@test.dev'); });

describe('events', () => {
  it('ack + received_at, puis idempotent au rejeu (received_at identique)', async () => {
    const id = crypto.randomUUID();
    const first = await post(A, [ev(id)]);
    expect(first.acked).toEqual([id]);
    expect(first.received[id]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const replay = await post(A, [ev(id)]);
    expect(replay.acked).toEqual([id]);
    expect(replay.received[id]).toBe(first.received[id]);     // rejeu : même horodatage serveur, pas de doublon
    const { data } = await A.client.from('progress_events').select('id').eq('id', id);
    expect(data!.length).toBe(1);
  });

  it('GET filtre sur received_at (curseur serveur) et renvoie received_at', async () => {
    const id = crypto.randomUUID();
    const { received } = await post(A, [ev(id)]);
    const all = await get(A, EPOCH);
    expect(all.events.length).toBeGreaterThanOrEqual(1);
    expect(all.events.every((e: { received_at?: string }) => !!e.received_at)).toBe(true);
    const after = await get(A, received[id]);                 // strictement après le dernier reçu
    expect(after.events.find((e: { id: string }) => e.id === id)).toBeUndefined();
  });

  it('B ne voit pas les événements de A via GET', async () => {
    const r = await get(B, EPOCH);
    expect(r.events.every((e: { user_id: string }) => e.user_id === B.id)).toBe(true);
  });

  // S-C1 (revue s3-programme) : un 400 de LOT faisait perdre au client les
  // événements valides du même lot. Le refus est désormais PAR ÉVÉNEMENT.
  it('un type inconnu est rejeté événement par événement, jamais le lot entier', async () => {
    const ok = crypto.randomUUID(), bad = crypto.randomUUID();
    const res = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${await tok(A)}`, 'content-type': 'application/json' }, body: JSON.stringify({ events: [ev(ok), { ...ev(bad), type: 'hack' }] }) });
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r.acked).toEqual([ok]);
    expect(r.rejected.map((x: { id: string }) => x.id)).toEqual([bad]);
    expect(r.rejected[0].retry).toBe(true);                   // type inconnu : peut-être un client en avance sur le serveur
  });

  it('corps malformé (pas de liste) → 400', async () => {
    const r = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${await tok(A)}`, 'content-type': 'application/json' }, body: JSON.stringify({ events: 'x' }) });
    expect(r.status).toBe(400);
  });

  const te = (over: Record<string, unknown> = {}) => ({ at: 1790000000000, kind: 'fiche', caseId: 'case-gib', teile: [], source: 'libre', spentMin: 12, ...over });
  const task = (i: number) => ({ id: `t-${i}`, date: '2026-09-30', kind: 'simulation', caseId: 'case-gib', teil: 'anamnese', estMin: 20, source: 'plan', reason: 'r', label: 'GIB' });

  it('lot mixte [srs.reviewed valide, plan.materialized] : les deux persistent (journal série 3)', async () => {
    const a = crypto.randomUUID(), b = crypto.randomUUID();
    const r = await post(A, [
      { id: a, type: 'srs.reviewed', subject_id: 'fb-abdominal', payload: { state: 'Lernen' }, occurred_at: '2026-09-30T08:00:00Z' },
      { id: b, type: 'plan.materialized', subject_id: '2026-09-30', payload: { tasks: [task(1)], mode: 'teil-first', seed: 's', targetMin: 120 }, occurred_at: '2026-09-30T08:00:01Z' },
    ]);
    expect(r.rejected).toEqual([]);
    expect(r.acked.sort()).toEqual([a, b].sort());
    const { data } = await A.client.from('progress_events').select('id').in('id', [a, b]);
    expect(data!.length).toBe(2);
  });

  it('accepte training.logged et plan.replanned, garde plan.done (lignes existantes)', async () => {
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'training.logged', subject_id: crypto.randomUUID(), payload: te({ scores: { anamnese: 80 }, teile: ['anamnese'], kind: 'simulation', selbstbewertet: true }), occurred_at: '2026-09-30T09:00:00Z' },
      { id: crypto.randomUUID(), type: 'plan.replanned', subject_id: '2026-09-30', payload: { tasks: [task(2)], reason: 'manuel' }, occurred_at: '2026-09-30T09:00:01Z' },
      ev(crypto.randomUUID()),
    ]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(3);
  });

  it('training.logged hors schéma : rejeté par événement, sans retry (S-I3)', async () => {
    const bads = [
      te({ scores: { anamnese: 500 } }),                       // score hors 0–100
      te({ scores: { __proto__x: 50 } }),                      // Teil inconnu
      te({ teile: ['anamnese', 'anamnese', 'dokumentation', 'fallvorstellung'] }), // > 3
      te({ teile: ['hack'] }),
      te({ spentMin: 99999 }),
      te({ spentMin: 1.5 }),
      te({ kind: 'hack' }),
      te({ extra: 'x' }),                                      // strict
      te({ caseId: 'c'.repeat(101) }),
    ];
    const evs = bads.map((payload) => ({ id: crypto.randomUUID(), type: 'training.logged', subject_id: crypto.randomUUID(), payload, occurred_at: '2026-09-30T10:00:00Z' }));
    const r = await post(A, evs);
    expect(r.acked).toEqual([]);
    expect(r.rejected).toHaveLength(bads.length);
    expect(r.rejected.every((x: { retry?: boolean }) => !x.retry)).toBe(true);
  });

  it('plan.materialized : plus de 50 tâches, ou sujet qui n\'est pas une date → rejeté', async () => {
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'plan.materialized', subject_id: '2026-09-30', payload: { tasks: Array.from({ length: 51 }, (_, i) => task(i)), mode: 'teil-first', seed: 's' }, occurred_at: '2026-09-30T11:00:00Z' },
      { id: crypto.randomUUID(), type: 'plan.materialized', subject_id: 'hier', payload: { tasks: [task(1)], mode: 'teil-first', seed: 's' }, occurred_at: '2026-09-30T11:00:01Z' },
    ]);
    expect(r.acked).toEqual([]); expect(r.rejected).toHaveLength(2);
  });

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

  it('accepte srs.settings_changed', async () => {
    const r = await post(A, [{ id: crypto.randomUUID(), type: 'srs.settings_changed', subject_id: 'srs', payload: { mode: 'manual', newPerDay: 5 }, occurred_at: '2026-09-17T11:00:00Z' }]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(1);
  });

  it('accepte term.personal_created et term.personal_deleted (F3)', async () => {
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'term.personal_created', subject_id: 'pt-0a1b2c3d', payload: { term: 'Belastungsdyspnoe', createdAt: '2026-09-25T10:00:00Z' }, occurred_at: '2026-09-25T10:00:00Z' },
      { id: crypto.randomUUID(), type: 'term.personal_deleted', subject_id: 'pt-0a1b2c3d', payload: {}, occurred_at: '2026-09-25T10:01:00Z' },
    ]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(2);
  });

  it('accepte term.personal_updated (F4a)', async () => {
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'term.personal_created', subject_id: 'pt-0a1b2c3e', payload: { term: 'Belastungsdyspnoe', createdAt: '2026-09-28T10:00:00Z' }, occurred_at: '2026-09-28T10:00:00Z' },
      { id: crypto.randomUUID(), type: 'term.personal_updated', subject_id: 'pt-0a1b2c3e', payload: { explanation: 'Atemnot bei Belastung' }, occurred_at: '2026-09-28T10:01:00Z' },
    ]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(2);
  });

  it('payload > 64 Ko → rejeté par la contrainte (revue sécurité E1)', async () => {
    const r = await post(A, [{ id: crypto.randomUUID(), type: 'term.personal_updated', subject_id: 'pt-0a1b2c3e', payload: { explanation: 'x'.repeat(70_000) }, occurred_at: '2026-09-28T10:02:00Z' }]);
    expect(r.acked).toEqual([]); expect(r.rejected).toHaveLength(1);
  });

  it('sans token → 401', async () => {
    const r = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [ev(crypto.randomUUID())] }) });
    expect(r.status).toBe(401);
  });
});
