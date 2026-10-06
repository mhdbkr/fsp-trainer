import { create } from 'zustand';
import type { Fachbegriff, Center, AssistanceMode, MusterArt, Layer, SimTeil } from '@/db/types';
import { musterArt } from '@/data/guides/musterBogen';

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

  // Hover-card ★ sur un terme auto-lié (survol desktop, tap mobile — F2b D2/D3).
  // `caseId` transite par le store : la carte est montée dans Shell, hors de
  // tout CaseContext.Provider (qui n'entoure que le contenu de page) — sans
  // ça, ★ ne porte jamais le caseId du cas où le terme a été survolé.
  hoverTerm: { fb: Fachbegriff; anchor: DOMRect; caseId: string | null } | null;
  openHover: (fb: Fachbegriff, anchor: DOMRect, caseId?: string | null) => void;
  closeHover: () => void;

  // Panneau aperçu de cas (page Cas cliniques — sans quitter la liste).
  previewCaseId: string | null;
  openCasePreview: (id: string) => void;
  closeCasePreview: () => void;

  // Doctopus (assistant IA) — ouverture pilotable depuis n'importe où (y compris
  // le mode focus). `doctopusPrefill` pré-remplit la question (quick-search).
  doctopusOpen: boolean;
  doctopusPrefill: string | null;
  openDoctopus: (prefill?: string) => void;
  closeDoctopus: () => void;

  // Vrai quand la zone de contenu est défilée près du bas — masque les barres
  // flottantes (ex. « reprendre la simulation ») pour ne pas couvrir le bas de page.
  atPageBottom: boolean;
  setAtPageBottom: (v: boolean) => void;

  // Barre latérale : 'full' = déployée (labels), 'dock' = immersive (masquée,
  // dock d'icônes révélé au bord gauche, façon macOS). Persisté.
  sidebarMode: 'full' | 'dock';
  setSidebarMode: (m: 'full' | 'dock') => void;
  toggleSidebar: () => void;

  // Contexte de préparation global.
  targetCenter: Center | 'Alle';
  setTargetCenter: (c: Center | 'Alle') => void;
  /** S4-5 : la spécialité ouverte en dernier dans la carte de couverture (Programme), retrouvée au retour. */
  specialiteOuverte: string | null;
  setSpecialiteOuverte: (s: string | null) => void;

  // Réglages de simulation (Itération 2).
  assistance: AssistanceMode;
  setAssistance: (a: AssistanceMode) => void;
  /** [S4] `guide` | `libre` (simulation-run.md §10.6). */
  muster: MusterArt;
  setMuster: (m: MusterArt) => void;
  layer: Layer;
  setLayer: (l: Layer) => void;

  // Feuille « Simuler avec ton IA » — id du cas ouvert, ou null si fermée.
  // Montée une fois dans Shell.tsx, ouverte depuis 4 points d'entrée.
  externalAiCaseId: string | null;
  /** Teil depuis lequel la feuille a ete ouverte — le choix « avec qui tu
   *  joues » ne configure pas, il ENTRE dans la simulation au Teil voulu
   *  (contrat `ai-bridge.md`). Absent = point d'entree hors partie. */
  externalAiTeil: SimTeil | null;
  openExternalAi: (caseId: string, teil?: SimTeil) => void;
  closeExternalAi: () => void;
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

  hoverTerm: null,
  openHover: (fb, anchor, caseId) => set({ hoverTerm: { fb, anchor, caseId: caseId ?? null } }),
  closeHover: () => set({ hoverTerm: null }),

  previewCaseId: null,
  openCasePreview: (id) => set({ previewCaseId: id }),
  closeCasePreview: () => set({ previewCaseId: null }),

  doctopusOpen: false,
  doctopusPrefill: null,
  openDoctopus: (prefill) => set({ doctopusOpen: true, doctopusPrefill: prefill ?? null }),
  closeDoctopus: () => set({ doctopusOpen: false, doctopusPrefill: null }),

  atPageBottom: false,
  setAtPageBottom: (v) => set((s) => (s.atPageBottom === v ? s : { atPageBottom: v })),

  sidebarMode: (localStorage.getItem('fsp-sidebar') as 'full' | 'dock') || 'full',
  setSidebarMode: (m) => { localStorage.setItem('fsp-sidebar', m); set({ sidebarMode: m }); },
  toggleSidebar: () => {
    const next = get().sidebarMode === 'full' ? 'dock' : 'full';
    localStorage.setItem('fsp-sidebar', next);
    set({ sidebarMode: next });
  },

  targetCenter: (localStorage.getItem('fsp-center') as Center | 'Alle') || 'Alle',
  setTargetCenter: (c) => { localStorage.setItem('fsp-center', c); set({ targetCenter: c }); },
  specialiteOuverte: localStorage.getItem('fsp-programme-specialite'),
  setSpecialiteOuverte: (s) => {
    try { if (s) localStorage.setItem('fsp-programme-specialite', s); else localStorage.removeItem('fsp-programme-specialite'); } catch { /* stockage indisponible : la mémoire reste en session */ }
    set({ specialiteOuverte: s });
  },

  assistance: (localStorage.getItem('fsp-assistance') as AssistanceMode) || 'assiste',
  setAssistance: (a) => { localStorage.setItem('fsp-assistance', a); set({ assistance: a }); },
  // [S4] Une ville mémorisée (série 3) se LIT par `musterArt()` ; elle n'est réécrite qu'au premier
  // `setMuster` — l'annonce unique (`annonceS4.ts`) lit encore la valeur brute (§10.6, §10.7).
  muster: musterArt(localStorage.getItem('fsp-muster')),
  setMuster: (m) => { localStorage.setItem('fsp-muster', m); set({ muster: m }); },
  layer: (Number(localStorage.getItem('fsp-layer')) as Layer) || 1,
  setLayer: (l) => { localStorage.setItem('fsp-layer', String(l)); set({ layer: l }); },

  externalAiCaseId: null,
  externalAiTeil: null,
  openExternalAi: (caseId, teil) => set({ externalAiCaseId: caseId, externalAiTeil: teil ?? null }),
  closeExternalAi: () => set({ externalAiCaseId: null, externalAiTeil: null }),
}));

// Applique le thème au chargement du module.
applyTheme(initialTheme());
