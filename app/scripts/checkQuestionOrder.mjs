// ============================================================================
// RUPTURE D'ORDRE CLINIQUE — audit série 3, §5. INFORMATIF, JAMAIS BLOQUANT.
// ----------------------------------------------------------------------------
// Le constat de la direction : `case-commotio` demande « was hat Ihr
// Glukosesensor kurz vor dem Unfall angezeigt? » dans « Aktuelle Beschwerden »,
// alors que le diabète de type 1 et la pompe à insuline ne sont déclarés que
// DEUX CHAPITRES plus loin, en « Vorerkrankungen ». Le médecin sait quelque
// chose que le patient ne lui a pas encore dit.
//
// LA RÈGLE (§5.1) — le symptôme n'est pas la bonne unité ; c'est la
// PRÉSUPPOSITION qu'il faut détecter :
//   dans une question du parcours, tout syntagme nominal DÉFINI ou POSSESSIF
//   (Ihr|Ihre|… | der|die|das|dem|den + substantif capitalisé) présuppose que
//   son référent est déjà introduit. Si le lemme n'apparaît NULLE PART plus
//   tôt dans le parcours (question posée ou réponse obtenue) et apparaît PLUS
//   TARD, la question présuppose une information non encore recueillie.
//
// POURQUOI INFORMATIF (§6.4) : 3 occurrences nettes au Tier A, précision ~2/3
// au Tier B. Le coût du faux positif (`Ihre Stimmung` thématisée par le motif,
// `die Lunge`, `die Belastung`) dépasse le gain d'une porte. En CI : `|| true`.
//
// Usage : node scripts/checkQuestionOrder.mjs [--tier A|B|brut] [--case <id>]
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tierIdx = process.argv.indexOf('--tier');
const TIER = tierIdx > 0 ? process.argv[tierIdx + 1] : 'A';
const caseIdx = process.argv.indexOf('--case');
const ONLY = caseIdx > 0 ? process.argv[caseIdx + 1] : null;

const dir = mkdtempSync(join(tmpdir(), 'fsp-order-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { playedTrame } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseProbes, phraseFollowUp } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });
const cases = m.seedCases();

// Lemmatisation par troncature à 7 caractères (§5.1). Grossier et assumé :
// il confond des composés allemands proches — c'est une des raisons pour
// lesquelles cette porte reste informative.
const lemma = (w) => w.toLowerCase().replace(/[^a-zäöüß]/g, '').slice(0, 7);
const NOUNS = /\b[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ]{2,}\b/g;
const nounsOf = (t) => [...(t.match(NOUNS) ?? [])];

const POSS = 'Ihr|Ihre|Ihrem|Ihren|Ihrer';
const DEF = 'der|die|das|dem|den';
const RE_POSS = new RegExp(`\\b(?:${POSS})\\s+([A-ZÄÖÜ][a-zäöüß]{3,})`, 'g');
const RE_DEF = new RegExp(`\\b(?:${DEF})\\s+([A-ZÄÖÜ][a-zäöüß]{3,})`, 'g');

// Fréquence documentaire : un substantif présent dans beaucoup de cas est un
// mot de trame (`die Beschwerden`, `Ihre Schmerzen`), pas un fait propre au
// patient. `df` bas = le mot n'appartient qu'à ce cas-là.
const df = new Map();
const caseBlob = new Map();
for (const c of cases) {
  const blob = JSON.stringify({ s: c.patientSheet, q: c.caseSpecificQuestions });
  caseBlob.set(c.id, blob);
  for (const l of new Set(nounsOf(blob).map(lemma))) df.set(l, (df.get(l) ?? 0) + 1);
}

// Le parcours joué, tour par tour : question posée, puis réponse obtenue.
function walk(c) {
  const { chapters, fach } = m.playedTrame(c);
  const ans = c.patientSheet?.antworten ?? {};
  const turns = [];
  for (const ch of chapters) {
    const add = (chId) => (p) => {
      const q = [m.phraseText(p), ...m.phraseFollowUp(p)].join(' ');
      const a = m.phraseProbes(p).map((id) => ans[id]).filter(Boolean).join(' ');
      turns.push({ ch: chId, q, a });
    };
    for (const p of ch.questions) add(ch.id)(p);
    if (fach && ch.id === 'aktuell') for (const p of fach.chapter.questions) add(fach.chapter.id)(p);
  }
  return turns;
}

// Ce que la FICHE déclare hors dialogue : les champs que le patient ne livre
// qu'une fois qu'on l'interroge. C'est là que « Glukosesensor » attendait.
const sheetLater = (c) => [
  ...(c.patientSheet?.vorerkrankungen ?? []), ...(c.patientSheet?.medikamente ?? []),
  ...(c.patientSheet?.voroperationen ?? []),
].join(' ');

const TIERS = {
  A: { re: RE_POSS, minLen: 10, maxDf: 3 },
  B: { re: RE_DEF, minLen: 8, maxDf: 8 },
  brut: { re: RE_DEF, minLen: 3, maxDf: 13 },
};
const conf = TIERS[TIER] ?? TIERS.A;

const hits = [];
for (const c of cases) {
  if (ONLY && c.id !== ONLY) continue;
  const turns = walk(c);
  const intro = new Set();
  const later = sheetLater(c);
  turns.forEach((t, i) => {
    // `eroeffnung` et `abschluss` sont du DISCOURS TENU, pas de l'interrogatoire :
    // le médecin y annonce le plan de l'entretien (« Fragen zu Ihren Symptomen,
    // Ihrer Vorgeschichte und Ihren Lebensgewohnheiten ») ou restitue. Rien
    // n'y est présupposé — les y chercher ne produit que des faux positifs.
    if (t.ch === 'eroeffnung' || t.ch === 'abschluss') { for (const w of nounsOf(`${t.q} ${t.a}`)) intro.add(lemma(w)); return; }
    // Un SN défini/possessif dont le référent n'est pas encore introduit…
    for (const mm of [...t.q.matchAll(conf.re), ...(conf.re === RE_POSS ? [] : t.q.matchAll(RE_POSS))]) {
      const noun = mm[1];
      if (noun.length < conf.minLen) continue;
      const l = lemma(noun);
      if (intro.has(l)) continue;
      if ((df.get(l) ?? 0) > conf.maxDf) continue;
      // …et qui apparaît PLUS TARD : réponse ultérieure, ou champ de fiche.
      const ahead = turns.slice(i + 1).some((u) => lemma(u.a).length && nounsOf(`${u.q} ${u.a}`).map(lemma).includes(l))
        || nounsOf(later).map(lemma).includes(l);
      if (!ahead) continue;
      hits.push({ id: c.id, ch: t.ch, noun, df: df.get(l) ?? 0, q: t.q });
    }
    for (const w of nounsOf(`${t.q} ${t.a}`)) intro.add(lemma(w));
  });
}

const seen = new Set();
const uniq = hits.filter((h) => { const k = `${h.id}|${h.noun}`; if (seen.has(k)) return false; seen.add(k); return true; });
console.log(`ℹ Rupture d'ordre — Tier ${TIER} : ${uniq.length} occurrence(s) sur ${ONLY ? 1 : cases.length} cas.`);
console.log('  (porte INFORMATIVE : 3 occurrences nettes au Tier A, précision ~2/3 au Tier B — jamais bloquante)\n');
for (const h of uniq) console.log(`  · ${h.id} [${h.ch}] « ${h.noun} » (df=${h.df})\n      ${h.q.slice(0, 160)}`);
