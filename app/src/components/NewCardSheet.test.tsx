import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { useCardToast } from '@/store/cardToast';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { NewCardSheet } from './NewCardSheet';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

vi.mock('@/lib/onlineAi', () => ({
  canAskAi: vi.fn(() => true),
  askBedeutung: vi.fn(async () => 'Atemnot bei Belastung'),
}));

describe('NewCardSheet', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await db.fachbegriffe.clear(); await db.favorites.clear(); await db.personal_terms.clear(); await db.progress_events.clear(); await db.deck_terms.clear(); await db.decks.clear();
    await db.fachbegriffe.put({ id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never);
    useCardToast.setState({ toast: null });
  });
  afterEach(() => { vi.useRealTimers(); });

  it('carte existante avec une Bedeutung différente saisie → enregistrée (revue I2)', async () => {
    vi.useRealTimers();
    const { id } = await createPersonalTerm({ term: 'Belastungsdyspnoe', explanation: 'ancienne signification' });
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="Seit Wochen Belastungsdyspnoe." onClose={() => {}} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('ancienne signification'));   // chargé : Créer actif (m-a)
    fireEvent.change(input, { target: { value: 'nouvelle signification' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
    await waitFor(async () => expect((await db.personal_terms.get(id))?.explanation).toBe('nouvelle signification'));
  });

  it('double clic sur Créer → un seul term.personal_created (revue m2)', async () => {
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    const btn = screen.getByRole('button', { name: 'Créer la carte' });
    expect(btn.className).toMatch(/\bbtn-primary-glass\b/);   // pas d'ombre sur le verre (G1-12)
    fireEvent.click(btn); fireEvent.click(btn);
    await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_created')).toHaveLength(1);
  });

  it('réponse IA périmée : le mot change avant la résolution, l\'ancienne réponse n\'écrase pas (revue m3)', async () => {
    const { askBedeutung } = await import('@/lib/onlineAi');
    let resolveA: (v: string) => void = () => {};
    vi.mocked(askBedeutung)
      .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
      .mockResolvedValueOnce('Bedeutung de B');
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe Orthopnoe Zyanose Husten Fieber" sentence="" onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Belastungsdyspnoe' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Orthopnoe' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Bedeutung de B'));
    resolveA('réponse périmée pour Belastungsdyspnoe');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Bedeutung de B');
  });

  it('aria-busy sur le champ Bedeutung pendant la demande IA (revue m4)', async () => {
    const { askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(askBedeutung).mockImplementationOnce(() => new Promise(() => {}));
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    // la requête Dexie (fachbegriffe/cartes perso) résout de façon asynchrone : le
    // textbox existe avant que l'effet ne pose aria-busy, d'où l'attente (revue E4).
    await waitFor(() => expect(input.getAttribute('aria-busy')).toBe('true'));
  });

  it('focus initial : sans pastilles, le champ Bedeutung reçoit le focus au montage (revue I5)', async () => {
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it('focus initial : avec pastilles, la première pastille reçoit le focus au montage (revue I5)', async () => {
    render(<NewCardSheet selection="Der Patient klagt über zunehmende Belastungsdyspnoe seit Wochen." sentence="" onClose={() => {}} />);
    const first = await screen.findByRole('button', { name: 'Der' });
    expect(document.activeElement).toBe(first);
  });

  it('Échap ferme la fiche sans se propager au document (revue I5)', async () => {
    const onClose = vi.fn();
    const docSpy = vi.fn();
    document.addEventListener('keydown', docSpy);
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={onClose} />);
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(docSpy).not.toHaveBeenCalled();
    document.removeEventListener('keydown', docSpy);
  });

  it('pas de aria-modal (pas de fond bloquant, revue I5)', async () => {
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    expect(dialog.getAttribute('aria-modal')).toBeNull();
  });

  it('mot d\'une carte personnelle existante → préremplit SA Bedeutung, aucun appel IA (revue N1)', async () => {
    vi.useRealTimers();
    const { askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(askBedeutung).mockClear();
    await createPersonalTerm({ term: 'Belastungsdyspnoe', explanation: 'signification déjà enregistrée' });
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('signification déjà enregistrée'));
    expect(askBedeutung).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Créer la carte' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('carte existante non modifiée → Créer ne réécrit pas la Bedeutung (revue N1)', async () => {
    vi.useRealTimers();
    const { id } = await createPersonalTerm({ term: 'Belastungsdyspnoe', explanation: 'signification déjà enregistrée' });
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('signification déjà enregistrée'));
    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
    await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
    expect((await db.personal_terms.get(id))?.explanation).toBe('signification déjà enregistrée');
    expect((await db.progress_events.toArray()).some((e) => e.type === 'term.personal_updated')).toBe(false);
  });

  it('mot du glossaire touché en pastille → « Déjà dans le glossaire », Bedeutung en lecture, aucun appel IA, « Ranger » actif sans rien taper (revue N2)', async () => {
    vi.useRealTimers();
    const { askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(askBedeutung).mockClear();
    render(<NewCardSheet selection="Der Patient zeigt einen deutlichen Aszites im Ultraschall." sentence="" onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aszites' }));
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('Bauchwasser'));
    expect(input.hasAttribute('readOnly')).toBe(true);
    expect(askBedeutung).not.toHaveBeenCalled();
    expect(screen.getByText('Déjà dans le glossaire')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Ranger dans Favoris' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('pas de rangée de deck quand aucun deck manuel n\'existe (Favoris implicite)', async () => {
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    await screen.findByRole('textbox', { name: 'Bedeutung' });
    expect(screen.queryByText('Deck')).toBeNull();
  });

  it('pastilles de deck (aria-pressed) quand au moins un deck manuel existe', async () => {
    vi.useRealTimers();
    const { createDeck } = await import('@/lib/collections');
    await createDeck('Hepato', 'manual');
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    await screen.findByRole('textbox', { name: 'Bedeutung' });
    const favoris = await screen.findByRole('button', { name: 'Favoris' });
    expect(favoris.getAttribute('aria-pressed')).toBe('true');
    const hepato = await screen.findByRole('button', { name: 'Hepato' });
    expect(hepato.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(hepato);
    expect(hepato.getAttribute('aria-pressed')).toBe('true');
  });

  it("plus de ligne d'aide dupliquée : seul le placeholder porte « Écris la signification »", async () => {
    const { canAskAi } = await import('@/lib/onlineAi');
    vi.mocked(canAskAi).mockReturnValueOnce(false);
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    await screen.findByRole('textbox', { name: 'Bedeutung' });
    expect(screen.queryByText('Pas de proposition : écris la signification.')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Bedeutung' }).className).toContain('placeholder:text-slate-500');   // contraste (G1-23)
  });

  it('carte en devenir (F4b P8, AC-7) : mot en grand, Bedeutung en italique, contexte en petit surligné, « Créer la carte » ; verre sans ombre', async () => {
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="Seit Wochen Belastungsdyspnoe beim Treppensteigen." onClose={() => {}} />);
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    expect(dialog.className).toContain('glass-full');
    expect(screen.getByRole('textbox', { name: 'Mot' }).className).toMatch(/font-display.*text-2xl/);
    expect(screen.getByRole('textbox', { name: 'Bedeutung' }).className).toContain('italic');
    expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' }).closest('p')!.className).toContain('text-xs');
    expect(screen.getByRole('button', { name: 'Créer la carte' })).toBeTruthy();
    expect(screen.getByText('Ma carte')).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/shadow-/);
  });
  it('miroitement pendant la proposition IA, plus après', async () => {
    const { askBedeutung } = await import('@/lib/onlineAi');
    let resolve: (v: string) => void = () => {};
    vi.mocked(askBedeutung).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect(input.className).toContain('animate-shimmer'), { timeout: 3000 });
    await act(async () => { resolve('Atemnot bei Belastung'); });
    await waitFor(() => expect(input.className).not.toContain('animate-shimmer'), { timeout: 3000 });
  });
  it('second clic sur Créer PENDANT l\'animation de sortie (carte encore montée) → aucune deuxième écriture (revue D1)', async () => {
    vi.useRealTimers();
    await createPersonalTerm({ term: 'Belastungsdyspnoe', explanation: 'ancienne signification' });
    const onClose = vi.fn();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={onClose} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('ancienne signification'), { timeout: 3000 });
    fireEvent.change(input, { target: { value: 'nouvelle signification' } });
    const btn = screen.getByRole('button', { name: 'Créer la carte' });
    fireEvent.click(btn);   // premier clic : réussit, onClose appelé, mais le composant reste monté (animation de sortie)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 3000 });   // 1re création FINIE (la carte reste montée pendant sa sortie)
    fireEvent.click(btn);   // second clic pendant que la carte est encore là : le verrou doit tenir
    await new Promise((r) => setTimeout(r, 300));   // laisse finir un éventuel second create()
    expect(onClose).toHaveBeenCalledTimes(1);          // verrou tenu (mutation « finally » → 2 appels)
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_updated')).toHaveLength(1);
  });
  it('Bedeutung du glossaire : lecture seule visuellement distincte, pas de curseur texte (revue D1)', async () => {
    render(<NewCardSheet selection="Der Patient zeigt einen deutlichen Aszites im Ultraschall." sentence="" onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aszites' }));
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('Bauchwasser'));
    expect(input.className).toContain('cursor-default');
    expect(input.className).toContain('text-slate-600');
    expect(input.className).not.toContain('text-slate-700');
  });
  it('clavier : Entrée dans la Bedeutung crée la carte, qui se pose (onClose reçoit la descente) ; Fermer = onClose() sans descente', async () => {
    const onClose = vi.fn();
    vi.useRealTimers();   // monter sous minuteurs RÉELS : la bascule faux → réels perdait parfois la requête Dexie (test instable)
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={onClose} />);
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe('Atemnot bei Belastung'), { timeout: 3000 });   // suite complète : IA simulée + Dexie sous charge
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(onClose.mock.calls[0][0]).toEqual({ dx: expect.any(Number), dy: expect.any(Number) });   // se poser en x ET en y (G1-19)
    expect(await db.personal_terms.count()).toBe(1);
    onClose.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledWith();
  });
  it('« Corriger le mot » : le crayon donne la main sur le mot', async () => {
    vi.useRealTimers();
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Corriger le mot' }));
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Mot' }));
  });
});
