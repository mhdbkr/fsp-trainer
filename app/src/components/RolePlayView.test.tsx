import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RolePlayView } from './RolePlayView';
import type { CaseQuestion, PatientSheet } from '@/db/types';

// Revue Q2 (m-1) : quand la réponse est ÉCRITE (frageAntworten au texte exact de la
// question), buildRollenskript porte la relance sur cette ligne — Bubble doit la montrer.
const frage = 'Wissen Sie Ihre Blutgruppe?';
const sheet = {
  personalia: { name: 'X', age: 40 }, leitsymptome: ['Bauchschmerzen'], begleitsymptome: [], vegetativeAnamnese: [],
  vorerkrankungen: [], voroperationen: [], medikamente: [], allergien: [], noxen: {}, familienanamnese: [], sozialanamnese: [],
  antworten: {}, frageAntworten: [{ frage, antwort: 'Ja, A positiv.', kapitel: 'aktuell' }],
} as unknown as PatientSheet;

describe('RolePlayView — relance d\'une question du cas', () => {
  it('la relance s\'affiche sous la réponse écrite (pas seulement sous la ligne à improviser)', () => {
    const qs: CaseQuestion[] = [{ frage, kapitel: 'aktuell', followUp: 'Falls ja: Seit wann wissen Sie das?' }];
    render(<RolePlayView sheet={sheet} caseQuestions={qs} />);
    fireEvent.change(screen.getByPlaceholderText(/Le candidat demande/), { target: { value: 'Blutgruppe' } });
    expect(screen.getByText('Ja, A positiv.')).toBeTruthy();
    expect(screen.getByText('Falls ja: Seit wann wissen Sie das?')).toBeTruthy();
  });
  it('sans relance, rien de plus', () => {
    render(<RolePlayView sheet={sheet} caseQuestions={[{ frage, kapitel: 'aktuell' }]} />);
    fireEvent.change(screen.getByPlaceholderText(/Le candidat demande/), { target: { value: 'Blutgruppe' } });
    expect(screen.queryByText(/Falls ja/)).toBeNull();
  });
});
