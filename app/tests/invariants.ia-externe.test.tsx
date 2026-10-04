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

// 30 s par défaut ; les tests de PROPRIÉTÉ (boucles de tirages) déclarent leur propre délai, plus long.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

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

/**
 * L'accueil monte la carte. PRÉSENCE : on l'attend (`findByText`, 8 s) — jamais un délai fixe, la carte passe par
 * un `useLiveQuery` puis `db.cases.get`. ABSENCE : un rendu vide ne prouve rien tant que la requête n'a pas
 * répondu ; le signal d'achèvement est l'appel de `db.simulations.where('caseId')` — la garde elle-même — suivi
 * d'une lecture de la même table et d'un vidage des tâches en attente de React. Si la trace n'était pas lue, `where`
 * ne serait jamais appelé : le test ÉCHOUE au lieu de conclure « absente » à vide.
 */
async function carteVisible(): Promise<boolean> {
  render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
  try { await screen.findByText(/tu as simulé/i, {}, { timeout: 8000 }); return true; } catch { return false; }
}
async function carteAbsente(): Promise<boolean> {
  const garde = vi.spyOn(db.simulations, 'where');
  try {
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    await waitFor(() => expect(garde, 'la requête de la carte n’a jamais atteint sa garde').toHaveBeenCalled(), { timeout: 8000 });
    await db.simulations.toArray();                                         // les lectures déjà lancées sont terminées
    await act(async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0)); });   // setTimeout reste réel : seul Date est simulé
    return !screen.queryByText(/tu as simulé/i);
  } finally { garde.mockRestore(); }
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
      expect(await carteAbsente(), `la carte « tu as simulé… » est revenue (${c.id}, ancre ${ancre}, parties ${teile.join('+')})`).toBe(true);
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
    expect(await carteVisible()).toBe(true);
  });

  it('témoin 2 — une partie du même cas jouée AVANT le lanceur ne masque pas la séance externe', async () => {
    await jouerDansLApp(FULL[0], ['anamnese']);
    avance(60 * 60_000);
    await ouvrirLeLanceur(FULL[0].id, 'anamnese');
    avance(10 * 60_000);
    expect(await carteVisible()).toBe(true);
  });

  it('témoin 3 — une partie jouée dans l’app sur UN AUTRE cas ne masque pas la séance externe', async () => {
    await ouvrirLeLanceur(FULL[0].id, 'anamnese');
    avance(10 * 60_000);
    await jouerDansLApp(FULL[1], ['anamnese']);
    expect(await carteVisible()).toBe(true);
  });

  // Corrigé sur main (0560198d) : la carte d'un Teil T ne se tait que pour une partie jouée dans
  // l'app qui COUVRE T. Trouvé par C6 ; ce test était un `it.fails`, il garde maintenant le correctif.
  it('une partie jouée dans l’app sur un AUTRE Teil ne masque pas la séance externe non évaluée', async () => {
    await ouvrirLeLanceur(FULL[0].id, 'anamnese');
    avance(10 * 60_000);
    await jouerDansLApp(FULL[0], ['dokumentation']);
    expect(await carteVisible(), 'la séance externe d’anamnèse a disparu sans avoir été évaluée').toBe(true);
  });
});
