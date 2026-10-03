import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCase } from '@/hooks/useData';
import { Icon } from '@/components/icons';
import { usePatientFollow, useChapterFollow, useProbeFollow } from './usePatientSync';
import { guideToRoleKapitel } from '@/lib/rolePlay';
import { PatientSheetView } from '@/features/cases/PatientSheetView';
import { ExaminerSheetView } from './ExaminerSheetView';

// ============================================================================
// Fiches de rôle du simulant (2ᵉ écran / mobile) — route #/patient/:caseId.
// Deux rôles selon la partie : PATIENT (anamnèse) et MÉDECIN EXAMINATEUR
// (présentation, Teil 3). Suit le cas en direct (BroadcastChannel même appareil).
// ============================================================================
export function PatientScreen() {
  const { caseId } = useParams();
  const followed = usePatientFollow(caseId);
  const c = useCase(followed ?? caseId);
  const [tab, setTab] = useState<'patient' | 'examinateur'>('patient');
  // Suivi live : le candidat avance dans son guide → la fiche s'aligne.
  const liveChapter = useChapterFollow();
  const liveProbe = useProbeFollow();
  const [follow, setFollow] = useState(true);
  const followChapterId = follow && liveChapter ? guideToRoleKapitel(liveChapter) : null;

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="glass glass-edge sticky top-0 z-10 px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <Icon name="mask" className="h-6 w-6 text-brand-600 dark:text-brand-300" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">Fiches du simulant</div>
              <div className="truncate text-[11px] text-slate-400">{c ? c.name : 'En attente du cas…'}</div>
            </div>
            {tab === 'patient' && (
              <button onClick={() => setFollow((f) => !f)}
                title="La fiche saute automatiquement au chapitre que le candidat interroge"
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${follow ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                {follow ? <><Icon name="refresh" className="h-3.5 w-3.5" />Suit le candidat</> : <><Icon name="pause" className="h-3.5 w-3.5" />Suivi off</>}
              </button>
            )}
          </div>
          {c && (
            <div className="seg seg-xl mt-2 w-full">
              {/* `.seg` + `aria-pressed` : le cran choisi se lit (fond blanc, pétrole) et se dit
                au lecteur d'écran ; plus de flou imbriqué dans `header.glass`. */}
              <button type="button" aria-pressed={tab === 'patient'} onClick={() => setTab('patient')} className="flex flex-1 items-center justify-center gap-1.5"><Icon name="user" className="h-4 w-4" />Patient · Anamnèse</button>
              <button type="button" aria-pressed={tab === 'examinateur'} onClick={() => setTab('examinateur')} className="flex flex-1 items-center justify-center gap-1.5"><Icon name="stethoscope" className="h-4 w-4" />Médecin · Présentation</button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">
        {c ? (
          tab === 'patient'
            ? <PatientSheetView sheet={c.patientSheet} caseQuestions={c.caseSpecificQuestions} followChapterId={followChapterId} followProbeId={follow ? liveProbe : null} />
            : <ExaminerSheetView sheet={c.examinerSheet} fallback={c.examinerQuestions} caseName={c.name} caseSpecificQuestions={c.caseSpecificQuestions} />
        ) : (
          <div className="flex h-64 items-center justify-center text-slate-400">Aucun cas actif. Scanne le QR depuis la simulation.</div>
        )}
      </main>
    </div>
  );
}
