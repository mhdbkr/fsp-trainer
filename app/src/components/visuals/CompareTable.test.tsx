import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import CompareTable from './CompareTable';
import type { Fachwissen } from '@/db/types';
import type { VisualBlock } from '@/data/fachwissenVisuals/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const fw = {} as Fachwissen;

const block: Extract<VisualBlock, { kind: 'compare-table' }> = {
  id: 'compare-1',
  kind: 'compare-table',
  title: 'Vergleich',
  replaces: [],
  anchor: 'differenzialdiagnosen',
  data: {
    columns: ['Stabile AP', 'Instabile AP'],
    rows: [
      { criterion: 'Schmerzdauer', cells: ['< 20 min', '> 20 min'], source: 'ergänzt', emphasis: 1 },
      { criterion: 'Auslöser', cells: ['Belastung', 'auch in Ruhe'], source: 'ergänzt' },
    ],
  },
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(node: React.ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root!.render(node);
  });
}

afterEach(() => {
  if (root && container) {
    act(() => root!.unmount());
    container.remove();
  }
  container = null;
  root = null;
});

describe('CompareTable — rendu statique', () => {
  it('rend un <table> avec th scope=col/row', () => {
    const html = renderToStaticMarkup(<CompareTable block={block} fw={fw} />);
    expect(html).toContain('<table');
    expect(html).toContain('scope="col"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('Schmerzdauer');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('rend aussi la variante carte pour mobile (sm:hidden)', () => {
    const html = renderToStaticMarkup(<CompareTable block={block} fw={fw} />);
    expect(html).toContain('sm:hidden');
    expect(html).toContain('hidden');
  });

  it('< 2 lignes → composant absent', () => {
    const empty: Extract<VisualBlock, { kind: 'compare-table' }> = {
      ...block,
      data: { columns: ['A'], rows: [{ criterion: 'x', cells: ['y'], source: 'ergänzt' }] },
    };
    const html = renderToStaticMarkup(<CompareTable block={empty} fw={fw} />);
    expect(html).toBe('');
  });
});

describe('CompareTable — interactions', () => {
  it('clic sur une ligne bascule aria-selected', () => {
    mount(<CompareTable block={block} fw={fw} />);
    const row = container!.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.getAttribute('aria-selected')).toBe('false');
    act(() => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(row.getAttribute('aria-selected')).toBe('true');
    act(() => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(row.getAttribute('aria-selected')).toBe('false');
  });

  it('Entrée sur une ligne la sélectionne aussi', () => {
    mount(<CompareTable block={block} fw={fw} />);
    const row = container!.querySelector('tbody tr') as HTMLTableRowElement;
    act(() => {
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(row.getAttribute('aria-selected')).toBe('true');
  });
});
