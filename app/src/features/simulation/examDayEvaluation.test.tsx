import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useExamDaySession, reduceStart, reduceBeginPart } from './examDaySession';
import { ExamDayEvaluation, consumedSec } from './examDayEvaluation';
import type { ExamDayState } from './examDaySession';

const T0 = 1_800_000_000_000;

function baseState(overrides: Partial<ExamDayState> = {}): ExamDayState {
  const s = reduceBeginPart(
    reduceStart({ caseId: 'c1', caseName: 'Fall', withSimulant: false, muster: 'Standard' }, T0),
    'anamnese',
    T0
  );
  return { ...s, phase: 'evaluation', ...overrides };
}

describe('consumedSec', () => {
  it('borne au temps cible quand la partie suivante a démarré (P1 → P2)', () => {
    const s = baseState({
      partTimes: { anamnese: T0, dokumentation: T0 + 1_300_000 },
    });
    // target anamnese = 1200s, écart réel = 1300s > cible → borné à 1200
    expect(consumedSec(s, 'anamnese', T0 + 1_300_000)).toBe(1200);
  });

  it('utilise now quand il n’y a pas de partie suivante ni de transition', () => {
    const s = baseState({
      partTimes: { fallvorstellung: T0 },
    });
    expect(consumedSec(s, 'fallvorstellung', T0 + 600_000)).toBe(600);
  });
});

describe('ExamDayEvaluation', () => {
  beforeEach(() => {
    useExamDaySession.setState({ state: null });
  });

  it('enchaîne 3 grilles (anamnese, dokumentation, fallvorstellung) puis passe en phase result', () => {
    useExamDaySession.setState({
      state: baseState({
        partTimes: { anamnese: T0, dokumentation: T0 + 1_200_000, fallvorstellung: T0 + 2_400_000 },
      }),
    });

    const { rerender } = render(<ExamDayEvaluation />);
    expect(screen.getByText(/Évaluation — Anamnese/)).toBeTruthy();

    useExamDaySession.getState().saveResult('anamnese', {
      done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0,
    });
    rerender(<ExamDayEvaluation />);
    expect(screen.getByText(/Évaluation — Dokumentation/)).toBeTruthy();

    useExamDaySession.getState().saveResult('dokumentation', {
      done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0,
    });
    rerender(<ExamDayEvaluation />);
    expect(screen.getByText(/Évaluation — Fallvorstellung/)).toBeTruthy();

    useExamDaySession.getState().saveResult('fallvorstellung', {
      done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0,
    });
    rerender(<ExamDayEvaluation />);
    expect(useExamDaySession.getState().state?.phase).toBe('result');
  });

  it('ajoute une 4e grille Aufklärung quand aufklaerungOpened est vrai', () => {
    useExamDaySession.setState({
      state: baseState({
        aufklaerungOpened: true,
        partTimes: { anamnese: T0, dokumentation: T0 + 1_200_000, fallvorstellung: T0 + 2_400_000 },
        results: {
          anamnese: { done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0 },
          dokumentation: { done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0 },
          fallvorstellung: { done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0 },
        },
      }),
    });

    render(<ExamDayEvaluation />);
    expect(screen.getByText(/Évaluation — Aufklärung/)).toBeTruthy();
    expect(useExamDaySession.getState().state?.phase).toBe('evaluation');
  });

  it('évalue une partie même non tentée (partTimes vide pour elle)', () => {
    useExamDaySession.setState({
      state: baseState({
        partTimes: { anamnese: T0 },
        results: {
          anamnese: { done: true, durationSec: 100, checklist: [], feeling: 50, contentPct: 0, officialPct: 0 },
        },
      }),
    });
    const { container } = render(<ExamDayEvaluation />);
    expect(container.querySelector('[data-exam-eval]')).not.toBeNull();
    expect(screen.getByText(/Évaluation — Dokumentation/)).toBeTruthy();
  });
});
