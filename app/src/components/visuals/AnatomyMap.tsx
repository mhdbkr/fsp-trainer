import { useRef, useState, type KeyboardEvent } from 'react';
import type { AnatomyMapData, Source } from '@/data/fachwissenVisuals/types';
import { FIGURE_SILHOUETTES, FIGURE_VIEWBOX, REGION_ANCHORS } from '@/data/fachwissenVisuals/anatomyFigures';
import { ToneMark, toneClasses } from './primitives';
import { AutoLink } from '@/components/AutoLink';

const TONE_TEXT_SUFFIX: Record<string, string> = {
  signal: 'Notfall',
  warn: 'Vorsicht',
};

// ============================================================================
// anatomy-map — silhouette cliquable. Contrat §1.3, §6 : SVG role="img" +
// <title> décoratif seul ; chaque hotspot est un <button> HTML (pas un
// <path onClick>) ; flèches gauche/droite déplacent sélection ET focus ;
// panneau <p aria-live="polite"> hors SVG ; liste textuelle toujours rendue.
// ============================================================================

/** Libellé lisible d'une provenance — jamais de texte recopié hors fiche. */
function sourceLabel(source: Source): string {
  if (source === 'ergänzt') return 'Ergänzt';
  if ('text' in source) return source.text;
  if ('label' in source) return `Therapie: ${source.label}`;
  if ('name' in source) return `Klassifikation: ${source.name}`;
  if ('stufe' in source) return `Diagnostik: ${source.stufe}`;
  if ('dd' in source) return `DD: ${source.dd}`;
  return source.section === 'prognose' ? 'Prognose' : 'Ätiologie';
}

export function AnatomyMap({ block }: { block: { data: AnatomyMapData } }) {
  const { hotspots, figure } = block.data;
  const [selected, setSelected] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // < 2 hotspots : rien à rendre (contrat §1.3, AnatomyMapData.hotspots ≥ 2).
  if (hotspots.length < 2) return null;

  const move = (delta: number) => {
    setSelected((prev) => {
      const next = (prev + delta + hotspots.length) % hotspots.length;
      buttonRefs.current[next]?.focus();
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    }
  };

  const silhouette = FIGURE_SILHOUETTES[figure];
  const current = hotspots[selected];

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
      <svg
        role="img"
        viewBox={FIGURE_VIEWBOX}
        className="w-full max-w-[220px] text-slate-400 dark:text-slate-600"
      >
        <title>{`Anatomische Silhouette (${figure})`}</title>
        <g fill="none" stroke="currentColor" strokeWidth={1.5}>
          {silhouette.circles.map((c, i) => (
            <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="currentColor" fillOpacity={0.1} />
          ))}
          {silhouette.paths.map((d, i) => (
            <path key={i} d={d} fill="none" />
          ))}
        </g>
        {/* Les cercles sont aria-hidden : le <button> HTML est la cible d'interaction ;
            un clic sur le cercle exécute le même handler, sans déplacer le focus. */}
        <g aria-hidden="true">
          {hotspots.map((hotspot, i) => {
            const anchor = REGION_ANCHORS[hotspot.region];
            const tone = hotspot.tone ?? 'accent';
            const isSelected = i === selected;
            return (
              <g
                key={hotspot.region}
                onClick={() => setSelected(i)}
                className="cursor-pointer motion-safe:transition-opacity"
              >
                {isSelected ? (
                  <circle
                    cx={anchor.x}
                    cy={anchor.y}
                    r={9}
                    fill="none"
                    className={toneClasses(tone).text}
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                ) : null}
                <circle cx={anchor.x} cy={anchor.y} r={5} className={toneClasses(tone).text} fill="currentColor" />
                {/* Contraste ≥ 4,5:1 (I3) : pastille pleine ink derrière le chiffre paper,
                    plutôt qu'un texte de 8 px directement sur le fond. Rayon ≈ 11 px équivalent viewBox. */}
                <circle cx={anchor.x} cy={anchor.y - 12} r={7} className="fill-ink" />
                <text
                  x={anchor.x}
                  y={anchor.y - 12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-mono text-[9px] font-semibold"
                >
                  {String(i + 1).padStart(2, '0')}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div>
        <ul className="space-y-1">
          {hotspots.map((hotspot, i) => {
            const isSelected = i === selected;
            const tone = hotspot.tone;
            const suffix = tone ? TONE_TEXT_SUFFIX[tone] : undefined;
            const label = suffix ? `${hotspot.label} — ${suffix}` : hotspot.label;
            return (
              <li key={hotspot.region}>
                <button
                  ref={(el) => {
                    buttonRefs.current[i] = el;
                  }}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={label}
                  onClick={() => setSelected(i)}
                  onKeyDown={onKeyDown}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-sm motion-safe:transition-colors sm:min-h-0 ${
                    isSelected ? toneClasses(hotspot.tone ?? 'accent').box : 'border-transparent'
                  }`}
                >
                  <span className="font-mono text-xs opacity-70">{String(i + 1).padStart(2, '0')}</span>
                  {suffix ? <ToneMark tone={tone} /> : null}
                  <span>{hotspot.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p aria-live="polite" className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {current ? (
            <>
              <strong>{current.label}</strong>
              {' — '}
              <AutoLink>{sourceLabel(current.source)}</AutoLink>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
