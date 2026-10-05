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
import type { Simulation, TaskInstance } from '@/db/types';

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
  await db.cases.clear(); await db.simulations.clear(); await db.case_progress.clear(); await db.day_plans.clear();
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
    const cadran = await screen.findByRole('img', { name: /^Ulcus/ });   // fixeur I1 : un signe, pas une commande
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

  // --- Fixeur S4-3 (revue direction) ---------------------------------------------------------------

  it('I1 — le cadran ne s’ouvre pas : au survol, un seul détail dans le DOM', async () => {
    ouvre();
    await pret();
    const cadran = await screen.findByRole('img', { name: /^Ulcus/ });
    fireEvent.pointerOver(cadran); fireEvent.pointerDown(cadran);
    await new Promise((r) => setTimeout(r, 600));
    expect(document.querySelectorAll('.case-dial-detail')).toHaveLength(0);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByText(/Anamnese/).length).toBeGreaterThan(0);   // le détail statique, lui, est là
  });

  it('B2 — la phrase de Fallvorstellung suit le genre du cas (homme)', async () => {
    await db.cases.put({ ...fall, patientSheet: { ...fall.patientSheet, personalia: { name: 'Karl Aupperle', age: 58, geschlecht: 'm' } } } as Case);
    const { container } = ouvre();
    await pret();
    expect(container.textContent).toContain('« Herr Aupperle ist ein 58-jähriger Patient, der sich mit Ulcus ventriculi… vorgestellt hat. »');
    expect(container.textContent).not.toMatch(/ein\/e|Patient\/in|der\/die/);
  });

  it('B2 — la phrase de Fallvorstellung suit le genre du cas (femme)', async () => {
    await db.cases.put({ ...fall, patientSheet: { ...fall.patientSheet, personalia: { name: 'Anna Müller', age: 26, geschlecht: 'w' } } } as Case);
    const { container } = ouvre();
    await pret();
    expect(container.textContent).toContain('« Frau Müller ist eine 26-jährige Patientin, die sich mit Ulcus ventriculi… vorgestellt hat. »');
  });

  it('I3 — sans départ, les textes d’aide parlent de la partie entière', async () => {
    const { container } = ouvre();
    await pret();
    expect(container.textContent).toContain('À poser pendant l\'Anamnese — elles reviennent dans la Dokumentation et la Fallvorstellung.');
    expect(container.textContent).toContain('Chaque Teil a sa trame déroulée : questions écrites, formulations types, chapitres à cocher.');
    expect(container.textContent).toContain('Conditions réelles : tu mènes chaque Teil de mémoire ; l\'aide ne s\'ouvre que si tu la demandes.');
    expect(container.textContent).toContain('Struktur : Allgemein- und Ernährungszustand');
  });

  it('I9 — l’IA est toujours proposée, même en partant de la Dokumentation', async () => {
    ouvre('?depart=dokumentation');
    await pret();
    fireEvent.click(screen.getByRole('button', { name: /ton IA/i }));
    expect(screen.getByText(/prépare le prompt du patient en Anamnese, de l’Oberarzt en Fallvorstellung/)).toBeTruthy();
  });

  it('mineurs — partenaire mémorisé ; « Tu joues les deux rôles. »', async () => {
    ouvre();
    await pret();
    expect(screen.getByText('Tu joues les deux rôles.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /simulant/i }));
    cleanup();
    ouvre();
    await pret();
    expect(screen.getByRole('button', { name: /simulant/i }).getAttribute('aria-pressed')).toBe('true');
  });

  describe('I2 — le niveau d’assistance (décision de main)', () => {
    const carte = (n: RegExp) => screen.getByRole('button', { name: n });
    const sim = (score: number, assistance: 'assiste' | 'autonome'): Simulation => ({
      id: `s-${score}`, caseId: 'c1', date: 1, notes: {}, prioritizedCorrections: [], passed: score >= 60, assistance, layer: 2,
      parts: { anamnese: { done: true, durationSec: 60, checklist: [], feeling: score, contentPct: score, officialPct: score } },
    } as Simulation);

    it('0 passage : le dernier choix du candidat est gardé, sans badge « Conseillé »', async () => {
      useUi.setState({ assistance: 'autonome' });
      const { container } = ouvre();
      await pret();
      await waitFor(() => expect(carte(/Autonome/).getAttribute('aria-pressed')).toBe('true'));
      expect(container.textContent).not.toMatch(/Conseillé/);
    });

    it('un passage raté : Assisté présélectionné, avec sa raison ; la couche écrite suit le niveau', async () => {
      useUi.setState({ assistance: 'autonome', layer: 3 });
      await db.simulations.put(sim(40, 'autonome'));
      ouvre();
      await pret();
      await waitFor(() => expect(carte(/Assisté/).getAttribute('aria-pressed')).toBe('true'));
      expect(screen.getByText('Dernier essai à 40 % : consolide en Assisté.')).toBeTruthy();
      expect(useUi.getState().layer).toBe(1);
      fireEvent.click(carte(/Autonome/));
      expect(useUi.getState().layer).toBe(2);                 // M7 : la couche se déduit du niveau CHOISI
    });

    it('la tâche prescrit (examen à blanc) : Autonome l’emporte, sa raison est dite', async () => {
      useUi.setState({ assistance: 'assiste' });
      const t: TaskInstance = { id: 'tX', date: '2026-10-05', kind: 'examen-blanc', caseId: 'c1', label: 'Ulcus', estMin: 52, source: 'plan', reason: 'Répétition générale : conditions réelles, sans aide.', layer: 3, assistance: 'autonome' };
      await db.day_plans.put({ date: '2026-10-05', materializedAt: 0, mode: 'cas-complet', seed: 1, targetMin: 60, tasks: [t] } as never);
      ouvre('?task=tX');
      await pret();
      await waitFor(() => expect(carte(/Autonome/).getAttribute('aria-pressed')).toBe('true'));
      expect(screen.getByText('Répétition générale : conditions réelles, sans aide.')).toBeTruthy();
      expect(useUi.getState().layer).toBe(3);
    });
  });
});
