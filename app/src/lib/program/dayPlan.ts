// ============================================================================
// Le plan du jour FIGÉ.
// Contrat : docs/contracts/training-journal.md §3 et §7 · ADR-0017 §2 et §3.
//
// L'audit conclut en une phrase : « le plan est une fonction pure recalculée
// depuis `now`, jamais un état matérialisé ». Tout est là. `schedule()` repartait
// de zéro à chaque rendu, depuis trois endroits concurrents, et son bin-packing
// glouton reprenait immédiatement toute minute libérée — cocher une tâche en
// faisait apparaître une autre à sa place.
//
// Ici : le jour est construit UNE FOIS, à la première ouverture, et stocké.
// Cocher pose `doneAt` (dérivé du journal) ; RIEN d'autre ne bouge. Le plan ne
// change qu'à l'action nommée « replanifier ».
// ============================================================================

import { addDays, differenceInCalendarDays, format, getDay, parseISO, startOfDay } from 'date-fns';
import type {
  Case, CaseProgress, DayPlan, Fachbegriff, Fortschrittsmodus, Layer, ProgramConfig,
  SimTeil, Specialty, TaskInstance, TrainingEvent,
} from '@/db/types';
import { db } from '@/db/db';
import { newId } from '@/lib/sync/events';
import { counts } from '@/lib/stats';
import { INTENSITY_FACTOR } from '@/lib/intensity';
import { TEILE } from '@/lib/simScope';
import { blankProgress, projectDayPlans } from '@/lib/journal';
import { dayKey, now as clockNow } from '@/lib/clock';
import { pickWithDiversity, pourquoiAujourdhui, rankCandidates, violatesDiversity, type SelectContext } from './select';

const SIM_MIN = 40;
const TEIL_MIN: Record<SimTeil, number> = { anamnese: 20, dokumentation: 20, fallvorstellung: 12 };
const MOCK_MIN = 60;
const FACHWISSEN_MIN = 15;
const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

/** Le mode par défaut tant que le candidat n'a rien choisi. Lecture tolérante
 *  de l'ancien `strategy` (contrat §6 et §11.2) : aucune sémantique perdue. */
export function modusOf(config: ProgramConfig): Fortschrittsmodus {
  if (config.modus) return config.modus;
  return config.strategy === 'full' ? 'cas-complet' : 'teil-first';
}

export const isWorkingDay = (d: Date, config: ProgramConfig): boolean => !config.offDays.includes(getDay(d));

export function nextWorkingDay(d: Date, config: ProgramConfig): Date {
  let x = d;
  for (let guard = 0; guard < 14 && !isWorkingDay(x, config); guard++) x = addDays(x, 1);
  return x;
}

export function programEnd(config: ProgramConfig): Date {
  if (config.examDate) return parseISO(config.examDate);
  return addDays(parseISO(config.startDate), (config.weeks ?? 8) * 7);
}

/**
 * La « dernière ligne droite », en dates ABSOLUES.
 *
 * INV-12 : l'ancienne version mesurait `taperLen(workingDays.length)` sur les
 * jours RESTANTS (`program.ts:35-37,136`) — la fenêtre se rétrécissait et
 * glissait chaque jour, et le badge apparaissait puis disparaissait tout seul.
 * Ici la fenêtre se calcule sur la date d'examen : elle ne dépend pas de `now`,
 * donc la phase d'un jour figé ne change plus jamais.
 */
export function taperDays(config: ProgramConfig): Set<string> {
  const start = startOfDay(parseISO(config.startDate));
  const last = addDays(startOfDay(programEnd(config)), -1);   // le jour de l'examen n'est pas un jour d'entraînement
  const working: Date[] = [];
  for (let d = start; d <= last; d = addDays(d, 1)) if (isWorkingDay(d, config)) working.push(d);
  const len = Math.max(3, Math.min(8, Math.round(working.length * 0.15)));
  return new Set(working.slice(-len).map((d) => format(d, 'yyyy-MM-dd')));
}

export interface BuildInput {
  config: ProgramConfig;
  date: string;                       // ISO yyyy-MM-dd
  cases: Case[];
  progress: Map<string, CaseProgress>;
  trainingEvents: TrainingEvent[];
  begriffe: Fachbegriff[];
  now: number;
  /** Budget restant, s'il n'est pas le budget plein du jour (replanifier, I3). */
  budgetMin?: number;
}

/** Le Teil de plus forte dette DU CORPUS — celui sur lequel le candidat a le
 *  plus de travail devant lui. Mode `teil-first` : le même pour toutes les
 *  tâches du jour, « un geste à la fois ». */
export function teilLePlusEnDette(progress: Map<string, CaseProgress>, cases: Case[]): SimTeil {
  const debt = new Map<SimTeil, number>(TEIL_KEYS.map((t) => [t, 0]));
  for (const c of cases) {
    const cp = progress.get(c.id) ?? blankProgress(c.id);
    for (const t of TEIL_KEYS) if (cp.teile[t].status !== 'solide') debt.set(t, debt.get(t)! + 1);
  }
  return [...debt.entries()].sort((a, b) => b[1] - a[1] || TEIL_KEYS.indexOf(a[0]) - TEIL_KEYS.indexOf(b[0]))[0][0];
}

/** La spécialité de plus forte dette agrégée — mode `specialite`. */
export function specialiteLaPlusEnDette(progress: Map<string, CaseProgress>, cases: Case[]): Specialty | undefined {
  const debt = new Map<Specialty, number>();
  for (const c of cases) {
    const cp = progress.get(c.id) ?? blankProgress(c.id);
    const n = TEIL_KEYS.filter((t) => cp.teile[t].status !== 'solide').length;
    if (n) debt.set(c.specialty, (debt.get(c.specialty) ?? 0) + n);
  }
  return [...debt.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}

const layerFor = (cp: CaseProgress | undefined): Layer =>
  !cp || cp.overall === 'vierge' ? 1 : cp.overall === 'entame' ? 2 : 3;

/**
 * Construit les tâches d'un jour. FONCTION PURE : mêmes entrées, mêmes sorties,
 * y compris les identifiants si `mkId` est déterministe. Elle ne lit ni la base
 * ni l'horloge — `input.now` est passé, jamais pris.
 */
export function buildTasks(input: BuildInput, mkId: () => string = newId): TaskInstance[] {
  const { config, date, cases, progress, begriffe } = input;
  const day = parseISO(date);
  if (!isWorkingDay(day, config)) return [];
  if (day >= startOfDay(programEnd(config))) return [];      // le jour de l'examen reste vide

  const modus = modusOf(config);
  const targetMin = input.budgetMin ?? dayTargetMin(config);
  const tasks: TaskInstance[] = [];
  let used = 0;
  const push = (t: Omit<TaskInstance, 'id' | 'date' | 'source'>) => {
    tasks.push({ ...t, id: mkId(), date, source: 'plan' });
    used += t.estMin;
  };

  // 1. Le drill. Son coût est FIGÉ avec le jour : faire ses cartes ne libère
  //    plus de minutes, donc n'attire plus de nouvelles simulations
  //    (audit §2.4 — l'effet existait sans rien cocher).
  const terms = counts(begriffe, input.now);
  const drillTotal = terms.due + Math.min(terms.fresh, 10);
  if (drillTotal > 0) {
    push({
      kind: 'drill', label: 'Fachbegriffe', estMin: Math.ceil(drillTotal * 0.4),
      reason: `${terms.due} terme${terms.due > 1 ? 's' : ''} dû${terms.due > 1 ? 's' : ''} aujourd'hui, plus les nouveaux du budget.`,
    });
  }

  // 2. L'examen à blanc occupe la dernière ligne droite, et le mode dédié.
  const taper = taperDays(config);
  const isTaper = taper.has(date);
  if (modus === 'examen-blanc' || isTaper) {
    const ctx = selectContext(input);
    const best = rankCandidates(cases, ctx)[0];
    if (best && used + MOCK_MIN <= targetMin) {                // M3 : jamais au-delà du budget
      push({
        kind: 'examen-blanc', label: best.c.name, estMin: MOCK_MIN, caseId: best.c.id,
        specialty: best.c.specialty, layer: 3, assistance: 'autonome',
        reason: isTaper ? `Répétition générale : conditions réelles, sans aide.` : pourquoiAujourdhui(best, ctx),
      });
    }
    if (modus === 'examen-blanc') return tasks;
  }

  // 3. Les simulations. Un seul moteur de sélection dans le dépôt.
  const ctx = selectContext(input);
  let candidates = rankCandidates(cases, ctx);
  const enforceDiversity = modus === 'teil-first';
  if (modus === 'specialite') {
    const sp = specialiteLaPlusEnDette(progress, cases);
    if (sp) candidates = candidates.filter((s) => s.c.specialty === sp);
  }
  const alreadyToday = new Set(tasks.map((t) => t.caseId).filter(Boolean));
  candidates = candidates.filter((s) => !alreadyToday.has(s.c.id));

  const teilDuJour = modus === 'teil-first' ? teilLePlusEnDette(progress, cases) : undefined;
  const room = () => Math.max(0, targetMin - used);
  const unitMin = teilDuJour ? TEIL_MIN[teilDuJour] : SIM_MIN;
  const wanted = Math.max(1, Math.floor(room() / unitMin));

  const seedSp = tasks.map((t) => t.specialty).filter((x): x is Specialty => !!x);
  for (const { scored, diversityRelaxed } of pickWithDiversity(candidates, wanted, enforceDiversity, seedSp)) {
    const cp = progress.get(scored.c.id);
    // Une partie mesurée FRAGILE passe devant le Teil du jour : c'est le
    // travail de plus forte valeur, et c'est ce que dit déjà l'explication.
    // D-I5 : en `cas-complet`, le mode du candidat prime — jamais un Teil seul.
    const fragile = modus !== 'cas-complet' && cp ? TEIL_KEYS.find((t) => cp.teile[t].status === 'fragile') : undefined;
    const teil = fragile ?? teilDuJour;
    const estMin = teil ? TEIL_MIN[teil] : SIM_MIN;
    if (used + estMin > targetMin) break;
    const layer = layerFor(cp);
    push({
      kind: 'simulation', label: scored.c.name, estMin, caseId: scored.c.id,
      specialty: scored.c.specialty, layer, assistance: layer === 1 ? 'assiste' : 'autonome',
      ...(teil ? { teil } : {}),
      ...(diversityRelaxed ? { diversityRelaxed: true } : {}),
      reason: pourquoiAujourdhui(scored, ctx),
    });
  }

  // 4. La théorie liée au premier cas découvert aujourd'hui, si le budget reste.
  const first = tasks.find((t) => t.kind === 'simulation' && t.layer === 1 && t.caseId);
  const linked = first && cases.find((c) => c.id === first.caseId)?.linkedFachwissenId;
  if (linked && used + FACHWISSEN_MIN <= targetMin) {
    // I4 : la tâche de théorie entre dans la liste soumise à C1/C2 ; seul
    // candidat possible, elle porte `diversityRelaxed` si elle les viole.
    const relaxed = enforceDiversity && !!first!.specialty
      && violatesDiversity(tasks.map((t) => t.specialty).filter((x): x is Specialty => !!x), first!.specialty);
    push({
      kind: 'fachwissen', label: cases.find((c) => c.id === first!.caseId)!.pathology,
      estMin: FACHWISSEN_MIN, caseId: first!.caseId, specialty: first!.specialty,
      ...(relaxed ? { diversityRelaxed: true } : {}),
      reason: `La théorie du cas que tu découvres aujourd'hui.`,
    });
  }
  return tasks;
}

export const dayTargetMin = (config: ProgramConfig): number =>
  Math.round(config.hoursPerSession * 60 * INTENSITY_FACTOR[config.intensity]);

function selectContext(input: BuildInput): SelectContext {
  const lastPlayedAt = new Map<string, number>();
  for (const te of input.trainingEvents) {
    if (!te.caseId || !te.teile.length) continue;             // « dernier JEU » : une fiche lue n'est pas un jeu
    const prev = lastPlayedAt.get(te.caseId);
    if (prev === undefined || te.at > prev) lastPlayedAt.set(te.caseId, te.at);
  }
  const end = startOfDay(programEnd(input.config));
  return {
    daysUntilExam: input.config.examDate ? Math.max(0, differenceInCalendarDays(end, parseISO(input.date))) : null,
    freqMax: input.cases.reduce((m, c) => Math.max(m, c.frequency), 1),
    now: input.now,
    lastPlayedAt,
    progress: input.progress,
  };
}

// ---------------------------------------------------------------------------
// La source unique de la session du jour (contrat §7)
// ---------------------------------------------------------------------------

/**
 * La première tâche non faite du plan figé. RIEN d'autre.
 *
 * `pickSessionCase` a disparu avec son second barème : deux moteurs de
 * sélection concurrents étaient la cause de la discordance « Leberzirrhose »,
 * où le hero de l'accueil ignorait totalement le plan qu'il affichait dessous.
 */
export const sessionDuJour = (plan: DayPlan | null | undefined): TaskInstance | null =>
  plan?.tasks.find((t) => t.doneAt === undefined) ?? null;

export const planProgress = (plan: DayPlan | null | undefined): { done: number; total: number } => ({
  done: plan?.tasks.filter((t) => t.doneAt !== undefined).length ?? 0,
  total: plan?.tasks.length ?? 0,
});

// ---------------------------------------------------------------------------
// Matérialisation et replanification
// ---------------------------------------------------------------------------

async function loadBuildInput(config: ProgramConfig, date: string, at: number): Promise<BuildInput> {
  const [cases, begriffe, trainingEvents, progressRows] = await Promise.all([
    db.cases.toArray(), db.fachbegriffe.toArray(), db.training_events.toArray(), db.case_progress.toArray(),
  ]);
  return { config, date, cases, begriffe, trainingEvents, progress: new Map(progressRows.map((p) => [p.caseId, p])), now: at };
}

/**
 * Matérialise le jour s'il ne l'est pas encore, et le rend.
 *
 * **Pure de tout rendu.** Appelée UNE FOIS au démarrage de l'app, jamais par un
 * composant : un rendu qui ne trouve pas le `DayPlan` du jour affiche « pas
 * encore ouvert », il ne le crée pas. Aucun jour futur n'est matérialisé, et le
 * passé ne l'est jamais rétroactivement — un jour sans `DayPlan` est un jour où
 * l'app n'a pas été ouverte ; il s'affiche vide, pas « en retard ».
 */
export async function ensureDayPlan(date = dayKey(clockNow())): Promise<DayPlan | null> {
  const existing = await db.day_plans.get(date);
  if (existing) return existing;                                  // « figé » veut dire que le premier fige
  // Le journal fait foi, pas la projection : une reconstruction concurrente
  // (pull tardif) peut avoir vidé `day_plans` entre l'écriture de l'événement
  // et celle de la ligne. Re-matérialiser ferait DEUX plans pour un jour.
  const known = await db.progress_events.where('subject_id').equals(date).filter((e) => e.type === 'plan.materialized').toArray();
  if (known.length) {
    const [plan] = projectDayPlans(known, await db.training_events.toArray());
    if (plan) { await db.day_plans.put(plan); return plan; }
  }
  // M7 : une horloge qui recule (réglage manuel, fuseau) ne matérialise jamais
  // un jour antérieur au dernier figé — le passé n'est jamais rétroactif.
  const last = await db.day_plans.orderBy('date').last();
  if (last && date < last.date) return null;
  const config = (await db.meta.get('program'))?.value as ProgramConfig | undefined;
  if (!config) return null;                                       // pas de programme : rien à matérialiser

  const at = clockNow();
  const input = await loadBuildInput(config, date, at);
  const tasks = buildTasks(input);
  const plan: DayPlan = {
    date, materializedAt: at, mode: modusOf(config), seed: `${date}:${modusOf(config)}:${input.trainingEvents.length}`,
    targetMin: dayTargetMin(config), tasks,
  };
  // L'événement D'ABORD, horodaté à l'instant de matérialisation : la
  // reconstruction dérive `materializedAt` de `occurred_at` — un autre
  // horodatage changerait le plan au redémarrage (INV-9).
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({
    type: 'plan.materialized', subject_id: date, occurred_at: new Date(at).toISOString(),
    payload: { tasks, mode: plan.mode, seed: plan.seed, targetMin: plan.targetMin },
  }).catch((e) => console.warn('[sync]', e));
  await db.day_plans.put(plan);
  return plan;
}

/**
 * « Replanifier » — la SEULE chose qui change un jour figé, et seulement sur
 * un geste explicite. Elle CONSERVE à l'identique (id compris) toutes les
 * tâches déjà faites, et ne remplace que les non faites (INV-8). Elle porte sur
 * le jour courant seul : aucun jour futur n'est matérialisé.
 */
export async function replanifier(date = dayKey(clockNow())): Promise<DayPlan | null> {
  const plan = await db.day_plans.get(date);
  const config = (await db.meta.get('program'))?.value as ProgramConfig | undefined;
  if (!plan || !config) return null;

  const at = clockNow();
  const done = plan.tasks.filter((t) => t.doneAt !== undefined);
  const input = await loadBuildInput(config, date, at);
  const doneCaseIds = new Set(done.map((t) => t.caseId).filter(Boolean));
  // I3 : le budget des tâches faites est CONSOMMÉ — cocher ne libère rien.
  const budgetMin = Math.max(0, (plan.targetMin || dayTargetMin(config)) - done.reduce((s, t) => s + t.estMin, 0));
  const fresh = buildTasks({ ...input, budgetMin, cases: input.cases.filter((c) => !doneCaseIds.has(c.id)) })
    .filter((t) => !done.some((d) => d.kind === t.kind && d.caseId === t.caseId));

  const tasks = [...done, ...fresh];
  const next: DayPlan = { ...plan, tasks, replannedAt: at };
  // Événement d'abord, horodaté au geste : `replannedAt` reconstruit = rendu.
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'plan.replanned', subject_id: date, occurred_at: new Date(at).toISOString(), payload: { tasks, reason: 'manuel' } })
    .catch((e) => console.warn('[sync]', e));
  await db.day_plans.put(next);
  return next;
}

/**
 * La projection NON FIGÉE des jours à venir : ce que le calendrier montre, marqué
 * comme tel (contrat §3.2, §7 — I6). Elle n'a pas d'identité (`projection:…`),
 * elle ne se coche pas, et elle ne crée rien. Seuls les jours STRICTEMENT futurs
 * sont projetés : aujourd'hui est figé, le passé n'est jamais rétroactif. L'état
 * est chargé une fois pour toutes les dates.
 */
export async function projectedDays(dates: string[]): Promise<Map<string, TaskInstance[]>> {
  const out = new Map<string, TaskInstance[]>();
  const at = clockNow();
  const today = dayKey(at);
  const future = dates.filter((d) => d > today);
  const config = (await db.meta.get('program'))?.value as ProgramConfig | undefined;
  if (!config || !future.length) return out;
  const input = await loadBuildInput(config, today, at);
  for (const date of future) {
    let n = 0;
    const tasks = buildTasks({ ...input, date }, () => `projection:${date}:${n++}`);
    if (tasks.length) out.set(date, tasks);
  }
  return out;
}
