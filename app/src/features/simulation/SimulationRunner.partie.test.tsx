import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));
import { db } from '@/db/db';
import { seedCases } from '@/data/seedCases';
import { SimulationRunner } from './SimulationRunner';

// ============================================================================
// Le runner série 4, PAR LE DOM (simulation-run.md §10.1–10.3, ADR-0021 déc. 2).
//   · `?teil=` (ancien lien) est un DÉPART : la partie porte les trois Teile (INV-70) ;
//   · le fil d'étapes permet de commencer par un autre Teil (`springeZu`, INV-72) ;
//   · chaque bilan a deux sorties : « Continuer » et « Terminer ici », une fois chacune (INV-71) ;
//   · plus de mot « Couche » à l'écran (décision (d)).
// ============================================================================

configure({ asyncUtilTimeout: 10_000 });   // le runner complet est lourd : 1 s ne suffit pas sous charge
vi.setConfig({ testTimeout: 30_000 });

const fall = seedCases()[0];

beforeAll(() => {
  // jsdom n'a ni ResizeObserver ni Web Animations : l'en-tête collant les emploie.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
  Element.prototype.animate ??= (() => ({ cancel() {}, finished: Promise.resolve() })) as never;
});
beforeEach(async () => {
  localStorage.clear();
  await Promise.all([db.meta.clear(), db.simulations.clear(), db.cases.clear(), db.training_events.clear()]);
  await db.cases.put(fall);
});
afterEach(() => cleanup());

const ouvre = (qs = '') => render(
  <MemoryRouter initialEntries={[`/simulation/${fall.id}/run${qs}`]}>
    <Routes><Route path="/simulation/:caseId/run" element={<SimulationRunner />} /></Routes>
  </MemoryRouter>,
);
const actif = () => document.querySelector('[aria-current="step"]')?.textContent ?? '';
const pret = () => screen.findByRole('button', { name: /Terminer la partie/ }, { timeout: 8000 });

describe('Runner série 4 — la partie, le cas entier', () => {
  it('?teil=dokumentation (ancien lien) : départ sur la Dokumentation, les trois Teile au fil d’étapes, pas de « Couche »', async () => {
    const { container } = ouvre('?teil=dokumentation');
    await pret();
    expect(actif()).toMatch(/Dokumentation/);
    for (const t of ['Anamnese', 'Dokumentation', 'Fallvorstellung']) expect(container.textContent).toContain(t);
    expect(container.textContent).not.toMatch(/couche/i);
  });

  it('fil d’étapes : avant tout Teil terminé, on peut commencer par un autre Teil', async () => {
    ouvre();
    await pret();
    expect(actif()).toMatch(/Anamnese/);
    expect(screen.queryByRole('button', { name: /Commencer par la Anamnese/ })).toBeNull();   // pas vers le Teil courant
    fireEvent.click(screen.getByRole('button', { name: /Commencer par la Fallvorstellung/ }));
    await waitFor(() => expect(actif()).toMatch(/Fallvorstellung/));
  });

  it('bilan : « Continuer » et « Terminer ici », une fois chacun ; « Terminer ici » mène à la checklist de fin', async () => {
    ouvre();
    await pret();
    act(() => { fireEvent.click(screen.getByRole('button', { name: /Terminer la partie/ })); });
    await screen.findByRole('heading', { name: /Bilan — Anamnese/ });
    expect(screen.getAllByRole('button', { name: /^Continuer — Dokumentation/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Terminer ici/ })).toHaveLength(1);
    // Le fil d'étapes du bilan choisit le Teil suivant (`partieSuivante(t')`) ; plus de « commencer par ».
    expect(screen.getByRole('button', { name: /Continuer par la Fallvorstellung/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Commencer par/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Terminer ici/ }));
    await screen.findByRole('heading', { name: /Fin de la simulation/ });
    const fin = screen.getByRole('heading', { name: /Fin de la simulation/ }).parentElement!.parentElement!;
    expect(within(fin).getByText('Anamnese')).toBeTruthy();
  });

  it('bilan : le fil d’étapes choisit le Teil suivant', async () => {
    ouvre();
    await pret();
    act(() => { fireEvent.click(screen.getByRole('button', { name: /Terminer la partie/ })); });
    await screen.findByRole('heading', { name: /Bilan — Anamnese/ });
    fireEvent.click(screen.getByRole('button', { name: /Continuer par la Fallvorstellung/ }));
    await waitFor(() => expect(actif()).toMatch(/Fallvorstellung/));
    expect(screen.getByRole('button', { name: /Terminer la partie/ })).toBeTruthy();
  });
});
