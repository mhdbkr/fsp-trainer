import type { Axis, Case, CaseProgress, Fachbegriff, Simulation } from '@/db/types';
import { AXES } from '@/db/types';
import { partToAxis, weightedPartScore } from './scoring';
import { blankProgress } from '@/lib/journal';

// ============================================================================
// Indicateur « Suis-je prêt à réussir la FSP ? » (Module 3).
// Combine les 6 axes (scores pondérés par assistance × couche), la couverture
// des Fachbegriffe et la maîtrise des cas. Les axes jamais testés pénalisent
// (on ne peut pas être « prêt » sur un axe vierge). Produit un score global,
// un verdict, un détail par axe et des recommandations actionnables.
//
// CE QUI N'Y ENTRE PAS — décision de direction (30 sept. 2026). Une séance
// jouée dans une IA externe est AUTO-DÉCLARÉE : le candidat saisit lui-même son
// score, rien ne le mesure. Elle compte dans l'historique et dans la série —
// c'est du travail réel, et l'assiduité doit le reconnaître — mais elle
// n'entre PAS dans l'indice de préparation. L'indice est la seule surface qui
// doit dire la vérité avant l'examen : le laisser monter sur des scores
// déclarés en ferait un miroir de la confiance du candidat, exactement quand il
// a besoin d'un contradicteur. Même règle que INV-11 pour `CaseProgress`.
// ============================================================================

export interface AxisReadiness {
  axis: Axis;
  score: number;      // 0..100
  tested: boolean;
}

export interface Readiness {
  global: number;                 // 0..100
  verdict: 'Pas encore' | 'En route' | 'Presque prêt' | 'Prêt';
  byAxis: AxisReadiness[];
  weakest?: AxisReadiness;
  recommendations: string[];
}

/** Une séance auto-déclarée : le score vient du candidat, pas d'une mesure.
 *  Un seul prédicat, un seul endroit — les appelants n'ont rien à filtrer. */
export const estMesuree = (sim: Simulation): boolean => sim.mode !== 'external-ai';

/** Score par axe pondéré (assistance × couche) — réussir en Autonome/couche
 *  haute compte davantage. Axes data-driven : Fachbegriffe et Fachwissen.
 *  Ne lit QUE des scores mesurés (cf. en-tête). */
export function weightedAxisScores(sims: Simulation[], begriffe: Fachbegriff[], cases: Case[], progress: Map<string, CaseProgress>): Record<Axis, number | null> {
  const acc: Record<Axis, number[]> = { Anamnese: [], Dokumentation: [], Fallvorstellung: [], Aufklärung: [], Fachbegriffe: [], Fachwissen: [] };
  for (const sim of sims.filter(estMesuree)) {
    const ctx = { assistance: sim.assistance ?? 'assiste', layer: sim.layer ?? 1 };
    for (const [part, res] of Object.entries(sim.parts)) {
      if (!res?.done) continue;
      const axis = partToAxis(part as keyof Simulation['parts']);
      acc[axis].push(weightedPartScore(res, ctx));
    }
  }
  const out = {} as Record<Axis, number | null>;
  for (const a of AXES) out[a] = acc[a].length ? Math.round(acc[a].reduce((s, v) => s + v, 0) / acc[a].length) : null;
  if (begriffe.length) out.Fachbegriffe = Math.round((begriffe.filter((b) => b.srs.state === 'Gelernt').length / begriffe.length) * 100);
  // `Case.status` est déprécié (ADR-0017 §4.1) : la couverture du corpus se lit
  // sur `case_progress`, jamais sur un champ que plus personne n'écrit.
  if (cases.length) out.Fachwissen = Math.round((cases.filter((c) => (progress.get(c.id) ?? blankProgress(c.id)).overall === 'solide').length / cases.length) * 100);
  return out;
}

export function computeReadiness(sims: Simulation[], cases: Case[], begriffe: Fachbegriff[], progress: Map<string, CaseProgress>): Readiness {
  const scores = weightedAxisScores(sims, begriffe, cases, progress);
  const byAxis: AxisReadiness[] = AXES.map((a) => ({ axis: a, score: scores[a] ?? 0, tested: scores[a] !== null }));

  // Un axe non testé plafonne à 30 (potentiel inconnu → risque).
  const effective = byAxis.map((a) => (a.tested ? a.score : Math.min(a.score, 30)));
  const global = Math.round(effective.reduce((s, v) => s + v, 0) / effective.length);

  const verdict: Readiness['verdict'] =
    global >= 80 ? 'Prêt' : global >= 65 ? 'Presque prêt' : global >= 40 ? 'En route' : 'Pas encore';

  const tested = byAxis.filter((a) => a.tested);
  const weakest = tested.length ? tested.reduce((m, a) => (a.score < m.score ? a : m)) : undefined;

  const recommendations: string[] = [];
  const untested = byAxis.filter((a) => !a.tested);
  for (const a of untested.slice(0, 2)) recommendations.push(`Aborde l'axe ${a.axis} — pas encore travaillé.`);
  if (weakest && weakest.score < 60) recommendations.push(`Renforce ${weakest.axis} (${weakest.score}%) — ton point faible.`);
  const dueNow = begriffe.filter((b) => b.srs.state !== 'Gelernt').length;
  if (dueNow > begriffe.length * 0.5) recommendations.push(`Consolide tes Fachbegriffe (${dueNow} non maîtrisés).`);
  // « Jamais travaillé » est une information NEUTRE, jamais un défaut : la
  // recommandation propose d'élargir, elle ne reproche pas une absence.
  const untriedCases = cases.filter((c) => (progress.get(c.id) ?? blankProgress(c.id)).overall === 'vierge').length;
  if (untriedCases > 0) recommendations.push(`${untriedCases} cas pas encore travaillés — de quoi élargir ta couverture.`);
  if (!recommendations.length) recommendations.push('Continue à consolider en mode Autonome pour verrouiller ton niveau.');

  return { global, verdict, byAxis, weakest, recommendations: recommendations.slice(0, 4) };
}
