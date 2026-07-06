import { Link } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCases } from '@/hooks/useData';

// Panneau latéral d'aperçu d'un Fachbegriff (ouvert au clic sur un terme
// auto-linké). Montre traduction, prononciation, définition, et les cas liés
// — matérialise l'interconnexion : depuis un terme, on voit où il apparaît.
export function GlossaryDrawer() {
  const fb = useUi((s) => s.glossaryTerm);
  const close = useUi((s) => s.closeGlossary);
  const cases = useCases();
  if (!fb) return null;

  const linkedCases = (cases ?? []).filter((c) => fb.linkedCaseIds.includes(c.id));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <div className="label">Fachbegriff</div>
            <h3 className="text-lg font-bold text-brand-700 dark:text-brand-300">{fb.term}</h3>
            {fb.pronunciation && <p className="text-sm text-slate-400">/{fb.pronunciation}/</p>}
          </div>
          <button onClick={close} className="btn-ghost -mr-2 -mt-1 text-lg">✕</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="label mb-1">Bedeutung (patientengerecht)</div>
            <p className="text-slate-700 dark:text-slate-200">{fb.translationSimple}</p>
          </div>

          {fb.definitionDetailed && (
            <div>
              <div className="label mb-1">Definition</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{fb.definitionDetailed}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{fb.specialty}</span>
            <span className={`chip ${fb.srs.state === 'Neu' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : fb.srs.state === 'Gelernt' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
              {fb.srs.state}
            </span>
          </div>

          {linkedCases.length > 0 && (
            <div>
              <div className="label mb-2">Erscheint in Fällen</div>
              <div className="space-y-1.5">
                {linkedCases.map((c) => (
                  <Link key={c.id} to={`/cas/${c.id}`} onClick={close} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-brand-900/20">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <Link to="/fachbegriffe" onClick={close} className="btn-outline w-full">Alle Fachbegriffe →</Link>
        </div>
      </aside>
    </>
  );
}
