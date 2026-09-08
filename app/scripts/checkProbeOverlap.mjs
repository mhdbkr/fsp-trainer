// ============================================================================
// Détecteur de DOUBLONS entre l'anamnèse générale et les Fachanamnesen (FB-A2).
// ----------------------------------------------------------------------------
// Le retour d'usage était : « des questions se répètent entre chapitres ». On ne
// veut pas les supprimer — une question Fach ajoute presque toujours un axe
// clinique décisif — mais elles doivent être MARQUÉES pour que le guide le
// signale (`deepens` = approfondit, `redundant` = vrai doublon).
//
// Ce script échoue si une sonde Fach recouvre nettement une sonde générale
// SANS porter l'un de ces deux marqueurs : c'est alors une répétition muette,
// exactement ce que le candidat subissait.
// Usage : node scripts/checkProbeOverlap.mjs
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/data/guides/anamneseProbes.ts'), 'utf8');

// Chaque entrée : id, frage, et les marqueurs éventuels (sur la même accolade).
const probes = [...src.matchAll(/\{\s*id:\s*'([a-z0-9-]+)'[^}]*?frage:\s*'((?:[^'\\]|\\.)*)'([^}]*)\}/g)]
  .map(([, id, frage, tail]) => ({
    id,
    frage: frage.replace(/\\'/g, "'"),
    marked: /deepens:|redundant:/.test(tail),
  }));

const STOP = new Set(['sie','haben','ist','sind','das','der','die','und','oder','bei','ein','eine','einen','wie','was','wann','wo','seit','auch','mit','ihre','ihren','ihrem','ihr','es','nicht','sich','im','in','von','zu','den','dem','des','für','auf','schon','einmal','mal','noch','sonst','als','dass','wenn','man','wird','werden','etwas','wieder','nach','vor','über','unter','aus','an','am','zum','zur']);
const bag = (s) => new Set(
  s.toLowerCase().replace(/[^a-zäöüß\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w)),
);
const jaccard = (a, b) => {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
};

const base = probes.filter((p) => !p.id.startsWith('fach-') && !p.id.startsWith('frau-'));
const fach = probes.filter((p) => p.id.startsWith('fach-'));
// 0.28 : assez bas pour attraper une question Fach qui REPREND la phrase
// d'ouverture d'une question générale (cas fach-infekt-reise ↔ veg-fieber),
// assez haut pour ne pas signaler une simple parenté de vocabulaire médical.
const SEUIL = 0.28;

const muets = [];
for (const f of fach) {
  if (f.marked) continue;
  const fb = bag(f.frage);
  let best = { score: 0, id_base: null };
  for (const b of base) {
    const s = jaccard(fb, bag(b.frage));
    if (s > best.score) best = { score: s, id_base: b.id };
  }
  if (best.score >= SEUIL) muets.push({ ...f, ...best });
}

console.log(`${probes.length} sondes · ${base.length} générales · ${fach.length} Fach · ${fach.filter((f) => f.marked).length} marquées (deepens/redundant).`);

if (muets.length) {
  console.log('\nRépétitions NON marquées — ajouter `deepens:` (approfondit) ou `redundant:` (vrai doublon) :');
  for (const m of muets) {
    console.log(`  ❌ ${m.id}`);
    console.log(`     recouvre « ${m.id_base} » (recouvrement ${Math.round(m.score * 100)} %)`);
  }
}
console.log(`\n${muets.length === 0
  ? '✅ AUCUNE RÉPÉTITION MUETTE — toute question Fach qui recouvre une question générale est marquée.'
  : `❌ ${muets.length} répétition(s) non marquée(s).`}`);
process.exit(muets.length === 0 ? 0 : 1);
