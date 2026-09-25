import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import { rebuildProjections } from '@/lib/sync/projections';
import {
  personalTermId, cleanSelection, sanitizePersonalTerm, projectPersonalTerms,
  createPersonalTerm, deletePersonalTerm, isPersonalId, PT_LIMITS, starSelection,
} from './personalTerms';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const at = (s: number) => new Date(Date.UTC(2026, 8, 25, 10, 0, s)).toISOString();
const ev = (type: ProgressEvent['type'], subject: string, payload: unknown, s: number, id = `${type}-${s}`): ProgressEvent =>
  ({ id, user_id: 'u', type, subject_id: subject, payload, occurred_at: at(s) });

describe('id et nettoyage', () => {
  it('même mot (casse ignorée) → même id pt-<8 hex>', () => {
    expect(personalTermId('Belastungsdyspnoe')).toMatch(/^pt-[0-9a-f]{8}$/);
    expect(personalTermId('belastungsdyspnoe')).toBe(personalTermId('BELASTUNGSDYSPNOE'));
    expect(isPersonalId(personalTermId('x'))).toBe(true);
    expect(isPersonalId('fb-aszites')).toBe(false);
  });
  it('cleanSelection retire guillemets/ponctuation de bord et normalise les espaces', () => {
    expect(cleanSelection('  „Belastungs  dyspnoe“, ')).toBe('Belastungs dyspnoe');
  });
  it('sanitize : tronque context/explanation, rejette un terme vide ou trop long', () => {
    const s = sanitizePersonalTerm({ term: 'Wort', context: 'c'.repeat(400), explanation: 'e'.repeat(900) })!;
    expect(s.context!.length).toBe(PT_LIMITS.context);
    expect(s.explanation!.length).toBe(PT_LIMITS.explanation);
    expect(sanitizePersonalTerm({ term: '  ' })).toBeNull();
    expect(sanitizePersonalTerm({ term: 'x'.repeat(81) })).toBeNull();
  });
});

describe('projectPersonalTerms', () => {
  const id = personalTermId('Belastungsdyspnoe');
  const created = (s: number, eid?: string) => ev('term.personal_created', id, { term: 'Belastungsdyspnoe', createdAt: at(s) }, s, eid);
  it('création → un terme avec srs neuf', () => {
    const [t] = projectPersonalTerms([created(1)]);
    expect(t).toMatchObject({ id, term: 'Belastungsdyspnoe' });
    expect(t.srs.state).toBe('Neu');
  });
  it('deux créations du même mot (deux appareils) → un seul terme (AC-3)', () => {
    expect(projectPersonalTerms([created(1, 'a'), created(2, 'b')])).toHaveLength(1);
  });
  it('suppression puis re-création → présent, srs repart de zéro', () => {
    const reviewed = ev('srs.reviewed', id, { interval: 6, easeFactor: 2.5, dueDate: 1, repetitions: 2, lapses: 0, state: 'Gelernt' }, 2);
    expect(projectPersonalTerms([created(1), reviewed, ev('term.personal_deleted', id, {}, 3)])).toEqual([]);
    const [t] = projectPersonalTerms([created(1), reviewed, ev('term.personal_deleted', id, {}, 3), created(4, 'c')]);
    expect(t.srs.state).toBe('Neu');
  });
  it('srs.reviewed postérieur à la création → état conservé (AC-4b)', () => {
    const [t] = projectPersonalTerms([created(1), ev('srs.reviewed', id, { interval: 6, easeFactor: 2.5, dueDate: 9, repetitions: 2, lapses: 0, state: 'Gelernt' }, 2)]);
    expect(t.srs.interval).toBe(6);
  });
});

describe('create / delete / rebuild', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.fachbegriffe.clear(); });
  it('createPersonalTerm est idempotent : un seul événement', async () => {
    const a = await createPersonalTerm({ term: 'Belastungsdyspnoe', context: 'Er hat Belastungsdyspnoe.' });
    const b = await createPersonalTerm({ term: 'belastungsdyspnoe' });
    expect(a).toEqual({ id: b.id, created: true }); expect(b.created).toBe(false);
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_created')).toHaveLength(1);
    expect(await db.personal_terms.get(a.id)).toMatchObject({ context: 'Er hat Belastungsdyspnoe.' });
  });
  it('deletePersonalTerm retire le terme et son favori', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    await db.progress_events.put(ev('term.favorited', id, {}, 5));
    await rebuildProjections();
    expect(await db.favorites.get(id)).toBeTruthy();
    await deletePersonalTerm(id);
    expect(await db.personal_terms.get(id)).toBeUndefined();
    expect(await db.favorites.get(id)).toBeUndefined();
  });
  it('rebuildProjections : srs.reviewed pt-… écrit dans personal_terms, jamais dans fachbegriffe', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    await db.progress_events.put({ ...ev('srs.reviewed', id, { interval: 1, easeFactor: 2.5, dueDate: 5, repetitions: 1, lapses: 0, state: 'Gelernt' }, 59), occurred_at: new Date(Date.now() + 1000).toISOString() });
    await rebuildProjections();
    expect((await db.personal_terms.get(id))!.srs.state).toBe('Gelernt');
    expect(await db.fachbegriffe.count()).toBe(0);
  });
});

describe('starSelection', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); });
  const g = [{ id: 'fb-aszites', term: 'Aszites', translationSimple: 'x' } as never];
  it('terme du glossaire (y compris fléchi) → term.favorited sur fb-… (AC-1)', async () => {
    const r = await starSelection({ selection: 'Asziten', caseId: 'case-leberzirrhose' }, g);
    expect(r).toEqual({ id: 'fb-aszites', kind: 'glossary', created: false, favorite: true });
    expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'case-leberzirrhose' });
  });
  it('hors glossaire → terme personnel + favori (AC-2)', async () => {
    const r = await starSelection({ selection: 'Belastungsdyspnoe', context: 'Seit Wochen Belastungsdyspnoe.' }, g);
    expect(r.kind).toBe('personal'); expect(r.created).toBe(true); expect(r.favorite).toBe(true);
    expect(await db.favorites.get(r.id)).toBeTruthy();
  });
  it('★ à nouveau → bascule du favori, aucun doublon (AC-3)', async () => {
    const a = await starSelection({ selection: 'Belastungsdyspnoe' }, g);
    const b = await starSelection({ selection: 'belastungsdyspnoe' }, g);
    expect(b).toEqual({ id: a.id, kind: 'personal', created: false, favorite: false });
    expect(await db.personal_terms.count()).toBe(1);
  });
});
