import { describe, it, expect } from 'vitest';
import { termsOfCase } from './caseTerms';
import type { Fachbegriff } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { freshSrs } from '@/lib/srs';
const t = (id: string): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() });
const ev = (type: ProgressEvent['type'], subject_id: string, payload: unknown): ProgressEvent => ({ id: `${type}-${subject_id}`, user_id: 'u', type, subject_id, payload, occurred_at: '2026-09-17T10:00:00Z' });

describe('termsOfCase (D5)', () => {
  it('liés ∪ marqués pendant ce cas ; sans doublon ; jamais un terme d\'un autre cas', () => {
    const all = [t('a'), t('b'), t('c'), t('d')];
    const events = [ev('term.favorited', 'b', { caseId: 'c1' }), ev('deck.term_added', 'd1', { termId: 'c', caseId: 'c1' }), ev('term.favorited', 'd', { caseId: 'c9' }), ev('term.favorited', 'a', {})];
    expect(termsOfCase('c1', all, { linkedFachbegriffeIds: ['a'] }, events).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('préserve l\'ordre de spécificité des ids liés, puis ajoute les marqués en ordre d\'événement', () => {
    const all = [t('a'), t('b'), t('c'), t('d')];
    const events = [ev('term.favorited', 'b', { caseId: 'c1' }), ev('term.favorited', 'a', { caseId: 'c1' })];
    expect(termsOfCase('c1', all, { linkedFachbegriffeIds: ['c', 'a'] }, events).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
});
