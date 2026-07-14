import { useState } from 'react';
import type { ChecklistItem, LanguageGrid, PartResult } from '@/db/types';
import { checklistFor } from '@/lib/checklists';
import { Icon } from '@/components/icons';
import { LANGUAGE_CRITERIA, emptyLanguageGrid, checklistPct, languagePct, partScore, PASS_THRESHOLD } from '@/lib/scoring';
import { ScoreBar } from '@/components/ui';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

// Écran de scoring d'une partie : checklist contenu + grille langue officielle
// (60% seuil) + curseur ressenti. Le score global se calcule tout seul.
export function PartEvaluation({ part, durationSec, onSave, onCancel }: {
  part: Part; durationSec: number;
  onSave: (r: PartResult) => void; onCancel: () => void;
}) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => checklistFor(part));
  const hasLang = part !== 'dokumentation';
  const [grid, setGrid] = useState<LanguageGrid>(emptyLanguageGrid());
  const [feeling, setFeeling] = useState(50);

  const toggle = (id: string) => setChecklist((cl) => cl.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));

  const contentPct = checklistPct(checklist);
  const officialPct = hasLang ? languagePct(grid) : 0;
  const preview: PartResult = {
    done: true, durationSec, checklist,
    languageGrid: hasLang ? grid : undefined, feeling,
    contentPct, officialPct,
  };
  const total = partScore(preview);
  const passed = total >= PASS_THRESHOLD;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Évaluation — {label(part)}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Coche ce que tu as réellement fait. Le score se calcule seul.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Checklist contenu */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="label">Checklist de contenu</div>
            <span className="text-sm font-bold">{contentPct}%</span>
          </div>
          <ul className="space-y-1.5">
            {checklist.map((it) => (
              <li key={it.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input type="checkbox" checked={it.checked} onChange={() => toggle(it.id)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                  <span className={`text-sm ${it.checked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>
                    {it.label}{(it.axisWeight ?? 1) > 1 && <span className="ml-1 text-[10px] font-bold text-brand-400">×{it.axisWeight}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {/* Grille langue officielle */}
          {hasLang && (
            <div className="card p-5">
              <div className="mb-1 flex items-center justify-between">
                <div className="label">Grille de langue (barème officiel)</div>
                <span className="text-sm font-bold">{officialPct}%</span>
              </div>
              <p className="mb-3 text-[11px] text-slate-400">Ce que le jury note vraiment (C1). 0 = faible, 5 = excellent.</p>
              <div className="space-y-3">
                {LANGUAGE_CRITERIA.map((crit) => (
                  <div key={crit.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium" title={crit.hint}>{crit.label}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-300">{grid[crit.key]}/5</span>
                    </div>
                    <input
                      type="range" min={0} max={5} value={grid[crit.key]}
                      onChange={(e) => setGrid({ ...grid, [crit.key]: +e.target.value })}
                      className="w-full accent-brand-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ressenti */}
          <div className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="label">Ressenti</div>
              <span className="text-sm font-bold">{feeling}</span>
            </div>
            <input type="range" min={0} max={100} value={feeling} onChange={(e) => setFeeling(+e.target.value)} className="w-full accent-brand-600" />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Fragile</span><span>Solide</span></div>
          </div>
        </div>
      </div>

      {/* Résultat */}
      <div className={`card p-5 ${passed ? 'border-emerald-300 dark:border-emerald-800' : 'border-rose-300 dark:border-rose-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Score de la partie</div>
            <div className={`text-3xl font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{total}%</div>
            <div className="flex items-center gap-1.5 text-sm">{passed ? <><Icon name="check" className="h-4 w-4 text-emerald-500" />Au-dessus du seuil (≥60%)</> : <><Icon name="alert" className="h-4 w-4 text-rose-500" />Sous le seuil des 60%</>}</div>
          </div>
          <div className="w-48 space-y-2">
            <ScoreBar pct={contentPct} label="Contenu" />
            {hasLang && <ScoreBar pct={officialPct} label="Langue" />}
            <ScoreBar pct={feeling} label="Ressenti" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">Retour</button>
        <button onClick={() => onSave(preview)} className="btn-primary px-6">Valider la partie ✓</button>
      </div>
    </div>
  );
}

function label(p: Part) {
  return p === 'dokumentation' ? 'Dokumentation' : p === 'anamnese' ? 'Anamnese' : p === 'fallvorstellung' ? 'Fallvorstellung' : 'Aufklärung';
}
