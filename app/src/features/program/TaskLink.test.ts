// R-C4 : « Lancer » depuis une tâche du plan porte la tâche jusqu'à la partie.
import { describe, it, expect } from 'vitest';
import type { TaskInstance } from '@/db/types';
import { taskLink } from './TaskLine';

const t = (o: Partial<TaskInstance>): TaskInstance => ({ id: 'tA', date: '2026-10-01', kind: 'simulation', caseId: 'c1', label: 'X', estMin: 20, source: 'plan', reason: 'r', ...o });

describe('R-C4 — taskLink porte la tâche', () => {
  it('simulation d\'un Teil, et run complet', () => {
    expect(taskLink(t({ teil: 'anamnese' }))).toBe('/simulation/c1/pre?teil=anamnese&task=tA');
    expect(taskLink(t({ kind: 'examen-blanc' }))).toBe('/simulation/c1/pre?task=tA');
  });
});

// S4-2 revue I1 : « Il te reste la Dokumentation » ⇒ « Lancer » part de la Dokumentation (en attendant `?depart=` de S4-3).
describe('S4-2 I1 — Lancer part du premier Teil de ce qui reste', () => {
  it('reste figé avec la tâche', () => {
    expect(taskLink(t({ teile: ['dokumentation', 'fallvorstellung'] }))).toBe('/simulation/c1/pre?teil=dokumentation&task=tA');
    expect(taskLink(t({ teile: ['anamnese'] }))).toBe('/simulation/c1/pre?teil=anamnese&task=tA');
    expect(taskLink(t({ teile: ['anamnese', 'dokumentation', 'fallvorstellung'] })), 'le cas entier part du début').toBe('/simulation/c1/pre?task=tA');
  });
  it('reste vécu dans la journée (tâche entamée) : il prime sur le reste figé', () => {
    expect(taskLink(t({ teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }), ['fallvorstellung'])).toBe('/simulation/c1/pre?teil=fallvorstellung&task=tA');
  });
});
