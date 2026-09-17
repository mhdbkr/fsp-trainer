import { caseMastery } from '@/lib/simScope';
import type { Axis, Case, Fachbegriff, Simulation, Specialty } from '@/db/types';
import { AXES } from '@/db/types';
import { partScore, partToAxis } from './scoring';
import { isDue } from './srs';

// ============================================================================
// Agrégations statistiques — la détection auto des points faibles pilote
// l'accueil (points faibles), la heatmap et les suggestions de révision.
// ============================================================================

/** Score moyen par axe (0..100) sur toutes les simulations. null = jamais tenté. */
export function axisScores(sims: Simulation[]): Record<Axis, number | null> {
  const acc: Record<Axis, number[]> = { Anamnese: [], Dokumentation: [], Fallvorstellung: [], Aufklärung: [], Fachbegriffe: [], Fachwissen: [] };
  for (const sim of sims) {
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

/** Ajoute les axes "data-driven" : Fachbegriffe (part maîtrisée) et Fachwissen
 *  (part de cas maîtrisés) pour compléter la heatmap. */
export function axisScoresFull(sims: Simulation[], begriffe: Fachbegriff[], cases: Case[]): Record<Axis, number | null> {
  const base = axisScores(sims);
  if (begriffe.length) {
    const learned = begriffe.filter((b) => b.srs.state === 'Gelernt').length;
    base.Fachbegriffe = Math.round((learned / begriffe.length) * 100);
  }
  if (cases.length) {
    const mastered = cases.filter((c) => c.status === 'Maîtrisé').length;
    base.Fachwissen = Math.round((mastered / cases.length) * 100);
  }
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

/** Score moyen par spécialité (0..100). */
export function specialtyScores(sims: Simulation[], cases: Case[]): { specialty: Specialty; score: number; count: number }[] {
  const byCase = new Map(cases.map((c) => [c.id, c]));
  const acc = new Map<Specialty, number[]>();
  for (const sim of sims) {
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

/** Nombre de Fachbegriffe dus aujourd'hui. */
export function dueCount(begriffe: Fachbegriff[], now = Date.now()): number {
  return begriffe.filter((b) => isDue(b.srs, now)).length;
}

/** Streak (jours consécutifs avec ≥1 simulation), en partant d'aujourd'hui. */
export function computeStreak(sims: Simulation[], now = new Date()): number {
  const days = new Set(sims.map((s) => new Date(s.date).toDateString()));
  let streak = 0;
  const cursor = new Date(now);
  // tolérance : si rien aujourd'hui mais hier oui, on continue depuis hier.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Courbe d'évolution du score global dans le temps (par simulation). */
export function progressSeries(sims: Simulation[]): { date: string; score: number }[] {
  return [...sims]
    .sort((a, b) => a.date - b.date)
    .map((sim) => {
      const parts = Object.values(sim.parts).filter((p) => p?.done);
      const score = parts.length ? Math.round(parts.reduce((s, p) => s + partScore(p!), 0) / parts.length) : 0;
      return { date: new Date(sim.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), score };
    });
}

/** Cas les plus faibles (dernier score < 60 ou jamais faits mais fréquents). */
export function weakCases(sims: Simulation[], cases: Case[], limit = 4): { c: Case; score: number | null }[] {
  // Maîtrise au prorata des trois parties (FB2-P) — même règle que le programme et la fiche.
  const scored = cases.map((c) => ({ c, score: caseMastery(sims, c.id).score }));
  // Priorité: score faible d'abord, puis jamais fait pondéré par fréquence.
  return scored
    .sort((a, b) => {
      if (a.score !== null && b.score !== null) return a.score - b.score;
      if (a.score !== null) return -1;
      if (b.score !== null) return 1;
      return b.c.frequency - a.c.frequency;
    })
    .slice(0, limit);
}
