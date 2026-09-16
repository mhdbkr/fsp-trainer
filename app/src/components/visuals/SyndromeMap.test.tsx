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

  it('rend le centre et une liste accordéon toujours présente', () => {
    const html = renderToStaticMarkup(<SyndromeMap block={{ data: DATA }} />);
    expect(html).toContain('Depressive Episode');
    expect(html).toContain('<ul');
    expect(html).toContain('<details');
    expect(html).toContain('Hauptsymptome');
    expect(html).toContain('Red Flags');
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

  it('clic sur un rayon (grille étoile) pose data-active et grise les autres', () => {
    mount(DATA);
    const spokeButtons = container.querySelectorAll('.hidden.md\\:grid button');
    expect(spokeButtons.length).toBe(3);
    act(() => {
      spokeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(spokeButtons[0].getAttribute('data-active')).toBe('true');
    expect(spokeButtons[1].getAttribute('data-active')).toBeNull();
    expect(spokeButtons[1].className).toContain('opacity-40');
  });

  it('un second clic sur le même rayon désactive (toggle)', () => {
    mount(DATA);
    const spokeButtons = container.querySelectorAll('.hidden.md\\:grid button');
    act(() => {
      spokeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      spokeButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(spokeButtons[0].getAttribute('data-active')).toBeNull();
  });
});
