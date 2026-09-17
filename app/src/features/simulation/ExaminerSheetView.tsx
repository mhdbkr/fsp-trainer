import { cqText } from '@/lib/caseQuestions';
import type { CaseQuestion } from '@/db/types';
import type { ExaminerSheetSection } from '@/db/types';
import { Icon } from '@/components/icons';

// ============================================================================
// Fiche de rôle du médecin examinateur (Prüfer, Teil 3). Le simulant joue le
// senior : il écoute la présentation, vérifie que le candidat a couvert les
// bonnes questions (checklist), puis pose ses questions et connaît l'attendu.
// Enrichi au cas par cas (sections frage + réaction attendue).
// ============================================================================
export function ExaminerSheetView({ sheet, fallback, caseName, caseSpecificQuestions = [] }: {
  sheet?: ExaminerSheetSection[]; fallback: string[]; caseName: string; caseSpecificQuestions?: CaseQuestion[];
}) {
  const sections: ExaminerSheetSection[] = sheet ?? (fallback.length ? [{ title: 'Fragen der Prüfer', interactions: fallback.map((f) => ({ frage: f })) }] : []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900/40 dark:bg-violet-900/10 dark:text-violet-200">
        <Icon name="stethoscope" className="mr-1 inline-block h-4 w-4 align-[-3px]" /><b>Du bist der Oberarzt / die Oberärztin</b> — le candidat te présente <b>{caseName}</b>. Écoute, coche mentalement ce qu'il a couvert, puis pose tes questions. La « réaction attendue » t'indique ce qu'une bonne réponse contient — pour rebondir, pas à lire à voix haute.
      </div>

      {/* Checklist : les questions que le candidat AURAIT dû poser pendant l'anamnèse */}
      {caseSpecificQuestions.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Icon name="question" className="h-4 w-4" /> Hat der Kandidat danach gefragt?
          </div>
          <ul className="space-y-1.5">
            {caseSpecificQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 shrink-0 rounded border border-slate-300 px-1 text-[10px] text-slate-400 dark:border-slate-600">☐</span>
                <span>{cqText(q)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.length === 0 ? (
        <p className="text-sm text-slate-400">Pas de fiche examinateur pour ce cas.</p>
      ) : (
        sections.map((sec, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-violet-50/50 px-4 py-2 dark:border-slate-800 dark:bg-violet-900/10">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-[11px] font-bold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">{i + 1}</span>
              <span className="text-sm font-semibold">{sec.title}</span>
            </div>
            <ol className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {sec.interactions.map((it, j) => (
                <li key={j} className="px-4 py-2.5">
                  <div className="flex gap-2 text-sm font-medium">
                    <span className="shrink-0 text-violet-500">?</span>
                    <span>{it.frage}</span>
                  </div>
                  {it.reaktion && (
                    <p className="ml-5 mt-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800 dark:bg-emerald-900/15 dark:text-emerald-300">
                      ✓ Attendu : {it.reaktion}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))
      )}
    </div>
  );
}
