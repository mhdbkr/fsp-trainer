import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { flatten, toCss, toTs } from '../build.mjs';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(pkg, 'tokens.json'), 'utf8'));
const appDir = join(pkg, '..', '..', 'app');

test('aucun token vide, aucune clé de métadonnée dans le CSS', () => {
  const flat = flatten(tokens);
  assert.ok(flat.length >= 50);
  for (const [k, v] of flat) { assert.ok(v.trim(), `vide : ${k}`); assert.ok(!k.includes('$'), k); }
  const css = toCss(tokens);
  assert.match(css, /--dt-color-brand-500: #158375;/);
  assert.match(css, /--dt-color-paper: #f4f5f2;/);
  assert.match(css, /--dt-font-display: "Bricolage Grotesque Variable"/);
  assert.doesNotMatch(css, /\$src/);
});

test('l\'export TS ne porte pas les métadonnées et reste du JS valide', async () => {
  const { js, dts } = toTs(tokens);
  assert.doesNotMatch(js, /\$src/);
  assert.match(dts, /export declare const tokens/);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  assert.equal(mod.tokens.color.signal[500], '#d84a24');
});

test('check-parity sort 0 sur l\'app réelle', () => {
  const r = spawnSync(process.execPath, [join(pkg, 'scripts/check-parity.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('check-parity sort 1 quand l\'app dérive (couleur, easing, verre)', () => {
  const fake = mkdtempSync(join(tmpdir(), 'dt-parity-'));
  mkdirSync(join(fake, 'src/styles'), { recursive: true });
  cpSync(join(appDir, 'tailwind.config.js'), join(fake, 'tailwind.config.js'));
  const css = readFileSync(join(appDir, 'src/styles/index.css'), 'utf8')
    .replace('--ease-out: cubic-bezier(0.16, 1, 0.3, 1);', '--ease-out: ease;')
    .replace('backdrop-filter: blur(20px) saturate(180%);', 'backdrop-filter: blur(12px) saturate(180%);');
  writeFileSync(join(fake, 'src/styles/index.css'), css);
  writeFileSync(join(fake, 'tailwind.config.js'), readFileSync(join(fake, 'tailwind.config.js'), 'utf8').replace("500: '#158375'", "500: '#000000'"));
  const r = spawnSync(process.execPath, [join(pkg, 'scripts/check-parity.mjs')], { encoding: 'utf8', env: { ...process.env, DOCTOPUS_APP_DIR: fake } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /color\.brand\.500/);
  assert.match(r.stderr, /motion\.easeOut/);
  assert.match(r.stderr, /glass\.blur\+saturate/);
  assert.match(r.stderr, /3 dérive/);
});
