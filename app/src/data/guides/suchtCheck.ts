import type { Phrase } from './phrases';
import { phraseAlts, phraseFollowUps, phraseProbes, phraseText } from './phrases';
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, aktuellChapterFor } from './anamneseChapters';
import { PROBE_BY_ID } from './anamneseProbes';
import { PROBE_SUCHT, SIGNES, SIGNE_AFFINE, symptomsInText, type Signe } from './symptoms';

// ============================================================================
// INV-79 (contrat `frage-atomique.md` §10.9, lot K1) — la déclaration `sucht` des SONDES.
//  1. Totalité : toute sonde de la banque a un `sucht` non vide, de signes du lexique ; aucune entrée orpheline.
//  2. Relances : `followUpSucht` est parallèle à `followUp`, ses signes sont connus ; une relance CONDITIONNELLE
//     (« Falls … : ») est une précision : elle ne déclare pas un autre signe (INV-84).
//  3. Discordance : un signe que le texte (ou une relance) nomme et que ni `sucht` ni l'héritage ne couvre échoue,
//     sauf `relu`. Une dimension (Beginn, Verlauf…) porte SUR le motif : les signes qu'elle nomme sont son objet.
//  4. `relu` ne s'accepte jamais sur une énumération (≥ 2 signes dans la mère, une variante ou une relance) : D1,
//     elle cherche chaque signe qu'elle nomme (revue K1 I-3).
// Pure : les tables sont un paramètre, pour que les tests puissent les muter.
// ============================================================================
const DIMENSIONS: ReadonlySet<string> = new Set(['ort', 'beginn', 'charakter', 'intensitaet', 'ausstrahlung', 'verlauf', 'ausloeser', 'einfluss', 'frueher', 'gelenke']);

export interface SuchtTables {
  probes: Record<string, unknown>;
  sucht: Readonly<Record<string, readonly string[]>>;
  signes: readonly string[];
  phrases: ReadonlyArray<{ where: string; p: Phrase }>;
  lire: (text: string) => string[];
}

const catalogue = (): SuchtTables['phrases'] => [
  ...ALLGEMEINE_ANAMNESE.flatMap((ch) => ch.questions.map((p) => ({ where: `allg:${ch.id}`, p }))),
  ...LEITSYMPTOM_KATEGORIEN.flatMap((k) => aktuellChapterFor(k).questions.map((p) => ({ where: `akt:${k}`, p }))),
  ...FACHANAMNESEN.flatMap((f) => f.chapter.questions.map((p) => ({ where: `fach:${f.specialty}`, p }))),
].filter(({ p }) => phraseProbes(p).length > 0);

export const SUCHT_TABLES: SuchtTables = {
  probes: PROBE_BY_ID, sucht: PROBE_SUCHT, signes: SIGNES, phrases: catalogue(), lire: symptomsInText,
};

/** Les signes déclarés + les signes plus grossiers qu'ils affinent (`SIGNE_AFFINE`). */
const couvert = (decl: readonly string[]): Set<string> => new Set(decl.flatMap((x) => [x, ...(SIGNE_AFFINE[x as Signe] ?? [])]));

export function suchtIncoherences(t: SuchtTables = SUCHT_TABLES): string[] {
  const bad: string[] = [];
  const known = new Set<string>(t.signes);
  for (const id of Object.keys(t.probes)) {
    const s = t.sucht[id];
    if (!s?.length) bad.push(`INV-79 : la sonde « ${id} » ne déclare aucun sucht`);
  }
  for (const [id, s] of Object.entries(t.sucht)) {
    if (!(id in t.probes)) bad.push(`INV-79 : PROBE_SUCHT déclare « ${id} », qui n'est pas une sonde`);
    for (const x of s) if (!known.has(x)) bad.push(`INV-79 : PROBE_SUCHT[${id}] cherche « ${x} », qui n'est pas un signe`);
  }
  for (const { where, p } of t.phrases) {
    if (typeof p === 'string') continue;
    const id = phraseProbes(p)[0];
    // ce que la phrase déclare : son énumération, sinon les signes de ses sondes (la table réelle ou celle qu'on abîme)
    const decl = couvert(p.sucht ?? p.enumere ?? [...new Set(phraseProbes(p).flatMap((id) => t.sucht[id] ?? []))]);
    for (const x of p.enumere ?? []) if (!known.has(x)) bad.push(`INV-79 : ${id} (${where}) énumère « ${x} », qui n'est pas un signe`);
    const fu = phraseFollowUps(p);
    if ((p.followUpSucht?.length ?? 0) > (p.followUp?.length ?? 0)) bad.push(`INV-79 : ${id} (${where}) a plus de followUpSucht que de followUp`);
    const dimension = [...decl].some((x) => DIMENSIONS.has(x));
    // la mère : ce que le texte nomme (et ses variantes équivalentes) doit être déclaré
    const lus = new Set([phraseText(p), ...phraseAlts(p)].flatMap(t.lire));
    const manque = [...lus].filter((x) => !decl.has(x));
    if (!dimension && manque.length && !p.relu) bad.push(`INV-79 : ${id} (${where}) nomme [${manque.join(', ')}] sans le déclarer (sucht) ni poser relu`);
    // Revue K1 I-3 : 2 signes ou plus nommés dans UN texte (la mère OU une variante) = une énumération ; `relu`
    // n'y couvre aucun manque (D1). Il ne vaut que pour une mention unique.
    const enumere = [phraseText(p), ...phraseAlts(p)].some((x) => t.lire(x).length >= 2 && t.lire(x).some((y) => !decl.has(y)));
    if (p.relu && !dimension && (manque.length >= 2 || (manque.length && enumere))) bad.push(`INV-79 : ${id} (${where}) pose relu sur une énumération [${manque.join(', ')}] — D1 : déclarer chaque signe nommé`);
    fu.forEach((l, i) => {
      const cond = /^Falls\s+[^:]{2,40}:/.test(l.text);
      if (l.sucht) {
        for (const x of l.sucht) if (!known.has(x)) bad.push(`INV-79 : ${id} (${where}) relance ${i} cherche « ${x} », qui n'est pas un signe`);
        if (cond) bad.push(`INV-84 : ${id} (${where}) relance conditionnelle ${i} « ${l.text.slice(0, 50)}… » cherche un autre signe [${l.sucht.join(', ')}] que sa mère`);
      }
      const propres = l.sucht ? couvert(l.sucht) : decl;
      const brut = t.lire(l.text.replace(/^Falls\s+[^:]{2,40}:\s*/, ''));
      const lu = brut.filter((x) => !propres.has(x) && !decl.has(x));
      if (lu.length && !dimension && !p.relu) bad.push(`INV-79 : ${id} (${where}) relance ${i} nomme [${lu.join(', ')}] hors de son signe — la déclarer (followUpSucht) ou poser relu`);
      if (lu.length && !dimension && p.relu && brut.length >= 2) bad.push(`INV-79 : ${id} (${where}) relance ${i} pose relu sur une énumération [${brut.join(', ')}] — D1 : la déclarer (followUpSucht)`);
    });
  }
  return bad;
}
export type { Signe };
