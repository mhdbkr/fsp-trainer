import { DAY, computeBereitschaftsindex } from './bereitschaft';
import type { ReadinessInput } from './bereitschaft';

// ============================================================================
// Historique hebdomadaire + projection (Pro, spec §7). L'historique rejoue
// `computeBereitschaftsindex` à la fin de chacune des `weeks` dernières
// semaines (sims filtrées `date <= weekEnd`, `now = weekEnd`, sans actions).
// La projection extrapole une régression linéaire sur les ≤ 4 derniers
// points jusqu'à `examDate`, bornée 0..100 (≤ 79 si plafonnée aujourd'hui).
// ============================================================================

export interface BereitschaftHistoryPoint {
  weekEnd: number;
  value: number;
}

export interface BereitschaftProjection {
  value: number;
  atExamDate: number;
  basis: 'trend' | 'insufficient';
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/** Rejoue le Bereitschaftsindex à la fin de chacune des `weeks` dernières
 *  semaines. `weekEnd[weeks - 1] === now`. */
export function bereitschaftHistory(
  input: ReadinessInput,
  now = Date.now(),
  weeks = 12,
): BereitschaftHistoryPoint[] {
  const W = 7 * DAY;
  const out: BereitschaftHistoryPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = now - i * W;
    const sims = input.sims.filter((s) => s.date <= weekEnd);
    out.push({
      weekEnd,
      value: computeBereitschaftsindex({ ...input, sims }, weekEnd, { withActions: false }).value,
    });
  }
  return out;
}

/** Régression linéaire sur les ≤ 4 derniers points de l'historique,
 *  extrapolée à `examDate`. `capped` reflète le plafond 79 (Prüfungstag
 *  récent manquant) appliqué à l'indice actuel. */
export function projectBereitschaft(
  history: BereitschaftHistoryPoint[],
  examDate: number,
  capped: boolean,
): BereitschaftProjection {
  const pts = history.slice(-4);
  if (pts.length < 2) {
    const lastValue = history.length ? history[history.length - 1].value : 0;
    return { value: lastValue, atExamDate: examDate, basis: 'insufficient' };
  }
  const xs = pts.map((p) => p.weekEnd / (7 * DAY));
  const ys = pts.map((p) => p.value);
  const mx = mean(xs);
  const my = mean(ys);
  const slope = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / (sum(xs.map((x) => (x - mx) ** 2)) || 1);
  const v = my + slope * (examDate / (7 * DAY) - mx);
  return {
    value: Math.round(Math.max(0, Math.min(capped ? 79 : 100, v))),
    atExamDate: examDate,
    basis: 'trend',
  };
}
