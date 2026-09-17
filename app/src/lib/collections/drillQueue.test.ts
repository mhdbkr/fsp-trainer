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
