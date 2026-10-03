#!/usr/bin/env node
// ============================================================================
// Preuve par mutation des invariants C6 — « un test qui ne rougit jamais ne
// garde rien ». Pour CHAQUE invariant, une mutation du code applicatif qui
// réintroduit le défaut qu'il garde ; l'invariant doit alors ÉCHOUER.
//
// Tout se passe sur une COPIE (tmp) : ni `src/` ni le dépôt ne sont touchés.
// Le baseline (copie intacte) doit passer, sinon « rouge » ne prouverait rien
// (un environnement cassé rougit aussi).
//
// Usage :  node scripts/parcours-mutations.mjs [--only INV-1,INV-4] [--keep]
// Sortie : code 0 si le baseline est vert ET toute mutation est tuée ; 1 sinon.
// ============================================================================
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const only = (argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null);
const keep = argv.includes('--keep');

/** { id, tests: fichier(s) de tests, file: source mutée, from → to (exactement 1 occurrence), pourquoi } */
export const MUTATIONS = [
  {
    id: 'INV-1', tests: 'tests/invariants.programme.test.ts', file: 'src/lib/journal.ts',
    from: 'await db.day_plans.put({ ...plan, tasks });',
    to: "await db.day_plans.put({ ...plan, tasks: [...tasks, { ...tasks[0], id: `${tasks[0].id}-bis`, doneAt: undefined, eventId: undefined }] });",
    pourquoi: 'cocher fait apparaître une tâche de plus (le défaut historique du plan recalculé)',
  },
  {
    id: 'INV-2', tests: 'tests/invariants.programme.test.ts', file: 'src/lib/program/dayPlan.ts',
    from: 'plan?.tasks.find((t) => t.doneAt === undefined) ?? null;',
    to: 'plan?.tasks.find((t) => t.doneAt === undefined) ?? plan?.tasks[plan.tasks.length - 1] ?? null;',
    pourquoi: 'plan fini : la session du jour redevient une tâche déjà faite',
  },
  {
    id: 'INV-4', tests: 'tests/invariants.programme.test.ts', file: 'src/lib/program/select.ts',
    from: 'picked.length === 0 || picked[picked.length - 1] !== next;',
    to: 'true;',
    pourquoi: 'la diversité redevient un souhait : deux spécialités identiques se suivent',
  },
];

function run(cwd, tests) {
  const out = path.join(cwd, 'vitest-out.json');
  const r = spawnSync(path.join(cwd, 'node_modules/.bin/vitest'), ['run', '--dir', 'tests', ...tests, '--reporter=json', `--outputFile=${out}`],
    { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  let failed = [];
  try {
    const j = JSON.parse(fs.readFileSync(out, 'utf8'));
    failed = j.testResults.flatMap((f) => f.assertionResults.filter((a) => a.status === 'failed').map((a) => a.fullName ?? a.title));
  } catch { /* pas de rapport : on s'en tient au code de sortie */ }
  return { code: r.status, failed, tail: (r.stderr ?? '').split('\n').slice(-6).join('\n') };
}

function copyApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c6-mut-'));
  for (const f of ['src', 'tests', 'package.json', 'vitest.config.ts', 'tsconfig.json']) {
    fs.cpSync(path.join(APP, f), path.join(dir, f), { recursive: true });
  }
  fs.symlinkSync(fs.realpathSync(path.join(APP, 'node_modules')), path.join(dir, 'node_modules'));
  return dir;
}

const wanted = MUTATIONS.filter((m) => !only || only.includes(m.id));
const testsOf = [...new Set(wanted.flatMap((m) => [].concat(m.tests)))];
const rows = [];
let ok = true;

const base = copyApp();
const b = run(base, testsOf);
console.log(`baseline (copie intacte) : ${b.code === 0 ? 'VERT' : 'ROUGE — ' + b.failed.join(' | ')}`);
if (b.code !== 0) { console.log(b.tail); ok = false; }
if (!keep) fs.rmSync(base, { recursive: true, force: true });

if (ok) {
  for (const m of wanted) {
    const dir = copyApp();
    const f = path.join(dir, m.file);
    const src = fs.readFileSync(f, 'utf8');
    const n = src.split(m.from).length - 1;
    if (n !== 1) { rows.push({ id: m.id, verdict: `MUTATION INAPPLICABLE (${n} occurrence(s) de « ${m.from.slice(0, 50)}… »)` }); ok = false; fs.rmSync(dir, { recursive: true, force: true }); continue; }
    fs.writeFileSync(f, src.replace(m.from, () => m.to));
    const r = run(dir, [].concat(m.tests));
    const killed = r.code !== 0 && r.failed.length > 0;
    rows.push({ id: m.id, verdict: killed ? 'TUÉE' : 'SURVIVANTE', pourquoi: m.pourquoi, failed: r.failed });
    if (!killed) ok = false;
    if (!keep) fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const r of rows) {
  console.log(`${r.verdict === 'TUÉE' ? 'OK  ' : 'FAIL'}  ${r.id} — ${r.verdict}${r.pourquoi ? ` · ${r.pourquoi}` : ''}`);
  for (const t of r.failed ?? []) console.log(`        ↳ rougit : ${t}`);
}
console.log(ok ? `\n${rows.length}/${rows.length} mutations tuées.` : '\nÉCHEC : une mutation survit, ou le baseline est rouge.');
process.exit(ok ? 0 : 1);
