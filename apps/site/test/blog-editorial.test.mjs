import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const blogDir = resolve(here, '../src/content/blog');
const files = readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));

const forbidden = [
  { pattern: /\bKammern\b/, label: 'Kammer au pluriel' },
  { pattern: /je nach Kammer/, label: 'je nach Kammer' },
  { pattern: /berichten uns/, label: 'témoignage « berichten uns »' },
  { pattern: /Kommission/, label: 'Kommission (jury non sourcé)' },
];

for (const file of files) {
  const content = readFileSync(resolve(blogDir, file), 'utf8');
  for (const { pattern, label } of forbidden) {
    test(`${file} — ne contient pas « ${label} »`, () => {
      assert.ok(!pattern.test(content), `« ${label} » trouvé dans ${file}`);
    });
  }
  test(`${file} — utilise « Simulantenkarte », pas « Simulantenfiche »`, () => {
    assert.ok(!/Simulantenfiche/.test(content));
    assert.ok(!/Fiche des Simulanten/.test(content));
  });
}
