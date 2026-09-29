// Invariant CI (bloquant, F4a §3.1) : chaque cas a ≥ 8 Fachbegriffe liés,
// aucun id orphelin ni générique, au plus 10 termes liés à > 20 % des cas, le
// terme du diagnostic lié quand il existe dans le glossaire (exceptions listées),
// JSON à jour. Retour direction n°1 : chaque terme du top 10 figure dans le
// texte du cas lui-même (fiche patient hors exclus, vue médicale ou Muster
// hors DD, ou diagnostic) ; aucun terme gynécologique/obstétrical dans un cas masculin ni
// andrologique dans un cas féminin (src/data/sexSpecificTerms.json : radicaux
// SEX_STEMS sur terme + Bedeutung + définition du glossaire, exclusions relues).
// Informatif : cas < 15 termes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { labelVariants } from './linkCaseTerms.mjs';

/** Cas dont le diagnostic n'a pas de terme dans le glossaire. Les 5 premiers :
 *  mesurés par la spec F4a §3.1 (bandscheibenvorfall en est sorti : alias
 *  Diskusprolaps, src/data/diagnosisAliases.json). Les 3 suivants : leur diagnostic ne contenait
 *  QUE des mots d'examen (akut, chronisch, anamnestisch — genericTerms.json) ;
 *  Aortendissektion, Posttraumatische Belastungsstörung et
 *  Alkoholentzugssyndrom n'existent pas dans le glossaire (question ouverte :
 *  les ajouter au glossaire retirerait ces exceptions). */
export const DIAGNOSIS_EXCEPTIONS = [
  'case-gerd', 'case-oesophaguskarzinom', 'case-magenkarzinom', 'case-tvt', 'case-opioidabhaengigkeit',
  'case-aortendissektion', 'case-ptbs', 'case-alkoholentzug',
  // Retour direction n°1 : son seul « terme de diagnostic » était « überall » (nom du cas « Schmerzen
  // überall »), homonyme du quotidien désormais non liable ; « somatoform » n'est pas dans le glossaire.
  'case-somatoforme-schmerzstoerung',
];

/** Cas sous le minimum, assumés (décision contrôleur, 29 sept.) : leur texte propre est court et
 *  les combler par la fiche Fachwissen ou les DD reproduirait le bruit du retour direction n°1. */
export const MIN_TERMS_EXCEPTIONS = { 'case-bandscheibenvorfall': 6, 'case-depression': 7 };

/** Radicaux des termes sexués, cherchés dans « terme | Bedeutung | définition » du glossaire. */
export const SEX_STEMS = {
  w: /gynäk|frauenheilk|geburtsh|schwanger|gravid|uterus|gebärmutter|ovar|eierstock|eileiter|adnex|endometri|zervix|cervix|vagina|scheide|vulva|menstru|regelblutung|menarche|menopaus|klimakter|mamma|brustdrüse|weibliche brust|stillen|laktation|plazent|fötus|fetus|embryo|geburt|wochenbett|entbind|abort|fehlgeburt|kaiserschnitt|sectio|hysterekt|präeklam|eklampsie|ovulation|kontrazep|antikonzep/iu,
  m: /androl|prostat|hoden|skrot|penis|(?<!\p{L})eichel|balan|erekti|sperma|samen|nebenhoden|orchi|epididym|hydrozele|varikozele|phimose|vasektomie/iu,
};
export const sexStemHits = (fb, re) => fb.filter((r) => re.test(`${r.t} | ${r.s} | ${r.def ?? ''}`)).map((r) => r.id);

/** Règles pures. `diagnosis` : caseId → ids du diagnostic (génériques déjà retirés).
 *  `own` : caseId → Set des ids présents dans le texte du cas lui-même (porte du top `top`).
 *  `sex` : caseId → 'm' | 'w' ; `sexTerms` : { w: Set, m: Set }. */
/** Porte indépendante de l'index de liaison (retour direction : « Hypertonie/Hypertonus » lié à 0 cas) :
 *  caseId → ids du glossaire dont une variante de libellé (labelVariants, exclusions relues comprises)
 *  figure en mot entier dans la pathologie ou le nom du cas. L'égalité stricte ne se déclencherait
 *  jamais (« Arterielle Hypertonie (hypertensive Entgleisung) » ≠ « Hypertonie ») : même règle de mot
 *  entier que la liaison. Un libellé exact prime sur une variante ; entre variantes, l'ordre du glossaire. */
export function diagnosisVariantTerms(cases, fb, generic) {
  const owner = new Map();
  for (const r of fb) if (!owner.has(r.t.trim().toLowerCase())) owner.set(r.t.trim().toLowerCase(), r.id);
  for (const r of fb) for (const v of labelVariants(r.t)) if (!owner.has(v.toLowerCase())) owner.set(v.toLowerCase(), r.id);
  const res = [...owner].filter(([k, id]) => k.length >= 4 && !generic.has(id))
    .map(([k, id]) => [new RegExp(`(?<![\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:e|en|s|n)?(?![\\p{L}\\p{N}])`, 'giu'), id]);
  return Object.fromEntries(cases.map((c) => {
    const text = `${c.pathology ?? ''} | ${c.name ?? ''}`;
    const hits = res.flatMap(([re, id]) => [...text.matchAll(re)].map((m) => ({ id, a: m.index, b: m.index + m[0].length })));
    // un mot inclus dans un terme plus long (« Claudicatio » dans « Claudicatio intermittens ») : c'est le long qui nomme le diagnostic
    const kept = hits.filter((h) => !hits.some((o) => o !== h && o.a <= h.a && o.b >= h.b && o.b - o.a > h.b - h.a));
    return [c.id, [...new Set(kept.map((h) => h.id))].sort()];
  }));
}

export function checkLinks({ links, knownIds, generic, diagnosis, exceptions = DIAGNOSIS_EXCEPTIONS, minPerCase = 8, minExceptions = MIN_TERMS_EXCEPTIONS, share = 0.2, maxBroad = 10, own, top = 10, sex, sexTerms, required = {} }) {
  const errors = []; const infos = [];
  const n = Object.keys(links).length;
  for (const [caseId, ids] of Object.entries(links)) {
    const min = Math.min(minPerCase, minExceptions[caseId] ?? minPerCase);
    if (ids.length < min) errors.push(`${caseId} : ${ids.length} termes (< ${min})`);
    else if (ids.length < 15) infos.push(`${caseId} : ${ids.length} termes (< 15)`);
    for (const t of ids) {
      if (!knownIds.has(t)) errors.push(`${caseId} : terme inconnu ${t}`);
      if (generic.has(t)) errors.push(`${caseId} : mot d'examen lié ${t}`);
    }
    const diag = diagnosis[caseId] ?? [];
    if (!diag.length && !exceptions.includes(caseId)) errors.push(`${caseId} : aucun terme de diagnostic dans le glossaire (hors exceptions)`);
    if (diag.length && exceptions.includes(caseId)) infos.push(`${caseId} : exception obsolète (diagnostic ${diag.join(', ')})`);
    for (const d of diag) if (!ids.includes(d)) errors.push(`${caseId} : terme du diagnostic non lié ${d}`);
    if (!exceptions.includes(caseId)) for (const d of required[caseId] ?? []) if (!diag.includes(d) && !ids.includes(d)) errors.push(`${caseId} : terme du diagnostic (variante de libellé) non lié ${d}`);
    if (own?.[caseId]) for (const t of ids.slice(0, top)) if (!own[caseId].has(t)) errors.push(`${caseId} : ${t} au top ${top} sans figurer dans le cas (fiche patient, vue médicale ou Muster hors DD)`);
    if (sex?.[caseId] === 'm') for (const t of ids) if (sexTerms.w.has(t)) errors.push(`${caseId} : terme gynécologique/obstétrical lié à un cas masculin ${t}`);
    if (sex?.[caseId] === 'w') for (const t of ids) if (sexTerms.m.has(t)) errors.push(`${caseId} : terme andrologique lié à un cas féminin ${t}`);
  }
  const byTerm = new Map(); for (const ids of Object.values(links)) for (const t of ids) byTerm.set(t, (byTerm.get(t) ?? 0) + 1);
  const broad = [...byTerm].filter(([, k]) => k > n * share).sort((a, b) => b[1] - a[1]);
  if (broad.length > maxBroad) errors.push(`${broad.length} termes liés à > ${share * 100} % des cas (max ${maxBroad}) : ${broad.slice(0, 20).map(([t, k]) => `${t}(${k})`).join(', ')}`);
  else if (broad.length) infos.push(`termes liés à > ${share * 100} % des cas : ${broad.map(([t, k]) => `${t}(${k})`).join(', ')}`);
  return { errors, infos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const { glossaryIndexes, linkTerms, caseDiagnosis, ownTexts, loadGeneric } = await import('./linkCaseTerms.mjs');
  const { loadAll } = await import('./loadCases.mjs');
  const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8'));
  const generic = loadGeneric();
  const { index, diagIndex } = glossaryIndexes(fb.map((r) => ({ id: r.id, term: r.t })));
  const { cases } = await loadAll();
  const diagnosis = Object.fromEntries(cases.map((c) => [c.id, caseDiagnosis(c, { index, diagIndex, generic })]));
  const required = diagnosisVariantTerms(cases, fb, generic);
  const own = Object.fromEntries(cases.map((c) => [c.id, new Set([...linkTerms(ownTexts(c, { withMuster: true }), index, { negation: true }), ...diagnosis[c.id]])]));
  const sex = Object.fromEntries(cases.map((c) => [c.id, c.patientSheet?.personalia?.geschlecht]));
  const sexList = JSON.parse(readFileSync(join(here, '../src/data/sexSpecificTerms.json'), 'utf8'));
  const sexTerms = { w: new Set(sexList.w), m: new Set(sexList.m) };
  const { errors, infos } = checkLinks({ links, knownIds: new Set(fb.map((r) => r.id)), generic, diagnosis, own, sex, sexTerms, required });
  for (const i of infos) console.log(`ℹ ${i}`);
  for (const e of errors) console.error(`✗ ${e}`);
  let stale = 0;
  try { execFileSync('node', [join(here, 'linkCaseTerms.mjs'), '--check'], { stdio: 'inherit' }); } catch { stale = 1; }
  if (errors.length + stale) { console.error(`❌ ${errors.length + stale} manquement(s)`); process.exit(1); }
  console.log(`✓ ${Object.keys(links).length} cas, liaison par texte valide`);
}
