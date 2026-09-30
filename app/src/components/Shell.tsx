import { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { Icon } from './icons';
import { GlossaryDrawer } from './GlossaryDrawer';
import { TermHoverCard } from './TermHoverCard';
import { ExternalAiSheet } from '@/features/simulation/ExternalAiSheet';
import { Doctopus } from './Doctopus';
import { ResumeSessionBar } from './ResumeSessionBar';
import { SelectionExplainer } from './SelectionExplainer';
import { CardToast } from './CardToast';

// Barre latérale déportée dans ./Sidebar (modes déployé / dock immersif).
// La palette ⌘K double chaque destination au clavier (NAV partagé, ./nav).
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';

/** Bas de page : seulement si la zone défile réellement, et à < 120 px du bas. */
export function isAtBottom(el: { scrollHeight: number; scrollTop: number; clientHeight: number }): boolean {
  return el.scrollHeight > el.clientHeight && el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

export function Shell() {
  const setAtPageBottom = useUi((s) => s.setAtPageBottom);
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  // Détecte l'arrivée en bas de page pour masquer les barres flottantes.
  // Une page SANS défilement n'est jamais « en bas » (sinon la formule vaut
  // vrai par construction et la barre « Reprendre » disparaît sur l'accueil du
  // drill — revue de branche F2b, I1).
  const onMainScroll = () => {
    const el = mainRef.current;
    if (!el) return;
    setAtPageBottom(isAtBottom(el));
  };
  // Changement de page : l'état de défilement de la page précédente ne doit
  // pas masquer la barre sur la nouvelle (recalcul après rendu).
  useEffect(() => {
    setAtPageBottom(false);
    const el = mainRef.current;
    if (el) setAtPageBottom(isAtBottom(el));
  }, [pathname, setAtPageBottom]);

  return (
    <div className="flex h-full">
      <Sidebar />

      {/* Contenu */}
      {/* TRANSITION DE PAGE (s3-primitives T5). Il n'y a plus ni `key={pathname}`
          ni `.reveal` ici : c'était un remontage forcé, pas une transition — il
          jetait l'état local (défilement, accordéons, brouillons non persistés)
          et relançait tous les `useEffect`, requêtes Dexie comprises ; et son
          `transform` faisait du wrapper un containing block pour tout
          `position: fixed` descendant (la dette <Portal>, index.css).
          À la place : `view-transition-name` + `viewTransition` sur les liens de
          navigation. Le navigateur garde la page sortante à l'écran pendant que
          l'entrante monte — il y a enfin un état de sortie, pour zéro octet de
          dépendance. Les règles ::view-transition-* et leur neutralisation sous
          `prefers-reduced-motion` sont dans index.css.
          Le nom n'est posé que PENDANT la transition (`.vt-page`, index.css) :
          porté en permanence, il faisait du wrapper une « backdrop root » et
          aucune `.card` ne floutait plus le fond (fix-s3 B1). */}
      <main ref={mainRef} onScroll={onMainScroll} className="flex-1 overflow-y-auto">
        <TopBar />
        <div className="vt-page mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Palette de commandes ⌘K — navigation instantanée */}
      <CommandPalette />
      {/* Panneau glossaire global */}
      <GlossaryDrawer />
      {/* Hover-card ★ sur tout terme auto-lié (F2b) */}
      <TermHoverCard />
      {/* Feuille « Simuler avec ton IA » — 4 points d'entrée */}
      <ExternalAiSheet />
      {/* Doctopus — assistant IA (flottant, partout) */}
      <Doctopus />
      {/* Quick-search : bulle d'explication sur sélection de texte */}
      <SelectionExplainer />
      {/* Confirmation d'une carte : rangée (miniature, deck) ou supprimée (Annuler) — F4a */}
      <CardToast />
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
    /* `app-chrome` : la barre ne participe pas à la transition (index.css) —
       ce qui est stable à l'écran doit le rester, sinon la navigation
       clignote en entier au lieu de changer de contenu. */
    <div style={{ viewTransitionName: 'app-chrome' }} className="glass glass-edge sticky top-0 z-20 border-x-0 border-t-0 px-4 py-2 md:px-8">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        {/* `navigate(delta)` n'accepte pas d'options dans React Router 6 : retour et
            avancer restent instantanés. Limite du routeur, pas un oubli. */}
        <button onClick={() => navigate(-1)} title="Page précédente" className="btn-outline gap-1 px-2.5 py-1.5 text-xs hover:text-brand-600">← Retour</button>
        <button onClick={() => navigate(1)} title="Page suivante" className="btn-outline px-2 py-1.5 text-xs">→</button>
        <button onClick={() => navigate('/', { viewTransition: true })} title="Accueil" className="btn-outline px-2 py-1.5 hover:text-brand-600"><Icon name="nav-home" className="h-4 w-4" title="Accueil" /></button>
        {SECTION_LABELS[section] && <span className="ml-1 text-[11px] font-semibold text-slate-400">{SECTION_LABELS[section]}</span>}
        <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          title="Palette de commandes (⌘K)"
          className="btn-outline ml-auto gap-1.5 px-2.5 py-1.5 text-xs hover:text-brand-600">
          <Icon name="search" className="h-3.5 w-3.5" /><span className="hidden sm:inline">Aller à…</span><span className="kbd">⌘K</span>
        </button>
      </div>
    </div>
  );
}
