import { create } from 'zustand';
import type { Fachbegriff, Center, SimRole, AssistanceMode, MusterCity, Layer } from '@/db/types';

// ============================================================================
// État global léger (Zustand). UI-only : le contenu vit dans IndexedDB.
// ============================================================================
interface UiState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (t: 'light' | 'dark') => void;

  // Panneau glossaire latéral (aperçu d'un Fachbegriff cliqué n'importe où).
  glossaryTerm: Fachbegriff | null;
  openGlossary: (fb: Fachbegriff) => void;
  closeGlossary: () => void;

  // Panneau aperçu de cas (page Cas cliniques — sans quitter la liste).
  previewCaseId: string | null;
  openCasePreview: (id: string) => void;
  closeCasePreview: () => void;

  // Contexte de préparation global.
  targetCenter: Center | 'Alle';
  setTargetCenter: (c: Center | 'Alle') => void;
  role: SimRole;
  setRole: (r: SimRole) => void;

  // Réglages de simulation (Itération 2).
  assistance: AssistanceMode;
  setAssistance: (a: AssistanceMode) => void;
  muster: MusterCity;
  setMuster: (m: MusterCity) => void;
  layer: Layer;
  setLayer: (l: Layer) => void;
}

function initialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('fsp-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(t: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', t === 'dark');
  localStorage.setItem('fsp-theme', t);
}

export const useUi = create<UiState>((set, get) => ({
  theme: initialTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
  setTheme: (t) => { applyTheme(t); set({ theme: t }); },

  glossaryTerm: null,
  openGlossary: (fb) => set({ glossaryTerm: fb }),
  closeGlossary: () => set({ glossaryTerm: null }),

  previewCaseId: null,
  openCasePreview: (id) => set({ previewCaseId: id }),
  closeCasePreview: () => set({ previewCaseId: null }),

  targetCenter: (localStorage.getItem('fsp-center') as Center | 'Alle') || 'Alle',
  setTargetCenter: (c) => { localStorage.setItem('fsp-center', c); set({ targetCenter: c }); },
  role: 'Candidat',
  setRole: (r) => set({ role: r }),

  assistance: (localStorage.getItem('fsp-assistance') as AssistanceMode) || 'assiste',
  setAssistance: (a) => { localStorage.setItem('fsp-assistance', a); set({ assistance: a }); },
  muster: (localStorage.getItem('fsp-muster') as MusterCity) || 'Standard',
  setMuster: (m) => { localStorage.setItem('fsp-muster', m); set({ muster: m }); },
  layer: (Number(localStorage.getItem('fsp-layer')) as Layer) || 1,
  setLayer: (l) => { localStorage.setItem('fsp-layer', String(l)); set({ layer: l }); },
}));

// Applique le thème au chargement du module.
applyTheme(initialTheme());
