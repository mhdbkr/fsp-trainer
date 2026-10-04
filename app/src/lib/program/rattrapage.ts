// ============================================================================
// Le rattrapage d'un jour manqué — PROPOSÉ, jamais imposé (décision de
// direction Q4, revue s3-programme D-I7).
//
// Ce qui se rattrape : les tâches NON faites du dernier jour FIGÉ avant
// aujourd'hui. Un jour jamais ouvert n'a pas de plan, donc rien à rattraper
// (contrat §3.2 : rien ne s'accumule). Le drill ne se reprend pas — celui du
// jour le remplace. Accepter est un geste nommé qui écrit `plan.replanned`
// (raison `rattrapage`) : les tâches du jour restent à l'identique, les reprises
// s'ajoutent avec un id neuf. Refuser se retient pour ce jour-là.
// ============================================================================
import { db, getMeta, setMeta } from '@/db/db';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DayPlan, ProgramConfig, TaskInstance } from '@/db/types';
import { newId } from '@/lib/sync/events';
import { now } from '@/lib/clock';
import { isWorkingDay } from './dayPlan';

/** Une reprise reprise garde UNE raison : le préfixe « Reprise … — » d'hier s'efface. */
const REPRISE_PREFIXE = /^Reprise (?:de la veille|du [^—]+) — /;

export const RATTRAPAGE_REFUS_KEY = 'rattrapageRefuse';

export function rattrapageAProposer(plans: DayPlan[], today: string, refused: string[]): { from: string; tasks: TaskInstance[] } | null {
  const todayPlan = plans.find((p) => p.date === today);
  const prev = plans.filter((p) => p.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!todayPlan || !prev || refused.includes(prev.date)) return null;
  const planned = new Set(todayPlan.tasks.map((t) => t.caseId).filter(Boolean));
  const tasks = prev.tasks.filter((t) => t.doneAt === undefined && t.kind !== 'drill' && !(t.caseId && planned.has(t.caseId)));
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

export function glissement(plans: DayPlan[], today: string, config: Pick<ProgramConfig, 'offDays'>, refused: string[]): Glissement | null {
  const todayPlan = plans.find((p) => p.date === today);
  const prev = plans.filter((p) => p.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!todayPlan || !prev || refused.includes(prev.date)) return null;
  let manques = 0;
  const known = new Set(plans.map((p) => p.date));
  for (let d = addDays(parseISO(prev.date), 1), guard = 0; format(d, 'yyyy-MM-dd') < today && guard < 120; d = addDays(d, 1), guard++) {
    const k = format(d, 'yyyy-MM-dd');
    if (isWorkingDay(d, config) && !known.has(k)) manques++;
  }
  const tasks = rattrapageAProposer(plans, today, refused)?.tasks ?? [];
  const planned = new Set(todayPlan.tasks.map((t) => t.caseId).filter(Boolean));
  const deja = manques > 0 ? prev.tasks.filter((t) => t.doneAt === undefined && t.kind !== 'drill' && t.caseId && planned.has(t.caseId)) : [];
  return tasks.length || deja.length ? { from: prev.date, manques, tasks, deja } : null;
}

export async function accepterRattrapage(today: string, from: string): Promise<DayPlan | null> {
  const [todayPlan, prev] = await Promise.all([db.day_plans.get(today), db.day_plans.get(from)]);
  const p = todayPlan && prev ? rattrapageAProposer([todayPlan, prev], today, []) : null;
  if (!todayPlan || !p) return null;
  const reprises: TaskInstance[] = p.tasks.map(({ doneAt: _d, spentMin: _s, eventId: _e, ...t }) => ({
    ...t, id: newId(), date: today, reason: `Reprise ${differenceInCalendarDays(parseISO(today), parseISO(from)) === 1 ? 'de la veille' : `du ${format(parseISO(from), 'EEEE d MMMM', { locale: fr })}`} — ${t.reason.replace(REPRISE_PREFIXE, '')}`,
  }));
  const tasks = [...todayPlan.tasks, ...reprises];
  const next: DayPlan = { ...todayPlan, tasks, replannedAt: now() };
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'plan.replanned', subject_id: today, occurred_at: new Date(next.replannedAt!).toISOString(), payload: { tasks, reason: 'rattrapage' } })
    .catch((e) => console.warn('[sync]', e));
  await refuserRattrapage(from);                                  // traité : la ligne « ce qui a glissé » ne revient pas (AVANT le plan : l'écran suit le plan)
  await db.day_plans.put(next);
  return next;
}

export async function refuserRattrapage(from: string): Promise<void> {
  const refused = await getMeta<string[]>(RATTRAPAGE_REFUS_KEY, []);
  if (!refused.includes(from)) await setMeta(RATTRAPAGE_REFUS_KEY, [...refused, from]);
}
