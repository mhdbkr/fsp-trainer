import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { AUSGABE } from '@/lib/externalAi/prompt';
import { ExternalAiSheet } from './ExternalAiSheet';

const c = { id: 'c1', name: 'Bauchschmerzen', pathology: 'Ulcus ventriculi', specialty: 'Gastroenterologie', patientSheet: { personalia: { name: 'Karl', age: 50 }, leitsymptome: ['Bauchweh'], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [], vorerkrankungen: [], voroperationen: [], medikamente: [], allergien: [], noxen: {}, familienanamnese: [], sozialanamnese: [] }, medicalView: { verdachtsdiagnose: 'Ulcus ventriculi', differenzialdiagnosen: [], diagnostik: [], therapie: [] }, examinerSheet: [], examinerQuestions: [], linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1 };

describe('ExternalAiSheet', () => {
  beforeEach(async () => {
    await db.meta.clear(); await db.cases.clear(); await db.cases.put(c as never);
    useUi.setState({ externalAiCaseId: 'c1' });
  });

  it('hors du runner : joue l\'Anamnese, sans choix de forme ni de langue', async () => {
    const write = vi.fn().mockResolvedValue(undefined); Object.assign(navigator, { clipboard: { writeText: write } });
    render(<ExternalAiSheet />);
    expect(await screen.findByRole('dialog', { name: /simuler avec ton ia/i })).toBeTruthy();
    await screen.findByRole('radiogroup', { name: /ton ia/i });
    expect(screen.queryByText(/anamnèse seule|examen complet|français/i)).toBeNull();
    // « Copier » reste désactivé tant que le prompt n'est pas construit : sous charge, cliquer avant = clic perdu.
    const copier = screen.getByRole('button', { name: /^copier$/i });
    await waitFor(() => expect((copier as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(copier);
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(write.mock.calls[0][0]).toContain(AUSGABE.patient);
    expect((await db.meta.get('externalAi.pending'))?.value).toMatchObject({ caseId: 'c1', teil: 'anamnese' });
  });

  it('Échap ferme', async () => {
    render(<ExternalAiSheet />);
    await screen.findByRole('dialog'); fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().externalAiCaseId).toBeNull());
  });
});
