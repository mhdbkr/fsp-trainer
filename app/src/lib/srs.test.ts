import { describe, it, expect } from 'vitest';
import { freshSrs, reviewSrs, isDue, isNew, DAY_MS } from './srs';
import { counts } from './stats';
import type { Fachbegriff } from '@/db/types';

const now = Date.UTC(2026, 8, 17, 12);
const fb = (srs: Fachbegriff['srs'], id = 'x'): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs });

describe('isDue / isNew (D1)', () => {
  it('un terme Neu n\'est jamais dû, même avec dueDate passée', () => {
    expect(isDue(freshSrs(now - DAY_MS), now)).toBe(false);
    expect(isNew(freshSrs(now))).toBe(true);
  });
  it('noté Gut → dû à sa dueDate, pas avant', () => {
    const s = reviewSrs(freshSrs(now), 4, now);
    expect(isDue(s, now)).toBe(false);
    expect(isDue(s, s.dueDate)).toBe(true);
    expect(isNew(s)).toBe(false);
  });
  it('raté → Zu wiederholen et dû (repetitions remis à 0 ne le rend pas Neu)', () => {
    const s = reviewSrs(reviewSrs(freshSrs(now), 4, now), 0, now + DAY_MS);
    expect(s.state).toBe('Zu wiederholen');
    expect(isDue(s, now + 2 * DAY_MS)).toBe(true);
  });
});

describe('counts', () => {
  it('sépare dus / nouveaux / appris', () => {
    const learned = reviewSrs(freshSrs(now - 10 * DAY_MS), 4, now - 10 * DAY_MS);   // dû depuis longtemps
    const future = reviewSrs(freshSrs(now), 5, now);                                  // appris, pas dû
    const c = counts([fb(freshSrs(now), 'a'), fb(freshSrs(now), 'b'), fb(learned, 'c'), fb(future, 'd')], now);
    expect(c).toEqual({ due: 1, fresh: 2, learned: 2 });
  });
});
