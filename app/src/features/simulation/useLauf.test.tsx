import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import type { Case, SimTeil } from '@/db/types';
import { LAUF_AKTIV_KEY } from '@/lib/lauf/speichern';
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
