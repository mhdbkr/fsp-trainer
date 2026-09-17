// Construit le contexte de pertinence et le budget du jour depuis la base du compte.
import { db } from '@/db/db';
import type { Case, Fachbegriff, ProgramConfig, Simulation, Specialty } from '@/db/types';
import type { RelevanceContext } from './relevance';
import { newBudget, remainingToday, retention7d } from '@/lib/srsBudget';
import { isNew } from '@/lib/srs';
import { generateProgram, workingDaysUntilExam } from '@/lib/program';

export interface DrillContext { relevance: RelevanceContext; budget: number; remaining: number }

/** Cas et spécialité du PROGRAMME du jour (spec F2a D3 : +40 / +20). Le programme
 *  réel est calculé à la volée par `generateProgram` (`db.plan` n'est qu'une table
 *  de démo, vidée à la connexion) ; sans config, rien n'est « du jour ». */
export function todayProgramContext(
  config: ProgramConfig | undefined | null,
  data: { cases: Case[]; sims: Simulation[]; begriffe: Fachbegriff[] },
  now = new Date(),
): { todayCaseIds: string[]; todaySpecialty?: Specialty } {
  if (!config) return { todayCaseIds: [] };
  const today = generateProgram(config, data, 1, now)[0];
  const sims = (today?.blocks ?? []).filter((b) => b.kind === 'simulation' && b.caseId);
  return { todayCaseIds: [...new Set(sims.map((b) => b.caseId!))], todaySpecialty: sims[0]?.specialty };
}

export async function loadDrillContext(now = new Date()): Promise<DrillContext> {
  const [favorites, deckTerms, allSims, cases, begriffe, events, config] = await Promise.all([
    db.favorites.toArray(),
    db.deck_terms.toArray(),
    db.simulations.toArray(),
    db.cases.toArray(),
    db.fachbegriffe.toArray(),
    db.progress_events.toArray(),
    db.meta.get('program').then((m) => m?.value as ProgramConfig | undefined),
  ]);

  const sims = [...allSims].sort((a, b) => b.date - a.date).slice(0, 30);
  const { todayCaseIds, todaySpecialty } = todayProgramContext(config, { cases, sims: allSims, begriffe }, now);

  const relevance: RelevanceContext = {
    now: now.getTime(),
    favorites,
    deckTerms,
    recentSimulations: sims.map((s) => ({ caseId: s.caseId, date: s.date })),
    todayCaseIds,
    todaySpecialty,
    cases: cases.map((c) => ({ id: c.id, name: c.name, linkedFachbegriffeIds: c.linkedFachbegriffeIds })),
  };

  const budget = newBudget({
    freshRemaining: begriffe.filter((b) => isNew(b.srs)).length,
    workingDaysToExam: config?.examDate ? workingDaysUntilExam(config.examDate, now, config) : null,
    retention7d: retention7d(events, now.getTime()),
  });

  return { relevance, budget, remaining: await remainingToday(budget, now) };
}
