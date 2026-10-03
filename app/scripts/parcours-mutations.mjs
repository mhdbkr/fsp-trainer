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
  {
    id: 'INV-3a', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: "cp?.teile[teil].status === 'fragile';",
    to: "cp?.teile[teil].status === 'fragile' || cp?.teile[teil].status === 'vierge';",
    pourquoi: 'un Teil jamais travaillé redevient un point faible (le classement « par absence » de l’audit §5)',
  },
  {
    id: 'INV-3b', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/stats.ts',
    from: "if (p.status === 'fragile' && p.lastScore !== null) out.push",
    to: "if (p.status !== 'solide') out.push",
    pourquoi: 'la liste « Points faibles » affichée accuse les cas jamais joués',
  },
  {
    id: 'INV-5a', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: '  await db.training_events.put(event);\n  await applyEventToLocalState(event);\n  return event;',
    to: "  if (event.source !== 'libre') await db.training_events.put(event);\n  await applyEventToLocalState(event);\n  return event;",
    pourquoi: 'un exercice libre n’entre plus dans le journal : ni historique ni stats',
  },
  {
    id: 'INV-5b', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: 'new Set(trainingEvents.map((te) => dayKey(te.at)));',
    to: "new Set(trainingEvents.filter((te) => te.kind === 'simulation').map((te) => dayKey(te.at)));",
    pourquoi: 'INV-6 : une journée 100 % drill n’est plus une journée travaillée (program.ts:320-327)',
  },
  {
    id: 'INV-5c', tests: 'tests/invariants.journal.test.tsx', file: 'src/lib/journal.ts',
    from: 'for (const te of trainingEvents) { const k = dayKey(te.at); m.set(',
    to: "for (const te of trainingEvents) { if (te.source === 'libre') continue; const k = dayKey(te.at); m.set(",
    pourquoi: 'le temps investi ignore les exercices libres',
  },
  {
    id: 'INV-5d', tests: 'tests/invariants.journal.test.tsx', file: 'src/features/program/HistoriquePage.tsx',
    from: '  const filtered = useMemo(() => (events ?? []).filter((e) => {\n',
    to: "  const filtered = useMemo(() => (events ?? []).filter((e) => {\n    if (e.source === 'libre') return false;\n",
    pourquoi: 'l’écran Historique masque les exercices hors plan',
  },
  {
    id: 'INV-21', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil) return lauf;\n      const t = lauf.aktuellerTeil;",
    to: "if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil || lauf.geplanteTeile.length === 1) return lauf;\n      const t = lauf.aktuellerTeil;",
    pourquoi: 'le dernier Teil (ou un Teil seul) ne mène plus nulle part : « Valider » ne fait rien (SimulationRunner.tsx:184-191)',
  },
  {
    id: 'INV-20a', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'vorbereitung') return lauf;\n      const teil = aktion.teil",
    to: "if (lauf.zustand === 'gespeichert') return lauf;\n      const teil = aktion.teil",
    pourquoi: '« démarrer » redevient possible depuis le bilan : la fin de partie recule à laufend',
  },
  {
    id: 'INV-20b', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: 'lauf.geplanteTeile.find((t) => !lauf.teileGespielt.includes(t)) ?? null;',
    to: 'lauf.geplanteTeile[0] ?? null;',
    pourquoi: 'la partie suivante ré-affiche l’exercice qu’on vient de terminer',
  },
  {
    id: 'INV-20c', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: "if (lauf.zustand !== 'checkliste') return lauf;\n      const letzter",
    to: "if (lauf.zustand !== 'checkliste' && lauf.zustand !== 'gespeichert') return lauf;\n      const letzter",
    pourquoi: 'une simulation enregistrée peut être rouverte au bilan',
  },
  {
    id: 'INV-28', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/lauf/automat.ts',
    from: 'if (sekunden <= vorher) return lauf;',
    to: 'if (sekunden === vorher) return lauf;',
    pourquoi: 'un chrono remis à zéro par un remontage écrase le temps joué (« on m’a remis au début »)',
  },
  {
    id: 'INV-22', tests: 'tests/invariants.lauf.test.tsx', file: 'src/lib/simulationSave.ts',
    from: '  if (!nouveau) return sim;\n',
    to: '',
    pourquoi: 'une partie validée deux fois émet deux événements de synchro et de journal',
  },
  {
    id: 'FB3-3oct', tests: 'tests/invariants.ia-externe.test.tsx', file: 'src/features/simulation/PendingExternalSimCard.tsx',
    from: "    if (await db.simulations.where('caseId').equals(x.caseId).filter((s) => s.date >= x.at).count()) return null;\n",
    to: '',
    pourquoi: 'le correctif dbf87df7 est retiré : l’accueil redemande l’évaluation d’une partie déjà jouée dans l’app',
  },
  {
    id: 'FB3-temoin', tests: 'tests/invariants.ia-externe.test.tsx', file: 'src/features/simulation/PendingExternalSimCard.tsx',
    from: '.filter((s) => s.date >= x.at).count()',
    to: '.filter((s) => s.date >= 0).count()',
    pourquoi: 'la garde devient trop large : n’importe quelle partie passée du cas fait taire une vraie séance externe',
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
