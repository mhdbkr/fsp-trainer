import type { Case, DeckTerm, Fachbegriff, Favorite, Specialty } from '@/db/types';
import { sortDe } from '@/features/fachbegriffe/letters';

const H48 = 48 * 3600_000;
const D7 = 7 * 24 * 3600_000;

export interface RelevanceContext {
  now: number;
  favorites: Favorite[];
  deckTerms: DeckTerm[];
  recentSimulations: { caseId: string; date: number }[];
  todayCaseIds: string[];
  todaySpecialty?: Specialty;
  cases: Pick<Case, 'id' | 'linkedFachbegriffeIds'>[];
}

/** Points de pertinence d'un terme NEU (spec F2a 3.3). Les dus ne passent pas par ici. */
export function relevanceScore(term: Fachbegriff, ctx: RelevanceContext): number {
  let s = 0;
  const fav = ctx.favorites.find((f) => f.termId === term.id);
  if (fav && ctx.now - Date.parse(fav.since) < H48) s += 100;
  if (ctx.deckTerms.some((d) => d.termId === term.id && ctx.now - Date.parse(d.addedAt) < H48)) s += 80;
  const casesOf = ctx.cases.filter((c) => c.linkedFachbegriffeIds.includes(term.id)).map((c) => c.id);
  let simBest = 0;
  for (const sim of ctx.recentSimulations) {
    if (casesOf.includes(sim.caseId)) {
      const age = ctx.now - sim.date;
      if (age >= 0 && age < D7) simBest = Math.max(simBest, 60 * (1 - age / D7));
    }
  }
  s += simBest;
  if (ctx.todayCaseIds.some((id) => casesOf.includes(id))) s += 40;
  if (ctx.todaySpecialty && term.specialty === ctx.todaySpecialty) s += 20;
  return s;
}

export function sortByRelevance(terms: Fachbegriff[], ctx: RelevanceContext): Fachbegriff[] {
  const score = new Map(terms.map((t) => [t.id, relevanceScore(t, ctx)]));
  return [...terms].sort((a, b) => score.get(b.id)! - score.get(a.id)! || sortDe(a, b));
}
