// Le niveau d'assistance de la pré-simulation (fixeur S4-3, I2 et M7 — décisions de main, 5 oct.).
// La couche se fond dans le niveau (décision (d)) : elle n'est plus montrée, elle se DÉDUIT du niveau choisi.
import type { AssistanceMode, Layer, Simulation, TaskInstance } from '@/db/types';
import type { LayerAdvice } from '@/lib/layerAdvice';

export interface NiveauDeDepart {
  assistance: AssistanceMode;
  /** La phrase dite sous le choix : la raison de la tâche, ou celle du conseil. `null` : rien à dire. */
  raison: string | null;
  /** Le niveau qui porte le badge « Conseillé » ; `null` sans conseil (0 passage). */
  conseil: AssistanceMode | null;
}

/**
 * PURE. Qui choisit le niveau :
 *  1. une tâche du plan qui prescrit un niveau (examen à blanc → Autonome) — il l'emporte, sa raison est dite ;
 *  2. sinon, au moins un passage sur le cas : le conseil de `layerAdvice`, avec sa raison, sans le mot « couche » ;
 *  3. sinon, le dernier choix du candidat (`courant`), sans badge.
 * Les branches suivent celles de `computeLayerAdvice` (`lib/layerAdvice.ts`), dans le même ordre.
 */
export function niveauDeDepart({ advice, sims, caseId, courant, tache, layerProgress }: {
  advice: LayerAdvice; sims: readonly Simulation[] | undefined; caseId: string; courant: AssistanceMode; tache?: TaskInstance;
  /** `Case.layerProgress` : la couche atteinte, comme la lit `computeLayerAdvice`. */
  layerProgress?: Layer;
}): NiveauDeDepart {
  if (tache?.assistance) return { assistance: tache.assistance, raison: tache.reason || null, conseil: tache.assistance };
  if (!advice.attempts) return { assistance: courant, raison: null, conseil: null };
  const conseil: AssistanceMode = advice.suggestAutonome ? 'autonome' : 'assiste';
  const x = advice.lastScore ?? 0;
  const derniere = [...(sims ?? [])].filter((s) => s.caseId === caseId).sort((a, b) => b.date - a.date)[0];
  const atteinte = layerProgress ?? derniere?.layer ?? 1;
  const raison = !advice.suggestAutonome ? `Dernier essai à ${x} % : consolide en Assisté.`
    : derniere?.assistance === 'assiste' ? `Réussi en Assisté (${x} %) : passe en Autonome.`
    : x >= 80 && atteinte < 3 ? `${x} % en Autonome : continue sans filet.`
    : atteinte >= 3 ? `Déjà maîtrisé (meilleur ${advice.bestScore ?? x} %) : entretiens-le en Autonome.`
    : `Réussi à ${x} % : encore un passage en Autonome, vise 80 %.`;
  return { assistance: conseil, raison, conseil };
}

/** M7 — la couche ÉCRITE (`Lauf.layer`, pour l'historique et le conseil suivant) se déduit du niveau choisi :
 *  la tâche qui la prescrit la donne ; Assisté ⇒ couche 1 ; Autonome ⇒ au moins la couche 2, la couche conseillée
 *  si elle est plus haute. C'est l'inverse de la règle du plan (`dayPlan.ts` : couche 1 ⇔ Assisté). */
export function couchePour(assistance: AssistanceMode, advice: Pick<LayerAdvice, 'layer'>, tache?: Pick<TaskInstance, 'layer'>): Layer {
  if (tache?.layer) return tache.layer;
  return assistance === 'assiste' ? 1 : (Math.max(2, advice.layer) as Layer);
}
