// Finalisation du Prüfungstag : construction de la Simulation et du payload
// `exam_day.completed`, persistance (modèle SimulationRunner.tsx l.170-195).
// Contrats : `ExamDayCompletedPayload` v1 (lib/sync/events.ts),
// docs/contracts/sync-protocol.md § exam_day.completed.
import type { Bereitschaft } from '@/lib/readiness/bereitschaft';
import type { Case, PartResult, Simulation } from '@/db/types';
import type { ExamDayCompletedPayload, ExamDayPartSummary } from '@/lib/sync/events';
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { simulationPassed, weightedPartScore } from '@/lib/scoring';
import { ORDER, nextPart, targetSec, type ExamDayPart } from './examDayPlan';
import type { ExamDayState } from './examDaySession';

/** Durée réellement consommée d'une partie de l'horloge murale, plafonnée au
 *  temps cible (`examDayPlan.ts` — seul fichier autorisé à porter les durées). */
function partDurationSec(land: ExamDayState['land'], part: ExamDayPart, st: ExamDayState, now: number): number {
  const start = st.partTimes[part];
  const target = targetSec(land, part);
  if (start === undefined) return 0;
  const next = nextPart(part);
  const end = next && st.partTimes[next] !== undefined ? st.partTimes[next]! : now;
  return Math.min(target, Math.max(0, Math.floor((end - start) / 1000)));
}

/** Construit la `Simulation` de fin de Prüfungstag : `context 'pruefungstag'`,
 *  `assistance 'autonome'`, `layer 3` (sinon `computeS` l'atténue). */
export function buildExamDaySimulation(st: ExamDayState, c: Case, now: number, profileId?: string): Simulation {
  const parts: Simulation['parts'] = { ...st.results };
  for (const part of ORDER) {
    const r = st.results[part];
    if (!r) continue;
    parts[part] = { ...r, durationSec: partDurationSec(st.land, part, st, now) };
  }
  const sim: Simulation = {
    id: `sim-exam-${st.startedAt}`,
    caseId: c.id,
    date: now,
    profileId,
    parts,
    notes: {},
    bogen: st.bogen,
    arztbriefText: st.arztbriefText,
    prioritizedCorrections: [],
    context: 'pruefungstag',
    withSimulant: st.withSimulant,
    assistance: 'autonome',
    layer: 3,
    muster: st.muster,
    examDay: { startedAt: st.startedAt, endedAt: now, land: st.land, partTimes: st.partTimes },
  };
  sim.passed = simulationPassed(sim);
  return sim;
}

function summarize(p: PartResult | undefined): ExamDayPartSummary | null {
  if (!p) return null;
  return {
    score: weightedPartScore(p, { assistance: 'autonome', layer: 3 }),
    contentPct: p.contentPct,
    officialPct: p.officialPct,
    durationSec: p.durationSec,
    passed: weightedPartScore(p, { assistance: 'autonome', layer: 3 }) >= 60,
  };
}

/** Construit le payload de sync `exam_day.completed` v1 : dérivé, < 2 Ko, sans
 *  texte libre (`bogen`, `arztbriefText` exclus). */
export function buildExamDayPayload(
  sim: Simulation,
  c: Case,
  before: Bereitschaft,
  after: Bereitschaft,
  appVersion: string,
): ExamDayCompletedPayload {
  return {
    v: 1,
    simulationId: sim.id,
    caseId: c.id,
    specialty: c.specialty,
    land: 'BW',
    muster: sim.muster,
    withSimulant: !!sim.withSimulant,
    weightClass: sim.withSimulant ? 'pruefungstag' : 'solo',
    startedAt: new Date(sim.examDay!.startedAt).toISOString(),
    endedAt: new Date(sim.examDay!.endedAt).toISOString(),
    parts: {
      anamnese: summarize(sim.parts.anamnese)!,
      dokumentation: summarize(sim.parts.dokumentation)!,
      fallvorstellung: summarize(sim.parts.fallvorstellung)!,
      aufklaerung: summarize(sim.parts.aufklaerung),
    },
    passed: !!sim.passed,
    bereitschaft: { before: before.value, after: after.value, capped: after.capped },
    appVersion,
  };
}

/** Persiste la simulation + met à jour le cas (comme `SimulationRunner.tsx`
 *  l.170-195, lecture seule) + enfile `simulation.completed` puis
 *  `exam_day.completed` (`subject_id = sim.id`) — jamais bloquant. */
export async function persistExamDay(sim: Simulation, payload: ExamDayCompletedPayload, c: Case): Promise<void> {
  await db.simulations.put(sim);
  const done = Object.values(sim.parts).filter((p): p is PartResult => !!p?.done);
  if (done.length) {
    const conf = Math.round(
      done.reduce((s, p) => s + weightedPartScore(p, { assistance: 'autonome', layer: 3 }), 0) / done.length,
    );
    await db.cases.update(c.id, {
      confidence: conf,
      status: conf >= 80 ? 'Maîtrisé' : conf >= 40 ? 'En cours' : 'À faire',
      lastSimulationId: sim.id,
      layerProgress: 3,
    });
  }
  syncQueue.push({ type: 'simulation.completed', subject_id: c.id, payload: sim }).catch((e) => console.warn('[sync]', e));
  syncQueue.push({ type: 'exam_day.completed', subject_id: sim.id, payload }).catch((e) => console.warn('[sync]', e));
}
