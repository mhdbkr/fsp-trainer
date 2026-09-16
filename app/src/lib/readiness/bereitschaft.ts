import type { Case, Simulation, Specialty } from '@/db/types';
import type { Readiness } from './index';
import { weightedPartScore } from '@/lib/scoring';

// ============================================================================
// Bereitschaftsindex v2 (spec §6) = 0,5·S + 0,25·C + 0,25·L.
// Ce module pose les types du domaine et les deux poids élémentaires
// (source de la simulation, ancienneté). Le calcul complet (S/C/L, verdict,
// plafond, actions) arrive dans une tâche suivante du pipeline `pruefungstag`.
// ============================================================================

export const DAY = 86_400_000;

/** Spécialités de protocole couvertes par le corpus (hors Anatomie/Allgemein,
 *  qui ne sont pas des spécialités d'examen). */
export const CORPUS_SPECIALTIES: Specialty[] = [
  'Kardiologie',
  'Pneumologie',
  'Gastroenterologie',
  'Nephrologie',
  'Urologie',
  'Neurologie',
  'Hämatologie',
  'Endokrinologie',
  'Rheumatologie',
  'Orthopädie',
  'Chirurgie',
  'Psychiatrie',
  'Infektiologie',
  'Dermatologie',
  'Gynäkologie',
  'Onkologie',
];

export type ExamAxis = 'Anamnese' | 'Dokumentation' | 'Fallvorstellung';

export interface ReadinessInput {
  sims: Simulation[];
  cases: Case[];
  visibleCases: Case[];
}

export interface ReadinessAction {
  kind: 'exam_day' | 'cover_specialty' | 'axis' | 'language';
  label: string;
  gain: number;
  target?: string;
}

export interface Bereitschaft {
  value: number;
  verdict: Readiness['verdict'];
  capped: 'none' | 'no_recent_exam_day';
  capExpiresAt: number | null;
  leverage: 's' | 'c' | 'l';
  s: {
    value: number;
    byAxis: { axis: ExamAxis; score: number; tested: boolean }[];
    weights: { pruefungstag: 3; autonome: 2; assiste: 1 };
  };
  c: {
    value: number;
    covered: Specialty[];
    missing: { specialty: Specialty; share: number }[];
    outsidePlan: Specialty[];
    denominator: number;
    corpusTotal: number;
  };
  l: { value: number; base: number; trend: -5 | 0 | 5; samples: number };
  explain: string[];
  actions: ReadinessAction[];
}

/** Poids de source d'une simulation dans l'indice S : Prüfungstag avec
 *  simulant (3) > Prüfungstag solo ou Autonome (2) > Assisté / défaut (1). */
export function sourceWeight(sim: Simulation): 3 | 2 | 1 {
  if (sim.context === 'pruefungstag') return sim.withSimulant ? 3 : 2;
  if (sim.assistance === 'autonome') return 2;
  return 1;
}

/** Poids d'ancienneté : < 30 jours = frais (1), < 90 jours = tiède (0.5),
 *  au-delà = froid (0.25). */
export function recencyWeight(simDate: number, now: number): 1 | 0.5 | 0.25 {
  const diff = now - simDate;
  if (diff < 30 * DAY) return 1;
  if (diff < 90 * DAY) return 0.5;
  return 0.25;
}

/** Simulations de démonstration (seed) — exclues des calculs réels. */
export const isDemoSim = (s: Simulation) => s.id.startsWith('sim-demo-');

/** S (spec §6.2) : par axe `Anamnese | Dokumentation | Fallvorstellung`,
 *  `axis = Σ(w·score)/Σw` ou `0` (non testé). Le pool Anamnese cumule
 *  `parts.anamnese` (poids `w`) et `parts.aufklaerung` (poids `w × 0,5`).
 *  `value` = moyenne des 3 axes sur les scores non arrondis, arrondie. */
export function computeS(sims: Simulation[], now: number): Bereitschaft['s'] {
  const acc: Record<ExamAxis, { num: number; den: number }> = {
    Anamnese: { num: 0, den: 0 },
    Dokumentation: { num: 0, den: 0 },
    Fallvorstellung: { num: 0, den: 0 },
  };
  const add = (axis: ExamAxis, w: number, score: number) => {
    acc[axis].num += w * score;
    acc[axis].den += w;
  };
  for (const sim of sims) {
    const w = sourceWeight(sim) * recencyWeight(sim.date, now);
    const ctx = { assistance: sim.assistance ?? 'assiste', layer: sim.layer ?? 1 } as const;
    const p = sim.parts;
    if (p.anamnese?.done) add('Anamnese', w, weightedPartScore(p.anamnese, ctx));
    if (p.aufklaerung?.done) add('Anamnese', w * 0.5, weightedPartScore(p.aufklaerung, ctx));
    if (p.dokumentation?.done) add('Dokumentation', w, weightedPartScore(p.dokumentation, ctx));
    if (p.fallvorstellung?.done) add('Fallvorstellung', w, weightedPartScore(p.fallvorstellung, ctx));
  }
  const byAxis = (['Anamnese', 'Dokumentation', 'Fallvorstellung'] as ExamAxis[]).map((axis) => {
    const a = acc[axis];
    const tested = a.den > 0;
    return { axis, score: tested ? a.num / a.den : 0, tested };
  });
  const value = Math.round(byAxis.reduce((s, a) => s + a.score, 0) / 3);
  return {
    value,
    byAxis: byAxis.map((a) => ({ ...a, score: Math.round(a.score) })),
    weights: { pruefungstag: 3, autonome: 2, assiste: 1 },
  };
}
