import { describe, it, expect, beforeEach } from 'vitest';
import { newBudget, introducedToday, markIntroduced, remainingToday, introducedKey, retention7d, reviewedToday, markReviewed } from './srsBudget';
import { freshSrs, reviewSrs } from '@/lib/srs';
import type { ProgressEvent } from '@/lib/sync/events';
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
  it('taper ≤ 7 j ouvrés : plafond 2 × jours, plancher 0 (veto pédagogie)', () => {
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 7, retention7d: 0.9 })).toBeLessThanOrEqual(14);
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 7, retention7d: 0.9 })).toBe(14);
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 2, retention7d: null })).toBeLessThanOrEqual(4);
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 0, retention7d: null })).toBe(0);
    expect(newBudget({ freshRemaining: 3, workingDaysToExam: 3, retention7d: null })).toBe(1);   // sous le plafond : ceil(3/3) = 1, pas de plancher 5
    expect(newBudget({ freshRemaining: 2000, workingDaysToExam: 8, retention7d: 0.9 })).toBe(30); // hors fenêtre : bornes [5, 30]
  });
});

describe('compteur du jour', () => {
  beforeEach(() => db.meta.clear());
  it('clé par jour ; remainingToday décroît à chaque markIntroduced', async () => {
    const d = new Date(2026, 8, 17, 12);   // heure locale
    expect(introducedKey(d)).toBe('srs.newIntroduced:2026-09-17');
    expect(await introducedToday(d)).toBe(0);
    await markIntroduced(d); await markIntroduced(d);
    expect(await introducedToday(d)).toBe(2);
    expect(await remainingToday(10, d)).toBe(8);
    expect(await remainingToday(1, d)).toBe(0);
    expect(await introducedToday(new Date(2026, 8, 18, 12))).toBe(0);
    expect(introducedKey(new Date(2026, 8, 17, 0, 30))).toBe('srs.newIntroduced:2026-09-17');   // 00 h 30 local = aujourd'hui
  });
  it('markReviewed × 3 → reviewedToday 3 ; le lendemain, compteur à 0 (M4)', async () => {
    const d = new Date(2026, 8, 17, 12);
    await markReviewed(d); await markReviewed(d); await markReviewed(d);
    expect(await reviewedToday(d)).toBe(3);
    expect(await reviewedToday(new Date(2026, 8, 18, 12))).toBe(0);
  });
});

describe('retention7d (M4)', () => {
  const now = Date.UTC(2026, 8, 17, 12);
  const ev = (payload: unknown, ageH = 1): ProgressEvent =>
    ({ id: String(Math.random()), user_id: 'local', type: 'srs.reviewed', subject_id: 'x', payload, occurred_at: new Date(now - ageH * 3600e3).toISOString() } as ProgressEvent);
  it('10 premières notes « Gut » (état Zu wiederholen, repetitions 1) → rétention 1, pas 0', () => {
    const gut = reviewSrs(freshSrs(now), 4, now);
    expect(gut.state).toBe('Zu wiederholen');
    expect(retention7d(Array.from({ length: 10 }, () => ev(gut)), now)).toBe(1);
  });
  it('échecs (« Wieder », repetitions 0) comptés comme échecs ; < 10 notes → null ; > 7 j ignorées', () => {
    const gut = reviewSrs(freshSrs(now), 4, now);
    const wieder = reviewSrs(freshSrs(now), 0, now);
    const notes = [...Array.from({ length: 7 }, () => ev(gut)), ...Array.from({ length: 3 }, () => ev(wieder))];
    expect(retention7d(notes, now)).toBeCloseTo(0.7);
    expect(retention7d(notes.slice(0, 9), now)).toBeNull();
    expect(retention7d([...notes.slice(0, 9), ev(wieder, 8 * 24)], now)).toBeNull();
  });
});
