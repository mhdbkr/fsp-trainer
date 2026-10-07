// ============================================================================
// PLANCHER DES QUESTIONS D'EXAMEN (revue direction Lc4, I6 ; lot S3 « Fachwissen au plancher »).
//
// Lc4 avait coupé fw-myokardinfarkt à 3 questions d'examen et retiré l'explication au
// patient de six Fachwissen : la couche la plus propre à la FSP. Ce script l'empêche :
//   1. STRICT : chaque Fachwissen a au moins MIN_ASKED `askedInExam` ;
//   2. BUDGET : le nombre de Fachwissen sans question d'explication au patient
//      (une des EXPLICATIONS) ne remonte pas au-dessus de fixtures/fachwissen-floor-budget.json ;
//   3. BUDGET : les `examinerQuestions` des cas mal formées (DEFAUTS : réponse donnée,
//      style télégraphique, ponctuation) ne remontent pas non plus ;
//   4. BUDGET : idem pour les questions d'`examinerSheet` lues à voix haute (télégraphique
//      seulement ; la réplique jouée « (als Patient…) » et la relance « — Und? » y sont légitimes).
// Le fixture est aussi protégé face à la base par checkBudgetFloor.mjs.
// Usage : node scripts/checkFachwissenFloor.mjs [--json]
// Codes : 0 ok · 1 plancher ou budget dépassé.
// ============================================================================
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadAll } from './loadCases.mjs';

export const MIN_ASKED = 5;
export const BUDGET_FILE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fachwissen-floor-budget.json');

/** Les formes d'une question qui fait EXPLIQUER au patient (un simple conseil n'en est pas une). */
export const EXPLICATIONS = [
  /erklären Sie/i,
  /in einfachen Worten/i,
  /ohne Fachbegriffe/i,
  /teilen Sie .* mit/i,
  /klären Sie [^?.]*\bauf\b/i,
  /\baufklären\b/i,
  /\b(der|die) Patient(in)? fragt\b/i,
  /Was antworten Sie/i,
  /sagen Sie (dem|der) Patient/i,
  /(dem|der|einem|einer) Patient(en|in)?\b[^?.]*\berklären/i,
];
export const explique = (q) => EXPLICATIONS.some((r) => r.test(q));

// ponytail: liste fermée de formes finies (+ pronoms sujets) ; un verbe absent fait passer une
// question complète pour télégraphique → l'ajouter ici. Un vrai analyseur si la liste dépasse l'écran.
const FORMES_FINIES = [
  'sie|ich|wir|man|er|es|du',
  'ist|sind|war|waren|wäre|wären|hat|haben|hatte|hätte|hätten|gibt|gab',
  'kann|können|könnte|könnten|muss|müssen|musste|darf|dürfen|soll|sollte|sollten|will|wollen|möchte|wird|werden|wurde|wurden|würde|würden',
  'bedeutet|bedeuten|besagt|liegt|liegen|kommt|kommen|käme|steht|stehen|steckt|spricht|sprechen|gehört|gehören|zeigt|zeigen|hilft|helfen',
  'unterscheidet|unterscheiden|entsteht|entstehen|verursacht|verursachen|lautet|lauten|heißt|bleibt|fehlt|passt|passen|reicht|reichen|droht|drohen|sieht|sah',
  'gilt|gelten|erfolgt|erfolgte|erfolgen|braucht|brauchen|benötigt|besteht|bestehen|tritt|auftritt|macht|machen|geht|führt|führen|deutet|stimmt|weist',
  'spielt|spielen|befindet|befinden|bekommt|bekommen|nimmt|nähme|liefert|entscheidet|sichert|sichern|bestätigt|beweist|genügt|heilt|bessern|behandelt',
  'benutzt|verhält|bremst|taugt|metastasiert|überträgt|funktioniert|ändert|trägt|korrelieren|äußert|raucht|trinkt|schreibt|findet|beginnen|schließt',
  'definieren|erfüllt|verbessern|verbessert|dient|dienen|wirkt|passiert|folgt|tun|tut|sagt|zählt|betrifft|ergibt|bringt|lässt|bestimmt|stellt|enthält',
  'erklärt|beeinflusst|senkt|erhöht|treten|kennzeichnet|fällt|klingt|hängt|hängen',
].join('|');
const VERBE_FINI = new RegExp(`(?<!\\p{L})(${FORMES_FINIES})(?!\\p{L})`, 'iu');

/** Défauts d'une question d'examinateur — chacun reconnu par sa seule règle (test de mutation). */
export const DEFAUTS = {
  /** La réponse attendue entre parenthèses en fin de question : « …verwenden Sie? (PHQ-9) ». */
  reponseParenthese: (q) => /\)\s*[?.]?$/.test(q),
  /** La relance écrite avec sa réponse : « — Und? (Panikattacke, …) ». */
  reponseUnd: (q) => /— Und\?/.test(q),
  /** Télégraphique : moins de 4 mots (« Wichtigster Laborwert? »). */
  motsCourts: (q) => q.split(/\s+/).length < 4,
  /** Télégraphique : « X vs. Y ». */
  versus: (q) => /\svs\.\s/.test(q),
  /** Télégraphique : aucun verbe conjugué (« Welche Diagnostik in welcher Reihenfolge? »). */
  sansVerbe: (q) => !VERBE_FINI.test(q),
  /** Ni « ? » ni « . » final : l'impératif complet en « . » est valide. */
  ponctuation: (q) => !/[?.!)][“"»]?$/.test(q),
};
export const defautQuestion = (q) => Object.keys(DEFAUTS).find((k) => DEFAUTS[k](q.trim()));
export const questionMalFormee = (q) => defautQuestion(q) !== undefined;
const TELEGRAPHIQUE = ['motsCourts', 'versus', 'sansVerbe'];
/** examinerSheet : seul le télégraphique compte ; la réplique jouée « (als …) » n'est pas une question d'examinateur. */
export const defautSheet = (frage) => !/^\(als /.test(frage.trim()) && TELEGRAPHIQUE.some((k) => DEFAUTS[k](frage.trim()));

/** Mesure sur des objets déjà chargés : { sousPlancher, sansExplication, questionsMalFormees, sheetMalFormees }. */
export function mesure(fachwissen, cases) {
  return {
    sousPlancher: fachwissen.filter((f) => (f.askedInExam ?? []).length < MIN_ASKED).map((f) => `${f.id} (${(f.askedInExam ?? []).length})`),
    sansExplication: fachwissen.filter((f) => !(f.askedInExam ?? []).some((q) => explique(q.frage))).map((f) => f.id),
    questionsMalFormees: cases.flatMap((c) => (c.examinerQuestions ?? []).filter(questionMalFormee).map((q) => `${c.id} [${defautQuestion(q)}] : ${q}`)),
    sheetMalFormees: cases.flatMap((c) => (c.examinerSheet ?? []).flatMap((s) => s.interactions.map((i) => i.frage)).filter(defautSheet).map((q) => `${c.id} : ${q}`)),
  };
}

const COMPTEURS = { sansExplication: 'Fachwissen sans explication au patient', questionsMalFormees: 'examinerQuestions mal formées', sheetMalFormees: 'questions d’examinerSheet télégraphiques' };

/** Verdict face au budget : liste des fautes (vide = vert). */
export function verdict(m, budget) {
  const fautes = [];
  if (m.sousPlancher.length) fautes.push(`moins de ${MIN_ASKED} questions d'examen : ${m.sousPlancher.join(', ')}`);
  for (const [k, libelle] of Object.entries(COMPTEURS)) if (!(m[k].length <= budget[k])) fautes.push(`${libelle} : ${m[k].length} > budget ${budget[k]}`);
  return fautes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cases, fachwissen } = await loadAll();
  const m = mesure(fachwissen, cases);
  const { budget } = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
  if (process.argv.includes('--json')) console.log(JSON.stringify(m, null, 1));
  const fautes = verdict(m, budget);
  console.log(`${fachwissen.length} Fachwissen · sous ${MIN_ASKED} questions : ${m.sousPlancher.length} · ${Object.entries(COMPTEURS).map(([k, l]) => `${l} : ${m[k].length} (budget ${budget[k]})`).join(' · ')}`);
  if (fautes.length) { for (const f of fautes) console.log(`❌ ${f}`); process.exit(1); }
  if (Object.keys(COMPTEURS).some((k) => m[k].length < budget[k])) console.log('ℹ la mesure est sous le budget : abaisser fixtures/fachwissen-floor-budget.json.');
  console.log('✅ PLANCHER FACHWISSEN tenu.');
}
