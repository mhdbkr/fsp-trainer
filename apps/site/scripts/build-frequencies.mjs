#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../..');
const OUT = resolve(here, '../src/data/frequencies.json');
const CENTERS = [['Fr', 'Freiburg'], ['Ka', 'Karlsruhe'], ['Re', 'Reutlingen'], ['St', 'Stuttgart']];
const CODE_OF = Object.fromEntries(CENTERS.map(([c, n]) => [n, c]));

export function slugify(name) {
  return name.toLowerCase().replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function section(md, start, end) {
  const a = md.indexOf(start); if (a < 0) throw new Error(`section introuvable : ${start}`);
  const b = end ? md.indexOf(end, a) : md.length;
  return md.slice(a, b < 0 ? md.length : b);
}
const lineNo = (md, s) => md.slice(0, md.indexOf(s)).split('\n').length;

export function parseAnalyse(md) {
  const head = md.match(/\*\*(\d+) comptes-rendus\*\*[\s\S]*?Freiburg (\d+) · Karlsruhe (\d+) · Reutlingen (\d+) · Stuttgart (\d+)/);
  if (!head) throw new Error('en-tête §3 (n, centres) introuvable');
  const n = Number(head[1]);
  const centers = CENTERS.map(([code, name], i) => ({ code, name, n: Number(head[2 + i]) }));
  const pathologies = [];
  // §3.1 — tableau
  for (const line of section(md, '### 3.1', '### 3.2').split('\n')) {
    if (!line.startsWith('|') || /^\|\s*-|Fréq\./.test(line)) continue;
    const m = line.match(/^\|\s*(\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!m) throw new Error(`§3.1 ligne ${lineNo(md, line)} non parsable : ${line}`);
    const byCenter = { Fr: 0, Ka: 0, Re: 0, St: 0 };
    for (const cell of m[3].split(/\s+/)) { const c = cell.match(/^(Fr|Ka|Re|St)(\d+)$/); if (!c) throw new Error(`§3.1 ligne ${lineNo(md, line)} cellule inconnue : ${cell}`); byCenter[c[1]] = Number(c[2]); }
    pathologies.push({ id: slugify(m[2]), name: m[2], specialty: m[4].trim(), total: Number(m[1]), byCenter, tier: 'top' });
  }
  // §3.2 — « Nom N · Nom N (…) »
  const s32 = section(md, '### 3.2', '### 3.3').split('\n').slice(1).join(' ').trim();
  for (const raw of s32.split('·')) {
    const item = raw.replace(/\*\*/g, '').replace(/\([^)]*\)/g, '').replace(/\.$/, '').trim();
    if (!item) continue;
    const m = item.match(/^(.+?)\s+(\d+)$/);
    if (!m) throw new Error(`§3.2 entrée non parsable : « ${raw.trim()} »`);
    pathologies.push({ id: slugify(m[1]), name: m[1].trim(), specialty: null, total: Number(m[2]), byCenter: null, tier: 'frequent' });
  }
  // §3.3 — noms seuls
  const s33 = section(md, '### 3.3', '### 3.4').split('\n').slice(1).join(' ').trim();
  for (const raw of s33.split('·')) {
    const name = raw.replace(/\.$/, '').trim(); if (!name) continue;
    pathologies.push({ id: slugify(name), name, specialty: null, total: null, byCenter: null, tier: 'rare' });
  }
  // §3.4 — tendances, texte tel quel
  const trends = [];
  for (const line of section(md, '### 3.4', '### 3.5').split('\n')) {
    const m = line.match(/^- \*\*(.+?)\*\*\s*:\s*(.+)$/); if (!m) continue;
    const code = CODE_OF[m[1]] ?? (m[1].startsWith('Transversaux') ? 'all' : null);
    if (!code) throw new Error(`§3.4 centre inconnu : ${m[1]}`);
    trends.push({ center: code, summary: m[2].trim() });
  }
  return {
    $version: 1,
    source: 'ANALYSE.md §3 — comptes rendus de candidats, 4 centres BW',
    generatedAt: analyseDate(),
    period: '{{PROTOCOLS_PERIOD}}',
    n, nByCenterSum: centers.reduce((s, c) => s + c.n, 0),
    disclaimer: 'Beobachtete Häufigkeiten in Prüfungsprotokollen, keine Vorhersage.',
    centers, pathologies, trends,
  };
}
function analyseDate() {
  try { return execSync('git log -1 --format=%cs -- ANALYSE.md', { cwd: ROOT, encoding: 'utf8' }).trim() || '1970-01-01'; } catch { return '1970-01-01'; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const md = readFileSync(resolve(ROOT, 'ANALYSE.md'), 'utf8');
  const json = JSON.stringify(parseAnalyse(md), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (cur !== json) { console.error('✗ frequencies.json diffère de la génération — relancer node scripts/build-frequencies.mjs et committer'); process.exit(1); }
    console.log('✓ frequencies.json à jour');
  } else { writeFileSync(OUT, json); console.log(`✓ frequencies.json : ${JSON.parse(json).pathologies.length} pathologies`); }
}
