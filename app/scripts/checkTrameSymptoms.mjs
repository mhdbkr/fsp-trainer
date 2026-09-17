// ============================================================================
// Validateur « UN SYMPTÔME, UNE QUESTION » (FB2-J10) : dans la trame JOUÉE de
// chaque cas (chapitres adaptés + Fach insérée après « Aktuelle Beschwerden »),
// aucun symptôme de la carte `PROBE_SUCHT` ne doit être cherché par deux
// questions — y compris les questions propres au cas (lues par leur texte).
// Le montage réel est exécuté (esbuild), pas la source.
// Usage : node scripts/checkTrameSymptoms.mjs [--report] [--show <case-id>]
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const report = process.argv.includes('--report');
const dir = mkdtempSync(join(tmpdir(), 'fsp-sympt-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { playedTrame } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseIsCaseSpecific } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
  export { phraseSymptoms, symptomsInText } from ${JSON.stringify(join(root, 'src/data/guides/symptoms.ts'))};
  export { cqText, cqKapitel } from ${JSON.stringify(join(root, 'src/lib/caseQuestions.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });
const cases = m.seedCases();

const trame = (c) => {
  const { chapters, fach } = m.playedTrame(c);
  const rows = [];
  for (const ch of chapters) {
    for (const p of ch.questions) rows.push({ ch: ch.id, p });
    if (fach && ch.id === 'aktuell') for (const p of fach.chapter.questions) rows.push({ ch: fach.chapter.id, p });
  }
  return rows;
};

const showIdx = process.argv.indexOf('--show');
if (showIdx > 0) {
  const c = cases.find((x) => x.id === process.argv[showIdx + 1]);
  if (!c) { console.error('cas inconnu'); process.exit(2); }
  for (const { ch, p } of trame(c)) {
    const s = m.phraseSymptoms(p); const tag = s.length ? ` {${s.join(',')}}` : '';
    console.log(`  [${ch}]${m.phraseIsCaseSpecific(p) ? ' ★' : ''} ${m.phraseText(p).slice(0, 100)}${tag}`);
  }
  process.exit(0);
}

// Deux niveaux :
//  • ERREUR — un symptôme cherché par deux questions (sondes ou `sucht`
//    déclaré) : la modulation a une trou (`parts` manquant) ou un `sucht`
//    du cas entre en collision avec une autre question.
//  • RELECTURE — une question du cas (sans `sucht` ni `relu`) cite un
//    symptôme qu'une AUTRE question de la trame cherche, avant ou après
//    elle : elle le remplace ? l'approfondit ? le répète ? La relecture
//    tranche en l'annotant ou en la reformulant.
const errors = []; const review = []; let n = 0;
for (const c of cases) {
  n++;
  const seen = new Map(); // symptôme → première question
  const raw = new Map((c.caseSpecificQuestions ?? []).map((q) => [m.cqText(q), q]));
  const rows = trame(c);
  rows.forEach(({ ch, p }) => {
    const t = m.phraseText(p);
    for (const s of m.phraseSymptoms(p)) {
      const first = seen.get(s);
      if (first) errors.push(`${c.id} — « ${s} » deux fois : [${first.ch}] « ${first.t.slice(0, 50)} » puis [${ch}] « ${t.slice(0, 50)} »`);
      else seen.set(s, { ch, t });
    }
  });
  rows.forEach(({ ch, p }, i) => {
    if (!m.phraseIsCaseSpecific(p)) return;
    const t = m.phraseText(p);
    const q = raw.get(t);
    if (q && typeof q !== 'string' && (q.sucht || q.relu)) return;
    for (const s of m.symptomsInText(t)) {
      const other = rows.find((r, j) => j !== i && m.phraseSymptoms(r.p).includes(s));
      if (other) review.push(`${c.id} [${ch}] « ${t} » cite « ${s} », cherché ${rows.indexOf(other) < i ? 'plus haut' : 'PLUS BAS'} : [${other.ch}] « ${m.phraseText(other.p).slice(0, 55)} »`);
    }
  });
}
const show = (list) => { for (const p of report ? list : list.slice(0, 40)) console.log('  ✗ ' + p); if (!report && list.length > 40) console.log(`  … ${list.length - 40} de plus (--report)`); };
if (errors.length) { console.log(`❌ ${errors.length} symptôme(s) cherché(s) deux fois dans la trame jouée (${n} cas) :\n`); show(errors); }
if (review.length) { console.log(`❌ ${review.length} question(s) du cas à relire — symptôme déjà cherché, sans \`sucht\` ni \`relu\` :\n`); show(review); }
if (errors.length || review.length) process.exit(1);
console.log(`✅ UN SYMPTÔME, UNE QUESTION — ${n} cas, aucun symptôme cherché deux fois, questions du cas relues.`);
