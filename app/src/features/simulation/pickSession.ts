import type { Case, Fachbegriff, Simulation, Center } from '@/db/types';
import { partScore } from '@/lib/scoring';
import { isDue } from '@/lib/srs';

// ============================================================================
// Générateur de "Fall du jour" pondéré (fonctionnalité proposée §7.5).
// Score = fréquence × faiblesse × centre visé × termes SRS dus.
// Pas de tirage au hasard : la session s'adapte au profil.
// ============================================================================
export function pickSessionCase(
  cases: Case[],
  sims: Simulation[],
  begriffe: Fachbegriff[],
  targetCenter: Center | 'Alle',
): Case | null {
  if (!cases.length) return null;

  // Dernier score par cas
  const lastByCase = new Map<string, number | null>();
  for (const sim of [...sims].sort((a, b) => a.date - b.date)) {
    const parts = Object.values(sim.parts).filter((p) => p?.done);
    lastByCase.set(sim.caseId, parts.length ? Math.round(parts.reduce((s, p) => s + partScore(p!), 0) / parts.length) : null);
  }
  const dueByPathology = new Map<string, number>();
  for (const b of begriffe) {
    if (!isDue(b.srs)) continue;
    for (const t of b.pathologyTags) dueByPathology.set(t, (dueByPathology.get(t) ?? 0) + 1);
  }

  let best: { c: Case; score: number } | null = null;
  for (const c of cases) {
    if (c.status === 'Maîtrisé') continue; // on ne pousse pas ce qui est acquis
    const last = lastByCase.get(c.id);
    const weakness = last === null || last === undefined ? 70 : Math.max(0, 100 - last); // jamais fait = 70
    const freq = Math.min(30, c.frequency);
    const centerBoost = targetCenter !== 'Alle' && c.centers.includes(targetCenter) ? 1.5 : 1;
    const dueBoost = 1 + Math.min(1, (dueByPathology.get(c.pathology) ?? 0) / 5);
    const score = (freq * 1.2 + weakness) * centerBoost * dueBoost;
    if (!best || score > best.score) best = { c, score };
  }
  return best?.c ?? cases[0];
}
