import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { applyContent, type ContentItem } from './apply';

const item = (id: string, kind: ContentItem['kind'], tier: number, deleted = false): ContentItem =>
  ({ id, kind, tier, version: 1, deleted, payload: { id, name: id, specialty: 'Kardiologie', pathology: id } });

describe('applyContent', () => {
  beforeEach(async () => { await db.cases.clear(); await db.fachbegriffe.clear(); await db.fachwissen.clear(); await db.meta.clear(); await db.personal_terms.clear(); });

  it('upsert les items dans la table de leur kind', async () => {
    const r = await applyContent(db, [item('case-a', 'case', 1), item('fw-a', 'fachwissen', 1)], 1);
    expect(r.upserted).toBe(2);
    expect(await db.cases.get('case-a')).toBeTruthy();
    expect(await db.fachwissen.get('fw-a')).toBeTruthy();
  });
  it('supprime les items deleted', async () => {
    await applyContent(db, [item('case-a', 'case', 1)], 1);
    const r = await applyContent(db, [item('case-a', 'case', 1, true)], 1);
    expect(r.removed).toBe(1);
    expect(await db.cases.get('case-a')).toBeUndefined();
  });
  it('purge du cache ce qui dépasse le tier autorisé (perte de droits)', async () => {
    await applyContent(db, [item('case-free', 'case', 1), item('case-pro', 'case', 2)], 2);
    const r = await applyContent(db, [], 1);
    expect(r.removed).toBe(1);
    expect(await db.cases.get('case-pro')).toBeUndefined();
    expect(await db.cases.get('case-free')).toBeTruthy();
  });
  it('un fachbegriff publié sans srs en reçoit un neuf ; un srs local existant est conservé', async () => {
    await applyContent(db, [{ ...item('fb-a', 'fachbegriff', 1), payload: { id: 'fb-a', term: 'x' } }], 1);
    const fresh = await db.fachbegriffe.get('fb-a');
    expect(fresh?.srs?.state).toBe('Neu');
    await db.fachbegriffe.update('fb-a', { srs: { ...fresh!.srs, state: 'Gelernt', interval: 6 } });
    await applyContent(db, [{ ...item('fb-a', 'fachbegriff', 1), payload: { id: 'fb-a', term: 'x2' } }], 1);
    const kept = await db.fachbegriffe.get('fb-a');
    expect(kept?.srs?.state).toBe('Gelernt');
    expect((kept as { term?: string })?.term).toBe('x2');
  });
  it('ne touche jamais personal_terms, même en purge de tier (AC-4)', async () => {
    await db.personal_terms.put({ id: 'pt-00000001', term: 'Wort', createdAt: '2026-09-25T10:00:00Z', srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } });
    await applyContent(db, [item('fb-x', 'fachbegriff', 3), item('fb-x', 'fachbegriff', 3, true)], 1);
    expect(await db.personal_terms.get('pt-00000001')).toBeTruthy();
  });
});
