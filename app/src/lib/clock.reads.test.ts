// I10 (revue s3-programme) : toute lecture du temps passe par `lib/clock`.
// Horloge figée loin du vrai « maintenant » : un défaut qui lirait Date.now()
// donnerait une autre réponse.
import { describe, it, expect, afterEach } from 'vitest';
import type { Fachbegriff } from '@/db/types';
import { freezeAt, resetClock, DAY_MS } from '@/lib/clock';
import { counts } from './stats';
import { freshSrs, isDue } from './srs';
import { retention7d } from './srsBudget';

afterEach(() => resetClock());
const T = Date.parse('2031-03-10T09:00:00Z');

describe('I10 — les défauts de temps lisent lib/clock', () => {
  it('freshSrs / isDue / counts', () => {
    freezeAt(T);
    expect(freshSrs().dueDate).toBe(T);
    const due = { srs: { ...freshSrs(), state: 'Gelernt', repetitions: 1, dueDate: T - 1 } } as unknown as Fachbegriff;
    expect(isDue(due.srs)).toBe(true);
    expect(counts([due]).due).toBe(1);
  });
  it('retention7d compte les révisions des 7 jours de l\'horloge', () => {
    freezeAt(T);
    const ev = (i: number, d: number, repetitions: number) => ({ id: `${d}-${i}`, user_id: 'u', type: 'srs.reviewed' as const, subject_id: 'fb', payload: { repetitions }, occurred_at: new Date(T - d * DAY_MS).toISOString() });
    const recent = Array.from({ length: 10 }, (_, i) => ev(i, 1, 1));       // réussies, cette semaine
    const ancien = Array.from({ length: 10 }, (_, i) => ev(i, 30, 0));      // ratées, il y a un mois : hors fenêtre
    expect(retention7d([...recent, ...ancien])).toBe(1);
  });
});
