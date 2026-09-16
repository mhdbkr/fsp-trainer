import { describe, expect, it } from 'vitest';
import type { Case, PartResult, Simulation } from '@/db/types';
import { weightedPartScore } from '@/lib/scoring';
import { sourceWeight, recencyWeight, isDemoSim, CORPUS_SPECIALTIES, computeS, computeC, computeL } from './bereitschaft';

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

const oralPart = (officialPct: number): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 50,
  contentPct: officialPct,
  officialPct,
  languageGrid: {} as PartResult['languageGrid'],
});

const simWithOral = (date: number, key: 'anamnese' | 'aufklaerung' | 'fallvorstellung', officialPct: number): Simulation =>
  ({ ...base, id: `sim-${date}-${Math.random()}`, date, parts: { [key]: oralPart(officialPct) } } as Simulation);

describe('computeL', () => {
  it('0 partie', () => {
    expect(computeL([])).toEqual({ value: 0, base: 0, trend: 0, samples: 0 });
  });

  it('2 parties à 90 → value plafonnée à 30', () => {
    const sims = [simWithOral(0, 'anamnese', 90), simWithOral(1, 'fallvorstellung', 90)];
    const l = computeL(sims);
    expect(l.samples).toBe(2);
    expect(l.value).toBe(30);
  });

  it('3 à 70 → 70, trend 0', () => {
    const sims = [0, 1, 2].map((i) => simWithOral(i, 'anamnese', 70));
    const l = computeL(sims);
    expect(l.value).toBe(70);
    expect(l.trend).toBe(0);
  });

  it('5 montantes → base 63, trend +5, value 68', () => {
    const pcts = [50, 55, 60, 70, 80];
    const sims = pcts.map((p, i) => simWithOral(i, 'anamnese', p));
    const l = computeL(sims);
    expect(l.base).toBe(63);
    expect(l.trend).toBe(5);
    expect(l.value).toBe(68);
  });

  it('5 descendantes → trend -5', () => {
    const pcts = [80, 70, 60, 55, 50];
    const sims = pcts.map((p, i) => simWithOral(i, 'anamnese', p));
    const l = computeL(sims);
    expect(l.trend).toBe(-5);
  });

  it('6 → samples 5, la plus ancienne ignorée', () => {
    const pcts = [10, 50, 55, 60, 70, 80];
    const sims = pcts.map((p, i) => simWithOral(i, 'anamnese', p));
    const l = computeL(sims);
    expect(l.samples).toBe(5);
    expect(l.base).toBe(63);
  });

  it('partie sans languageGrid (dokumentation) ignorée', () => {
    const sim: Simulation = { ...base, date: 0, parts: { dokumentation: part(80, 80) } };
    const l = computeL([sim]);
    expect(l.samples).toBe(0);
  });
});
