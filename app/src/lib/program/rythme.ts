// Le rythme PROPOSÉ (training-journal.md §13.5, ADR-0022 §5, INV-65).
//
// Une semaine où le temps mesuré reste sous `RYTHME_SEUIL` du budget des jours figés, l'app PROPOSE de caler le budget
// sur le rythme réel. Elle n'impose jamais : `proposerRythme` est pure et n'écrit rien ; seul un geste écrit — accepter
// (`program.configured`, la config COMPLÈTE) ou refuser (`rythme.refused`, synchronisé). Aucun jour figé ne change.
// La carte montre la CONSÉQUENCE sur la projection, jamais l'écart en % (réserve P1).
import { addDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Case, CaseProgress, DayPlan, ProgramConfig, TrainingEvent } from '@/db/types';
import { db } from '@/db/db';
import { INTENSITY_FACTOR } from '@/lib/intensity';
import { spentByDay } from '@/lib/journal';
import { ecrireConfig, refusRythme } from '@/lib/sync/configProjetee';
import { isWorkingDay } from './calendrier';
import { dayTargetMin } from './dayPlan';
import { dureesTeile } from './durees';
import { BUDGET_PLANCHER_MIN, RYTHME_FENETRE_JOURS, RYTHME_MIN_JOURS, RYTHME_REFUS_MAX, RYTHME_SEUIL, SEUIL_FREQUENT } from './parametres';
import { freq } from './select';

const ISO = 'yyyy-MM-dd';

/** La semaine ISO d'un jour, `yyyy-Www` — le sujet d'un `rythme.refused`. */
export const semaineIso = (jour: string): string => format(parseISO(jour), "RRRR-'W'II");

export interface RefusRythme { semaines: ReadonlySet<string>; depuisDerniereConfig: number }

/**
 * La proposition du jour `today`, ou `null`. La fenêtre : les `RYTHME_FENETRE_JOURS` jours finissant hier ; un jour y est
 * « figé » s'il a un `DayPlan` portant au moins une tâche (un jour off ouvert n'a pas de budget à tenir). Jamais à la
 * hausse, jamais sous `BUDGET_PLANCHER_MIN` ; rien la semaine d'un refus, rien après `RYTHME_REFUS_MAX` refus depuis la
 * dernière modification du programme (P2).
 */
export function proposerRythme(i: { plans: readonly DayPlan[]; events: TrainingEvent[]; config: ProgramConfig; refus: RefusRythme; today: string }): { valeur: number; semaine: string } | null {
  const fenetre = new Set(Array.from({ length: RYTHME_FENETRE_JOURS }, (_, k) => format(addDays(parseISO(i.today), -(k + 1)), ISO)));
  const figes = i.plans.filter((p) => fenetre.has(p.date) && p.tasks.length > 0);
  if (figes.length < RYTHME_MIN_JOURS) return null;
  const parJour = spentByDay(i.events);
  const spent = figes.reduce((s, p) => s + (parJour.get(p.date) ?? 0), 0);
  const cible = figes.reduce((s, p) => s + p.targetMin, 0);
  if (!(spent < RYTHME_SEUIL * cible)) return null;
  const semaine = semaineIso(i.today);
  if (i.refus.semaines.has(semaine) || i.refus.depuisDerniereConfig >= RYTHME_REFUS_MAX) return null;
  const valeur = Math.max(BUDGET_PLANCHER_MIN, Math.round(spent / figes.length / 5) * 5);
  return valeur < dayTargetMin(i.config) ? { valeur, semaine } : null;
}

/** Accepter : la config COMPLÈTE par `ecrireConfig` (INV-76 a), seul `hoursPerSession` change pour que le budget du jour
 *  vaille `valeur`. Les jours déjà figés gardent leur `targetMin`. */
export function accepterRythme(valeur: number, config: ProgramConfig): Promise<void> {
  const h = Math.round((valeur / (60 * INTENSITY_FACTOR[config.intensity])) * 1e4) / 1e4;
  return ecrireConfig({ ...config, hoursPerSession: h });
}

/** Refuser : un `rythme.refused` synchronisé pour la semaine, un seul (un double clic n'en écrit pas deux). */
export async function refuserRythme(semaine: string): Promise<void> {
  if (refusRythme(await db.progress_events.where('type').equals('rythme.refused').toArray()).semaines.has(semaine)) return;
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'rythme.refused', subject_id: semaine, payload: {} });
}

/** Le jour où `travail` minutes sont faites à `budget` minutes par jour ouvré, à partir de demain. */
function jourOu(travail: number, budget: number, today: string, config: ProgramConfig): string | null {
  if (budget <= 0) return null;
  let reste = travail;
  for (let k = 1, d = parseISO(today); k <= 1500; k++) {          // ponytail : ~4 ans de jours, au-delà la phrase n'a plus de sens
    d = addDays(d, 1);
    if (!isWorkingDay(d, config)) continue;
    reste -= budget;
    if (reste <= 0) return format(d, ISO);
  }
  return null;
}

/**
 * La conséquence d'un budget à `valeur` minutes sur la projection : la date où les cas FRÉQUENTS (`freq ≥ SEUIL_FREQUENT`)
 * seront tous travaillés, au rythme réel, et au budget actuel. Le travail : chaque Teil non solide, à sa durée apprise.
 * `null` quand il n'y a plus rien à projeter. Pure.
 */
export function consequenceRythme(i: { cases: readonly Case[]; progress: ReadonlyMap<string, CaseProgress>; config: ProgramConfig; today: string; valeur: number; events?: readonly TrainingEvent[] }):
  { n: number; date: string; dateActuelle: string; texte: string } | null {
  const freqMax = i.cases.reduce((m, c) => Math.max(m, c.frequency), 1);
  const frequents = i.cases.filter((c) => freq(c, freqMax) >= SEUIL_FREQUENT);
  const duree = dureesTeile(i.events ?? []);
  const travail = frequents.reduce((s, c) => s + (Object.keys(duree) as (keyof typeof duree)[])
    .filter((t) => i.progress.get(c.id)?.teile[t]?.status !== 'solide').reduce((x, t) => x + duree[t], 0), 0);
  if (travail === 0) return null;
  const date = jourOu(travail, i.valeur, i.today, i.config), dateActuelle = jourOu(travail, dayTargetMin(i.config), i.today, i.config);
  if (!date || !dateActuelle) return null;
  const n = frequents.length;
  const jour = (d: string) => format(parseISO(d), 'd MMM', { locale: fr });
  const sujet = n === 1 ? 'le cas le plus fréquent sera travaillé' : `les ${n} cas les plus fréquents seront travaillés`;
  const texte = `À ce rythme, ${sujet} le ${jour(date)}${date === dateActuelle ? '' : ` au lieu du ${jour(dateActuelle)}`}`;
  return { n, date, dateActuelle, texte: texte.endsWith('.') ? texte : `${texte}.` };
}
