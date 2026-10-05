import { setMeta } from '@/db/db';
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
// Ce qui reste : le mode d'avancement et l'intensité, deux choix de l'utilisateur.
// ============================================================================

/** Clé du mode explicitement REFUSÉ par le candidat, pour ne pas le reproposer. */
export const MODUS_REFUSE_KEY = 'modusRefuse';

/**
 * Le mode d'avancement. Il n'est plus DEMANDÉ à l'inscription (décision de
 * direction du 30 sept. 2026) : l'app l'observe et le propose. Ce réglage reste
 * la commande explicite — confirmer une proposition passe par ici. Changer de
 * mode ne réécrit AUCUN jour déjà figé : `DayPlan.mode` est figé à la
 * matérialisation.
 */
export function setModus(config: ProgramConfig, modus: Fortschrittsmodus) {
  return ecrireConfig({ ...config, modus });          // la config COMPLÈTE, jamais un fragment (INV-76 a)
}

/** Change l'intensité : le budget du jour suivant en tient compte. Les jours
 *  déjà figés gardent leur `targetMin`. */
export function setIntensity(config: ProgramConfig, intensity: ProgramConfig['intensity']) {
  return ecrireConfig({ ...config, intensity });      // idem : avant S4-2, rien n'était émis (INV-76 a)
}

/** « Non, laisse » — le refus se retient, sinon la proposition harcèle. Il ne
 *  vaut que pour CE mode : si l'usage change et en désigne un autre, la
 *  question redevient légitime (`modusAProposer`). */
export const refuserModus = (modus: Fortschrittsmodus) => setMeta(MODUS_REFUSE_KEY, modus);
