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
    expect(queueCounts(pool, { now, newLimit: 1 })).toEqual({ due: 1, fresh: 1, favorites: 0 });
  });
});

describe('nextDueAt', () => {
  it('prochain dû futur, sinon null', () => {
    expect(nextDueAt([mk('a', 'Gelernt', +3), mk('b', 'Gelernt', +1)], now)).toBe(now + DAY_MS);
    expect(nextDueAt([mk('a', 'Neu', 0)], now)).toBeNull();
  });
});

// ── Lot F : un favori est « à revoir bientôt » (décision direction) ──────────
const iso = (t: number) => new Date(t).toISOString();
const ctxWith = (favorites: { termId: string; since: string }[]): RelevanceContext => ({ now, favorites, deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] });
/** Terme appris revu il y a `agoDays` jours avec un intervalle de `interval` jours (reviewSrs : dueDate = revue + interval). */
const learned = (id: string, agoDays: number, interval: number): Fachbegriff =>
  ({ ...mk(id, 'Gelernt', 0), srs: { ...freshSrs(now), state: 'Gelernt', interval, repetitions: 3, dueDate: now - agoDays * DAY_MS + interval * DAY_MS } });
const tomorrow = (t: number) => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime(); };

describe('favoris Neu de la séance (point 1)', () => {
  it('TOUS les favoris Neu < 48 h entrent au drill suivant, même budget épuisé et dus saturants', () => {
    const pool = [...Array.from({ length: 25 }, (_, i) => mk(`d${i}`, 'Gelernt', -1 - i)), ...Array.from({ length: 6 }, (_, i) => mk(`f${i}`, 'Neu', 0)), mk('n', 'Neu', 0)];
    const ctx = ctxWith(Array.from({ length: 6 }, (_, i) => ({ termId: `f${i}`, since: iso(now - 3600_000) })));
    const q = buildDrillQueue(pool, { now, newLimit: 0, relevance: ctx });
    expect(q).toHaveLength(20);
    expect(q.filter((b) => b.id.startsWith('f'))).toHaveLength(6);
    expect(q.some((b) => b.id === 'n')).toBe(false);
  });
  it('les favoris comptent dans le budget sans jamais être coupés par lui', () => {
    const pool = [mk('f1', 'Neu', 0), mk('f2', 'Neu', 0), mk('n1', 'Neu', 0), mk('n2', 'Neu', 0)];
    const ctx = ctxWith([{ termId: 'f1', since: iso(now) }, { termId: 'f2', since: iso(now) }]);
    expect(buildDrillQueue(pool, { now, newLimit: 3, relevance: ctx }).map((b) => b.id)).toEqual(['f1', 'f2', 'n1']);
  });
  it('un favori Neu ancien (≥ 48 h) n\'est plus forcé', () => {
    const pool = [mk('old', 'Neu', 0)];
    expect(buildDrillQueue(pool, { now, newLimit: 0, relevance: ctxWith([{ termId: 'old', since: iso(now - 49 * 3600_000) }]) })).toEqual([]);
  });
});

describe('favori déjà appris : échéance avancée au lendemain (point 2)', () => {
  const term = learned('L', 2, 12);                         // revu il y a 2 j, dû dans 10 j
  const fav = ctxWith([{ termId: 'L', since: iso(now) }]);
  it('pas dû aujourd\'hui, dû dès demain', () => {
    expect(buildDrillQueue([term], { now, relevance: fav })).toEqual([]);
    expect(buildDrillQueue([term], { now: tomorrow(now), relevance: { ...fav, now: tomorrow(now) } }).map((b) => b.id)).toEqual(['L']);
    expect(nextDueAt([term], now, fav.favorites)).toBe(tomorrow(now));
  });
  it('n\'écrit rien dans le SRS (historique intact)', () => {
    const before = { ...term.srs };
    buildDrillQueue([term], { now: tomorrow(now), relevance: fav });
    expect(term.srs).toEqual(before);
  });
  it('ne recule jamais une échéance déjà plus proche', () => {
    // Revu il y a ~5 j (intervalle 5) : dû dans 1 h, avant le « lendemain » du favori posé maintenant.
    const soon = { ...learned('S', 5, 5), srs: { ...learned('S', 5, 5).srs, dueDate: now + 3600_000, interval: 5 } };
    const f = ctxWith([{ termId: 'S', since: iso(now) }]);
    expect(tomorrow(now)).toBeGreaterThan(now + 3600_000);
    expect(nextDueAt([soon], now, f.favorites)).toBe(now + 3600_000);
  });
  it('revu depuis le favori : l\'échéance SRS reprend la main', () => {
    const f = ctxWith([{ termId: 'L', since: iso(now - 3 * DAY_MS) }]);   // favori AVANT la dernière revue
    expect(buildDrillQueue([term], { now: tomorrow(now), relevance: { ...f, now: tomorrow(now) } })).toEqual([]);
  });
  it('idempotent : même état, même file', () => {
    const a = buildDrillQueue([term], { now: tomorrow(now), relevance: fav });
    expect(buildDrillQueue([term], { now: tomorrow(now), relevance: fav })).toEqual(a);
  });
});

describe('drill après le cas : les favoris du cas en tête (point 3)', () => {
  it('leadIds ouvre la file, dans leur ordre, même hors budget', () => {
    const pool = [mk('d1', 'Gelernt', -2), mk('n1', 'Neu', 0), mk('c2', 'Neu', 0), mk('c1', 'Gelernt', -1)];
    const q = buildDrillQueue(pool, { now, newLimit: 0, leadIds: ['c1', 'c2'], relevance: ctxWith([]) });
    expect(q.map((b) => b.id)).toEqual(['c1', 'c2', 'd1']);
  });
});

describe('queueCounts.favorites (point 4)', () => {
  it('compte les favoris de la séance présents dans la file', () => {
    const pool = [mk('f1', 'Neu', 0), mk('n1', 'Neu', 0), mk('due', 'Gelernt', -1)];
    expect(queueCounts(pool, { now, newLimit: 1, relevance: ctxWith([{ termId: 'f1', since: iso(now) }]) })).toEqual({ due: 1, fresh: 1, favorites: 1 });
  });
});
