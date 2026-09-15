import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { Icon } from './icons';
import { NAV } from './nav';
import { ProfileSwitcher } from './ProfileSwitcher';
import { Portal } from './Portal';
import { useSession } from '@/lib/auth/session';

// Import PARESSEUX délibéré : three.js + @react-three/fiber + drei pèsent à
// eux seuls ~900 Ko gzippés. En import statique, ce poids rejoint le bundle
// PRINCIPAL et se télécharge à CHAQUE ouverture de l'app — inacceptable pour
// un outil local-first pensé pour tourner hors-ligne. En lazy(), ce chunk
// n'est récupéré que si quelqu'un clique réellement sur l'essai.
const FluidGlassBar = lazy(() => import('./FluidGlassBar').then((m) => ({ default: m.FluidGlassBar })));

// ============================================================================
// Barre latérale — deux modes (persistés dans le store UI) :
//  • 'full' : déployée, labels visibles (défaut) + bouton « réduire ».
//  • 'dock' : immersive. La barre disparaît, l'écran respire ; un dock d'icônes
//    façon macOS surgit au bord gauche au survol, avec magnification à la
//    proximité du curseur (désactivée si prefers-reduced-motion).
// Raccourci ⌘B / Ctrl+B partout pour basculer.
// ============================================================================

const CENTERS = ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'] as const;

export function Sidebar() {
  const sidebarMode = useUi((s) => s.sidebarMode);
  const setSidebarMode = useUi((s) => s.setSidebarMode);
  const toggleSidebar = useUi((s) => s.toggleSidebar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleSidebar(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  return sidebarMode === 'dock'
    ? <DockRail onExpand={() => setSidebarMode('full')} />
    : <FullSidebar onCollapse={() => setSidebarMode('dock')} />;
}

// Marque réutilisable (mark pieuvre sur verre pétrole + pouls coral).
function BrandMark({ size = 'h-9 w-9', icon = 'h-[22px] w-[22px]', ring = 'ring-white dark:ring-ink-800' }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm ring-1 ring-white/15 ${size}`}>
      <span className="pointer-events-none absolute inset-0 rounded-[11px] bg-gradient-to-b from-white/25 to-transparent" />
      <Icon name="doctopus" className={`relative ${icon}`} />
      <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-line rounded-full bg-signal-400 ring-2 ${ring}`} />
    </span>
  );
}

// Entrée « Compte » / « Se connecter » — lien vers /onboarding tant que /account
// n'existe pas (Task 18).
function AccountLink({ dock = false }: { dock?: boolean }) {
  const status = useSession((s) => s.status);
  const authed = status === 'authenticated';
  const to = authed ? '/onboarding' : '/signin';
  const label = authed ? 'Compte' : 'Se connecter';
  if (dock) {
    return (
      <NavLink to={to} title={label}
        className="group relative grid h-11 w-11 place-items-center rounded-2xl text-slate-500 transition-colors duration-100 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
        <Icon name="user" className="h-[19px] w-[19px]" />
        <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-ink-600">{label}</span>
      </NavLink>
    );
  }
  return (
    <NavLink to={to} className="btn-ghost w-full justify-center md:justify-start">
      <Icon name="user" className="h-[18px] w-[18px]" title={label} />
      <span className="hidden md:inline">{label}</span>
    </NavLink>
  );
}

// ── Mode déployé ────────────────────────────────────────────────────────────
function FullSidebar({ onCollapse }: { onCollapse: () => void }) {
  const { theme, toggleTheme, targetCenter, setTargetCenter } = useUi();
  // Essai ISOLÉ et RÉVERSIBLE (composant React Bits « FluidGlass », mode
  // « bar ») : état purement local, non persisté — s'éteint à chaque
  // rechargement. La sidebar réelle (ci-dessous) reste toujours montée et
  // fonctionnelle ; la barre de verre flotte simplement par-dessus.
  const [fluidNavTrial, setFluidNavTrial] = useState(false);
  return (
    <aside className="glass glass-edge flex w-16 shrink-0 flex-col border-y-0 border-l-0 md:w-60">
      <div className="flex h-16 items-center gap-2.5 px-4">
        <BrandMark />
        <div className="hidden leading-none md:block">
          <div className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-signal-500 dark:text-signal-400">Doctopus</div>
          <div className="mt-1 font-display text-[15px] font-bold tracking-tightish text-slate-900 dark:text-white">FSP<span className="text-brand-600 dark:text-brand-300">·Cockpit</span></div>
        </div>
        {/* Réduire → mode immersif (dock). Discret, à droite du wordmark. */}
        <button onClick={onCollapse} title="Réduire la barre (⌘B)" aria-label="Réduire la barre latérale"
          className="ml-auto hidden h-7 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 md:grid dark:hover:bg-white/10">
          <Icon name="chevron" className="h-4 w-4 rotate-180" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              }`}>
            {({ isActive }) => (
              <>
                <span className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-500 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                <Icon name={n.icon} className="h-[22px] w-[22px] shrink-0" title={n.label} />
                <span className="hidden md:inline">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-100 p-2 dark:border-ink-600">
        <div className="hidden md:block"><ProfileSwitcher variant="full" /></div>
        <div className="hidden md:block">
          <label className="label px-1">Centre visé</label>
          <select value={targetCenter} onChange={(e) => setTargetCenter(e.target.value as never)} className="input mt-1 py-1.5 text-xs">
            <option value="Alle">Tous les centres</option>
            {CENTERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={toggleTheme} className="btn-ghost w-full justify-center md:justify-start">
          <Icon name={theme === 'dark' ? 'nav-sun' : 'nav-moon'} className="h-[18px] w-[18px]" title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} />
          <span className="hidden md:inline">{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
        </button>
        <AccountLink />
        <div className="hidden items-center gap-2 px-2 pt-0.5 md:flex">
          <span className="h-1.5 w-1.5 animate-pulse-line rounded-full bg-brand-500" />
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">Offline · Local</span>
        </div>
        {/* Essai FluidGlass — visuel uniquement, sans impact sur la nav réelle
            au-dessus (jamais démontée). Voir FluidGlassBar.tsx pour le détail
            des écarts assumés par rapport au composant React Bits source. */}
        <button onClick={() => setFluidNavTrial((v) => !v)}
          title="Essai visuel : barre de navigation en verre 3D (React Bits, adapté)"
          className={`btn-ghost w-full justify-center text-[11px] md:justify-start ${fluidNavTrial ? 'text-brand-600 dark:text-brand-300' : ''}`}>
          <Icon name="spark" className="h-[15px] w-[15px]" />
          <span className="hidden md:inline">{fluidNavTrial ? 'Essai FluidGlass actif' : 'Essai FluidGlass (verre 3D)'}</span>
        </button>
      </div>

      {fluidNavTrial && (
        // Portal indispensable : <aside> porte `.glass` (backdrop-filter), qui
        // — comme `transform` — crée un containing block pour les descendants
        // `position: fixed`. Sans lui, la barre se cale sur la largeur de la
        // sidebar au lieu du viewport entier (constaté à l'écran : 175px au
        // lieu de la pleine largeur). Voir Portal.tsx pour ce même piège déjà
        // documenté ailleurs dans l'app.
        <Portal>
          <Suspense fallback={null}>
            <FluidGlassBar items={NAV} onExit={() => setFluidNavTrial(false)} />
          </Suspense>
        </Portal>
      )}
    </aside>
  );
}

// ── Mode immersif : dock magnétique ─────────────────────────────────────────
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function DockRail({ onExpand }: { onExpand: () => void }) {
  const { theme, toggleTheme } = useUi();
  const [revealed, setRevealed] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const centersRef = useRef<number[]>([]);
  // Une échelle par « slot » du dock (logo + 9 nav + thème + déployer).
  const slots = NAV.length + 3;
  const [scales, setScales] = useState<number[]>(() => Array(slots).fill(1));

  const captureCenters = useCallback(() => {
    const els = railRef.current?.querySelectorAll('[data-dock-slot]');
    centersRef.current = els ? [...els].map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; }) : [];
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(captureCenters, 60); // après l'anim d'entrée
    window.addEventListener('resize', captureCenters);
    return () => { clearTimeout(t); window.removeEventListener('resize', captureCenters); };
  }, [revealed, captureCenters]);

  const onMove = (e: React.MouseEvent) => {
    if (reduceMotion() || !centersRef.current.length) return;
    const y = e.clientY;
    setScales(centersRef.current.map((c) => 1 + 0.42 * Math.exp(-(((y - c) / 62) ** 2))));
  };
  const reset = () => { setRevealed(false); setScales(Array(slots).fill(1)); };
  const tile = (i: number) => ({ transform: `scale(${scales[i] ?? 1})`, transformOrigin: 'left center' as const });

  return (
    <div
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={reset}
      onMouseMove={onMove}
      className={`fixed left-0 top-0 z-40 h-full ${revealed ? 'w-[92px]' : 'w-3'}`}
    >
      {/* Poignée discrète quand replié — invite au survol */}
      {!revealed && <div className="pointer-events-none absolute left-0 top-1/2 h-16 w-1 -translate-y-1/2 rounded-r-full bg-brand-500/40 transition-opacity" />}

      <div ref={railRef}
        className={`glass glass-edge absolute bottom-3 left-2 top-3 flex flex-col items-center gap-1.5 rounded-3xl p-2 transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${revealed ? 'translate-x-0 opacity-100' : '-translate-x-[130%] opacity-0'}`}>
        {/* Logo en chapeau — déploie au clic */}
        <button data-dock-slot onClick={onExpand} title="Déployer la barre (⌘B)" style={tile(0)} className="transition-transform duration-100">
          <BrandMark size="h-11 w-11" icon="h-6 w-6" ring="ring-white/70 dark:ring-ink-800" />
        </button>

        <ProfileSwitcher variant="dock" />
        <AccountLink dock />

        <div className="my-1 h-px w-8 shrink-0 bg-slate-200/70 dark:bg-white/10" />

        <nav className="flex flex-1 flex-col items-center gap-1.5">
          {NAV.map((n, i) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.label} data-dock-slot style={tile(i + 1)}
              className={({ isActive }) =>
                `group relative grid h-11 w-11 place-items-center rounded-2xl transition-[transform,background-color,color] duration-100 ${
                  isActive
                    ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md ring-1 ring-white/15'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                }`}>
              <Icon name={n.icon} className="h-[22px] w-[22px]" />
              {/* Étiquette au survol (à droite, hors du dock) */}
              <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-ink-600">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="my-1 h-px w-8 shrink-0 bg-slate-200/70 dark:bg-white/10" />

        <button data-dock-slot onClick={toggleTheme} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'} style={tile(slots - 2)}
          className="grid h-11 w-11 place-items-center rounded-2xl text-slate-500 transition-[transform,background-color,color] duration-100 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
          <Icon name={theme === 'dark' ? 'nav-sun' : 'nav-moon'} className="h-[19px] w-[19px]" />
        </button>
        <button data-dock-slot onClick={onExpand} title="Déployer la barre (⌘B)" style={tile(slots - 1)}
          className="grid h-11 w-11 place-items-center rounded-2xl text-slate-500 transition-[transform,background-color,color] duration-100 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
          <Icon name="chevron" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
