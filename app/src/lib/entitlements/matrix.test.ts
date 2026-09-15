import { describe, it, expect } from 'vitest';
import { buildMatrix, has, limit } from './matrix';

const rows = [
  { plan_id: 'free', feature: 'content.tier', limit_value: 1 },
  { plan_id: 'pro', feature: 'content.tier', limit_value: 2 },
  { plan_id: 'pro', feature: 'sim.online', limit_value: null },
  { plan_id: 'pro', feature: 'credits.monthly', limit_value: 200 },
];
const m = buildMatrix(rows);

describe('entitlements matrix', () => {
  it('has : vrai si la feature existe pour le plan (limit null = illimité)', () => {
    expect(has(m, 'pro', 'sim.online')).toBe(true);
    expect(has(m, 'free', 'sim.online')).toBe(false);
  });
  it('has : vrai si limit > 0', () => {
    expect(has(m, 'pro', 'credits.monthly')).toBe(true);
    expect(has(m, 'free', 'credits.monthly')).toBe(false);
  });
  it('limit : la valeur, null si illimité, 0 si absente', () => {
    expect(limit(m, 'pro', 'content.tier')).toBe(2);
    expect(limit(m, 'pro', 'sim.online')).toBeNull();
    expect(limit(m, 'free', 'league')).toBe(0);
  });
  it('un plan inconnu se comporte comme free', () => {
    expect(limit(m, 'gold', 'content.tier')).toBe(1);
  });
});
