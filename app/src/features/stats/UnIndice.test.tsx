// D-I9 (revue s3-programme) : UN seul indice de préparation — celui de la frise
// (ADR-0020, dérivé du journal). La jauge « Prêt à réussir la FSP ? » et sa
// seconde formule sont retirées.
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
import type { Case, ProgramConfig } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { StatsPage } from './StatsPage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
let container: HTMLDivElement; let root: Root;
beforeEach(async () => {
  freezeAt(new Date(2026, 9, 2, 8, 0));
  await Promise.all([db.cases.clear(), db.meta.clear(), db.training_events.clear(), db.case_progress.clear(), db.simulations.clear(), db.fachbegriffe.clear()]);
  await db.cases.put({ id: 'c1', name: 'Cas', pathology: 'p', specialty: 'Kardiologie', frequency: 10, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);
  await db.meta.put({ key: 'program', value: { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig });
  await db.training_events.put({ id: 'x', at: new Date(2026, 9, 1, 10).getTime(), kind: 'fiche', caseId: 'c1', teile: [], source: 'libre', spentMin: 10 });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter><StatsPage /></MemoryRouter>); });
  await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('D-I9 — un seul indice de préparation', () => {
  it('la frise porte l\'indice ; la jauge et sa seconde formule ont disparu', () => {
    expect(container.querySelectorAll('[aria-label^="Indice de préparation"]').length).toBe(1);
    expect(container.textContent).not.toMatch(/Prêt à réussir la FSP/);
  });
});
