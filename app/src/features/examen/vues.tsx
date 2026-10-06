// Les vues de l'Examen (simulation-run.md §11.2) — portées de `feat/pruefungstag` (examDayParts.tsx), sur le Muster guidé
// ou libre de `main`. Aucune aide ici (scripts/checkExamen.mjs) et aucune logique de temps : le runner décide.
import type { ReactNode } from 'react';
import type { BogenNotes, Case, MusterArt, MusterCity, SimTeil } from '@/db/types';
import { AnamneseBogen } from '@/features/simulation/AnamneseBogen';

/** Un `<fieldset disabled>` fige nativement champs et boutons : aucun état à propager, aucun oubli possible. */
function Frozen({ frozen, children }: { frozen: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={frozen || undefined} className="min-w-0 border-0 p-0" data-frozen={frozen || undefined}>
      {children}
    </fieldset>
  );
}

const rien = () => {};

export function ExamBogen({ c, muster, notes, onChange, frozen }: {
  c: Case; muster?: MusterArt | MusterCity; notes: BogenNotes; onChange: (n: BogenNotes) => void; frozen: boolean;
}) {
  return (
    <Frozen frozen={frozen}>
      <AnamneseBogen c={c} muster={muster} notes={notes} onChange={frozen ? rien : onChange} assistance="autonome" />
    </Frozen>
  );
}

export function ExamArztbrief({ text, onChange, frozen }: { text: string; onChange: (t: string) => void; frozen: boolean }) {
  return (
    <Frozen frozen={frozen}>
      <label className="panel block bg-paper/70 p-4 dark:bg-ink-800/60">
        <span className="mb-2 block border-b-2 border-ink-700/70 pb-2 text-sm font-bold dark:border-slate-300/60">Arztbrief</span>
        <textarea
          data-arztbrief
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={frozen}
          rows={18}
          className="input w-full resize-y font-mono text-sm leading-relaxed"
        />
      </label>
    </Frozen>
  );
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** L'en-tête collant : le Teil, l'horloge murale, et la seule commande — abandonner. À 5:00 et à 1:00, l'alerte. */
export function ExamHeader({ titre, rang, reste, alerte, onAbandon }: {
  titre: string; rang: string; reste: number | null; alerte: number | null; onAbandon: () => void;
}) {
  return (
    <header className={`card sticky top-14 z-30 p-3 ${alerte !== null ? 'border-signal-400 bg-signal-50/90 dark:border-signal-600 dark:bg-signal-900/30' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="label whitespace-nowrap">Examen · {rang}</div>
          <div className="truncate text-sm font-semibold">{titre}</div>
        </div>
        <div className="flex items-center gap-2">
          {reste !== null && (
            <div data-examen-reste={reste} aria-label="Temps restant"
              className={`font-mono text-2xl font-semibold tnum ${alerte !== null ? 'text-signal-600 dark:text-signal-300' : ''}`}>{mmss(reste)}</div>
          )}
          <button type="button" onClick={onAbandon} className="btn-ghost min-h-11 text-xs text-slate-500">Abandonner</button>
        </div>
      </div>
      {alerte !== null && (
        <p role="status" data-examen-alerte={alerte} className="mt-2 text-sm font-semibold text-signal-700 dark:text-signal-200">
          {alerte >= 120 ? `Plus que ${Math.round(alerte / 60)} minutes.` : 'Plus qu’une minute.'}
        </p>
      )}
    </header>
  );
}

/** L'Aufklärung, en conditions réelles : la demande du jury, rien d'autre — ni trame, ni risques, ni questions. */
export function AufklaerungAuftrag({ acte }: { acte: string | null }) {
  return (
    <div className="card p-4">
      <div className="label">Le jury interrompt l’entretien</div>
      <p className="mt-1 text-base font-semibold">« Klären Sie den Patienten {acte ? `über ${acte} ` : ''}auf. »</p>
    </div>
  );
}

const APRES: Record<SimTeil, string> = {
  anamnese: 'Anamnese terminée : tes notes restent sous tes yeux, en lecture seule. Prépare l’Arztbrief.',
  dokumentation: 'Dokumentation terminée. Simulant : tu deviens l’examinateur.',
  fallvorstellung: '',
};

/** La transition entre deux Teile : elle part seule à l'échéance ; « Prêt » l'abrège. */
export function TransitionView({ de, vers, reste, onPret }: { de: SimTeil; vers: string; reste: number; onPret: () => void }) {
  return (
    <div className="card mx-auto max-w-lg space-y-4 p-6 text-center">
      <p className="text-base">{APRES[de]}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{vers} commence dans <span className="font-mono tnum">{reste} s</span>.</p>
      <button type="button" onClick={onPret} className="btn-primary mx-auto min-h-11">Prêt</button>
    </div>
  );
}
