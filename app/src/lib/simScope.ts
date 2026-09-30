import type { Simulation, SimTeil } from '@/db/types';
import { partScore } from '@/lib/scoring';

// ============================================================================
// Portée d'une simulation. L'audit (§11.1) relevait TROIS règles contradictoires
// dans ce seul fichier ; ADR-0017 les tranche toutes les trois par
// l'architecture : il n'y a plus de score agrégé par cas, donc plus de règle à
// choisir. La progression vit dans `case_progress` (`lib/journal.ts`), par Teil.
// ============================================================================

export const TEILE: { key: SimTeil; label: string; icon: string; short: string }[] = [
  { key: 'anamnese', label: 'Anamnese', icon: 'dialog', short: 'Anam.' },
  { key: 'dokumentation', label: 'Dokumentation', icon: 'document', short: 'Doku' },
  { key: 'fallvorstellung', label: 'Fallvorstellung', icon: 'present', short: 'Vorst.' },
];

export const isTeil = (t: string | null | undefined): t is SimTeil => TEILE.some((x) => x.key === t);

/** Complète = déclarée complète, ou (historique) au moins deux parties jouées. */
export function isFullSimulation(sim: Simulation): boolean {
  if (sim.scope === 'teil') return false;
  if (sim.scope === 'full') return true;
  return Object.values(sim.parts).filter((p) => p?.done).length >= 2;
}

/**
 * @deprecated ADR-0017 §4.1 — un cas n'a plus de pourcentage, il a un état par
 * Teil (`case_progress`, `lib/journal.ts`). Cette fonction ne survit que le
 * temps que `lib/simulationSave.ts` (chantier C2) cesse d'écrire
 * `Case.confidence` / `Case.status`. Plus aucune vue ne la lit.
 *
 * Le `sum / TEILE.length` systématique est CORRIGÉ ici : il divisait la somme
 * des Teile JOUÉS par 3 en toutes circonstances, donc une Anamnese seule
 * réussie à 90 % donnait 30 — le cas régressait après une session réussie, et
 * remontait en tête des points faibles (audit §5). Tant qu'elle vit, elle ne
 * doit pas mentir.
 */
export function caseMastery(sims: Simulation[], caseId: string, extra?: Simulation): { score: number | null; parts: Partial<Record<SimTeil, number>> } {
  const latest: Partial<Record<SimTeil, { date: number; score: number }>> = {};
  const all = extra ? [...sims, extra] : sims;
  for (const sim of all) {
    if (sim.caseId !== caseId) continue;
    for (const t of TEILE) {
      const p = sim.parts[t.key];
      if (p?.done && (!latest[t.key] || sim.date >= latest[t.key]!.date)) latest[t.key] = { date: sim.date, score: partScore(p) };
    }
  }
  const parts: Partial<Record<SimTeil, number>> = {};
  let sum = 0; let played = 0;
  for (const t of TEILE) { const l = latest[t.key]; if (l) { parts[t.key] = l.score; sum += l.score; played++; } }
  return { score: played ? Math.round(sum / played) : null, parts };
}

export function scopeLabel(sim: Simulation): string {
  if (!isFullSimulation(sim)) { const t = TEILE.find((x) => x.key === sim.teil); return t ? `${t.label} seule` : 'Partie seule'; }
  return 'Complète';
}
