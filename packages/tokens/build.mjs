#!/usr/bin/env node
// Génère dist/tokens.css (custom properties --dt-*) et dist/tokens.{js,d.ts}
// depuis tokens.json. Zéro dépendance. Les clés "$…" sont des métadonnées.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

/** Aplatit { color: { brand: { 500: '#…' } } } → [['color-brand-500', '#…'], …] */
export function flatten(obj, prefix = []) {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const key = k === 'DEFAULT' ? prefix : [...prefix, kebab(k)];
    if (v && typeof v === 'object') out.push(...flatten(v, key));
    else out.push([key.join('-'), String(v)]);
  }
  return out;
}
const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

/** Retire les métadonnées "$…" (pour l'export TS). */
export function strip(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, strip(v)]));
}

export function toCss(t) {
  const lines = flatten(t).map(([k, v]) => `  --dt-${k}: ${v};`);
  return `/* @doctopus/tokens v${t.$version} — GÉNÉRÉ par build.mjs, ne pas éditer. */\n:root {\n${lines.join('\n')}\n}\n`;
}

export function toTs(t) {
  const clean = strip(t);
  const json = JSON.stringify(clean, null, 2);
  return {
    js: `// @doctopus/tokens v${t.$version} — GÉNÉRÉ par build.mjs, ne pas éditer.\nexport const tokens = ${json};\nexport const version = ${JSON.stringify(t.$version)};\nexport default tokens;\n`,
    dts: `export declare const tokens: ${json.replace(/"([^"]+)":/g, '$1:').replace(/: "([^"]*)"/g, ': string')};\nexport declare const version: string;\nexport default tokens;\n`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = join(here, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'tokens.css'), toCss(tokens));
  const { js, dts } = toTs(tokens);
  writeFileSync(join(dist, 'tokens.js'), js);
  writeFileSync(join(dist, 'tokens.d.ts'), dts);
  console.log(`tokens v${tokens.$version} → dist/ (${flatten(tokens).length} propriétés)`);
}
