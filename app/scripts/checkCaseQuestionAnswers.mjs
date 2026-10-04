// ============================================================================
// RÉPONSE DES QUESTIONS DU CAS — série 3, lot Q2. INFORMATIF (`|| true` en CI).
// ----------------------------------------------------------------------------
// Chaque question « pour ce cas » doit pouvoir être répondue depuis la fiche du
// patient (règle et limites : `caseQuestionAnswersDetect.mjs`). Le compteur de
// candidats est gravé dans `fixtures/case-question-answers.json` et suivi par
// `checkBudgetFloor.mjs` (il ne remonte jamais) ; `checkCaseQuestionAnswers.test.mjs`
// échoue si la mesure dépasse le fixture. Ce script, lui, sort toujours à 0
// (sauf fixture illisible : 2) et montre la liste.
//
// Corriger un candidat : écrire la réponse (ou le négatif) dans la fiche, ou —
// si la réponse tient à la question elle-même — une entrée `frageAntworten`
// dont `frage` est le texte exact de la question.
//
// Usage : node scripts/checkCaseQuestionAnswers.mjs [--report] [--case <id>]
//         node scripts/checkCaseQuestionAnswers.mjs --bless      (grave une BAISSE)
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { findUnanswered } from './caseQuestionAnswersDetect.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = join(root, 'scripts/fixtures/case-question-answers.json');
const report = process.argv.includes('--report');
const bless = process.argv.includes('--bless');
const caseIdx = process.argv.indexOf('--case');
const ONLY = caseIdx > 0 ? process.argv[caseIdx + 1] : null;

const dir = mkdtempSync(join(tmpdir(), 'fsp-cqa-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { cqText, cqFollowUp } from ${JSON.stringify(join(root, 'src/lib/caseQuestions.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

// La mesure porte toujours sur les 130 cas : la fréquence d'un mot se calcule sur le corpus entier.
const { candidates, unjudged, total } = findUnanswered(m.seedCases().map((c) => ({
  id: c.id,
  sheet: c.patientSheet,
  questions: (c.caseSpecificQuestions ?? []).map((q) => ({ frage: m.cqText(q), followUp: m.cqFollowUp(q) })),
})));
const count = candidates.length;

let fixture;
try { fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); }
catch { console.error(`❌ fixture absent ou illisible (${fixturePath}).`); process.exit(2); }
const floor = fixture.budget?.candidats;
if (!Number.isInteger(floor)) { console.log(`❌ fixture sans budget.candidats entier (${fixturePath}).`); process.exit(2); }

if (bless) {
  if (count > floor) { console.log(`❌ --bless refusé : ${floor} → ${count}. Le plancher ne remonte jamais.`); process.exit(1); }
  writeFileSync(fixturePath, JSON.stringify({ ...fixture, generated: new Date().toISOString().slice(0, 10), total, unjudged, budget: { candidats: count } }, null, 2) + '\n');
  console.log(`plancher regravé : ${count} candidats sur ${total} questions (${unjudged} non jugeables)`);
  process.exit(0);
}

const shown = candidates.filter((c) => !ONLY || c.id === ONLY);
console.log(`ℹ Réponse des questions du cas : ${count} candidat(s) sur ${total} questions (plancher ${floor}) ; ${unjudged} sans mot distinctif (non jugeables).`);
console.log('  (porte INFORMATIVE ; le compteur ne remonte jamais — checkBudgetFloor.mjs et le test)\n');
for (const c of report || ONLY ? shown : shown.slice(0, 15)) console.log(`  · ${c.id} [${c.words.join(', ')}]\n      ${c.frage.slice(0, 170)}`);
if (!report && !ONLY && shown.length > 15) console.log(`  … ${shown.length - 15} de plus (--report)`);
if (count > floor) console.log(`\n⚠ ${count} > plancher ${floor} : une question du cas n'a pas de réponse dans la fiche.`);
else if (count < floor) console.log(`\n   Plancher entamé (−${floor - count}) — lancer \`--bless\` pour le graver.`);
