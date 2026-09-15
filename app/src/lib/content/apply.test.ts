import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { applyContent, type ContentItem } from './apply';

const item = (id: string, kind: ContentItem['kind'], tier: number, deleted = false): ContentItem =>
  ({ id, kind, tier, version: 1, deleted, payload: { id, name: id, specialty: 'Kardiologie', pathology: id } });

describe('applyContent', () => {
  beforeEach(async () => { await db.cases.clear(); await db.fachwissen.clear(); await db.meta.clear(); });

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
});
