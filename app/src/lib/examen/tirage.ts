// ============================================================================
// Le tirage du cas de l'Examen (simulation-run.md §11.5, décision 1 de `main`, à confirmer par la direction).
// Porté de `feat/pruefungstag` (examDayPick.ts : tirage cumulatif, aléatoire injectable, relâchement) ; POIDS REFAITS :
//   · une pathologie pèse UNE fois : son compte de protocoles (`frequencesProtocoles.ts`), dans la ville visée si elle est
//     ventilée, sinon tous centres — la portée de `couverturePonderee` —, partagé entre ses cas éligibles ;
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
  ville?: Center | 'Alle' | null;
}

const estVierge = (cp?: CaseProgress) => (cp?.etat ?? cp?.overall ?? 'vierge') === 'vierge';

/** Les cas éligibles (exclusion des 14 jours, levée si elle vide tout) et leur poids. */
export function poidsTirage(e: EntreeTirage, source: SourceTirage = FREQUENCES): Map<string, number> {
  const recents = new Set(e.journal
    .filter((x) => (x.kind === 'simulation' || x.kind === 'examen-blanc') && x.caseId && e.maintenant - x.at < EXCLUSION_JOURS * JOUR_MS)
    .map((x) => x.caseId!));
  const libres = e.cases.filter((c) => !recents.has(c.id));
  const pool = libres.length ? libres : e.cases;
  // La portée (ville ventilée ou tous centres), exactement celle de la mesure de couverture.
  const portee = couverturePonderee([...e.cases], new Map(), source, e.ville);
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
