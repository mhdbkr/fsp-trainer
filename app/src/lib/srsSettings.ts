// ============================================================================
// Réglages quotidiens du SRS (spec F2b D5/D6) : auto (budget × intensité) ou
// manuel (nouveaux/jour, plafond de dus présentés). Par personne, synchronisés
// via l'événement srs.settings_changed ; projection = meta['srs.settings'].
// ============================================================================
import { getMeta, setMeta } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { Intensity } from '@/db/types';
import { sortEvents } from '@/lib/collections/project';
import { INTENSITY_FACTOR } from '@/lib/intensity';
// Import paresseux : évite de tirer le module de synchronisation (et sa
// dépendance à l'auth/aux variables d'env) dans les usages purs de projection
// (rebuildProjections, tests sans .env) qui n'émettent jamais d'événement.

export interface SrsSettings { mode: 'auto' | 'manual'; newPerDay?: number; maxReviewsPerDay?: number }
export const SRS_LIMITS = { newPerDay: [0, 50], maxReviewsPerDay: [0, 200] } as const;
export const DEFAULT_SRS_SETTINGS: SrsSettings = { mode: 'auto' };
export const SRS_SETTINGS_KEY = 'srs.settings';

const clamp = (v: unknown, [lo, hi]: readonly [number, number]) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined);
export function sanitize(p: unknown): SrsSettings {
  const o = (p ?? {}) as Record<string, unknown>;
  if (o.mode !== 'auto' && o.mode !== 'manual') return DEFAULT_SRS_SETTINGS;
  const s: SrsSettings = { mode: o.mode };
  const n = clamp(o.newPerDay, SRS_LIMITS.newPerDay); if (n !== undefined) s.newPerDay = n;
  const m = clamp(o.maxReviewsPerDay, SRS_LIMITS.maxReviewsPerDay); if (m !== undefined) s.maxReviewsPerDay = m;
  return s;
}
export function projectSrsSettings(events: ProgressEvent[]): SrsSettings {
  const changes = sortEvents(events).filter((e) => e.type === 'srs.settings_changed');
  const last = changes[changes.length - 1];
  return last ? sanitize(last.payload) : DEFAULT_SRS_SETTINGS;
}
const INTENSITY_LABEL: Record<Intensity, string> = { leicht: 'léger', mittel: 'moyen', intensiv: 'intensif' };

/** Réglages EFFECTIFS du jour (spec F2b D5/D6) : auto = budget (newBudget) ×
 *  intensité du programme, borné par SRS_LIMITS ; manuel = valeurs stockées
 *  (défauts 10 nouveaux/jour, 200 dus/jour si absentes). */
export function effectiveDaily(
  s: SrsSettings,
  auto: { budget: number; intensity: Intensity },
): { newPerDay: number; maxReviewsPerDay: number; source: 'auto' | 'manual'; explain: string } {
  if (s.mode === 'manual') {
    return { newPerDay: s.newPerDay ?? 10, maxReviewsPerDay: s.maxReviewsPerDay ?? 200, source: 'manual', explain: 'manuel' };
  }
  const newPerDay = Math.max(SRS_LIMITS.newPerDay[0], Math.min(SRS_LIMITS.newPerDay[1], Math.round(auto.budget * INTENSITY_FACTOR[auto.intensity])));
  return { newPerDay, maxReviewsPerDay: 200, source: 'auto', explain: `auto : ${newPerDay}/jour = ${auto.budget} × ${INTENSITY_LABEL[auto.intensity]}` };
}

export const getSrsSettings = () => getMeta<SrsSettings>(SRS_SETTINGS_KEY, DEFAULT_SRS_SETTINGS);
export async function setSrsSettings(s: SrsSettings): Promise<void> {
  const clean = sanitize(s);
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'srs.settings_changed', subject_id: 'srs', payload: clean });
  await setMeta(SRS_SETTINGS_KEY, clean);
}
