import type { Phrase } from './phrases';
import type { Signe } from './signes';
import { phraseProbes } from './phrases';
import { PROBE_SUCHT } from './probeSucht';

// ============================================================================
// UN SYMPTÔME, UNE QUESTION — par trame jouée (FB2-J10).
// ----------------------------------------------------------------------------
// Retour d'usage (CAP) : la fièvre demandée trois fois entre « Aktuelle
// Beschwerden », la Fachanamnese et la Vegetative Anamnese. Les questions du
// guide ne changent pas ; c'est la TRAME DU CAS qui se module : on parcourt
// les chapitres dans l'ordre de l'entretien, et une question dont tous les
// symptômes ont déjà été cherchés plus haut disparaît ; si une partie
// seulement l'a été, la question se réduit à ce qui reste (`parts`, rédigé
// à la main — jamais une phrase recoupée par un programme). Depuis K3 (ADR-0023), cette
// modulation est le moteur de cohérence `cohere` (coherence.ts), qui lit `PROBE_SUCHT`.
//
// Carte explicite, relue : sonde → symptômes qu'elle CHERCHE. On n'y met que
// les symptômes qui reviennent d'un chapitre à l'autre ; une question qui ne
// fait que citer un symptôme parmi d'autres signes (« Fieber, Augenentzündung,
// Geschwüre… » en rhumato) n'est pas une question sur ce symptôme.
// ============================================================================

// Les 39 concepts d'origine (série 3). Les 16 premiers sont les symptômes
// « végétatifs » d'origine ; les 20 suivants sont ceux que l'audit série 3
// (§4.2) a mesurés comme échappant au garde-fou — 107 des 270 doublons joués
// citaient un concept que le type `Symptom` ne nommait pas.
//
// Une frontière est tenue à la main, elle ne se déduit pas du texte :
//   • `schwaeche` = déficit MOTEUR focal (Kraftverlust, schwächer geworden,
//     Lähmung). La fatigue générale (« Müdigkeit », « Leistungsknick ») n'est
//     PAS ce concept — les confondre ferait disparaître la sonde hémato.
//   • `taubheit` = trouble sensitif d'un membre. L'anesthésie en selle
//     (`fach-ortho-cauda`) est une autre topographie, volontairement non
//     mappée : elle ne double pas `fach-ortho-sensomotorik`.
//   • `stimmung` = l'humeur. L'Antrieb et l'Interesse sont des axes distincts
//     du syndrome dépressif et ne sont pas mappés ici.
//   • `gedaechtnis` = mémoire cognitive (Vergesslichkeit), pas l'amnésie
//     péri-critique d'une crise (`fach-neuro-anfallzeichen`).
//   • `polyurie` = le VOLUME et la fréquence d'un patient qui boit trop
//     (paire cardinale avec la soif). Ce n'est pas `miktion` (brûlure,
//     jet, rétention) : les confondre effaçait « Wasserlassen » de la
//     Vegetative Anamnese dans les cas endocriniens (décision D4).
// K0 (ADR-0023) : `Symptom` devient `Signe` — un seul lexique, déclaré dans
// `signes.ts` (les 39 concepts ci-dessus, les 11 dimensions de plainte et les
// signes ajoutés). K5 : l'alias déprécié `Symptom` est retiré. Le montage (K3) est
// `cohere`, qui lit `PROBE_SUCHT`.
export * from './signes';

// K3 (ADR-0023) : `SUCHT_MONTAGE` (la carte gelée d'avant K1) et `dedupeBySymptom` sont supprimés ; le montage
// est `cohere` (coherence.ts), qui lit la déclaration `PROBE_SUCHT` (probeSucht.ts).
export * from './probeSucht';

// Les questions propres au cas n'ont pas de sonde. Dans l'app, seule une
// question qui DÉCLARE `sucht` compte : elle remplace la générale de son
// chapitre et vaut « déjà cherché » pour toute la suite de la trame. La
// lecture du texte ci-dessous ne sert qu'à la porte `checkTrameSymptoms`,
// qui exige une relecture de toute question du cas citant un symptôme que
// la trame cherche aussi, AVANT ou APRÈS elle : `sucht` (elle le remplace) ou
// `relu` (elle l'approfondit, ou ne le cherche pas vraiment). Motifs étroits.
export const TEXT_RE: Array<[Signe, RegExp]> = [
  ['fieber', /\bfieber\b/i], ['schuettelfrost', /schüttelfrost/i], ['nachtschweiss', /nachtschwei/i],
  ['reise', /\b(ausland|verreist|reise)\b/i], // `\b` n'existe pas devant ä ö ü (pas \w) : l'ancre est un lookbehind, sinon « übel » et « Ängste » ne sont jamais lus.
  ['uebelkeit', /(?<![a-zäöüß])(übel(keit)?|übergeben)\b|\b(erbrochen|erbrechen)\b/i],
  ['stuhl', /\b(stuhlgang|durchfall|verstopfung)\b/i], ['miktion', /\bwasserlassen\b/i],
  ['gewicht', /\b(gewicht\w*|kilo\w*|zugenommen)\b|(?<!blut )\babgenommen\b/i], ['appetit', /\bappetit\b/i],
  // « Schlaf » le nom (pas « Schlaf- oder Beruhigungsmittel », pas « mit wie
  // vielen Kissen schlafen Sie », pas « die Finger schlafen ein »).
  ['schlaf', /(?<!ruhe oder |nach )\bschlaf\b(?!-)|\bschlafen sie (gut|schlecht|ausreichend|tagsüber)/i],
  ['husten', /\bhusten\b/i], ['orthopnoe', /\bkissen\b/i],
  // --- série 3 -------------------------------------------------------------
  // `blutung` et `schwindel` manquaient alors qu'ils étaient DÉJÀ dans
  // `PROBE_SUCHT` : c'est par là que les 44 doublons `blutung` de l'audit
  // passaient (la question du cas citait le sang sans déclarer `sucht`).
  ['blutung', /\bblutung\w*|\bblutet\b|nasenbluten|zahnfleischbluten|blut im (stuhl|urin)|blut (dabei|beigemengt)/i],
  ['schwindel', /\bschwindel\w*|\bschwank(en|t|ig)\b/i],
  ['kopfschmerz', /\bkopfschmerz\w*|\bkopfweh\b/i],
  ['atemnot', /\b(atemnot|luftnot|kurzatmig\w*)\b|schwer luft|die luft weg/i],
  ['brustschmerz', /\bbrustschmerz\w*|engegefühl in der brust|schmerzen in der brust/i],
  ['bewusstlos', /\b(bewusstlos\w*|ohnmächtig|ohnmacht|synkope)\b|schwarz vor augen/i],
  ['sehstoerung', /\b(sehstörung\w*|doppelbild\w*)\b|verschwommen|sehverschlechterung|schlechter seh/i],
  ['krampf', /\bkrampfanf\w*|\bzuck(en|ungen)\b|\bepilep\w*/i],
  ['taubheit', /\btaubheit\w*|\bkribbeln\b|\bpelzig\w*/i],
  ['schwaeche', /\bkraftverlust\b|schwächer geworden|\blähmung\b|\bgelähmt\b/i],   // K1 : « Kraftlosigkeit » (allgemein-art) est la fatigue, pas le déficit moteur focal
  ['herzrasen', /\bherz(rasen|klopfen|stolpern)\b/i],
  // « Nachtschweiß » a son propre concept — le motif ne doit pas l'attraper.
  ['schwitzen', /\bschwitz\w*|\bschweißausbr\w*/i],
  ['durst', /\bdurst\w*/i],
  ['juckreiz', /\bjuck(t|en|reiz\w*)\b/i],
  ['ausschlag', /\b(haut)?ausschlag\w*|\bhautveränderung\w*|\bhautröt\w*|\bquaddel\w*|\brötung\w*/i],
  ['schluck', /\bschluck(beschwerden|störung\w*|en)\b/i],
  ['gelbfaerbung', /\bgelbfärbung\w*|\bgelbsucht\b|\bikterus\b/i],
  ['sturz', /\bsturz\b|\bstürz\w*|\bgestürzt\b/i],
  ['stimmung', /\bstimmung\b|\bniedergeschlagen\b|\btraurig\b|innerlich leer/i],
  ['angst', /\bangst\b|(?<![a-zäöüß])ängste\b|\bpanikattack\w*/i],
  ['suizid', /\blebenswert\b|etwas anzutun|\bsuizid\w*|selbst(mord|tötung)/i],
  ['gedaechtnis', /\bvergesslich\w*|\bgedächtnis\w*|erinnerungslück\w*/i],
];
export function symptomsInText(t: string): Signe[] {
  return TEXT_RE.filter(([, re]) => re.test(t)).map(([s]) => s);
}

// ── Ce qu'une RÉPLIQUE du patient a déjà dit (lot Banque, FB3-A2 ; r5 de `cohere`) ─────────────────────────────
// Une lecture À PART de TEXT_RE (qui sert la porte et la mesure) : elle décide qu'une question de banque ne se pose plus,
// donc la précision prime sur le rappel. Un signe est dit quand la réplique en dit la PRÉSENCE ou l'ABSENCE (« keinen
// Durchfall » répond à « Hatten Sie Durchfall? »). Ne valent pas réponse : un facteur (« beim Husten »), un épisode passé
// dans la même phrase (« vor drei Wochen … Corona, Fieber » — règle (e) de l'identité), une image (« wie ein Gewicht »),
// le poids du jour (seule une VARIATION dit `gewicht`), une impression (« mir ist warm » n'est pas « Fieber »).
// ponytail : des motifs fermés par signe, sans analyse de la phrase ; un signe absent de la table n'est jamais « dit »
// (schlaf, krampf, blutung, reise, angst : trop de sens voisins). Ajouter un motif = un test de lecture dans coherenceBanque.test.ts.
const PHRASE_FIN = /[.!?;…]+/;
// revue clinique P1-2 (tia) : « Gestürzt … habe ich mich vorher nicht » situe AVANT les épisodes — pas les chutes des attaques
const PASSE = /\bvor\s+(?:\w+\s+){0,2}(?:wochen?|monat(?:en)?|jahr(?:en)?)\b|\bdamals\b|\bals kind\b|\bfrüher\b|\bging (?:wieder )?weg\b|\b(?:vorher|davor|zuvor)\b/i;
/** revue clinique P1-1 (appendizitis) : une fièvre supposée (« ich glaube, ich habe Fieber ») n'est pas une fièvre dite. */
const DOUTE = /\b(?:ich glaube|glaube ich|wohl|vielleicht|vermutlich|wahrscheinlich)\b/i;
/** revue clinique P2-1 (nhl) : ce qui suit une didascalie conditionnelle « (Wenn … gefragt …) », « (auf Nachfrage) » n'est dit que si
 *  on le demande — la réplique ne le dit pas d'elle-même. */
const SUR_DEMANDE = /\((?:[^)]*\bgefragt\b|[^)]*\bauf nachfrage\b)[^)]*\)/i;
const NACHTS = /\bnachts\b/i;
/** Un nombre de kilos (« 4 Kilo », « vier Kilo », pas « Kilometer ») : le chiffre d'une variation du poids. */
const KILO = String.raw`\b(?:\d+(?:[,.]\d+)?|ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|fünfzehn|zwanzig)\s+kilo(?!m)`;
const DIT_RE: Array<[Signe, RegExp, { passe?: true; nuit?: false; complet?: true; doute?: true }?]> = [
  ['fieber', /\bfieber/i, { doute: true }],
  ['schuettelfrost', /schüttelfrost|\bgeschüttelt\b/i],
  ['nachtschweiss', /nachtschwei|\bnachts\b[^,]{0,30}(?:schwitz|klatschnass|durchgeschwitzt)|schwitze\w*\s+(?:\w+\s+){0,2}nachts/i],
  ['schwitzen', /\bschwitz\w*|schweißausbr\w*/i, { nuit: false }],
  ['uebelkeit', /(?<![a-zäöüß])übel(?:keit)?(?![a-zäöüß])|\bmir ist (?:\w+ )?schlecht\b|\bschlecht (?:war|ist|wird|wurde) (?:es )?mir\b/i],   // + l'inversion (P2-6)
  ['erbrechen', /\berbroch\w*|\berbrech\w*|(?<![a-zäöüß])übergeb\w*/i],
  ['stuhl', /durchfall|\bverstopf\w*/i],
  // une VARIATION du poids, jamais un chiffre seul (« wiege 70 Kilo »), jamais « Kilometer », jamais « wie ein Gewicht »
  ['gewicht', new RegExp(`${KILO}\\w*\\b[^.!?;,—–]{0,40}\\b(?:ab|zu)genommen\\b|(?:ab|zu)genommen\\b[^.!?;]{0,20}${KILO}|${KILO}\\w*\\s+(?:verloren|weniger|mehr)\\b|\\bwaren es (?:noch |früher )?\\d{2,3}\\b(?![,.]\\d)(?!\\s*(?:grad|°|mal))|\\bvon \\d+ auf \\d+\\s+kilo|\\bgewicht\\w* (?:\\w+ ){0,3}?(?:gleich|stabil)\\b`, 'i'), { passe: true, complet: true }],
  ['gewicht', /\b(?:ab|zu)genommen habe ich\b|\b(?:ich habe|habe ich) (?:\w+ ){0,5}?(?:ab|zu)genommen\b|\bgewicht\w* (?:\w+ ){0,3}?(?:verloren|abgenommen|zugenommen)\b|\bgewichts(?:verlust|zunahme)\b/i, { passe: true }],
  ['appetit', /\bappetit\b/i],
  ['durst', /\bdurst\w*/i],
  ['husten', /(?<!\bbeim (?:\w+ )?|\bbei |\bvom |\bzum )\bhusten\b/i],
  ['kopfschmerz', /\bkopfschmerz\w*|\bkopfweh\b|\bkopf tut (?:mir )?weh\b|\btut mir der kopf weh\b/i],
  ['schwindel', /\bschwindel\w*/i],
  ['sturz', /\b(?:sturz|(?<!\b(?:fast|beinahe) )gestürzt|hingefallen)\b/i],   // « fast gestürzt » n'est pas une chute
  ['unfallhergang', /\bkein(?:en)? unfall\b|\bunfall hatte ich (?:auch )?(?:nicht|keinen)\b/i],
  ['taubheit', /\btaubheit\w*|\bkribbel\w*|\bpelzig\w*/i],
  ['schwaeche', /\bschwächer geworden\b|\bkraftverlust\b|\blähmung\b|\bgelähmt\b/i],
  ['juckreiz', /(?<![a-zäöüß])juck/i],
  ['ausschlag', /\bausschlag\w*|\bquaddel\w*|\bhautveränderung\w*/i],
  ['atemnot', /\b(?:atemnot|luftnot|kurzatmig\w*)\b|\bschwer luft\b|\bkaum luft\b|\baußer puste\b|\bdie luft weg\b|\bkeine luft\b/i],
  ['brustschmerz', /\bbrustschmerz\w*|\bengegefühl in der brust\b|\bschmerz\w* in der brust\b|\bbrust schnürt\b/i],
  ['herzrasen', /\bherz(?:rasen|klopfen|stolpern)\b|\bherz (?:rast|klopft)\b/i],
  ['bewusstlos', /\bbewusstlos\w*|\bohnmächtig\b|\bohnmacht\b|\bsynkope\b/i],   // « schwarz vor Augen » est une présyncope (ADMIS Q5)
  // la brûlure, ou un changement (ou son absence) dit « beim Wasserlassen » ; pas « nachts zum Wasserlassen », pas « nicht Wasserlassen »
  ['miktion', /(?:brenn|stech|sticht|schmerz)[^.!?;]{0,30}wasserlassen|wasserlassen[^.!?;]{0,40}(?:brenn|sticht|schmerz|verändert|aufgefallen|wie immer|normal)/i],
  ['orthopnoe', /\bkissen\b/i],
  ['sehstoerung', /\bsehstörung\w*|\bdoppel(?:bild\w*|t sehe)|\bverschwommen\b/i],
  ['schluck', /\bschluckbeschwerden\b|\bschlucken (?:ist|fällt|geht) (?:\w+ )?(?:schwer|schwierig)|\bkaum (?:noch )?schlucken\b/i],
  ['stimmung', /\bniedergeschlagen\b|\btraurig\b|\binnerlich leer\b/i],
];
// L'ABSENCE (« keinen Durchfall », « wie immer ») et le CHIFFRE d'une variation du poids répondent aussi aux précisions : le signe est
// dit « complet ». La présence seule (« ich habe abgenommen ») laisse les précisions à poser (r5 les ouvre). La polarité se lit dans
// la proposition du motif (virgule, tiret, « und ich … ») : « Mir ist übel, erbrochen habe ich nicht ».
const PROPOSITION = /,|—|–|\s(?:und|aber|doch|sondern)\s+(?=(?:ich|mir|mich|es|das|der|die|seit|jetzt|dann)\b)/gi;
const NEGATION = /\b(?:kein\w*|nicht|nie|niemals|nichts|weder|ohne|nein)\b|\bwie immer\b|\bnormal\b|\bunauffällig\b/i;
/** Ce qu'une réplique du patient DIT, phrase par phrase : signe → `complet` (l'absence ou le chiffre répond aussi aux précisions ;
 *  une présence l'emporte sur une absence dans la même réplique) et `seit` (revue clinique P2-4 : « seit drei Tagen … Husten » dit le
 *  début dans la proposition du signe — « Seit wann …? » ne se repose pas).
 *  `dabei = false` : une proposition « … dabei … » (pendant ce dont parle la question) ne dit rien du signe en général. */
export function lireReponse(reponse: string, dabei = true): Map<Signe, { complet: boolean; seit: boolean }> {
  const out = new Map<Signe, { complet: boolean; seit: boolean }>();
  for (const ph of reponse.split(SUR_DEMANDE)[0].split(PHRASE_FIN)) {
    const passe = PASSE.test(ph), nuit = NACHTS.test(ph), doute = DOUTE.test(ph);
    const coupes = [0, ...[...ph.matchAll(PROPOSITION)].map((m) => m.index! + m[0].length), ph.length + 1];
    const ici = new Map<Signe, { complet: boolean; seit: boolean }>();   // dans une phrase, un motif « complet » l'emporte (« fünf Kilo abgenommen »)
    for (const [s, re, o] of DIT_RE) {
      const m = re.exec(ph);
      if (!m || (passe && !o?.passe) || (nuit && o?.nuit === false) || (doute && o?.doute)) continue;
      const k = coupes.findIndex((c) => c > m.index) - 1;
      const prop = ph.slice(coupes[k], coupes[k + 1]);
      if (!dabei && /\bdabei\b/i.test(prop)) continue;
      const d = ici.get(s);
      ici.set(s, { complet: !!d?.complet || !!o?.complet || NEGATION.test(prop), seit: !!d?.seit || /\bseit\b/i.test(prop) });
    }
    for (const [s, v] of ici) {
      const d = out.get(s);
      out.set(s, d ? { complet: d.complet && v.complet, seit: d.seit || v.seit } : v);
    }
  }
  return out;
}
/** Les signes qu'une réplique DIT : signe → `true` si l'absence (ou le chiffre) répond aussi aux précisions. */
export const ditsDe = (reponse: string, dabei = true): Map<Signe, boolean> =>
  new Map([...lireReponse(reponse, dabei)].map(([s, v]) => [s, v.complet]));
export const signesDits = (reponse: string): Signe[] => [...ditsDe(reponse).keys()];

/** Les signes que la phrase DÉCLARE chercher (K1, ce que lit la porte) : son `sucht`, sinon les signes qu'elle
 *  énumère (`enumere`), sinon ceux de ses sondes. Pas ses relances (`phraseFollowUps`). */
export function phraseSucht(p: Phrase): Signe[] {
  if (typeof p !== 'string' && (p.sucht || p.enumere)) return (p.sucht ?? p.enumere) as Signe[];
  return [...new Set(phraseProbes(p).flatMap((id) => PROBE_SUCHT[id] ?? []))];
}

/** Symptômes qu'une phrase cherche (K3 : la DÉCLARATION — `sucht`, `enumere`, sinon `PROBE_SUCHT`). Alias de
 *  `phraseSucht`, gardé pour `checkTrameSymptoms`. */
export const phraseSymptoms = (p: Phrase): Signe[] => phraseSucht(p);
