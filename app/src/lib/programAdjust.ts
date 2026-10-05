import type { Fortschrittsmodus, ProgramConfig } from '@/db/types';
import { ecrireConfig } from '@/lib/sync/configProjetee';

// ============================================================================
// Réglages du programme. Ce qui a disparu, et pourquoi (ADR-0017 §9) :
//
//  • `markLayerDone` / `doneLayers` — « fait » est une propriété d'une TÂCHE
//    datée (`TaskInstance.doneAt`), pas d'un cas. Marquer « fait » un bloc Teil
//    validait toute la couche et effaçait les deux Teile restants (audit §5).
//  • `postpone` — un cas reporté décalait toute sa chaîne de couches à chaque
//    recalcul. Le plan ne se recalcule plus.
//  • `extras` / `ExtraTask` — une tâche ajoutée à la main est une
//    `TaskInstance` ordinaire posée par `replanifier()`. Les extras étaient
//    réinjectés indéfiniment : on ne pouvait que les retirer, jamais les
//    terminer (audit §6).
//  • `skipDrillDates` — un jour non matérialisé n'a pas de drill.
//
// Ce qui reste : le mode d'avancement explicite et l'intensité, deux choix de l'utilisateur — chacun écrit la config
// COMPLÈTE par `ecrireConfig`, donc synchronisée (INV-76). La proposition de mode (`modusAProposer`) et son refus
// ont disparu : le mode est observé en silence (ADR-0021 décision 1).
// ============================================================================

/**
 * Le mode d'avancement EXPLICITE. Depuis la série 4 il n'a que deux valeurs à choisir : `specialite` et `examen-blanc`.
 * Tout le reste est OBSERVÉ en silence (`modeDuJour`) : `null` rend la main à l'observation et retire le choix. Changer de
 * mode ne réécrit AUCUN jour déjà figé : `DayPlan.mode` est figé à la matérialisation.
 */
export function setModus(config: ProgramConfig, modus: Fortschrittsmodus | null) {
  const { modus: _ancien, ...sans } = config;
  return ecrireConfig(modus ? { ...sans, modus } : sans);          // la config COMPLÈTE, jamais un fragment (INV-76 a)
}

/** Change l'intensité : le budget du jour suivant en tient compte. Les jours
 *  déjà figés gardent leur `targetMin`. */
export function setIntensity(config: ProgramConfig, intensity: ProgramConfig['intensity']) {
  return ecrireConfig({ ...config, intensity });      // idem : avant S4-2, rien n'était émis (INV-76 a)
}
