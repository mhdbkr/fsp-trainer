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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="Seit Wochen Belastungsdyspnoe." onClose={() => {}} />);
    vi.useRealTimers();
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    fireEvent.change(input, { target: { value: 'nouvelle signification' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect((await db.personal_terms.get(id))?.explanation).toBe('nouvelle signification'));
  });

  it('double clic sur Créer → un seul term.personal_created (revue m2)', async () => {
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    vi.useRealTimers();
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    const btn = screen.getByRole('button', { name: 'Créer' });
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
    render(<NewCardSheet selection="Belastungsdyspnoe Orthopnoe Zyanose Husten Fieber" sentence="" onClose={() => {}} />);
    vi.useRealTimers();
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
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    vi.useRealTimers();
    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
    expect(input.getAttribute('aria-busy')).toBe('true');
  });

  it('focus initial : sans pastilles, le champ Bedeutung reçoit le focus au montage (revue I5)', async () => {
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    vi.useRealTimers();
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
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={onClose} />);
    vi.useRealTimers();
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(docSpy).not.toHaveBeenCalled();
    document.removeEventListener('keydown', docSpy);
  });

  it('pas de aria-modal (pas de fond bloquant, revue I5)', async () => {
    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    vi.useRealTimers();
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    expect(dialog.getAttribute('aria-modal')).toBeNull();
  });

  it('à la fermeture, le focus revient à l\'élément actif avant l\'ouverture (revue I5)', async () => {
    document.body.innerHTML = '<button id="trigger">ouvrir</button>';
    const trigger = document.getElementById('trigger') as HTMLButtonElement;
    trigger.focus();
    const { unmount } = render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
    vi.useRealTimers();
    await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    unmount();
    expect(document.activeElement).toBe(trigger);
  });
});
