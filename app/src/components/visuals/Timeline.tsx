import { useState } from 'react';
import type { Fachwissen } from '@/db/types';
import type { TimelineData, VisualBlock } from '@/data/fachwissenVisuals/types';
import { AutoLink } from '@/components/AutoLink';
import { Icon } from '@/components/icons';
import { ToneMark, toneClasses } from './primitives';

interface TimelineProps {
  block: VisualBlock & { kind: 'timeline'; data: TimelineData };
  fw: Fachwissen;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Timeline({ block, fw: _fw }: TimelineProps) {
  const { data } = block;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (data.points.length < 3) return null;

  const axisIsSignal = data.axisTone === 'signal';

  return (
    <>
      {axisIsSignal && (
        <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-signal-600 dark:text-signal-300">
          <Icon name="alert" className="h-3 w-3" aria-hidden="true" />
          Notfallverlauf
        </p>
      )}
      <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
        {data.points.map((point, i) => {
          const isOpen = openIndex === i;
          const tone = point.tone ?? 'neutral';
          return (
            <li key={`${point.at}-${i}`} className="relative flex-1 pb-3 sm:pb-0">
              <div
                aria-hidden="true"
                className={`h-1 w-full sm:h-1 ${
                  axisIsSignal ? toneClasses('signal').dot : 'bg-slate-300 dark:bg-slate-700'
                } motion-safe:transition-colors`}
              />
              <div className="mt-2 pr-3 sm:pr-4">
                <span className="mono-tag">{point.at}</span>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="mt-1 flex items-center gap-1.5 text-left text-sm font-medium text-slate-700 hover:underline dark:text-slate-200"
                >
                  {tone !== 'neutral' && <ToneMark tone={tone} />}
                  <span>{point.label}</span>
                </button>
                {isOpen && point.detail && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <AutoLink>{point.detail}</AutoLink>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
