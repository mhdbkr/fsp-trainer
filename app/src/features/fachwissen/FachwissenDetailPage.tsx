import { Link, useParams } from 'react-router-dom';
import { useFachwissen, useCases, useAufklaerungen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { Breadcrumb } from '@/components/Breadcrumb';

export function FachwissenDetailPage() {
  const { id } = useParams();
  const fw = useFachwissen(id);
  const cases = useCases();
  const aufk = useAufklaerungen();
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);

  if (!fw) return <div className="text-slate-400">Chargement…</div>;
  const linkedCases = (cases ?? []).filter((c) => fw.linkedCaseIds.includes(c.id));
  const linkedAufk = (aufk ?? []).filter((a) => fw.linkedAufklaerungIds.includes(a.id));
  const terms = (begriffe ?? []).filter((b) => fw.keyFachbegriffeIds.includes(b.id));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Fachwissen', to: '/fachwissen' }, { label: fw.pathology }]} />

      <header>
        <div className="eyebrow">{fw.specialty}</div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tightish">{fw.pathology}</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="stagger space-y-4 lg:col-span-2">
          <Section title="Definition" icon="nav-book"><p className="prose-fsp"><AutoLink>{fw.definition}</AutoLink></p></Section>
          {fw.aetiologie && <Section title="Ätiologie" icon="brain"><p className="prose-fsp"><AutoLink>{fw.aetiologie}</AutoLink></p></Section>}
          {fw.risikofaktoren && <Section title="Risikofaktoren" icon="alert"><AutoLinkList items={fw.risikofaktoren} /></Section>}

          <Section title="Klinik" icon="pulse">
            <ul className="space-y-1.5 text-sm">
              {fw.klinik.map((k, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${k.atypisch ? 'bg-amber-400' : 'bg-brand-400'}`} />
                  <span><AutoLink>{k.text}</AutoLink>{k.atypisch && <span className="ml-1 chip bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">atypisch</span>}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Diagnostik (nicht-invasiv → invasiv)" icon="search">
            <ol className="space-y-1.5 text-sm">
              {fw.diagnostik.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`chip ${d.invasiv ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>{d.invasiv ? 'invasiv' : 'nicht-inv.'}</span>
                  <span><AutoLink>{d.text}</AutoLink></span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Differenzialdiagnosen (mit Kriterien)" icon="target">
            <ul className="space-y-2 text-sm">
              {fw.differenzialdiagnosen.map((d, i) => (
                <li key={i}><b><AutoLink>{d.dd}</AutoLink></b> <span className="text-slate-500 dark:text-slate-400">— <AutoLink>{d.unterscheidung}</AutoLink></span></li>
              ))}
            </ul>
          </Section>

          <Section title="Therapie" icon="pill">
            <div className="grid gap-3 sm:grid-cols-3">
              {(['konservativ', 'interventionell', 'chirurgisch'] as const).map((k) => fw.therapie[k] && (
                <div key={k}>
                  <div className="text-xs font-semibold text-brand-600 dark:text-brand-300 capitalize">{k}</div>
                  <AutoLinkList items={fw.therapie[k]!} className="mt-1 space-y-1 text-[13px]" />
                </div>
              ))}
            </div>
          </Section>

          {fw.prognose && <Section title="Prognose" icon="gauge"><p className="prose-fsp"><AutoLink>{fw.prognose}</AutoLink></p></Section>}
        </div>

        {/* Colonne latérale : pièges, questions, liens */}
        <div className="stagger space-y-4">
          <div className="card relative overflow-hidden border-amber-200 bg-amber-50 p-4 pl-5 dark:border-amber-900/40 dark:bg-amber-900/10">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-amber-500" />
            <div className="label mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><Icon name="alert" className="h-3.5 w-3.5" />Prüfungsfallen</div>
            <AutoLinkList items={fw.pruefungsfallen} />
          </div>

          <div className="card p-4">
            <div className="label mb-2 flex items-center gap-1.5"><Icon name="question" className="h-3.5 w-3.5" />Déjà demandé en examen</div>
            <AutoLinkList items={fw.askedInExam} />
          </div>

          {linkedCases.length > 0 && (
            <div className="card p-4">
              <div className="label mb-2">Cas liés</div>
              <div className="space-y-1.5">
                {linkedCases.map((c) => (
                  <Link key={c.id} to={`/cas/${c.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800">{c.name}</Link>
                ))}
              </div>
            </div>
          )}

          {linkedAufk.length > 0 && (
            <div className="card p-4">
              <div className="label mb-2">Aufklärungen</div>
              <div className="space-y-1.5">
                {linkedAufk.map((a) => (
                  <Link key={a.id} to={`/aufklaerung?open=${a.id}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800"><Icon name="nav-clipboard" className="h-4 w-4 shrink-0" />{a.shortName ?? a.name}</Link>
                ))}
              </div>
            </div>
          )}

          {terms.length > 0 && (
            <div className="card p-4">
              <div className="label mb-2">Fachbegriffe</div>
              <div className="flex flex-wrap gap-1.5">
                {terms.map((t) => <button key={t.id} onClick={() => openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="card card-accent p-5 pl-6">
      <div className="mb-3 flex items-center gap-2.5">
        {icon && <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300"><Icon name={icon} className="h-4 w-4" /></span>}
        <h2 className="font-display text-[17px] font-semibold tracking-tightish">{title}</h2>
      </div>
      {children}
    </div>
  );
}
