import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';

const post = vi.fn();
vi.mock('@/lib/auth/session', () => ({ AUTH_MODE: 'public', getAccessToken: vi.fn().mockResolvedValue('tok'), useSession: { getState: () => ({ user: { id: 'u1' } }) } }));
vi.stubGlobal('fetch', post);

import { syncQueue } from './queue';

describe('syncQueue', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.outbox.clear(); post.mockReset(); });

  it('push écrit l\'événement localement ET dans l\'outbox', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    expect(await db.progress_events.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);
  });
  it('pushMany écrit tous les événements et leurs lignes d\'outbox en une fois (F4a D10)', async () => {
    const evs = await syncQueue.pushMany([
      { type: 'term.unfavorited', subject_id: 'pt-1', payload: {} },
      { type: 'term.personal_deleted', subject_id: 'pt-1', payload: {} },
    ]);
    expect(evs).toHaveLength(2);
    expect(await db.progress_events.count()).toBe(2);
    expect(await db.outbox.count()).toBe(2);
  });

  it('push sans occurred_at : horodatage strictement croissant sur cet appareil, même dans la même milliseconde (sortEvents départage sinon par uuid aléatoire)', async () => {
    // toFake: ['Date'] seulement — fake-indexeddb dépend de vrais minuteurs
    // pour ses transactions ; les faux minuteurs la font échouer/bloquer.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const a = await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
      const b = await syncQueue.push({ type: 'plan.done', subject_id: 'p2', payload: {} });
      expect(b.occurred_at > a.occurred_at).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('pushMany sans occurred_at : les événements d\'un même lot gardent un ordre causal strictement croissant', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    try {
      const [a, b, c] = await syncQueue.pushMany([
        { type: 'plan.done', subject_id: 'p1', payload: {} },
        { type: 'plan.done', subject_id: 'p2', payload: {} },
        { type: 'plan.done', subject_id: 'p3', payload: {} },
      ]);
      expect(b.occurred_at > a.occurred_at).toBe(true);
      expect(c.occurred_at > b.occurred_at).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('flush envoie par lot et vide l\'outbox sur ack', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    const ev = await db.progress_events.toCollection().first();
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ acked: [ev!.id], received: { [ev!.id]: '2026-03-01T00:00:00Z' }, rejected: [] }) });
    const r = await syncQueue.flush();
    expect(r.acked).toBe(1);
    expect(await db.outbox.count()).toBe(0);
    // l'ack rétro-remplit received_at → le curseur de pull avancera sur cet appareil
    expect((await db.progress_events.get(ev!.id))!.received_at).toBe('2026-03-01T00:00:00Z');
  });
  it('flush garde en outbox sur 5xx et incrémente attempts', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    post.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await syncQueue.flush();
    const row = await db.outbox.toCollection().first();
    expect(row!.attempts).toBe(1);
  });
  it('flush retire et marque rejected sur 4xx (pas de rejeu infini)', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    const ev = await db.progress_events.toCollection().first();
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ acked: [], rejected: [{ id: ev!.id, reason: 'unknown type' }] }) });
    const r = await syncQueue.flush();
    expect(r.rejected).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });
  // S-C1 : un 400 de LOT vidait jusqu'à 100 événements de l'outbox. C'est ce que
  // fait le serveur de production actuel dès qu'un lot contient un type nouveau.
  // Chaque test passe par push/pushMany : il remet le backoff à zéro (un test
  // précédent a pu le poser) — sinon flush() sortirait sans rien envoyer.
  // flush() rejoint le flush en vol lancé par push (single-flight).
  const settle = () => syncQueue.flush();
  it('400 de lot : aucun événement perdu — les valides repartent un par un, le refusé reste en outbox', async () => {
    post.mockImplementation(async (_url: string, init?: { body?: string }) => {
      const evs = JSON.parse(init!.body!).events as { id: string; type: string }[];
      if (evs.some((e) => e.type === 'plan.materialized')) return { ok: false, status: 400, json: async () => ({ error: 'bad_request' }) };
      return { ok: true, status: 200, json: async () => ({ acked: evs.map((e) => e.id), received: {}, rejected: [] }) };
    });
    const [srs, plan] = await syncQueue.pushMany([
      { type: 'srs.reviewed', subject_id: 'fb-1', payload: {} },
      { type: 'plan.materialized', subject_id: '2026-09-30', payload: { tasks: [] } },
    ]);
    await settle();
    expect(await db.outbox.get(srs.id)).toBeUndefined();
    expect((await db.outbox.get(plan.id))!.attempts).toBe(1);   // gardé, retenté plus tard (serveur migré)
    expect(await db.progress_events.count()).toBe(2);
  });
  it.each([401, 429])('%i sur le lot : gardé en outbox, jamais rejeté', async (status) => {
    post.mockResolvedValue({ ok: false, status, json: async () => ({}) });
    await syncQueue.push({ type: 'srs.reviewed', subject_id: 'fb-1', payload: {} });
    await settle();
    expect(post).toHaveBeenCalled();
    expect((await db.outbox.toArray()).map((r) => r.attempts)).toEqual([1]);
  });
  it('rejected avec retry (type pas encore connu du serveur) : gardé ; sans retry : retiré', async () => {
    post.mockImplementation(async (_url: string, init?: { body?: string }) => {
      const evs = JSON.parse(init!.body!).events as { id: string; subject_id: string }[];
      const by = (s: string) => evs.find((e) => e.subject_id === s)!.id;   // l'ordre du lot suit l'uuid : ne pas s'y fier
      return { ok: true, status: 200, json: async () => ({ acked: [], received: {}, rejected: [{ id: by('x'), reason: 'unknown_type', retry: true }, { id: by('y'), reason: 'invalid payload' }] }) };
    });
    const [x, y] = await syncQueue.pushMany([
      { type: 'training.logged', subject_id: 'x', payload: {} },
      { type: 'training.logged', subject_id: 'y', payload: {} },
    ]);
    await settle();
    expect((await db.outbox.get(x.id))!.attempts).toBe(1);
    expect(await db.outbox.get(y.id)).toBeUndefined();
  });
  it('une ligne d\'outbox sans événement (orpheline) est retirée, elle ne bloque pas la file', async () => {
    await db.outbox.put({ id: 'ghost', attempts: 0 });
    post.mockImplementation(async (_url: string, init?: { body?: string }) => {
      const ids = (JSON.parse(init!.body!).events as { id: string }[]).map((e) => e.id);
      return { ok: true, status: 200, json: async () => ({ acked: ids, received: {}, rejected: [] }) };
    });
    await syncQueue.push({ type: 'srs.reviewed', subject_id: 'fb-1', payload: {} });
    await settle();
    expect(await db.outbox.count()).toBe(0);
  });
  it('pull insère les événements distants sans doublon', async () => {
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events: [{ id: 'r1', user_id: 'u1', type: 'plan.done', subject_id: 'x', payload: {}, occurred_at: '2026-01-01T00:00:00Z', received_at: '2026-01-01T00:00:05Z' }] }) });
    expect(await syncQueue.pull()).toBe(1);
    expect(await syncQueue.pull()).toBe(0);
    expect(await db.progress_events.count()).toBe(1);
  });
  it('pull utilise received_at (serveur) comme curseur, pas occurred_at (client)', async () => {
    await db.progress_events.put({ id: 'loc1', user_id: 'u1', type: 'plan.done', subject_id: 'x', payload: {}, occurred_at: '2026-06-01T00:00:00Z', received_at: '2026-01-10T00:00:00Z' });
    await db.progress_events.put({ id: 'loc2', user_id: 'u1', type: 'plan.done', subject_id: 'y', payload: {}, occurred_at: '2026-07-01T00:00:00Z' });   // pas encore rapatrié : ignoré pour le curseur
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events: [] }) });
    await syncQueue.pull();
    const url = String(post.mock.calls[0][0]);
    expect(decodeURIComponent(url)).toContain('since=2026-01-10T00:00:00Z');
  });

  it('flush draine un backlog > 100 en plusieurs pages sans attendre le timer', async () => {
    post.mockImplementation(async (_url: string, init?: { body?: string }) => {
      const ids = (JSON.parse(init!.body!).events as { id: string }[]).map((e) => e.id);
      return { ok: true, status: 200, json: async () => ({ acked: ids, rejected: [] }) };
    });
    // 150 événements en outbox, sans déclencher flush à chaque push
    const evs = Array.from({ length: 150 }, (_, i) => ({ id: `e${i}`, user_id: 'u1', type: 'plan.done' as const, subject_id: `p${i}`, payload: {}, occurred_at: '2026-01-01T00:00:00Z' }));
    await db.progress_events.bulkPut(evs);
    await db.outbox.bulkPut(evs.map((e) => ({ id: e.id, attempts: 0 })));
    await syncQueue.flush();
    await vi.waitFor(async () => {                     // la relance planifiée part hors de ce flush
      expect(post).toHaveBeenCalledTimes(2);
      expect(await db.outbox.count()).toBe(0);
    });
  });

  it('bump incrémente attempts PAR LIGNE (un lot mélange neufs et déjà retentés)', async () => {
    await db.progress_events.bulkPut([
      { id: 'a', user_id: 'u1', type: 'plan.done', subject_id: 'a', payload: {}, occurred_at: '2026-01-01T00:00:00Z' },
      { id: 'b', user_id: 'u1', type: 'plan.done', subject_id: 'b', payload: {}, occurred_at: '2026-01-01T00:00:00Z' },
    ]);
    await db.outbox.bulkPut([{ id: 'a', attempts: 3 }, { id: 'b', attempts: 0 }]);
    post.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await syncQueue.flush();
    expect((await db.outbox.get('a'))!.attempts).toBe(4);
    expect((await db.outbox.get('b'))!.attempts).toBe(1);
  });
});
