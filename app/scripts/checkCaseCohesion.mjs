// ============================================================================
// Validateur de COHÉSION — complémentaire de checkCaseCoherence.
//
// La « cohérence » vérifie que les CHIFFRES ne se contredisent pas.
// La « cohésion » vérifie que les PARTIES du cas se répondent : un cas est
// cohésif quand chaque élément avancé quelque part trouve son appui ailleurs.
//
// Six liens contrôlés :
//   1. DD NEUTRALISÉE  — chaque diagnostic différentiel doit être écartable
//      par un élément du dossier (negativeFindings / begleitsymptome).
//      Sans cela le candidat peut citer la DD mais pas la réfuter.
//   2. PIÈGE RÉPONDU   — chaque pruefungsfalle doit trouver sa réponse dans
//      examinerSheet ou askedInExam.
//   3. MUSTER DÉRIVÉ   — antécédents, médicaments, allergies et symptômes
//      principaux du patientSheet doivent se retrouver dans l'Arztbrief.
//   4. AUCUN CHIFFRE ORPHELIN — un nombre présent dans les Muster mais nulle
//      part dans le cas est une donnée inventée à la rédaction.
//   5. RÉPONSES SUBSTANTIELLES — aucune réponse de sonde vide ou famélique.
//   6. CHRONOLOGIE VIVABLE — aucune durée « seit N Jahren » supérieure à l'âge.
//
// Sortie : score de cohésion par cas + détail des liens manquants.
// Usage : node scripts/checkCaseCohesion.mjs [bundle.json ...]
//         sans argument : audite tout le corpus intégré.
// ============================================================================
import { readFileSync } from 'node:fs';
import { loadAll } from './loadCases.mjs';

const STOP = new Set(['eine','einer','eines','einem','einen','der','die','das','den','dem','des','und','oder','bei','mit','ohne','nach','vor','seit','sich','wird','wurde','werden','sind','ist','hat','habe','kein','keine','keinen','keiner','nicht','auch','noch','sehr','mehr','aber','als','wie','für','vom','zur','zum','beim','durch','über','unter','etwa','ca','ggf','bzw','sowie','dass','daher','deshalb','jedoch','dabei','damit','dann','schon','nur','ganz','allem','allen','ihre','ihrer','seine','seiner','dieser','diese','dieses','anamnestisch','patient','patientin','angabe','angaben','jahre','jahren','jahr']);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9\s-]/g, ' ');
// Radical grossier : l'allemand décline beaucoup, on coupe les finales usuelles.
const stem = (w) => w.replace(/(en|em|er|es|e|n|s)$/,'');
const toks = (s) => [...new Set(norm(s).split(/[\s-]+/).filter((w) => w.length >= 5 && !STOP.has(w)).map(stem))];

/** Un item est « repris » si au moins un de ses tokens significatifs apparaît
 *  dans le texte cible. Heuristique volontairement tolérante : on cherche les
 *  oublis francs, pas les reformulations. */
const covered = (item, hayStem) => {
  const t = toks(item);
  if (!t.length) return true;
  return t.some((w) => hayStem.includes(w));
};
const stemHay = (s) => norm(s).split(/[\s-]+/).map(stem).join(' ');

function checkCohesion(c) {
  const issues = [];
  const ps = c.patientSheet || {};
  const mv = c.medicalView || {};
  const m = c.musterSaetze || c.muster || {};
  const ab = m.arztbrief || {};
  const vor = m.vorstellung || {};
  const abAll = Object.values(ab).join(' ');
  const allCase = JSON.stringify(c);

  // 1) chaque DD doit être écartable par un élément du dossier
  const dossier = stemHay([...(ps.negativeFindings || []), ...(ps.begleitsymptome || []), ...(ps.leitsymptome || []), ...(ps.vorerkrankungen || [])].join(' '));
  const ddOrph = (mv.differenzialdiagnosen || []).filter((d) => !covered(d.dd, dossier)).map((d) => d.dd);
  if (ddOrph.length) issues.push({ k: 'DD non neutralisée', v: ddOrph });

  // 2) chaque piège doit trouver sa réponse côté examinateur
  const exam = stemHay(JSON.stringify([c.examinerSheet || [], c.examinerQuestions || [], c.caseSpecificQuestions || []]));
  const fw = stemHay(JSON.stringify(c.__fwAsked || []));
  const piegesOrph = (c.pruefungsfallen || []).filter((p) => !covered(p, exam + ' ' + fw));
  if (piegesOrph.length) issues.push({ k: 'piège sans réponse examinateur', v: piegesOrph.map((p) => p.slice(0, 70) + '…') });

  // 3) le Muster doit dériver du patientSheet
  const pairs = [
    ['vorerkrankungen', ps.vorerkrankungen, ab.vorerkrankungen],
    ['medikamente', ps.medikamente, ab.medikation],
    ['allergien', ps.allergien, ab['allergien-noxen']],
    ['leitsymptome', ps.leitsymptome, ab['aktuelle-beschwerden']],
  ];
  for (const [label, items, target] of pairs) {
    if (!items || !items.length || target === undefined) continue;
    const hay = stemHay(target);
    const miss = items.filter((i) => !covered(i, hay)).map((i) => String(i).slice(0, 60) + '…');
    if (miss.length) issues.push({ k: `absent de l'Arztbrief (${label})`, v: miss });
  }

  // 4) aucun chiffre orphelin dans les Muster
  const caseNums = new Set((allCase.match(/\d+[.,]?\d*/g) || []));
  const musterNums = [...new Set(((abAll + ' ' + Object.values(vor).join(' ')).match(/\d+[.,]?\d*/g) || []))];
  const orphan = musterNums.filter((n) => Number(n.replace(',', '.')) > 3 && !caseNums.has(n));
  if (orphan.length) issues.push({ k: 'chiffre présent dans les Muster mais nulle part dans le cas', v: orphan });

  // 5) réponses de sonde substantielles
  const thin = Object.entries(ps.antworten || {}).filter(([, v]) => String(v).trim().length < 12).map(([k]) => k);
  if (thin.length) issues.push({ k: 'réponse de sonde trop courte', v: thin });

  // 6) chronologie vivable
  const age = ps.personalia?.age;
  if (age) {
    const bad = [...allCase.matchAll(/seit (?:etwa |ungefähr |rund |gut |knapp )?(\d{1,2}) Jahren/g)]
      .map((mm) => Number(mm[1])).filter((y) => y > age);
    if (bad.length) issues.push({ k: `durée > âge (${age} ans)`, v: [...new Set(bad)].map(String) });
  }

  return issues;
}

// --- entrée ------------------------------------------------------------------
const args = process.argv.slice(2);
let entries = [];
if (args.length) {
  for (const f of args) {
    const d = JSON.parse(readFileSync(f, 'utf8'));
    const c = d.case || d;
    c.muster = d.muster;
    c.__fwAsked = d.fachwissen?.askedInExam || [];
    entries.push(c);
  }
} else {
  const { cases, fachwissen } = await loadAll();
  const fwById = Object.fromEntries(fachwissen.map((f) => [f.id, f]));
  for (const c of cases) { c.__fwAsked = fwById[c.linkedFachwissenId]?.askedInExam || []; entries.push(c); }
}

let totalLinks = 0, totalMiss = 0, flagged = 0;
const rows = [];
for (const c of entries) {
  const issues = checkCohesion(c);
  const miss = issues.reduce((s, i) => s + i.v.length, 0);
  const links = (c.medicalView?.differenzialdiagnosen?.length || 0) + (c.pruefungsfallen?.length || 0)
    + (c.patientSheet?.vorerkrankungen?.length || 0) + (c.patientSheet?.medikamente?.length || 0)
    + (c.patientSheet?.leitsymptome?.length || 0) + Object.keys(c.patientSheet?.antworten || {}).length;
  totalLinks += links; totalMiss += miss;
  if (issues.length) flagged++;
  rows.push({ id: c.id, links, miss, issues });
}
rows.sort((a, b) => b.miss - a.miss);
for (const r of rows) {
  const pct = r.links ? (100 * (1 - r.miss / r.links)) : 100;
  const mark = r.miss === 0 ? '✅' : pct >= 95 ? '🟡' : '❌';
  console.log(`${mark} ${r.id.padEnd(26)} cohésion ${pct.toFixed(1)}%  (${r.miss} lien(s) manquant(s) / ${r.links})`);
  for (const i of r.issues) console.log(`     • ${i.k} : ${i.v.slice(0, 4).join(' | ')}${i.v.length > 4 ? ` … +${i.v.length - 4}` : ''}`);
}
const global = 100 * (1 - totalMiss / totalLinks);
console.log(`\nCOHÉSION GLOBALE ${global.toFixed(1)}% — ${entries.length} cas, ${totalMiss} liens manquants sur ${totalLinks}. ${flagged} cas avec au moins un écart.`);
