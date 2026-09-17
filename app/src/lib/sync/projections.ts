import { db } from '@/db/db';
import type { Simulation, Srs, Layer } from '@/db/types';
import type { ProgressEvent } from './events';
import { projectCollections, writeCollections } from '@/lib/collections/project';

export function latestSrs(events: ProgressEvent[], fachbegriffId: string): Srs | null {
  let best: ProgressEvent | null = null;
  for (const e of events) if (e.type === 'srs.reviewed' && e.subject_id === fachbegriffId && (!best || e.occurred_at > best.occurred_at)) best = e;
  return best ? (best.payload as Srs) : null;
}
export const simulationsFrom = (events: ProgressEvent[]): Simulation[] =>
  events.filter((e) => e.type === 'simulation.completed').map((e) => e.payload as Simulation);

/** Reconstruit les tables dérivées depuis le journal (après un pull). */
export async function rebuildProjections(): Promise<void> {
  const events = await db.progress_events.toArray();
  const sims = simulationsFrom(events);
  await db.simulations.bulkPut(sims);
  // SRS : dernier état par terme
  const byTerm = new Map<string, ProgressEvent>();
  for (const e of events) if (e.type === 'srs.reviewed' && e.subject_id) { const p = byTerm.get(e.subject_id); if (!p || e.occurred_at > p.occurred_at) byTerm.set(e.subject_id, e); }
  await db.transaction('rw', db.fachbegriffe, async () => {
    for (const [id, e] of byTerm) { const fb = await db.fachbegriffe.get(id); if (fb) await db.fachbegriffe.update(id, { srs: e.payload as Srs }); }
  });
  // Couche atteinte par cas : max
  const layerByCase = new Map<string, Layer>();
  for (const e of events) if (e.type === 'case.layer_reached' && e.subject_id) layerByCase.set(e.subject_id, Math.max(layerByCase.get(e.subject_id) ?? 0, (e.payload as { layer: Layer }).layer) as Layer);
  await db.transaction('rw', db.cases, async () => { for (const [id, layer] of layerByCase) await db.cases.update(id, { layerProgress: layer }); });
  // Collections Fachbegriffe (F1) : favoris, decks, termes de decks
  await writeCollections(projectCollections(events));
}
