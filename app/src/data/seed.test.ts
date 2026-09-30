import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
// seed.ts importe la session (→ client Supabase) : en CI il n'y a pas de .env,
// et wireLinks est pur — on mocke le module session pour ne rien charger.
vi.mock('@/lib/auth/session', () => ({ useSession: { getState: () => ({ user: null, status: 'anonymous' }) }, AUTH_MODE: 'public' }));
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

// La fiche préfixe déjà « Merke · » : un merksatz qui recommence par « Merke: »
// s'affiche « Merke · Merke: » (revue du site, fw-depression).
describe('merksatz sans préfixe', () => {
  it('aucun merksatz ne commence par « Merke »', () => {
    const src = readFileSync('src/data/seedFachwissen.ts', 'utf8');
    expect(src.match(/merksatz: ['"„]?Merke\b/g) ?? []).toEqual([]);
  });
});
