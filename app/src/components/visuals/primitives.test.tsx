import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Grid, Readout, ToneMark, NodeBox, toneClasses } from './primitives';

const EMOJI_RE = /\p{Extended_Pictographic}/u;

describe('primitives — toneClasses', () => {
  it('signal contient la teinte coral', () => {
    expect(toneClasses('signal').box).toContain('signal');
    expect(toneClasses('signal').text).toContain('signal');
  });

  it('accent contient la teinte pétrole (brand)', () => {
    expect(toneClasses('accent').box).toContain('brand');
  });

  it('défaut = neutral quand rien n’est fourni', () => {
    expect(toneClasses().text).toContain('slate');
  });
});

describe('primitives — rendu', () => {
  it('Grid est décoratif : aria-hidden, sans texte', () => {
    const html = renderToStaticMarkup(<Grid />);
    expect(html).toContain('aria-hidden="true"');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('Readout affiche la valeur et l’unité en mono', () => {
    const html = renderToStaticMarkup(<Readout value={42} unit="Punkte" />);
    expect(html).toContain('42');
    expect(html).toContain('Punkte');
    expect(html).toContain('font-mono');
    expect(EMOJI_RE.test(html)).toBe(false);
  });

  it('ToneMark porte un libellé sr-only pour signal (jamais couleur seule)', () => {
    const html = renderToStaticMarkup(<ToneMark tone="signal" />);
    expect(html).toContain('Notfall');
    expect(html).toContain('sr-only');
  });

  it('ToneMark porte un libellé sr-only pour warn', () => {
    const html = renderToStaticMarkup(<ToneMark tone="warn" />);
    expect(html).toContain('Vorsicht');
  });

  it('ToneMark neutral/accent rend un point sans texte requis', () => {
    const html = renderToStaticMarkup(<ToneMark tone="accent" />);
    expect(html).toContain('rounded-full');
  });

  it('NodeBox variant question porte le bord pétrole', () => {
    const html = renderToStaticMarkup(
      <NodeBox variant="question">
        <span>Frage</span>
      </NodeBox>,
    );
    expect(html).toContain('border-l-brand-500');
  });

  it('NodeBox variant signal porte le bord coral', () => {
    const html = renderToStaticMarkup(
      <NodeBox variant="signal">
        <span>Notfall</span>
      </NodeBox>,
    );
    expect(html).toContain('border-l-signal-500');
  });

  it('aucun emoji dans le markup rendu des primitives', () => {
    const html = renderToStaticMarkup(
      <>
        <Grid />
        <Readout value="A" tone="warn" />
        <ToneMark tone="signal" />
        <NodeBox variant="question">x</NodeBox>
      </>,
    );
    expect(EMOJI_RE.test(html)).toBe(false);
  });
});
