import { describe, expect, it } from 'vitest';
import { buildLinkIndex, splitAutoLink } from './autolink';
import type { Fachbegriff } from '@/db/types';

// FB2-N1 : un terme du glossaire ne doit être lié que comme MOT ENTIER —
// « sonde » ne se souligne pas dans « besonderen », « Magen » pas dans
// « Magenspiegelung » (composé = autre mot). Umlauts et ß sont des lettres.
const fb = (term: string): Fachbegriff => ({
  id: term, term, translationSimple: term, specialty: 'Innere Medizin' as Fachbegriff['specialty'],
  pathologyTags: [], centers: [], linkedCaseIds: [], srs: {} as Fachbegriff['srs'],
});
const index = buildLinkIndex([fb('Sonde'), fb('Magen'), fb('Herzinfarkt'), fb('Übelkeit'), fb('Blutdruck')]);
const linked = (text: string) => splitAutoLink(text, index).filter((p) => p.fb).map((p) => p.t);

describe('autolink — mots entiers', () => {
  it('ne lie pas un terme inclus dans un autre mot', () => {
    expect(linked('bei besonderen Stoffen')).toEqual([]);
    expect(linked('eine Magenspiegelung')).toEqual([]);
  });
  it('lie le terme comme mot entier, ponctuation comprise', () => {
    expect(linked('die Sonde liegt. Der Magen, leer.')).toEqual(['Sonde', 'Magen']);
    expect(linked('Herzinfarkt!')).toEqual(['Herzinfarkt']);
  });
  it('respecte les frontières avec umlaut et ß', () => {
    expect(linked('starke Übelkeit')).toEqual(['Übelkeit']);
    expect(linked('Blutdruckmessung')).toEqual([]);
  });
  it('un seul lien par terme et par bloc', () => {
    expect(linked('Sonde hier, Sonde da')).toEqual(['Sonde']);
  });
});
