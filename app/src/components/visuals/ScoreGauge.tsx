import { useMemo, useState } from 'react';
import type { Fachwissen } from '@/db/types';
import type { ScoreGaugeData, VisualBlock } from '@/data/fachwissenVisuals/types';
import { resolveRef } from '@/data/fachwissenVisuals/resolve';
import { AutoLink } from '@/components/AutoLink';
import { Readout, ToneMark, toneClasses } from './primitives';

interface ScoreGaugeProps {
  block: VisualBlock & { kind: 'score-gauge'; data: ScoreGaugeData };
  fw: Fachwissen;
}

/** Bande couvrant `value` (dernière bande si `value` dépasse tous les max). */
function bandFor(data: ScoreGaugeData, value: number) {
  return data.bands.find((b) => value >= b.min && value <= b.max) ?? data.bands[data.bands.length - 1];
}

/** Bande la plus grave (signal en priorité, sinon la dernière dans l'ordre). */
function signalBand(data: ScoreGaugeData) {
  return data.bands.find((b) => b.tone === 'signal') ?? data.bands[data.bands.length - 1];
}

export function ScoreGauge({ block, fw }: ScoreGaugeProps) {
  const { data } = block;
  const unit = data.unit ?? 'Punkte';
  const minTotal = data.bands.length > 0 ? data.bands[0].min : 0;

  const [selection, setSelection] = useState<number[]>(() =>
    data.criteria.map((c) => (data.interactive ? c.points[0] : c.points[c.points.length - 1])),
  );

  const total = data.interactive
    ? selection.reduce((sum, v) => sum + v, 0)
    : data.criteria.reduce((sum, c) => sum + c.points[c.points.length - 1], 0);

  const active = useMemo(() => bandFor(data, data.criteria.length > 0 ? total : minTotal), [data, total, minTotal]);
  const signal = useMemo(() => signalBand(data), [data]);

  const klassifikationName = data.score.ref.name;
  const resolved = resolveRef(fw, data.score.ref);
  const inhalt = resolved && resolved.section === 'klassifikation' ? resolved.value.inhalt : undefined;

  function handleSelect(criterionIndex: number, value: number) {
    setSelection((prev) => prev.map((v, i) => (i === criterionIndex ? value : v)));
  }

  function handleReset() {
    setSelection(data.criteria.map((c) => c.points[0]));
  }

  const gaugeMin = data.bands.length > 0 ? data.bands[0].min : 0;
  const gaugeMax = data.bands.length > 0 ? data.bands[data.bands.length - 1].max : 0;
  const currentValue = data.criteria.length > 0 ? total : gaugeMin;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold">{data.score.name}</span>
          {data.criteria.length > 0 && (
            <span data-testid="score-total">
              <Readout value={total} unit={unit} tone={active.tone} />
            </span>
          )}
        </div>
        {inhalt && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <AutoLink>{inhalt}</AutoLink>
          </p>
        )}
        {!inhalt && (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            <AutoLink>{klassifikationName}</AutoLink>
          </p>
        )}
      </div>

      {data.criteria.length > 0 && data.interactive && (
        <div className="space-y-3">
          {data.criteria.map((criterion, ci) => {
            const groupName = `${block.id}-criterion-${ci}`;
            return (
              <fieldset key={groupName} className="space-y-1.5">
                <legend className="text-xs font-medium text-slate-600 dark:text-slate-300">{criterion.label}</legend>
                <div role="radiogroup" aria-label={criterion.label} className="flex flex-wrap gap-1.5">
                  {criterion.points.map((points, pi) => {
                    const checked = selection[ci] === points;
                    const label = criterion.choices?.[pi] ?? String(points);
                    return (
                      <button
                        key={points}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => handleSelect(ci, points)}
                        onKeyDown={(e) => {
                          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                          e.preventDefault();
                          const dir = e.key === 'ArrowRight' ? 1 : -1;
                          const next = (pi + dir + criterion.points.length) % criterion.points.length;
                          handleSelect(ci, criterion.points[next]);
                        }}
                        className={`motion-safe:transition-colors rounded-md border px-2 py-1 text-xs font-mono tnum ${
                          checked
                            ? `${toneClasses('accent').box} ${toneClasses('accent').text}`
                            : `${toneClasses('neutral').box} ${toneClasses('neutral').text}`
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-slate-500 underline decoration-dotted hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Zurücksetzen
          </button>
        </div>
      )}

      <div
        role="meter"
        aria-valuemin={gaugeMin}
        aria-valuemax={gaugeMax}
        aria-valuenow={currentValue}
        aria-valuetext={`${currentValue} ${unit} · ${active.label}`}
        className="flex h-3 w-full overflow-hidden rounded-full border border-slate-200 dark:border-slate-800"
      >
        {data.bands.map((band) => {
          const span = band.max - band.min + 1;
          const isActive = data.criteria.length > 0 && band === active;
          return (
            <div
              key={band.label}
              data-active={isActive ? 'true' : undefined}
              style={{ flexGrow: span }}
              className={`motion-safe:transition-opacity h-full ${toneClasses(band.tone).dot} ${
                isActive ? 'opacity-100' : 'opacity-60'
              }`}
            />
          );
        })}
      </div>

      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {data.bands.map((band) => (
          <li key={band.label} className="flex items-center gap-1.5">
            {band === signal && <ToneMark tone={band.tone} />}
            <span className={toneClasses(band.tone).text}>
              {band.label} ({band.min}–{band.max} {unit})
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
