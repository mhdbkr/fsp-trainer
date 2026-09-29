// ============================================================================
// Suppression différée d'une carte personnelle (F4a D10). Le journal est
// append-only : un « annuler » après émission remettrait le SRS à zéro. Donc :
// masquage LOCAL immédiat, événements planifiés au clic, émis d'un bloc à
// l'expiration du délai, au `pagehide` ou quand la page passe en arrière-plan
// (iOS tue souvent l'onglet sans `pagehide`). Annuler = rien n'est émis.
// ============================================================================
import { create } from 'zustand';
import type { NewEvent } from '@/lib/sync/events';
import { commitPersonalDeletion, planPersonalDeletion } from './personalTerms';

export const DELETE_DELAY_MS = 5000;
interface Pending { events: NewEvent[]; timer: ReturnType<typeof setTimeout>; committing: boolean }
const pending = new Map<string, Pending>();

/** Ids masqués en attente de suppression (lu par useAllTerms). */
export const usePendingDeletions = create<{ ids: ReadonlySet<string> }>(() => ({ ids: new Set() }));
const publish = () => usePendingDeletions.setState({ ids: new Set(pending.keys()) });

let listening = false;
export async function scheduleDeletion(id: string, delayMs = DELETE_DELAY_MS): Promise<void> {
  if (pending.has(id)) return;
  const events = await planPersonalDeletion(id);
  pending.set(id, { events, committing: false, timer: setTimeout(() => { void commit(id); }, delayMs) });
  publish();
  if (!listening && typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { void flushDeletions(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flushDeletions(); });
    listening = true;
  }
}

/** Annule avant émission. Faux si trop tard (déjà en cours d'émission) ou inconnu. */
export function cancelDeletion(id: string): boolean {
  const p = pending.get(id);
  if (!p || p.committing) return false;
  clearTimeout(p.timer); pending.delete(id); publish();
  return true;
}

async function commit(id: string): Promise<void> {
  const p = pending.get(id);
  if (!p || p.committing) return;
  p.committing = true; clearTimeout(p.timer);
  try { await commitPersonalDeletion(p.events); }
  finally { pending.delete(id); publish(); }   // échec d'écriture : la carte réapparaît, rien de perdu
}

/** Émet tout ce qui attend (expiration anticipée : `pagehide`, page masquée). */
export async function flushDeletions(): Promise<void> {
  await Promise.all([...pending.keys()].map(commit));
}
