import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act, cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));
import { db } from '@/db/db';
import { seedCases } from '@/data/seedCases';
import { seedAufklaerungen } from '@/data/seedAufklaerungen';
import { SimulationRunner } from './SimulationRunner';
import { LAUF_AKTIV_KEY, verwerfeAktivenLauf } from '@/lib/lauf/speichern';

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
  // Isolation EXPLICITE : le runner du test précédent persiste `lauf.aktiv` par la file d'écriture de `speichern.ts`
  // (`enfile`). Un `db.meta.clear()` lancé à côté de cette file peut passer AVANT une écriture encore en attente : le
  // Lauf du test précédent (resté en checkliste) renaît, et ce runner le REPREND (même cas) au lieu d'en créer un —
  // c'était l'échec « pret() expire » vu en passant `D_UN_TRAIT_ACTIF` à true (simple décalage de timing ; reproduit
  // avec la garde à false et 300 ms d'attente). On vide d'abord la file, puis on efface.
  await verwerfeAktivenLauf();
  localStorage.clear();
  await Promise.all([db.meta.clear(), db.simulations.clear(), db.cases.clear(), db.training_events.clear(), db.aufklaerungen.clear()]);
  await db.cases.put(fall);
  await db.aufklaerungen.bulkPut(seedAufklaerungen());
  expect(await db.meta.get(LAUF_AKTIV_KEY), 'un Lauf du test précédent a survécu au nettoyage').toBeUndefined();
});
afterEach(() => cleanup());

const ouvre = (qs = '') => render(
  <MemoryRouter initialEntries={[`/simulation/${fall.id}/run${qs}`]}>
    <Routes><Route path="/simulation/:caseId/run" element={<SimulationRunner />} /></Routes>
  </MemoryRouter>,
);
const actif = () => document.querySelector('[aria-current="step"]')?.textContent ?? '';
// Fixeur I4 : pendant un Teil, la sortie dit CE Teil (« Finir l'Anamnese ✓ ») ; « partie » désigne le tout.
const pret = () => screen.findByRole('button', { name: /^Finir / }, { timeout: 20_000 });   // le runner complet, sous charge
const finir = () => act(() => { fireEvent.click(screen.getByRole('button', { name: /^Finir / })); });

describe('Runner série 4 — la partie, le cas entier', () => {
  it('?teil=dokumentation (ancien lien) : départ sur la Dokumentation, les trois Teile au fil d’étapes, pas de « Couche »', async () => {
    const { container } = ouvre('?teil=dokumentation');
    await pret();
    expect(actif()).toMatch(/Dokumentation/);
    for (const t of ['Anamnese', 'Dokumentation', 'Fallvorstellung']) expect(container.textContent).toContain(t);
    expect(container.textContent).not.toMatch(/couche/i);
  });

  it('fil d’étapes : tant que le chrono du départ n’est pas lancé, on peut commencer par un autre Teil (I11, I5)', async () => {
    ouvre();
    await pret();
    expect(actif()).toMatch(/Anamnese/);
    expect(screen.getByRole('button', { name: /Finir l'Anamnese ✓/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Commencer par l'Anamnese/ })).toBeNull();   // pas vers le Teil courant
    fireEvent.click(screen.getByRole('button', { name: /Commencer par la Fallvorstellung/ }));
    await waitFor(() => expect(actif()).toMatch(/Fallvorstellung/));
  });

  it('I11 : une fois « Lancer le chrono », la pastille ne quitte plus le Teil en cours', async () => {
    ouvre();
    await pret();
    fireEvent.click(screen.getByRole('button', { name: /Lancer le chrono/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Commencer par/ })).toBeNull(), { timeout: 4000 });
  });

  it('mécanique I1 : l’Aufklärung ouvre sa fiche SANS quitter le runner (nouvel onglet)', async () => {
    ouvre();
    await pret();
    fireEvent.click(screen.getByRole('button', { name: /Aufklärung/ }));
    const liens = await screen.findAllByRole('link', { name: /Ouvrir la trame|Gastroskopie|Koloskopie|ERCP|.+/ });
    const versAufk = liens.filter((a) => (a.getAttribute('href') ?? '').includes('/aufklaerung?open='));
    expect(versAufk.length).toBeGreaterThan(0);
    for (const a of versAufk) {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noreferrer');
    }
  });

  it('bilan : « Continuer » et « Terminer ici », une fois chacun ; « Terminer ici » mène à la checklist de fin', async () => {
    ouvre();
    await pret();
    finir();
    await screen.findByRole('heading', { name: /Bilan — Anamnese/ });
    expect(screen.getAllByRole('button', { name: /^Continuer — Dokumentation/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Terminer ici/ })).toHaveLength(1);
    // I7 : un seul bouton principal au bilan tant qu'il reste un Teil.
    expect(screen.getByRole('button', { name: /Terminer ici/ }).className).toMatch(/btn-outline/);
    expect(screen.getByText(/Score de l'Anamnese/)).toBeTruthy();
    // Le fil d'étapes du bilan choisit un AUTRE Teil restant (`partieSuivante(t')`) ; pas celui de « Continuer — X » (M6).
    expect(screen.getByRole('button', { name: /Continuer par la Fallvorstellung/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Continuer par la Dokumentation/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Commencer par/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Terminer ici/ }));
    await screen.findByRole('heading', { name: /Fin de la simulation/ });
    const fin = screen.getByRole('heading', { name: /Fin de la simulation/ }).parentElement!.parentElement!;
    expect(within(fin).getByText('Anamnese')).toBeTruthy();
  });

  it('bilan : le fil d’étapes choisit le Teil suivant', async () => {
    ouvre();
    await pret();
    finir();
    await screen.findByRole('heading', { name: /Bilan — Anamnese/ });
    fireEvent.click(screen.getByRole('button', { name: /Continuer par la Fallvorstellung/ }));
    await waitFor(() => expect(actif()).toMatch(/Fallvorstellung/));
    expect(screen.getByRole('button', { name: /Finir la Fallvorstellung ✓/ })).toBeTruthy();
  });
});
