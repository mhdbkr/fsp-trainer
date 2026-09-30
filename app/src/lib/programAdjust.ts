import { db } from '@/db/db';
import type { Fortschrittsmodus, ProgramConfig } from '@/db/types';

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
// Ce qui reste : le mode d'avancement et l'intensité, deux choix de l'utilisateur.
// ============================================================================

const key = () => 'program';

/**
 * Le mode d'avancement, demandé UNE FOIS et jamais deviné. Changer de mode ne
 * réécrit AUCUN jour déjà figé : `DayPlan.mode` est figé à la matérialisation.
 */
export function setModus(config: ProgramConfig, modus: Fortschrittsmodus) {
  return db.meta.put({ key: key(), value: { ...config, modus } });
}

/** Change l'intensité : le budget du jour suivant en tient compte. Les jours
 *  déjà figés gardent leur `targetMin`. */
export function setIntensity(config: ProgramConfig, intensity: ProgramConfig['intensity']) {
  return db.meta.put({ key: key(), value: { ...config, intensity } });
}
