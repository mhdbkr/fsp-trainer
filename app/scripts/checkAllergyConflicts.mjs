// ============================================================================
// Validateur ALLERGIE ↔ THÉRAPIE : un cas ne doit pas proposer au patient un
// médicament auquel il se déclare allergique.
//
// Trouvé par la revue clinique globale (11 sept. 2026) : Ulcus proposait du
// Metamizol à un patient allergique au Metamizol ; Divertikulitis proposait
// Amoxicillin/Clavulansäure puis Piperacillin à une patiente dont la persona
// était conçue pour signaler son allergie à la pénicilline. Trois des douze
// bloquants. Un script le voit.
//
// Heuristique volontairement simple : familles d'allergènes fréquentes et
// leurs membres. Un médicament cité dans une section thérapeutique avec une
// mention explicite de contre-indication (« kontraindiziert », « nicht bei »,
// « wegen der Allergie », « Alternative ») est accepté : le texte l'enseigne.
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'src', 'data', 'seedCases.ts'), 'utf8');

// allergène déclaré (regex sur patientSheet.allergien) → médicaments interdits
const FAMILIES = [
  { name: 'Penicillin', allergy: /penicillin|amoxicillin|ampicillin|β-?laktam|beta-?laktam/i,
    drugs: /\b(amoxicillin|ampicillin|piperacillin|penicillin\s?[gv]?|flucloxacillin|benzathin-?penicillin|tazobactam|sulbactam|clavulans)/i },
  { name: 'Metamizol', allergy: /metamizol|novalgin|novaminsulfon/i, drugs: /\b(metamizol|novalgin|novaminsulfon)\b/i },
  { name: 'ASS/NSAR', allergy: /\b(ass|acetylsalicyls|aspirin|nsar|ibuprofen|diclofenac|analgetika-?intoleranz)/i,
    drugs: /\b(ibuprofen|diclofenac|naproxen|acetylsalicyls|\bass\s?\d|aspirin|indometacin|ketoprofen)\b/i },
  { name: 'Sulfonamid', allergy: /sulfonamid|cotrimoxazol|sulfamethoxazol/i, drugs: /\b(cotrimoxazol|sulfamethoxazol|sulfasalazin)\b/i },
  { name: 'Kontrastmittel', allergy: /kontrastmittel|jod/i, drugs: /\b(jodhaltig\w* kontrastmittel|kontrastmittel-?ct\b)/i },
  { name: 'Makrolid', allergy: /makrolid|erythromycin|clarithromycin|azithromycin/i, drugs: /\b(erythromycin|clarithromycin|azithromycin)\b/i },
  { name: 'Cephalosporin', allergy: /cephalosporin|cefuroxim|ceftriaxon/i, drugs: /\b(cef\w+)\b/i },
  { name: 'Opioid', allergy: /\b(morphin|opioid|tramadol|codein)\b/i, drugs: /\b(morphin|tramadol|tilidin|oxycodon|hydromorphon|fentanyl|codein)\b/i },
];
// Deux niveaux d'enseignement. Un mot FORT disculpe l'item entier : il nomme
// l'allergie, une contre-indication, un remplacement (« Meropenem statt
// Piperacillin », « Allergiepass mit Eintrag: Penicillin »). Un mot FAIBLE
// (absetzen, meiden, pausieren) ne disculpe que le médicament qu'il touche
// directement : « NSAR absetzen … auf Metamizol umstellen » arrête les NSAR,
// il PROPOSE le Metamizol.
const STRONG = /allergi|unverträglich|kontraindi|\bstatt(dessen)?\b|\bohne\b|ausweich|alternativ|verbot|\bcave\b|\bkein(e|en|em)?\s+\w*(metamizol|penicillin|amoxicillin|ampicillin|ass\b|nsar|ibuprofen|diclofenac)|nicht (bei|mit|geben|verordn|anwend)|tabu|vermeid/i;
const WEAK = /absetzen|abzusetzen|meiden|pausier|karenz|verzicht|weglassen|-?reaktion|kreuzreak/i;

function splitBy(s, re) {
  const idx = [...s.matchAll(re)].map((m) => m.index); idx.push(s.length);
  const out = []; for (let i = 0; i < idx.length - 1; i++) out.push(s.slice(idx[i], idx[i + 1])); return out;
}
const field = (b, key) => (b.match(new RegExp(`\\b${key}: '([^']+)'`)) || [])[1];
const strings = (block) => [...block.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);

let n = 0; const problems = [];
for (const b of splitBy(src, /\n\s+id: 'case-/g)) {
  n++;
  const id = field(b, 'id');
  const allergiesBlock = (b.match(/allergien: \[([^\]]*)\]/) || [, ''])[1];
  // Une allergie NIÉE n'en est pas une : « keine Penicillinallergie — Penicillin
  // wurde als Kind gut vertragen » ne doit pas déclencher la famille Penicillin.
  const allergies = strings(allergiesBlock)
    .filter((a) => !/^\s*(keine?|nichts|nein|nicht)\b/i.test(a))
    .map((a) => a.replace(/\b(keine?|nicht)\b[^,;|.—]*/gi, ''))
    .join(' | ');
  if (!allergies.trim()) continue;
  const therapieBlock = (b.match(/\btherapie: \[\n([\s\S]*?)\n\s{8}\]/) || [, ''])[1];
  const erst = (b.match(/erstmassnahmen: \[([^\]]*)\]/) || [, ''])[1];
  const items = [...strings(therapieBlock), ...strings(erst)].filter((s) => !/^label:/.test(s));
  for (const fam of FAMILIES) {
    if (!fam.allergy.test(allergies)) continue;
    for (const it of items) {
      // Le mot d'enseignement doit se trouver PRÈS du médicament : « NSAR absetzen
      // … auf Metamizol umstellen » enseigne l'arrêt des NSAR, pas celui du Metamizol.
      const re = new RegExp(fam.drugs.source, 'gi');
      let m; let conflict = false;
      while ((m = re.exec(it))) {
        if (STRONG.test(it)) break;
        const near = it.slice(Math.max(0, m.index - 28), m.index + m[0].length + 22);
        if (!WEAK.test(near)) { conflict = m[0]; break; }
      }
      if (conflict) {
        problems.push(`${id} — allergie « ${allergies.slice(0, 60)} » (${fam.name}, mot « ${conflict} ») mais la thérapie propose :\n       « ${it.slice(0, 140)} »`);
      }
    }
  }
}
if (problems.length) {
  console.log(`❌ ${problems.length} conflit(s) allergie ↔ thérapie :\n`);
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
console.log(`✅ AUCUN CONFLIT ALLERGIE ↔ THÉRAPIE — ${n} cas.`);
