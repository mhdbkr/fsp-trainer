import { describe, it, expect } from 'vitest';
import { buildDrillQueue, nextDueAt, queueCounts } from './drillQueue';
import type { RelevanceContext } from './relevance';
import type { Fachbegriff } from '@/db/types';
import { freshSrs, DAY_MS } from '@/lib/srs';

const now = Date.UTC(2026, 8, 17, 12);
const mk = (id: string, state: Fachbegriff['srs']['state'], dueOffsetDays: number, specialty = 'X'): Fachbegriff =>
  ({ id, term: id, translationSimple: '', specialty: specialty as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: { ...freshSrs(now), state, dueDate: now + dueOffsetDays * DAY_MS } });

describe('buildDrillQueue', () => {
  it('dus d\'abord (par date), puis Neu ; jamais un terme appris pas encore dû', () => {
    const pool = [mk('later', 'Gelernt', +3), mk('due2', 'Zu wiederholen', -1), mk('due1', 'Gelernt', -5), mk('new', 'Neu', 0)];
    expect(buildDrillQueue(pool, { now }).map((b) => b.id)).toEqual(['due1', 'due2', 'new']);
  });
  it('priorité spécialité sur les dus', () => {
    const pool = [mk('a', 'Gelernt', -1, 'Gastro'), mk('b', 'Gelernt', -2, 'Kardio')];
    expect(buildDrillQueue(pool, { now, prioritySpecialty: 'Gastro' }).map((b) => b.id)).toEqual(['a', 'b']);
  });
  it('limite 20 par défaut', () => {
    const pool = Array.from({ length: 30 }, (_, i) => mk(`n${i}`, 'Neu', 0));
    expect(buildDrillQueue(pool, { now })).toHaveLength(20);
  });
  it('ne sort jamais du pool', () => {
    const pool = [mk('only', 'Neu', 0)];
    expect(buildDrillQueue(pool, { now }).every((b) => b.id === 'only')).toBe(true);
  });
  it('newLimit borne les nouveaux ; relevance ordonne les nouveaux', () => {
    const ctx: RelevanceContext = { now, favorites: [{ termId: 'n3', since: new Date(now).toISOString() }], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] };
    const pool = [mk('n1', 'Neu', 0), mk('n2', 'Neu', 0), mk('n3', 'Neu', 0), mk('due', 'Gelernt', -1)];
    expect(buildDrillQueue(pool, { now, newLimit: 2, relevance: ctx }).map((b) => b.id)).toEqual(['due', 'n3', 'n1']);
    expect(buildDrillQueue(pool, { now, newLimit: 0 }).map((b) => b.id)).toEqual(['due']);
  });
  it('25 dus + 5 Neu (newLimit 10) → 20 cartes : 17 dus + 3 Neu réservés (pertinence en tête)', () => {
    const pool = [...Array.from({ length: 25 }, (_, i) => mk(`d${i}`, 'Gelernt', -1 - i)), ...Array.from({ length: 5 }, (_, i) => mk(`n${i}`, 'Neu', 0))];
    const ctx: RelevanceContext = { now, favorites: [{ termId: 'n4', since: new Date(now).toISOString() }], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] };
    const q = buildDrillQueue(pool, { now, newLimit: 10, relevance: ctx });
    expect(q).toHaveLength(20);
    expect(q.filter((b) => b.srs.state !== 'Neu')).toHaveLength(17);
    expect(q.slice(17).map((b) => b.id)).toEqual(['n4', 'n0', 'n1']);
    expect(q.slice(0, 17).every((b) => b.srs.state !== 'Neu')).toBe(true);
    // Sans Neu, les dus remplissent tout ; newLimit 0 → aucune réserve.
    expect(buildDrillQueue(pool, { now, newLimit: 0 })).toHaveLength(20);
    expect(buildDrillQueue(pool, { now, newLimit: 0 }).every((b) => b.srs.state !== 'Neu')).toBe(true);
  });
  it('maxReviews plafonne les dus présentés ; les nouveaux restent possibles', () => {
    const pool = [...Array.from({ length: 60 }, (_, i) => mk(`d${i}`, 'Gelernt', -1)), mk('n1', 'Neu', 0)];
    const q = buildDrillQueue(pool, { now, newLimit: 1, maxReviews: 20, limit: 100 });
    expect(q.filter((b) => b.srs.state !== 'Neu')).toHaveLength(20);
    expect(q.some((b) => b.id === 'n1')).toBe(true);
  });
  it('maxReviews garde les dus les PLUS URGENTS (date d\'échéance la plus ancienne)', () => {
    const pool = [mk('d-2', 'Gelernt', -2), mk('d-5', 'Gelernt', -5), mk('d-1', 'Gelernt', -1), mk('d-4', 'Gelernt', -4), mk('d-3', 'Gelernt', -3)];
    const q = buildDrillQueue(pool, { now, newLimit: 0, maxReviews: 2, limit: 100 });
    expect(q.map((b) => b.id)).toEqual(['d-5', 'd-4']);
  });
  it('queueCounts reflète la file', () => {
    const pool = [mk('n1', 'Neu', 0), mk('n2', 'Neu', 0), mk('due', 'Gelernt', -1)];
    expect(queueCounts(pool, { now, newLimit: 1 })).toEqual({ due: 1, fresh: 1 });
  });
});

describe('nextDueAt', () => {
  it('prochain dû futur, sinon null', () => {
    expect(nextDueAt([mk('a', 'Gelernt', +3), mk('b', 'Gelernt', +1)], now)).toBe(now + DAY_MS);
    expect(nextDueAt([mk('a', 'Neu', 0)], now)).toBeNull();
  });
});
