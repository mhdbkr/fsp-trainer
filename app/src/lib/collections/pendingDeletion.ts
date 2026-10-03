// ============================================================================
// Suppression différée d'une carte personnelle (F4a D10) ou d'un deck (F4b P6).
// Le journal est append-only : un « annuler » après émission remettrait le SRS
// à zéro. Donc : masquage LOCAL immédiat, événements planifiés au clic, émis
// d'un bloc à l'expiration du délai, au `pagehide` ou quand la page passe en
// arrière-plan (iOS tue souvent l'onglet sans `pagehide`). Annuler = rien
// n'est émis. Supprimer un deck ne supprime aucune carte.
// ============================================================================
import { create } from 'zustand';
import type { NewEvent } from '@/lib/sync/events';
import { commitPersonalDeletion, planPersonalDeletion } from './personalTerms';
import { commitCollectionEvents, planDeckDeletion } from './index';
import { useCardToast } from '@/store/cardToast';

export const DELETE_DELAY_MS = 5000;
type Kind = 'card' | 'deck';
interface Pending { events: NewEvent[]; kind: Kind; timer: ReturnType<typeof setTimeout>; committing: boolean }
const pending = new Map<string, Pending>();

/** Ids masqués en attente de suppression — cartes (lu par useAllTerms) et decks (onglets). */
export const usePendingDeletions = create<{ ids: ReadonlySet<string> }>(() => ({ ids: new Set() }));
const publish = () => usePendingDeletions.setState({ ids: new Set(pending.keys()) });

let listening = false;
export async function scheduleDeletion(id: string, delayMs = DELETE_DELAY_MS, kind: Kind = 'card'): Promise<void> {
  if (pending.has(id)) return;
  const events = kind === 'deck' ? planDeckDeletion(id) : await planPersonalDeletion(id);
  pending.set(id, { events, kind, committing: false, timer: setTimeout(() => { void commit(id); }, delayMs) });
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
  try {
    await (p.kind === 'deck' ? commitCollectionEvents(p.events) : commitPersonalDeletion(p.events));
    // La confirmation « Annuler » de CE terme / deck n'a plus de sens une fois émise (flush/expiration).
    const t = useCardToast.getState().toast;
    if (t && ((t.kind === 'deleted' && t.term.id === id) || (t.kind === 'deck-deleted' && t.deckId === id))) useCardToast.getState().hide();
  }
  catch { useCardToast.getState().show({ kind: 'error', message: 'Impossible de supprimer : réessaie.' }); }   // plus de rejet silencieux (revue B3 m3) ; message unifié avec GlossaryDrawer
  finally { pending.delete(id); publish(); }   // échec d'écriture : la carte réapparaît, rien de perdu
}

/** Émet tout ce qui attend (expiration anticipée : `pagehide`, page masquée). */
export async function flushDeletions(): Promise<void> {
  await Promise.all([...pending.keys()].map(commit));
}
