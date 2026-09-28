#!/usr/bin/env node
// Génère apps/site/scripts/no-promise.lexicon.json depuis docs/brand/voice.md §6 (contrat §7.2).
// §6.1 + §6.4 -> blocking (bloquant) ; §6.2/6.3/6.5 -> informative.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../../..');
const SRC = resolve(ROOT, 'docs/brand/voice.md');
const OUT = resolve(here, 'no-promise.lexicon.json');

const FIXED_BLOCKING = ['Kündigung mit einem Klick', 'ein Klick', 'mit einem Klick'];

function cleanTerm(raw) {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\\?\*/g, '')
    .replace(/\.\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSection(md, num) {
  const start = md.indexOf(`### ${num}`);
  if (start < 0) throw new Error(`section ${num} introuvable dans voice.md §6`);
  const rest = md.slice(start);
  const nextHeaderRel = rest.slice(1).search(/\n(### |## )/);
  const body = nextHeaderRel < 0 ? rest : rest.slice(0, nextHeaderRel + 1);
  return body.split('\n').slice(1).join('\n').trim();
}

function rowCells(line) {
  const parts = line.split('|').map((c) => c.trim());
  if (parts[0] === '') parts.shift();
  if (parts[parts.length - 1] === '') parts.pop();
  return parts;
}

const LANGS = ['fr', 'de', 'en'];

function parseTableTerms(body, section) {
  const terms = [];
  for (const line of body.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = rowCells(line);
    if (cells.length < 3) continue;
    if (cells[0] === 'FR') continue; // en-tête
    if (/^-+$/.test(cells[0])) continue; // séparateur
    cells.slice(0, 3).forEach((cell, i) => {
      for (const raw of cell.split(',')) {
        const term = cleanTerm(raw);
        if (term.length >= 3) terms.push({ term, lang: LANGS[i], section });
      }
    });
  }
  return terms;
}

function parseVocabTerms(body, section) {
  const terms = [];
  for (const raw of body.split('·')) {
    const term = cleanTerm(raw);
    if (term.length >= 3) terms.push({ term, lang: 'fr', section });
  }
  return terms;
}

export function buildLexicon(voiceMd) {
  const blocking = [
    ...parseTableTerms(extractSection(voiceMd, '6.1'), '6.1'),
    ...parseTableTerms(extractSection(voiceMd, '6.4'), '6.4'),
    ...FIXED_BLOCKING.map((term) => ({ term, lang: 'de', section: '6.4' })),
  ];
  const informative = [
    ...parseTableTerms(extractSection(voiceMd, '6.2'), '6.2'),
    ...parseTableTerms(extractSection(voiceMd, '6.3'), '6.3'),
    ...parseVocabTerms(extractSection(voiceMd, '6.5'), '6.5'),
  ];
  return { generatedFrom: 'docs/brand/voice.md §6', blocking, informative };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const md = readFileSync(SRC, 'utf8');
  const json = JSON.stringify(buildLexicon(md), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (cur !== json) { console.error('✗ no-promise.lexicon.json diffère de la génération — relancer node scripts/build-lexicon.mjs et committer'); process.exit(1); }
    console.log('✓ no-promise.lexicon.json à jour');
  } else {
    writeFileSync(OUT, json);
    const { blocking, informative } = JSON.parse(json);
    console.log(`✓ no-promise.lexicon.json : ${blocking.length} termes bloquants, ${informative.length} informatifs`);
  }
}
