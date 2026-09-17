// ============================================================================
// Validateur des QUESTIONS PROPRES AU CAS (FB2-J4, durci après la revue du
// gardien du 17 sept.).
//
// Règle éditoriale : UNE question du cas = UN chapitre = UNE information,
// dite au patient, et qui n'existe pas déjà dans la trame standard.
//  1. chaque question est un objet { frage, kapitel } d'un chapitre connu ;
//  2. pas de question Frauenanamnese chez un patient ;
//  3. la question S'ADRESSE au patient (Sie / Ihr / Ihnen / impératif poli),
//     sans note entre parenthèses qui révèle la réponse (« (Vater) ») ;
//  4. elle ne DOUBLE pas une question standard de sa trame (chapitres
//     généraux + Fachanamnese de la spécialité) : similarité de Jaccard sur
//     les mots pleins ≥ 0,75 = doublon → à supprimer ou à recentrer sur
//     l'axe qu'elle ajoute (seuil 0,75 : en dessous, c'est une précision).
// Usage : node scripts/checkCaseQuestionChapters.mjs [--report]
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'data', 'seedCases.ts'), 'utf8');
const guide = readFileSync(join(here, '..', 'src', 'data', 'guides', 'anamneseChapters.ts'), 'utf8');
const report = process.argv.includes('--report');
const KAPITEL = new Set(['aktuell', 'vegetativ', 'vorerkrankungen', 'medikamente', 'allergien', 'noxen', 'familie-sozial', 'frauenanamnese', 'fach']);

// --- questions standard de la trame -----------------------------------------
const STOP = new Set(['sie', 'ihr', 'ihre', 'ihren', 'ihrem', 'ihnen', 'haben', 'hatten', 'sind', 'ist', 'war', 'waren', 'oder', 'und', 'ein', 'eine', 'einen', 'einem', 'einer', 'der', 'die', 'das', 'den', 'dem', 'des', 'wie', 'was', 'wann', 'wo', 'ob', 'auch', 'noch', 'schon', 'mal', 'einmal', 'bei', 'mit', 'von', 'zu', 'zum', 'zur', 'in', 'im', 'an', 'am', 'auf', 'aus', 'für', 'nach', 'vor', 'seit', 'bis', 'es', 'das', 'dass', 'nicht', 'kein', 'keine', 'so', 'etwas', 'jemand', 'wurde', 'wurden', 'werden', 'können', 'könnten', 'müssen', 'bitte', 'gibt', 'geben', 'genau', 'denn', 'dabei', 'dann', 'wenn', 'falls', 'ja', 'nein', 'ganz', 'sehr', 'viel', 'viele', 'welche', 'welchen', 'welcher', 'welches', 'etwa', 'ungefähr', 'zurzeit', 'derzeit', 'zeit', 'letzter', 'letzten', 'letzte']);
const tokens = (s) => new Set(s.toLowerCase().replace(/[—–-]/g, ' ').replace(/[^a-zäöüß ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const jaccard = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; const u = a.size + b.size - i; return u ? i / u : 0; };

// Toutes les phrases du guide général (texte principal + variantes + relances).
const general = [...guide.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).filter((t) => /\?|Sie\b/.test(t) && t.length > 15);
// Fachanamnese par spécialité : bloc F('Spécialité', …) jusqu'au F( suivant.
const fachStarts = [...guide.matchAll(/\n  F\('([^']+)'/g)];
const fachBySpec = {};
fachStarts.forEach((m, i) => {
  const end = i + 1 < fachStarts.length ? fachStarts[i + 1].index : guide.indexOf('\n];', m.index);
  fachBySpec[m[1]] = [...guide.slice(m.index, end).matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]).filter((t) => t.length > 15);
});
const generalTok = general.map((t) => ({ t, k: tokens(t) }));
const fachTok = Object.fromEntries(Object.entries(fachBySpec).map(([s, arr]) => [s, arr.map((t) => ({ t, k: tokens(t) }))]));

// --- cas ---------------------------------------------------------------------
const idx = [...src.matchAll(/\n\s+id: 'case-/g)].map((m) => m.index); idx.push(src.length);
const problems = []; let n = 0, q = 0;
for (let i = 0; i < idx.length - 1; i++) {
  const b = src.slice(idx[i], idx[i + 1]);
  const id = b.match(/id: '(case-[^']+)'/)[1]; n++;
  const spec = (b.match(/specialty: '([^']+)'/) || [])[1];
  const geschlecht = (b.match(/geschlecht: '([mw])'/) || [])[1];
  const m = b.match(/caseSpecificQuestions:\s*\[([\s\S]*?)\n\s{6}\],/);
  if (!m) { problems.push(`${id} — caseSpecificQuestions introuvable`); continue; }
  const body = m[1];
  for (const bare of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)',?\s*$/gm)) problems.push(`${id} — question sans chapitre : « ${bare[1].slice(0, 60)} »`);
  const std = [...generalTok, ...(fachTok[spec] ?? [])];
  for (const e of body.matchAll(/\{\s*frage:\s*'((?:[^'\\]|\\.)*)',\s*kapitel:\s*'([^']+)'\s*\}/g)) {
    q++;
    const frage = e[1].replace(/\\'/g, "'"), kap = e[2];
    if (!KAPITEL.has(kap)) problems.push(`${id} — kapitel inconnu « ${kap} » : « ${frage.slice(0, 60)} »`);
    if (kap === 'frauenanamnese' && geschlecht === 'm') problems.push(`${id} — question Frauenanamnese chez un patient : « ${frage.slice(0, 60)} »`);
    // Une question dite au patient : adresse (Sie/Ihr) OU forme interrogative
    // verbale (« Treten die Beschwerden … auf? »). « Gewichtsverlust? » et
    // « Familienanamnese Darmkrebs? » ne passent pas.
    // (Fremdanamnese : « er / sie » à la troisième personne est aussi une adresse.)
    const addressed = /\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihres|Ihnen|er|ihn|ihm)\b/.test(frage)
      || /^(W\w+|Seit|Gibt|Gab|Um|Zu|In|An|Bei|Beim|Bis|Nach|Vor|Sind|Ist|War)\b/.test(frage)
      || /^[A-ZÄÖÜ][a-zäöüß]{1,10}(t|en|st)\b/.test(frage)
      || /^[A-ZÄÖÜ]\w+ (der|die|das|den|dem|des|es|sich|auch|ein|eine|einen|einem|in|jemand|beide|Ihr\w*)\b/.test(frage);
    if (!addressed || !/\?/.test(frage)) problems.push(`${id} [${kap}] — ne s'adresse pas au patient : « ${frage.slice(0, 70)} »`);
    if (/\([^)]*\)/.test(frage)) problems.push(`${id} [${kap}] — note entre parenthèses : « ${frage.slice(0, 70)} »`);
    const k = tokens(frage);
    let best = { s: 0, t: '' };
    for (const g of std) { const s = jaccard(k, g.k); if (s > best.s) best = { s, t: g.t }; }
    if (best.s >= 0.75) problems.push(`${id} [${kap}] — double la trame (${best.s.toFixed(2)}) : « ${frage.slice(0, 60)} » ≈ « ${best.t.slice(0, 60)} »`);
  }
}
if (problems.length) {
  console.log(`❌ ${problems.length} problème(s) sur les questions propres au cas (${q} questions, ${n} cas) :\n`);
  for (const p of report ? problems : problems.slice(0, 40)) console.log('  ✗ ' + p);
  if (!report && problems.length > 40) console.log(`  … ${problems.length - 40} de plus (--report pour tout voir)`);
  process.exit(1);
}
console.log(`✅ QUESTIONS DU CAS PROPRES — ${n} cas, ${q} questions : un chapitre, une information, dite au patient, sans doublon avec la trame.`);
