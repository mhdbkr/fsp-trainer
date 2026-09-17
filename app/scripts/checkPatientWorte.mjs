// ============================================================================
// Validateur de `medicalView.patientWorte` (FB2-J7) : la fin de l'entretien en
// langage patient. Chaque cas en a un (verdacht / diagnostik / therapie),
// chaque phrase est un COMPLÉMENT (pas de « Ich vermute, dass » redoublé),
// courte, et sans Fachbegriff latin/grec non expliqué (-itis, -ose, -om,
// -ämie, -pathie, -ektomie, -skopie, -graphie…) — liste blanche pour les mots
// passés dans la langue courante (Diagnose, Thrombose, Narkose, Arthrose…).
// Usage : node scripts/checkPatientWorte.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'data', 'seedCases.ts'), 'utf8');
const WHITE = new Set(['vom', 'wundrose', 'gürtelrose', 'syndrom', 'symptom', 'diagnose', 'prognose', 'thrombose', 'narkose', 'arthrose', 'osteoporose', 'tuberkulose', 'dosis', 'symptom', 'symptome', 'antibiotikum', 'antibiotika', 'infusion', 'operation', 'kortison', 'insulin', 'chemotherapie', 'strahlentherapie', 'physiotherapie', 'therapie', 'psychotherapie', 'hormontherapie', 'allergie', 'allergien', 'epilepsie', 'demenz', 'depression', 'depressionen', 'migräne', 'grippe', 'diabetes', 'asthma', 'rheuma', 'schuppenflechte', 'gicht', 'virus', 'viren', 'bakterien', 'ultraschall', 'röntgen', 'röntgenbild', 'computertomographie', 'kernspintomographie', 'katheter', 'herzkatheter', 'stent', 'bypass', 'dialyse', 'blutdruck', 'blutzucker', 'schilddrüse', 'prostata', 'nieren', 'leber', 'galle', 'blase', 'lunge', 'gehirn']);
const FACH = /\b\p{L}+(itis|ose|om|ome|ämie|pathie|ektomie|skopie|graphie|ismus|iose|logie|zytose|penie|plasie|trophie|lyse|stase|ämie)\b/giu;
const PREFIX = /^(ich vermute, dass|um das abzuklären,?|je nach ergebnis|wenn sich der verdacht bestätigt,?)\s*/i;

const idx = [...src.matchAll(/\n\s+id: 'case-/g)].map((m) => m.index); idx.push(src.length);
const problems = []; let n = 0;
for (let i = 0; i < idx.length - 1; i++) {
  const b = src.slice(idx[i], idx[i + 1]); const id = b.match(/id: '(case-[^']+)'/)[1]; n++;
  const m = b.match(/patientWorte:\s*\{\s*verdacht:\s*'((?:[^'\\]|\\.)*)',\s*diagnostik:\s*'((?:[^'\\]|\\.)*)',\s*therapie:\s*'((?:[^'\\]|\\.)*)'\s*\}/);
  if (!m) { problems.push(`${id} — patientWorte absent`); continue; }
  for (const [k, t] of [['verdacht', m[1]], ['diagnostik', m[2]], ['therapie', m[3]]]) {
    if (PREFIX.test(t)) problems.push(`${id}.${k} — redouble la tournure fixe : « ${t.slice(0, 50)} »`);
    const words = t.split(/\s+/).length;
    if (words < 4 || words > 32) problems.push(`${id}.${k} — ${words} mots (4–32 attendus)`);
    if (/[—()]/.test(t)) problems.push(`${id}.${k} — tiret cadratin ou parenthèse`);
    // Un Fachbegriff EXPLIQUÉ passe : « eine sogenannte rheumatoide Arthritis », « eine Gürtelrose, also … ».
    const explained = (f) => new RegExp(`sogenannte\\w*\\s+(\\w+\\s+){0,2}${f}|${f}[^.]{0,3},\\s*(also|das heißt|eine Art)|(bezeichnet wird|nennt man|nennt|genannt)[^.]{0,12}${f}|${f}[^.]{0,20}(bezeichnet wird|nennt)`, 'i').test(t);
    for (const f of t.matchAll(FACH)) if (!WHITE.has(f[0].toLowerCase()) && !explained(f[0])) problems.push(`${id}.${k} — Fachbegriff « ${f[0]} » : « ${t.slice(0, 60)} »`);
  }
}
if (problems.length) {
  console.log(`❌ ${problems.length} problème(s) sur patientWorte (${n} cas) :\n`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log(`✅ PATIENTWORTE COMPLETS — ${n} cas : soupçon, examens, suite en langage patient.`);
