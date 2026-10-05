// Les erreurs transversales (training-journal.md §13.3, ADR-0022 §3, INV-63).
//
// Source : `TrainingEvent.manques`, les ids STABLES des items de checklist — jamais `prioritizedCorrections`. Une partie
// n'entre dans la fenêtre d'un Teil que si elle a une checklist pour ce Teil (`partieAvecChecklist`) : une partie d'avant
// le pont de checklist, reconstruite décochée, signalerait tout. Rien n'est stocké : tout se relit dans le journal.
import type { ChecklistItemId, SimTeil, TaskInstance, TrainingEvent } from '@/db/types';
import { checklistFor } from '@/lib/checklists';
import { partieAvecChecklist } from './completion';
import { ERREUR_CAS_MIN, ERREUR_FENETRE, ERREUR_SEUIL } from './parametres';
import { teileDeTache } from './tacheDeCas';

const TEILE_ORDRE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

export interface ErreurTransversale {
  teil: SimTeil;
  item: ChecklistItemId;
  /** Dans combien des parties de la fenêtre l'item est resté décoché. */
  manques: number;
  /** La taille de la fenêtre (au plus `ERREUR_FENETRE`). */
  sur: number;
  /** Sur combien de cas distincts. */
  cas: number;
}

/** Les items manqués dans `≥ ERREUR_SEUIL` des `ERREUR_FENETRE` dernières `partieAvecChecklist` de leur Teil, sur
 *  `≥ ERREUR_CAS_MIN` cas distincts. Ordre : Teil d'examen, puis le plus manqué, puis l'id (déterministe). */
export function erreursTransversales(events: readonly TrainingEvent[]): ErreurTransversale[] {
  const out: ErreurTransversale[] = [];
  for (const teil of TEILE_ORDRE) {
    const fenetre = events.filter((e) => partieAvecChecklist(e, teil))
      .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(-ERREUR_FENETRE);
    const parItem = new Map<ChecklistItemId, TrainingEvent[]>();
    for (const e of fenetre) for (const item of new Set(e.manques![teil]!)) parItem.set(item, [...(parItem.get(item) ?? []), e]);
    const signaux: ErreurTransversale[] = [];
    for (const [item, ou] of parItem) {
      const cas = new Set(ou.map((e) => e.caseId)).size;
      if (ou.length >= ERREUR_SEUIL && cas >= ERREUR_CAS_MIN) signaux.push({ teil, item, manques: ou.length, sur: fenetre.length, cas });
    }
    out.push(...signaux.sort((a, b) => b.manques - a.manques || (a.item < b.item ? -1 : 1)));
  }
  return out;
}

/** Les tâches qui peuvent porter un rappel : un cas à jouer — jamais un examen à blanc ni une tâche d'un trait (T1). */
const peutRappeler = (t: TaskInstance): boolean => (t.kind === 'simulation' || t.kind === 'revision') && t.dUnTrait !== true;

/**
 * Pose les rappels d'un jour (ne modifie pas `tasks`) : chaque signal est dit UNE fois, par la première tâche éligible qui
 * contient son Teil ; une tâche porte au plus un rappel.
 */
export function poserRappels(tasks: TaskInstance[], signaux: readonly ErreurTransversale[]): TaskInstance[] {
  const dits = new Set<ChecklistItemId>();
  return tasks.map((t) => {
    if (!peutRappeler(t)) return t;
    const teile = teileDeTache(t);
    const s = signaux.find((x) => !dits.has(x.item) && teile.includes(x.teil));
    if (!s) return t;
    dits.add(s.item);
    return { ...t, rappel: s.item };
  });
}

const PLURIEL: Record<SimTeil, string> = { anamnese: 'Anamnesen', dokumentation: 'Dokumentationen', fallvorstellung: 'Fallvorstellungen' };

/** L'intitulé de l'item, tel que la checklist le montre. */
export const libelleItem = (item: ChecklistItemId, teil?: SimTeil): string | null => {
  for (const t of teil ? [teil] : TEILE_ORDRE) {
    const i = checklistFor(t).find((x) => x.id === item);
    if (i) return i.label;
  }
  return null;
};

/** Le texte NEUTRE (T2) : le fait, sans jugement. « « Allergien … » manque dans 3 de tes 5 dernières Anamnesen. » */
export const texteRappel = (s: ErreurTransversale): string =>
  `« ${libelleItem(s.item, s.teil) ?? s.item} » manque dans ${s.manques} de tes ${s.sur} dernières ${PLURIEL[s.teil]}.`;
