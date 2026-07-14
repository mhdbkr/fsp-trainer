import { Link } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCases, useFachbegriffe } from '@/hooks/useData';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { Icon } from '@/components/icons';
import { CenterBadge, FreqBadge } from '@/components/ui';

// Aperçu latéral d'un cas SANS quitter la liste (interconnexion + horizontalité).
export function CasePreviewPanel() {
  const id = useUi((s) => s.previewCaseId);
  const close = useUi((s) => s.closeCasePreview);
  const cases = useCases();
  const begriffe = useFachbegriffe();
  if (!id) return null;
  const c = (cases ?? []).find((x) => x.id === id);
  if (!c) return null;

  const terms = (begriffe ?? []).filter((b) => c.linkedFachbegriffeIds.includes(b.id)).slice(0, 8);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md animate-slide-in flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <div className="label">Aperçu du cas</div>
            <h3 className="text-lg font-bold">{c.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.specialty}</span>
              <FreqBadge n={c.frequency} />
              {c.centers.map((ct) => <CenterBadge key={ct} center={ct} />)}
            </div>
          </div>
          <button onClick={close} className="btn-ghost -mr-2 -mt-1 text-lg">✕</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <Block title="Leitsymptome">
            <AutoLinkList items={c.patientSheet.leitsymptome} />
          </Block>

          <Block title="Verdachtsdiagnose">
            <p className="text-sm font-medium text-brand-700 dark:text-brand-300"><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></p>
          </Block>

          <Block title="Differenzialdiagnosen">
            <ul className="space-y-1 text-sm">
              {c.medicalView.differenzialdiagnosen.map((d, i) => (
                <li key={i}><b><AutoLink>{d.dd}</AutoLink></b> <span className="text-slate-400">— {d.unterscheidung}</span></li>
              ))}
            </ul>
          </Block>

          {terms.length > 0 && (
            <Block title="Fachbegriffe clés">
              <div className="flex flex-wrap gap-1.5">
                {terms.map((t) => (
                  <button key={t.id} onClick={() => useUi.getState().openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>
                ))}
              </div>
            </Block>
          )}

          {c.linkedFachwissenId && (
            <Link to={`/fachwissen/${c.linkedFachwissenId}`} onClick={close} className="btn-outline w-full justify-between">
              <span className="flex items-center gap-1.5"><Icon name="nav-book" className="h-4 w-4 shrink-0" />Fachwissen : {c.pathology}</span><span>→</span>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <Link to={`/simulation/${c.id}/pre`} onClick={close} className="btn-primary justify-center gap-1.5"><Icon name="play" className="h-4 w-4" />Simulation</Link>
          <Link to={`/cas/${c.id}`} onClick={close} className="btn-outline justify-center">Fiche complète</Link>
        </div>
      </aside>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{title}</div>
      {children}
    </div>
  );
}
