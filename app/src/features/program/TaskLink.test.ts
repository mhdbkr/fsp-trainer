// R-C4 : « Lancer » depuis une tâche du plan porte la tâche jusqu'à la partie.
import { describe, it, expect } from 'vitest';
import type { TaskInstance } from '@/db/types';
import { taskLink } from './TaskLine';

const t = (o: Partial<TaskInstance>): TaskInstance => ({ id: 'tA', date: '2026-10-01', kind: 'simulation', caseId: 'c1', label: 'X', estMin: 20, source: 'plan', reason: 'r', ...o });

describe('R-C4 — taskLink porte la tâche', () => {
  it('simulation d\'un Teil, et run complet', () => {
    expect(taskLink(t({ teil: 'anamnese' }))).toBe('/simulation/c1/pre?depart=anamnese&task=tA');
    expect(taskLink(t({ kind: 'examen-blanc' }))).toBe('/simulation/c1/pre?task=tA');
  });
});

// S4-2 revue I1 : « Il te reste la Dokumentation » ⇒ « Lancer » part de la Dokumentation.
// [S4-3] simulation-run.md §10.3, training-journal.md §12.1 : le lien porte `?depart=` — le Teil par lequel
// la partie COMMENCE, jamais son périmètre (INV-70) — et toute tâche de cas se lance ainsi, `revision` comprise (m8).
describe('S4-2 I1 — Lancer part du premier Teil de ce qui reste', () => {
  it('reste figé avec la tâche', () => {
    expect(taskLink(t({ teile: ['dokumentation', 'fallvorstellung'] }))).toBe('/simulation/c1/pre?depart=dokumentation&task=tA');
    expect(taskLink(t({ teile: ['anamnese'] }))).toBe('/simulation/c1/pre?depart=anamnese&task=tA');
    expect(taskLink(t({ teile: ['anamnese', 'dokumentation', 'fallvorstellung'] })), 'le cas entier part du début').toBe('/simulation/c1/pre?task=tA');
  });
  it('reste vécu dans la journée (tâche entamée) : il prime sur le reste figé', () => {
    expect(taskLink(t({ teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }), ['fallvorstellung'])).toBe('/simulation/c1/pre?depart=fallvorstellung&task=tA');
  });
});

describe('S4-3 m8 — toute tâche de cas se lance par la pré-simulation, `revision` comprise', () => {
  it('révision (consolidation) : les trois Teile, départ par l’Anamnese, puis ce qui reste dans la journée', () => {
    expect(taskLink(t({ kind: 'revision', teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }))).toBe('/simulation/c1/pre?task=tA');
    expect(taskLink(t({ kind: 'revision' }), ['dokumentation', 'fallvorstellung'])).toBe('/simulation/c1/pre?depart=dokumentation&task=tA');
  });
});

// Fixeur S4-3, I8 (décision (d), exception de périmètre accordée) : la couche ne s'affiche plus dans le programme.
describe('TaskAnatomy — plus de « Couche N »', () => {
  it('l’assistance reste, la couche disparaît', async () => {
    const { render } = await import('@testing-library/react');
    const { createElement } = await import('react');
    const { TaskAnatomy } = await import('./TaskLine');
    const { container } = render(createElement(TaskAnatomy, { task: t({ layer: 3, assistance: 'autonome' }) }));
    expect(container.textContent).toContain('autonome');
    expect(container.textContent).not.toMatch(/couche/i);
  });
});
