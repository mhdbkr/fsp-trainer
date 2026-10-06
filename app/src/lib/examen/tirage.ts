// ============================================================================
// Le tirage du cas de l'Examen (simulation-run.md §11.5, décision 1, arrêtée par la direction le 6 oct.).
// Porté de `feat/pruefungstag` (examDayPick.ts : tirage cumulatif, aléatoire injectable, relâchement) ; POIDS REFAITS :
//   · une pathologie pèse UNE fois : son compte de protocoles TOUS CENTRES (`frequencesProtocoles.ts`), partagé entre ses
//     cas éligibles. Raffinement optionnel (app personnelle) : la ville visée, si elle est choisie et ventilée — isolé
//     dans `raffinementVille`, qui se retire sans rien casser (direction, 6 oct. : la prod n'aura plus de centres) ;
//   · un cas absent de la source, ou de compte nul, prend `FREQUENCE_PLANCHER` ;
//   · un cas vierge (aucun `CaseProgress`, ou état `vierge`) pèse ×2 ;
//   · les cas joués depuis moins de 14 jours sont exclus ; s'ils le sont tous, l'exclusion est levée. `prêt` n'exclut pas.
// ============================================================================
import type { Case, CaseProgress, Center, TrainingEvent } from '@/db/types';
import { FREQUENCE_PLANCHER } from '@/data/frequencesProtocoles';
import { FREQUENCES, couverturePonderee, poidsDe, type Frequences } from '@/lib/program/couverturePonderee';

export type SourceTirage = Frequences;

/** Un cas joué plus récemment que cela ne revient pas à l'Examen (sauf si tous l'ont été). */
export const EXCLUSION_JOURS = 14;
const JOUR_MS = 86_400_000;

export interface EntreeTirage {
  cases: readonly Case[];
  journal: readonly TrainingEvent[];
  progress: ReadonlyMap<string, CaseProgress>;
  maintenant: number;
  /** Raffinement optionnel : voir `raffinementVille`. Absent ⇒ tous centres. */
  ville?: Center | 'Alle' | null;
}

type Portee = Parameters<typeof poidsDe>[2];
const TOUS_CENTRES: Portee = { portee: 'toutes-villes', ville: null };

/** LE seul point où la ville entre dans le tirage. Pour le retirer : supprimer cette fonction et `EntreeTirage.ville`.
 *  La portée est celle de la mesure de couverture : la ville seulement si elle est choisie ET ventilée par la source. */
function raffinementVille(e: EntreeTirage, source: SourceTirage): Portee {
  return e.ville ? couverturePonderee([...e.cases], new Map(), source, e.ville) : TOUS_CENTRES;
}

const estVierge = (cp?: CaseProgress) => (cp?.etat ?? cp?.overall ?? 'vierge') === 'vierge';

/** Les cas éligibles (exclusion des 14 jours, levée si elle vide tout) et leur poids. */
export function poidsTirage(e: EntreeTirage, source: SourceTirage = FREQUENCES): Map<string, number> {
  const recents = new Set(e.journal
    .filter((x) => (x.kind === 'simulation' || x.kind === 'examen-blanc') && x.caseId && e.maintenant - x.at < EXCLUSION_JOURS * JOUR_MS)
    .map((x) => x.caseId!));
  const libres = e.cases.filter((c) => !recents.has(c.id));
  const pool = libres.length ? libres : e.cases;
  const portee = raffinementVille(e, source);
  const cle = (c: Case) => (poidsDe(source, c.id, portee) === undefined ? `cas:${c.id}` : source.cas[c.id]);
  const parPatho = new Map<string, number>();
  for (const c of pool) parPatho.set(cle(c), (parPatho.get(cle(c)) ?? 0) + 1);
  return new Map(pool.map((c) => {
    const poids = Math.max(poidsDe(source, c.id, portee) ?? 0, FREQUENCE_PLANCHER);
    return [c.id, (poids / parPatho.get(cle(c))!) * (estVierge(e.progress.get(c.id)) ? 2 : 1)];
  }));
}

/** Tirage cumulatif dans l'ordre de `cases`. `null` sans cas. */
export function tireCas(e: EntreeTirage, rng: () => number = Math.random, source: SourceTirage = FREQUENCES): Case | null {
  const poids = poidsTirage(e, source);
  const pool = e.cases.filter((c) => poids.has(c.id));
  if (!pool.length) return null;
  const total = pool.reduce((s, c) => s + poids.get(c.id)!, 0);
  let r = rng() * total;
  for (const c of pool) {
    const w = poids.get(c.id)!;
    if (r < w) return c;
    r -= w;
  }
  return pool[pool.length - 1];
}
