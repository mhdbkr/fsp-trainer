import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { setPending } from '@/lib/externalAi/targets';
import { PendingExternalSimCard } from './PendingExternalSimCard';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  return {
    syncQueue: {
      push: vi.fn(async (i: { type: string; subject_id: string | null; payload: unknown }) => {
        const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...i } as never;
        await db.progress_events.put(ev);
        return ev;
      }),
    },
  };
});
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const c = {
  id: 'c1', name: 'Ulcus', pathology: 'x', specialty: 'X',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: {},
} as never;

describe('PendingExternalSimCard', () => {
  beforeEach(async () => {
    await db.meta.clear();
    await db.simulations.clear();
    await db.cases.clear();
    await db.cases.put(c);
  });

  it('absente sans trace ; présente avec trace ; « Ce n\'était pas une simulation » efface', async () => {
    const { rerender } = render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(screen.queryByText(/tu as simulé/i)).toBeNull();
    await setPending({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    rerender(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /pas une simulation/i }));
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });

  it('« Évaluer » → PartEvaluation → enregistre une simulation external-ai et efface la trace', async () => {
    await setPending({ caseId: 'c1', targetId: 'claude', scope: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /enregistrer|valider/i }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.mode).toBe('external-ai');
    expect(sim.externalTarget).toBe('claude');
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });
});
