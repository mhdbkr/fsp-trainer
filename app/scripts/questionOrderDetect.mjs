// ============================================================================
// Détecteur de PRÉSUPPOSITION d'une question du cas — série 3, lot Q0.
// Fonction pure (pas d'E/S) : `checkQuestionOrder.mjs` lui passe les trames
// jouées, `checkQuestionOrder.test.mjs` des fixtures.
//
// Une question PROPRE AU CAS (`own`) qui présuppose un fait que le patient n'a
// pas encore dit — il n'apparaît qu'à un tour ou un champ de fiche PLUS TARD.
// Quatre règles (audit questions du cas §6, point 6) :
//   1. SN défini/possessif avec jusqu'à 2 adjectifs : « den zweiten Stock »,
//      « Ihrem chronischen Heuschnupfen » (l'ancien RE_DEF exigeait le nom
//      juste après l'article) ;
//   2. ordinal + nom : « im zweiten Stock », « beim ersten Infarkt » ;
//   3. phrase affirmative en tête : « Sie nehmen seit Jahren Tamsulosin… » ;
//   4. au lieu d'un seuil de fréquence documentaire (maxDf) : on exclut les
//      mots déjà présents dans les questions GÉNÉRALES de la trame — ce sont
//      les mots du dialogue, pas des faits du cas.
// Informatif : précision ≈ 50 % sur l'échantillon relu (revue Q0). Jamais bloquant.
// ============================================================================

export const lemma = (w) => w.toLowerCase().replace(/[^a-zäöüß]/g, '').slice(0, 6);
/** Forme « de trame » : le pluriel/génitif ne distingue pas deux mots. */
export const full = (w) => w.toLowerCase().replace(/(en|n|s|e)$/, '');
const NOUNS = /\b[A-ZÄÖÜ][a-zäöüß]{2,}\b/g;
export const nounsOf = (t) => t.match(NOUNS) ?? [];

const ORD = /\b(?:ersten|zweiten|dritten|vierten|fünften|sechsten|\d+\.)\s+(Stock\w*|Etage|Obergeschoss|Ehe|Kind\w*|Geburt|Schwangerschaft|Infarkt|Operation|Schub|Anfall|Woche)/g;
const NP = /\b(?:der|die|das|dem|den|des|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres|trotz|seit|wegen)\s+(?:[a-zäöü][a-zäöüß]+\s+){0,2}([A-ZÄÖÜ][a-zäöüß]{3,})/g;
// Sans article, la phrase affirme un fait (« Sie nehmen… ») : la question n'en est pas une.
const ASSERT = /^(?:Sie hatten|Sie haben|Sie nehmen|Sie sind|Sie waren|Sie sagten|Sie erwähnten|Nach Ihrer|Seit Ihrer|Bei Ihrer)\b/;

/** Les mots de la trame : tout substantif d'une question non propre au cas. */
export function trameWords(generalTexts) {
  const out = new Set();
  for (const t of generalTexts) for (const w of nounsOf(t)) out.add(full(w));
  return out;
}

/**
 * @param {{id:string, facts:string, turns:{ch:string, q:string, a:string, own:boolean}[]}} c
 *   `facts` = ce que la fiche déclare hors dialogue (social, antécédents, médicaments…).
 * @param {Set<string>} trame résultat de `trameWords`
 * @returns {{rule:'ORD'|'NP'|'ASSERT', id:string, ch:string, hit:string, q:string}[]}
 */
export function detect(c, trame) {
  const hits = [];
  const known = new Set();
  const said = new Set(); // mots entiers déjà dits : le lemme tronqué à 6 lettres confond « Magenschmerzen » et « Magenschutztabletten »
  c.turns.forEach((t, i) => {
    // `eroeffnung` : discours tenu, pas d'interrogatoire (rien n'y est présupposé).
    if (t.own && t.ch !== 'eroeffnung') {
      const later = c.turns.slice(i + 1).map((u) => u.a).join(' ') + ' ' + c.facts;
      const laterL = new Set(nounsOf(later).map(lemma));
      const at = { id: c.id, ch: t.ch, q: t.q };
      for (const m of t.q.matchAll(ORD)) if (!known.has(lemma(m[1]))) hits.push({ rule: 'ORD', hit: m[0], ...at });
      for (const m of t.q.matchAll(NP)) {
        const l = lemma(m[1]);
        if (known.has(l) || trame.has(full(m[1])) || !laterL.has(l)) continue;
        hits.push({ rule: 'NP', hit: m[0], ...at });
      }
      // Une affirmation qui ne reprend que des mots déjà dits (ou de trame) ne présuppose rien.
      const fresh = nounsOf(t.q).filter((w) => w.length >= 4 && !said.has(w.toLowerCase()) && !trame.has(full(w)));
      if (ASSERT.test(t.q) && fresh.length) hits.push({ rule: 'ASSERT', hit: t.q.split(/\s+/).slice(0, 2).join(' '), ...at });
    }
    for (const w of nounsOf(`${t.q} ${t.a}`)) { known.add(lemma(w)); said.add(w.toLowerCase()); }
  });
  return hits;
}
