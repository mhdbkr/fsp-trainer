// C6-A « des chiffres honnêtes » — ce que l'écran Stats dit, lu dans le DOM RENDU.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, PartResult, ProgramConfig, Simulation } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { StatsPage } from './StatsPage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
let container: HTMLDivElement; let root: Root;

const part = (score: number): PartResult => ({ done: true, durationSec: 600, contentPct: score, feeling: score, checklist: [] } as unknown as PartResult);
const sim = (id: string, parts: Simulation['parts'], over: Partial<Simulation> = {}): Simulation =>
  ({ id, caseId: 'c1', date: new Date(2026, 9, 1, 10).getTime(), parts, notes: {}, prioritizedCorrections: [], ...over } as unknown as Simulation);

async function monte(): Promise<void> {
  await act(async () => { root.render(<MemoryRouter><StatsPage /></MemoryRouter>); });
  await vi.waitFor(() => expect(container.querySelector('[aria-label^="Indice de préparation"]')).not.toBeNull(), { timeout: 3000 });
}

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 2, 8, 0));
  await Promise.all([db.cases.clear(), db.meta.clear(), db.training_events.clear(), db.case_progress.clear(), db.simulations.clear(), db.fachbegriffe.clear()]);
  await db.cases.put({ id: 'c1', name: 'Cas', pathology: 'p', specialty: 'Kardiologie', frequency: 10, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);
  await db.meta.put({ key: 'program', value: { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig });
  await db.training_events.put({ id: 'x', at: new Date(2026, 9, 1, 10).getTime(), kind: 'fiche', caseId: 'c1', teile: [], source: 'libre', spentMin: 10 });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('BUG-C6-1 — les démos ne sont pas les données du candidat', () => {
  it('une seule vraie partie : « 0 simulations complètes · 1 par partie », et la courbe n\'a qu\'un point', async () => {
    await db.simulations.bulkPut([
      sim('sim-demo-1', { anamnese: part(80), dokumentation: part(80), fallvorstellung: part(80) }),
      sim('sim-demo-2', { anamnese: part(80), dokumentation: part(80), fallvorstellung: part(80) }),
      sim('sim-demo-3', { anamnese: part(80), fallvorstellung: part(80) }),
      sim('vraie', { anamnese: part(40) }, { scope: 'teil', teil: 'anamnese' }),
    ]);
    await monte();
    expect(container.textContent).toMatch(/0 simulations complètes · 1 par partie/);
  });

  it('sans aucune vraie partie : la courbe dit comment elle naîtra', async () => {
    await db.simulations.put(sim('sim-demo-1', { anamnese: part(80) }));
    await monte();
    expect(container.textContent).toContain('Ta première partie dessinera ta courbe.');
    expect(container.textContent).toMatch(/0 simulations complètes · 0 par partie/);
  });
});
