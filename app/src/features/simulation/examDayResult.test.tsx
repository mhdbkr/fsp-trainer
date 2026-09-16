import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useExamDaySession, reduceStart, reduceBeginPart } from './examDaySession';
import type { ExamDayState } from './examDaySession';
import type { Case } from '@/db/types';

const persistExamDay = vi.fn().mockResolvedValue(undefined);
vi.mock('./examDayFinish', async () => {
  const actual = await vi.importActual<typeof import('./examDayFinish')>('./examDayFinish');
  return { ...actual, persistExamDay: (...args: unknown[]) => persistExamDay(...args) };
});

const hasMock = vi.fn().mockReturnValue(false);
vi.mock('@/lib/entitlements', () => ({
  useEntitlements: () => ({ has: hasMock, loaded: true }),
}));

import { ExamDayResult } from './examDayResult';

const T0 = 1_800_000_000_000;

function baseState(overrides: Partial<ExamDayState> = {}): ExamDayState {
  const s = reduceBeginPart(
    reduceStart({ caseId: 'c1', caseName: 'Fall', withSimulant: true, muster: 'Standard' }, T0),
    'anamnese',
    T0
  );
  return { ...s, phase: 'result', ...overrides };
}

const CASE: Case = {
  id: 'c1',
  name: 'Testfall',
  specialty: 'Kardiologie',
  frequency: 1,
  status: 'À faire',
  confidence: 0,
} as Case;

function resultState(withSimulant: boolean): ExamDayState {
  return baseState({
    withSimulant,
    partTimes: { anamnese: T0, dokumentation: T0 + 1_200_000, fallvorstellung: T0 + 2_400_000 },
    results: {
      anamnese: {
        done: true,
        durationSec: 1000,
        checklist: [
          { id: 'a1', label: 'Leitsymptom erfragt', checked: true },
          { id: 'a2', label: 'Vorerkrankungen erfragt', checked: false },
        ],
        languageGrid: { aussprache: 4, wortschatz: 2, grammatik: 3, redefluss: 3, kommunikation: 4 },
        feeling: 60,
        contentPct: 50,
        officialPct: 70,
      },
      dokumentation: {
        done: true,
        durationSec: 1100,
        checklist: [{ id: 'd1', label: 'Diagnose dokumentiert', checked: true }],
        feeling: 60,
        contentPct: 80,
        officialPct: 0,
      },
      fallvorstellung: {
        done: true,
        durationSec: 900,
        checklist: [{ id: 'f1', label: 'Fall vorgestellt', checked: true }],
        languageGrid: { aussprache: 3, wortschatz: 3, grammatik: 3, redefluss: 3, kommunikation: 3 },
        feeling: 60,
        contentPct: 90,
        officialPct: 60,
      },
    },
  });
}

async function seed() {
  await db.cases.put(CASE);
}

beforeEach(async () => {
  vi.clearAllMocks();
  persistExamDay.mockResolvedValue(undefined);
  hasMock.mockReturnValue(false);
  await db.cases.clear();
  await db.simulations.clear();
  await seed();
  useExamDaySession.setState({ state: null });
});

describe('ExamDayResult', () => {
  it('persiste une seule fois même en StrictMode', async () => {
    useExamDaySession.setState({ state: resultState(true) });
    render(
      <React.StrictMode>
        <MemoryRouter>
          <ExamDayResult />
        </MemoryRouter>
      </React.StrictMode>
    );
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
  });

  it('affiche les sections dans l’ordre scores → debrief → next → bi → cta', async () => {
    useExamDaySession.setState({ state: resultState(true) });
    const { container } = render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    const sections = [...container.querySelectorAll('[data-section]')].map((e) => (e as HTMLElement).dataset.section);
    expect(sections).toEqual(['scores', 'debrief', 'next', 'bi', 'cta']);
  });

  it('ne montre jamais de lien pricing (plan Free)', async () => {
    hasMock.mockReturnValue(false);
    useExamDaySession.setState({ state: resultState(true) });
    const { container } = render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(container.querySelector('a[href*="pricing"]')).toBeNull();
  });

  it('ne montre jamais de lien pricing (plan Pro)', async () => {
    hasMock.mockReturnValue(true);
    useExamDaySession.setState({ state: resultState(true) });
    const { container } = render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(container.querySelector('a[href*="pricing"]')).toBeNull();
  });

  it('affiche le bandeau « Ohne Simulant » quand withSimulant est faux', async () => {
    useExamDaySession.setState({ state: resultState(false) });
    render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Ohne Simulant/)).toBeTruthy();
  });

  it('n’affiche pas le bandeau quand withSimulant est vrai', async () => {
    useExamDaySession.setState({ state: resultState(true) });
    render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Ohne Simulant/)).toBeNull();
  });

  it('reste en phase result après persistance — ne s’auto-abandonne pas', async () => {
    useExamDaySession.setState({ state: resultState(true) });
    render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(useExamDaySession.getState().state).not.toBeNull();
    expect(useExamDaySession.getState().state?.phase).toBe('result');
  });

  it('abandonne la session au clic sur le CTA final', async () => {
    hasMock.mockReturnValue(false);
    useExamDaySession.setState({ state: resultState(true) });
    render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(useExamDaySession.getState().state).not.toBeNull();
    fireEvent.click(screen.getByText('Meinen Bereitschaftsindex ansehen'));
    expect(useExamDaySession.getState().state).toBeNull();
  });

  it('abandonne la session au clic sur l’action gratuite (rejouer en autonome)', async () => {
    useExamDaySession.setState({ state: resultState(true) });
    render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    expect(useExamDaySession.getState().state).not.toBeNull();
    fireEvent.click(screen.getByText('Diesen Fall autonom wiederholen'));
    expect(useExamDaySession.getState().state).toBeNull();
  });

  it('la persistance reste appelée une seule fois même après un clic de sortie', async () => {
    useExamDaySession.setState({ state: resultState(true) });
    render(<MemoryRouter><ExamDayResult /></MemoryRouter>);
    await waitFor(() => expect(persistExamDay).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Diesen Fall autonom wiederholen'));
    expect(persistExamDay).toHaveBeenCalledTimes(1);
  });
});
