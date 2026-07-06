import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCase } from '@/hooks/useData';
import { usePatientFollow } from './usePatientSync';
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

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <div>
              <div className="text-sm font-bold">Fiches du simulant</div>
              <div className="text-[11px] text-slate-400">{c ? c.name : 'En attente du cas…'} · suit la simulation en direct</div>
            </div>
          </div>
          {c && (
            <div className="mt-2 flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
              <button onClick={() => setTab('patient')} className={`flex-1 rounded-md py-1.5 font-medium ${tab === 'patient' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>🧑 Patient · Anamnèse</button>
              <button onClick={() => setTab('examinateur')} className={`flex-1 rounded-md py-1.5 font-medium ${tab === 'examinateur' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>👨‍⚕️ Médecin · Présentation</button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">
        {c ? (
          tab === 'patient'
            ? <PatientSheetView sheet={c.patientSheet} caseSpecificQuestions={c.caseSpecificQuestions} examinerQuestions={[]} />
            : <ExaminerSheetView sheet={c.examinerSheet} fallback={c.examinerQuestions} caseName={c.name} />
        ) : (
          <div className="flex h-64 items-center justify-center text-slate-400">Aucun cas actif. Scanne le QR depuis la simulation.</div>
        )}
      </main>
    </div>
  );
}
