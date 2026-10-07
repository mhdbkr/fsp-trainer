// ============================================================================
// VERROU « FACE À MAIN » des fixtures dégressifs (revue série 3, I3).
// ----------------------------------------------------------------------------
// `--bless` refuse déjà toute hausse en local ; mais un fixture se modifie
// aussi à la main. Ce script compare les compteurs de la branche à ceux de
// la base (`git show <ref>:…`) : aucun ne remonte, aucune clé ne disparaît.
// Une hausse de MESURE (validateur élargi) n'est permise que si le fixture la
// DOCUMENTE dans `hausses` : { compteur, de, a, raison } avec `compteur` = la clé,
// `de` = la valeur de la base et `a` = celle de la branche EXACTES, `raison` non
// vide, et l'entrée ABSENTE des `hausses` de la base. Toute autre hausse échoue ; la revue relit chaque entrée.
//
// Usage : node scripts/checkBudgetFloor.mjs [<ref>=origin/main]   (sur push : github.event.before)
//         node scripts/checkBudgetFloor.mjs --base-dir <dir> [--head-dir <dir>]   (tests)
// ============================================================================
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const dirIdx = args.indexOf('--base-dir');
const baseDir = dirIdx >= 0 ? args[dirIdx + 1] : undefined;
const headIdx = args.indexOf('--head-dir');
const headDir = headIdx >= 0 ? args[headIdx + 1] : repo;
const ref = baseDir ? undefined : args.find((a, i) => !a.startsWith('--') && (headIdx < 0 || i !== headIdx + 1)) ?? 'origin/main';

// Fixture → ses compteurs dégressifs.
const FIXTURES = {
  'app/scripts/fixtures/atomicity-budget.json': (j) => ({ ...j.budget }),
  // Lot Q2 : questions du cas sans réponse dans la fiche.
  'app/scripts/fixtures/case-question-answers.json': (j) => ({ ...j.budget }),
  // Lot K0 (ADR-0023) : la dette de contenu que le moteur de cohérence corrige à l'affichage ;
  // elle pousse à corriger la SOURCE. `null` (non mesurable avant K3) n'est pas un compteur.
  'app/scripts/fixtures/coherence-budget.json': (j) => ({ ...j.brut, ...j.residu }),
  'app/scripts/fixtures/trame-symptoms-baseline.json': (j) => ({ constats: j.findings?.length, relu: j.relu }),
  // Lc4 (revue direction I6) : Fachwissen sans explication au patient, examinerQuestions mal formées.
  'app/scripts/fixtures/fachwissen-floor-budget.json': (j) => ({ ...j.budget }),
  // Série 3, 1d : constats de cohésion par catégorie ; la liste motivée des DD sans
  // négatif possible ne grossit pas non plus sans hausse documentée.
  'app/scripts/fixtures/case-cohesion-budget.json': (j) => ({ ...j.budget, ddSansNegatif: Object.values(j.ddSansNegatif ?? {}).reduce((n, d) => n + Object.keys(d).length, 0) }),
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
  const headJson = JSON.parse(readFileSync(join(headDir, rel), 'utf8'));
  const head = counters(headJson);
  // Seule une entrée NOUVELLE (absente des `hausses` de la base) excuse : une entrée déjà mergée
  // n'excuse pas une hausse future aux mêmes chiffres (revue K1 I-1).
  const dejaLa = (e) => (b.hausses ?? []).some((x) => x.compteur === e.compteur && x.de === e.de && x.a === e.a);
  const documentee = (k, v, h) => (headJson.hausses ?? []).some((e) => e.compteur === k && e.de === v && e.a === h && typeof e.raison === 'string' && e.raison.trim() !== '' && !dejaLa(e));
  for (const [k, v] of Object.entries(base)) {
    if (!Number.isInteger(v)) continue;
    const h = head[k];
    if (!Number.isInteger(h)) { failed = true; console.log(`❌ ${rel} : clé ${k} présente dans la base (${v}), absente ici.`); }
    else if (h > v) {
      if (documentee(k, v, h)) console.log(`⚠️  ${rel} : ${k} remonte, ${v} → ${h} — hausse documentée (hausses), à relire en revue.`);
      else { failed = true; console.log(`❌ ${rel} : ${k} remonte, ${v} → ${h}, sans entrée { compteur: "${k}", de: ${v}, a: ${h}, raison } dans \`hausses\`.`); }
    }
  }
}
if (failed) {
  console.log('   Un fixture dégressif ne remonte jamais face à la base. Une hausse de MESURE se documente dans `hausses` (compteur, de, a exacts + raison non vide), puis la revue l\'accepte.');
  process.exit(1);
}
console.log(`✅ PLANCHERS — aucun compteur ne remonte face à ${ref ?? baseDir}, hors hausses documentées.`);
