// ============================================================================
// Validateur de la TRAME JOUÉE (retour du gardien, lot 5) : ce que le
// candidat voit réellement pour CHAQUE cas — chapitres généraux adaptés,
// variante « Aktuelle Beschwerden » moins ce que la Fach couvre, Fachanamnese
// adaptée (sexe, âge), questions du cas — ne doit contenir aucune question en
// double, ni exacte ni par le sens (recouvrement ≥ 0,6 sur les mots pleins).
// Les portes statiques lisent la source ; celle-ci exécute le montage réel.
// Usage : node scripts/checkPlayedTrame.mjs [--report]
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const report = process.argv.includes('--report');
const dir = mkdtempSync(join(tmpdir(), 'fsp-trame-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { adaptChaptersForCase, fachChapterForCase } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseAlts, phraseFollowUp, phraseProbes } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
  export { PROBE_BY_ID } from ${JSON.stringify(join(root, 'src/data/guides/anamneseProbes.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });
const cases = m.seedCases();
// --show <case-id> : imprime la trame jouée d'un cas (aktuell + Fach) pour relecture.
const showIdx = process.argv.indexOf('--show');
if (showIdx > 0) {
  const c = cases.find((x) => x.id === process.argv[showIdx + 1]);
  for (const ch of m.adaptChaptersForCase(c)) if (ch.id === 'aktuell') for (const p of ch.questions) console.log('  [aktuell]', m.phraseText(p).slice(0, 110));
  const f = m.fachChapterForCase(c); if (f) for (const p of f.chapter.questions) console.log('  [' + f.chapter.id + ']', m.phraseText(p).slice(0, 110));
  process.exit(0);
}

const STOP = new Set('sie ihr ihre ihren ihrem ihnen haben hatten sind ist war waren oder und ein eine einen einem einer der die das den dem des wie was wann wo ob auch noch schon mal einmal bei mit von zu zum zur in im an am auf aus für nach vor seit bis es dass nicht kein keine so etwas jemand wurde wurden werden können könnten müssen bitte gibt geben genau denn dabei dann wenn falls ja nein ganz sehr viel viele welche welchen welcher welches etwa ungefähr zurzeit derzeit zeit letzter letzten letzte sich zum beispiel eher sonst ihrer ihres über unter durch beim nachts tagsüber heute jetzt immer wieder dazu dafür davon damit noch nehmen nimmt medikament medikamente beschwerden probleme schwierigkeiten bemerkt'.split(' '));
const tokens = (t) => new Set(t.toLowerCase().replace(/[—–-]/g, ' ').replace(/[^a-zäöüß ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
// Coefficient de recouvrement (|A∩B| / min) : une question courte contenue dans
// une longue est un doublon, là où Jaccard la laisserait passer (« Stockwerke
// … Pause » vs la question Fach complète).
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; const mn = Math.min(a.size, b.size); return mn ? i / mn : 0; };

let problems = []; let n = 0, q = 0;
for (const c of cases) {
  n++;
  const lines = [];
  const push = (ch, p) => { const t = m.phraseText(p); lines.push({ ch, t, k: tokens(t), probes: m.phraseProbes(p) }); };
  for (const ch of m.adaptChaptersForCase(c)) for (const p of ch.questions) push(ch.id, p);
  const f = m.fachChapterForCase(c); if (f) for (const p of f.chapter.questions) push(f.chapter.id, p);
  q += lines.length;
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i], b = lines[j];
    // Une Fach « approfondit » une question générale par contrat (deepens) : toléré.
    const deep = (x, y) => x.probes.some((pp) => { const d = m.PROBE_BY_ID[pp]?.deepens; return d && y.probes.includes(d); });
    if (deep(a, b) || deep(b, a)) continue;
    const s = jac(a.k, b.k);
    if (s >= 0.6 && a.k.size >= 4 && b.k.size >= 4) problems.push(`${c.id} — ${a.ch} ↔ ${b.ch} (${s.toFixed(2)}) : « ${a.t.slice(0, 55)} » ≈ « ${b.t.slice(0, 55)} »`);
  }
}
if (problems.length) {
  console.log(`❌ ${problems.length} doublon(s) dans la trame JOUÉE (${n} cas, ${q} questions affichées) :\n`);
  for (const p of report ? problems : problems.slice(0, 40)) console.log('  ✗ ' + p);
  if (!report && problems.length > 40) console.log(`  … ${problems.length - 40} de plus (--report)`);
  process.exit(1);
}
console.log(`✅ TRAME JOUÉE SANS DOUBLON — ${n} cas, ${q} questions affichées, aucune paire ≥ 0,6.`);
