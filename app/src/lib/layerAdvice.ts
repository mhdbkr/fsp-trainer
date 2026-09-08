import type { Case, Layer, Simulation } from '@/db/types';
import { partScore, simulationPassed } from '@/lib/scoring';

// ============================================================================
// Recommandation de COUCHE — l'avancement était laissé à l'utilisateur, qui
// n'a aucune raison de savoir s'il est prêt pour la couche suivante. On le
// calcule à partir de ce qu'on sait déjà : les simulations passées sur CE cas,
// leur score, et le mode dans lequel elles ont été jouées.
//
// Règles (volontairement lisibles, et EXPLIQUÉES à l'utilisateur — un conseil
// qu'on ne comprend pas ne se suit pas) :
//   • jamais joué                        → couche 1 (découverte)
//   • joué mais dernier essai < 60 %     → on reste (consolider l'échec)
//   • réussi en Assisté                  → couche suivante, mais en Autonome
//   • réussi ≥ 80 % en Autonome          → couche suivante
//   • couche 3 réussie                   → on y reste (maîtrise)
// ============================================================================

export interface LayerAdvice {
  layer: Layer;                 // couche recommandée
  reason: string;               // « pourquoi cette couche », en français
  attempts: number;             // simulations passées sur ce cas
  bestScore: number | null;     // meilleur score moyen obtenu
  lastScore: number | null;     // score du dernier essai
  suggestAutonome: boolean;     // le mode Autonome est-il conseillé ?
}

const avg = (sim: Simulation): number => {
  const parts = Object.values(sim.parts).filter((p) => p?.done);
  if (!parts.length) return 0;
  return Math.round(parts.reduce((s, p) => s + partScore(p!), 0) / parts.length);
};

const next = (l: Layer): Layer => (l >= 3 ? 3 : ((l + 1) as Layer));

export function computeLayerAdvice(c: Case | undefined, sims: Simulation[] | undefined, profileId?: string): LayerAdvice {
  const mine = (sims ?? [])
    .filter((s) => s.caseId === c?.id)
    // Les stats sont par profil : on ne crédite pas le travail d'un autre.
    .filter((s) => !profileId || !s.profileId || s.profileId === profileId)
    .sort((a, b) => a.date - b.date);

  const scores = mine.map(avg);
  const bestScore = scores.length ? Math.max(...scores) : null;
  const last = mine.length ? mine[mine.length - 1] : undefined;
  const lastScore = last ? avg(last) : null;
  // Couche de départ : la plus haute validée sur le cas, sinon celle du dernier
  // essai, sinon 1.
  const reached: Layer = c?.layerProgress ?? (last?.layer ?? 1);

  if (!mine.length) {
    return { layer: 1, reason: 'Premier passage sur ce cas — couche 1, en découverte.', attempts: 0, bestScore, lastScore, suggestAutonome: false };
  }
  if (last && (!simulationPassed(last) || (lastScore ?? 0) < 60)) {
    return {
      layer: reached,
      reason: `Dernier essai à ${lastScore ?? 0} % — on reste en couche ${reached} pour consolider avant de monter.`,
      attempts: mine.length, bestScore, lastScore, suggestAutonome: false,
    };
  }
  if (last?.assistance === 'assiste') {
    return {
      layer: next(reached),
      reason: `Réussi en mode Assisté (${lastScore} %) — passe en couche ${next(reached)}, cette fois en Autonome.`,
      attempts: mine.length, bestScore, lastScore, suggestAutonome: true,
    };
  }
  if ((lastScore ?? 0) >= 80 && reached < 3) {
    return {
      layer: next(reached),
      reason: `${lastScore} % en Autonome — couche ${next(reached)}, tu es prêt à durcir.`,
      attempts: mine.length, bestScore, lastScore, suggestAutonome: true,
    };
  }
  if (reached >= 3) {
    return { layer: 3, reason: `Couche 3 déjà validée (meilleur : ${bestScore} %) — entretiens la maîtrise.`, attempts: mine.length, bestScore, lastScore, suggestAutonome: true };
  }
  return {
    layer: reached,
    reason: `Réussi à ${lastScore} % — encore un passage en couche ${reached} avant de monter (vise 80 %).`,
    attempts: mine.length, bestScore, lastScore, suggestAutonome: true,
  };
}
