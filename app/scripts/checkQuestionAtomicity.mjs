// ============================================================================
// ATOMICITÉ DES QUESTIONS — audit série 3, §6.4.
// ----------------------------------------------------------------------------
// « Une question à la fois. » Le retour d'usage : le candidat récite une
// réplique qui empile trois interrogations, le simulant répond à la dernière,
// et l'entretien déraille. L'audit a mesuré 1 399 énoncés touchés sur 15 591,
// concentrés dans l'ORAL POSÉ PAR LE CANDIDAT (classe Q) — les Muster et les
// Aufklärungen sont déclaratifs et propres, ce script ne les lit pas.
//
// QUATRE RÈGLES (§6.4) :
//   1 atomicité   — au plus un « ? » par réplique. Exception nominative
//                   (ALLOWED_COMPOSED), chaque entrée avec sa raison écrite.
//   2 énumération — une question à un « ? » n'énumère pas plus de 3 items
//                   cliniques distincts ; un followUp est plafonné à 2.
//   3 alternative — pas d'alternative BINAIRE dépendante du cas
//                   (« die Hand oder der Fuß », « das Bein/den Arm ») :
//                   le cas sait lequel des deux, c'est un trou de rédaction.
//   4 budget      — plancher dans fixtures/atomicity-budget.json ; la porte
//                   échoue si un compteur REMONTE. C'est le seul moyen
//                   d'introduire la règle sans bloquer les 130 cas existants.
//
// La distinction que le validateur DOIT tenir (elle est le cœur de la règle 3) :
//   • `fach-kardio-ausstrahlung` — « in den linken Arm, den Hals, den
//     Unterkiefer oder den Rücken » : QUATRE membres. L'énumération EST la
//     question clinique (les territoires d'irradiation de l'angor). Légitime,
//     exemptée mécaniquement par son arité.
//   • `fach-ortho-durchblutung` — « die Hand ODER der Fuß » : DEUX membres.
//     Le cas sait si le traumatisme est au bras ou à la jambe : demander les
//     deux prouve qu'on n'a pas lu le cas. Trou de rédaction, signalé.
// L'arité (2 vs ≥3) tient la distinction sans liste ; `fach-uro-flanke`
// (Flanke oder Rücken — deux régions, mais l'alternative EST la question)
// reste une exemption nommée, relue.
//
// AUCUN DÉCOUPAGE AUTOMATIQUE (§6.1) : ce script COMPTE et REFUSE, il ne
// réécrit jamais. Un split sur « ? » produit de l'allemand faux dans quatre
// situations (préfixe d'étiquette, subordonnée portée par la 1re question,
// ellipse de composé, relance conditionnelle) — toutes présentes au corpus.
//
// Usage : node scripts/checkQuestionAtomicity.mjs [--report] [--rule A|B|C]
//         node scripts/checkQuestionAtomicity.mjs --bless   (baisse le budget)
// ============================================================================
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const budgetPath = join(root, 'scripts/fixtures/atomicity-budget.json');
const report = process.argv.includes('--report');
const bless = process.argv.includes('--bless');
const ruleIdx = process.argv.indexOf('--rule');
const onlyRule = ruleIdx > 0 ? (process.argv[ruleIdx + 1] || '').toUpperCase() : '';

// --- Exceptions nominatives (règle 1 et règle 3) ----------------------------
// Chaque entrée porte SA RAISON, relue par la direction. Le budget refuse que
// cette liste grossisse sans décision : un ajout qui ferait remonter un
// compteur est bloqué par la règle 4 de toute façon.
const ALLOWED_COMPOSED = {
  // Règle 3 — alternatives binaires légitimes.
  'fach-uro-flanke': "Flanke ↔ Rücken : la distinction EST la question (colique néphrétique vs lombalgie), le cas ne la tranche pas d'avance.",
};

// ---------------------------------------------------------------------------
// Chargement réel (esbuild) — jamais une relecture de texte : les validateurs
// qui relisaient le TS comme une chaîne ne voyaient que les motifs évidents.
const dir = mkdtempSync(join(tmpdir(), 'fsp-atom-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
  export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
  export { seedGuides } from ${JSON.stringify(join(root, 'src/data/seedGuides.ts'))};
  export { PROBE_BY_ID } from ${JSON.stringify(join(root, 'src/data/guides/anamneseProbes.ts'))};
  export { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, aktuellChapterFor, abschlussChapterFor } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseAlts, phraseFollowUp, splitDimension } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
  export { cqText } from ${JSON.stringify(join(root, 'src/lib/caseQuestions.ts'))};
`);
const out = join(dir, 'bundle.mjs');
await build({
  entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }],
});
const m = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

// --- Le corpus « à dire » (classe Q) ----------------------------------------
// `where` sert au message ET à la clé de budget ; `id` porte la sonde quand
// elle existe, c'est lui qui rend une exemption nominative possible.
const rows = [];
const push = (where, id, kind, text) => { if (typeof text === 'string' && text.trim()) rows.push({ where, id, kind, text: text.trim() }); };

for (const [id, p] of Object.entries(m.PROBE_BY_ID)) push('sondes', id, 'frage', p.frage);

const chapters = [
  ...m.ALLGEMEINE_ANAMNESE,
  ...m.FACHANAMNESEN.map((f) => f.chapter),
  ...m.LEITSYMPTOM_KATEGORIEN.map((k) => m.aktuellChapterFor(k)),
  m.abschlussChapterFor(),
];
const seenChapter = new Set();
for (const ch of chapters) {
  if (seenChapter.has(ch.id)) continue;
  seenChapter.add(ch.id);
  for (const p of ch.questions) {
    const id = typeof p === 'string' ? undefined : (Array.isArray(p.probe) ? p.probe[0] : p.probe);
    push(`guide-anamnese/${ch.id}`, id, 'phrase', m.phraseText(p));
    for (const a of m.phraseAlts(p)) push(`guide-anamnese/${ch.id}`, id, 'alt', a);
    for (const f of m.phraseFollowUp(p)) push(`guide-anamnese/${ch.id}`, id, 'followUp', f);
    if (typeof p !== 'string') for (const pt of p.parts ?? []) {
      push(`guide-anamnese/${ch.id}`, id, 'part', pt.text);
      for (const f of pt.followUp ?? []) push(`guide-anamnese/${ch.id}`, id, 'followUp', f);
    }
  }
}

for (const g of m.seedGuides()) for (const s of g.sections ?? []) for (const it of s.items ?? []) {
  if (it.includes('?')) push(`guide-seedGuides/${g.id}`, undefined, 'item', it);
}

for (const c of m.seedCases()) {
  for (const q of c.caseSpecificQuestions ?? []) push(`case-questions/${c.id}`, undefined, 'caseq', m.cqText(q));
  for (const q of c.examinerQuestions ?? []) push(`oberarzt/${c.id}`, undefined, 'oberarzt', typeof q === 'string' ? q : q?.frage);
}
// `patientSheet.schwierigeReaktionen` est volontairement HORS corpus : c'est
// la réaction du simulant (une bouffée d'angoisse, plusieurs phrases), pas une
// réplique que le candidat doit prononcer. Lui appliquer « une question à la
// fois » serait un contresens : un patient qui panique enchaîne, et c'est
// précisément ce que le candidat doit apprendre à encaisser.

// ---------------------------------------------------------------------------
// RÈGLE A — atomicité : au plus un « ? ».
const countQ = (t) => (t.match(/\?/g) || []).length;

// RÈGLE B — énumération. Algorithme de l'audit §2 : retrait du préfixe
// d'étiquette (`Begleitbeschwerden — `), troncature au premier « ? », découpe
// sur `, / und / oder / bzw. / sowie`, conservation des segments de ≤ 6 mots
// portant un substantif capitalisé ≥ 4 lettres hors stoplist, dédoublonnage
// par préfixe de 5 caractères (`Kopfschmerzen`/`Kopfweh` = 1 item).
const STOP = new Set(['Sie', 'Ihr', 'Ihre', 'Ihren', 'Ihrem', 'Ihrer', 'Ihnen', 'Wie', 'Was', 'Wo', 'Wann', 'Welche', 'Und', 'Oder', 'Der', 'Die', 'Das', 'Dem', 'Den', 'Ein', 'Eine', 'Einen', 'Einem', 'Seit', 'Nein', 'Zum', 'Beispiel', 'Falls', 'Also', 'Aber', 'Dabei', 'Haben', 'Hatten', 'Nehmen', 'Gibt', 'Sind', 'Waren', 'Müssen', 'Können', 'Tritt', 'Treten']);
function enumItems(text) {
  const body = m.splitDimension(text).body;
  const head = body.split('?')[0];
  const segs = head.split(/,|\s+und\s+|\s+oder\s+|\s+bzw\.\s+|\s+sowie\s+/);
  const keys = new Set();
  for (const seg of segs) {
    const words = seg.trim().split(/\s+/).filter(Boolean);
    if (!words.length || words.length > 6) continue;
    const noun = words.find((w) => /^[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ-]{3,}$/.test(w.replace(/[^\wÄÖÜäöüß-]/g, '')) && !STOP.has(w.replace(/[^\wÄÖÜäöüß-]/g, '')));
    if (noun) keys.add(noun.replace(/[^\wÄÖÜäöüß]/g, '').slice(0, 5).toLowerCase());
  }
  return [...keys];
}

// RÈGLE C — alternative BINAIRE dépendante du cas, sur les seuls énoncés
// interrogatifs. Deux termes du lexique anatomique reliés par `oder` ou `/`,
// chacun avec son article. L'ellipse de composé (`Schlaf- oder
// Beruhigungsmittel`, `Nacht- oder Ruheschmerz`) est de l'allemand correct :
// elle est exclue par le tiret terminal.
const BODY = 'Hand|Fuß|Fuss|Arm|Bein|Wade|Knie|Schulter|Hüfte|Ellenbogen|Handgelenk|Sprunggelenk|Finger|Zehe|Auge|Ohr|Flanke|Rücken|Bauch|Brust|Hals|Nacken|Kopf|Schenkel|Knöchel|Oberarm|Unterarm|Oberschenkel|Unterschenkel|Gelenk|Seite';
const ART = '(?:der|die|das|den|dem|des|ein|eine|einen|einem|Ihr|Ihre|Ihren|Ihrem)';
const RE_ART = new RegExp(`\\b${ART}\\s+(?:\\w+\\s+)?(${BODY})\\w*\\s+oder\\s+${ART}\\s+(?:\\w+\\s+)?(${BODY})\\w*`, 'i');
const RE_SLASH = new RegExp(`\\b(${BODY})\\w*/(?:${ART}\\s+)?(${BODY})\\w*`, 'i');
// Une énumération d'au moins TROIS membres n'est pas une alternative binaire :
// c'est la question clinique elle-même (irradiation de l'angor).
const RE_MEMBERS = new RegExp(`\\b${ART}\\s+(?:\\w+\\s+)?(?:${BODY})\\w*`, 'gi');
function altIssue(text) {
  if (!text.includes('?')) return null;
  const head = text.split('?')[0];
  const members = head.match(RE_MEMBERS) ?? [];
  if (members.length >= 3) return null;                 // énumération clinique
  if (RE_ART.test(head)) return 'alternative binaire « X oder Y »';
  if (RE_SLASH.test(head)) return 'alternative collée « X/Y »';
  return null;
}

// ---------------------------------------------------------------------------
const findings = { A: [], B: [], C: [] };
for (const r of rows) {
  const exempt = r.id && ALLOWED_COMPOSED[r.id];
  const n = countQ(r.text);
  if (n >= 2 && !exempt) findings.A.push(r);
  if (n === 1) {
    const items = enumItems(r.text);
    const cap = r.kind === 'followUp' ? 2 : 3;
    if (items.length > cap) findings.B.push({ ...r, items: items.length, cap });
  }
  if (!exempt) { const why = altIssue(r.text); if (why) findings.C.push({ ...r, why }); }
}

const counts = { A: findings.A.length, B: findings.B.length, C: findings.C.length };
const total = counts.A + counts.B + counts.C;

if (process.argv.includes('--corpus')) {
  const by = {};
  for (const r of rows) { const k = r.where.split('/')[0]; by[k] = (by[k] ?? 0) + 1; }
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(5)}  ${k}`);
  console.log(`${String(rows.length).padStart(5)}  TOTAL`); process.exit(0);
}

if (bless) {
  writeFileSync(budgetPath, JSON.stringify({
    note: 'Budget DÉGRESSIF (audit série 3 §6.4, règle 4). Il ne remonte jamais. `--bless` après un lot corrigé, jamais pour faire taire une régression.',
    generated: new Date().toISOString().slice(0, 10),
    reference: 'Audit série 3 : A=1059 B=322 C=75 sur 15 591 énoncés, toutes classes. Ce script ne lit que la classe Q (l\'oral posé par le candidat) ; ses compteurs sont donc plus bas et ne se comparent pas ligne à ligne.',
    corpus: rows.length, budget: counts,
  }, null, 2) + '\n');
  console.log(`budget régénéré : A=${counts.A} B=${counts.B} C=${counts.C} sur ${rows.length} énoncés`);
  process.exit(0);
}

let budget;
try { budget = JSON.parse(readFileSync(budgetPath, 'utf8')).budget; }
catch { console.error(`❌ budget absent (${budgetPath}) — lancer --bless une fois.`); process.exit(2); }

const LABEL = { A: 'plus d\'un « ? » dans une réplique', B: 'énumération au-delà du plafond', C: 'alternative dépendante du cas' };
const show = (k) => {
  const list = findings[k];
  const head = report ? list : list.slice(0, 15);
  for (const r of head) {
    const extra = k === 'B' ? ` [${r.items} items > ${r.cap}]` : k === 'C' ? ` [${r.why}]` : ` [${countQ(r.text)} « ? »]`;
    console.log(`  ✗ ${r.where}${r.id ? ` (${r.id})` : ''}${extra}\n      « ${r.text.slice(0, 150)} »`);
  }
  if (!report && list.length > head.length) console.log(`  … ${list.length - head.length} de plus (--report)`);
};

if (onlyRule) { console.log(`${onlyRule} — ${findings[onlyRule]?.length ?? 0} : ${LABEL[onlyRule]}\n`); show(onlyRule); process.exit(0); }

let failed = false;
for (const k of ['A', 'B', 'C']) {
  const over = counts[k] - budget[k];
  if (over > 0) {
    failed = true;
    console.log(`❌ règle ${k} — ${LABEL[k]} : ${counts[k]} (budget ${budget[k]}, +${over}) :\n`);
    show(k);
    console.log('');
  }
}
if (failed) {
  console.log('   Le budget est DÉGRESSIF : il ne remonte jamais. Corriger la rédaction —');
  console.log('   jamais découper par script (§6.1 : le split sur « ? » produit de l\'allemand faux).');
  process.exit(1);
}
const gained = ['A', 'B', 'C'].map((k) => budget[k] - counts[k]);
if (gained.some((g) => g > 0)) console.log(`   Budget entamé : A −${gained[0]}, B −${gained[1]}, C −${gained[2]} — lancer \`--bless\` pour le graver.`);
console.log(`✅ ATOMICITÉ — ${rows.length} énoncés « à dire » ; A=${counts.A}/${budget.A} · B=${counts.B}/${budget.B} · C=${counts.C}/${budget.C} (total ${total}/${budget.A + budget.B + budget.C}).`);
