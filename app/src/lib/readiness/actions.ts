import type { Case, PartResult, Simulation, Specialty } from '@/db/types';
import { computeBereitschaftsindex } from './bereitschaft';
import type { ExamAxis, ReadinessAction, ReadinessInput } from './bereitschaft';

// ============================================================================
// T7 — `computeActions` (spec §6.3) : plan d'actions chiffré, toujours calculé
// (pur), affiché en Pro seulement. Chaque gain simule une hypothèse « réussie
// à 70 % » sur une copie de l'entrée (jamais de mutation) et mesure l'écart de
// Bereitschaftsindex ; `{ withActions: false }` évite la récursion.
// ============================================================================

const part = (contentPct: number, officialPct: number, isOral: boolean): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 70,
  contentPct,
  officialPct,
  ...(isOral ? { languageGrid: {} as PartResult['languageGrid'] } : {}),
});

/** Cas le plus fréquent du plan (visible), optionnellement filtré par spécialité. */
function topCase(cases: Case[], specialty?: Specialty): Case | undefined {
  const pool = specialty ? cases.filter((c) => c.specialty === specialty) : cases;
  return pool.length ? pool.reduce((m, c) => (c.frequency > m.frequency ? c : m)) : undefined;
}

interface HypoSimOpts {
  kind: 'exam_day' | 'cover' | 'axis' | 'language';
  caseId?: string;
  now: number;
  axis?: ExamAxis;
}

/** Simulation hypothétique réussie à 70 % (spec §6.3) pour chaque type d'action. */
function hypoSim(opts: HypoSimOpts): Simulation {
  const shared = {
    id: `hyp-${opts.kind}`,
    caseId: opts.caseId ?? 'hyp-case',
    date: opts.now,
    notes: {} as Simulation['notes'],
    prioritizedCorrections: [] as string[],
  };
  if (opts.kind === 'exam_day') {
    return {
      ...shared,
      context: 'pruefungstag',
      withSimulant: true,
      assistance: 'autonome',
      layer: 3,
      passed: true,
      parts: {
        anamnese: part(70, 70, true),
        dokumentation: part(70, 0, false),
        fallvorstellung: part(70, 70, true),
      },
    };
  }
  if (opts.kind === 'cover') {
    return { ...shared, assistance: 'autonome', layer: 3, passed: true, parts: { anamnese: part(70, 70, true) } };
  }
  if (opts.kind === 'axis') {
    const axis = opts.axis ?? 'Anamnese';
    const parts: Simulation['parts'] =
      axis === 'Anamnese'
        ? { anamnese: part(70, 70, true) }
        : axis === 'Dokumentation'
          ? { dokumentation: part(70, 0, false) }
          : { fallvorstellung: part(70, 70, true) };
    return { ...shared, assistance: 'autonome', layer: 3, parts };
  }
  // language
  return {
    ...shared,
    assistance: 'autonome',
    layer: 3,
    parts: {
      anamnese: part(70, 70, true),
      aufklaerung: part(70, 70, true),
      fallvorstellung: part(70, 70, true),
    },
  };
}

/** Plan d'actions (spec §6.3) : gain = BI(hypothèse à 70 %) − BI actuel, ≥ 0,
 *  arrondi ; tri décroissant ; 3 à 5 actions. `input` n'est jamais muté (les
 *  hypothèses portent sur des copies). */
export function computeActions(input: ReadinessInput, now: number): ReadinessAction[] {
  const base = computeBereitschaftsindex(input, now, { withActions: false });
  const withSim = (extra: Simulation) =>
    computeBereitschaftsindex({ ...input, sims: [...input.sims, extra] }, now, { withActions: false }).value;
  const gain = (extra: Simulation) => Math.max(0, withSim(extra) - base.value);

  const out: ReadinessAction[] = [];

  out.push({
    kind: 'exam_day',
    label: 'Prüfungstag mit Simulant bestehen',
    gain: gain(hypoSim({ kind: 'exam_day', caseId: topCase(input.visibleCases)?.id, now })),
  });

  for (const m of base.c.missing.slice(0, 3)) {
    out.push({
      kind: 'cover_specialty',
      label: `${m.specialty} abdecken (≥ 60 %)`,
      target: m.specialty,
      gain: gain(hypoSim({ kind: 'cover', caseId: topCase(input.visibleCases, m.specialty)?.id, now })),
    });
  }

  const axisEntry = base.s.byAxis.find((a) => !a.tested) ?? [...base.s.byAxis].sort((a, b) => a.score - b.score)[0];
  out.push({
    kind: 'axis',
    label: `${axisEntry.axis} auf 70 % bringen`,
    target: axisEntry.axis,
    gain: gain(hypoSim({ kind: 'axis', axis: axisEntry.axis, caseId: topCase(input.visibleCases)?.id, now })),
  });

  out.push({
    kind: 'language',
    label: 'Sprachnote 70 % auf 3 mündlichen Teilen',
    gain: gain(hypoSim({ kind: 'language', caseId: topCase(input.visibleCases)?.id, now })),
  });

  return out.sort((a, b) => b.gain - a.gain).slice(0, 5);
}
