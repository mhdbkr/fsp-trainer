// Setup du Prüfungstag (BW) — spec §5.1. Tirage sans exposer le cas (nom/âge/
// motif) avant démarrage : seul un QR (fiche du simulant) est montré.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { QrCode } from '@/components/QrCode';
import { patientUrl } from './usePatientSync';
import { EXAM_DAY_PLAN } from './examDayPlan';
import { pickExamDayCase } from './examDayPick';
import { useExamDaySession, isStale } from './examDaySession';
import type { Case } from '@/db/types';

const PLAN = EXAM_DAY_PLAN.BW;

export function ExamDaySetup() {
  const navigate = useNavigate();
  const cases = useLiveQuery(() => db.cases.toArray(), [], undefined);
  const sims = useLiveQuery(() => db.simulations.toArray(), [], undefined);
  const muster = useUi((s) => s.muster);
  const sessionState = useExamDaySession((s) => s.state);
  const start = useExamDaySession((s) => s.start);
  const beginPart = useExamDaySession((s) => s.beginPart);

  const [withSimulant, setWithSimulant] = useState(false);
  const [picked, setPicked] = useState<Case | null>(null);

  const resumable = sessionState && !isStale(sessionState, Date.now());

  if (resumable) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-900/10">
          <div>
            <div className="font-semibold">Prüfungstag läuft</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Une session Prüfungstag est déjà en cours.</p>
          </div>
          <button
            onClick={() => navigate(`/simulation/${sessionState!.caseId}/run?modus=pruefungstag`)}
            className="btn-primary gap-1.5 text-xs"
          >
            <Icon name="play" className="h-3.5 w-3.5" />Fortsetzen
          </button>
        </div>
      </div>
    );
  }

  const handleDraw = () => {
    if (!cases || !sims) return;
    const c = pickExamDayCase(cases, sims, Date.now());
    setPicked(c);
  };

  const handleStart = () => {
    if (!picked) return;
    const now = Date.now();
    start({ caseId: picked.id, caseName: picked.name, withSimulant, muster }, now);
    beginPart('anamnese', now);
    navigate(`/simulation/${picked.id}/run?modus=pruefungstag`);
  };

  const noCases = !!cases && cases.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-brand-500">Simulation</div>
        <h1 className="text-2xl font-bold">Prüfungstag (BW)</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {PLAN.parts.map((p) => Math.round(p.targetSec / 60)).join(' · ')} min — keine Hilfen, keine Pause. Einmal gestartet, kann die Sitzung nicht pausiert werden.
        </p>
        <p className="mt-1 text-xs text-slate-400">{PLAN.p3Note}</p>
      </header>

      <div className="card flex items-start gap-2 border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
        <Icon name="bulb" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Tipp: höchstens ein Prüfungstag pro Woche, nach ≥ 3 autonomen Simulationen ; der letzte 3–5 Tage vor der Prüfung.
          Bildschirmsperre deaktivieren.
        </span>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="label">Muster-Bogen</div>
          <span className="readout text-xs">{muster}</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withSimulant}
            onChange={(e) => setWithSimulant(e.target.checked)}
          />
          Ich habe einen Simulanten
        </label>
      </div>

      {!picked ? (
        <div className="space-y-2">
          <button
            onClick={handleDraw}
            disabled={!cases || cases.length === 0}
            className="btn-primary w-full justify-center gap-1.5"
          >
            <Icon name="play" className="h-4 w-4" />Fall ziehen
          </button>
          {noCases && (
            <div className="card p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Kein Fall verfügbar.{' '}
              <Link to="/simulation" className="btn-ghost text-xs">Zum Hub</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="card space-y-3 p-4 text-center">
          <div className="font-semibold">Fall gezogen — QR für den Simulanten</div>
          <div className="flex justify-center">
            <QrCode value={patientUrl(picked.id)} size={130} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Wenn der Kandidat dir den Fall vorstellt, öffne den Tab „Examinateur".
          </p>
          <button onClick={handleStart} className="btn-primary w-full justify-center gap-1.5">
            <Icon name="play" className="h-4 w-4" />Prüfungstag starten
          </button>
        </div>
      )}
    </div>
  );
}
