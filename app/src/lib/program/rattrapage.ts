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
import type { DayPlan, TaskInstance } from '@/db/types';
import { newId } from '@/lib/sync/events';
import { now } from '@/lib/clock';

export const RATTRAPAGE_REFUS_KEY = 'rattrapageRefuse';

export function rattrapageAProposer(plans: DayPlan[], today: string, refused: string[]): { from: string; tasks: TaskInstance[] } | null {
  const todayPlan = plans.find((p) => p.date === today);
  const prev = plans.filter((p) => p.date < today).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!todayPlan || !prev || refused.includes(prev.date)) return null;
  const planned = new Set(todayPlan.tasks.map((t) => t.caseId).filter(Boolean));
  const tasks = prev.tasks.filter((t) => t.doneAt === undefined && t.kind !== 'drill' && !(t.caseId && planned.has(t.caseId)));
  return tasks.length ? { from: prev.date, tasks } : null;
}

export async function accepterRattrapage(today: string, from: string): Promise<DayPlan | null> {
  const [todayPlan, prev] = await Promise.all([db.day_plans.get(today), db.day_plans.get(from)]);
  const p = todayPlan && prev ? rattrapageAProposer([todayPlan, prev], today, []) : null;
  if (!todayPlan || !p) return null;
  const reprises: TaskInstance[] = p.tasks.map(({ doneAt: _d, spentMin: _s, eventId: _e, ...t }) => ({
    ...t, id: newId(), date: today, reason: `Reprise de la veille — ${t.reason}`,
  }));
  const tasks = [...todayPlan.tasks, ...reprises];
  const next: DayPlan = { ...todayPlan, tasks, replannedAt: now() };
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'plan.replanned', subject_id: today, occurred_at: new Date(next.replannedAt!).toISOString(), payload: { tasks, reason: 'rattrapage' } })
    .catch((e) => console.warn('[sync]', e));
  await db.day_plans.put(next);
  return next;
}

export async function refuserRattrapage(from: string): Promise<void> {
  const refused = await getMeta<string[]>(RATTRAPAGE_REFUS_KEY, []);
  if (!refused.includes(from)) await setMeta(RATTRAPAGE_REFUS_KEY, [...refused, from]);
}
