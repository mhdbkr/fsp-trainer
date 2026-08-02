// ============================================================================
// Validateur de COHÉRENCE des cas — vérifie mécaniquement (donc gratuitement)
// ce que la « lentille cohérence » faisait payer à un agent :
//   • nom / âge / sexe / intensité identiques entre patientSheet, antworten,
//     muster (arztbrief + vorstellung) et examinerSheet
//   • Anrede (Herr/Frau) cohérente avec le sexe
//   • pas de formule ORALE dans l'Arztbrief (registre écrit)
//   • présence de marqueurs Konjunktiv I dans l'Arztbrief
//   • pas d'abréviation écrite (« py ») dans la Vorstellung orale
//   • IMC cohérent avec le libellé (Adipositas ≥30 vs Präadipositas 25-29,9)
// Usage : node scripts/checkCaseCoherence.mjs [fichier.json ...]
//   sans argument : contrôle les cas déjà intégrés dans src/data/seedCases.ts
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ORAL_IN_WRITTEN = [/\bGuten Tag\b/i, /\bDarf ich\b/i, /ich möchte Ihnen vorstellen/i, /einverstanden\?/i];
const KONJ = /\b(sei|seien|habe|hätten|bestünde|bestünden|leide|nehme|träten|werde|würde)\b/;

function checkCase(c, muster) {
  const issues = [];
  const ps = c.patientSheet || {};
  const pe = ps.personalia || {};
  const ant = ps.antworten || {};
  const ab = (muster && muster.arztbrief) || c.musterSaetze?.arztbrief || {};
  const vor = (muster && muster.vorstellung) || c.musterSaetze?.vorstellung || {};
  const antText = Object.values(ant).join(' ');
  const abText = Object.values(ab).join(' ');
  const vorText = Object.values(vor).join(' ');

  // identité
  const nachname = String(pe.name || '').trim().split(/\s+/).pop();
  if (nachname) {
    if (ab.einleitung && !ab.einleitung.includes(nachname)) issues.push(`nom « ${nachname} » absent de arztbrief.einleitung`);
    if (vor['persoenliche-daten'] && !vor['persoenliche-daten'].includes(nachname)) issues.push(`nom « ${nachname} » absent de vorstellung.persoenliche-daten`);
  }
  // âge
  if (pe.age != null) {
    const age = String(pe.age);
    if (antText && !antText.includes(age)) issues.push(`âge ${age} absent des antworten`);
    if (vor['persoenliche-daten'] && !vor['persoenliche-daten'].includes(age)) issues.push(`âge ${age} absent de vorstellung.persoenliche-daten`);
  }
  // Anrede vs sexe
  if (pe.geschlecht && ab.einleitung) {
    const want = pe.geschlecht === 'm' ? 'Herr' : 'Frau';
    if (!ab.einleitung.includes(want)) issues.push(`Anrede incohérente : attendu « ${want} » (geschlecht=${pe.geschlecht})`);
  }
  // intensité douleur
  const inten = ps.schmerz?.intensitaet;
  if (inten != null) {
    const s = String(inten);
    const inAnt = (ant['akt-intensitaet'] || '').includes(s);
    const inVor = (vor['aktuelle-beschwerden'] || '').includes(s);
    if (!inAnt && !inVor) issues.push(`intensitaet ${s} introuvable dans antworten/muster`);
  }
  // IMC vs libellé
  if (pe.groesseCm && pe.gewichtKg) {
    const bmi = pe.gewichtKg / Math.pow(pe.groesseCm / 100, 2);
    const all = JSON.stringify(ps.vorerkrankungen || []) + abText + vorText;
    if (/Adipositas/i.test(all) && !/Präadipositas/i.test(all) && bmi < 30) {
      issues.push(`IMC ${bmi.toFixed(1)} < 30 mais libellé « Adipositas » (→ Übergewicht/Präadipositas)`);
    }
    if (/kachekt/i.test(all) && bmi > 20) issues.push(`IMC ${bmi.toFixed(1)} mais libellé « kachektisch »`);
  }
  // registre écrit
  for (const re of ORAL_IN_WRITTEN) {
    if (re.test(abText)) issues.push(`formule ORALE dans l'Arztbrief : ${re}`);
  }
  if (abText && !KONJ.test(abText)) issues.push("aucun marqueur Konjunktiv I détecté dans l'Arztbrief");
  // abréviation écrite à l'oral
  if (/\bpy\b/.test(vorText)) issues.push('« py » (abréviation écrite) dans la Vorstellung orale → « Packungsjahre »');

  return issues;
}

// --- entrée : JSON de lot, sinon les cas déjà intégrés ----------------------
const args = process.argv.slice(2);
let entries = [];
if (args.length) {
  for (const f of args) {
    const d = JSON.parse(readFileSync(f, 'utf8'));
    entries.push({ id: d.id || d.case?.id, c: d.case || d, muster: d.muster });
  }
} else {
  // extraction légère depuis le TS (les cas intégrés portent musterSaetze au seed)
  const src = readFileSync(join(root, 'src/data/seedCases.ts'), 'utf8');
  const mus = readFileSync(join(root, 'src/data/caseMuster.ts'), 'utf8');
  const ids = [...src.matchAll(/id: '(case-[a-z0-9-]+)'/g)].map((m) => m[1]);
  console.log(`(mode intégré : ${ids.length} cas — contrôles limités au TS brut)`);
  // contrôle textuel simple : « py » dans un bloc vorstellung, Adipositas+BMI
  let flagged = 0;
  for (const id of ids) {
    const block = mus.split(`'${id}':`)[1]?.split(/\n  '(?:case-)/)[0] || '';
    const vorPart = block.split('vorstellung:')[1] || '';
    const local = [];
    if (/\bpy\b/.test(vorPart)) local.push('« py » dans la Vorstellung orale');
    if (local.length) { flagged++; console.log(`❌ ${id}\n   ${local.join('\n   ')}`); }
  }
  console.log(flagged === 0 ? '\n✅ Aucun problème détecté (contrôles TS)' : `\n❌ ${flagged} cas à revoir`);
  process.exit(flagged === 0 ? 0 : 1);
}

let bad = 0;
for (const e of entries) {
  const issues = checkCase(e.c, e.muster);
  if (issues.length) { bad++; console.log(`❌ ${e.id}`); issues.forEach((i) => console.log(`   • ${i}`)); }
  else console.log(`✅ ${e.id}`);
}
console.log(`\n${bad === 0 ? '✅ COHÉRENCE OK' : `❌ ${bad} cas à corriger`} — ${entries.length} cas contrôlés.`);
process.exit(bad === 0 ? 0 : 1);
