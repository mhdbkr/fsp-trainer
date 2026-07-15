import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { buildLinkIndex } from '@/lib/autolink';
import { useProfiles, programKey } from '@/store/profile';

// Hooks de données réactifs (Dexie live queries). Tout re-render auto quand la
// base change (ex. après une simulation, les stats se mettent à jour seules).

export const useCases = () => useLiveQuery(() => db.cases.toArray(), [], undefined);
export const useCase = (id?: string) => useLiveQuery(() => (id ? db.cases.get(id) : undefined), [id], undefined);
export const useFachbegriffe = () => useLiveQuery(() => db.fachbegriffe.toArray(), [], undefined);
export const useFachwissenAll = () => useLiveQuery(() => db.fachwissen.toArray(), [], undefined);
export const useFachwissen = (id?: string) => useLiveQuery(() => (id ? db.fachwissen.get(id) : undefined), [id], undefined);
export const useAufklaerungen = () => useLiveQuery(() => db.aufklaerungen.toArray(), [], undefined);
export const useGuides = () => useLiveQuery(() => db.guides.toArray(), [], undefined);
/** Simulations DU PROFIL ACTIF (stats/streak/confiance sont par profil). */
export const useSimulations = () => {
  const activeId = useProfiles((s) => s.activeId);
  return useLiveQuery(
    () => db.simulations.orderBy('date').reverse().toArray().then((a) => a.filter((s) => s.profileId === activeId)),
    [activeId], undefined,
  );
};
export const usePlan = () => useLiveQuery(() => db.plan.toArray(), [], undefined);

/** Config du programme de révision DU PROFIL ACTIF (meta `program:<id>`).
 *  undefined = pas encore chargé, null = non configuré pour ce profil. */
export function useProgramConfig() {
  const activeId = useProfiles((s) => s.activeId);
  return useLiveQuery(async () => {
    if (!activeId) return undefined;
    const row = await db.meta.get(programKey(activeId));
    return (row?.value as import('@/db/types').ProgramConfig | undefined) ?? null;
  }, [activeId], undefined);
}

/** Index de liens terme→glossaire, reconstruit quand les Fachbegriffe changent. */
export function useLinkIndex() {
  const begriffe = useFachbegriffe();
  return useMemo(() => buildLinkIndex(begriffe ?? []), [begriffe]);
}
