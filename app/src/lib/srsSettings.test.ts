import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { projectSrsSettings, getSrsSettings, setSrsSettings, DEFAULT_SRS_SETTINGS, effectiveDaily } from './srsSettings';
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

describe('get/setSrsSettings', () => {
  beforeEach(async () => { await db.meta.clear(); await db.progress_events.clear(); });
  it('set émet srs.settings_changed et met meta à jour ; get relit', async () => {
    await setSrsSettings({ mode: 'manual', newPerDay: 8, maxReviewsPerDay: 40 });
    expect((await db.progress_events.toArray()).find((e) => e.type === 'srs.settings_changed')?.payload).toEqual({ mode: 'manual', newPerDay: 8, maxReviewsPerDay: 40 });
    expect(await getSrsSettings()).toEqual({ mode: 'manual', newPerDay: 8, maxReviewsPerDay: 40 });
  });
});
