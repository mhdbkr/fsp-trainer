// ============================================================================
// Validateur « UN SYMPTÔME, UNE QUESTION » (FB2-J10) : dans la trame JOUÉE de
// chaque cas (chapitres adaptés + Fach insérée après « Aktuelle Beschwerden »),
// aucun symptôme de la carte `PROBE_SUCHT` ne doit être cherché par deux
// questions — y compris les questions propres au cas (lues par leur texte).
// Le montage réel est exécuté (esbuild), pas la source.
// Usage : node scripts/checkTrameSymptoms.mjs [--report] [--show <case-id>]
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
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
// --- Socle dégressif (série 3) ---------------------------------------------
// Porter `Symptom` de 16 à 36 concepts a rendu visibles des doublons qui
// passaient depuis toujours : ils sont RÉELS mais leur arbitrage (`sucht`,
// `relu`, `deepens`, `redundant`, reformulation) est du travail clinique, lot
// par lot. Le socle les gèle : tout constat NOUVEAU fait échouer la porte,
// et le compteur ne peut que baisser. `--bless` régénère le socle (à ne faire
// qu'après une relecture, jamais pour faire taire une régression).
const basePath = join(root, 'scripts/fixtures/trame-symptoms-baseline.json');
const all = [...errors.map((e) => 'E|' + e), ...review.map((r) => 'R|' + r)].sort();
// M4 (revue série 3) : `relu: true` éteint cette porte pour une question. Le
// nombre d'annotations est un compteur du socle : il ne remonte jamais, sinon
// une annotation posée sans relecture ferait taire un doublon en silence.
const relu = cases.reduce((t, c) => t + (c.caseSpecificQuestions ?? []).filter((q) => typeof q !== 'string' && q.relu).length, 0);
let base;
try { base = JSON.parse(readFileSync(basePath, 'utf8')); }
catch { console.error(`❌ socle absent ou illisible (${basePath}).`); process.exit(2); }
if (!Array.isArray(base.findings) || !Number.isInteger(base.relu)) {
  console.log(`❌ socle incomplet (${basePath}) : \`findings\` et \`relu\` sont obligatoires.`); process.exit(2);
}
if (process.argv.includes('--bless')) {
  const fresh = all.filter((f) => !base.findings.includes(f));
  if (fresh.length || relu > base.relu) {
    console.log(`❌ --bless refusé : ${fresh.length} constat(s) nouveau(x), relu ${base.relu} → ${relu}. Le socle ne remonte jamais.`); process.exit(1);
  }
  writeFileSync(basePath, JSON.stringify({ ...base, generated: new Date().toISOString().slice(0, 10), count: all.length, relu, findings: all }, null, 2) + '\n');
  console.log(`socle regravé : ${all.length} constats, ${relu} annotations relu`); process.exit(0);
}
if (relu > base.relu) {
  console.log(`❌ ${relu - base.relu} annotation(s) \`relu\` de plus (${relu}, socle ${base.relu}) : chacune éteint cette porte pour sa question.`);
  console.log('   Déclarer `sucht` (la question remplace la générale) ou reformuler ; `relu` se justifie en revue, jamais pour faire taire la porte.');
  process.exit(1);
}
const known = new Set(base.findings);
const fresh = all.filter((f) => !known.has(f));
const fixed = base.findings.filter((f) => !all.includes(f));

const show = (list) => { for (const p of report ? list : list.slice(0, 40)) console.log('  ✗ ' + p); if (!report && list.length > 40) console.log(`  … ${list.length - 40} de plus (--report)`); };
if (fresh.length) {
  console.log(`❌ ${fresh.length} NOUVEAU(X) doublon(s) de symptôme dans la trame jouée (${n} cas) :\n`);
  show(fresh.map((f) => f.slice(2)));
  console.log(`\n   Corriger la question, ou l'annoter \`sucht\`/\`relu\`. Le socle ne s'élargit pas.`);
  process.exit(1);
}
if (fixed.length || relu < base.relu) console.log(`   Socle entamé (constats ${all.length}/${base.findings.length}, relu ${relu}/${base.relu}) — lancer \`--bless\` pour le graver.`);
console.log(`✅ UN SYMPTÔME, UNE QUESTION — ${n} cas, aucun doublon nouveau ; socle série 3 : ${all.length}/${base.findings.length} constats ouverts (${errors.length} erreurs, ${review.length} à relire) ; relu ${relu}/${base.relu}.`);
