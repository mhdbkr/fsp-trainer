const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])';

/** Piège de focus d'un dialogue : Tab boucle dans `root` (à brancher sur son onKeyDown). */
export function trapFocus(e: { key: string; shiftKey: boolean; preventDefault: () => void }, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const f = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1], at = document.activeElement;
  if (e.shiftKey && (at === first || at === root)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
}
