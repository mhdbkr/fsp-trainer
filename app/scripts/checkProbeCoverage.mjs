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

// Sondes propres à chaque nature du motif (AKTUELL_VARIANT_PROBES) : un cas ne
// répond qu'à celles de SA catégorie (patientSheet.leitsymptomKategorie ;
// absent = schmerz si un bloc `schmerz` existe).
const variantBlock = probesSrc.slice(probesSrc.indexOf('AKTUELL_VARIANT_PROBES'), probesSrc.indexOf('// --- Index & helpers'));
const VARIANT = {};
for (const m of variantBlock.matchAll(/\n  ([a-z]+): \[([\s\S]*?)\n  \]/g)) VARIANT[m[1]] = [...m[2].matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((x) => x[1]);
const VARIANT_IDS = new Set(Object.values(VARIANT).flat());
const kategorieOf = (chunk) => (chunk.match(/leitsymptomKategorie:\s*'([a-z]+)'/) || [])[1] || (/\n\s+schmerz: \{/.test(chunk) ? 'schmerz' : null);
const BASE = allProbeIds.filter((id) => !isFrau(id) && !isFach(id) && !VARIANT_IDS.has(id));
const FRAUEN = allProbeIds.filter(isFrau);
const FACH_PREFIX = { Angiologie: 'fach-gefaess-', Gastroenterologie: 'fach-gastro-', Kardiologie: 'fach-kardio-', Chirurgie: 'fach-chir-', Psychiatrie: 'fach-psych-', Pneumologie: 'fach-pneumo-', Urologie: 'fach-uro-', Infektiologie: 'fach-infekt-', Orthopädie: 'fach-ortho-', Rheumatologie: 'fach-rheuma-', Neurologie: 'fach-neuro-', Endokrinologie: 'fach-endo-', Hämatologie: 'fach-haem-', Dermatologie: 'fach-derma-', Gynäkologie: 'fach-gyn-', Nephrologie: 'fach-nephro-', Onkologie: 'fach-onko-' };
const fachFor = (spec) => allProbeIds.filter((id) => FACH_PREFIX[spec] && id.startsWith(FACH_PREFIX[spec]));

// --- 2) Découpe les cas et extrait id / specialty / sexe / clés antworten ----
const chunks = casesSrc.split(/\n {4}\{\n {6}id: 'case-/).slice(1);
let failures = 0;
const rows = [];
for (const raw of chunks) {
  const chunk = 'id: \'case-' + raw;
  const id = 'case-' + raw.match(/^([a-z0-9-]+)'/)[1];
  // Fachanamnese jouée : `fachanamnese` (override) sinon la spécialité.
  const specialty = (chunk.match(/\bfachanamnese:\s*'([^']+)'/) || chunk.match(/specialty:\s*'([^']+)'/) || [])[1];
  const weiblich = /geschlecht:\s*'w'/.test(chunk);
  const antBlock = (chunk.match(/antworten:\s*\{([\s\S]*?)\n {8}\},/) || [])[1] || '';
  const keys = new Set([...antBlock.matchAll(/'([a-z0-9-]+)':\s*'/g)].map((m) => m[1]));
  const kat = kategorieOf(chunk);
  if (!kat || !VARIANT[kat]) { failures++; rows.push({ id, specialty, weiblich, have: 0, need: 0, missing: [`leitsymptomKategorie manquante ou inconnue (${kat})`], unknown: [] }); continue; }
  const applicable = [...BASE, ...VARIANT[kat], ...fachFor(specialty), ...(weiblich ? FRAUEN : [])];
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
