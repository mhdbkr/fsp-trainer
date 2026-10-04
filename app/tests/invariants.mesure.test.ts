// C6 — invariants de la MESURE de la série 4 (S4-1). Contrat : training-journal.md
// §2.3, §8.1 (INV-53, 56, 59), §8.2 (INV-61, 62, 66, 69), §12.6, §12.7, §13.2, §13.6 ;
// simulation-run.md INV-75 (moitié « dérivation »). Décisions (b) et (e) de la direction.
//
//   INV-53  la maîtrise ne baisse jamais par absence d'un Teil
//   INV-56  `prêt` = trois Teile solides + un run en conditions d'examen POSTÉRIEUR à la soudure
//   INV-59  le cadran lit, il ne calcule pas (même valeur incrémental / reconstruit)
//   INV-61  solide stable : deux réussites ≥ 80 espacées d'au moins 3 jours
//   INV-62  une mauvaise partie ne fait descendre que d'un cran
//   INV-66  la couverture pondérée nomme sa base et sa portée
//   INV-69  la frise passée est figée
//   INV-75  (dérivation) le jour d'une partie est celui de son début ; le Teil abandonné compte
//   (b)     une seule définition des conditions d'examen
//   (e)     les anciens runs ne soudent pas
//
// Les propriétés portent sur les fonctions de mesure, qui sont pures : pas de base. Seul
// INV-59 passe par la vraie base (fake-indexeddb) pour comparer incrémental et reconstruit.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { differenceInCalendarDays } from 'date-fns';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db } from '@/db/db';
import { dayKey } from '@/lib/clock';
import { applySimulationToJournal, computeCaseProgress, rebuildJournal, trainingEventFromSimulation } from '@/lib/journal';
import { conditionsExamen, conditionsManquantes } from '@/lib/examen';
import { dialData } from '@/lib/dialData';
import { couverturePonderee, phraseCouverture } from '@/lib/program/couverturePonderee';
import { indiceAt, trajectory } from '@/lib/program/trajectory';
import { DATE_NOUVELLE_REGLE, SOLIDE_ECART_JOURS } from '@/lib/program/parametres';
import { emptyLanguageGrid } from '@/lib/scoring';
import type { CaseProgress, Center, Simulation, SimTeil, TrainingEvent } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { forAll, rng, type Rng } from './helpers/prop';
import { CORPUS, TEILE, addDaysISO, morning, partResult, resetTime, resetWorld, simulationOf } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

// ---------------------------------------------------------------- fabriques

let seq = 0;
/** Un événement MESURÉ du cas `c` : un score par Teil joué. `h` = heure locale du jour `iso`. */
function mesure(c: string, iso: string, scores: Partial<Record<SimTeil, number>>, over: Partial<TrainingEvent> = {}, h = 10): TrainingEvent {
  const teile = TEILE.filter((t) => t in scores);
  return { id: `e${String(++seq).padStart(6, '0')}`, at: morning(iso, h) + seq, kind: 'simulation', caseId: c, teile, source: 'libre', spentMin: 10, scores, ...over };
}
const progressOf = (events: TrainingEvent[], c = 'c1'): CaseProgress => computeCaseProgress(events).find((p) => p.caseId === c)!;
const D0 = '2026-09-01';                                   // avant DATE_NOUVELLE_REGLE : sans effet sur la mesure du cas
const jour = (n: number) => addDaysISO(D0, n);
const tous = (s: number): Record<SimTeil, number> => ({ anamnese: s, dokumentation: s, fallvorstellung: s });

/** Rend les trois Teile solides : deux réussites ≥ 80 à `SOLIDE_ECART_JOURS` d'écart. */
function solidifie(c: string, j0 = 0): TrainingEvent[] {
  return [mesure(c, jour(j0), tous(85)), mesure(c, jour(j0 + SOLIDE_ECART_JOURS), tous(85))];
}
/** Un run en conditions d'examen (`examen: true`, `enchaine: true`), tous les Teile à `s`. */
const examen = (c: string, j: number, s = 90, h = 14) => mesure(c, jour(j), tous(s), { kind: 'examen-blanc', enchaine: true, examen: true, examenManque: [] }, h);

// ------------------------------------------------------------------- INV-53

function randomJournal(r: Rng): TrainingEvent[] {
  const out: TrainingEvent[] = [];
  const cases = ['c1', 'c2', 'c3'];
  for (let i = 0, n = r.int(1, 30); i < n; i++) {
    const teile = r.shuffle(TEILE).slice(0, r.int(0, 3));
    const sb = r.bool(0.15);
    out.push(mesure(r.pick(cases), jour(r.int(0, 30)), Object.fromEntries(teile.map((t) => [t, r.int(0, 100)])),
      { ...(sb ? { selbstbewertet: true } : {}), ...(r.bool(0.1) ? { scores: undefined } : {}) }, r.int(6, 20)));
  }
  return out;
}

describe('INV-53 — la maîtrise ne baisse jamais par absence d’un Teil', () => {
  it('maitrise === null ⇔ couverture 0 ; sinon bornée par les derniers scores des Teile joués', async () => {
    let avecMaitrise = 0, sansMaitrise = 0;
    await forAll(300, (r) => {
      for (const cp of computeCaseProgress(randomJournal(r))) {
        const joues = TEILE.filter((t) => cp.teile[t].attempts >= 1);
        expect(cp.couverture, `couverture de ${cp.caseId}`).toBe(joues.length);
        if (joues.length === 0) { expect(cp.maitrise).toBeNull(); sansMaitrise++; continue; }
        const s = joues.map((t) => cp.teile[t].lastScore!);
        expect(cp.maitrise!, `maîtrise de ${cp.caseId} sous le minimum des Teile joués`).toBeGreaterThanOrEqual(Math.min(...s));
        expect(cp.maitrise!, `maîtrise de ${cp.caseId} au-dessus du maximum des Teile joués`).toBeLessThanOrEqual(Math.max(...s));
        avecMaitrise++;
      }
    });
    expect(avecMaitrise).toBeGreaterThan(300);
    expect(sansMaitrise).toBeGreaterThan(5);            // un cas joué en IA externe seulement : couverture 0, maîtrise null
  });

  it('un seul Teil joué à 90 : la maîtrise est 90, pas 30 (le `/3` de simScope.ts)', () => {
    const cp = progressOf([mesure('c1', jour(0), { dokumentation: 90 })]);
    expect(cp.couverture).toBe(1);
    expect(cp.maitrise).toBe(90);
  });
});

// ------------------------------------------------------------- INV-61 / 62

describe('INV-61 — solide stable : deux réussites ≥ 80 espacées d’au moins 3 jours', () => {
  it('pour toute séquence : `solide` ⇒ deux scores mesurés ≥ 80 de jours calendaires éloignés de ≥ 3', async () => {
    let solides = 0, nonSolidesAvec80 = 0;
    await forAll(400, (r) => {
      const evs = Array.from({ length: r.int(1, 14) }, () =>
        mesure('c1', jour(r.int(0, 20)), { anamnese: r.pick([30, 55, 62, 79, 80, 85, 100]) }, {}, r.int(6, 22)));
      const reussites = [...evs].sort((a, b) => a.at - b.at).filter((e) => e.scores!.anamnese! >= 80);
      const cp = progressOf(evs);
      if (cp.teile.anamnese.status === 'solide') {
        solides++;
        const ok = reussites.some((a, i) => reussites.slice(i + 1).some((b) => differenceInCalendarDays(b.at, a.at) >= SOLIDE_ECART_JOURS));
        expect(ok, `solide sans deux réussites ≥ 80 espacées de ${SOLIDE_ECART_JOURS} jours`).toBe(true);
      } else if (reussites.length >= 2) nonSolidesAvec80++;
    });
    expect(solides).toBeGreaterThan(40);
    expect(nonSolidesAvec80).toBeGreaterThan(20);       // des cas « deux ≥ 80 mais trop proches » existent vraiment
  });

  it('table de vérité de l’écart (jours calendaires, pas 24 h)', () => {
    const st = (a: [number, number], b: [number, number]) =>
      progressOf([mesure('c1', jour(a[0]), { anamnese: 85 }, {}, a[1]), mesure('c1', jour(b[0]), { anamnese: 85 }, {}, b[1])]).teile.anamnese.status;
    expect(st([0, 10], [0, 20])).toBe('acquis');         // même jour
    expect(st([0, 10], [2, 10])).toBe('acquis');         // 2 jours
    expect(st([0, 23], [2, 23])).toBe('acquis');         // 48 h exactes, 2 jours calendaires
    expect(st([0, 23], [3, 1])).toBe('solide');          // 26 h, mais 3 jours calendaires
    expect(st([0, 10], [3, 10])).toBe('solide');
    expect(st([0, 10], [9, 10])).toBe('solide');
  });

  it('une réussite unique ≥ 80 donne `acquis`, jamais `solide` (la règle série 3 disait solide)', () => {
    expect(progressOf([mesure('c1', jour(0), { anamnese: 95 })]).teile.anamnese.status).toBe('acquis');
  });
});

describe('INV-62 — une mauvaise partie ne fait descendre que d’un cran', () => {
  it('Teil solide puis s ∈ [0, 79] : `acquis`, jamais `fragile`, même pour s = 0', async () => {
    const vus = new Set<number>();
    await forAll(200, (r) => {
      const s = r.pick([0, 1, 30, 59, 60, 70, 79, r.int(0, 79)]);
      const cp = progressOf([...solidifie('c1').map((e) => ({ ...e, scores: { anamnese: 85 }, teile: ['anamnese'] as SimTeil[] })),
        mesure('c1', jour(10), { anamnese: s })]);
      expect(cp.teile.anamnese.status, `solide puis ${s}`).toBe('acquis');
      vus.add(s);
    });
    expect(vus.has(0)).toBe(true);
  });

  it('puis, depuis `acquis`, une seconde mauvaise partie < 60 retombe à `fragile` ; un ≥ 80 espacé du premier ≥ 80 re-rend solide', () => {
    const base = solidifie('c1').map((e) => ({ ...e, scores: { anamnese: 85 }, teile: ['anamnese'] as SimTeil[] }));
    expect(progressOf([...base, mesure('c1', jour(10), { anamnese: 40 }), mesure('c1', jour(11), { anamnese: 40 })]).teile.anamnese.status).toBe('fragile');
    expect(progressOf([...base, mesure('c1', jour(10), { anamnese: 40 }), mesure('c1', jour(11), { anamnese: 82 })]).teile.anamnese.status).toBe('solide');
  });
});

// ------------------------------------------------------------------- INV-56

describe('INV-56 — `prêt` exige un enchaînement réel et récent', () => {
  it('trois Teile solides + run en conditions d’examen postérieur à la soudure ⇒ prêt, pretAt = ce run', () => {
    const run = examen('c1', 4);
    const cp = progressOf([...solidifie('c1'), run]);
    expect(cp.etat).toBe('pret');
    expect(cp.pretAt).toBe(run.at);
    expect(cp.overall).toBe('solide');
  });

  it('le run qui soude lui-même (simultané) suffit ; un run qualifiant plus récent déplace pretAt', () => {
    const seul = progressOf([mesure('c1', jour(0), tous(85)), examen('c1', 3, 85)]);
    expect(seul.etat).toBe('pret');
    const plus = examen('c1', 8);
    expect(progressOf([mesure('c1', jour(0), tous(85)), examen('c1', 3, 85), plus]).pretAt).toBe(plus.at);
  });

  it('un run en conditions d’examen ANTÉRIEUR à la soudure ne soude pas', () => {
    const run = examen('c1', 0, 85);                   // premières réussites : acquis
    const cp = progressOf([run, mesure('c1', jour(5), tous(85))]);   // solide ensuite
    expect(cp.teile.anamnese.status).toBe('solide');
    expect(cp.etat).toBe('solide');
    expect(cp.pretAt).toBeNull();
  });

  it('une retombée défait la soudure jusqu’au run qualifiant suivant', () => {
    const ev = [...solidifie('c1'), examen('c1', 4)];
    expect(progressOf(ev).etat).toBe('pret');
    const tombe = [...ev, mesure('c1', jour(6), { dokumentation: 40 })];
    expect(progressOf(tombe).etat).toBe('couvert');
    expect(progressOf(tombe).pretAt).toBeNull();
    // re-solide par des parties ordinaires : le vieux run est antérieur à la nouvelle soudure
    const resolide = [...tombe, mesure('c1', jour(12), { dokumentation: 88 })];
    expect(progressOf(resolide).teile.dokumentation.status).toBe('solide');
    expect(progressOf(resolide).etat).toBe('solide');
    const nouveau = examen('c1', 14);
    const re = progressOf([...resolide, nouveau]);
    expect(re.etat).toBe('pret');
    expect(re.pretAt).toBe(nouveau.at);
  });

  it('`enchaine` seul ne suffit pas ; un run enchaîné qui rate l’ordre, la langue ou l’Autonome ne soude pas', () => {
    for (const manque of [['ordre'], ['grille'], ['autonome'], ['enchaine']] as const) {
      const run = mesure('c1', jour(4), tous(90), { enchaine: true, examenManque: [...manque] }, 14);
      expect(progressOf([...solidifie('c1'), run]).etat, `manque ${manque}`).toBe('solide');
    }
  });

  it('trois Teile joués séparément le même jour ne soudent pas', () => {
    const ev = [...solidifie('c1'), mesure('c1', jour(5), { anamnese: 90 }), mesure('c1', jour(5), { dokumentation: 90 }, {}, 12), mesure('c1', jour(5), { fallvorstellung: 90 }, {}, 14)];
    expect(progressOf(ev).etat).toBe('solide');
  });

  it('propriété : prêt ⇔ trois solides ∧ un run examen, tous scores ≥ 80, postérieur à solideDepuis ; pretAt = le plus récent', async () => {
    let prets = 0, solidesSansPret = 0;
    await forAll(500, (r) => {
      const evs: TrainingEvent[] = [];
      for (let i = 0, n = r.int(2, 16); i < n; i++) {
        const j = r.int(0, 30), h = r.int(6, 22);
        if (r.bool(0.3)) evs.push(mesure('c1', jour(j), tous(r.pick([55, 85, 90, 95])), r.bool(0.7) ? { enchaine: true, examen: true, examenManque: [] } : { enchaine: true, examenManque: ['ordre'] }, h));
        else evs.push(mesure('c1', jour(j), Object.fromEntries(r.shuffle(TEILE).slice(0, r.int(1, 3)).map((t) => [t, r.pick([40, 70, 85, 90])])), {}, h));
      }
      const cp = progressOf(evs);
      const sorted = [...evs].sort((a, b) => a.at - b.at);
      const qual = sorted.filter((e) => e.examen === true && TEILE.every((t) => (e.scores?.[t] ?? -1) >= 80));
      const toutSolide = TEILE.every((t) => cp.teile[t].status === 'solide');
      if (cp.etat === 'pret') {
        prets++;
        expect(toutSolide).toBe(true);
        const apres = qual.filter((e) => e.at >= cp.solideDepuis!);
        expect(apres.length, 'prêt sans run qualifiant postérieur à la soudure').toBeGreaterThan(0);
        expect(cp.pretAt).toBe(apres[apres.length - 1].at);
        expect(sorted.some((e) => e.at === cp.solideDepuis), 'solideDepuis n’est l’instant d’aucun événement').toBe(true);
      } else {
        expect(cp.pretAt).toBeNull();
        if (toutSolide) { solidesSansPret++; expect(qual.filter((e) => e.at >= cp.solideDepuis!).length, 'solide avec un run qualifiant postérieur, mais pas prêt').toBe(0); }
      }
    });
    expect(prets).toBeGreaterThan(15);
    expect(solidesSansPret).toBeGreaterThan(15);
  });
});

// ---------------------------------------------------- décisions (b) et (e)

const GRID_OK = { aussprache: 4, wortschatz: 4, grammatik: 4, redefluss: 4, kommunikation: 4 };
const ORDRE: SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** Une simulation série 4 (présence de `reihenfolge`) dont chaque condition d'examen est réglable. */
function sim4(id: string, caseId: string, date: number, o: { enchaine?: boolean; autonome?: boolean; ordre?: SimTeil[]; grille?: boolean | 'vide'; mode?: Simulation['mode']; score?: number; layer?: 1 | 2 | 3 } = {}): Simulation {
  const s = o.score ?? 85;
  const g = o.grille === false ? undefined : o.grille === 'vide' ? emptyLanguageGrid() : GRID_OK;
  const parts = {
    anamnese: partResult(s, { feeling: s, ...(g ? { languageGrid: g } : {}) }),
    dokumentation: partResult(s, { feeling: s }),
    fallvorstellung: partResult(s, { feeling: s, ...(g ? { languageGrid: g } : {}) }),
  };
  return simulationOf(id, caseId, date, TEILE, s, {
    parts, reihenfolge: o.ordre ?? ORDRE, assistance: o.autonome === false ? 'assiste' : 'autonome', layer: o.layer ?? 2,
    ...(o.enchaine === false ? {} : { enchaine: true }), ...(o.mode ? { mode: o.mode } : {}),
  } as Partial<Simulation>);
}

describe('décision (b) — une seule définition des conditions d’examen', () => {
  it('série 4 : kind `examen-blanc` ⇔ `examen` ⇔ conditionsExamen ⇔ les quatre conditions ; la couche n’y compte plus', async () => {
    let oui = 0, non = 0;
    await forAll(300, (r) => {
      const o = {
        enchaine: r.bool(0.7), autonome: r.bool(0.7), grille: r.pick([true, true, false, 'vide'] as const),
        ordre: r.bool(0.7) ? ORDRE : r.shuffle(ORDRE), mode: r.bool(0.1) ? 'external-ai' as const : 'texte' as const,
        layer: r.pick([1, 2, 3] as const),
      };
      const sim = sim4(`s${r.int(1, 1e6)}`, 'c1', morning('2026-10-06'), o);
      const te = trainingEventFromSimulation(sim);
      const attendu = o.enchaine && o.autonome && o.grille === true && o.ordre.join() === ORDRE.join() && o.mode !== 'external-ai';
      expect(conditionsExamen(sim), JSON.stringify(o)).toBe(attendu);
      expect(te.kind === 'examen-blanc', `kind pour ${JSON.stringify(o)}`).toBe(attendu);
      expect(te.examen === true, `examen pour ${JSON.stringify(o)}`).toBe(attendu);
      expect(te.examenManque, 'examenManque = les conditions en défaut').toEqual(conditionsManquantes(sim));
      expect((te.examenManque ?? []).length === 0).toBe(attendu);
      attendu ? oui++ : non++;
    });
    expect(oui).toBeGreaterThan(20);
    expect(non).toBeGreaterThan(100);
  });

  it('la grille « non saisie » (−1, sentinelle C6-A) manque ; une grille complète à 0 est une note', () => {
    expect(conditionsManquantes(sim4('a', 'c1', 1, { grille: 'vide' }))).toEqual(['grille']);
    const zero = { aussprache: 0, wortschatz: 0, grammatik: 0, redefluss: 0, kommunikation: 0 };
    const s = sim4('b', 'c1', 1, {});
    s.parts.anamnese!.languageGrid = zero; s.parts.fallvorstellung!.languageGrid = zero;
    expect(conditionsExamen(s)).toBe(true);
  });

  it('`enchaine` n’est dérivé que pour trois Teile joués d’un vrai enchaînement, jamais en IA externe', () => {
    const e = (s: Simulation) => trainingEventFromSimulation(s).enchaine;
    expect(e(sim4('a', 'c1', 1))).toBe(true);
    expect(e(sim4('b', 'c1', 1, { enchaine: false }))).toBeUndefined();
    expect(e(sim4('c', 'c1', 1, { mode: 'external-ai' }))).toBeUndefined();
    const deux = sim4('d', 'c1', 1); deux.parts.dokumentation = undefined;
    expect(e(deux)).toBeUndefined();
  });
});

describe('décision (e) — états recalculés, anciens runs non soudés', () => {
  it('un run complet Autonome de couche 3 antérieur (ni `enchaine` ni `reihenfolge`) reste `examen-blanc` (règle série 3) mais ne soude jamais', () => {
    const vieux = (id: string, date: number) => simulationOf(id, 'c1', date, TEILE, 90, { assistance: 'autonome', layer: 3 });
    const evs = [vieux('v1', morning(jour(0))), vieux('v2', morning(jour(4))), vieux('v3', morning(jour(9)))].map(trainingEventFromSimulation);
    for (const e of evs) { expect(e.kind).toBe('examen-blanc'); expect(e.examen).toBeUndefined(); expect(e.enchaine).toBeUndefined(); expect(e.examenManque).toBeUndefined(); }
    const cp = progressOf(evs);
    expect(TEILE.every((t) => cp.teile[t].status === 'solide')).toBe(true);
    expect(cp.etat).toBe('solide');
    expect(cp.pretAt).toBeNull();
  });

  it('un payload ancien portant `enchaine: true` sans `reihenfolge` n’est pas une simulation série 4 : pas d’examen', () => {
    const forge = simulationOf('f1', 'c1', morning(jour(0)), TEILE, 90, { assistance: 'autonome', layer: 3, enchaine: true } as Partial<Simulation>);
    const e = trainingEventFromSimulation(forge);
    expect(e.examen).toBeUndefined();
    expect(e.examenManque).toBeUndefined();
  });

  it('lecture tolérante : `reihenfolge` illisible, parties absentes, durée aberrante — aucune exception', () => {
    const s = simulationOf('t1', 'c1', morning(jour(0)), TEILE, 80, { reihenfolge: 'anamnese' as never, dauerGesamtSec: Number.NaN, enchaine: 'oui' as never } as Partial<Simulation>);
    expect(() => trainingEventFromSimulation(s)).not.toThrow();
    expect(trainingEventFromSimulation(s).examen).toBeUndefined();
    expect(() => trainingEventFromSimulation({ id: 'x', caseId: 'c1', date: 1 } as never)).not.toThrow();
  });
});

// ------------------------------------------------------------------- INV-75

describe('INV-75 (dérivation) — le jour d’une partie est celui de son début, le Teil abandonné compte', () => {
  it('`at` = `Simulation.date` ; `spentMin` = round(dauerGesamtSec / 60), pas la somme des seuls Teile joués', () => {
    const debut = new Date('2026-10-06T23:50:00').getTime();
    const s = sim4('n1', 'c1', debut);
    s.dauerGesamtSec = 3000;                            // 50 min, dont un Teil abandonné
    const te = trainingEventFromSimulation(s);
    expect(te.at).toBe(debut);
    expect(dayKey(te.at)).toBe('2026-10-06');
    expect(te.spentMin).toBe(50);
    const sans = sim4('n2', 'c1', debut);
    const somme = Math.round(Object.values(sans.parts).reduce((a, p) => a + (p?.durationSec ?? 0), 0) / 60);
    expect(trainingEventFromSimulation(sans).spentMin).toBe(somme);   // sans `dauerGesamtSec` : l'ancienne règle
  });
});

// ------------------------------------------------------------------- INV-59

describe('INV-59 — le cadran lit, il ne calcule pas', () => {
  it('couverture, maîtrise, soudure et « non mesuré » sont ceux de la progression ; la fonction est pure', async () => {
    let soudes = 0, nonMesures = 0;
    await forAll(300, (r) => {
      const evs = randomJournal(r);
      if (r.bool(0.5)) evs.push(...solidifie('c1', r.int(0, 3)), examen('c1', r.int(5, 9)));
      if (r.bool(0.2)) evs.push(mesure('c2', jour(1), tous(70), { kind: 'simulation', scores: undefined, selbstbewertet: true }));
      for (const cp of computeCaseProgress(evs)) {
        const gele = structuredClone(cp);
        const d = dialData(cp);
        expect(cp, 'dialData a modifié sa source').toEqual(gele);
        expect(dialData(cp)).toEqual(d);
        expect(d.caseId).toBe(cp.caseId);
        expect(d.couverture).toBe(TEILE.filter((t) => cp.teile[t].attempts >= 1).length);
        expect(d.maitrise).toBe(cp.maitrise);
        expect(d.soude).toBe(cp.etat === 'pret');
        expect(d.pretAt).toBe(cp.pretAt);
        for (const t of TEILE) {
          const p = cp.teile[t];
          expect(d.teile[t].status).toBe(p.status);
          expect(d.teile[t].lastScore).toBe(p.lastScore);
          expect(d.teile[t].nonMesure).toBe(p.status === 'vierge' && p.nonMesureAt != null);
          expect(d.teile[t].solideDes).toBe(p.status === 'solide' ? null : p.solideDes ?? null);
          if (d.teile[t].nonMesure) nonMesures++;
        }
        if (d.soude) soudes++;
      }
    });
    expect(soudes).toBeGreaterThan(20);
    expect(nonMesures).toBeGreaterThan(5);
  });

  it('une ligne `case_progress` d’avant la série 4 (sans les nouveaux champs) se lit sans exception', () => {
    const vieille = { caseId: 'c1', overall: 'entame', teile: Object.fromEntries(TEILE.map((t) => [t, { status: 'acquis', lastScore: 70, lastAt: 1, attempts: 1 }])) } as unknown as CaseProgress;
    const d = dialData(vieille);
    expect(d.couverture).toBe(3);
    expect(d.maitrise).toBeNull();
    expect(d.soude).toBe(false);
    expect(d.pretManque).toEqual([]);
  });

  it('même valeur sur une progression incrémentale et sur une progression reconstruite (vraie base)', async () => {
    await forAll(12, async (r) => {
      await resetWorld();
      const sims: Simulation[] = [];
      for (let i = 0, n = r.int(3, 12); i < n; i++) {
        const c = r.pick(['c1', 'c2']);
        const s = r.pick([60, 85, 92]);
        const date = morning(jour(r.int(0, 25)), r.int(7, 21));
        sims.push(r.bool(0.6) ? sim4(`s${i}`, c, date, { score: s, enchaine: r.bool(0.8), ordre: r.bool(0.8) ? ORDRE : r.shuffle(ORDRE), mode: r.bool(0.1) ? 'external-ai' : 'texte' })
          : simulationOf(`s${i}`, c, date, r.shuffle(TEILE).slice(0, r.int(1, 3)), s, {}));
      }
      sims.sort((a, b) => a.date - b.date);
      for (const s of sims) await applySimulationToJournal(s);
      const incremental = (await db.case_progress.toArray()).sort((a, b) => (a.caseId < b.caseId ? -1 : 1));
      const events: ProgressEvent[] = sims.map((s, i) => ({ id: `p${i}`, user_id: 'u', type: 'simulation.completed', subject_id: s.id, payload: s, occurred_at: new Date(s.date).toISOString() }));
      await rebuildJournal(events);
      const reconstruit = (await db.case_progress.toArray()).sort((a, b) => (a.caseId < b.caseId ? -1 : 1));
      expect(reconstruit).toEqual(incremental);
      expect(reconstruit.map((cp) => dialData(cp))).toEqual(incremental.map((cp) => dialData(cp)));
    });
  }, 120_000);
});

// ------------------------------------------------------------------- INV-66

describe('INV-66 — la couverture pondérée nomme sa base et sa portée', () => {
  const cases = CORPUS.slice(0, 6);
  const prog = (couvertures: number[]) => new Map(cases.map((c, i) => [c.id, {
    caseId: c.id, overall: 'entame', couverture: couvertures[i],
    teile: Object.fromEntries(TEILE.map((t, k) => [t, { status: k < couvertures[i] ? 'acquis' : 'vierge', lastScore: k < couvertures[i] ? 70 : null, lastAt: 1, attempts: k < couvertures[i] ? 1 : 0 }])),
  } as unknown as CaseProgress]));
  const freqs = Object.fromEntries(cases.map((c, i) => [c.id, { total: 10 + i, parVille: i < 4 ? { Stuttgart: 5 + i } : {} }])) as Record<string, { total: number | null; parVille: Partial<Record<Center, number>> }>;

  it('ville ventilée : base = Σ des comptes ventilés de CETTE ville, hors cas non ventilés', () => {
    const r = couverturePonderee(cases, prog([3, 0, 3, 0, 3, 3]), freqs, 'Stuttgart');
    expect(r.portee).toBe('ville-ventilee');
    expect(r.ville).toBe('Stuttgart');
    expect(r.base).toBe(5 + 6 + 7 + 8);
    expect(r.pct).toBe(Math.round(100 * (5 + 7) / (5 + 6 + 7 + 8)));
  });

  it('chaque Teil travaillé compte pour un tiers du poids', () => {
    const r = couverturePonderee(cases, prog([1, 0, 0, 0, 0, 0]), freqs, 'Stuttgart');
    expect(r.pct).toBe(Math.round(100 * (5 / 3) / 26));
  });

  it('repli toutes villes (ville sans ventilation, « Alle », « Complément », sans ville) — et la phrase le dit', () => {
    for (const ville of ['Freiburg', 'Complément', 'Alle', undefined] as const) {
      const r = couverturePonderee(cases, prog([3, 3, 0, 0, 0, 0]), freqs, ville as Center | undefined);
      expect(r.portee, String(ville)).toBe('toutes-villes');
      expect(r.ville).toBeNull();
      expect(r.base).toBe(10 + 11 + 12 + 13 + 14 + 15);
      expect(phraseCouverture(r)).toMatch(/toutes villes/);
    }
  });

  it('le texte contient la base et la portée, et ne dit jamais « ce que le jury note » (EXAM_CLAIM)', () => {
    const v = phraseCouverture(couverturePonderee(cases, prog([3, 3, 0, 0, 0, 0]), freqs, 'Stuttgart'))!;
    expect(v).toContain(String(5 + 6 + 7 + 8));
    expect(v).toMatch(/ventilés de Stuttgart/);
    for (const t of [v, phraseCouverture(couverturePonderee(cases, prog([3, 3, 0, 0, 0, 0]), freqs))!]) {
      expect(t).toMatch(/^Les cas que tu as travaillés représentent \d+ % des protocoles, d'après \d+ protocoles/);
      expect(t).not.toMatch(/jury|officiel|règle FSP|Bestanden|attendu|exigé/i);
    }
  });

  it('sans donnée : pct null, pas de phrase ; propriété 0 ≤ pct ≤ 100 et base > 0 dès que pct est défini', async () => {
    expect(phraseCouverture(couverturePonderee(cases, prog([3, 3, 3, 3, 3, 3]), {}, 'Stuttgart'))).toBeNull();
    let definis = 0;
    await forAll(300, (r) => {
      const f = Object.fromEntries(cases.map((c) => [c.id, {
        total: r.bool(0.8) ? r.int(0, 30) : null,
        parVille: r.bool(0.5) ? { Stuttgart: r.int(0, 20), Karlsruhe: r.int(0, 20) } : {},
      }])) as typeof freqs;
      const res = couverturePonderee(cases, prog(cases.map(() => r.int(0, 3))), f, r.pick(['Stuttgart', 'Karlsruhe', 'Freiburg', 'Alle', undefined] as const) as Center | undefined);
      if (res.pct !== null) { definis++; expect(res.pct).toBeGreaterThanOrEqual(0); expect(res.pct).toBeLessThanOrEqual(100); expect(res.base).toBeGreaterThan(0); }
      else expect(phraseCouverture(res)).toBeNull();
    });
    expect(definis).toBeGreaterThan(150);
  });
});

// ------------------------------------------------------------------- INV-69

describe('INV-69 — la frise passée est figée', () => {
  const POIDS3 = { vierge: 0, fragile: 0.3, acquis: 0.7, solide: 1 } as const;
  /** L'indice de la série 3, réécrit ici indépendamment : le dernier score MESURÉ de chaque Teil. */
  function indice3(events: TrainingEvent[], total: number, at: number): number {
    const last = new Map<string, number>();
    for (const e of [...events].sort((a, b) => a.at - b.at)) {
      if (e.at > at || !e.caseId || e.selbstbewertet) continue;
      for (const t of e.teile) { const s = e.scores?.[t]; if (s != null) last.set(`${e.caseId}/${t}`, s); }
    }
    let sum = 0;
    for (const s of last.values()) sum += POIDS3[s < 60 ? 'fragile' : s < 80 ? 'acquis' : 'solide'];
    return Math.round((sum / total) * 100);
  }
  const veille = addDaysISO(DATE_NOUVELLE_REGLE, -1);
  const finDe = (iso: string) => morning(iso, 23) + 3_599_000;

  it('avant DATE_NOUVELLE_REGLE, `indiceAt` applique la règle série 3 : une réussite unique pèse 1', async () => {
    await forAll(200, (r) => {
      const evs = Array.from({ length: r.int(1, 25) }, () =>
        mesure(r.pick(['c1', 'c2', 'c3', 'c4']), addDaysISO(DATE_NOUVELLE_REGLE, -r.int(1, 40)), Object.fromEntries(r.shuffle(TEILE).slice(0, r.int(1, 3)).map((t) => [t, r.int(20, 100)])), r.bool(0.1) ? { selbstbewertet: true } : {}, r.int(6, 22)));
      const at = finDe(addDaysISO(DATE_NOUVELLE_REGLE, -r.int(1, 10)));
      expect(indiceAt(evs, 12, at)).toBe(indice3(evs, 12, at));
    });
    expect(indiceAt([mesure('c1', veille, { anamnese: 95 })], 3, finDe(veille))).toBe(33);   // 1 / 3 : « solide » série 3
  });

  it('dès DATE_NOUVELLE_REGLE, la nouvelle règle : la même réussite unique n’est plus que `acquis` (0,7)', () => {
    const e = mesure('c1', veille, { anamnese: 95 });
    expect(indiceAt([e], 3, morning(DATE_NOUVELLE_REGLE, 23))).toBe(23);                       // 0,7 / 3
  });

  it('la frise : aucun point antérieur à la date ne change ; un repère marque la marche ; la pente ne la traverse pas', () => {
    const cases = CORPUS.slice(0, 4);
    // Un mauvais score la veille : série 3 → `fragile` (0,3) ; série 4 → un cran seulement, `acquis` (0,7).
    // La marche est donc MONTANTE — une pente naïve qui la traverse projetterait un progrès qui n'a pas eu lieu.
    const evs = [
      mesure(cases[0].id, addDaysISO(DATE_NOUVELLE_REGLE, -9), tous(90)), mesure(cases[0].id, addDaysISO(DATE_NOUVELLE_REGLE, -5), tous(90)),
      mesure(cases[0].id, addDaysISO(DATE_NOUVELLE_REGLE, -2), { anamnese: 40 }),
    ];
    const now = morning(addDaysISO(DATE_NOUVELLE_REGLE, 2), 12);
    const t = trajectory({ examDate: addDaysISO(DATE_NOUVELLE_REGLE, 40) } as never, cases, evs, { now });
    const passes = t.points.filter((p) => p.date < DATE_NOUVELLE_REGLE);
    expect(passes.length).toBeGreaterThan(5);
    for (const p of passes) expect(p.indice, p.date).toBe(indice3(evs, cases.length * 3, morning(p.date, 23) + 3_599_000));
    expect(t.repere).toEqual({ date: DATE_NOUVELLE_REGLE });
    const apres = t.points.find((p) => p.date === DATE_NOUVELLE_REGLE)!;
    expect(apres.indice, 'la marche (anamnese : fragile → acquis)').toBeGreaterThan(passes[passes.length - 1].indice);
    expect(t.points[t.points.length - 1].indice).toBe(apres.indice);   // aucun travail depuis : la courbe est plate sur la nouvelle règle
    expect(t.projection, 'la pente ne doit pas traverser la marche').toEqual([]);
    expect(t.indiceProjete).toBeNull();
  });

  it('hors de la fenêtre de la frise, aucun repère', () => {
    const t = trajectory(undefined, CORPUS.slice(0, 2), [], { now: morning(addDaysISO(DATE_NOUVELLE_REGLE, -3), 12) });
    expect(t.repere).toBeNull();
  });
});

void rng;
