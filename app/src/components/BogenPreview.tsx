import { useState } from 'react';
import type { BogenNotes, MusterCity } from '@/db/types';
import { MUSTER_BOGEN } from '@/data/guides/musterBogen';
import { Icon } from '@/components/icons';

// ============================================================================
// Aperçu (lecture seule) des notes d'anamnèse (Antwortbogen) — réutilisé en
// Dokumentation ET Fallvorstellung pour garder les notes sous les yeux.
// Réductible et, en `sticky`, suit le défilement de la page.
// ============================================================================
export function BogenPreview({ bogen, muster, title = 'Notes de l\'anamnèse', sticky = false }: {
  bogen: BogenNotes; muster: MusterCity; title?: string; sticky?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const spec = MUSTER_BOGEN[muster];
  const value = (key: string) => bogen[key] || Object.keys(bogen).filter((k) => k.startsWith(key + '.')).map((k) => bogen[k]).filter(Boolean).join(' · ');
  const empty = Object.values(bogen).every((v) => !v);

  return (
    <div className={`card overflow-hidden text-sm ${sticky ? 'lg:sticky lg:top-24' : ''}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span className="flex items-center gap-1.5 font-medium"><Icon name="id" className="h-4 w-4 text-brand-500" />{title} <span className="text-[11px] text-slate-400">· {spec.city}</span></span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {empty ? (
            <p className="text-xs text-slate-400">Aucune note saisie pendant l'anamnèse. Reviens à la partie Anamnese pour remplir le Bogen — il te sert de base ici.</p>
          ) : (
            <dl className="space-y-1.5">
              {spec.fields.map((f) => {
                const v = value(f.key);
                if (!v) return null;
                return (
                  <div key={f.key} className="flex gap-2">
                    <dt className="flex w-28 shrink-0 items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Icon name={f.icon} className="h-3.5 w-3.5 text-brand-500" />{f.label}
                    </dt>
                    <dd className="flex-1 text-[13px]">{v}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
