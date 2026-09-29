// Confirmation d'une carte (F4a D7/D10) — montée une fois dans Shell, ouverte
// par l'étoile, la mini-fiche de création, la corbeille et la gestion des decks.
import { create } from 'zustand';
import type { AnyTerm } from '@/lib/collections/allTerms';

export type CardToast =
  | { kind: 'saved'; term: AnyTerm; deckId: string; caseId?: string }
  | { kind: 'deleted'; term: AnyTerm }
  | { kind: 'deck-deleted'; deckId: string; name: string }
  | { kind: 'error'; message: string };

export const useCardToast = create<{ toast: CardToast | null; show: (t: CardToast) => void; hide: () => void }>((set) => ({
  toast: null,
  show: (toast) => set({ toast }),
  hide: () => set({ toast: null }),
}));
