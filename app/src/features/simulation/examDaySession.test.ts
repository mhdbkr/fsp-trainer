import { describe, expect, it, beforeEach } from 'vitest';
import {
  reduceStart,
  reduceBeginPart,
  reduceToTransition,
  reduceToEvaluation,
  reduceSaveResult,
  isStale,
  allPartsExpired,
  useExamDaySession,
  type ExamDayState,
} from './examDaySession';

const HOUR = 60 * 60 * 1000;

const mkResult = () => ({
  done: true,
  durationSec: 0,
  checklist: [],
  feeling: 50,
  contentPct: 0,
  officialPct: 0,
});

describe('reduceStart', () => {
  it('initialise une nouvelle session sur anamnese', () => {
    const now = 1_000_000;
    const s = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: true }, now);
    expect(s.phase).toBe('anamnese');
    expect(s.current).toBe('anamnese');
    expect(s.startedAt).toBe(now);
    expect(s.land).toBe('BW');
    expect(s.partTimes).toEqual({});
    expect(s.transitionStartedAt).toBeNull();
    expect(s.bogen).toEqual({});
    expect(s.results).toEqual({});
  });
});

describe('reduceBeginPart', () => {
  it('conserve le premier startedAt de la partie si appelé deux fois', () => {
    const s0 = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);
    const s1 = reduceBeginPart(s0, 'dokumentation', 1000);
    const s2 = reduceBeginPart(s1, 'dokumentation', 5000);
    expect(s1.partTimes.dokumentation).toBe(1000);
    expect(s2.partTimes.dokumentation).toBe(1000);
    expect(s2.phase).toBe('dokumentation');
    expect(s2.current).toBe('dokumentation');
    expect(s2.transitionStartedAt).toBeNull();
  });
});

describe('reduceToTransition / reduceToEvaluation', () => {
  it('fixe transitionStartedAt une seule fois', () => {
    const s0 = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);
    const s1 = reduceToTransition(s0, 100);
    const s2 = reduceToTransition(s1, 200);
    expect(s1.phase).toBe('transition');
    expect(s1.transitionStartedAt).toBe(100);
    expect(s2.transitionStartedAt).toBe(100);
  });

  it('passe en evaluation', () => {
    const s0 = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);
    const s1 = reduceToEvaluation(s0);
    expect(s1.phase).toBe('evaluation');
  });
});

describe('reduceSaveResult', () => {
  it('enregistre un résultat de partie', () => {
    const s0 = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);
    const r = mkResult();
    const s1 = reduceSaveResult(s0, 'anamnese', r);
    expect(s1.results.anamnese).toBe(r);
    expect(s0.results.anamnese).toBeUndefined();
  });
});

describe('isStale', () => {
  const base: ExamDayState = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);

  it('null → false', () => {
    expect(isStale(null, 24 * HOUR + 1)).toBe(false);
  });

  it('24 h + 1 ms → true', () => {
    expect(isStale(base, 24 * HOUR + 1)).toBe(true);
  });

  it('23 h → false', () => {
    expect(isStale(base, 23 * HOUR)).toBe(false);
  });
});

describe('allPartsExpired', () => {
  it('trois parties commencées il y a 3 h → true', () => {
    let s = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);
    s = reduceBeginPart(s, 'anamnese', 0);
    s = reduceBeginPart(s, 'dokumentation', 0);
    s = reduceBeginPart(s, 'fallvorstellung', 0);
    expect(allPartsExpired(s, 3 * HOUR)).toBe(true);
  });

  it('P3 non commencée → false', () => {
    let s = reduceStart({ caseId: 'c1', caseName: 'Cas 1', withSimulant: false }, 0);
    s = reduceBeginPart(s, 'anamnese', 0);
    s = reduceBeginPart(s, 'dokumentation', 0);
    expect(allPartsExpired(s, 3 * HOUR)).toBe(false);
  });
});

describe('useExamDaySession (store persist)', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamDaySession.setState({ state: null });
  });

  it('start puis abandon efface state et localStorage', () => {
    useExamDaySession.getState().start({ caseId: 'c1', caseName: 'Cas 1', withSimulant: true }, 0);
    expect(useExamDaySession.getState().state?.caseId).toBe('c1');

    useExamDaySession.getState().abandon();
    expect(useExamDaySession.getState().state).toBeNull();

    const raw = localStorage.getItem('fsp-exam-day');
    expect(raw).toBeTruthy();
    expect(raw as string).not.toContain('caseId');
  });

  it('purgeIfStale efface une session périmée', () => {
    useExamDaySession.getState().start({ caseId: 'c1', caseName: 'Cas 1', withSimulant: true }, 0);
    useExamDaySession.getState().purgeIfStale(24 * HOUR + 1);
    expect(useExamDaySession.getState().state).toBeNull();
  });

  it('purgeIfStale conserve une session fraîche', () => {
    useExamDaySession.getState().start({ caseId: 'c1', caseName: 'Cas 1', withSimulant: true }, 0);
    useExamDaySession.getState().purgeIfStale(23 * HOUR);
    expect(useExamDaySession.getState().state?.caseId).toBe('c1');
  });

  it('beginPart / toTransition / toEvaluation / saveResult / setBogen / setArztbrief / openAufklaerung', () => {
    useExamDaySession.getState().start({ caseId: 'c1', caseName: 'Cas 1', withSimulant: true }, 0);
    useExamDaySession.getState().beginPart('anamnese', 0);
    expect(useExamDaySession.getState().state?.current).toBe('anamnese');

    useExamDaySession.getState().setBogen({ a: '1' });
    expect(useExamDaySession.getState().state?.bogen).toEqual({ a: '1' });

    useExamDaySession.getState().setArztbrief('texte');
    expect(useExamDaySession.getState().state?.arztbriefText).toBe('texte');

    useExamDaySession.getState().openAufklaerung();
    expect(useExamDaySession.getState().state?.aufklaerungOpened).toBe(true);

    useExamDaySession.getState().toTransition(1000);
    expect(useExamDaySession.getState().state?.phase).toBe('transition');

    useExamDaySession.getState().toEvaluation();
    expect(useExamDaySession.getState().state?.phase).toBe('evaluation');

    useExamDaySession.getState().toResult();
    expect(useExamDaySession.getState().state?.phase).toBe('result');

    useExamDaySession.getState().saveResult('anamnese', mkResult());
    expect(useExamDaySession.getState().state?.results.anamnese).toBeDefined();
  });
});
