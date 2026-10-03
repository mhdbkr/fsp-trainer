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
