import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CollapsedSection, Repli } from './visualSections';

// ============================================================================
// Fixes I1 (accord « 1 Punkt »/« N Punkte ») et I4 (h2 conservé dans le
// <summary> d'une section entièrement repliée — hiérarchie de titres).
// ============================================================================

describe('CollapsedSection', () => {
  it('affiche « 1 Punkt » au singulier', () => {
    const html = renderToStaticMarkup(
      <CollapsedSection title="Therapie" count={1}>
        <p>x</p>
      </CollapsedSection>,
    );
    expect(html).toContain('1 Punkt');
    expect(html).not.toContain('1 Punkte');
  });

  it('affiche « N Punkte » au pluriel', () => {
    const html = renderToStaticMarkup(
      <CollapsedSection title="Therapie" count={4}>
        <p>x</p>
      </CollapsedSection>,
    );
    expect(html).toContain('4 Punkte');
  });

  it('garde le <h2> du titre de section quand la section est repliée', () => {
    const html = renderToStaticMarkup(
      <CollapsedSection title="Therapie" count={4}>
        <p>x</p>
      </CollapsedSection>,
    );
    expect(html).toContain('<h2');
    expect(html).toContain('Therapie');
  });
});

describe('Repli', () => {
  it('affiche « 1 Punkt » au singulier', () => {
    const html = renderToStaticMarkup(
      <Repli count={1}>
        <p>x</p>
      </Repli>,
    );
    expect(html).toContain('1 Punkt');
    expect(html).not.toContain('1 Punkte');
  });

  it('affiche « N Punkte » au pluriel', () => {
    const html = renderToStaticMarkup(
      <Repli count={3}>
        <p>x</p>
      </Repli>,
    );
    expect(html).toContain('3 Punkte');
  });
});
