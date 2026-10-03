// I11 (revue s3-programme) : la frise avance par JOUR CALENDAIRE. Avancer par
// `i × 24 h` fait apparaître deux fois le 25 octobre (passage à l'heure
// d'hiver, 25 h ce jour-là) et décale l'étiquette des jours suivants.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { addDays, format } from 'date-fns';
import type { Case, ProgramConfig } from '@/db/types';
import { trajectory } from './trajectory';

const TZ = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/Berlin'; });
afterAll(() => { if (TZ === undefined) delete process.env.TZ; else process.env.TZ = TZ; });

const cases = [{ id: 'c1' } as Case];
const config = { examDate: '2026-11-10', startDate: '2026-09-01' } as ProgramConfig;

describe('I11 — TZ=Europe/Berlin, fin de l\'heure d\'été (25 oct. 2026)', () => {
  it('chaque jour une fois, dans l\'ordre, le dernier point = aujourd\'hui', () => {
    const now = new Date(2026, 9, 29, 12, 0).getTime();
    const ev = { id: 'x', at: new Date(2026, 9, 19, 9, 0).getTime(), kind: 'fiche' as const, teile: [], source: 'libre' as const, spentMin: 5 };
    const t = trajectory(config, cases, [ev], { now, windowDays: 30 });   // départ = minuit du premier événement
    const expected = Array.from({ length: 12 }, (_, i) => format(addDays(new Date(2026, 9, 18), i), 'yyyy-MM-dd'));   // veille du premier événement → aujourd'hui
    expect(t.points.map((p) => p.date)).toEqual(expected);
  });
  it('au printemps (29 mars 2026, 23 h) aussi, et la projection suit le calendrier', () => {
    const now = new Date(2026, 2, 27, 12, 0).getTime();
    const t = trajectory({ examDate: '2026-04-02', startDate: '2026-01-01' } as ProgramConfig, cases, [], { now, windowDays: 3 });
    const proj = t.projection.map((p) => p.date);
    expect(new Set(proj).size).toBe(proj.length);
    expect(t.points[t.points.length - 1].date).toBe('2026-03-27');
  });
});
