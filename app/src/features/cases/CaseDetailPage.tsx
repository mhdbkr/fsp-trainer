import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCase, useAufklaerungen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { CenterBadge, FreqBadge, DifficultyDots, StatusBadge, Toggle } from '@/components/ui';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PatientSheetView } from './PatientSheetView';

export function CaseDetailPage() {
  const { id } = useParams();
  const c = useCase(id);
  const aufk = useAufklaerungen();
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);
  const [tab, setTab] = useState<'arzt' | 'patient'>('arzt');

  if (!c) return <div className="text-slate-400">Chargement…</div>;

  const linkedAufk = (aufk ?? []).filter((a) => c.probableAufklaerungIds.includes(a.id));
  const terms = (begriffe ?? []).filter((b) => c.linkedFachbegriffeIds.includes(b.id));

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Cas cliniques', to: '/cas' }, { label: c.name }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.specialty}</span>
            <FreqBadge n={c.frequency} />
            <StatusBadge status={c.status} />
            <DifficultyDots level={c.difficulty} />
            {c.centers.map((ct) => <CenterBadge key={ct} center={ct} />)}
          </div>
        </div>
        <Link to={`/simulation/${c.id}/pre`} className="btn-primary">▶ Simuler ce cas</Link>
      </header>

      {/* Double vue */}
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        <button onClick={() => setTab('arzt')} className={`flex-1 rounded-md px-3 py-2 font-medium ${tab === 'arzt' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>
          👨‍⚕️ Vue médecin <span className="hidden sm:inline text-xs opacity-60">(ce que tu dois découvrir)</span>
        </button>
        <button onClick={() => setTab('patient')} className={`flex-1 rounded-md px-3 py-2 font-medium ${tab === 'patient' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>
          🎭 Fiche patient <span className="hidden sm:inline text-xs opacity-60">(pour le partenaire)</span>
        </button>
      </div>

      {tab === 'patient' ? (
        <PatientSheetView sheet={c.patientSheet} caseSpecificQuestions={c.caseSpecificQuestions} examinerQuestions={c.examinerQuestions} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="card p-5">
              <div className="label mb-1">Verdachtsdiagnose</div>
              <p className="text-lg font-semibold text-brand-700 dark:text-brand-300"><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></p>
              {c.medicalView.notfall && <span className="chip mt-2 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">⚠ Notfall</span>}
            </div>

            <div className="card p-5">
              <div className="label mb-2">Differenzialdiagnosen (mit Kriterien)</div>
              <ul className="space-y-2">
                {c.medicalView.differenzialdiagnosen.map((d, i) => (
                  <li key={i} className="text-sm"><b><AutoLink>{d.dd}</AutoLink></b> <span className="text-slate-500 dark:text-slate-400">— <AutoLink>{d.unterscheidung}</AutoLink></span></li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-5">
                <div className="label mb-2">Diagnostik (nicht-invasiv → invasiv)</div>
                <AutoLinkList items={c.medicalView.diagnostik} />
              </div>
              <div className="card p-5">
                <div className="label mb-2">Therapie</div>
                {c.medicalView.therapie.konservativ && <TherapieGroup title="Konservativ" items={c.medicalView.therapie.konservativ} />}
                {c.medicalView.therapie.interventionell && <TherapieGroup title="Interventionell" items={c.medicalView.therapie.interventionell} />}
                {c.medicalView.therapie.chirurgisch && <TherapieGroup title="Chirurgisch" items={c.medicalView.therapie.chirurgisch} />}
              </div>
            </div>

            {c.medicalView.erstmassnahmen && (
              <div className="card p-5">
                <div className="label mb-2">Erste Maßnahmen</div>
                <AutoLinkList items={c.medicalView.erstmassnahmen} />
              </div>
            )}

            {c.pruefungsfallen && c.pruefungsfallen.length > 0 && (
              <div className="card border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/10">
                <div className="label mb-2 text-amber-700 dark:text-amber-300">⚠ Cave-Radar — pièges de ce cas</div>
                <AutoLinkList items={c.pruefungsfallen} />
              </div>
            )}
          </div>

          {/* Colonne liens (interconnexion) */}
          <div className="space-y-4">
            {c.linkedFachwissenId && (
              <Link to={`/fachwissen/${c.linkedFachwissenId}`} className="card flex items-center justify-between p-4 hover:border-brand-400">
                <span className="font-medium">📚 Fachwissen</span><span className="text-slate-400">→</span>
              </Link>
            )}

            {linkedAufk.length > 0 && (
              <div className="card p-4">
                <div className="label mb-2">Wahrscheinliche Aufklärungen</div>
                <div className="space-y-1.5">
                  {linkedAufk.map((a) => (
                    <Link key={a.id} to={`/aufklaerung?open=${a.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800">
                      📋 {a.shortName ?? a.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {terms.length > 0 && (
              <div className="card p-4">
                <div className="label mb-2">Fachbegriffe ({terms.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {terms.map((t) => (
                    <button key={t.id} onClick={() => openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>
                  ))}
                </div>
                <Link to="/fachbegriffe/drill" className="btn-outline mt-3 w-full justify-center text-xs">🔤 Drill des termes du cas</Link>
              </div>
            )}

            {c.examinerQuestions.length > 0 && (
              <Toggle title="Fragen der Prüfer (déjà posées)">
                <AutoLinkList items={c.examinerQuestions} />
              </Toggle>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TherapieGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs font-semibold text-brand-600 dark:text-brand-300">{title}</div>
      <AutoLinkList items={items} className="mt-1 space-y-1 text-sm" />
    </div>
  );
}
