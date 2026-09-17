// ============================================================================
// Validateur des QUESTIONS PROPRES AU CAS (FB2-J4).
//
// Chaque `caseSpecificQuestions[]` doit être un objet `{ frage, kapitel }` avec
// un `kapitel` de la liste fermée — c'est ce qui permet de l'insérer dans son
// sous-chapitre pendant la simulation. Une chaîne nue (héritage) tomberait
// dans « aktuell » sans jugement : refusée. Vérifie aussi qu'une question
// « frauenanamnese » n'est pas attachée à un patient.
// Usage : node scripts/checkCaseQuestionChapters.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'data', 'seedCases.ts'), 'utf8');
const KAPITEL = new Set(['aktuell', 'vegetativ', 'vorerkrankungen', 'medikamente', 'allergien', 'noxen', 'familie-sozial', 'frauenanamnese', 'fach']);

const idx = [...src.matchAll(/\n\s+id: 'case-/g)].map((m) => m.index); idx.push(src.length);
const problems = []; let n = 0, q = 0;
for (let i = 0; i < idx.length - 1; i++) {
  const b = src.slice(idx[i], idx[i + 1]);
  const id = b.match(/id: '(case-[^']+)'/)[1]; n++;
  const geschlecht = (b.match(/geschlecht: '([mw])'/) || [])[1];
  const m = b.match(/caseSpecificQuestions:\s*\[([\s\S]*?)\n\s{6}\],/);
  if (!m) { problems.push(`${id} — caseSpecificQuestions introuvable`); continue; }
  const body = m[1];
  // Chaînes nues : une ligne qui commence par une quote sans `frage:` devant.
  for (const bare of body.matchAll(/^\s*'((?:[^'\\]|\\.)*)',?\s*$/gm)) problems.push(`${id} — question sans chapitre : « ${bare[1].slice(0, 60)} »`);
  for (const e of body.matchAll(/\{\s*frage:\s*'((?:[^'\\]|\\.)*)',\s*kapitel:\s*'([^']+)'\s*\}/g)) {
    q++;
    if (!KAPITEL.has(e[2])) problems.push(`${id} — kapitel inconnu « ${e[2]} » : « ${e[1].slice(0, 60)} »`);
    if (e[2] === 'frauenanamnese' && geschlecht === 'm') problems.push(`${id} — question Frauenanamnese chez un patient : « ${e[1].slice(0, 60)} »`);
  }
}
if (problems.length) {
  console.log(`❌ ${problems.length} problème(s) sur les questions propres au cas :\n`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log(`✅ QUESTIONS DU CAS RANGÉES — ${n} cas, ${q} questions, chacune dans un sous-chapitre.`);
