import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { SyndromeMap } from './SyndromeMap';
import type { SyndromeMapData } from '@/data/fachwissenVisuals/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const DATA: SyndromeMapData = {
  center: 'Depressive Episode ≥ 2 Wochen',
  spokes: [
    { label: 'Hauptsymptome', items: [{ text: 'Gedrückte Stimmung', source: 'ergänzt' }] },
    { label: 'Nebensymptome', items: [{ text: 'Schlafstörungen', source: 'ergänzt' }] },
    {
      label: 'Red Flags',
      tone: 'signal',
      items: [{ text: 'Suizidalität', source: { section: 'redFlags', text: 'Suizidalität' } }],
    },
  ],
};

let container: HTMLDivElement;
let root: Root;

function mount(data: SyndromeMapData) {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<SyndromeMap block={{ data }} />);
  });
}

afterEach(() => {
  if (root) {
    act(() => root.unmount());
  }
  container?.remove();
  document.body.innerHTML = '';
});

describe('SyndromeMap', () => {
  it('< 3 rayons : ne rend rien', () => {
    const html = renderToStaticMarkup(
      <SyndromeMap block={{ data: { center: 'x', spokes: DATA.spokes.slice(0, 2) } }} />,
    );
    expect(html).toBe('');
  });

  it('rend le centre et les items de chaque rayon visibles sans clic', () => {
    const html = renderToStaticMarkup(<SyndromeMap block={{ data: DATA }} />);
    expect(html).toContain('Depressive Episode');
    expect(html).toContain('<ul');
    expect(html).not.toContain('<details');
    expect(html).toContain('Hauptsymptome');
    expect(html).toContain('Red Flags');
    expect(html).toContain('Gedrückte Stimmung');
    expect(html).toContain('Schlafstörungen');
    expect(html).toContain('Suizidalität');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('rayon signal porte un ToneMark (jamais la couleur seule)', () => {
    const html = renderToStaticMarkup(<SyndromeMap block={{ data: DATA }} />);
    expect(html).toContain('Notfall');
    expect(html).toContain('sr-only');
  });

  it('rayon warn porte aussi un ToneMark (jamais la couleur seule)', () => {
    const withWarn: SyndromeMapData = {
      ...DATA,
      spokes: [...DATA.spokes.slice(0, 2), { label: 'Risikofaktoren', tone: 'warn', items: DATA.spokes[2].items }],
    };
    const html = renderToStaticMarkup(<SyndromeMap block={{ data: withWarn }} />);
    expect(html).toContain('Vorsicht');
    expect(html).toContain('sr-only');
  });

  it('clic sur un rayon pose data-active et grise les autres', () => {
    mount(DATA);
    const spokeButtons = container.querySelectorAll('button');
    expect(spokeButtons.length).toBe(3);
    act(() => {
      spokeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(spokeButtons[0].getAttribute('data-active')).toBe('true');
    expect(spokeButtons[1].getAttribute('data-active')).toBeNull();
    const spokeCards = container.querySelectorAll('[data-active]');
    // le conteneur du rayon 2 (index 1) doit être grisé
    const dimmedCard = Array.from(container.querySelectorAll('div')).find((el) =>
      el.className.includes('opacity-40'),
    );
    expect(dimmedCard).toBeTruthy();
    expect(spokeCards.length).toBeGreaterThan(0);
  });

  it('un second clic sur le même rayon désactive (toggle)', () => {
    mount(DATA);
    const spokeButtons = container.querySelectorAll('button');
    act(() => {
      spokeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      spokeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(spokeButtons[0].getAttribute('data-active')).toBeNull();
  });

  it('les items du rayon restent visibles avant tout clic', () => {
    mount(DATA);
    expect(container.textContent).toContain('Gedrückte Stimmung');
    expect(container.textContent).toContain('Schlafstörungen');
    expect(container.textContent).toContain('Suizidalität');
  });
});
