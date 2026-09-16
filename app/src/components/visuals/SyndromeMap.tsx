import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { SyndromeMapData } from '@/data/fachwissenVisuals/types';
import { NodeBox, ToneMark, toneClasses } from './primitives';
import { AutoLinkList } from '@/components/AutoLink';

// ============================================================================
// syndrome-map — centre + rayons. Contrat §1.5, §6 : ≥ 768 px, disposition en
// étoile via grille CSS (pas de SVG pour le texte) ; en dessous, liste
// accordéon toujours rendue ; clic sur un rayon = `data-active`, grise les
// autres (`motion-safe:transition`).
// ============================================================================

/** Positions grille 3x3 autour du centre (colonne 2, ligne 2), 6 rayons max. */
const SPOKE_POSITIONS: CSSProperties[] = [
  { gridColumn: 2, gridRow: 1 },
  { gridColumn: 3, gridRow: 2 },
  { gridColumn: 2, gridRow: 3 },
  { gridColumn: 1, gridRow: 2 },
  { gridColumn: 1, gridRow: 1 },
  { gridColumn: 3, gridRow: 1 },
];

export function SyndromeMap({ block }: { block: { data: SyndromeMapData } }) {
  const { center, spokes } = block.data;
  const [active, setActive] = useState<number | null>(null);

  // < 3 rayons : rien à rendre (contrat §1.5, spokes 3 à 6).
  if (spokes.length < 3) return null;

  return (
    <div>
      <div
        className="hidden gap-2 md:grid"
        style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gridTemplateRows: 'repeat(3, auto)' }}
      >
        <div style={{ gridColumn: 2, gridRow: 2 }}>
          <NodeBox variant="question" className="text-center text-sm font-medium">
            {center}
          </NodeBox>
        </div>
        {spokes.map((spoke, i) => {
          const pos = SPOKE_POSITIONS[i % SPOKE_POSITIONS.length];
          const isActive = active === i;
          return (
            <button
              key={spoke.label}
              type="button"
              data-active={isActive || undefined}
              style={pos}
              onClick={() => setActive((prev) => (prev === i ? null : i))}
              className={`rounded-lg border p-2 text-left text-sm motion-safe:transition-opacity ${
                toneClasses(spoke.tone).box
              } ${active !== null && !isActive ? 'opacity-40' : 'opacity-100'}`}
            >
              <span className="flex items-center gap-1.5 font-medium">
                {spoke.tone === 'signal' || spoke.tone === 'warn' ? <ToneMark tone={spoke.tone} /> : null}
                {spoke.label}
              </span>
            </button>
          );
        })}
      </div>
      <ul className="mt-3 space-y-1.5">
        {spokes.map((spoke, i) => (
          <li key={spoke.label}>
            <details open={active === i}>
              <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
                {spoke.tone === 'signal' || spoke.tone === 'warn' ? <ToneMark tone={spoke.tone} /> : null}
                {spoke.label}
              </summary>
              <AutoLinkList
                items={spoke.items.map((item) => item.text)}
                className="mt-1 space-y-1 pl-4 text-sm"
              />
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
