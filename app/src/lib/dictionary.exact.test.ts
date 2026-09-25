import { describe, expect, it } from 'vitest';
import { briefKind, exactLookup, lookupTerm } from './dictionary';
import type { Fachbegriff } from '@/db/types';

const fb = (term: string) => ({ term, translationSimple: 'x' } as Fachbegriff);
const list = [fb('Sonde'), fb('Sondenernährung'), fb('Magenspiegelung')];

describe('exactLookup (FB2-M3)', () => {
  it('exact match with case and punctuation ignored', () => {
    expect(exactLookup('sonde', list)?.term).toBe('Sonde');
    expect(exactLookup('"Sonde",', list)?.term).toBe('Sonde');
  });
  it('no prefix or contained term', () => {
    expect(exactLookup('Sond', list)).toBeNull();
    expect(exactLookup('spiegelung', list)).toBeNull();
    expect(exactLookup('Sonden', list)).toBeNull();
  });
});

describe('briefKind (FB2-M2)', () => {
  it('term up to 4 words without sentence punctuation', () => {
    expect(briefKind('akute Pankreatitis')).toBe('term');
  });
  it('phrase with punctuation or more than 4 words', () => {
    expect(briefKind('Ich würde gern das Aufnahmegespräch mit Ihnen führen')).toBe('phrase');
    expect(briefKind('Mein herzliches Beileid.')).toBe('phrase');
  });
});

describe('lookupTerm (F3)', () => {
  const g = [fb('Aszites'), fb('Sonde'), fb('Sondenernährung'), fb('Ödem')];
  it('exact first', () => expect(lookupTerm('Aszites', g)?.term).toBe('Aszites'));
  it('Asziten resolves Aszites', () => expect(lookupTerm('Asziten', g)?.term).toBe('Aszites'));
  it('Sonden resolves Sonde', () => expect(lookupTerm('Sonden', g)?.term).toBe('Sonde'));
  it('never prefix or compound', () => {
    expect(lookupTerm('Sond', g)).toBeNull();
    expect(lookupTerm('Sondenernähr', g)).toBeNull();
  });
  it('Ödems resolves Ödem (4-letter base)', () => expect(lookupTerm('Ödems', g)?.term).toBe('Ödem'));
  it('base less than 4 letters no derivation', () => expect(lookupTerm('Tbcs', [fb('Tbc')])).toBeNull());
});
