// Invariants de la sélection — contrat §5 · INV-4.
// « La diversité est une CONTRAINTE, pas une pondération » : ces tests
// échouent si elle redevient un malus de score.
import { describe, it, expect } from 'vitest';
import { seedCases } from '@/data/seedCases';
import type { Case, CaseProgress, Specialty } from '@/db/types';
import { blankProgress, computeCaseProgress } from '@/lib/journal';
import { DAY_MS, freezeAt, resetClock } from '@/lib/clock';
import {
  fraicheur, freq, pickWithDiversity, pourquoiAujourdhui, pressionExamen,
  rankCandidates, scoreCase, urgence, type SelectContext,
} from './select';

const NOW = Date.parse('2026-10-01T08:00:00Z');

const mkCase = (id: string, specialty: Specialty, frequency: number): Case =>
  ({ id, name: `Cas ${id}`, specialty, frequency, pathology: id, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);

const ctx = (cases: Case[], over: Partial<SelectContext> = {}): SelectContext => ({
  daysUntilExam: null,
  freqMax: cases.reduce((m, c) => Math.max(m, c.frequency), 1),
  now: NOW,
  lastPlayedAt: new Map(),
  progress: new Map(),
  ...over,
});

describe('les quatre facteurs — multiplicatifs, aucun terme additif', () => {
  it('la fréquence n’est ni additive ni plafonnée : elle garde tout son écart', () => {
    // L'ancien barème plafonnait `freq` à 30 face à une faiblesse montant à 95 :
    // l'épidémiologie pesait au mieux 29 %. Ici le rapport de fréquence se
    // retrouve intact dans le rapport de score, à dette et fraîcheur égales.
    const a = mkCase('a', 'Gastroenterologie', 26);
    const b = mkCase('b', 'Kardiologie', 2);
    const c = ctx([a, b]);
    expect(scoreCase(a, c).score / scoreCase(b, c).score).toBeCloseTo(13, 5);
  });

  it('urgence ∈ [1,3] et ne réordonne rien à elle seule (facteur commun)', () => {
    expect(urgence(null)).toBe(1);
    expect(urgence(200)).toBe(1);
    expect(urgence(0)).toBe(3);
    expect(pressionExamen(45)).toBeCloseTo(0.5, 5);
    const a = mkCase('a', 'Gastroenterologie', 26); const b = mkCase('b', 'Kardiologie', 2);
    const loin = ctx([a, b], { daysUntilExam: 200 }); const pres = ctx([a, b], { daysUntilExam: 1 });
    expect(scoreCase(a, loin).score > scoreCase(b, loin).score).toBe(scoreCase(a, pres).score > scoreCase(b, pres).score);
  });

  it('fraîcheur : jamais joué = 1, à l’instant = 0,2, 14 jours = 1', () => {
    expect(fraicheur(undefined, NOW)).toBe(1);
    expect(fraicheur(NOW, NOW)).toBe(0.2);
    expect(fraicheur(NOW - 7 * DAY_MS, NOW)).toBeCloseTo(0.5, 5);
    expect(fraicheur(NOW - 30 * DAY_MS, NOW)).toBe(1);
  });

  it('freq ∈ (0,1] et ne vaut jamais zéro', () => {
    expect(freq(mkCase('x', 'Kardiologie', 0), 26)).toBeGreaterThan(0);
    expect(freq(mkCase('x', 'Kardiologie', 26), 26)).toBe(1);
  });

  it('dette nulle ⇒ score nul ⇒ le cas SORT : c’est la seule exclusion', () => {
    const a = mkCase('a', 'Gastroenterologie', 26);
    const solide: CaseProgress = {
      caseId: 'a', overall: 'solide',
      teile: {
        anamnese: { status: 'solide', lastScore: 95, lastAt: NOW, attempts: 1 },
        dokumentation: { status: 'solide', lastScore: 95, lastAt: NOW, attempts: 1 },
        fallvorstellung: { status: 'solide', lastScore: 95, lastAt: NOW, attempts: 1 },
      },
    };
    const ranked = rankCandidates([a], ctx([a], { progress: new Map([['a', solide]]) }));
    expect(ranked).toHaveLength(0);
  });

  it('aucune boucle de rétroaction par spécialité : un mauvais score ne relève pas ses voisins', () => {
    // `disciplineBoost` relevait TOUS les cas d'une spécialité. Ici un cas raté
    // ne change le score d'aucun autre cas de la même spécialité.
    const rate = mkCase('rate', 'Gastroenterologie', 10);
    const voisin = mkCase('voisin', 'Gastroenterologie', 10);
    const autre = mkCase('autre', 'Kardiologie', 10);
    const cases = [rate, voisin, autre];
    const avant = ctx(cases);
    const progress = new Map(computeCaseProgress([
      { id: 'e', at: NOW - DAY_MS, kind: 'simulation', caseId: 'rate', teile: ['anamnese'], source: 'libre', spentMin: 10, scores: { anamnese: 20 } },
    ]).map((p) => [p.caseId, p]));
    const apres = ctx(cases, { progress });
    expect(scoreCase(voisin, apres).score).toBe(scoreCase(voisin, avant).score);
    expect(scoreCase(autre, apres).score).toBe(scoreCase(autre, avant).score);
  });

  it('le classement est déterministe : deux appareils, le même plan', () => {
    const cases = [mkCase('a', 'Kardiologie', 5), mkCase('b', 'Gastroenterologie', 5), mkCase('c', 'Pneumologie', 5)];
    const ids = () => rankCandidates([...cases].reverse(), ctx(cases)).map((s) => s.c.id);
    expect(ids()).toEqual(ids());
    expect(ids()).toEqual(rankCandidates(cases, ctx(cases)).map((s) => s.c.id));
  });
});

describe('INV-4 — la diversité est une contrainte dure', () => {
  it('INV-4 : sur les 130 cas réels, jamais deux spécialités identiques consécutives', () => {
    const cases = seedCases();
    expect(cases.length).toBeGreaterThanOrEqual(130);
    const c = ctx(cases);
    const picked = pickWithDiversity(rankCandidates(cases, c), 40);
    expect(picked.length).toBe(40);
    for (let i = 1; i < picked.length; i++) {
      const prev = picked[i - 1].scored.c.specialty;
      const cur = picked[i].scored.c.specialty;
      if (prev === cur) expect(picked[i].diversityRelaxed).toBe(true);
      else expect(prev).not.toBe(cur);
    }
  }, 30_000);

  it('INV-4 : les 13 cas de Gastro ne remontent plus d’un bloc', () => {
    const cases = seedCases();
    const picked = pickWithDiversity(rankCandidates(cases, ctx(cases)), 10);
    const gastro = picked.filter((p) => p.scored.c.specialty === 'Gastroenterologie').length;
    expect(gastro).toBeLessThanOrEqual(4);          // C2 : ≤ 2 par fenêtre de 5
  }, 30_000);

  it('C2 : au plus deux fois la même spécialité par fenêtre de cinq', () => {
    const cases = seedCases();
    const specs = pickWithDiversity(rankCandidates(cases, ctx(cases)), 30)
      .filter((p) => !p.diversityRelaxed).map((p) => p.scored.c.specialty);
    for (let i = 0; i + 5 <= specs.length; i++) {
      const w = specs.slice(i, i + 5);
      for (const s of new Set(w)) expect(w.filter((x) => x === s).length).toBeLessThanOrEqual(2);
    }
  }, 30_000);

  it('la contrainte n’est PAS un malus : le meilleur score reste premier', () => {
    const cases = [mkCase('top', 'Gastroenterologie', 26), mkCase('b', 'Gastroenterologie', 25), mkCase('c', 'Kardiologie', 2)];
    const picked = pickWithDiversity(rankCandidates(cases, ctx(cases)), 3);
    expect(picked[0].scored.c.id).toBe('top');
    expect(picked[1].scored.c.id).toBe('c');        // 'b' sauté par C1, pas dégradé
    expect(picked[2].scored.c.id).toBe('b');
  });

  it('`diversityRelaxed` ⇒ TOUS les candidats restants violaient la contrainte', () => {
    const cases = [mkCase('a', 'Gastroenterologie', 26), mkCase('b', 'Gastroenterologie', 20), mkCase('c', 'Gastroenterologie', 10)];
    const picked = pickWithDiversity(rankCandidates(cases, ctx(cases)), 3);
    expect(picked.map((p) => p.diversityRelaxed)).toEqual([false, true, true]);
    expect(picked.map((p) => p.scored.c.id)).toEqual(['a', 'b', 'c']);   // ordre du score préservé
  });

  it('pool assez divers ⇒ aucun relâchement', () => {
    const cases = ['Kardiologie', 'Gastroenterologie', 'Pneumologie', 'Neurologie', 'Nephrologie']
      .map((sp, i) => mkCase(`c${i}`, sp as Specialty, 20 - i));
    expect(pickWithDiversity(rankCandidates(cases, ctx(cases)), 5).every((p) => !p.diversityRelaxed)).toBe(true);
  });

  it('les contraintes suspendues (`cas-complet`, `specialite`) suivent le pur score', () => {
    const cases = [mkCase('a', 'Gastroenterologie', 26), mkCase('b', 'Gastroenterologie', 20)];
    const picked = pickWithDiversity(rankCandidates(cases, ctx(cases)), 2, false);
    expect(picked.map((p) => p.scored.c.id)).toEqual(['a', 'b']);
    expect(picked.every((p) => !p.diversityRelaxed)).toBe(true);
  });
});

describe('le « pourquoi aujourd’hui » — une ligne, lisible, jamais accusatrice', () => {
  const a = mkCase('a', 'Gastroenterologie', 26);

  it('nomme la performance quand il y en a une', () => {
    const progress = new Map(computeCaseProgress([
      { id: 'e', at: NOW - DAY_MS, kind: 'simulation', caseId: 'a', teile: ['dokumentation'], source: 'libre', spentMin: 10, scores: { dokumentation: 48 } },
    ]).map((p) => [p.caseId, p]));
    const c = ctx([a], { progress });
    expect(pourquoiAujourdhui(scoreCase(a, c), c)).toContain('Dokumentation');
    expect(pourquoiAujourdhui(scoreCase(a, c), c)).toContain('48 %');
  });

  it('un cas jamais travaillé n’est jamais présenté comme un défaut', () => {
    const c = ctx([a], { progress: new Map([['a', blankProgress('a')]]) });
    const why = pourquoiAujourdhui(scoreCase(a, c), c);
    expect(why).toMatch(/jamais travaillé|jamais rencontré/i);
    expect(why).not.toMatch(/faible|point faible|retard|échec/i);
  });

  it('revue P2 : un cas déjà joué n’est jamais « jamais travaillé », même à dette pleine', () => {
    freezeAt(NOW);
    try {
      // trois réussites d'il y a quatre jours : acquis, `solideDes` passé — le cas a été joué, il attend sa confirmation
      // (P1) : sa dette ne pèse que POIDS_CONSOLIDATION, et la raison le dit. (Joué hier, il ne serait pas à planifier : R2.)
      const ev = (t: 'anamnese' | 'dokumentation' | 'fallvorstellung') =>
        ({ id: `e-${t}`, at: NOW - 4 * DAY_MS, kind: 'simulation' as const, caseId: 'a', teile: [t], source: 'libre' as const, spentMin: 10, scores: { [t]: 85 } });
      const progress = new Map(computeCaseProgress([ev('anamnese'), ev('dokumentation'), ev('fallvorstellung')]).map((p) => [p.caseId, p]));
      const c = ctx([a], { progress, lastPlayedAt: new Map([['a', NOW - 4 * DAY_MS]]) });
      expect(scoreCase(a, c).parts.dette).toBeCloseTo(1 / 3, 6);
      expect(pourquoiAujourdhui(scoreCase(a, c), c)).not.toMatch(/jamais travaillé/i);
      expect(pourquoiAujourdhui(scoreCase(a, c), c)).toMatch(/^Réussi à 85 le .* une seconde partie à 80 ou plus le confirme\.$/);
    } finally { resetClock(); }
  });

  it('tient sur une ligne', () => {
    const c = ctx([a]);
    expect(pourquoiAujourdhui(scoreCase(a, c), c).length).toBeLessThanOrEqual(90);
  });
});
