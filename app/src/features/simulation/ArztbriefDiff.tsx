import type { ArztbriefFeedback } from '@/lib/arztbriefCompare';
import { blockLabel, ARZTBRIEF_BLOCKS } from '@/lib/arztbriefCompare';
import { ScoreBar } from '@/components/ui';

// Feedback formatif de l'Arztbrief : blocs présents/manquants + registre.
// N'affiche JAMAIS de courrier corrigé — juste des repères pour progresser.
export function ArztbriefDiff({ fb }: { fb: ArztbriefFeedback }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-brand-600 dark:text-brand-300">{fb.coveragePct}%</div>
          <div className="text-[11px] text-slate-400">blocs couverts</div>
        </div>
        <div className="flex-1">
          <ScoreBar pct={fb.coveragePct} label={`${fb.blocksPresent.length}/${ARZTBRIEF_BLOCKS.length} blocs · ${fb.wordCount} mots`} />
        </div>
      </div>

      {/* Grille de blocs illustrée */}
      <div>
        <div className="label mb-2">Structure attendue</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ARZTBRIEF_BLOCKS.map((b) => {
            const present = fb.blocksPresent.includes(b.key);
            return (
              <div key={b.key} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] ${present ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/10 dark:text-rose-300'}`}>
                <span>{present ? '✓' : '○'}</span>{blockLabel(b.key)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Registre */}
      <div>
        <div className="label mb-2">Registre / grammaire</div>
        <div className="space-y-1.5">
          {fb.registerFlags.map((r) => (
            <div key={r.key} className={`rounded-lg border px-3 py-2 text-sm ${r.ok ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'}`}>
              <div className="flex items-center gap-2 font-medium">
                <span>{r.ok ? '✓' : '⚠'}</span>{r.label}
              </div>
              {!r.ok && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{r.hint}</p>}
            </div>
          ))}
        </div>
      </div>

      {fb.blocksMissing.length > 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          À retravailler : <b>{fb.blocksMissing.map(blockLabel).join(', ')}</b>. Complète ton texte, ce n'est pas corrigé à ta place.
        </p>
      )}
    </div>
  );
}
