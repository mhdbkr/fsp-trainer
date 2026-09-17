import { describe, it, expect } from 'vitest';
import { letterOf, buildRows, sortDe } from './letters';
import type { Fachbegriff } from '@/db/types';
import { freshSrs } from '@/lib/srs';
const t = (term: string): Fachbegriff => ({ id: term, term, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() });

describe('letters', () => {
  it('umlauts et ß se rangent sous la lettre de base', () => {
    expect(letterOf('Ärztin')).toBe('A'); expect(letterOf('Ödem')).toBe('O'); expect(letterOf('Übelkeit')).toBe('U'); expect(letterOf('ßx')).toBe('S'); expect(letterOf('abdominal')).toBe('A'); expect(letterOf('1-Zimmer')).toBe('#');
  });
  it('umlauts minuscules se rangent aussi sous la lettre de base', () => {
    expect(letterOf('ätiologisch')).toBe('A'); expect(letterOf('ösophagotracheale')).toBe('O'); expect(letterOf('überall')).toBe('U');
  });
  it('buildRows : en-têtes de lettre + index du premier terme', () => {
    const { rows, firstIndexByLetter } = buildRows([t('Bauch'), t('Ärztin'), t('Abdomen')].sort(sortDe));
    expect(rows.map((r) => (r.kind === 'letter' ? `#${r.letter}` : r.term.term))).toEqual(['#A', 'Abdomen', 'Ärztin', '#B', 'Bauch']);
    expect(firstIndexByLetter.get('A')).toBe(0); expect(firstIndexByLetter.get('B')).toBe(3);
  });
  it('buildRows : une lettre minuscule ne rouvre pas un en-tête déjà ouvert', () => {
    const { rows } = buildRows([t('Abdomen'), t('ätiologisch'), t('Bauch')].sort(sortDe));
    const headers = rows.filter((r) => r.kind === 'letter' && r.letter === 'A');
    expect(headers).toHaveLength(1);
  });
});
