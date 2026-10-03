// ============================================================================
// ATOMICITÉ DES QUESTIONS — audit série 3, §6.4.
// ----------------------------------------------------------------------------
// « Une question à la fois. » Le retour d'usage : le candidat récite une
// réplique qui empile trois interrogations, le simulant répond à la dernière,
// et l'entretien déraille. L'audit a mesuré 1 399 énoncés touchés sur 15 591,
// concentrés dans l'ORAL POSÉ PAR LE CANDIDAT (classe Q) — les Muster et les
// Aufklärungen sont déclaratifs et propres, ce script ne les lit pas.
//
// CINQ RÈGLES (§6.4, amendées par la décision Q11 de la direction) :
//   1 atomicité   — au plus un « ? » par réplique. Exception nominative
//                   (ALLOWED_COMPOSED), chaque entrée avec sa raison écrite.
//                   NE S'APPLIQUE PAS AUX QUESTIONS D'OBERARZT (règle D).
//   2 énumération — une question à un « ? » n'énumère pas plus de 3 items
//                   cliniques distincts ; un followUp est plafonné à 2.
//   3 alternative — pas d'alternative BINAIRE dépendante du cas
//                   (« die Hand oder der Fuß », « das Bein/den Arm ») :
//                   le cas sait lequel des deux, c'est un trou de rédaction.
//   D salve       — l'examinateur, lui, A LE DROIT d'enchaîner (voir plus bas) :
//                   seule la salve INCOHÉRENTE se découpe, et son seul marqueur
//                   mesurable est l'arité — au-delà de TROIS interrogations.
//                   Les salves à 2 et à 3 ne sont pas découpées, mais COMPTÉES
//                   (D2, D3) : exemptées de la règle A, pas du budget (D1).
//   4 budget      — plancher dans fixtures/atomicity-budget.json ; la porte
//                   échoue si un compteur REMONTE, si une clé manque, ou si la
//                   liste d'exemptions grossit (E). `--bless` ne grave qu'une
//                   BAISSE. C'est le seul moyen d'introduire la règle sans
//                   bloquer les 130 cas existants.
//
// CORPUS : le catalogue (sondes, guide, questions des cas, Oberarzt) ET la
// TRAME JOUÉE de chaque cas (`playedTrame`) — une réplique reformulée pour un
// sexe, un âge, ou recomposée par « un symptôme, une question » n'existe
// qu'à l'écran. Chaque texte distinct compte une fois.
//
// POURQUOI L'OBERARZT EST SORTI DE LA RÈGLE 1 (décision Q11) : en examen réel,
// un senior enchaîne ses questions — « Welche Verdachtsdiagnose haben Sie?
// Warum? » est fidèle, pas fautif. Les 471 salves d'examinateur que la règle 1
// comptait n'étaient pas des défauts ; les compter revenait à demander au
// contenu d'être moins réaliste que l'examen. Seules les salves INCOHÉRENTES
// — celles dont les items n'ont aucun rapport entre eux — se découpent.
//
// CE QUE LA MESURE A DIT DE L'INCOHÉRENCE (et pourquoi la règle D est l'arité) :
// deux détecteurs sémantiques ont été écrits et jetés.
//   • liaison lexicale (une sous-question est isolée si aucun de ses
//     substantifs n'apparaît ailleurs dans la salve, anaphores exemptées) :
//     407 salves sur 471. La salve d'examen normale est « question générale +
//     approfondissement », et le terme précis de l'approfondissement est
//     NEUF par construction — le signal est inversé.
//   • terme de vocabulaire orphelin (« Was bedeutet X? » dont le X n'est pas
//     dans le reste de la salve) : 15 constats, dont 14 légitimes
//     (« Was bedeutet Myokarditis? Und Perikarditis, Endokarditis? »).
// Aucun signal lexical ne sépare la salve incohérente des 470 autres. Ce qui
// la sépare, mesuré : l'ARITÉ. 450 salves à deux interrogations, 16 à trois,
// UNE à quatre — et c'est exactement celle que la direction a nommée
// (case-copd, « Was macht der Patient beruflich? Ist er im Ruhestand? Wo hat
// er früher gearbeitet? Was bedeutet „Senioren“? »). Au-delà de trois,
// l'examinateur n'interroge plus : il énumère sa propre incertitude.
// Les 16 salves à trois restent SOUS SURVEILLANCE — abaisser le seuil à 2 est
// un lot de contenu, pas un changement de validateur.
//
// La distinction que le validateur DOIT tenir (elle est le cœur de la règle 3) :
//   • `fach-kardio-ausstrahlung` — « in den linken Arm, den Hals, den
//     Unterkiefer oder den Rücken » : QUATRE membres. L'énumération EST la
//     question clinique (les territoires d'irradiation de l'angor). Légitime,
//     exemptée mécaniquement par son arité.
//   • `fach-ortho-durchblutung` — « die Hand ODER der Fuß » : DEUX membres.
//     Le cas sait si le traumatisme est au bras ou à la jambe : demander les
//     deux prouve qu'on n'a pas lu le cas. Trou de rédaction, signalé.
// Critère mécanique, aligné sur INV-42 (contrat frage-atomique §6) : un membre
// supérieur et un membre inférieur (Hand/Arm ↔ Fuß/Bein, au singulier)
// reliés par `oder` ou `/`, hors verbe d'irradiation et hors énumération de
// trois territoires. L'article est FACULTATIF ici, ce qui ÉCARTE ce script de
// la lettre du §3.3 (« article répété ») : sans cela `fach-neuro-kraft`
// (« ein Arm oder Bein ») passerait, et INV-42 exige qu'il échoue.
// Amendement du §3.3 proposé dans app/docs/reports/fix-s3-contenu.md. `fach-uro-
// flanke` (Flanke oder Rücken) passe par le critère : aucune exemption écrite.
//
// AUCUN DÉCOUPAGE AUTOMATIQUE (§6.1) : ce script COMPTE et REFUSE, il ne
// réécrit jamais. Un split sur « ? » produit de l'allemand faux dans quatre
// situations (préfixe d'étiquette, subordonnée portée par la 1re question,
// ellipse de composé, relance conditionnelle) — toutes présentes au corpus.
//
// Usage : node scripts/checkQuestionAtomicity.mjs [--report]      (la porte)
//         node scripts/checkQuestionAtomicity.mjs --bless          (baisse le budget)
//         node scripts/checkQuestionAtomicity.mjs --rule A|B|C|D|D2|D3|E [--report]
//         node scripts/checkQuestionAtomicity.mjs --corpus
// `--rule` et `--corpus` sont des LOUPES : elles sortent à 0 quel que soit le
// budget. Jamais en CI — la porte, c'est l'appel sans option.
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

// --- Exceptions nominatives (règle 1) ---------------------------------------
// Liste VIDE (contrat Q12). Chaque entrée porterait sa raison écrite, décidée
// par la direction ; leur nombre est le compteur E du budget : une entrée
// ajoutée fait échouer la porte, la liste ne grossit pas en silence.
const ALLOWED_COMPOSED = {
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
  export { playedTrame } from ${JSON.stringify(join(root, 'src/data/guides/anamneseChapters.ts'))};
  export { phraseText, phraseAlts, phraseFollowUp, phraseProbes, phraseIsCaseSpecific, splitDimension } from ${JSON.stringify(join(root, 'src/data/guides/phrases.ts'))};
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
// Dédoublonnage par IDENTITÉ, pas par `id` : les dix variantes de
// « Aktuelle Beschwerden » portent toutes `id: 'aktuell'`. Dédoublonner sur
// l'id n'en lisait qu'UNE (schmerz) et laissait les neuf autres invisibles —
// mesuré à +N constats A en série 3. Le sous-titre les sépare.
const seenChapter = new Set();
for (const ch of chapters) {
  const key = `${ch.id}|${ch.subtitle}`;
  if (seenChapter.has(key)) continue;
  seenChapter.add(key);
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

// La TRAME JOUÉE (I4) : ce que l'écran affiche. Un texte déjà au catalogue
// y est compté une fois ; les autres (reformulés par sexe/âge, recomposés par
// `parts`) n'existent qu'ici — chaque texte distinct compte une fois, sous le
// premier cas qui l'affiche. Les questions du cas sont déjà comptées plus haut.
const seenText = new Set(rows.map((r) => r.text));
for (const c of m.seedCases()) {
  const { chapters, fach } = m.playedTrame(c);
  for (const ch of fach ? [...chapters, fach.chapter] : chapters) for (const p of ch.questions) {
    if (m.phraseIsCaseSpecific(p)) continue;
    const id = m.phraseProbes(p)[0];
    for (const [kind, t] of [['phrase', m.phraseText(p)], ...m.phraseAlts(p).map((a) => ['alt', a]), ...m.phraseFollowUp(p).map((f) => ['followUp', f])]) {
      const text = typeof t === 'string' ? t.trim() : '';
      if (!text || seenText.has(text)) continue;
      seenText.add(text);
      push(`trame/${c.id}`, id, kind, text);
    }
  }
}
// `patientSheet.schwierigeReaktionen` est volontairement HORS corpus : c'est
// la réaction du simulant (une bouffée d'angoisse, plusieurs phrases), pas une
// réplique que le candidat doit prononcer. Lui appliquer « une question à la
// fois » serait un contresens : un patient qui panique enchaîne, et c'est
// précisément ce que le candidat doit apprendre à encaisser.

// ---------------------------------------------------------------------------
// RÈGLE A — atomicité : au plus un « ? ». Chez l'OBERARZT seulement, une
// question citée entre guillemets (« Der Patient fragt: „Muss ich sterben?“ »)
// n'est pas son interrogation : elle est retirée avant le comptage (D1). Pour
// le candidat, les guillemets marquent ce qu'IL doit dire — « „Wie groß sind
// Sie?“ Wie viel wiegen Sie? » reste une réplique à deux questions (re-revue I-1).
const QUOTED = /„[^“”"]*[“”"]|“[^”]*”|»[^«]*«|"[^"]*"/g;
// « ？ » pleine chasse compte comme « ? » (revue finale 7c).
// ponytail: chez l'Oberarzt, le retrait des guillemets vaut pour la règle D
// (D2/D3/D) — c'est ce que la décision D1 de main demandait (« Règle D (Oberarzt)
// … corrige aussi le comptage des « ? » cités »), l'Oberarzt étant de toute façon
// hors règle A (Q11). Plafond connu : une salve d'examinateur ENTIÈREMENT écrite
// entre guillemets échappe à D. Si cela apparaît, compter à part les « ? » cités.
const countQ = (t, ober = false) => ((ober ? t.replace(QUOTED, '') : t).match(/[?？]/g) || []).length;

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

// RÈGLE C — alternative BINAIRE dépendante du cas (contrat §3.3), sur les
// seuls énoncés interrogatifs : un membre supérieur et un membre inférieur
// (Hand/Arm ↔ Fuß/Bein), au singulier (« Armen oder Beinen » dépiste les deux : pas une alternative),
// reliés par `oder` ou `/`, article ou préposition facultatifs. L'ellipse de
// composé (`Hand- oder Fußgelenk`) est exclue par le tiret. Exemptés : le
// verbe d'irradiation (« strahlt … in die Schulter oder das Schulterblatt
// aus » — la topographie EST la question) et l'énumération de ≥ 3 territoires.
const BODY = 'Hand|Fuß|Fuss|Arm|Bein|Wade|Knie|Schulter|Hüfte|Ellenbogen|Handgelenk|Sprunggelenk|Finger|Zehe|Auge|Ohr|Flanke|Rücken|Bauch|Brust|Hals|Nacken|Kopf|Schenkel|Knöchel|Oberarm|Unterarm|Oberschenkel|Unterschenkel|Gelenk|Seite';
const ART = '(?:der|die|das|den|dem|des|ein|eine|einen|einem|Ihr|Ihre|Ihren|Ihrem)';
const LAT = 'Hand|Fuß|Fuss|Arm|Bein';
const PRE = `(?:(?:${ART}|in|im|ins|am)\\s+)?(?:[a-zäöüß]+\\s+)?`;
// `\\b` ne voit pas de frontière après « ß » (hors \\w sans drapeau u) : fin de mot explicite.
const END = '(?![\\wäöüßÄÖÜ])';
const RE_PAIR = new RegExp(`\\b(${LAT})(?:es|s)?${END}\\s*(oder\\s+|/)${PRE}(${LAT})(?:es|s)?${END}`);
// Début de mot : « anziehen », « beziehen » ne sont pas des irradiations (m-3).
const RE_IRRAD = /\b(?:aus)?strahl\w*|\bzieh(?:t|en)\b/i;
// Une énumération d'au moins TROIS membres n'est pas une alternative binaire :
// c'est la question clinique elle-même (irradiation de l'angor).
const RE_MEMBERS = new RegExp(`\\b${ART}\\s+(?:\\w+\\s+)?(?:${BODY})\\w*`, 'gi');
// Le cas sait si c'est le membre SUPÉRIEUR ou INFÉRIEUR : c'est là la faute.
// « am Bein oder am Fuß » (case-erysipel : la porte d'entrée sur la même
// jambe) dépiste un seul membre — pas une alternative.
const upper = (w) => w === 'Hand' || w === 'Arm';
function altIssue(text) {
  if (!text.includes('?')) return null;
  const head = text.split('?')[0];
  if ((head.match(RE_MEMBERS) ?? []).length >= 3) return null;   // énumération clinique
  if (RE_IRRAD.test(head)) return null;                            // irradiation
  const mm = head.match(RE_PAIR);
  if (!mm || upper(mm[1]) === upper(mm[3])) return null;
  return mm[2] === '/' ? 'alternative collée « X/Y »' : 'alternative binaire « X oder Y »';
}

// ---------------------------------------------------------------------------
// RÈGLE D — salve d'examinateur. Arité seule : une salve de plus de trois
// interrogations n'est plus un enchaînement, c'est une énumération d'items
// sans rapport (décision Q11, et la mesure ci-dessus).
const SALVE_MAX = 3;

const findings = { A: [], B: [], C: [], D: [], D2: [], D3: [], E: [] };
for (const id of Object.keys(ALLOWED_COMPOSED)) findings.E.push({ where: 'ALLOWED_COMPOSED', id, text: ALLOWED_COMPOSED[id] });
for (const r of rows) {
  const exempt = r.id && ALLOWED_COMPOSED[r.id];
  const ober = r.kind === 'oberarzt';
  const n = countQ(r.text, ober);
  if (n >= 2 && !exempt && !ober) findings.A.push(r);
  if (ober && n > SALVE_MAX) findings.D.push({ ...r, n });
  if (ober && n === 2) findings.D2.push({ ...r, n });
  if (ober && n === 3) findings.D3.push({ ...r, n });
  if (n === 1) {
    const items = enumItems(r.text);
    const cap = r.kind === 'followUp' ? 2 : 3;
    if (items.length > cap) findings.B.push({ ...r, items: items.length, cap });
  }
  const why = altIssue(r.text); if (why) findings.C.push({ ...r, why });
}

const KEYS = ['A', 'B', 'C', 'D', 'D2', 'D3', 'E'];
const counts = Object.fromEntries(KEYS.map((k) => [k, findings[k].length]));
const total = KEYS.reduce((t, k) => t + counts[k], 0);

if (process.argv.includes('--corpus')) {
  const by = {};
  for (const r of rows) { const k = r.where.split('/')[0]; by[k] = (by[k] ?? 0) + 1; }
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(5)}  ${k}`);
  console.log(`${String(rows.length).padStart(5)}  TOTAL`); process.exit(0);
}

let fixture;
try { fixture = JSON.parse(readFileSync(budgetPath, 'utf8')); }
catch { console.error(`❌ budget absent ou illisible (${budgetPath}).`); process.exit(2); }
const budget = fixture.budget ?? {};
// I2 : une clé absente ou non numérique ne désactive pas sa règle — elle
// ferme la porte (`NaN > 0` est faux : la règle se taisait).
const missing = KEYS.filter((k) => !Number.isInteger(budget[k]));
if (missing.length) {
  console.log(`❌ budget incomplet : clé(s) ${missing.join(', ')} absente(s) ou non entière(s) dans ${budgetPath}.`);
  process.exit(2);
}
const fmt = (o) => KEYS.map((k) => `${k}=${o[k]}`).join(' ');

// I3 : `--bless` ne grave qu'une BAISSE. Il réécrit les compteurs et le
// corpus, conserve toutes les notes du fixture, et refuse toute hausse — une
// hausse de mesure (validateur élargi) s'écrit à la main, raison à l'appui,
// et la porte « face à main » (checkBudgetFloor.mjs) la montre en revue.
if (bless) {
  const up = KEYS.filter((k) => counts[k] > budget[k]);
  if (up.length) {
    console.log(`❌ --bless refusé : ${up.map((k) => `${k} ${budget[k]} → ${counts[k]}`).join(', ')}. Le budget ne remonte jamais.`);
    process.exit(1);
  }
  writeFileSync(budgetPath, JSON.stringify({ ...fixture, generated: new Date().toISOString().slice(0, 10), corpus: rows.length, budget: counts }, null, 2) + '\n');
  console.log(`budget regravé : ${fmt(counts)} sur ${rows.length} énoncés`);
  process.exit(0);
}

const LABEL = { A: 'plus d\'un « ? » dans une réplique', B: 'énumération au-delà du plafond', C: 'alternative dépendante du cas', D: 'salve d\'examinateur incohérente (> 3 interrogations)', D2: 'salve d\'examinateur à 2 interrogations', D3: 'salve d\'examinateur à 3 interrogations', E: 'exemption nominative ALLOWED_COMPOSED (Q12 : la liste ne grossit pas sans décision)' };
const show = (k) => {
  const list = findings[k];
  const head = report ? list : list.slice(0, 15);
  for (const r of head) {
    const extra = k === 'B' ? ` [${r.items} items > ${r.cap}]` : k === 'C' ? ` [${r.why}]` : k.startsWith('D') ? ` [${r.n} interrogations]` : k === 'E' ? '' : ` [${countQ(r.text)} « ? »]`;
    console.log(`  ✗ ${r.where}${r.id ? ` (${r.id})` : ''}${extra}\n      « ${r.text.slice(0, 150)} »`);
  }
  if (!report && list.length > head.length) console.log(`  … ${list.length - head.length} de plus (--report)`);
};

if (onlyRule) { console.log(`${onlyRule} — ${findings[onlyRule]?.length ?? 0} : ${LABEL[onlyRule]}\n`); show(onlyRule); process.exit(0); }

let failed = false;
for (const k of KEYS) {
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
const gained = KEYS.filter((k) => budget[k] > counts[k]);
if (gained.length) console.log(`   Budget entamé : ${gained.map((k) => `${k} −${budget[k] - counts[k]}`).join(', ')} — lancer \`--bless\` pour le graver.`);
const sum = KEYS.reduce((t, k) => t + budget[k], 0);
console.log(`✅ ATOMICITÉ — ${rows.length} énoncés « à dire » ; ${KEYS.map((k) => `${k}=${counts[k]}/${budget[k]}`).join(' · ')} (total ${total}/${sum}).`);
