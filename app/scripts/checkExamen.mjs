#!/usr/bin/env node
// ============================================================================
// Validateur du VERROUILLAGE de l'Examen (simulation-run.md §11.2). Porté de `feat/pruefungstag` (checkExamDay.mjs,
// règles 1 à 3), sur `app/src/features/examen/**` (hors tests) :
//   1. aucun import d'une aide — liste UNIQUE `src/features/examen/aidesInterdites.json`, lue aussi par INV-E7 ;
//   2. aucune durée en dur hors de `plan.ts` (la table sourcée) ;
//   3. aucune relance externe (notification, mail).
// Usage : node scripts/checkExamen.mjs · sortie 0 si tout tient, 1 sinon. Test : node --test scripts/checkExamen.test.mjs
// ============================================================================
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, relative, basename } from 'node:path';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const DIR = join(SRC, 'features', 'examen');
export const AIDES = JSON.parse(readFileSync(join(DIR, 'aidesInterdites.json'), 'utf8'));

const DURATION_RE = /\b(20|12|5)\s*\*\s*60\b|\b1200\b|\b1140\b|\b720\b/;
const RELANCE_RE = /new Notification\b|Notification\.requestPermission|\bsendMail\b|\bmailto:|registration\.showNotification/;
const IMPORT_RE = /from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
export const cibles = () => walk(DIR).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.[jt]sx?$/.test(f));

/** Les violations d'un fichier (`nom` sert à exempter `plan.ts` de la règle 2). */
export function verifie(nom, contenu) {
  const out = [];
  contenu.split('\n').forEach((ligne, i) => {
    for (const m of ligne.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      for (const a of AIDES) if (spec.includes(a)) out.push(`${nom}:${i + 1} — import d'une aide « ${a} » (règle 1)`);
    }
    if (basename(nom) !== 'plan.ts' && DURATION_RE.test(ligne)) out.push(`${nom}:${i + 1} — durée en dur hors de plan.ts (règle 2)`);
    if (RELANCE_RE.test(ligne)) out.push(`${nom}:${i + 1} — relance externe (règle 3)`);
  });
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fichiers = cibles();
  const fautes = fichiers.flatMap((f) => verifie(relative(SRC, f), readFileSync(f, 'utf8')));
  if (!fichiers.length) { console.log('❌ VERROUILLAGE EXAMEN — aucun fichier sous features/examen.'); process.exit(1); }
  if (fautes.length) {
    console.log(`❌ ${fautes.length} violation(s) du verrouillage de l'Examen :\n`);
    for (const f of fautes) console.log('  ✗ ' + f);
    process.exit(1);
  }
  console.log(`✅ VERROUILLAGE EXAMEN — ${fichiers.length} fichier(s).`);
}
