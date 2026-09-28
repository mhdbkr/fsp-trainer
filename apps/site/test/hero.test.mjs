import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/Hero.astro', import.meta.url), 'utf8');
const site = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'));

test('le hero porte l\'accroche arrêtée', () => {
  assert.match(src + JSON.stringify(site), /Dein Trainingsraum für die Sprache der Medizin/);
});

test('le descripteur reste indexable', () => {
  assert.match(JSON.stringify(site), /medizinisches Deutsch/i);
});

test('aucune évocation animale au premier écran', () => {
  assert.ok(!/oktopus|tintenfisch|🐙|tentakel/i.test(src));
});

test('le hero ne contient qu\'un seul appel à l\'action principal', () => {
  const ctas = src.match(/<CtaButton/g) ?? [];
  assert.ok(ctas.length <= 2, `${ctas.length} CTA dans le hero ; deux au maximum (principal + secondaire)`);
});
