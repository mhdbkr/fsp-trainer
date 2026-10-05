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
// signes ajoutés). L'alias reste, déprécié, jusqu'à K5. Le montage (K3) est
// `cohere`, qui lit `PROBE_SUCHT`.
export * from './signes';
export type Symptom = Signe;

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
export const TEXT_RE: Array<[Symptom, RegExp]> = [
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
export function symptomsInText(t: string): Symptom[] {
  return TEXT_RE.filter(([, re]) => re.test(t)).map(([s]) => s);
}

/** Les signes que la phrase DÉCLARE chercher (K1, ce que lit la porte) : son `sucht`, sinon les signes qu'elle
 *  énumère (`enumere`), sinon ceux de ses sondes. Pas ses relances (`phraseFollowUps`). */
export function phraseSucht(p: Phrase): Signe[] {
  if (typeof p !== 'string' && (p.sucht || p.enumere)) return (p.sucht ?? p.enumere) as Signe[];
  return [...new Set(phraseProbes(p).flatMap((id) => PROBE_SUCHT[id] ?? []))];
}

/** Symptômes qu'une phrase cherche (K3 : la DÉCLARATION — `sucht`, `enumere`, sinon `PROBE_SUCHT`). Alias de
 *  `phraseSucht`, gardé pour `checkTrameSymptoms`. */
export const phraseSymptoms = (p: Phrase): Signe[] => phraseSucht(p);
