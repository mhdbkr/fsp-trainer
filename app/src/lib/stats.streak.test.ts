// C6-A point 5 — les jours OFF du programme ne cassent pas la série : 5 jours
// ouvrés sur 5, la série est intacte le lundi (avant : retombait à 0).
import { describe, it, expect } from 'vitest';
import { dayKey } from '@/lib/clock';
import { streakFromDays } from './stats';

const jours = (...d: number[]) => new Set(d.map((n) => dayKey(new Date(2026, 9, n, 12))));
const WEEK_END = [0, 6];
const lundi12 = new Date(2026, 9, 12, 8);   // lundi 12 octobre 2026

describe('streakFromDays — jours off du programme', () => {
  it('lundi matin, 5/5 jours ouvrés de la semaine passée : série intacte (5), pas 0', () => {
    expect(streakFromDays(jours(5, 6, 7, 8, 9), lundi12, WEEK_END)).toBe(5);
  });
  it('sans programme configuré : comportement actuel (le week-end casse)', () => {
    expect(streakFromDays(jours(5, 6, 7, 8, 9), lundi12)).toBe(0);
    expect(streakFromDays(jours(5, 6, 7, 8, 9), lundi12, [])).toBe(0);
  });
  it('un jour OUVRÉ manqué casse toujours la série', () => {
    expect(streakFromDays(jours(5, 6, 8, 9), lundi12, WEEK_END)).toBe(2);          // le mercredi 7 manque
    expect(streakFromDays(jours(5, 6, 7, 8), lundi12, WEEK_END)).toBe(0);          // le vendredi 9 manque
  });
  it('le jour même compte quand il est travaillé, et ne casse rien tant qu\'il ne l\'est pas', () => {
    expect(streakFromDays(jours(5, 6, 7, 8, 9, 12), lundi12, WEEK_END)).toBe(6);
  });
  it('un jour off travaillé compte, un jour off au repos ne compte pas et ne casse pas', () => {
    expect(streakFromDays(jours(5, 6, 7, 8, 9, 10), lundi12, WEEK_END)).toBe(6);   // samedi 10 travaillé
    expect(streakFromDays(jours(9), new Date(2026, 9, 11, 9), WEEK_END)).toBe(1);  // dimanche off, vendredi fait
  });
  it('un programme où tous les jours sont off ne boucle pas', () => {
    expect(streakFromDays(jours(9), lundi12, [0, 1, 2, 3, 4, 5, 6])).toBe(0);
  });
  it('m7 — relit le passé avec la config ACTUELLE : changer offDays réécrit rétroactivement la série', () => {
    // Même journal (lundi 5 → vendredi 9 travaillés, week-end au repos) : la série dépend des jours off d'AUJOURD'HUI.
    const journal = jours(5, 6, 7, 8, 9);
    expect(streakFromDays(journal, lundi12, WEEK_END)).toBe(5);
    expect(streakFromDays(journal, lundi12, [0, 6, 3])).toBe(5);    // mercredi devenu off : rien de cassé
    expect(streakFromDays(journal, lundi12, [1, 2])).toBe(0);       // le week-end redevient un jour ouvré : la série casse aussi pour le passé
  });
});
