import { describe, it, expect, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VisualBlockFrame } from './VisualBlockFrame';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

describe('VisualBlockFrame', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('rend data-block avec l’id du bloc (contrat §2)', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame id="gauge-child-pugh" kind="score-gauge" title="Child-Pugh">
        <p>contenu</p>
      </VisualBlockFrame>,
    );
    expect(html).toContain('data-block="gauge-child-pugh"');
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

  it('aucun emoji dans le markup rendu', () => {
    const html = renderToStaticMarkup(
      <VisualBlockFrame kind="syndrome-map" title="Syndrom" merke="Achte auf Red Flags">
        <p>Inhalt</p>
      </VisualBlockFrame>,
    );
    expect(EMOJI_RE.test(html)).toBe(false);
  });
});
