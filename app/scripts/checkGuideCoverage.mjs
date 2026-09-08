// ============================================================================
// Validateur du CONTRAT GUIDE ↔ FICHE PATIENT (FB-A3).
// Toute question que le guide de simulation AFFICHE pour un cas doit avoir sa
// réponse dans `patientSheet.antworten` — sinon le simulant patient est muet.
//   questions affichées = Allgemeine Anamnese (questions liées à une sonde ;
//   Frauenanamnese seulement si patiente) + Fachanamnese de la spécialité
//   (générée depuis les sondes `fach-<préfixe>-*`).
// Vérifie aussi que chaque `probe:` du guide désigne une sonde qui existe.
// Usage : node scripts/checkGuideCoverage.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chaptersSrc = readFileSync(join(root, 'src/data/guides/anamneseChapters.ts'), 'utf8');
const probesSrc = readFileSync(join(root, 'src/data/guides/anamneseProbes.ts'), 'utf8');
const casesSrc = readFileSync(join(root, 'src/data/seedCases.ts'), 'utf8');

// --- sondes connues -----------------------------------------------------------
const knownIds = new Set([...probesSrc.matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]));
const FACH_PREFIX = { Gastroenterologie: 'fach-gastro-', Kardiologie: 'fach-kardio-', Chirurgie: 'fach-chir-', Psychiatrie: 'fach-psych-', Pneumologie: 'fach-pneumo-', Urologie: 'fach-uro-', Infektiologie: 'fach-infekt-', Orthopädie: 'fach-ortho-', Rheumatologie: 'fach-rheuma-', Neurologie: 'fach-neuro-', Endokrinologie: 'fach-endo-' };
const fachFor = (spec) => [...knownIds].filter((id) => FACH_PREFIX[spec] && id.startsWith(FACH_PREFIX[spec]));

// --- questions liées du guide général, par chapitre --------------------------
const a = chaptersSrc.indexOf('export const ALLGEMEINE_ANAMNESE');
const b = chaptersSrc.indexOf('\n];', a);
const block = chaptersSrc.slice(a, b);
const chapters = block.split(/\n  \{\n    id: '/).slice(1).map((raw) => {
  const id = raw.match(/^([a-z-]+)'/)[1];
  const probes = [];
  for (const m of raw.matchAll(/probe:\s*(?:'([a-z0-9-]+)'|\[([^\]]+)\])/g)) {
    if (m[1]) probes.push(m[1]);
    else probes.push(...[...m[2].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]));
  }
  return { id, probes };
});
const unknown = chapters.flatMap((c) => c.probes.filter((p) => !knownIds.has(p)).map((p) => `${c.id}:${p}`));
const generalProbes = (weiblich) => chapters.filter((c) => weiblich || c.id !== 'frauenanamnese').flatMap((c) => c.probes);

// --- cas ---------------------------------------------------------------------
const chunks = casesSrc.split(/\n {4}\{\n {6}id: 'case-/).slice(1);
let failures = 0;
const rows = [];
for (const raw of chunks) {
  const chunk = "id: 'case-" + raw;
  const id = 'case-' + raw.match(/^([a-z0-9-]+)'/)[1];
  const specialty = (chunk.match(/specialty:\s*'([^']+)'/) || [])[1];
  const weiblich = /geschlecht:\s*'w'/.test(chunk);
  const antBlock = (chunk.match(/antworten:\s*\{([\s\S]*?)\n {8}\},/) || [])[1] || '';
  const answered = new Set([...antBlock.matchAll(/'([a-z0-9-]+)':\s*'(.*?)'/g)].filter((m) => m[2].trim()).map((m) => m[1]));
  const displayed = [...new Set([...generalProbes(weiblich), ...fachFor(specialty)])];
  const missing = displayed.filter((p) => !answered.has(p));
  if (missing.length) failures++;
  rows.push({ id, specialty, weiblich, shown: displayed.length, missing });
}

// --- rapport -------------------------------------------------------------------
if (unknown.length) { console.log(`❌ sondes INCONNUES référencées par le guide : ${unknown.join(', ')}`); failures++; }
const bound = chapters.reduce((s, c) => s + c.probes.length, 0);
console.log(`Guide général : ${chapters.length} chapitres, ${bound} liaisons question→sonde.`);
for (const r of rows) {
  if (r.missing.length) console.log(`❌ ${r.id.padEnd(26)} [${r.specialty}${r.weiblich ? ', ♀' : ''}] ${r.shown} questions affichées — SANS RÉPONSE (${r.missing.length}) : ${r.missing.join(', ')}`);
}
console.log(`\n${failures === 0 ? '✅ CONTRAT GUIDE ↔ FICHE COMPLET' : `❌ ${failures} problème(s)`} — ${rows.length} cas : chaque question affichée a sa réponse patient.`);
process.exit(failures === 0 ? 0 : 1);
