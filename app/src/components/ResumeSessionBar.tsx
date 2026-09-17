import { useNavigate, useLocation } from 'react-router-dom';
import { useSimSession } from '@/store/simSession';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';

// ============================================================================
// Barre d'état flottante d'une simulation EN PAUSE. Apparaît quand une session
// est minimisée et qu'on n'est pas dans le Runner. Permet de reprendre en un
// clic, ou d'abandonner. Bas de l'écran, discrète mais visible.
// ============================================================================
const PART_LABEL: Record<string, string> = {
  anamnese: 'Anamnese', dokumentation: 'Dokumentation', fallvorstellung: 'Fallvorstellung', aufklaerung: 'Aufklärung',
};

export function ResumeSessionBar() {
  const { snapshot, minimized, end, resume } = useSimSession();
  const atPageBottom = useUi((s) => s.atPageBottom);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const inRunner = /^\/simulation\/[^/]+\/run/.test(pathname);
  if (!snapshot || !minimized || inRunner) return null;

  const doneCount = Object.values(snapshot.results).filter((p) => p?.done).length;
  const resumeSim = () => { resume(); navigate(`/simulation/${snapshot.caseId}/run${snapshot.teil ? `?teil=${snapshot.teil}` : ''}`); };

  // Centrage par marges auto (inset-x-0 + w-fit) : AUCUN translate-x en % →
  // la transition n'anime que l'axe Y, plus de décalage horizontal fugace.
  return (
    <div className={`fixed inset-x-0 bottom-5 z-40 mx-auto w-fit transition-[transform,opacity] duration-300 ${atPageBottom ? 'pointer-events-none translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className="flex items-center gap-3 rounded-full border border-brand-200 bg-white px-3 py-2 shadow-xl dark:border-brand-900/50 dark:bg-slate-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"><Icon name="pause" className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">Simulation en pause · {snapshot.caseName}</div>
          <div className="text-[11px] text-slate-400">{PART_LABEL[snapshot.active]} · {snapshot.teil ? `${PART_LABEL[snapshot.teil]} seule` : `${doneCount}/3 parties`}</div>
        </div>
        <button onClick={resumeSim} className="btn-primary shrink-0 gap-1.5 rounded-full px-4 py-1.5 text-xs"><Icon name="play" className="h-3.5 w-3.5" />Reprendre</button>
        <button onClick={end} title="Abandonner la session" className="shrink-0 text-slate-400 hover:text-rose-500">✕</button>
      </div>
    </div>
  );
}
