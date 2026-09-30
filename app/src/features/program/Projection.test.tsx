// I6 (revue s3-programme) : le calendrier montre la projection NON FIGÉE des
// jours à venir, marquée comme telle ; elle ne se coche pas.
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
import { ensureDayPlan } from '@/lib/program/dayPlan';
import { ProgramPage } from './ProgramPage';

const cases = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i}`, name: `Cas ${i}`, pathology: `p${i}`, specialty: ['Kardiologie', 'Pneumologie', 'Neurologie'][i % 3],
  frequency: 20 - i, centers: [], linkedFachbegriffeIds: [], difficulty: 2,
} as unknown as Case));
const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;

let container: HTMLDivElement; let root: Root;
beforeEach(async () => {
  freezeAt(new Date(2026, 9, 1, 8, 0));                               // jeudi 1er octobre
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear()]);
  await db.cases.bulkPut(cases);
  await db.meta.put({ key: 'program', value: config });
  await ensureDayPlan();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
  await act(async () => { await new Promise((r) => setTimeout(r, 80)); });
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('I6 — calendrier : projection des jours à venir', () => {
  it('vendredi 2 : cellule « projection », sans coche ; mercredi 30 (passé) : vide', () => {
    const cell = (label: RegExp) => [...container.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''));
    expect(cell(/ven\.? 2/i)?.textContent).toMatch(/projection/i);
    expect(cell(/mer\.? 30/i)?.textContent ?? '').not.toMatch(/projection/i);
    expect(container.textContent).not.toMatch(/volontairement vides/);
  });
});
