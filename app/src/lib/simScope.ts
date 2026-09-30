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
 * Teil (`case_progress`, `lib/journal.ts`). Seul `lib/simulationSave.ts` l'appelle
 * encore, pour écrire `Case.confidence` / `Case.status` ; plus AUCUNE vue ne lit
 * ces champs (les pages Cas lisent `case_progress` — revue s3-programme B-C5).
 * Retirée avec R-C5-écriture.
 *
 * Elle n'est PAS juste : la moyenne des Teile JOUÉS fait osciller le statut
 * écrit — une Anamnese seule à 90 % donne « Maîtrisé », une Dokumentation à 70 %
 * ensuite le ramène à « En cours ». C'est pour cela qu'aucun écran ne la lit.
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
