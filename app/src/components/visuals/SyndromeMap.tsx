import { useState } from 'react';
import type { SyndromeMapData } from '@/data/fachwissenVisuals/types';
import { NodeBox, ToneMark, toneClasses } from './primitives';
import { AutoLinkList } from '@/components/AutoLink';

// ============================================================================
// syndrome-map — centre + rayons. Contrat §1.5, §6 : ≥ 768 px, disposition en
// étoile via grille CSS (pas de SVG pour le texte) ; les items de chaque rayon
// sont visibles par défaut (desktop ET mobile, dans un `<ul>` sémantique) ;
// clic sur un rayon = mise en évidence (`data-active`), grise les autres
// (`motion-safe:transition`).
// ============================================================================

/** Positions grille 3x3 autour du centre (colonne 2, ligne 2), 6 rayons max. */
const SPOKE_POSITION_CLASSES = [
  'md:col-start-2 md:row-start-1',
  'md:col-start-3 md:row-start-2',
  'md:col-start-2 md:row-start-3',
  'md:col-start-1 md:row-start-2',
  'md:col-start-1 md:row-start-1',
  'md:col-start-3 md:row-start-1',
];

export function SyndromeMap({ block }: { block: { data: SyndromeMapData } }) {
  const { center, spokes } = block.data;
  const [active, setActive] = useState<number | null>(null);

  // < 3 rayons : rien à rendre (contrat §1.5, spokes 3 à 6).
  if (spokes.length < 3) return null;

  return (
    <div>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-3 md:grid-rows-3">
        <div className="hidden md:col-start-2 md:row-start-2 md:block">
          <NodeBox variant="question" className="text-center text-sm font-medium">
            {center}
          </NodeBox>
        </div>
        {spokes.map((spoke, i) => {
          const posClass = SPOKE_POSITION_CLASSES[i % SPOKE_POSITION_CLASSES.length];
          const isActive = active === i;
          return (
            <div
              key={spoke.label}
              data-active={isActive || undefined}
              className={`rounded-lg border p-2 text-sm motion-safe:transition-opacity ${posClass} ${
                toneClasses(spoke.tone).box
              } ${active !== null && !isActive ? 'opacity-40' : 'opacity-100'}`}
            >
              <button
                type="button"
                data-active={isActive || undefined}
                onClick={() => setActive((prev) => (prev === i ? null : i))}
                className="flex w-full items-center gap-1.5 text-left font-medium"
              >
                {spoke.tone === 'signal' || spoke.tone === 'warn' ? <ToneMark tone={spoke.tone} /> : null}
                {spoke.label}
              </button>
              <AutoLinkList
                items={spoke.items.map((item) => item.text)}
                className="mt-1 space-y-1 pl-4 text-sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
