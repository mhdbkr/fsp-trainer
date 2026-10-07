import { useState } from 'react';
import type { ChecklistItem, LanguageGrid, LeitsymptomKategorie, PartResult } from '@/db/types';
import { Icon } from '@/components/icons';
import { checklistFor } from '@/lib/checklists';
import { LANGUAGE_CRITERIA, NOT_ENTERED, checklistPct, emptyLanguageGrid, isEntered, languageGridEntered, languagePct, partScore, scoreBasis, scoreBasisLabel, PASS_THRESHOLD } from '@/lib/scoring';
import { ScoreBar } from '@/components/ui';
import { ARTICLE } from '@/components/visuals/CaseDialText';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

// ============================================================================
// Le BILAN de la partie qui vient d'être jouée : checklist de contenu + grille
// de langue Doctopus + curseur ressenti. Le score se calcule seul.
//
// Ce composant n'a plus AUCUN état. La checklist, la grille et le ressenti sont
// des champs du `Lauf` (contrat §1) : il les reçoit et les repousse. Avant, un
// `useState(() => checklistFor(part))` reconstruisait la liste avec
// `checked: false` en dur — tout ce qui avait été coché pendant la partie était
// perdu, et quitter puis « Reprendre » rouvrait un bilan vierge.
//
// DEUX sorties, DEUX destinations (contrat §2.1 règle 4). « Valider » et
// « Retour » menaient tous deux à `setPhase('play')` : deux boutons, une seule
// destination, et l'exercice terminé qui se réaffichait.
// ============================================================================

export interface PartEvaluationProps {
  part: Part;
  durationSec: number;
  checklist: ChecklistItem[];
  grid: LanguageGrid;
  feeling: number;
  onToggle: (id: string, checked: boolean) => void;
  onGrid: (g: LanguageGrid) => void;
  onFeeling: (v: number) => void;
  /** Teil suivant à jouer — `null` quand c'est la dernière partie. */
  suivant: string | null;
  onSuivant: () => void;
  /** Absent ⇒ pas de « Revenir à la partie » (l'Examen n'a pas de retour, simulation-run.md §11.1). */
  onRetour?: () => void;
  /** Sortie de validation propre à l'auto-évaluation HORS Lauf
   *  (`SelbstBewertung`). Le runner ne la passe pas : sa sortie de fin vit
   *  dans l'en-tête collant (« zéro doublon »). */
  onTerminer?: () => void;
  terminerLabel?: string;
  /** Libellés des deux sorties. Ils DISENT la destination — c'est tout l'objet
   *  de la correction : « Valider » et « Retour » menaient au même écran. */
  suivantLabel?: (suivant: string) => string;
}

export function PartEvaluation({
  part, durationSec, checklist, grid, feeling,
  onToggle, onGrid, onFeeling, suivant, onSuivant, onRetour, onTerminer, terminerLabel,
  suivantLabel = (s) => `Partie suivante — ${s} →`,
}: PartEvaluationProps) {
  const hasLang = part !== 'dokumentation';
  const contentPct = checklistPct(checklist);
  const officialPct = hasLang ? languagePct(grid) : 0;
  const langueNotee = hasLang && languageGridEntered(grid);
  const nbNotes = Object.values(grid).filter(isEntered).length;
  const preview: PartResult = {
    done: true, durationSec, checklist,
    languageGrid: hasLang ? grid : undefined, feeling,
    contentPct, officialPct,
  };
  const total = partScore(preview);
  const basis = scoreBasis(preview);
  const passed = total >= PASS_THRESHOLD;
  const coches = checklist.filter((i) => i.checked).length;
  const toutCoche = coches === checklist.length && checklist.length > 0;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Bilan — {label(part)}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Coche ce que tu as réellement fait. Le score se calcule seul.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Checklist contenu */}
        <div className="card p-5">
          <div className="mb-1 flex items-center justify-between">
            <div className="label">Checklist de contenu</div>
            <span className="text-sm font-bold">{contentPct}%</span>
          </div>

          {/* Raccourci de SAISIE, pas un score offert (décision de direction).
              Il est discret, annonce ce qu'il est, et s'annule d'un geste : le
              contenu pèse 55 % du score de la partie (`scoring.ts:46`) et la
              checklist est pondérée — tout cocher donnerait 100 % de contenu. */}
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2 dark:border-ink-600/70">
            <span className="text-[11px] text-slate-400">
              Raccourci de saisie · <span className="mono-tag">{coches}/{checklist.length}</span>
            </span>
            <button
              type="button"
              onClick={() => checklist.forEach((i) => onToggle(i.id, !toutCoche))}
              className="text-[11.5px] font-medium text-slate-400 underline decoration-dotted underline-offset-4 hover:text-brand-600 dark:hover:text-brand-300"
            >
              {toutCoche ? 'Tout décocher' : 'Tout cocher'}
            </button>
          </div>

          <ul className="space-y-1.5">
            {checklist.map((it) => (
              <li key={it.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input type="checkbox" checked={it.checked} onChange={() => onToggle(it.id, !it.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                  <span className={`text-sm ${it.checked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>
                    {it.label}{(it.axisWeight ?? 1) > 1 && <span className="ml-1 text-[10px] font-bold text-brand-400">×{it.axisWeight}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {/* Grille de langue Doctopus */}
          {hasLang && (
            <div className="card p-5">
              <div className="mb-1 flex items-center justify-between">
                <div className="label">Grille Doctopus · langue</div>
                <span className="text-sm font-bold">{langueNotee ? `${officialPct}%` : `${nbNotes}/5 notés`}</span>
              </div>
              <p className="mb-3 text-[11px] text-slate-400">Notre grille de travail, pas le barème du jury. 0 = faible, 5 = excellent. La langue compte dans le score quand les 5 critères sont notés.</p>
              <div className="space-y-3">
                {LANGUAGE_CRITERIA.map((crit) => (
                  <Curseur
                    key={crit.key} id={`langue-${crit.key}`} label={crit.label} hint={crit.hint}
                    min={0} max={5} value={grid[crit.key]} suffix="/5"
                    onValue={(v) => onGrid({ ...grid, [crit.key]: v })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ressenti */}
          <div className="card p-5">
            <Curseur
              id="ressenti" label="Ressenti" min={0} max={100} value={feeling} display="ressenti-valeur" heading
              onValue={onFeeling}
            />
            <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Fragile</span><span>Solide</span></div>
          </div>
        </div>
      </div>

      {/* Résultat */}
      <div className={`card p-5 ${passed ? 'border-emerald-300 dark:border-emerald-800' : 'border-rose-300 dark:border-rose-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Score de {ARTICLE[part]}</div>
            <div className={`text-3xl font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{total}%</div>
            <div className="flex items-center gap-1.5 text-sm">{passed ? <><Icon name="check" className="h-4 w-4 text-emerald-500" />Au-dessus du seuil (≥60%)</> : <><Icon name="alert" className="h-4 w-4 text-rose-500" />Sous le seuil des 60%</>}</div>
          </div>
          <div className="w-48 space-y-2">
            <ScoreBar pct={contentPct} label="Contenu" />
            {langueNotee && <ScoreBar pct={officialPct} label="Langue" />}
            {isEntered(feeling) && <ScoreBar pct={feeling} label="Ressenti" />}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Calculé sur : {scoreBasisLabel(basis)}
          {hasLang && !langueNotee && ' — note les 5 critères de langue pour qu\'elle compte.'}
        </p>
      </div>

      {/* Les sorties sont DISTINCTES et nommées par leur destination.
          « Terminer la simulation → » n'est PAS ici : il vit dans l'en-tête
          collant, toujours visible (décision de main, « zéro doublon »). */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onRetour && (
          <button onClick={onRetour} className="btn-ghost" title="Reprendre la partie là où tu l'as laissée — le chrono ne repart pas de zéro">
            <Icon name="refresh" className="h-4 w-4" />Revenir à la partie
          </button>
        )}
        {suivant
          ? <button onClick={onSuivant} className="btn-primary px-6">{suivantLabel(suivant)}</button>
          : null}
        {onTerminer && (
          <button onClick={onTerminer} className={suivant ? 'btn-outline' : 'btn-primary px-6'}>{terminerLabel}</button>
        )}
      </div>
    </div>
  );
}

/** Curseur « vide » tant que le candidat n'y a pas touché : valeur affichée « — »,
 *  poignée atténuée. Un clic sans déplacement le saisit aussi (`pointerup`), car
 *  la poignée est posée au milieu. Défini hors du parent (leçon `Seg`). */
function Curseur({ id, label, hint, min, max, value, suffix = '', display, heading, onValue }: {
  id: string; label: string; hint?: string; min: number; max: number; value: number; suffix?: string;
  display?: string; heading?: boolean; onValue: (v: number) => void;
}) {
  const vide = !isEntered(value);
  return (
    <div>
      <div className={`flex items-center justify-between ${heading ? 'mb-2' : 'text-xs'}`}>
        <label htmlFor={id} className={heading ? 'label' : 'font-medium'} title={hint}>{label}</label>
        <span data-testid={display} className={`font-bold ${heading ? 'text-sm' : 'text-brand-600 dark:text-brand-300'} ${vide ? 'text-slate-400 dark:text-slate-500' : ''}`}>
          {vide ? `—${suffix}` : `${value}${suffix}`}
        </span>
      </div>
      <input
        id={id} type="range" min={min} max={max} value={vide ? Math.round((min + max) / 2) : value}
        aria-valuetext={vide ? 'pas encore noté' : undefined}
        data-vide={vide || undefined}
        onChange={(e) => onValue(+e.target.value)}
        onPointerUp={(e) => { if (vide) onValue(+e.currentTarget.value); }}
        className={`w-full accent-brand-600 ${vide ? 'opacity-40' : ''}`}
      />
    </div>
  );
}

function label(p: Part) {
  return p === 'dokumentation' ? 'Dokumentation' : p === 'anamnese' ? 'Anamnese' : p === 'fallvorstellung' ? 'Fallvorstellung' : 'Aufklärung';
}

// ---------------------------------------------------------------------------
/** Auto-évaluation HORS d'une partie jouée dans l'app : le retour d'une
 *  simulation avec une IA externe (`PendingExternalSimCard`). Il n'y a pas de
 *  `Lauf` derrière, donc l'état vit ici — c'est le seul cas où c'est légitime,
 *  et il est nommé. Le composant de bilan, lui, reste sans état. */
export function SelbstBewertung({ part, durationSec, suivant, kategorie, onSave, onCancel }: {
  part: Part; durationSec: number; suivant: string | null; kategorie?: LeitsymptomKategorie;
  onSave: (r: PartResult) => void; onCancel: () => void;
}) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => checklistFor(part, kategorie));
  const [grid, setGrid] = useState<LanguageGrid>(emptyLanguageGrid);
  const [feeling, setFeeling] = useState(NOT_ENTERED);
  const hasLang = part !== 'dokumentation';

  const valider = () => {
    const contentPct = checklistPct(checklist);
    const officialPct = hasLang ? languagePct(grid) : 0;
    onSave({ done: true, durationSec, checklist, languageGrid: hasLang ? grid : undefined, feeling, contentPct, officialPct });
  };

  return (
    <PartEvaluation
      part={part}
      durationSec={durationSec}
      checklist={checklist}
      grid={grid}
      feeling={feeling}
      onToggle={(id, checked) => setChecklist((cl) => cl.map((it) => (it.id === id ? { ...it, checked } : it)))}
      onGrid={setGrid}
      onFeeling={setFeeling}
      // Une auto-évaluation est strictement séquentielle : il n'y a pas de
      // « sauter à la fin ». UNE sortie, dont le libellé nomme la destination.
      suivant={null}
      onSuivant={valider}
      onTerminer={valider}
      onRetour={onCancel}
      terminerLabel={suivant ? `Valider — ${suivant} ensuite →` : 'Valider et enregistrer →'}
    />
  );
}
