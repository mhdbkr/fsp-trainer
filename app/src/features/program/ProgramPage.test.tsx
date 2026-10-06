// S4-5 — la page Programme refaite : trois questions, dans l'ordre (aujourd'hui, la semaine, jusqu'à l'examen), puis la
// carte de couverture. Le champ spécialités × Teiles a disparu. Lu depuis le DOM rendu.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
vi.setConfig({ testTimeout: 30_000 });
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, CaseProgress, ProgramConfig, SimTeil, TaskInstance, TrainingEvent } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { rebuildJournal } from '@/lib/journal';
import { blankProgress } from '@/lib/progression';
import { ProgramPage } from './ProgramPage';
import { ProgramSetup } from './ProgramSetup';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const JAMAIS = 'Parmi les cas les plus vus à l\'examen, et jamais travaillé.';
const config = { startDate: '2026-09-01', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
const cases = [['k1', 'Kardiologie', 14], ['k2', 'Kardiologie', 10], ['g1', 'Gastroenterologie', 20], ['g2', 'Gastroenterologie', 3], ['n1', 'Neurologie', 4], ['n2', 'Neurologie', 2]]
  .map(([id, specialty, frequency]) => ({ id, name: `Cas ${id}`, pathology: 'p', specialty, frequency, centers: [], linkedFachbegriffeIds: [] } as unknown as Case));
const TEILE: SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];
const tache = (date: string, caseId: string, extra: Partial<TaskInstance> = {}): TaskInstance =>
  ({ id: `${date}-${caseId}`, date, kind: 'simulation', caseId, label: `Cas ${caseId}`, teile: [...TEILE], estMin: 52, source: 'plan', reason: JAMAIS, ...extra });
const fige = (d: string, tasks: TaskInstance[]) =>
  ({ id: `pm${d}`, user_id: 'u', type: 'plan.materialized', subject_id: d, payload: { tasks, mode: 'cas-complet', seed: 's', targetMin: 120 }, occurred_at: `${d}T06:00:00Z` });
const partie = (id: string, caseId: string, at: string, teile: SimTeil[], spentMin: number): TrainingEvent =>
  ({ id, at: new Date(at).getTime(), kind: 'simulation', caseId, teile, source: 'libre', spentMin, laufId: `l${id}`, scores: Object.fromEntries(teile.map((t) => [t, 50])) });
const couvert = (id: string): CaseProgress => {
  const cp = blankProgress(id);
  for (const t of TEILE) cp.teile[t] = { ...cp.teile[t], status: 'acquis', attempts: 1, lastScore: 70, lastAt: 1 };
  return { ...cp, couverture: 3, maitrise: 70, etat: 'couvert', overall: 'entame' };
};

let container: HTMLDivElement; let root: Root;
const txt = () => container.textContent ?? '';
const section = (titre: RegExp) => [...container.querySelectorAll('section')].find((s) => titre.test(s.querySelector('h2')?.textContent ?? ''));

async function monter({ rythme = true } = {}) {
  await db.progress_events.bulkPut([
    fige('2026-10-12', [tache('2026-10-12', 'k2', { doneAt: undefined }), tache('2026-10-12', 'n2')]),
    fige('2026-10-13', []),
    fige('2026-10-14', [tache('2026-10-14', 'k1'), tache('2026-10-14', 'n1', { reason: 'Vu il y a 9 jours — le rappel espacé tombe aujourd\'hui.' })]),
  ] as never);
  await rebuildJournal(await db.progress_events.toArray());
  // Le rythme des deux dernières semaines (5 parties de 40 min), une partie du jour sur k1 (l'Anamnese), et la coche de k2 lundi.
  const passe = rythme ? ['2026-09-30', '2026-10-02', '2026-10-06', '2026-10-08', '2026-10-12'].map((d, i) => partie(`w${i}`, 'g1', `${d}T19:00:00`, ['anamnese'], 40)) : [];
  await db.training_events.bulkPut([...passe, partie('auj', 'k1', '2026-10-14T07:30:00', ['anamnese'], 20)]);
  await db.case_progress.bulkPut([couvert('g1'), couvert('n2')]);
  await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
  await vi.waitFor(() => expect(txt()).toMatch(/Carte de couverture/), { timeout: 10000 });
}

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 14, 8, 0));                                   // mercredi 14 octobre 2026
  refreshToday();
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear()]);
  await db.cases.bulkPut(cases);
  await db.meta.put({ key: 'program', value: config });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('1 · Aujourd\'hui — « Commencer par … »', () => {
  it('le jour, l\'avancement, les lignes du plan figé et UNE action : commencer par la première tâche à faire', async () => {
    await monter();
    const s = section(/^Aujourd'hui · mercredi 14 oct\.$/)!;
    expect(s).toBeDefined();
    expect(s.textContent).toMatch(/0\/2 fait · \d+ min prévues/);
    const go = [...s.querySelectorAll('a')].find((a) => /^Commencer par Cas k1$/.test(a.textContent ?? ''))!;
    expect(go.getAttribute('href')).toMatch(/^\/simulation\/k1\/pre\?depart=dokumentation&task=/);    // ce qui RESTE (l'Anamnese est jouée)
  });

  it('m6 (S4-2) : un cas entamé dit ce qui reste ; la raison figée « jamais travaillé » ne se lit plus', async () => {
    await monter();
    const s = section(/^Aujourd'hui/)!;
    expect(s.textContent).toMatch(/Il te reste la Dokumentation et la Fallvorstellung/);
    expect(s.textContent).not.toMatch(/jamais travaillé/);
    expect(s.textContent, 'une tâche pas encore entamée garde sa raison').toMatch(/le rappel espacé tombe aujourd'hui/);
  });
});

describe('2 · La semaine — un point par cas prévu, rempli quand il est joué', () => {
  it('sept jours ; les jours off sont neutres ; le jour à venir montre sa projection', async () => {
    await monter();
    const jours = [...section(/^La semaine$/)!.querySelectorAll('li')].map((l) => l.getAttribute('aria-label'));
    expect(jours).toHaveLength(7);
    expect(jours[0]).toBe('lundi 12 oct. : 2 cas prévus');
    expect(jours[1]).toBe('mardi 13 oct. : off');
    expect(jours[2]).toBe('mercredi 14 oct., aujourd\'hui : 2 cas prévus, 1 entamé');
    expect(jours[5]).toBe('samedi 17 oct. : off');
    expect(jours[6]).toBe('dimanche 18 oct. : off');
    expect(jours[3]).toMatch(/^jeudi 15 oct\. : \d+ cas en projection, non figée$/);
    expect(section(/^La semaine$/)!.textContent).not.toMatch(/retard|manqu/i);
  });
});

describe('3 · Jusqu\'à l\'examen — une lecture, sans alarme', () => {
  it('la projection sur le rythme réel, puis la couverture pondérée avec sa base et sa portée', async () => {
    await monter();
    const s = section(/^Jusqu'à l'examen$/)!;
    expect(s.textContent).toMatch(/À ton rythme des deux dernières semaines, tu auras travaillé les \d+ cas les plus fréquents le \d+ \S+, avec \d+ jours de marge pour les reprendre\./);
    expect(s.textContent).toMatch(/Les cas que tu as travaillés représentent \d+ % des protocoles, d'après 53 protocoles, toutes villes\./);
  });
  it('rien à projeter : pas de phrase de projection', async () => {
    await monter({ rythme: false });
    expect(txt()).not.toMatch(/À ton rythme/);
  });
});

describe('4 · La carte de couverture — des cadrans, sans pourcentage', () => {
  it('chaque cas est un cadran miniature ; aucun chiffre en %, l\'ancien champ a disparu', async () => {
    await monter();
    const s = section(/^Carte de couverture$/)!;
    expect(s.querySelectorAll('[role="img"]')).toHaveLength(6);
    expect(s.querySelectorAll('[data-repere]'), 'un signe non ouvrable ne porte pas de repères cachés').toHaveLength(0);
    expect((s.querySelector('[role="img"]') as HTMLElement).style.width, 'un signe n\'est pas une cible de 44 px').toBe('36px');
    expect(s.textContent).not.toMatch(/%/);
    expect(txt()).not.toMatch(/Champ de couverture/);
    const specialites = [...s.querySelectorAll('button[aria-expanded]')].map((b) => b.textContent);
    expect(specialites, 'pondérée : les spécialités par poids de protocoles').toEqual(['Kardiologie', 'Gastroenterologie', 'Neurologie']);
  });

  it('toucher une spécialité l\'agrandit en cadrans complets ; toucher encore la referme', async () => {
    await monter();
    const s = section(/^Carte de couverture$/)!;
    const kardio = [...s.querySelectorAll('button[aria-expanded]')].find((b) => b.textContent === 'Kardiologie')!;
    await act(async () => { (kardio as HTMLButtonElement).click(); });
    expect(kardio.getAttribute('aria-expanded')).toBe('true');
    const dials = [...s.querySelectorAll('button[aria-haspopup="dialog"]')].map((b) => b.getAttribute('aria-label') ?? '');
    expect(dials).toHaveLength(2);
    expect(dials[0]).toMatch(/^Cas k1 : .*Dokumentation : pas encore travaillé/);
    await act(async () => { (kardio as HTMLButtonElement).click(); });
    expect(s.querySelectorAll('button[aria-haspopup="dialog"]')).toHaveLength(0);
  });

  it('l\'encart dit une chose, avec une action et une fréquence sourcée', async () => {
    await monter();
    const s = section(/^Carte de couverture$/)!;
    expect(s.textContent).toMatch(/Kardiologie : 2 cas pas encore travaillés sur 2\. Cas k1 revient dans 14 protocoles, d'après 53 protocoles, toutes villes\./);
    const lancer = s.querySelector('a[aria-label="Lancer Cas k1"]')!;
    expect(lancer.getAttribute('href')).toBe('/simulation/k1/pre');
  });
});

describe('Réglage des jours off — l\'état se lit (aria-pressed)', () => {
  it('chaque jour dit s\'il est off', async () => {
    await act(async () => { root.render(<MemoryRouter><ProgramSetup initial={config} onDone={() => {}} /></MemoryRouter>); });
    const groupe = document.querySelector('[role="group"][aria-label="Jours off"]')!;           // la feuille est montée dans un portail
    const etat = Object.fromEntries([...groupe.querySelectorAll('button')].map((b) => [b.getAttribute('aria-label'), b.getAttribute('aria-pressed')]));
    expect(etat).toEqual({ lundi: 'false', mardi: 'false', mercredi: 'false', jeudi: 'false', vendredi: 'false', samedi: 'true', dimanche: 'true' });
    await act(async () => { (groupe.querySelector('[aria-label="lundi"]') as HTMLButtonElement).click(); });
    expect(groupe.querySelector('[aria-label="lundi"]')!.getAttribute('aria-pressed')).toBe('true');
  });
});
