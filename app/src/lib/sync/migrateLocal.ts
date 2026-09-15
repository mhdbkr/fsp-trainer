import { db, getMeta, setMeta } from '@/db/db';
import { syncQueue } from './queue';
import type { NewEvent } from './events';

/** Convertit la progression de la bêta locale en événements (idempotent via meta 'migratedLocal'). */
export async function migrateLocalProgress(uid: string): Promise<{ events: number }> {
  if (await getMeta<boolean>('migratedLocal', false)) return { events: 0 };
  // réattribue ce qui a été produit en invité
  await db.progress_events.where('user_id').equals('local').modify({ user_id: uid });
  const toPush: NewEvent[] = [];
  for (const s of await db.simulations.toArray()) toPush.push({ type: 'simulation.completed', subject_id: s.caseId, payload: s, occurred_at: new Date(s.date).toISOString() });
  for (const fb of await db.fachbegriffe.toArray()) if (fb.srs && fb.srs.state !== 'Neu') toPush.push({ type: 'srs.reviewed', subject_id: fb.id, payload: fb.srs, occurred_at: new Date(fb.srs.dueDate || Date.now()).toISOString() });
  for (const c of await db.cases.toArray()) if (c.layerProgress) toPush.push({ type: 'case.layer_reached', subject_id: c.id, payload: { layer: c.layerProgress } });
  const metaKeys = (await db.meta.toCollection().primaryKeys()).map(String);
  for (const key of metaKeys.filter((k) => k.startsWith('program:'))) toPush.push({ type: 'program.configured', subject_id: null, payload: await getMeta(key, null) });
  // Bêta locale (avant suppression des profils) : `program:<oldProfileId>` doit
  // aussi devenir la config sous la clé unique 'program' — sinon un install
  // héritée perd son programme au passage au compte unique.
  const legacyProgramKey = metaKeys.find((k) => k.startsWith('program:'));
  if (legacyProgramKey && !(await db.meta.get('program'))) await setMeta('program', await getMeta(legacyProgramKey, null));
  for (const ev of toPush) await syncQueue.push(ev);
  await setMeta('migratedLocal', true);
  return { events: toPush.length };
}
