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

  it('un type inconnu est refusé en 400', async () => {
    const r = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${await tok(A)}`, 'content-type': 'application/json' }, body: JSON.stringify({ events: [{ ...ev(crypto.randomUUID()), type: 'hack' }] }) });
    expect(r.status).toBe(400);
  });

  it('sans token → 401', async () => {
    const r = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [ev(crypto.randomUUID())] }) });
    expect(r.status).toBe(401);
  });
});
