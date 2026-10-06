// ============================================================================
// S4-5 — la page Programme : ce qu'elle LIT (training-journal.md §12.6, §12.9, §13.5, §13.6). Oracles écrits à la lettre
// de la proposition validée (« 4 · Programme ») ; chaque bloc a sa mutation dans `parcours-mutations.mjs`.
//   · la semaine : un point par cas prévu, rempli quand il est joué ; les jours off sont neutres ;
//   · jusqu'à l'examen : une projection sur le rythme réel, recalculée chaque soir, sans phrase s'il n'y a rien à projeter ;
//   · la carte de couverture : pondérée par la fréquence ; l'encart dit UNE chose, avec une action et une fréquence sourcée.
// ============================================================================
import { describe, it, expect } from 'vitest';
import type { Case, CaseProgress, DayPlan, ProgramConfig, SimTeil, TaskInstance, TrainingEvent } from '@/db/types';
import { blankProgress } from '@/lib/progression';
import { phraseFrequence, type Frequences } from '@/lib/program/couverturePonderee';
import { carteCouverture, encartCouverture, projectionExamen, semaine } from '@/lib/program/pageProgramme';

const EXAM_CLAIM = /jury|officiel|règle FSP|Bestanden|attendu|exigé/i;
const TEILE: SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

const cas = (id: string, specialty: string, frequency: number): Case => ({ id, name: `Cas ${id}`, specialty, frequency, centers: [] } as unknown as Case);
const couvert = (id: string, n: number): CaseProgress => {
  const cp = blankProgress(id);
  TEILE.slice(0, n).forEach((t) => { cp.teile[t] = { ...cp.teile[t], status: 'acquis', attempts: 1, lastScore: 70, lastAt: 1 }; });
  return { ...cp, couverture: n as 0 | 1 | 2 | 3, etat: n === 0 ? 'vierge' : n < 3 ? 'entame' : 'couvert' };
};
/** Une table « source » : chaque cas a sa pathologie `P <id>` (total = sa fréquence), sauf les partages donnés. */
const table = (cases: Case[], n: number, partage: Record<string, string> = {}, parVille: Frequences['parVille'] = {}, ventile: Record<string, Partial<Record<string, number>>> = {}): Frequences => {
  const cas = Object.fromEntries(cases.map((c) => [c.id, partage[c.id] ?? `p-${c.id}`]));
  const pathologies = Object.fromEntries(cases.map((c) => [cas[c.id], { nom: `P ${cas[c.id].replace(/^p-/, '')}`, total: c.frequency, parVille: ventile[cas[c.id]] ?? {} }]));
  return { n, parVille, pathologies, cas };
};

// --- La semaine ---------------------------------------------------------------

const config = { startDate: '2026-09-01', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
const tache = (date: string, caseId: string | undefined, extra: Partial<TaskInstance> = {}): TaskInstance => ({
  id: `${date}-${caseId ?? 'drill'}`, date, kind: caseId ? 'simulation' : 'drill', caseId, label: caseId ? `Cas ${caseId}` : 'Fachbegriffe',
  teile: caseId ? [...TEILE] : undefined, estMin: 20, source: 'plan', reason: 'r', ...extra,
});
const plan = (date: string, tasks: TaskInstance[]): DayPlan => ({ date, tasks, targetMin: 120, mode: 'cas-complet', seed: 's', materializedAt: 0 } as unknown as DayPlan);
const partie = (id: string, caseId: string, at: string, teile: SimTeil[], spentMin = 20, score = 50): TrainingEvent => ({
  id, at: new Date(at).getTime(), kind: 'simulation', caseId, teile, source: 'libre', spentMin, laufId: `l${id}`,
  scores: Object.fromEntries(teile.map((t) => [t, score])),
});

describe('la semaine — un point par cas prévu, rempli quand il est joué', () => {
  // Mercredi 14 octobre 2026 ; la semaine va du lundi 12 au dimanche 18 ; samedi et dimanche sont off.
  const plans = new Map([
    ['2026-10-12', plan('2026-10-12', [tache('2026-10-12', 'a', { doneAt: 1 }), tache('2026-10-12', 'b'), tache('2026-10-12', undefined)])],
    ['2026-10-13', plan('2026-10-13', [])],
    ['2026-10-14', plan('2026-10-14', [tache('2026-10-14', 'c'), tache('2026-10-14', 'd')])],
  ]);
  const projection = new Map([['2026-10-15', [tache('2026-10-15', 'e'), tache('2026-10-15', undefined)]]]);
  const events = [partie('p1', 'c', '2026-10-14T09:00:00', ['anamnese'])];
  const s = semaine({ today: '2026-10-14', plans, projection, events, config });
  const jour = (d: string) => s.find((j) => j.date === d)!;

  it('sept jours, du lundi au dimanche', () => {
    expect(s.map((j) => j.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  });
  it('un point par CAS prévu (le drill n\'en a pas) ; rempli quand la tâche est faite, entamé quand une partie l\'a fait avancer', () => {
    expect(jour('2026-10-12').points.map((p) => [p.caseId, p.etat])).toEqual([['a', 'fait'], ['b', 'prevu']]);
    expect(jour('2026-10-14').points.map((p) => [p.caseId, p.etat])).toEqual([['c', 'entame'], ['d', 'prevu']]);
  });
  it('un jour à venir montre sa projection, non figée', () => {
    expect(jour('2026-10-15').points.map((p) => [p.caseId, p.etat])).toEqual([['e', 'projete']]);
  });
  it('les jours off sont neutres : un plan sans tâche, ou un jour off du programme sans plan', () => {
    expect(jour('2026-10-13')).toMatchObject({ off: true, points: [] });
    expect(jour('2026-10-17')).toMatchObject({ off: true, points: [] });
    expect(jour('2026-10-18')).toMatchObject({ off: true, points: [] });
    expect(jour('2026-10-14').off).toBe(false);
  });
  it('le travail fait hors du plan : un point plein par cas joué, une fois ; un jour off où l\'on a joué n\'est plus off', () => {
    const hors = [...events, partie('h1', 'q', '2026-10-12T20:00:00', ['anamnese']), partie('h2', 'q', '2026-10-12T21:00:00', ['dokumentation']),
      partie('h3', 'b', '2026-10-12T20:30:00', ['anamnese']), partie('h4', 'z', '2026-10-17T10:00:00', ['anamnese'])];
    const t = semaine({ today: '2026-10-18', plans, projection: new Map(), events: hors, config, cases: [cas('q', 'Neurologie', 1), cas('z', 'Neurologie', 1)] });
    expect(t[0].points.map((p) => [p.caseId, p.etat, p.label])).toEqual([['a', 'fait', 'Cas a'], ['b', 'entame', 'Cas b'], ['q', 'hors-plan', 'Cas q']]);
    expect(t[5]).toMatchObject({ off: false, points: [{ caseId: 'z', etat: 'hors-plan' }] });
  });
  it('un jour passé sans plan n\'est ni off ni en retard : il est vide', () => {
    const t = semaine({ today: '2026-10-16', plans: new Map(), projection: new Map(), events: [], config });
    expect(t.find((j) => j.date === '2026-10-14')).toMatchObject({ off: false, points: [] });
  });
});

// --- Jusqu'à l'examen ---------------------------------------------------------

describe('jusqu\'à l\'examen — une projection sur le rythme réel, recalculée chaque soir', () => {
  const cases = [cas('f1', 'Kardiologie', 10), cas('f2', 'Kardiologie', 10), cas('f3', 'Pneumologie', 10), cas('f4', 'Gastroenterologie', 10), cas('r1', 'Neurologie', 1)];
  // Mercredi 14 oct. La fenêtre : les 14 jours du 30 sept. au 13 oct., dont 10 ouvrés. 5 parties de 40 min = 200 min ⇒ 20 min par jour ouvré.
  const jours = ['2026-09-30', '2026-10-02', '2026-10-06', '2026-10-08', '2026-10-12'];
  const base = jours.map((d, i) => partie(`w${i}`, 'f1', `${d}T19:00:00`, ['anamnese'], 40));

  it('la date et la marge, au rythme des deux dernières semaines (4 cas fréquents × 52 min, 20 min par jour ouvré)', () => {
    const p = projectionExamen({ cases, events: base, config, today: '2026-10-14' })!;
    expect(p).toMatchObject({ n: 4, date: '2026-10-29', marge: 50 });
    expect(p.texte).toBe('À ton rythme des deux dernières semaines, tu auras travaillé les 4 cas les plus fréquents le 29 oct., avec 50 jours de marge pour les reprendre.');
    expect(p.texte).not.toMatch(EXAM_CLAIM);
    expect(p.texte).not.toMatch(/%|retard|alerte|attention|manqu|insuffisan/i);
  });
  it('recalculée chaque soir : rien de ce qui est fait AUJOURD\'HUI ne la change', () => {
    const solides = cases.flatMap((c) => [partie(`s1${c.id}`, c.id, '2026-10-14T08:00:00', TEILE, 300, 95), partie(`s2${c.id}`, c.id, '2026-10-14T20:00:00', TEILE, 300, 95)]);
    expect(projectionExamen({ cases, events: [...base, ...solides], config, today: '2026-10-14' })).toEqual(projectionExamen({ cases, events: base, config, today: '2026-10-14' }));
  });
  it('le rythme est celui des CAS : un drill ou une coche sans partie n\'accélère rien', () => {
    const drill: TrainingEvent = { id: 'dr', at: new Date('2026-10-07T19:00:00').getTime(), kind: 'drill', teile: [], source: 'libre', spentMin: 500 };
    expect(projectionExamen({ cases, events: [...base, drill], config, today: '2026-10-14' })!.date).toBe('2026-10-29');
  });
  it('si le rythme baisse, la date recule — et la phrase le dit sans alarme, même après l\'examen', () => {
    const lent = [partie('w0', 'f1', '2026-10-01T19:00:00', ['anamnese'], 10)];
    const p = projectionExamen({ cases, events: lent, config, today: '2026-10-14' })!;
    expect(p.date > '2026-12-18').toBe(true);
    expect(p.marge).toBeNull();
    expect(p.texte).toMatch(/^À ton rythme des deux dernières semaines, tu auras travaillé les 4 cas les plus fréquents le \d+ \S+, après ton examen du 18 déc\.$/);
    expect(p.texte).not.toMatch(/marge|retard|alerte|attention|!/i);
  });
  it('une fenêtre plus courte que deux semaines se dit telle quelle', () => {
    const p = projectionExamen({ cases, events: base.slice(2), config: { ...config, startDate: '2026-10-05' }, today: '2026-10-14' })!;
    expect(p.texte).toMatch(/^À ton rythme de ces 9 derniers jours, /);
  });
  it('rien à projeter ⇒ aucune phrase : pas d\'examen, pas de rythme, trop peu de jours, ou tout est déjà solide', () => {
    expect(projectionExamen({ cases, events: base, config: { ...config, examDate: undefined } as ProgramConfig, today: '2026-10-14' })).toBeNull();
    expect(projectionExamen({ cases, events: [], config, today: '2026-10-14' })).toBeNull();
    expect(projectionExamen({ cases, events: base, config: { ...config, startDate: '2026-10-12' }, today: '2026-10-14' })).toBeNull();
    expect(projectionExamen({ cases, events: base, config, today: '2026-12-18' })).toBeNull();
    const solides = cases.flatMap((c) => [partie(`a${c.id}`, c.id, '2026-10-01T08:00:00', TEILE, 30, 90), partie(`b${c.id}`, c.id, '2026-10-05T08:00:00', TEILE, 30, 90)]);
    expect(projectionExamen({ cases, events: solides, config, today: '2026-10-14' })).toBeNull();
  });
});

// --- La carte de couverture et son encart ------------------------------------

describe('la carte de couverture — pondérée par la fréquence, par pathologie', () => {
  // g1 et g2 partagent la pathologie « pg » (6 protocoles) : elle ne pèse qu'une fois.
  const cases = [cas('k1', 'Kardiologie', 14), cas('g1', 'Gastroenterologie', 6), cas('g2', 'Gastroenterologie', 6), cas('g3', 'Gastroenterologie', 5),
    cas('g0', 'Gastroenterologie', 20), cas('k2', 'Kardiologie', 2), cas('n1', 'Neurologie', 0)];
  const progress = new Map([['g0', couvert('g0', 3)], ['k2', couvert('k2', 1)]]);
  const f = table(cases, 200, { g1: 'pg', g2: 'pg' }, { Stuttgart: 50 }, { pg: { Stuttgart: 9 }, 'p-k1': { Stuttgart: 2 } });

  it('les spécialités par poids de pathologies distinctes, puis les cas par poids ; la base est n de la source', () => {
    const c = carteCouverture(cases, progress, f, 'Alle');
    expect(c.specialites.map((s) => [s.specialite, s.poids, s.cas.map((x) => x.id)])).toEqual([
      ['Gastroenterologie', 31, ['g0', 'g1', 'g2', 'g3']], ['Kardiologie', 16, ['k1', 'k2']], ['Neurologie', 0, ['n1']],
    ]);
    expect(c.mesure).toMatchObject({ base: 200, portee: 'toutes-villes', ville: null });
  });

  it('l\'encart dit UNE chose : la spécialité où le blanc PÈSE le plus, une pathologie partagée comptée une fois', () => {
    const e = encartCouverture(carteCouverture(cases, progress, f, 'Alle'), progress)!;
    expect(e.specialite).toBe('Kardiologie');                   // 14 en blanc, contre 6 + 5 = 11 en gastro (et non 17)
    expect(e.texte).toBe('Kardiologie : 1 des 2 cas n\'est pas encore travaillé. « P k1 » est tombé dans 14 des 200 protocoles relevés, tous centres.');
    expect(e.texte).not.toMatch(EXAM_CLAIM);
    expect(e.texte).not.toMatch(/%/);
  });

  it('ventilée par ville quand la donnée existe : le poids et la base sont ceux de la ville, et la phrase le dit', () => {
    const c = carteCouverture(cases, progress, f, 'Stuttgart');
    expect(c.mesure).toMatchObject({ base: 50, portee: 'ville-ventilee', ville: 'Stuttgart' });
    const e = encartCouverture(c, progress)!;
    expect(e.cas.id).toBe('g1');
    expect(e.texte).toBe('Gastroenterologie : 3 des 4 cas ne sont pas encore travaillés. « P pg » est tombé dans 9 des 50 protocoles relevés à Stuttgart.');
  });

  it('une spécialité entièrement blanche : « aucun des N cas n\'est encore travaillé »', () => {
    const e = encartCouverture(carteCouverture(cases, new Map(), f, 'Alle'), new Map())!;
    expect(e.texte).toBe('Gastroenterologie : aucun des 4 cas n\'est encore travaillé. « P g0 » est tombé dans 20 des 200 protocoles relevés, tous centres.');
  });

  it('rien de blanc qui pèse ⇒ pas d\'encart', () => {
    const tout = new Map(cases.map((c) => [c.id, couvert(c.id, 1)]));
    expect(encartCouverture(carteCouverture(cases, tout, f, 'Alle'), tout)).toBeNull();
    const seulZero = [cas('n1', 'Neurologie', 0)];
    expect(encartCouverture(carteCouverture(seulZero, new Map(), table(seulZero, 200), 'Alle'), new Map())).toBeNull();
  });
});

describe('phraseFrequence — §12.9 : le nom de la source, la base et la portée, ou rien', () => {
  it('nomme la base et la portée', () => {
    expect(phraseFrequence('Bandscheibenvorfall (HWS/LWS)', 14, { pct: 10, base: 580, portee: 'toutes-villes', ville: null })).toBe('« Bandscheibenvorfall (HWS/LWS) » est tombé dans 14 des 580 protocoles relevés, tous centres.');
    expect(phraseFrequence('Vorhofflimmern', 11, { pct: 10, base: 96, portee: 'ville-ventilee', ville: 'Stuttgart' })).toBe('« Vorhofflimmern » est tombé dans 11 des 96 protocoles relevés à Stuttgart.');
  });
  it('sans donnée, pas de phrase', () => {
    expect(phraseFrequence('X', 0, { pct: 10, base: 516, portee: 'toutes-villes', ville: null })).toBeNull();
    expect(phraseFrequence('X', undefined, { pct: 10, base: 516, portee: 'toutes-villes', ville: null })).toBeNull();
    expect(phraseFrequence('X', 3, { pct: null, base: 0, portee: 'toutes-villes', ville: null })).toBeNull();
  });
});
