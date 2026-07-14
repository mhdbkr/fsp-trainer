import { createPortal } from 'react-dom';

// Téléporte un overlay plein écran (modale, mode focus…) vers <body>.
// Indispensable : le wrapper `.reveal` des pages anime `transform`, ce qui fait
// de lui un containing block — un `position: fixed` rendu à l'intérieur se
// calerait sur la page au lieu du viewport. Via le portal, l'overlay vit hors
// de tout ancêtre transformé et couvre toujours l'écran entier.
export function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
