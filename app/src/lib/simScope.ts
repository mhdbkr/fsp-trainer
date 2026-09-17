import type { Simulation, SimTeil } from '@/db/types';
import { partScore } from '@/lib/scoring';

// ============================================================================
// Portée d'une simulation (FB2-P). Règle pédagogique : une session d'UN Teil
// entraîne un axe et compte comme activité, mais ne fait pas évoluer la
// maîtrise du cas — on ne valide pas une couche sur une partie.
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

/** Maîtrise d'un cas au PRORATA des trois parties (retour direction, 17 sept.) :
 *  pour chaque Teil, le dernier résultat joué — en session complète ou seule —
 *  compte ; une partie jamais jouée vaut 0. Toute session fait donc avancer le
 *  cas, et un cas n'est « maîtrisé » que quand ses trois parties le sont. */
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
  let sum = 0; let any = false;
  for (const t of TEILE) { const l = latest[t.key]; if (l) { parts[t.key] = l.score; sum += l.score; any = true; } }
  return { score: any ? Math.round(sum / TEILE.length) : null, parts };
}

export function scopeLabel(sim: Simulation): string {
  if (!isFullSimulation(sim)) { const t = TEILE.find((x) => x.key === sim.teil); return t ? `${t.label} seule` : 'Partie seule'; }
  return 'Complète';
}
