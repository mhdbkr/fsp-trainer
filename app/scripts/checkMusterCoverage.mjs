// ============================================================================
// Validateur de couverture des MUSTER (phrases-modèles « Pour ce cas »).
// Vérifie que CHAQUE cas fournit une phrase authorée pour TOUS les chapitres de
// contenu des deux guides :
//   • Arztbrief (écrit)     : 9 chapitres
//   • Fallvorstellung (oral): 12 chapitres (+ frauenanamnese si patiente)
// Contrôle aussi la cohérence : le nom du patient figure dans les phrases
// d'ouverture (einleitung / persoenliche-daten). 0 trou toléré.
// Usage : node scripts/checkMusterCoverage.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const musterSrc = readFileSync(join(root, 'src/data/caseMuster.ts'), 'utf8');
const casesSrc = readFileSync(join(root, 'src/data/seedCases.ts'), 'utf8');

const ARZTBRIEF_REQ = ['einleitung', 'patientenzustand', 'aktuelle-beschwerden', 'vorerkrankungen', 'medikation', 'allergien-noxen', 'familie-sozial', 'diagnose', 'diagnostik-therapie'];
const VORSTELLUNG_REQ = ['persoenliche-daten', 'allgemeinzustand', 'aktuelle-beschwerden', 'allergien', 'rauchen', 'alkohol', 'drogen', 'sozialanamnese', 'familienanamnese', 'vorerkrankungen', 'medikation', 'diagnostik-procedere'];

// --- 1) Cas connus (id, sexe, nom) depuis seedCases -------------------------
const caseChunks = casesSrc.split(/\n {4}\{\n {6}id: 'case-/).slice(1);
const cases = caseChunks.map((raw) => {
  const chunk = 'id: \'case-' + raw;
  return {
    id: 'case-' + raw.match(/^([a-z0-9-]+)'/)[1],
    weiblich: /geschlecht:\s*'w'/.test(chunk),
    surname: (chunk.match(/personalia:\s*\{\s*name:\s*'[^']*\s([^'\s]+)'/) || [])[1] || '',
  };
});

// --- 2) Muster par cas : extrait les clés de chaque bloc --------------------
const keysOf = (block) => new Set([...block.matchAll(/(?:'([a-z0-9-]+)'|\b([a-z]+)):\s*'/g)].map((m) => m[1] || m[2]));
const musterBlocks = musterSrc.split(/\n {2}'(case-[a-z0-9-]+)':\s*\{/);
const muster = {}; // id → { arztbrief:Set, vorstellung:Set, ab:string, vor:string }
for (let i = 1; i < musterBlocks.length; i += 2) {
  const id = musterBlocks[i];
  const body = musterBlocks[i + 1];
  const abBlock = (body.match(/arztbrief:\s*\{([\s\S]*?)\n {4}\},/) || [])[1] || '';
  const vorBlock = (body.match(/vorstellung:\s*\{([\s\S]*?)\n {4}\},/) || [])[1] || '';
  muster[id] = { arztbrief: keysOf(abBlock), vorstellung: keysOf(vorBlock), abBlock, vorBlock };
}

// --- 3) Vérification --------------------------------------------------------
let failures = 0;
for (const c of cases) {
  const m = muster[c.id];
  const problems = [];
  if (!m) {
    problems.push('AUCUN Muster pour ce cas');
  } else {
    const needVor = [...VORSTELLUNG_REQ, ...(c.weiblich ? ['frauenanamnese'] : [])];
    const missAB = ARZTBRIEF_REQ.filter((k) => !m.arztbrief.has(k));
    const missVor = needVor.filter((k) => !m.vorstellung.has(k));
    if (missAB.length) problems.push(`Arztbrief manque : ${missAB.join(', ')}`);
    if (missVor.length) problems.push(`Fallvorstellung manque : ${missVor.join(', ')}`);
    // Cohérence : le nom figure dans les phrases d'ouverture.
    if (c.surname && m.abBlock && !m.abBlock.includes(c.surname)) problems.push(`nom « ${c.surname} » absent de l'Arztbrief`);
    if (c.surname && m.vorBlock && !m.vorBlock.includes(c.surname)) problems.push(`nom « ${c.surname} » absent de la Fallvorstellung`);
  }
  const ok = problems.length === 0;
  if (!ok) failures++;
  const have = m ? `${m.arztbrief.size}+${m.vorstellung.size}` : '0';
  console.log(`${ok ? '✅' : '❌'} ${c.id.padEnd(26)} [${c.weiblich ? '♀' : '♂'}]  ${have} phrases`);
  problems.forEach((p) => console.log(`   ${p}`));
}
console.log(`\n${failures === 0 ? '✅ COUVERTURE MUSTER COMPLÈTE' : `❌ ${failures} cas incomplet(s)`} — ${cases.length} cas · ${ARZTBRIEF_REQ.length} chap. Arztbrief + ${VORSTELLUNG_REQ.length} chap. Fallvorstellung.`);
process.exit(failures === 0 ? 0 : 1);
