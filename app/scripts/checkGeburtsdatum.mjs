// ============================================================================
// Garde de la DATE DE NAISSANCE — l'âge est la valeur de référence (tissé dans
// les répliques, la Vorstellung, l'Arztbrief, les seuils de dépistage) ; la date
// de naissance doit en découler et être la même partout où elle apparaît :
//   • personalia.geburtsdatum : présent, au format JJ.MM.AAAA, date valide ;
//   • âge = année de REFERENZDATUM − année de naissance, moins 1 si
//     l'anniversaire n'est pas encore passé à REFERENZDATUM ;
//   • réplique `pers-alter` : « geboren am 1. März 1962 » (jour en chiffres ou
//     ordinal en lettres, année en chiffres ou en lettres) = la même date ;
//   • arztbrief.einleitung : « geboren am 01.03.1962 » = la même date.
// Usage : node scripts/checkGeburtsdatum.mjs   (code de sortie 1 si écart)
// ============================================================================
import { pathToFileURL } from 'node:url';

/** Le « jour » où les cas se jouent. UNIQUE source de l'année de naissance :
 *  la décaler d'un an décale l'année de naissance des 130 cas (les âges, eux,
 *  ne bougent pas). */
export const REFERENZDATUM = '2026-10-07';

/** Répliques qui ne donnent volontairement pas la date complète — trait
 *  clinique, pas oubli. La date reste exigée au champ et dans l'Arztbrief. */
export const REPLIQUE_SANS_DATE = {
  'case-demenz': 'le patient dément ne retrouve pas son année de naissance (« das müsste ich zu Hause nachschauen »)',
  // Le patient confus ne sait pas son âge, la fille le corrige ; la réplique
  // est déjà au plafond O3 du prompt externe (12 000 signes).
  'case-delir': 'le patient délirant ignore son âge ; réplique au plafond O3 du prompt externe',
};

const MONATE = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
const UNITS = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
function zahlwort(n) {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const u = n % 10;
  return (u ? UNITS[u] + 'und' : '') + TENS[Math.floor(n / 10)];
}
function ordinalwort(n) { // au datif : « am zwölften »
  const irr = { 1: 'ersten', 3: 'dritten', 7: 'siebten', 8: 'achten' };
  if (irr[n]) return irr[n];
  return n < 20 ? zahlwort(n) + 'ten' : zahlwort(n) + 'sten';
}
const TAG_WORT = new Map(Array.from({ length: 31 }, (_, i) => [ordinalwort(i + 1), i + 1]));
const JAHR_WORT = new Map();
for (let y = 1900; y <= 2030; y++) {
  const r = y % 100;
  JAHR_WORT.set((y < 2000 ? 'neunzehnhundert' : 'zweitausend') + (r ? zahlwort(r) : ''), y);
}

function gueltig(t, m, j) {
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
}
const iso = ({ t, m, j }) => `${j}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;

/** « 01.03.1962 » → { t, m, j } ; null si format ou date invalide. */
export function parseFeld(s) {
  const r = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s ?? ''));
  if (!r) return null;
  const [t, m, j] = [Number(r[1]), Number(r[2]), Number(r[3])];
  return gueltig(t, m, j) ? { t, m, j } : null;
}

/** Toutes les dates « geboren am … » d'une réplique parlée. */
export function parseReplik(text) {
  const out = [];
  const re = new RegExp(`geboren am\\s+(\\d{1,2}\\.|[a-zäöüß]+)\\s+(${MONATE.join('|')})\\s+(\\d{4}|[a-zäöüß]+)`, 'gi');
  for (const r of String(text ?? '').matchAll(re)) {
    const tagRoh = r[1].toLowerCase();
    const t = tagRoh.endsWith('.') ? Number(tagRoh.slice(0, -1)) : TAG_WORT.get(tagRoh);
    const m = MONATE.indexOf(r[2].toLowerCase()) + 1;
    const j = /^\d{4}$/.test(r[3]) ? Number(r[3]) : JAHR_WORT.get(r[3].toLowerCase());
    out.push(t && j && gueltig(t, m, j) ? { t, m, j } : { roh: r[0] });
  }
  return out;
}

/** Toutes les dates « geboren am JJ.MM.AAAA » d'un texte écrit. */
export function parseBrief(text) {
  return [...String(text ?? '').matchAll(/geboren am (\d{2}\.\d{2}\.\d{4})/g)].map((r) => parseFeld(r[1]) || { roh: r[0] });
}

/** Âge révolu à une date ISO (AAAA-MM-JJ). */
export function alterAm(geb, referenz = REFERENZDATUM) {
  const [j, m, t] = referenz.split('-').map(Number);
  return j - geb.j - (m < geb.m || (m === geb.m && t < geb.t) ? 1 : 0);
}

/** Écarts d'un cas (objet de seedCases, Muster rattaché en musterSaetze). */
export function checkCase(c, referenz = REFERENZDATUM) {
  const issues = [];
  const pe = c.patientSheet?.personalia || {};
  const geb = parseFeld(pe.geburtsdatum);
  if (!geb) return [`personalia.geburtsdatum absent ou invalide (« ${pe.geburtsdatum ?? ''} », attendu JJ.MM.AAAA)`];
  const soll = iso(geb);
  const alter = alterAm(geb, referenz);
  if (alter !== pe.age) issues.push(`âge ${pe.age} ≠ ${alter} ans au ${referenz} pour une naissance le ${pe.geburtsdatum}`);

  const replik = parseReplik(c.patientSheet?.antworten?.['pers-alter']);
  if (!replik.length && !REPLIQUE_SANS_DATE[c.id]) issues.push('réplique pers-alter sans « geboren am … »');
  for (const d of replik) if (d.roh || iso(d) !== soll) issues.push(`réplique pers-alter : « ${d.roh || iso(d)} » ≠ ${pe.geburtsdatum}`);

  const brief = parseBrief(c.musterSaetze?.arztbrief?.einleitung);
  if (!brief.length) issues.push('arztbrief.einleitung sans « geboren am JJ.MM.AAAA »');
  for (const d of brief) if (d.roh || iso(d) !== soll) issues.push(`arztbrief.einleitung : « ${d.roh || iso(d)} » ≠ ${pe.geburtsdatum}`);

  // Le cas se joue à REFERENZDATUM : une date de consultation figée (souvent
  // celle du protocole d'examen source) vieillit l'âge de la fiche. Seule la
  // date de naissance est admise dans les Muster. (Les dates de protocole de
  // `pruefungsfallen` et de l'examinerSheet sont légitimes et non contrôlées.)
  for (const sec of ['arztbrief', 'vorstellung']) {
    for (const [k, v] of Object.entries(c.musterSaetze?.[sec] || {})) {
      for (const r of String(v).matchAll(/\b\d{1,2}\.\s?\d{1,2}\.\s?(?:19|20)\d\d\b/g)) {
        if (!/geboren am $/.test(String(v).slice(0, r.index))) issues.push(`${sec}.${k} : date calendaire « ${r[0]} » (seule la date de naissance est admise)`);
      }
    }
  }
  return issues;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { loadAll } = await import('./loadCases.mjs');
  const { cases } = await loadAll();
  let bad = 0;
  for (const c of cases) {
    const issues = checkCase(c);
    if (issues.length) { bad++; console.log(`❌ ${c.id}`); issues.forEach((i) => console.log(`   • ${i}`)); }
  }
  console.log(`\n${bad === 0 ? '✅ GEBURTSDATUM OK' : `❌ ${bad} cas à corriger`} — ${cases.length} cas contrôlés au ${REFERENZDATUM}.`);
  process.exit(bad === 0 ? 0 : 1);
}
