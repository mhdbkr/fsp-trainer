import { describe, it, expect } from 'vitest';
import { seedFachbegriffe } from './seedFachbegriffe';

describe('seedFachbegriffe (F3)', () => {
  const all = seedFachbegriffe();
  it('aucun terme en double (casse ignorée)', () => {
    const seen = new Set<string>();
    for (const b of all) {
      const k = b.term.trim().toLowerCase();
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
  });
  it('r → register quand présent', () => {
    const withR = all.filter((b) => b.register);
    for (const b of withR) expect(Object.keys(b.register!).sort()).toEqual(['anamnese', 'patient', 'vorstellung']);
  });
});
