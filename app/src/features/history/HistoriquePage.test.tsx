// S4-6 — la page Historique en carnet de séances, bloc par bloc (spec 2026-10-04 « 5 · Historique »).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: Object.assign(() => null, { getState: () => ({ user: null, status: 'anonymous' }), subscribe: () => () => {} }),
}));
vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => {
    const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never;
    await db.progress_events.put(ev); return ev;
  }) } };
});

import { db } from '@/db/db';
import type { Case, Fachbegriff, TrainingEvent } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { freshSrs } from '@/lib/srs';
import { HistoriquePage } from './HistoriquePage';

configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000 });
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const MIN = 60_000;
const T0 = new Date(2026, 9, 13, 19, 0).getTime();                    // mardi 13 octobre 2026, 19 h
const ev = (id: string, at: number, o: Partial<TrainingEvent> = {}): TrainingEvent =>
  ({ id, at, kind: 'simulation', teile: ['anamnese'], source: 'libre', spentMin: 20, ...o });
const fb = (id: string, term: string) => ({ id, term, translationSimple: term, specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) }) as unknown as Fachbegriff;

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 14, 9, 0));                             // mercredi matin
  await Promise.all([db.cases.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.favorites.clear(), db.fachbegriffe.clear(), db.personal_terms.clear(), db.termes_cherches.clear(), db.simulations.clear(), db.meta.clear()]);
  await db.cases.bulkPut([
    { id: 'c1', name: 'Leberzirrhose', pathology: 'p', specialty: 'Gastroenterologie', frequency: 20, centers: [], linkedFachbegriffeIds: [] },
    { id: 'c2', name: 'Pankreatitis', pathology: 'p', specialty: 'Gastroenterologie', frequency: 20, centers: [], linkedFachbegriffeIds: [] },
  ] as unknown as Case[]);
  await db.fachbegriffe.bulkPut([fb('fb-asz', 'Aszites'), fb('fb-ikt', 'Ikterus')]);
});
afterEach(() => { cleanup(); resetClock(); });

const rendre = () => render(<MemoryRouter><HistoriquePage /></MemoryRouter>);

describe('Historique — carnet de séances', () => {
  it('vide : un état vide, pas de chiffre', async () => {
    rendre();
    expect(await screen.findByText('Ta première séance ouvrira le carnet.')).toBeTruthy();
    expect(screen.getByText('Cette semaine : pas encore de séance.')).toBeTruthy();
  });

  it('la ligne de semaine, une seule, avec sa tendance', async () => {
    await db.training_events.bulkPut([
      ev('te-a', T0, { caseId: 'c1', scores: { anamnese: 72 } }),
      ev('te-b', T0 - 7 * 24 * 60 * MIN - 60 * MIN, { caseId: 'c1', scores: { anamnese: 30 } }),
      ev('te-c', T0 - 7 * 24 * 60 * MIN, { caseId: 'c2', scores: { anamnese: 30 } }),
    ]);
    rendre();
    const ligne = await screen.findByText('Cette semaine : 1 cas, 1 Teil acquis.');
    expect(ligne.closest('[data-semaine]')!.textContent).toContain('1 cas de moins qu’à ce stade la semaine dernière');
    expect(document.querySelectorAll('[data-semaine]')).toHaveLength(1);
  });

  it('une séance : en-tête, cadrans avant/après, scores et actions — chaque lien une seule fois', async () => {
    await db.training_events.bulkPut([
      ev('te-s1', T0, { caseId: 'c1', teile: ['anamnese', 'fallvorstellung'], scores: { anamnese: 72, fallvorstellung: 41 }, spentMin: 40 }),
      ev('te-s2', T0 + 45 * MIN, { caseId: 'c2', scores: { anamnese: 88 }, spentMin: 12 }),
      ev('d1', T0 + 70 * MIN, { kind: 'drill', teile: [], spentMin: 8 }),
    ]);
    rendre();
    const seance = (await screen.findByRole('heading', { name: 'Mardi 13 oct. · soirée' })).closest('article')!;
    expect(seance.textContent).toContain('60 min · 2 cas · 1 drill');
    const ligne = within(seance).getByText('Leberzirrhose').closest('li')!;
    const cadrans = ligne.querySelectorAll('.case-dial');
    expect([...cadrans].map((c) => c.getAttribute('data-size'))).toEqual(['36', '36']);
    expect(cadrans[0].getAttribute('aria-label')).toMatch(/avant la séance/);
    expect(cadrans[1].getAttribute('aria-label')).toMatch(/après la séance/);
    // Le cas n'avait jamais été joué : le cadran d'avant ne porte aucun score, celui d'après porte le 72 de la séance.
    expect(cadrans[0].getAttribute('aria-label')).not.toMatch(/72/);
    expect(cadrans[1].getAttribute('aria-label')).toMatch(/72/);
    expect(ligne.textContent).toMatch(/Anamnese\s*72/);
    expect(within(ligne).getByRole('link', { name: 'Rejouer la Fallvorstellung' }).getAttribute('href')).toBe('/simulation/c1/pre?depart=fallvorstellung');
    // Pankreatitis à 88 : rien à rejouer, aucune action inventée.
    expect(within(within(seance).getByText('Pankreatitis').closest('li')!).queryByRole('link', { name: /Rejouer/ })).toBeNull();
    const hrefs = [...seance.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    // Chaque exercice du journal est dans la page, une seule fois.
    const ids = [...document.querySelectorAll('[data-te]')].flatMap((n) => n.getAttribute('data-te')!.split(' '));
    expect(ids.sort()).toEqual(['d1', 'te-s1', 'te-s2']);
  });

  it('« Revoir mes N oublis » mène au bilan de la partie', async () => {
    const partie = (id: string, caseId: string, at: number, manque: string[]) => ev(id, at, { caseId, scores: { anamnese: 70 }, manques: { anamnese: manque } });
    await db.training_events.bulkPut([
      partie('te-a', 'c2', T0 - 5 * 24 * 60 * MIN, ['allergien', 'noxen']),
      partie('te-b', 'c1', T0 - 4 * 24 * 60 * MIN, ['allergien', 'noxen']),
      partie('te-c', 'c2', T0 - 3 * 24 * 60 * MIN, ['allergien', 'noxen']),
      partie('te-s', 'c1', T0, ['allergien', 'noxen']),
    ]);
    rendre();
    const lien = await screen.findByRole('link', { name: 'Revoir mes 2 oublis' });
    expect(lien.getAttribute('href')).toBe('/simulation/c1/run?sim=s');
  });

  it('« Pendant cette séance » : ★ des favoris posés, mot cherché 2 fois envoyé au drill d’un toucher', async () => {
    await db.training_events.put(ev('te-s', T0, { caseId: 'c1', spentMin: 52 }));
    await db.favorites.put({ termId: 'fb-asz', since: new Date(T0 + 10 * MIN).toISOString() });
    await db.termes_cherches.bulkAdd([{ at: T0 + 5 * MIN, terme: 'Ikterus' }, { at: T0 + 30 * MIN, terme: 'ikterus' }, { at: T0 + 31 * MIN, terme: 'Aszites' }]);
    rendre();
    const bloc = (await screen.findByText('Pendant cette séance')).closest('section')!;
    expect(within(bloc).getByText('Aszites').closest('[data-favori]')).toBeTruthy();
    const envoyer = within(bloc).getByRole('button', { name: 'Envoyer Ikterus au drill' });
    expect(envoyer.textContent).toMatch(/Ikterus.*cherché 2 fois/);
    fireEvent.click(envoyer);
    await waitFor(async () => expect((await db.progress_events.toArray()).map((e) => [e.type, e.subject_id])).toEqual([['term.favorited', 'fb-ikt']]));
    await waitFor(() => expect(within(bloc).queryByRole('button', { name: 'Envoyer Ikterus au drill' })).toBeNull());
    expect(within(bloc).getByText('Ikterus').closest('[data-favori]')).toBeTruthy();
  });

  it('sans favori ni mot cherché deux fois, le bloc n’existe pas ; aucun texte de conception', async () => {
    await db.training_events.put(ev('te-s', T0, { caseId: 'c1', spentMin: 52 }));
    await db.termes_cherches.add({ at: T0 + 5 * MIN, terme: 'Ikterus' });
    rendre();
    await screen.findByText('Leberzirrhose');
    expect(screen.queryByText('Pendant cette séance')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Chaque chiffre|un toucher|mène à une action|cadrans avant/i);
  });

  it('les séances vont de la plus récente à la plus ancienne', async () => {
    await db.training_events.bulkPut([ev('te-x', T0 - 24 * 60 * MIN, { caseId: 'c2' }), ev('te-y', T0, { caseId: 'c1' })]);
    rendre();
    await screen.findByText('Leberzirrhose');
    expect([...document.querySelectorAll('article h2')].map((h) => h.textContent)).toEqual(['Mardi 13 oct. · soirée', 'Lundi 12 oct. · soirée']);
  });
});
