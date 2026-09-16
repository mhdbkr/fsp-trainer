import { describe, expect, it } from 'vitest';
import { EXAM_DAY_PLAN, ORDER, nextPart, targetSec } from './examDayPlan';

describe('examDayPlan', () => {
  it('BW : 3 parties de 1200 s, transition ≤ 60 s', () => {
    const p = EXAM_DAY_PLAN.BW;
    expect(p.parts.map((x) => x.key)).toEqual(ORDER);
    expect(p.parts.every((x) => x.targetSec === 1200)).toBe(true);
    expect(p.transitionSec).toBeLessThanOrEqual(60);
    expect(p.alertsSec).toEqual([300, 60]);
    expect(p.land).toBe('BW');
    expect(p.purgeAfterMs).toBe(24 * 3600 * 1000);
    expect(p.excludePlayedWithinMs).toBe(14 * 86_400_000);
  });

  it('nextPart avance dans ORDER puis renvoie null', () => {
    expect(nextPart('anamnese')).toBe('dokumentation');
    expect(nextPart('dokumentation')).toBe('fallvorstellung');
    expect(nextPart('fallvorstellung')).toBeNull();
  });

  it('targetSec lit la durée cible pour une partie donnée', () => {
    expect(targetSec('BW', 'anamnese')).toBe(1200);
    expect(targetSec('BW', 'dokumentation')).toBe(1200);
    expect(targetSec('BW', 'fallvorstellung')).toBe(1200);
  });
});
