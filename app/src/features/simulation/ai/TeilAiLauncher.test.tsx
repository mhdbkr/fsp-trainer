import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { AUSGABE, BEGRUESSUNG } from '@/lib/externalAi/prompt';
import { TeilAiLauncher, launchStatus } from './TeilAiLauncher';

const c = {
  id: 'c1', name: 'Bauchschmerzen', pathology: 'Ulcus ventriculi', specialty: 'Gastroenterologie',
  patientSheet: {
    personalia: { name: 'Karl Berger', age: 50, geschlecht: 'm' }, leitsymptome: ['Bauchweh'], begleitsymptome: [],
    antworten: { 'akt-motiv': 'Ich habe seit einer Woche Bauchweh.' }, vegetativeAnamnese: [], vorerkrankungen: [], voroperationen: [],
    medikamente: [], allergien: [], noxen: {}, familienanamnese: [], sozialanamnese: [],
  },
  medicalView: { verdachtsdiagnose: 'Ulcus ventriculi', differenzialdiagnosen: [], diagnostik: [], therapie: [] },
  examinerSheet: [{ title: 'T', interactions: [{ frage: 'Stellen Sie mir bitte den Fall vor.' }] }], examinerQuestions: [],
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1,
};

let write: ReturnType<typeof vi.fn>;
const meta = async (k: string) => (await db.meta.get(k))?.value;
const open = async () => {
  fireEvent.click(screen.getByRole('button', { name: /avec ton ia/i }));
  return screen.findByRole('radiogroup', { name: /ton ia/i });
};

describe('TeilAiLauncher', () => {
  beforeEach(async () => {
    await db.meta.clear(); await db.cases.clear(); await db.cases.put(c as never);
    write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
  });

  it('discret au repos : un seul déclencheur, panneau fermé', () => {
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    expect(screen.getByRole('button', { name: /avec ton ia/i }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('ouvert : les trois temps, deux cibles seulement', async () => {
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    for (const t of [/on prépare le patient/i, /l'ia l'incarne/i, /tu mènes l'entretien/i]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['ChatGPT', 'Gemini']);
  });

  it('rappelle la cible de la dernière fois', async () => {
    await db.meta.put({ key: 'externalAi.target', value: 'gemini' });
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Gemini' }).getAttribute('aria-checked')).toBe('true'));
    expect(screen.getByText(/comme la dernière fois/i)).toBeTruthy();
  });

  it('mémorise le choix dès qu\'on change de cible', async () => {
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    fireEvent.click(await screen.findByRole('radio', { name: 'Gemini' }));
    await waitFor(async () => expect(await meta('externalAi.target')).toBe('gemini'));
  });

  it('copier seul : copie le texte patient, mémorise, pose la trace du Teil, état « copié »', async () => {
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    fireEvent.click(await screen.findByRole('button', { name: /^copier$/i }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][0]).toContain(AUSGABE.patient);
    expect(write.mock.calls[0][0].trimEnd().endsWith(BEGRUESSUNG)).toBe(true);
    expect(await screen.findByRole('button', { name: /copié/i })).toBeTruthy();
    expect(await meta('externalAi.target')).toBe('chatgpt');
    expect(await meta('externalAi.pending')).toMatchObject({ caseId: 'c1', targetId: 'chatgpt', teil: 'anamnese' });
  });

  it('ouvrir : un vrai lien vers l\'app, copie dans le geste, confirmation visible', async () => {
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    const link = await screen.findByRole('link', { name: /copier et ouvrir chatgpt/i });
    expect(link.getAttribute('href')).toBe('https://chatgpt.com/#native');
    expect(link.getAttribute('target')).toBe('_blank');
    fireEvent.click(link);
    expect(write).toHaveBeenCalledTimes(1);
    expect((await screen.findByRole('status')).textContent).toMatch(/prompt copié — colle-le dans ChatGPT/i);
  });

  it('Fallvorstellung : l\'IA joue l\'Oberarzt, sans salutation à écrire', async () => {
    render(<TeilAiLauncher caseId="c1" teil="fallvorstellung" />);
    await open();
    expect(screen.getByText(/tu présentes le cas/i)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /^copier$/i }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][0]).toContain(AUSGABE.oberarzt);
    expect(write.mock.calls[0][0]).not.toContain(BEGRUESSUNG);
    expect(await meta('externalAi.pending')).toMatchObject({ teil: 'fallvorstellung' });
  });

  it('copie refusée : aucune promesse, texte à sélectionner', async () => {
    write.mockRejectedValueOnce(new Error('denied'));
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    fireEvent.click(await screen.findByRole('button', { name: /^copier$/i }));
    expect((await screen.findByRole('status')).textContent).toMatch(/copie impossible/i);
    expect(screen.queryByText(/prompt copié/i)).toBeNull();
    expect((screen.getByRole('textbox', { name: /texte du prompt/i }) as HTMLTextAreaElement).value).toContain(AUSGABE.patient);
  });

  it('Échap referme', async () => {
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    await open();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('radiogroup')).toBeNull());
  });
});

describe('launchStatus', () => {
  it('niveau 1 : le prompt est en place même si la copie de secours échoue', () => {
    expect(launchStatus({ copied: false, level: 1, via: 'open', teil: 'anamnese', label: 'ChatGPT' })).toEqual({ ok: true, text: 'Le prompt est en place dans ChatGPT — écris ta salutation, envoie.' });
  });
  it('niveau 2 : la confirmation suit la copie, l\'échec le dit', () => {
    expect(launchStatus({ copied: true, level: 2, via: 'open', teil: 'fallvorstellung', label: 'Gemini' }).text).toBe("Prompt copié — colle-le dans Gemini et envoie : l'Oberarzt ouvre.");
    expect(launchStatus({ copied: false, level: 2, via: 'open', teil: 'anamnese', label: 'Gemini' }).ok).toBe(false);
  });
  it('copier seul ne dit jamais « en place », même au niveau 1', () => {
    expect(launchStatus({ copied: true, level: 1, via: 'copy', teil: 'anamnese', label: 'ChatGPT' }).text).toMatch(/^Prompt copié/);
  });
});
