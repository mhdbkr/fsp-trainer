import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timeline } from './Timeline';
import type { TimelineData, VisualBlock } from '@/data/fachwissenVisuals/types';
import type { Fachwissen } from '@/db/types';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

const fw = { id: 'fw-khk' } as unknown as Fachwissen;

function makeBlock(points: TimelineData['points'], axisTone?: TimelineData['axisTone']) {
  const data: TimelineData = {
    axis: 'zeit',
    axisTone,
    points,
  };
  const block: VisualBlock & { kind: 'timeline'; data: TimelineData } = {
    id: 'timeline-verlauf',
    kind: 'timeline',
    title: 'Verlauf',
    replaces: [],
    anchor: 'diagnostik',
    data,
  };
  return block;
}

const threePoints: TimelineData['points'] = [
  { at: '0–10 min', label: 'Erstkontakt', detail: 'Anamnese und EKG', source: 'ergänzt' },
  { at: '10–30 min', label: 'Diagnostik', detail: 'Troponin, Bildgebung', source: 'ergänzt' },
  { at: '> 30 min', label: 'Therapieentscheidung', detail: 'Reperfusion', source: 'ergänzt', tone: 'accent' },
];

describe('Timeline', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('rend null sous 3 points', () => {
    const html = renderToStaticMarkup(<Timeline block={makeBlock(threePoints.slice(0, 2))} fw={fw} />);
    expect(html).toBe('');
  });

  it('rend une <ol> horizontale ≥ 640px (sm:flex-row) et verticale en dessous', () => {
    const html = renderToStaticMarkup(<Timeline block={makeBlock(threePoints)} fw={fw} />);
    expect(html).toContain('<ol');
    expect(html).toContain('sm:flex-row');
    expect(html).toContain('flex-col');
  });

  it('les détails de tous les points sont visibles sans clic', () => {
    const html = renderToStaticMarkup(<Timeline block={makeBlock(threePoints)} fw={fw} />);
    expect(html).toContain('Anamnese und EKG');
    expect(html).toContain('Troponin, Bildgebung');
    expect(html).toContain('Reperfusion');
  });

  it('clic sur un point le met en évidence (data-active) sans masquer les autres', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<Timeline block={makeBlock(threePoints)} fw={fw} />);
    });

    expect(container.textContent).toContain('Anamnese und EKG');

    const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];
    act(() => {
      buttons[0].click();
    });

    expect(buttons[0].getAttribute('data-active')).toBe('true');
    expect(buttons[1].getAttribute('data-active')).toBeNull();
    expect(container.textContent).toContain('Anamnese und EKG');
    expect(container.textContent).toContain('Troponin, Bildgebung');

    root.unmount();
  });

  it('axisTone signal marque l’axe par un libellé textuel visible, pas seulement par la couleur', () => {
    const html = renderToStaticMarkup(<Timeline block={makeBlock(threePoints, 'signal')} fw={fw} />);
    expect(html).toContain('signal');
    expect(html).toContain('Notfallverlauf');
  });

  it('sans axisTone signal, aucun libellé « Notfallverlauf » n’apparaît', () => {
    const html = renderToStaticMarkup(<Timeline block={makeBlock(threePoints)} fw={fw} />);
    expect(html).not.toContain('Notfallverlauf');
  });

  it('aucun emoji dans le rendu', () => {
    const html = renderToStaticMarkup(<Timeline block={makeBlock(threePoints)} fw={fw} />);
    expect(EMOJI_RE.test(html)).toBe(false);
  });
});
