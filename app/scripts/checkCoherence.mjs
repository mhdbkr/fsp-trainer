// ============================================================================
// LA PORTE DE COHÉRENCE — lot K0 : MODE MESURE (ADR-0023, contrat
// `frage-atomique.md` §10.6). INFORMATIF : `|| true` en CI jusqu'à K3.
// ----------------------------------------------------------------------------
// Mesure, sur le montage RÉEL (esbuild, pas la source) des 130 cas, ce que le
// moteur de cohérence corrigera : signes cherchés plusieurs fois, questions
// hors profil, signes exigés absents, relances hors signe, questions placées
// avant ce qu'elles présupposent, banques qu'on ajouterait sans réponse.
// Avant K1/K2/K4 rien n'est déclaré : les signes se LISENT dans le texte et le
// profil se PROPOSE depuis la fiche. C'est une boussole (voir coherenceMesure.mjs).
// Ce qui exige `cohere` (K3) est rapporté « non mesurable avant K3 », pas inventé.
//
// Structure (bloquante dès K0 : exit 1) : le lexique est cohérent (INV-77/78).
// Plancher : app/scripts/fixtures/coherence-budget.json — jamais à la hausse
// (`checkBudgetFloor.mjs` le compare à la base ; ici : mesure ≤ plancher).
//
// Usage : node scripts/checkCoherence.mjs                  synthèse + 15 pires cas
//         node scripts/checkCoherence.mjs --case <id>      la trame jouée du cas, chaque constat et sa raison
//         node scripts/checkCoherence.mjs --json           compteurs + constats par cas (tests, diff entre lots)
//         node scripts/checkCoherence.mjs --bless          régénère le plancher (refusé si un compteur monte)
// Codes : 0 ok · 1 lexique incohérent ou mesure au-dessus du plancher · 2 outil/usage.
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { detect, trameWords } from './questionOrderDetect.mjs';
import { COMPTEURS, DIM, RESIDU, SIG, mesurerCas, totaux } from './coherenceMesure.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const flag = (k) => process.argv.includes(k);
const FIXTURE = process.env.COHERENCE_BUDGET ?? join(root, 'scripts/fixtures/coherence-budget.json');

// ── Charger le montage réel ──────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'fsp-coherence-'));
const entry = join(dir, 'entry.ts');
const src = (f) => JSON.stringify(join(root, 'src', f));
writeFileSync(entry, `
  export { seedCases } from ${src('data/seedCases.ts')};
  export { playedTrame, leitsymptomOf } from ${src('data/guides/anamneseChapters.ts')};
  export { phraseText, phraseAlts, phraseFollowUp, phraseProbes, phraseIsCaseSpecific } from ${src('data/guides/phrases.ts')};
  export { phraseSymptoms, PROBE_SUCHT, SIGNES, SIGNE_DEF, PROFIL_EXIGE, PROFIL_EXCLUT, lexiqueIncoherences } from ${src('data/guides/symptoms.ts')};
  export { PROBE_BY_ID } from ${src('data/guides/anamneseProbes.ts')};
`);
const out = join(dir, 'bundle.mjs');
try {
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
    plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
  });
} catch (e) { console.error(`❌ montage non chargeable : ${e.message.split('\n')[0]}`); process.exit(2); }
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

// ── Structure : le lexique tient-il ? (INV-77, INV-78) ───────────────────────
const structure = m.lexiqueIncoherences();
// Les motifs de lecture ne parlent que de signes du lexique.
for (const k of [...Object.keys(DIM), ...Object.keys(SIG)]) if (!m.SIGNES.includes(k)) structure.push(`coherenceMesure.mjs lit « ${k} », qui n'est pas un signe du lexique`);

// ── La trame jouée de chaque cas ─────────────────────────────────────────────
const cases = m.seedCases();
const rowsOf = (c) => {
  const { chapters, fach } = m.playedTrame(c);
  const rows = [];
  const push = (ch, p) => rows.push({
    ch, text: m.phraseText(p), probes: m.phraseProbes(p), cs: m.phraseIsCaseSpecific(p),
    sucht: m.phraseSymptoms(p), fu: m.phraseFollowUp(p),
  });
  for (const ch of chapters) {
    for (const p of ch.questions) push(ch.id, p);
    if (fach && ch.id === 'aktuell') for (const p of fach.chapter.questions) push('fach', p);
  }
  return rows;
};
// Détecteur de présupposition Q0 (le même parcours que checkQuestionOrder.mjs).
const walk = (c) => {
  const { chapters, fach } = m.playedTrame(c);
  const ans = c.patientSheet?.antworten ?? {};
  const turns = [];
  const add = (ch) => (p) => turns.push({
    ch, own: m.phraseIsCaseSpecific(p), q: [m.phraseText(p), ...m.phraseFollowUp(p)].join(' '),
    a: m.phraseProbes(p).map((id) => ans[id]).filter(Boolean).join(' '),
    all: [m.phraseText(p), ...m.phraseAlts(p), ...m.phraseFollowUp(p)],
  });
  for (const ch of chapters) { ch.questions.forEach(add(ch.id)); if (fach && ch.id === 'aktuell') fach.chapter.questions.forEach(add(fach.chapter.id)); }
  return turns;
};
const factsOf = (s = {}) => JSON.stringify([s.sozialanamnese, s.vorerkrankungen, s.voroperationen, s.medikamente, s.noxen, s.familienanamnese, s.allergien, s.personalia]);
const walks = new Map(cases.map((c) => [c.id, walk(c)]));
const trame = trameWords([...walks.values()].flatMap((ts) => ts.filter((t) => !t.own).flatMap((t) => t.all)));

const lex = { PROFIL_EXIGE: m.PROFIL_EXIGE, PROFIL_EXCLUT: m.PROFIL_EXCLUT, SIGNE_DEF: m.SIGNE_DEF };
const results = cases.map((c) => {
  const s = c.patientSheet;
  const qo = detect({ id: c.id, facts: factsOf(s), turns: walks.get(c.id) }, trame).map((h) => `${h.rule} « ${h.hit.trim()} » [${h.ch}]`);
  return mesurerCas({
    id: c.id, specialty: c.specialty, kategorie: m.leitsymptomOf(c), schmerz: s.schmerz, leit: s.leitsymptome, begleit: s.begleitsymptome,
    veg: s.vegetativeAnamnese, verdacht: c.medicalView?.verdachtsdiagnose, name: c.name, pathology: c.pathology,
    ddx: (c.medicalView?.differenzialdiagnosen ?? []).map((d) => d.dd), antworten: s.antworten, rows: rowsOf(c),
  }, lex, qo);
});
const sondesMuettes = Object.keys(m.PROBE_BY_ID).filter((id) => !(id in m.PROBE_SUCHT)).length;
const T = totaux(results, { sondesMuettes });

// ── Sorties ──────────────────────────────────────────────────────────────────
if (flag('--json')) {
  const slim = (r) => ({ id: r.id, kat: r.kat, tags: r.profil.tags, n: r.n, dup: r.dup, imp: r.imp, miss: r.miss, ajoutSansReponse: r.ajoutSansReponse, fu: r.fu, ord: r.ord, muettes: r.muettes });
  // écrire puis sortir à la fin du flush : `process.exit` coupe un pipe à 64 Ko
  process.stdout.write(JSON.stringify({ cas: results.length, structure, ...T, parCas: results.map(slim) }) + '\n', () => process.exit(structure.length ? 1 : 0));
  await new Promise(() => {});
}

const one = arg('--case');
if (one) {
  const r = results.find((x) => x.id === one || x.id === `case-${one}`);
  if (!r) { console.error(`❌ cas inconnu : ${one}`); process.exit(2); }
  const p = r.profil;
  console.log(`${r.id} — nature « ${r.kat} » — ${r.n} unités jouées (ouverture, personalia et clôture exclues)`);
  console.log(`profil PROPOSÉ (aucun profil n'est déclaré avant K2) : tags [${p.tags.join(', ')}]`);
  console.log(`  dérivés des données du cas : [${p.derives.join(', ')}] · lus dans la fiche : [${p.propose.join(', ')}]`);
  console.log(`  exige : ${[...p.exige].map(([s, t]) => `${s} (${t})`).join(', ') || '—'} · exclut : ${[...p.exclut].map(([s, t]) => `${s} (${t})`).join(', ') || '—'}\n`);
  for (const u of r.units) if (u.ch === 'aktuell' || u.ch === 'fach' || u.ch === 'vegetativ') {
    console.log(`${String(u.rank).padStart(3)} ${u.ch.padEnd(9)} ${u.probe.padEnd(30)} ${u.declared ? '' : (u.cs ? '(muette) ' : '')}[${[...u.all].join(', ')}]`);
  }
  const bloc = (titre, list, fmt) => { console.log(`\n── ${titre} (${list.length})`); for (const x of list) console.log(`   ${fmt(x)}`); };
  bloc('doublons — un signe, plusieurs unités', r.dup, (x) => `${x.at.join('  |  ')}\n      RAISON : ${x.why}`);
  bloc('hors profil', r.imp, (x) => `${x.at}\n      RAISON : ${x.why}`);
  bloc('exigés et absents', r.miss, (x) => `${x.s} — banque ${x.bank ?? '(aucune)'}\n      RAISON : ${x.why}`);
  bloc('banques ajoutées sans réponse (projection r3)', r.ajoutSansReponse, (x) => `${x.bank}\n      RAISON : ${x.why}`);
  bloc('relances hors signe', r.fu, (x) => `${x.at}  « ${x.mother} »\n      relance : ${x.fu}\n      RAISON : ${x.why}`);
  if (r.fuCond.length) bloc('relances conditionnelles lisant un autre signe — lecture large, NON comptée', r.fuCond, (x) => `${x.at}  « ${x.mother} »\n      relance : ${x.fu}\n      RAISON : ${x.why}`);
  bloc('ordre / présupposition', r.ord, (x) => `${x.at}\n      RAISON : ${x.why}`);
  console.log(`\nquestions du cas muettes (sans \`sucht\`) : ${r.muettes}/${r.casTotal}`);
  process.exit(structure.length ? 1 : 0);
}

// ── Synthèse + plancher ──────────────────────────────────────────────────────
let floor;
try { floor = JSON.parse(readFileSync(FIXTURE, 'utf8')); } catch { floor = undefined; }
const num = (v) => (v === null || v === undefined ? '  —' : String(v).padStart(4));
console.log(`COHÉRENCE DE L'ANAMNÈSE — mode MESURE (informatif) — ${results.length} cas, ${results.reduce((a, r) => a + r.n, 0)} unités jouées\n`);
console.log('compteur'.padEnd(20), 'mesure', 'plancher', ' signification');
for (const [k, label, source, exact] of COMPTEURS) console.log(k.padEnd(20), num(T.brut[k]).padStart(6), num(floor?.brut?.[k]).padStart(8), ` ${label}\n${' '.repeat(36)}mesure : ${source} — exacte dès ${exact}`);
console.log('\nrésidu de contenu');
for (const [k, label, exact] of RESIDU) console.log(k.padEnd(20), (T.residu[k] === null ? 'K3' : num(T.residu[k])).padStart(6), num(floor?.residu?.[k]).padStart(8), ` ${label}${T.residu[k] === null ? ' — non mesurable avant K3' : ` — à 0 dès ${exact}`}`);
console.log(`\nrepères de la spec §2 : (a) ${T.spec.a} · (b) ${T.spec.b} · (c) ${T.spec.c} · (d) ${T.spec.d} dont ${T.spec.dDetachables} détachables sans condition · (d large, sans condition) ${T.spec.dLarge} · relances conditionnelles lues large, non comptées ${T.spec.dCondLarge} · (e) ${T.spec.e}`);
const hist = {};
for (const r of results) { const b = r.score === 0 ? '0' : r.score <= 3 ? '1-3' : r.score <= 6 ? '4-6' : r.score <= 10 ? '7-10' : '>10'; hist[b] = (hist[b] ?? 0) + 1; }
console.log(`distribution du score par cas (a+b+c+d+e) : ${JSON.stringify(hist)}`);
console.log('\n15 cas les plus touchés (node scripts/checkCoherence.mjs --case <id>) :');
for (const r of [...results].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 15)) {
  console.log(`  ${r.id.padEnd(32)} ${r.kat.padEnd(13)} score ${String(r.score).padStart(2)}  doublons ${r.dup.length} (${r.dup.map((d) => d.s).join(',')}) · hors profil ${r.imp.length} · absents ${r.miss.length} · relances ${r.fu.length} · ordre ${r.ord.length}`);
}

if (structure.length) { console.log(`\n❌ LEXIQUE INCOHÉRENT (${structure.length}) :`); for (const s of structure) console.log(`  ✗ ${s}`); }

const mesure = { ...T.brut, ...Object.fromEntries(Object.entries(T.residu).filter(([, v]) => v !== null)) };
const flatFloor = floor ? { ...floor.brut, ...floor.residu } : undefined;
const hausse = flatFloor ? Object.entries(mesure).filter(([k, v]) => Number.isInteger(flatFloor[k]) && v > flatFloor[k]) : [];
if (flag('--bless')) {
  if (hausse.length) { console.log(`\n❌ --bless refusé : ${hausse.map(([k, v]) => `${k} ${flatFloor[k]} → ${v}`).join(', ')}. Le plancher ne remonte jamais ; une hausse de MESURE s'écrit à la main, raison au fixture, acceptée en revue.`); process.exit(1); }
  const next = {
    mesureLe: process.env.COHERENCE_DATE ?? new Date().toISOString().slice(0, 10), cas: results.length,
    source: floor?.source ?? 'K0 — lecture du texte et profil PROPOSÉ ; exacts quand les déclarations remplacent la lecture (K1 sondes, K2 profils, K4 questions du cas).',
    brut: T.brut, residu: T.residu, allowed: floor?.allowed ?? [],
  };
  writeFileSync(FIXTURE, JSON.stringify(next, null, 2) + '\n');
  console.log(`\nplancher regravé : ${FIXTURE.replace(root + '/', '')}`);
  process.exit(structure.length ? 1 : 0);
}
if (!floor) { console.log(`\n❌ plancher absent ou illisible (${FIXTURE}) — \`--bless\` l'initialise.`); process.exit(2); }
if (hausse.length) {
  console.log(`\n❌ MESURE AU-DESSUS DU PLANCHER : ${hausse.map(([k, v]) => `${k} ${flatFloor[k]} → ${v}`).join(', ')}.`);
  console.log('   Un contenu ou un lexique récent a ajouté du désordre. Corriger la source ; une hausse de mesure (lecture plus fine) s\'écrit au fixture avec sa raison.');
  process.exit(1);
}
const mieux = Object.entries(mesure).filter(([k, v]) => Number.isInteger(flatFloor[k]) && v < flatFloor[k]);
if (mieux.length) console.log(`\n   Plancher entamé (${mieux.map(([k, v]) => `${k} ${flatFloor[k]} → ${v}`).join(', ')}) — \`--bless\` pour le graver.`);
console.log(structure.length ? '' : `\n✅ COHÉRENCE (mesure) — lexique cohérent, aucun compteur au-dessus du plancher. Informatif jusqu'à K3 : la porte bloquante exige 0 après montage.`);
process.exit(structure.length ? 1 : 0);
