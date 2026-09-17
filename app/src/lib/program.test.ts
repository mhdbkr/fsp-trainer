import { describe, it, expect } from 'vitest';
import { workingDaysUntilExam } from './program';
import type { ProgramConfig } from '@/db/types';

const config: ProgramConfig = { startDate: '2026-09-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, strategy: 'teil-first' } as ProgramConfig;

describe('workingDaysUntilExam', () => {
  it('jeudi 17/09/2026 → examen 30/09/2026, jours ouvrés (semaine) uniquement = 9', () => {
    const now = new Date(2026, 8, 17);
    expect(workingDaysUntilExam('2026-09-30', now, config)).toBe(9);
  });
  it('examen = demain (jour ouvré) → 1', () => {
    const now = new Date(2026, 8, 17); // jeudi
    expect(workingDaysUntilExam('2026-09-18', now, config)).toBe(1);
  });
  it('examen = aujourd\'hui → 0 (déjà passé)', () => {
    const now = new Date(2026, 8, 17);
    expect(workingDaysUntilExam('2026-09-17', now, config)).toBe(0);
  });
  it('sans config → défaut (weekend off)', () => {
    const now = new Date(2026, 8, 17);
    expect(workingDaysUntilExam('2026-09-30', now)).toBe(9);
  });
});
