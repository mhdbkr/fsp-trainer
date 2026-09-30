import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSimSession, hydriereAusLauf, SIM_SESSION_STORAGE_KEY, type SessionSnapshot } from './simSession';
import { db } from '@/db/db';
import type { Case } from '@/db/types';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import { LAUF_AKTIV_KEY, speichereAktivenLauf } from '@/lib/lauf/speichern';
import { checklistFor } from '@/lib/checklists';

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

// Session en pause persistée en sessionStorage (revue UX F2b : un reload
// pendant « Drill ces termes » perdait silencieusement la simulation).
const draft: Omit<SessionSnapshot, 'startedAt'> = {
  caseId: 'c1', caseName: 'Ulcus', active: 'anamnese', phase: 'play', bogen: {}, arztbriefText: '',
  results: {}, aufklaerungOpen: false, elapsed: { anamnese: 42 }, teil: null,
};

/** Simule un reload : la mémoire React est perdue, le sessionStorage reste. */
function reload() {
  const raw = sessionStorage.getItem(SIM_SESSION_STORAGE_KEY);
  useSimSession.setState({ snapshot: null, minimized: false });
  if (raw === null) sessionStorage.removeItem(SIM_SESSION_STORAGE_KEY); else sessionStorage.setItem(SIM_SESSION_STORAGE_KEY, raw);
  useSimSession.persist.rehydrate();
}

describe('simSession — persistance sessionStorage', () => {
  beforeEach(() => { sessionStorage.clear(); useSimSession.getState().end(); });

  it('sync() écrit { snapshot, minimized } sous fsp.simSession (et rien d\'autre)', () => {
    useSimSession.getState().sync(draft);
    useSimSession.getState().setFocus({ caseId: 'c1', part: 'anamnese', ci: 0, ii: 0 });
    const raw = JSON.parse(sessionStorage.getItem(SIM_SESSION_STORAGE_KEY) ?? 'null');
    expect(raw.state.snapshot.caseId).toBe('c1');
    expect(raw.state.minimized).toBe(false);
    expect(raw.state.focus).toBeUndefined();
  });

  it('reload pendant le drill (minimized) → snapshot présent, minimized true, chrono figé', () => {
    useSimSession.getState().sync(draft);
    useSimSession.getState().minimize();
    reload();
    const s = useSimSession.getState();
    expect(s.snapshot?.caseId).toBe('c1');
    expect(s.snapshot?.elapsed).toEqual({ anamnese: 42 });
    expect(s.minimized).toBe(true);
  });

  it('reload DANS le runner (minimized false) → réveillé en pause pour que « Reprendre » l\'offre', () => {
    useSimSession.getState().sync(draft); // dans le Runner : minimized reste false
    reload();
    expect(useSimSession.getState().snapshot?.caseId).toBe('c1');
    expect(useSimSession.getState().minimized).toBe(true);
  });

  it('end() efface le store ET le stockage', () => {
    useSimSession.getState().sync(draft);
    useSimSession.getState().minimize();
    useSimSession.getState().end();
    expect(sessionStorage.getItem(SIM_SESSION_STORAGE_KEY)).toBeNull();
    useSimSession.persist.rehydrate();
    expect(useSimSession.getState().snapshot).toBeNull();
    expect(useSimSession.getState().minimized).toBe(false);
  });

  it('stockage corrompu → état vierge, pas d\'exception', () => {
    sessionStorage.setItem(SIM_SESSION_STORAGE_KEY, JSON.stringify({ state: { snapshot: { nope: 1 }, minimized: true }, version: 1 }));
    expect(() => useSimSession.persist.rehydrate()).not.toThrow();
    expect(useSimSession.getState().snapshot).toBeNull();
    expect(useSimSession.getState().minimized).toBe(false);
  });
});

// ============================================================================
// La barre « Reprendre » lit `lauf.aktiv` (Dexie), la source de la reprise
// (contrat §3.1) — plus seulement `sessionStorage`, qui meurt avec l'onglet :
// après fermeture de l'onglet, rien ne proposait la reprise.
// ============================================================================
async function laufEnVol(gespielt: number) {
  await db.cases.put({ id: 'c1', name: 'Ulcus' } as unknown as Case);
  let l = erstelleLauf({ caseId: 'c1', caseName: 'Ulcus', profileId: 'p1', geplanteTeile: ['anamnese'], assistance: 'assiste', layer: 1 });
  l = transition(l, { typ: 'demarrer', checkliste: checklistFor('anamnese') });
  if (gespielt) l = transition(l, { typ: 'terminerPartie', ergebnis: { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 50, officialPct: 50 } });
  await speichereAktivenLauf(l);
  return l;
}

describe('simSession — la barre « Reprendre » lit lauf.aktiv', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    useSimSession.setState({ snapshot: null, minimized: false });
    await db.meta.clear(); await db.simulations.clear();
  });

  it('onglet rouvert (sessionStorage vide) : le Lauf en vol est proposé, mode compris', async () => {
    await laufEnVol(0);
    await hydriereAusLauf();
    const s = useSimSession.getState();
    expect(s.snapshot?.caseId).toBe('c1');
    expect(s.snapshot?.teil).toBe('anamnese');
    expect(s.minimized).toBe(true);
  });

  it('snapshot en pause sans Lauf derrière : fantôme effacé', async () => {
    useSimSession.getState().sync(draft);
    useSimSession.getState().minimize();
    await hydriereAusLauf();
    expect(useSimSession.getState().snapshot).toBeNull();
  });

  it('✕ (end) sur un Lauf avec une partie jouée : il est ÉCRIT, pas jeté', async () => {
    const l = await laufEnVol(1);
    await hydriereAusLauf();
    await useSimSession.getState().end();
    expect(await db.simulations.get(l.id)).toBeDefined();
    expect(await db.meta.get(LAUF_AKTIV_KEY)).toBeUndefined();
  });

  it('✕ (end) sur un Lauf sans partie jouée : supprimé, rien d’écrit', async () => {
    await laufEnVol(0);
    await useSimSession.getState().end();
    expect(await db.simulations.count()).toBe(0);
    expect(await db.meta.get(LAUF_AKTIV_KEY)).toBeUndefined();
  });
});
