// La tâche de cas — training-journal.md §12.1, §12.2, §12.3 · INV-50 (lecture), INV-52 (statut), INV-54, INV-67.
// Table de vérité de `teileDeTache`, `resteTache`, `statutTache`, `lireTache` et `restePlan`.
import { describe, it, expect } from 'vitest';
import type { CaseProgress, SimTeil, TaskInstance, TeilProgress, TrainingEvent } from '@/db/types';
import { blankProgress } from '@/lib/progression';
import { debutJour } from './fuseau';
import { evaluerTache } from './completion';
import { lireTache, restePlan, resteTache, statutTache, teileDeTache } from './tacheDeCas';

const A: SimTeil = 'anamnese', D: SimTeil = 'dokumentation', F: SimTeil = 'fallvorstellung';
const TZ = 'Europe/Berlin';
const JOUR = '2026-10-05';
const T0 = debutJour(JOUR, TZ);
const h = (n: number) => T0 + n * 3600_000;

const tache = (over: Partial<TaskInstance> = {}): TaskInstance => ({
  id: 't1', date: JOUR, kind: 'simulation', caseId: 'c1', label: 'Cas 1', estMin: 40, source: 'plan', reason: 'r', teile: [A, D, F], ...over,
});
let n = 0;
const partie = (teile: SimTeil[], at: number, over: Partial<TrainingEvent> = {}): TrainingEvent => ({
  id: `e${String(++n).padStart(4, '0')}`, at, kind: 'simulation', caseId: 'c1', teile, source: 'libre', spentMin: 10,
  scores: Object.fromEntries(teile.map((t) => [t, 70])), ...over,
});

describe('teileDeTache — lecture tolérante (§12.1, INV-54)', () => {
  it('teile d’abord ; sinon [teil] (plan série 3) ; sinon les trois pour un run complet ; sinon rien', () => {
    expect(teileDeTache(tache({ teile: [D, F] }))).toEqual([D, F]);
    expect(teileDeTache(tache({ teile: undefined, teil: F }))).toEqual([F]);
    expect(teileDeTache(tache({ teile: undefined }))).toEqual([A, D, F]);
    expect(teileDeTache(tache({ teile: undefined, kind: 'revision' }))).toEqual([A, D, F]);
    expect(teileDeTache(tache({ teile: undefined, kind: 'examen-blanc' }))).toEqual([A, D, F]);
    for (const kind of ['drill', 'fachwissen', 'aufklaerung'] as const) expect(teileDeTache(tache({ teile: undefined, kind }))).toEqual([]);
  });
});

describe('resteTache — ce qui reste dans la journée (§12.2)', () => {
  it('teileDeTache \\ avancement', () => {
    expect(resteTache(tache(), [], TZ)).toEqual([A, D, F]);
    expect(resteTache(tache(), [partie([A], h(9))], TZ)).toEqual([D, F]);
    expect(resteTache(tache(), [partie([D], h(9)), partie([A], h(10))], TZ)).toEqual([F]);
    expect(resteTache(tache(), [partie([A, D, F], h(9))], TZ)).toEqual([]);
  });
  it('un Teil joué hors de la tâche (un autre cas, la veille, avant sa création) n’avance rien', () => {
    expect(resteTache(tache(), [partie([A], h(9), { caseId: 'autre' })], TZ)).toEqual([A, D, F]);
    expect(resteTache(tache(), [partie([A], h(-3))], TZ)).toEqual([A, D, F]);                   // la veille au soir
    expect(resteTache(tache({ creeA: h(10) }), [partie([A], h(9))], TZ)).toEqual([A, D, F]);    // avant la création de la tâche
    expect(resteTache(tache({ creeA: h(10) }), [partie([A], h(10))], TZ)).toEqual([D, F]);      // la création compte
  });
  it('d’un trait : trois Teile joués séparément laissent la tâche ouverte, « à rejouer d’un trait » = les trois (I5)', () => {
    const t = tache({ kind: 'revision', dUnTrait: true });
    expect(resteTache(t, [partie([A], h(9)), partie([D], h(10)), partie([F], h(11))], TZ)).toEqual([A, D, F]);
    expect(resteTache(t, [partie([A], h(9))], TZ)).toEqual([D, F]);
    expect(evaluerTache(t, [partie([A], h(9)), partie([D], h(10)), partie([F], h(11))], TZ).aRejouerDUnTrait).toBe(true);
  });
});

describe('statutTache — jamais « manquée » (INV-52)', () => {
  it.each([
    ['rien joué', [], 'a-faire'],
    ['un Teil sur trois', [[A]], 'entamee'],
    ['deux Teile en deux parties', [[A], [D]], 'entamee'],
    ['les trois Teile en deux parties', [[A, D], [F]], 'faite'],
    ['les trois Teile d’un coup', [[A, D, F]], 'faite'],
  ] as const)('%s', (_n, parties, statut) => {
    const evs = parties.map((p, i) => partie([...p], h(9 + i)));
    expect(statutTache(tache(), evs, TZ)).toBe(statut);
  });
  it('une tâche d’un Teil restant (reprise) est faite quand CE Teil est joué', () => {
    expect(statutTache(tache({ teile: [D] }), [partie([A], h(9))], TZ)).toBe('a-faire');
    expect(statutTache(tache({ teile: [D] }), [partie([D], h(9))], TZ)).toBe('faite');
  });
  it('une séance IA externe auto-déclarée avance et peut cocher, mais jamais une tâche d’un trait', () => {
    const ia = partie([A, D, F], h(9), { selbstbewertet: true, scores: undefined });
    expect(statutTache(tache(), [ia], TZ)).toBe('faite');
    expect(statutTache(tache({ dUnTrait: true }), [ia], TZ)).toBe('entamee');
  });
  it('d’un trait : seule une partie enchaînée coche', () => {
    const t = tache({ dUnTrait: true });
    expect(statutTache(t, [partie([A, D, F], h(9))], TZ)).toBe('entamee');                    // trois Teile, mais pas enchaînée
    expect(statutTache(t, [partie([A, D, F], h(9), { enchaine: true })], TZ)).toBe('faite');
  });
  it('le genre de la partie ne compte pas (I3) : un examen à blanc coche une tâche simulation, une simulation coche une révision', () => {
    expect(statutTache(tache(), [partie([A, D, F], h(9), { kind: 'examen-blanc' })], TZ)).toBe('faite');
    expect(statutTache(tache({ kind: 'revision' }), [partie([A, D, F], h(9))], TZ)).toBe('faite');
  });
  it('une coche manuelle (coche nue portant le taskId) fait la tâche ; une fiche lue ne fait pas une tâche de cas', () => {
    const coche = partie([], h(9), { taskId: 't1', spentMin: 0, scores: undefined, caseId: 'c1' });
    expect(statutTache(tache(), [coche], TZ)).toBe('faite');
    expect(statutTache(tache(), [partie([], h(9), { kind: 'fiche', scores: undefined })], TZ)).toBe('a-faire');
  });
  it('tâches hors cas : pas d’état « entamée » ; le genre compte', () => {
    const drill = tache({ kind: 'drill', caseId: undefined, teile: undefined });
    expect(statutTache(drill, [], TZ)).toBe('a-faire');
    expect(statutTache(drill, [partie([], h(9), { kind: 'drill', caseId: undefined, scores: undefined })], TZ)).toBe('faite');
    expect(statutTache(drill, [partie([A], h(9))], TZ)).toBe('a-faire');                        // une simulation ne fait pas le drill
    const fiche = tache({ kind: 'fachwissen', teile: undefined });
    expect(statutTache(fiche, [partie([], h(9), { kind: 'fiche', scores: undefined })], TZ)).toBe('faite');
    expect(statutTache(fiche, [partie([], h(9), { kind: 'fiche', caseId: 'autre', scores: undefined })], TZ)).toBe('a-faire');   // la fiche d'un AUTRE cas
    const aufk = tache({ kind: 'aufklaerung', caseId: undefined, teile: undefined });
    expect(statutTache(aufk, [partie([], h(9), { kind: 'aufklaerung', caseId: undefined, scores: undefined })], TZ)).toBe('faite');
  });
});

describe('lireTache — le filtrage de tout plan venu de la synchro (m4, §12.1)', () => {
  const lire = (over: Record<string, unknown>) => lireTache({ ...tache(), ...over }, { date: JOUR, tz: TZ });
  it('teile : les trois clés connues, dédoublonnées, dans l’ordre d’examen ; vide ⇒ absent', () => {
    expect(lire({ teile: ['fallvorstellung', 'anamnese', 'anamnese', 'hack', 42] })!.teile).toEqual([A, F]);
    expect(lire({ teile: ['hack'] })).not.toHaveProperty('teile');
    expect(lire({ teile: [] })).not.toHaveProperty('teile');
    expect(lire({ teile: 'anamnese' })).not.toHaveProperty('teile');
  });
  it('rappel : conservé seulement s’il appartient à la checklist d’un Teil de la tâche', () => {
    expect(lire({ teile: [A], rappel: 'anam-allergien' })!.rappel).toBe('anam-allergien');
    expect(lire({ teile: [A], rappel: 'doku-diagnose' })).not.toHaveProperty('rappel');       // un item d'un Teil qui n'est pas dans la tâche
    expect(lire({ rappel: 'n-importe-quoi' })).not.toHaveProperty('rappel');
    expect(lire({ rappel: 7 })).not.toHaveProperty('rappel');
  });
  it('dUnTrait : seulement exactement `true`', () => {
    expect(lire({ dUnTrait: true })!.dUnTrait).toBe(true);
    for (const v of [1, 'true', false, null, {}]) expect(lire({ dUnTrait: v })).not.toHaveProperty('dUnTrait');
  });
  it('creeA : un entier fini compris dans le jour du plan, au fuseau du plan', () => {
    expect(lire({ creeA: h(9) })!.creeA).toBe(h(9));
    for (const v of [h(-1), h(24), 1.5 + h(9), Number.NaN, Infinity, '9', null]) expect(lire({ creeA: v }), String(v)).not.toHaveProperty('creeA');
  });
  it('un champ invalide est retiré ; la tâche, jamais — sauf sans identifiant', () => {
    const t = lire({ teile: ['hack'], dUnTrait: 3, creeA: 'x', rappel: 3 })!;
    expect(t.id).toBe('t1'); expect(t.caseId).toBe('c1');
    expect(lireTache({ kind: 'simulation' }, { date: JOUR })).toBeNull();
    expect(lireTache(null, { date: JOUR })).toBeNull();
  });
  it('une tâche de la série 3 (teil, sans teile) traverse intacte : `teil` est LU, pas retiré', () => {
    const t = lireTache({ ...tache(), teile: undefined, teil: F }, { date: JOUR, tz: TZ })!;
    expect(t.teil).toBe(F); expect(teileDeTache(t)).toEqual([F]);
  });
});

describe('restePlan — ce qui reste à PLANIFIER le jour D (§12.2, INV-67, réserve R2)', () => {
  const teil = (over: Partial<TeilProgress> = {}): TeilProgress => ({ status: 'acquis', lastScore: 70, lastAt: Date.parse('2026-10-01T10:00:00Z'), attempts: 1, ...over });
  const cp = (a: Partial<TeilProgress>, d: Partial<TeilProgress>, f: Partial<TeilProgress>): CaseProgress =>
    ({ ...blankProgress('c1'), teile: { anamnese: teil(a), dokumentation: teil(d), fallvorstellung: teil(f) } });
  const joueIlYa = (jours: number, jour = '2026-10-10') => new Date(`${jour}T10:00:00`).getTime() - jours * 86_400_000;

  it('un cas jamais vu : les trois Teile, dans l’ordre d’examen', () => {
    expect(restePlan(undefined, '2026-10-10')).toEqual([A, D, F]);
    expect(restePlan(blankProgress('c1'), '2026-10-10')).toEqual([A, D, F]);
  });
  it('un Teil solide n’y est jamais', () => {
    expect(restePlan(cp({ status: 'solide', lastAt: joueIlYa(30) }, {}, { status: 'solide', lastAt: joueIlYa(30) }), '2026-10-10')).toEqual([D]);
  });
  it.each([[0, false], [1, false], [2, false], [3, true], [4, true]] as const)(
    'un Teil non solide joué il y a %i jour(s) : %s dans le reste (trois jours calendaires d’écart)',
    (jours, dedans) => {
      const c = cp({ status: 'acquis', lastAt: joueIlYa(jours) }, { status: 'solide', lastAt: joueIlYa(40) }, { status: 'solide', lastAt: joueIlYa(40) });
      expect(restePlan(c, '2026-10-10').includes(A)).toBe(dedans);
    });
  it('un Teil fragile est lui aussi attendu pendant l’écart (la lettre de R2 : « non solide »)', () => {
    expect(restePlan(cp({ status: 'fragile', lastScore: 30, lastAt: joueIlYa(1) }, { status: 'solide' }, { status: 'solide' }), '2026-10-10')).toEqual([]);
  });
  it('le jour calendaire, pas 72 h : joué le 7 à 23 h, rejouable le 10 dès minuit', () => {
    const c = cp({ status: 'acquis', lastAt: new Date('2026-10-07T23:00:00').getTime() }, { status: 'solide' }, { status: 'solide' });
    expect(restePlan(c, '2026-10-10')).toEqual([A]);
    expect(restePlan(c, '2026-10-09')).toEqual([]);
  });
});
