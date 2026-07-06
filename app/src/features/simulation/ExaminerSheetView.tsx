import type { ExaminerSheetSection } from '@/db/types';

// ============================================================================
// Fiche de rôle du médecin examinateur (Teil 3). Le simulant joue le senior :
// il pose les questions et connaît la réaction/attendu, pour réagir en direct
// à la présentation du candidat. Au cas par cas.
// ============================================================================
export function ExaminerSheetView({ sheet, fallback, caseName }: {
  sheet?: ExaminerSheetSection[]; fallback: string[]; caseName: string;
}) {
  const sections: ExaminerSheetSection[] = sheet ?? (fallback.length ? [{ title: 'Questions de l\'examinateur', interactions: fallback.map((f) => ({ frage: f })) }] : []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
        👨‍⚕️ <b>Rôle : médecin senior</b> — le candidat te présente <b>{caseName}</b>. Écoute sa présentation, puis pose ces questions dans l'ordre qui te semble naturel. La « réaction attendue » t'indique ce qu'une bonne réponse contient (pour rebondir), sans la lire à voix haute.
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-slate-400">Pas de fiche examinateur pour ce cas.</p>
      ) : (
        sections.map((sec, i) => (
          <div key={i} className="card p-4">
            <div className="label mb-2">{sec.title}</div>
            <ol className="space-y-3">
              {sec.interactions.map((it, j) => (
                <li key={j}>
                  <div className="flex gap-2 text-sm font-medium">
                    <span className="text-amber-600 dark:text-amber-400">?</span>
                    <span>{it.frage}</span>
                  </div>
                  {it.reaktion && (
                    <p className="ml-5 mt-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      💬 {it.reaktion}
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
