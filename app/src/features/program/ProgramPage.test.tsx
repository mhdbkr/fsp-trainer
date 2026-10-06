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
import { useUi } from '@/store/ui';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const JAMAIS = 'Parmi les cas les plus vus à l\'examen, et jamais travaillé.';
const config = { startDate: '2026-09-01', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
// De VRAIS identifiants de cas : leur pathologie et son compte viennent de la table de la source (frequencesProtocoles).
// [alias, id, spécialité] — Gastro : Leberzirrhose 26 + GERD 7 ; Psychiatrie : Depression 30 ; Kardio : KHK 11 + Myokardinfarkt 7 ;
// Pneumo : Pneumonie 17 ; Neuro : MS 10 + TIA 4 ; Ortho : Bandscheibenvorfall (HWS/LWS) 14, PARTAGÉ par deux cas ; Uro : 13 ; Derma : 0.
const LISTE = [['k1', 'case-angina-pectoris', 'Kardiologie'], ['k2', 'case-myokardinfarkt', 'Kardiologie'], ['g1', 'case-leberzirrhose', 'Gastroenterologie'],
  ['g2', 'case-gerd', 'Gastroenterologie'], ['n1', 'case-multiple-sklerose', 'Neurologie'], ['n2', 'case-tia', 'Neurologie'], ['p1', 'case-depression', 'Psychiatrie'],
  ['l1', 'case-pneumonie', 'Pneumologie'], ['o1', 'case-bandscheibenvorfall', 'Orthopädie'], ['o2', 'case-hws-diskusprolaps', 'Orthopädie'],
  ['u1', 'case-pyelonephritis', 'Urologie'], ['d1', 'case-basaliom', 'Dermatologie']] as const;
const ID = Object.fromEntries(LISTE.map(([a, id]) => [a, id])) as Record<string, string>;
const cases = LISTE.map(([alias, id, specialty]) => ({ id, name: `Cas ${alias}`, pathology: 'p', specialty, frequency: 1, centers: [], linkedFachbegriffeIds: [] } as unknown as Case));
const TEILE: SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];
const tache = (date: string, alias: string, extra: Partial<TaskInstance> = {}): TaskInstance =>
  ({ id: `${date}-${alias}`, date, kind: 'simulation', caseId: ID[alias], label: `Cas ${alias}`, teile: [...TEILE], estMin: 52, source: 'plan', reason: JAMAIS, ...extra });
const fige = (d: string, tasks: TaskInstance[], replannedAt?: string) => [
  { id: `pm${d}`, user_id: 'u', type: 'plan.materialized', subject_id: d, payload: { tasks, mode: 'cas-complet', seed: 's', targetMin: 120 }, occurred_at: `${d}T06:00:00Z` },
  ...(replannedAt ? [{ id: `pr${d}`, user_id: 'u', type: 'plan.replanned', subject_id: d, payload: { tasks, reason: 'manuel' }, occurred_at: replannedAt }] : []),
];
const partie = (id: string, alias: string, at: string, teile: SimTeil[], spentMin: number): TrainingEvent =>
  ({ id, at: new Date(at).getTime(), kind: 'simulation', caseId: ID[alias], teile, source: 'libre', spentMin, laufId: `l${id}`, scores: Object.fromEntries(teile.map((t) => [t, 50])) });
const couvert = (alias: string): CaseProgress => {
  const cp = blankProgress(ID[alias]);
  for (const t of TEILE) cp.teile[t] = { ...cp.teile[t], status: 'acquis', attempts: 1, lastScore: 70, lastAt: 1 };
  return { ...cp, couverture: 3, maitrise: 70, etat: 'couvert', overall: 'entame' };
};

let container: HTMLDivElement; let root: Root;
const txt = () => container.textContent ?? '';
const section = (titre: RegExp) => [...container.querySelectorAll('section')].find((s) => titre.test(s.querySelector('h2')?.textContent ?? ''));
const specialites = (s: Element) => [...s.querySelectorAll<HTMLButtonElement>('button[data-specialite]')];

async function monter({ rythme = true, replanifie = false } = {}) {
  await db.progress_events.bulkPut([
    ...fige('2026-10-12', [tache('2026-10-12', 'k2'), tache('2026-10-12', 'n2')]),
    ...fige('2026-10-13', []),
    ...fige('2026-10-14', [tache('2026-10-14', 'k1'), tache('2026-10-14', 'n1', { reason: 'Vu il y a 9 jours — le rappel espacé tombe aujourd\'hui.' })], replanifie ? '2026-10-14T12:02:00Z' : undefined),
  ] as never);
  await rebuildJournal(await db.progress_events.toArray());
  // Le rythme des deux dernières semaines (5 parties de 40 min), une partie du jour sur k1 (l'Anamnese), et un cas joué le mardi off.
  const passe = rythme ? ['2026-09-30', '2026-10-02', '2026-10-06', '2026-10-08', '2026-10-12'].map((d, i) => partie(`w${i}`, 'g1', `${d}T19:00:00`, ['anamnese'], 40)) : [];
  await db.training_events.bulkPut([...passe, partie('auj', 'k1', '2026-10-14T07:30:00', ['anamnese'], 20), ...(rythme ? [partie('off', 'u1', '2026-10-13T18:00:00', ['anamnese'], 20)] : [])]);
  await db.case_progress.bulkPut([couvert('g1'), couvert('n2')]);
  await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
  await vi.waitFor(() => expect(txt()).toMatch(/Carte de couverture/), { timeout: 10000 });
}

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 14, 8, 0));                                   // mercredi 14 octobre 2026
  refreshToday();
  useUi.getState().setSpecialiteOuverte(null);
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear()]);
  await db.cases.bulkPut(cases);
  await db.meta.put({ key: 'program', value: config });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('1 · Aujourd\'hui — « Commencer par … », seule action principale', () => {
  it('le jour, l\'avancement, les lignes du plan figé et UNE action : commencer par la première tâche à faire', async () => {
    await monter();
    const s = section(/^Aujourd'hui · mercredi 14 oct\.$/)!;
    expect(s).toBeDefined();
    expect(s.textContent).toMatch(/0\/2 fait · \d+ min prévues/);
    const go = [...s.querySelectorAll('a')].find((a) => /^Commencer par Cas k1$/.test(a.textContent ?? ''))!;
    expect(go.getAttribute('href')).toMatch(/^\/simulation\/case-angina-pectoris\/pre\?depart=dokumentation&task=/);    // ce qui RESTE
  });

  it('les lignes gardent « Fait », perdent « Lancer » ; le titre ouvre la tâche ; jamais deux liens vers la même adresse', async () => {
    await monter();
    const s = section(/^Aujourd'hui/)!;
    const lignes = [...s.querySelectorAll('div.rounded-xl.border.transition-colors')];
    expect(lignes).toHaveLength(2);
    for (const l of lignes) {
      expect(l.querySelector('[title="Marquer faite"]')).not.toBeNull();
      expect(l.querySelector('a.btn-primary'), 'pas de « Lancer » sur la ligne').toBeNull();
    }
    expect(lignes[0].querySelector('a[data-cta]'), 'la première tâche s\'ouvre par « Commencer par … », pas par un second lien').toBeNull();
    expect(lignes[1].querySelector('a[data-cta]')?.textContent, 'le titre des autres ouvre la tâche').toBe('Cas n1');
    const hrefs = [...s.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(new Set(hrefs).size, hrefs.join(' · ')).toBe(hrefs.length);
    expect(s.querySelectorAll('a.btn-primary'), '« Commencer par … » est la seule action principale').toHaveLength(1);
  });

  it('le pied ne dit rien sans replanification, et seulement « Replanifié à HH:mm. » après', async () => {
    await monter();
    expect(section(/^Aujourd'hui/)!.textContent).not.toMatch(/Ce plan est figé|rien ne prend la place/);
    expect(section(/^Aujourd'hui/)!.textContent).not.toMatch(/Replanifié à/);
    act(() => root.unmount()); root = createRoot(container);
    await db.progress_events.clear();
    await monter({ replanifie: true });
    expect(section(/^Aujourd'hui/)!.textContent).toMatch(/Replanifié à \d\d:\d\d\./);
  });

  it('m6 (S4-2) : un cas entamé dit ce qui reste ; la raison figée « jamais travaillé » ne se lit plus', async () => {
    await monter();
    const s = section(/^Aujourd'hui/)!;
    expect(s.textContent).toMatch(/Il te reste la Dokumentation et la Fallvorstellung/);
    expect(s.textContent).not.toMatch(/jamais travaillé/);
    expect(s.textContent, 'une tâche pas encore entamée garde sa raison').toMatch(/le rappel espacé tombe aujourd'hui/);
  });
});

describe('2 · La semaine — un point par cas prévu, rempli quand il est joué ; le travail hors plan se voit', () => {
  it('sept jours ; les jours off sont neutres, sauf si l\'on y a joué ; le jour à venir montre sa projection', async () => {
    await monter();
    const s = section(/^La semaine$/)!;
    const jours = [...s.querySelectorAll('li')].map((l) => l.querySelector('.sr-only')?.textContent);
    expect(s.querySelectorAll('li[aria-label]'), 'l\'étiquette est un texte sr-only, pas un aria-label').toHaveLength(0);
    expect(jours).toHaveLength(7);
    expect(jours[0], 'la partie de Leberzirrhose, hors plan').toBe('lundi 12 oct. : 2 cas prévus, 1 cas joué hors plan');
    expect(jours[1], 'un jour off où l\'on a joué').toBe('mardi 13 oct. : 1 cas joué hors plan');
    expect(jours[2]).toBe('mercredi 14 oct., aujourd\'hui : 2 cas prévus, 1 entamé');
    expect(jours[5]).toBe('samedi 17 oct. : off');
    expect(jours[6]).toBe('dimanche 18 oct. : off');
    expect(jours[3]).toMatch(/^jeudi 15 oct\. : \d+ cas en projection, non figée$/);
    expect(s.textContent).not.toMatch(/retard|manqu/i);
  });
});

describe('3 · Jusqu\'à l\'examen — une seule phrase, la projection', () => {
  it('la projection sur le rythme réel, et rien d\'autre (plus de pourcentage)', async () => {
    await monter();
    const s = section(/^Jusqu'à l'examen$/)!;
    expect(s.querySelectorAll('p')).toHaveLength(1);
    expect(s.textContent).toMatch(/^Jusqu'à l'examenÀ ton rythme des deux dernières semaines, tu auras travaillé les \d+ cas les plus fréquents le \d+ \S+, avec \d+ jours de marge pour les reprendre\.$/);
    expect(txt()).not.toMatch(/%/);
  });
  it('rien à projeter : pas de section', async () => {
    await monter({ rythme: false });
    expect(txt()).not.toMatch(/À ton rythme|Jusqu'à l'examen/);
  });
});

describe('4 · La carte de couverture — des cadrans, sans pourcentage', () => {
  it('fermée, elle tient dans un téléphone : 6 spécialités (les plus lourdes), des points de 24 px, « Voir les N autres »', async () => {
    await monter();
    const s = section(/^Carte de couverture$/)!;
    expect(specialites(s).map((b) => b.textContent), 'pondérée, par pathologies distinctes').toEqual(
      ['Gastroenterologie', 'Psychiatrie', 'Kardiologie', 'Pneumologie', 'Neurologie', 'Orthopädie']);
    const points = [...s.querySelectorAll<HTMLElement>('[role="img"]')];
    expect(points).toHaveLength(10);
    expect(points.every((p) => p.style.width === '24px' && p.style.height === '24px'), 'un point de 24 px, pas une cible de 44 px').toBe(true);
    expect(s.querySelectorAll('[data-repere], button[aria-haspopup="dialog"]'), 'fermée : aucun cadran ouvert, aucun repère').toHaveLength(0);
    expect(s.textContent).not.toMatch(/%/);
    expect(txt()).not.toMatch(/Champ de couverture/);
    const voir = [...s.querySelectorAll('button')].find((b) => b.textContent === 'Voir les 2 autres spécialités')!;
    await act(async () => { voir.click(); });
    expect(specialites(s).map((b) => b.textContent).slice(6)).toEqual(['Urologie', 'Dermatologie']);
  });

  it('toucher une spécialité l\'agrandit en cadrans complets ; la toucher encore la referme ; la dernière ouverte est retenue', async () => {
    await monter();
    const s = section(/^Carte de couverture$/)!;
    const kardio = () => specialites(s).find((b) => b.textContent === 'Kardiologie')!;
    await act(async () => { kardio().click(); });
    expect(kardio().getAttribute('aria-expanded')).toBe('true');
    const dials = [...s.querySelectorAll('button[aria-haspopup="dialog"]')].map((b) => b.getAttribute('aria-label') ?? '');
    expect(dials).toHaveLength(2);
    expect(dials[0]).toMatch(/^Cas k1 : .*Dokumentation : pas encore travaillé/);
    expect(useUi.getState().specialiteOuverte).toBe('Kardiologie');
    act(() => root.unmount()); root = createRoot(container);
    await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
    await vi.waitFor(() => expect(section(/^Carte de couverture$/)?.querySelectorAll('button[aria-haspopup="dialog"]').length).toBe(2), { timeout: 10000 });
    await act(async () => { specialites(section(/^Carte de couverture$/)!).find((b) => b.textContent === 'Kardiologie')!.click(); });
    expect(section(/^Carte de couverture$/)!.querySelectorAll('button[aria-haspopup="dialog"]')).toHaveLength(0);
    expect(useUi.getState().specialiteOuverte).toBeNull();
  });

  it('une spécialité retenue hors des 6 premières est montrée, ouverte', async () => {
    useUi.getState().setSpecialiteOuverte('Urologie');
    await monter();
    const s = section(/^Carte de couverture$/)!;
    expect(specialites(s).find((b) => b.textContent === 'Urologie')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('l\'encart, au-dessus de la carte, dit une chose avec une fréquence sourcée ; le nom de la spécialité l\'ouvre ; aucun « Lancer »', async () => {
    await monter();
    const s = section(/^Carte de couverture$/)!;
    const encart = s.querySelector('p')!;
    expect(encart.compareDocumentPosition(s.querySelector('ul')!) & Node.DOCUMENT_POSITION_FOLLOWING, 'l\'encart précède la carte').toBeTruthy();
    expect(encart.textContent).toBe('Psychiatrie : son seul cas n\'est pas encore travaillé. « Depression » est tombé dans 30 des 580 protocoles relevés, tous centres.');
    expect(s.querySelectorAll('a'), 'l\'encart ne propose pas de jouer hors du plan').toHaveLength(0);
    await act(async () => { encart.querySelector('button')!.click(); });
    expect(specialites(s).find((b) => b.textContent === 'Psychiatrie')!.getAttribute('aria-expanded')).toBe('true');
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
