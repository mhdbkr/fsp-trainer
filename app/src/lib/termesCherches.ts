// S4-6 — « terme cherché » : un mot dont l'utilisateur a demandé le sens. Événement LOCAL, écrit dans Dexie et nulle
// part ailleurs : ni `progress_events`, ni outbox, ni serveur (spec 2026-10-04 « 5 · Historique »). Il ne se
// synchronise pas entre appareils, c'est assumé : il ne sert qu'au « cherché N fois » de l'Historique.
import { db } from '@/db/db';
import { now } from '@/lib/clock';
import { cleanSelection, PT_LIMITS } from '@/lib/collections/personalTerms';

export async function noterTermeCherche(selection: string): Promise<void> {
  const terme = cleanSelection(selection).slice(0, PT_LIMITS.term);
  if (terme) await db.termes_cherches.add({ at: now(), terme });
}
