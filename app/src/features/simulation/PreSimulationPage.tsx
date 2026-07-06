import { Link, useParams } from 'react-router-dom';
import { useCase, useFachwissen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { Breadcrumb } from '@/components/Breadcrumb';
import { SimulationSetup } from './SimulationSetup';

// Échauffement avant le chrono : notions clés, questions d'anamnèse, phrases de
// Fallvorstellung, Fachbegriffe du cas. Prépare mentalement à entrer en sim.
export function PreSimulationPage() {
  const { caseId } = useParams();
  const c = useCase(caseId);
  const fw = useFachwissen(c?.linkedFachwissenId);
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);

  if (!c) return <div className="text-slate-400">Chargement…</div>;
  const terms = (begriffe ?? []).filter((b) => c.linkedFachbegriffeIds.includes(b.id));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Breadcrumb items={[{ label: 'Cas', to: '/cas' }, { label: c.name, to: `/cas/${c.id}` }, { label: 'Pré-simulation' }]} />

      <header className="text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-brand-500">Échauffement</div>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">Révise 2 minutes, respire, puis entre en simulation.</p>
      </header>

      {/* Réglage de simulation (mode · couche · Muster · rôles + fiche simulant) */}
      <SimulationSetup caseId={c.id} />

      <div className="grid gap-4 md:grid-cols-2">
        {fw && (
          <div className="card p-5">
            <div className="label mb-2">🔑 Notions clés</div>
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
          <div className="label mb-2">❓ Questions d'anamnèse à ne pas oublier</div>
          <AutoLinkList items={c.caseSpecificQuestions} />
        </div>

        <div className="card p-5">
          <div className="label mb-2">🗣️ Phrases de Fallvorstellung</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            « {c.patientSheet.personalia.name} ist ein/e {c.patientSheet.personalia.age}-jährige/r Patient/in, der/die sich mit <b><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></b>… vorstellte. »
          </p>
          <p className="mt-2 text-sm text-slate-500">Struktur : AZ/EZ → Anamnese (Konjunktiv I) → VD/DD → Diagnostik → Therapie.</p>
        </div>

        <div className="card p-5">
          <div className="label mb-2">🔤 Fachbegriffe du thème ({terms.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {terms.slice(0, 12).map((t) => (
              <button key={t.id} onClick={() => openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Link to={`/cas/${c.id}`} className="btn-outline">← Fiche du cas</Link>
        <Link to={`/simulation/${c.id}/run`} className="btn-primary px-8 py-3 text-base font-bold">Entrer en simulation ▶</Link>
      </div>
    </div>
  );
}
