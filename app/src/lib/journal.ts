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
import { now, dayKey, DAY_MS } from '@/lib/clock';
import { LEGACY_ID_PATTERN } from '@/lib/checklists.legacy';
import { conditionsManquantes, estEnchaine, estSerie4, isExamenBlanc } from '@/lib/examen';
import { computeCaseProgress, teilAConfirmer } from '@/lib/progression';
import { POIDS_CONSOLIDATION } from '@/lib/program/parametres';
import { deriverPlan, estTacheDeCas, evaluerTache, isCocheNue } from '@/lib/program/completion';
import { debutJour, finJour, fuseauValide } from '@/lib/program/fuseau';
import { lireTache, restePlan, teileDeTache } from '@/lib/program/tacheDeCas';
import type {
  CaseId, CaseProgress, ChecklistItemId, DayPlan, SimTeil, Simulation, TaskInstance, TaskKind,
  TrainingEvent, TrainingKind,
} from '@/db/types';

// La mesure vit dans `progression.ts` (pure) ; ce module la ré-exporte pour ses appelants historiques.
export { PART_OK, PART_SOLIDE, blankProgress, computeCaseProgress, estNonMesure, statusOf } from '@/lib/progression';
export { isExamenBlanc } from '@/lib/examen';
export { isCocheNue };

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

// ---------------------------------------------------------------------------
// 1. Dérivation d'un TrainingEvent depuis une Simulation (contrat §2.3)
// ---------------------------------------------------------------------------

/**
 * `simulation.completed` n'est PAS doublé par un `training.logged` : un fait,
 * un événement. Le `TrainingEvent` s'en dérive avec un id déterministe, donc
 * la dérivation est idempotente quel que soit le nombre de reconstructions.
 */
export function trainingEventFromSimulation(sim: Simulation, enregistreA?: number): TrainingEvent {
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
    // M5 : l'instant d'enregistrement (`occurred_at`), seulement s'il suit le début — sinon il ne dit rien de plus.
    ...(typeof enregistreA === 'number' && Number.isFinite(enregistreA) && enregistreA > sim.date ? { enregistreA } : {}),
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
      const te = trainingEventFromSimulation(sim, Date.parse(e.occurred_at));
      byId.set(te.id, te);
    } else if (e.type === 'training.logged' && e.subject_id) {
      const te = sanitizeLogged(e.subject_id, e.payload);
      if (te) byId.set(te.id, te);
    }
  }
  // D-C4 (absorption d'une coche nue par les parties qui font la même tâche) : voir `projeterJournal` — elle suppose
  // les plans, donc ne peut pas se faire ici.
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

/**
 * Les plans figés. **Seule exception au dernier-gagne du `sync-protocol.md`** :
 * sur `plan.materialized`, le PLUS ANCIEN `occurred_at` gagne (INV-7) — « figé »
 * veut dire que le premier appareil qui ouvre la journée la fige. `plan.replanned`
 * reste au dernier-gagne et bat toujours une matérialisation.
 *
 * *[S4]* L'état « faite » n'est JAMAIS lu dans la charge utile : il se DÉRIVE du journal
 * (`deriverPlan`, §12.3), au fuseau du plan (`DayPlan.tz`), pour toutes les tâches. Deux appareils
 * qui ont le même journal projettent les mêmes `doneAt`, dans n'importe quel ordre d'arrivée
 * et n'importe quel fuseau (INV-51). Toute tâche venue de la synchro passe par `lireTache` (m4).
 */
export function projectDayPlans(events: ProgressEvent[], trainingEvents: TrainingEvent[]): DayPlan[] {
  return projeterPlans(events, trainingEvents).plans;
}

function projeterPlans(events: ProgressEvent[], trainingEvents: TrainingEvent[]): { plans: DayPlan[]; absorbes: string[] } {
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
  // Toutes les tâches jamais figées pour un jour, tous appareils confondus (celles d'un plan qui a perdu comprises).
  const everTask = new Map<string, TaskInstance>();
  for (const e of events) {
    if ((e.type === 'plan.materialized' || e.type === 'plan.replanned') && e.subject_id) {
      const tz = leTz(e.payload);
      for (const t of taskList(e.payload, { date: e.subject_id, tz })) everTask.set(t.id, t);
    }
  }

  const plans: DayPlan[] = [];
  const absorbes = new Set<string>();
  for (const [date, base] of materialized) {
    const bp = base.payload as Omit<DayPlan, 'date' | 'materializedAt'>;
    const tz = leTz(bp);
    const rep = replanned.get(date);
    const tasks = taskList(rep ? rep.payload : bp, { date, tz });
    const journal = reporterLesCochesDesPlansPerdants(tasks, date, tz, trainingEvents, everTask);
    const derive = deriverPlan({ date, tz, tasks }, journal);
    derive.absorbes.forEach((id) => absorbes.add(id));
    plans.push({
      date,
      materializedAt: new Date(base.occurred_at).getTime(),
      mode: bp.mode,
      seed: bp.seed,
      targetMin: bp.targetMin ?? 0,
      tasks: derive.tasks,
      ...(tz ? { tz } : {}),                                // même ordre de clés que l'écriture locale : état bit-identique (INV-9, INV-10)
      ...(rep ? { replannedAt: new Date(rep.occurred_at).getTime() } : {}),
    });
  }
  return { plans: plans.sort((a, b) => (a.date < b.date ? -1 : 1)), absorbes: [...absorbes] };
}

/** Le fuseau d'un plan venu de la synchro — jamais cru sur parole. */
const leTz = (payload: unknown): string | undefined => {
  const tz = (payload as { tz?: unknown } | null)?.tz;
  return fuseauValide(tz) ? tz : undefined;
};

const cleDeTache = (t: TaskInstance) => `${t.kind}|${t.caseId ?? ''}|${teileDeTache(t).join(',')}`;

/**
 * D-I2 : une coche manuelle faite dans le plan d'un AUTRE appareil (qui a perdu) vaut pour la tâche équivalente du plan
 * gagnant — même (kind, caseId, teileDeTache). I-3 (décision de main) : sans équivalent, la tâche FAITE est AJOUTÉE au plan
 * gagnant, comme `replanifier` conserve les faites — jamais perdue. Seules les coches voyagent par taskId : les parties
 * se retrouvent par leur contenu (§12.3).
 */
function reporterLesCochesDesPlansPerdants(
  tasks: TaskInstance[], date: string, tz: string | undefined, trainingEvents: TrainingEvent[], everTask: Map<string, TaskInstance>,
): TrainingEvent[] {
  const ids = new Set(tasks.map((t) => t.id));
  const orphelines = trainingEvents.filter((te) => isCocheNue(te) && !ids.has(te.taskId!) && everTask.get(te.taskId!)?.date === date);
  if (!orphelines.length) return trainingEvents;
  const reprises = new Map<string, string>();                    // taskId perdant → taskId du plan gagnant
  const reperees = new Set<string>();
  for (const te of orphelines) {
    const orig = everTask.get(te.taskId!)!;
    if (reprises.has(orig.id)) continue;
    const eq = tasks.find((t) => !reperees.has(t.id) && cleDeTache(t) === cleDeTache(orig) && evaluerTache(t, trainingEvents, tz).statut !== 'faite');
    if (eq) { reprises.set(orig.id, eq.id); reperees.add(eq.id); continue; }
    tasks.push({ ...orig });
    reprises.set(orig.id, orig.id);
  }
  return trainingEvents.map((te) => (isCocheNue(te) && reprises.has(te.taskId!) ? { ...te, taskId: reprises.get(te.taskId!)! } : te));
}

/** Les tâches d'un payload de plan, filtrées (m4) : un champ invalide est retiré, la tâche jamais. */
const taskList = (payload: unknown, plan: { date: string; tz?: string }): TaskInstance[] => {
  const tasks = (payload as { tasks?: unknown })?.tasks;
  return Array.isArray(tasks) ? tasks.map((t) => lireTache(t, plan)).filter((t): t is TaskInstance => t !== null) : [];
};

/**
 * La projection COMPLÈTE du journal : événements, plans (« faite » dérivée), progression par Teil. Un seul chemin pour la
 * reconstruction et pour les tests. Les coches nues redevenues redondantes (la tâche est aussi faite par des parties) sont
 * ABSORBÉES dans l'historique (D-C4) : un exercice, un événement.
 */
export function projeterJournal(events: ProgressEvent[]): { te: TrainingEvent[]; plans: DayPlan[]; progress: CaseProgress[] } {
  const brut = projectTrainingEvents(events);
  const { plans, absorbes } = projeterPlans(events, brut);
  const retires = new Set(absorbes);
  const te = retires.size ? brut.filter((e) => !retires.has(e.id)) : brut;
  return { te, plans, progress: computeCaseProgress(te) };
}

// ---------------------------------------------------------------------------
// 3. La progression par Teil (contrat §4) — le calcul est dans `progression.ts`
// ---------------------------------------------------------------------------

/**
 * **Un point faible se décide sur la performance, jamais sur l'absence.**
 * `vierge` n'est JAMAIS un point faible : c'est « pas encore travaillé ».
 */
export const pointFaible = (cp: CaseProgress | undefined, teil: SimTeil): boolean =>
  cp?.teile[teil].status === 'fragile';

/** La DETTE ordonne le travail à venir ; la FAIBLESSE nomme un défaut. Elles ne se confondent pas : la dette compte les
 *  Teile `vierge`, la faiblesse jamais.
 *
 *  *[S4-2]* `detteTeil(c, D) = Σ poids(t, D) / 3` sur `restePlan(c, D)` (§12.2, INV-67) — la MÊME fonction « reste » que les
 *  `teile` d'une tâche. Un Teil solide n'y est pas ; un Teil non solide joué il y a moins de `SOLIDE_ECART_JOURS` jours
 *  non plus (réserve R2 : le rejouer ne le rendrait pas solide) ; un Teil « à confirmer » à D (acquis, déjà réussi à 80 ou
 *  plus, écart passé — revue P1) pèse `POIDS_CONSOLIDATION` ; tout autre Teil pèse 1. ∈ [0, 1].
 *  `jour` (yyyy-MM-dd) : le JOUR DU PLAN, passé explicitement par le plan (I1, INV-55) ; l'horloge ne sert qu'aux
 *  appelants de transition. `tz` : le fuseau du plan. */
export const detteTeil = (cp: CaseProgress | undefined, jour: string = dayKey(now()), tz?: string): number =>
  !cp ? 1 : restePlan(cp, jour, tz).reduce((s, t) => s + (teilAConfirmer(cp.teile[t], jour) ? POIDS_CONSOLIDATION : 1), 0) / 3;

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
   *  la tâche que l'exercice fait avancer est cherchée par le contenu (§12.3). */
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

/** Le plan qui porte l'instant `at` : celui dont le jour, AU FUSEAU DU PLAN, le contient. */
async function planDe(at: number): Promise<DayPlan | undefined> {
  const d = new Date(at);
  const voisins = [-1, 0, 1].map((n) => { const x = new Date(d); x.setDate(x.getDate() + n); return dayKey(x); });
  const plans = (await db.day_plans.bulkGet(voisins)).filter((p): p is DayPlan => !!p);
  return plans.find((p) => at >= debutJour(p.date, p.tz) && at < finJour(p.date, p.tz));
}

/** Les événements du journal qui comptent pour les tâches d'un plan : ceux de son jour — et les coches qui les visent,
 *  qui sont forcément postérieures au début de ce jour (une tâche n'existe pas avant son plan). */
const evenementsDuPlan = (plan: DayPlan): Promise<TrainingEvent[]> =>
  // M5 : une partie commencée la veille (24 h au plus : `LAUF_MAX_ALTER_MS`) peut être enregistrée dans ce jour.
  db.training_events.where('at').aboveOrEqual(debutJour(plan.date, plan.tz) - DAY_MS).toArray();

type Exercice = Pick<TrainingEvent, 'kind' | 'caseId' | 'teile' | 'at' | 'enregistreA'> & { enchaine?: true };

/** Cet exercice fait-il AVANCER cette tâche (non faite par des parties) ? Le genre ne compte pas pour un cas (I3) ;
 *  il compte hors cas (N1). Une coche nue ne compte pas : une tâche seulement cochée à la main est encore « ouverte »
 *  pour l'exercice qui la fait pour de bon — c'est lui qui porte le `taskId` (l'historique dit « dans le plan »), et la
 *  coche est absorbée (D-C4). */
function fait_avancer(t: TaskInstance, e: Exercice, evenements: readonly TrainingEvent[], tz?: string): boolean {
  const reels = evenements.filter((x) => !isCocheNue(x));
  const etat = evaluerTache(t, reels, tz);
  if (etat.statut === 'faite') return false;
  if (t.creeA !== undefined && (e.enregistreA ?? e.at) < t.creeA) return false;   // M5 : enregistrée après la tâche
  if (!estTacheDeCas(t.kind)) return TASK_TO_TRAINING[t.kind] === e.kind && (t.caseId === undefined || t.caseId === e.caseId);
  if (!(e.kind === 'simulation' || e.kind === 'examen-blanc') || e.caseId !== t.caseId) return false;
  if (t.dUnTrait) return e.enchaine === true;
  return etat.reste.some((k) => e.teile.includes(k));
}

/**
 * La tâche du plan que cet exercice FAIT AVANCER, ou `undefined` — informatif : `source` et `taskId` disent « dans le
 * plan / libre » dans l'historique, ils ne décident plus de `doneAt` (§12.3, I4). Aucune tâche n'est CRÉÉE pour absorber
 * un exercice libre : la machine s'adapte à l'humain.
 */
export function tacheQueFaitAvancer(plan: DayPlan | undefined, e: Exercice, evenements: readonly TrainingEvent[]): TaskInstance | undefined {
  return plan?.tasks.find((t) => fait_avancer(t, e, evenements, plan.tz));
}

/** Résolution à l'écriture, INFORMATIVE : la tâche du plan du jour de `at`. */
async function resolveTask(e: Pick<TrainingEvent, 'kind' | 'caseId' | 'teile' | 'at'> & { enchaine?: true }): Promise<string | undefined> {
  const plan = await planDe(e.at);
  return plan ? tacheQueFaitAvancer(plan, e, await evenementsDuPlan(plan))?.id : undefined;
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
  const taskId = input.taskId ?? await resolveTask({ at, kind: input.kind, caseId: input.caseId, teile });
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
 *
 * *[S4]* La coche est une DÉCLARATION (coche nue, 0 minute par défaut, aucun score) : elle déclare ce que la tâche
 * demandait (`teileDeTache`, non mesuré) et porte le `taskId` — c'est elle que `cocheManuelle` retrouve (§12.3).
 */
export function markTaskDone(task: TaskInstance, spentMin = 0): Promise<TrainingEvent> {
  const pending = marking.get(task.id);
  if (pending) return pending;
  const run = (async () => {
    const cur = (await db.day_plans.get(task.date))?.tasks.find((t) => t.id === task.id);
    const prior = cur?.doneAt !== undefined && cur.eventId ? await db.training_events.get(cur.eventId) : undefined;
    if (prior) return prior;
    return logTraining({
      kind: TASK_TO_TRAINING[task.kind],
      caseId: task.caseId,
      teile: estTacheDeCas(task.kind) ? teileDeTache(task) : [],
      spentMin,
      taskId: task.id,
    });
  })().finally(() => marking.delete(task.id));
  marking.set(task.id, run);
  return run;
}

/**
 * La simulation qu'on s'apprête à enregistrer, avec la tâche qu'elle fait avancer. À appeler AVANT d'écrire
 * `simulation.completed` : le `taskId` est PERSISTÉ dans la charge utile, donc rejoué à l'identique au rebuild.
 * Un `taskId` explicite (partie lancée depuis une tâche du plan, R-C4) n'est gardé que si CETTE partie fait avancer CETTE
 * tâche (I-A : une Dokumentation lancée depuis une tâche Anamnese ne s'y rattache pas) ; sinon il tombe et la résolution par
 * le contenu prend le relais. Informatif : il ne décide plus de `doneAt`.
 */
export async function resolveSimulationTask(input: Simulation): Promise<Simulation> {
  let sim = input;
  const te = trainingEventFromSimulation(sim);
  if (sim.taskId) {
    const plan = await db.day_plans.filter((p) => p.tasks.some((t) => t.id === sim.taskId)).first();
    const task = plan?.tasks.find((t) => t.id === sim.taskId);
    if (plan && task && fait_avancer(task, te, await evenementsDuPlan(plan), plan.tz)) return sim;
    const { taskId: _drop, ...rest } = sim;
    sim = rest;
  }
  const taskId = await resolveTask(te);
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
  // M5 : l'instant d'enregistrement est l'`occurred_at` de SON événement `simulation.completed` — celui même que relira
  // la reconstruction (INV-10). Pas d'événement local (envoi échoué) : pas d'instant, la reconstruction non plus.
  const ev = (await db.progress_events.where('subject_id').equals(sim.id).toArray()).find((e) => e.type === 'simulation.completed');
  const te = trainingEventFromSimulation(sim, ev ? Date.parse(ev.occurred_at) : undefined);
  await db.training_events.put(te);
  await applyEventToLocalState(te);
  return te;
}

/**
 * Met à jour les projections locales touchées par UN événement — sans relire tout le journal. Le même chemin que la
 * reconstruction : on RE-DÉRIVE les plans concernés (`deriverPlan`) au lieu de poser `doneAt` à la main (§12.3, INV-10).
 * Les plans concernés : ceux dont le jour contient l'événement (au fuseau de chaque plan), et celui qui porte la tâche
 * qu'il vise (cocher après minuit une tâche de la veille, I12). La reconstruction complète reste `rebuildJournal()`.
 */
async function applyEventToLocalState(event: TrainingEvent): Promise<void> {
  const d = new Date(event.at);
  const dates = new Set([-1, 0, 1].map((n) => { const x = new Date(d); x.setDate(x.getDate() + n); return dayKey(x); }));
  const enr = event.enregistreA ?? event.at;                      // M5 : le jour de l'enregistrement est concerné aussi
  const dans = (x: number, p: DayPlan) => x >= debutJour(p.date, p.tz) && x < finJour(p.date, p.tz);
  const concernes = (await db.day_plans.bulkGet([...dates])).filter((p): p is DayPlan => !!p
    && (dans(event.at, p) || dans(enr, p) || (!!event.taskId && p.tasks.some((t) => t.id === event.taskId))));
  if (event.taskId && !concernes.some((p) => p.tasks.some((t) => t.id === event.taskId))) {
    const porteur = await db.day_plans.filter((p) => p.tasks.some((t) => t.id === event.taskId)).first();
    if (porteur) concernes.push(porteur);
  }
  const cases = new Set<CaseId>(event.caseId ? [event.caseId] : []);
  for (const plan of concernes) {
    const { tasks, absorbes } = deriverPlan(plan, await evenementsDuPlan(plan));
    if (absorbes.length) {
      for (const id of absorbes) { const old = await db.training_events.get(id); if (old?.caseId) cases.add(old.caseId); }
      await db.training_events.bulkDelete(absorbes);                          // absorbée (D-C4), comme au rebuild
    }
    await db.day_plans.put({ ...plan, tasks });
  }
  for (const caseId of cases) {
    const all = await db.training_events.where('caseId').equals(caseId).toArray();
    const [cp] = computeCaseProgress(all);
    if (cp) await db.case_progress.put(cp); else await db.case_progress.delete(caseId);
  }
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
    const { te, plans, progress } = projeterJournal(source);
    await db.training_events.clear();
    await db.training_events.bulkPut(te);
    await db.day_plans.clear();
    await db.day_plans.bulkPut(plans);
    await db.case_progress.clear();
    await db.case_progress.bulkPut(progress);
  });
}
