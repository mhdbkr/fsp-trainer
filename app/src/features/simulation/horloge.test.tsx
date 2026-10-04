// C6-B point 5 — UNE horloge. La garde du 3 octobre de PendingExternalSimCard
// compare `sim.date` (écrit par `saveSimulation`, donc par `lib/clock`) à
// `trace.at` (posé par le lanceur) : si l'un lit `lib/clock` et l'autre
// `Date.now()`, le jour où l'horloge est injectée (parcours C6, tests) elles
// divergent en silence. Ces tests avancent l'horloge injectée, jamais la vraie.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freezeAt, resetClock, now } from '@/lib/clock';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import { bereinigeAltenLauf, restauriere, speichereAktivenLauf, LAUF_MAX_ALTER_MS } from '@/lib/lauf/speichern';
import { setPending, readPending } from '@/lib/externalAi/targets';
import { TeilAiLauncher } from './ai/TeilAiLauncher';
import { PendingExternalSimCard } from './PendingExternalSimCard';

vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const H = 3600_000;
const FUTUR = '2099-01-01T08:00:00Z';     // loin DEVANT la vraie horloge : une lecture de `Date.now()` se voit
const PASSE = '2025-03-03T10:00:00Z';     // loin DERRIÈRE

const c = {
  id: 'c1', name: 'Ulcus', pathology: 'x', specialty: 'X', linkedFachbegriffeIds: [], probableAufklaerungIds: [],
  caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1, geschlecht: 'm' }, leitsymptome: ['x'], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [], vorerkrankungen: [], voroperationen: [], medikamente: [], allergien: [], noxen: {}, familienanamnese: [], sozialanamnese: [] },
  medicalView: { verdachtsdiagnose: 'x', differenzialdiagnosen: [], diagnostik: [], therapie: [] },
  examinerSheet: [], examinerQuestions: [],
} as never;

beforeEach(async () => {
  await Promise.all([db.meta.clear(), db.simulations.clear(), db.cases.clear(), db.progress_events.clear()]);
  await db.cases.put(c);
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { cleanup(); resetClock(); });

const neuer = () => erstelleLauf({ caseId: 'c1', caseName: 'Ulcus', profileId: 'u', geplanteTeile: ['anamnese'], modus: 'teil', assistance: 'autonome', layer: 1 });

describe('lib/lauf — startedAt / endedAt lisent lib/clock', () => {
  it('un Lauf créé puis enregistré porte les instants de l\'horloge injectée', () => {
    const advance = freezeAt(FUTUR);
    let l = neuer();
    expect(l.startedAt).toBe(now());
    l = transition(l, { typ: 'demarrer', checkliste: [] });
    l = transition(l, { typ: 'terminerPartie', ergebnis: { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 50, officialPct: 50 } });
    l = transition(l, { typ: 'versChecklist' });
    const t0 = now();
    advance(90 * 60_000);
    const fin = transition(l, { typ: 'speichern' });
    expect(fin.endedAt).toBe(t0 + 90 * 60_000);
    expect(fin.endedAt! - fin.startedAt).toBe(90 * 60_000);
  });
  it('la reprise d\'un Lauf sans startedAt prend l\'horloge injectée', () => {
    freezeAt(FUTUR);
    expect(restauriere({ id: 'x', caseId: 'c1' }).startedAt).toBe(now());
  });
  it('un Lauf ouvert est abandonné après 24 h de l\'horloge injectée, pas avant', async () => {
    const advance = freezeAt(FUTUR);
    await speichereAktivenLauf(neuer());
    advance(LAUF_MAX_ALTER_MS - 1);
    expect(await bereinigeAltenLauf()).not.toBeNull();
    advance(2);
    expect(await bereinigeAltenLauf()).toBeNull();
  });
});

describe('la garde « trace ↔ simulation » : même horloge des deux côtés', () => {
  const carte = () => render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
  const couvrante = (date: number) => db.simulations.put({ id: `s${date}`, caseId: 'c1', date, parts: { anamnese: { done: true } } } as never);

  it('le lanceur pose `at` = l\'horloge injectée', async () => {
    freezeAt(PASSE);
    render(<TeilAiLauncher caseId="c1" teil="anamnese" />);
    fireEvent.click(screen.getByRole('button', { name: /avec ton ia/i }));
    fireEvent.click(await screen.findByRole('button', { name: /^copier$/i }));
    await waitFor(async () => expect((await readPending())?.at).toBe(now()));
  });

  it('une trace vieille de 1 h (horloge injectée) s\'affiche ; de 13 h, elle expire', async () => {
    const advance = freezeAt(PASSE);
    await setPending({ caseId: 'c1', targetId: 'gemini', teil: 'anamnese', at: now() - H });
    carte();
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    cleanup();
    advance(12 * H);
    carte();
    await waitFor(() => expect(screen.queryByText(/tu as simulé/i)).toBeNull());
  });

  it('« Pas maintenant » : masquée 1 h de l\'horloge injectée, puis revient', async () => {
    const advance = freezeAt(PASSE);
    await setPending({ caseId: 'c1', targetId: 'gemini', teil: 'anamnese', at: now() });
    carte();
    fireEvent.click(await screen.findByRole('button', { name: /pas maintenant/i }));
    await waitFor(() => expect(screen.queryByText(/tu as simulé/i)).toBeNull());
    cleanup(); advance(30 * 60_000); carte();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/tu as simulé/i)).toBeNull();
    cleanup(); advance(31 * 60_000); carte();
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
  });

  it('une partie jouée dans l\'app APRÈS la trace la rend caduque ; une partie d\'avant, non', async () => {
    const advance = freezeAt(PASSE);
    await setPending({ caseId: 'c1', targetId: 'gemini', teil: 'anamnese', at: now() });
    await couvrante(now() - 1);                     // jouée avant le lancement de l'IA
    carte();
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    cleanup();
    advance(10 * 60_000);
    await couvrante(now());                         // `saveSimulation` date par `now()`
    carte();
    await waitFor(() => expect(screen.queryByText(/tu as simulé/i)).toBeNull());
  });
});
