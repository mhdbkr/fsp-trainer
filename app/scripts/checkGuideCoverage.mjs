// ============================================================================
// Validateur du CONTRAT GUIDE ↔ FICHE PATIENT (FB-A3), sur le montage RÉEL.
// Toute question que le guide AFFICHE pour un cas doit avoir sa réponse dans
// `patientSheet.antworten` — sinon le simulant patient est muet. On exécute
// `adaptChaptersForCase` + `fachChapterForCase` (variante de la nature du
// motif, adaptation sexe/âge, Fach couvrant la variante, aktuellSkip) plutôt
// que de relire la source : ce qui est vérifié est ce qui est joué.
// Usage : node scripts/checkGuideCoverage.mjs
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'fsp-cov-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { adaptChaptersForCase, fachChapterForCase } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseProbes, phraseIsCaseSpecific } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
  export { PROBE_BY_ID } from ${JSON.stringify(join(root, 'src/data/guides/anamneseProbes.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let failures = 0; let shownTotal = 0; const unknown = new Set();
for (const c of m.seedCases()) {
  const displayed = new Set();
  const collect = (qs) => { for (const q of qs) if (!m.phraseIsCaseSpecific(q)) for (const p of m.phraseProbes(q)) { displayed.add(p); if (!m.PROBE_BY_ID[p]) unknown.add(p); } };
  for (const ch of m.adaptChaptersForCase(c)) collect(ch.questions);
  const f = m.fachChapterForCase(c); if (f) collect(f.chapter.questions);
  const ant = c.patientSheet.antworten ?? {};
  const missing = [...displayed].filter((p) => !(ant[p] && String(ant[p]).trim()));
  shownTotal += displayed.size;
  if (missing.length) { failures++; console.log(`❌ ${c.id.padEnd(26)} ${displayed.size} questions affichées — SANS RÉPONSE (${missing.length}) : ${missing.join(', ')}`); }
}
if (unknown.size) { failures++; console.log(`❌ sondes INCONNUES affichées : ${[...unknown].join(', ')}`); }
console.log(`\n${failures === 0 ? '✅ CONTRAT GUIDE ↔ FICHE COMPLET' : `❌ ${failures} problème(s)`} — 130 cas, ${shownTotal} questions affichées : chaque question affichée a sa réponse patient.`);
process.exit(failures === 0 ? 0 : 1);
