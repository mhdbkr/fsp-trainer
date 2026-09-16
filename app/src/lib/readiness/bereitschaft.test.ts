import { describe, expect, it } from 'vitest';
import type { Case, PartResult, Simulation } from '@/db/types';
import { weightedPartScore } from '@/lib/scoring';
import { sourceWeight, recencyWeight, isDemoSim, CORPUS_SPECIALTIES, computeS, computeC, computeL, computeBereitschaftsindex, DAY } from './bereitschaft';
import type { ReadinessInput } from './bereitschaft';

const caseOf = (id: string, specialty: Case['specialty'], frequency: number): Case =>
  ({ id, specialty, frequency } as unknown as Case);

const simOn = (caseId: string, overrides: Partial<Simulation> = {}): Simulation =>
  ({ ...base, id: `sim-${caseId}-${Math.random()}`, caseId, parts: { anamnese: part(80, 0) }, ...overrides } as Simulation);

const base = { id: 's1', caseId: 'c', date: 0, parts: {}, notes: {}, prioritizedCorrections: [] } as unknown as Simulation;

const part = (contentPct: number, officialPct: number): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 50,
  contentPct,
  officialPct,
});

describe('bereitschaft', () => {
  it('sourceWeight', () => {
    expect(sourceWeight({ ...base, context: 'pruefungstag', withSimulant: true })).toBe(3);
    expect(sourceWeight({ ...base, context: 'pruefungstag', withSimulant: false })).toBe(2); // solo
    expect(sourceWeight({ ...base, context: 'pruefungstag' })).toBe(2);
    expect(sourceWeight({ ...base, assistance: 'autonome' })).toBe(2);
    expect(sourceWeight({ ...base, assistance: 'assiste' })).toBe(1);
    expect(sourceWeight(base)).toBe(1);
  });

  it('recencyWeight bornes', () => {
    const D = 86_400_000;
    expect(recencyWeight(0, 29 * D)).toBe(1);
    expect(recencyWeight(0, 30 * D)).toBe(0.5);
    expect(recencyWeight(0, 90 * D)).toBe(0.25);
  });

  it('demo + corpus', () => {
    expect(isDemoSim({ ...base, id: 'sim-demo-1' })).toBe(true);
    expect(CORPUS_SPECIALTIES).toHaveLength(16);
  });
});

describe('computeS', () => {
  it('un seul axe testé (Anamnese, autonome, layer 3, frais)', () => {
    const anamnese = part(82, 0);
    const sim: Simulation = { ...base, assistance: 'autonome', layer: 3, date: 0, parts: { anamnese } };
    const expected = weightedPartScore(anamnese, { assistance: 'autonome', layer: 3 });
    expect(expected).toBe(80);
    const s = computeS([sim], 10 * 86_400_000);
    expect(s.byAxis).toEqual([
      { axis: 'Anamnese', score: expected, tested: true },
      { axis: 'Dokumentation', score: 0, tested: false },
      { axis: 'Fallvorstellung', score: 0, tested: false },
    ]);
    expect(s.value).toBe(Math.round(expected / 3));
  });

  it('aufklaerung seule compte sur Anamnese (poids × 0,5)', () => {
    const aufklaerung = part(82, 0);
    const sim: Simulation = { ...base, assistance: 'autonome', layer: 3, date: 0, parts: { aufklaerung } };
    const s = computeS([sim], 10 * 86_400_000);
    expect(s.byAxis[0]).toEqual({
      axis: 'Anamnese',
      score: weightedPartScore(aufklaerung, { assistance: 'autonome', layer: 3 }),
      tested: true,
    });
  });

  it('deux sims sur Dokumentation pondérées par la source', () => {
    const docA = part(90, 0);
    const docB = part(50, 0);
    const simA: Simulation = { ...base, id: 's-a', context: 'pruefungstag', withSimulant: true, date: 0, parts: { dokumentation: docA } };
    const simB: Simulation = { ...base, id: 's-b', assistance: 'assiste', date: 0, parts: { dokumentation: docB } };
    const now = 10 * 86_400_000;
    const scoreA = weightedPartScore(docA, { assistance: simA.assistance ?? 'assiste', layer: simA.layer ?? 1 });
    const scoreB = weightedPartScore(docB, { assistance: simB.assistance ?? 'assiste', layer: simB.layer ?? 1 });
    const wA = sourceWeight(simA) * recencyWeight(simA.date, now);
    const wB = sourceWeight(simB) * recencyWeight(simB.date, now);
    const s = computeS([simA, simB], now);
    expect(wA).toBe(3);
    expect(wB).toBe(1);
    expect(s.byAxis.find((a) => a.axis === 'Dokumentation')).toEqual({
      axis: 'Dokumentation',
      score: Math.round((wA * scoreA + wB * scoreB) / (wA + wB)),
      tested: true,
    });
  });

  it('weights exposés', () => {
    const s = computeS([], 0);
    expect(s.weights).toEqual({ pruefungstag: 3, autonome: 2, assiste: 1 });
    expect(s.value).toBe(0);
    expect(s.byAxis.every((a) => a.tested === false)).toBe(true);
  });
});

describe('computeC', () => {
  const c1 = caseOf('c1', 'Kardiologie', 10);
  const c2 = caseOf('c2', 'Neurologie', 30);
  const visibleCases = [c1, c2];

  it('sim autonome réussie sur c1 couvre Kardiologie', () => {
    const sim = simOn('c1', { assistance: 'autonome' });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(25);
    expect(c.covered).toEqual(['Kardiologie']);
    expect(c.missing).toEqual([{ specialty: 'Neurologie', share: 0.75 }]);
    expect(c.denominator).toBe(2);
    expect(c.outsidePlan).toHaveLength(14);
    expect(c.corpusTotal).toBe(16);
  });

  it('assistance assiste ne couvre pas', () => {
    const sim = simOn('c1', { assistance: 'assiste' });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(0);
  });

  it('sim autonome non réussie ne couvre pas', () => {
    const sim = simOn('c1', { assistance: 'autonome', parts: { anamnese: part(30, 0) } });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(0);
  });

  it('sim context pruefungstag solo réussie couvre', () => {
    const sim = simOn('c1', { context: 'pruefungstag', withSimulant: false });
    const c = computeC([sim], visibleCases, visibleCases);
    expect(c.value).toBe(25);
    expect(c.covered).toEqual(['Kardiologie']);
  });

  it('visibleCases vide → value 0, pas de NaN', () => {
    const c = computeC([], [], []);
    expect(c.value).toBe(0);
    expect(Number.isNaN(c.value)).toBe(false);
  });

  it('lookup de spécialité via cases (union avec visibleCases)', () => {
    const sim = simOn('c1', { assistance: 'autonome' });
    const c = computeC([sim], [c1], [c2]);
    // c1 n'est pas dans visibleCases → F ne le contient pas, mais le lookup fonctionne quand même
    expect(c.covered).toEqual([]);
    expect(c.denominator).toBe(1);
  });
});

const oralPart = (officialPct: number): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 50,
  contentPct: officialPct,
  officialPct,
  languageGrid: {} as PartResult['languageGrid'],
});

const simWithOral = (date: number, key: 'anamnese' | 'aufklaerung' | 'fallvorstellung', officialPct: number): Simulation =>
  ({ ...base, id: `sim-${date}-${Math.random()}`, date, parts: { [key]: oralPart(officialPct) } } as Simulation);

describe('computeL', () => {
  it('0 partie', () => {
    expect(computeL([])).toEqual({ value: 0, base: 0, trend: 0, samples: 0 });
  });

  it('2 parties à 90 → value plafonnée à 30', () => {
    const sims = [simWithOral(0, 'anamnese', 90), simWithOral(1, 'fallvorstellung', 90)];
    const l = computeL(sims);
    expect(l.samples).toBe(2);
    expect(l.value).toBe(30);
  });

  it('3 à 70 → 70, trend 0', () => {
    const sims = [0, 1, 2].map((i) => simWithOral(i, 'anamnese', 70));
    const l = computeL(sims);
    expect(l.value).toBe(70);
    expect(l.trend).toBe(0);
  });

  it('5 montantes → base 63, trend +5, value 68', () => {
    const pcts = [50, 55, 60, 70, 80];
    const sims = pcts.map((p, i) => simWithOral(i, 'anamnese', p));
    const l = computeL(sims);
    expect(l.base).toBe(63);
    expect(l.trend).toBe(5);
    expect(l.value).toBe(68);
  });

  it('5 descendantes → trend -5', () => {
    const pcts = [80, 70, 60, 55, 50];
    const sims = pcts.map((p, i) => simWithOral(i, 'anamnese', p));
    const l = computeL(sims);
    expect(l.trend).toBe(-5);
  });

  it('6 → samples 5, la plus ancienne ignorée', () => {
    const pcts = [10, 50, 55, 60, 70, 80];
    const sims = pcts.map((p, i) => simWithOral(i, 'anamnese', p));
    const l = computeL(sims);
    expect(l.samples).toBe(5);
    expect(l.base).toBe(63);
  });

  it('partie sans languageGrid (dokumentation) ignorée', () => {
    const sim: Simulation = { ...base, date: 0, parts: { dokumentation: part(80, 80) } };
    const l = computeL([sim]);
    expect(l.samples).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeBereitschaftsindex — T6 (spec §6.1–6.2, ADR-0013)
// ---------------------------------------------------------------------------

/** Partie orale (grille langue présente) : partScore = 0,55·content + 0,30·official + 0,15·feeling. */
const oral = (contentPct: number, officialPct: number): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 50,
  contentPct,
  officialPct,
  languageGrid: {} as PartResult['languageGrid'],
});
/** Dokumentation (pas de grille → officialPct ignoré) : partScore = 0,8·content + 0,2·feeling. */
const doku = (contentPct: number): PartResult => ({ done: true, durationSec: 600, checklist: [], feeling: 50, contentPct, officialPct: 0 });

describe('computeBereitschaftsindex', () => {
  const NOW = Date.UTC(2026, 8, 16, 12); // 2026-09-16 12:00 UTC
  const kardio = caseOf('k1', 'Kardiologie', 10);
  const neuro = caseOf('n1', 'Neurologie', 30);
  const cases = [kardio, neuro];

  /** Jeu de référence calculé à la main (chaque ligne commentée). */
  const reference = (): ReadinessInput => {
    // sim A — autonome, couche 2 (×1,0), il y a 5 j → sourceWeight 2 × recency 1 = 2
    //   anamnese : content 94, official 70, feeling 50 → partScore = round(51,7 + 21 + 7,5) = 80 ; ×1,0 → 80
    //   dokumentation : content 63, feeling 50 → partScore = round(50,4 + 10) = 60 ; ×1,0 → 60
    //   réussie : chaque partie tentée ≥ 60 (80, 60) → couvre Kardiologie (f = 10)
    const simA: Simulation = {
      ...base, id: 'sim-a', caseId: 'k1', assistance: 'autonome', layer: 2, date: NOW - 5 * DAY,
      parts: { anamnese: oral(94, 70), dokumentation: doku(63) },
    };
    // sim B — assistée, couche 1 (×0,8075), il y a 40 j → sourceWeight 1 × recency 0,5 = 0,5
    //   fallvorstellung : content 50, official 50, feeling 50 → partScore = round(27,5 + 15 + 7,5) = 50 ; ×0,8075 = 40,4 → 40
    //   non réussie (50 < 60) et assistée → ne couvre rien
    const simB: Simulation = {
      ...base, id: 'sim-b', caseId: 'n1', assistance: 'assiste', layer: 1, date: NOW - 40 * DAY,
      parts: { fallvorstellung: oral(50, 50) },
    };
    return { sims: [simA, simB], cases, visibleCases: cases };
  };

  it('jeu de référence à l’unité près', () => {
    const bi = computeBereitschaftsindex(reference(), NOW);
    // S : Anamnese 80 (sim A seule) · Dokumentation 60 (sim A seule) · Fallvorstellung 40 (sim B seule) → (80+60+40)/3 = 60
    expect(bi.s.value).toBe(60);
    expect(bi.s.byAxis.map((a) => a.score)).toEqual([80, 60, 40]);
    // C : Kardiologie couverte (f 10) sur un plan Kardiologie 10 + Neurologie 30 = 40 → 100·10/40 = 25
    expect(bi.c.value).toBe(25);
    // L : 2 parties orales (official 70, 50) → base 60 ; samples 2 < 3 → plafonné à 30
    expect(bi.l).toEqual({ value: 30, base: 60, trend: 0, samples: 2 });
    // raw = round(0,5·60 + 0,25·25 + 0,25·30) = round(30 + 6,25 + 7,5) = round(43,75) = 44
    expect(bi.value).toBe(44);
    expect(bi.verdict).toBe('En route'); // 40 ≤ 44 < 65
    // aucun Prüfungstag avec simulant → plafonné (sans effet ici, 44 < 79), pas de date d’expiration
    expect(bi.capped).toBe('no_recent_exam_day');
    expect(bi.capExpiresAt).toBeNull();
    // levier : s 0,5·(100−60) = 20 · c 0,25·(100−25) = 18,75 · l 0,25·(100−30) = 17,5 → 's'
    expect(bi.leverage).toBe('s');
    expect(bi.actions).toEqual([]);
  });

  /** Sim complète (4 parties) à partScore 80 partout, autonome couche 2 (×1,0) sur Kardiologie :
   *  S = 80 (Anamnese : anamnese w + aufklaerung w/2, toutes à 80) · C = 100 (seul cas visible) ·
   *  L = 80 (3 orales à 80, trend 0) → raw = round(40 + 25 + 20) = 85. */
  const strong = (overrides: Partial<Simulation>): ReadinessInput => ({
    sims: [{
      ...base, id: 'sim-strong', caseId: 'k1', assistance: 'autonome', layer: 2, date: NOW - 10 * DAY,
      parts: { anamnese: oral(88, 80), aufklaerung: oral(88, 80), fallvorstellung: oral(88, 80), dokumentation: doku(88) },
      ...overrides,
    }],
    cases: [kardio],
    visibleCases: [kardio],
  });

  it('(a) raw 85 sans Prüfungstag → plafonné à 79', () => {
    const bi = computeBereitschaftsindex(strong({}), NOW);
    expect(bi.s.value).toBe(80);
    expect(bi.c.value).toBe(100);
    expect(bi.l.value).toBe(80);
    expect(bi.value).toBe(79);
    expect(bi.verdict).toBe('Presque prêt');
    expect(bi.capped).toBe('no_recent_exam_day');
    expect(bi.capExpiresAt).toBeNull();
    expect(bi.explain[3]).toBe('Ohne bestandenen Prüfungstag mit Simulant in den letzten 30 Tagen: höchstens 79.');
  });

  it('(b) Prüfungstag solo réussi il y a 10 j → toujours 79', () => {
    const bi = computeBereitschaftsindex(strong({ context: 'pruefungstag', withSimulant: false }), NOW);
    expect(bi.value).toBe(79);
    expect(bi.capped).toBe('no_recent_exam_day');
    expect(bi.capExpiresAt).toBeNull();
  });

  it('(c) Prüfungstag avec simulant réussi il y a 10 j → 85, capExpiresAt = date + 30 j', () => {
    const date = NOW - 10 * DAY;
    const bi = computeBereitschaftsindex(strong({ context: 'pruefungstag', withSimulant: true, date }), NOW);
    expect(bi.value).toBe(85);
    expect(bi.verdict).toBe('Prêt');
    expect(bi.capped).toBe('none');
    expect(bi.capExpiresAt).toBe(date + 30 * DAY);
    const d = new Date(date + 30 * DAY);
    const dd = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
    expect(bi.explain[3]).toBe(`Deckel aufgehoben bis ${dd}`);
  });

  it('(d) Prüfungstag avec simulant il y a 31 j → plafonné', () => {
    const bi = computeBereitschaftsindex(strong({ context: 'pruefungstag', withSimulant: true, date: NOW - 31 * DAY }), NOW);
    expect(bi.value).toBe(79);
    expect(bi.capped).toBe('no_recent_exam_day');
    expect(bi.capExpiresAt).toBeNull();
  });

  it('(e) sim-demo-* ignorée', () => {
    const input = strong({});
    const demo: Simulation = { ...input.sims[0], id: 'sim-demo-x', context: 'pruefungstag', withSimulant: true };
    const withDemo = { ...input, sims: [...input.sims, demo] };
    expect(computeBereitschaftsindex(withDemo, NOW)).toEqual(computeBereitschaftsindex(input, NOW));
    expect(computeBereitschaftsindex({ ...input, sims: [demo] }, NOW).value).toBe(0);
  });

  it('(f) idempotent : deux appels toEqual', () => {
    expect(computeBereitschaftsindex(reference(), NOW)).toEqual(computeBereitschaftsindex(reference(), NOW));
  });

  it('(g) explain : 4 entrées, « nicht getestet » pour un axe vide', () => {
    const bi = computeBereitschaftsindex(reference(), NOW);
    expect(bi.explain).toHaveLength(4);
    expect(bi.explain[0]).toBe(
      'Simulationen 60 — Anamnese 80 % · Dokumentation 60 % · Fallvorstellung 40 %. Gewichtung: Prüfungstag 3 · Autonom 2 · Assistiert 1; ×1 < 30 Tage, ×0,5 30–90, ×0,25 danach.',
    );
    expect(bi.explain[1]).toBe('Abdeckung 25 — 1 von 2 Fachrichtungen deines Plans (die Protokolle zählen 16).');
    expect(bi.explain[2]).toBe('Sprachkurve 30 — Ø 60 % über 2 mündliche Teile (unter 3 Teilen: höchstens 30).');
    const empty = computeBereitschaftsindex({ sims: [], cases, visibleCases: cases }, NOW);
    expect(empty.value).toBe(0);
    expect(empty.verdict).toBe('Pas encore');
    expect(empty.explain[0]).toContain('Anamnese — nicht getestet (zählt 0)');
    expect(empty.explain[0]).not.toMatch(/0 %/);
    expect(empty.leverage).toBe('s'); // égalité impossible ici (50 > 25 > 25) ; c avant l à marge égale
  });

  it('levier : égalité s/c → s (ordre s, c, l)', () => {
    // S = (100 + 50 + 0)/3 = 50 → marge 0,5·50 = 25 ; C = 0 (plan = Neurologie seule, sim sur Kardiologie) → marge 25 ;
    // L : 1 partie orale → plafonné 30 → marge 17,5. Égalité s/c → 's'.
    const sim: Simulation = {
      ...base, id: 'sim-tie', caseId: 'k1', assistance: 'autonome', layer: 2, date: NOW - DAY,
      parts: { anamnese: { ...oral(100, 100), feeling: 100 }, dokumentation: doku(50) },
    };
    const bi = computeBereitschaftsindex({ sims: [sim], cases, visibleCases: [neuro] }, NOW);
    expect(bi.s.value).toBe(50);
    expect(bi.c.value).toBe(0);
    expect(bi.l.value).toBe(30);
    expect(bi.leverage).toBe('s');
    // avec L à 0 (aucune orale) et S à 50 : s 25 · c 25 · l 25 → 's' ; S à 100 → 'c' (égalité c/l)
    const noOral: Simulation = { ...sim, parts: { anamnese: { ...oral(100, 100), feeling: 100, languageGrid: undefined }, dokumentation: doku(50) } };
    expect(computeBereitschaftsindex({ sims: [noOral], cases, visibleCases: [neuro] }, NOW).leverage).toBe('s');
  });

  it('opts.withActions=false → actions []', () => {
    expect(computeBereitschaftsindex(reference(), NOW, { withActions: false }).actions).toEqual([]);
  });
});
