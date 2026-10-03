import type { Case } from '@/db/types';
import { RolePlayView } from '@/components/RolePlayView';
import { playedQuestionsByProbe } from '@/data/guides/anamneseChapters';

// ============================================================================
// Fiche de rôle PATIENT (pure) = Rollenskript jouable. Les questions liées au
// rôle PRÜFER (Fallspezifische Fragen, Fragen Teil 3) vivent dans la fiche
// Prüfer (ExaminerSheetView), pas ici.
// ============================================================================
export function PatientSheetView({ c, followChapterId, followProbeId }: {
  c: Case; followChapterId?: string | null; followProbeId?: string | null;
}) {
  return <RolePlayView sheet={c.patientSheet} caseQuestions={c.caseSpecificQuestions} played={playedQuestionsByProbe(c)} followChapterId={followChapterId} followProbeId={followProbeId} />;
}
