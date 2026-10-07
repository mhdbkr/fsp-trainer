// ============================================================================
// Validateur des couches `position: fixed` (série 3, bug « aperçu cloué en haut
// de page »).
//
// Un ancêtre porteur de `transform` (même identité), `filter`,
// `backdrop-filter` (le verre), `contain` ou `will-change` devient le containing
// block de ses descendants `fixed` : le panneau se cale sur la PAGE (haut de
// page, hauteur de page, aucun défilement propre) au lieu de l'écran. Une note
// d'architecture le disait depuis la V1 ; rien ne l'imposait, et le bug est
// revenu. Deux verrous mécaniques :
//   1. tout `fixed` d'un .tsx est rendu DANS un <Portal> (→ <body>), sauf les
//      composants montés par Shell hors de <main> (déjà hors de toute page) ;
//   2. les wrappers animés de page (`.reveal`, `.stagger > *`) ne gardent pas
//      leur `transform` après l'animation (remplissage `backwards`).
// Usage : node scripts/checkFixedOverlays.mjs   (exit 1 au moindre manquement)
// ============================================================================
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, relative } from 'node:path';

const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const FIXED = /(?<=["'`\s])fixed(?=["'`\s])|position:\s*['"]fixed['"]/g;

/** Lignes des `fixed` qui ne sont pas lexicalement à l'intérieur d'un <Portal>. */
export function unportaledFixed(source) {
  const src = stripComments(source);
  const out = [];
  let m;
  while ((m = FIXED.exec(src))) {
    const before = src.slice(0, m.index);
    const depth = (before.match(/<Portal>/g) ?? []).length - (before.match(/<\/Portal>/g) ?? []).length;
    if (depth <= 0) out.push(before.split('\n').length);
  }
  return out;
}

/** Composants rendus par Shell HORS de <main> : leur `fixed` vise déjà l'écran. */
export function shellRoots(shellSource) {
  const src = stripComments(shellSource);
  const main = src.slice(src.indexOf('<main'), src.indexOf('</main>'));
  const outside = src.replace(main, '');
  return new Set([...outside.matchAll(/<([A-Z]\w+)\s*\/>/g)].map((x) => x[1]));
}

/** Les wrappers de page ne doivent pas garder un `transform` (fill both/forwards). */
export function stickyPageTransforms(css) {
  return [...css.matchAll(/^\s*(\.reveal|\.stagger\s*>\s*\*)\s*\{[^}]*animation:[^;}]*\b(both|forwards)\b/gm)].map((x) => x[1]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== 'graphify-out') walk(p); } else if (/\.tsx$/.test(f) && !/\.test\./.test(f)) files.push(p); } })(root);
  const roots = shellRoots(readFileSync(join(root, 'components', 'Shell.tsx'), 'utf8'));
  const problems = [];
  for (const p of files) {
    if (roots.has(basename(p, '.tsx'))) continue;
    for (const line of unportaledFixed(readFileSync(p, 'utf8'))) {
      problems.push(`${relative(root, p)}:${line} — \`fixed\` hors <Portal> : il se calera sur la page dès qu'un ancêtre porte transform/filter/verre`);
    }
  }
  for (const sel of stickyPageTransforms(readFileSync(join(root, 'styles', 'index.css'), 'utf8'))) {
    problems.push(`styles/index.css — ${sel} : remplissage both/forwards → le wrapper de page garde un transform et ancre tous les \`fixed\` (utiliser backwards)`);
  }
  if (problems.length) { console.error(problems.join('\n')); console.error(`\n${problems.length} couche(s) fixe(s) mal ancrée(s).`); process.exit(1); }
  console.log('Couches fixes : toutes ancrées à l\'écran.');
}
