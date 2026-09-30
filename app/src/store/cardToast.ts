// Confirmation d'une carte (F4a D7/D10) — montée une fois dans Shell, ouverte
// par l'étoile, la mini-fiche de création, la corbeille et la gestion des decks.
import { create } from 'zustand';
import type { AnyTerm } from '@/lib/collections/allTerms';

export type CardToast =
  | { kind: 'saved'; term: AnyTerm; deckId: string; caseId?: string }
  | { kind: 'deleted'; term: AnyTerm }
  | { kind: 'deck-deleted'; deckId: string; name: string }
  | { kind: 'error'; message: string };

/** `focus` : la pilule prend le focus à l'apparition (après « Créer » : la mini-fiche qui l'avait disparaît). */
export const useCardToast = create<{ toast: CardToast | null; focus: boolean; show: (t: CardToast, opts?: { focus?: boolean }) => void; hide: () => void }>((set) => ({
  toast: null,
  focus: false,
  show: (toast, opts) => set({ toast, focus: !!opts?.focus }),
  hide: () => set({ toast: null, focus: false }),
}));
