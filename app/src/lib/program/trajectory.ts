// ============================================================================
// La frise de trajectoire — l'indice de préparation dans le temps, la date
// d'examen comme horizon, et la projection « à ce rythme ». ADR-0020 §3.
//
// Elle remplace la heatmap de régularité, qui mesurait l'assiduité et pas la
// préparation : elle culpabilisait, et ce qu'elle culpabilisait était faux (le
// drill ne comptait pas). Ici tout se dérive du journal — donc le drill compte,
// et le travail hors plan aussi.
// ============================================================================

import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type { Case, ProgramConfig, SimTeil, TrainingEvent } from '@/db/types';
import { computeCaseProgress } from '@/lib/journal';
import { TEILE } from '@/lib/simScope';
import { dayKey, now as clockNow } from '@/lib/clock';
import { programEnd } from './dayPlan';
import { DATE_NOUVELLE_REGLE } from './parametres';

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

/** Ce que « vaut » un Teil dans l'indice. `vierge` vaut 0 — ce n'est pas une
 *  sanction, c'est une absence : il n'y a rien à compter. */
const POIDS = { vierge: 0, fragile: 0.3, acquis: 0.7, solide: 1 } as const;

export interface TrajectoryPoint {
  date: string;                 // ISO yyyy-MM-dd
  indice: number;               // 0..100
  spentMin: number;             // minutes mesurées ce jour-là
}

export interface Trajectory {
  points: TrajectoryPoint[];
  /** Points de la projection « à ce rythme », jusqu'à la veille de l'examen.
   *  Vide si la pente est nulle ou s'il n'y a pas de date d'examen. */
  projection: TrajectoryPoint[];
  /** Indice projeté le jour de l'examen, ou `null` si non projetable. */
  indiceProjete: number | null;
  examDate: string | null;
  today: string;
  /** Le jour où la règle « solide stable » prend le relais (INV-69) : la courbe fait une marche
   *  entre la veille et ce jour. `null` si la fenêtre ne contient pas les deux règles. */
  repere: { date: string } | null;
}

/** L'indice de préparation à un instant donné : la part du corpus rendue solide,
 *  pondérée par l'état de chaque Teil. Il se recalcule sur le journal TRONQUÉ à
 *  cet instant — donc il ne peut pas être révisé après coup.
 *
 *  **Le passé est figé** (INV-69, décision (e)) : avant `DATE_NOUVELLE_REGLE`, la règle
 *  de statut est celle de la série 3 (un seul score suffit). Sans cela, le déploiement
 *  de « solide stable » ferait descendre toute la courbe déjà montrée. */
export function indiceAt(events: TrainingEvent[], totalTeile: number, at: number): number {
  if (!totalTeile) return 0;
  const progress = computeCaseProgress(events.filter((e) => e.at <= at), { regle: dayKey(at) < DATE_NOUVELLE_REGLE ? 'serie3' : undefined });
  let sum = 0;
  for (const cp of progress) for (const t of TEIL_KEYS) sum += POIDS[cp.teile[t].status];
  return Math.round((sum / totalTeile) * 100);
}

/**
 * La frise. Un point par jour depuis le premier événement (ou `windowDays`
 * jours en arrière si le journal est plus ancien), et la projection linéaire
 * de la pente des `slopeDays` derniers jours jusqu'à l'examen.
 */
export function trajectory(
  config: ProgramConfig | undefined,
  cases: Case[],
  events: TrainingEvent[],
  opts: { now?: number; windowDays?: number; slopeDays?: number } = {},
): Trajectory {
  const now = opts.now ?? clockNow();
  const windowDays = opts.windowDays ?? 30;
  const slopeDays = opts.slopeDays ?? 14;
  const totalTeile = cases.length * TEIL_KEYS.length;
  const today = dayKey(now);
  const examDate = config?.examDate ?? null;

  // I11 : on avance par JOUR CALENDAIRE (addDays), jamais par `i × 24 h` — un
  // jour de 25 h (fin de l'heure d'été) dédoublait une date et décalait les
  // suivantes. Départ : la veille du premier événement (l'indice avant tout
  // travail), borné à `windowDays` ; arrivée : aujourd'hui, jamais demain.
  const today0 = startOfDay(new Date(now));
  const first = events.length ? Math.min(...events.map((e) => e.at)) : now;
  const start = new Date(Math.max(addDays(startOfDay(new Date(first)), -1).getTime(), addDays(today0, -windowDays).getTime()));
  const days = differenceInCalendarDays(today0, start);

  const spent = new Map<string, number>();
  for (const e of events) { const k = dayKey(e.at); spent.set(k, (spent.get(k) ?? 0) + Math.max(0, e.spentMin)); }

  const points: TrajectoryPoint[] = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(start, i);
    const date = dayKey(d);
    points.push({ date, indice: indiceAt(events, totalTeile, addDays(d, 1).getTime() - 1), spentMin: spent.get(date) ?? 0 });
  }

  // Pente = progression réelle des `slopeDays` derniers jours. Aucune pente
  // inventée : sans travail récent, il n'y a pas de projection à afficher. Elle ne
  // traverse jamais la marche de la nouvelle règle : seuls comptent les points
  // calculés par la MÊME règle que le dernier.
  const ancienne = (p: TrajectoryPoint) => p.date < DATE_NOUVELLE_REGLE;
  const memeRegle = points.filter((p) => ancienne(p) === ancienne(points[points.length - 1]));
  const tail = memeRegle.slice(-Math.min(slopeDays + 1, memeRegle.length));
  const gained = tail.length > 1 ? tail[tail.length - 1].indice - tail[0].indice : 0;
  const perDay = tail.length > 1 ? gained / (tail.length - 1) : 0;

  const projection: TrajectoryPoint[] = [];
  let indiceProjete: number | null = null;
  if (examDate && perDay > 0) {
    const remaining = Math.max(0, differenceInCalendarDays(parseISO(examDate), new Date(now)));
    const last = points[points.length - 1];
    for (let i = 1; i <= remaining; i++) {
      projection.push({
        date: dayKey(addDays(today0, i)),
        indice: Math.min(100, Math.round(last.indice + perDay * i)),
        spentMin: 0,
      });
    }
    indiceProjete = projection.length ? projection[projection.length - 1].indice : last.indice;
  }
  const repere = points.some(ancienne) && points.some((p) => !ancienne(p)) ? { date: DATE_NOUVELLE_REGLE } : null;
  return { points, projection, indiceProjete, examDate, today, repere };
}

/** Jours calendaires restants avant l'examen. `null` sans date d'examen. */
export const joursRestants = (config: ProgramConfig | undefined, now = clockNow()): number | null =>
  config?.examDate ? Math.max(0, differenceInCalendarDays(programEnd(config), new Date(now))) : null;
