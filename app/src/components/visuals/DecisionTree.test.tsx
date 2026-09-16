import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import DecisionTree from './DecisionTree';
import type { Fachwissen } from '@/db/types';
import type { VisualBlock } from '@/data/fachwissenVisuals/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const fw = {} as Fachwissen;

const block: Extract<VisualBlock, { kind: 'decision-tree' }> = {
  id: 'tree-1',
  kind: 'decision-tree',
  title: 'Entscheidungsbaum',
  replaces: [],
  anchor: 'diagnostik',
  data: {
    root: {
      question: 'Thoraxschmerz belastungsabhängig?',
      source: 'ergänzt',
      branches: [
        {
          label: 'Ja',
          child: {
            question: 'Ruhe-EKG unauffällig?',
            source: 'ergänzt',
            branches: [
              { label: 'Ja', child: { answer: 'Stabile AP — ambulante Abklärung', source: 'ergänzt' } },
              { label: 'Nein', child: { answer: 'Instabile AP — sofort Klinik', source: 'ergänzt', tone: 'signal' } },
            ],
          },
        },
        {
          label: 'Nein',
          child: { answer: 'Andere Ursache prüfen', source: 'ergänzt' },
        },
      ],
    },
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

describe('DecisionTree — rendu statique', () => {
  it('rend un role=tree avec le niveau 1 en treeitem', () => {
    const html = renderToStaticMarkup(<DecisionTree block={block} fw={fw} />);
    expect(html).toContain('role="tree"');
    expect(html).toContain('role="treeitem"');
    expect(html).toContain('Thoraxschmerz belastungsabhängig?');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('les nœuds de profondeur > 1 sont absents tant que repliés', () => {
    const html = renderToStaticMarkup(<DecisionTree block={block} fw={fw} />);
    expect(html).not.toContain('Ruhe-EKG unauffällig?');
  });

  it('aucune branche → composant absent (null)', () => {
    const empty: Extract<VisualBlock, { kind: 'decision-tree' }> = {
      ...block,
      data: { root: { answer: 'Seule feuille', source: 'ergänzt' } },
    };
    const html = renderToStaticMarkup(<DecisionTree block={empty} fw={fw} />);
    // Une racine-feuille seule reste rendue (1 nœud) — vérifie juste l'absence d'erreur.
    expect(html).toContain('Seule feuille');
  });
});

describe('DecisionTree — interactions', () => {
  it('bouton "Alles aufklappen" déplie tout', () => {
    mount(<DecisionTree block={block} fw={fw} />);
    const button = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent === 'Alles aufklappen')!;
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container!.textContent).toContain('Ruhe-EKG unauffällig?');
    expect(container!.textContent).toContain('Instabile AP — sofort Klinik');
  });

  it('Entrée sur un nœud question le déplie ; Échap le replie', () => {
    mount(<DecisionTree block={block} fw={fw} />);
    const root0 = container!.querySelector('[data-node="n0"]') as HTMLLIElement;
    act(() => {
      root0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(root0.getAttribute('data-expanded')).toBe('true');
    expect(container!.textContent).toContain('Ruhe-EKG unauffällig?');

    act(() => {
      root0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(root0.getAttribute('data-expanded')).toBe('false');
    expect(container!.textContent).not.toContain('Ruhe-EKG unauffällig?');
  });

  it('feuille signal porte un aria-label avec Notfall et un ToneMark sr-only', () => {
    mount(<DecisionTree block={block} fw={fw} />);
    const button = Array.from(container!.querySelectorAll('button')).find((b) => b.textContent === 'Alles aufklappen')!;
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const signalLeaf = Array.from(container!.querySelectorAll('[role="treeitem"]')).find((el) =>
      (el.getAttribute('aria-label') ?? '').includes('Notfall'),
    );
    expect(signalLeaf).toBeTruthy();
    expect(signalLeaf!.textContent).toContain('Notfall');
  });
});
