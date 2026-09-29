import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import { rebuildProjections } from '@/lib/sync/projections';
import {
  personalTermId, cleanSelection, sanitizePersonalTerm, projectPersonalTerms,
  createPersonalTerm, deletePersonalTerm, isPersonalId, PT_LIMITS, starSelection,
  updatePersonalExplanation, planPersonalDeletion,
} from './personalTerms';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  // Horodatage monotone par appareil (même formule que queue.ts) : ce stub
  // émet lui-même occurred_at, donc le correctif de queue.ts ne l'atteint
  // pas — sans ça, deux événements de la même ms gardent un ordre aléatoire
  // (sortEvents départage par uuid).
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
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
  it('cleanSelection normalise NFC : même id peu importe la forme Unicode saisie (NFC/NFD)', () => {
    const nfc = 'Kälte'.normalize('NFC');
    const nfd = 'Kälte'.normalize('NFD');
    expect(nfc).not.toBe(nfd);
    expect(cleanSelection(nfd)).toBe(cleanSelection(nfc));
    expect(personalTermId(nfd)).toBe(personalTermId(nfc));
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
  it('createdAt invalide dans le payload → repli sur occurred_at de l\'événement', () => {
    const bad = ev('term.personal_created', id, { term: 'Belastungsdyspnoe', createdAt: 'not-a-date' }, 7);
    const [t] = projectPersonalTerms([bad]);
    expect(t.createdAt).toBe(at(7));
  });
  it('term.personal_updated après la création → nouvelle Bedeutung (F4a D8)', () => {
    const [t] = projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 'Atemnot bei Belastung' }, 2)]);
    expect(t.explanation).toBe('Atemnot bei Belastung');
  });
  it('personal_updated : ignoré avant la création, vide ou non-texte ; tronqué à 600', () => {
    expect(projectPersonalTerms([ev('term.personal_updated', id, { explanation: 'avant' }, 1), created(2)])[0].explanation).toBeUndefined();
    expect(projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: '   ' }, 2)])[0].explanation).toBeUndefined();
    expect(projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 42 }, 2)])[0].explanation).toBeUndefined();
    expect(projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 'e'.repeat(900) }, 2)])[0].explanation!.length).toBe(PT_LIMITS.explanation);
  });
  it('personal_updated puis suppression et re-création → la Bedeutung d\'avant ne revient pas', () => {
    const [t] = projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 'alt' }, 2), ev('term.personal_deleted', id, {}, 3), created(4, 'c')]);
    expect(t.explanation).toBeUndefined();
  });
});

describe('create / delete / rebuild', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.fachbegriffe.clear(); await db.decks.clear(); await db.deck_terms.clear(); });
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
  it('deletePersonalTerm retire le terme de tous les decks manuels qui le contiennent', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    const { createDeck, addToDeck } = await import('./index');
    const deckId = await createDeck('Kardio', 'manual');
    await addToDeck(deckId, id);
    expect(await db.deck_terms.get([deckId, id])).toBeTruthy();
    await deletePersonalTerm(id);
    expect(await db.deck_terms.get([deckId, id])).toBeUndefined();
  });
  it('updatePersonalExplanation : un événement, projection à jour ; vide → refus sans événement (AC-7)', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    await updatePersonalExplanation(id, '  Atemnot  ');
    expect((await db.personal_terms.get(id))!.explanation).toBe('Atemnot');
    await expect(updatePersonalExplanation(id, '   ')).rejects.toThrow('explanation_empty');
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_updated')).toHaveLength(1);
  });
  it('planPersonalDeletion : n\'émet rien ; liste favori, decks, puis le terme', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    const { createDeck, addToDeck, toggleFavorite } = await import('./index');
    const deckId = await createDeck('Kardio', 'manual');
    await addToDeck(deckId, id); await toggleFavorite(id);
    const before = await db.progress_events.count();
    const plan = await planPersonalDeletion(id);
    expect(await db.progress_events.count()).toBe(before);
    expect(plan.map((e) => e.type)).toEqual(['term.unfavorited', 'deck.term_removed', 'term.personal_deleted']);
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
