// app/scripts/checkTermRegister.mjs
// Invariant CI (F3 §3.2) : double registre des termes liés à un cas.
//  - `r` présent → pa ≤ 60 et ≠ terme ; vo ≤ 160 contient le terme (mot entier,
//    formes fléchies e/en/s/n/es) ; an ≤ 140 sans le terme, finit par « ? ».
//  - aucun terme en double dans le glossaire (casse ignorée).
//  - --require-all : tout terme de caseTermLinks.json a `r` (activé au dernier lot).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LIM = { pa: 60, vo: 160, an: 140 };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const termForms = (term) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(term.trim())}(e|en|n|s|es)?(?![\\p{L}\\p{N}])`, 'iu');

export function checkEntry(e) {
  const errs = []; const r = e.r; if (!r) return errs;
  for (const k of ['pa', 'vo', 'an']) {
    if (typeof r[k] !== 'string' || !r[k].trim()) { errs.push(`${k} vide`); continue; }
    if (r[k].length > LIM[k]) errs.push(`${k} > ${LIM[k]} car.`);
  }
  if (errs.length) return errs;
  const f = termForms(e.t);
  if (r.pa.trim().toLowerCase() === e.t.trim().toLowerCase()) errs.push('pa = terme');
  if (!f.test(r.vo)) errs.push('vo ne contient pas le terme');
  if (f.test(r.an)) errs.push('an contient le terme');
  if (!r.an.trim().endsWith('?')) errs.push('an ne finit pas par « ? »');
  return errs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8'));
  const linked = new Set(Object.values(JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'))).flat());
  const requireAll = process.argv.includes('--require-all');
  let errors = 0, missing = 0, withR = 0;
  const seen = new Map();
  for (const e of fb) {
    const k = e.t.trim().toLowerCase();
    if (seen.has(k)) { console.error(`✗ terme en double « ${e.t} » : ${seen.get(k)} / ${e.id}`); errors++; } else seen.set(k, e.id);
    if (e.r) { withR++; for (const m of checkEntry(e)) { console.error(`✗ ${e.id} : ${m}`); errors++; } }
    else if (linked.has(e.id)) { missing++; if (requireAll) { console.error(`✗ ${e.id} lié à un cas sans registre`); errors++; } }
  }
  console.log(`ℹ registre : ${withR} termes renseignés, ${missing} liés sans registre (sur ${linked.size})`);
  if (errors) { console.error(`❌ ${errors} manquement(s)`); process.exit(1); }
  console.log('✓ registre valide');
}
