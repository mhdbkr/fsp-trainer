import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/db/db';
import { checklistFor } from '@/lib/checklists';
import { freezeAt, resetClock } from '@/lib/clock';
import type { Case, LanguageGrid, PartResult, SimTeil } from '@/db/types';
import { erstelleLauf, setzeEntwurf, tickChrono, transition } from './automat';
import { ladeAktivenLauf, projektion, speichereAktivenLauf, speichern } from './speichern';
import type { Lauf } from './types';

// ============================================================================
// Série 4 — ce que la partie ÉCRIT (simulation-run.md §3.2, §10.4).
//   INV-71  `parts` = `teileGespielt`, jamais `geplanteTeile`
//   INV-72  `dauerGesamtSec` garde le Teil abandonné par `springeZu`
//   INV-73  `enchaine` ⇔ `enchainiert(lauf)` ; `examen` s'en dérive au journal
//   INV-75  `date` = `startedAt`, à cheval sur minuit compris
// ============================================================================

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const c = {
  id: 'c1', name: 'Cas 1', pathology: 'x', specialty: 'X',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: {},
} as unknown as Case;

const MODELLE = () => [...checklistFor('anamnese'), ...checklistFor('dokumentation'), ...checklistFor('fallvorstellung'), ...checklistFor('aufklaerung')];
const GRILLE: LanguageGrid = { aussprache: 4, wortschatz: 4, grammatik: 4, redefluss: 4, kommunikation: 4 };
const res = (durationSec: number): PartResult => ({ done: true, durationSec, checklist: [], feeling: 70, contentPct: 80, officialPct: 0 });

const neu = (over: Partial<Parameters<typeof erstelleLauf>[0]> = {}) =>
  transition(erstelleLauf({ caseId: 'c1', caseName: 'Cas 1', profileId: 'u', assistance: 'autonome', layer: 2, mode: 'texte', ...over }),
    { typ: 'demarrer', checkliste: MODELLE() });

/** Joue `ordre` d'un trait, chaque Teil `sec` secondes, grilles de langue saisies. */
function spiele(ordre: SimTeil[], sec = 600, over: Partial<Parameters<typeof erstelleLauf>[0]> = {}): Lauf {
  let l = neu(over);
  if (ordre[0] !== 'anamnese') l = transition(l, { typ: 'springeZu', teil: ordre[0] });
  ordre.forEach((t, i) => {
    if (i > 0) l = transition(l, { typ: 'partieSuivante', teil: t });
    l = tickChrono(l, t, sec);
    if (t !== 'dokumentation') l = setzeEntwurf(l, t, { grid: GRILLE });
    l = transition(l, { typ: 'terminerPartie', ergebnis: { ...res(sec), languageGrid: t !== 'dokumentation' ? GRILLE : undefined } });
  });
  return transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
}

beforeEach(async () => {
  await db.simulations.clear(); await db.training_events.clear(); await db.meta.clear();
  await db.cases.clear(); await db.cases.put(c);
});
afterEach(() => resetClock());

describe('INV-71 — « Terminer ici » : la Simulation écrite porte les Teile JOUÉS', () => {
  it('trois Teile planifiés, l’Anamnese seule jouée : parts = { anamnese }', async () => {
    let l = neu();
    l = transition(l, { typ: 'terminerPartie', ergebnis: res(300) });
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
    expect(l.geplanteTeile).toHaveLength(3);
    const sim = await speichern(l, c);
    expect(Object.keys(sim.parts)).toEqual(['anamnese']);
    expect(sim.reihenfolge).toEqual(['anamnese']);
    expect(sim.enchaine).toBeUndefined();
  });
});

describe('INV-75 — le jour d’une partie est celui de son début', () => {
  it('commencée à 23 h 50, enregistrée à 0 h 20 : date = startedAt, et le journal aussi', async () => {
    const avance = freezeAt(new Date(2026, 9, 5, 23, 50).getTime());
    let l = neu();
    const debut = l.startedAt;
    avance(30 * 60_000);                                     // 0 h 20, le lendemain
    l = tickChrono(l, 'anamnese', 1800);
    l = transition(l, { typ: 'terminerPartie', ergebnis: res(1800) });
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
    const sim = await speichern(l, c);
    expect(sim.date).toBe(debut);
    const te = await db.training_events.get(`te-${sim.id}`);
    expect(te?.at).toBe(debut);
    expect(te?.spentMin).toBe(30);
  });
});

describe('INV-72 — le temps d’une partie garde le Teil abandonné et l’Aufklärung', () => {
  // Depuis le fixeur I11, `springeZu` n'est permis que chrono de t0 à zéro : un Teil quitté n'a plus de temps à perdre
  // par ce chemin. La règle de projection (m6 : TOUS les Teile commencés) reste, prouvée sur un Lauf où un Teil a du
  // temps sans être joué (un `lauf.aktiv` d'avant la règle).
  it('un Teil commencé non joué (95 s), Dokumentation (600 s), Aufklärung (240 s) : 935 s', async () => {
    let l = transition(neu(), { typ: 'springeZu', teil: 'dokumentation' });
    l = { ...l, sekundenProTeil: { ...l.sekundenProTeil, anamnese: 95 } };
    l = transition(l, { typ: 'aufklaerungOeffnen', checkliste: checklistFor('aufklaerung') });
    l = tickChrono(l, 'aufklaerung', 240);
    l = transition(l, { typ: 'terminerPartie', ergebnis: res(240) });
    l = transition(l, { typ: 'partieSuivante' });
    l = tickChrono(l, 'dokumentation', 600);
    l = transition(l, { typ: 'terminerPartie', ergebnis: res(600) });
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
    const sim = await speichern(l, c);
    expect(sim.dauerGesamtSec).toBe(935);
    expect(sim.reihenfolge).toEqual(['dokumentation']);    // limité aux SimTeil, dans l'ordre joué
    expect((await db.training_events.get(`te-${sim.id}`))?.spentMin).toBe(16);
  });
});

describe('INV-73 — le marqueur d’enchaînement et la dérivation `examen`', () => {
  it('A → D → F d’un trait en Autonome, grilles saisies : enchaine, et le journal dit examen', async () => {
    const sim = await speichern(spiele(['anamnese', 'dokumentation', 'fallvorstellung']), c);
    expect(sim.enchaine).toBe(true);
    expect(sim.reihenfolge).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    const te = await db.training_events.get(`te-${sim.id}`);
    expect(te?.enchaine).toBe(true);
    expect(te?.examen).toBe(true);
    expect(te?.kind).toBe('examen-blanc');
  });

  it('D → A → F d’un trait : enchaîné, mais pas en conditions d’examen (ordre)', async () => {
    const sim = await speichern(spiele(['dokumentation', 'anamnese', 'fallvorstellung']), c);
    expect(sim.enchaine).toBe(true);
    const te = await db.training_events.get(`te-${sim.id}`);
    expect(te?.examen).toBeUndefined();
    expect(te?.examenManque).toEqual(['ordre']);
  });

  it('interrompue (≥ 5 min) : `enchaine` absent de la Simulation', async () => {
    const l = { ...spiele(['anamnese', 'dokumentation', 'fallvorstellung']), unterbrochen: true as const };
    const sim = await speichern(l, c);
    expect('enchaine' in sim).toBe(false);
  });

  it('projektion : `enchaine` n’est jamais écrit à `false`, il est absent', () => {
    const p = projektion(neu(), c);
    expect('enchaine' in p).toBe(false);
  });
});

describe('§3.1 — `speichereAktivenLauf` date la persistance (`zuletztAktiv`)', () => {
  it('le Lauf relu est le Lauf écrit, plus l’instant de l’écriture — rien d’autre', async () => {
    freezeAt(new Date(2026, 9, 5, 18, 0).getTime());
    const l = neu();
    await speichereAktivenLauf(l);
    const wieder = await ladeAktivenLauf();
    expect(wieder).toEqual({ ...l, zuletztAktiv: new Date(2026, 9, 5, 18, 0).getTime() });
    expect(wieder?.unterbrochen).toBeUndefined();          // la LECTURE ne pose pas la marque : seule la reprise
  });
});
