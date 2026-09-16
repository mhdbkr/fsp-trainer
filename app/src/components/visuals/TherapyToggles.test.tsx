import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import TherapyToggles from './TherapyToggles';
import type { Fachwissen } from '@/db/types';
import type { VisualBlock } from '@/data/fachwissenVisuals/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const fw: Fachwissen = {
  id: 'fw-khk',
  pathology: 'KHK',
  specialty: 'Kardiologie',
  definition: '...',
  klinik: [],
  diagnostik: [],
  differenzialdiagnosen: [],
  therapie: [
    { label: 'Konservativ', items: ['Statine', 'Betablocker'] },
    { label: 'Akutmaßnahmen', items: ['Nitro', 'ASS'], akut: true },
    { label: 'Interventionell', items: ['PCI'] },
  ],
  pruefungsfallen: [],
  askedInExam: [],
} as unknown as Fachwissen;

const block: Extract<VisualBlock, { kind: 'therapy-toggles' }> = {
  id: 'toggles-1',
  kind: 'therapy-toggles',
  title: 'Therapie',
  replaces: [],
  anchor: 'therapie',
  data: {
    options: [
      { label: 'Konservativ', ref: { section: 'therapie', label: 'Konservativ' } },
      { label: 'Akut', ref: { section: 'therapie', label: 'Akutmaßnahmen' }, akut: true },
      { label: 'Interventionell', ref: { section: 'therapie', label: 'Interventionell' } },
    ],
    default: 0,
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

describe('TherapyToggles — rendu statique', () => {
  it('rend un tablist avec les items lus depuis fw.therapie', () => {
    const html = renderToStaticMarkup(<TherapyToggles block={block} fw={fw} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('Statine');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('option non résolue est retirée ; < 2 options résolues → null', () => {
    const oneOnly: Extract<VisualBlock, { kind: 'therapy-toggles' }> = {
      ...block,
      data: {
        options: [{ label: 'Inconnu', ref: { section: 'therapie', label: 'N’existe pas' } }],
        default: 0,
      },
    };
    const html = renderToStaticMarkup(<TherapyToggles block={oneOnly} fw={fw} />);
    expect(html).toBe('');
  });

  it('option akut porte un ToneMark (sr-only "Notfall"), les options non-akut n’en portent pas', () => {
    mount(<TherapyToggles block={block} fw={fw} />);
    const tabs = Array.from(container!.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    expect(tabs[0].textContent).not.toContain('Notfall');
    expect(tabs[1].querySelector('.sr-only')?.textContent).toBe('Notfall');
    expect(tabs[2].textContent).not.toContain('Notfall');
  });
});

describe('TherapyToggles — interactions', () => {
  it('flèche droite change d’onglet actif', () => {
    mount(<TherapyToggles block={block} fw={fw} />);
    const tabs = Array.from(container!.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    act(() => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container!.textContent).toContain('Nitro');
  });

  it('clic sur un onglet affiche son panneau', () => {
    mount(<TherapyToggles block={block} fw={fw} />);
    const tabs = Array.from(container!.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    act(() => {
      tabs[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container!.textContent).toContain('PCI');
  });
});
