import { describe, expect, it } from 'vitest';
import type { Simulation } from '@/db/types';
import { sourceWeight, recencyWeight, isDemoSim, CORPUS_SPECIALTIES } from './bereitschaft';

const base = { id: 's1', caseId: 'c', date: 0, parts: {}, notes: {}, prioritizedCorrections: [] } as unknown as Simulation;

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
