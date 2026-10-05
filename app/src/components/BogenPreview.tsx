import { useState } from 'react';
import type { BogenNotes, MusterArt, MusterCity } from '@/db/types';
import { MUSTER_BOGEN, autresNotes, bogenKeysOf, bogenRubrik, musterArt } from '@/data/guides/musterBogen';
import { Icon } from '@/components/icons';

// ============================================================================
// Aperçu (lecture seule) des notes d'anamnèse (Antwortbogen) — réutilisé en
// Dokumentation ET Fallvorstellung pour garder les notes sous les yeux.
// Réductible et, en `sticky`, suit le défilement de la page.
//
// [S4] INV-74 : l'aperçu rend TOUTE note non vide, pas seulement les rubriques du
// Muster courant — une note `allergien` d'une simulation « Stuttgart », lue en
// « libre », ne disparaît pas. Les rubriques du Muster d'abord, dans son ordre,
// puis les autres, libellées par la feuille de ville d'origine (simulation-run.md §10.6).
// ============================================================================
export function BogenPreview({ bogen, muster, title = 'Notes de l\'anamnèse', sticky = false }: {
  bogen: BogenNotes; muster?: MusterArt | MusterCity; title?: string; sticky?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const spec = MUSTER_BOGEN[musterArt(muster)];
  const cles = [...bogenKeysOf(spec).filter((k) => !!bogen[k]?.trim()), ...autresNotes(bogen, spec)];

  return (
    <div className={`card overflow-hidden text-sm ${sticky ? 'lg:sticky lg:top-24' : ''}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span className="flex items-center gap-1.5 font-medium"><Icon name="id" className="h-4 w-4 text-brand-500" />{title} <span className="text-[11px] text-slate-400">· Muster {spec.name}</span></span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {cles.length === 0 ? (
            <p className="text-xs text-slate-400">Aucune note d'anamnèse pour l'instant.</p>
          ) : (
            <dl className="space-y-1.5">
              {cles.map((k) => {
                const r = bogenRubrik(k, spec);
                return (
                  <div key={k} className="flex gap-2">
                    <dt className="flex w-28 shrink-0 items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Icon name={r.icon} className="h-3.5 w-3.5 text-brand-500" />{r.label}
                    </dt>
                    <dd className="flex-1 whitespace-pre-line text-[13px]">{bogen[k]}</dd>
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
