// C6 — série 4, la partie, le cas entier (simulation-run.md §10, §7.1), PAR LE HOOK du runner.
//   INV-70  entrée unique : `?depart=` ne change que le Teil de `demarrer`
//   INV-72  `dauerGesamtSec` garde le Teil quitté par `springeZu`
//   INV-73  enchaînement réel : reprise de 30 s / 4 min 59 s / 5 min ; la marque n'est jamais retirée
//   INV-75  le jour d'une partie est celui de son début (23 h 50 → 0 h 20)
// Les trois chemins de reprise (barre « Reprendre », rechargement, retour sur le runner) passent par la
// même branche de `useLauf` : un démontage, une pause, un remontage avec `lauf.aktiv` relu en base.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, act, renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());

configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db } from '@/db/db';
import { freezeAt } from '@/lib/clock';
import { LAUF_AKTIV_KEY, projektion } from '@/lib/lauf/speichern';
import { erstelleLauf, tickChrono, transition } from '@/lib/lauf/automat';
import { useLauf } from '@/features/simulation/useLauf';
import type { SimTeil } from '@/db/types';
import { CORPUS, partResult, resetTime, resetWorld } from './helpers/world';

const cas = () => CORPUS[0];
let avance: (ms: number) => number;
beforeEach(async () => {
  await resetWorld();
  await db.cases.put(cas());
  avance = freezeAt(new Date(2026, 9, 5, 18, 0).getTime());
});
afterEach(() => resetTime());

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useLauf>, unknown>>;
const ouvre = async (depart: SimTeil | null = null) => {
  const h = renderHook(() => useLauf(cas(), depart));
  await waitFor(() => expect(h.result.current.laedt).toBe(false));
  return h;
};
/** Attend que le DERNIER état soit persisté (Teile joués et état), pas seulement une écriture. */
const persiste = async (h: Hook) =>
  waitFor(async () => {
    const v = (await db.meta.get(LAUF_AKTIV_KEY))?.value as { teileGespielt?: string[]; zustand?: string } | undefined;
    expect({ t: v?.teileGespielt, z: v?.zustand }).toEqual({ t: h.result.current.lauf?.teileGespielt, z: h.result.current.lauf?.zustand });
  });
/** Le candidat quitte le runner, s'absente `ms`, revient (barre, rechargement ou retour). */
const pause = async (h: Hook, ms: number) => { await persiste(h); h.unmount(); avance(ms); return ouvre(); };
const joue = (h: Hook) => { act(() => h.result.current.terminerPartie()); };
const suivant = (h: Hook) => { act(() => h.result.current.dispatch({ typ: 'partieSuivante' })); };
async function enregistre(h: Hook) {
  act(() => h.result.current.versChecklist());
  let id: string | null = null;
  await act(async () => { id = await h.result.current.beenden(); });
  return (await db.simulations.get(id!))!;
}

describe('INV-70 — entrée unique', () => {
  it('?depart=fallvorstellung : trois Teile planifiés, `komplett`, départ sur la Fallvorstellung', async () => {
    const h = await ouvre('fallvorstellung');
    expect(h.result.current.lauf?.geplanteTeile).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(h.result.current.lauf?.modus).toBe('komplett');
    expect(h.result.current.lauf?.aktuellerTeil).toBe('fallvorstellung');
  });
});

describe('INV-73 — l’enchaînement réel, à travers la reprise', () => {
  async function troisTeilesAvecPause(ms: number) {
    let h = await ouvre();
    joue(h); suivant(h);
    h = await pause(h, ms);
    joue(h); suivant(h); joue(h);
    return enregistre(h);
  }
  it('pause de 30 s : enchaîné', async () => { expect((await troisTeilesAvecPause(30_000)).enchaine).toBe(true); });
  it('pause de 4 min 59 s : enchaîné', async () => { expect((await troisTeilesAvecPause(299_000)).enchaine).toBe(true); });
  it('pause de 5 min : `enchaine` absent, la partie est écrite', async () => {
    const sim = await troisTeilesAvecPause(300_000);
    expect('enchaine' in sim).toBe(false);
    expect(sim.reihenfolge).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
  });
  it('interrompue une fois, la marque n’est jamais retirée — même après une seconde reprise courte', async () => {
    let h = await ouvre();
    joue(h); suivant(h);
    h = await pause(h, 6 * 60_000);
    expect(h.result.current.lauf?.unterbrochen).toBe(true);
    joue(h); suivant(h);
    h = await pause(h, 10_000);
    expect(h.result.current.lauf?.unterbrochen).toBe(true);
    joue(h);
    expect('enchaine' in (await enregistre(h))).toBe(false);
  });
});

describe('INV-72 — départ ailleurs, et le temps de la partie', () => {
  it('départ sur la Dokumentation avant tout chrono (300 s), « Terminer ici » : parts = { dokumentation }, 300 s', async () => {
    const h = await ouvre();
    act(() => h.result.current.dispatch({ typ: 'springeZu', teil: 'dokumentation' }));
    act(() => h.result.current.tick('dokumentation', 300));
    joue(h);
    const sim = await enregistre(h);
    expect(Object.keys(sim.parts)).toEqual(['dokumentation']);    // INV-71 : les Teile JOUÉS
    expect(sim.dauerGesamtSec).toBe(300);
    expect((await db.training_events.get(`te-${sim.id}`))?.spentMin).toBe(5);
  });

  it('[fixeur I11] chrono du départ lancé : « commencer par » un autre Teil est refusé', async () => {
    const h = await ouvre();
    act(() => h.result.current.tick('anamnese', 1));
    act(() => h.result.current.dispatch({ typ: 'springeZu', teil: 'dokumentation' }));
    expect(h.result.current.lauf?.aktuellerTeil).toBe('anamnese');
  });

  it('m6 : `dauerGesamtSec` compte TOUS les Teile commencés, joués ou non (projection)', () => {
    let l = transition(erstelleLauf({ caseId: cas().id, caseName: cas().name, assistance: 'autonome', layer: 2 }), { typ: 'demarrer', checkliste: [] });
    l = transition(tickChrono(l, 'anamnese', 600), { typ: 'terminerPartie', ergebnis: partResult(70, { durationSec: 600 }) });
    l = { ...l, sekundenProTeil: { ...l.sekundenProTeil, dokumentation: 95 } };   // un Teil commencé, pas joué (Lauf d'avant I11)
    expect(projektion(l, cas()).dauerGesamtSec).toBe(695);
  });
});

describe('[fixeur M3] une pause après le troisième Teil ne casse pas l’enchaînement', () => {
  it('trois Teile joués, pause de 20 min au bilan final, reprise, enregistrement : enchaîné', async () => {
    let h = await ouvre();
    joue(h); suivant(h); joue(h); suivant(h); joue(h);
    h = await pause(h, 20 * 60_000);
    expect(h.result.current.lauf?.unterbrochen).toBeUndefined();
    expect((await enregistre(h)).enchaine).toBe(true);
  });
});

describe('[mécanique I1] une Aufklärung de 6 min, runner monté : l’enchaînement tient', () => {
  it('Aufklärung pendant l’Anamnese, 6 min, sans quitter le runner : enchaîné', async () => {
    const h = await ouvre();
    act(() => h.result.current.aufklaerungOeffnen());
    for (let s = 60; s <= 360; s += 60) { avance(60_000); act(() => h.result.current.tick('aufklaerung', s)); }
    joue(h); suivant(h);                                          // retour à l'Anamnese interrompue
    joue(h); suivant(h); joue(h); suivant(h); joue(h);
    const sim = await enregistre(h);
    expect(sim.enchaine).toBe(true);
    expect(sim.parts.aufklaerung?.done).toBe(true);
  });
});

describe('INV-75 — le jour d’une partie est celui de son début', () => {
  it('commencée à 23 h 50, enregistrée à 0 h 20 : la Simulation et le journal datent du début', async () => {
    avance = freezeAt(new Date(2026, 9, 5, 23, 50).getTime());
    const h = await ouvre();
    const debut = h.result.current.lauf!.startedAt;
    avance(30 * 60_000);
    joue(h);
    const sim = await enregistre(h);
    expect(sim.date).toBe(debut);
    expect((await db.training_events.get(`te-${sim.id}`))?.at).toBe(debut);
  });
});
