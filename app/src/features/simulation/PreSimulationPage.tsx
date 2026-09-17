import { cqText } from '@/lib/caseQuestions';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { TEILE, isTeil } from '@/lib/simScope';
import { useCase, useFachwissen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { SimulationSetup } from './SimulationSetup';

// Échauffement avant le chrono : notions clés, questions d'anamnèse, phrases de
// Fallvorstellung, Fachbegriffe du cas. Prépare mentalement à entrer en sim.
export function PreSimulationPage() {
  const { caseId } = useParams();
  // Mode (FB2-P) : complète, ou un seul Teil — pré-sélectionné par l'URL,
  // modifiable ici, porté par le bouton d'entrée.
  const [params, setParams] = useSearchParams();
  const teil = isTeil(params.get('teil')) ? params.get('teil')! : null;
  const setTeil = (t: string | null) => { const n = new URLSearchParams(params); if (t) n.set('teil', t); else n.delete('teil'); setParams(n, { replace: true }); };
  const c = useCase(caseId);
  const fw = useFachwissen(c?.linkedFachwissenId);
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);

  if (!c) return <div className="text-slate-400">Chargement…</div>;
  const terms = (begriffe ?? []).filter((b) => c.linkedFachbegriffeIds.includes(b.id));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="text-center">
        <div className="text-sm font-semibold text-brand-500">Échauffement</div>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">Révise 2 minutes, respire, puis entre en simulation.</p>
      </header>

      {/* Barre d'action EN HAUT (n'interfère plus avec la barre flottante en bas) */}
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 px-4 py-3 dark:border-brand-900/40 dark:bg-brand-900/10">
        <Link to={`/cas/${c.id}`} className="btn-outline">← Fiche du cas</Link>
        <Link to={`/simulation/${c.id}/run${teil ? `?teil=${teil}` : ''}`} className="btn-primary gap-1.5 px-8 py-3 text-base font-bold"><Icon name="play" className="h-4 w-4" />{teil ? `Entrer — ${TEILE.find((t) => t.key === teil)?.label} seule` : 'Entrer en simulation'}</Link>
        {/* Pastille de mode : complète, ou un seul Teil pour réviser ciblé */}
        <div role="radiogroup" aria-label="Mode de simulation" className="flex w-full flex-wrap items-center justify-center gap-1.5 pt-1">
          <button type="button" role="radio" aria-checked={!teil} onClick={() => setTeil(null)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${!teil ? 'bg-brand-600 text-white' : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-ink-700 dark:text-slate-300'}`}>Complète · 3 Teile</button>
          {TEILE.map((t) => (
            <button key={t.key} type="button" role="radio" aria-checked={teil === t.key} onClick={() => setTeil(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${teil === t.key ? 'bg-brand-600 text-white' : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-ink-700 dark:text-slate-300'}`}>
              <Icon name={t.icon} className="h-3.5 w-3.5" />{t.label} seule
            </button>
          ))}
        </div>
      </div>

      {/* Réglage de simulation (mode · couche · Muster · rôles + fiche simulant) */}
      <SimulationSetup caseId={c.id} />

      <div className="grid gap-4 md:grid-cols-2">
        {fw && (
          <div className="card p-5">
            <div className="label mb-2 flex items-center gap-1.5"><Icon name="key" className="h-3.5 w-3.5" />Notions clés</div>
            <p className="text-sm"><AutoLink>{fw.definition}</AutoLink></p>
            {fw.pruefungsfallen.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-300">Pièges probables :</div>
                <AutoLinkList items={fw.pruefungsfallen.slice(0, 3)} className="mt-1 space-y-1 text-sm" />
              </div>
            )}
          </div>
        )}

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="question" className="h-3.5 w-3.5" />Questions d'anamnèse à ne pas oublier</div>
          <AutoLinkList items={c.caseSpecificQuestions.map(cqText)} />
        </div>

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="speech" className="h-3.5 w-3.5" />Phrases de Fallvorstellung</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            « {c.patientSheet.personalia.name} ist ein/e {c.patientSheet.personalia.age}-jährige/r Patient/in, der/die sich mit <b><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></b>… vorstellte. »
          </p>
          <p className="mt-2 text-sm text-slate-500">Struktur : Allgemein- und Ernährungszustand → Anamnese (Konjunktiv I) → Verdachts- und Differenzialdiagnosen → Diagnostik → Therapie.</p>
        </div>

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="nav-abc" className="h-3.5 w-3.5" />Fachbegriffe du thème ({terms.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {terms.slice(0, 12).map((t) => (
              <button key={t.id} onClick={() => openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
