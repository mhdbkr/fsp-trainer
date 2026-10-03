// ============================================================================
// RUPTURE D'ORDRE CLINIQUE — audit série 3, §5 ; étendu au lot Q0.
// INFORMATIF, JAMAIS BLOQUANT (`|| true` en CI).
// ----------------------------------------------------------------------------
// Le constat de la direction : `case-commotio` demande « was hat Ihr
// Glukosesensor kurz vor dem Unfall angezeigt? » dans « Aktuelle Beschwerden »,
// alors que le diabète de type 1 et la pompe à insuline ne sont déclarés que
// DEUX CHAPITRES plus loin, en « Vorerkrankungen ». Le médecin sait quelque
// chose que le patient ne lui a pas encore dit.
//
// LES RÈGLES — voir `questionOrderDetect.mjs` : une question PROPRE AU CAS dont
// le syntagme (défini, possessif, ordinal) ou l'affirmation présuppose un fait
// qui n'apparaît que PLUS TARD (réponse ultérieure ou champ de fiche).
// Les questions générales de la trame ne présupposent rien : leurs mots sont
// exclus (à la place de l'ancien seuil de fréquence `maxDf`).
//
// POURQUOI INFORMATIF : ≈ 50 % de vrais positifs sur l'échantillon relu (revue Q0). Le coût du faux
// positif dépasse le gain d'une porte.
//
// Usage : node scripts/checkQuestionOrder.mjs [--case <id>]
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { detect, trameWords } from './questionOrderDetect.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const caseIdx = process.argv.indexOf('--case');
const ONLY = caseIdx > 0 ? process.argv[caseIdx + 1] : null;

const dir = mkdtempSync(join(tmpdir(), 'fsp-order-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { playedTrame } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseAlts, phraseProbes, phraseFollowUp, phraseIsCaseSpecific } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });
const cases = m.seedCases();

/** Le parcours joué, tour par tour, dans l'ordre d'affichage (la Fach après aktuell). */
function walk(c) {
  const { chapters, fach } = m.playedTrame(c);
  const ans = c.patientSheet?.antworten ?? {};
  const turns = [];
  const add = (ch) => (p) => turns.push({
    ch, own: m.phraseIsCaseSpecific(p),
    q: [m.phraseText(p), ...m.phraseFollowUp(p)].join(' '),
    a: m.phraseProbes(p).map((id) => ans[id]).filter(Boolean).join(' '),
    all: [m.phraseText(p), ...m.phraseAlts(p), ...m.phraseFollowUp(p)],
  });
  for (const ch of chapters) {
    ch.questions.forEach(add(ch.id));
    if (fach && ch.id === 'aktuell') fach.chapter.questions.forEach(add(fach.chapter.id));
  }
  return turns;
}

// Ce que la FICHE déclare hors dialogue : les champs que le patient ne livre
// qu'une fois qu'on l'interroge.
const factsOf = (s = {}) => JSON.stringify([s.sozialanamnese, s.vorerkrankungen, s.voroperationen, s.medikamente, s.noxen, s.familienanamnese, s.allergien, s.personalia]);

const walks = new Map(cases.map((c) => [c.id, walk(c)]));
const trame = trameWords([...walks.values()].flatMap((ts) => ts.filter((t) => !t.own).flatMap((t) => t.all)));

const hits = [];
for (const c of cases) {
  if (ONLY && c.id !== ONLY) continue;
  hits.push(...detect({ id: c.id, facts: factsOf(c.patientSheet), turns: walks.get(c.id) }, trame));
}
const by = (r) => hits.filter((h) => h.rule === r).length;
console.log(`ℹ Rupture d'ordre : ${hits.length} candidat(s) sur ${ONLY ? 1 : cases.length} cas (ordinal ${by('ORD')} · SN ${by('NP')} · affirmation ${by('ASSERT')}).`);
console.log('  (porte INFORMATIVE : ≈ 50 % de vrais positifs sur échantillon — jamais bloquante)\n');
for (const h of hits) console.log(`  · ${h.id} [${h.ch}] ${h.rule} « ${h.hit} »\n      ${h.q.slice(0, 160)}`);
