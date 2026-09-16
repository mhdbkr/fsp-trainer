import { describe, it, expect } from 'vitest';
import { computeReadiness } from '@/lib/readiness';

describe('computeReadiness (inchangé)', () => {
  it('vide → 0 / Pas encore / 6 axes non testés', () => {
    const r = computeReadiness([], [], []);
    expect(r.global).toBe(0);
    expect(r.verdict).toBe('Pas encore');
    expect(r.byAxis).toHaveLength(6);
    expect(r.byAxis.every((a) => !a.tested)).toBe(true);
  });
});
