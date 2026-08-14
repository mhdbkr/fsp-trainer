import { useState } from 'react';
import { Icon } from '@/components/icons';

// ============================================================================
// Panneau latéral RÉDUCTIBLE SUR LE CÔTÉ (pas en bas). Sticky : suit le
// défilement. Réduit → fine barre verticale avec titre pivoté + bouton pour
// ré-ouvrir. Utilisé pour le Muster-Bogen (Anamnese), le guide de rédaction
// (Dokumentation) et les notes (Fallvorstellung).
// Le parent doit être un flex container ; ce composant gère sa propre largeur.
//
// POSITIONNEMENT : le décalage haut et la hauteur utile viennent de la variable
// CSS `--panel-offset`, publiée par l'écran qui héberge le panneau (la
// simulation y met la hauteur réelle de son en-tête collant). Sans elle, un
// `top` codé en dur faisait passer le panneau SOUS l'en-tête au défilement.
// Repli à 7rem pour les écrans qui ne définissent pas la variable.
//
// OUVERTURE / FERMETURE : les deux états sont montés en permanence et empilés
// au même endroit — c'est la largeur qui s'anime et les contenus qui se
// croisent en fondu. Un simple échange de rendu (ancien comportement) donnait
// un saut sec, sans transition possible.
// ============================================================================
export function SidePanel({ title, icon, children, defaultCollapsed = false, width = 'w-80', sticky = true, collapsed: collapsedProp, onToggle }: {
  title: string; icon: string; children: React.ReactNode; defaultCollapsed?: boolean; width?: string; sticky?: boolean;
  collapsed?: boolean; onToggle?: () => void;
}) {
  const [internal, setInternal] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? internal;
  const toggle = onToggle ?? (() => setInternal((v) => !v));
  const stick = sticky ? 'self-start lg:sticky lg:top-[var(--panel-offset,7rem)]' : '';

  return (
    // Une SEULE classe de largeur à la fois : `w-full` et `w-80` sont deux
    // utilitaires `width`, les cumuler laisse l'ordre du CSS trancher (et
    // écrasait ici la largeur fixe, ce qui poussait la colonne voisine hors
    // écran).
    <div className={`shrink-0 overflow-hidden transition-[width] duration-500 ease-fluid ${collapsed ? 'w-full lg:w-11' : width} ${stick}`}>
      <div className="relative">
        {/* État replié — rail vertical */}
        <button
          onClick={toggle}
          title={`Ouvrir : ${title}`}
          aria-hidden={!collapsed}
          className={`flex min-h-[3rem] w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-brand-600 transition-[opacity,color,background-color,border-color] duration-300 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-900/20 lg:min-h-[8rem] lg:w-11 lg:flex-col lg:py-3 ${
            collapsed ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
          }`}
        >
          <Icon name={icon} className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap text-[11px] font-semibold tracking-wide lg:mt-1 lg:[writing-mode:vertical-rl] lg:rotate-180">{title}</span>
          <span className="ml-auto text-slate-400 lg:ml-0 lg:mt-auto">›</span>
        </button>

        {/* État déplié — carte complète */}
        <div
          aria-hidden={collapsed}
          className={`transition-opacity duration-300 ${collapsed ? 'pointer-events-none absolute inset-0 opacity-0' : 'opacity-100'}`}
        >
          <div className={`card overflow-hidden ${width}`}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold"><Icon name={icon} className="h-4 w-4 text-brand-500" />{title}</span>
              <button onClick={toggle} title="Réduire sur le côté" className="rounded px-1 text-slate-400 transition-colors hover:text-brand-500">‹</button>
            </div>
            <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - var(--panel-offset, 7rem) - 2.5rem)' }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
