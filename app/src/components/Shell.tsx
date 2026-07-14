import { useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { Icon } from './icons';
import { GlossaryDrawer } from './GlossaryDrawer';
import { ReflexMemo } from './ReflexMemo';
import { Doctopus } from './Doctopus';
import { ResumeSessionBar } from './ResumeSessionBar';
import { SelectionExplainer } from './SelectionExplainer';

// Barre latérale PLATE (horizontalité : pas d'arbre profond). Toujours visible,
// contexte conservé. Panneaux et modales par-dessus plutôt que pages empilées.
// La palette ⌘K double chaque destination au clavier (NAV partagé, ./nav).
import { NAV } from './nav';
import { CommandPalette } from './CommandPalette';

export function Shell() {
  const { theme, toggleTheme, targetCenter, setTargetCenter } = useUi();
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
      {/* Sidebar */}
      <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white/85 backdrop-blur md:w-60 dark:border-ink-600 dark:bg-ink-800/85">
        {/* Wordmark — marque « instrument » : mark ECG (pouls coral) + display + mono */}
        <div className="flex h-16 items-center gap-2.5 px-4">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12h3.5l1.8-6 3 12 2.2-8 1.5 4H21" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-line rounded-full bg-signal-400 ring-2 ring-white dark:ring-ink-800" />
          </span>
          <div className="hidden leading-none md:block">
            <div className="font-display text-[15px] font-bold tracking-tightish text-slate-900 dark:text-white">FSP<span className="text-brand-600 dark:text-brand-300">·Cockpit</span></div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Fachsprachprüfung</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Indicateur actif — barre d'accent latérale (pattern nav premium) */}
                  <span className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-500 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                  <Icon name={n.icon} className="h-[22px] w-[22px] shrink-0" title={n.label} />
                  <span className="hidden md:inline">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-2 dark:border-ink-600">
          <div className="hidden md:block">
            <label className="label px-1">Centre visé</label>
            <select value={targetCenter} onChange={(e) => setTargetCenter(e.target.value as never)} className="input mt-1 py-1.5 text-xs">
              <option value="Alle">Tous les centres</option>
              <option>Freiburg</option>
              <option>Karlsruhe</option>
              <option>Reutlingen</option>
              <option>Stuttgart</option>
            </select>
          </div>
          <button onClick={toggleTheme} className="btn-ghost w-full justify-center md:justify-start">
            <Icon name={theme === 'dark' ? 'nav-sun' : 'nav-moon'} className="h-[18px] w-[18px]" title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} />
            <span className="hidden md:inline">{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          {/* Voyant d'état — readout d'instrument (renforce l'offline-first) */}
          <div className="hidden items-center gap-2 px-2 pt-0.5 md:flex">
            <span className="h-1.5 w-1.5 animate-pulse-line rounded-full bg-brand-500" />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">Offline · Local</span>
          </div>
        </div>
      </aside>

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
      {/* Mémo de réflexes d'examen (flottant, partout) */}
      <ReflexMemo />
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
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-paper/80 px-4 py-2 backdrop-blur-md md:px-8 dark:border-ink-600 dark:bg-ink/80">
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
