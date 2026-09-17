// Référence partagée vers le bouton ★ de la hover-card actuellement montée.
// Permet à AutoLinkText (Tab→Enter sur un lien) de déplacer le focus dans la
// carte sans que celle-ci ait besoin de voler le focus à l'ouverture (I1).
export const starRef: { current: HTMLButtonElement | null } = { current: null };

/** Déplace le focus sur le bouton ★ s'il est monté. */
export function focusStar(): void {
  starRef.current?.focus();
}
