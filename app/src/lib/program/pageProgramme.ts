// ============================================================================
// Ce que la page Programme LIT (S4-5, proposition validée « 4 · Programme »). Trois questions, dans l'ordre :
// aujourd'hui (le plan figé, lu ailleurs), la semaine, jusqu'à l'examen — puis la carte de couverture et son encart.
// Tout est PUR : rien ne matérialise, rien ne change la sélection du plan (INV-55). La page lit, elle ne recalcule pas.
// ============================================================================
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Case, CaseProgress, Center, DayPlan, ProgramConfig, Specialty, TaskInstance, TrainingEvent } from '@/db/types';
import { computeCaseProgress } from '@/lib/progression';
import { isWorkingDay } from './calendrier';
import { estTacheDeCas, evaluerTache, partieJouee } from './completion';
import { couverturePonderee, pathologieDe, phraseFrequence, poidsDe, type CouverturePonderee, type Frequences } from './couverturePonderee';
import { debutJour, jourDe } from './fuseau';
import { PROJECTION_FENETRE_JOURS, RYTHME_MIN_JOURS } from './parametres';
import { consequenceRythme } from './rythme';

const ISO = 'yyyy-MM-dd';
const iso = (d: Date) => format(d, ISO);
const jourCourt = (d: string) => format(parseISO(d), 'd MMM', { locale: fr });
const fin = (s: string) => (s.endsWith('.') ? s : `${s}.`);                // « déc. » porte déjà son point

// --- La semaine ---------------------------------------------------------------

/** `fait` : la tâche est faite ; `entame` : une partie l'a fait avancer (jamais « manquée », INV-52) ;
 *  `prevu` : figée, à faire ; `projete` : un jour à venir, non figé ; `hors-plan` : un cas joué ce jour-là hors du plan. */
export type EtatPoint = 'fait' | 'entame' | 'prevu' | 'projete' | 'hors-plan';
export interface JourSemaine { date: string; off: boolean; points: { caseId?: string; label: string; etat: EtatPoint }[] }

/** Lundi → dimanche de la semaine de `today`. */
export const joursDeLaSemaine = (today: string): string[] =>
  Array.from({ length: 7 }, (_, k) => iso(addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), k)));

/** La semaine de `today` : un point par CAS prévu, et un point plein par cas joué hors du plan. Un jour off (plan sans
 *  tâche, ou jour off du programme sans plan) est neutre — sauf si le candidat y a joué. Un jour passé sans plan est
 *  vide, jamais « en retard ». */
export function semaine(i: {
  today: string; plans: ReadonlyMap<string, DayPlan>; projection: ReadonlyMap<string, TaskInstance[]>;
  events: readonly TrainingEvent[]; config: Pick<ProgramConfig, 'offDays'>; cases?: readonly Case[];
}): JourSemaine[] {
  const nom = new Map((i.cases ?? []).map((c) => [c.id, c.name]));
  return joursDeLaSemaine(i.today).map((date) => {
    const d = parseISO(date);
    const plan = i.plans.get(date);
    const prevus = plan ? plan.tasks.filter((t) => estTacheDeCas(t.kind)) : [];
    const points: JourSemaine['points'] = prevus.map((t) => ({
      caseId: t.caseId, label: t.label,
      etat: t.doneAt !== undefined ? 'fait' : evaluerTache(t, i.events, plan!.tz).statut === 'entamee' ? 'entame' : 'prevu',
    }));
    // Le travail fait hors du plan ce jour-là : un point plein par cas, une fois.
    const auPlan = new Set(prevus.map((t) => t.caseId));
    const horsPlan = [...new Set(i.events.filter((e) => partieJouee(e) && jourDe(e.at, plan?.tz) === date && !auPlan.has(e.caseId)).map((e) => e.caseId!))];
    points.push(...horsPlan.map((caseId) => ({ caseId, label: nom.get(caseId) ?? caseId, etat: 'hors-plan' as const })));
    if (!plan && date > i.today) points.push(...(i.projection.get(date) ?? []).filter((t) => estTacheDeCas(t.kind)).map((t) => ({ caseId: t.caseId, label: t.label, etat: 'projete' as const })));
    const offPrevu = plan ? plan.tasks.length === 0 : !isWorkingDay(d, i.config);
    return { date, off: offPrevu && horsPlan.length === 0, points };
  });
}

// --- Jusqu'à l'examen ---------------------------------------------------------

export interface ProjectionExamen { n: number; date: string; marge: number | null; texte: string }

/**
 * « À ton rythme des deux dernières semaines, tu auras travaillé les N cas les plus fréquents le <date>, avec M jours de
 * marge pour les reprendre. » Le rythme : les minutes de PARTIES de cas des `PROJECTION_FENETRE_JOURS` jours finissant
 * hier (depuis le début du programme), par jour ouvré. Le travail et la date : `consequenceRythme` (S4-2), sur la
 * progression d'HIER SOIR — rien de ce qui est fait aujourd'hui ne bouge la phrase (recalculée chaque soir). Si le rythme
 * baisse, la date recule, sans alarme. Rien à projeter ⇒ `null`, et la page n'affiche pas de phrase.
 */
export function projectionExamen(i: { cases: readonly Case[]; events: readonly TrainingEvent[]; config: ProgramConfig; today: string }): ProjectionExamen | null {
  const exam = i.config.examDate;
  if (!exam || i.today >= exam) return null;
  const fenetre = Array.from({ length: PROJECTION_FENETRE_JOURS }, (_, k) => iso(addDays(parseISO(i.today), -(k + 1))))
    .filter((d) => d >= i.config.startDate);
  const ouvres = fenetre.filter((d) => isWorkingDay(parseISO(d), i.config)).length;
  if (ouvres < RYTHME_MIN_JOURS) return null;
  const avant = i.events.filter((e) => e.at < debutJour(i.today));
  const debut = debutJour(fenetre[fenetre.length - 1]);
  const minutes = avant.reduce((s, e) => s + (partieJouee(e) && e.at >= debut ? Math.max(0, e.spentMin) : 0), 0);
  if (minutes <= 0) return null;
  const progress = new Map(computeCaseProgress([...avant]).map((cp) => [cp.caseId, cp]));
  const q = consequenceRythme({ cases: i.cases, progress, config: i.config, today: i.today, valeur: minutes / ouvres, events: avant });
  if (!q) return null;
  const ecart = differenceInCalendarDays(parseISO(exam), parseISO(q.date));
  const marge = ecart > 0 ? ecart : null;
  const quand = fenetre.length === PROJECTION_FENETRE_JOURS ? 'des deux dernières semaines' : `de ces ${fenetre.length} derniers jours`;
  const sujet = q.n === 1 ? 'le cas le plus fréquent' : `les ${q.n} cas les plus fréquents`;
  const suite = marge !== null ? `, avec ${marge} jour${marge > 1 ? 's' : ''} de marge pour ${q.n === 1 ? 'le' : 'les'} reprendre`
    : ecart === 0 ? ', le jour de ton examen' : `, après ton examen du ${jourCourt(exam)}`;
  return { n: q.n, date: q.date, marge, texte: fin(`À ton rythme ${quand}, tu auras travaillé ${sujet} le ${jourCourt(q.date)}${suite}`) };
}

// --- La carte de couverture ---------------------------------------------------

export interface SpecialiteCarte { specialite: Specialty; cas: Case[]; poids: number }
export interface CarteCouverture { specialites: SpecialiteCarte[]; mesure: CouverturePonderee; freqs: Frequences }

/** Σ des poids des pathologies DISTINCTES de `cas` : deux cas d'une même pathologie ne l'additionnent pas. */
function poidsDistinct(cas: readonly Case[], freqs: Frequences, mesure: CouverturePonderee): number {
  const vus = new Map<string, number>();
  for (const c of cas) { const w = poidsDe(freqs, c.id, mesure); if (w !== undefined) vus.set(freqs.cas[c.id], w); }
  return [...vus.values()].reduce((a, b) => a + b, 0);
}

/** Pondérée par la fréquence : les spécialités par poids de protocoles (pathologies distinctes), et dans chacune les
 *  cas par le poids de leur pathologie (§13.6 : ventilée dans la ville cible quand la donnée existe, sinon tous centres). */
export function carteCouverture(cases: readonly Case[], progress: Map<string, CaseProgress>, freqs: Frequences, ville?: Center | 'Alle' | null): CarteCouverture {
  const mesure = couverturePonderee([...cases], progress, freqs, ville);
  const poids = (c: Case) => poidsDe(freqs, c.id, mesure) ?? 0;
  const par = new Map<Specialty, Case[]>();
  for (const c of cases) par.set(c.specialty, [...(par.get(c.specialty) ?? []), c]);
  const specialites = [...par].map(([specialite, l]) => ({
    specialite, cas: l.sort((a, b) => poids(b) - poids(a) || a.name.localeCompare(b.name)), poids: poidsDistinct(l, freqs, mesure),
  })).sort((a, b) => b.poids - a.poids || a.specialite.localeCompare(b.specialite));
  return { specialites, mesure, freqs };
}

export interface EncartCouverture { specialite: Specialty; cas: Case; texte: string }

/** « Orthopädie : aucun des 11 cas n'est encore travaillé. » / « Kardiologie : 3 des 9 cas ne sont pas encore travaillés. » */
function phraseBlanc(specialite: string, vierges: number, total: number): string {
  if (vierges === total) return total === 1 ? `${specialite} : son seul cas n'est pas encore travaillé.` : `${specialite} : aucun des ${total} cas n'est encore travaillé.`;
  return vierges === 1 ? `${specialite} : 1 des ${total} cas n'est pas encore travaillé.` : `${specialite} : ${vierges} des ${total} cas ne sont pas encore travaillés.`;
}

/** L'encart dit UNE chose : la spécialité où le blanc (cas jamais travaillés) PÈSE le plus en protocoles (pathologies
 *  distinctes), et la fréquence de sa pathologie la plus lourde, sous le nom de la source (§12.9). Aucun blanc qui
 *  pèse ⇒ pas d'encart. L'action est d'ouvrir la spécialité dans la carte — jamais de jouer hors plan. */
export function encartCouverture(carte: CarteCouverture, progress: Map<string, CaseProgress>): EncartCouverture | null {
  const poids = (c: Case) => poidsDe(carte.freqs, c.id, carte.mesure) ?? 0;
  const vierge = (c: Case) => (progress.get(c.id)?.couverture ?? 0) === 0;
  let meilleur: { s: SpecialiteCarte; blanc: number } | null = null;
  for (const s of carte.specialites) {
    const blanc = poidsDistinct(s.cas.filter(vierge), carte.freqs, carte.mesure);
    if (blanc > 0 && (!meilleur || blanc > meilleur.blanc)) meilleur = { s, blanc };
  }
  if (!meilleur) return null;
  const vierges = meilleur.s.cas.filter(vierge);
  const cas = vierges.reduce((a, b) => (poids(b) > poids(a) ? b : a));
  const frequence = phraseFrequence(pathologieDe(carte.freqs, cas.id)!.nom, poids(cas), carte.mesure);
  if (!frequence) return null;
  return { specialite: meilleur.s.specialite, cas, texte: `${phraseBlanc(meilleur.s.specialite, vierges.length, meilleur.s.cas.length)} ${frequence}` };
}
