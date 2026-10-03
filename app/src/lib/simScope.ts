import type { Simulation, SimTeil } from '@/db/types';

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

export function scopeLabel(sim: Simulation): string {
  if (!isFullSimulation(sim)) { const t = TEILE.find((x) => x.key === sim.teil); return t ? `${t.label} seule` : 'Partie seule'; }
  return 'Complète';
}
