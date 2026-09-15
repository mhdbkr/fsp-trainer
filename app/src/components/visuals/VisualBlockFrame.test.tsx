import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisualBlockFrame } from './VisualBlockFrame';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

function Boom(): never {
  throw new Error('boom');
}

describe('VisualBlockFrame', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('rend data-visual, role=region, aria-label et le titre', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame kind="score-gauge" title="Child-Pugh">
        <p>contenu</p>
      </VisualBlockFrame>,
    );
    expect(html).toContain('data-visual="score-gauge"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Child-Pugh"');
    expect(html).toContain('Child-Pugh');
    expect(html).toContain('<h3');
  });

  it('affiche l’eyebrow allemand du kind', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame kind="decision-tree" title="Diagnostik">
        <p>x</p>
      </VisualBlockFrame>,
    );
    expect(html).toContain('Visuell');
    expect(html).toContain('Entscheidungsbaum');
  });

  it('rend la ligne Merke quand fournie', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame kind="timeline" title="Verlauf" merke="Zeit ist Myokard">
        <p>x</p>
      </VisualBlockFrame>,
    );
    expect(html).toContain('Merke');
    expect(html).toContain('Zeit ist Myokard');
  });

  it('rend le slot after', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame kind="timeline" title="Verlauf" after={<details><summary>Text anzeigen</summary></details>}>
        <p>x</p>
      </VisualBlockFrame>,
    );
    expect(html).toContain('Text anzeigen');
  });

  it('ErrorBoundary avale une erreur enfant sans throw et rend null', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      act(() => {
        root.render(
          <VisualBlockFrame kind="anatomy-map" title="Lokalisation">
            <Boom />
          </VisualBlockFrame>,
        );
      });
    }).not.toThrow();
    warn.mockRestore();
    // Le bloc lui-même reste rendu (cadre + eyebrow), seul l'enfant fautif disparaît.
    expect(container.textContent).toContain('Lokalisation');
    root.unmount();
  });

  it('aucun emoji dans le markup rendu', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame kind="syndrome-map" title="Syndrom" merke="Achte auf Red Flags">
        <p>Inhalt</p>
      </VisualBlockFrame>,
    );
    expect(EMOJI_RE.test(html)).toBe(false);
  });
});
