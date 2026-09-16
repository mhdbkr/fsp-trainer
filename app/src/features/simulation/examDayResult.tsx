// Écran de fin du Prüfungstag (T20, spec §5.5) : persiste UNE fois (garde
// `useRef`), puis affiche débrief avant Bereitschaftsindex, ordre strict
// `data-section` : scores → debrief → next → bi → cta. Aucune carte pricing
// ni chiffre « +N » ici (veto pédagogique §7) — une seule action gratuite,
// un seul CTA vers `/bereitschaft`, jamais `/pricing`.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gate } from '@/components/Gate';
import { useCases, useSimulations } from '@/hooks/useData';
import type { Simulation } from '@/db/types';
import { LANGUAGE_CRITERIA, PASS_THRESHOLD, partScore } from '@/lib/scoring';
import { computeBereitschaftsindex, type Bereitschaft } from '@/lib/readiness';
import { useExamDaySession } from './examDaySession';
import { buildExamDaySimulation, buildExamDayPayload, persistExamDay } from './examDayFinish';

// Non source (aucun define de build) : gabarit du payload `exam_day.completed`.
const APP_VERSION = '0.1.0';

const PART_ORDER: (keyof Simulation['parts'])[] = ['anamnese', 'dokumentation', 'fallvorstellung', 'aufklaerung'];
const PART_LABEL: Record<string, string> = {
  anamnese: 'Anamnese',
  dokumentation: 'Dokumentation',
  fallvorstellung: 'Fallvorstellung',
  aufklaerung: 'Aufklärung',
};

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Outcome {
  sim: Simulation;
  before: Bereitschaft;
  after: Bereitschaft;
}

export function ExamDayResult() {
  const state = useExamDaySession((s) => s.state);
  const sims = useSimulations();
  const cases = useCases();
  const c = cases?.find((x) => x.id === state?.caseId);

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const persisted = useRef(false);

  useEffect(() => {
    if (persisted.current) return;
    if (!state || !sims || !cases || !c) return;
    persisted.current = true;
    const now = Date.now();
    const before = computeBereitschaftsindex({ sims, cases, visibleCases: cases });
    const sim = buildExamDaySimulation(state, c, now);
    const after = computeBereitschaftsindex({ sims: [...sims, sim], cases, visibleCases: cases });
    setOutcome({ sim, before, after });
    // Le `useRef` protège du double-effet StrictMode (même montage) mais pas
    // d'un remontage réel (reload/back) : le store `persist` reste en phase
    // `result`, donc `resultPersisted` (persistant, lui) est la seule garde
    // fiable contre un doublon de `persistExamDay` (2 `syncQueue.push` dans
    // l'outbox, jamais dédupliqués).
    if (state.resultPersisted) return;
    void persistExamDay(sim, buildExamDayPayload(sim, c, before, after, APP_VERSION), c).then(() => {
      useExamDaySession.getState().markResultPersisted();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sims, cases, c]);

  // L'utilisateur quitte l'écran de résultat (CTA final ou action gratuite) :
  // c'est seulement à ce moment que la session exam-day est abandonnée. Tant
  // que cet écran est affiché, `state.phase` reste `'result'` (sinon
  // `ExamDayRunner` se démonte et l'utilisateur ne voit jamais son résultat).
  // `useSimSession.end()` est déjà appelé par `ExamDayRunner` (phase result) —
  // pas de double appel ici.
  const leave = () => {
    useExamDaySession.getState().abandon();
  };

  if (!outcome) return null;
  const { sim, before, after } = outcome;
  const attemptedParts = PART_ORDER.filter((p) => sim.parts[p]);

  return (
    <div className="space-y-4">
      <section data-section="scores" className="card space-y-2">
        <p className="readout">Prüfungstag BW · {sim.passed ? 'Bestanden' : 'Nicht bestanden (BW)'}</p>
        <ul className="space-y-1 text-sm">
          {attemptedParts.map((p) => {
            const r = sim.parts[p]!;
            const score = partScore(r);
            const pass = score >= PASS_THRESHOLD;
            return (
              <li key={p} className="flex items-center justify-between">
                <span>{PART_LABEL[p]}</span>
                <span className="readout">{score}% / {PASS_THRESHOLD}% — {pass ? 'Bestanden' : 'Nicht bestanden (BW)'}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section data-section="debrief" className="card space-y-3">
        <p className="readout">Debrief</p>
        {attemptedParts.map((p) => {
          const r = sim.parts[p]!;
          const unchecked = r.checklist.filter((i) => !i.checked);
          const lowest = r.languageGrid
            ? LANGUAGE_CRITERIA.reduce((min, cur) =>
                r.languageGrid![cur.key] < r.languageGrid![min.key] ? cur : min,
              )
            : null;
          return (
            <div key={p} className="space-y-1 text-sm">
              <p className="font-medium">{PART_LABEL[p]} · {mmss(r.durationSec)}</p>
              {unchecked.length > 0 && (
                <ul className="list-disc pl-5 text-slate-600">
                  {unchecked.map((i) => <li key={i.id}>{i.label}</li>)}
                </ul>
              )}
              {lowest && <p className="text-slate-600">Schwächstes Sprachkriterium: {lowest.label}</p>}
            </div>
          );
        })}
      </section>

      <section data-section="next" className="card">
        <Link to={`/simulation/${sim.caseId}/pre`} className="btn-primary" onClick={leave}>
          Diesen Fall autonom wiederholen
        </Link>
      </section>

      <section data-section="bi" className="card space-y-2">
        <p className="readout">Bereitschaftsindex {before.value} → {after.value}</p>
        <p className="text-sm text-slate-600">{after.explain[3]}</p>
        {!sim.withSimulant && (
          <p className="text-sm text-amber-700">
            Ohne Simulant gespielt — zählt wie eine autonome Simulation und hebt den Deckel 79 nicht auf.
          </p>
        )}
      </section>

      <section data-section="cta">
        <Gate feature="readiness.plan" fallback={<Link to="/bereitschaft" className="btn-primary" onClick={leave}>Meinen Bereitschaftsindex ansehen</Link>}>
          <Link to="/bereitschaft" className="btn-primary" onClick={leave}>Meinen Plan ansehen</Link>
        </Gate>
      </section>
    </div>
  );
}
