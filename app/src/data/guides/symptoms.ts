import type { Phrase, PhraseVariant } from './phrases';
import { phraseIsCaseSpecific, phraseProbes } from './phrases';
import { PROBE_BY_ID } from './anamneseProbes';

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

export type Symptom =
  | 'fieber' | 'schuettelfrost' | 'nachtschweiss' | 'reise' | 'kontakt'
  | 'uebelkeit' | 'stuhl' | 'miktion' | 'gewicht' | 'appetit' | 'schlaf'
  | 'husten' | 'oedeme' | 'orthopnoe' | 'blutung' | 'schwindel';

export const PROBE_SUCHT: Record<string, Symptom[]> = {
  // Vegetative Anamnese — les questions générales, celles qui « répètent ».
  'veg-fieber': ['fieber', 'reise'],
  'veg-schuettelfrost': ['schuettelfrost', 'nachtschweiss'],
  'veg-uebelkeit': ['uebelkeit'],
  'veg-ausscheidung': ['stuhl', 'miktion'],
  'veg-gewicht': ['gewicht'],
  'veg-appetit': ['appetit'],
  'veg-schlaf': ['schlaf'],
  // Aktuelle Beschwerden (variantes)
  'akt-infekt-fieber': ['fieber', 'schuettelfrost'],
  'akt-infekt-kontakt': ['reise', 'kontakt'],
  'akt-allgemein-gewicht': ['gewicht', 'appetit'],
  'akt-allgemein-schwellung': ['oedeme'],
  'akt-atemnot-nachts': ['orthopnoe'],
  'akt-psych-schlaf': ['schlaf'],
  'akt-atemnot-husten': ['husten'],
  'akt-ausscheid-was': ['stuhl', 'miktion'],
  'akt-ausscheid-haeufigkeit': ['stuhl', 'miktion'],
  'akt-veraend-blutung': ['blutung'],
  'akt-neuro-lage': ['schwindel'],
  // Fachanamnese
  'fach-pneumo-fieber': ['fieber', 'schuettelfrost'],
  'fach-pneumo-husten': ['husten'],
  'fach-pneumo-infekt': ['reise', 'kontakt'],
  'fach-uro-fieber': ['fieber', 'schuettelfrost'],
  'fach-uro-miktion': ['miktion'], 'fach-uro-frequenz': ['miktion'], 'fach-uro-farbe': ['miktion'],
  'fach-infekt-fieber': ['fieber'], 'fach-infekt-reise': ['reise'], 'fach-infekt-kontakt': ['kontakt'],
  'fach-chir-fieber': ['fieber'], 'fach-chir-uebelkeit': ['uebelkeit'],
  'fach-gastro-uebelkeit': ['uebelkeit'], 'fach-gastro-stuhl': ['stuhl'],
  'fach-haem-bsymptomatik': ['fieber', 'nachtschweiss', 'gewicht'],
  'fach-onko-bsymptomatik': ['fieber', 'nachtschweiss', 'gewicht'],
  'fach-haem-blutung': ['blutung'], 'fach-haem-blutverlust': ['blutung'], 'fach-onko-blutung': ['blutung'],
  'fach-onko-appetit': ['appetit'],
  'fach-endo-gewicht': ['gewicht', 'appetit'],
  'fach-psych-schlaf': ['schlaf'],
  'fach-kardio-oedeme': ['oedeme', 'orthopnoe'], 'fach-nephro-oedeme': ['oedeme', 'gewicht'],
  'fach-pneumo-orthopnoe': ['orthopnoe'],
  'fach-nephro-menge': ['miktion'], 'fach-nephro-aussehen': ['miktion'],
  'fach-neuro-blase': ['miktion', 'stuhl'], 'fach-ortho-cauda': ['miktion', 'stuhl'],
  'fach-neuro-koordination': ['schwindel'],
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
  ['schlaf', /\bschlaf\b(?!-)|\bschlafen sie (gut|schlecht|ausreichend|tagsüber)/i],
  ['husten', /\bhusten\b/i], ['orthopnoe', /\bkissen\b/i],
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
  // Vrai doublon déclaré (`redundant`) : la version générale, plus riche, est
  // dans la trame → c'est la version Fach qui s'efface, quel que soit l'ordre.
  const present = new Set(chapters.flatMap((ch) => ch.questions.flatMap(phraseProbes)));
  const yieldsToGeneral = (q: Phrase) => {
    const ps = phraseProbes(q);
    if (ps.length !== 1) return false;
    const src = PROBE_BY_ID[ps[0]];
    return !!src?.redundant && !!src.deepens && present.has(src.deepens);
  };
  return chapters.map((ch) => {
    // Position où une question du cas (`sucht`) prend la place de la
    // première générale qu'elle remplace — sinon elle resterait en fin de
    // chapitre, après les restes (les frissons avant la fièvre).
    const slot = new Map<Symptom, number>();
    const rows: Array<{ q: Phrase; at: number }> = [];
    ch.questions.forEach((q, i) => {
      if (yieldsToGeneral(q)) return;
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
      const v = q as PhraseVariant;
      const followUp = keep.flatMap((pt) => pt.followUp ?? []);
      rows.push({ q: { ...v, text: keep.map((pt) => pt.text).join(' '), alts: undefined, followUp: followUp.length ? followUp : undefined, parts: undefined, sucht: left }, at: i });
    });
    rows.sort((a, b) => a.at - b.at);
    return { ...ch, questions: rows.map((r) => r.q) };
  });
}
