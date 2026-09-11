// ============================================================================
// Validateur d'IDENTITÉ des sections thérapeutiques fiche ↔ cas.
//
// Contrat : pour un même cas, `fachwissen.therapie[].label` et
// `case.medicalView.therapie[].label` sont identiques mot pour mot et dans le
// même ordre — le cas peut être plus concret dans ses items, jamais divergent
// dans sa structure. Ce contrat est vérifié à l'authoring depuis le lot 15 ;
// neuf cas des lots 2 à 12 y échappaient encore lors de la revue clinique
// globale (11 sept. 2026). Ce script le rend permanent.
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const DATA = join(here, '..', 'src', 'data');
const cases = readFileSync(join(DATA, 'seedCases.ts'), 'utf8');
const fw = readFileSync(join(DATA, 'seedFachwissen.ts'), 'utf8');

function splitBy(src, re) {
  const idx = [...src.matchAll(re)].map((m) => m.index);
  idx.push(src.length);
  const out = [];
  for (let i = 0; i < idx.length - 1; i++) out.push(src.slice(idx[i], idx[i + 1]));
  return out;
}
function labels(block) {
  const m = block.match(/\btherapie: \[\n([\s\S]*?)\n\s{6,8}\]/);
  if (!m) return null;
  return [...m[1].matchAll(/label: '((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
}
const field = (block, key) => (block.match(new RegExp(`\\b${key}: '([^']+)'`)) || [])[1];

const fwByPathology = new Map();
for (const b of splitBy(fw, /\n\s+id: 'fw-/g)) {
  const p = field(b, 'pathology');
  if (p) fwByPathology.set(p, labels(b));
}

let n = 0;
const problems = [];
for (const b of splitBy(cases, /\n\s+id: 'case-/g)) {
  n++;
  const id = field(b, 'id');
  const pathology = field(b, 'pathology');
  const lc = labels(b);
  const lf = fwByPathology.get(pathology);
  if (!lf) { problems.push(`${id}: aucune fiche Fachwissen pour pathology '${pathology}'`); continue; }
  if (JSON.stringify(lc) !== JSON.stringify(lf)) {
    problems.push(`${id}\n     cas   : ${JSON.stringify(lc)}\n     fiche : ${JSON.stringify(lf)}`);
  }
}

if (problems.length) {
  console.log(`❌ ${problems.length} divergence(s) de sections thérapeutiques fiche ↔ cas :\n`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log(`✅ SECTIONS THÉRAPEUTIQUES IDENTIQUES fiche ↔ cas — ${n} cas.`);
