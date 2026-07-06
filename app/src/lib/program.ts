import { addDays, differenceInCalendarDays, format, getDay, parseISO, startOfDay } from 'date-fns';
import type {
  Case, Fachbegriff, ProgramBlock, ProgramConfig, ProgramDay, Simulation, Layer, Specialty,
} from '@/db/types';
import { partScore } from './scoring';
import { isDue } from './srs';

// ============================================================================
// Moteur du Programme de révision dynamique (Module 1) — VRAI planificateur.
//
// Principes :
//  • Chaque cas se travaille en 3 COUCHES. Révision espacée : après la couche 1,
//    la couche 2 tombe ~2 jours plus tard, la couche 3 ~4 jours après (intervalles
//    croissants). JAMAIS deux couches du même cas le même jour.
//  • Les cas sont INTRODUITS progressivement (on n'empile pas toutes les couches 1
//    au jour 1) : priorité aux cas faibles / fréquents / prioritaires.
//  • Budget horaire par jour respecté ; ce qui déborde glisse au jour ouvré suivant.
//  • Drill SM-2 chaque jour ouvré.
//  • Recalculé à chaque affichage → s'adapte aux performances et à l'assiduité.
// ============================================================================

const INTENSITY_FACTOR: Record<ProgramConfig['intensity'], number> = { leicht: 0.8, mittel: 1.0, intensiv: 1.3 };
const SIM_MIN = 40;
const FACHWISSEN_MIN = 15;
const DRILL_MIN = 15;
// Intervalle (jours ouvrés) avant la couche suivante d'un même cas.
const LAYER_GAP: Record<Layer, number> = { 1: 0, 2: 2, 3: 4 };

export interface ProgramStats {
  daysUntilExam: number | null;
  workedDays: number;
  plannedDaysElapsed: number;
  adherencePct: number;
  totalSpentMin: number;
  backlogUnits: number;
}

function lastScoreByCase(sims: Simulation[]): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const sim of [...sims].sort((a, b) => a.date - b.date)) {
    const parts = Object.values(sim.parts).filter((p) => p?.done);
    m.set(sim.caseId, parts.length ? Math.round(parts.reduce((s, p) => s + partScore(p!), 0) / parts.length) : null);
  }
  return m;
}

function casePriority(c: Case, lastScore: number | null, priority: Specialty[]): number {
  const weakness = lastScore === null ? 75 : Math.max(5, 100 - lastScore);
  const freq = Math.min(30, c.frequency);
  const prioBoost = priority.includes(c.specialty) ? 1.5 : 1;
  const statusBoost = c.status === 'Maîtrisé' ? 0.3 : 1;
  return (weakness + freq) * prioBoost * statusBoost;
}

export function programEnd(config: ProgramConfig): Date {
  if (config.examDate) return parseISO(config.examDate);
  return addDays(parseISO(config.startDate), (config.weeks ?? 8) * 7);
}

function isWorkingDay(d: Date, config: ProgramConfig): boolean {
  return !config.offDays.includes(getDay(d));
}
function nextWorkingDay(d: Date, config: ProgramConfig): Date {
  let x = d;
  while (!isWorkingDay(x, config)) x = addDays(x, 1);
  return x;
}

// ----------------------------------------------------------------------------
// Planificateur : construit une Map<dateISO, ProgramBlock[]> sur tout l'horizon.
// ----------------------------------------------------------------------------
function schedule(config: ProgramConfig, cases: Case[], sims: Simulation[], now: Date): Map<string, ProgramBlock[]> {
  const map = new Map<string, ProgramBlock[]>();
  const dailyBudget = Math.round(config.hoursPerSession * 60 * INTENSITY_FACTOR[config.intensity]);
  const used = new Map<string, number>();
  const end = startOfDay(programEnd(config));
  const start = startOfDay(now);

  const key = (d: Date) => format(d, 'yyyy-MM-dd');
  const add = (d: Date, block: ProgramBlock) => {
    const k = key(d);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(block);
    used.set(k, (used.get(k) ?? 0) + block.estMin);
  };
  // Trouve le prochain jour ouvré (≥ from) où il reste du budget pour estMin.
  const placeFrom = (from: Date, estMin: number): Date => {
    let d = nextWorkingDay(from < start ? start : from, config);
    let guard = 0;
    while ((used.get(key(d)) ?? 0) + estMin > dailyBudget && guard < 400) {
      d = nextWorkingDay(addDays(d, 1), config);
      guard++;
      if (d > end) break;
    }
    return d;
  };

  const last = lastScoreByCase(sims);
  const ranked = [...cases]
    .filter((c) => (c.layerProgress ?? 0) < 3)
    .sort((a, b) => casePriority(b, last.get(b.id) ?? null, config.prioritySpecialties) - casePriority(a, last.get(a.id) ?? null, config.prioritySpecialties));

  // Introduction échelonnée des cas : ~2 nouveaux cas par jour ouvré au départ.
  let introDay = nextWorkingDay(start, config);
  let introCount = 0;
  const INTRO_PER_DAY = 2;

  for (const c of ranked) {
    const doneLayers = c.layerProgress ?? 0;
    // Jour d'introduction de la 1re couche restante.
    if (introCount >= INTRO_PER_DAY) { introDay = nextWorkingDay(addDays(introDay, 1), config); introCount = 0; }
    let anchor = doneLayers === 0 ? introDay : nextWorkingDay(start, config);
    if (doneLayers === 0) introCount++;

    for (let L = doneLayers + 1; L <= 3; L++) {
      const layer = L as Layer;
      const desired = addDays(anchor, LAYER_GAP[layer]);
      const day = placeFrom(desired, SIM_MIN);
      if (day > end) break;
      add(day, {
        kind: 'simulation',
        label: `${c.name} — Couche ${layer}`,
        estMin: SIM_MIN, caseId: c.id, layer,
        assistance: layer === 1 ? 'assiste' : 'autonome',
        specialty: c.specialty,
      });
      if (layer === 1 && c.linkedFachwissenId) {
        const fwDay = placeFrom(day, FACHWISSEN_MIN);
        if (fwDay <= end) add(fwDay, { kind: 'fachwissen', label: `Fachwissen : ${c.pathology}`, estMin: FACHWISSEN_MIN, caseId: c.id, specialty: c.specialty });
      }
      anchor = day; // la couche suivante s'espace à partir de la date réelle
    }
  }

  // Drill quotidien sur chaque jour ouvré de l'horizon.
  const dueTotal = 0; // dimensionné à l'affichage (voir generateProgram)
  void dueTotal;
  for (let d = nextWorkingDay(start, config); d <= end; d = addDays(d, 1)) {
    if (!isWorkingDay(d, config)) continue;
    add(d, { kind: 'drill', label: 'Drill Fachbegriffe', estMin: DRILL_MIN, axis: 'Fachbegriffe' });
  }
  return map;
}

/** Génère les jours de programme du `now` jusqu'à min(exam, now+horizon). */
export function generateProgram(
  config: ProgramConfig,
  data: { cases: Case[]; sims: Simulation[]; begriffe: Fachbegriff[] },
  horizonDays = 21,
  now = new Date(),
): ProgramDay[] {
  const today = startOfDay(now);
  const end = startOfDay(programEnd(config));
  const lastOffset = Math.max(0, Math.min(horizonDays, differenceInCalendarDays(end, today)));

  const map = schedule(config, data.cases, data.sims, today);

  // Activité réelle par jour.
  const spentByDay = new Map<string, number>();
  const workedDays = new Set<string>();
  for (const sim of data.sims) {
    const k = format(new Date(sim.date), 'yyyy-MM-dd');
    const secs = Object.values(sim.parts).reduce((s, p) => s + (p?.durationSec ?? 0), 0);
    spentByDay.set(k, (spentByDay.get(k) ?? 0) + Math.round(secs / 60));
    workedDays.add(k);
  }
  const dueTotal = data.begriffe.filter((b) => isDue(b.srs, now.getTime())).length;

  const days: ProgramDay[] = [];
  for (let i = 0; i <= lastOffset; i++) {
    const date = addDays(today, i);
    const k = format(date, 'yyyy-MM-dd');
    const isOff = !isWorkingDay(date, config);
    const blocks = (map.get(k) ?? []).map((b) =>
      b.kind === 'drill' ? { ...b, label: `Drill Fachbegriffe (${Math.max(5, dueTotal - i * 3)} cartes)` } : b,
    );
    days.push({
      date: k, isOff,
      targetMin: Math.round(config.hoursPerSession * 60 * INTENSITY_FACTOR[config.intensity]),
      blocks, worked: workedDays.has(k), spentMin: spentByDay.get(k) ?? 0,
    });
  }
  return days;
}

export function programStats(
  config: ProgramConfig,
  data: { cases: Case[]; sims: Simulation[]; begriffe: Fachbegriff[] },
  now = new Date(),
): ProgramStats {
  const end = programEnd(config);
  const daysUntilExam = config.examDate ? Math.max(0, differenceInCalendarDays(end, now)) : null;
  const start = parseISO(config.startDate);
  const elapsed = Math.max(0, differenceInCalendarDays(now, start));
  let plannedDaysElapsed = 0;
  for (let i = 0; i <= elapsed; i++) if (isWorkingDay(addDays(start, i), config)) plannedDaysElapsed++;

  const workedDaySet = new Set(data.sims.map((s) => format(new Date(s.date), 'yyyy-MM-dd')));
  const totalSpentMin = Math.round(
    data.sims.reduce((s, sim) => s + Object.values(sim.parts).reduce((t, p) => t + (p?.durationSec ?? 0), 0), 0) / 60,
  );
  const backlogUnits = data.cases.reduce((s, c) => s + (3 - (c.layerProgress ?? 0)), 0);

  return {
    daysUntilExam,
    workedDays: workedDaySet.size,
    plannedDaysElapsed,
    adherencePct: plannedDaysElapsed ? Math.min(100, Math.round((workedDaySet.size / plannedDaysElapsed) * 100)) : 100,
    totalSpentMin,
    backlogUnits,
  };
}
