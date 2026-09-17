import { Link } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCases, useFachbegriffe } from '@/hooks/useData';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { Icon } from '@/components/icons';
import { CenterBadge, FreqBadge } from '@/components/ui';
import { SEC, SectionHead } from './medSections';
import { termsInOrder } from '@/lib/collections/caseTerms';

// Aperçu latéral d'un cas SANS quitter la liste (interconnexion + horizontalité).
export function CasePreviewPanel() {
  const id = useUi((s) => s.previewCaseId);
  const close = useUi((s) => s.closeCasePreview);
  const cases = useCases();
  const begriffe = useFachbegriffe();
  if (!id) return null;
  const c = (cases ?? []).find((x) => x.id === id);
  if (!c) return null;

  // Ordre de `linkedFachbegriffeIds` conservé (diagnostic → spécifique → contextuel, cf. linkCaseTerms.mjs), pas de tri alphabétique.
  const terms = termsInOrder(c.linkedFachbegriffeIds, begriffe ?? []).slice(0, 8);

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
          <section className="relative overflow-hidden rounded-xl border border-slate-200 p-3 pl-4 dark:border-slate-800">
            <span className={`absolute inset-y-0 left-0 w-1 ${SEC.leit.edge}`} />
            <SectionHead sec="leit" className="mb-2" />
            <AutoLinkList items={c.patientSheet.leitsymptome} />
          </section>

          {/* Verdachtsdiagnose — la conclusion, mise en avant */}
          <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-50 to-transparent p-3 pl-4 dark:from-brand-900/20">
            <span className={`absolute inset-y-0 left-0 w-1 ${SEC.verdacht.edge}`} />
            <SectionHead sec="verdacht" className="mb-2" />
            <p className="font-display text-base font-bold leading-snug text-brand-800 dark:text-brand-200"><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></p>
            {c.medicalView.notfall && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white"><Icon name="alert" className="h-3 w-3" />Notfall</span>}
          </section>

          <section className="relative overflow-hidden rounded-xl border border-slate-200 p-3 pl-4 dark:border-slate-800">
            <span className={`absolute inset-y-0 left-0 w-1 ${SEC.dd.edge}`} />
            <SectionHead sec="dd" className="mb-2" />
            <ol className="space-y-1.5">
              {c.medicalView.differenzialdiagnosen.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-indigo-100 font-mono text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">{i + 1}</span>
                  <span><b><AutoLink>{d.dd}</AutoLink></b> <span className="text-slate-400">— {d.unterscheidung}</span></span>
                </li>
              ))}
            </ol>
          </section>

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
