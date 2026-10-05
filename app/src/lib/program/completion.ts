// ============================================================================
// La complétion d'une tâche — DÉRIVÉE du journal, jamais figée à l'écriture.
// Contrat : training-journal.md §12.3 · ADR-0021 (I3, I4, I5, N1) · INV-51, INV-52.
//
// Avant la série 4, « faite » était posée à l'ÉCRITURE d'un exercice (`taskId`
// résolu au moment de la sauvegarde) : deux appareils pouvaient ne pas s'accorder,
// et une partie d'un Teil sur trois cochait une tâche « cas entier » ou non selon
// l'heure à laquelle elle avait été jouée. Désormais `doneAt` se calcule à la
// projection, depuis le journal synchronisé — au fuseau du plan (`DayPlan.tz`),
// pour TOUTES les tâches (cas, drill, Fachwissen, Aufklärung). Le `taskId` d'un
// exercice reste écrit à titre informatif (historique « dans le plan / libre »).
//
// Trois prédicats NOMMÉS (m-f), jamais « partie mesurée » sans qualificatif :
//   partieJouee          complétion — séance IA externe COMPRISE ;
//   partieMesuree        mesure : statut, maîtrise, solide, prêt, consolidation, durées ;
//   partieAvecChecklist  erreurs transversales seulement.
// ============================================================================

import type { SimTeil, TaskInstance, TaskKind, TrainingEvent, TrainingKind } from '@/db/types';
import { debutJour, finJour } from './fuseau';
import { teileDeTache } from './tacheDeCas';

const TEILE_ORDRE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** Une coche manuelle sans exercice mesuré derrière : tâche visée, 0 minute, ni score ni run.
 *  C'est une déclaration, pas un exercice. */
export const isCocheNue = (te: TrainingEvent): boolean => !!te.taskId && !te.laufId && !te.scores && te.spentMin === 0;

/** Un exercice de cas qui fait avancer une tâche de cas — le genre (`simulation` ou `examen-blanc`) ne compte pas (I3). */
export const partieJouee = (e: TrainingEvent): boolean =>
  (e.kind === 'simulation' || e.kind === 'examen-blanc') && !!e.caseId && !isCocheNue(e);

/** Une partie réellement MESURÉE : jamais une séance auto-déclarée, jamais sans score. */
export const partieMesuree = (e: TrainingEvent): boolean =>
  partieJouee(e) && e.selbstbewertet !== true && !!e.scores && Object.keys(e.scores).length > 0;

/** Une partie mesurée qui a une checklist pour ce Teil, aux ids d'origine stables (aucun `cl-N` : la dérivation n'en
 *  donne pas de `manques[t]`, §2.3). */
export const partieAvecChecklist = (e: TrainingEvent, t: SimTeil): boolean => partieMesuree(e) && e.manques?.[t] !== undefined;

/** Les tâches qui sont des cas. */
export const estTacheDeCas = (k: TaskKind): boolean => k === 'simulation' || k === 'revision' || k === 'examen-blanc';

/** Le genre d'exercice qui fait une tâche qui n'est pas un cas (N1). */
const GENRE_ATTENDU: Partial<Record<TaskKind, TrainingKind>> = { drill: 'drill', fachwissen: 'fiche', aufklaerung: 'aufklaerung' };

export type StatutTache = 'faite' | 'entamee' | 'a-faire';

export interface EtatTache {
  statut: StatutTache;
  /** `teileDeTache(T) ∩ teileJouesDepuis(T)` — vide hors cas (pas d'état « entamée » hors cas). */
  avancement: SimTeil[];
  /** `resteTache(T)` (§12.2). */
  reste: SimTeil[];
  /** Une tâche d'un trait dont les trois Teile ont été joués séparément : « à rejouer d'un trait » (I5). */
  aRejouerDUnTrait: boolean;
  /** Posés quand la tâche est faite : l'événement qui la rend vraie, et la somme des minutes qui y ont contribué. */
  doneAt?: number;
  eventId?: string;
  spentMin?: number;
  /** Les coches nues devenues redondantes parce que la tâche est aussi faite par des parties (D-C4, absorption). */
  absorbes: string[];
}

const ordre = (a: TrainingEvent, b: TrainingEvent) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Dans la tâche : le jour de la tâche, au fuseau du plan, et pas avant sa création. Les bornes du jour se comparent
 * en instants (`debutJour` ≤ at < `finJour`) : équivalent à `jourDe(at, tz) === T.date`, sans formater chaque événement.
 */
function fenetre(T: TaskInstance, tz?: string): { debut: number; fin: number } {
  const jour = debutJour(T.date, tz);
  return { debut: Math.max(jour, T.creeA ?? jour), fin: finJour(T.date, tz) };
}

/**
 * Évalue UNE tâche contre le journal. Pure : mêmes événements (dans n'importe quel ordre), même tâche, même fuseau →
 * même résultat, sur n'importe quel appareil (INV-51).
 */
export function evaluerTache(T: TaskInstance, events: readonly TrainingEvent[], tz?: string): EtatTache {
  const { debut, fin } = fenetre(T, tz);
  const dans = (e: TrainingEvent) => e.at >= debut && e.at < fin;
  const tri = [...events].sort(ordre);
  const coches = tri.filter((e) => isCocheNue(e) && e.taskId === T.id);

  if (!estTacheDeCas(T.kind)) {
    const genre = GENRE_ATTENDU[T.kind];
    const fait = genre === undefined ? undefined
      : tri.find((e) => e.kind === genre && !isCocheNue(e) && (T.caseId === undefined || e.caseId === T.caseId) && dans(e));
    const premiere = fait ?? coches[0];
    return {
      statut: premiere ? 'faite' : 'a-faire', avancement: [], reste: [], aRejouerDUnTrait: false,
      ...(premiere ? { doneAt: premiere.at, eventId: premiere.id, spentMin: premiere.spentMin } : {}),
      absorbes: fait ? coches.map((c) => c.id) : [],
    };
  }

  const voulus = teileDeTache(T);
  const joues = new Set<SimTeil>();
  let completion: TrainingEvent | undefined;
  let minutes = 0;
  for (const e of tri) {
    if (!partieJouee(e) || e.caseId !== T.caseId || !dans(e)) continue;
    if (!completion && e.teile.some((t) => voulus.includes(t))) minutes += e.spentMin;     // les parties qui ont contribué à l'avancement
    e.teile.forEach((t) => joues.add(t));
    if (!completion && (T.dUnTrait ? e.enchaine === true : voulus.every((t) => joues.has(t)))) completion = e;
  }
  const avancement = TEILE_ORDRE.filter((t) => voulus.includes(t) && joues.has(t));
  const aRejouerDUnTrait = T.dUnTrait === true && TEILE_ORDRE.every((t) => avancement.includes(t));
  const reste = aRejouerDUnTrait ? [...TEILE_ORDRE] : TEILE_ORDRE.filter((t) => voulus.includes(t) && !avancement.includes(t));

  const premiere = completion ?? coches[0];
  const statut: StatutTache = premiere ? 'faite' : avancement.length > 0 ? 'entamee' : 'a-faire';
  return {
    statut, avancement, reste, aRejouerDUnTrait,
    ...(premiere ? { doneAt: premiere.at, eventId: premiere.id, spentMin: completion ? minutes : premiere.spentMin } : {}),
    absorbes: completion ? coches.map((c) => c.id) : [],
  };
}

/** Faite, entamée ou à faire — jamais « manquée » (INV-52). */
export const statutTache = (T: TaskInstance, events: readonly TrainingEvent[], tz?: string): StatutTache => evaluerTache(T, events, tz).statut;

/** `resteTache(T)` (§12.2) : ce qui reste dans la journée. Un trait entièrement joué mais pas d'un trait : les trois. */
export const resteTache = (T: TaskInstance, events: readonly TrainingEvent[], tz?: string): SimTeil[] => evaluerTache(T, events, tz).reste;

/**
 * Pose `doneAt` / `spentMin` / `eventId` sur les tâches d'un plan, depuis le journal. Les coches nues redevenues
 * redondantes (la tâche est aussi faite par des parties) sont rendues dans `absorbes` : l'appelant les retire de
 * l'historique, rebuild comme incrémental — un seul chemin (INV-10).
 */
export function deriverPlan(plan: { date: string; tz?: string; tasks: TaskInstance[] }, events: readonly TrainingEvent[]): { tasks: TaskInstance[]; absorbes: string[] } {
  const ids = new Set(plan.tasks.map((t) => t.id));
  const jour = debutJour(plan.date, plan.tz), suivant = finJour(plan.date, plan.tz);
  // Seuls comptent : les événements du jour du plan, et les coches qui visent une de ses tâches (cochée après minuit).
  const utiles = events.filter((e) => (e.at >= jour && e.at < suivant) || (isCocheNue(e) && ids.has(e.taskId!)));
  const absorbes: string[] = [];
  const tasks = plan.tasks.map((t) => {
    const { doneAt: _d, spentMin: _s, eventId: _e, ...base } = t;
    const e = evaluerTache(t, utiles, plan.tz);
    absorbes.push(...e.absorbes);
    return e.doneAt !== undefined ? { ...base, doneAt: e.doneAt, spentMin: e.spentMin, eventId: e.eventId } : base;
  });
  return { tasks, absorbes: [...new Set(absorbes)] };
}
