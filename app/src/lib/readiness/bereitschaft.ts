import type { Case, Simulation, Specialty } from '@/db/types';
import type { Readiness } from './index';
import { weightedPartScore, simulationPassed } from '@/lib/scoring';
import { computeActions } from './actions';

// ============================================================================
// Bereitschaftsindex v2 (spec §6) = 0,5·S + 0,25·C + 0,25·L.
// Types du domaine, poids élémentaires (source, ancienneté), composantes
// S/C/L et assemblage `computeBereitschaftsindex` (verdict, plafond 79,
// levier, explications). `actions` = T7 (`computeActions`).
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

/** C (spec §6.2) : couverture pondérée par fréquence des spécialités du plan
 *  (`visibleCases` — corpus non accessible en Free). Spécialité couverte si
 *  une sim `pruefungstag` ou `autonome` réussie porte sur un de ses cas.
 *  `outsidePlan` = spécialités du corpus (16) hors du plan de l'appareil. */
export function computeC(sims: Simulation[], cases: Case[], visibleCases: Case[]): Bereitschaft['c'] {
  const specOf = new Map<string, Specialty>();
  for (const c of [...cases, ...visibleCases]) specOf.set(c.id, c.specialty);
  const F = new Map<Specialty, number>();
  for (const c of visibleCases) F.set(c.specialty, (F.get(c.specialty) ?? 0) + Math.max(c.frequency, 1));
  const total = [...F.values()].reduce((a, b) => a + b, 0);
  const covered = new Set<Specialty>();
  for (const sim of sims) {
    if (!(sim.context === 'pruefungstag' || sim.assistance === 'autonome')) continue;
    if (!simulationPassed(sim)) continue;
    const s = specOf.get(sim.caseId);
    if (s && F.has(s)) covered.add(s);
  }
  const coveredF = [...covered].reduce((a, s) => a + (F.get(s) ?? 0), 0);
  const missing = [...F]
    .filter(([s]) => !covered.has(s))
    .map(([specialty, f]) => ({ specialty, share: total ? f / total : 0 }))
    .sort((a, b) => b.share - a.share);
  const planSpecs = new Set(F.keys());
  return {
    value: total ? Math.round((100 * coveredF) / total) : 0,
    covered: [...covered],
    missing,
    outsidePlan: CORPUS_SPECIALTIES.filter((s) => !planSpecs.has(s)),
    denominator: F.size,
    corpusTotal: CORPUS_SPECIALTIES.length,
  };
}

/** L (spec §6.2) : tendance de la grille langue officielle sur les 5
 *  dernières parties orales (`anamnese`, `aufklaerung`, `fallvorstellung`
 *  avec `languageGrid`). `base = mean(officialPct)` ; tendance = moyenne des
 *  3 dernières − moyenne des 3 premières (± 5 si écart > 5) ; `value` plafonné
 *  à 30 si `samples < 3`. */
export function computeL(sims: Simulation[]): Bereitschaft['l'] {
  const oral: { date: number; pct: number }[] = [];
  for (const sim of [...sims].sort((a, b) => a.date - b.date))
    for (const k of ['anamnese', 'aufklaerung', 'fallvorstellung'] as const) {
      const p = sim.parts[k];
      if (p?.done && p.languageGrid) oral.push({ date: sim.date, pct: p.officialPct });
    }
  const last = oral.slice(-5).map((o) => o.pct);
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const base = Math.round(mean(last));
  let trend: -5 | 0 | 5 = 0;
  if (last.length === 5) {
    const d = mean(last.slice(2)) - mean(last.slice(0, 3));
    trend = d > 5 ? 5 : d < -5 ? -5 : 0;
  }
  let value = Math.max(0, Math.min(100, base + trend));
  if (last.length < 3) value = Math.min(value, 30);
  return { value, base, trend, samples: last.length };
}

/** Verdicts (inchangés depuis `computeReadiness`) : ≥ 80 Prêt · ≥ 65 Presque prêt · ≥ 40 En route. */
export function verdictFor(value: number): Readiness['verdict'] {
  return value >= 80 ? 'Prêt' : value >= 65 ? 'Presque prêt' : value >= 40 ? 'En route' : 'Pas encore';
}

const ddmm = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
};

/** Les 4 phrases de §6.1, avec les valeurs du candidat (allemand, ton instrument). */
function explainBereitschaft(
  s: Bereitschaft['s'],
  c: Bereitschaft['c'],
  l: Bereitschaft['l'],
  capped: Bereitschaft['capped'],
  capExpiresAt: number | null,
): string[] {
  const ax = (i: number) => (s.byAxis[i].tested ? `${s.byAxis[i].score} %` : '— nicht getestet (zählt 0)');
  const trend = l.trend > 0 ? ', Tendenz steigend +5' : l.trend < 0 ? ', Tendenz fallend −5' : '';
  const few = l.samples < 3 ? ' (unter 3 Teilen: höchstens 30)' : '';
  return [
    `Simulationen ${s.value} — Anamnese ${ax(0)} · Dokumentation ${ax(1)} · Fallvorstellung ${ax(2)}. Gewichtung: Prüfungstag 3 · Autonom 2 · Assistiert 1; ×1 < 30 Tage, ×0,5 30–90, ×0,25 danach.`,
    `Abdeckung ${c.value} — ${c.covered.length} von ${c.denominator} Fachrichtungen deines Plans (die Protokolle zählen ${c.corpusTotal}).`,
    `Sprachkurve ${l.value} — Ø ${l.base} % über ${l.samples} mündliche Teile${trend}${few}.`,
    capped === 'none' && capExpiresAt !== null
      ? `Deckel aufgehoben bis ${ddmm(capExpiresAt)}`
      : 'Ohne bestandenen Prüfungstag mit Simulant in den letzten 30 Tagen: höchstens 79.',
  ];
}

/** Bereitschaftsindex (spec §6.1) : `round(0,5·S + 0,25·C + 0,25·L)` — un seul
 *  arrondi final sur les `value` déjà arrondies des composantes (recalculable à
 *  la main). Plafond 79 sans Prüfungstag **avec simulant** réussi < 30 j ;
 *  `capExpiresAt` = date du qualifiant le plus récent + 30 j. `leverage` =
 *  composante à plus grande marge pondérée (égalité → s, c, l). Les
 *  `sim-demo-*` sont exclues. `actions` = T7 (`computeActions`, spec §6.3).
 *  `opts.withActions=false` = garde anti-récursion. */
export function computeBereitschaftsindex(
  input: ReadinessInput,
  now = Date.now(),
  opts: { withActions?: boolean } = {},
): Bereitschaft {
  const sims = input.sims.filter((x) => !isDemoSim(x));
  const s = computeS(sims, now);
  const c = computeC(sims, input.cases, input.visibleCases);
  const l = computeL(sims);
  const raw = Math.round(0.5 * s.value + 0.25 * c.value + 0.25 * l.value);
  const qualifying = sims.filter(
    (x) => x.context === 'pruefungstag' && x.withSimulant === true && simulationPassed(x) && now - x.date < 30 * DAY,
  );
  const capped: Bereitschaft['capped'] = qualifying.length ? 'none' : 'no_recent_exam_day';
  const capExpiresAt = qualifying.length ? Math.max(...qualifying.map((x) => x.date)) + 30 * DAY : null;
  const value = capped === 'none' ? raw : Math.min(raw, 79);
  const margins = { s: 0.5 * (100 - s.value), c: 0.25 * (100 - c.value), l: 0.25 * (100 - l.value) };
  const leverage = (['s', 'c', 'l'] as const).reduce((a, b) => (margins[b] > margins[a] ? b : a));
  const actions: ReadinessAction[] = opts.withActions === false ? [] : computeActions(input, now);
  return {
    value,
    verdict: verdictFor(value),
    capped,
    capExpiresAt,
    leverage,
    s,
    c,
    l,
    explain: explainBereitschaft(s, c, l, capped, capExpiresAt),
    actions,
  };
}
