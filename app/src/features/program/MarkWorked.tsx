import { useRef, useState } from 'react';
import { logTraining } from '@/lib/journal';
import { now } from '@/lib/clock';
import { Icon } from '@/components/icons';
import type { CaseId } from '@/db/types';

/**
 * B-C3 — le travail hors plan entre dans le journal. Un geste EXPLICITE, en fin
 * de lecture : ouvrir une page n'est pas un exercice. Le temps est MESURÉ depuis
 * le montage (ouverture de la fiche, de la carte), jamais estimé (contrat §1.2.5).
 * Un seul événement : après le clic, le bouton cède la place à la confirmation.
 */
export function MarkWorked({ kind, caseId, label }: { kind: 'fiche' | 'aufklaerung'; caseId?: CaseId; label: string }) {
  const since = useRef(now());
  const [state, setState] = useState<'idle' | 'busy' | number>('idle');
  if (typeof state === 'number') {
    return <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300"><Icon name="check" className="h-3.5 w-3.5" />Noté dans ton historique · {state} min</p>;
  }
  return (
    <button
      type="button" disabled={state === 'busy'}
      onClick={async () => {
        setState('busy');
        const te = await logTraining({ kind, caseId, spentMin: (now() - since.current) / 60_000 });
        setState(te.spentMin);
      }}
      className="btn-ghost gap-1.5 px-3 py-1.5 text-xs"
    ><Icon name="check" className="h-3.5 w-3.5" />{label}</button>
  );
}
