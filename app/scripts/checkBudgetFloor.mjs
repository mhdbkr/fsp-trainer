// ============================================================================
// VERROU « FACE À MAIN » des fixtures dégressifs (revue série 3, I3).
// ----------------------------------------------------------------------------
// `--bless` refuse déjà toute hausse en local ; mais un fixture se modifie
// aussi à la main. Ce script compare les compteurs de la branche à ceux de
// la base (`git show <ref>:…`) : aucun ne remonte, aucune clé ne disparaît.
// Une hausse de MESURE (validateur élargi) reste possible — elle échoue ici,
// et c'est la revue de la PR qui l'accepte ou non, raison écrite au fixture.
//
// Usage : node scripts/checkBudgetFloor.mjs [<ref>=origin/main]   (sur push : github.event.before)
//         node scripts/checkBudgetFloor.mjs --base-dir <dir>   (tests)
// ============================================================================
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const dirIdx = args.indexOf('--base-dir');
const baseDir = dirIdx >= 0 ? args[dirIdx + 1] : undefined;
const ref = baseDir ? undefined : args.find((a) => !a.startsWith('--')) ?? 'origin/main';

// Fixture → ses compteurs dégressifs.
const FIXTURES = {
  'app/scripts/fixtures/atomicity-budget.json': (j) => ({ ...j.budget }),
  'app/scripts/fixtures/trame-symptoms-baseline.json': (j) => ({ constats: j.findings?.length, relu: j.relu }),
  // Lot L0 : chaque paire (cas × sonde) est une clé — une paire retirée de la
  // liste est une clé disparue ; `kept` (paires conservées) ne remonte pas.
  'app/scripts/fixtures/fach-nature-pairs.json': (j) => {
    const out = { kept: 0 };
    for (const g of j.groups ?? []) {
      for (const c of g.cases ?? []) out[`paire ${c} × ${g.probe}`] = 0;
      out.kept += Object.keys(g.kept ?? {}).length;
    }
    return out;
  },
};

const git = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
// Une ref introuvable n'est PAS « fixture absent » : exit 2 (re-revue I-2).
if (ref) {
  try { git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`); }
  catch { console.log(`❌ ref git introuvable : ${ref} (checkout avec fetch-depth: 0 ?).`); process.exit(2); }
}
// Seul un fichier absent d'une ref VALIDE est ignoré ; toute autre erreur remonte.
const readBase = (rel) => {
  if (baseDir) { try { return JSON.parse(readFileSync(join(baseDir, rel), 'utf8')); } catch { return undefined; } }
  try { git('cat-file', '-e', `${ref}:${rel}`); } catch { return undefined; }
  return JSON.parse(git('show', `${ref}:${rel}`));
};

let failed = false;
for (const [rel, counters] of Object.entries(FIXTURES)) {
  const b = readBase(rel);
  if (!b) { console.log(`   ${rel} : absent de ${ref ?? baseDir} — introduit par cette branche, rien à comparer.`); continue; }
  const base = counters(b);
  const head = counters(JSON.parse(readFileSync(join(repo, rel), 'utf8')));
  for (const [k, v] of Object.entries(base)) {
    if (!Number.isInteger(v)) continue;
    const h = head[k];
    if (!Number.isInteger(h)) { failed = true; console.log(`❌ ${rel} : clé ${k} présente dans la base (${v}), absente ici.`); }
    else if (h > v) { failed = true; console.log(`❌ ${rel} : ${k} remonte, ${v} → ${h}.`); }
  }
}
if (failed) {
  console.log('   Un fixture dégressif ne remonte jamais face à la base. Hausse de mesure : raison écrite au fixture, acceptée en revue.');
  process.exit(1);
}
console.log(`✅ PLANCHERS — aucun compteur ne remonte face à ${ref ?? baseDir}.`);
