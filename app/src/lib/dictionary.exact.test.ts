import { describe, expect, it } from 'vitest';
import { briefKind, exactLookup } from './dictionary';
import type { Fachbegriff } from '@/db/types';

const fb = (term: string) => ({ term, translationSimple: 'x' } as Fachbegriff);
const list = [fb('Sonde'), fb('Sondenernährung'), fb('Magenspiegelung')];

describe('exactLookup (FB2-M3) — jamais de flou', () => {
  it('renvoie le terme égal, casse et ponctuation de bord ignorées', () => {
    expect(exactLookup('sonde', list)?.term).toBe('Sonde');
    expect(exactLookup('„Sonde“,', list)?.term).toBe('Sonde');
  });
  it('ne renvoie ni un préfixe ni un terme qui contient la sélection', () => {
    expect(exactLookup('Sond', list)).toBeNull();
    expect(exactLookup('spiegelung', list)).toBeNull();
    expect(exactLookup('Sonden', list)).toBeNull();
  });
});

describe('briefKind (FB2-M2)', () => {
  it('terme : jusqu’à 4 mots sans ponctuation de phrase', () => {
    expect(briefKind('akute Pankreatitis')).toBe('term');
  });
  it('phrase : ponctuation ou plus de 4 mots', () => {
    expect(briefKind('Ich würde gern das Aufnahmegespräch mit Ihnen führen')).toBe('phrase');
    expect(briefKind('Mein herzliches Beileid.')).toBe('phrase');
  });
});
