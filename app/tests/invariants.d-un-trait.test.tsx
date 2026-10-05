// C6 — la tâche « d'un trait » avec la garde VRAIE (training-journal.md §12.12, §13.1, §12.4.7 ; simulation-run.md §10.3).
// Le chemin entier, de la génération au cochage :
//   1. dans la fenêtre des 15 jours ouvrés avant l'examen, le plan PAR DÉFAUT (garde de parametres.ts) émet `dUnTrait` ;
//   2. son lien de lancement mène à une partie ENTIÈRE (trois Teile, départ sur l'Anamnese, la tâche portée) ;
//   3. tout ou rien (I5) : une partie partielle ne la coche pas ; une partie d'un trait la coche ;
//   4. entamée à part, sa ligne dit « À reprendre depuis l'Anamnese » — jamais « il te reste », « d'un trait » une fois.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, act, render, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
configure({ asyncUtilTimeout: 10_000 });
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db } from '@/db/db';
import { freezeAt } from '@/lib/clock';
import { computeCaseProgress } from '@/lib/journal';
import { buildTasks, type BuildInput } from '@/lib/program/dayPlan';
import { SEUIL_FREQUENT } from '@/lib/program/parametres';
import { lectureDuPlan, TaskLine, taskLink } from '@/features/program/TaskLine';
import { departDe, useLauf } from '@/features/simulation/useLauf';
import type { Case, DayPlan, TaskInstance, TrainingEvent } from '@/db/types';
import { rng } from './helpers/prop';
import { CORPUS, TEILE, morning, randomConfig, resetTime, resetWorld } from './helpers/world';

const JOUR = '2026-10-21';                                         // 8 jours ouvrés avant l'examen du 30 oct.
const frequents = () => (CORPUS as Case[]).filter((c) => c.frequency >= 26 * SEUIL_FREQUENT).slice(0, 4);
const mesure = (id: string, jour: string, caseId: string): TrainingEvent => ({
  id, at: morning(jour, 10), kind: 'simulation', caseId, teile: TEILE, source: 'libre', spentMin: 30,
  scores: { anamnese: 88, dokumentation: 88, fallvorstellung: 88 },
});

/** Le plan du jour, garde PAR DÉFAUT (aucun `dUnTraitActif` passé) : des cas fréquents solides, dus, non prêts. */
function tachesDuJour(): TaskInstance[] {
  const cas = frequents();
  const evs = cas.flatMap((c, i) => [mesure(`s${i}a`, '2026-09-01', c.id), mesure(`s${i}b`, '2026-09-04', c.id)]);
  const input: BuildInput = {
    config: randomConfig(rng(1), { startDate: '2026-10-05', examDate: '2026-10-30', modus: 'cas-complet', hoursPerSession: 4 }),
    date: JOUR, cases: cas, progress: new Map(computeCaseProgress(evs).map((p) => [p.caseId, p])), trainingEvents: evs, begriffe: [], now: morning(JOUR),
  };
  let n = 0;
  return buildTasks(input, () => `t${n++}`);
}

beforeEach(async () => { await resetWorld(); });
afterEach(() => resetTime());

describe('« D’un trait », garde vraie — du plan à la tâche cochée', () => {
  it('le plan par défaut émet des tâches dUnTrait dans la fenêtre, et leur lien mène à la partie entière', () => {
    const t = tachesDuJour().find((x) => x.dUnTrait)!;
    expect(t, 'aucune tâche dUnTrait dans la fenêtre').toBeTruthy();
    expect(t.teile).toEqual(TEILE);
    const url = new URL(taskLink(t), 'http://x');
    expect(url.pathname).toBe(`/simulation/${t.caseId}/pre`);
    expect(departDe(url.searchParams), 'une tâche d’un trait ne part pas d’un Teil isolé').toBeNull();
    expect(url.searchParams.get('task')).toBe(t.id);
  });

  it('entamée à part : la ligne dit « À reprendre depuis l’Anamnese », jamais « il te reste », « d’un trait » une seule fois', () => {
    const t = { ...tachesDuJour().find((x) => x.dUnTrait)!, creeA: morning(JOUR, 8) };
    const partie: TrainingEvent = { id: 'p1', at: morning(JOUR, 10), kind: 'simulation', caseId: t.caseId, teile: ['anamnese'], source: 'libre', spentMin: 15, scores: { anamnese: 70 } };
    const plan = { date: JOUR, materializedAt: morning(JOUR, 8), mode: 'cas-complet', seed: 's', targetMin: 240, tasks: [t] } as DayPlan;
    const { container, unmount } = render(<MemoryRouter><TaskLine task={t} lecture={lectureDuPlan(plan, [partie]).get(t.id)} /></MemoryRouter>);
    const texte = container.textContent ?? '';
    unmount();
    expect(texte).toMatch(/À reprendre depuis l'Anamnese/);
    expect(texte).not.toMatch(/il te reste/i);
    expect(texte.split(/d'un trait/).length - 1, 'la raison le dit, une fois').toBe(1);
  });

  async function jouer(teileJoues: number) {
    const t = { ...tachesDuJour().find((x) => x.dUnTrait)!, creeA: morning(JOUR, 8) };
    const c = CORPUS.find((x) => x.id === t.caseId)!;
    await db.cases.put(c);
    await db.day_plans.put({ date: JOUR, materializedAt: morning(JOUR, 8), mode: 'cas-complet', seed: 's', targetMin: 240, tasks: [t] } as DayPlan);
    freezeAt(morning(JOUR, 9));
    const url = new URL(taskLink(t), 'http://x');
    const h = renderHook(() => useLauf(c, departDe(url.searchParams), url.searchParams.get('task') ?? undefined));
    await waitFor(() => expect(h.result.current.lauf?.zustand).toBe('laufend'));
    const l = h.result.current.lauf!;
    expect([l.geplanteTeile, l.modus, l.aktuellerTeil, l.taskId]).toEqual([TEILE, 'komplett', 'anamnese', t.id]);   // partie entière
    for (let i = 0; i < teileJoues; i++) {
      act(() => h.result.current.terminerPartie());
      if (i < teileJoues - 1) act(() => h.result.current.dispatch({ typ: 'partieSuivante' }));
    }
    act(() => h.result.current.versChecklist());
    await act(async () => { await h.result.current.beenden(); });
    h.unmount();
    return (await db.day_plans.get(JOUR))!.tasks[0];
  }

  it('tout ou rien (I5) : l’Anamnese seule, puis « Terminer ici », ne coche pas la tâche', async () => {
    expect((await jouer(1)).doneAt).toBeUndefined();
  });

  it('les trois Teile d’un trait cochent la tâche', async () => {
    expect((await jouer(3)).doneAt).toBeDefined();
  });
});
