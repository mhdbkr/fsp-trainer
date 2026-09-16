#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { report } from './lib/dist.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const CODES = ['Fr', 'Ka', 'Re', 'St'];

export function checkFrequencies(f) {
  const e = [];
  const ids = new Set();
  for (const p of f.pathologies) {
    if (ids.has(p.id)) e.push(`inv1 id dupliqué : ${p.id}`); ids.add(p.id);
    if (!/^[a-z0-9-]+$/.test(p.id)) e.push(`inv1 slug invalide : ${p.id}`);
    if (p.tier === 'top') {
      if (!(p.total >= 10) || !p.byCenter) e.push(`inv2 top invalide : ${p.id}`);
      else { const s = CODES.reduce((a, c) => a + (p.byCenter[c] ?? 0), 0); if (s !== p.total) e.push(`inv3 Σ byCenter ${s} ≠ total ${p.total} : ${p.id}`); }
    } else if (p.tier === 'frequent') { if (!(p.total >= 4 && p.total <= 9) || p.byCenter !== null) e.push(`inv2 frequent invalide : ${p.id}`); }
    else if (p.tier === 'rare') { if (p.total !== null || p.byCenter !== null) e.push(`inv2 rare invalide : ${p.id}`); }
    else e.push(`inv2 tier inconnu : ${p.tier}`);
  }
  for (const c of f.centers) {
    if (!CODES.includes(c.code)) e.push(`inv7 code centre inconnu : ${c.code}`);
    const s = f.pathologies.reduce((a, p) => a + (p.byCenter?.[c.code] ?? 0), 0);
    if (s > c.n) e.push(`inv4 Σ byCenter[${c.code}]=${s} > n=${c.n}`);
  }
  if (f.n !== 580) e.push(`inv5 n=${f.n} ≠ 580 (ANALYSE.md l.110)`);
  if (JSON.stringify(f.centers.map((c) => c.n)) !== '[91,169,151,182]') e.push('inv5 centers.n ≠ [91,169,151,182]');
  const tot = f.pathologies.reduce((a, p) => a + (p.total ?? 0), 0);
  if (tot > f.nByCenterSum) e.push(`inv6 Σ total ${tot} > nByCenterSum ${f.nByCenterSum}`);
  for (const t of f.trends) if (!CODES.includes(t.center) && t.center !== 'all') e.push(`inv7 trend centre inconnu : ${t.center}`);
  return e;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  report(checkFrequencies(JSON.parse(readFileSync(resolve(here, '../src/data/frequencies.json'), 'utf8'))), 'check-frequencies (7 invariants)');
}
