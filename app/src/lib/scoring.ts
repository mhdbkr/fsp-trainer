import type { Axis, LanguageGrid, PartResult, Simulation, ChecklistItem, AssistanceMode, Layer } from '@/db/types';

// ============================================================================
// Système d'évaluation hybride (cf. ANALYSE.md §6).
//   1) Checklist de contenu  → contentPct = % de critères cochés
//   2) Grille de langue Doctopus (5 critères, 0..5) → officialPct (nom historique du champ)
//   3) Curseur ressenti (feeling 0..100)
// Verdict : PASS si CHAQUE partie tentée atteint ≥ 60 %. Ce seuil et cette grille
// sont INTERNES à Doctopus — jamais « ce que le jury note » (garde EXAM_CLAIM).
// ============================================================================

export const PASS_THRESHOLD = 60;

export const LANGUAGE_CRITERIA: { key: keyof LanguageGrid; label: string; hint: string }[] = [
  { key: 'aussprache', label: 'Aussprache / Intonation', hint: 'Clarté de la prononciation, accent tonique' },
  { key: 'wortschatz', label: 'Wortschatz', hint: 'Différenciation et justesse du vocabulaire' },
  { key: 'grammatik', label: 'Grammatik / Syntax', hint: 'Structures correctes (Konjunktiv I, Dativ/Akkusativ…)' },
  { key: 'redefluss', label: 'Redefluss', hint: 'Fluidité, absence de blocages' },
  { key: 'kommunikation', label: 'Kommunikation / Register', hint: 'Patientengerecht, Hörverstehen, gestion du dialogue' },
];

/** Valeur d'un curseur que le candidat n'a pas (encore) touché. Un score ne
 *  contient que ce qui a été saisi : ni 3/5 de langue ni 50 de ressenti offerts.
 *  `0` reste une note. Une partie enregistrée AVANT cette règle porte de vraies
 *  valeurs (3, 50…) : elle est lue comme saisie, son score ne bouge pas. */
export const NOT_ENTERED = -1;
export const isEntered = (v: number | undefined | null): v is number => typeof v === 'number' && v >= 0;

/** Grille vierge : cinq critères non notés. */
export function emptyLanguageGrid(): LanguageGrid {
  return { aussprache: NOT_ENTERED, wortschatz: NOT_ENTERED, grammatik: NOT_ENTERED, redefluss: NOT_ENTERED, kommunikation: NOT_ENTERED };
}

/** La langue ne compte qu'une fois les cinq critères notés. */
export const languageGridEntered = (grid?: LanguageGrid): grid is LanguageGrid => !!grid && Object.values(grid).every(isEntered);

export function checklistPct(items: ChecklistItem[]): number {
  if (!items.length) return 0;
  const total = items.reduce((s, i) => s + (i.axisWeight ?? 1), 0);
  const got = items.filter((i) => i.checked).reduce((s, i) => s + (i.axisWeight ?? 1), 0);
  return Math.round((got / total) * 100);
}

export function languagePct(grid?: LanguageGrid): number {
  if (!languageGridEntered(grid)) return 0;
  const vals = Object.values(grid);
  const sum = vals.reduce((s, v) => s + v, 0);
  return Math.round((sum / (vals.length * 5)) * 100);
}

export type ScoreBasis = 'contenu' | 'langue' | 'ressenti';

/** Ce qui entre RÉELLEMENT dans le score d'une partie : le contenu toujours,
 *  la langue si les 5 critères sont notés, le ressenti s'il est saisi. */
export function scoreBasis(p: PartResult): ScoreBasis[] {
  const out: ScoreBasis[] = ['contenu'];
  if (languageGridEntered(p.languageGrid)) out.push('langue');
  if (isEntered(p.feeling)) out.push('ressenti');
  return out;
}

/** « contenu seul », « contenu et ressenti », « contenu, langue et ressenti »… */
export function scoreBasisLabel(basis: ScoreBasis[]): string {
  if (basis.length === 1) return 'contenu seul';
  return `${basis.slice(0, -1).join(', ')} et ${basis[basis.length - 1]}`;
}

/** Score d'une partie : 55 % contenu + 30 % langue + 15 % ressenti, la
 *  pondération ne s'appliquant qu'à ce qui est saisi (renormalisée). Sans grille
 *  orale (Dokumentation) : 80 % contenu + 20 % ressenti. Tout saisi = la
 *  formule historique, au point près.
 *  (La langue est le vrai objet de la FSP, mais le contenu structure la partie.) */
export function partScore(p: PartResult): number {
  const oral = !!p.languageGrid;
  const contenu = p.contentPct ?? checklistPct(p.checklist);
  const langue = p.officialPct ?? languagePct(p.languageGrid);
  const basis = scoreBasis(p);
  // Tout saisi : la formule historique À L'IDENTIQUE (l'arrondi des cas limites
  // ne bouge pas d'un point — les scores déjà enregistrés se relisent pareil).
  if (basis.length === (oral ? 3 : 2)) return Math.round(oral ? contenu * 0.55 + langue * 0.30 + p.feeling * 0.15 : contenu * 0.8 + p.feeling * 0.2);
  const poids = oral ? { contenu: 55, langue: 30, ressenti: 15 } : { contenu: 80, langue: 0, ressenti: 20 };
  const valeur = { contenu, langue, ressenti: p.feeling };
  const total = basis.reduce((s, k) => s + poids[k], 0);
  return Math.round(basis.reduce((s, k) => s + poids[k] * valeur[k], 0) / total);
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
