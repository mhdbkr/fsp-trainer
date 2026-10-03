import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FollowUpControls } from '@/components/PhraseControls';
import { ALLGEMEINE_ANAMNESE, adaptChaptersForCase } from '@/data/guides/anamneseChapters';
import { phraseFollowUp, phraseProbes, phraseText } from '@/data/guides/phrases';
import { parseFollowUp } from '@/data/guides/followUp';
import type { Case } from '@/db/types';

// Série 3, lot Q0 (G4) : « Trinken Sie täglich… » s'affichait dans les 130
// trames, même quand le patient ne boit pas — la relance n'avait pas son
// « Falls ja: » et le guide la rangeait en note inconditionnelle.
const alkohol = ALLGEMEINE_ANAMNESE.flatMap((c) => c.questions).find((q) => phraseProbes(q).includes('nox-alkohol'))!;

describe('Relance alcool', () => {
  it('reste masquée tant que « Ja » n\'est pas choisi', () => {
    render(<MemoryRouter><FollowUpControls raws={phraseFollowUp(alkohol)} /></MemoryRouter>);
    expect(screen.queryByText(/Trinken Sie täglich/)).toBeNull();
    expect(screen.queryByText(/Welche Getränke/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ja' }));
    expect(screen.getByText(/Welche Getränke/)).toBeTruthy();
    expect(screen.getByText(/Trinken Sie täglich/)).toBeTruthy();
  });
  it('« Nein » ne la montre pas', () => {
    render(<MemoryRouter><FollowUpControls raws={phraseFollowUp(alkohol)} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Nein' }));
    expect(screen.queryByText(/Trinken Sie täglich/)).toBeNull();
  });
});

// Q0 : une question du cas peut porter sa relance (`followUp`), qui suit la
// même règle « Falls ja » que celles des questions générales. Cas fictif —
// aucune donnée n'est migrée dans ce lot.
const fictif = (frage: string, followUp?: string): Case => ({
  specialty: 'Pneumologie',
  patientSheet: { personalia: { name: 'X', age: 60, geschlecht: 'm' }, schmerz: {}, leitsymptomKategorie: 'infekt' },
  caseSpecificQuestions: [{ frage, kapitel: 'vorerkrankungen', relu: true, ...(followUp ? { followUp } : {}) }],
} as unknown as Case);
const joue = (c: Case) => adaptChaptersForCase(c).find((ch) => ch.id === 'vorerkrankungen')!.questions
  .find((q) => /Heuschnupfen/.test(phraseText(q)))!;

describe('CaseQuestion.followUp', () => {
  it('arrive sur la question jouée, lue par le même parseur', () => {
    const q = joue(fictif('Hatten Sie Heuschnupfen?', 'Falls ja: Seit wann, und wie behandelt?'));
    expect(phraseFollowUp(q)).toEqual(['Falls ja: Seit wann, und wie behandelt?']);
    expect(parseFollowUp(phraseFollowUp(q)[0]).kind).toBe('ja');
  });
  it('sans followUp, aucune relance (inchangé)', () => {
    expect(phraseFollowUp(joue(fictif('Hatten Sie Heuschnupfen?')))).toEqual([]);
  });
  it('la relance reste masquée tant que « Ja » n\'est pas choisi', () => {
    const q = joue(fictif('Hatten Sie Heuschnupfen?', 'Falls ja: Seit wann, und wie behandelt?'));
    render(<MemoryRouter><FollowUpControls raws={phraseFollowUp(q)} /></MemoryRouter>);
    expect(screen.queryByText(/Seit wann, und wie behandelt/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ja' }));
    expect(screen.getByText(/Seit wann, und wie behandelt/)).toBeTruthy();
  });
});
