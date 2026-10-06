// I6 (revue s3-programme) : la semaine montre la projection NON FIGÉE des
// jours à venir, marquée comme telle ; elle ne se coche pas. (S4-5 : la semaine remplace le calendrier.)
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
import { refreshToday } from '@/lib/today';
import { ensureDayPlan } from '@/lib/program/dayPlan';
import { ProgramPage } from './ProgramPage';

const cases = Array.from({ length: 12 }, (_, i) => ({
  id: `c${i}`, name: `Cas ${i}`, pathology: `p${i}`, specialty: ['Kardiologie', 'Pneumologie', 'Neurologie'][i % 3],
  frequency: 20 - i, centers: [], linkedFachbegriffeIds: [], difficulty: 2,
} as unknown as Case));
const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;

let container: HTMLDivElement; let root: Root;
const jour = (re: RegExp) => [...container.querySelectorAll('li[aria-label]')].map((l) => l.getAttribute('aria-label')!).find((l) => re.test(l)) ?? '';
beforeEach(async () => {
  freezeAt(new Date(2026, 9, 1, 8, 0));                               // jeudi 1er octobre
  refreshToday();                                                   // le store « aujourd'hui » suit l'horloge figée (I-1)
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear()]);
  await db.cases.bulkPut(cases);
  await db.meta.put({ key: 'program', value: config });
  await ensureDayPlan();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
  await vi.waitFor(() => expect(jour(/^vendredi 2 oct\./)).toMatch(/en projection/), { timeout: 3000 });   // un jour projeté est rendu
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('I6 — la semaine : projection des jours à venir', () => {
  it('vendredi 2 : en projection, non figée, sans coche ; mardi 29 (passé, sans plan) : vide, jamais en retard', () => {
    expect(jour(/^vendredi 2 oct\./)).toMatch(/^vendredi 2 oct\. : \d+ cas en projection, non figée$/);
    expect(jour(/^mardi 29 sept\./)).toBe('mardi 29 sept. : aucun cas prévu');
    expect(container.querySelectorAll('[title="Marquer faite"]').length, 'seul le jour figé se coche').toBe(container.querySelectorAll('div.rounded-xl.border.transition-colors').length);
    expect(container.textContent).not.toMatch(/volontairement vides/);
  });
});

describe('I10 — J-x : une seule formule (joursRestants), la même sur tous les écrans', () => {
  it('le soir, le Programme affiche le même J-x que la frise', async () => {
    act(() => root.unmount());
    freezeAt(new Date(2026, 10, 20, 20, 0));                          // 20 nov. 20 h → examen 1er déc. : 11 jours calendaires (loin de l'horloge réelle)
    refreshToday();                                                   // le store « aujourd'hui » suit l'horloge figée (I-1)
    root = createRoot(container);
    await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toMatch(/J-11(?!\d)/), { timeout: 3000 });
  });
});
