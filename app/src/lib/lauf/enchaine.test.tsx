import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freezeAt, resetClock } from '@/lib/clock';
import type { Case } from '@/db/types';
import { useLauf } from '@/features/simulation/useLauf';
import { LAUF_AKTIV_KEY } from './speichern';

// ============================================================================
// INV-73 (simulation-run.md §3.1, §10.4) — l'enchaînement réel, PAR LE HOOK.
// Les trois chemins de reprise — la barre « Reprendre » (qui navigue vers le
// runner), le rechargement de l'onglet, le retour sur le runner — passent par
// la MÊME branche de `useLauf` : un démontage puis un remontage du hook, avec
// `lauf.aktiv` relu en base. On y joue des pauses de 30 s, 4 min 59 s et 5 min.
// ============================================================================

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const fall = {
  id: 'c1', name: 'Cas', pathology: 'x', specialty: 'X',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: {},
} as unknown as Case;

let avance: (ms: number) => number;
beforeEach(async () => {
  await db.simulations.clear(); await db.training_events.clear(); await db.meta.clear();
  await db.cases.clear(); await db.cases.put(fall);
  avance = freezeAt(new Date(2026, 9, 5, 18, 0).getTime());
});
afterEach(() => resetClock());

const persiste = async () => waitFor(async () => expect((await db.meta.get(LAUF_AKTIV_KEY))?.value).toBeTruthy());

/** Joue l'Anamnese, quitte le runner, attend `pauseMs`, revient ; puis finit la partie et l'enregistre. */
async function partieAvecPause(pauseMs: number) {
  const a = renderHook(() => useLauf(fall, null));
  await waitFor(() => expect(a.result.current.lauf?.zustand).toBe('laufend'));
  act(() => a.result.current.terminerPartie());
  act(() => a.result.current.dispatch({ typ: 'partieSuivante' }));
  await persiste();
  a.unmount();                                              // barre « Reprendre », rechargement ou départ du runner
  avance(pauseMs);
  const b = renderHook(() => useLauf(fall, null));
  await waitFor(() => expect(b.result.current.laedt).toBe(false));
  const repris = b.result.current.lauf!;
  act(() => b.result.current.terminerPartie());
  act(() => b.result.current.dispatch({ typ: 'partieSuivante' }));
  act(() => b.result.current.terminerPartie());
  act(() => b.result.current.versChecklist());
  let id: string | null = null;
  await act(async () => { id = await b.result.current.beenden(); });
  return { repris, sim: await db.simulations.get(id!) };
}

describe('INV-73 — une reprise de moins de 5 min ne casse pas l’enchaînement', () => {
  it('pause de 30 s : même Lauf, enchaîné', async () => {
    const { repris, sim } = await partieAvecPause(30_000);
    expect(repris.teileGespielt).toEqual(['anamnese']);
    expect(repris.unterbrochen).toBeUndefined();
    expect(sim?.enchaine).toBe(true);
  });

  it('pause de 4 min 59 s : enchaîné', async () => {
    const { sim } = await partieAvecPause(4 * 60_000 + 59_000);
    expect(sim?.enchaine).toBe(true);
  });

  it('pause de 5 min : interrompu, `enchaine` absent', async () => {
    const { repris, sim } = await partieAvecPause(5 * 60_000);
    expect(repris.unterbrochen).toBe(true);
    expect(sim?.parts.fallvorstellung?.done).toBe(true);
    expect(sim && 'enchaine' in sim).toBe(false);
  });
});
