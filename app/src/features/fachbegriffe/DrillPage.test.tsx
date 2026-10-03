import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import * as drillQueueModule from '@/lib/collections/drillQueue';
import { loadDrillContext } from '@/lib/collections/drillContext';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
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
    vi.mocked(loadDrillContext).mockReset(); localStorage.clear();
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
    await waitFor(() => expect(document.querySelector('[data-readout="nouveaux"] dd')!.textContent).toBe('1')); // fb-a seulement, jamais fb-z (le relevé suit le pool un rendu plus tard)
  });

  it('?case= sans rien à réviser → « Réviser la spécialité »', async () => {
    vi.mocked(loadDrillContext).mockResolvedValueOnce({ ...defaultCtx, remaining: 0 });
    await db.cases.put({ id: 'c2', name: 'Angina', specialty: 'Kardiologie', linkedFachbegriffeIds: ['fb-k'] } as never);
    await db.fachbegriffe.put({ id: 'fb-k', term: 'Koronar', translationSimple: 'K', specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never);
    renderAt('/fachbegriffe/drill?case=c2');
    const btn = await screen.findByRole('link', { name: /Réviser la spécialité Kardiologie/ }, { timeout: 3000 });   // sous charge (suite complète), le cas charge après 1 s
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

  it('carte avec register (term2simple, « Montrer » = Révéler) : le dos affiche parole patient + anamnèse (C2)', async () => {
    await db.fachbegriffe.clear();
    await db.fachbegriffe.put({
      id: 'fb-asz', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie',
      pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0),
      register: { patient: 'Wasser im Bauch', vorstellung: 'Sonographisch zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' },
    } as never);
    renderAt('/fachbegriffe/drill');
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    const revealBtn = await screen.findByRole('button', { name: 'Retourner la carte' });
    fireEvent.click(revealBtn);
    expect((await screen.findAllByText(/Wasser im Bauch/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Ist Ihr Bauch dicker geworden?')).length).toBeGreaterThan(0);
  });

  it('terme personnel sans explication mais avec contexte (Terme → sens) : le recto ne montre jamais le contexte, le dos le montre labellisé « Contexte » (I-1 review)', async () => {
    await db.fachbegriffe.clear();
    await db.personal_terms.put({ id: 'pt-ctx01', term: 'Belastungsdyspnoe', context: 'Der Patient klagt über Belastungsdyspnoe seit zwei Wochen.', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) } as never);
    renderAt('/fachbegriffe/drill');
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    expect(screen.queryByText(/klagt über/i)).toBeNull();
    const revealBtn = await screen.findByRole('button', { name: 'Retourner la carte' });
    fireEvent.click(revealBtn);
    expect(await screen.findByText('Contexte')).toBeTruthy();
    expect((await screen.findAllByText(/klagt über/i)).length).toBeGreaterThan(0);
  });

  it('terme personnel sans explication mais avec contexte (Sens → terme) : le recto masque le terme dans le contexte, jamais la réponse en clair (I-1 review)', async () => {
    await db.fachbegriffe.clear();
    await db.personal_terms.put({ id: 'pt-ctx02', term: 'Belastungsdyspnoe', context: 'Der Patient klagt über Belastungsdyspnoe seit zwei Wochen.', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) } as never);
    renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /Bedeutung → Fachbegriff/ }));
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    expect(screen.queryByText('Belastungsdyspnoe')).toBeNull();
    expect((await screen.findAllByText(/klagt über … seit zwei Wochen/i)).length).toBeGreaterThan(0);
  });

  it('terme personnel avec contexte (Sens → terme), terme à umlaut/ß : le masquage est Unicode-aware (\\b est ASCII-only)', async () => {
    await db.fachbegriffe.clear();
    await db.personal_terms.put({ id: 'pt-ctx03', term: 'Übelkeit', context: 'Die Patientin berichtet über Übelkeit seit dem Frühstück.', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) } as never);
    renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /Bedeutung → Fachbegriff/ }));
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    expect(screen.queryByText('Übelkeit')).toBeNull();
    expect((await screen.findAllByText(/berichtet über … seit dem Frühstück/i)).length).toBeGreaterThan(0);
  });

  it('terme personnel sans explication ni contexte : aucune face vide, « à compléter » au verso (I-1, F4a D8)', async () => {
    await db.fachbegriffe.clear();
    await db.personal_terms.put({ id: 'pt-noexpl01', term: 'Belastungsdyspnoe', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) } as never);
    renderAt('/fachbegriffe/drill');
    const startBtn = await screen.findByRole('button', { name: /commencer/i });
    fireEvent.click(startBtn);
    expect((await screen.findAllByText('Belastungsdyspnoe')).length).toBeGreaterThan(0);
    const revealBtn = await screen.findByRole('button', { name: 'Retourner la carte' });
    fireEvent.click(revealBtn);
    expect((await screen.findAllByText('à compléter')).length).toBeGreaterThan(0);
  });

  it("au dos d'une carte personnelle, taper dans l'éditeur de Bedeutung n'envoie aucune notation (I1)", async () => {
    await db.fachbegriffe.clear();
    await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retourner la carte' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier la Bedeutung' }));
    const input = screen.getByRole('textbox', { name: 'Bedeutung' });
    fireEvent.keyDown(input, { key: '2' });
    await new Promise((r) => setTimeout(r, 200));
    expect((await db.progress_events.toArray()).some((e) => e.type === 'srs.reviewed')).toBe(false);
    expect(screen.getByText('1 / 1')).toBeTruthy();
  });

  it('carte du drill : un indice discret (Espace), pas de sélecteur Recto|Verso (retour du 4 oct.)', async () => {
    renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }));
    const hint = await screen.findByRole('button', { name: 'Retourner la carte' });
    expect(hint.getAttribute('aria-keyshortcuts')).toBe('Space');
    expect(screen.queryByRole('button', { name: 'Recto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Verso' })).toBeNull();
  });
  it('Espace pendant la sortie ne retourne pas la carte suivante : la question avant la réponse (fix-s3 I1)', async () => {
    const { container } = renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retourner la carte' }));
    fireEvent.keyDown(document.body, { key: '3' });   // Gut → la carte part (swap-out, 180 ms)
    fireEvent.keyDown(document.body, { key: ' ' });   // frappe pendant la sortie
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeTruthy());
    expect(container.querySelector('[data-card-flip]')?.getAttribute('data-card-flip')).toBe('recto');
  });

  it('après Enregistrer au dos de la carte personnelle, la fiche affiche la nouvelle Bedeutung (I1 : file figée)', async () => {
    await db.fachbegriffe.clear();
    await createPersonalTerm({ term: 'Orthopnoe', explanation: 'ancienne signification' });
    renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retourner la carte' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bedeutung' }), { target: { value: 'nouvelle signification' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('nouvelle signification')).toBeTruthy();
  });

  it('carte d\'embarquement (F4b P7, AC-6) : portée, trois relevés, sens avec exemples, UNE action ; plus de SM-2', async () => {
    renderAt('/fachbegriffe/drill');
    const start = await screen.findByRole('button', { name: /Commencer$/ });
    expect(screen.getByRole('heading', { name: 'Tous les termes' })).toBeTruthy();
    expect([...document.querySelectorAll('[data-readout]')].map((r) => r.getAttribute('data-readout'))).toEqual(['à revoir', 'nouveaux', 'min environ']);
    expect(document.querySelector('[data-readout="nouveaux"] dd')!.className).toContain('font-mono');
    expect(screen.getByRole('button', { name: /Fachbegriff → Bedeutung/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /Bedeutung → Fachbegriff/ })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/SM-2|bidirectionnel|Répétition espacée|Aszites/);
    expect(screen.queryByText(/demain/)).toBeNull();   // 2 nouveaux ≤ budget 10 : il ne limite pas
    expect(start).toBeTruthy();
  });
  it('l\'exemple ne cite jamais queue[0] : un terme du pool hors file (G1-25)', async () => {
    await db.fachbegriffe.clear(); await db.favorites.clear();
    await db.fachbegriffe.bulkPut([
      { id: 'fb-h', term: 'Hepar', translationSimple: 'Leber', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() },
      { id: 'fb-r', term: 'Ren', translationSimple: 'Niere', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() },
    ] as never);
    vi.mocked(loadDrillContext).mockResolvedValue({ ...defaultCtx, remaining: 1 });   // file du jour = 1 carte
    const spy = vi.spyOn(drillQueueModule, 'buildDrillQueue');
    renderAt('/fachbegriffe/drill');
    await waitFor(() => expect(document.querySelector('[data-example]')).toBeTruthy(), { timeout: 4000 });   // file bâtie
    const q0 = (spy.mock.results[spy.mock.results.length - 1].value as { term: string; translationSimple: string }[])[0];
    const other = q0.term === 'Hepar' ? { term: 'Ren', simple: 'Niere' } : { term: 'Hepar', simple: 'Leber' };
    const t2s = screen.getByRole('button', { name: /Fachbegriff → Bedeutung/ }).textContent!;
    const s2t = screen.getByRole('button', { name: /Bedeutung → Fachbegriff/ }).textContent!;
    const fronts = [...document.querySelectorAll('[data-example="front"]')].map((f) => f.textContent);   // F4c : la carte d'exemple, recto
    expect(fronts).toEqual([other.term, other.simple]);
    expect(t2s).not.toContain(q0.term); expect(s2t).not.toContain(q0.translationSimple);
    spy.mockRestore();
  });
  it('un seul terme, file d\'une carte : pas d\'exemple (jamais la réponse) (G1-25)', async () => {
    await db.fachbegriffe.clear(); await db.favorites.clear();
    await db.fachbegriffe.put({ id: 'fb-h', term: 'Hepar', translationSimple: 'Leber', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never);
    const spy = vi.spyOn(drillQueueModule, 'buildDrillQueue');
    renderAt('/fachbegriffe/drill');
    const t2s = await screen.findByRole('button', { name: /Fachbegriff → Bedeutung/ });
    await waitFor(() => expect(spy.mock.results.some((r) => (r.value as unknown[]).length === 1)).toBe(true), { timeout: 4000 });   // file bâtie (1 carte)
    await new Promise((r) => setTimeout(r, 50));
    spy.mockRestore();
    expect(t2s.textContent).not.toContain('Hepar'); expect(document.querySelector('[data-example]')).toBeNull();
  });
  it('?specialty= : la spécialité est le titre, pas de puce « Priorité » (G1-5)', async () => {
    renderAt('/fachbegriffe/drill?specialty=Kardiologie');
    expect(await screen.findByRole('heading', { name: 'Kardiologie' })).toBeTruthy();
    expect(screen.queryByText(/Priorité/)).toBeNull();
  });
  it('deck vide : « Ce deck est encore vide », jamais « À jour » (G1-3)', async () => {
    await db.decks.add({ id: 'd-vide', name: 'Vide', kind: 'manual', createdAt: '', updatedAt: '' } as never);
    renderAt('/fachbegriffe/drill?deck=d-vide');
    expect(await screen.findByText('Ce deck est encore vide — range des termes depuis leur fiche.')).toBeTruthy();
    expect(screen.queryByText(/À jour/)).toBeNull();
  });
  it('portée = cas : pas de puce « Ton cas récent » qui nomme ce même cas (G1-4)', async () => {
    const cases = [{ id: 'c1', name: 'Ulcus ventriculi', linkedFachbegriffeIds: ['fb-a'] }];
    vi.mocked(loadDrillContext).mockResolvedValue({ ...defaultCtx, relevance: { ...defaultCtx.relevance, now: Date.now(), recentSimulations: [{ caseId: 'c1', date: Date.now() - 1000 }], cases } } as never);
    await db.cases.put({ id: 'c1', name: 'Ulcus ventriculi', specialty: 'Gastroenterologie', linkedFachbegriffeIds: ['fb-a'] } as never);
    renderAt('/fachbegriffe/drill?case=c1');
    expect(await screen.findByText(/Termes de Ulcus ventriculi/)).toBeTruthy();
    expect(screen.queryByText(/Ton cas récent/)).toBeNull();
  });
  it('le sens choisi est retenu d\'une visite à l\'autre (G1-6)', async () => {
    const first = renderAt('/fachbegriffe/drill');
    fireEvent.click(await screen.findByRole('button', { name: /Bedeutung → Fachbegriff/ }));
    first.unmount();
    renderAt('/fachbegriffe/drill');
    expect((await screen.findByRole('button', { name: /Bedeutung → Fachbegriff/ })).getAttribute('aria-pressed')).toBe('true');
  });
  it('budget du jour affiché seulement quand il retient des nouveaux', async () => {
    vi.mocked(loadDrillContext).mockResolvedValue({ ...defaultCtx, remaining: 1, daily: { ...defaultCtx.daily, newPerDay: 1 } });
    renderAt('/fachbegriffe/drill');
    expect(await screen.findByRole('button', { name: /Commencer$/ })).toBeTruthy();
    expect(screen.getByText('Encore 1 nouveau demain')).toBeTruthy();
  });
  it('état vide : « À jour ✓ — prochain terme dû le … »', async () => {
    await db.fachbegriffe.clear();
    const due = new Date(2030, 9, 3).getTime();
    await db.fachbegriffe.put({ id: 'fb-x', term: 'Zyste', translationSimple: 'Z', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: { ...freshSrs(), state: 'Gelernt', dueDate: due, repetitions: 2, interval: 6 } } as never);
    renderAt('/fachbegriffe/drill');
    expect(await screen.findByText('À jour ✓ — prochain terme dû le 3 octobre')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /commencer/i })).toBeNull();
  });
});
