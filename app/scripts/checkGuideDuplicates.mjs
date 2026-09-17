// ============================================================================
// Validateur ANTI-DOUBLONS du guide d'anamnèse (FB2-J2, FB2-J3).
//
// Mehdi, après ses simulations : « tu cherches le Beruf du patient 2 fois,
// voire 3 » ; « deux options avec la même signification : verstorben et
// nein ». Deux fautes d'application qu'un script voit avant lui.
//
// Règle 1 — une INFORMATION n'est demandée qu'une fois par trame générale :
//   chaque thème sensible (métier, tabac, alcool, allergies, poids…) a un
//   motif ; il ne doit apparaître que dans les questions PRINCIPALES d'UN
//   seul chapitre de ALLGEMEINE_ANAMNESE (les alts/followUps d'une même
//   question ne comptent pas — ce sont des reformulations).
// Règle 2 — aucune question principale (texte normalisé) ne se répète entre
//   deux chapitres, Fachanamnesen comprises.
// Règle 3 — aucun toggle situationnel n'oppose deux libellés synonymes :
//   les conditions « Falls X: » sont listées et confrontées à une liste de
//   paires interdites (verstorben/nein …) que le parseur doit résoudre en
//   choix explicite.
// Usage : node scripts/checkGuideDuplicates.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/data/guides/anamneseChapters.ts'), 'utf8');
const followUpSrc = readFileSync(join(root, 'src/data/guides/followUp.ts'), 'utf8');

// --- découpe : chapitres généraux + Fachanamnesen ----------------------------
const a = src.indexOf('export const ALLGEMEINE_ANAMNESE');
const b = src.indexOf('\n];', a);
const general = src.slice(a, b).split(/\n  \{\n    id: '/).slice(1).map((raw) => ({ id: raw.match(/^([a-z-]+)'/)[1], raw }));
// Chaque bloc F('Spécialité', …) court jusqu'au F( suivant ou à la fin du tableau.
const fachStarts = [...src.matchAll(/\n  F\('([^']+)'/g)];
const fach = fachStarts.map((m, i) => {
  const end = i + 1 < fachStarts.length ? fachStarts[i + 1].index : src.indexOf('\n];', m.index);
  return { id: `fach:${m[1]}`, raw: src.slice(m.index, end) };
});

// Questions PRINCIPALES d'un chapitre : `text: '…'` et les chaînes nues d'un
// tableau `questions` — pas les `alts`, pas les `followUp`.
function mainQuestions(raw) {
  const out = [];
  const stripped = raw.replace(/alts:\s*\[[^\]]*\]/g, '').replace(/followUp:\s*\[[^\]]*\]/g, '');
  for (const m of stripped.matchAll(/text:\s*'((?:[^'\\]|\\.)*)'/g)) out.push(m[1]);
  const q = stripped.match(/questions:\s*\[([\s\S]*?)\n\s{4}\]/);
  if (q) for (const m of q[1].matchAll(/^\s{6}'((?:[^'\\]|\\.)*)',?$/gm)) out.push(m[1]);
  return out;
}
const chapters = [...general, ...fach].map((c) => ({ id: c.id, questions: mainQuestions(c.raw) }));

// --- règle 1 : un thème = un chapitre ----------------------------------------
const THEMES = [
  { name: 'métier', re: /von Beruf|beruflich|Arbeitssituation/i, scope: 'general' },
  { name: 'exposition professionnelle', re: /besonderen Stoffen|Chemikalien|Stäuben/i, scope: 'general' },
  { name: 'tabac', re: /\bRauchen Sie\b/i, scope: 'all' },
  { name: 'alcool', re: /\bTrinken Sie Alkohol\b/i, scope: 'all' },
  { name: 'allergies', re: /\bAllergien\b/i, scope: 'general' },
  { name: 'poids', re: /wiegen Sie/i, scope: 'general' },
  { name: 'médicaments', re: /Medikamente.*(ein|nehmen)/i, scope: 'general' },
];
const problems = [];
for (const t of THEMES) {
  const where = chapters
    .filter((c) => (t.scope === 'general' ? !c.id.startsWith('fach:') : true))
    .filter((c) => c.questions.some((q) => t.re.test(q)))
    .map((c) => c.id);
  if (where.length > 1) problems.push(`thème « ${t.name} » demandé dans ${where.length} chapitres : ${where.join(', ')}`);
}

// --- règle 2 : texte identique entre chapitres d'une MÊME trame ---------------
// Une trame = les chapitres généraux + UNE Fachanamnese ; deux Fachanamnesen ne
// se rencontrent jamais dans une simulation, leurs recouvrements sont légitimes.
const norm = (s) => s.toLowerCase().replace(/[^a-zäöüß ]/g, ' ').replace(/\s+/g, ' ').trim();
const isFach = (id) => id.startsWith('fach:');
const seen = new Map();
for (const c of chapters) for (const q of c.questions) {
  const k = norm(q);
  const prev = seen.get(k);
  if (prev && prev !== c.id && !(isFach(prev) && isFach(c.id))) problems.push(`question répétée dans ${prev} et ${c.id} : « ${q.slice(0, 70)} »`);
  if (!prev || !isFach(c.id)) seen.set(k, c.id);
}

// --- règle 3 : toggles synonymes ----------------------------------------------
// Conditions situationnelles présentes dans le guide, hors ja/sehr stark/anfallsartig.
const conds = new Set([...src.matchAll(/'Falls ([^:']{2,40}):/g)].map((m) => m[1].toLowerCase()).filter((c) => !/^(ja|bejaht|sehr stark|anfallsartig)$/.test(c)));
// Une condition dont le « non » serait un synonyme doit être résolue en `wahl` dans followUp.ts.
const MUST_BE_CHOICE = ['verstorben'];
for (const c of conds) {
  if (MUST_BE_CHOICE.includes(c) && !new RegExp(`/${c}/\\.test\\(c\\)\\)\\s*return \\{ kind: 'wahl'`).test(followUpSrc)) {
    problems.push(`« Falls ${c}: » produirait un toggle « ${c} / nein » (synonymes) — le parseur doit le rendre en choix explicite`);
  }
}

if (problems.length) {
  console.log(`❌ ${problems.length} doublon(s) dans le guide d'anamnèse :\n`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log(`✅ AUCUN DOUBLON — ${chapters.length} chapitres, ${chapters.reduce((s, c) => s + c.questions.length, 0)} questions principales, ${conds.size} conditions situationnelles.`);
