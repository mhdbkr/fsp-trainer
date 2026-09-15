import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';

const post = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getAccessToken: vi.fn().mockResolvedValue('tok'), useSession: { getState: () => ({ user: { id: 'u1' } }) } }));
vi.stubGlobal('fetch', post);

import { syncQueue } from './queue';

describe('syncQueue', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.outbox.clear(); post.mockReset(); });

  it('push écrit l\'événement localement ET dans l\'outbox', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    expect(await db.progress_events.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);
  });
  it('flush envoie par lot et vide l\'outbox sur ack', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    const ev = await db.progress_events.toCollection().first();
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ acked: [ev!.id], rejected: [] }) });
    const r = await syncQueue.flush();
    expect(r.acked).toBe(1);
    expect(await db.outbox.count()).toBe(0);
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
    await new Promise((r) => setTimeout(r, 20));   // laisse partir la relance planifiée
    expect(post).toHaveBeenCalledTimes(2);
    expect(await db.outbox.count()).toBe(0);
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
