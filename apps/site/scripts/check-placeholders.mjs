#!/usr/bin/env node
// Refuse tout gabarit non substitué dans le HTML construit quand le site est
// destiné au public. Spécifié dans docs/superpowers/specs/2026-09-16-site-design.md
// (« aucun {{…}} dans dist si SITE_PUBLIC=true »), jamais implémenté jusqu'ici.
// Hors mode public, on avertit sans bloquer : un site en préparation a le droit
// de porter des valeurs en attente.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PUBLIC = process.env.SITE_PUBLIC === 'true';
const PLACEHOLDER = /\{\{\s*[A-Z0-9_]+\s*\}\}/g;

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

let found = 0;
for (const file of htmlFiles(dist)) {
  for (const m of readFileSync(file, 'utf8').matchAll(PLACEHOLDER)) {
    console.error(`${PUBLIC ? '✗' : '·'} gabarit non substitué « ${m[0]} »  ${file.replace(dist, 'dist')}`);
    found++;
  }
}
if (!found) { console.log('check-placeholders : ok'); process.exit(0); }
if (PUBLIC) {
  console.error(`\ncheck-placeholders : ${found} gabarit(s) non substitué(s) en mode public.`);
  process.exit(1);
}
console.log(`check-placeholders : ${found} gabarit(s) en attente ; toléré hors SITE_PUBLIC=true.`);
