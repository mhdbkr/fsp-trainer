// Construit le contexte de pertinence et le budget du jour depuis la base du compte.
import { db } from '@/db/db';
import type { ProgramConfig } from '@/db/types';
import type { RelevanceContext } from './relevance';
import { dayKey, newBudget, remainingToday, retention7d } from '@/lib/srsBudget';
import { isNew } from '@/lib/srs';
import { workingDaysUntilExam } from '@/lib/program';

export async function loadDrillContext(now = new Date()): Promise<{ relevance: RelevanceContext; budget: number; remaining: number }> {
  const [favorites, deckTerms, sims, plan, cases, begriffe, events, config] = await Promise.all([
    db.favorites.toArray(),
    db.deck_terms.toArray(),
    db.simulations.orderBy('date').reverse().limit(30).toArray(),
    db.plan.toArray(),
    db.cases.toArray(),
    db.fachbegriffe.toArray(),
    db.progress_events.toArray(),
    db.meta.get('program').then((m) => m?.value as ProgramConfig | undefined),
  ]);

  const key = dayKey(now);
  const today = plan.filter((p) => p.date === key && p.caseId);
  const todayCaseIds = today.map((p) => p.caseId!);
  const todaySpecialty = cases.find((c) => c.id === todayCaseIds[0])?.specialty;

  const relevance: RelevanceContext = {
    now: now.getTime(),
    favorites,
    deckTerms,
    recentSimulations: sims.map((s) => ({ caseId: s.caseId, date: s.date })),
    todayCaseIds,
    todaySpecialty,
    cases: cases.map((c) => ({ id: c.id, linkedFachbegriffeIds: c.linkedFachbegriffeIds })),
  };

  const budget = newBudget({
    freshRemaining: begriffe.filter((b) => isNew(b.srs)).length,
    workingDaysToExam: config?.examDate ? workingDaysUntilExam(config.examDate, now, config) : null,
    retention7d: retention7d(events, now.getTime()),
  });

  return { relevance, budget, remaining: await remainingToday(budget, now) };
}
