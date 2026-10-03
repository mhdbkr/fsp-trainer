import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CaseQuestion } from '@/db/types';
import { ExaminerSheetView } from './ExaminerSheetView';
import { CaseQuestionList } from './PreSimulationPage';

// Q0 (revue m3) : la relance d'une question du cas se voit aussi hors du guide —
// fiche de l'Oberarzt, échauffement. (Le Rollenskript est testé dans rolePlay.test.ts.)
const QS: CaseQuestion[] = [
  { frage: 'Nehmen Sie Blutverdünner?', kapitel: 'medikamente', followUp: 'Falls ja: Welche, und seit wann?' },
  'Haben Sie Fieber?',
];

describe('Fiche de l\'Oberarzt', () => {
  it('montre la relance sous sa question, discrètement', () => {
    render(<ExaminerSheetView sheet={[]} fallback={[]} caseName="X" caseSpecificQuestions={QS} />);
    expect(screen.getByText(/Falls ja: Welche, und seit wann/)).toBeTruthy();
    expect(screen.getByText('Haben Sie Fieber?')).toBeTruthy();
  });
});

describe('Échauffement — questions d\'anamnèse à ne pas oublier', () => {
  it('montre la relance sous sa question', () => {
    render(<MemoryRouter><CaseQuestionList questions={QS} /></MemoryRouter>);
    expect(screen.getByText(/Welche, und seit wann/)).toBeTruthy();
    expect(screen.getByText(/Nehmen Sie Blutverdünner/)).toBeTruthy();
  });
});
