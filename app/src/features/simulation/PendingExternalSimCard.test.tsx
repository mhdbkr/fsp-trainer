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
    await db.progress_events.clear();
    await db.cases.clear();
    await db.cases.put(c);
    sessionStorage.clear();
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
    // I1 — scope "anamnese" côté trace → sim.scope 'teil'/sim.teil 'anamnese'
    // (pas 'full' : cette simulation ne couvre que l'anamnèse).
    expect(sim.scope).toBe('teil');
    expect(sim.teil).toBe('anamnese');
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });

  it('scope "exam" : anamnese → fallvorstellung → une seule simulation avec les deux parties', async () => {
    await setPending({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /valider/i })); // anamnese
    fireEvent.click(await screen.findByRole('button', { name: /valider/i })); // fallvorstellung
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.mode).toBe('external-ai');
    expect(Object.keys(sim.parts).sort()).toEqual(['anamnese', 'fallvorstellung']);
    // I1 — scope "exam" (pas "anamnese" seule) → sim.scope 'full', pas de teil.
    expect(sim.scope).toBe('full');
    expect(sim.teil).toBeUndefined();
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });

  it('double clic sur « Valider » : une seule simulation et un seul événement simulation.completed', async () => {
    await setPending({ caseId: 'c1', targetId: 'claude', scope: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    const validate = await screen.findByRole('button', { name: /valider/i });
    fireEvent.click(validate);
    fireEvent.click(validate); // double-tap avant que l'évaluation ne se démonte
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    expect(await db.simulations.count()).toBe(1);
    const completed = (await db.progress_events.toArray()).filter((e) => e.type === 'simulation.completed');
    expect(completed.length).toBe(1);
  });

  it('« Pas maintenant » : ferme la carte sans effacer la trace', async () => {
    await setPending({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /pas maintenant/i }));
    await waitFor(() => expect(screen.queryByText(/tu as simulé/i)).toBeNull());
    expect((await db.meta.get('externalAi.pending'))?.value ?? null).not.toBeNull();
  });
});
