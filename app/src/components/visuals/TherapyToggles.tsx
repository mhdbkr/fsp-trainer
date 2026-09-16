import { useRef, useState } from 'react';
import type { Fachwissen } from '@/db/types';
import type { TherapyTogglesData, VisualBlock } from '@/data/fachwissenVisuals/types';
import { AutoLinkList } from '@/components/AutoLink';
import { ToneMark, toneClasses } from './primitives';
import { resolveRef } from '@/data/fachwissenVisuals/resolve';

// ============================================================================
// TherapyToggles — onglets `role="tablist"` (contrat §6/§8). Les items
// affichés sont LUS depuis `fw.therapie` via `ref.label`, jamais recopiés.
// ============================================================================

interface TherapyTogglesProps {
  block: Extract<VisualBlock, { kind: 'therapy-toggles' }>;
  fw: Fachwissen;
}

export default function TherapyToggles({ block, fw }: TherapyTogglesProps) {
  const data: TherapyTogglesData = block.data;

  const resolved = data.options
    .map((opt, i) => {
      const result = resolveRef(fw, opt.ref);
      if (!result || result.section !== 'therapie') return null;
      return { option: opt, index: i, items: result.value.items };
    })
    .filter((r): r is { option: (typeof data.options)[number]; index: number; items: string[] } => r !== null);

  if (resolved.length < 2) return null;

  const defaultIdx = resolved.findIndex((r) => r.index === data.default);
  const initial = defaultIdx >= 0 ? defaultIdx : 0;
  const [activeIdx, setActiveIdx] = useState(initial);
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  function focusTab(i: number): void {
    setActiveIdx(i);
    tabRefs.current.get(i)?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number): void {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusTab((i + 1) % resolved.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusTab((i - 1 + resolved.length) % resolved.length);
    }
  }

  const active = resolved[activeIdx];

  return (
    <div>
      <div role="tablist" aria-label="Therapieoptionen" className="mb-3 flex flex-wrap gap-2">
        {resolved.map((r, i) => {
          const akut = r.option.akut === true;
          const isActive = i === activeIdx;
          return (
            <button
              key={r.index}
              ref={(el) => {
                if (el) tabRefs.current.set(i, el);
                else tabRefs.current.delete(i);
              }}
              role="tab"
              type="button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveIdx(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium motion-safe:transition-colors sm:min-h-0 ${
                isActive
                  ? akut
                    ? `${toneClasses('signal').box} ${toneClasses('signal').text}`
                    : `${toneClasses('accent').box} ${toneClasses('accent').text}`
                  : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'
              }`}
            >
              {akut && <ToneMark tone="signal" />}
              {r.option.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" data-active-tab={active.index}>
        <AutoLinkList items={active.items} />
      </div>
    </div>
  );
}
