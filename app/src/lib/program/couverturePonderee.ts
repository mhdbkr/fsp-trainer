// ============================================================================
// Couverture pondérée par la fréquence — la MESURE (training-journal.md §13.6,
// ADR-0022 §6, INV-66). Le plan ne lit ni la ville ni cette mesure (INV-55).
//
// [S4-5, décision de `main` après la revue direction] La BASE est le nombre de protocoles relevés par la source
// (`n`, ou le `n` de la ville quand elle est ventilée) — jamais la somme des fréquences des cas. Une fréquence se dit
// par PATHOLOGIE : deux cas qui partagent une pathologie ne l'additionnent pas une seconde fois.
// Chaque phrase nomme sa base et sa portée. Aucune n'est présentée comme « ce que le jury note » (garde EXAM_CLAIM).
// ============================================================================

import type { Case, CaseProgress, Center, SimTeil } from '@/db/types';
import { CAS_PATHOLOGIE, PATHOLOGIES, PROTOCOLES_N, PROTOCOLES_PAR_VILLE, type PathologieProtocoles } from '@/data/frequencesProtocoles';

const TEILE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** La table de la source : les protocoles relevés (`n`, par ville), les pathologies, et le cas → sa pathologie. */
export interface Frequences {
  n: number;
  parVille: Partial<Record<Center, number>>;
  pathologies: Record<string, PathologieProtocoles>;
  cas: Record<string, string>;
}
export const FREQUENCES: Frequences = { n: PROTOCOLES_N, parVille: PROTOCOLES_PAR_VILLE, pathologies: PATHOLOGIES, cas: CAS_PATHOLOGIE };

export interface CouverturePonderee {
  pct: number | null;                          // null ⇔ aucune pathologie pesée
  base: number;                                // protocoles relevés : `n`, ou `n` de la ville ventilée
  portee: 'ville-ventilee' | 'toutes-villes';
  ville: Center | null;
}

const compte = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** `'Alle'` (tous les centres) et `'Complément'` ne sont pas une ville. */
const villeDe = (v: string | null | undefined): Center | null => (v && v !== 'Alle' && v !== 'Complément' ? (v as Center) : null);

/** La pathologie source d'un cas, ou `undefined` (un cas que la source ne compte pas). */
export const pathologieDe = (f: Frequences, caseId: string): (PathologieProtocoles & { id: string }) | undefined => {
  const id = f.cas[caseId];
  return id && f.pathologies[id] ? { id, ...f.pathologies[id] } : undefined;
};

/** Le poids d'un cas dans la mesure `r` : le compte de SA pathologie (dans la ville si elle est ventilée) ;
 *  `undefined` ⇒ hors calcul. */
export const poidsDe = (f: Frequences, caseId: string, r: Pick<CouverturePonderee, 'portee' | 'ville'>): number | undefined => {
  const p = pathologieDe(f, caseId);
  const v = r.portee === 'ville-ventilee' ? p?.parVille?.[r.ville!] : p?.total;
  return compte(v) ? v : undefined;
};

export function couverturePonderee(
  cases: Case[], progress: Map<string, CaseProgress>, freqs: Frequences, villeCible?: Center | 'Alle' | null,
): CouverturePonderee {
  const ville = villeDe(villeCible);
  const nVille = ville ? freqs.parVille[ville] : undefined;
  const ventilee = !!ville && compte(nVille) && nVille > 0 && cases.some((c) => compte(pathologieDe(freqs, c.id)?.parVille?.[ville]));
  const r = { portee: ventilee ? 'ville-ventilee' : 'toutes-villes', ville: ventilee ? ville : null } as const;
  const base = ventilee ? nVille! : freqs.n;
  // Par pathologie : son poids UNE fois, et la couverture MOYENNE de ses cas (chaque Teil travaillé pèse un tiers).
  const parPatho = new Map<string, { poids: number; couvertures: number[] }>();
  for (const c of cases) {
    const poids = poidsDe(freqs, c.id, r);
    if (poids === undefined) continue;
    const cp = progress.get(c.id);
    const couverture = cp ? TEILE.filter((t) => cp.teile[t].attempts >= 1).length : 0;
    const p = parPatho.get(freqs.cas[c.id]) ?? { poids, couvertures: [] };
    p.couvertures.push(couverture / 3);
    parPatho.set(freqs.cas[c.id], p);
  }
  const travaille = [...parPatho.values()].reduce((s, p) => s + (p.poids * p.couvertures.reduce((a, b) => a + b, 0)) / p.couvertures.length, 0);
  const pese = [...parPatho.values()].some((p) => p.poids > 0);
  return { pct: !pese || base <= 0 ? null : Math.min(100, Math.round((100 * travaille) / base)), base, ...r };
}

/** « relevés à Stuttgart » / « relevés, tous centres » — la portée d'un compte, dite telle quelle. */
const portee = (r: CouverturePonderee): string => (r.portee === 'ville-ventilee' ? ` relevés à ${r.ville}` : ' relevés, tous centres');

/** Le texte, ou `null` sans pathologie pesée : une phrase sans base ni portée n'est pas rendue (§12.9). */
export function phraseCouverture(r: CouverturePonderee): string | null {
  if (r.pct === null) return null;
  return `Les cas que tu as travaillés représentent ${r.pct} % des ${r.base} protocoles${portee(r)}`;
}

/** §12.9 : la fréquence d'UNE pathologie dans un encart, sous le nom de la source, avec la base et la portée ;
 *  sans donnée, pas de phrase. */
export function phraseFrequence(nom: string, poids: number | undefined, r: CouverturePonderee): string | null {
  if (!compte(poids) || poids === 0 || r.base <= 0) return null;
  return `« ${nom} » est tombé dans ${poids} des ${r.base} protocoles${portee(r)}.`;
}
