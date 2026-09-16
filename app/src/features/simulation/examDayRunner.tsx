// Runner du Prüfungstag (BW) — spec §5.1–5.3. Un seul moteur : le store
// `useExamDaySession` (reducers purs, sans garde) ; C'EST CE RUNNER qui
// ordonne les transitions P1 → transition → P2 → transition → P3 → évaluation.
// Chrono = horloge murale (`useExamDayClock`, jamais un compteur). Aucune aide
// montée (guides, Muster, ImmersiveMode, checklists — scripts/checkExamDay.mjs).
// Décisions lead : P2 ImmersiveMode non monté ; P3 snapshot minimal dans
// `useSimSession` pour la barre « reprendre » existante.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCase } from '@/hooks/useData';
import { useSimSession } from '@/store/simSession';
import { Icon } from '@/components/icons';
import { EXAM_DAY_PLAN, nextPart, targetSec, type ExamDayPart } from './examDayPlan';
import { useExamDayClock } from './examDayClock';
import { useExamDaySession, allPartsExpired } from './examDaySession';
import { computeAmbiance, auraColor } from './timeAmbiance';
import { ExamDayEvaluation } from './examDayEvaluation';
import { ExamDayResult } from './examDayResult';
import { AufklaerungModal, ExamArztbrief, ExamBogen, ExamHeader, ExpiredBanner, TransitionView } from './examDayParts';

const isPart = (p: string): p is ExamDayPart => p === 'anamnese' || p === 'dokumentation' || p === 'fallvorstellung';

export function ExamDayRunner({ caseId }: { caseId: string }) {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const c = useCase(caseId);
  const state = useExamDaySession((s) => s.state);
  const store = useExamDaySession;

  // Dev uniquement : `?debugClock=<s>` décale l'horloge lue (jamais le store).
  const offset = import.meta.env.DEV ? Number(sp.get('debugClock') ?? 0) : 0;
  const nowFn = useCallback(() => Date.now() + offset * 1000, [offset]);

  const land = state?.land ?? 'BW';
  const plan = EXAM_DAY_PLAN[land];
  const current = state?.current ?? 'anamnese';
  const phase = state?.phase ?? 'anamnese';
  const inPart = isPart(phase);

  const partClock = useExamDayClock(state?.partTimes[current] ?? null, targetSec(land, current), plan.alertsSec, nowFn);
  const transitionClock = useExamDayClock(state?.transitionStartedAt ?? null, plan.transitionSec, [], nowFn);

  const [aufklaerungOpen, setAufklaerungOpen] = useState(false);

  // Montage : purge > 24 h, session absente → setup, tout échu → évaluation.
  useEffect(() => {
    const now = nowFn();
    store.getState().purgeIfStale(now);
    const s = store.getState().state;
    if (!s || s.caseId !== caseId) { navigate('/simulation/pruefungstag', { replace: true }); return; }
    if (allPartsExpired(s, now) && s.phase !== 'evaluation' && s.phase !== 'result') store.getState().toEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fin dure d'une partie : verrouillage immédiat (rendu) + transition (store).
  useEffect(() => {
    const s = store.getState().state; // état vivant : le montage a pu déjà trancher (évaluation)
    if (s && isPart(s.phase) && s.current === current && partClock.expired) store.getState().toTransition(nowFn());
  }, [current, partClock.expired, nowFn, store]);

  const advance = useCallback(() => {
    const s = store.getState().state;
    if (!s || s.phase !== 'transition') return;
    const n = nextPart(s.current);
    if (n) store.getState().beginPart(n, nowFn());
    else store.getState().toEvaluation();
  }, [nowFn, store]);

  // Transition auto-échue (≤ transitionSec, choix de design — spec §5.2).
  useEffect(() => {
    if (phase === 'transition' && transitionClock.expired) advance();
  }, [phase, transitionClock.expired, advance]);

  // Barre « reprendre » existante : on rentre → session active ; on sort par
  // n'importe quel moyen → minimisée (le chrono mural continue de courir).
  useEffect(() => {
    useSimSession.getState().resume();
    return () => { useSimSession.getState().minimize(); };
  }, []);

  // Snapshot minimal (P3) — le nom affiché est celui du patient : le nom du
  // cas est le diagnostic, il ne doit apparaître nulle part pendant l'examen.
  const patient = useMemo(() => {
    const ps = c?.patientSheet;
    return ps ? { name: ps.personalia.name, age: ps.personalia.age, motif: ps.leitsymptome?.[0] ?? '' } : null;
  }, [c]);
  useEffect(() => {
    if (!state) return;
    if (state.phase === 'result') { useSimSession.getState().end(); return; }
    useSimSession.getState().sync({
      caseId: state.caseId,
      caseName: patient ? `Prüfungstag · ${patient.name}` : 'Prüfungstag',
      active: state.current,
      phase: 'play',
      bogen: state.bogen,
      arztbriefText: state.arztbriefText,
      results: state.results,
      aufklaerungOpen: false,
      elapsed: {},
    });
  }, [state, patient]);

  const abort = () => {
    if (!window.confirm('Prüfungstag abbrechen? Nichts wird gespeichert.')) return;
    store.getState().abandon();
    useSimSession.getState().end();
    navigate('/simulation');
  };

  if (!state) return null;

  const partLabel = plan.parts.find((p) => p.key === current)?.label ?? current;
  const remaining = inPart ? partClock.remaining : phase === 'transition' ? transitionClock.remaining : 0;
  const amb = computeAmbiance(targetSec(land, current) - partClock.remaining, targetSec(land, current));
  const alertCls = inPart && partClock.alert !== null ? ' exam-alert' : '';
  const frozen = !inPart || partClock.expired;

  return (
    <div
      data-exam-day
      data-exam-phase={phase}
      data-exam-remaining={remaining}
      className={`space-y-3${alertCls}`}
      style={{ '--exam-aura': auraColor(amb, 0.9) } as React.CSSProperties}
    >
      <ExamHeader partLabel={phase === 'transition' ? `${partLabel} · Übergang` : partLabel} remaining={remaining} patient={patient} onAbort={abort} />

      {(inPart || phase === 'transition') && partClock.expired && <ExpiredBanner />}

      {phase === 'transition' && <TransitionView from={current} remaining={transitionClock.remaining} onReady={advance} />}

      {phase === 'evaluation' && <ExamDayEvaluation />}
      {phase === 'result' && <ExamDayResult />}

      {(inPart || phase === 'transition') && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <ExamBogen
              muster={state.muster ?? 'Standard'}
              notes={state.bogen}
              onChange={(b) => store.getState().setBogen(b)}
              frozen={current !== 'anamnese' || partClock.expired}
            />
            {current === 'anamnese' && !partClock.expired && (
              <button onClick={() => { store.getState().openAufklaerung(); setAufklaerungOpen(true); }} className="btn-ghost gap-1.5 text-xs">
                <Icon name="speech" className="h-3.5 w-3.5" />Aufklärung durchführen
              </button>
            )}
          </div>
          {current !== 'anamnese' && (
            <ExamArztbrief
              text={state.arztbriefText}
              onChange={(t) => store.getState().setArztbrief(t)}
              frozen={frozen || current !== 'dokumentation'}
            />
          )}
        </div>
      )}

      {aufklaerungOpen && <AufklaerungModal onClose={() => setAufklaerungOpen(false)} />}
    </div>
  );
}
