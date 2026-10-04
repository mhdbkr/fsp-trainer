import type { Axis, Case, CaseProgress, Fachbegriff, SimTeil, Simulation, Specialty } from '@/db/types';
import { blankProgress } from '@/lib/journal';
import { TEILE } from '@/lib/simScope';
import { dayKey, now as clockNow, nowDate } from '@/lib/clock';
import { AXES } from '@/db/types';
import { partScore, partToAxis } from './scoring';
import { isDue, isNew } from './srs';
import { estMesuree } from './readiness';

// ============================================================================
// Agrégations statistiques. Un point faible se décide sur la PERFORMANCE,
// jamais sur l'absence (ADR-0017 §5) : ce qui n'a pas été tenté est « pas
// encore travaillé », une information neutre.
// ============================================================================

/** Score moyen par axe (0..100) sur les simulations MESURÉES (S-I2 : une
 *  séance auto-évaluée n'est pas un score). null = jamais tenté. */
export function axisScores(sims: Simulation[]): Record<Axis, number | null> {
  const acc: Record<Axis, number[]> = { Anamnese: [], Dokumentation: [], Fallvorstellung: [], Aufklärung: [], Fachbegriffe: [], Fachwissen: [] };
  for (const sim of sims.filter(estMesuree)) {
    for (const [part, res] of Object.entries(sim.parts)) {
      if (!res?.done) continue;
      const axis = partToAxis(part as keyof Simulation['parts']);
      acc[axis].push(partScore(res));
    }
  }
  const out = {} as Record<Axis, number | null>;
  for (const a of AXES) {
    out[a] = acc[a].length ? Math.round(acc[a].reduce((s, v) => s + v, 0) / acc[a].length) : null;
  }
  return out;
}

/** Minimum de cartes déjà vues pour que l'axe Fachbegriffe se prononce. En
 *  dessous, 4 cartes/jour sur 2 000 ne disent rien de fiable (et un axe sans
 *  mesure n'est jamais un « point faible »). */
export const FACHBEGRIFFE_MIN_VUES = 20;
/** Idem pour l'axe Fachwissen : nombre minimum de Teile déjà joués (pas de cas :
 *  un cas n'est « solide » qu'avec ses 3 Teile, jouer un seul Teil ne le sera jamais). */
export const FACHWISSEN_MIN_TENTES = 5;

/** Cartes déjà présentées (≠ Neu). `retenues` : la dernière révision a été
 *  réussie — SM-2 remet `repetitions` à 0 sur une carte ratée. */
export function fachbegriffeVus(begriffe: Fachbegriff[]): { vues: number; retenues: number } {
  const vues = begriffe.filter((b) => !isNew(b.srs));
  return { vues: vues.length, retenues: vues.filter((b) => b.srs.repetitions > 0).length };
}

/** Ajoute les axes "data-driven" pour compléter la heatmap. Ce sont des axes
 *  de PERFORMANCE sur ce qui a été travaillé — jamais de couverture du corpus :
 *  Fachbegriffe = rétention des cartes déjà vues ; Fachwissen = part des Teile
 *  déjà joués qui sont acquis ou solides. Sous leur minimum : null. */
export function axisScoresFull(sims: Simulation[], begriffe: Fachbegriff[], cases: Case[], progress: Map<string, CaseProgress>): Record<Axis, number | null> {
  const base = axisScores(sims);
  const { vues, retenues } = fachbegriffeVus(begriffe);
  if (vues >= FACHBEGRIFFE_MIN_VUES) base.Fachbegriffe = Math.round((retenues / vues) * 100);
  // `Case.status` est déprécié (ADR-0017 §4.1) : la couverture se lit sur
  // `case_progress`, la seule projection qui dise ce qui a été fait.
  const teile = cases.flatMap((c) => TEILE.map((t) => (progress.get(c.id) ?? blankProgress(c.id)).teile[t.key].status)).filter((st) => st !== 'vierge');
  if (teile.length >= FACHWISSEN_MIN_TENTES) base.Fachwissen = Math.round((teile.filter((st) => st === 'acquis' || st === 'solide').length / teile.length) * 100);
  return base;
}

export function weakestAxis(scores: Record<Axis, number | null>): { axis: Axis; score: number } | null {
  let best: { axis: Axis; score: number } | null = null;
  for (const a of AXES) {
    const s = scores[a];
    if (s === null) continue;
    if (!best || s < best.score) best = { axis: a, score: s };
  }
  return best;
}

/** Score moyen par spécialité (0..100), simulations mesurées seulement. */
export function specialtyScores(sims: Simulation[], cases: Case[]): { specialty: Specialty; score: number; count: number }[] {
  const byCase = new Map(cases.map((c) => [c.id, c]));
  const acc = new Map<Specialty, number[]>();
  for (const sim of sims.filter(estMesuree)) {
    const c = byCase.get(sim.caseId);
    if (!c) continue;
    const parts = Object.values(sim.parts).filter((p) => p?.done);
    if (!parts.length) continue;
    const avg = parts.reduce((s, p) => s + partScore(p!), 0) / parts.length;
    const arr = acc.get(c.specialty) ?? [];
    arr.push(avg);
    acc.set(c.specialty, arr);
  }
  return [...acc.entries()]
    .map(([specialty, vals]) => ({ specialty, score: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), count: vals.length }))
    .sort((a, b) => a.score - b.score);
}

/** Sépare les Fachbegriffe en dus / nouveaux / appris (spec F2a D1 : un Neu n'est jamais dû). */
export function counts(begriffe: Fachbegriff[], now = clockNow()): { due: number; fresh: number; learned: number } {
  let due = 0, fresh = 0, learned = 0;
  for (const b of begriffe) {
    if (isNew(b.srs)) fresh++;
    else {
      learned++;
      if (isDue(b.srs, now)) due++;
    }
  }
  return { due, fresh, learned };
}

/** Nombre de Fachbegriffe dus aujourd'hui. */
export const dueCount = (begriffe: Fachbegriff[], now = clockNow()): number => counts(begriffe, now).due;

/** Série de jours consécutifs TRAVAILLÉS, en partant d'aujourd'hui. Prend les
 *  clés de jour du journal (`workedDayKeys`) : une journée 100 % drill compte,
 *  une séance hors plan aussi.
 *
 *  `offDays` (jours de repos du programme, 0=dim … 6=sam) : un jour off au repos
 *  ne casse PAS la série et ne la gonfle pas ; travaillé, il compte. C'est le
 *  programme du candidat qui met le week-end au repos : 5 jours ouvrés sur 5,
 *  la série est intacte le lundi. Sans programme (`[]`) : comportement d'avant. */
export function streakFromDays(workedDays: Set<string>, now = nowDate(), offDays: number[] = []): number {
  // ponytail : un programme sans aucun jour travaillé n'a pas de sens ; on l'ignore plutôt que de boucler.
  const off = offDays.length >= 7 ? [] : offDays;
  let streak = 0;
  const cursor = new Date(now);
  // Aujourd'hui, pas encore travaillé, n'a pas encore cassé la série.
  if (!workedDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  for (;;) {
    if (workedDays.has(dayKey(cursor))) streak++;
    else if (!off.includes(cursor.getDay())) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Courbe d'évolution du score global dans le temps (simulations mesurées). */
export function progressSeries(sims: Simulation[]): { date: string; score: number }[] {
  return sims.filter(estMesuree)
    .sort((a, b) => a.date - b.date)
    .map((sim) => {
      const parts = Object.values(sim.parts).filter((p) => p?.done);
      const score = parts.length ? Math.round(parts.reduce((s, p) => s + partScore(p!), 0) / parts.length) : 0;
      return { date: new Date(sim.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), score };
    });
}

/**
 * Les points faibles — et RIEN d'autre. Un Teil `fragile` a été tenté et a
 * raté ; un Teil `vierge` n'a jamais été tenté et n'est donc pas un défaut.
 *
 * L'ancienne version classait un cas jamais joué en tête des « Points faibles »
 * et affichait « dernier score 30 % » pour une Anamnese réussie à 90 %
 * (audit §5) : elle lisait `caseMastery`, empoisonné par son `/3`.
 */
export function weakCases(
  progress: Map<string, CaseProgress>, cases: Case[], limit = 4,
): { c: Case; teil: SimTeil; score: number }[] {
  const out: { c: Case; teil: SimTeil; score: number }[] = [];
  for (const c of cases) {
    const cp = progress.get(c.id);
    if (!cp) continue;
    for (const t of TEILE) {
      const p = cp.teile[t.key];
      if (p.status === 'fragile' && p.lastScore !== null) out.push({ c, teil: t.key, score: p.lastScore });
    }
  }
  return out.sort((a, b) => a.score - b.score || b.c.frequency - a.c.frequency).slice(0, limit);
}
