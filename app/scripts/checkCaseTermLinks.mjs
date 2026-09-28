// Invariant CI (bloquant, F4a §3.1) : chaque cas a ≥ 8 Fachbegriffe liés,
// aucun id orphelin ni générique, au plus 10 termes liés à > 20 % des cas, le
// terme du diagnostic lié quand il existe dans le glossaire (exceptions listées),
// JSON à jour. Informatif : cas < 15 termes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Cas dont le diagnostic n'a pas de terme dans le glossaire. Les 6 premiers :
 *  mesurés par la spec F4a §3.1. Les 3 suivants : leur diagnostic ne contenait
 *  QUE des mots d'examen (akut, chronisch, anamnestisch — genericTerms.json) ;
 *  Aortendissektion, Posttraumatische Belastungsstörung et
 *  Alkoholentzugssyndrom n'existent pas dans le glossaire (question ouverte :
 *  les ajouter au glossaire retirerait ces exceptions). */
export const DIAGNOSIS_EXCEPTIONS = [
  'case-gerd', 'case-oesophaguskarzinom', 'case-magenkarzinom', 'case-bandscheibenvorfall', 'case-tvt', 'case-opioidabhaengigkeit',
  'case-aortendissektion', 'case-ptbs', 'case-alkoholentzug',
];

/** Règles pures. `diagnosis` : caseId → ids du diagnostic (génériques déjà retirés). */
export function checkLinks({ links, knownIds, generic, diagnosis, exceptions = DIAGNOSIS_EXCEPTIONS, minPerCase = 8, share = 0.2, maxBroad = 10 }) {
  const errors = []; const infos = [];
  const n = Object.keys(links).length;
  for (const [caseId, ids] of Object.entries(links)) {
    if (ids.length < minPerCase) errors.push(`${caseId} : ${ids.length} termes (< ${minPerCase})`);
    else if (ids.length < 15) infos.push(`${caseId} : ${ids.length} termes (< 15)`);
    for (const t of ids) {
      if (!knownIds.has(t)) errors.push(`${caseId} : terme inconnu ${t}`);
      if (generic.has(t)) errors.push(`${caseId} : mot d'examen lié ${t}`);
    }
    const diag = diagnosis[caseId] ?? [];
    if (!diag.length && !exceptions.includes(caseId)) errors.push(`${caseId} : aucun terme de diagnostic dans le glossaire (hors exceptions)`);
    if (diag.length && exceptions.includes(caseId)) infos.push(`${caseId} : exception obsolète (diagnostic ${diag.join(', ')})`);
    for (const d of diag) if (!ids.includes(d)) errors.push(`${caseId} : terme du diagnostic non lié ${d}`);
  }
  const byTerm = new Map(); for (const ids of Object.values(links)) for (const t of ids) byTerm.set(t, (byTerm.get(t) ?? 0) + 1);
  const broad = [...byTerm].filter(([, k]) => k > n * share).sort((a, b) => b[1] - a[1]);
  if (broad.length > maxBroad) errors.push(`${broad.length} termes liés à > ${share * 100} % des cas (max ${maxBroad}) : ${broad.slice(0, 20).map(([t, k]) => `${t}(${k})`).join(', ')}`);
  else if (broad.length) infos.push(`termes liés à > ${share * 100} % des cas : ${broad.map(([t, k]) => `${t}(${k})`).join(', ')}`);
  return { errors, infos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const { buildIndex, linkTerms, diagnosisTexts, loadGeneric } = await import('./linkCaseTerms.mjs');
  const { loadAll } = await import('./loadCases.mjs');
  const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8'));
  const generic = loadGeneric();
  const index = buildIndex(fb.map((r) => ({ id: r.id, term: r.t })));
  const { cases } = await loadAll();
  const diagnosis = Object.fromEntries(cases.map((c) => [c.id, linkTerms(diagnosisTexts(c), index).filter((id) => !generic.has(id))]));
  const { errors, infos } = checkLinks({ links, knownIds: new Set(fb.map((r) => r.id)), generic, diagnosis });
  for (const i of infos) console.log(`ℹ ${i}`);
  for (const e of errors) console.error(`✗ ${e}`);
  let stale = 0;
  try { execFileSync('node', [join(here, 'linkCaseTerms.mjs'), '--check'], { stdio: 'inherit' }); } catch { stale = 1; }
  if (errors.length + stale) { console.error(`❌ ${errors.length + stale} manquement(s)`); process.exit(1); }
  console.log(`✓ ${Object.keys(links).length} cas, liaison par texte valide`);
}
