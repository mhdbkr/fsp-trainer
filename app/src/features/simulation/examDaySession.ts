// Session persistante du Prüfungstag (spec §5.2, décision P8). Store zustand `persist`
// dédié — séparé de `store/simSession.ts` (dont `elapsed` est un compteur). Purge
// automatique passé `EXAM_DAY_PLAN[land].purgeAfterMs` (24 h). Abandon = effacement
// (rien n'est écrit ailleurs).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BogenNotes, MusterCity, PartResult, SimulationPart } from '@/db/types';
import { EXAM_DAY_PLAN, ORDER, targetSec, type ExamDayPart, type ExamDayPhase, type ExamLand } from './examDayPlan';
import { remainingSec } from './examDayClock';

export interface ExamDayState {
  caseId: string;
  caseName: string;
  land: ExamLand;
  withSimulant: boolean;
  muster?: MusterCity;
  startedAt: number;
  partTimes: Partial<Record<ExamDayPart, number>>;
  transitionStartedAt: number | null;
  phase: ExamDayPhase;
  current: ExamDayPart;
  bogen: BogenNotes;
  arztbriefText: string;
  aufklaerungOpened: boolean;
  results: Partial<Record<SimulationPart, PartResult>>;
  // Persistant (survit à un reload/back tant que la session vit) : marque que
  // `persistExamDay` a déjà été exécuté pour cette session, pour ne jamais le
  // rejouer si `ExamDayResult` est remonté (le `useRef` du composant ne suffit
  // pas — il est local au montage, pas au store `persist`).
  resultPersisted?: boolean;
}

export const reduceStart = (
  i: Pick<ExamDayState, 'caseId' | 'caseName' | 'withSimulant' | 'muster'>,
  now: number,
  land: ExamLand = 'BW'
): ExamDayState => ({
  ...i,
  land,
  startedAt: now,
  partTimes: {},
  transitionStartedAt: null,
  phase: 'anamnese',
  current: 'anamnese',
  bogen: {},
  arztbriefText: '',
  aufklaerungOpened: false,
  results: {},
});

export const reduceBeginPart = (s: ExamDayState, part: ExamDayPart, now: number): ExamDayState => ({
  ...s,
  phase: part,
  current: part,
  transitionStartedAt: null,
  partTimes: s.partTimes[part] !== undefined ? s.partTimes : { ...s.partTimes, [part]: now },
});

export const reduceToTransition = (s: ExamDayState, now: number): ExamDayState => ({
  ...s,
  phase: 'transition',
  transitionStartedAt: s.transitionStartedAt ?? now,
});

export const reduceToEvaluation = (s: ExamDayState): ExamDayState => ({ ...s, phase: 'evaluation' });

export const reduceToResult = (s: ExamDayState): ExamDayState => ({ ...s, phase: 'result' });

export const reduceSaveResult = (s: ExamDayState, part: SimulationPart, r: PartResult): ExamDayState => ({
  ...s,
  results: { ...s.results, [part]: r },
});

export const reduceSetBogen = (s: ExamDayState, bogen: BogenNotes): ExamDayState => ({ ...s, bogen });

export const reduceSetArztbrief = (s: ExamDayState, arztbriefText: string): ExamDayState => ({ ...s, arztbriefText });

export const reduceOpenAufklaerung = (s: ExamDayState): ExamDayState => ({ ...s, aufklaerungOpened: true });

export const reduceMarkResultPersisted = (s: ExamDayState): ExamDayState => ({ ...s, resultPersisted: true });

export const isStale = (s: ExamDayState | null, now: number, land: ExamLand = 'BW'): boolean =>
  !!s && now - s.startedAt > EXAM_DAY_PLAN[land].purgeAfterMs;

export const allPartsExpired = (s: ExamDayState, now: number): boolean =>
  ORDER.every((p) => s.partTimes[p] !== undefined && remainingSec(s.partTimes[p]!, targetSec(s.land, p), now) === 0);

interface ExamDaySessionStore {
  state: ExamDayState | null;
  start: (i: Pick<ExamDayState, 'caseId' | 'caseName' | 'withSimulant' | 'muster'>, now: number, land?: ExamLand) => void;
  beginPart: (part: ExamDayPart, now: number) => void;
  toTransition: (now: number) => void;
  toEvaluation: () => void;
  toResult: () => void;
  saveResult: (part: SimulationPart, r: PartResult) => void;
  setBogen: (bogen: BogenNotes) => void;
  setArztbrief: (text: string) => void;
  openAufklaerung: () => void;
  markResultPersisted: () => void;
  abandon: () => void;
  purgeIfStale: (now: number) => void;
}

export const useExamDaySession = create<ExamDaySessionStore>()(
  persist(
    (set, get) => ({
      state: null,
      start: (i, now, land) => set({ state: reduceStart(i, now, land) }),
      beginPart: (part, now) => {
        const s = get().state;
        if (s) set({ state: reduceBeginPart(s, part, now) });
      },
      toTransition: (now) => {
        const s = get().state;
        if (s) set({ state: reduceToTransition(s, now) });
      },
      toEvaluation: () => {
        const s = get().state;
        if (s) set({ state: reduceToEvaluation(s) });
      },
      toResult: () => {
        const s = get().state;
        if (s) set({ state: reduceToResult(s) });
      },
      saveResult: (part, r) => {
        const s = get().state;
        if (s) set({ state: reduceSaveResult(s, part, r) });
      },
      setBogen: (bogen) => {
        const s = get().state;
        if (s) set({ state: reduceSetBogen(s, bogen) });
      },
      setArztbrief: (text) => {
        const s = get().state;
        if (s) set({ state: reduceSetArztbrief(s, text) });
      },
      openAufklaerung: () => {
        const s = get().state;
        if (s) set({ state: reduceOpenAufklaerung(s) });
      },
      markResultPersisted: () => {
        const s = get().state;
        if (s) set({ state: reduceMarkResultPersisted(s) });
      },
      abandon: () => set({ state: null }),
      purgeIfStale: (now) => {
        if (isStale(get().state, now)) set({ state: null });
      },
    }),
    { name: 'fsp-exam-day' }
  )
);
