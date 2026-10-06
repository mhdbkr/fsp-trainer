import { useNavigate, useLocation } from 'react-router-dom';
import { routeDeReprise, useSimSession } from '@/store/simSession';
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

  // [S4-7] Un examen se reprend sur `/examen`, sans id de cas dans l'URL ni nom à l'écran (simulation-run.md §11.3).
  const inRunner = /^\/simulation\/[^/]+\/run/.test(pathname) || (!!snapshot?.examen && pathname === '/examen');
  if (!snapshot || !minimized || inRunner) return null;

  const doneCount = Object.values(snapshot.results).filter((p) => p?.done).length;
  const resumeSim = () => { resume(); navigate(routeDeReprise(snapshot)); };

  // Centrage par marges auto (inset-x-0 + w-fit) : AUCUN translate-x en % →
  // la transition n'anime que l'axe Y, plus de décalage horizontal fugace.
  return (
    <div className={`fixed inset-x-0 bottom-5 z-40 mx-auto w-fit transition-[transform,opacity] duration-300 ${atPageBottom ? 'pointer-events-none translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
      {/* Chrome flottante = rôle 1 de la charte (`.glass glass-edge`) : l'ancien
          `bg-white` + `shadow-e3` dessinait un filet blanc sur blanc (Re-revue 2). */}
      <div className="glass glass-edge flex items-center gap-3 rounded-full py-0.5 pl-3 pr-0.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"><Icon name="pause" className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{snapshot.examen ? 'Examen en cours' : `Simulation en pause · ${snapshot.caseName}`}</div>
          <div className="text-[11px] text-slate-400">{/* Un Teil seul s'écrit seul, une fois — « … seule » est la tournure que
              TaskLabel a supprimée (la portée EST la marque de partialité). */}
            {snapshot.teil ? PART_LABEL[snapshot.teil] : `${PART_LABEL[snapshot.active]} · ${doneCount}/3 parties`}</div>
        </div>
        <button onClick={resumeSim} className="btn-primary shrink-0 gap-1.5 rounded-full px-4 py-1.5 text-xs"><Icon name="play" className="h-3.5 w-3.5" />Reprendre</button>
        <button onClick={end} title="Abandonner la session" aria-label="Abandonner la session" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:text-rose-500"><span aria-hidden="true">✕</span></button>
      </div>
    </div>
  );
}
