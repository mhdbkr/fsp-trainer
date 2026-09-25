// ============================================================================
// Double registre (F3 §3.3) — un SEUL composant pour carte, fiche, liste,
// panneau du cas, dos du drill. Deux colonnes Vorstellung / Anamnese (une
// colonne sous 360 px), parole patient au-dessus. Sans registre : la
// définition simple est honnêtement nommée « Reformulation » (D6).
// ============================================================================
import type { Fachbegriff } from '@/db/types';

type T = Pick<Fachbegriff, 'translationSimple' | 'register'>;
export const registerLine = (t: T): string => t.register?.patient ?? t.translationSimple;

export function TermRegister({ term, variant = 'full', narrow = false }: { term: T; variant?: 'full' | 'line'; narrow?: boolean }) {
  const r = term.register;
  if (!r) {
    return (
      <p className="text-xs text-slate-600 dark:text-slate-300">
        <span className="label mr-1">Reformulation</span>· {term.translationSimple}
      </p>
    );
  }
  if (variant === 'line') return <span className="truncate text-xs text-slate-500 dark:text-slate-400">« {r.patient} »</span>;
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-slate-600 dark:text-slate-300"><span className="label mr-1">Patient</span>« {r.patient} »</p>
      <div className={`grid grid-cols-1 gap-2 ${narrow ? '' : 'min-[360px]:grid-cols-2'}`}>
        <div className="min-w-0 rounded-lg bg-slate-50 p-2 dark:bg-white/5">
          <div className="label">Vorstellung</div>
          <p className="break-words text-slate-700 dark:text-slate-200">{r.vorstellung}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-slate-50 p-2 dark:bg-white/5">
          <div className="label">Anamnese</div>
          <p className="break-words text-slate-700 dark:text-slate-200">{r.anamnese}</p>
        </div>
      </div>
    </div>
  );
}
