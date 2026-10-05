// ============================================================================
// La tâche de cas (training-journal.md §12.1, §12.2, §12.3).
//
// `teileDeTache` est de S4-1 (le cadran en a besoin) ; `restePlan`, `resteTache`,
// `statutTache` et `lireTache` sont à S4-2. `restePlan` est LA fonction « ce qui
// reste » pour PLANIFIER le jour D (INV-67) ; `resteTache` dit ce qui reste DANS la
// journée, pour une tâche déjà figée. Une fonction, deux usages.
// ============================================================================

import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { CaseProgress, SimTeil, TaskInstance } from '@/db/types';
import { checklistFor } from '@/lib/checklists';
import { SOLIDE_ECART_JOURS } from './parametres';
import { debutJour, finJour, jourDe } from './fuseau';

const TEILE_ORDRE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** Lecture tolérante — LE SEUL point qui lit `TaskInstance.teil` (plans série 3). */
export function teileDeTache(t: TaskInstance): SimTeil[] {
  if (t.teile?.length) return t.teile;
  if (t.teil) return [t.teil];
  return t.kind === 'simulation' || t.kind === 'revision' || t.kind === 'examen-blanc' ? [...TEILE_ORDRE] : [];
}

/**
 * Ce qui reste à PLANIFIER pour le cas le jour `D` (§12.2), dans l'ordre d'examen : les Teile non solides, sauf ceux
 * joués il y a moins de `SOLIDE_ECART_JOURS` jours calendaires (réserve R2 : les rejouer avant l'écart ne peut pas les
 * rendre solides, §13.2 — le cas revient quand ils peuvent progresser). `tz` : le fuseau du plan, pour que deux appareils
 * lisent le même jour.
 */
export function restePlan(cp: CaseProgress | undefined, D: string, tz?: string): SimTeil[] {
  return TEILE_ORDRE.filter((t) => {
    const p = cp?.teile[t];
    if (!p) return true;
    if (p.status === 'solide') return false;
    if (p.lastAt !== null && differenceInCalendarDays(parseISO(D), parseISO(jourDe(p.lastAt, tz))) < SOLIDE_ECART_JOURS) return false;
    return true;
  });
}

export { resteTache, statutTache, type StatutTache } from './completion';

/**
 * Le filtrage OBLIGATOIRE d'une tâche venue de la synchro (m4, §12.1) : un autre appareil, un client ancien ou un
 * compte qui écrit par REST peuvent fournir n'importe quoi. Un champ invalide est retiré ; la tâche, jamais — sauf si
 * elle n'a pas d'identifiant.
 *  • `teile` : les trois clés connues, dédoublonnées, remises dans l'ordre d'examen ; vide ⇒ absent ;
 *  • `rappel` : conservé seulement s'il appartient à la checklist d'un Teil de la tâche ;
 *  • `dUnTrait` : seulement exactement `true` ;
 *  • `creeA` : un entier fini compris dans le jour du plan, au fuseau du plan ;
 *  • `teil` (plans série 3) : lu, mais seulement s'il est un Teil connu.
 */
export function lireTache(raw: unknown, plan: { date: string; tz?: string }): TaskInstance | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const t = { ...(raw as Record<string, unknown>) };
  if (typeof t.id !== 'string' || t.id.length === 0) return null;

  if (Array.isArray(t.teile)) {
    const vus = TEILE_ORDRE.filter((k) => (t.teile as unknown[]).includes(k));
    if (vus.length) t.teile = vus; else delete t.teile;
  } else delete t.teile;
  if (t.teil !== undefined && !TEILE_ORDRE.includes(t.teil as SimTeil)) delete t.teil;

  if (t.rappel !== undefined) {
    const autorises = new Set(teileDeTache(t as unknown as TaskInstance).flatMap((k) => checklistFor(k).map((i) => i.id)));
    if (typeof t.rappel !== 'string' || !autorises.has(t.rappel)) delete t.rappel;
  }
  if (t.dUnTrait !== undefined && t.dUnTrait !== true) delete t.dUnTrait;
  if (t.creeA !== undefined) {
    const c = t.creeA;
    if (typeof c !== 'number' || !Number.isInteger(c) || c < debutJour(plan.date, plan.tz) || c >= finJour(plan.date, plan.tz)) delete t.creeA;
  }
  return t as unknown as TaskInstance;
}
