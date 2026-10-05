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
import { BUDGET_PLANCHER_MIN, RYTHME_FENETRE_JOURS, RYTHME_MIN_JOURS, RYTHME_REFUS_MAX, RYTHME_SEUIL, SEUIL_FREQUENT, SESSION_MAX_MIN, SESSION_MIN_MIN, SESSION_PAS_MIN } from './parametres';
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
/** La plus petite session du curseur de ProgramSetup (minutes, pas de 5) dont le budget du jour, ARRONDI comme
 *  `dayTargetMin`, couvre `budget` — proposer puis accepter rend exactement la valeur proposée. */
function sessionPour(budget: number, intensity: ProgramConfig['intensity']): number {
  const f = INTENSITY_FACTOR[intensity];
  let s = Math.ceil(budget / f / SESSION_PAS_MIN - 1e-9) * SESSION_PAS_MIN;
  while (s - SESSION_PAS_MIN >= SESSION_MIN_MIN && Math.round((s - SESSION_PAS_MIN) * f) >= budget) s -= SESSION_PAS_MIN;
  return Math.min(SESSION_MAX_MIN, Math.max(SESSION_MIN_MIN, s));
}

export function proposerRythme(i: { plans: readonly DayPlan[]; events: TrainingEvent[]; config: ProgramConfig; refus: RefusRythme; today: string }): { valeur: number; semaine: string; minutesSession: number; moyenne: number } | null {
  const fenetre = new Set(Array.from({ length: RYTHME_FENETRE_JOURS }, (_, k) => format(addDays(parseISO(i.today), -(k + 1)), ISO)));
  const figes = i.plans.filter((p) => fenetre.has(p.date) && p.tasks.length > 0);
  if (figes.length < RYTHME_MIN_JOURS) return null;
  const parJour = spentByDay(i.events);
  const spent = figes.reduce((s, p) => s + (parJour.get(p.date) ?? 0), 0);
  const cible = figes.reduce((s, p) => s + p.targetMin, 0);
  if (!(spent < RYTHME_SEUIL * cible)) return null;
  const semaine = semaineIso(i.today);
  if (i.refus.semaines.has(semaine) || i.refus.depuisDerniereConfig >= RYTHME_REFUS_MAX) return null;
  // Revue m3 : le multiple de 5 SUPÉRIEUR (le temps réel tient dans la proposition). Revue m4 : posé sur la grille du
  // curseur ; la valeur proposée est le budget du jour de cette session — exactement ce qu'accepter donnera.
  const moyenne = spent / figes.length;
  const minutesSession = sessionPour(Math.max(BUDGET_PLANCHER_MIN, Math.ceil(moyenne / 5 - 1e-9) * 5), i.config.intensity);
  const valeur = Math.round(minutesSession * INTENSITY_FACTOR[i.config.intensity]);
  return valeur < dayTargetMin(i.config) ? { valeur, semaine, minutesSession, moyenne } : null;
}

/** Accepter : la config COMPLÈTE par `ecrireConfig` (INV-76 a), seul `hoursPerSession` change pour que le budget du jour
 *  vaille `valeur`. Les jours déjà figés gardent leur `targetMin`. */
export function accepterRythme(valeur: number, config: ProgramConfig): Promise<void> {
  return ecrireConfig({ ...config, hoursPerSession: sessionPour(valeur, config.intensity) / 60 });
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
  { n: number; date: string; dateActuelle: string; apresExamen: boolean; texte: string } | null {
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
  // VETO pédagogique (revue S4-2) : une date projetée APRÈS l'examen se dit — la carte propose alors d'abord de garder le budget.
  const exam = i.config.examDate;
  const apresExamen = !!exam && date >= exam;
  const quand = !apresExamen ? '' : date === exam ? ', le jour de ton examen' : `, après ton examen du ${jour(exam!)}`;
  const sujet = n === 1 ? 'le cas le plus fréquent' : `chacun des ${n} cas les plus fréquents`;
  const texte = `À ce rythme, tu auras joué une fois ${sujet} le ${jour(date)}${quand}${date === dateActuelle ? '' : ` (au lieu du ${jour(dateActuelle)})`}`;
  return { n, date, dateActuelle, apresExamen, texte: texte.endsWith('.') ? texte : `${texte}.` };
}
