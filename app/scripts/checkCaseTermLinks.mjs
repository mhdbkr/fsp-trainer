// Invariant CI (bloquant) : chaque cas a ≥ 8 Fachbegriffe liés par texte,
// aucun id orphelin, JSON à jour. Informatif : cas < 15, termes liés à > 60 cas.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
const ids = new Set(JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => r.id));
let errors = 0;
for (const [caseId, termIds] of Object.entries(links)) {
  if (termIds.length < 8) { console.error(`✗ ${caseId} : ${termIds.length} termes (< 8)`); errors++; }
  else if (termIds.length < 15) console.log(`ℹ ${caseId} : ${termIds.length} termes (< 15)`);
  for (const t of termIds) if (!ids.has(t)) { console.error(`✗ ${caseId} : terme inconnu ${t}`); errors++; }
}
const byTerm = new Map(); for (const arr of Object.values(links)) for (const t of arr) byTerm.set(t, (byTerm.get(t) ?? 0) + 1);
for (const [t, n] of byTerm) if (n > 60) console.log(`ℹ ${t} lié à ${n} cas (homographe probable ?)`);
try { execFileSync('node', [join(here, 'linkCaseTerms.mjs'), '--check'], { stdio: 'inherit' }); } catch { errors++; }
if (errors) { console.error(`❌ ${errors} manquement(s)`); process.exit(1); }
console.log(`✓ ${Object.keys(links).length} cas, liaison par texte valide`);
