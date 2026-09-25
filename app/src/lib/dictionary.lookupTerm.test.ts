import { describe, expect, it } from 'vitest';
import { lookupTerm } from './dictionary';
import type { Fachbegriff } from '@/db/types';

const fb = (term: string) => ({ term, translationSimple: 'x' } as Fachbegriff);

describe('lookupTerm (F3) — exact puis formes fléchies simples', () => {
  const g = [fb('Aszites'), fb('Sonde'), fb('Sondenernährung'), fb('Ödem')];
  it('exact match', () => expect(lookupTerm('Aszites', g)?.term).toBe('Aszites'));
  it('inflected form resolves base term', () => expect(lookupTerm('Asziten', g)?.term).toBe('Aszites'));
  it('plural resolves singular', () => expect(lookupTerm('Sonden', g)?.term).toBe('Sonde'));
  it('never prefix or compound', () => {
    expect(lookupTerm('Sond', g)).toBeNull();
    expect(lookupTerm('Sondenernähr', g)).toBeNull();
  });
  it('inflected 4-letter base', () => expect(lookupTerm('Ödems', g)?.term).toBe('Ödem'));
  it('base less than 4 chars: no derivation', () => expect(lookupTerm('Tbcs', [fb('Tbc')])).toBeNull());
});
