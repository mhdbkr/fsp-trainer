// Le montage du cadran sur la carte de cas (S4-4). Le cadran lit `dialData` ; la
// carte n'ajoute que « joué depuis la dernière visite » (une comparaison de
// dates, pas une mesure) pour que l'arc se dessine une fois au retour.
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { freezeAt, resetClock } from '@/lib/clock';
import { blankProgress } from '@/lib/journal';
import type { CaseProgress } from '@/db/types';
import { dialDeCarte, derniereVisite, noteVisite, vientDeSouder } from './dialCarte';

const T0 = new Date(2026, 9, 5, 12).getTime();
const cp = (over: Partial<CaseProgress> = {}): CaseProgress => {
  const b = blankProgress('c1');
  return { ...b, ...over, teile: { ...b.teile, ...(over.teile ?? {}) } };
};
const joue = (lastAt: number) => ({ status: 'acquis' as const, lastScore: 75, lastAt, attempts: 1 });

beforeEach(() => { localStorage.clear(); freezeAt(T0); });
afterEach(() => resetClock());

describe('dialDeCarte', () => {
  it('est dialData tel quel quand il n\'y a pas eu de visite précédente (jamais tout animer au premier passage)', () => {
    const d = dialDeCarte(cp({ teile: { ...blankProgress('c1').teile, anamnese: joue(T0 - 1000) } }), null);
    expect(d.vientDEtreJoue).toBeUndefined();
    expect(d.teile.anamnese.lastScore).toBe(75);
  });
  it('marque les Teile joués APRÈS la dernière visite, et eux seuls', () => {
    const base = blankProgress('c1').teile;
    const d = dialDeCarte(cp({ teile: { ...base, anamnese: joue(T0 - 5000), fallvorstellung: joue(T0 - 100) } }), T0 - 1000);
    expect(d.vientDEtreJoue).toEqual(['fallvorstellung']);
  });
  it('rien de joué depuis : pas de clé', () => {
    const base = blankProgress('c1').teile;
    expect(dialDeCarte(cp({ teile: { ...base, anamnese: joue(T0 - 5000) } }), T0 - 1000).vientDEtreJoue).toBeUndefined();
  });
});

describe('vientDeSouder', () => {
  it('seulement si la soudure est postérieure à la dernière visite', () => {
    const pret = dialDeCarte(cp({ etat: 'pret', pretAt: T0 - 100 }), null);
    expect(vientDeSouder(pret, T0 - 1000)).toBe(true);
    expect(vientDeSouder(pret, T0)).toBe(false);
    expect(vientDeSouder(pret, null)).toBe(false);
    expect(vientDeSouder(dialDeCarte(cp(), null), T0 - 1000)).toBe(false);
  });
});

describe('dernière visite', () => {
  it('absente au premier passage, puis celle qu\'on a notée', () => {
    expect(derniereVisite()).toBeNull();
    noteVisite();
    expect(derniereVisite()).toBe(T0);
  });
  it('une valeur illisible vaut « jamais venu »', () => {
    localStorage.setItem('doctopus-cas-visite', 'oups');
    expect(derniereVisite()).toBeNull();
  });
});
