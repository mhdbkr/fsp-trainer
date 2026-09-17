import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { ExternalAiSheet } from './ExternalAiSheet';

const launchMod = vi.hoisted(() => ({ launch: vi.fn(async (_t: { id: string }, _p: string) => ({ opened: true, copied: true, prefilled: true })) }));
vi.mock('@/lib/externalAi/targets', async (orig) => ({ ...(await orig<typeof import('@/lib/externalAi/targets')>()), launch: launchMod.launch }));

const c = { id: 'c1', name: 'Ulcus', pathology: 'ulcus', specialty: 'Gastroenterologie', patientSheet: { personalia: { name: 'Karl', age: 50 }, leitsymptome: ['Bauchweh'], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [], vorerkrankungen: [], voroperationen: [], medikamente: [], allergien: [], noxen: {}, familienanamnese: [], sozialanamnese: [] }, medicalView: { verdachtsdiagnose: 'Ulcus ventriculi' }, examinerSheet: [], examinerQuestions: [], linkedFachbegriffeIds: ['fb-a'], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1 };

describe('ExternalAiSheet', () => {
  beforeEach(async () => { await db.meta.clear(); await db.cases.clear(); await db.fachbegriffe.clear(); await db.cases.put(c as never); await db.fachbegriffe.put({ id: 'fb-a', term: 'Ulkus', translationSimple: 'Geschwür', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } } as never); useUi.setState({ externalAiCaseId: 'c1' }); });

  it('affiche cibles, portée, aperçu ; « Ouvrir » lance avec la cible choisie, mémorise et pose la trace', async () => {
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    expect(await screen.findByRole('dialog', { name: /simuler avec ton ia/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /claude/i }));
    fireEvent.click(screen.getByRole('radio', { name: /anamnèse seule/i }));
    fireEvent.click(screen.getByRole('button', { name: /voir ce que ton ia recevra/i }));
    expect(screen.getByText(/Karl/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir dans claude/i }));
    await waitFor(() => expect(launchMod.launch).toHaveBeenCalled());
    expect(launchMod.launch.mock.calls[0][0].id).toBe('claude');
    expect(launchMod.launch.mock.calls[0][1]).not.toContain('Fallvorstellung');
    await waitFor(async () => expect((await db.meta.get('externalAi.target'))?.value).toBe('claude'));
    expect((await db.meta.get('externalAi.pending'))?.value).toMatchObject({ caseId: 'c1', targetId: 'claude', scope: 'anamnese' });
    expect(await screen.findByText(/pré-rempli.*Entrée/i)).toBeTruthy();
  });
  it('« Copier le prompt » n\'ouvre rien', async () => {
    const write = vi.fn().mockResolvedValue(undefined); Object.assign(navigator, { clipboard: { writeText: write } });
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /copier le prompt/i }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(launchMod.launch).not.toHaveBeenCalled();
  });
  it('copie échouée : pas de « prompt copié », aperçu ouvert', async () => {
    launchMod.launch.mockResolvedValueOnce({ opened: true, copied: false, prefilled: false });
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ouvrir dans/i }));
    await waitFor(() => expect(launchMod.launch).toHaveBeenCalled());
    expect(await screen.findByText(/Copie impossible/i)).toBeTruthy();
    expect(screen.queryByText(/prompt copié/i)).toBeNull();
    expect(screen.getByText(/Karl/)).toBeTruthy();
  });
  it('pré-rempli sans envoi auto (Claude) : message « appuie sur Entrée », pas de « part tout seul »', async () => {
    launchMod.launch.mockResolvedValueOnce({ opened: true, copied: true, prefilled: true });
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('radio', { name: /claude/i }));
    fireEvent.click(screen.getByRole('button', { name: /ouvrir dans claude/i }));
    await waitFor(() => expect(launchMod.launch).toHaveBeenCalled());
    const status = await screen.findByRole('status');
    expect(status.textContent).toMatch(/appuie sur Entrée pour l'envoyer/i);
    expect(status.textContent).not.toMatch(/part tout seul/i);
  });
  it('pré-rempli avec envoi auto (ChatGPT) : « le prompt part tout seul »', async () => {
    launchMod.launch.mockResolvedValueOnce({ opened: true, copied: true, prefilled: true });
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ouvrir dans chatgpt/i }));
    await waitFor(() => expect(launchMod.launch).toHaveBeenCalled());
    expect(await screen.findByText(/part tout seul/i)).toBeTruthy();
  });
  it('Échap ferme', async () => {
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    await screen.findByRole('dialog'); fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().externalAiCaseId).toBeNull());
  });
});
