// ============================================================================
// « Finir hier » — le reste d'un jour manqué revient en tête, PROPOSÉ, jamais
// imposé (décision de direction Q4 ; training-journal.md §12.8 ; INV-52, INV-58).
//
// Ce qui se rattrape : les tâches NON faites du dernier jour FIGÉ avant
// aujourd'hui. Un jour jamais ouvert n'a pas de plan, donc rien à rattraper
// (contrat §3.2 : rien ne s'accumule). Le drill ne se reprend pas — celui du
// jour le remplace.
//
// Une tâche de cas non faite est reprise avec EXACTEMENT ce qui lui reste
// (`resteTache`) : la tâche de la veille entamée par l'Anamnese revient comme
// « Finir <cas> » avec la Dokumentation et la Fallvorstellung. La reprise ne porte
// JAMAIS `dUnTrait` (I5 : un cas d'un trait dont on a joué un Teil ne se « finit »
// pas d'un trait). Un reste vide n'est pas proposé.
//
// Accepter est un geste nommé qui écrit `plan.replanned` (raison `rattrapage`) :
// les tâches faites du jour restent à l'identique, les reprises s'insèrent AVANT la
// première tâche non faite, avec un `creeA` neuf. Hors budget, la reprise REMPLACE
// la première tâche de cas ni faite ni entamée (réserve C1, m-c) ; sans candidate,
// elle s'ajoute. Refuser est un événement SYNCHRONISÉ (`rattrapage.refused`) : un
// refus fait sur un appareil vaut sur l'autre.
// ============================================================================
import { db, getMeta } from '@/db/db';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DayPlan, ProgramConfig, SimTeil, TaskInstance, TrainingEvent } from '@/db/types';
import { newId } from '@/lib/sync/events';
import { now } from '@/lib/clock';
import { refusRattrapage } from '@/lib/sync/configProjetee';
import { estTacheDeCas, evaluerTache } from './completion';
import { dureesTeile } from './durees';
import { isWorkingDay } from './calendrier';

/** Une reprise reprise garde UNE raison : le préfixe « Reprise … — » d'hier s'efface. */
const REPRISE_PREFIXE = /^Reprise (?:de la veille|du [^—]+) — /;

/** L'ancienne clé locale du refus. Relue UNE fois à la migration (`migrerRefusRattrapage`), puis ignorée. */
export const RATTRAPAGE_REFUS_KEY = 'rattrapageRefuse';

const comme = (refused: ReadonlySet<string> | readonly string[]): ReadonlySet<string> => (refused instanceof Set ? refused : new Set(refused as readonly string[]));

/** La reprise d'UNE tâche non faite, ou `null` (faite, drill, reste vide). */
function reprise(t: TaskInstance, prev: DayPlan, today: string, events: readonly TrainingEvent[], duree: Record<SimTeil, number>): TaskInstance | null {
  if (t.kind === 'drill' || t.doneAt !== undefined) return null;                // celui du jour le remplace ; une tâche faite ne se reprend pas
  const e = evaluerTache(t, events, prev.tz);
  if (e.statut === 'faite') return null;
  const { doneAt: _d, spentMin: _s, eventId: _e, teil: _t, dUnTrait: _u, rappel: _r, creeA: _c, teile: _tt, ...rest } = t;
  const apres = `Reprise ${differenceInCalendarDays(parseISO(today), parseISO(prev.date)) === 1 ? 'de la veille' : `du ${format(parseISO(prev.date), 'EEEE d MMMM', { locale: fr })}`} — ${t.reason.replace(REPRISE_PREFIXE, '')}`;
  if (!estTacheDeCas(t.kind)) return { ...rest, id: newId(), date: today, reason: apres };
  if (e.reste.length === 0) return null;                                         // un reste vide n'est pas proposé
  // Une tâche d'un trait ou un examen à blanc ENTAMÉS ne se retrouvent pas tels quels : ce qui reste est un cas à finir.
  const kind = e.avancement.length > 0 && (t.kind === 'revision' || t.kind === 'examen-blanc') ? 'simulation' : t.kind;
  return {
    ...rest, id: newId(), date: today, kind, teile: e.reste, creeA: now(),
    estMin: e.reste.reduce((s, k) => s + duree[k], 0),                         // INV-64 : Σ dureeTeil de ce qui RESTE
    reason: `Finir ${t.label}`,
  };
}

export function rattrapageAProposer(
  plans: DayPlan[], today: string, refused: ReadonlySet<string> | readonly string[], events: readonly TrainingEvent[],
): { from: string; tasks: TaskInstance[] } | null {
  const todayPlan = plans.find((p) => p.date === today);
  const prev = plans.filter((p) => p.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!todayPlan || !prev || comme(refused).has(prev.date)) return null;
  const planned = new Set(todayPlan.tasks.map((t) => t.caseId).filter(Boolean));
  const duree = dureesTeile(events);
  const tasks = prev.tasks
    .filter((t) => !(t.caseId && planned.has(t.caseId)))
    .map((t) => reprise(t, prev, today, events, duree))
    .filter((t): t is TaskInstance => t !== null);
  return tasks.length ? { from: prev.date, tasks } : null;
}

/**
 * Ce qui a glissé, dit au retour (FB3-D10). Réutilise `rattrapageAProposer` pour
 * ce qui peut être repris (`tasks`) ; `deja` = ce qui a glissé mais que le plan
 * du jour a déjà repris de lui-même (rien à ajouter, mais le candidat doit le
 * savoir). `manques` = jours OUVRÉS du programme sans plan entre le dernier
 * jour figé et aujourd'hui : un week-end off n'est pas un jour manqué.
 * Sans jour manqué, seule la proposition de la veille subsiste (`deja` tu).
 */
export interface Glissement { from: string; manques: number; tasks: TaskInstance[]; deja: TaskInstance[] }

export function glissement(
  plans: DayPlan[], today: string, config: Pick<ProgramConfig, 'offDays'>, refused: ReadonlySet<string> | readonly string[], events: readonly TrainingEvent[],
): Glissement | null {
  const todayPlan = plans.find((p) => p.date === today);
  const prev = plans.filter((p) => p.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!todayPlan || !prev || comme(refused).has(prev.date)) return null;
  let manques = 0;
  const known = new Set(plans.map((p) => p.date));
  for (let d = addDays(parseISO(prev.date), 1), guard = 0; format(d, 'yyyy-MM-dd') < today && guard < 120; d = addDays(d, 1), guard++) {
    const k = format(d, 'yyyy-MM-dd');
    if (isWorkingDay(d, config) && !known.has(k)) manques++;
  }
  const tasks = rattrapageAProposer(plans, today, refused, events)?.tasks ?? [];
  const planned = new Set(todayPlan.tasks.map((t) => t.caseId).filter(Boolean));
  const deja = manques > 0 ? prev.tasks.filter((t) => t.doneAt === undefined && t.kind !== 'drill' && t.caseId && planned.has(t.caseId)) : [];
  return tasks.length || deja.length ? { from: prev.date, manques, tasks, deja } : null;
}

/** Les tâches de cas ni faites ni entamées sont les seules qu'une reprise hors budget remplace (m-c, INV-58). */
const remplacable = (t: TaskInstance, events: readonly TrainingEvent[], tz?: string): boolean =>
  (t.kind === 'simulation' || t.kind === 'revision') && evaluerTache(t, events, tz).statut === 'a-faire';

export async function accepterRattrapage(today: string, from: string): Promise<DayPlan | null> {
  const [todayPlan, prev] = await Promise.all([db.day_plans.get(today), db.day_plans.get(from)]);
  if (!todayPlan || !prev) return null;
  const events = await db.training_events.toArray();                          // tout le journal : les durées apprises en ont besoin
  const p = rattrapageAProposer([todayPlan, prev], today, [], events);
  if (!p) return null;

  const tasks = [...todayPlan.tasks];
  let used = tasks.reduce((s, t) => s + t.estMin, 0);
  let curseur = tasks.findIndex((t) => t.doneAt === undefined);               // « avant la première tâche non faite »
  if (curseur < 0) curseur = tasks.length;
  for (const r of p.tasks) {
    if (used + r.estMin > todayPlan.targetMin) {                              // hors budget : elle remplace, elle n'ajoute pas
      const i = tasks.findIndex((t) => remplacable(t, events, todayPlan.tz));
      if (i >= 0) { used += r.estMin - tasks[i].estMin; tasks[i] = r; continue; }
    }
    tasks.splice(curseur++, 0, r);
    used += r.estMin;
  }
  const next: DayPlan = { ...todayPlan, tasks, replannedAt: now() };
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'plan.replanned', subject_id: today, occurred_at: new Date(next.replannedAt!).toISOString(), payload: { tasks, reason: 'rattrapage' } })
    .catch((e) => console.warn('[sync]', e));
  await refuserRattrapage(from);                                  // traité : la ligne « ce qui a glissé » ne revient pas (AVANT le plan : l'écran suit le plan)
  await db.day_plans.put(next);
  return next;
}

/** Refuser (ou avoir traité) le rattrapage de `from` : un événement SYNCHRONISÉ, additif (§12.10). */
export async function refuserRattrapage(from: string): Promise<void> {
  const deja = refusRattrapage(await db.progress_events.where('type').equals('rattrapage.refused').toArray());
  if (deja.has(from)) return;
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'rattrapage.refused', subject_id: from, payload: {} });
}

/** Les jours dont le rattrapage est refusé ou traité, sur TOUS les appareils (événements, plus la clé locale). */
export async function joursRefuses(): Promise<Set<string>> {
  return refusRattrapage(await db.progress_events.where('type').equals('rattrapage.refused').toArray());
}

/**
 * La clé locale `rattrapageRefuse` d'avant la série 4 devient des événements `rattrapage.refused`, UNE fois : on la lit,
 * on pousse ce qui manque, on la supprime. Un crash entre les deux ne perd rien (les événements sont additifs).
 */
export async function migrerRefusRattrapage(): Promise<void> {
  const anciens = (await getMeta<string[]>(RATTRAPAGE_REFUS_KEY, [])).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-30);
  if (!(await db.meta.get(RATTRAPAGE_REFUS_KEY))) return;
  for (const d of anciens) await refuserRattrapage(d);
  await db.meta.delete(RATTRAPAGE_REFUS_KEY);
}
