// C6 — BUG RÉEL DU 3 OCTOBRE (FB3), passé de correctif à invariant :
//
//   Une partie jouée ET évaluée dans l'app n'est jamais redemandée en
//   évaluation à l'accueil (carte « Tu as simulé … avec Gemini »), même si le
//   lanceur IA a été ouvert pendant la partie.
//
// Le scénario est joué en entier, avec les VRAIS composants et la VRAIE chaîne :
// lanceur IA (TeilAiLauncher) → partie locale (automate + speichern + journal)
// → carte de retour (PendingExternalSimCard, montée à l'accueil). Seules les
// frontières réseau sont coupées. Les témoins (contrôles) prouvent que la carte
// SAIT apparaître : « absente » ne vaut que si « présente » est possible.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());

import { db } from '@/db/db';
import { seedCases } from '@/data/seedCases';
import { checklistFor } from '@/lib/checklists';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import { speichern } from '@/lib/lauf/speichern';
import { readPending } from '@/lib/externalAi/targets';
import { TeilAiLauncher } from '@/features/simulation/ai/TeilAiLauncher';
import { PendingExternalSimCard } from '@/features/simulation/PendingExternalSimCard';
import type { Case, SimTeil } from '@/db/types';
import { forAll, type Rng } from './helpers/prop';
import { partResult, resetWorld } from './helpers/world';

const FULL: Case[] = seedCases().slice(0, 12);   // fiches COMPLÈTES : le prompt externe en a besoin
const T0 = Date.parse('2026-10-03T10:00:00');
const MODELLE = () => [...checklistFor('anamnese'), ...checklistFor('dokumentation'), ...checklistFor('fallvorstellung')];

beforeEach(async () => {
  await resetWorld({ cases: FULL });
  vi.useFakeTimers({ toFake: ['Date'] });   // Date.now() ET l'horloge de l'app (qui la lit) avancent ensemble
  vi.setSystemTime(T0);
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const avance = (ms: number) => vi.setSystemTime(Date.now() + ms);

/** Le candidat ouvre le lanceur IA de la partie en cours et copie le prompt. */
async function ouvrirLeLanceur(caseId: string, teil: 'anamnese' | 'fallvorstellung') {
  render(<TeilAiLauncher caseId={caseId} teil={teil} />);
  fireEvent.click(screen.getByRole('button', { name: /avec ton ia/i }));
  const copier = await screen.findByRole('button', { name: /^copier$/i });
  await waitFor(() => expect((copier as HTMLButtonElement).disabled).toBe(false));   // le cas est lu, le prompt existe
  fireEvent.click(copier);
  await waitFor(async () => expect(await readPending()).toMatchObject({ caseId, teil }));
  cleanup();
}

/** Une partie locale jouée et évaluée jusqu'à l'enregistrement, par l'automate réel. */
async function jouerDansLApp(c: Case, teile: SimTeil[], entre?: () => Promise<void>) {
  let l = erstelleLauf({ caseId: c.id, caseName: c.name, geplanteTeile: teile, assistance: 'autonome', layer: 2, mode: 'texte' });
  l = transition(l, { typ: 'demarrer', checkliste: MODELLE() });
  await entre?.();                                           // ← le lanceur IA s'ouvre PENDANT la partie
  for (let i = 0; i < teile.length; i++) {
    avance(60_000);
    l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(80) });
    if (i < teile.length - 1) l = transition(l, { typ: 'partieSuivante' });
  }
  l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
  await speichern(l, c);
}

/** L'accueil monte la carte ; on attend que sa requête ait répondu avant de conclure à l'absence. */
async function accueil(): Promise<boolean> {
  render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
  await act(async () => { await new Promise((r) => setTimeout(r, 80)); });   // setTimeout reste réel : seul Date est simulé
  return !!screen.queryByText(/tu as simulé/i);
}

describe('FB3 — une partie jouée et évaluée dans l’app n’est jamais redemandée à l’accueil', () => {
  it('lanceur IA ouvert PENDANT la partie, puis partie finie et enregistrée dans l’app : pas de carte', async () => {
    const vu = { ancre: 0, tard: 0 };
    await forAll(14, async (r: Rng) => {
      await resetWorld({ cases: FULL });
      vi.setSystemTime(T0);
      const c = r.pick(FULL), ancre = r.pick(['anamnese', 'fallvorstellung'] as const);
      const teile: SimTeil[] = r.pick<SimTeil[]>([[ancre], ['anamnese', 'dokumentation', 'fallvorstellung']]);
      avance(r.int(0, 3_600_000));
      await jouerDansLApp(c, teile, async () => { avance(r.int(1000, 600_000)); await ouvrirLeLanceur(c.id, ancre); avance(r.int(0, 2 * 3_600_000)); });
      expect(await db.simulations.count()).toBe(1);
      expect(await accueil(), `la carte « tu as simulé… » est revenue (${c.id}, ancre ${ancre}, parties ${teile.join('+')})`).toBe(false);
      if (teile.length === 1) vu.ancre++; else vu.tard++;
      cleanup();
    });
    expect(vu.ancre + vu.tard).toBe(14);
    expect(vu.ancre).toBeGreaterThan(2);       // les deux formes de partie sont couvertes
    expect(vu.tard).toBeGreaterThan(2);
  }, 120_000);

  it('témoin 1 — lanceur ouvert, RIEN joué dans l’app : la carte apparaît (elle sait apparaître)', async () => {
    await ouvrirLeLanceur(FULL[0].id, 'anamnese');
    avance(30 * 60_000);
    expect(await accueil()).toBe(true);
  });

  it('témoin 2 — une partie du même cas jouée AVANT le lanceur ne masque pas la séance externe', async () => {
    await jouerDansLApp(FULL[0], ['anamnese']);
    avance(60 * 60_000);
    await ouvrirLeLanceur(FULL[0].id, 'anamnese');
    avance(10 * 60_000);
    expect(await accueil()).toBe(true);
  });

  it('témoin 3 — une partie jouée dans l’app sur UN AUTRE cas ne masque pas la séance externe', async () => {
    await ouvrirLeLanceur(FULL[0].id, 'anamnese');
    avance(10 * 60_000);
    await jouerDansLApp(FULL[1], ['anamnese']);
    expect(await accueil()).toBe(true);
  });
});
