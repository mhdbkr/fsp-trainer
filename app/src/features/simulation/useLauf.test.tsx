import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Case, SimTeil } from '@/db/types';
import { LAUF_AKTIV_KEY, speichereAktivenLauf } from '@/lib/lauf/speichern';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import { checklistFor } from '@/lib/checklists';
import { useLauf } from './useLauf';

// ============================================================================
// Le hook est la porte du runner sur l'automate. Ces tests jouent la partie
// PAR LE HOOK, comme le runner — pas par `transition()` seule : la revue de
// branche a montré qu'un automate juste ne suffit pas si le hook le contourne.
// ============================================================================

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const fall = (id = 'c1') => ({
  id, name: `Cas ${id}`, pathology: 'x', specialty: 'X',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: {},
} as unknown as Case);

const aktiv = async () => (await db.meta.get(LAUF_AKTIV_KEY))?.value as { id: string; zustand: string } | undefined;

function starte(c: Case, teil: SimTeil | null = null) {
  const h = renderHook(({ c, t }) => useLauf(c, t), { initialProps: { c, t: teil } });
  return h;
}

beforeEach(async () => {
  await db.simulations.clear();
  await db.meta.clear();
  await db.cases.clear();
  await db.cases.bulkPut([fall('c1'), fall('c2')]);
  localStorage.clear();
});

describe('C1 — la fin de partie passe par l’automate', () => {
  it('beenden() pendant `laufend` est refusé : rien n’est écrit, la partie continue (sonde du relecteur)', async () => {
    const { result } = starte(fall());
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    act(() => result.current.terminerPartie());
    act(() => result.current.dispatch({ typ: 'partieSuivante' }));
    expect(result.current.lauf?.aktuellerTeil).toBe('dokumentation');

    let id: string | null = 'x';
    await act(async () => { id = await result.current.beenden(); });
    expect(id).toBeNull();
    expect(result.current.lauf?.zustand).toBe('laufend');
    expect(await db.simulations.count()).toBe(0);
  });

  it('bilanz → checkliste → gespeichert ; après un tick, `lauf.aktiv` ne renaît pas', async () => {
    const { result } = starte(fall());
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    act(() => result.current.terminerPartie());
    act(() => result.current.versChecklist());
    expect(result.current.lauf?.zustand).toBe('checkliste');

    const laufId = result.current.lauf!.id;
    let p!: Promise<string | null>;
    act(() => { p = result.current.beenden(); });
    // `gespeichert` est posé AVANT l'écriture : aucune persistance en vol ne
    // peut réécrire un Lauf `laufend` pendant qu'on attend la base.
    expect(result.current.lauf?.zustand).toBe('gespeichert');
    let id: string | null = null;
    await act(async () => { id = await p; });
    expect(id).toBe(laufId);

    act(() => result.current.tick('anamnese', 9999));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(await aktiv()).toBeUndefined();
    expect(await db.simulations.count()).toBe(1);
  });

  it('l’Arztbrief est une étape facultative atteinte depuis la checklist', async () => {
    const { result } = starte(fall(), 'anamnese');
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    act(() => result.current.terminerPartie());
    act(() => result.current.versChecklist());
    act(() => result.current.arztbriefSchreiben());
    expect(result.current.lauf?.zustand).toBe('arztbrief');
    await act(async () => { await result.current.beenden(); });
    expect(result.current.lauf?.zustand).toBe('gespeichert');
    expect(await db.simulations.count()).toBe(1);
  });
});

/** Un Lauf en vol dans `lauf.aktiv`, avec `gespielt` parties terminées. */
async function enVol(caseId: string, teil: SimTeil | null, gespielt = 0) {
  const geplant: SimTeil[] = teil ? [teil] : ['anamnese', 'dokumentation', 'fallvorstellung'];
  let l = erstelleLauf({ caseId, caseName: caseId, profileId: 'p1', geplanteTeile: geplant, assistance: 'assiste', layer: 1 });
  l = transition(l, { typ: 'demarrer', checkliste: geplant.flatMap((t) => checklistFor(t)) });
  for (let i = 0; i < gespielt; i++) {
    l = transition(l, { typ: 'terminerPartie', ergebnis: { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 50, officialPct: 50 } });
    if (i < gespielt - 1) l = transition(l, { typ: 'partieSuivante' });
  }
  await speichereAktivenLauf(l);
  return l;
}

describe('I2 — la reprise respecte le mode, et une partie jouée n’est jamais jetée', () => {
  it('même cas, même mode ⇒ reprise à l’identique', async () => {
    const alt = await enVol('c1', 'anamnese');
    const { result } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(result.current.lauf?.id).toBe(alt.id);
  });

  it('(a) Teil seul en cours, puis simulation complète du même cas ⇒ ce n’est PAS le Teil seul qui est repris', async () => {
    const alt = await enVol('c1', 'anamnese');
    const { result } = starte(fall('c1'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(result.current.lauf?.id).not.toBe(alt.id);
    expect(result.current.lauf?.modus).toBe('komplett');
  });

  it('(b) run complet avec une partie jouée, puis « Anamnese seule » ⇒ le run est ÉCRIT, pas supprimé', async () => {
    const alt = await enVol('c1', null, 1);
    const { result } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(result.current.lauf?.id).not.toBe(alt.id);
    expect(result.current.lauf?.modus).toBe('teil');
    const sim = await db.simulations.get(alt.id);
    expect(sim?.parts.anamnese?.done).toBe(true);
  });

  it('(c) run complet avec une partie jouée, puis un autre cas ⇒ le run est ÉCRIT', async () => {
    const alt = await enVol('c1', null, 1);
    const { result } = starte(fall('c2'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(result.current.lauf?.caseId).toBe('c2');
    expect(await db.simulations.get(alt.id)).toBeDefined();
  });

  it('un Lauf sans partie jouée qu’on quitte pour un autre mode n’est pas écrit', async () => {
    await enVol('c1', null, 0);
    const { result } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(await db.simulations.count()).toBe(0);
  });
});

describe('I2 — quitter le runner met la partie en pause dans la barre « Reprendre »', () => {
  it('démontage du runner ⇒ snapshot présent et minimisé ; remontage ⇒ repris', async () => {
    const { useSimSession } = await import('@/store/simSession');
    useSimSession.setState({ snapshot: null, minimized: false });
    const { result, unmount } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    await waitFor(() => expect(useSimSession.getState().snapshot?.caseId).toBe('c1'));
    unmount();
    expect(useSimSession.getState().minimized).toBe(true);
    expect(useSimSession.getState().snapshot?.teil).toBe('anamnese');
    starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(useSimSession.getState().minimized).toBe(false));
  });
});

describe('M2 — un seul repli pour profileId, et « local » ne part jamais au serveur', () => {
  async function jusquAuSave() {
    const { result } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    act(() => result.current.terminerPartie());
    act(() => result.current.versChecklist());
    let id: string | null = null;
    await act(async () => { id = await result.current.beenden(); });
    return { lauf: result.current.lauf!, sim: await db.simulations.get(id!) };
  }

  it('sans compte actif : profileId absent, du Lauf à la Simulation', async () => {
    const { lauf, sim } = await jusquAuSave();
    expect(lauf.profileId).toBeUndefined();
    expect(sim?.profileId).toBeUndefined();
  });

  it('avec un compte actif : c’est lui qui est crédité', async () => {
    localStorage.setItem('fsp.activeUserId', 'u-lydia');
    const { lauf, sim } = await jusquAuSave();
    expect(lauf.profileId).toBe('u-lydia');
    expect(sim?.profileId).toBe('u-lydia');
  });
});

describe('Re-revue IMPORTANT — un abandon qui échoue ne bloque jamais le runner', () => {
  it('P3 — Lauf en cours sur un cas disparu de db.cases : le runner d’un autre cas se charge, et le run est écrit', async () => {
    const alt = await enVol('ghost', null, 1);           // `ghost` n'est pas dans db.cases
    const { result } = starte(fall('c2'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(result.current.lauf?.caseId).toBe('c2');
    expect((await db.simulations.get(alt.id))?.caseId).toBe('ghost');
  });

  it('écriture d’abandon qui lève : Lauf écarté, le runner continue', async () => {
    await enVol('c1', null, 1);
    const spy = vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('QuotaExceeded') as never);
    const { result } = starte(fall('c2'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    spy.mockRestore();
    expect(result.current.lauf?.caseId).toBe('c2');
  });
});

describe('Re-revue — mineur 11 / P4 : un lauf.aktiv corrompu ne bloque pas', () => {
  it('checkliste: {} sur le même cas ⇒ le runner se charge sur un Lauf neuf', async () => {
    const l = await enVol('c1', null, 0);
    await db.meta.put({ key: LAUF_AKTIV_KEY, value: { ...l, checkliste: {} } } as never);
    const { result } = starte(fall('c1'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect(result.current.lauf?.id).not.toBe(l.id);
    expect(Array.isArray(result.current.lauf?.checkliste)).toBe(true);
  });
});

describe('Re-revue — mineur 9 : un échec d’écriture ne fige jamais l’écran', () => {
  it('l’écriture lève ⇒ retour à la checklist, message d’erreur, et un second essai réussit', async () => {
    const { result } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    act(() => result.current.terminerPartie());
    act(() => result.current.versChecklist());
    const spy = vi.spyOn(db, 'transaction').mockRejectedValueOnce(new Error('QuotaExceeded') as never);
    let id: string | null = 'x';
    await act(async () => { id = await result.current.beenden(); });
    spy.mockRestore();
    expect(id).toBeNull();
    expect(result.current.lauf?.zustand).toBe('checkliste');
    expect(result.current.fehler).toMatch(/QuotaExceeded/);
    await waitFor(async () => expect((await aktiv())?.zustand).toBe('checkliste'));

    await act(async () => { id = await result.current.beenden(); });
    expect(id).toBe(result.current.lauf!.id);
    expect(result.current.fehler).toBeNull();
    expect(result.current.lauf?.zustand).toBe('gespeichert');
  });
});

describe('mineur 7 — pas de sortie qui jette une partie jouée', () => {
  it('le hook n’expose plus `abbrechen` (suppression muette, contraire au §3.1)', async () => {
    const { result } = starte(fall('c1'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect('abbrechen' in result.current).toBe(false);
  });
});

describe('Re-revue 2 — item 1 : une partie jouée n’est jamais jetée pour un Lauf corrompu', () => {
  it('checkliste: [null] sur un run où l’Anamnese est jouée ⇒ le run est ÉCRIT au changement de mode', async () => {
    const l = await enVol('c1', null, 1);
    await db.meta.put({ key: LAUF_AKTIV_KEY, value: { ...l, checkliste: [null, ...l.checkliste] } } as never);
    const { result } = starte(fall('c1'), 'anamnese');
    await waitFor(() => expect(result.current.laedt).toBe(false));
    expect((await db.simulations.get(l.id))?.parts.anamnese?.done).toBe(true);
  });

  it('la reprise lève ⇒ le catch tente d’écrire le run avant de l’écarter', async () => {
    const l = await enVol('c1', null, 1);
    const spy = vi.spyOn(db.meta, 'get').mockRejectedValueOnce(new Error('lecture impossible') as never);
    const { result } = starte(fall('c2'), null);
    await waitFor(() => expect(result.current.laedt).toBe(false));
    spy.mockRestore();
    expect((await db.simulations.get(l.id))?.parts.anamnese?.done).toBe(true);
  });
});
