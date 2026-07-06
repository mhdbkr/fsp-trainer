import { useState } from 'react';
import { Icon } from '@/components/icons';

// ============================================================================
// Panneau latéral RÉDUCTIBLE SUR LE CÔTÉ (pas en bas). Sticky : suit le
// défilement. Réduit → fine barre verticale avec titre pivoté + bouton pour
// ré-ouvrir. Utilisé pour le Muster-Bogen (Anamnese), le guide de rédaction
// (Dokumentation) et les notes (Fallvorstellung).
// Le parent doit être un flex container ; ce composant gère sa propre largeur.
// ============================================================================
export function SidePanel({ title, icon, children, defaultCollapsed = false, width = 'w-80' }: {
  title: string; icon: string; children: React.ReactNode; defaultCollapsed?: boolean; width?: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (collapsed) {
    return (
      <div className="shrink-0 self-start lg:sticky lg:top-24">
        <button onClick={() => setCollapsed(false)}
          title={`Ouvrir : ${title}`}
          className="flex h-full min-h-[8rem] w-10 flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-brand-600 transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-900/20">
          <Icon name={icon} className="h-5 w-5" />
          <span className="mt-1 [writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold tracking-wide">{title}</span>
          <span className="mt-auto text-slate-400">›</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`${width} shrink-0 self-start lg:sticky lg:top-24`}>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="flex items-center gap-1.5 text-sm font-semibold"><Icon name={icon} className="h-4 w-4 text-brand-500" />{title}</span>
          <button onClick={() => setCollapsed(true)} title="Réduire sur le côté" className="text-slate-400 hover:text-brand-500">‹</button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}
