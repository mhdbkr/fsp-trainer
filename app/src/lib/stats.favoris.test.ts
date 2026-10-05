// Revue I2 : l'échéance avancée d'un favori appris (lot F point 2) est lue PARTOUT
// où l'on compte les dus — sinon l'accueil dit 0 dû quand le drill en sert 1.
import { describe, it, expect } from 'vitest';
import type { Fachbegriff } from '@/db/types';
import { counts, dueCount } from './stats';
import { DAY_MS, effectiveDue, isDue } from './srs';

const now = Date.UTC(2026, 9, 1, 10);
const lendemain = (t: number) => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime(); };
// Revu il y a 5 j, intervalle 20 : dû dans 15 j.
const L = { id: 'L', srs: { interval: 20, easeFactor: 2.5, dueDate: now - 5 * DAY_MS + 20 * DAY_MS, repetitions: 3, lapses: 0, state: 'Gelernt' } } as unknown as Fachbegriff;
const fav = [{ termId: 'L', since: new Date(now).toISOString() }];

describe('counts / dueCount avec favoris (I2)', () => {
  it('le lendemain du favori, le terme appris compte comme dû', () => {
    expect(counts([L], lendemain(now), fav).due).toBe(1);
    expect(dueCount([L], lendemain(now), fav)).toBe(1);
  });
  it('sans favoris (ou le jour même) : rien ne change', () => {
    expect(counts([L], lendemain(now)).due).toBe(0);
    expect(counts([L], now, fav).due).toBe(0);
  });
  it('effectiveDue / isDue lisent une date de favori (Map construite une fois par l\'appelant)', () => {
    expect(effectiveDue(L.srs, Date.parse(fav[0].since))).toBe(lendemain(now));
    expect(isDue(L.srs, lendemain(now), Date.parse(fav[0].since))).toBe(true);
    expect(effectiveDue(L.srs)).toBe(L.srs.dueDate);
  });
});
