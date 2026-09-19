import { describe, it, expect, beforeEach } from 'vitest';
import { useSimSession, SIM_SESSION_STORAGE_KEY, type SessionSnapshot } from './simSession';

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
