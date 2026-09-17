import { describe, it, expect, vi } from 'vitest';
import { relevanceScore, sortByRelevance, recentCaseAnchor, drillMinutes, type RelevanceContext } from './relevance';
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
  it('structure : l\'index terme→cas est construit UNE fois par tri (les cas sont parcourus une seule fois, jamais `includes` par terme)', () => {
    const terms = Array.from({ length: 2000 }, (_, i) => t(`term-${i}`));
    const includes = vi.fn();
    let iterations = 0;
    const raw = Array.from({ length: 130 }, (_, i) => {
      const ids = Array.from({ length: 25 }, (_, j) => `term-${(i * 25 + j) % 2000}`);
      (ids as unknown as { includes: typeof includes }).includes = includes;
      return { id: `case-${i}`, linkedFachbegriffeIds: ids };
    });
    const cases = new Proxy(raw, { get(target, prop, recv) { if (prop === Symbol.iterator) iterations++; return Reflect.get(target, prop, recv); } });
    const ctx: RelevanceContext = { ...base, cases, recentSimulations: [{ caseId: 'case-3', date: now - DAY_MS }] };
    const sorted = sortByRelevance(terms, ctx);
    expect(sorted).toHaveLength(2000);
    expect(iterations).toBe(1);
    expect(includes).not.toHaveBeenCalled();
    expect(sorted[0].id).toBe('term-75');    // case-3 lie term-75..99 : bonus « cas simulé » appliqué via l'index
  });
});

describe('recentCaseAnchor / drillMinutes (revue UX F2a)', () => {
  it('cas simulé < 7 j qui lie un Neu de la file → { caseId, name } ; sinon null', () => {
    const ctx: RelevanceContext = { ...base, cases: [{ id: 'c1', name: 'Ulcus ventriculi', linkedFachbegriffeIds: ['a'] }, { id: 'c2', name: 'GERD', linkedFachbegriffeIds: ['b'] }], recentSimulations: [{ caseId: 'c2', date: now - 3 * DAY_MS }, { caseId: 'c1', date: now - DAY_MS }] };
    expect(recentCaseAnchor([t('a'), t('b')], ctx)).toEqual({ caseId: 'c1', name: 'Ulcus ventriculi' });   // le plus récent d'abord
    expect(recentCaseAnchor([t('b')], ctx)).toEqual({ caseId: 'c2', name: 'GERD' });
    expect(recentCaseAnchor([t('zzz')], ctx)).toBeNull();
    expect(recentCaseAnchor([t('a')], { ...ctx, recentSimulations: [{ caseId: 'c1', date: now - 8 * DAY_MS }] })).toBeNull();
    expect(recentCaseAnchor([{ ...t('a'), srs: { ...t('a').srs, state: 'Gelernt' } }], ctx)).toBeNull();   // seuls les Neu comptent
  });
  it('drillMinutes = ceil(cartes × 0,4)', () => { expect(drillMinutes(10)).toBe(4); expect(drillMinutes(20)).toBe(8); expect(drillMinutes(1)).toBe(1); expect(drillMinutes(0)).toBe(0); });
});
