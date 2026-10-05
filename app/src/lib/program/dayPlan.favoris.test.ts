import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Sans `.env`, sans réseau (contrat §10), comme dayPlan.test.ts.
vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));
import { db } from '@/db/db';
import type { Fachbegriff, ProgramConfig } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { DAY_MS, freezeAt, resetClock } from '@/lib/clock';
import { drillFavorisNote, ensureDayPlan, favoritesBefore } from './dayPlan';

// Lot F point 4 : la tâche drill dit « dont N favoris de ta séance », N > 0 seulement.
// Lu à l'AFFICHAGE (état courant) : le plan figé (INV-55) n'en dépend pas.
describe('drillFavorisNote', () => {
  it('rien à 0', () => expect(drillFavorisNote(0)).toBeNull());
  it('singulier / pluriel', () => {
    expect(drillFavorisNote(1)).toBe('dont 1 favori de ta séance');
    expect(drillFavorisNote(4)).toBe('dont 4 favoris de ta séance');
  });
});

// Revue I2 / INV-55 : le plan de D ne lit que le journal `at < startOfDay(D)`.
const fav = (termId: string, at: string): ProgressEvent => ({ id: `f-${termId}-${at}`, user_id: 'u', type: 'term.favorited', subject_id: termId, payload: {}, occurred_at: at });

describe('favoritesBefore — l\'entrée du plan s\'arrête à minuit de D', () => {
  it('un favori posé le jour D n\'entre pas ; celui de la veille, si', () => {
    const events = [fav('veille', '2026-09-30T20:00:00'), fav('jourD', '2026-10-01T09:00:00')];
    expect(favoritesBefore(events, '2026-10-01').map((f) => f.termId)).toEqual(['veille']);
    expect(favoritesBefore(events, '2026-10-02').map((f) => f.termId).sort()).toEqual(['jourD', 'veille']);
  });
});

describe('INV-55 — un favori posé le jour D ne change pas le plan de D, il compte dans celui de D+1', () => {
  beforeEach(async () => {
    await Promise.all([db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.meta.clear(), db.cases.clear(), db.fachbegriffe.clear(), db.progress_events.clear(), db.outbox.clear()]);
  });
  afterEach(() => resetClock());
  it('plan de D sans drill ; plan de D+1 avec « 1 terme dû »', async () => {
    const advance = freezeAt('2026-10-01T10:00:00');
    const config: ProgramConfig = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 };
    await db.meta.put({ key: 'program', value: config });
    const now = Date.parse('2026-10-01T10:00:00');
    // Appris, revu il y a 5 j, intervalle 20 : dû dans 15 j sans le favori.
    await db.fachbegriffe.put({ id: 'L', term: 'L', translationSimple: '', specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: { interval: 20, easeFactor: 2.5, dueDate: now + 15 * DAY_MS, repetitions: 3, lapses: 0, state: 'Gelernt' } } as unknown as Fachbegriff);
    await db.progress_events.put(fav('L', '2026-10-01T09:00:00'));
    const d = await ensureDayPlan('2026-10-01');
    expect(d!.tasks.some((t) => t.kind === 'drill')).toBe(false);
    advance(DAY_MS - 2 * 3600_000);                                   // D+1, 08:00
    const d1 = await ensureDayPlan('2026-10-02');
    expect(d1!.tasks.find((t) => t.kind === 'drill')?.reason).toBe('1 terme dû');
  });
});
