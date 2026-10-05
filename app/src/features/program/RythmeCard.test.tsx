// S4-2 — les textes du plan : la carte de rythme (§13.5) et la ligne d'une tâche de cas (« il te reste la Dokumentation · 10 min »,
// le rappel d'une erreur transversale, §13.3). Proposé, jamais imposé ; un fait, jamais un jugement.
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
import type { Case, DayPlan, ProgramConfig, TaskInstance, TrainingEvent } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { rebuildJournal } from '@/lib/journal';
import { RythmeCard } from './RythmeCard';
import { lectureDuPlan, TaskLine, TaskList } from './TaskLine';

const config = { startDate: '2026-09-01', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
const drill = (date: string): TaskInstance => ({ id: `d${date}`, date, kind: 'drill', label: 'Fachbegriffe', estMin: 10, source: 'plan', reason: 'r' });

let container: HTMLDivElement; let root: Root;
const txt = () => container.textContent ?? '';
const btn = (re: RegExp) => [...container.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''));

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 12, 8, 0));                           // lundi 12 octobre ; la fenêtre = du 5 au 11
  refreshToday();
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear()]);
  await db.cases.bulkPut(['c1', 'c2'].map((id) => ({ id, name: `Cas ${id}`, pathology: 'p', specialty: 'Kardiologie', frequency: 10, centers: [], linkedFachbegriffeIds: [] } as unknown as Case)));
  await db.meta.put({ key: 'program', value: config });
  await db.progress_events.bulkPut(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((d, i) => (
    { id: `p${i}`, user_id: 'u', type: 'plan.materialized', subject_id: d, payload: { tasks: [drill(d)], mode: 'cas-complet', seed: 's', targetMin: 120 }, occurred_at: `${d}T06:00:00Z` })));
  await rebuildJournal(await db.progress_events.toArray());
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<RythmeCard />); });
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('RythmeCard — proposé, jamais imposé (§13.5)', () => {
  it('dit la valeur et sa CONSÉQUENCE sur la projection, jamais un écart en % ; « Garder » écrit un refus synchronisé', async () => {
    await vi.waitFor(() => expect(txt()).toMatch(/tient dans un budget de 20 min par jour/), { timeout: 10000 });
    expect(txt()).toMatch(/À ce rythme, les 2 cas les plus fréquents seront travaillés le \d+ \S+ au lieu du \d+ \S+/);
    expect(txt()).not.toMatch(/%|retard|manqu|insuffisan/i);
    const avant = await db.day_plans.toArray();
    await act(async () => { btn(/^garder 120 min$/i)!.click(); });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 10000 });
    const refus = await db.progress_events.where('type').equals('rythme.refused').toArray();
    expect(refus.map((e) => e.subject_id)).toEqual(['2026-W42']);
    expect((await db.meta.get('program'))!.value, 'refuser ne change pas le budget').toEqual(config);
    expect(await db.day_plans.toArray()).toEqual(avant);
  });

  it('« Caler » écrit la config complète, le budget du jour vaut la valeur, aucun jour figé ne bouge', async () => {
    await vi.waitFor(() => expect(btn(/^caler sur 20 min$/i)).toBeDefined(), { timeout: 10000 });
    const avant = await db.day_plans.toArray();
    await act(async () => { btn(/^caler sur 20 min$/i)!.click(); });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 10000 });
    const c = (await db.meta.get('program'))!.value as ProgramConfig;
    expect({ ...c, hoursPerSession: config.hoursPerSession }).toEqual(config);
    expect(Math.round(c.hoursPerSession * 60)).toBe(20);
    expect(await db.progress_events.where('type').equals('program.configured').count()).toBe(1);
    expect(await db.day_plans.toArray()).toEqual(avant);
  });
});

describe('La ligne d’une tâche de cas — ce qui reste, le rappel', () => {
  const plan = (tasks: TaskInstance[]): DayPlan => ({ date: '2026-10-12', materializedAt: 0, mode: 'cas-complet', seed: 's', targetMin: 120, tasks });
  const partie = (i: number, caseId: string, at: number, over: Partial<TrainingEvent> = {}): TrainingEvent =>
    ({ id: `e${i}`, at, kind: 'simulation', caseId, teile: ['anamnese'], source: 'libre', spentMin: 15, scores: { anamnese: 70 }, manques: { anamnese: ['anam-allergien'] }, ...over });

  it('« Il te reste la Dokumentation et la Fallvorstellung · N min » et le rappel chiffré, sans jugement', async () => {
    const tache: TaskInstance = { id: 't1', date: '2026-10-12', kind: 'simulation', caseId: 'c1', label: 'Pneumonie', teile: ['dokumentation', 'fallvorstellung'], estMin: 32, source: 'plan', reason: 'r', rappel: 'anam-allergien', creeA: new Date(2026, 9, 12, 7).getTime() };
    const autre: TaskInstance = { ...tache, id: 't2', teile: ['anamnese', 'dokumentation', 'fallvorstellung'], rappel: undefined, caseId: 'c2', label: 'Asthma' };
    const events = [0, 1, 2].map((i) => partie(i, `x${i}`, new Date(2026, 9, 8 + i, 10).getTime()));
    const lecture = lectureDuPlan(plan([tache, autre]), events);
    expect(lecture.get('t1')!.reste).toEqual({ teile: ['dokumentation', 'fallvorstellung'], min: 32 });
    expect(lecture.has('t2'), 'le cas entier ne dit pas « il te reste »').toBe(false);
    await act(async () => { root.render(<MemoryRouter><TaskLine task={tache} lecture={lecture.get('t1')} /></MemoryRouter>); });
    expect(txt()).toMatch(/Il te reste la Dokumentation et la Fallvorstellung/);
    expect(txt()).toMatch(/32 min/);
    expect(txt()).toMatch(/« Allergien inkl\. Medikamentenallergien » manque dans 3 de tes 3 dernières Anamnesen\./);
  });

  it('la liste de l’accueil (TaskList) lit elle-même le plan figé du jour : « Il te reste … »', async () => {
    const tache: TaskInstance = { id: 't1', date: '2026-10-12', kind: 'simulation', caseId: 'c1', label: 'Pneumonie', teile: ['dokumentation'], estMin: 20, source: 'plan', reason: 'r', creeA: new Date(2026, 9, 12, 7).getTime() };
    await db.day_plans.put(plan([tache]));
    await act(async () => { root.render(<MemoryRouter><TaskList tasks={[tache]} /></MemoryRouter>); });
    await vi.waitFor(() => expect(txt()).toMatch(/Il te reste la Dokumentation/), { timeout: 10000 });
  });

  it('entamée dans la journée : le reste suit le journal, avec les minutes de ce qui reste', () => {
    const tache: TaskInstance = { id: 't1', date: '2026-10-12', kind: 'simulation', caseId: 'c1', label: 'Pneumonie', teile: ['anamnese', 'dokumentation', 'fallvorstellung'], estMin: 52, source: 'plan', reason: 'r', creeA: new Date(2026, 9, 12, 7).getTime() };
    const jouee = partie(9, 'c1', new Date(2026, 9, 12, 9).getTime(), { manques: undefined });
    expect(lectureDuPlan(plan([tache]), [jouee]).get('t1')!.reste).toEqual({ teile: ['dokumentation', 'fallvorstellung'], min: 20 + 12 });
  });
});
