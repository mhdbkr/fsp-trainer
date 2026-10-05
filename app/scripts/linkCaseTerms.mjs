// ============================================================================
// Liaison cas ↔ Fachbegriffe PAR OCCURRENCE TEXTUELLE (spec F2a 3.5, resserrée
// en F4a §3.1). Même règle de mot entier Unicode que l'autolink de l'app ;
// écrit src/data/caseTermLinks.json.
// Usage : node scripts/linkCaseTerms.mjs [--check]   (--check : exit 1 si le
// fichier diffère du résultat régénéré — utilisé par checkCaseTermLinks.mjs)
//
// F4a — un terme n'est lié à un cas que s'il y est CENTRAL :
//  - champs EXCLUS (le questionnaire standard et les signes niés, déjà
//    structurés) : EXCLUDED_KEYS ;
//  - champs CONTEXTUELS (anamnèse systématique, diagnostics différentiels —
//    toute clé dd/unterscheidung) : CONTEXTUAL_SHEET_KEYS — ils ne lient rien ;
//  - seul ce que dit le CAS lie (retour direction n°1) : fiche patient, vue
//    médicale, Muster, Arztbrief de référence. La fiche Fachwissen (générique de
//    la pathologie : « Fontanelle » chez un homme de 54 ans), les questions
//    d'examinateur, les pièges et les questions du candidat sont contextuels ;
//  - dans les champs centraux, une occurrence NIÉE ne compte pas (isNegated) ;
//  - les mots d'examen (src/data/genericTerms.json) et les homonymes du
//    quotidien (src/data/homonymTerms.json : « Stärke ») ne sont liés à aucun cas ;
//  - un terme présent dans plus de SPECIFICITY_SHARE des cas n'est gardé que là
//    où il figure dans le diagnostic ou les constats principaux (leitsymptome,
//    begleitsymptome, schmerz de la fiche patient) ;
//  - les termes du diagnostic sont toujours liés (sauf génériques).
// ORDRE par cas : diagnostic, symptômes clés, ce que dit le patient, le reste ;
// dans un rang : le plus cité dans le cas, puis le plus spécifique (DF asc), puis
// id. Les consommateurs tronquent à N.
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../src/data/caseTermLinks.json');
const GENERIC = join(here, '../src/data/genericTerms.json');
const HOMONYMS = join(here, '../src/data/homonymTerms.json');
const ABBREVIATIONS = JSON.parse(readFileSync(join(here, '../src/data/sentenceAbbreviations.json'), 'utf8'));
export const SPECIFICITY_SHARE = 0.2;
/** Mots trop ambigus pour lier un cas (homographes du quotidien). */
const EXCLUDE = new Set(['in', 'vor', 'nach', 'bei', 'seit', 'ohne', 'mit', 'oder', 'und', 'aber', 'dann', 'noch', 'schon', 'sehr', 'gut', 'ganz']);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- Phrases ---------------------------------------------------------------
// Même règle que src/lib/sentence.ts (l'app) : Intl.Segmenter + garde des
// abréviations (lettre isolée suivie d'un point : « z. B. », « Z. n. », « V. a. » ;
// liste partagée src/data/sentenceAbbreviations.json : « ca. », « bzw. »…).
const SEG = new Intl.Segmenter('de', { granularity: 'sentence' });
export const endsWithAbbreviation = (s) => {
  const t = s.trimEnd();
  if (/(?:^|[\s(])(?:\p{L}|\d{1,2})\.$/u.test(t)) return true;   // « V. a. », ordinal « 3. Lendenwirbel », « am 12. März »
  return ABBREVIATIONS.some((a) => t.endsWith(a) && (t.length === a.length || /[\s(]/.test(t[t.length - a.length - 1])));
};
export function sentences(text) {
  const out = [];
  for (const { segment } of SEG.segment(String(text ?? ''))) {
    if (out.length && endsWithAbbreviation(out[out.length - 1])) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}

// --- Négation --------------------------------------------------------------
// Règle PURE, testée sur des phrases réelles du corpus (negation.fixtures.mjs).
// Portée = la PROPOSITION : la phrase est coupée aux « ; », « : », tirets
// d'incise et conjonctions adversatives (aber, jedoch, sondern, allerdings,
// dafür, während). Dans la proposition, un mot de négation — token entier,
// jamais dans un composé (« nichtsteroidal », « Nicht-ST-Hebungsinfarkt ») — est
//  - ANTÉPOSÉ (« ohne », ou suivi d'un nom avant la virgule suivante) : il nie
//    jusqu'à cette virgule (« ohne Ausstrahlung », « kein Fieber, kein Husten ») ;
//  - POSTPOSÉ sinon (« … wurden verneint », « Allergien seien keine bekannt ») :
//    il nie toute l'énumération qui précède, depuis le début de la proposition
//    ou de la subordonnée qui le porte (« , die … nicht ausstrahlen »).
// « nicht nur » n'est pas une négation.
// ponytail : heuristique de surface (majuscule = nom), pas d'analyse syntaxique —
// suffit pour « le terme n'est cité QUE nié » ; un analyseur viendra si une
// fixture réelle l'exige.
const NEGATION = /(?<![\p{L}\p{N}-])(kein(?:e|en|em|er|es)?|ohne|nicht|verneint|negativ|unauffällig|ausgeschlossen)(?![\p{L}\p{N}-])/giu;
const SUBORDINATE = /,\s+(?:die|der|das|den|dem|deren|dessen|welche[rsnm]?|dass|weil|wenn|da|sodass|nachdem|obwohl|wobei)(?![\p{L}])/giu;
const CLAUSE_BREAK = /;|:|\s[—–]\s|,?\s+(?:aber|jedoch|sondern|allerdings|dafür|während)\s/giu;
/** Vrai si l'occurrence qui commence à `at` dans `sentence` est niée. */
export function isNegated(sentence, at) {
  let start = 0; let end = sentence.length;
  for (const m of sentence.matchAll(CLAUSE_BREAK)) {
    if (m.index + m[0].length <= at) start = m.index + m[0].length;
    else if (m.index >= at) { end = m.index; break; }
  }
  const clause = sentence.slice(start, end); const rel = at - start;
  for (const n of clause.matchAll(NEGATION)) {
    const word = n[1].toLowerCase(); const after = clause.slice(n.index + n[0].length);
    if (word === 'nicht' && /^\s+nur(?![\p{L}])/iu.test(after)) continue;
    const untilComma = after.split(',')[0];
    if (word === 'ohne' || /(?<![\p{L}])\p{Lu}/u.test(untilComma)) {
      if (rel > n.index && rel < n.index + n[0].length + untilComma.length) return true;
    } else {
      let from = 0;
      for (const s of clause.slice(0, n.index).matchAll(SUBORDINATE)) from = s.index + s[0].length;
      if (rel >= from && rel < n.index) return true;
    }
  }
  return false;
}

// --- Variantes de libellé : scripts/labelVariants.mjs --------------------------
export { LABEL_VARIANT_EXCLUSIONS, labelVariants } from './labelVariants.mjs';
import { labelVariants } from './labelVariants.mjs';

// --- Index et occurrences ----------------------------------------------------
/** Index des termes → regex Unicode mot entier + formes fléchiées simples.
 *  `variants` : ajoute les variantes de libellé (labelVariants) ; un libellé exact prime
 *  toujours sur une variante, et une variante déjà prise est ignorée en silence. */
export function buildIndex(terms, { variants = false } = {}) {
  const byKey = new Map(); const alts = []; const dupes = new Map();
  const add = (key, id, quiet) => {
    key = key.trim(); if (key.length < 4 || EXCLUDE.has(key.toLowerCase())) return;
    const lower = key.toLowerCase();
    if (byKey.has(lower)) { if (!quiet) dupes.set(lower, (dupes.get(lower) ?? 1) + 1); return; }
    byKey.set(lower, id); alts.push(key);
  };
  for (const t of terms) add(t.term, t.id, false);
  if (variants) for (const t of terms) for (const v of labelVariants(t.term)) add(v, t.id, true);
  if (dupes.size) {
    for (const [text, count] of dupes) console.error(`⚠ terme dupliqué ignoré : "${text}" (${count} occurrences)`);
  }
  alts.sort((a, b) => b.length - a.length);
  const re = new RegExp('(?<![\\p{L}\\p{N}])(' + alts.map(escapeRe).join('|') + ')(?:e|en|s|n)?(?![\\p{L}\\p{N}])', 'giu');
  return { re, byKey };
}

/** Ids des termes trouvés dans `texts`. `index` = tableau de termes ou résultat
 *  de `buildIndex`. `negation: true` : texte découpé en phrases, occurrences
 *  niées ignorées. */
export function linkTerms(texts, index, opts) { return [...countTerms(texts, index, opts).keys()].sort(); }
/** Comme linkTerms, mais rend Map id → nombre d'occurrences (affirmées si `negation`). */
export function countTerms(texts, index, { negation = false } = {}) {
  const { re, byKey } = Array.isArray(index) ? buildIndex(index) : index;
  const found = new Map();
  for (const text of texts) {
    for (const s of negation ? sentences(text) : [String(text ?? '')]) {
      for (const m of s.matchAll(re)) {
        const id = byKey.get(m[1].toLowerCase());
        if (id && !(negation && isNegated(s, m.index))) found.set(id, (found.get(id) ?? 0) + 1);
      }
    }
  }
  return found;
}

// --- Textes d'un cas ---------------------------------------------------------
const flatten = (v, out = []) => { if (v == null) return out; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => flatten(x, out)); else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out)); return out; };
/** Questionnaire standard (réponses aux sondes), signes niés, ids techniques (sondes
 *  retirées, motif déclaré : « fach-neuro-aura » n'est pas une aura) et consignes de jeu
 *  du simulant (persona, en français : « t'interrompre » ≈ Interruptio) : jamais lus. Le profil clinique
 *  (K2, ADR-0023) non plus : ses tags sont des ids (« meningitis » n'est pas une méningite du cas). */
export const EXCLUDED_KEYS = ['antworten', 'antwortenEmotional', 'frageAntworten', 'negativeFindings', 'persona', 'aktuellSkip', 'fachSkip', 'motiv', 'profil'];
/** Anamnèse systématique (fiche, Muster, Arztbrief) et diagnostics différentiels :
 *  contextuels — ils ne lient aucun terme à eux seuls. */
export const CONTEXTUAL_SHEET_KEYS = [
  'vorerkrankungen', 'voroperationen', 'familienanamnese', 'sozialanamnese', 'medikamente', 'allergien', 'unvertraeglichkeiten', 'noxen',
  'vegetativeAnamnese', 'medikation', 'allergien-noxen', 'familie-sozial', 'rauchen', 'alkohol', 'drogen', 'frauenanamnese',
  'differenzialdiagnosen', 'dd', 'unterscheidung',
];
/** Proposition (phrase coupée aux « ; » et tirets d'incise) de diagnostic différentiel,
 *  d'exclusion ou de bilan CONDITIONNEL (« Differenzialdiagnostisch… », « … in Betracht »,
 *  « zum Ausschluss », « abzuklären », « bei V. a. », « sekundäre Hypertonie », « ggf. …
 *  Diagnostik », « Suche/Frage nach », « Cave », « Nebenwirkungen », « … nur bei … » (n'importe où), « (Nur) bei X: … » sauf « Bei diesem Patienten: ») :
 *  contextuelle même dans un champ central. */
export const DD_CLAUSE = /differen[tz]ialdiagnos|(?<![\p{L}])DDx?(?![\p{L}])|ausschlie(?:ß|ss)|ausschluss|auszuschlie(?:ß|ss)|in betracht|abzugrenzen|abgrenz|abzukl(?:ä|ae)r|abkl(?:ä|ae)r|(?<![\p{L}])bei (?:V\.\s?a\.|verdacht auf)|sekundäre[rn]? (?:hypertonie|ursache)|ggf\..*diagnostik|suche nach|frage nach|(?<![\p{L}])cave(?![\p{L}])|nebenwirkung|(?<![\p{L}])nur bei(?![\p{L}])|^\s*(?:nur |erst )?bei (?!diese[mr](?![\p{L}])|de[mr] patient)[^:]{1,150}:/iu;
const CLAUSE = /(?<=;)|(?=\s[—–]\s)/u;
/** Parenthèse de raisonnement « (Hypokaliämie → Conn-Syndrom) » : contextuelle. */
const REASONING_PAREN = /\([^()]*→[^()]*\)/gu;
const flattenSplit = (v, core, contextual, ctx = false) => {
  if (v == null) return;
  if (typeof v === 'string') {
    if (ctx) { contextual.push(v); return; }
    for (const m of v.matchAll(REASONING_PAREN)) contextual.push(m[0]);
    v = v.replace(REASONING_PAREN, '');
    const clauses = sentences(v).flatMap((x) => x.split(CLAUSE));
    const isDD = (p) => DD_CLAUSE.test(p.replace(/^\s*[—–]\s*/u, ''));
    if (!clauses.some(isDD)) core.push(v);
    else for (const p of clauses) (isDD(p) ? contextual : core).push(p);
  }
  else if (Array.isArray(v)) v.forEach((x) => flattenSplit(x, core, contextual, ctx));
  else if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (EXCLUDED_KEYS.includes(k)) continue;
      flattenSplit(x, core, contextual, ctx || CONTEXTUAL_SHEET_KEYS.includes(k));
    }
  }
};
/** Parenthèse du bilan (medicalView.diagnostik) qui nomme un diagnostic différentiel du cas :
 *  la cible de l'examen, pas un constat (ptbs : « TSH, fT3, fT4 (Hyperthyreose) ») — contextuelle. */
const withoutDdTargets = (mv, contextual) => {
  const dd = flatten((mv?.differenzialdiagnosen ?? []).map((d) => d?.dd ?? d)).flatMap((s) => s.split('/'))
    .map((s) => s.replace(/\(.*$/su, '').trim().toLowerCase()).filter((s) => s.length >= 4);
  if (!mv?.diagnostik || !dd.length) return mv;
  const strip = (v) => typeof v === 'string'
    ? v.replace(/\([^()]*\)/gu, (p) => (dd.some((n) => p.toLowerCase().includes(n)) ? (contextual.push(p), '') : p))
    : Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, strip(x)])) : v;
  return { ...mv, diagnostik: strip(mv.diagnostik) };
};
/** Textes d'un cas : `core` (lient : ce que dit le cas lui-même), `contextual`
 *  (ne lient pas), `patient` (part de `core` issue de la fiche patient), `primary`
 *  (constats principaux : leitsymptome, begleitsymptome, schmerz). `muster` =
 *  les Muster du cas (identiques à c.musterSaetze : lus une fois) ; `fw` = la
 *  fiche Fachwissen de la pathologie, entièrement contextuelle. */
export function caseTexts(c, muster, fw) {
  const patient = []; const core = []; const contextual = [];
  flattenSplit(c.patientSheet, patient, contextual);
  core.push(...patient);
  flattenSplit(muster ?? c.musterSaetze, core, contextual);
  flattenSplit(withoutDdTargets(c.medicalView, contextual), core, contextual);
  core.push(...flatten(c.referenceArztbrief));
  if (fw) flattenSplit({ ...fw, id: undefined, linkedCaseIds: undefined, linkedAufklaerungIds: undefined, keyFachbegriffeIds: undefined, pathology: undefined, specialty: undefined }, core, contextual, true);
  contextual.push(...flatten(c.caseSpecificQuestions), ...flatten(c.examinerQuestions), ...flatten(c.examinerSheet), ...flatten(c.pruefungsfallen));
  const ps = c.patientSheet ?? {};
  const primary = [...flatten(ps.leitsymptome), ...flatten(ps.begleitsymptome), ...flatten(ps.schmerz)];
  return { core, contextual, patient, primary };
}
/** Textes où le cas parle de lui-même : fiche patient hors exclus, vue médicale hors
 *  diagnostics différentiels ; `withMuster` (porte CI du top 10) : + les Muster hors DD,
 *  qui décrivent CE patient. */
export function ownTexts(c, { withMuster = false } = {}) {
  const own = []; const ignored = [];
  flattenSplit(c.patientSheet, own, own);
  flattenSplit(c.medicalView, own, ignored);
  if (withMuster) flattenSplit(c.musterSaetze, own, ignored);
  return own;
}
/** Synonymes glossaire d'un diagnostic absent du glossaire (src/data/diagnosisAliases.json :
 *  « Bandscheibenvorfall » → « Diskusprolaps »). */
const DIAGNOSIS_ALIASES = Object.entries(JSON.parse(readFileSync(join(here, '../src/data/diagnosisAliases.json'), 'utf8')));
/** Textes qui nomment le diagnostic du cas (rang 1), alias compris. */
export function diagnosisTexts(c) {
  const texts = [c.medicalView?.verdachtsdiagnose, c.name, c.pathology];
  const joined = texts.join(' ').toLowerCase();
  return [...texts, ...DIAGNOSIS_ALIASES.filter(([k]) => joined.includes(k.toLowerCase())).map(([, v]) => v)];
}

/** Ordre final d'un cas : diagnostic, symptômes clés (`primary` : leitsymptome, begleitsymptome,
 *  schmerz), ce que dit le patient (`patient`), la vue médicale hors DD (`own`), le reste du CORE
 *  (ce que seuls les Muster disent), puis CONTEXTUEL seul. Dans un rang :
 *  le plus cité dans le cas (`counts` : id → occurrences), puis DF asc, puis id.
 *  `df` : Map id → fréquence documentaire sur tout le corpus. L'ensemble = core ∪ contextual. */
export function orderCaseTerms({ core, contextual, diagnosis, named = [], primary = [], patient = [], own = [], counts = {} }, df) {
  const cmp = (a, b) => ((counts[b] ?? 0) - (counts[a] ?? 0)) || ((df.get(a) ?? 0) - (df.get(b) ?? 0)) || (a < b ? -1 : a > b ? 1 : 0);
  const all = new Set([...core, ...contextual]);
  const diag = new Set(diagnosis.filter((id) => all.has(id)));
  const key = new Set(primary.filter((id) => all.has(id) && !diag.has(id)));   // « Fieber » 2ᵉ, pas 34ᵉ (revue A2)
  const said = new Set(patient.filter((id) => all.has(id) && !diag.has(id) && !key.has(id)));
  const ranked = (id) => diag.has(id) || key.has(id) || said.has(id);
  const mv = new Set(own.filter((id) => all.has(id) && !ranked(id)));
  const coreOnly = core.filter((id) => !ranked(id) && !mv.has(id));
  const coreSet = new Set(core);
  const ctxOnly = contextual.filter((id) => !ranked(id) && !mv.has(id) && !coreSet.has(id));
  const byName = (a, b) => Number(named.includes(b)) - Number(named.includes(a));   // le terme qui nomme la pathologie en tête (Hypertonie avant Schlafapnoe)
  return [...[...diag].sort((a, b) => byName(a, b) || cmp(a, b)), ...[...key].sort(cmp), ...[...said].sort(cmp), ...[...mv].sort(cmp), ...coreOnly.sort(cmp), ...ctxOnly.sort(cmp)];
}

/** Ids du diagnostic (génériques retirés) : `diagnosisTexts` à l'index `index` ∪ nom et pathologie
 *  du cas à l'index `diagIndex` (variantes de libellé : « Arterielle Hypertonie » → Hypertonie/Hypertonus).
 *  Partagé par la liaison et sa porte CI. */
export function caseDiagnosis(c, { index, diagIndex = index, generic = new Set() }) {
  return [...new Set([...linkTerms(diagnosisTexts(c), index), ...linkTerms([c.name, c.pathology], diagIndex)])].filter((id) => !generic.has(id)).sort();
}

/** Parts d'un cas (ids) : `core`, `primary`, `patient` filtrés par négation, `diagnosis` non filtré
 *  (index `diagIndex`, défaut `index`) ; `counts` : occurrences affirmées dans le core ; génériques
 *  retirés. */
export function caseParts(c, { muster, fw, index, diagIndex = index, generic }) {
  const { core, primary, patient } = caseTexts(c, muster, fw);
  const keep = (ids) => ids.filter((id) => !generic.has(id));
  const patientIds = keep(linkTerms(patient, index, { negation: true }));
  const diagnosis = caseDiagnosis(c, { index, diagIndex, generic });
  const found = countTerms(core, index, { negation: true });
  // le diagnostic nommé par une variante (« Hypertonie » → Hypertonie/Hypertonus) compte ses occurrences
  if (diagIndex !== index) for (const [id, k] of countTerms(core, diagIndex, { negation: true })) if (diagnosis.includes(id) && !found.has(id)) found.set(id, k);
  const counts = Object.fromEntries([...found].filter(([id]) => !generic.has(id)).sort());
  return {
    core: Object.keys(counts),
    primary: keep(linkTerms(primary, index, { negation: true })),
    patient: patientIds,
    own: keep(linkTerms(ownTexts(c), index, { negation: true })),
    diagnosis,
    named: keep(linkTerms([c.pathology], diagIndex)).filter((id) => diagnosis.includes(id)),
    counts,
  };
}

/** Liaison du corpus (pure) : seuil de spécificité puis ordre. `parts` : caseId → { core, primary, diagnosis }. */
export function linkCorpus(parts, share = SPECIFICITY_SHARE) {
  const n = Object.keys(parts).length;
  const coreDf = new Map();
  for (const p of Object.values(parts)) for (const id of new Set(p.core)) coreDf.set(id, (coreDf.get(id) ?? 0) + 1);
  const kept = {};
  for (const [caseId, p] of Object.entries(parts)) {
    const central = new Set([...p.primary, ...p.diagnosis]);
    kept[caseId] = [...new Set([...p.diagnosis, ...p.core.filter((id) => coreDf.get(id) <= n * share || central.has(id))])];
  }
  const df = new Map();
  for (const ids of Object.values(kept)) for (const id of ids) df.set(id, (df.get(id) ?? 0) + 1);
  const out = {};
  for (const [caseId, ids] of Object.entries(kept)) { const p = parts[caseId]; out[caseId] = orderCaseTerms({ core: ids, contextual: [], diagnosis: p.diagnosis, named: p.named, primary: p.primary, patient: p.patient, own: p.own, counts: p.counts }, df); }
  return out;
}

/** Index du glossaire : `index` (libellés exacts) lie tout le texte ; `diagIndex` (+ variantes de
 *  libellé) ne sert qu'au nom et à la pathologie du cas. Mesure (docs/reports/f4a-liaison.md) : les
 *  variantes partout ajoutent ~300 liens de bruit (Reha, Glukose, Serum…) pour 4 diagnostics retrouvés. */
export const glossaryIndexes = (fb) => ({ index: buildIndex(fb), diagIndex: buildIndex(fb, { variants: true }) });

/** Ids jamais liés : mots d'examen + homonymes du quotidien. */
export const loadGeneric = () => new Set([...JSON.parse(readFileSync(GENERIC, 'utf8')), ...Object.keys(JSON.parse(readFileSync(HOMONYMS, 'utf8')))]);

async function main() {
  const check = process.argv.includes('--check');
  const { loadAll } = await import('./loadCases.mjs');
  const { cases, fachwissen, muster } = await loadAll();
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => ({ id: r.id, term: r.t }));
  const { index, diagIndex } = glossaryIndexes(fb);   // UNE fois : l'avertissement « doublon » n'est émis qu'une fois
  const generic = loadGeneric();
  const fwByPath = new Map(fachwissen.map((f) => [f.pathology, f]));
  const parts = {};
  for (const c of cases) parts[c.id] = caseParts(c, { muster: muster?.[c.id], fw: fwByPath.get(c.pathology), index, diagIndex, generic });
  const result = linkCorpus(parts);
  const json = JSON.stringify(result, null, 0) + '\n';
  if (check) {
    let current = ''; try { current = readFileSync(OUT, 'utf8'); } catch { /* absent */ }
    if (current.replace(/\r\n/g, '\n') !== json.replace(/\r\n/g, '\n')) { console.error('caseTermLinks.json est périmé : relancer `npm run content:link`'); process.exit(1); }
    console.log('caseTermLinks.json à jour'); return;
  }
  writeFileSync(OUT, json);
  const sizes = Object.values(result).map((a) => a.length).sort((a, b) => a - b);
  const byTerm = new Map(); for (const ids of Object.values(result)) for (const id of ids) byTerm.set(id, (byTerm.get(id) ?? 0) + 1);
  const broad = [...byTerm].filter(([, k]) => k > cases.length * SPECIFICITY_SHARE).length;
  console.log(`${cases.length} cas liés · ${sizes.reduce((a, b) => a + b, 0)} liens · min ${sizes[0]} · médiane ${sizes[Math.floor(sizes.length / 2)]} · max ${sizes[sizes.length - 1]} · ${broad} terme(s) > 20 %`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e); process.exit(1); });
