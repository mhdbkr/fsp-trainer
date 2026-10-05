// C6 — la CONFIGURATION et les REFUS synchronisés (S4-2). Contrat : training-journal.md §12.10, §8.2.
//
//   INV-68  deux appareils qui ont reçu les mêmes `program.configured` ont le même `db.meta['program']` : le dernier
//           payload VALIDE par `occurred_at`. Un payload invalide ne remplace rien. Les refus sont visibles partout.
//   INV-76  la config locale n'est jamais perdue : (a) toute écriture émet la config COMPLÈTE ; (b) push initial unique
//           AVANT toute projection distante ; (c) tout ce que l'interface produit est lisible ; (d) un refus serveur
//           (événement retiré de l'outbox) ne change pas la config locale.
//
// Le monde est le vrai (fake-indexeddb, horloge injectable) ; seul le réseau est coupé.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db, getMeta, setMeta } from '@/db/db';
import { setIntensity, setModus } from '@/lib/programAdjust';
import {
  CONFIG_POUSSEE_S4, configProjetee, ecrireConfig, lireConfig, projeterConfig, pousserConfigInitiale,
  refusRattrapage, refusRythme,
} from '@/lib/sync/configProjetee';
import type { Fortschrittsmodus, Intensity, ProgramConfig } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { now } from '@/lib/clock';
import { forAll, rng, type Rng } from './helpers/prop';

const rngFixe = (seed = 1): Rng => rng(seed);   // un tirage déterministe, pour les cas qui n'ont pas besoin du hasard
import { resetTime, resetWorld, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const ISO = (ms: number) => new Date(ms).toISOString();
const T0 = Date.parse('2026-10-05T08:00:00Z');
const DAY = 86_400_000;

/** Une config que l'interface peut produire : curseurs de `ProgramSetup` (0,5 à 6 h, 2 à 24 semaines), jours off (au plus six). */
function configOf(r: Rng, over: Partial<ProgramConfig> = {}): ProgramConfig {
  const exam = r.bool();
  return {
    startDate: '2026-10-05', ...(exam ? { examDate: '2026-12-18' } : { weeks: r.int(2, 24) }),
    intensity: r.pick<Intensity>(['leicht', 'mittel', 'intensiv']),
    hoursPerSession: r.int(1, 12) / 2,
    offDays: r.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, r.int(0, 6)).sort(),
    prioritySpecialties: [], selfLevel: { Anamnese: r.int(0, 100) }, createdAt: T0,
    ...(r.bool() ? { modus: r.pick<Fortschrittsmodus>(['cas-complet', 'specialite', 'examen-blanc']) } : {}),
    ...over,
  } as ProgramConfig;
}

let seq = 0;
const evConfig = (at: number, payload: unknown, id = `e${String(++seq).padStart(5, '0')}`): ProgressEvent =>
  ({ id, user_id: 'u', type: 'program.configured', subject_id: null, payload, occurred_at: ISO(at) });
const configEvents = async () => (await db.progress_events.where('type').equals('program.configured').toArray()).sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));
const metaConfig = () => getMeta<ProgramConfig | null>('program', null);

// ---------------------------------------------------------------------- INV-68

describe('INV-68 — la configuration est synchronisée : le dernier payload VALIDE gagne, sur tous les appareils', () => {
  it('deux appareils, mêmes événements, arrivées permutées, payloads invalides mêlés → même `db.meta[program]`', async () => {
    let avecInvalide = 0, varies = 0;
    await forAll(80, async (r, seed) => {
      const valides = Array.from({ length: r.int(1, 6) }, (_, i) => evConfig(T0 + (i + 1) * DAY * r.int(1, 3) + i * 1000, configOf(r)));
      const invalides = Array.from({ length: r.int(0, 3) }, () => evConfig(T0 + r.int(1, 20) * DAY, r.pick<unknown>([
        {}, null, 'x', [], { ...configOf(r), hoursPerSession: 0 }, { ...configOf(r), hoursPerSession: 13 }, { ...configOf(r), intensity: 'brutal' },
        { ...configOf(r), offDays: [7] }, { ...configOf(r), offDays: [0, 1, 2, 3, 4, 5, 6] }, { ...configOf(r), startDate: 'lundi' }, { ...configOf(r), modus: 'par-partie' },
      ])));
      const tous = [...valides, ...invalides];
      const attendu = [...valides].sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : a.occurred_at > b.occurred_at ? 1 : a.id < b.id ? -1 : 1)).pop()!;
      if (invalides.some((i) => i.occurred_at > attendu.occurred_at)) avecInvalide++;
      const vus = new Set<string>();
      for (const appareil of ['A', 'B']) {
        await resetWorld();
        await db.progress_events.bulkPut(r.shuffle(tous));
        await projeterConfig();
        const cfg = await metaConfig();
        expect(cfg, `appareil ${appareil}, graine ${seed} : pas de config projetée`).not.toBeNull();
        vus.add(JSON.stringify(cfg));
        expect(cfg, `appareil ${appareil} : ce n'est pas le dernier payload valide`).toEqual(lireConfig(attendu.payload));
      }
      expect(vus.size, 'les deux appareils divergent').toBe(1);
      varies += valides.length > 1 ? 1 : 0;
    });
    expect(avecInvalide, 'des payloads invalides plus récents que le dernier valide ont bien été joués').toBeGreaterThan(10);
    expect(varies).toBeGreaterThan(40);
  }, 120_000);

  it('un payload invalide, même plus récent, ne remplace rien ; il est journalisé en avertissement', async () => {
    const avert = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bonne = configOf(rngFixe(), { hoursPerSession: 2 });
    await db.progress_events.bulkPut([evConfig(T0, bonne), evConfig(T0 + DAY, { ...bonne, hoursPerSession: 0 }), evConfig(T0 + 2 * DAY, null)]);
    await projeterConfig();
    expect((await metaConfig())?.hoursPerSession).toBe(2);
    expect(avert).toHaveBeenCalled();
    avert.mockRestore();
  });

  it('`configProjetee` : valide et la plus récente, ou null — jamais un fragment', () => {
    const c = configOf(rngFixe());
    expect(configProjetee([])).toBeNull();
    expect(configProjetee([evConfig(T0, { intensity: 'leicht' })])).toBeNull();          // un fragment n'est pas une config
    expect(configProjetee([evConfig(T0, c), evConfig(T0 + 5, { intensity: 'leicht' })])?.config).toEqual(c);
  });

  it('les refus sont additifs et visibles de la même façon sur les deux appareils', async () => {
    await forAll(60, async (r) => {
      const semaines = r.shuffle(['2026-W38', '2026-W39', '2026-W40', '2026-W41', '2026-W42']).slice(0, r.int(0, 5));
      const jours = r.shuffle(['2026-09-28', '2026-09-29', '2026-10-01', '2026-10-02']).slice(0, r.int(0, 4));
      const evs: ProgressEvent[] = [
        ...semaines.map((w, i) => ({ id: `rr${i}`, user_id: 'u', type: 'rythme.refused', subject_id: w, payload: {}, occurred_at: ISO(T0 + i * 7 * DAY) }) as ProgressEvent),
        ...jours.map((d, i) => ({ id: `ra${i}`, user_id: 'u', type: 'rattrapage.refused', subject_id: d, payload: {}, occurred_at: ISO(T0 + i * DAY) }) as ProgressEvent),
        evConfig(T0 - DAY, configOf(r)),
      ];
      const a = { ry: refusRythme(r.shuffle(evs)), ra: [...refusRattrapage(r.shuffle(evs))].sort() };
      const b = { ry: refusRythme(r.shuffle(evs)), ra: [...refusRattrapage(r.shuffle(evs))].sort() };
      expect({ ...a, ry: { ...a.ry, semaines: [...a.ry.semaines].sort() } }).toEqual({ ...b, ry: { ...b.ry, semaines: [...b.ry.semaines].sort() } });
      expect([...a.ry.semaines].sort()).toEqual([...semaines].sort());
      expect(a.ra).toEqual([...jours].sort());
    });
  });

  it('deux refus depuis le dernier `program.configured` : le compte repart de zéro à chaque modification du programme', () => {
    const refus = (w: string, at: number): ProgressEvent => ({ id: `r${w}`, user_id: 'u', type: 'rythme.refused', subject_id: w, payload: {}, occurred_at: ISO(at) }) as ProgressEvent;
    const c = configOf(rngFixe());
    const evs = [evConfig(T0, c), refus('2026-W41', T0 + DAY), refus('2026-W42', T0 + 8 * DAY)];
    expect(refusRythme(evs).depuisDerniereConfig).toBe(2);
    expect(refusRythme([...evs, evConfig(T0 + 9 * DAY, c)]).depuisDerniereConfig).toBe(0);
    expect(refusRythme([...evs, evConfig(T0 + 9 * DAY, c), refus('2026-W43', T0 + 10 * DAY)]).depuisDerniereConfig).toBe(1);
  });
});

// ---------------------------------------------------------------------- INV-76

describe('INV-76 (a) — toute écriture de la config émet la config COMPLÈTE', () => {
  it('ecrireConfig, setIntensity et setModus : un événement, le payload = la config enregistrée, lisible', async () => {
    const vus = { ecrire: 0, intensite: 0, modus: 0 };
    await forAll(60, async (r) => {
      await resetWorld();
      startOn('2026-10-05');
      const base = configOf(r);
      await ecrireConfig(base);
      const n0 = (await configEvents()).length;
      const geste = r.pick(['ecrire', 'intensite', 'modus'] as const);
      let attendu: ProgramConfig;
      if (geste === 'ecrire') { attendu = configOf(r, { createdAt: base.createdAt }); await ecrireConfig(attendu); }
      else if (geste === 'intensite') { const i = r.pick<Intensity>(['leicht', 'mittel', 'intensiv']); attendu = { ...base, intensity: i }; await setIntensity(base, i); }
      else { const m = r.pick<Fortschrittsmodus>(['cas-complet', 'specialite', 'examen-blanc']); attendu = { ...base, modus: m }; await setModus(base, m); }
      vus[geste === 'ecrire' ? 'ecrire' : geste === 'intensite' ? 'intensite' : 'modus']++;
      const evs = await configEvents();
      expect(evs.length, `« ${geste} » n'a pas émis exactement un événement`).toBe(n0 + 1);
      const dernier = evs[evs.length - 1].payload as ProgramConfig;
      expect(dernier, `« ${geste} » : le payload n'est pas la config COMPLÈTE`).toEqual(attendu);
      expect(Object.keys(dernier).sort(), `« ${geste} » : payload partiel`).toEqual(Object.keys(attendu).sort());
      expect(await metaConfig()).toEqual(attendu);
      expect(lireConfig(dernier), `« ${geste} » : la config écrite n'est pas lisible`).not.toBeNull();
    });
    expect(vus.ecrire).toBeGreaterThan(5); expect(vus.intensite).toBeGreaterThan(5); expect(vus.modus).toBeGreaterThan(5);
  }, 120_000);
});

describe('INV-76 (c) — tout ce que l’interface produit est lisible par `lireConfig` (bornes serveur ⊇ lireConfig ⊇ interface)', () => {
  it('curseurs de ProgramSetup (0,5 à 6 h par pas de 0,5 ; 2 à 24 semaines), jours off (au plus six), intensités et modes', () => {
    const r = rngFixe();
    for (let h = 0.5; h <= 6; h += 0.5) expect(lireConfig(configOf(r, { hoursPerSession: h })), `${h} h`).not.toBeNull();
    for (const w of [2, 12, 24]) expect(lireConfig(configOf(r, { examDate: undefined, weeks: w })), `${w} semaines`).not.toBeNull();
    expect(lireConfig(configOf(r, { offDays: [] }))).not.toBeNull();
    expect(lireConfig(configOf(r, { offDays: [0, 1, 2, 3, 4, 5] }))).not.toBeNull();
    for (const i of ['leicht', 'mittel', 'intensiv'] as const) expect(lireConfig(configOf(r, { intensity: i }))).not.toBeNull();
    for (const m of ['teil-first', 'cas-complet', 'specialite', 'examen-blanc'] as const) expect(lireConfig(configOf(r, { modus: m }))).not.toBeNull();
    expect(lireConfig(configOf(r, { hoursPerSession: 20 / (60 * 1.3), intensity: 'intensiv' })), 'accepterRythme à 20 min en intensité haute (< 0,5 h)').not.toBeNull();
    expect(lireConfig({ ...configOf(r), strategy: 'full', champInconnu: 1 })).not.toBeNull();   // le reste est ignoré, pas refusé
  });

  it('les champs inconnus sont ignorés ; les bornes refusent l’inexploitable', () => {
    const r = rngFixe();
    expect(lireConfig({ ...configOf(r), champInconnu: 1 })).not.toHaveProperty('champInconnu');
    for (const mauvais of [
      { hoursPerSession: 0 }, { hoursPerSession: 12.1 }, { hoursPerSession: '2' }, { hoursPerSession: Number.NaN }, { intensity: 'x' },
      { offDays: [7] }, { offDays: [-1] }, { offDays: [0, 1, 2, 3, 4, 5, 6] }, { offDays: 'dimanche' },
      { startDate: '2026-13-45' }, { startDate: undefined }, { examDate: '18/12/2026' }, { modus: 'par-partie' },
    ]) expect(lireConfig({ ...configOf(r), ...mauvais }), JSON.stringify(mauvais)).toBeNull();
    expect(lireConfig(null)).toBeNull(); expect(lireConfig([])).toBeNull(); expect(lireConfig('x')).toBeNull();
  });
});

describe('INV-76 (b) — au premier démarrage, la config locale est poussée UNE fois, AVANT toute projection distante', () => {
  const locale = () => configOf(rngFixe(3), { hoursPerSession: 2, intensity: 'mittel' });

  // Revue S4-2 I4 (décision de main, amendement N2b) : avant S4, `ProgramSetup` émettait déjà la config complète ; seuls
  // `intensity` et `modus` (setIntensity, setModus) restaient LOCAUX. Si le journal local porte une config valide, le push
  // initial repart d'elle et n'y reporte que ces deux champs ; sinon il pousse la config locale complète.
  it('le journal porte une config : le push initial la reprend et n’y reporte que intensity et modus locaux', async () => {
    startOn('2026-10-05');
    const L = { ...locale(), intensity: 'leicht' as Intensity, modus: 'specialite' as Fortschrittsmodus };
    const R = configOf(rngFixe(9), { hoursPerSession: 5, intensity: 'intensiv', startDate: '2026-09-14', examDate: '2026-12-04' });
    await setMeta('program', L);                                     // une install d'avant S4-2 : meta seule
    await db.progress_events.put(evConfig(Date.parse('2026-10-03T12:00:00Z'), R));   // la dernière config émise (autre appareil)
    await projeterConfig();
    const { modus: _m, ...sansModus } = R;
    const attendue = { ...sansModus, intensity: 'leicht', modus: 'specialite' };
    expect(await metaConfig()).toEqual(attendue);
    const evs = await configEvents();
    expect(evs.filter((e) => JSON.stringify(e.payload) === JSON.stringify(attendue)), 'un seul push, la config fusionnée').toHaveLength(1);
    expect(await getMeta(CONFIG_POUSSEE_S4, false)).toBeTruthy();
  });

  it('deux appareils : B démarre après A — la startDate, l’examDate et le budget de A survivent sur les deux', async () => {
    // A et B ont vu la même config émise (T1). B avait seulement changé l'intensité en local, sans événement (avant S4).
    const T1 = Date.parse('2026-09-01T08:00:00Z');
    const A = configOf(rngFixe(4), { startDate: '2026-09-01', examDate: '2026-12-01', hoursPerSession: 3, intensity: 'mittel' });
    const emise = evConfig(T1, A);
    const B = { ...A, startDate: '2026-08-01', examDate: '2026-11-15', hoursPerSession: 1, intensity: 'intensiv' as Intensity };   // locale de B, périmée
    // A démarre (T2) : son journal porte sa propre config émise ; il pousse.
    startOn('2026-10-05');
    await db.progress_events.put(emise);
    await setMeta('program', A);
    await pousserConfigInitiale();
    const pushA = (await configEvents()).filter((e) => e.id !== emise.id);
    // B démarre plus tard (T3), sans avoir reçu le push de A.
    await resetWorld(); startOn('2026-10-06');
    await db.progress_events.put(emise);
    await setMeta('program', B);
    await pousserConfigInitiale();
    const pushB = (await configEvents()).filter((e) => e.id !== emise.id);
    // Synchro : les deux appareils ont tout le journal.
    const journal = [emise, ...pushA, ...pushB];
    const c = configProjetee(journal)!.config;
    expect({ startDate: c.startDate, examDate: c.examDate, hoursPerSession: c.hoursPerSession }, 'la config périmée de B a écrasé celle de A')
      .toEqual({ startDate: '2026-09-01', examDate: '2026-12-01', hoursPerSession: 3 });
    expect(c.intensity, 'le seul changement local de B (jamais émis) est gardé').toBe('intensiv');
  });

  it('sans config dans le journal : la config locale complète est poussée', async () => {
    startOn('2026-10-05');
    const L = locale();
    await setMeta('program', L);
    await projeterConfig();
    expect(await metaConfig()).toEqual(L);
    expect((await configEvents()).map((e) => e.payload)).toEqual([L]);
  });

  it('la garde : un second démarrage ne pousse pas une seconde fois', async () => {
    startOn('2026-10-05');
    await setMeta('program', locale());
    expect(await pousserConfigInitiale()).toBe(true);
    expect(await pousserConfigInitiale()).toBe(false);
    await projeterConfig(); await projeterConfig();
    expect(await configEvents()).toHaveLength(1);
  });

  it('deux démarrages concurrents (deux onglets) : un seul push', async () => {
    startOn('2026-10-05');
    await setMeta('program', locale());
    const poussees = await Promise.all([pousserConfigInitiale(), pousserConfigInitiale(), projeterConfig().then(() => false)]);
    expect(poussees.filter(Boolean)).toHaveLength(1);
    expect(await configEvents()).toHaveLength(1);
  });

  it('sans config locale, rien n’est poussé et la distante est projetée', async () => {
    startOn('2026-10-05');
    const R = configOf(rngFixe(5));
    await db.progress_events.put(evConfig(T0 - DAY, R));
    await projeterConfig();
    expect(await metaConfig()).toEqual(R);
    expect(await configEvents()).toHaveLength(1);
  });
});

describe('INV-76 (d) — un refus serveur ne change pas la config locale', () => {
  it('l’événement refusé (retiré de l’outbox) ou perdu : la projection ne retombe pas sur une config plus ancienne', async () => {
    const r = rngFixe(7);
    const tick = startOn('2026-10-05');
    const C1 = configOf(r, { offDays: [0, 6], hoursPerSession: 2 });
    await ecrireConfig(C1);
    tick(60_000);
    // L'interface a laissé cocher les sept jours : la config est écrite, mais le serveur la refuse (sans retry) — l'outbox la retire.
    const C2 = { ...C1, offDays: [0, 1, 2, 3, 4, 5, 6], hoursPerSession: 3 } as ProgramConfig;
    await ecrireConfig(C2);
    await db.outbox.clear();
    await projeterConfig();
    expect(await metaConfig(), 'la projection a remplacé la config locale par une plus ancienne').toEqual(C2);

    // L'événement refusé disparaît même du journal local : la config locale reste la référence.
    await db.progress_events.filter((e) => e.type === 'program.configured' && (e.payload as ProgramConfig).hoursPerSession === 3).delete();
    await projeterConfig();
    expect(await metaConfig()).toEqual(C2);
    await projeterConfig();                                           // « rien » non plus
    expect(await metaConfig()).toEqual(C2);

    // Seul un événement valide PLUS RÉCENT la remplace.
    tick(60_000);
    const C3 = { ...C1, hoursPerSession: 4 } as ProgramConfig;
    await db.progress_events.put(evConfig(now() + 1, C3));
    await projeterConfig();
    expect(await metaConfig()).toEqual(C3);
  });

  it('un événement valide mais plus ANCIEN que la config locale ne la remplace pas', async () => {
    const r = rngFixe(8);
    const tick = startOn('2026-10-05');
    const C1 = configOf(r, { hoursPerSession: 2 });
    await ecrireConfig(C1);
    tick(1000);
    await db.progress_events.put(evConfig(T0 - 5 * DAY, configOf(r, { hoursPerSession: 6 })));
    await projeterConfig();
    expect(await metaConfig()).toEqual(C1);
  });
});
