import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnatomyMap } from './AnatomyMap';
import type { AnatomyMapData } from '@/data/fachwissenVisuals/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const DATA: AnatomyMapData = {
  figure: 'body',
  hotspots: [
    { region: 'eyes', label: 'Ikterus (Sklera)', source: { section: 'klinik', text: 'Ikterus (Gelbfärbung)' } },
    {
      region: 'chest',
      label: 'Spider naevi',
      source: { section: 'klinik', text: 'Spider naevi' },
      tone: 'signal',
    },
    { region: 'hands', label: 'Palmarerythem', source: 'ergänzt' },
  ],
};

let container: HTMLDivElement;
let root: Root;

function mount(data: AnatomyMapData) {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<AnatomyMap block={{ data }} />);
  });
}

afterEach(() => {
  if (root) {
    act(() => root.unmount());
  }
  container?.remove();
  document.body.innerHTML = '';
});

describe('AnatomyMap', () => {
  it('< 2 hotspots : ne rend rien', () => {
    const html = renderToStaticMarkup(
      <AnatomyMap
        block={{ data: { figure: 'body', hotspots: [DATA.hotspots[0]] } }}
      />,
    );
    expect(html).toBe('');
  });

  it('rend un SVG role="img" avec <title> et un bouton par hotspot', () => {
    const html = renderToStaticMarkup(<AnatomyMap block={{ data: DATA }} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('<title>');
    expect((html.match(/<button/g) ?? []).length).toBe(3);
    expect(html).toContain('aria-pressed');
    expect(html).toContain('aria-live="polite"');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('liste textuelle des hotspots toujours rendue (<ul>)', () => {
    const html = renderToStaticMarkup(<AnatomyMap block={{ data: DATA }} />);
    expect(html).toContain('<ul');
    expect(html).toContain('Ikterus (Sklera)');
    expect(html).toContain('Spider naevi');
    expect(html).toContain('Palmarerythem');
  });

  it('hotspot tone:signal porte un marqueur non-couleur (ToneMark + suffixe textuel), jamais couleur seule', () => {
    mount(DATA);
    const buttons = container.querySelectorAll('li button');
    const signalButton = buttons[1];
    expect(signalButton.getAttribute('aria-label')).toBe('Spider naevi — Notfall');
    expect(signalButton.querySelector('.sr-only')?.textContent).toBe('Notfall');
    const neutralButton = buttons[0];
    expect(neutralButton.getAttribute('aria-label')).toBe('Ikterus (Sklera)');
    expect(neutralButton.querySelector('.sr-only')).toBeNull();
  });

  it('sélection initiale : le panneau aria-live contient le texte du premier hotspot', () => {
    mount(DATA);
    const p = container.querySelector('p[aria-live="polite"]');
    expect(p?.textContent).toContain('Ikterus (Sklera)');
    expect(p?.textContent).toContain('Ikterus (Gelbfärbung)');
  });

  it('clic sur un bouton sélectionne le hotspot (aria-pressed + aria-live)', () => {
    mount(DATA);
    const buttons = container.querySelectorAll('button');
    act(() => {
      buttons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    const p = container.querySelector('p[aria-live="polite"]');
    expect(p?.textContent).toContain('Spider naevi');
  });

  it('flèche droite déplace la sélection et le focus vers le hotspot suivant', () => {
    mount(DATA);
    const buttons = container.querySelectorAll('button');
    act(() => {
      buttons[0].focus();
    });
    act(() => {
      buttons[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('flèche gauche revient au dernier hotspot depuis le premier (boucle)', () => {
    mount(DATA);
    const buttons = container.querySelectorAll('button');
    act(() => {
      buttons[0].focus();
    });
    act(() => {
      buttons[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      );
    });
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
  });
});
