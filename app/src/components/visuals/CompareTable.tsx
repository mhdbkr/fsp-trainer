import { useState } from 'react';
import type { Fachwissen } from '@/db/types';
import type { CompareTableData, VisualBlock } from '@/data/fachwissenVisuals/types';
import { AutoLink } from '@/components/AutoLink';

// ============================================================================
// CompareTable — tableau comparatif responsive (contrat §6).
// Rendu double : <table> sticky-header dès sm, cartes empilées en dessous.
// ============================================================================

interface CompareTableProps {
  block: Extract<VisualBlock, { kind: 'compare-table' }>;
  fw: Fachwissen;
}

export default function CompareTable({ block }: CompareTableProps) {
  const data: CompareTableData = block.data;
  const [selected, setSelected] = useState<number | null>(null);

  if (data.rows.length < 2) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800">
      <table className="hidden w-full border-collapse text-sm sm:table">
        <thead>
          <tr className="sticky top-0 z-[1] bg-slate-50/90 backdrop-blur dark:bg-ink-800/70">
            <th scope="col" className="label px-3 py-1.5 text-left" />
            {data.columns.map((col, i) => (
              <th key={i} scope="col" className="label border-l border-slate-200/80 px-3 py-1.5 text-left dark:border-slate-800">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
          {data.rows.map((row, ri) => (
            <tr
              key={ri}
              aria-selected={selected === ri}
              data-selected={selected === ri || undefined}
              tabIndex={0}
              className={`cursor-pointer motion-safe:transition-colors ${
                selected === ri ? 'bg-brand-50 dark:bg-brand-900/20' : 'hover:bg-slate-50 dark:hover:bg-ink-800/40'
              }`}
              onClick={() => setSelected((s) => (s === ri ? null : ri))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected((s) => (s === ri ? null : ri));
                }
              }}
            >
              <th scope="row" className="px-3 py-2 text-left font-semibold">
                <AutoLink>{row.criterion}</AutoLink>
              </th>
              {row.cells.map((cell, ci) => (
                <td
                  key={ci}
                  className={`border-l border-slate-200/80 px-3 py-2 dark:border-slate-800 ${
                    row.emphasis === ci ? 'font-semibold text-brand-700 dark:text-brand-300' : ''
                  }`}
                >
                  <AutoLink>{cell}</AutoLink>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-slate-200/70 sm:hidden dark:divide-slate-800/70">
        {data.rows.map((row, ri) => (
          <li
            key={ri}
            aria-selected={selected === ri}
            tabIndex={0}
            className={`cursor-pointer p-3 motion-safe:transition-colors ${
              selected === ri ? 'bg-brand-50 dark:bg-brand-900/20' : ''
            }`}
            onClick={() => setSelected((s) => (s === ri ? null : ri))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelected((s) => (s === ri ? null : ri));
              }
            }}
          >
            <div className="mb-1 text-sm font-semibold">
              <AutoLink>{row.criterion}</AutoLink>
            </div>
            <dl className="space-y-1">
              {data.columns.map((col, ci) => (
                <div key={ci} className="flex gap-2 text-sm">
                  <dt className="label shrink-0 text-slate-500 dark:text-slate-400">{col}</dt>
                  <dd className={row.emphasis === ci ? 'font-semibold text-brand-700 dark:text-brand-300' : ''}>
                    <AutoLink>{row.cells[ci] ?? ''}</AutoLink>
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
