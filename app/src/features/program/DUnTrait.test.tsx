// S4 « d'un trait » — les textes qui annoncent la tâche (training-journal.md §12.3 I5, §13.1, §12.4.7).
// Une tâche `dUnTrait` dit ce qu'elle exige par sa raison ; entamée à part, sa ligne dit qu'elle se rejoue entière,
// d'un trait — jamais « il te reste … ». Garde fausse : les textes d'avant, mot pour mot.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, DayPlan, ProgramConfig, Specialty, TaskInstance, TrainingEvent } from '@/db/types';
import { computeCaseProgress } from '@/lib/journal';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { buildTasks, type BuildInput } from '@/lib/program/dayPlan';
import { lectureDuPlan, TaskLine, TaskList, taskLink } from './TaskLine';

const D_UN_TRAIT = /d'un trait/;
const A_REJOUER = "À rejouer d'un trait, en entier";
const TEILE = ['anamnese', 'dokumentation', 'fallvorstellung'] as const;
const SPECS: Specialty[] = ['Kardiologie', 'Gastroenterologie', 'Pneumologie', 'Neurologie', 'Nephrologie'];

// ---------------------------------------------------------------------------------------------------------------------
// La raison, à la génération
// ---------------------------------------------------------------------------------------------------------------------
const jourA = (jour: string, h = 10) => new Date(`${jour}T${String(h).padStart(2, '0')}:00:00`).getTime();
const mesure = (id: string, jour: string, caseId: string): TrainingEvent => ({
  id, at: jourA(jour), kind: 'simulation', caseId, teile: [...TEILE], source: 'libre', spentMin: 30,
  scores: { anamnese: 88, dokumentation: 88, fallvorstellung: 88 },
});
const cas = (i: number, frequency: number): Case =>
  ({ id: `c${i}`, name: `Cas ${i}`, pathology: `p${i}`, specialty: SPECS[i], frequency, centers: [], linkedFachbegriffeIds: [] } as unknown as Case);

/** Exam le 30 oct. : fenêtre d'un trait = les 15 derniers jours ouvrés ; dernière ligne droite = 27–29 oct. */
function plan(date: string, dUnTraitActif?: boolean): TaskInstance[] {
  const cases = [cas(0, 26), cas(1, 25), cas(2, 24), cas(3, 23)];
  const evs = [
    mesure('x0', '2026-10-12', 'c0'), mesure('x1', '2026-10-15', 'c0'),                        // solide, PAS dû le 21
    ...[1, 2, 3].flatMap((i) => [mesure(`a${i}`, '2026-09-01', `c${i}`), mesure(`b${i}`, '2026-09-04', `c${i}`)]),  // solides, dus
  ];
  const config = { startDate: '2026-10-05', examDate: '2026-10-30', intensity: 'mittel', hoursPerSession: 4, modus: 'cas-complet',
    offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
  const input: BuildInput = {
    config, date, cases, progress: new Map(computeCaseProgress(evs).map((p) => [p.caseId, p])), trainingEvents: evs, begriffe: [],
    now: jourA(date, 8), ...(dUnTraitActif === undefined ? {} : { dUnTraitActif }),
  };
  let n = 0;
  return buildTasks(input, () => `t${n++}`);
}

describe('la raison d’une tâche d’un trait dit ce qu’elle exige', () => {
  it('dans la fenêtre : le cas choisi hors échéance, et les consolidations — chacune le dit, en une phrase', () => {
    const tasks = plan('2026-10-21').filter((t) => t.caseId);
    const unTrait = tasks.filter((t) => t.dUnTrait);
    expect(unTrait.length, 'au moins le cas choisi et une consolidation').toBeGreaterThanOrEqual(2);
    for (const t of unTrait) expect(t.reason, `${t.label} : la raison ne dit pas « d'un trait »`).toMatch(D_UN_TRAIT);
    expect(tasks.find((t) => t.caseId === 'c0')!.reason).toBe("Pour la fin de la préparation : ce cas, d'un trait, comme à l'examen.");
    expect(tasks.find((t) => t.caseId === 'c1')!.reason).toBe("Solide il y a 47 jours : rejoue-le d'un trait, comme à l'examen.");
  });

  it('dernière ligne droite : l’examen à blanc d’un trait le dit', () => {
    const exam = plan('2026-10-28').find((t) => t.kind === 'examen-blanc')!;
    expect(exam.dUnTrait).toBe(true);
    expect(exam.reason).toBe("Répétition générale : d'un trait et sans aide.");
  });

  it('garde fausse : aucune tâche d’un trait, les raisons d’avant', () => {
    const tasks = plan('2026-10-21', false).filter((t) => t.caseId);
    expect(tasks.some((t) => t.dUnTrait)).toBe(false);
    expect(tasks.some((t) => D_UN_TRAIT.test(t.reason))).toBe(false);
    expect(tasks.find((t) => t.caseId === 'c1')!.reason).toBe("Solide il y a 47 jours : on vérifie qu'il tient.");
    expect(plan('2026-10-28', false).find((t) => t.kind === 'examen-blanc')!.reason).toBe('Répétition générale : conditions réelles, sans aide.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// La ligne de tâche
// ---------------------------------------------------------------------------------------------------------------------
const JOUR = '2026-10-21';
const tache: TaskInstance = {
  id: 'tu', date: JOUR, kind: 'revision', caseId: 'c1', label: 'Pneumonie', teile: [...TEILE], estMin: 52, source: 'plan',
  reason: "Solide il y a 47 jours : rejoue-le d'un trait, comme à l'examen.", dUnTrait: true, layer: 3, assistance: 'autonome',
  creeA: jourA(JOUR, 7),
};
const jour = (tasks: TaskInstance[]): DayPlan => ({ date: JOUR, materializedAt: jourA(JOUR, 7), mode: 'cas-complet', seed: 's', targetMin: 240, tasks });
const partie = (id: string, teile: TrainingEvent['teile'], h: number): TrainingEvent =>
  ({ id, at: jourA(JOUR, h), kind: 'simulation', caseId: 'c1', teile, source: 'libre', spentMin: 15, scores: Object.fromEntries(teile.map((t) => [t, 70])) });
const dans = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const occurrences = (re: RegExp) => (document.body.textContent ?? '').split(re).length - 1;

afterEach(() => { cleanup(); resetClock(); });

describe('la ligne d’une tâche d’un trait', () => {
  it('à faire : la raison le dit, la ligne ne le répète pas', () => {
    expect(lectureDuPlan(jour([tache]), []).get('tu')).toBeUndefined();
    dans(<TaskLine task={tache} />);
    expect(screen.queryByText(A_REJOUER)).toBeNull();
    expect(occurrences(/d'un trait/g), 'une seule fois sur la ligne').toBe(1);
  });

  it('entamée à part (l’Anamnese seule) : « à rejouer d’un trait, en entier », jamais « il te reste »', () => {
    const lecture = lectureDuPlan(jour([tache]), [partie('e1', ['anamnese'], 10)]).get('tu')!;
    expect(lecture.reste, 'le cas entier se rejoue : rien ne « reste »').toBeUndefined();
    expect(lecture.aRejouer).toBe(true);
    dans(<TaskLine task={tache} lecture={lecture} />);
    expect(screen.getByText(A_REJOUER).className).toMatch(/dim-tag/);
    expect(document.body.textContent).not.toMatch(/il te reste/i);
    expect(screen.getByText('52 min'), 'le temps du cas entier').toBeTruthy();
    expect(new URL(taskLink(tache, lecture.reste?.teile), 'http://x').searchParams.get('depart'), 'on repart du début').toBeNull();
  });

  it('les trois Teile joués séparément (I5) : le même libellé', () => {
    const evs = [partie('e1', ['anamnese'], 9), partie('e2', ['dokumentation'], 10), partie('e3', ['fallvorstellung'], 11)];
    const lecture = lectureDuPlan(jour([tache]), evs).get('tu')!;
    dans(<TaskLine task={tache} lecture={lecture} />);
    expect(screen.getByText(A_REJOUER)).toBeTruthy();
  });

  it('une tâche ordinaire entamée garde « il te reste … »', () => {
    const ordinaire: TaskInstance = { ...tache, id: 'to', kind: 'simulation', dUnTrait: undefined };
    const lecture = lectureDuPlan(jour([ordinaire]), [partie('e1', ['anamnese'], 10)]).get('to')!;
    expect(lecture.aRejouer).toBeUndefined();
    dans(<TaskLine task={ordinaire} lecture={lecture} />);
    expect(document.body.textContent).toMatch(/Il te reste la Dokumentation et la Fallvorstellung/);
    expect(screen.queryByText(A_REJOUER)).toBeNull();
  });
});

describe('l’accueil (TaskList) : le libellé une fois', () => {
  beforeEach(async () => {
    freezeAt(new Date(2026, 9, 21, 12, 0));
    refreshToday();
    await Promise.all([db.day_plans.clear(), db.training_events.clear()]);
  });

  it('entamée à part : la liste lit le plan figé et dit « à rejouer d’un trait, en entier » une seule fois', async () => {
    await db.day_plans.put(jour([tache]));
    await db.training_events.put(partie('e1', ['anamnese'], 10));
    dans(<TaskList tasks={[tache]} />);
    expect(await screen.findByText(A_REJOUER, {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getAllByText(A_REJOUER)).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/il te reste/i);
  });
});
