import type { Simulation } from '@/db/types';
import { isDemoSimulation } from '@/db/db';

// ============================================================================
// Ce qui est MESURÉ. L'indice de préparation de l'app est UN : celui de la
// frise de trajectoire (`lib/program/trajectory.ts`, ADR-0020), dérivé du
// journal. L'ancienne jauge « Prêt à réussir la FSP ? » et sa seconde formule
// (`computeReadiness`, axes pondérés) sont retirées — revue s3-programme D-I9 :
// une formule, un nom.
//
// CE QUI N'Y ENTRE PAS — décision de direction (30 sept. 2026). Une séance
// jouée dans une IA externe est AUTO-DÉCLARÉE : le candidat saisit lui-même son
// score, rien ne le mesure. Elle compte dans l'historique et dans la série —
// c'est du travail réel, et l'assiduité doit le reconnaître — mais elle
// n'entre PAS dans l'indice de préparation. L'indice est la seule surface qui
// doit dire la vérité avant l'examen : le laisser monter sur des scores
// déclarés en ferait un miroir de la confiance du candidat, exactement quand il
// a besoin d'un contradicteur. Même règle que INV-11 pour `CaseProgress`.
// ============================================================================

/** Une séance auto-déclarée : le score vient du candidat, pas d'une mesure.
 *  Un seul prédicat, un seul endroit — les appelants n'ont rien à filtrer.
 *  Une démo héritée (`sim-demo-*`) n'est pas non plus une mesure du candidat. */
export const estMesuree = (sim: Simulation): boolean => sim.mode !== 'external-ai' && !isDemoSimulation(sim.id);
