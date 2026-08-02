import { Link, useParams } from 'react-router-dom';
import { useFachwissen, useCases, useAufklaerungen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { DIAGNOSTIK_STUFEN, type DiagnostikStufe } from '@/db/types';

// Palette par étape diagnostique — progression froide→chaude = du simple/
// non-invasif vers le spécialisé, lisible d'un coup d'œil.
const STUFE_META: Record<DiagnostikStufe, { dot: string; text: string; icon: string }> = {
  'Anamnese/Klinik': { dot: 'bg-brand-500', text: 'text-brand-700 dark:text-brand-300', icon: 'stethoscope' },
  Labor: { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300', icon: 'blood' },
  'Apparativ & Bildgebung': { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300', icon: 'search' },
  'Invasiv & Speziell': { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', icon: 'syringe' },
};

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
      <header>
        <div className="eyebrow">{fw.specialty}</div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tightish">{fw.pathology}</h1>
      </header>

      {/* Merksatz — aide-mémoire d'une ligne (rappel flash) */}
      {fw.merksatz && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-transparent px-4 py-3 dark:border-brand-900/40 dark:from-brand-900/20">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-500 text-white"><Icon name="bulb" className="h-3.5 w-3.5" /></span>
          <p className="text-sm font-medium leading-relaxed text-brand-900 dark:text-brand-100"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-500">Merke&nbsp;·&nbsp;</span><AutoLink>{fw.merksatz}</AutoLink></p>
        </div>
      )}

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

          {/* Démarche diagnostique par ÉTAPE du raisonnement — l'ordre qu'on
              récite en Fallvorstellung (bien plus parlant qu'invasif/non-invasif). */}
          <Section title="Diagnostisches Vorgehen" icon="search">
            <ol className="space-y-3">
              {DIAGNOSTIK_STUFEN.map((stufe, si) => {
                const items = fw.diagnostik.filter((d) => d.stufe === stufe);
                if (!items.length) return null;
                const meta = STUFE_META[stufe];
                return (
                  <li key={stufe} className="flex gap-3">
                    <div className="flex shrink-0 flex-col items-center">
                      <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ${meta.dot}`}>{si + 1}</span>
                      <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${meta.text}`}>
                        <Icon name={meta.icon} className="h-3.5 w-3.5" />{stufe}
                      </div>
                      <ul className="mt-1 space-y-1 text-sm">
                        {items.map((d, i) => (
                          <li key={i} className="flex gap-2">
                            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${meta.dot}`} />
                            <span><AutoLink>{d.text}</AutoLink></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>

          {fw.klassifikation && fw.klassifikation.length > 0 && (
            <Section title="Klassifikation & Scores" icon="gauge">
              <div className="space-y-2.5">
                {fw.klassifikation.map((k, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
                    <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">{k.name}</div>
                    <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300"><AutoLink>{k.inhalt}</AutoLink></p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Differenzialdiagnosen (mit Kriterien)" icon="target">
            <ul className="space-y-2 text-sm">
              {fw.differenzialdiagnosen.map((d, i) => (
                <li key={i}><b><AutoLink>{d.dd}</AutoLink></b> <span className="text-slate-500 dark:text-slate-400">— <AutoLink>{d.unterscheidung}</AutoLink></span></li>
              ))}
            </ul>
          </Section>

          {/* Thérapie : sections propres à la pathologie (pas de moule imposé). */}
          <Section title="Therapie" icon="pill">
            <div className={`grid gap-3 ${fw.therapie.length > 2 ? 'sm:grid-cols-3' : fw.therapie.length === 2 ? 'sm:grid-cols-2' : ''}`}>
              {fw.therapie.map((sek, i) => (
                <div key={i} className={`rounded-lg border p-2.5 ${sek.akut ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${sek.akut ? 'text-rose-700 dark:text-rose-300' : 'text-brand-600 dark:text-brand-300'}`}>
                    {sek.akut && <Icon name="alert" className="h-3.5 w-3.5" />}{sek.label}
                  </div>
                  <AutoLinkList items={sek.items} className="mt-1.5 space-y-1 text-[13px]" />
                </div>
              ))}
            </div>
          </Section>

          {fw.prognose && <Section title="Prognose" icon="gauge"><p className="prose-fsp"><AutoLink>{fw.prognose}</AutoLink></p></Section>}
        </div>

        {/* Colonne latérale : red flags, pièges, questions, liens */}
        <div className="stagger space-y-4">
          {fw.redFlags && fw.redFlags.length > 0 && (
            <div className="card relative overflow-hidden border-rose-200 bg-rose-50 p-4 pl-5 dark:border-rose-900/40 dark:bg-rose-900/10">
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-rose-500" />
              <div className="label mb-2 flex items-center gap-1.5 text-rose-700 dark:text-rose-300"><Icon name="alert" className="h-3.5 w-3.5" />Red Flags — Alarmzeichen</div>
              <AutoLinkList items={fw.redFlags} />
            </div>
          )}

          <div className="card relative overflow-hidden border-amber-200 bg-amber-50 p-4 pl-5 dark:border-amber-900/40 dark:bg-amber-900/10">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-amber-500" />
            <div className="label mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><Icon name="alert" className="h-3.5 w-3.5" />Prüfungsfallen</div>
            <AutoLinkList items={fw.pruefungsfallen} />
          </div>

          <div className="card p-4">
            <div className="label mb-2 flex items-center gap-1.5"><Icon name="question" className="h-3.5 w-3.5" />Déjà demandé en examen</div>
            <div className="space-y-2.5">
              {fw.askedInExam.map((q, i) => (
                <details key={i} className="group rounded-lg border border-slate-200 dark:border-slate-800">
                  <summary className="cursor-pointer list-none px-3 py-2 text-[13px] font-medium marker:content-none hover:text-brand-600">
                    <span className="mr-1 text-slate-400 group-open:text-brand-500">Q</span><AutoLink>{q.frage}</AutoLink>
                  </summary>
                  <p className="border-t border-slate-100 px-3 py-2 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300"><AutoLink>{q.antwort}</AutoLink></p>
                </details>
              ))}
            </div>
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
