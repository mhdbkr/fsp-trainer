// C6-A « des chiffres honnêtes » — ce que l'écran Stats dit, lu dans le DOM RENDU.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, PartResult, ProgramConfig, Simulation } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { StatsPage } from './StatsPage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
let container: HTMLDivElement; let root: Root;

const part = (score: number): PartResult => ({ done: true, durationSec: 600, contentPct: score, feeling: score, checklist: [] } as unknown as PartResult);
const sim = (id: string, parts: Simulation['parts'], over: Partial<Simulation> = {}): Simulation =>
  ({ id, caseId: 'c1', date: new Date(2026, 9, 1, 10).getTime(), parts, notes: {}, prioritizedCorrections: [], ...over } as unknown as Simulation);

async function monte(): Promise<void> {
  await act(async () => { root.render(<MemoryRouter><StatsPage /></MemoryRouter>); });
  await vi.waitFor(() => expect(container.querySelector('[aria-label^="Indice de préparation"]')).not.toBeNull(), { timeout: 3000 });
}

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 2, 8, 0));
  await Promise.all([db.cases.clear(), db.meta.clear(), db.training_events.clear(), db.case_progress.clear(), db.simulations.clear(), db.fachbegriffe.clear()]);
  await db.cases.put({ id: 'c1', name: 'Cas', pathology: 'p', specialty: 'Kardiologie', frequency: 10, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);
  await db.meta.put({ key: 'program', value: { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig });
  await db.training_events.put({ id: 'x', at: new Date(2026, 9, 1, 10).getTime(), kind: 'fiche', caseId: 'c1', teile: [], source: 'libre', spentMin: 10 });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('BUG-C6-1 — les démos ne sont pas les données du candidat', () => {
  it('une seule vraie partie : « 0 simulations complètes · 1 par partie », et la courbe n\'a qu\'un point', async () => {
    await db.simulations.bulkPut([
      sim('sim-demo-1', { anamnese: part(80), dokumentation: part(80), fallvorstellung: part(80) }),
      sim('sim-demo-2', { anamnese: part(80), dokumentation: part(80), fallvorstellung: part(80) }),
      sim('sim-demo-3', { anamnese: part(80), fallvorstellung: part(80) }),
      sim('vraie', { anamnese: part(40) }, { scope: 'teil', teil: 'anamnese' }),
    ]);
    await monte();
    expect(container.textContent).toMatch(/0 simulations complètes · 1 par partie/);
  });

  it('sans aucune vraie partie : la courbe dit comment elle naîtra', async () => {
    await db.simulations.put(sim('sim-demo-1', { anamnese: part(80) }));
    await monte();
    expect(container.textContent).toContain('Ta première partie dessinera ta courbe.');
    expect(container.textContent).toMatch(/0 simulations complètes · 0 par partie/);
  });
});

describe('Fachbegriffe — jamais « point faible » par absence', () => {
  const carte = (i: number, over: object): never => ({ id: `fb${i}`, term: `t${i}`, specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], translationSimple: 'x', srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu', ...over } }) as never;

  it('4 cartes vues sur 100 : aucune alerte, et la barre dit combien de cartes manquent', async () => {
    await db.fachbegriffe.bulkPut(Array.from({ length: 100 }, (_, i) => carte(i, i < 4 ? { state: 'Zu wiederholen', repetitions: 0, lapses: 1 } : {})));
    await monte();
    expect(container.textContent).not.toMatch(/Point faible détecté/);
    expect(container.textContent).toContain('Fachbegriffe · 4/20 cartes vues');
  });

  it('20 cartes vues, toutes ratées : le point faible est nommé, sur la performance', async () => {
    await db.fachbegriffe.bulkPut(Array.from({ length: 100 }, (_, i) => carte(i, i < 20 ? { state: 'Zu wiederholen', repetitions: 0, lapses: 1 } : {})));
    await monte();
    expect(container.textContent).toMatch(/Point faible détecté : Fachbegriffe \(0%\)/);
  });
});

describe('Trajectoire — une phrase dit ce que l\'indice mesure', () => {
  it('sous la frise, en mots du candidat : ni « couche » ni « budget »', async () => {
    await monte();
    const frise = container.querySelector('[aria-label^="Indice de préparation"]')!.closest('section')!;
    const phrase = frise.nextElementSibling as HTMLElement;
    expect(phrase.tagName).toBe('P');
    expect(phrase.textContent).toBe('Ce chiffre mesure la part de toutes les parties de tous les cas que tu maîtrises déjà — pas la moyenne de tes scores : une partie jamais jouée compte pour zéro.');
    expect(container.textContent).not.toMatch(/couche|budget/i);
  });
});

describe('premier lancement — Stats vide', () => {
  it('rien dans le journal et aucune démo : « Ta première partie dessinera ta courbe. »', async () => {
    await db.training_events.clear();
    await act(async () => { root.render(<MemoryRouter><StatsPage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toContain('Ta première partie dessinera ta courbe.'), { timeout: 3000 });
    expect(container.textContent).not.toMatch(/simulations complètes/);
  });
});

describe('Radar — pas de creux pour un axe non mesuré', () => {
  it('une seule partie jouée : pas de polygone, une phrase', async () => {
    await db.simulations.put(sim('vraie', { anamnese: part(40) }, { scope: 'teil', teil: 'anamnese' }));
    await monte();
    expect(container.textContent).toContain('Le profil se dessine dès que 3 axes sont mesurés.');
    expect(container.querySelector('.recharts-radar')).toBeNull();
  });
});
