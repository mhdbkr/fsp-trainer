import { create } from 'zustand';
import type { BogenNotes, PartResult } from '@/db/types';

// ============================================================================
// Session de simulation PERSISTANTE. Quand l'utilisateur quitte la simulation,
// la session n'est pas perdue : elle est mise en pause (minimisée) et flotte
// dans une barre « reprendre ». Le Runner reflète son état local ici via `sync`.
// ============================================================================
type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

export interface SessionSnapshot {
  caseId: string;
  caseName: string;
  active: Part;
  phase: 'play' | 'eval';
  bogen: BogenNotes;
  arztbriefText: string;
  results: Partial<Record<Part, PartResult>>;
  aufklaerungOpen: boolean;
  /** Temps écoulé (sec) par partie — pour reprendre le chrono là où on l'a laissé. */
  elapsed: Partial<Record<Part, number>>;
  startedAt: number;
}

/** Position dans le mode focus — pour le reprendre là où on l'a quitté. */
export interface FocusPos { caseId: string; part: 'anamnese' | 'fallvorstellung'; ci: number; ii: number }

/** Avancement dans le guide HORS focus (chapitre le plus loin atteint). Permet
 *  au mode focus de démarrer là où on en est dans le guide (cases cochées en
 *  Anamnese, chapitre actif en Fallvorstellung). */
export interface GuideChapter { caseId: string; part: 'anamnese' | 'fallvorstellung'; chapterId: string }

interface SimSessionStore {
  snapshot: SessionSnapshot | null;
  minimized: boolean;                 // true = session en pause, hors du Runner
  focus: FocusPos | null;             // dernière position dans le mode focus
  guideChapter: GuideChapter | null;  // chapitre le plus loin atteint dans le guide
  guideProbe: string | null;          // sonde (question) que le candidat pose en ce moment — suivi live fin
  sync: (s: Omit<SessionSnapshot, 'startedAt'>) => void; // miroir depuis le Runner
  minimize: () => void;               // quitter en gardant la session
  resume: () => void;                 // reprendre (on rentre dans le Runner)
  end: () => void;                    // terminer / abandonner → efface
  setFocus: (f: FocusPos) => void;    // mémorise la position du mode focus
  setGuideChapter: (g: GuideChapter | null) => void; // avancement du guide
  setGuideProbe: (p: string | null) => void;         // question en cours (null = aucune)
}

export const useSimSession = create<SimSessionStore>((set, get) => ({
  snapshot: null,
  minimized: false,
  focus: null,
  guideChapter: null,
  guideProbe: null,
  sync: (s) => {
    const prev = get().snapshot;
    // startedAt fixé une fois, tant qu'on reste sur le même cas.
    const startedAt = prev && prev.caseId === s.caseId ? prev.startedAt : Date.now();
    set({ snapshot: { ...s, startedAt } });
  },
  minimize: () => { if (get().snapshot) set({ minimized: true }); },
  resume: () => set({ minimized: false }),
  end: () => set({ snapshot: null, minimized: false, focus: null, guideChapter: null, guideProbe: null }),
  setFocus: (f) => set({ focus: f }),
  setGuideProbe: (p) => set((s) => (s.guideProbe === p ? s : { guideProbe: p })),
  setGuideChapter: (g) => set((s) => {
    // Évite les updates inutiles (même valeur).
    if (s.guideChapter?.caseId === g?.caseId && s.guideChapter?.part === g?.part && s.guideChapter?.chapterId === g?.chapterId) return s;
    return { guideChapter: g };
  }),
}));
