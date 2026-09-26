import type { CaseQuestion, PatientSheet } from '@/db/types';
import { RolePlayView } from '@/components/RolePlayView';

// ============================================================================
// Fiche de rôle PATIENT (pure) = Rollenskript jouable. Les questions liées au
// rôle PRÜFER (Fallspezifische Fragen, Fragen Teil 3) vivent dans la fiche
// Prüfer (ExaminerSheetView), pas ici.
// ============================================================================
export function PatientSheetView({ sheet, caseQuestions, followChapterId, followProbeId }: {
  sheet: PatientSheet; caseQuestions?: CaseQuestion[]; followChapterId?: string | null; followProbeId?: string | null;
}) {
  return <RolePlayView sheet={sheet} caseQuestions={caseQuestions} followChapterId={followChapterId} followProbeId={followProbeId} />;
}
