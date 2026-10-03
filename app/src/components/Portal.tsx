import { createPortal } from 'react-dom';

// Téléporte un overlay (modale, mode focus, menu flottant…) vers <body>.
// Raison : tout ancêtre transformé, filtré ou en `backdrop-filter` devient un
// containing block (un `position: fixed` s'y calerait au lieu du viewport) et
// une « backdrop root » (un verre imbriqué n'y floute plus rien). Via le
// portal, l'overlay vit hors de ces ancêtres (barre en verre, cartes) et couvre toujours l'écran entier.
export function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
