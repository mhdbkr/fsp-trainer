import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/db/db';
import { useSimSession } from '@/store/simSession';
import { useExamDaySession, reduceStart, reduceBeginPart, reduceToTransition } from './examDaySession';
import { EXAM_DAY_PLAN } from './examDayPlan';
import { ExamDayRunner } from './examDayRunner';
import { SimulationRunner } from './SimulationRunner';

const PLAN = EXAM_DAY_PLAN.BW;
const P1 = PLAN.parts[0].targetSec;
const T0 = 1_800_000_000_000;
const CASE = {
  id: 'c1',
  name: 'Leberzirrhose bei Alkoholabhängigkeit',
  specialty: 'Innere Medizin',
  centers: ['Freiburg'],
  frequency: 3,
  patientSheet: { personalia: { name: 'Hans Meier', age: 58 }, leitsymptome: ['Bauchschmerzen seit 3 Tagen'] },
} as any;

/** Texte racine des aides interdites en Prüfungstag (spec §5.3, exhaustif). */
const FORBIDDEN = /Guide|Muster-?Card|Redewendung|Fachanamnese|Glossar/;

function seedSession(opts: { startedAt?: number; phase?: 'p1' | 'transition' } = {}) {
  const now = opts.startedAt ?? T0;
  let s = reduceBeginPart(reduceStart({ caseId: 'c1', caseName: CASE.name, withSimulant: false, muster: 'Standard' }, now), 'anamnese', now);
  if (opts.phase === 'transition') s = reduceToTransition(s, now);
  useExamDaySession.setState({ state: s });
  return s;
}

function renderRunner(query = '') {
  return render(
    <MemoryRouter initialEntries={[`/simulation/c1/run?modus=pruefungstag${query}`]}>
      <Routes>
        <Route path="/simulation/:caseId/run" element={<ExamDayRunner caseId="c1" />} />
        <Route path="/simulation/pruefungstag" element={<div data-setup>setup</div>} />
        <Route path="/simulation" element={<div data-hub>hub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExamDayRunner', () => {
  beforeEach(async () => {
    await db.cases.clear();
    await db.cases.add(CASE);
    useExamDaySession.setState({ state: null });
    useSimSession.getState().end();
  });
  afterEach(() => vi.useRealTimers());

  it('P1 : Bogen éditable, « Anamnese », aucun texte racine des guides, seuls nom/âge/motif du cas', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: T0 + 1000 });
    seedSession();
    const { container } = renderRunner();
    const root = container.querySelector('[data-exam-day]')!;
    expect(root).not.toBeNull();
    expect(root.getAttribute('data-exam-phase')).toBe('anamnese');
    expect(container.textContent).toMatch(/Anamnese/);
    expect(container.textContent).toMatch(/BW/);
    expect(container.textContent).not.toMatch(FORBIDDEN);
    expect(container.querySelector('fieldset[disabled]')).toBeNull();
    const inputs = [...container.querySelectorAll('input, textarea')] as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);
    expect(inputs.every((i) => !i.disabled)).toBe(true);
    vi.useRealTimers();
    await screen.findByText(/Hans Meier/);
    expect(container.textContent).toMatch(/58/);
    expect(container.textContent).toMatch(/Bauchschmerzen/);
    expect(container.textContent).not.toMatch(/Leberzirrhose/);
  });

  it('chrono échu (nowFn injecté à +1201 s) : bandeau « Zeit ist um », fieldset disabled, phase transition', async () => {
    seedSession({ startedAt: Date.now() });
    const { container } = renderRunner(`&debugClock=${P1 + 1}`);
    await waitFor(() => expect(container.querySelector('[data-exam-banner]')?.textContent).toMatch(/Zeit ist um/));
    expect(container.querySelector('fieldset[disabled]')).not.toBeNull();
    expect(useExamDaySession.getState().state?.phase).toBe('transition');
  });

  it('transition échue → beginPart(dokumentation), partTimes.dokumentation posé', async () => {
    seedSession({ startedAt: Date.now() - (P1 + 5) * 1000, phase: 'transition' });
    // transitionStartedAt = startedAt (il y a P1+5 s) ⇒ déjà > transitionSec.
    renderRunner();
    await waitFor(() => expect(useExamDaySession.getState().state?.current).toBe('dokumentation'));
    const st = useExamDaySession.getState().state!;
    expect(st.phase).toBe('dokumentation');
    expect(st.partTimes.dokumentation).toBeTypeOf('number');
  });

  it('transition : bouton « Bereit » avance sans attendre', async () => {
    seedSession({ startedAt: Date.now() - (P1 + 1) * 1000 });
    useExamDaySession.getState().toTransition(Date.now());
    renderRunner();
    fireEvent.click(await screen.findByRole('button', { name: /Bereit/ }));
    expect(useExamDaySession.getState().state?.current).toBe('dokumentation');
  });

  it('P2 : Arztbrief éditable, Bogen en fieldset disabled ; P3 : tout figé', async () => {
    const now = Date.now();
    seedSession({ startedAt: now - (P1 + 70) * 1000 });
    useExamDaySession.getState().beginPart('dokumentation', now);
    const { container, unmount } = renderRunner();
    const ta = container.querySelector('textarea[data-arztbrief]') as HTMLTextAreaElement;
    expect(ta).not.toBeNull();
    expect(ta.disabled).toBe(false);
    expect(container.querySelector('fieldset[disabled] input')).not.toBeNull();
    fireEvent.change(ta, { target: { value: 'Sehr geehrte Kollegen' } });
    expect(useExamDaySession.getState().state?.arztbriefText).toBe('Sehr geehrte Kollegen');
    unmount();

    useExamDaySession.getState().beginPart('fallvorstellung', now);
    const r2 = renderRunner();
    const ta2 = r2.container.querySelector('textarea[data-arztbrief]') as HTMLTextAreaElement;
    expect(ta2.closest('fieldset[disabled]')).not.toBeNull();
    expect(r2.container.textContent).not.toMatch(FORBIDDEN);
  });

  it('Aufklärung : modale sans fiche, openAufklaerung()', async () => {
    seedSession({ startedAt: Date.now() });
    const { container } = renderRunner();
    fireEvent.click(screen.getByRole('button', { name: /Aufklärung durchführen/ }));
    expect(container.textContent).toMatch(/Der Simulant hat sein Blatt/);
    expect(useExamDaySession.getState().state?.aufklaerungOpened).toBe(true);
    expect(container.textContent).not.toMatch(FORBIDDEN);
    fireEvent.click(screen.getByRole('button', { name: /Schließen/ }));
    expect(container.textContent).not.toMatch(/Der Simulant hat sein Blatt/);
  });

  it('reprise après rechargement : le store persistant restaure la session', async () => {
    seedSession({ startedAt: Date.now() });
    // « Rechargement » : la mémoire vive est perdue, seul localStorage reste.
    const persisted = localStorage.getItem('fsp-exam-day')!;
    useExamDaySession.setState({ state: null });
    localStorage.setItem('fsp-exam-day', persisted);
    await useExamDaySession.persist.rehydrate();
    expect(useExamDaySession.getState().state?.caseId).toBe('c1');
    const { container } = renderRunner();
    expect(container.querySelector('[data-exam-day]')?.getAttribute('data-exam-phase')).toBe('anamnese');
  });

  it('montage : toutes les parties échues → évaluation', async () => {
    const now = Date.now();
    const s = seedSession({ startedAt: now - 4000 * 1000 });
    useExamDaySession.setState({
      state: { ...s, current: 'fallvorstellung', phase: 'fallvorstellung', partTimes: { anamnese: now - 4000e3, dokumentation: now - 2700e3, fallvorstellung: now - 1400e3 } },
    });
    const { container } = renderRunner();
    await waitFor(() => expect(useExamDaySession.getState().state?.phase).toBe('evaluation'));
    expect(container.querySelector('[data-exam-day]')?.getAttribute('data-exam-phase')).toBe('evaluation');
  });

  it('horloge murale : fake timers + saut de temps ⇒ échu sans compteur', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'], now: T0 });
    seedSession({ startedAt: T0 });
    const { container } = renderRunner();
    const root = container.querySelector('[data-exam-day]')!;
    expect(Number(root.getAttribute('data-exam-remaining'))).toBe(P1);
    // L'onglet dort : aucun tick pendant 1201 s, puis un seul tick.
    vi.setSystemTime(T0 + (P1 + 1) * 1000);
    act(() => { vi.advanceTimersByTime(500); });
    expect(container.querySelector('[data-exam-banner]')?.textContent).toMatch(/Zeit ist um/);
    expect(useExamDaySession.getState().state?.phase).toBe('transition');
  });

  it('alerte à 5 min : classe exam-alert', () => {
    vi.useFakeTimers({ toFake: ['Date'], now: T0 + (P1 - PLAN.alertsSec[0] + 10) * 1000 });
    seedSession({ startedAt: T0 });
    const { container } = renderRunner();
    expect(container.querySelector('[data-exam-day]')?.className).toMatch(/exam-alert/);
  });

  it('sans session → renvoie au setup', async () => {
    const { container } = renderRunner();
    await waitFor(() => expect(container.querySelector('[data-setup]')).not.toBeNull());
  });

  it('Abbrechen (confirmé) → abandon, snapshot effacé, hub', async () => {
    seedSession({ startedAt: Date.now() });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = renderRunner();
    await waitFor(() => expect(useSimSession.getState().snapshot?.caseId).toBe('c1'));
    fireEvent.click(screen.getByRole('button', { name: /Abbrechen/ }));
    expect(useExamDaySession.getState().state).toBeNull();
    expect(useSimSession.getState().snapshot).toBeNull();
    await waitFor(() => expect(container.querySelector('[data-hub]')).not.toBeNull());
  });
});

describe('SimulationRunner — early-return Prüfungstag', () => {
  beforeEach(async () => {
    await db.cases.clear();
    await db.cases.add(CASE);
    useExamDaySession.setState({ state: null });
  });

  const renderSim = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/simulation/:caseId/run" element={<SimulationRunner />} />
          <Route path="/simulation/pruefungstag" element={<div data-setup>setup</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it('?modus=pruefungstag rend [data-exam-day]', () => {
    seedSession({ startedAt: Date.now() });
    const { container } = renderSim('/simulation/c1/run?modus=pruefungstag');
    expect(container.querySelector('[data-exam-day]')).not.toBeNull();
  });

  it('sans query mais session Prüfungstag pour ce cas → jamais le runner entraînement', () => {
    seedSession({ startedAt: Date.now() });
    const { container } = renderSim('/simulation/c1/run');
    expect(container.querySelector('[data-exam-day]')).not.toBeNull();
    expect(container.textContent).not.toMatch(FORBIDDEN);
  });

  it('sans session ni query → runner entraînement', () => {
    const { container } = renderSim('/simulation/c1/run');
    expect(container.querySelector('[data-exam-day]')).toBeNull();
  });
});
