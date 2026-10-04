// Table de vérité de l'échelle d'états du cas et des champs dérivés de la série 4
// (training-journal.md §2.3, §12.6, §12.7, §13.1, §13.2). Les propriétés (INV-53…) vivent
// dans `tests/invariants.mesure.test.ts` ; ici, des cas écrits à la main.
import { describe, it, expect } from 'vitest';
import { computeCaseProgress, blankProgress, trainingEventFromSimulation } from '@/lib/journal';
import { CONSOLIDATION_JOURS } from '@/lib/program/parametres';
import { dayKey } from '@/lib/clock';
import type { ChecklistItem, CaseProgress, PartResult, SimTeil, Simulation, TrainingEvent } from '@/db/types';

const T: SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];
const at = (jour: number, h = 10) => new Date(2026, 8, 1 + jour, h).getTime();      // 1er sept. 2026 + jour, heure locale
const iso = (jour: number) => dayKey(at(jour));
let n = 0;
const ev = (jour: number, scores: Partial<Record<SimTeil, number>>, over: Partial<TrainingEvent> = {}, h = 10): TrainingEvent =>
  ({ id: `e${String(++n).padStart(5, '0')}`, at: at(jour, h) + n, kind: 'simulation', caseId: 'c', teile: T.filter((t) => t in scores), source: 'libre', spentMin: 5, scores, ...over });
const tous = (s: number) => ({ anamnese: s, dokumentation: s, fallvorstellung: s });
const cp = (events: TrainingEvent[]): CaseProgress => computeCaseProgress(events)[0];
const solide = [ev(0, tous(85)), ev(3, tous(85))];                                   // solide au jour 3
const run = (jour: number, over: Partial<TrainingEvent> = {}) => ev(jour, tous(90), { kind: 'examen-blanc', enchaine: true, examen: true, examenManque: [], ...over }, 15);

describe('l’échelle d’états du cas', () => {
  it.each([
    ['aucun événement', [], 'vierge', 0, null, 'vierge'],
    ['un Teil joué', [ev(0, { anamnese: 70 })], 'entame', 1, 70, 'entame'],
    ['deux Teile joués', [ev(0, { anamnese: 70, fallvorstellung: 90 })], 'entame', 2, 80, 'entame'],
    ['trois Teile joués, un acquis', [ev(0, tous(85)), ev(1, { anamnese: 60 })], 'couvert', 3, 77, 'entame'],
    ['trois Teile solides', solide, 'solide', 3, 85, 'solide'],
    ['trois Teile solides + run d’examen', [...solide, run(4)], 'pret', 3, 90, 'solide'],
  ] as const)('%s → %s', (_n, events, etat, couverture, maitrise, overall) => {
    const p = events.length ? cp([...events]) : blankProgress('c');
    expect(p.etat).toBe(etat);
    expect(p.couverture).toBe(couverture);
    expect(p.maitrise).toBe(maitrise);
    expect(p.overall).toBe(overall);
  });

  it('une séance auto-déclarée ne couvre rien : état vierge, « non mesuré » noté', () => {
    const p = cp([ev(0, tous(80), { selbstbewertet: true })]);
    expect(p.etat).toBe('vierge');
    expect(p.couverture).toBe(0);
    expect(p.maitrise).toBeNull();
    expect(p.teile.anamnese.nonMesureAt).toBeDefined();
  });

  it('la maîtrise est la moyenne des DERNIERS scores : un Teil rejoué compte une fois', () => {
    expect(cp([ev(0, { anamnese: 40 }), ev(1, { anamnese: 90 }), ev(2, { dokumentation: 70 })]).maitrise).toBe(80);
  });
});

describe('solideDes (R1) — à partir de quand un ≥ 80 rendrait le Teil solide', () => {
  it('3 jours après la première réussite ≥ 80 ; null si solide, ou sans réussite ≥ 80', () => {
    const p = cp([ev(0, { anamnese: 85, dokumentation: 70, fallvorstellung: 40 }), ev(1, { anamnese: 85 })]);
    expect(p.teile.anamnese.status).toBe('acquis');
    expect(p.teile.anamnese.solideDes).toBe(iso(3));
    expect(p.teile.dokumentation.solideDes ?? null).toBeNull();                       // absent dans la projection, `null` dans le cadran
    expect(p.teile.fallvorstellung.solideDes ?? null).toBeNull();
    expect(cp(solide).teile.anamnese.solideDes ?? null).toBeNull();
  });
});

describe('prochaineConsolidation (§13.1)', () => {
  it('null tant que le cas n’est pas solide', () => expect(cp([ev(0, tous(85))]).prochaineConsolidation).toBeNull());
  it('dernier jeu + 7 jours à la soudure, puis 21, puis 45 (plafonné), un jour de jeu comptant une fois', () => {
    expect(cp(solide).prochaineConsolidation).toBe(iso(3 + CONSOLIDATION_JOURS[0]));
    expect(cp([...solide, ev(3, { anamnese: 90 }, {}, 20)]).prochaineConsolidation).toBe(iso(3 + 7));              // même jour que la soudure : k reste 0
    expect(cp([...solide, ev(5, { anamnese: 90 })]).prochaineConsolidation).toBe(iso(5 + CONSOLIDATION_JOURS[1]));
    expect(cp([...solide, ev(5, { anamnese: 90 }), ev(5, { dokumentation: 90 }, {}, 12), ev(8, { anamnese: 90 })]).prochaineConsolidation).toBe(iso(8 + CONSOLIDATION_JOURS[2]));
    expect(cp([...solide, ev(5, { anamnese: 90 }), ev(8, { anamnese: 90 }), ev(12, { anamnese: 90 })]).prochaineConsolidation).toBe(iso(12 + 45));
  });
  it('une séance auto-déclarée ne repousse pas l’échéance', () => {
    expect(cp([...solide, ev(5, tous(90), { selbstbewertet: true })]).prochaineConsolidation).toBe(iso(3 + 7));
  });
});

describe('pretManque (R1) — ce qui manque au meilleur run récent pour souder', () => {
  it('[] si non solide ou soudé', () => {
    expect(cp([ev(0, tous(85))]).pretManque).toEqual([]);
    expect(cp([...solide, run(4)]).pretManque).toEqual([]);
  });
  it('sans aucun run depuis la soudure : les quatre conditions', () => {
    expect(cp(solide).pretManque).toEqual(['enchaine', 'autonome', 'ordre', 'grille']);
    expect(cp([run(-1), ...solide]).pretManque).toEqual(['enchaine', 'autonome', 'ordre', 'grille']);   // un run d'avant la soudure ne compte pas
  });
  it('le run le plus proche de souder, et à égalité le plus récent', () => {
    const proche = ev(4, tous(90), { enchaine: true, examenManque: ['ordre'] }, 14);
    const loin = ev(5, tous(90), { examenManque: ['enchaine', 'autonome'] }, 14);
    expect(cp([...solide, proche, loin]).pretManque).toEqual(['ordre']);
    const aussi = ev(6, tous(90), { enchaine: true, examenManque: ['grille'] }, 14);
    expect(cp([...solide, proche, aussi]).pretManque).toEqual(['grille']);
  });
  it('les parties antérieures (sans `examenManque`) ne comptent pas comme run', () => {
    expect(cp([...solide, ev(4, tous(90), { kind: 'examen-blanc' })]).pretManque).toEqual(['enchaine', 'autonome', 'ordre', 'grille']);
  });
});

describe('dérivation de `minutesParTeil` et `manques` (§2.3, §13.3, §13.4)', () => {
  const item = (id: string, checked: boolean): ChecklistItem => ({ id, label: id, checked });
  const part = (over: Partial<PartResult> = {}): PartResult => ({ done: true, durationSec: 600, checklist: [], feeling: 70, contentPct: 80, officialPct: 80, ...over });
  const sim = (parts: Simulation['parts'], over: Partial<Simulation> = {}): Simulation =>
    ({ id: 's1', caseId: 'c', date: at(0), parts, notes: {}, prioritizedCorrections: [], ...over } as Simulation);

  it('minutes par Teil joué, arrondies, seulement si la durée est positive', () => {
    const te = trainingEventFromSimulation(sim({ anamnese: part({ durationSec: 650 }), dokumentation: part({ durationSec: 0 }), fallvorstellung: part({ durationSec: 90 }) }));
    expect(te.minutesParTeil).toEqual({ anamnese: 11, fallvorstellung: 2 });
  });
  it('manques : les ids non cochés de chaque Teil joué, [] si tout est coché, absent sans checklist', () => {
    const te = trainingEventFromSimulation(sim({
      anamnese: part({ checklist: [item('anam-allergien', false), item('anam-noxen', true), item('anam-familie', false)] }),
      dokumentation: part({ checklist: [item('doku-a', true)] }),
      fallvorstellung: part({ checklist: [] }),
    }));
    expect(te.manques).toEqual({ anamnese: ['anam-allergien', 'anam-familie'], dokumentation: [] });
  });
  it('une partie à ids legacy `cl-N` n’a pas de `manques` (checklist reconstruite décochée : elle signalerait tout)', () => {
    const te = trainingEventFromSimulation(sim({ anamnese: part({ checklist: [item('cl-3', false), item('anam-noxen', false)] }), dokumentation: part({ checklist: [item('doku-a', false)] }) }));
    expect(te.manques).toEqual({ dokumentation: ['doku-a'] });
  });
  it('une séance IA externe n’a pas de `manques` : pas de checklist cochée par le candidat', () => {
    expect(trainingEventFromSimulation(sim({ anamnese: part({ checklist: [item('anam-noxen', false)] }) }, { mode: 'external-ai' })).manques).toBeUndefined();
  });
});
