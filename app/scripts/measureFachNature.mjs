// ============================================================================
// MESURE — Fachanamnese choisie selon la nature du motif (série 3, lot L0).
// ----------------------------------------------------------------------------
// Rejoue la trame de chaque cas (`playedTrame`, le montage réel) et compte les
// paires (cas × sonde) absurdes listées dans fixtures/fach-nature-pairs.json :
// « Trugen Sie einen Helm? » à une gonarthrose, le Nitrospray à une fibrillation
// atriale sans douleur, FSME à une hépatite B…
// C'est une LOUPE (sortie 0) : la porte est src/data/guides/fachNature.test.ts,
// qui lit la même liste. Rejouer sur `main` donne l'« avant », sur la branche
// l'« après ».
// Usage : node scripts/measureFachNature.mjs [--list]
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'fsp-nature-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { fachChapterForCase } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseAlts, phraseFollowUp, phraseProbes } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const { groups } = JSON.parse(readFileSync(join(root, 'scripts/fixtures/fach-nature-pairs.json'), 'utf8'));
const byId = Object.fromEntries(m.seedCases().map((c) => [c.id, c]));

/** La paire est-elle jouée ? Sonde présente, et motif trouvé si `match`. */
function present(c, g) {
  const q = (m.fachChapterForCase(c)?.chapter.questions ?? []).find((p) => m.phraseProbes(p).includes(g.probe));
  if (!q) return false;
  if (!g.match) return true;
  const texts = g.in === 'text' ? [m.phraseText(q)] : [m.phraseText(q), ...m.phraseAlts(q), ...m.phraseFollowUp(q)];
  return texts.some((t) => new RegExp(g.match).test(t));
}

let total = 0, live = 0, kept = 0;
const cases = new Set(), lines = [];
for (const g of groups) for (const id of g.cases) {
  total++;
  const c = byId[`case-${id}`];
  if (!c) { lines.push(`  ? case-${id} introuvable`); continue; }
  if (!present(c, g)) continue;
  if (g.kept?.[id]) { kept++; lines.push(`  = ${id} × ${g.probe} (conservée : ${g.kept[id]})`); continue; }
  live++; cases.add(id); lines.push(`  ✗ ${id} × ${g.probe}${g.match ? ` [/${g.match}/]` : ''}`);
}
console.log(`Paires absurdes encore jouées : ${live} / ${total} (sur ${cases.size} cas) · conservées par décision : ${kept}`);
if (process.argv.includes('--list') || live <= 40) for (const l of lines) console.log(l);
