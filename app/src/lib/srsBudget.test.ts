import { describe, it, expect, beforeEach } from 'vitest';
import { newBudget, introducedToday, markIntroduced, remainingToday, introducedKey } from './srsBudget';
import { db } from '@/db/db';

describe('newBudget (D2)', () => {
  it('sans examen → 10', () => expect(newBudget({ freshRemaining: 2000, workingDaysToExam: null, retention7d: null })).toBe(10));
  it('600 Neu, 30 j ouvrés → 20', () => expect(newBudget({ freshRemaining: 600, workingDaysToExam: 30, retention7d: null })).toBe(20));
  it('rétention 0,5 → ×0,7 (600/30 = 20 → 14)', () => expect(newBudget({ freshRemaining: 600, workingDaysToExam: 30, retention7d: 0.5 })).toBe(14));
  it('rétention 0,9 → ×1,2 (20 → 24)', () => expect(newBudget({ freshRemaining: 600, workingDaysToExam: 30, retention7d: 0.9 })).toBe(24));
  it('borné 5–30', () => {
    expect(newBudget({ freshRemaining: 20, workingDaysToExam: 60, retention7d: null })).toBe(5);
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 10, retention7d: 0.9 })).toBe(30);
    expect(newBudget({ freshRemaining: 0, workingDaysToExam: 10, retention7d: null })).toBe(5);
  });
});

describe('compteur du jour', () => {
  beforeEach(() => db.meta.clear());
  it('clé par jour ; remainingToday décroît à chaque markIntroduced', async () => {
    const d = new Date(Date.UTC(2026, 8, 17, 12));
    expect(introducedKey(d)).toBe('srs.newIntroduced:2026-09-17');
    expect(await introducedToday(d)).toBe(0);
    await markIntroduced(d); await markIntroduced(d);
    expect(await introducedToday(d)).toBe(2);
    expect(await remainingToday(10, d)).toBe(8);
    expect(await remainingToday(1, d)).toBe(0);
    expect(await introducedToday(new Date(Date.UTC(2026, 8, 18, 12)))).toBe(0);
  });
});
