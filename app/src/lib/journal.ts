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
import { TEILE, isFullSimulation } from '@/lib/simScope';
import { now, dayKey } from '@/lib/clock';
import type {
  CaseId, CaseProgress, DayPlan, SimTeil, Simulation, TaskInstance, TaskKind,
  TeilProgress, TeilStatus, TrainingEvent, TrainingKind,
} from '@/db/types';

/** Seuils déjà portés par le dépôt : `simulationPassed()` (60) et l'ancien
 *  `status === 'Maîtrisé'` (80). Aucun seuil neuf n'est introduit. */
export const PART_OK = 60;
export const PART_SOLIDE = 80;

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

// ---------------------------------------------------------------------------
// 1. Dérivation d'un TrainingEvent depuis une Simulation (contrat §2.3)
// ---------------------------------------------------------------------------

/** Un run joué en conditions d'examen : complet, autonome, dernière couche.
 *  C'est la définition du mode `examen-blanc` (contrat §6) lue à l'envers. */
const isExamenBlanc = (sim: Simulation): boolean =>
  isFullSimulation(sim) && sim.assistance === 'autonome' && sim.layer === 3;

/**
 * `simulation.completed` n'est PAS doublé par un `training.logged` : un fait,
 * un événement. Le `TrainingEvent` s'en dérive avec un id déterministe, donc
 * la dérivation est idempotente quel que soit le nombre de reconstructions.
 */
export function trainingEventFromSimulation(sim: Simulation): TrainingEvent {
  const teile = TEIL_KEYS.filter((t) => sim.parts[t]?.done === true);
  const scores: Partial<Record<SimTeil, number>> = {};
  for (const t of teile) scores[t] = partScore(sim.parts[t]!);
  const secs = Object.values(sim.parts).reduce((s, p) => s + (p?.durationSec ?? 0), 0);
  return {
    id: `te-${sim.id}`,
    at: sim.date,
    kind: isExamenBlanc(sim) ? 'examen-blanc' : 'simulation',
    caseId: sim.caseId,
    teile,
    source: sim.taskId ? 'plan' : 'libre',
    ...(sim.taskId ? { taskId: sim.taskId } : {}),
    spentMin: Math.round(secs / 60),
    laufId: sim.id,
    scores,
    selbstbewertet: sim.mode === 'external-ai',
    ...(sim.profileId ? { profileId: sim.profileId } : {}),
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
// 3. La progression par Teil (contrat §4)
// ---------------------------------------------------------------------------

const statusOf = (lastScore: number | null): TeilStatus =>
  lastScore === null ? 'vierge' : lastScore < PART_OK ? 'fragile' : lastScore < PART_SOLIDE ? 'acquis' : 'solide';

const emptyTeil = (): TeilProgress => ({ status: 'vierge', lastScore: null, lastAt: null, attempts: 0 });

/**
 * Un cas n'a plus de pourcentage : il a un état par Teil. Le `sum / 3`
 * systématique de `simScope.ts:42` — qui faisait régresser un cas après une
 * Anamnese réussie à 90 % — n'a plus de raison d'exister.
 *
 * Les événements `selbstbewertet` sont EXCLUS (INV-11) : sans quoi un Teil
 * passerait de `vierge` à `fragile` sans qu'aucune performance ait été mesurée.
 */
export function computeCaseProgress(trainingEvents: TrainingEvent[]): CaseProgress[] {
  const byCase = new Map<CaseId, CaseProgress>();
  for (const te of [...trainingEvents].sort((a, b) => a.at - b.at)) {
    if (!te.caseId || te.selbstbewertet === true) continue;
    let cp = byCase.get(te.caseId);
    if (!cp) {
      cp = { caseId: te.caseId, teile: { anamnese: emptyTeil(), dokumentation: emptyTeil(), fallvorstellung: emptyTeil() }, overall: 'vierge' };
      byCase.set(te.caseId, cp);
    }
    for (const t of te.teile) {
      if (!TEIL_KEYS.includes(t)) continue;                 // S-M1 : jamais `__proto__` ni une clé inconnue
      const s = te.scores?.[t];
      if (s == null) continue;                              // M4 : sans score, pas une mesure — vierge ⇔ attempts 0
      const p = cp.teile[t];
      p.attempts += 1;
      p.lastScore = s; p.lastAt = te.at;
      p.status = statusOf(p.lastScore);
    }
  }
  for (const cp of byCase.values()) cp.overall = overallOf(cp);
  return [...byCase.values()];
}

function overallOf(cp: CaseProgress): CaseProgress['overall'] {
  const all = TEIL_KEYS.map((t) => cp.teile[t].status);
  if (all.every((s) => s === 'vierge')) return 'vierge';
  if (all.every((s) => s === 'solide')) return 'solide';
  return 'entame';
}

/** L'état d'un cas jamais rencontré : trois Teile vierges. Jamais `undefined`,
 *  pour qu'aucun appelant n'ait à traiter l'absence comme un défaut. */
export const blankProgress = (caseId: CaseId): CaseProgress => ({
  caseId, teile: { anamnese: emptyTeil(), dokumentation: emptyTeil(), fallvorstellung: emptyTeil() }, overall: 'vierge',
});

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
): TaskInstance | undefined {
  if (!plan) return undefined;
  const open = (t: TaskInstance) => t.doneAt === undefined || (!!t.eventId && absorbable.has(t.eventId));
  return plan.tasks.find((t) => open(t)
    && (TASK_TO_TRAINING[t.kind] === e.kind || (t.kind === 'simulation' && e.kind === 'examen-blanc'))
    && (t.caseId === undefined ? t.kind === 'drill' : t.caseId === e.caseId)
    && (t.teil === undefined || e.teile.includes(t.teil)));
}

/** Résolution à l'écriture (D-C4) : la tâche du plan du jour de `at`. */
async function resolveTask(at: number, e: Pick<TrainingEvent, 'kind' | 'caseId' | 'teile'>): Promise<string | undefined> {
  const plan = await db.day_plans.get(dayKey(at));
  if (!plan) return undefined;
  const ids = plan.tasks.map((t) => t.eventId).filter((x): x is string => !!x);
  const bare = new Set((await db.training_events.bulkGet(ids)).filter((te): te is TrainingEvent => !!te && isCocheNue(te)).map((te) => te.id));
  return satisfiedTask(plan, e, bare)?.id;
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
      teile: task.teil ? [task.teil] : [],
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
export async function resolveSimulationTask(sim: Simulation): Promise<Simulation> {
  if (sim.taskId) return sim;
  const te = trainingEventFromSimulation(sim);
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
    const plan = (await db.day_plans.get(dayKey(event.at)))?.tasks.some((t) => t.id === id)
      ? await db.day_plans.get(dayKey(event.at))
      : await db.day_plans.filter((p) => p.tasks.some((t) => t.id === id)).first();
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
