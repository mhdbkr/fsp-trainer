// I1 + I3 (revue mécanique de S4-4) : le chemin complet visite → CasesPage → carte → arc dessiné.
// Une mutation qui ne passerait pas `visite` à la carte (ou ignorerait la progression arrivée en
// retard) doit faire échouer ces tests.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, CaseProgress } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { oublieLesTraces } from '@/components/visuals/CaseDial';
import { CasesPage } from './CasesPage';

const T0 = new Date(2026, 9, 5, 12).getTime();
const kase = (id: string) => ({ id, name: `Cas ${id}`, pathology: 'p', specialty: 'Kardiologie', frequency: 10, difficulty: 2, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);
const teil = (status: 'vierge' | 'acquis', lastScore: number | null, lastAt: number | null) => ({ status, lastScore, lastAt, attempts: lastScore === null ? 0 : 1 });
const cp = (lastAt: number): CaseProgress => ({
  caseId: 'c1', overall: 'entame', etat: 'entame', couverture: 1, maitrise: 78, solideDepuis: null, pretAt: null, prochaineConsolidation: null, pretManque: [],
  teile: { anamnese: teil('acquis', 78, lastAt), dokumentation: teil('vierge', null, null), fallvorstellung: teil('vierge', null, null) },
});

let container: HTMLDivElement; let root: Root;
const monte = async () => {
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter initialEntries={['/cas']}><Routes><Route path="/cas" element={<CasesPage />} /></Routes></MemoryRouter>); });
};
beforeEach(async () => {
  freezeAt(T0); oublieLesTraces(); localStorage.clear();
  await Promise.all([db.cases.clear(), db.case_progress.clear()]);
  await db.cases.bulkPut([kase('c1'), kase('c2')]);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); vi.restoreAllMocks(); });

const traces = () => [...container.querySelectorAll('.cd-trace')].map((e) => e.getAttribute('data-arc'));

describe('I3 — visite → page → carte → arc', () => {
  it('un Teil joué APRÈS la dernière visite se dessine', async () => {
    localStorage.setItem('doctopus-cas-visite', String(T0 - 10_000));
    await db.case_progress.put(cp(T0 - 1000));
    await monte();
    await vi.waitFor(() => expect(container.querySelectorAll('button.case-dial').length).toBe(2), { timeout: 3000 });
    expect(traces()).toEqual(['anamnese']);
  });
  it('joué AVANT la dernière visite : rien ne se dessine', async () => {
    localStorage.setItem('doctopus-cas-visite', String(T0 - 10_000));
    await db.case_progress.put(cp(T0 - 20_000));
    await monte();
    await vi.waitFor(() => expect(container.querySelectorAll('button.case-dial').length).toBe(2), { timeout: 3000 });
    expect(traces()).toEqual([]);
  });
  it('premier passage (aucune visite connue) : rien ne se dessine', async () => {
    await db.case_progress.put(cp(T0 - 1000));
    await monte();
    await vi.waitFor(() => expect(container.querySelectorAll('button.case-dial').length).toBe(2), { timeout: 3000 });
    expect(traces()).toEqual([]);
  });
});

describe('I1 — la progression arrive en retard', () => {
  it('la grille n\'est pas montée avant la progression, et l\'arc se dessine quand elle arrive', async () => {
    localStorage.setItem('doctopus-cas-visite', String(T0 - 10_000));
    await db.case_progress.put(cp(T0 - 1000));
    const vrai = db.case_progress.toArray.bind(db.case_progress);
    let libere!: () => void;
    const porte = new Promise<void>((r) => { libere = r; });
    vi.spyOn(db.case_progress, 'toArray').mockImplementation((async () => { await porte; return vrai(); }) as never);
    await monte();
    await new Promise((r) => setTimeout(r, 150));
    expect(container.querySelectorAll('button.case-dial').length).toBe(0);     // pas de cartes « vierges » provisoires
    expect(container.textContent).toMatch(/Chargement/);
    await act(async () => { libere(); await porte; });
    await vi.waitFor(() => expect(container.querySelectorAll('button.case-dial').length).toBe(2), { timeout: 3000 });
    expect(traces()).toEqual(['anamnese']);
  });
});
