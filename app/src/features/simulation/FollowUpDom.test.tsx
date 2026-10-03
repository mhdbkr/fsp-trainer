import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FollowUpControls } from '@/components/PhraseControls';
import { ALLGEMEINE_ANAMNESE } from '@/data/guides/anamneseChapters';
import { phraseFollowUp, phraseProbes } from '@/data/guides/phrases';

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
