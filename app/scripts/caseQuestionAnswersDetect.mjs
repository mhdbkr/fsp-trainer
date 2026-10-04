// ============================================================================
// RÉPONSE D'UNE QUESTION DU CAS — série 3, lot Q2. Fonction pure (pas d'E/S) :
// `checkCaseQuestionAnswers.mjs` lui passe les cas, le test des fixtures.
//
// Une question propre au cas est posée par le candidat ; le simulant lit la
// fiche. Si rien dans la fiche ne parle de ce que la question cherche, il
// improvise — et deux simulants ne disent pas la même chose. `checkProbeCoverage`
// ne lit que les sondes canoniques : les questions du cas échappaient à tout.
//
// RÈGLE (lexicale, volontairement simple). Une question est RÉPONDUE si :
//   • la fiche porte une entrée `frageAntworten` dont `frage` est le texte de
//     la question — le champ explicite qui pointe vers la réponse (existant :
//     aucun champ à ajouter au type) ; ou
//   • l'un de ses MOTS DE CONTENU DISTINCTIFS figure dans la fiche.
// Mot de contenu = substantif (majuscule hors début de phrase) de ≥ 5 lettres hors mots-outils,
// comparé par sa racine de 5 lettres. DISTINCTIF = sa racine figure dans au
// plus MAX_DF des fiches : « Schmerzen », « Beschwerden » sont partout, ils ne
// prouvent rien. Une question sans mot distinctif n'est pas jugeable ; on la
// compte à part (`unjudged`), on ne la déclare pas trouée.
// La question ET sa relance (`followUp`) comptent comme un seul texte.
//
// INFORMATIF : un candidat est une question dont la fiche ne dit rien — soit
// un vrai trou (la réponse positive manque), soit un dépistage négatif laissé
// au silence (« Stent ? » → le patient dit non, et la fiche ne le dit nulle
// part). Corriger = écrire la réponse (ou le négatif) dans la fiche.
// ============================================================================

export const MAX_DF = 0.2;
const STOP = new Set('sie ihr ihre ihren ihrem ihrer ihnen wie was wann welche welcher welches welchen wer wo woher wohin warum wieso weshalb wieviel viele und oder der die das dem den des ein eine einen einem einer seit nein falls also aber dabei haben hatten hat hatte nehmen gibt sind waren müssen können tritt treten mal schon noch auch bitte gerade eher regelmäßig häufig manchmal jemals früher damals zuletzt aktuell derzeit momentan genau ungefähr wirklich irgendwie vielleicht dieser dieses diese diesen wenn dass ob bevor obwohl während sondern sogar besonders zeitweise mehr weniger sonst wieder ganz letzter letzten letzte zwischen sich selbst dazu davon darüber dafür dagegen kurz lange'.split(' '));

export const stem = (w) => w.toLowerCase().slice(0, 5);
/** Substantifs distinctifs candidats d'un texte (avant le filtre de fréquence). */
// Le premier mot d'une phrase prend une majuscule sans être un substantif
// (« Wurde », « Fühlen », « Kommt ») : il est écarté.
export const nounsOf = (t) => t.split(/[?.!:—–]+/).flatMap((s) => (s.match(/[A-Za-zÄÖÜäöüß]+/g) ?? []).slice(1))
  .filter((w) => /^[A-ZÄÖÜ]/.test(w) && w.length >= 5 && !STOP.has(w.toLowerCase()));

/** Ce que la fiche dit, hors consigne de jeu (persona) et réactions difficiles. */
export const sheetText = (sheet) => {
  const { persona: _p, schwierigeReaktionen: _s, ...rest } = sheet ?? {};
  return JSON.stringify(rest).toLowerCase();
};

/**
 * cases : [{ id, sheet, questions: [{ frage, followUp? }] }]
 * → { candidates: [{ id, frage, words }], unjudged, total }
 */
export function findUnanswered(cases, maxDf = MAX_DF) {
  const hays = cases.map((c) => sheetText(c.sheet));
  const dfCache = new Map();
  const df = (w) => {
    const k = stem(w);
    if (!dfCache.has(k)) dfCache.set(k, hays.filter((h) => h.includes(k)).length / hays.length);
    return dfCache.get(k);
  };
  const candidates = [];
  let unjudged = 0, total = 0;
  cases.forEach((c, i) => {
    const pointed = new Set((c.sheet?.frageAntworten ?? []).map((x) => x.frage));
    for (const q of c.questions) {
      total++;
      if (pointed.has(q.frage)) continue;
      const words = nounsOf(`${q.frage} ${q.followUp ?? ''}`).filter((w) => df(w) <= maxDf);
      if (!words.length) { unjudged++; continue; }
      if (!words.some((w) => hays[i].includes(stem(w)))) candidates.push({ id: c.id, frage: q.frage, followUp: q.followUp, words: [...new Set(words)] });
    }
  });
  return { candidates, unjudged, total };
}
