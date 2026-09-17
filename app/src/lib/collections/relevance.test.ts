import { describe, it, expect } from 'vitest';
import { relevanceScore, sortByRelevance, type RelevanceContext } from './relevance';
import type { Fachbegriff } from '@/db/types';
import { freshSrs, DAY_MS } from '@/lib/srs';

const now = Date.UTC(2026, 8, 17, 12);
const H = 3600_000;
const t = (id: string, specialty = 'Gastro'): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: specialty as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(now) });
const base: RelevanceContext = { now, favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [{ id: 'c1', linkedFachbegriffeIds: ['a'] }, { id: 'c2', linkedFachbegriffeIds: ['b'] }] };

describe('relevanceScore (D3)', () => {
  it('★ < 48 h = +100 ; ★ ancienne = 0', () => {
    expect(relevanceScore(t('a'), { ...base, favorites: [{ termId: 'a', since: new Date(now - 10 * H).toISOString() }] })).toBe(100);
    expect(relevanceScore(t('a'), { ...base, favorites: [{ termId: 'a', since: new Date(now - 3 * DAY_MS).toISOString() }] })).toBe(0);
  });
  it('deck < 48 h = +80', () => expect(relevanceScore(t('a'), { ...base, deckTerms: [{ deckId: 'd', termId: 'a', addedAt: new Date(now - H).toISOString() }] })).toBe(80));
  it('cas simulé hier = +60 × (1 − 1/7) ≈ 51 ; il y a 8 jours = 0', () => {
    expect(relevanceScore(t('a'), { ...base, recentSimulations: [{ caseId: 'c1', date: now - DAY_MS }] })).toBeCloseTo(60 * (1 - 1 / 7), 0);
    expect(relevanceScore(t('a'), { ...base, recentSimulations: [{ caseId: 'c1', date: now - 8 * DAY_MS }] })).toBe(0);
  });
  it('cas du programme du jour = +40 ; spécialité du jour = +20 ; cumul', () => {
    expect(relevanceScore(t('a'), { ...base, todayCaseIds: ['c1'] })).toBe(40);
    expect(relevanceScore(t('a'), { ...base, todaySpecialty: 'Gastro' as never })).toBe(20);
    expect(relevanceScore(t('a'), { ...base, todayCaseIds: ['c1'], todaySpecialty: 'Gastro' as never, favorites: [{ termId: 'a', since: new Date(now).toISOString() }] })).toBe(160);
  });
  it('sortByRelevance : score desc puis alphabétique', () => {
    const ctx = { ...base, favorites: [{ termId: 'zeta', since: new Date(now).toISOString() }] };
    expect(sortByRelevance([t('beta'), t('alpha'), t('zeta')], ctx).map((x) => x.id)).toEqual(['zeta', 'alpha', 'beta']);
  });
  it('perf : 2 000 termes Neu × 130 cas × 25 ids reste sous 60 ms (index terme→cas en O(n))', () => {
    const terms = Array.from({ length: 2000 }, (_, i) => t(`term-${i}`));
    const cases = Array.from({ length: 130 }, (_, i) => ({
      id: `case-${i}`,
      linkedFachbegriffeIds: Array.from({ length: 25 }, (_, j) => `term-${(i * 25 + j) % 2000}`),
    }));
    const ctx: RelevanceContext = { ...base, cases };
    const start = performance.now();
    sortByRelevance(terms, ctx);
    expect(performance.now() - start).toBeLessThan(60);
  });
});
