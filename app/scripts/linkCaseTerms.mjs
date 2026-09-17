// ============================================================================
// Liaison cas ↔ Fachbegriffe PAR OCCURRENCE TEXTUELLE (spec F2a 3.5). La
// liaison par tags de pathologie ne couvre que 38 termes sur 2 266 : ce script
// scanne les textes réels de chaque cas avec la même règle de mot entier
// Unicode que l'autolink de l'app, et écrit src/data/caseTermLinks.json.
// Usage : node scripts/linkCaseTerms.mjs [--check]   (--check : exit 1 si le
// fichier diffère du résultat régénéré — utilisé par checkCaseTermLinks.mjs)
//
// ORDRE (relecture pédagogique F2a) : rareté lexicale ≠ pertinence clinique.
// Les textes d'un cas sont séparés en CORE (plainte, medicalView, Muster,
// questions, fiche examinateur, Arztbrief, pièges, Fachwissen) et CONTEXTUEL
// (antécédents, opérations, famille, social, médicaments, allergies, noxen —
// vrais matchs texte, souvent hors sujet). Par cas :
//   Les sections d'antécédents des Muster (musterSaetze, caseMuster) sont
//   routées de la même façon (elles reprennent la fiche patient).
//   (1) termes du diagnostic (verdachtsdiagnose, nom ou pathologie du cas),
//   (2) autres termes CORE par fréquence documentaire (DF) ascendante puis id,
//   (3) termes trouvés SEULEMENT en contexte, par DF ascendante puis id.
// DF calculée sur l'ensemble `result` une fois TOUS les cas liés. L'ENSEMBLE
// des termes liés est le même qu'avant ; seul l'ordre change. C'est une
// convention pour les CONSOMMATEURS de ce JSON : à eux de tronquer à N
// (`MAX_PER_CASE` est une préoccupation consommateur) — le JSON reste complet.
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

/** Ids des termes trouvés dans `texts`. `index` = tableau de termes (index
 *  construit à la volée) ou résultat de `buildIndex` (construit UNE fois dans main). */
export function linkTerms(texts, index) {
  const { re, byKey } = Array.isArray(index) ? buildIndex(index) : index;
  const found = new Set();
  for (const text of texts) for (const m of String(text ?? '').matchAll(re)) { const id = byKey.get(m[1].toLowerCase()); if (id) found.add(id); }
  return [...found].sort();
}

const flatten = (v, out = []) => { if (v == null) return out; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => flatten(x, out)); else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out)); return out; };
/** Sections de la fiche patient qui relèvent du CONTEXTE (antécédents incidents), pas du cas. */
export const CONTEXTUAL_SHEET_KEYS = ['vorerkrankungen', 'voroperationen', 'familienanamnese', 'sozialanamnese', 'medikamente', 'allergien', 'unvertraeglichkeiten', 'noxen'];
/** Aplatit `v` en routant vers `contextual` tout sous-arbre dont la clé est une
 *  section d'antécédents (fiche patient ET Muster de documentation, qui reprend
 *  les mêmes sections : « Jochbeinfraktur » y figure sous `vorerkrankungen`). */
const flattenSplit = (v, core, contextual, ctx = false) => {
  if (v == null) return;
  if (typeof v === 'string') (ctx ? contextual : core).push(v);
  else if (Array.isArray(v)) v.forEach((x) => flattenSplit(x, core, contextual, ctx));
  else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) flattenSplit(x, core, contextual, ctx || CONTEXTUAL_SHEET_KEYS.includes(k));
};
/** Textes d'un cas où un terme peut apparaître, séparés en `core` / `contextual` (cf. en-tête). */
export function caseTexts(c, muster) {
  const core = []; const contextual = [];
  flattenSplit(c.patientSheet, core, contextual);
  flattenSplit(c.musterSaetze, core, contextual);
  flattenSplit(muster, core, contextual);
  core.push(
    ...flatten(c.medicalView),
    ...flatten(c.caseSpecificQuestions), ...flatten(c.examinerQuestions),
    ...flatten(c.examinerSheet), ...flatten(c.pruefungsfallen),
    ...flatten(c.referenceArztbrief),
  );
  return { core, contextual };
}
/** Textes qui nomment le diagnostic du cas (rang 1). */
export function diagnosisTexts(c) { return [c.medicalView?.verdachtsdiagnose, c.name, c.pathology]; }

/** Ordre final d'un cas : diagnostic, puis CORE par DF asc + id, puis CONTEXTUEL seul par DF asc + id.
 *  `df` : Map id → fréquence documentaire sur tout le corpus. L'ensemble = core ∪ contextual. */
export function orderCaseTerms({ core, contextual, diagnosis }, df) {
  const cmp = (a, b) => ((df.get(a) ?? 0) - (df.get(b) ?? 0)) || (a < b ? -1 : a > b ? 1 : 0);
  const all = new Set([...core, ...contextual]);
  const diag = new Set(diagnosis.filter((id) => all.has(id)));
  const coreOnly = core.filter((id) => !diag.has(id));
  const coreSet = new Set(core);
  const ctxOnly = contextual.filter((id) => !diag.has(id) && !coreSet.has(id));
  return [...[...diag].sort(cmp), ...coreOnly.sort(cmp), ...ctxOnly.sort(cmp)];
}

async function main() {
  const check = process.argv.includes('--check');
  const { loadAll } = await import('./loadCases.mjs');
  const { cases, fachwissen, muster } = await loadAll();
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => ({ id: r.id, term: r.t }));
  const index = buildIndex(fb);   // UNE fois : l'avertissement « doublon » n'est émis qu'une fois
  const fwByPath = new Map(fachwissen.map((f) => [f.pathology, f]));
  const parts = {};
  for (const c of cases) {
    const fw = fwByPath.get(c.pathology);
    const fwFlat = fw ? flatten({
      ...fw,
      id: undefined, linkedCaseIds: undefined, linkedAufklaerungIds: undefined,
      keyFachbegriffeIds: undefined, pathology: undefined, specialty: undefined,
    }) : [];
    const { core, contextual } = caseTexts(c, muster?.[c.id]);
    parts[c.id] = {
      core: linkTerms([...core, ...fwFlat], index),
      contextual: linkTerms(contextual, index),
      diagnosis: linkTerms(diagnosisTexts(c), index),
    };
  }
  // DF sur l'ensemble complet (core ∪ contextuel) une fois tous les cas liés, puis ordre par cas.
  const df = new Map();
  for (const p of Object.values(parts)) for (const id of new Set([...p.core, ...p.contextual])) df.set(id, (df.get(id) ?? 0) + 1);
  const result = {};
  for (const c of cases) result[c.id] = orderCaseTerms(parts[c.id], df);
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
