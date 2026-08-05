import { useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { Icon } from './icons';
import { GlossaryDrawer } from './GlossaryDrawer';
import { Doctopus } from './Doctopus';
import { ResumeSessionBar } from './ResumeSessionBar';
import { SelectionExplainer } from './SelectionExplainer';

// Barre latérale déportée dans ./Sidebar (modes déployé / dock immersif).
// La palette ⌘K double chaque destination au clavier (NAV partagé, ./nav).
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';

export function Shell() {
  const setAtPageBottom = useUi((s) => s.setAtPageBottom);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  // Détecte l'arrivée en bas de page pour masquer les barres flottantes.
  const onMainScroll = () => {
    const el = mainRef.current;
    if (!el) return;
    setAtPageBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  };

  return (
    <div className="flex h-full">
      <Sidebar />

      {/* Contenu */}
      <main ref={mainRef} onScroll={onMainScroll} className="flex-1 overflow-y-auto">
        <TopBar />
        <div key={pathname} className="reveal mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Palette de commandes ⌘K — navigation instantanée */}
      <CommandPalette />
      {/* Panneau glossaire global */}
      <GlossaryDrawer />
      {/* Doctopus — assistant IA (flottant, partout) */}
      <Doctopus />
      {/* Quick-search : bulle d'explication sur sélection de texte */}
      <SelectionExplainer />
      {/* Barre « reprendre » d'une simulation en pause */}
      <ResumeSessionBar />
    </div>
  );
}

// Barre de navigation supérieure : retour / avancer + accueil (sur toutes les
// pages sauf l'accueil), pour une navigation fluide entre les pages.
const SECTION_LABELS: Record<string, string> = {
  programme: 'Programme', cas: 'Cas cliniques', simulation: 'Simulation', fachwissen: 'Fachwissen',
  guides: 'Guides', aufklaerung: 'Aufklärung', fachbegriffe: 'Fachbegriffe', stats: 'Stats',
};
function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const section = pathname.split('/')[1] ?? '';
  return (
    <div className="glass glass-edge sticky top-0 z-20 border-x-0 border-t-0 px-4 py-2 md:px-8">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <button onClick={() => navigate(-1)} title="Page précédente" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 active:scale-95 dark:border-ink-600 dark:text-slate-300">← Retour</button>
        <button onClick={() => navigate(1)} title="Page suivante" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-400 active:scale-95 dark:border-ink-600">→</button>
        <button onClick={() => navigate('/')} title="Accueil" className="flex items-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 active:scale-95 dark:border-ink-600"><Icon name="nav-home" className="h-4 w-4" title="Accueil" /></button>
        {SECTION_LABELS[section] && <span className="ml-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">{SECTION_LABELS[section]}</span>}
        <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          title="Palette de commandes (⌘K)"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 active:scale-95 dark:border-ink-600">
          <Icon name="search" className="h-3.5 w-3.5" /><span className="hidden sm:inline">Aller à…</span><span className="kbd">⌘K</span>
        </button>
      </div>
    </div>
  );
}
