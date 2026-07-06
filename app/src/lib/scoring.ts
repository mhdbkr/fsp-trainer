import type { Axis, LanguageGrid, PartResult, Simulation, ChecklistItem, AssistanceMode, Layer } from '@/db/types';

// ============================================================================
// Système d'évaluation hybride (cf. ANALYSE.md §6 + mémoire officielle).
//   1) Checklist de contenu  → contentPct = % de critères cochés
//   2) Grille de langue "officielle" (5 axes, 0..5) → officialPct
//   3) Curseur ressenti (feeling 0..100)
// Verdict officiel: PASS si CHAQUE partie tentée atteint ≥ 60% (règle BW).
// ============================================================================

export const PASS_THRESHOLD = 60;

export const LANGUAGE_CRITERIA: { key: keyof LanguageGrid; label: string; hint: string }[] = [
  { key: 'aussprache', label: 'Aussprache / Intonation', hint: 'Clarté de la prononciation, accent tonique' },
  { key: 'wortschatz', label: 'Wortschatz', hint: 'Différenciation et justesse du vocabulaire' },
  { key: 'grammatik', label: 'Grammatik / Syntax', hint: 'Structures correctes (Konjunktiv I, Dativ/Akkusativ…)' },
  { key: 'redefluss', label: 'Redefluss', hint: 'Fluidité, absence de blocages' },
  { key: 'kommunikation', label: 'Kommunikation / Register', hint: 'Patientengerecht, Hörverstehen, gestion du dialogue' },
];

export function emptyLanguageGrid(): LanguageGrid {
  return { aussprache: 3, wortschatz: 3, grammatik: 3, redefluss: 3, kommunikation: 3 };
}

export function checklistPct(items: ChecklistItem[]): number {
  if (!items.length) return 0;
  const total = items.reduce((s, i) => s + (i.axisWeight ?? 1), 0);
  const got = items.filter((i) => i.checked).reduce((s, i) => s + (i.axisWeight ?? 1), 0);
  return Math.round((got / total) * 100);
}

export function languagePct(grid?: LanguageGrid): number {
  if (!grid) return 0;
  const vals = Object.values(grid);
  const sum = vals.reduce((s, v) => s + v, 0);
  return Math.round((sum / (vals.length * 5)) * 100);
}

/** Score global d'une partie: 55% contenu + 30% langue + 15% ressenti.
 *  (La langue est le vrai objet de la FSP, mais le contenu structure la partie.) */
export function partScore(p: PartResult): number {
  const content = p.contentPct ?? checklistPct(p.checklist);
  const lang = p.officialPct ?? languagePct(p.languageGrid);
  const feel = p.feeling ?? 0;
  const hasLang = !!p.languageGrid;
  if (hasLang) return Math.round(content * 0.55 + lang * 0.30 + feel * 0.15);
  // Dokumentation: pas de grille orale → 80% contenu + 20% ressenti.
  return Math.round(content * 0.8 + feel * 0.2);
}

export function partPassed(p: PartResult): boolean {
  return partScore(p) >= PASS_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Pondération par niveau d'assistance × couche (Itération 2).
// Réussir en Autonome / à une couche élevée « vaut plus » : le score brut est
// atténué en Assisté et aux couches basses, valorisé en Autonome / couche haute.
// Le score reste borné à 100.
// ---------------------------------------------------------------------------

/** Multiplicateur de crédit : Assisté 0.85, Autonome 1.0 ; couche 1 = 0.95,
 *  couche 2 = 1.0, couche 3 = 1.05 (bonus de consolidation). */
export function creditMultiplier(assistance: AssistanceMode, layer: Layer): number {
  const a = assistance === 'autonome' ? 1.0 : 0.85;
  const l = layer === 3 ? 1.05 : layer === 2 ? 1.0 : 0.95;
  return a * l;
}

/** Score d'une partie pondéré par le contexte (assistance + couche). */
export function weightedPartScore(p: PartResult, ctx: { assistance: AssistanceMode; layer: Layer }): number {
  const base = partScore(p);
  return Math.min(100, Math.round(base * creditMultiplier(ctx.assistance, ctx.layer)));
}

/** Verdict d'une simulation: réussi si toutes les parties tentées ≥ 60%. */
export function simulationPassed(sim: Simulation): boolean {
  const done = Object.values(sim.parts).filter((p): p is PartResult => !!p && p.done);
  if (!done.length) return false;
  return done.every(partPassed);
}

/** Bande de couleur pour l'UI. */
export function scoreBand(pct: number): 'green' | 'orange' | 'red' {
  if (pct >= 80) return 'green';
  if (pct >= PASS_THRESHOLD) return 'orange';
  return 'red';
}

/** Map partie → axe pour alimenter la heatmap. */
export function partToAxis(part: keyof Simulation['parts']): Axis {
  switch (part) {
    case 'anamnese': return 'Anamnese';
    case 'dokumentation': return 'Dokumentation';
    case 'fallvorstellung': return 'Fallvorstellung';
    case 'aufklaerung': return 'Aufklärung';
  }
}
