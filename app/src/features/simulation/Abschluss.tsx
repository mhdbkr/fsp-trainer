import { bewerte, checklisteFuer, erlaubt } from '@/lib/lauf/automat';
import type { Lauf, LaufTeil } from '@/lib/lauf/types';
import { partScore } from '@/lib/scoring';

const LABEL: Record<LaufTeil, string> = {
  anamnese: 'Anamnese', dokumentation: 'Dokumentation',
  fallvorstellung: 'Fallvorstellung', aufklaerung: 'Aufklärung',
};

// ============================================================================
// L'état `checkliste` de l'automate : la checklist de fin, dernier regard sur
// les parties jouées avant d'enregistrer. C'est d'ici — et d'ici seulement —
// que part `speichern` (contrat §2, règle 8 amendée par `main`).
//
// L'Arztbrief est une étape FACULTATIVE (Q5). Quand la proposer est une règle
// de l'AUTOMATE (`arztbriefSchreiben`) : la vue demande `erlaubt`, elle ne
// décide pas.
// ============================================================================

export function Abschluss({ lauf, onArztbrief, onSpeichern }: {
  lauf: Lauf; onArztbrief: () => void; onSpeichern: () => void;
}) {
  const briefOffen = erlaubt(lauf, { typ: 'arztbriefSchreiben' });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">Fin de la simulation</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Relis tes parties, puis enregistre.</p>
      </div>
      <ul className="card divide-y divide-slate-200/70 p-0 dark:divide-ink-600/70">
        {lauf.teileGespielt.map((t) => {
          const cl = checklisteFuer(lauf, t);
          const sc = partScore(bewerte(lauf, t));
          return (
            <li key={t} data-teil={t} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="font-medium">{LABEL[t]}</span>
              <span className="flex items-center gap-3 text-sm">
                <span className="mono-tag">{cl.filter((i) => i.checked).length}/{cl.length}</span>
                <span className={`font-bold ${sc >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{sc}%</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {briefOffen && (
          <button onClick={onArztbrief} className="btn-outline" title="Facultatif">Rédiger l'Arztbrief</button>
        )}
        <button onClick={onSpeichern} className="btn-primary px-6">Enregistrer la simulation →</button>
      </div>
    </div>
  );
}
