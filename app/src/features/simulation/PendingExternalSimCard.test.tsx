import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { setPending, type PendingExternalSim } from '@/lib/externalAi/targets';
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

// Trace posée avant le Teil d'ancrage (champ `scope`) — lecture tolérante.
const legacy = (v: Record<string, unknown>) => db.meta.put({ key: 'externalAi.pending', value: v });

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
  });

  it('absente sans trace ; présente avec trace ; « Ce n\'était pas une simulation » efface', async () => {
    const { rerender } = render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(screen.queryByText(/tu as simulé/i)).toBeNull();
    await legacy({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    rerender(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /pas une simulation/i }));
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });

  it('« Évaluer » → PartEvaluation → enregistre une simulation external-ai et efface la trace', async () => {
    await setPending({ caseId: 'c1', targetId: 'gemini', teil: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /enregistrer|valider/i }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.mode).toBe('external-ai');
    expect(sim.externalTarget).toBe('gemini');
    // Teil d'ancrage 'anamnese' → sim.scope 'teil' / sim.teil 'anamnese'.
    expect(sim.scope).toBe('teil');
    expect(sim.teil).toBe('anamnese');
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });

  it('chip « 30 min+ » + Teil anamnese → PartResult.durationSec = 1800 (tout à l\'anamnese)', async () => {
    await setPending({ caseId: 'c1', targetId: 'gemini', teil: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    await screen.findByText(/tu as simulé/i);
    fireEvent.click(screen.getByRole('radio', { name: /30 min/i }));
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /valider/i }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.parts.anamnese?.durationSec).toBe(1800);
  });

  it('chip par défaut « 20 min » + ancienne trace scope exam → 2/3 anamnese, 1/3 fallvorstellung (arrondi)', async () => {
    await legacy({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /valider/i })); // anamnese
    fireEvent.click(await screen.findByRole('button', { name: /valider/i })); // fallvorstellung
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.parts.anamnese?.durationSec).toBe(800); // round(1200 * 2/3)
    expect(sim.parts.fallvorstellung?.durationSec).toBe(400); // reste
  });

  it('scope "exam" : anamnese → fallvorstellung → une seule simulation avec les deux parties', async () => {
    await legacy({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
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
    await setPending({ caseId: 'c1', targetId: 'gemini', teil: 'anamnese', at: Date.now() });
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

  it('Teil Fallvorstellung : seule la Fallvorstellung est évaluée, avec toute la durée', async () => {
    await setPending({ caseId: 'c1', targetId: 'chatgpt', teil: 'fallvorstellung', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/la fallvorstellung de/i)).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /valider/i }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(Object.keys(sim.parts)).toEqual(['fallvorstellung']);
    expect(sim.parts.fallvorstellung?.durationSec).toBe(1200);
    expect(sim.scope).toBe('teil');
    expect(sim.teil).toBe('fallvorstellung');
  });

  it('ancienne trace scope « anamnese » (cible retirée) : lue comme Teil Anamnese', async () => {
    await legacy({ caseId: 'c1', targetId: 'claude', scope: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /valider/i }));
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0];
    expect(sim.teil).toBe('anamnese');
    expect(sim.externalTarget).toBe('claude');
  });

  it('dit que la séance est auto-déclarée, sans promettre l\'exclusion de l\'indice (pas encore vraie)', async () => {
    await setPending({ caseId: 'c1', targetId: 'chatgpt', teil: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect((await screen.findByText(/auto-déclarée/i)).textContent).toMatch(/historique et ta série/i);
    expect(screen.queryByText(/indice de préparation/i)).toBeNull();
  });

  it('« Pas maintenant » : ferme la carte sans effacer la trace, pose snoozedUntil ≈ +1 h', async () => {
    await legacy({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /pas maintenant/i }));
    await waitFor(() => expect(screen.queryByText(/tu as simulé/i)).toBeNull());
    const stored = ((await db.meta.get('externalAi.pending'))?.value ?? null) as PendingExternalSim | null;
    expect(stored).not.toBeNull();
    expect(stored?.caseId).toBe('c1'); // les autres champs de la trace sont conservés
    expect(stored?.snoozedUntil).toBeGreaterThan(Date.now());
    expect(stored?.snoozedUntil).toBeLessThanOrEqual(Date.now() + 3600_000 + 1000);
  });

  it('« Pas maintenant » : la carte revient une fois snoozedUntil dépassé (après 1 h)', async () => {
    await legacy({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    const { rerender } = render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /pas maintenant/i }));
    await waitFor(() => expect(screen.queryByText(/tu as simulé/i)).toBeNull());
    // useLiveQuery ne recalcule que sur écriture de la table observée, jamais
    // sur simple écoulement du temps : on simule « 1 h plus tard » en
    // ré-écrivant la trace avec un snoozedUntil déjà dépassé.
    const stored = (await db.meta.get('externalAi.pending'))?.value as PendingExternalSim;
    await setPending({ ...stored, snoozedUntil: Date.now() - 1000 });
    rerender(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
  });
});
