// app/scripts/findNonMedicalDefs.mjs
// Liste les entrées du glossaire dont `def` (ou `s`) semble prendre un sens
// non médical du mot (ex. « Synkope » en linguistique, « Index » = Zeigefinger).
// Heuristique de tri pour relecture clinique, pas un validateur CI.
// ponytail: listes de mots à la main ; les enrichir au fil des faux négatifs.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Étiquette de domaine en tête de def (« Linguistik: … ») sans mention médicale.
const MEDICAL_LABEL = /medizin|anatom|physiolog|patholog|psychiat|chirurg|gynäkolog|krankheit|pharma|biochem/i;
// Mots trahissant un autre sens, où qu'ils soient dans def ou s.
const OFF_SENSE = /linguist|sprachwiss|grammatik|vokal|konsonant|silbe|musik|mathemat|wirtschaft|betriebs|informatik|botanik|zoolog|geolog|astronom|philosoph|theolog|militär|rechtswes|juristisch|statistik|börse|finger/i;

export function reasons(e) {
  const out = [];
  const label = (e.def || '').match(/^([^:]{1,60}):/)?.[1];
  if (label && !MEDICAL_LABEL.test(label)) out.push(`étiquette « ${label} »`);
  for (const k of ['def', 's']) {
    const m = (e[k] || '').match(OFF_SENSE);
    if (m) out.push(`${k} ∋ « ${m[0]} »`);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fb = JSON.parse(readFileSync(new URL('../src/data/fachbegriffe.json', import.meta.url), 'utf8'));
  const hits = fb.map((e) => [e, reasons(e)]).filter(([, r]) => r.length);
  for (const [e, r] of hits) console.log(`${e.id}\t${r.join(' ; ')}\n  s: ${e.s ?? '—'}\n  def: ${e.def ?? '—'}`);
  console.log(`\n${hits.length} candidat(s) sur ${fb.length}`);
}
