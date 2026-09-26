import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import type { Fachbegriff, PersonalTerm } from '@/db/types';
import { freshSrs } from '@/lib/srs';
import { toView, mergeTerms, rateTerm, isPersonalView } from './allTerms';
import { buildDrillQueue } from './drillQueue';

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
import { syncQueue } from '@/lib/sync/queue';

const fb = { id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as Fachbegriff;
const pt: PersonalTerm = { id: 'pt-0000abcd', term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) };

describe('allTerms', () => {
  beforeEach(async () => { await db.fachbegriffe.clear(); await db.personal_terms.clear(); vi.mocked(syncQueue.push).mockClear(); });
  it('toView : format Fachbegriff, personal=true, reformulation = explication', () => {
    const v = toView(pt);
    expect(v).toMatchObject({ id: pt.id, term: pt.term, translationSimple: 'Atemnot bei Belastung', specialty: 'Allgemein', personal: true });
    expect(isPersonalView(v)).toBe(true); expect(isPersonalView(fb)).toBe(false);
  });
  it('toView : sans explication ni contexte → translationSimple vide (I-1)', () => {
    const raw: PersonalTerm = { id: 'pt-1111aaaa', term: 'Dyspnoe', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) };
    expect(toView(raw).translationSimple).toBe('');
  });
  it('toView : sans explication, avec contexte → translationSimple = contexte (I-1)', () => {
    const raw: PersonalTerm = { id: 'pt-2222bbbb', term: 'Dyspnoe', context: 'Patient hat Dyspnoe bei Belastung.', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) };
    expect(toView(raw).translationSimple).toBe('Patient hat Dyspnoe bei Belastung.');
  });
  it('toView : une explication tardive ne réécrit pas la carte (contrat inchangé)', () => {
    const raw: PersonalTerm = { id: 'pt-3333cccc', term: 'Dyspnoe', context: 'ctx', explanation: 'Atemnot', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) };
    expect(toView(raw).translationSimple).toBe('Atemnot');
  });
  it('mergeTerms : glossaire + personnels ; le drill accepte les deux (AC-2)', () => {
    const all = mergeTerms([fb], [pt]);
    expect(all.map((t) => t.id)).toEqual(['fb-aszites', 'pt-0000abcd']);
    expect(buildDrillQueue(all).map((t) => t.id)).toContain('pt-0000abcd');
  });
  it('rateTerm : pt- écrit dans personal_terms et émet srs.reviewed', async () => {
    await db.personal_terms.put(pt);
    await rateTerm(toView(pt), 4);
    expect((await db.personal_terms.get(pt.id))!.srs.repetitions).toBe(1);
    expect(syncQueue.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'srs.reviewed', subject_id: pt.id }));
  });
  it('rateTerm : fb- écrit dans fachbegriffe (inchangé)', async () => {
    await db.fachbegriffe.put(fb);
    await rateTerm(fb, 4);
    expect((await db.fachbegriffe.get(fb.id))!.srs.repetitions).toBe(1);
  });
});
