import { describe, expect, it } from 'vitest';
import type { Case, PartResult, Simulation } from '@/db/types';
import { weightedPartScore } from '@/lib/scoring';
import { sourceWeight, recencyWeight, isDemoSim, CORPUS_SPECIALTIES, computeS, computeC } from './bereitschaft';

const caseOf = (id: string, specialty: Case['specialty'], frequency: number): Case =>
  ({ id, specialty, frequency } as unknown as Case);

const simOn = (caseId: string, overrides: Partial<Simulation> = {}): Simulation =>
  ({ ...base, id: `sim-${caseId}-${Math.random()}`, caseId, parts: { anamnese: part(80, 0) }, ...overrides } as Simulation);

const base = { id: 's1', caseId: 'c', date: 0, parts: {}, notes: {}, prioritizedCorrections: [] } as unknown as Simulation;

const part = (contentPct: number, officialPct: number): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 50,
  contentPct,
  officialPct,
});

describe('bereitschaft', () => {
  it('sourceWeight', () => {
    expect(sourceWeight({ ...base, context: 'pruefungstag', withSimulant: true })).toBe(3);
    expect(sourceWeight({ ...base, context: 'pruefungstag', withSimulant: false })).toBe(2); // solo
    expect(sourceWeight({ ...base, context: 'pruefungstag' })).toBe(2);
    expect(sourceWeight({ ...base, assistance: 'autonome' })).toBe(2);
    expect(sourceWeight({ ...base, assistance: 'assiste' })).toBe(1);
    expect(sourceWeight(base)).toBe(1);
  });

  it('recencyWeight bornes', () => {
    const D = 86_400_000;
    expect(recencyWeight(0, 29 * D)).toBe(1);
    expect(recencyWeight(0, 30 * D)).toBe(0.5);
    expect(recencyWeight(0, 90 * D)).toBe(0.25);
  });

  it('demo + corpus', () => {
    expect(isDemoSim({ ...base, id: 'sim-demo-1' })).toBe(true);
    expect(CORPUS_SPECIALTIES).toHaveLength(16);
  });
});

describe('computeS', () => {
  it('un seul axe testé (Anamnese, autonome, layer 3, frais)', () => {
    const anamnese = part(82, 0);
    const sim: Simulation = { ...base, assistance: 'autonome', layer: 3, date: 0, parts: { anamnese } };
    const expected = weightedPartScore(anamnese, { assistance: 'autonome', layer: 3 });
    expect(expected).toBe(80);
    const s = computeS([sim], 10 * 86_400_000);
    expect(s.byAxis).toEqual([
      { axis: 'Anamnese', score: expected, tested: true },
      { axis: 'Dokumentation', score: 0, tested: false },
      { axis: 'Fallvorstellung', score: 0, tested: false },
    ]);
    expect(s.value).toBe(Math.round(expected / 3));
  });

  it('aufklaerung seule compte sur Anamnese (poids × 0,5)', () => {
    const aufklaerung = part(82, 0);
    const sim: Simulation = { ...base, assistance: 'autonome', layer: 3, date: 0, parts: { aufklaerung } };
    const s = computeS([sim], 10 * 86_400_000);
    expect(s.byAxis[0]).toEqual({
      axis: 'Anamnese',
      score: weightedPartScore(aufklaerung, { assistance: 'autonome', layer: 3 }),
      tested: true,
    });
  });

  it('deux sims sur Dokumentation pondérées par la source', () => {
    const docA = part(90, 0);
    const docB = part(50, 0);
    const simA: Simulation = { ...base, id: 's-a', context: 'pruefungstag', withSimulant: true, date: 0, parts: { dokumentation: docA } };
    const simB: Simulation = { ...base, id: 's-b', assistance: 'assiste', date: 0, parts: { dokumentation: docB } };
    const now = 10 * 86_400_000;
    const scoreA = weightedPartScore(docA, { assistance: simA.assistance ?? 'assiste', layer: simA.layer ?? 1 });
    const scoreB = weightedPartScore(docB, { assistance: simB.assistance ?? 'assiste', layer: simB.layer ?? 1 });
    const wA = sourceWeight(simA) * recencyWeight(simA.date, now);
    const wB = sourceWeight(simB) * recencyWeight(simB.date, now);
    const s = computeS([simA, simB], now);
    expect(wA).toBe(3);
    expect(wB).toBe(1);
    expect(s.byAxis.find((a) => a.axis === 'Dokumentation')).toEqual({
      axis: 'Dokumentation',
      score: Math.round((wA * scoreA + wB * scoreB) / (wA + wB)),
      tested: true,
    });
  });

  it('weights exposés', () => {
    const s = computeS([], 0);
    expect(s.weights).toEqual({ pruefungstag: 3, autonome: 2, assiste: 1 });
    expect(s.value).toBe(0);
    expect(s.byAxis.every((a) => a.tested === false)).toBe(true);
  });
});

describe('computeC', () => {
  const c1 = caseOf('c1', 'Kardiologie', 10);
  const c2 = caseOf('c2', 'Neurologie', 30);
  const visibleCases = [c1, c2];

  it('sim autonome réussie sur c1 couvre Kardiologie', () => {
    const sim = simOn('c1', { assistance: 'autonome' });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(25);
    expect(c.covered).toEqual(['Kardiologie']);
    expect(c.missing).toEqual([{ specialty: 'Neurologie', share: 0.75 }]);
    expect(c.denominator).toBe(2);
    expect(c.outsidePlan).toHaveLength(14);
    expect(c.corpusTotal).toBe(16);
  });

  it('assistance assiste ne couvre pas', () => {
    const sim = simOn('c1', { assistance: 'assiste' });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(0);
  });

  it('sim autonome non réussie ne couvre pas', () => {
    const sim = simOn('c1', { assistance: 'autonome', parts: { anamnese: part(30, 0) } });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(0);
  });

  it('sim context pruefungstag solo réussie couvre', () => {
    const sim = simOn('c1', { context: 'pruefungstag', withSimulant: false });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(25);
    expect(c.covered).toEqual(['Kardiologie']);
  });

  it('visibleCases vide → value 0, pas de NaN', () => {
    const c = computeC([], [], []);
    expect(c.value).toBe(0);
    expect(Number.isNaN(c.value)).toBe(false);
  });

  it('lookup de spécialité via cases (union avec visibleCases)', () => {
    const sim = simOn('c1', { assistance: 'autonome' });
    const c = computeC([sim], [c1], [c2]);
    // c1 n'est pas dans visibleCases → F ne le contient pas, mais le lookup fonctionne quand même
    expect(c.covered).toEqual([]);
    expect(c.denominator).toBe(1);
  });
});
