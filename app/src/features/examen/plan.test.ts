import { describe, expect, it } from 'vitest';
import { EXAM_DAY_PLAN, targetSec } from './plan';

describe('plan de l’Examen (BW)', () => {
  it('trois Teile de 1 200 s dans l’ordre d’examen, transition ≤ 60 s, alertes à 5:00 et 1:00', () => {
    const p = EXAM_DAY_PLAN.BW;
    expect(p.parts.map((x) => x.key)).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(p.parts.every((x) => x.targetSec === 1200 && x.source.length > 0)).toBe(true);
    expect(p.transitionSec).toBeLessThanOrEqual(60);
    expect(p.alertsSec).toEqual([300, 60]);
    expect(targetSec('BW', 'fallvorstellung')).toBe(1200);
  });
});
