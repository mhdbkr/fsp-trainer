#!/usr/bin/env node
// Scanne dist/**/*.html et src/data/*.json contre le lexique généré depuis
// docs/brand/voice.md §6 (contrat §7.2, D9, AC3, C5). Bloquant (§6.1/§6.4) -> exit 1 ;
// informatif (§6.2/6.3/6.5) -> listé, exit 0.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Les briques partagées (bornes Unicode, corpus d'une page, exception explicite,
// aplatissement JSON) vivent dans lib/dist.mjs. Comportement inchangé : seule leur
// provenance change, pour que check-voice.mjs consomme les mêmes.
import { listHtml, boundedRe, collectAllow, htmlCorpus, jsonStrings } from './lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const NEGATIONS = new Set([
  'kein', 'keine', 'keinen', 'keinem', 'keiner', 'ohne', 'nicht',
  'aucun', 'aucune', 'sans', 'no', 'without', 'never',
]);

export function normalize(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term) {
  const words = normalize(term).trim().split(/\s+/);
  // \s* (pas \s+) : « 100% » sans espace doit matcher au même titre que « 100 % »
  // (revue T1.6 I1 — un token vide entre chiffre et % ne doit pas échapper au filtre).
  return words.map((w) => (w === 'x' ? '\\d+' : escapeRegex(w))).join('\\s*');
}

function precedingWord(text, index) {
  const before = text.slice(0, index).trimEnd();
  const m = before.match(/([\p{L}\p{N}]+)\s*$/u);
  return m ? m[1] : '';
}

function contextAround(text, start, end) {
  const from = Math.max(0, start - 30);
  const to = Math.min(text.length, end + 30);
  return text.slice(from, to).trim();
}

/**
 * findViolations(text, lexicon) -> { term, section, index, context, list }[]
 * lexicon: { blocking: {term,section}[], informative: {term,section}[] }
 * Scanne les deux listes ; correspondance mot entier, X = joker \d+,
 * négation immédiate (≤ 1 mot avant) exclue.
 */
export function findViolations(text, lexicon) {
  const norm = normalize(text);
  const terms = [
    ...(lexicon.blocking ?? []).map((t) => ({ ...t, list: 'blocking' })),
    ...(lexicon.informative ?? []).map((t) => ({ ...t, list: 'informative' })),
  ];
  const results = [];
  for (const t of terms) {
    const pattern = termPattern(t.term);
    if (!pattern) continue;
    const re = boundedRe(pattern);
    let m;
    while ((m = re.exec(norm))) {
      const prev = precedingWord(norm, m.index);
      if (NEGATIONS.has(prev)) continue;
      results.push({
        term: t.term,
        section: t.section,
        index: m.index,
        context: contextAround(text, m.index, m.index + m[0].length),
        list: t.list,
      });
    }
  }
  return results;
}

export function checkText(text, lexicon) {
  const all = findViolations(text, lexicon);
  return {
    blocking: all.filter((v) => v.list === 'blocking'),
    informative: all.filter((v) => v.list === 'informative'),
  };
}

function jsonCorpus(file) {
  const raw = readFileSync(file, 'utf8');
  const strings = jsonStrings(JSON.parse(raw));
  return { text: strings.join('\n'), allow: collectAllow(raw) };
}

function scan(rel, { text, allow }, lexicon, lines) {
  const allowNorm = new Set(allow.map(normalize));
  const { blocking, informative } = checkText(text, lexicon);
  let hasBlocking = false;
  for (const v of blocking) {
    if (allowNorm.has(normalize(v.term))) {
      lines.push(`… ${rel}: « ${v.context} » (${v.term}, §${v.section}) — autorisé (voice:allow, listé)`);
    } else {
      lines.push(`✗ ${rel}: « ${v.context} » (${v.term}, §${v.section})`);
      hasBlocking = true;
    }
  }
  for (const v of informative) {
    lines.push(`ℹ ${rel}: « ${v.context} » (${v.term}, §${v.section})`);
  }
  return hasBlocking;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lexicon = JSON.parse(readFileSync(resolve(here, 'no-promise.lexicon.json'), 'utf8'));
  const distDir = resolve(here, '../dist');
  const dataDir = resolve(here, '../src/data');
  const lines = [];
  let hasBlocking = false;

  if (existsSync(distDir)) {
    for (const file of listHtml(distDir)) {
      const rel = file.slice(distDir.length);
      if (scan(rel, htmlCorpus(readFileSync(file, 'utf8')), lexicon, lines)) hasBlocking = true;
    }
  }
  if (existsSync(dataDir)) {
    for (const name of readdirSync(dataDir).filter((f) => f.endsWith('.json'))) {
      const file = join(dataDir, name);
      const rel = `src/data/${name}`;
      if (scan(rel, jsonCorpus(file), lexicon, lines)) hasBlocking = true;
    }
  }

  for (const l of lines) (l.startsWith('✗') ? console.error : console.log)(l);
  if (hasBlocking) {
    console.error(`✗ check-no-promise: ${lines.filter((l) => l.startsWith('✗')).length} manquement(s) bloquant(s)`);
    process.exitCode = 1;
  } else {
    console.log('✓ check-no-promise');
  }
}
