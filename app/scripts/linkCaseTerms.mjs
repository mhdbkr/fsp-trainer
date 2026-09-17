// ============================================================================
// Liaison cas ↔ Fachbegriffe PAR OCCURRENCE TEXTUELLE (spec F2a 3.5). La
// liaison par tags de pathologie ne couvre que 38 termes sur 2 266 : ce script
// scanne les textes réels de chaque cas avec la même règle de mot entier
// Unicode que l'autolink de l'app, et écrit src/data/caseTermLinks.json.
// Usage : node scripts/linkCaseTerms.mjs [--check]   (--check : exit 1 si le
// fichier diffère du résultat régénéré — utilisé par checkCaseTermLinks.mjs)
//
// ORDRE : la liste de termes de chaque cas est triée par fréquence
// documentaire (DF) ASCENDANTE puis par id — DF calculée sur l'ensemble
// `result` une fois TOUS les cas liés. Les termes les plus spécifiques (DF
// basse) arrivent donc en tête. C'est une convention pour les CONSOMMATEURS
// de ce JSON : à eux de tronquer à N (`MAX_PER_CASE` est une préoccupation
// consommateur, pas de ce script) — le JSON lui-même reste complet.
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../src/data/caseTermLinks.json');
/** Mots trop ambigus pour lier un cas (homographes du quotidien). */
const EXCLUDE = new Set(['in', 'vor', 'nach', 'bei', 'seit', 'ohne', 'mit', 'oder', 'und', 'aber', 'dann', 'noch', 'schon', 'sehr', 'gut', 'ganz']);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Index des termes → regex Unicode mot entier + formes fléchiées simples. */
export function buildIndex(terms) {
  const byKey = new Map(); const alts = []; const dupes = new Map();
  for (const t of terms) {
    const key = t.term.trim(); if (key.length < 4 || EXCLUDE.has(key.toLowerCase())) continue;
    const lower = key.toLowerCase();
    if (byKey.has(lower)) { dupes.set(lower, (dupes.get(lower) ?? 1) + 1); continue; }
    byKey.set(lower, t.id); alts.push(key);
  }
  if (dupes.size) {
    for (const [text, count] of dupes) console.error(`⚠ terme dupliqué ignoré : "${text}" (${count} occurrences)`);
  }
  alts.sort((a, b) => b.length - a.length);
  const re = new RegExp('(?<![\\p{L}\\p{N}])(' + alts.map(escapeRe).join('|') + ')(?:e|en|s|n)?(?![\\p{L}\\p{N}])', 'giu');
  return { re, byKey };
}

export function linkTerms(texts, terms) {
  const { re, byKey } = buildIndex(terms);
  const found = new Set();
  for (const text of texts) for (const m of String(text ?? '').matchAll(re)) { const id = byKey.get(m[1].toLowerCase()); if (id) found.add(id); }
  return [...found].sort();
}

const flatten = (v, out = []) => { if (v == null) return out; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => flatten(x, out)); else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out)); return out; };
/** Textes d'un cas où un terme peut apparaître. */
export function caseTexts(c, muster) {
  return [
    ...flatten(c.patientSheet), ...flatten(c.medicalView),
    ...flatten(c.caseSpecificQuestions), ...flatten(c.examinerQuestions),
    ...flatten(c.examinerSheet), ...flatten(c.pruefungsfallen),
    ...flatten(c.referenceArztbrief), ...flatten(c.musterSaetze),
    ...flatten(muster),
  ];
}

async function main() {
  const check = process.argv.includes('--check');
  const { loadAll } = await import('./loadCases.mjs');
  const { cases, fachwissen, muster } = await loadAll();
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => ({ id: r.id, term: r.t }));
  const fwByPath = new Map(fachwissen.map((f) => [f.pathology, f]));
  const result = {};
  for (const c of cases) {
    const fw = fwByPath.get(c.pathology);
    const fwFlat = fw ? flatten({
      ...fw,
      id: undefined, linkedCaseIds: undefined, linkedAufklaerungIds: undefined,
      keyFachbegriffeIds: undefined, pathology: undefined, specialty: undefined,
    }) : [];
    const texts = [...caseTexts(c, muster?.[c.id]), ...fwFlat];
    result[c.id] = linkTerms(texts, fb);
  }
  // Tri par fréquence documentaire (DF) ASCENDANTE puis id — DF calculée sur
  // `result` complet, une fois tous les cas liés (cf. en-tête du fichier).
  const df = new Map();
  for (const ids of Object.values(result)) for (const id of ids) df.set(id, (df.get(id) ?? 0) + 1);
  for (const caseId of Object.keys(result)) {
    result[caseId] = result[caseId].slice().sort((a, b) => (df.get(a) - df.get(b)) || (a < b ? -1 : a > b ? 1 : 0));
  }
  const json = JSON.stringify(result, null, 0) + '\n';
  if (check) {
    let current = ''; try { current = readFileSync(OUT, 'utf8'); } catch { /* absent */ }
    if (current.replace(/\r\n/g, '\n') !== json.replace(/\r\n/g, '\n')) { console.error('caseTermLinks.json est périmé : relancer `npm run content:link`'); process.exit(1); }
    console.log('caseTermLinks.json à jour'); return;
  }
  writeFileSync(OUT, json);
  const sizes = Object.values(result).map((a) => a.length);
  console.log(`${cases.length} cas liés · min ${Math.min(...sizes)} · médiane ${sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)]} · max ${Math.max(...sizes)}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e); process.exit(1); });
