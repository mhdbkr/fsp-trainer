import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('les deux registres existent', () => {
  assert.match(css, /\.register-deep\s*\{/, '.register-deep absent');
  assert.match(css, /\.register-work\s*\{/, '.register-work absent');
});

test('la profondeur ne se fait jamais par ombre portée', () => {
  const surfaces = css.match(/\.surface[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(surfaces.length > 0, 'aucune classe .surface');
  for (const block of surfaces) {
    assert.ok(!/box-shadow\s*:\s*(?!none)/.test(block),
      `ombre portée interdite dans une surface :\n${block}`);
  }
});

test('la lumière vient du haut : le filet supérieur est plus fort que le reste', () => {
  const block = css.match(/\.surface\s*\{[^}]*\}/)?.[0] ?? '';
  assert.match(block, /--dt-color-depth-lift/, 'le bord supérieur n\'utilise pas depth-lift');
  assert.match(block, /--dt-color-depth-veil/, 'les autres bords n\'utilisent pas depth-veil');
});
