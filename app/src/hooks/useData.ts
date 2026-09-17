import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { buildLinkIndex } from '@/lib/autolink';

// Hooks de données réactifs (Dexie live queries). Tout re-render auto quand la
// base change (ex. après une simulation, les stats se mettent à jour seules).

export const useCases = () => useLiveQuery(() => db.cases.toArray(), [], undefined);
export const useCase = (id?: string) => useLiveQuery(() => (id ? db.cases.get(id) : undefined), [id], undefined);
export const useFachbegriffe = () => useLiveQuery(() => db.fachbegriffe.toArray(), [], undefined);
export const useDecks = () => useLiveQuery(() => db.decks.toArray(), [], undefined);
export const useDeckTerms = () => useLiveQuery(() => db.deck_terms.toArray(), [], undefined);
export const useFavorites = () => useLiveQuery(() => db.favorites.toArray(), [], undefined);
export const useFachwissenAll = () => useLiveQuery(() => db.fachwissen.toArray(), [], undefined);
export const useFachwissen = (id?: string) => useLiveQuery(() => (id ? db.fachwissen.get(id) : undefined), [id], undefined);
export const useAufklaerungen = () => useLiveQuery(() => db.aufklaerungen.toArray(), [], undefined);
export const useGuides = () => useLiveQuery(() => db.guides.toArray(), [], undefined);
/** Simulations du compte (un compte = une personne : D1, plus de filtre par profil). */
export const useSimulations = () => useLiveQuery(() => db.simulations.orderBy('date').reverse().toArray(), [], undefined);
export const usePlan = () => useLiveQuery(() => db.plan.toArray(), [], undefined);

/** Config du programme de révision (meta `program`).
 *  undefined = pas encore chargé, null = non configuré. */
export function useProgramConfig() {
  return useLiveQuery(async () => {
    const row = await db.meta.get('program');
    return (row?.value as import('@/db/types').ProgramConfig | undefined) ?? null;
  }, [], undefined);
}

/** Index de liens terme→glossaire, reconstruit quand les Fachbegriffe changent. */
export function useLinkIndex() {
  const begriffe = useFachbegriffe();
  return useMemo(() => buildLinkIndex(begriffe ?? []), [begriffe]);
}
