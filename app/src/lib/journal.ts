// ============================================================================
// Le journal d'entraînement — écriture et dérivation.
// Contrat : docs/contracts/training-journal.md · ADR-0017.
//
// Une seule règle gouverne ce fichier : TOUT exercice écrit exactement UN
// `TrainingEvent`, y compris hors plan. Statistiques, historique, indice de
// préparation, sélection et champ de couverture en dérivent. Aucun écran ne
// lit `db.simulations`.
//
// Le journal est APPEND-ONLY : rien n'est jamais modifié ni supprimé. « Cocher
// une tâche » n'est pas une mutation du plan, c'est un événement de plus —
// l'état « faite » se DÉRIVE de `TrainingEvent.taskId`. C'est ce qui rend le
// plan figé idempotent (INV-1, INV-9) et la reconstruction stable (INV-10).
// ============================================================================

import { db } from '@/db/db';
import { newId, type ProgressEvent } from '@/lib/sync/events';
import { sortEvents } from '@/lib/collections/project';
import { partScore } from '@/lib/scoring';
import { TEILE } from '@/lib/simScope';
import { now, dayKey } from '@/lib/clock';
import { LEGACY_ID_PATTERN } from '@/lib/checklists.legacy';
import { conditionsManquantes, estEnchaine, estSerie4, isExamenBlanc } from '@/lib/examen';
import { computeCaseProgress } from '@/lib/progression';
import type {
  CaseId, CaseProgress, ChecklistItemId, DayPlan, SimTeil, Simulation, TaskInstance, TaskKind,
  TrainingEvent, TrainingKind,
} from '@/db/types';

// La mesure vit dans `progression.ts` (pure) ; ce module la ré-exporte pour ses appelants historiques.
export { PART_OK, PART_SOLIDE, blankProgress, computeCaseProgress, estNonMesure, statusOf } from '@/lib/progression';
export { isExamenBlanc } from '@/lib/examen';

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

// ---------------------------------------------------------------------------
// 1. Dérivation d'un TrainingEvent depuis une Simulation (contrat §2.3)
// ---------------------------------------------------------------------------

/**
 * `simulation.completed` n'est PAS doublé par un `training.logged` : un fait,
 * un événement. Le `TrainingEvent` s'en dérive avec un id déterministe, donc
 * la dérivation est idempotente quel que soit le nombre de reconstructions.
 */
export function trainingEventFromSimulation(sim: Simulation): TrainingEvent {
  const parts = sim.parts ?? {};
  const teile = TEIL_KEYS.filter((t) => parts[t]?.done === true);
  const scores: Partial<Record<SimTeil, number>> = {};
  for (const t of teile) scores[t] = partScore(parts[t]!);
  const secs = Object.values(parts).reduce((s, p) => s + (p?.durationSec ?? 0), 0);
  // m6 : `dauerGesamtSec` garde le Teil abandonné ; une partie antérieure n'en a pas.
  const total = typeof sim.dauerGesamtSec === 'number' && Number.isFinite(sim.dauerGesamtSec) && sim.dauerGesamtSec >= 0 ? sim.dauerGesamtSec : secs;
  const serie4 = estSerie4(sim);
  const manque = serie4 ? conditionsManquantes(sim) : [];
  const minutesParTeil: Partial<Record<SimTeil, number>> = {};
  const manques: Partial<Record<SimTeil, ChecklistItemId[]>> = {};
  for (const t of teile) {
    const d = parts[t]!.durationSec;
    if (typeof d === 'number' && d > 0) minutesParTeil[t] = Math.round(d / 60);
    const cl = parts[t]!.checklist;
    // Une checklist à ids legacy `cl-N` a été reconstruite DÉCOCHÉE : elle signalerait tout. Elle n'entre pas (§13.3).
    if (sim.mode !== 'external-ai' && Array.isArray(cl) && cl.length > 0 && !cl.some((i) => LEGACY_ID_PATTERN.test(String(i.id)))) {
      manques[t] = cl.filter((i) => i.checked === false).map((i) => i.id);
    }
  }
  return {
    id: `te-${sim.id}`,
    at: sim.date,
    kind: isExamenBlanc(sim) ? 'examen-blanc' : 'simulation',
    caseId: sim.caseId,
    teile,
    source: sim.taskId ? 'plan' : 'libre',
    ...(sim.taskId ? { taskId: sim.taskId } : {}),
    spentMin: Math.round(total / 60),
    laufId: sim.id,
    scores,
    selbstbewertet: sim.mode === 'external-ai',
    ...(sim.profileId ? { profileId: sim.profileId } : {}),
    // --- [S4] dérivés (§2.3) : jamais écrits par `training.logged` ---
    ...(estEnchaine(sim) ? { enchaine: true as const } : {}),
    ...(serie4 && manque.length === 0 ? { examen: true as const } : {}),
    ...(serie4 ? { examenManque: manque } : {}),
    ...(Object.keys(minutesParTeil).length ? { minutesParTeil } : {}),
    ...(Object.keys(manques).length ? { manques } : {}),
  };
}

// ---------------------------------------------------------------------------
// 2. Projection du journal depuis `progress_events`
// ---------------------------------------------------------------------------

/**
 * `training_events` est une PROJECTION, pas une source : elle se reconstruit
 * intégralement depuis `progress_events`. Deux amonts, un seul aval :
 *  • `simulation.completed` → dérivation §2.3 (id `te-<simId>`) ;
 *  • `training.logged`      → les genres qui n'émettent rien d'autre
 *                             (drill, fiche, aufklaerung, examen-blanc déclaré).
 * Le `Map` par id rend l'opération idempotente (INV-10).
 */
export function projectTrainingEvents(events: ProgressEvent[]): TrainingEvent[] {
  const byId = new Map<string, TrainingEvent>();
  for (const e of sortEvents(events)) {
    if (e.type === 'simulation.completed') {
      const sim = e.payload as Simulation;
      if (!sim?.id) continue;
      const te = trainingEventFromSimulation(sim);
      byId.set(te.id, te);
    } else if (e.type === 'training.logged' && e.subject_id) {
      const te = sanitizeLogged(e.subject_id, e.payload);
      if (te) byId.set(te.id, te);
    }
  }
  // D-C4 — un exercice, un événement : une coche nue est ABSORBÉE par
  // l'exercice réel qui satisfait la même tâche (la source reste intacte).
  const real = new Set([...byId.values()].filter((te) => te.taskId && !isCocheNue(te)).map((te) => te.taskId));
  for (const [id, te] of byId) if (isCocheNue(te) && real.has(te.taskId)) byId.delete(id);
  return [...byId.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

const TRAINING_KINDS: TrainingKind[] = ['simulation', 'drill', 'fiche', 'aufklaerung', 'examen-blanc'];
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 && v.length <= 100 ? v : undefined);

/**
 * Un `training.logged` venu du serveur n'est pas cru sur parole (S-I1, S-M1) :
 * un compte peut écrire dans `progress_events` par REST sans passer par la
 * fonction. On ne garde que des champs connus, bornés — et **jamais `scores`** :
 * seul `simulation.completed` porte un score MESURÉ. Un payload illisible est
 * ignoré, il ne fait pas échouer la reconstruction.
 */
function sanitizeLogged(id: string, raw: unknown): TrainingEvent | null {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = TRAINING_KINDS.find((k) => k === p.kind);
  const at = typeof p.at === 'number' && Number.isFinite(p.at) ? p.at : null;
  if (!kind || at === null) return null;
  const teile = Array.isArray(p.teile) ? TEIL_KEYS.filter((t) => (p.teile as unknown[]).includes(t)) : [];
  const spent = typeof p.spentMin === 'number' && Number.isFinite(p.spentMin) ? Math.min(1440, Math.max(0, Math.round(p.spentMin))) : 0;
  const caseId = str(p.caseId), taskId = str(p.taskId), laufId = str(p.laufId), profileId = str(p.profileId);
  return {                                               // même ordre de clés que logTraining : état bit-identique
    id, at, kind, ...(caseId ? { caseId } : {}), teile,
    source: taskId ? 'plan' : 'libre', ...(taskId ? { taskId } : {}),
    spentMin: spent, ...(laufId ? { laufId } : {}),
    ...(p.selbstbewertet === true ? { selbstbewertet: true } : {}), ...(profileId ? { profileId } : {}),
  };
}

/** Une coche manuelle sans exercice mesuré derrière : tâche visée, 0 minute,
 *  ni score ni run. C'est une déclaration, pas un exercice. */
export const isCocheNue = (te: TrainingEvent): boolean =>
  !!te.taskId && !te.laufId && !te.scores && te.spentMin === 0;

/**
 * Les plans figés. **Seule exception au dernier-gagne du `sync-protocol.md`** :
 * sur `plan.materialized`, le PLUS ANCIEN `occurred_at` gagne (INV-7) — « figé »
 * veut dire que le premier appareil qui ouvre la journée la fige. `plan.replanned`
 * reste au dernier-gagne et bat toujours une matérialisation.
 *
 * L'état « faite » n'est jamais stocké dans la charge utile : il se dérive des
 * `TrainingEvent` porteurs d'un `taskId`. Un seul chemin vers `doneAt`.
 */
export function projectDayPlans(events: ProgressEvent[], trainingEvents: TrainingEvent[]): DayPlan[] {
  const materialized = new Map<string, ProgressEvent>();
  const replanned = new Map<string, ProgressEvent>();
  for (const e of sortEvents(events)) {
    if (!e.subject_id) continue;
    if (e.type === 'plan.materialized') {
      const prev = materialized.get(e.subject_id);
      if (!prev) materialized.set(e.subject_id, e);        // le premier fige ; sortEvents garantit l'ordre
    } else if (e.type === 'plan.replanned') {
      replanned.set(e.subject_id, e);                       // dernier-gagne
    }
  }
  const doneByTask = new Map<string, TrainingEvent>();
  for (const te of trainingEvents) if (te.taskId) doneByTask.set(te.taskId, te);
  // Toutes les tâches jamais figées pour un jour, tous appareils confondus.
  const everTask = new Map<string, TaskInstance>();
  for (const e of events) {
    if ((e.type === 'plan.materialized' || e.type === 'plan.replanned') && e.subject_id) {
      for (const t of taskList(e.payload)) everTask.set(t.id, t);
    }
  }

  const out: DayPlan[] = [];
  for (const [date, base] of materialized) {
    const bp = base.payload as Omit<DayPlan, 'date' | 'materializedAt'>;
    const rep = replanned.get(date);
    const tasks = taskList(rep ? rep.payload : bp).map((t) => {
      const te = doneByTask.get(t.id);
      return te ? { ...t, doneAt: te.at, spentMin: te.spentMin, eventId: te.id } : { ...t, doneAt: undefined, spentMin: undefined, eventId: undefined };
    });
    // D-I2 : une tâche faite dans le plan d'un AUTRE appareil (qui a perdu)
    // coche la tâche équivalente du plan gagnant — même (kind, caseId, teil).
    // I-3 (décision de main) : sans équivalent, la tâche FAITE est AJOUTÉE au
    // plan gagnant, comme `replanifier` conserve les faites — jamais perdue.
    const ids = new Set(tasks.map((t) => t.id));
    const carried = new Map<string, number>();                 // taskId perdant → index dans le plan gagnant
    for (const te of trainingEvents) {
      const orig = te.taskId && !ids.has(te.taskId) ? everTask.get(te.taskId) : undefined;
      if (!orig || orig.date !== date) continue;
      const done = { doneAt: te.at, spentMin: te.spentMin, eventId: te.id };
      const prev = carried.get(orig.id);
      if (prev !== undefined) { tasks[prev] = { ...tasks[prev], ...done }; continue; }
      const i = tasks.findIndex((t) => t.doneAt === undefined && t.kind === orig.kind && t.caseId === orig.caseId && t.teil === orig.teil);
      if (i >= 0) { tasks[i] = { ...tasks[i], ...done }; carried.set(orig.id, i); continue; }
      carried.set(orig.id, tasks.push({ ...orig, ...done }) - 1);
    }
    out.push({
      date,
      materializedAt: new Date(base.occurred_at).getTime(),
      mode: bp.mode,
      seed: bp.seed,
      targetMin: bp.targetMin ?? 0,
      tasks,
      ...(rep ? { replannedAt: new Date(rep.occurred_at).getTime() } : {}),
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

const taskList = (payload: unknown): TaskInstance[] => {
  const tasks = (payload as { tasks?: unknown })?.tasks;
  return Array.isArray(tasks) ? tasks.filter((t): t is TaskInstance => !!t && typeof (t as TaskInstance).id === 'string') : [];
};

// ---------------------------------------------------------------------------
// 3. La progression par Teil (contrat §4) — le calcul est dans `progression.ts`
// ---------------------------------------------------------------------------

/**
 * **Un point faible se décide sur la performance, jamais sur l'absence.**
 * `vierge` n'est JAMAIS un point faible : c'est « pas encore travaillé ».
 */
export const pointFaible = (cp: CaseProgress | undefined, teil: SimTeil): boolean =>
  cp?.teile[teil].status === 'fragile';

/** La DETTE ordonne le travail à venir ; la FAIBLESSE nomme un défaut. Elles
 *  ne se confondent pas : la dette compte les Teile `vierge`, jamais la
 *  faiblesse. ∈ {0, 1/3, 2/3, 1}. */
export const detteTeil = (cp: CaseProgress | undefined): number =>
  !cp ? 1 : TEIL_KEYS.filter((t) => cp.teile[t].status !== 'solide').length / 3;

// ---------------------------------------------------------------------------
// 4. Agrégats de journal (historique, temps investi, assiduité)
// ---------------------------------------------------------------------------

/** Minutes MESURÉES par jour. Un exercice sans mesure de durée vaut 0 : on ne
 *  lui attribue pas son `estMin` (contrat §1.2.5). */
export function spentByDay(trainingEvents: TrainingEvent[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const te of trainingEvents) { const k = dayKey(te.at); m.set(k, (m.get(k) ?? 0) + Math.max(0, te.spentMin)); }
  return m;
}

/** Les jours où le candidat a TRAVAILLÉ — présence d'un événement, quel qu'il
 *  soit. Une journée 100 % drill est une journée travaillée (INV-6) : c'est
 *  exactement ce que l'ancien `adherencePct`, dérivé des seules simulations,
 *  punissait (`program.ts:320-327`). */
export const workedDayKeys = (trainingEvents: TrainingEvent[]): Set<string> =>
  new Set(trainingEvents.map((te) => dayKey(te.at)));

// ---------------------------------------------------------------------------
// 5. Écriture
// ---------------------------------------------------------------------------

export interface LogInput {
  kind: TrainingKind;
  caseId?: CaseId;
  teile?: SimTeil[];
  spentMin?: number;
  selbstbewertet?: boolean;
  profileId?: string;
  laufId?: string;
  /** Tâche explicitement visée (l'utilisateur a coché CETTE tâche). Absent :
   *  la satisfaction est cherchée par le contenu (§3.4). */
  taskId?: string;
  at?: number;
}

const TASK_TO_TRAINING: Record<TaskKind, TrainingKind> = {
  simulation: 'simulation',
  drill: 'drill',
  fachwissen: 'fiche',
  aufklaerung: 'aufklaerung',
  revision: 'simulation',
  'examen-blanc': 'examen-blanc',
};

/**
 * La tâche du jour que cet exercice satisfait, ou `undefined` (contrat §3.4,
 * étendu par D-C4 à tous les genres). La machine s'adapte à l'humain : un
 * exercice libre qui fait ce qui était prévu coche la tâche tout seul — une
 * fiche lue coche la tâche Fachwissen du même cas, une séance de drill la tâche
 * drill. Aucune tâche n'est CRÉÉE pour absorber un exercice libre.
 * `absorbable` : événements « coche nue » qu'un exercice réel peut remplacer.
 */
export function satisfiedTask(
  plan: DayPlan | undefined,
  e: Pick<TrainingEvent, 'kind' | 'caseId' | 'teile'>,
  absorbable: ReadonlySet<string> = new Set(),
  teileDuJour: readonly SimTeil[] = e.teile,
): TaskInstance | undefined {
  if (!plan) return undefined;
  const open = (t: TaskInstance) => t.doneAt === undefined || (!!t.eventId && absorbable.has(t.eventId));
  return plan.tasks.find((t) => open(t)
    && (TASK_TO_TRAINING[t.kind] === e.kind || (t.kind === 'simulation' && e.kind === 'examen-blanc'))
    && (t.caseId === undefined ? t.kind === 'drill' : t.caseId === e.caseId)
    && (t.teil === undefined ? completeAssez(t, teileDuJour) : e.teile.includes(t.teil)));
}

const FULL_RUN_KINDS = new Set<TaskKind>(['simulation', 'revision', 'examen-blanc']);

/** D-C4 révisé — le mode prime : une tâche « cas complet » (sans `teil`) ne se
 *  coche que si les TROIS Teile ont été joués, dans la partie ou le même jour. */
const completeAssez = (t: TaskInstance, teileDuJour: readonly SimTeil[]): boolean =>
  !FULL_RUN_KINDS.has(t.kind) || TEIL_KEYS.every((k) => teileDuJour.includes(k));

/** Teile joués ce jour-là sur ce cas, cet exercice compris (coches exclues). */
async function teileJouesLeJour(at: number, caseId: CaseId | undefined, teile: readonly SimTeil[]): Promise<SimTeil[]> {
  if (!caseId) return [...teile];
  const day = dayKey(at);
  const prior = (await db.training_events.where('caseId').equals(caseId).toArray())
    .filter((te) => dayKey(te.at) === day && !isCocheNue(te));
  return TEIL_KEYS.filter((k) => teile.includes(k) || prior.some((te) => te.teile.includes(k)));
}

/** Résolution à l'écriture (D-C4) : la tâche du plan du jour de `at`. */
async function resolveTask(at: number, e: Pick<TrainingEvent, 'kind' | 'caseId' | 'teile'>): Promise<string | undefined> {
  const plan = await db.day_plans.get(dayKey(at));
  if (!plan) return undefined;
  const ids = plan.tasks.map((t) => t.eventId).filter((x): x is string => !!x);
  const bare = new Set((await db.training_events.bulkGet(ids)).filter((te): te is TrainingEvent => !!te && isCocheNue(te)).map((te) => te.id));
  return satisfiedTask(plan, e, bare, await teileJouesLeJour(at, e.caseId, e.teile))?.id;
}

/**
 * Écrit UN événement dans le journal et l'envoie à la synchro. C'est le seul
 * point d'écriture du journal hors `simulation.completed` (qui se dérive).
 * Ne bloque jamais sur le réseau : `syncQueue.push` écrit localement d'abord.
 * `scores` n'est pas écrit : seul `simulation.completed` porte un score mesuré (S-I1).
 */
export async function logTraining(input: LogInput): Promise<TrainingEvent> {
  const at = input.at ?? now();
  const teile = input.teile ?? [];
  const taskId = input.taskId ?? await resolveTask(at, { kind: input.kind, caseId: input.caseId, teile });
  const event: TrainingEvent = {
    id: newId(),
    at,
    kind: input.kind,
    ...(input.caseId ? { caseId: input.caseId } : {}),
    teile,
    source: taskId ? 'plan' : 'libre',
    ...(taskId ? { taskId } : {}),
    spentMin: Math.min(1440, Math.max(0, Math.round(input.spentMin ?? 0))),
    ...(input.laufId ? { laufId: input.laufId } : {}),
    ...(input.selbstbewertet ? { selbstbewertet: true } : {}),
    ...(input.profileId ? { profileId: input.profileId } : {}),
  };
  const { id, ...payload } = event;
  // L'événement D'ABORD (écriture locale, jamais bloquée par le réseau), la
  // projection ensuite : le journal se reconstruit à chaque démarrage (B-C1),
  // une projection qui devancerait `progress_events` serait effacée.
  // Import PARESSEUX : `sync/projections` importe ce module pour reconstruire
  // le journal, et `sync/queue` importe les projections. Un import statique
  // fermerait le cycle et laisserait `syncQueue` indéfini au chargement.
  await import('@/lib/sync/queue')
    .then(({ syncQueue }) => syncQueue.push({ type: 'training.logged', subject_id: id, payload }))
    .catch((e) => console.warn('[sync]', e));
  await db.training_events.put(event);
  await applyEventToLocalState(event);
  return event;
}

const marking = new Map<string, Promise<TrainingEvent>>();

/**
 * Cocher une tâche — y compris Fachwissen, examen à blanc et reprise de partie
 * faible, qui n'avaient aucune action « fait » (`ProgramPage.tsx:375-380`).
 * Cocher écrit un événement ; **rien d'autre ne bouge** (INV-1).
 * IDEMPOTENT (I12) : une tâche déjà faite, ou en train d'être cochée (double
 * clic), rend l'événement existant au lieu d'en écrire un second.
 */
export function markTaskDone(task: TaskInstance, spentMin = 0): Promise<TrainingEvent> {
  const pending = marking.get(task.id);
  if (pending) return pending;
  const run = (async () => {
    const cur = (await db.day_plans.get(task.date))?.tasks.find((t) => t.id === task.id);
    const prior = cur?.eventId ? await db.training_events.get(cur.eventId) : undefined;
    if (prior) return prior;
    return logTraining({
      kind: TASK_TO_TRAINING[task.kind],
      caseId: task.caseId,
      // I-4 : une tâche « cas complet » (sans teil) déclare les trois Teile.
      teile: task.teil ? [task.teil] : FULL_RUN_KINDS.has(task.kind) ? [...TEIL_KEYS] : [],
      spentMin,
      taskId: task.id,
    });
  })().finally(() => marking.delete(task.id));
  marking.set(task.id, run);
  return run;
}

/**
 * D-C4 — la simulation qu'on s'apprête à enregistrer, avec la tâche qu'elle
 * satisfait. À appeler AVANT d'écrire `simulation.completed` : le `taskId` est
 * PERSISTÉ dans la charge utile, donc rejoué à l'identique au rebuild. Un
 * `taskId` explicite (lancé depuis le plan, R-C4) n'est jamais remplacé.
 */
export async function resolveSimulationTask(input: Simulation): Promise<Simulation> {
  let sim = input;
  const te = trainingEventFromSimulation(sim);
  if (sim.taskId) {
    // Explicite (R-C4) : gardé SEULEMENT si cette partie satisfait la tâche —
    // même cas, Teil compatible, et le mode prime (D-C4). Sinon il tombe et la
    // résolution par le contenu prend le relais (I-A : une Dokumentation lancée
    // depuis une tâche Anamnese ne la coche pas).
    const plan = await db.day_plans.filter((p) => p.tasks.some((t) => t.id === sim.taskId)).first();
    const task = plan?.tasks.find((t) => t.id === sim.taskId);
    if (plan && task && satisfiedTask({ ...plan, tasks: [{ ...task, doneAt: undefined }] }, te, new Set(),
      await teileJouesLeJour(te.at, te.caseId, te.teile))) return sim;
    const { taskId: _drop, ...rest } = sim;
    sim = rest;
  }
  const taskId = await resolveTask(te.at, te);
  return taskId ? { ...sim, taskId } : sim;
}

/**
 * Alimente le journal LOCAL depuis une simulation qui vient d'être enregistrée.
 *
 * `saveSimulation()` écrit `simulation.completed` dans `progress_events`, mais
 * rien n'alimentait `training_events` ni `case_progress` hors reconstruction.
 * La dérivation reste STRICTEMENT celle de `trainingEventFromSimulation()` —
 * même id déterministe, même `taskId` (celui porté par la simulation, posé par
 * `resolveSimulationTask`). Reconstruire ensuite depuis `progress_events` redonne
 * exactement le même état (INV-10).
 */
export async function applySimulationToJournal(sim: Simulation): Promise<TrainingEvent> {
  const te = trainingEventFromSimulation(sim);
  await db.training_events.put(te);
  await applyEventToLocalState(te);
  return te;
}

/** Met à jour les projections locales touchées par UN événement — sans relire
 *  tout le journal. La reconstruction complète reste `rebuildJournal()`. La coche
 *  va au plan qui PORTE la tâche, pas au jour de `event.at` (I12 : cocher après
 *  minuit une tâche de la veille). */
async function applyEventToLocalState(event: TrainingEvent): Promise<void> {
  if (event.taskId) {
    const id = event.taskId;
    const sameDay = await db.day_plans.get(dayKey(event.at));
    const plan = sameDay?.tasks.some((t) => t.id === id) ? sameDay : await db.day_plans.filter((p) => p.tasks.some((t) => t.id === id)).first();
    if (plan) {
      const prev = plan.tasks.find((t) => t.id === id)?.eventId;
      if (prev && prev !== event.id && !isCocheNue(event)) {
        const old = await db.training_events.get(prev);
        if (old && isCocheNue(old)) await db.training_events.delete(prev);   // absorbée (D-C4), comme au rebuild
      }
      const tasks = plan.tasks.map((t) => (t.id === id ? { ...t, doneAt: event.at, spentMin: event.spentMin, eventId: event.id } : t));
      await db.day_plans.put({ ...plan, tasks });
    }
  }
  if (!event.caseId) return;
  const all = await db.training_events.where('caseId').equals(event.caseId).toArray();
  const [cp] = computeCaseProgress(all);
  if (cp) await db.case_progress.put(cp);
}

/** Reconstruit `training_events` + `case_progress` + `day_plans` depuis le
 *  journal. Idempotente : deux passages donnent le même état (INV-10). */
export async function rebuildJournal(events?: ProgressEvent[]): Promise<void> {
  // I-2 : le journal est relu DANS la transaction, qui verrouille aussi
  // `progress_events` — une écriture concurrente (logTraining, ensureDayPlan)
  // passe avant ou après la reconstruction, jamais entre sa lecture et son
  // `clear`. `events` n'est passé que par les tests (journal synthétique).
  await db.transaction('rw', [db.progress_events, db.training_events, db.day_plans, db.case_progress], async () => {
    const source = events ?? await db.progress_events.toArray();
    const te = projectTrainingEvents(source);
    const plans = projectDayPlans(source, te);
    const progress = computeCaseProgress(te);
    await db.training_events.clear();
    await db.training_events.bulkPut(te);
    await db.day_plans.clear();
    await db.day_plans.bulkPut(plans);
    await db.case_progress.clear();
    await db.case_progress.bulkPut(progress);
  });
}
