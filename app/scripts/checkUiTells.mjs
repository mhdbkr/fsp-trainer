// ============================================================================
// Validateur des TELLS d'interface (FB2-O5, FB2-O6, ADR-0016).
//
// Ce que la direction a rejeté à l'usage ne doit pas revenir par un copier-
// coller : libellés en capitales (`uppercase`), mono en libellé (`font-mono`
// avec `tracking-`), ambre/orange sur les contrôles de phrase, glyphes
// « ⇄ » « ↳ » en guise d'icônes, et les classes Tailwind cassées par une
// substitution aveugle (`font-boldst`, `tracking-wideer`…) — ce dernier cas
// a atteint la production une fois.
// Usage : node scripts/checkUiTells.mjs
// ============================================================================
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx|css)$/.test(f) && !/\.test\./.test(f)) files.push(p); } })(root);

const RULES = [
  { name: 'libellé en capitales (ADR-0016)', re: /\buppercase\b/g },
  { name: 'mono espacé en libellé (ADR-0016)', re: /font-mono[^"'`]*tracking-|tracking-[^"'`]*font-mono/g },
  // `tracking-tightish` est un token du projet (tailwind.config) — exclu.
  { name: 'classe Tailwind cassée', re: /\b(?!tracking-wide(?:r|st)\b)(?:font-(?:bold|semibold|medium|normal)|tracking-wide(?:st|r)?|rounded-(?:lg|xl|full))[a-z]+\b|\btracking-tight(?!ish\b)[a-z]+\b/g },
  { name: 'glyphe en guise d’icône (⇄ ↳)', re: /[⇄↳]/g },
];
// Ambre/orange interdits sur les contrôles de phrase (les pastilles « conseil » ambre sont un autre objet).
const AMBER_FORBIDDEN = ['components/PhraseControls.tsx', 'components/PhraseLine.tsx'];

const problems = [];
for (const p of files) {
  const rel = relative(root, p);
  const raw = readFileSync(p, 'utf8');
  // Les commentaires (historique, justification) ne comptent pas.
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const r of RULES) {
    let m; const re = new RegExp(r.re.source, 'g');
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(`${rel}:${line} — ${r.name} : « ${m[0]} »`);
    }
  }
  if (AMBER_FORBIDDEN.includes(rel) && /amber|orange/.test(src)) problems.push(`${rel} — ambre/orange sur un contrôle de phrase`);
}
if (problems.length) {
  console.log(`❌ ${problems.length} tell(s) d'interface :\n`);
  for (const x of problems) console.log('  ✗ ' + x);
  process.exit(1);
}
console.log(`✅ AUCUN TELL D'INTERFACE — ${files.length} fichiers.`);
