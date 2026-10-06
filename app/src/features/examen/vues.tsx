// Les vues de l'Examen (simulation-run.md §11.2) — portées de `feat/pruefungstag` (examDayParts.tsx), sur le Muster guidé
// ou libre de `main`. Aucune aide ici (scripts/checkExamen.mjs) et aucune logique de temps : le runner décide.
import { useEffect, useRef, type ReactNode } from 'react';
import type { BogenNotes, Case, MusterArt, MusterCity, SimTeil } from '@/db/types';
import { AnamneseBogen } from '@/features/simulation/AnamneseBogen';

/** Un `<fieldset disabled>` fige nativement champs et boutons : aucun état à propager, aucun oubli possible. Figé, il le
 *  dit : « Lecture seule ». */
function Frozen({ frozen, children }: { frozen: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={frozen || undefined} className={`min-w-0 border-0 p-0 ${frozen ? 'opacity-90' : ''}`} data-frozen={frozen || undefined}>
      {frozen && <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Lecture seule</p>}
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

/** Le texte d'une alerte de la minuterie (5:00, 1:00). */
export const texteAlerte = (alerte: number) => (alerte >= 120 ? `Plus que ${Math.round(alerte / 60)} minutes.` : 'Plus qu’une minute.');

/** L'en-tête collant : « Fallvorstellung · 3/3 », la minuterie du créneau, le partenaire IA s'il y en a un, et la seule
 *  commande — abandonner. À l'alerte, le corail tient à la minuterie et à la bordure ; le texte reste à l'encre. */
export function ExamHeader({ titre, reste, alerte, partenaire, onAbandon }: {
  titre: string; reste: number | null; alerte: number | null; partenaire?: ReactNode; onAbandon: () => void;
}) {
  return (
    <header className={`card sticky top-14 z-30 p-3 ${alerte !== null ? 'border-signal-400 dark:border-signal-600' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-semibold">{titre}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          {reste !== null && (
            <div role="timer" data-examen-reste={reste} aria-label="Temps restant"
              className={`font-mono text-xl font-semibold tnum sm:text-2xl ${alerte !== null ? 'text-signal-600 dark:text-signal-300' : ''}`}>{mmss(reste)}</div>
          )}
          {partenaire}
          <button type="button" onClick={onAbandon} className="btn-ghost min-h-11 px-2 text-xs text-slate-500">Abandonner</button>
        </div>
      </div>
      {alerte !== null && <p aria-hidden data-examen-alerte={alerte} className="mt-1.5 text-sm font-semibold">{texteAlerte(alerte)}</p>}
    </header>
  );
}

/** L'Aufklärung, en conditions réelles : la demande du jury, rien d'autre — ni trame, ni risques, ni questions. Le focus
 *  y va : c'est l'interruption. */
export function AufklaerungAuftrag({ demande }: { demande: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div ref={ref} tabIndex={-1} className="card p-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <div className="label">Le jury interrompt l’entretien</div>
      <p className="mt-1 text-base font-semibold">« {demande} »</p>
    </div>
  );
}

/** La transition entre deux Teile : un seul compte à rebours ; elle part seule ; « Commencer maintenant » l'abrège. */
export function TransitionView({ de, reste, partenaire, onPret }: { de: SimTeil; reste: number; partenaire: 'simulant' | 'ia'; onPret: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const texte = de === 'anamnese' ? 'Anamnese terminée. Tes notes te suivent, en lecture seule.'
    : `Dokumentation terminée. ${partenaire === 'ia' ? 'Lance ton IA depuis l’en-tête : elle devient l’examinateur.' : 'Ton simulant devient l’examinateur.'}`;
  return (
    <div className="card mx-auto max-w-lg space-y-4 p-6 text-center">
      <p className="text-base">{texte}</p>
      <p data-examen-transition={reste} className="font-mono text-3xl font-semibold tnum">{reste} s</p>
      <button ref={ref} type="button" onClick={onPret} className="btn-primary mx-auto min-h-11">Commencer maintenant</button>
    </div>
  );
}
