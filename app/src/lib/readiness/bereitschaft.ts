import type { Case, Simulation, Specialty } from '@/db/types';
import type { Readiness } from './index';

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
