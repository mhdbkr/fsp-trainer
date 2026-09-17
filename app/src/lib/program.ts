import { caseMastery, TEILE } from '@/lib/simScope';
import { addDays, differenceInCalendarDays, format, getDay, parseISO, startOfDay } from 'date-fns';
import type {
  Case, Fachbegriff, ProgramBlock, ProgramConfig, ProgramDay, Simulation, Layer, Specialty,
} from '@/db/types';
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
const TEIL_MIN: Record<'anamnese' | 'dokumentation' | 'fallvorstellung', number> = { anamnese: 20, dokumentation: 20, fallvorstellung: 12 };
const FACHWISSEN_MIN = 15;
const DRILL_MIN = 15;
const MOCK_MIN = 60;          // examen à blanc (simulation complète) en fin de parcours
// Intervalle (jours ouvrés) avant la couche suivante d'un même cas.
const LAYER_GAP: Record<Layer, number> = { 1: 0, 2: 2, 3: 4 };
/** Longueur de la « dernière ligne droite » (taper) en jours ouvrés. */
function taperLen(totalWorkingDays: number): number {
  return Math.max(3, Math.min(8, Math.round(totalWorkingDays * 0.15)));
}

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
  // Maîtrise au PRORATA des trois parties : toute session compte (FB2-P).
  for (const id of new Set(sims.map((s) => s.caseId))) m.set(id, caseMastery(sims, id).score);
  return m;
}

// Faiblesse moyenne (100 − score) par spécialité, sur les cas déjà tentés.
// Permet de prioriser les DISCIPLINES où l'utilisateur est le plus faible.
function specialtyWeakness(cases: Case[], last: Map<string, number | null>): Map<Specialty, number> {
  const acc = new Map<Specialty, { sum: number; n: number }>();
  for (const c of cases) {
    const s = last.get(c.id);
    if (s == null) continue;
    const cur = acc.get(c.specialty) ?? { sum: 0, n: 0 };
    cur.sum += Math.max(0, 100 - s); cur.n += 1;
    acc.set(c.specialty, cur);
  }
  const m = new Map<Specialty, number>();
  for (const [sp, { sum, n }] of acc) m.set(sp, n ? sum / n : 0);
  return m;
}

function casePriority(c: Case, lastScore: number | null, priority: Specialty[], spWeak = 0): number {
  const weakness = lastScore === null ? 75 : Math.max(5, 100 - lastScore);
  const freq = Math.min(30, c.frequency);
  const prioBoost = priority.includes(c.specialty) ? 1.5 : 1;
  const statusBoost = c.status === 'Maîtrisé' ? 0.3 : 1;
  const disciplineBoost = 1 + spWeak / 100; // discipline faible → priorité accrue
  return (weakness + freq) * prioBoost * statusBoost * disciplineBoost;
}

/** Couches déjà validées d'un cas : max entre le réel (simulations) et les
 *  validations manuelles de l'utilisateur (« marquer fait »). */
export function effectiveDoneLayers(c: Case, config: ProgramConfig): number {
  return Math.max(c.layerProgress ?? 0, config.adjust?.doneLayers?.[c.id] ?? 0);
}

export function programEnd(config: ProgramConfig): Date {
  if (config.examDate) return parseISO(config.examDate);
  return addDays(parseISO(config.startDate), (config.weeks ?? 8) * 7);
}

export function isWorkingDay(d: Date, config: ProgramConfig): boolean {
  return !config.offDays.includes(getDay(d));
}
export function nextWorkingDay(d: Date, config: ProgramConfig): Date {
  let x = d;
  while (!isWorkingDay(x, config)) x = addDays(x, 1);
  return x;
}

// Config minimale utilisée quand l'utilisateur n'a pas encore configuré son programme
// (weekend off par défaut) — seul `offDays` est lu par `isWorkingDay`.
const DEFAULT_CONFIG = { offDays: [0, 6] } as ProgramConfig;

/** Nombre de jours ouvrés strictement après `now` jusqu'à `examDateISO` inclus. */
export function workingDaysUntilExam(examDateISO: string, now: Date, config?: ProgramConfig): number {
  const cfg = config ?? DEFAULT_CONFIG;
  const end = startOfDay(parseISO(examDateISO));
  let d = startOfDay(addDays(now, 1));
  let count = 0;
  let guard = 0;
  while (d <= end && guard < 10000) {
    if (isWorkingDay(d, cfg)) count++;
    d = addDays(d, 1);
    guard++;
  }
  return count;
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

  const adj = config.adjust ?? {};
  const last = lastScoreByCase(sims);
  const spWeak = specialtyWeakness(cases, last);
  const ranked = [...cases]
    .filter((c) => effectiveDoneLayers(c, config) < 3)
    .sort((a, b) =>
      casePriority(b, last.get(b.id) ?? null, config.prioritySpecialties, spWeak.get(b.specialty) ?? 0)
      - casePriority(a, last.get(a.id) ?? null, config.prioritySpecialties, spWeak.get(a.specialty) ?? 0));

  // Introduction échelonnée des cas : ~2 nouveaux cas par jour ouvré au départ.
  let introDay = nextWorkingDay(start, config);
  let introCount = 0;
  const INTRO_PER_DAY = 2;

  const LAYER_REASON: Record<Layer, string> = {
    1: 'Découverte · assisté — première rencontre du cas',
    2: 'Consolidation · autonome — espacée après la couche 1',
    3: 'Ancrage · autonome — dernier passage espacé',
  };

  for (const c of ranked) {
    const doneLayers = effectiveDoneLayers(c, config);
    // Jour d'introduction de la 1re couche restante.
    if (introCount >= INTRO_PER_DAY) { introDay = nextWorkingDay(addDays(introDay, 1), config); introCount = 0; }
    let anchor = doneLayers === 0 ? introDay : nextWorkingDay(start, config);
    if (doneLayers === 0) introCount++;
    // Report manuel : décale toute la suite des couches de ce cas.
    const postpone = adj.postpone?.[c.id] ?? 0;
    if (postpone) anchor = nextWorkingDay(addDays(anchor, postpone), config);

    // Courbe « teil-first » : avant la première simulation complète, chaque
    // partie s'entraîne seule, dans l'ordre de l'examen, tant qu'elle n'est pas
    // acquise (≥ 60 %). Se recalcule à chaque session : dès qu'un Teil est
    // acquis, le plan passe au suivant, puis à la complète.
    if (config.strategy === 'teil-first' && doneLayers === 0) {
      const mastery = caseMastery(sims, c.id).parts;
      let teilDay = anchor;
      for (const t of TEILE) {
        if ((mastery[t.key] ?? 0) >= 60) continue;
        const day = placeFrom(teilDay, TEIL_MIN[t.key]);
        if (day > end) break;
        add(day, {
          kind: 'simulation', label: `${c.name} — ${t.label} seule`, estMin: TEIL_MIN[t.key], caseId: c.id, layer: 1,
          assistance: 'assiste', specialty: c.specialty, id: `${c.id}:T:${t.key}`, teil: t.key,
          reason: `Courbe par parties · ${t.label} d'abord — la complète vient quand chaque partie tient`, phase: 'discovery',
        });
        teilDay = nextWorkingDay(addDays(day, 1), config);
      }
      anchor = teilDay;
    }

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
        id: `${c.id}:L${layer}`,
        reason: LAYER_REASON[layer],
        phase: layer === 1 ? 'discovery' : 'consolidation',
      });
      if (layer === 1 && c.linkedFachwissenId) {
        const fwDay = placeFrom(day, FACHWISSEN_MIN);
        if (fwDay <= end) add(fwDay, { kind: 'fachwissen', label: `Fachwissen : ${c.pathology}`, estMin: FACHWISSEN_MIN, caseId: c.id, specialty: c.specialty, id: `fw:${c.id}`, reason: 'Théorie liée au cas — juste après la découverte' });
      }
      anchor = day; // la couche suivante s'espace à partir de la date réelle
    }
  }

  // Drill quotidien sur chaque jour ouvré de l'horizon (sauf jours annulés).
  for (let d = nextWorkingDay(start, config); d <= end; d = addDays(d, 1)) {
    if (!isWorkingDay(d, config)) continue;
    const dk = key(d);
    if (adj.skipDrillDates?.includes(dk)) continue;
    add(d, { kind: 'drill', label: 'Drill Fachbegriffe', estMin: DRILL_MIN, axis: 'Fachbegriffe', id: `drill:${dk}`, reason: 'Rappel espacé (SM-2) des Fachbegriffe' });
  }

  // --------------------------------------------------------------------------
  // Dernière ligne droite (taper) : PAS de révisions auto par cas — seules les
  // révisions AJOUTÉES PAR L'UTILISATEUR comptent. Le plan conclut simplement
  // par des examens à blanc pour arriver rodé et serein le jour J.
  // --------------------------------------------------------------------------
  const workingDays: Date[] = [];
  for (let d = nextWorkingDay(start, config); d <= end; d = addDays(d, 1)) if (isWorkingDay(d, config)) workingDays.push(d);
  const taperCount = taperLen(workingDays.length);

  for (const d of workingDays.slice(-Math.min(2, taperCount))) {
    const dk = key(d);
    if ((used.get(dk) ?? 0) + MOCK_MIN <= dailyBudget * 1.25) {
      add(d, {
        kind: 'revision', label: 'Examen à blanc — simulation complète', estMin: MOCK_MIN,
        id: `mock:${dk}`, reason: 'Répétition générale en conditions réelles',
        phase: 'taper',
      });
    }
  }

  // Tâches ajoutées manuellement (révisions supplémentaires…).
  for (const ex of adj.extras ?? []) {
    if (!map.has(ex.date)) map.set(ex.date, []);
    map.get(ex.date)!.push({
      kind: ex.kind, label: ex.label,
      estMin: ex.estMin ?? (ex.kind === 'simulation' ? SIM_MIN : ex.kind === 'fachwissen' ? FACHWISSEN_MIN : DRILL_MIN),
      caseId: ex.caseId, specialty: ex.specialty, id: ex.id, manual: true,
    });
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

// ----------------------------------------------------------------------------
// Stats par DISCIPLINE — rend visible le raisonnement adaptatif : couches faites,
// score moyen, priorité. Alimente le panneau « Où le plan met l'accent ».
// ----------------------------------------------------------------------------
export interface DisciplineStat {
  specialty: Specialty;
  cases: number;
  layersDone: number;
  layersTotal: number;
  attempted: number;      // nb de cas déjà tentés (avec un score)
  avgScore: number | null;
  priority: 'haute' | 'moyenne' | 'basse';
}

export function disciplineStats(config: ProgramConfig, cases: Case[], sims: Simulation[]): DisciplineStat[] {
  const last = lastScoreByCase(sims);
  const bySpec = new Map<Specialty, Case[]>();
  for (const c of cases) {
    const arr = bySpec.get(c.specialty) ?? [];
    arr.push(c); bySpec.set(c.specialty, arr);
  }
  const out: DisciplineStat[] = [];
  for (const [specialty, list] of bySpec) {
    const layersDone = list.reduce((s, c) => s + effectiveDoneLayers(c, config), 0);
    const scores = list.map((c) => last.get(c.id)).filter((v): v is number => v != null);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const isPrio = config.prioritySpecialties.includes(specialty);
    const weak = avgScore != null && avgScore < 60;
    const priority: DisciplineStat['priority'] = isPrio || weak ? 'haute' : avgScore != null && avgScore >= 80 ? 'basse' : 'moyenne';
    out.push({ specialty, cases: list.length, layersDone, layersTotal: list.length * 3, attempted: scores.length, avgScore, priority });
  }
  // Tri : priorité haute d'abord, puis moins avancées.
  const rank = { haute: 0, moyenne: 1, basse: 2 };
  return out.sort((a, b) => rank[a.priority] - rank[b.priority] || a.layersDone / a.layersTotal - b.layersDone / b.layersTotal);
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
  const backlogUnits = data.cases.reduce((s, c) => s + (3 - effectiveDoneLayers(c, config)), 0);

  return {
    daysUntilExam,
    workedDays: workedDaySet.size,
    plannedDaysElapsed,
    adherencePct: plannedDaysElapsed ? Math.min(100, Math.round((workedDaySet.size / plannedDaysElapsed) * 100)) : 100,
    totalSpentMin,
    backlogUnits,
  };
}
