// Construit le contexte de pertinence et le budget du jour depuis la base du compte.
import { db } from '@/db/db';
import type { Case, DayPlan, Fachbegriff, ProgramConfig, Simulation, Specialty } from '@/db/types';
import type { RelevanceContext } from './relevance';
import { newBudget, remainingToday, retention7d, reviewedToday } from '@/lib/srsBudget';
import { isNew } from '@/lib/srs';
import { workingDaysUntilExam } from '@/lib/program';
import { todayKey } from '@/lib/clock';
import { getSrsSettings, effectiveDaily, type SrsSettings } from '@/lib/srsSettings';
import { usePendingDeletions } from './pendingDeletion';

export interface DrillContext {
  relevance: RelevanceContext;
  budget: number;
  remaining: number;
  settings: SrsSettings;
  daily: ReturnType<typeof effectiveDaily>;
  /** Ce que donnerait le mode Automatique aujourd'hui, quel que soit le mode
   *  enregistré — pour l'aperçu chiffré de la feuille de réglages. */
  autoDaily: ReturnType<typeof effectiveDaily>;
  reviewsRemaining: number;
}

/** Cas et spécialité du PLAN FIGÉ du jour (spec F2a D3 : +40 / +20). Le plan
 *  n'est plus recalculé au vol : il est matérialisé une fois et lu ici. Un jour
 *  non ouvert n'a pas de plan — rien n'est « du jour ». */
export function todayProgramContext(plan: DayPlan | undefined | null): { todayCaseIds: string[]; todaySpecialty?: Specialty } {
  const sims = (plan?.tasks ?? []).filter((t) => t.kind === 'simulation' && t.caseId);
  return { todayCaseIds: [...new Set(sims.map((t) => t.caseId!))], todaySpecialty: sims[0]?.specialty };
}

export async function loadDrillContext(now = new Date()): Promise<DrillContext> {
  const [favorites, deckTerms, allSims, cases, begriffe, personalTerms, events, config, settings] = await Promise.all([
    db.favorites.toArray(),
    db.deck_terms.toArray(),
    db.simulations.toArray(),
    db.cases.toArray(),
    db.fachbegriffe.toArray(),
    db.personal_terms.toArray(),
    db.progress_events.toArray(),
    db.meta.get('program').then((m) => m?.value as ProgramConfig | undefined),
    getSrsSettings(),
  ]);
  const todayPlan = await db.day_plans.get(todayKey());

  // Une carte en attente de suppression (masquage local, F4a D10) reste 5 s
  // dans `db.personal_terms` : une session lancée pendant ce délai ne doit
  // pas la compter (revue B3).
  const pendingIds = usePendingDeletions.getState().ids;
  const livePersonalTerms = pendingIds.size ? personalTerms.filter((p) => !pendingIds.has(p.id)) : personalTerms;

  const sims = [...allSims].sort((a, b) => b.date - a.date).slice(0, 30);
  const { todayCaseIds, todaySpecialty } = todayProgramContext(todayPlan);

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
    // Source unique du drill (F3 §3.1) : un terme personnel neuf compte aussi
    // dans le budget, sinon une carte fraîchement étoilée n'obtient jamais sa
    // place du jour (affamée par un budget calculé sur le seul glossaire).
    freshRemaining: begriffe.filter((b) => isNew(b.srs)).length + livePersonalTerms.filter((p) => isNew(p.srs)).length,
    workingDaysToExam: config?.examDate ? workingDaysUntilExam(config.examDate, now, config) : null,
    retention7d: retention7d(events, now.getTime()),
  });
  const intensity = config?.intensity ?? 'mittel';
  const autoDaily = effectiveDaily({ mode: 'auto' }, { budget, intensity });
  const daily = settings.mode === 'auto' ? autoDaily : effectiveDaily(settings, { budget, intensity });

  const [remaining, reviewed] = await Promise.all([remainingToday(daily.newPerDay, now), reviewedToday(now)]);
  const reviewsRemaining = Math.max(0, daily.maxReviewsPerDay - reviewed);

  return { relevance, budget, remaining, settings, daily, autoDaily, reviewsRemaining };
}
