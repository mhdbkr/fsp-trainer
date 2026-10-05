// ============================================================================
// Couverture pondérée par la fréquence — la MESURE (training-journal.md §13.6,
// ADR-0022 §6, INV-66). L'affichage est à S4-5. Le plan ne lit ni la ville ni
// cette mesure (INV-55).
//
// Chaque phrase nomme sa base et sa portée : ventilée par ville, ou toutes villes.
// Aucune n'est présentée comme « ce que le jury note » (garde EXAM_CLAIM).
// ============================================================================

import type { Case, CaseProgress, Center, SimTeil } from '@/db/types';

const TEILE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** Le nombre de protocoles où revient une pathologie : total, et ventilé par centre quand la donnée existe. */
export interface FrequenceProtocoles { total: number | null; parVille: Partial<Record<Center, number>> }
export type Frequences = Record<string, FrequenceProtocoles>;

export interface CouverturePonderee {
  pct: number | null;                          // null ⇔ aucune base
  base: number;                                // Σ des poids retenus (nombre de protocoles)
  portee: 'ville-ventilee' | 'toutes-villes';
  ville: Center | null;
}

/** Tant que la table ventilée n'est pas publiée dans l'app (proposition au pôle Contenu) :
 *  le total est `Case.frequency`, rien n'est ventilé. */
export const frequencesDeRepli = (cases: Case[]): Frequences =>
  Object.fromEntries(cases.map((c) => [c.id, { total: c.frequency, parVille: {} }]));

const compte = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** `'Alle'` (tous les centres) et `'Complément'` ne sont pas une ville. */
const villeDe = (v: string | null | undefined): Center | null => (v && v !== 'Alle' && v !== 'Complément' ? (v as Center) : null);

export function couverturePonderee(
  cases: Case[], progress: Map<string, CaseProgress>, freqs: Frequences, villeCible?: Center | 'Alle' | null,
): CouverturePonderee {
  const ville = villeDe(villeCible);
  const ventilee = !!ville && cases.some((c) => compte(freqs[c.id]?.parVille?.[ville]));
  let base = 0, travaille = 0;
  for (const c of cases) {
    const f = freqs[c.id];
    const poids = ventilee ? f?.parVille?.[ville!] : f?.total;       // undefined ⇒ hors calcul
    if (!compte(poids)) continue;
    const cp = progress.get(c.id);
    const couverture = cp ? TEILE.filter((t) => cp.teile[t].attempts >= 1).length : 0;
    base += poids;
    travaille += (poids * couverture) / 3;                            // chaque Teil travaillé pèse un tiers
  }
  return { pct: base === 0 ? null : Math.round((100 * travaille) / base), base, portee: ventilee ? 'ville-ventilee' : 'toutes-villes', ville: ventilee ? ville : null };
}

/** Le texte, ou `null` sans base : une phrase sans base ni portée n'est pas rendue (§12.9). */
export function phraseCouverture(r: CouverturePonderee): string | null {
  if (r.pct === null) return null;
  const tete = `Les cas que tu as travaillés représentent ${r.pct} % des protocoles, d'après ${r.base} protocoles`;
  return r.portee === 'ville-ventilee' ? `${tete} ventilés de ${r.ville}` : `${tete}, toutes villes`;
}
