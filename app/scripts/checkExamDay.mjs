// ============================================================================
// Validateur du VERROUILLAGE du Prüfungstag.
//
// Contrat : le Prüfungstag simule les conditions réelles de l'examen —
// aucune aide (guides, muster, mode immersif, chat, checklists), aucun minutage
// falsifié, aucune relance externe (notification, mail), un ancrage explicite
// au Land (BW). Ce script rend ce contrat permanent sur
// `app/src/features/simulation/examDay*.{ts,tsx}` et
// `app/src/features/readiness/**`. Modèle : checkTherapieLabels.mjs.
// ============================================================================
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'src');

const FORBIDDEN_IMPORTS = [
  'AnamneseGuide',
  'VorstellungGuide',
  'ArztbriefGuide',
  'MusterCard',
  'ImmersiveMode',
  'KommunikationPanel',
  'AutoLink',
  'PatientSheetView',
  'ExaminerSheetView',
  'lib/checklists',
  'useTimer',
];

const DURATION_RE = /\b(20|12|5)\s*\*\s*60\b|\b1200\b|\b1140\b/;
const RELANCE_RE = /new Notification\b|Notification\.requestPermission|\bsendMail\b|\bmailto:|registration\.showNotification/;
const LAND_FILES = ['examDaySetup.tsx', 'examDayRunner.tsx'];

function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      out = out.concat(walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function isExamDayFile(path) {
  const base = path.split('/').pop();
  return /^examDay.*\.(ts|tsx)$/.test(base);
}

function isTestFile(path) {
  return /\.test\.[tj]sx?$/.test(path);
}

function collectTargetFiles() {
  const simDir = join(SRC, 'features', 'simulation');
  const readinessDir = join(SRC, 'features', 'readiness');
  const files = [...walk(simDir), ...walk(readinessDir)];
  return files.filter((f) => /\.(ts|tsx)$/.test(f) && isExamDayFile(f));
}

function checkFileForImports(path, content) {
  const problems = [];
  const base = path.split('/').pop();
  const lines = content.split('\n');
  const importLineRe = /from\s+['"]([^'"]+)['"]/;
  lines.forEach((line, idx) => {
    const m = line.match(importLineRe);
    if (!m) return;
    const spec = m[1];
    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (!spec.includes(forbidden)) continue;
      // Exception : examDayEvaluation.tsx peut importer PartEvaluation, qui
      // importe lib/checklists lui-même — mais c'est un import indirect, donc
      // seule la règle 'lib/checklists' concerne des imports directs.
      if (forbidden === 'lib/checklists' && base === 'examDayEvaluation.tsx') continue;
      problems.push(`${relative(SRC, path)}:${idx + 1} — import interdit '${forbidden}' (règle 1)`);
    }
  });
  return problems;
}

function checkFileForDurations(path, content) {
  if (path.split('/').pop() === 'examDayPlan.ts') return [];
  if (isTestFile(path)) return [];
  const problems = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (DURATION_RE.test(line)) {
      problems.push(`${relative(SRC, path)}:${idx + 1} — durée codée en dur hors examDayPlan.ts (règle 2)`);
    }
  });
  return problems;
}

function checkFileForRelances(path, content) {
  const problems = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (RELANCE_RE.test(line)) {
      problems.push(`${relative(SRC, path)}:${idx + 1} — relance externe interdite (règle 3)`);
    }
  });
  return problems;
}

function checkFileForLand(path, content) {
  const base = path.split('/').pop();
  if (!LAND_FILES.includes(base)) return [];
  if (content.includes('BW')) return [];
  return [`${relative(SRC, path)}:1 — mention du Land 'BW' absente (règle 4)`];
}

function checkFiles(files, readFn) {
  const problems = [];
  for (const path of files) {
    const content = readFn(path);
    if (isExamDayFile(path)) {
      problems.push(...checkFileForImports(path, content));
    }
    if (isExamDayFile(path)) problems.push(...checkFileForDurations(path, content));
    problems.push(...checkFileForRelances(path, content));
    problems.push(...checkFileForLand(path, content));
  }
  return problems;
}

function runMain() {
  const files = collectTargetFiles();
  if (files.length === 0) {
    console.log('✅ VERROUILLAGE PRÜFUNGSTAG — 0 fichier.');
    process.exit(0);
  }
  const problems = checkFiles(files, (p) => readFileSync(p, 'utf8'));
  if (problems.length) {
    console.log(`❌ ${problems.length} violation(s) du verrouillage Prüfungstag :\n`);
    for (const p of problems) console.log('  ✗ ' + p);
    process.exit(1);
  }
  console.log(`✅ VERROUILLAGE PRÜFUNGSTAG — ${files.length} fichier(s).`);
  process.exit(0);
}

function runSelfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'checkExamDay-'));
  try {
    const faultyPath = join(dir, 'examDayRunner.tsx');
    const faultyContent = [
      "import { AnamneseGuide } from '../simulation/AnamneseGuide';",
      'const DURATION = 20 * 60;',
      'new Notification("relance");',
      'export const X = 1;',
    ].join('\n');
    writeFileSync(faultyPath, faultyContent, 'utf8');

    const soundPath = join(dir, 'examDayRunner.tsx');
    // On réutilise le même chemin séquentiellement pour comparer les deux cas
    // (fautif puis sain) sans dépendre de la structure du répertoire réel.
    const faultyProblems = checkFiles([faultyPath], () => faultyContent);

    const soundContent = [
      "import { PartEvaluation } from './PartEvaluation';",
      'export const LAND = "BW";',
      'export const X = 1;',
    ].join('\n');
    writeFileSync(soundPath, soundContent, 'utf8');
    const soundProblems = checkFiles([soundPath], () => soundContent);

    const faultyFails = faultyProblems.length > 0;
    const soundPasses = soundProblems.length === 0;
    if (faultyFails && soundPasses) {
      console.log('✅ self-test OK.');
      process.exit(0);
    }
    console.log('❌ self-test échoué.');
    console.log('  fautif :', faultyProblems);
    console.log('  sain   :', soundProblems);
    process.exit(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
} else {
  runMain();
}
