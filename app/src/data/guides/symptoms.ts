import type { Phrase, PhraseVariant } from './phrases';
import type { Signe } from './signes';
import { phraseIsCaseSpecific, phraseProbes } from './phrases';

// ============================================================================
// UN SYMPTÔME, UNE QUESTION — par trame jouée (FB2-J10).
// ----------------------------------------------------------------------------
// Retour d'usage (CAP) : la fièvre demandée trois fois entre « Aktuelle
// Beschwerden », la Fachanamnese et la Vegetative Anamnese. Les questions du
// guide ne changent pas ; c'est la TRAME DU CAS qui se module : on parcourt
// les chapitres dans l'ordre de l'entretien, et une question dont tous les
// symptômes ont déjà été cherchés plus haut disparaît ; si une partie
// seulement l'a été, la question se réduit à ce qui reste (`parts`, rédigé
// à la main — jamais une phrase recoupée par un programme).
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
// signes ajoutés). L'alias reste, déprécié, jusqu'à K5. Le montage n'a pas
// changé : `PROBE_SUCHT` et `dedupeBySymptom` lisent les mêmes ids qu'avant.
export * from './signes';
export type Symptom = Signe;

export const PROBE_SUCHT: Record<string, Symptom[]> = {
  // Vegetative Anamnese — les questions générales, celles qui « répètent ».
  'veg-fieber': ['fieber', 'reise'],
  'veg-schuettelfrost': ['schuettelfrost', 'nachtschweiss', 'schwitzen'],
  'veg-uebelkeit': ['uebelkeit'],
  'veg-ausscheidung': ['stuhl', 'miktion'],
  'veg-gewicht': ['gewicht'],
  'veg-appetit': ['appetit'],
  'veg-schlaf': ['schlaf'],
  // Aktuelle Beschwerden (variantes)
  // Le Schüttelfrost est SORTI de la question (série 3, tri des 27) :
  // `veg-schuettelfrost` le pose déjà, et plus richement. La déclaration
  // suivrait la question, sinon elle efface une question qui n'est plus posée.
  'akt-infekt-fieber': ['fieber'],
  'akt-infekt-kontakt': ['reise', 'kontakt'],
  'akt-allgemein-art': ['schwindel'],
  'akt-allgemein-gewicht': ['gewicht', 'appetit', 'durst'],
  'akt-allgemein-schwellung': ['oedeme'],
  'akt-atemnot-belastung': ['atemnot'],
  'akt-atemnot-nachts': ['orthopnoe'],
  'akt-psych-schlaf': ['schlaf'],
  'akt-ausscheid-schlucken': ['schluck'],
  'akt-psych-stimmung': ['stimmung'],
  'akt-psych-sicherheit': ['suizid'],
  'akt-atemnot-husten': ['husten'],
  'akt-ausscheid-was': ['stuhl', 'miktion'],
  'akt-ausscheid-haeufigkeit': ['stuhl', 'miktion'],
  // K1 : la moitié « urines » de la sonde commune coupée en deux garde la carte de l'ancienne (le montage ne change pas).
  'akt-ausscheid-harn-haeufigkeit': ['stuhl', 'miktion'], 'akt-ausscheid-harn-aussehen': ['stuhl', 'miktion'],
  'akt-veraend-blutung': ['blutung'],
  'akt-neuro-lage': ['schwindel'],
  'akt-neuro-ausfall': ['schwaeche', 'taubheit'],
  'akt-nerven-art': ['taubheit', 'schwaeche'],
  'akt-anfall-bewusstsein': ['bewusstlos'],
  // Fachanamnese
  'fach-pneumo-fieber': ['fieber', 'schuettelfrost'],
  'fach-pneumo-husten': ['husten'],
  'fach-pneumo-atemnot': ['atemnot'],
  'fach-pneumo-schmerz': ['brustschmerz'],
  'fach-pneumo-infekt': ['reise', 'kontakt'],
  'fach-uro-fieber': ['fieber', 'schuettelfrost'],
  'fach-uro-miktion': ['miktion'], 'fach-uro-frequenz': ['miktion'], 'fach-uro-farbe': ['miktion'],
  'fach-infekt-fieber': ['fieber'], 'fach-infekt-reise': ['reise'], 'fach-infekt-kontakt': ['kontakt'],
  'fach-infekt-haut': ['ausschlag'],
  'fach-gastro-uebelkeit': ['uebelkeit'], 'fach-gastro-stuhl': ['stuhl'],
  'fach-haem-bsymptomatik': ['fieber', 'nachtschweiss', 'gewicht'],
  'fach-onko-bsymptomatik': ['fieber', 'nachtschweiss', 'gewicht'],
  'fach-haem-blutung': ['blutung'], 'fach-haem-blutverlust': ['blutung'], 'fach-onko-blutung': ['blutung'],
  'fach-onko-appetit': ['appetit'],
  'fach-gyn-blutung': ['blutung'],
  'fach-derma-beginn-ort': ['ausschlag'], 'fach-derma-empfinden': ['juckreiz'],
  'fach-rheuma-haut': ['ausschlag'],
  'fach-endo-gewicht': ['gewicht', 'appetit'],
  'fach-endo-durst': ['durst', 'polyurie'],
  'fach-endo-temperatur': ['schwitzen'],
  'fach-endo-hals': ['schluck'],
  'fach-endo-augen': ['sehstoerung'],
  'fach-psych-schlaf': ['schlaf'],
  'fach-psych-stimmung': ['stimmung'],
  'fach-psych-angst': ['angst'],
  'fach-psych-suizid': ['suizid'],
  'fach-kardio-oedeme': ['oedeme', 'orthopnoe'], 'fach-nephro-oedeme': ['oedeme', 'gewicht'],
  'fach-kardio-brust': ['brustschmerz'],
  'fach-kardio-luft': ['atemnot'],
  'fach-kardio-herzrasen': ['herzrasen'],
  'fach-kardio-synkope': ['bewusstlos'],
  'fach-pneumo-orthopnoe': ['orthopnoe'],
  'fach-nephro-menge': ['miktion'], 'fach-nephro-aussehen': ['miktion'],
  'fach-neuro-blase': ['miktion', 'stuhl'], 'fach-ortho-cauda': ['miktion', 'stuhl'],
  'fach-neuro-koordination': ['schwindel', 'sturz'],
  'fach-neuro-kopfschmerz': ['kopfschmerz'],
  'fach-neuro-sehen': ['sehstoerung'],
  'fach-neuro-sensibilitaet': ['taubheit'],
  'fach-neuro-kraft': ['schwaeche'],
  'fach-neuro-verlauf': ['schub', 'waerme'],
  'fach-neuro-anfall': ['krampf', 'bewusstlos'],
  'fach-ortho-mechanismus': ['sturz'],
  'fach-ortho-sensomotorik': ['taubheit', 'schwaeche'],
};

// Les questions propres au cas n'ont pas de sonde. Dans l'app, seule une
// question qui DÉCLARE `sucht` compte : elle remplace la générale de son
// chapitre et vaut « déjà cherché » pour toute la suite de la trame. La
// lecture du texte ci-dessous ne sert qu'à la porte `checkTrameSymptoms`,
// qui exige une relecture de toute question du cas citant un symptôme que
// la trame cherche aussi, AVANT ou APRÈS elle : `sucht` (elle le remplace) ou
// `relu` (elle l'approfondit, ou ne le cherche pas vraiment). Motifs étroits.
const TEXT_RE: Array<[Symptom, RegExp]> = [
  ['fieber', /\bfieber\b/i], ['schuettelfrost', /schüttelfrost/i], ['nachtschweiss', /nachtschwei/i],
  ['reise', /\b(ausland|verreist|reise)\b/i], ['uebelkeit', /\b(übel|übergeben|erbrochen|erbrechen)\b/i],
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
  ['schwaeche', /\bkraftverlust\b|\bkraftlos\w*|schwächer geworden|\blähmung\b|\bgelähmt\b/i],
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
  ['angst', /\bangst\b|\bängste\b|\bpanikattack\w*/i],
  ['suizid', /\blebenswert\b|etwas anzutun|\bsuizid\w*|selbst(mord|tötung)/i],
  ['gedaechtnis', /\bvergesslich\w*|\bgedächtnis\w*|erinnerungslück\w*/i],
];
export function symptomsInText(t: string): Symptom[] {
  return TEXT_RE.filter(([, re]) => re.test(t)).map(([s]) => s);
}

/** Symptômes qu'une phrase cherche : par ses sondes, ou par son texte pour une
 *  question du cas. */
export function phraseSymptoms(p: Phrase): Symptom[] {
  if (typeof p !== 'string' && p.sucht) return p.sucht as Symptom[];
  const probes = phraseProbes(p);
  return [...new Set(probes.flatMap((id) => PROBE_SUCHT[id] ?? []))];
}

export interface TrameChapter { id: string; questions: Phrase[] }

/** Module une trame ordonnée : chaque symptôme n'est cherché qu'une fois, là
 *  où il apparaît d'abord. Pure — les chapitres sont recopiés, jamais mutés. */
export function dedupeBySymptom<T extends TrameChapter>(chapters: T[]): T[] {
  const asked = new Set<Symptom>();
  // Une question du cas est LA version de ce patient : dans son chapitre, la
  // question générale qui cherche le même symptôme lui cède la place, quel
  // que soit l'ordre (elle est ajoutée en fin de chapitre).
  const reserved = new Map<string, Set<Symptom>>();
  for (const ch of chapters) for (const q of ch.questions) if (phraseIsCaseSpecific(q)) {
    const set = reserved.get(ch.id) ?? new Set<Symptom>();
    for (const s of phraseSymptoms(q)) set.add(s);
    reserved.set(ch.id, set);
  }
  return chapters.map((ch) => {
    // Position où une question du cas (`sucht`) prend la place de la
    // première générale qu'elle remplace — sinon elle resterait en fin de
    // chapitre, après les restes (les frissons avant la fièvre).
    const slot = new Map<Symptom, number>();
    const rows: Array<{ q: Phrase; at: number }> = [];
    ch.questions.forEach((q, i) => {
      const syms = phraseSymptoms(q);
      if (!syms.length) { rows.push({ q, at: i }); return; }
      const own = phraseIsCaseSpecific(q);
      const res = reserved.get(ch.id);
      const left = syms.filter((s) => !asked.has(s) && (own || !res?.has(s)));
      for (const s of syms) asked.add(s);
      if (own) {
        const at = Math.min(i, ...syms.map((s) => slot.get(s) ?? i));
        rows.push({ q, at: at - 0.5 });
        return;
      }
      for (const s of syms) if (res?.has(s) && !slot.has(s)) slot.set(s, i);
      if (left.length === syms.length) { rows.push({ q, at: i }); return; }
      if (!left.length) return;
      const parts = typeof q === 'string' ? undefined : q.parts;
      if (!parts) { rows.push({ q, at: i }); return; }
      const keep = parts.filter((pt) => pt.sucht.some((s) => left.includes(s as Symptom)));
      if (!keep.length) return;
      if (keep.length === parts.length) { rows.push({ q, at: i }); return; }
      // Chaque partie restante est posée SEULE : rédigée à la main, c'est une
      // question complète. Recoller leurs textes mettait deux « ? » dans une
      // réplique (revue série 3, I4 — 6 cas endocriniens).
      const v = q as PhraseVariant;
      keep.forEach((pt, k) => rows.push({
        q: { ...v, text: pt.text, alts: undefined, followUp: pt.followUp?.length ? pt.followUp : undefined, parts: undefined, sucht: pt.sucht.filter((s) => left.includes(s as Symptom)) },
        at: i + k / 100,
      }));
    });
    rows.sort((a, b) => a.at - b.at);
    return { ...ch, questions: rows.map((r) => r.q) };
  });
}
