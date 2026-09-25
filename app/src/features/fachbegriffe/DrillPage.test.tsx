import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import * as drillQueueModule from '@/lib/collections/drillQueue';
import { loadDrillContext } from '@/lib/collections/drillContext';
import { useSimSession } from '@/store/simSession';
import { DrillPage } from './DrillPage';

vi.mock('@/lib/collections/drillContext', () => ({ loadDrillContext: vi.fn() }));

const defaultCtx = {
  relevance: { now: Date.now(), favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] },
  budget: 10,
  remaining: 10,
  settings: { mode: 'auto' as const },
  daily: { newPerDay: 10, maxReviewsPerDay: 200, source: 'auto' as const, explain: 'auto' },
  autoDaily: { newPerDay: 10, maxReviewsPerDay: 200, source: 'auto' as const, explain: 'auto' },
  reviewsRemaining: 200,
};

// Régression HIGH (branch-review) : `{ id: FAVORITES_DECK_ID, name: 'Favoris' }`
// était recréé à chaque rendu → pool → buildQueue → useEffect → setQueue en
// boucle infinie tant que `!started` (4 111 buildDrillQueue/s mesurés sur
// ?deck=deck-favorites). FAV_DECK est désormais une constante de module ;
// ce test verrouille le nombre d'appels.
vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const seed = async () => {
  await db.fachbegriffe.bulkPut([
    { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() },
    { id: 'fb-k', term: 'Kardiomyopathie', translationSimple: 'Herzmuskelerkrankung', specialty: 'Kardiologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() },
  ] as never);
  await db.favorites.put({ termId: 'fb-a', since: new Date().toISOString() } as never);
};

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><DrillPage /></MemoryRouter>);

describe('DrillPage — pas de boucle de rendu', () => {
  beforeEach(async () => {
    await db.fachbegriffe.clear(); await db.progress_events.clear();
    await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await db.cases.clear(); await db.personal_terms.clear();
    vi.mocked(loadDrillContext).mockReset();
    vi.mocked(loadDrillContext).mockResolvedValue(defaultCtx);
    await seed();
  });

  it('?deck=deck-favorites : buildDrillQueue ne boucle pas (≤ 3 appels après 500 ms)', async () => {
    const spy = vi.spyOn(drillQueueModule, 'buildDrillQueue');
    renderAt('/fachbegriffe/drill?deck=deck-favorites');
    await screen.findByText(/drill fachbegriffe/i);
    await new Promise((r) => setTimeout(r, 500));
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3);
    spy.mockRestore();
  });

  it('deck manuel : buildDrillQueue ne boucle pas (≤ 3 appels après 500 ms)', async () => {
    const deckId = await db.decks.add({ id: 'd1', name: 'Kardio', kind: 'manual', createdAt: '', updatedAt: '' } as never);
    await db.deck_terms.add({ deckId: String(deckId), termId: 'fb-k', addedAt: new Date().toISOString() } as never);
    const spy = vi.spyOn(drillQueueModule, 'buildDrillQueue');
    renderAt(`/fachbegriffe/drill?deck=${deckId}`);
    await waitFor(() => expect(screen.getByText(/drill fachbegriffe/i)).toBeTruthy());
    await new Promise((r) => setTimeout(r, 500));
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3);
    spy.mockRestore();
  });

  it('?case= restreint le pool aux termes du cas et titre « Termes de <cas> » ; vide → bouton spécialité', async () => {
    await db.cases.put({ id: 'c1', name: 'Ulcus ventriculi', specialty: 'Gastroenterologie', linkedFachbegriffeIds: ['fb-a'] } as never);
    await db.fachbegriffe.bulkPut([{ id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }, { id: 'fb-z', term: 'Zyste', translationSimple: 'Z', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }] as never);
    renderAt('/fachbegriffe/drill?case=c1');
    expect(await screen.findByText(/Termes de Ulcus ventriculi/)).toBeTruthy();
    expect(screen.getByText(/1 nouveaux/)).toBeTruthy(); // fb-a seulement, jamais fb-z
  });

  it('?case= sans rien à réviser → « Réviser la spécialité »', async () => {
    vi.mocked(loadDrillContext).mockResolvedValueOnce({ ...defaultCtx, remaining: 0 });
    await db.cases.put({ id: 'c2', name: 'Angina', specialty: 'Kardiologie', linkedFachbegriffeIds: ['fb-k'] } as never);
    await db.fachbegriffe.put({ id: 'fb-k', term: 'Koronar', translationSimple: 'K', specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never);
    renderAt('/fachbegriffe/drill?case=c2');
    const btn = await screen.findByRole('link', { name: /Réviser la spécialité Kardiologie/ });
    expect(btn.getAttribute('href')).toContain('specialty=Kardiologie');
  });

  it('terme personnel dû : rejoint la file de drill (AC-2, source unique allTerms)', async () => {
    await db.fachbegriffe.clear();
    await db.personal_terms.put({ id: 'pt-0000abcd', term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) } as never);
    renderAt('/fachbegriffe/drill');
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    expect((await screen.findAllByText('Belastungsdyspnoe')).length).toBeGreaterThan(0);
  });

  it('Quitter (mode ?case) : route réelle du Runner si une session est minimisée sur ce cas, sinon la fiche du cas', async () => {
    useSimSession.setState({ snapshot: null, minimized: false });
    await db.cases.put({ id: 'c1', name: 'Ulcus ventriculi', specialty: 'Gastroenterologie', linkedFachbegriffeIds: ['fb-a'] } as never);
    renderAt('/fachbegriffe/drill?case=c1');
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    await waitFor(() => expect(screen.getByRole('link', { name: /quitter/i })).toBeTruthy());

    // Sans session minimisée sur ce cas → retour à la fiche du cas.
    expect(screen.getByRole('link', { name: /quitter/i }).getAttribute('href')).toBe('/cas/c1');

    // Session minimisée sur CE cas, Teil « dokumentation » → route réelle du Runner (comme ResumeSessionBar).
    useSimSession.setState({ snapshot: { caseId: 'c1', teil: 'dokumentation' } as never, minimized: true });
    await waitFor(() => expect(screen.getByRole('link', { name: /quitter/i }).getAttribute('href')).toBe('/simulation/c1/run?teil=dokumentation'));

    useSimSession.setState({ snapshot: null, minimized: false });
  });
});
