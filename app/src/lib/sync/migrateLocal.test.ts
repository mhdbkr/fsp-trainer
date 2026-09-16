import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
vi.mock('@/lib/auth/session', () => ({ AUTH_MODE: 'public', getAccessToken: vi.fn().mockResolvedValue(null), useSession: { getState: () => ({ user: { id: 'u1' } }) } }));
import { migrateLocalProgress } from './migrateLocal';

describe('migrateLocalProgress', () => {
  beforeEach(async () => { await Promise.all([db.simulations.clear(), db.fachbegriffe.clear(), db.cases.clear(), db.progress_events.clear(), db.outbox.clear(), db.meta.clear()]); });
  it('convertit simulations, SRS appris et couches en événements attribués à uid', async () => {
    await db.simulations.put({ id: 's1', caseId: 'c1', date: 1700000000000, parts: {}, notes: {}, prioritizedCorrections: [] } as never);
    await db.fachbegriffe.put({ id: 'fb1', term: 'x', srs: { interval: 3, easeFactor: 2.5, dueDate: 1, repetitions: 1, lapses: 0, state: 'Gelernt' } } as never);
    await db.fachbegriffe.put({ id: 'fb2', term: 'y', srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } } as never);
    await db.cases.put({ id: 'c1', layerProgress: 2 } as never);
    const r = await migrateLocalProgress('u1');
    expect(r.events).toBe(3);                       // 1 sim + 1 srs (fb2 Neu ignoré) + 1 layer
    const evs = await db.progress_events.toArray();
    expect(evs.every((e) => e.user_id === 'u1')).toBe(true);
    expect(await db.outbox.count()).toBe(3);
  });
  it('est idempotent (rejouer ne duplique pas)', async () => {
    await db.simulations.put({ id: 's1', caseId: 'c1', date: 1, parts: {}, notes: {}, prioritizedCorrections: [] } as never);
    await migrateLocalProgress('u1'); await migrateLocalProgress('u1');
    expect(await db.progress_events.count()).toBe(1);
  });
  it('ignore les simulations de démo (sim-demo-*)', async () => {
    await db.simulations.put({ id: 'sim-demo-1', caseId: 'c1', date: 1, parts: {}, notes: {}, prioritizedCorrections: [] } as never);
    await db.simulations.put({ id: 'real-1', caseId: 'c1', date: 2, parts: {}, notes: {}, prioritizedCorrections: [] } as never);
    const r = await migrateLocalProgress('u1');
    expect(r.events).toBe(1);
    expect((await db.progress_events.toArray()).map((e) => (e.payload as { id: string }).id)).toEqual(['real-1']);
  });
});
