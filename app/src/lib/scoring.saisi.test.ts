// C6-A point 3 — un score ne contient que ce que le candidat a saisi.
// La grille de langue pré-remplie à 3/5 et le Ressenti à 50 faisaient ~25
// points « offerts » : 30 % de critères cochés donnaient 43 %.
import { describe, it, expect } from 'vitest';
import type { PartResult } from '@/db/types';
import { NOT_ENTERED, emptyLanguageGrid, languagePct, partScore, scoreBasis } from './scoring';

const oral = (over: Partial<PartResult> = {}): PartResult => ({
  done: true, durationSec: 600, checklist: [], contentPct: 30, officialPct: 0,
  languageGrid: emptyLanguageGrid(), feeling: NOT_ENTERED, ...over,
});
const grille = (v: number) => ({ aussprache: v, wortschatz: v, grammatik: v, redefluss: v, kommunikation: v });

describe('rien n\'est saisi : les curseurs sont vides', () => {
  it('la grille vide ne contient aucune note', () => {
    expect(Object.values(emptyLanguageGrid()).every((v) => v === NOT_ENTERED)).toBe(true);
  });
  it('partie orale, seul le contenu est saisi : le score EST le contenu (30 % → 30 %, plus 43 %)', () => {
    expect(partScore(oral())).toBe(30);
    expect(partScore(oral({ contentPct: 92 }))).toBe(92);
    expect(scoreBasis(oral())).toEqual(['contenu']);
  });
  it('Dokumentation (sans grille orale) : contenu seul aussi', () => {
    expect(partScore(oral({ languageGrid: undefined, contentPct: 50 }))).toBe(50);
  });
});

describe('la pondération ne s\'applique qu\'à ce qui est saisi', () => {
  it('contenu + ressenti, sans langue : 55/15 renormalisés', () => {
    expect(partScore(oral({ contentPct: 60, feeling: 100 }))).toBe(Math.round((0.55 * 60 + 0.15 * 100) / 0.70));
    expect(scoreBasis(oral({ feeling: 100 }))).toEqual(['contenu', 'ressenti']);
  });
  it('contenu + langue, sans ressenti : 55/30 renormalisés', () => {
    const p = oral({ contentPct: 60, languageGrid: grille(5), officialPct: 100 });
    expect(partScore(p)).toBe(Math.round((0.55 * 60 + 0.30 * 100) / 0.85));
    expect(scoreBasis(p)).toEqual(['contenu', 'langue']);
  });
  it('tout est saisi : la formule historique 55/30/15, inchangée', () => {
    const p = oral({ contentPct: 60, languageGrid: grille(4), officialPct: 80, feeling: 70 });
    expect(partScore(p)).toBe(Math.round(60 * 0.55 + 80 * 0.30 + 70 * 0.15));
    expect(scoreBasis(p)).toEqual(['contenu', 'langue', 'ressenti']);
  });
  it('Dokumentation avec ressenti : 80/20 historique', () => {
    expect(partScore(oral({ languageGrid: undefined, contentPct: 50, feeling: 100 }))).toBe(60);
  });
  it('une grille à moitié notée ne compte pas encore comme « langue »', () => {
    const g = { ...emptyLanguageGrid(), aussprache: 5, wortschatz: 5 };
    expect(scoreBasis(oral({ languageGrid: g, officialPct: languagePct(g) }))).toEqual(['contenu']);
  });
});

describe('l\'historique n\'est pas recalculé', () => {
  it('une partie enregistrée avant (grille 3/5 et ressenti 50 réellement stockés) garde son score', () => {
    const ancienne = oral({ contentPct: 30, languageGrid: grille(3), officialPct: 60, feeling: 50 });
    expect(partScore(ancienne)).toBe(Math.round(30 * 0.55 + 60 * 0.30 + 50 * 0.15));   // 43, tel qu'enregistré
  });
  it('tout saisi : identique à l\'ancienne formule, au point près, sur tout le domaine', () => {
    let n = 0;
    for (let c = 0; c <= 100; c += 5) for (let n5 = 0; n5 <= 25; n5 += 5) for (let f = 0; f <= 100; f += 3) {
      const l = Math.round((n5 / 25) * 100);
      const oralP = oral({ contentPct: c, languageGrid: grille(n5 / 5), officialPct: l, feeling: f });
      expect(partScore(oralP)).toBe(Math.round(c * 0.55 + l * 0.30 + f * 0.15));
      expect(partScore(oral({ languageGrid: undefined, contentPct: c, feeling: f }))).toBe(Math.round(c * 0.8 + f * 0.2));
      n++;
    }
    expect(n).toBeGreaterThan(3000);
  }, 20_000);
  it('un 0 saisi est une note, pas une absence', () => {
    const p = oral({ contentPct: 80, languageGrid: grille(0), officialPct: 0, feeling: 0 });
    expect(scoreBasis(p)).toEqual(['contenu', 'langue', 'ressenti']);
    expect(partScore(p)).toBe(Math.round(80 * 0.55));
  });
});
