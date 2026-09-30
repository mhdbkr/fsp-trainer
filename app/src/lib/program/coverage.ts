// ============================================================================
// Le champ de couverture — le corpus en spécialités × Teile, qui se remplit.
// ADR-0020 §3 et §4.
//
// Il remplace la heatmap spécialité × axe, qui n'était pas réparable : elle
// lisait `axisScores[a]`, une valeur GLOBALE, et affichait donc le même chiffre
// sur ses cinq spécialités en dur (`HomePage.tsx:259-261`, le commentaire
// l'admettait). L'information qu'elle prétendait porter n'existait pas dans sa
// source.
//
// Trois états, et le champ NE PEUT PAS ACCUSER PAR ABSENCE : `vierge` est
// « pas encore travaillé », en teinte neutre, jamais un défaut.
// ============================================================================

import type { Case, CaseProgress, SimTeil, Specialty } from '@/db/types';
import { blankProgress } from '@/lib/journal';
import { TEILE } from '@/lib/simScope';

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

export type CoverageState = 'vierge' | 'entame' | 'solide';

export interface CoverageCell {
  specialty: Specialty;
  teil: SimTeil;
  vierge: number;
  entame: number;                       // = fragile ∪ acquis (ADR-0020 §4)
  solide: number;
  total: number;
  /** L'état dominant de la cellule, pour la teinte. */
  state: CoverageState;
}

export interface CoverageField {
  specialties: Specialty[];             // ordre d'affichage : le corpus, pas une liste en dur
  teile: SimTeil[];
  cells: CoverageCell[];
}

/** Le champ complet. Toutes les spécialités RÉELLEMENT présentes dans le corpus
 *  — jamais cinq en dur sur dix-sept. */
export function coverageField(cases: Case[], progress: Map<string, CaseProgress>): CoverageField {
  const bySpec = new Map<Specialty, Case[]>();
  for (const c of cases) bySpec.set(c.specialty, [...(bySpec.get(c.specialty) ?? []), c]);

  const cells: CoverageCell[] = [];
  for (const [specialty, list] of bySpec) {
    for (const teil of TEIL_KEYS) {
      let vierge = 0, entame = 0, solide = 0;
      for (const c of list) {
        const s = (progress.get(c.id) ?? blankProgress(c.id)).teile[teil].status;
        if (s === 'vierge') vierge++;
        else if (s === 'solide') solide++;
        else entame++;
      }
      const total = list.length;
      cells.push({
        specialty, teil, vierge, entame, solide, total,
        state: solide === total ? 'solide' : solide + entame === 0 ? 'vierge' : 'entame',
      });
    }
  }
  // Les spécialités les moins couvertes d'abord : ce qui reste à faire se lit
  // en haut, sans qu'aucune cellule ne soit teintée comme un échec.
  const couverture = (sp: Specialty) => {
    const c = cells.filter((x) => x.specialty === sp);
    const t = c.reduce((s, x) => s + x.total, 0) || 1;
    return c.reduce((s, x) => s + x.solide, 0) / t;
  };
  const specialties = [...bySpec.keys()].sort((a, b) => couverture(a) - couverture(b) || (a < b ? -1 : 1));
  return { specialties, teile: TEIL_KEYS, cells };
}

export const cellOf = (field: CoverageField, specialty: Specialty, teil: SimTeil): CoverageCell | undefined =>
  field.cells.find((c) => c.specialty === specialty && c.teil === teil);

/**
 * Toucher une cellule PROPOSE l'exercice : le cas de cette spécialité dont ce
 * Teil est le moins avancé, le plus fréquent d'abord. Une proposition, jamais
 * une imposition — elle ne matérialise rien et ne modifie aucun plan.
 */
export function suggestForCell(
  cases: Case[], progress: Map<string, CaseProgress>, specialty: Specialty, teil: SimTeil,
): Case | null {
  const rank: Record<string, number> = { vierge: 0, fragile: 1, acquis: 2, solide: 3 };
  const pool = cases
    .filter((c) => c.specialty === specialty)
    .map((c) => ({ c, status: (progress.get(c.id) ?? blankProgress(c.id)).teile[teil].status }))
    .filter((x) => x.status !== 'solide')
    // Une partie mesurée FRAGILE passe devant une partie jamais tentée : on
    // corrige ce qui a raté avant d'élargir.
    .sort((a, b) => (a.status === 'fragile' ? -1 : 0) - (b.status === 'fragile' ? -1 : 0)
      || rank[a.status] - rank[b.status]
      || b.c.frequency - a.c.frequency);
  return pool[0]?.c ?? null;
}
