import { beforeEach, describe, expect, it } from 'vitest';
import { clearPreferredVariants, getPreferredVariant, setPreferredVariant } from './variantPrefs';

describe('variantPrefs (FB2-O3)', () => {
  beforeEach(() => { localStorage.clear(); });
  it('standard par défaut, puis se souvient du choix', () => {
    expect(getPreferredVariant('Wie heißen Sie?', 2)).toBe(-1);
    setPreferredVariant('Wie heißen Sie?', 1);
    expect(getPreferredVariant('Wie heißen Sie?', 2)).toBe(1);
  });
  it('revenir à la standard efface ; un index hors borne est ignoré', () => {
    setPreferredVariant('X', 1); setPreferredVariant('X', -1);
    expect(getPreferredVariant('X', 2)).toBe(-1);
    setPreferredVariant('Y', 5);
    expect(getPreferredVariant('Y', 2)).toBe(-1);
  });
  it('clear oublie tout', () => {
    setPreferredVariant('X', 0); clearPreferredVariants();
    expect(getPreferredVariant('X', 1)).toBe(-1);
  });
});
