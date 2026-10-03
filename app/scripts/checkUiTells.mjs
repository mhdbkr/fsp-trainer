// ============================================================================
// Validateur des TELLS d'interface (FB2-O5, FB2-O6, ADR-0016).
//
// Ce que la direction a rejeté à l'usage ne doit pas revenir par un copier-
// coller : libellés en capitales (`uppercase`), mono en libellé (`font-mono`
// avec `tracking-`), ambre/orange sur les contrôles de phrase, glyphes
// « ⇄ » « ↳ » en guise d'icônes, et les classes Tailwind cassées par une
// substitution aveugle (`font-boldst`, `tracking-wideer`…) — ce dernier cas
// a atteint la production une fois.
// S'y ajoutent, dans `features/`, les affirmations d'examen non sourcées
// (voir EXAM_CLAIM).
// Usage : node scripts/checkUiTells.mjs
// ============================================================================
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const RULES = [
  { name: 'libellé en capitales (ADR-0016)', re: /\buppercase\b/g },
  { name: 'mono espacé en libellé (ADR-0016)', re: /font-mono[^"'`]*tracking-|tracking-[^"'`]*font-mono/g },
  // `tracking-tightish` est un token du projet (tailwind.config) — exclu.
  { name: 'classe Tailwind cassée', re: /\b(?!tracking-wide(?:r|st)\b)(?:font-(?:bold|semibold|medium|normal)|tracking-wide(?:st|r)?|rounded-(?:lg|xl|full))[a-z]+\b|\btracking-tight(?!ish\b)[a-z]+\b/g },
  { name: 'glyphe en guise d’icône (⇄ ↳)', re: /[⇄↳]/g },
];
// Ambre/orange interdits sur les contrôles de phrase (les pastilles « conseil » ambre sont un autre objet).
const AMBER_FORBIDDEN = ['components/PhraseControls.tsx', 'components/PhraseLine.tsx'];

// Affirmations d'examen non sourcées (app/docs/brand/MESSAGES.md, « Ce qui est
// sourcé et ce qui ne l'est pas ») : l'évaluation affichée est la grille
// d'ENTRAÎNEMENT de Doctopus, jamais le barème d'une chambre.
// ATTRAPE : un barème, une grille ou une règle dits officiels (« barème
// officiel », « règle FSP ») et une évaluation prêtée au jury (« ce que le jury
// note », « le jury évalue », « die Prüfer bewerten »).
// LAISSE PASSER : le déroulé (« le jury peut te demander une Aufklärung »), la
// grille nommée comme la nôtre, l'identifiant historique `officialPct`.
export const EXAM_CLAIM = /\bbar[èe]mes?\s+(?:officiel|de\s+la\s+(?:Kammer|chambre))|\bgrilles?\s+(?:de\s+\S+\s+)?officielle|\br[èe]gle\s+(?:FSP|BW|officielle)|\b(?:jury|examinat(?:eur|rice)s?)\s+(?:(?:not|évalu|test|jug|sanctionn)(?:e|ent)|attend|veu(?:t|lent)|écoutent?\s+si)|\bPrüfer(?:in(?:nen)?)?\s+(?:bewert|benot)/giu;

export function findExamClaims(src) {
  return [...src.matchAll(EXAM_CLAIM)].map((m) => ({ index: m.index, text: m[0] }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const files = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(f) && !/\.test\./.test(f)) files.push(p); } })(root);

  const problems = [];
  for (const p of files) {
    const rel = relative(root, p);
    const raw = readFileSync(p, 'utf8');
    // Les commentaires (historique, justification) ne comptent pas.
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const lineOf = (i) => src.slice(0, i).split('\n').length;
    // Les tells de classe et de glyphe visent le rendu : .tsx et .css seulement.
    if (!rel.endsWith('.ts')) for (const r of RULES) {
      let m; const re = new RegExp(r.re.source, 'g');
      while ((m = re.exec(src))) problems.push(`${rel}:${lineOf(m.index)} — ${r.name} : « ${m[0]} »`);
    }
    if (rel.startsWith('features/')) for (const m of findExamClaims(src)) problems.push(`${rel}:${lineOf(m.index)} — affirmation d'examen non sourcée (grille Doctopus, pas barème officiel) : « ${m.text} »`);
    if (AMBER_FORBIDDEN.includes(rel) && /amber|orange/.test(src)) problems.push(`${rel} — ambre/orange sur un contrôle de phrase`);
  }
  if (problems.length) {
    console.log(`❌ ${problems.length} tell(s) d'interface :\n`);
    for (const x of problems) console.log('  ✗ ' + x);
    process.exit(1);
  }
  console.log(`✅ AUCUN TELL D'INTERFACE — ${files.length} fichiers.`);
}
