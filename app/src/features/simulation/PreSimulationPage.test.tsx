import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => nav.navigate };
});
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));
import { db } from '@/db/db';
import type { Case } from '@/db/types';
import { useUi } from '@/store/ui';
import { PreSimulationPage } from './PreSimulationPage';

// ============================================================================
// La pré-simulation série 4 (simulation-run.md §10.1, ADR-0021 déc. 1, 8, 9).
//   · aucun choix de Teil (le `ModeChooser` disparaît), un seul bouton « Démarrer » ;
//   · ordre opposable : cas + cadran → « Avec qui tu joues » → niveau d'assistance → Muster ;
//   · la couche se fond dans le niveau d'assistance : plus de mot « Couche » ;
//   · le Muster : guidé ou libre ;
//   · `?teil=` (anciens liens) est lu comme `?depart=`.
// ============================================================================

const fall = {
  id: 'c1', name: 'Ulcus', pathology: 'x', specialty: 'Gastro',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], kommunikativeSituationIds: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'Herr A', age: 50 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: { verdachtsdiagnose: 'Ulcus ventriculi' },
} as unknown as Case;

const ouvre = (qs = '') => render(
  <MemoryRouter initialEntries={[`/simulation/c1/pre${qs}`]}>
    <Routes><Route path="/simulation/:caseId/pre" element={<PreSimulationPage />} /></Routes>
  </MemoryRouter>,
);

beforeEach(async () => {
  vi.clearAllMocks(); localStorage.clear();
  await db.cases.clear(); await db.simulations.clear(); await db.case_progress.clear();
  await db.cases.put(fall);
});
afterEach(() => cleanup());

const pret = async () => { await screen.findByRole('heading', { level: 1, name: 'Ulcus' }); };
const avant = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Pré-simulation série 4 — une entrée, le cas entier', () => {
  it('aucun choix de Teil, un seul départ « Démarrer »', async () => {
    ouvre();
    await pret();
    expect(screen.queryByLabelText('Quelle partie')).toBeNull();
    expect(screen.queryByText(/Anamnese seule|Simulation complète/)).toBeNull();
    expect(screen.getAllByRole('button', { name: /démarrer/i })).toHaveLength(1);
  });

  it('?teil= (ancien lien) est lu comme ?depart= ; la tâche suit', async () => {
    ouvre('?teil=dokumentation&task=tA');
    await pret();
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?depart=dokumentation&task=tA', { viewTransition: true });
  });

  it('?depart= : le départ part tel quel ; sans départ, l’URL n’en porte aucun', async () => {
    ouvre('?depart=fallvorstellung');
    await pret();
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }));
    expect(nav.navigate).toHaveBeenLastCalledWith('/simulation/c1/run?depart=fallvorstellung', { viewTransition: true });
    cleanup();
    ouvre();
    await pret();
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }));
    expect(nav.navigate).toHaveBeenLastCalledWith('/simulation/c1/run', { viewTransition: true });
  });

  it('ordre opposable : cadran du cas → avec qui tu joues → niveau d’assistance → Muster', async () => {
    ouvre();
    await pret();
    const cadran = await screen.findByRole('button', { name: /^Ulcus/ });
    const partenaire = screen.getByRole('region', { name: 'Avec qui tu joues' });
    const assistance = screen.getByText('Niveau d’assistance');
    const muster = screen.getByText(/^Muster-Bogen/);
    expect(avant(cadran, partenaire)).toBe(true);
    expect(avant(partenaire, assistance)).toBe(true);
    expect(avant(assistance, muster)).toBe(true);
  });

  it('la couche se fond dans le niveau d’assistance : le mot « Couche » n’apparaît plus', async () => {
    const { container } = ouvre();
    await pret();
    await waitFor(() => expect(screen.getByText('Niveau d’assistance')).toBeTruthy());
    expect(container.textContent).not.toMatch(/couche/i);
  });

  it('EXAM_CLAIM — aucune « tournure officielle » (suivi technique, SimulationSetup.tsx:119)', async () => {
    const { container } = ouvre('?depart=dokumentation');
    await pret();
    expect(container.textContent).not.toMatch(/officiel/i);
  });

  it('Muster : deux choix, guidé et libre ; choisir « Libre » règle le Muster', async () => {
    useUi.setState({ muster: 'guide' });
    ouvre();
    await pret();
    const guide = screen.getByRole('button', { name: /Guidé/ });
    const libre = screen.getByRole('button', { name: /Libre/ });
    expect(guide.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText(/Freiburg|Karlsruhe|Reutlingen|Stuttgart/)).toBeNull();
    fireEvent.click(libre);
    expect(useUi.getState().muster).toBe('libre');
    expect(localStorage.getItem('fsp-muster')).toBe('libre');
  });
});
