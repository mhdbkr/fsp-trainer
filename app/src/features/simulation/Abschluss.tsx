import type { ReactNode } from 'react';
import { bewerte, checklisteFuer, erlaubt, simulationBeendbar } from '@/lib/lauf/automat';
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

/** La sortie de fin dans l'en-tête collant (règle 8 amendée) : rendue ssi
 *  l'automate accepte `versChecklist` — au bilan seulement. [S4] Son libellé
 *  devient « Terminer ici » (§10.2.3, INV-71) : on s'arrête dès qu'un Teil est
 *  joué, quel que soit le reste ; « Continuer » est l'autre sortie du bilan. */
export function SimulationBeendenKnopf({ lauf, onClick }: { lauf: Lauf; onClick: () => void }) {
  if (!simulationBeendbar(lauf)) return null;
  return (
    // Fixeur I7 : un seul bouton principal au bilan — tant qu'il reste un Teil, « Continuer — X » l'est, et ceci est secondaire.
    <button onClick={onClick} className={`${erlaubt(lauf, { typ: 'partieSuivante' }) ? 'btn-outline' : 'btn-primary'} text-xs`} title="Vers la checklist de fin">
      Terminer ici →
    </button>
  );
}

/** Les états de fin `checkliste` / `arztbrief` / `gespeichert`, et l'alerte
 *  d'un enregistrement échoué. `brief` est la rédaction de l'Arztbrief, fournie
 *  par le runner (elle dépend du cas). */
export function Ende({ lauf, fehler, brief, onZurueck, onArztbrief, onSpeichern }: {
  lauf: Lauf; fehler: string | null; brief: ReactNode;
  onZurueck: () => void; onArztbrief: () => void; onSpeichern: () => void;
}) {
  if (lauf.zustand === 'gespeichert') return <div className="text-slate-400">Enregistrement…</div>;
  return (
    <>
      {fehler && <p role="alert" className="callout callout-warn mx-auto mb-4 max-w-2xl text-sm">{fehler}</p>}
      {lauf.zustand === 'arztbrief' ? (
        <div className="space-y-4">
          {brief}
          <div className="flex justify-end">
            <button onClick={onSpeichern} className="btn-primary px-6">Enregistrer la simulation →</button>
          </div>
        </div>
      ) : (
        <Abschluss lauf={lauf} onZurueck={onZurueck} onArztbrief={onArztbrief} onSpeichern={onSpeichern} />
      )}
    </>
  );
}

/** Les états où le runner rend `Ende`. */
export const istEnde = (l: Lauf): boolean =>
  l.zustand === 'checkliste' || l.zustand === 'arztbrief' || l.zustand === 'gespeichert';

export function Abschluss({ lauf, onZurueck, onArztbrief, onSpeichern }: {
  lauf: Lauf; onZurueck: () => void; onArztbrief: () => void; onSpeichern: () => void;
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
        {/* « Revenir » est une action nommée (contrat §2.1 règle 2, décision 8). */}
        <button onClick={onZurueck} className="btn-ghost mr-auto">← Revenir au bilan</button>
        {briefOffen && (
          <button onClick={onArztbrief} className="btn-outline" title="Facultatif">Rédiger l'Arztbrief</button>
        )}
        <button onClick={onSpeichern} className="btn-primary px-6">Enregistrer la simulation →</button>
      </div>
    </div>
  );
}
