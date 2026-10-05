// S4-2 revue I2 : le héros de l'accueil dit les minutes de ce qui RESTE d'un cas entamé (52 → 32), comme la ligne du plan,
// et « Lancer » part du premier Teil de ce reste.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: Object.assign((sel: (s: { user: null }) => unknown) => sel({ user: null }), { getState: () => ({ user: null }) }),
}));

import { db } from '@/db/db';
import type { Case, DayPlan, ProgramConfig, TaskInstance, TrainingEvent } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { HomePage } from './HomePage';

const config = { startDate: '2026-09-01', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
let container: HTMLDivElement; let root: Root;

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 12, 18, 0));
  refreshToday();
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear()]);
  await db.cases.put({ id: 'c1', name: 'Pneumonie', pathology: 'p', specialty: 'Pneumologie', frequency: 10, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);
  await db.meta.put({ key: 'program', value: config });
  const tache: TaskInstance = { id: 't1', date: '2026-10-12', kind: 'simulation', caseId: 'c1', label: 'Pneumonie', teile: ['anamnese', 'dokumentation', 'fallvorstellung'], estMin: 52, source: 'plan', reason: 'r', creeA: new Date(2026, 9, 12, 7).getTime() };
  await db.day_plans.put({ date: '2026-10-12', materializedAt: 0, mode: 'cas-complet', seed: 's', targetMin: 120, tasks: [tache] } as DayPlan);
  const jouee: TrainingEvent = { id: 'e1', at: new Date(2026, 9, 12, 9).getTime(), kind: 'simulation', caseId: 'c1', teile: ['anamnese'], source: 'plan', spentMin: 18, scores: { anamnese: 70 } };
  await db.training_events.put(jouee);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('S4-2 I2 — le héros de l’accueil', () => {
  it('dit les minutes de ce qui reste (Σ dureeTeil de D et F = 32), et Lancer part de la Dokumentation', async () => {
    await act(async () => { root.render(<MemoryRouter><HomePage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toMatch(/Session du jour/), { timeout: 10000 });
    const heros = [...container.querySelectorAll('h2')].find((h) => h.textContent === 'Pneumonie')!.closest('div.relative')!;
    expect(heros.textContent).toMatch(/32 min/);
    expect(heros.textContent).not.toMatch(/52 min/);
    expect(heros.querySelector('a')!.getAttribute('href')).toContain('teil=dokumentation');
  });
});
