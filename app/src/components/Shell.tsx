import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { GlossaryDrawer } from './GlossaryDrawer';
import { ReflexMemo } from './ReflexMemo';
import { Doctopus } from './Doctopus';
import { ResumeSessionBar } from './ResumeSessionBar';

// Barre latérale PLATE (horizontalité : pas d'arbre profond). Toujours visible,
// contexte conservé. Panneaux et modales par-dessus plutôt que pages empilées.
const NAV: { to: string; label: string; icon: string }[] = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/programme', label: 'Programme', icon: '🗓️' },
  { to: '/cas', label: 'Cas cliniques', icon: '🗂️' },
  { to: '/simulation', label: 'Simulation', icon: '🎬' },
  { to: '/fachwissen', label: 'Fachwissen', icon: '📚' },
  { to: '/guides', label: 'Guides', icon: '🧭' },
  { to: '/aufklaerung', label: 'Aufklärung', icon: '📋' },
  { to: '/fachbegriffe', label: 'Fachbegriffe', icon: '🔤' },
  { to: '/stats', label: 'Stats', icon: '📈' },
];

export function Shell() {
  const { theme, toggleTheme, targetCenter, setTargetCenter } = useUi();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur md:w-60 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">FS</div>
          <div className="hidden md:block">
            <div className="text-sm font-bold leading-tight">FSP-Cockpit</div>
            <div className="text-[11px] text-slate-400">Baden · Medizin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <span className="text-lg">{n.icon}</span>
              <span className="hidden md:inline">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-2 dark:border-slate-800">
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
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="hidden md:inline">{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto">
        <TopBar />
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Panneau glossaire global */}
      <GlossaryDrawer />
      {/* Mémo de réflexes d'examen (flottant, partout) */}
      <ReflexMemo />
      {/* Doctopus — assistant IA (flottant, partout) */}
      <Doctopus />
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
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/85 px-4 py-2 backdrop-blur md:px-8 dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <button onClick={() => navigate(-1)} title="Page précédente" className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300">← Retour</button>
        <button onClick={() => navigate(1)} title="Page suivante" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-400 dark:border-slate-700">→</button>
        <button onClick={() => navigate('/')} title="Accueil" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-400 dark:border-slate-700">🏠</button>
        {SECTION_LABELS[section] && <span className="ml-1 text-xs text-slate-400">{SECTION_LABELS[section]}</span>}
      </div>
    </div>
  );
}
