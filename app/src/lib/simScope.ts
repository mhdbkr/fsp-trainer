import type { Simulation, SimTeil } from '@/db/types';

// ============================================================================
// Portée d'une simulation (FB2-P). Règle pédagogique : une session d'UN Teil
// entraîne un axe et compte comme activité, mais ne fait pas évoluer la
// maîtrise du cas — on ne valide pas une couche sur une partie.
// ============================================================================

export const TEILE: { key: SimTeil; label: string; icon: string; short: string }[] = [
  { key: 'anamnese', label: 'Anamnese', icon: 'pain', short: 'Anam.' },
  { key: 'dokumentation', label: 'Dokumentation', icon: 'history', short: 'Doku' },
  { key: 'fallvorstellung', label: 'Fallvorstellung', icon: 'stethoscope', short: 'Vorst.' },
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
