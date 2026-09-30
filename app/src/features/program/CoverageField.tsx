// ============================================================================
// Le champ de couverture — spécialités × Teile, qui se remplit (ADR-0020 §3).
//
// Ce qu'il remplace : la heatmap spécialité × axe, qui affichait CINQ FOIS la
// même valeur globale sur cinq spécialités en dur parmi dix-sept ; et les jauges
// « Où le plan met l'accent », dont l'explication décrivait un seuil binaire
// quand l'algorithme était continu.
//
// Ici, rien n'est inventé : chaque cellule compte des cas réels. `vierge` est
// en teinte NEUTRE — c'est « pas encore travaillé », jamais un défaut. Le champ
// ne peut pas accuser par absence.
// ============================================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Case, CaseProgress, SimTeil, Specialty } from '@/db/types';
import { cellOf, coverageField, suggestForCell } from '@/lib/program/coverage';
import { TEILE } from '@/lib/simScope';
import { Icon } from '@/components/icons';

const TONE: Record<'vierge' | 'entame' | 'solide', string> = {
  // Neutre : pas encore travaillé. Ni rouge, ni alarme.
  vierge: 'bg-slate-100 text-slate-400 dark:bg-ink-700 dark:text-slate-500',
  entame: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
  solide: 'bg-brand-600 text-white dark:bg-brand-500',
};

export function CoverageField({ cases, progress }: { cases: Case[]; progress: Map<string, CaseProgress> }) {
  const field = coverageField(cases, progress);
  const [picked, setPicked] = useState<{ specialty: Specialty; teil: SimTeil } | null>(null);
  const suggestion = picked ? suggestForCell(cases, progress, picked.specialty, picked.teil) : null;
  const teilLabel = (t: SimTeil) => TEILE.find((x) => x.key === t)!;

  if (!field.specialties.length) return null;

  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="nav-chart" className="h-5 w-5 text-brand-500" />
        <h2 className="font-semibold">Champ de couverture</h2>
      </div>
      <p className="mb-4 text-[11px] text-slate-400">
        Chaque case compte les cas de la spécialité dont cette partie est solide. Touche une case pour qu'on te propose l'exercice.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th />
              {field.teile.map((t) => (
                <th key={t} className="px-1 pb-1 text-center font-medium text-slate-500 dark:text-slate-400">{teilLabel(t).short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {field.specialties.map((sp) => (
              <tr key={sp}>
                <td className="whitespace-nowrap pr-2 text-left text-slate-500 dark:text-slate-400" title={sp}>{sp}</td>
                {field.teile.map((t) => {
                  const cell = cellOf(field, sp, t)!;
                  const on = picked?.specialty === sp && picked?.teil === t;
                  return (
                    <td key={t}>
                      <button
                        type="button"
                        onClick={() => setPicked(on ? null : { specialty: sp, teil: t })}
                        className={`h-8 w-full rounded tnum transition-transform hover:scale-[1.04] ${TONE[cell.state]} ${on ? 'ring-2 ring-brand-400' : ''}`}
                        title={`${sp} × ${teilLabel(t).label} — ${cell.solide} solide, ${cell.entame} entamé, ${cell.vierge} pas encore travaillé`}
                      >
                        {cell.solide}/{cell.total}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${TONE.vierge}`} />pas encore travaillé</span>
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${TONE.entame}`} />entamé</span>
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${TONE.solide}`} />solide</span>
      </div>

      {picked && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 px-3 py-2.5 dark:border-brand-900/40 dark:bg-brand-900/10">
          {suggestion ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{suggestion.name}</div>
                <div className="text-[11px] text-slate-400">{picked.specialty} · {teilLabel(picked.teil).label}</div>
              </div>
              <Link to={`/simulation/${suggestion.id}/pre?teil=${picked.teil}`} className="btn-primary shrink-0 gap-1 px-3 py-1.5 text-xs">
                <Icon name="play" className="h-3 w-3" />Lancer
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Tout est solide ici. Rien à proposer.</p>
          )}
        </div>
      )}
    </section>
  );
}
