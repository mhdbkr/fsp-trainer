// C6-B m-5 — la série tombait à 0 chaque lundi : le week-end off du programme
// n'était pas neutralisé. Un lundi après 5/5 jours ouvrés, la tuile affiche 5,
// sur l'accueil comme sur l'historique.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: Object.assign(() => null, { getState: () => ({ user: null, status: 'anonymous' }), subscribe: () => () => {} }),
}));

import { db } from '@/db/db';
import type { Case, ProgramConfig, TrainingEvent } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { HomePage } from '@/features/home/HomePage';
import { HistoriquePage } from './HistoriquePage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;

let container: HTMLDivElement; let root: Root;
beforeEach(async () => {
  freezeAt(new Date(2026, 9, 5, 8, 0));                            // lundi 5 octobre
  refreshToday();
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear(), db.simulations.clear()]);
  await db.cases.put({ id: 'c0', name: 'Cas 0', pathology: 'p', specialty: 'Kardiologie', frequency: 20, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);
  await db.meta.put({ key: 'program', value: config });
  // lun. 28 sept. → ven. 2 oct. : 5 jours ouvrés sur 5, puis le week-end off.
  const jours = [28, 29, 30, 1, 2].map((d, i) => new Date(2026, i < 3 ? 8 : 9, d, 10, 0).getTime());
  await db.training_events.bulkPut(jours.map((at, i) => ({ id: `e${i}`, at, kind: 'simulation', caseId: 'c0', teile: ['anamnese'], source: 'plan', spentMin: 20 } as unknown as TrainingEvent)));
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('la série du lundi', () => {
  it('accueil : « 5 jours de suite »', async () => {
    await act(async () => { root.render(<MemoryRouter><HomePage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toMatch(/5\s*jours de suite/), { timeout: 10000 });
  });
  it('historique : « Série en cours 5 j »', async () => {
    await act(async () => { root.render(<MemoryRouter><HistoriquePage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toMatch(/Série en cours\s*5 j/), { timeout: 10000 });
  });
});
