// Cause racine de l'échec CI de #85 (m6) : la liste du jour relisait ELLE-MÊME le plan et le journal (`useDayPlan(date)`,
// `useTrainingEvents()`). Tant que ses requêtes ne sont pas revenues, la ligne d'un cas entamé montrait la raison figée
// « jamais travaillé » et l'estimation entière, alors que la page avait déjà tout lu. Ici ces requêtes de la LISTE ne
// reviennent jamais : la page, qui a le plan et le journal, doit quand même dire ce qui reste.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DayPlan, TaskInstance, TrainingEvent } from '@/db/types';

const plan: DayPlan = {
  date: '2026-10-14', targetMin: 120, mode: 'cas-complet', seed: 's', materializedAt: 0,
  tasks: [{ id: 't1', date: '2026-10-14', kind: 'simulation', caseId: 'c1', label: 'Cas c1', teile: ['anamnese', 'dokumentation', 'fallvorstellung'], estMin: 52, source: 'plan', reason: 'Parmi les cas les plus vus à l\'examen, et jamais travaillé.' } as TaskInstance],
} as unknown as DayPlan;
const events: TrainingEvent[] = [{ id: 'e1', at: new Date('2026-10-14T07:30:00').getTime(), kind: 'simulation', caseId: 'c1', teile: ['anamnese'], source: 'libre', spentMin: 20, laufId: 'l1', scores: { anamnese: 50 } }];

vi.mock('./useProgram', () => ({
  // La page lit le plan du jour (sans argument) ; la LISTE le relit avec sa date : cette relecture ne revient jamais.
  useDayPlan: (date?: string) => (date === undefined ? plan : undefined),
  useTrainingEvents: () => undefined,
  useDayPlans: () => [plan],
  useCaseProgress: () => new Map(),
  useProjectedDays: () => new Map(),
}));
vi.mock('@/hooks/useData', () => ({
  useCases: () => [{ id: 'c1', name: 'Cas c1', specialty: 'Kardiologie', frequency: 1, centers: [] }],
  useProgramConfig: () => ({ startDate: '2026-09-01', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 }),
  useAllTerms: () => [], useFavorites: () => [],
}));
vi.mock('@/lib/today', () => ({ useToday: (sel: (s: { day: string }) => unknown) => sel({ day: '2026-10-14' }) }));

import { Aujourdhui } from './ProgramPage';

describe('Aujourd\'hui lit ce qui reste sur le plan et le journal DE LA PAGE (cause racine de l\'échec CI m6)', () => {
  it('la ligne d\'un cas entamé dit ce qui reste, même si la liste n\'a encore rien relu', () => {
    const { container } = render(<MemoryRouter><Aujourdhui date="2026-10-14" plan={plan} events={events} /></MemoryRouter>);
    expect(container.textContent).toMatch(/Il te reste la Dokumentation et la Fallvorstellung/);
    expect(container.textContent).not.toMatch(/jamais travaillé/);
  });
});
