import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/DepthRail.astro', import.meta.url), 'utf8');

test('la courbe est décorative pour les lecteurs d\'écran', () => {
  assert.match(src, /aria-hidden="true"/);
});

test('aucun script : la courbe est purement CSS', () => {
  assert.ok(!/<script/i.test(src), 'la courbe ne doit embarquer aucun JavaScript');
});

test('le mouvement est neutralisé sous prefers-reduced-motion', () => {
  assert.match(src, /prefers-reduced-motion:\s*reduce/);
});

test('aucun trait animal : ni œil, ni ventouse dessinée, ni emoji', () => {
  assert.ok(!/🐙|circle[^>]*class="[^"]*eye|<title>/i.test(src));
});
