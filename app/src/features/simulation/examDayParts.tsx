// Vues du Prüfungstag (BW) — rendu par phase, sans aucune aide (spec §5.3,
// « rien sauf ce qui est autorisé ») : Bogen, Arztbrief, transition, modale
// Aufklärung sans fiche. Aucune logique de temps ici : le runner décide.
import type { ReactNode } from 'react';
import type { BogenNotes, MusterCity } from '@/db/types';
import { Icon } from '@/components/icons';
import { AnamneseBogen } from './AnamneseBogen';
import type { ExamDayPart } from './examDayPlan';

const noop = () => {};

/** Un `<fieldset disabled>` fige nativement inputs, textareas et boutons —
 *  aucun état à propager, aucun oubli possible. */
function Frozen({ frozen, children }: { frozen: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={frozen || undefined} className="min-w-0 border-0 p-0" data-frozen={frozen || undefined}>
      {children}
    </fieldset>
  );
}

export function ExamBogen({ muster, notes, onChange, frozen }: {
  muster: MusterCity; notes: BogenNotes; onChange: (n: BogenNotes) => void; frozen: boolean;
}) {
  return (
    <Frozen frozen={frozen}>
      <AnamneseBogen muster={muster} notes={notes} onChange={frozen ? noop : onChange} assistance="autonome" />
    </Frozen>
  );
}

export function ExamArztbrief({ text, onChange, frozen }: { text: string; onChange: (t: string) => void; frozen: boolean }) {
  return (
    <Frozen frozen={frozen}>
      <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-2 border-b-2 border-slate-800 pb-2 text-sm font-bold uppercase tracking-wide dark:border-slate-300">Arztbrief</div>
        <textarea
          data-arztbrief
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={frozen}
          rows={18}
          className="w-full resize-y rounded-md bg-transparent px-1 py-1 font-mono text-sm leading-relaxed outline-none"
        />
      </div>
    </Frozen>
  );
}

export function ExpiredBanner() {
  return (
    <div data-exam-banner role="status" className="card border-signal-500/40 bg-signal-500/10 p-3 text-center text-sm font-semibold">
      Zeit ist um
    </div>
  );
}

const TRANSITION_TEXT: Record<ExamDayPart, string> = {
  anamnese: 'Notizen eingesammelt. Bereite dich auf den Arztbrief vor.',
  dokumentation: 'Simulant: wechsle zum Examinateur-Tab.',
  fallvorstellung: 'Prüfung beendet. Weiter zur Bewertung.',
};

export function TransitionView({ from, remaining, onReady }: { from: ExamDayPart; remaining: number; onReady: () => void }) {
  return (
    <div className="card mx-auto max-w-lg space-y-4 p-6 text-center">
      <div className="label">Übergang</div>
      <p className="text-base">{TRANSITION_TEXT[from]}</p>
      <div className="readout font-mono text-xs text-slate-400">automatisch in {remaining} s</div>
      <button onClick={onReady} className="btn-primary mx-auto gap-1.5">
        <Icon name="play" className="h-4 w-4" />Bereit
      </button>
    </div>
  );
}

/** Modale Aufklärung SANS fiche : le simulant a la sienne (spec §5.3). */
export function AufklaerungModal({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <div className="card w-full max-w-md space-y-4 p-6 text-center">
        <div className="text-lg font-bold">Aufklärung</div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Der Simulant hat sein Blatt. Kläre auf, dann schließe.</p>
        <button onClick={onClose} className="btn-primary mx-auto">Schließen</button>
      </div>
    </div>
  );
}

export function ExamHeader({ partLabel, remaining, patient, onAbort }: {
  partLabel: string; remaining: number; patient: { name: string; age: number; motif: string } | null; onAbort: () => void;
}) {
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return (
    <header className="card sticky top-14 z-30 flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <div className="label">Prüfungstag · BW</div>
        <div className="truncate text-sm font-semibold">{partLabel}</div>
        {patient ? (
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {patient.name} · {patient.age} J. · {patient.motif}
          </div>
        ) : (
          <div className="text-xs text-slate-400">Chargement…</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="readout font-mono text-2xl tabular-nums" aria-label="Restzeit">{mm}:{ss}</div>
        <button onClick={onAbort} className="btn-ghost text-xs text-slate-400" title="Prüfungstag abbrechen">Abbrechen</button>
      </div>
    </header>
  );
}
