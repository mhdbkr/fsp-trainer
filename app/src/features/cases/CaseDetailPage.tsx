import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCase, useAufklaerungen } from '@/hooks/useData';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { CenterBadge, FreqBadge, DifficultyDots, StatusBadge, Toggle } from '@/components/ui';
import { PatientSheetView } from './PatientSheetView';
import { ExaminerSheetView } from '@/features/simulation/ExaminerSheetView';
import { Icon } from '@/components/icons';
import { SEC, SectionCard } from './medSections';
import { DIAGNOSTIK_STUFEN } from '@/db/types';
import { STUFE_META } from '@/features/fachwissen/stufeMeta';
import { DDTable } from '@/components/DDTable';
import { CaseTermsPanel } from '@/features/fachbegriffe/CaseTermsPanel';
import { CaseContext } from '@/features/fachbegriffe/CaseContext';

export function CaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const c = useCase(id);
  const aufk = useAufklaerungen();
  const [view, setView] = useState<'clinique' | 'rolle'>('clinique');
  const [role, setRole] = useState<'patient' | 'pruefer'>('patient');

  if (!c) return <div className="text-slate-400">Chargement…</div>;

  const linkedAufk = (aufk ?? []).filter((a) => c.probableAufklaerungIds.includes(a.id));

  return (
    <CaseContext.Provider value={c.id}>
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Cas clinique</div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">{c.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{c.specialty}</span>
            <FreqBadge n={c.frequency} />
            <StatusBadge status={c.status} />
            <DifficultyDots level={c.difficulty} />
            {c.centers.map((ct) => <CenterBadge key={ct} center={ct} />)}
          </div>
        </div>
        <Link to={`/simulation/${c.id}/pre`} className="btn-primary gap-1.5"><Icon name="play" className="h-4 w-4" />Simuler ce cas</Link>
      </header>

      {/* Vue principale = la fiche clinique. Le JEU DE RÔLE (simulant) est à part. */}
      <div className="flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        <button onClick={() => setView('clinique')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-medium ${view === 'clinique' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>
          <Icon name="nav-book" className="h-4 w-4" />Fiche clinique
        </button>
        <button onClick={() => setView('rolle')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-medium ${view === 'rolle' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>
          <Icon name="mask" className="h-4 w-4" />Jeu de rôle <span className="hidden text-xs opacity-60 sm:inline">(simulant)</span>
        </button>
      </div>

      {view === 'rolle' ? (
        <div className="space-y-3">
          {/* Sous-toggle des deux rôles du simulant — bien à part */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-900">
              <button onClick={() => setRole('patient')} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium ${role === 'patient' ? 'bg-amber-500 text-white' : 'text-slate-500'}`}><Icon name="user" className="h-4 w-4" />Patient</button>
              <button onClick={() => setRole('pruefer')} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium ${role === 'pruefer' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}><Icon name="stethoscope" className="h-4 w-4" />Prüfer</button>
            </div>
          </div>
          {role === 'patient'
            ? <PatientSheetView sheet={c.patientSheet} />
            : <ExaminerSheetView sheet={c.examinerSheet} fallback={c.examinerQuestions} caseName={c.name} caseSpecificQuestions={c.caseSpecificQuestions} />}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Verdachtsdiagnose — carte héro : la conclusion, mise en avant */}
            <div className="card relative overflow-hidden bg-gradient-to-br from-brand-50 to-transparent p-5 pl-6 dark:from-brand-900/20">
              <span className={`absolute inset-y-0 left-0 w-1.5 ${SEC.verdacht.edge}`} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 text-[10px] font-semibold text-brand-500 dark:text-brand-300">Verdachtsdiagnose · Diagnostic suspecté</div>
                  <p className="font-display text-xl font-bold leading-tight text-brand-800 dark:text-brand-200"><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></p>
                </div>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm ${SEC.verdacht.badge}`}><Icon name="target" className="h-6 w-6" /></span>
              </div>
              {c.medicalView.notfall && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  <Icon name="alert" className="h-3.5 w-3.5" />Notfall
                </span>
              )}
            </div>

            <SectionCard sec="dd" sub={`${c.medicalView.differenzialdiagnosen.length} à écarter — mit Kriterien`}>
              <DDTable items={c.medicalView.differenzialdiagnosen} />
            </SectionCard>

            <div className="grid gap-4 sm:grid-cols-2">
              <SectionCard sec="diagnostik" sub="Anamnese → Labor → Bildgebung → Invasiv">
                <ol className="space-y-2.5">
                  {DIAGNOSTIK_STUFEN.map((stufe, si) => {
                    const items = c.medicalView.diagnostik.filter((d) => d.stufe === stufe);
                    if (!items.length) return null;
                    const meta = STUFE_META[stufe];
                    return (
                      <li key={stufe} className="flex gap-2.5">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${meta.dot}`}>{si + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[11px] font-semibold ${meta.text}`}>{stufe}</div>
                          <AutoLinkList items={items.map((d) => d.text)} className="mt-0.5 space-y-1 text-sm" />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </SectionCard>
              <SectionCard sec="therapie">
                {c.medicalView.therapie.map((sek, i) => (
                  <TherapieGroup key={i} title={sek.label} tone={sek.akut ? 'bg-rose-400' : ['bg-emerald-400', 'bg-amber-400', 'bg-sky-400', 'bg-violet-400'][i % 4]} items={sek.items} />
                ))}
              </SectionCard>
            </div>

            {c.medicalView.erstmassnahmen && (
              <SectionCard sec="erst">
                <AutoLinkList items={c.medicalView.erstmassnahmen} />
              </SectionCard>
            )}

            {c.pruefungsfallen && c.pruefungsfallen.length > 0 && (
              <div className="card relative overflow-hidden border-rose-200 bg-rose-50/60 p-5 pl-6 dark:border-rose-900/40 dark:bg-rose-900/10">
                <span className={`absolute inset-y-0 left-0 w-1.5 ${SEC.cave.edge}`} />
                <div className="mb-3 flex items-center gap-2.5">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-sm ${SEC.cave.badge}`}><Icon name="alert" className="h-[18px] w-[18px]" /></span>
                  <div className="leading-none">
                    <div className="font-display text-[15px] font-bold tracking-tightish text-rose-700 dark:text-rose-300">Cave-Radar</div>
                    <div className="mt-1 text-[10px] font-semibold text-rose-400">Pièges de ce cas</div>
                  </div>
                </div>
                <AutoLinkList items={c.pruefungsfallen} />
              </div>
            )}
          </div>

          {/* Colonne liens (interconnexion) */}
          <div className="space-y-4">
            {c.linkedFachwissenId && (
              <Link to={`/fachwissen/${c.linkedFachwissenId}`} className="card flex items-center justify-between p-4 hover:border-brand-400">
                <span className="flex items-center gap-1.5 font-medium"><Icon name="nav-book" className="h-4 w-4" />Fachwissen</span><span className="text-slate-400">→</span>
              </Link>
            )}

            {linkedAufk.length > 0 && (
              <div className="card p-4">
                <div className="label mb-2">Wahrscheinliche Aufklärungen</div>
                <div className="space-y-1.5">
                  {linkedAufk.map((a) => (
                    <Link key={a.id} to={`/aufklaerung?open=${a.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800">
                      <span className="flex items-center gap-1.5"><Icon name="nav-clipboard" className="h-4 w-4 shrink-0" />{a.shortName ?? a.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <CaseTermsPanel caseId={c.id} mode="inline" onDrill={() => navigate(`/fachbegriffe/drill?case=${c.id}`)} />

            {c.examinerQuestions.length > 0 && (
              <Toggle title="Fragen der Prüfer (déjà posées)">
                <AutoLinkList items={c.examinerQuestions} />
              </Toggle>
            )}
          </div>
        </div>
      )}
    </div>
    </CaseContext.Provider>
  );
}

function TherapieGroup({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className={`h-2 w-2 rounded-full ${tone}`} />{title}
      </div>
      <AutoLinkList items={items} className="mt-1.5 space-y-1 text-sm" />
    </div>
  );
}
