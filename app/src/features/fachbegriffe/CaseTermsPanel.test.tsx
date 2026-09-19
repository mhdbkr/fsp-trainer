import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { CaseTermsPanel } from './CaseTermsPanel';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } }; });

describe('CaseTermsPanel', () => {
  beforeEach(async () => {
    await db.cases.clear(); await db.fachbegriffe.clear(); await db.progress_events.clear(); await db.favorites.clear();
    await db.cases.put({ id: 'c1', name: 'Ulcus', specialty: 'Gastroenterologie', linkedFachbegriffeIds: ['fb-b', 'fb-a'] } as never);
    await db.fachbegriffe.bulkPut([{ id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }, { id: 'fb-b', term: 'Blutung', translationSimple: 'B', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }] as never);
  });
  it('liste les termes du cas dans l\'ordre publié, compteur, ★ émet term.favorited avec caseId', async () => {
    const onDrill = vi.fn();
    render(<MemoryRouter><CaseTermsPanel caseId="c1" mode="inline" onDrill={onDrill} /></MemoryRouter>);
    expect(await screen.findByText(/Fachbegriffe du cas \(2\)/)).toBeTruthy();
    const rows = screen.getAllByRole('listitem'); expect(rows[0].textContent).toContain('Blutung');
    fireEvent.click(screen.getByRole('button', { name: /Ajouter aux favoris : Blutung/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c1' }));
    fireEvent.click(screen.getByRole('button', { name: /Drill ces termes/ }));
    expect(onDrill).toHaveBeenCalled();
  });
  it('recherche locale filtre', async () => {
    render(<MemoryRouter><CaseTermsPanel caseId="c1" mode="inline" onDrill={() => {}} /></MemoryRouter>);
    await screen.findByText('Abdomen');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'blut' } });
    expect(screen.queryByText('Abdomen')).toBeNull(); expect(screen.getByText('Blutung')).toBeTruthy();
  });

  // Revue de branche F2b (I2) : le tiroir du runner est un dialogue — Échap
  // ferme, le focus entre puis revient au déclencheur.
  it('mode drawer : role=dialog, focus dans le panneau, Échap → onClose, focus rendu au chip', async () => {
    const chip = document.createElement('button'); chip.textContent = 'Fachbegriffe (2)'; document.body.appendChild(chip); chip.focus();
    const onClose = vi.fn();
    const { unmount } = render(<MemoryRouter><CaseTermsPanel caseId="c1" mode="drawer" onClose={onClose} onDrill={() => {}} /></MemoryRouter>);
    const dialog = await screen.findByRole('dialog', { name: 'Fachbegriffe du cas' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.activeElement).toBe(chip);
    chip.remove();
  });
});
