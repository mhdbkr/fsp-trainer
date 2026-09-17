// Minuteur de fermeture partagé entre AutoLinkText (survol du terme) et
// TermHoverCard (survol de la carte elle-même) : la carte ne doit pas se
// fermer quand la souris passe du lien à la carte. Un seul timer module-level
// suffit puisqu'une seule carte est montée à la fois (F2b D2/D3).
let closeTimer: ReturnType<typeof setTimeout> | null = null;

/** Programme la fermeture dans `ms` ; annule toute fermeture déjà programmée. */
export function armClose(fn: () => void, ms: number): void {
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(fn, ms);
}

/** Annule la fermeture programmée (la souris est repassée sur le lien ou la carte). */
export function disarmClose(): void {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}
