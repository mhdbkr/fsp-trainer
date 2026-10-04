// m2 — le radar ne dessine que des axes MESURÉS : un axe `null` n'est pas un creux à 0.
import { describe, it, expect } from 'vitest';
import type { Axis } from '@/db/types';
import { radarData, RADAR_MIN_AXES } from './stats';

const scores = (over: Partial<Record<Axis, number | null>>): Record<Axis, number | null> =>
  ({ Anamnese: null, Dokumentation: null, Fallvorstellung: null, Aufklärung: null, Fachbegriffe: null, Fachwissen: null, ...over });

describe('radarData', () => {
  it('retire les axes non mesurés, garde l\'ordre des axes', () => {
    expect(radarData(scores({ Anamnese: 40, Fachwissen: 0, Fachbegriffe: 70 }))).toEqual([
      { axis: 'Anamnese', score: 40 }, { axis: 'Fachbegr', score: 70 }, { axis: 'Fachwiss', score: 0 },
    ]);
  });
  it('sous RADAR_MIN_AXES axes mesurés : pas de polygone', () => {
    expect(RADAR_MIN_AXES).toBe(3);
    expect(radarData(scores({ Anamnese: 40, Fachwissen: 10 }))).toBeNull();
    expect(radarData(scores({}))).toBeNull();
  });
});
