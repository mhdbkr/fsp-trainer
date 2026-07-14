import { db } from '@/db/db';
import type { ExtraTask, ProgramAdjust, ProgramConfig } from '@/db/types';

// ============================================================================
// Actions manuelles sur le programme de révision. Elles écrivent dans
// `config.adjust` (persisté dans db.meta['program']). Le planificateur relit
// ces ajustements à chaque recalcul et RE-RAISONNE la suite du plan :
//  • marquer une couche faite → le cas avance, la couche suivante se replanifie ;
//  • reporter un cas → toute sa chaîne de couches glisse plus tard ;
//  • ajouter une révision → tâche injectée à la date choisie ;
//  • annuler le drill d'un jour → libéré du budget de ce jour.
// ============================================================================

async function patch(config: ProgramConfig, mutate: (a: ProgramAdjust) => void): Promise<void> {
  const adjust: ProgramAdjust = {
    doneLayers: { ...(config.adjust?.doneLayers ?? {}) },
    postpone: { ...(config.adjust?.postpone ?? {}) },
    skipDrillDates: [...(config.adjust?.skipDrillDates ?? [])],
    extras: [...(config.adjust?.extras ?? [])],
  };
  mutate(adjust);
  await db.meta.put({ key: 'program', value: { ...config, adjust } });
}

/** Marque la couche `layer` d'un cas comme faite (sans lancer de simulation). */
export function markLayerDone(config: ProgramConfig, caseId: string, layer: number) {
  return patch(config, (a) => {
    a.doneLayers![caseId] = Math.max(a.doneLayers![caseId] ?? 0, layer);
    // Un cas repris n'est plus reporté.
    delete a.postpone![caseId];
  });
}

/** Annule la dernière validation manuelle d'un cas (retour en arrière). */
export function unmarkCase(config: ProgramConfig, caseId: string) {
  return patch(config, (a) => { delete a.doneLayers![caseId]; });
}

/** Reporte la couche suivante d'un cas de `days` jours ouvrés (par défaut +2). */
export function postponeCase(config: ProgramConfig, caseId: string, days = 2) {
  return patch(config, (a) => { a.postpone![caseId] = (a.postpone![caseId] ?? 0) + days; });
}

/** Ajoute une tâche (révision, drill, fachwissen…) à une date donnée. */
export function addExtra(config: ProgramConfig, task: Omit<ExtraTask, 'id'>) {
  return patch(config, (a) => { a.extras!.push({ ...task, id: `x-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }); });
}

/** Retire une tâche ajoutée manuellement. */
export function removeExtra(config: ProgramConfig, id: string) {
  return patch(config, (a) => { a.extras = a.extras!.filter((e) => e.id !== id); });
}

/** Bascule l'annulation du drill d'un jour (date ISO). */
export function toggleSkipDrill(config: ProgramConfig, date: string) {
  return patch(config, (a) => {
    a.skipDrillDates = a.skipDrillDates!.includes(date)
      ? a.skipDrillDates!.filter((d) => d !== date)
      : [...a.skipDrillDates!, date];
  });
}

/** Change l'intensité du plan (recalcul immédiat du budget horaire quotidien). */
export function setIntensity(config: ProgramConfig, intensity: ProgramConfig['intensity']) {
  return db.meta.put({ key: 'program', value: { ...config, intensity } });
}

/** Réinitialise tous les ajustements manuels (repart d'un plan « propre »). */
export function resetAdjust(config: ProgramConfig) {
  return db.meta.put({ key: 'program', value: { ...config, adjust: undefined } });
}
