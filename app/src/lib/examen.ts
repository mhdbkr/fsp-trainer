// ============================================================================
// Les conditions d'examen — UNE définition (décision (b) de la direction,
// training-journal.md §2.3 et §12.6). Elle classe un run en `examen-blanc` ET
// fonde l'état `prêt` : aucune autre fonction ne redit ce qu'est « l'examen ».
//
// Une partie est en conditions d'examen si et seulement si elle est :
//   • enchaînée (les trois Teile d'un trait, hors IA externe),
//   • jouée en Autonome,
//   • dans l'ordre A → D → F,
//   • avec la grille de langue SAISIE pour l'Anamnese et la Fallvorstellung.
// La couche n'y compte plus (décision (d)).
// ============================================================================

import type { ConditionExamen, LanguageGrid, SimTeil, Simulation } from '@/db/types';
import { LANGUAGE_CRITERIA, isEntered, languageGridEntered } from '@/lib/scoring';
import { TEILE, isFullSimulation } from '@/lib/simScope';

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

/** L'ordre de l'examen. */
export const ORDRE_EXAMEN: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** Discriminant « simulation série 4 » (m-e) : la présence de `reihenfolge`. Une
 *  valeur illisible n'est pas une présence — la partie se lit alors comme une ancienne. */
export const estSerie4 = (sim: Simulation): boolean => Array.isArray(sim.reihenfolge);

/** Les trois Teile ont été joués d'un trait : `Simulation.enchaine`, trois Teile faits, hors IA externe. */
export const estEnchaine = (sim: Simulation): boolean =>
  sim.enchaine === true && sim.mode !== 'external-ai' && TEIL_KEYS.every((t) => sim.parts?.[t]?.done === true);

/** Grille complète : les cinq critères saisis (la sentinelle −1 n'est pas une note, `0` en est une). */
const grilleSaisie = (g?: LanguageGrid): boolean =>
  languageGridEntered(g) && LANGUAGE_CRITERIA.every((c) => isEntered(g[c.key]));

/** Ce qui manque pour que la partie soit en conditions d'examen, dans l'ordre du contrat. */
export function conditionsManquantes(sim: Simulation): ConditionExamen[] {
  const manque: ConditionExamen[] = [];
  if (!estEnchaine(sim)) manque.push('enchaine');
  if (sim.assistance !== 'autonome') manque.push('autonome');
  if (!(Array.isArray(sim.reihenfolge) && sim.reihenfolge.join() === ORDRE_EXAMEN.join())) manque.push('ordre');
  if (!(grilleSaisie(sim.parts?.anamnese?.languageGrid) && grilleSaisie(sim.parts?.fallvorstellung?.languageGrid))) manque.push('grille');
  return manque;
}

export const conditionsExamen = (sim: Simulation): boolean => conditionsManquantes(sim).length === 0;

/** Un run classé `examen-blanc`. Série 4 : les conditions d'examen. Une ancienne partie
 *  garde la règle série 3 (complète, Autonome, couche 3) pour son GENRE — elle ne soude
 *  jamais (`examen` n'est dérivé que de `conditionsExamen`, décision (e)). */
export const isExamenBlanc = (sim: Simulation): boolean =>
  estSerie4(sim)
    ? conditionsExamen(sim)
    : !!sim.parts && isFullSimulation(sim) && sim.assistance === 'autonome' && sim.layer === 3
      && sim.mode !== 'external-ai';                        // m-1 : une séance IA externe n'est jamais un examen à blanc
