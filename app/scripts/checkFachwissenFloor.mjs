// ============================================================================
// PLANCHER DES QUESTIONS D'EXAMEN (revue direction Lc4, I6).
//
// Lc4 avait coupé fw-myokardinfarkt à 3 questions d'examen et retiré l'explication au
// patient de six Fachwissen : la couche la plus propre à la FSP. Ce script l'empêche :
//   1. STRICT : chaque Fachwissen a au moins MIN_ASKED `askedInExam` ;
//   2. BUDGET : le nombre de Fachwissen sans question d'explication au patient
//      (EXPLICATION) ne remonte pas au-dessus de fixtures/fachwissen-floor-budget.json ;
//   3. BUDGET : le nombre d'`examinerQuestions` des cas sans « ? » final ou de moins
//      de 4 mots ne remonte pas non plus.
// Le fixture est aussi protégé face à la base par checkBudgetFloor.mjs.
// Usage : node scripts/checkFachwissenFloor.mjs [--json]
// Codes : 0 ok · 1 plancher ou budget dépassé.
// ============================================================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadAll } from './loadCases.mjs';

export const MIN_ASKED = 5;
export const EXPLICATION = /erklären Sie|in einfachen Worten|ohne Fachbegriffe|teilen Sie .* mit/i;
export const BUDGET_FILE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fachwissen-floor-budget.json');

/** Une question d'examinateur mal formée : sans « ? » final, ou de moins de 4 mots. */
export const questionMalFormee = (q) => !/\?$/.test(q.trim()) || q.trim().split(/\s+/).length < 4;

/** Mesure sur des objets déjà chargés : { sousPlancher, sansExplication, questionsMalFormees }. */
export function mesure(fachwissen, cases) {
  return {
    sousPlancher: fachwissen.filter((f) => (f.askedInExam ?? []).length < MIN_ASKED).map((f) => `${f.id} (${(f.askedInExam ?? []).length})`),
    sansExplication: fachwissen.filter((f) => !(f.askedInExam ?? []).some((q) => EXPLICATION.test(q.frage))).map((f) => f.id),
    questionsMalFormees: cases.flatMap((c) => (c.examinerQuestions ?? []).filter(questionMalFormee).map((q) => `${c.id} : ${q}`)),
  };
}

/** Verdict face au budget : liste des fautes (vide = vert). */
export function verdict(m, budget) {
  const fautes = [];
  if (m.sousPlancher.length) fautes.push(`moins de ${MIN_ASKED} questions d'examen : ${m.sousPlancher.join(', ')}`);
  if (m.sansExplication.length > budget.sansExplication) fautes.push(`Fachwissen sans explication au patient : ${m.sansExplication.length} > budget ${budget.sansExplication}`);
  if (m.questionsMalFormees.length > budget.questionsMalFormees) fautes.push(`examinerQuestions mal formées : ${m.questionsMalFormees.length} > budget ${budget.questionsMalFormees}`);
  return fautes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cases, fachwissen } = await loadAll();
  const m = mesure(fachwissen, cases);
  const { budget } = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
  if (process.argv.includes('--json')) console.log(JSON.stringify(m, null, 1));
  const fautes = verdict(m, budget);
  console.log(`${fachwissen.length} Fachwissen · sous ${MIN_ASKED} questions : ${m.sousPlancher.length} · sans explication au patient : ${m.sansExplication.length} (budget ${budget.sansExplication}) · examinerQuestions mal formées : ${m.questionsMalFormees.length} (budget ${budget.questionsMalFormees})`);
  if (fautes.length) { for (const f of fautes) console.log(`❌ ${f}`); process.exit(1); }
  if (m.sansExplication.length < budget.sansExplication || m.questionsMalFormees.length < budget.questionsMalFormees) console.log('ℹ la mesure est sous le budget : abaisser fixtures/fachwissen-floor-budget.json.');
  console.log('✅ PLANCHER FACHWISSEN tenu.');
}
