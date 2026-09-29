import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { useCardToast } from '@/store/cardToast';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { SelectionExplainer } from './SelectionExplainer';
import { CardToast } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  // occurred_at monotone par appareil (même formule que queue.ts) : push ET
  // pushMany partagent le même compteur, comme collections/index.test.ts.
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

vi.mock('@/lib/onlineAi', () => ({
  hasKey: () => true,
  canAskAi: vi.fn(() => true),
  honestAiError: (e: unknown) => (e as Error)?.message ?? String(e),
  noAiMessage: vi.fn(() => 'IA indisponible : connecte-toi (compte premium) ou ajoute une clé de repli dans les réglages Doctopus.'),
  askBrief: vi.fn(async () => 'Essoufflement à l\'effort.'),
  askBedeutung: vi.fn(async () => 'Atemnot bei Belastung'),
}));

function selectText(el: HTMLElement, rect?: Partial<DOMRect>) {
  const range = document.createRange(); range.selectNodeContents(el);
  const r = { left: 10, top: 100, width: 60, height: 16, right: 70, bottom: 116, x: 10, y: 100, toJSON() {}, ...rect };
  range.getBoundingClientRect = () => r as DOMRect;
  const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
}
const pill = () => act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });

describe('SelectionExplainer', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await db.fachbegriffe.clear(); await db.favorites.clear(); await db.personal_terms.clear(); await db.progress_events.clear(); await db.deck_terms.clear(); await db.decks.clear();
    await db.fachbegriffe.put({ id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never);
    useCardToast.setState({ toast: null });
    usePendingDeletions.setState({ ids: new Set() });
  });
  afterEach(() => { vi.useRealTimers(); });
  it('selectionchange (sans souris) → pastille ★ + Expliquer après 250 ms (AC-4c)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    expect(await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Expliquer/ })).toBeTruthy();
  });
  it('★ sur un terme du glossaire → Favoris + confirmation avec miniature et « Changer de deck » (AC-6)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t')); pill();
    const star = await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    vi.useRealTimers();
    fireEvent.click(star); fireEvent.click(star);   // double appui : un seul rangement
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voir la carte' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Changer de deck' })).toBeTruthy();
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.favorited')).toHaveLength(1);
  });
  it('hors glossaire → mini-fiche : Bedeutung proposée, Contexte = une seule phrase, mot surligné ; Créer → carte + deck (AC-4)', async () => {
    render(<><p data-testid="p">Er hat Fieber. Seit Wochen <span data-testid="t">Belastungsdyspnoe</span> beim Treppensteigen. Kein Husten.</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    vi.useRealTimers();
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    expect(dialog.textContent).toContain('Seit Wochen Belastungsdyspnoe beim Treppensteigen.');
    expect(dialog.textContent).not.toContain('Fieber');
    expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
    const pt = (await db.personal_terms.toArray())[0];
    expect(pt).toMatchObject({ term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung', context: 'Seit Wochen Belastungsdyspnoe beim Treppensteigen.' });
    expect(await db.favorites.get(pt.id)).toBeTruthy();
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
  });
  it('Créer impossible tant que la Bedeutung est vide ; fermer sans créer n\'écrit rien (AC-4)', async () => {
    const { askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(askBedeutung).mockResolvedValueOnce('');
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    vi.useRealTimers();
    expect(await screen.findByText(/écris la signification/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Créer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog', { name: 'Nouvelle carte' })).toBeNull();
    expect(await db.progress_events.count()).toBe(0);
  });
  it('sélection de plus de 4 mots → pastilles ; le mot touché devient le terme, la phrase le contexte (AC-5)', async () => {
    render(<><p data-testid="t">Der Patient klagt über zunehmende Belastungsdyspnoe seit Wochen.</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: /Nouvelle carte/ }));
    vi.useRealTimers();
    expect(screen.queryByRole('textbox', { name: 'Bedeutung' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Belastungsdyspnoe' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    expect((screen.getByRole('textbox', { name: 'Mot' }) as HTMLInputElement).value).toBe('Belastungsdyspnoe');
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect((await db.personal_terms.toArray())[0]).toMatchObject({ term: 'Belastungsdyspnoe', context: 'Der Patient klagt über zunehmende Belastungsdyspnoe seit Wochen.' }));
  });
  it('IA indisponible → aucune demande, invite « Écris la signification »', async () => {
    const { canAskAi, askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(canAskAi).mockReturnValue(false); vi.mocked(askBedeutung).mockClear();
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    expect(await screen.findByText(/écris la signification/i)).toBeTruthy();
    expect(askBedeutung).not.toHaveBeenCalled();
    vi.mocked(canAskAi).mockReturnValue(true);
  });
  it('un pointerup pendant que la sélection persiste ne referme pas la bulle (finding 5)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    await screen.findByText(/Bauchwasser/);
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    expect(screen.getByText(/Bauchwasser/)).toBeTruthy();
  });
  it('hors glossaire sans clé mais serveur dispo → explication IA (AC-7)', async () => {
    const { askBrief } = await import('@/lib/onlineAi');
    (askBrief as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce('die Dyspnoe = Atemnot');
    render(<><p data-testid="t">Dyspnoe unter Belastung</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    expect(await screen.findByText('die Dyspnoe = Atemnot')).toBeTruthy();
  });
  it('★ dans la bulle réponse (fond clair) n\'utilise pas la couleur blanche de la pastille (re-review)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    const starInBubble = await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    expect(starInBubble.className).not.toMatch(/text-white/);
    expect(starInBubble.className).not.toMatch(/hover:bg-brand-700/);
  });
  it('sélection près du haut du viewport → pastille bascule sous la sélection, jamais hors écran (B1)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'), { top: 20, height: 16, bottom: 36 });
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    const box = document.querySelector('.fixed.z-\\[80\\]') as HTMLElement;
    expect(box.style.transform).toBe('translate(-50%, 0)');
    const top = parseFloat(box.style.top);
    expect(top).toBeGreaterThanOrEqual(36); // sous la sélection (bottom), jamais négatif à l'écran
  });
  it('sélection près du bord droit → pastille reste dans le viewport (16 px de marge)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'), { left: window.innerWidth - 20, right: window.innerWidth - 10, width: 10 });
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    const box = document.querySelector('.fixed.z-\\[80\\]') as HTMLElement;
    const left = parseFloat(box.style.left);
    expect(left).toBeLessThanOrEqual(window.innerWidth - 16);
  });
  it('IA indisponible en mode public → message honnête (ajouter une clé), jamais « compte premium » (FSP-B1)', async () => {
    const { canAskAi, noAiMessage } = await import('@/lib/onlineAi');
    (canAskAi as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    (noAiMessage as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce('IA indisponible : ajoute une clé dans les réglages Doctopus.');
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    expect(await screen.findByText(/ajoute une clé dans les réglages Doctopus/)).toBeTruthy();
    expect(screen.queryByText(/premium|connecte-toi/i)).toBeNull();
  });
  it('pastille (>4 mots) touchant un mot du glossaire → range le terme existant, ne crée pas de doublon (revue I1)', async () => {
    render(<><p data-testid="t">Der Patient zeigt einen deutlichen Aszites im Ultraschall.</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t')); pill();
    vi.useRealTimers();
    fireEvent.click(await screen.findByRole('button', { name: /Nouvelle carte/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aszites' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect(await db.favorites.get('fb-aszites')).toBeTruthy());
    expect((await db.progress_events.toArray()).some((e) => e.type === 'term.personal_created')).toBe(false);
    expect(await db.personal_terms.count()).toBe(0);
  });
  it('carte personnelle en attente de suppression → resélection + ★ ouvre la mini-fiche (D10, revue I3)', async () => {
    vi.useRealTimers();
    await createPersonalTerm({ term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung' });
    const { personalTermId } = await import('@/lib/collections/personalTerms');
    usePendingDeletions.setState({ ids: new Set([personalTermId('Belastungsdyspnoe')]) });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t')); pill();
    expect(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Decks de Belastungsdyspnoe/ })).toBeNull();
  });
  it('rouvrir la mini-fiche sur un autre mot réinitialise le champ Mot (revue I4)', async () => {
    render(<><p data-testid="a">Belastungsdyspnoe</p><p data-testid="b">Orthopnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('a')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    vi.useRealTimers();
    await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    selectText(screen.getByTestId('b')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Orthopnoe' }));
    vi.useRealTimers();
    await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    expect((screen.getByRole('textbox', { name: 'Mot' }) as HTMLInputElement).value).toBe('Orthopnoe');
  });
  it('Expliquer puis ★ sur un mot hors glossaire → la Bedeutung de la mini-fiche vient d\'askBedeutung, pas du texte d\'Expliquer (revue m1)', async () => {
    const { askBrief } = await import('@/lib/onlineAi');
    vi.mocked(askBrief).mockResolvedValueOnce('die Dyspnoe = Atemnot (texte Expliquer)');
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    await screen.findByText('die Dyspnoe = Atemnot (texte Expliquer)');
    fireEvent.click(screen.getByRole('button', { name: /Nouvelle carte : Belastungsdyspnoe/ }));
    vi.useRealTimers();
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    expect(screen.queryByText(/texte Expliquer/)).toBeNull();
  });
});
