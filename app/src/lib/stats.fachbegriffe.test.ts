// C6-A point 2 — l'axe Fachbegriffe mesure la RÉTENTION des cartes déjà vues,
// jamais la couverture du glossaire, et ne se prononce qu'à partir de
// FACHBEGRIFFE_MIN_VUES cartes vues (INV-3 : jamais « point faible » par absence).
import { describe, it, expect } from 'vitest';
import type { Case, CaseProgress, Fachbegriff } from '@/db/types';
import { FACHBEGRIFFE_MIN_VUES, FACHWISSEN_MIN_TENTES, axisScoresFull, weakestAxis } from './stats';

const neuve = (i: number): Fachbegriff => ({ id: `n${i}`, srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } } as unknown as Fachbegriff);
const retenue = (i: number): Fachbegriff => ({ id: `r${i}`, srs: { interval: 1, easeFactor: 2.5, dueDate: 0, repetitions: 1, lapses: 0, state: 'Zu wiederholen' } } as unknown as Fachbegriff);
const ratee = (i: number): Fachbegriff => ({ id: `x${i}`, srs: { interval: 0, easeFactor: 2.3, dueDate: 0, repetitions: 0, lapses: 1, state: 'Zu wiederholen' } } as unknown as Fachbegriff);
const lot = (f: (i: number) => Fachbegriff, n: number) => Array.from({ length: n }, (_, i) => f(i));
const axe = (b: Fachbegriff[]) => axisScoresFull([], b, [], new Map()).Fachbegriffe;

describe('axe Fachbegriffe', () => {
  it('le seuil est nommé', () => expect(FACHBEGRIFFE_MIN_VUES).toBe(20));
  it('2 000 cartes jamais vues : pas de mesure, donc pas de point faible', () => {
    expect(axe(lot(neuve, 2000))).toBeNull();
    expect(weakestAxis(axisScoresFull([], lot(neuve, 2000), [], new Map()))).toBeNull();
  });
  it('sous le seuil de cartes vues : pas de mesure, même si toutes sont ratées', () => {
    expect(axe([...lot(neuve, 2000), ...lot(ratee, FACHBEGRIFFE_MIN_VUES - 1)])).toBeNull();
  });
  it('au seuil : part des cartes vues dont la dernière note était réussie, sur les seules cartes vues', () => {
    expect(axe([...lot(neuve, 2000), ...lot(retenue, 15), ...lot(ratee, 5)])).toBe(75);
    expect(axe([...lot(neuve, 2000), ...lot(ratee, 20)])).toBe(0);
  });
  it('travailler change le chiffre : 4 cartes de plus, 4 réussies', () => {
    const avant = axe([...lot(retenue, 10), ...lot(ratee, 10)]);
    const apres = axe([...lot(retenue, 14), ...lot(ratee, 10)]);
    expect(avant).toBe(50);
    expect(apres).toBeGreaterThan(avant!);
  });
});

describe('axe Fachwissen — mesuré sur les Teile JOUÉS, jamais sur les cas entiers', () => {
  type St = 'vierge' | 'fragile' | 'acquis' | 'solide';
  const cases = Array.from({ length: 130 }, (_, i) => ({ id: `c${i}` }) as unknown as Case);
  const cp = (i: number, a: St, d: St = 'vierge', f: St = 'vierge') => [`c${i}`, { caseId: `c${i}`, overall: 'entame', teile: { anamnese: { status: a }, dokumentation: { status: d }, fallvorstellung: { status: f } } } as unknown as CaseProgress] as const;
  const axes = (entries: (readonly [string, CaseProgress])[]) => axisScoresFull([], [], cases, new Map(entries));

  it('5 cas, Anamnese seule à 90 % : Fachwissen n\'est ni l\'axe le plus faible ni un point faible', () => {
    const s = axes(Array.from({ length: 5 }, (_, i) => cp(i, 'solide')));
    expect(s.Fachwissen).toBe(100);
    const faible = weakestAxis(s);
    expect(faible === null || faible.score >= 60, 'la bannière « Point faible » exige un score < 60').toBe(true);
  });
  it('aucun Teil joué, ou moins de FACHWISSEN_MIN_TENTES : pas de mesure', () => {
    expect(axes([]).Fachwissen).toBeNull();
    expect(axes(Array.from({ length: FACHWISSEN_MIN_TENTES - 1 }, (_, i) => cp(i, 'solide'))).Fachwissen).toBeNull();
  });
  it('au seuil : part des Teile joués qui sont acquis ou solides (les vierges ne comptent pas)', () => {
    const s = axes([cp(0, 'solide', 'acquis', 'fragile'), cp(1, 'fragile', 'fragile'), cp(2, 'solide')]);   // 6 Teile joués, 3 acquis/solides
    expect(FACHWISSEN_MIN_TENTES).toBe(5);
    expect(s.Fachwissen).toBe(50);
  });
  it('des Teile joués et ratés restent un vrai point faible', () => {
    expect(weakestAxis(axes(Array.from({ length: 5 }, (_, i) => cp(i, 'fragile'))))).toEqual({ axis: 'Fachwissen', score: 0 });
  });
});
