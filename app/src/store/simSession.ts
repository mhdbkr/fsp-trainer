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
  startedAt: number;
}

interface SimSessionStore {
  snapshot: SessionSnapshot | null;
  minimized: boolean;                 // true = session en pause, hors du Runner
  sync: (s: Omit<SessionSnapshot, 'startedAt'>) => void; // miroir depuis le Runner
  minimize: () => void;               // quitter en gardant la session
  resume: () => void;                 // reprendre (on rentre dans le Runner)
  end: () => void;                    // terminer / abandonner → efface
}

export const useSimSession = create<SimSessionStore>((set, get) => ({
  snapshot: null,
  minimized: false,
  sync: (s) => {
    const prev = get().snapshot;
    // startedAt fixé une fois, tant qu'on reste sur le même cas.
    const startedAt = prev && prev.caseId === s.caseId ? prev.startedAt : Date.now();
    set({ snapshot: { ...s, startedAt } });
  },
  minimize: () => { if (get().snapshot) set({ minimized: true }); },
  resume: () => set({ minimized: false }),
  end: () => set({ snapshot: null, minimized: false }),
}));
