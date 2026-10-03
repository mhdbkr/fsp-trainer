import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'index.css'), 'utf8');
const tailwind = readFileSync(join(here, '../../tailwind.config.js'), 'utf8');

// Invariants de matière et d'étoile (F4b AC-1, AC-2), vérifiés sur les sources.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const star = Object.fromEntries([...tailwind.match(/star: \{([^}]*)\}/)![1].matchAll(/(\d+): '(#[0-9a-f]{6})'/g)].map((mt) => [mt[1], mt[2]]));
const rules = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((mt) => mt[1].split(',').some((s) => s.trim() === selector)).map((mt) => mt[2]);

describe('verre flottant (AC-1)', () => {
  it('glass-thin et glass-full existent, sans ombre portée (inset seulement)', () => {
    for (const cls of ['.glass-thin', '.glass-full', ':is(.dark) .glass-thin', ':is(.dark) .glass-full']) {
      const shadows = rules(cls).flatMap((body) => [...body.matchAll(/box-shadow:([^;]*);/g)].map((mt) => mt[1]));
      for (const s of shadows) expect(s.trim().startsWith('inset')).toBe(true);
    }
    expect(rules('.glass-thin').join('')).toMatch(/backdrop-filter: blur\(12px\)/);
    expect(rules('.glass-full').join('')).toMatch(/backdrop-filter: blur\(24px\)/);
  });
  it('repli opaque sous prefers-reduced-transparency et sans backdrop-filter', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-transparency: reduce) {\n    .glass,'));
    expect(reduced).toMatch(/^@media \(prefers-reduced-transparency: reduce\) \{\n\s+\.glass, \.glass-thin, \.glass-full \{ background: rgb\(244 245 242 \/ 0\.98\); backdrop-filter: none;/);
    expect(css).toMatch(/@supports not[^{]+\{\n\s+\.glass, \.glass-thin, \.glass-full \{ background: rgb\(244 245 242 \/ 0\.97\); \}/);
  });
});

describe('étoile (AC-2)', () => {
  it('pleine : trait star-600 ≥ 3:1 sur blanc et papier, star-400 ≥ 3:1 sur encre', () => {
    for (const bg of ['#ffffff', '#f4f5f2']) expect(contrast(star['600'], bg)).toBeGreaterThanOrEqual(3);
    for (const bg of ['#0c1a17', '#12211e', '#1b2f2b']) expect(contrast(star['400'], bg)).toBeGreaterThanOrEqual(3);
  });
  it('vide (cristal) : trait slate-500 / slate-300 ≥ 3:1', () => {
    for (const bg of ['#ffffff', '#f4f5f2']) expect(contrast('#64748b', bg)).toBeGreaterThanOrEqual(3);
    for (const bg of ['#0c1a17', '#12211e']) expect(contrast('#cbd5e1', bg)).toBeGreaterThanOrEqual(3);
  });
});
