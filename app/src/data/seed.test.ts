import { describe, it, expect } from 'vitest';
import { wireLinks } from './seed';
import type { Case, Fachbegriff } from '@/db/types';
import { freshSrs } from '@/lib/srs';

const mkCase = (id: string, pathology: string, linked: string[]): Case =>
  ({ id, name: id, pathology, specialty: 'X', linkedFachbegriffeIds: linked, probableAufklaerungIds: [] } as unknown as Case);
const mkTerm = (id: string, tags: string[] = []): Fachbegriff =>
  ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: tags, centers: [], linkedCaseIds: [], srs: freshSrs(0) });

describe('wireLinks — réciproque cas ↔ Fachbegriffe (F2a 3.5)', () => {
  it('un terme lié par TEXTE (case.linkedFachbegriffeIds) reçoit le cas dans linkedCaseIds, en union avec les tags', () => {
    const ulcus = mkCase('case-ulcus', 'Ulkus', ['fb-haematemesis']);
    const gerd = mkCase('case-gerd', 'GERD', ['fb-pyrosis']);
    const haematemesis = mkTerm('fb-haematemesis');                 // non taggé
    const pyrosis = mkTerm('fb-pyrosis', ['Ulkus']);                // taggé Ulkus, lié par texte à GERD
    wireLinks([ulcus, gerd], [haematemesis, pyrosis], [], []);
    expect(haematemesis.linkedCaseIds).toEqual(['case-ulcus']);
    expect([...pyrosis.linkedCaseIds].sort()).toEqual(['case-gerd', 'case-ulcus']);
    // La réciproque inverse (tag → cas) garde l'ordre publié en tête et n'ajoute que des ids.
    expect(ulcus.linkedFachbegriffeIds[0]).toBe('fb-haematemesis');
    expect(ulcus.linkedFachbegriffeIds).toContain('fb-pyrosis');
  });
  it('ordre publié de case.linkedFachbegriffeIds préservé', () => {
    const c = mkCase('c', 'P', ['b', 'a']);
    const a = mkTerm('a'); const b = mkTerm('b');
    wireLinks([c], [a, b], [], []);
    expect(c.linkedFachbegriffeIds).toEqual(['b', 'a']);
  });
});
