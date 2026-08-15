// ============================================================================
// Validateur de couverture des sondes d'anamnèse.
// Vérifie que CHAQUE cas répond à TOUTES ses sondes applicables :
//   applicable = BASE + FACH[specialty] + (FRAUEN si patiente)
// Sortie : trous (sonde sans réponse), réponses vides, clés inconnues.
// Usage : node scripts/checkProbeCoverage.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const probesSrc = readFileSync(join(root, 'src/data/guides/anamneseProbes.ts'), 'utf8');
const casesSrc = readFileSync(join(root, 'src/data/seedCases.ts'), 'utf8');

// --- 1) Toutes les sondes connues, classées par préfixe ---------------------
const allProbeIds = [...probesSrc.matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
const knownIds = new Set(allProbeIds);
const isFrau = (id) => id.startsWith('frau-');
const isFach = (id) => id.startsWith('fach-');
const BASE = allProbeIds.filter((id) => !isFrau(id) && !isFach(id));
const FRAUEN = allProbeIds.filter(isFrau);
const FACH_PREFIX = { Gastroenterologie: 'fach-gastro-', Kardiologie: 'fach-kardio-', Chirurgie: 'fach-chir-', Psychiatrie: 'fach-psych-', Pneumologie: 'fach-pneumo-', Urologie: 'fach-uro-', Infektiologie: 'fach-infekt-', Orthopädie: 'fach-ortho-', Rheumatologie: 'fach-rheuma-', Neurologie: 'fach-neuro-', Endokrinologie: 'fach-endo-' };
const fachFor = (spec) => allProbeIds.filter((id) => FACH_PREFIX[spec] && id.startsWith(FACH_PREFIX[spec]));

// --- 2) Découpe les cas et extrait id / specialty / sexe / clés antworten ----
const chunks = casesSrc.split(/\n {4}\{\n {6}id: 'case-/).slice(1);
let failures = 0;
const rows = [];
for (const raw of chunks) {
  const chunk = 'id: \'case-' + raw;
  const id = 'case-' + raw.match(/^([a-z0-9-]+)'/)[1];
  const specialty = (chunk.match(/specialty:\s*'([^']+)'/) || [])[1];
  const weiblich = /geschlecht:\s*'w'/.test(chunk);
  const antBlock = (chunk.match(/antworten:\s*\{([\s\S]*?)\n {8}\},/) || [])[1] || '';
  const keys = new Set([...antBlock.matchAll(/'([a-z0-9-]+)':\s*'/g)].map((m) => m[1]));
  const applicable = [...BASE, ...fachFor(specialty), ...(weiblich ? FRAUEN : [])];
  const missing = applicable.filter((p) => !keys.has(p));
  const unknown = [...keys].filter((k) => !knownIds.has(k));
  if (missing.length || unknown.length) failures++;
  rows.push({ id, specialty, weiblich, need: applicable.length, have: keys.size, missing, unknown });
}

// --- 3) Rapport --------------------------------------------------------------
for (const r of rows) {
  const status = r.missing.length || r.unknown.length ? '❌' : '✅';
  console.log(`${status} ${r.id.padEnd(26)} [${r.specialty}${r.weiblich ? ', ♀' : ''}]  ${r.have}/${r.need} sondes`);
  if (r.missing.length) console.log(`   MANQUE (${r.missing.length}) : ${r.missing.join(', ')}`);
  if (r.unknown.length) console.log(`   INCONNU (${r.unknown.length}) : ${r.unknown.join(', ')}`);
}
console.log(`\n${failures === 0 ? '✅ COUVERTURE COMPLÈTE' : `❌ ${failures} cas incomplet(s)`} — ${rows.length} cas, ${BASE.length} sondes de base + Fach/Frauen.`);
process.exit(failures === 0 ? 0 : 1);
