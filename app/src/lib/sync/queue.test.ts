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
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events: [{ id: 'r1', user_id: 'u1', type: 'plan.done', subject_id: 'x', payload: {}, occurred_at: '2026-01-01T00:00:00Z' }] }) });
    expect(await syncQueue.pull()).toBe(1);
    expect(await syncQueue.pull()).toBe(0);
    expect(await db.progress_events.count()).toBe(1);
  });
});
