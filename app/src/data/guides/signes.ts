import type { LeitsymptomKategorie } from '@/db/types';
import type { KapitelId } from '@/lib/checklists';
import { PROBE_BY_ID } from './anamneseProbes';
import { DEFS, type Signe } from './signesDefs';
import { PROBE_SUCHT } from './probeSucht';

export type { Signe };

// ============================================================================
// LE LEXIQUE DE SIGNES — lot K0 du moteur de cohérence (ADR-0023,
// `docs/contracts/frage-atomique.md` §10.1). Réexporté par `symptoms.ts` :
// il n'y a qu'un lexique, ce fichier n'en est que la moitié déclarative.
//
// Depuis K3, le montage (`cohere`, coherence.ts) lit ces tables : r1 (pertinence, exclusions), r3 (banques), règle
// d'insertion (ordre de `SIGNES`, chapitre de chaque signe). Elles sont aussi mesurées (`scripts/checkCoherence.mjs`) et vérifiées (`lexiqueIncoherences`, INV-77 / INV-78). Les définitions
// vivent dans `signesDefs.ts` (`Signe` en est dérivé), la déclaration des sondes dans `probeSucht.ts` (K1).
//
// RÈGLE D'IDENTITÉ (opposable). Deux unités cherchent le même signe si et
// seulement si la fiche y répondrait par la même réplique. Une unité = une
// question mère et ses relances de précision (la règle ne joue qu'entre unités).
//   (a) granularité : une autre réplique = un autre signe (`stuhl` ≠ `stuhlfrequenz`) ;
//   (b) même signe, autres mots : « Wie lange sind Sie morgens steif » = « Morgensteifigkeit » ;
//   (c) D1 : une énumération cherche CHAQUE signe qu'elle nomme ;
//   (d) une dimension dont l'objet est le motif cherche la dimension :
//       « Seit wann haben Sie Fieber ? » cherche `beginn`, pas `fieber` ;
//   (e) un antécédent ou un fait familial est un autre signe que le symptôme actuel ;
//   (f) les exemples d'un Auslöser (« — ein Essen, eine Reise ») ne sont pas demandés.
// ============================================================================

export type ProbeId = string;
/** Chapitre où se cherche un signe. `fach` n'est pas un `KapitelId` (la Fach
 *  s'insère après `aktuell`, `playedTrame`) — écart au contrat §10.1, tracé au rapport K0. */
export type SigneKapitel = KapitelId | 'fach';

/** Les 10 natures de motif sont des tags (dérivés des données du cas) ; `hoden`
 *  est dérivé (§10.3) ; les autres sont DÉCLARÉS à la main, relus par spécialité.
 *  Liste fermée. Pas de tag de région : la région reste l'affaire de FACH_RULES. */
export type ProfilTag = LeitsymptomKategorie
  | 'hoden'                                  // douleur du testicule (dérivé de schmerz.ort)
  | 'diarrhoe' | 'reise' | 'fieber'          // la plainte comprend diarrhée / voyage / fièvre
  | 'dyspnoe' | 'husten' | 'gewichtsverlust' // dyspnée / toux / perte de poids déclarées
  | 'dysphagie' | 'hals'                     // trouble de déglutition ; terrain ORL / œsophage / neuro
  | 'gelenk' | 'arthritis' | 'steifigkeit'   // atteinte articulaire ; arthrite ; raideur
  | 'generalisiert'                          // douleur diffuse, non localisable
  | 'lyme' | 'meningitis'                    // soupçon borréliose / méningite
  | 'gicht' | 'stein'                        // goutte / lithiase
  | 'transit' | 'harn'                       // K3 (P1-5) : trouble du transit (obstipation) ; plainte urinaire ou rénale
  // K3 (revue clinique R1 / R2) : terrain d'une Fachanamnese qui pose le sang dans les selles (gastro, hémato, onco)
  // ou la nycturie (kardio : insuffisance cardiaque ; endo : polyurie) — déclarés sur les cas qui la jouent.
  | 'gastro' | 'haem' | 'onko' | 'kardio' | 'endo';

export const PROFIL_TAGS: readonly ProfilTag[] = [
  'schmerz', 'atemnot', 'allgemein', 'psychisch', 'neurologisch', 'nerven', 'infekt', 'veraenderung', 'ausscheidung', 'anfall',
  'hoden', 'diarrhoe', 'reise', 'fieber', 'dyspnoe', 'husten', 'gewichtsverlust', 'dysphagie', 'hals',
  'gelenk', 'arthritis', 'steifigkeit', 'generalisiert', 'lyme', 'meningitis', 'gicht', 'stein', 'transit', 'harn',
  'gastro', 'haem', 'onko', 'kardio', 'endo',
];

export interface SigneDefBody {
  kapitel: SigneKapitel;                      // chapitre où il se cherche (r3, r4a ; repli §10.4)
  /** `screening` = pertinent pour tout cas (une red flag, un signe du terrain) : r1 n'y touche jamais.
   *  Sinon : pertinent seulement si le profil porte l'un de ces tags. K0 ne gate que ce que la mesure
   *  de la spec gate ; l'affinage clinique (relecteur par spécialité) vient avec K2. */
  pertinence: 'screening' | [ProfilTag, ...ProfilTag[]];
  bank?: ProbeId;                             // sonde canonique mono-signe (r3)
}
export interface SigneDef extends SigneDefBody { id: Signe }

/** Ordre de déclaration = ordre de l'entretien (règle d'insertion, §10.4). */
export const SIGNES: readonly Signe[] = Object.keys(DEFS) as Signe[];
export const SIGNE_DEF = Object.fromEntries(SIGNES.map((id) => [id, { id, ...(DEFS[id] as SigneDefBody) }])) as Record<Signe, SigneDef>;

/** Signes exigés par un tag (r3 les ajoute depuis la banque si aucune unité ne les cherche). */
export const PROFIL_EXIGE: Record<ProfilTag, Signe[]> = {
  schmerz: ['ort', 'charakter', 'intensitaet'],          // D2 : aussi pour une douleur du premier symptôme d'un motif mixte
  diarrhoe: ['stuhlfrequenz', 'stuhl_blut'],   // K3 (P0-1) : le sang dans les selles ; l'aspect (stuhlaussehen) n'a plus de banque mono-signe (INV-77)
  reise: ['reise'], fieber: ['fieber'], dyspnoe: ['atemnot'], husten: ['husten'], gewichtsverlust: ['gewicht'],
  dysphagie: ['schluck'], arthritis: ['gelenke', 'gelenk_entzuendung'],
  atemnot: [], allgemein: [], psychisch: [], neurologisch: [], nerven: [], infekt: [], veraenderung: [], ausscheidung: [], anfall: [],
  hoden: [], hals: [], gelenk: [], steifigkeit: [], generalisiert: [], lyme: [], meningitis: [], gicht: [], stein: [], transit: [], harn: [],
  gastro: [], haem: [], onko: [], kardio: [], endo: [],
};

/** Signes qu'un tag exclut (jamais un signe de dépistage). */
export const PROFIL_EXCLUT: Partial<Record<ProfilTag, Signe[]>> = {
  generalisiert: ['ausstrahlung'],   // « keine, da generalisiert » : rien à irradier
};

/** Une sonde qui ne cherche PAS un signe sous un tag donné — règle générique, pas une exception par cas.
 *  « Strahlen sie in die Leiste aus » n'a pas d'antécédent pour une douleur du testicule
 *  (revue clinique C-1, anamneseChapters.ts) : l'exception testiculaire d'aujourd'hui, devenue règle. */
export const SUCHT_AUSSER: Partial<Record<ProbeId, Partial<Record<ProfilTag, Signe[]>>>> = {
  'fach-uro-flanke': { hoden: ['ausstrahlung'] },
};

/** Granularité : un signe AFFINÉ couvre le signe plus grossier que le texte lit (« Stuhlgang » dans « Wie oft haben Sie Stuhlgang ? »
 *  est `stuhlfrequenz`, pas `stuhl`). Sert la porte (INV-79, discordance) ; l'identité reste celle de la fiche. */
export const SIGNE_AFFINE: Partial<Record<Signe, readonly Signe[]>> = {
  stuhlfrequenz: ['stuhl'], stuhlaussehen: ['stuhl'], stuhl_blut: ['stuhl', 'blutung', 'stuhlaussehen'], miktion_frequenz: ['miktion'], nykturie: ['miktion'],
  // K4 : l'aspect des urines couvre le sang qu'on y cherche (« Falls Blut dabei war … ») ; le prurit GÉNÉRALISÉ (signe B, K3 § 8) affine la
  // démangeaison que lit le texte ; le sang dans le sperme est un saignement.
  urin_aspekt: ['miktion', 'blutung'], pruritus: ['juckreiz'], haematospermie: ['blutung'],
  // Revue K1 C5 : `blutung` est le signe que la LECTURE trouve ; chaque sonde déclare le saignement qu'elle cherche.
  blutungsneigung: ['blutung'], blutverlust: ['blutung'], vaginalblutung: ['blutung'], lokalblutung: ['blutung'],
  haemoptyse: ['blutung', 'husten'],   // « Blut beim Husten », « Husten Sie Blut ab ? »
  auswurf_aspekt: ['auswurf'], dpn: ['atemnot'],   // « Wachen Sie nachts mit Luftnot auf ? »
  // La crise de panique se décrit par ses signes (« mit Luftnot, Herzrasen ») : ils la définissent, ils ne sont pas
  // demandés comme plaintes (revue K1 C4). Porte seulement : la mesure ne les compte pas comme cherchés.
  panikattacke: ['angst', 'atemnot', 'herzrasen'],
};

/** Paires de discrimination (INV-78) : leurs `sucht` déclarés sont disjoints. Chaque lot qui touche le lexique en ajoute une. */
export const GRANULARITE_PAIRES: ReadonlyArray<readonly [ProbeId, ProbeId]> = [
  ['akt-ausscheid-was', 'akt-ausscheid-haeufigkeit'],   // stuhl ≠ stuhlfrequenz
  ['akt-ausscheid-haeufigkeit', 'akt-ausscheid-harn-haeufigkeit'],   // stuhlfrequenz ≠ miktion_frequenz (scission K1)
  ['akt-ausscheid-aussehen', 'akt-ausscheid-harn-aussehen'],         // stuhlaussehen ≠ urin_aspekt (scission K1)
  ['fach-endo-durst', 'fach-uro-miktion'],              // polyurie ≠ miktion (décision D4, série 3)
  ['fach-neuro-kraft', 'fach-haem-leistung'],           // schwaeche ≠ muedigkeit
  ['fach-neuro-sensibilitaet', 'fach-ortho-cauda'],     // taubheit ≠ sattel
  // Revue K1 : les saignements (C5), le crachat (C2), l'atopie (C1), la DPN.
  ['fach-haem-blutung', 'fach-haem-blutverlust'],       // blutungsneigung ≠ blutverlust
  ['fach-haem-blutung', 'fach-gyn-blutung'],            // blutungsneigung ≠ vaginalblutung
  ['fach-haem-blutung', 'akt-veraend-blutung'],         // blutungsneigung ≠ lokalblutung
  ['fach-gyn-blutung', 'akt-veraend-blutung'],          // vaginalblutung ≠ lokalblutung
  ['fach-pneumo-husten', 'fach-pneumo-auswurf'],        // auswurf ≠ auswurf_aspekt
  ['all-allergie', 'fach-pneumo-allergie'],             // allergie ≠ atopie
  ['akt-atemnot-nachts', 'fach-kardio-luft'],           // orthopnoe ≠ atemnot
];

export interface LexiqueTables {
  signes: readonly Signe[]; def: Record<Signe, SigneDef>; tags: readonly ProfilTag[];
  exige: Record<ProfilTag, Signe[]>; exclut: Partial<Record<ProfilTag, Signe[]>>;
  ausser: Partial<Record<ProbeId, Partial<Record<ProfilTag, Signe[]>>>>;
  sucht: Record<ProbeId, readonly Signe[]>; paires: ReadonlyArray<readonly [ProbeId, ProbeId]>;
  probes: Record<ProbeId, unknown>;
}
export const LEXIQUE: LexiqueTables = {
  signes: SIGNES, def: SIGNE_DEF, tags: PROFIL_TAGS, exige: PROFIL_EXIGE, exclut: PROFIL_EXCLUT,
  ausser: SUCHT_AUSSER, sucht: PROBE_SUCHT, paires: GRANULARITE_PAIRES, probes: PROBE_BY_ID,
};

/** Un signe est pertinent pour un tag s'il est de dépistage ou si le tag figure dans sa pertinence. */
export const pertinentPour = (d: SigneDef, tag: ProfilTag): boolean => d.pertinence === 'screening' || d.pertinence.includes(tag);

// ── Le profil clinique du cas (contrat §10.3, lot K2) ────────────────────────
/** Déclaré à la main et relu (`PatientSheet.profil`). La nature du motif et `hoden` se DÉRIVENT des données du cas :
 *  ils n'ont pas à figurer dans `tags`. `exclut` : signe NON screening → raison écrite. */
export interface Profil {
  tags: [ProfilTag, ...ProfilTag[]];
  exige?: Signe[];
  exclut?: Partial<Record<Signe, string>>;
}

/** Ce que `profilIncoherences` lit d'un cas : la nature (`leitsymptomOf`) et la fiche. */
export interface ProfilCas {
  id: string;
  kategorie: LeitsymptomKategorie;
  sheet: { profil?: Profil; schmerz?: { ort?: string }; aktuellSkip?: string[]; fachSkip?: string[] };
}

/** Tags effectifs (§10.3) : dérivés (nature, `hoden` lu sur schmerz.ort) ∪ déclarés. */
export const tagsEffectifs = (c: ProfilCas): ProfilTag[] =>
  [...new Set<ProfilTag>([c.kategorie, ...(/hoden|skrot/i.test(c.sheet.schmerz?.ort ?? '') ? ['hoden' as const] : []), ...(c.sheet.profil?.tags ?? [])])];

/** INV-80 : tout cas a un profil valide. Pure ; les tables sont un paramètre pour que les tests puissent les muter. */
export function profilIncoherences(cases: readonly ProfilCas[], t: LexiqueTables = LEXIQUE): string[] {
  const bad: string[] = [];
  for (const c of cases) {
    const p = c.sheet.profil;
    if (!p) { bad.push(`INV-80 : ${c.id} n'a pas de profil`); continue; }
    if (!p.tags?.length) bad.push(`INV-80 : ${c.id} — tags vides`);
    for (const g of p.tags ?? []) if (!t.tags.includes(g)) bad.push(`INV-80 : ${c.id} — tag inconnu « ${g} »`);
    const tags = tagsEffectifs(c);
    const exige = new Set<Signe>([...tags.flatMap((g) => t.exige[g] ?? []), ...(p.exige ?? [])]);
    const exclut = new Set<Signe>([...tags.flatMap((g) => t.exclut[g] ?? []), ...(Object.keys(p.exclut ?? {}) as Signe[])]);
    for (const [s, raison] of Object.entries(p.exclut ?? {})) {
      const d = t.def[s as Signe];
      if (!d) bad.push(`INV-80 : ${c.id} — exclut « ${s} », qui n'est pas un signe`);
      else if (d.pertinence === 'screening') bad.push(`INV-80 : ${c.id} — exclut « ${s} », signe de dépistage`);
      if (!raison?.trim()) bad.push(`INV-80 : ${c.id} — exclut « ${s} » sans raison`);
    }
    const skips = new Set([...(c.sheet.aktuellSkip ?? []), ...(c.sheet.fachSkip ?? [])]);
    for (const s of exige) {
      const d = t.def[s];
      if (!d) { bad.push(`INV-80 : ${c.id} — exige « ${s} », qui n'est pas un signe`); continue; }
      if (exclut.has(s)) bad.push(`INV-80 : ${c.id} — exige ET exclut « ${s} »`);
      if (!tags.some((g) => pertinentPour(d, g))) bad.push(`INV-80 : ${c.id} — exige « ${s} », pertinent seulement pour [${(d.pertinence as string[]).join(', ')}]`);
      if (!d.bank) { bad.push(`INV-80 : ${c.id} — exige « ${s} », sans banque`); continue; }
      if (skips.has(d.bank)) bad.push(`INV-80 : ${c.id} — exige « ${s} », dont la banque « ${d.bank} » est skippée`);
      if (tags.some((g) => t.ausser[d.bank!]?.[g]?.includes(s))) bad.push(`INV-80 : ${c.id} — exige « ${s} », que la banque « ${d.bank} » ne cherche pas sous ses tags (SUCHT_AUSSER)`);
    }
  }
  return bad;
}

/** INV-77 (lexique cohérent) et INV-78 (granularité) : la liste des incohérences, vide si le lexique tient.
 *  Pure ; les tables sont un paramètre pour que les tests puissent les muter. */
export function lexiqueIncoherences(t: LexiqueTables = LEXIQUE): string[] {
  const bad: string[] = [];
  const known = new Set<string>(t.signes);
  if (known.size !== t.signes.length) bad.push('SIGNES : un signe est déclaré deux fois');
  for (const s of t.signes) {
    const d = t.def[s];
    if (!d) { bad.push(`SIGNE_DEF : « ${s} » n'a pas de définition`); continue; }
    if (d.id !== s) bad.push(`SIGNE_DEF : « ${s} » porte l'id « ${d.id} »`);
    if (d.pertinence !== 'screening' && (!d.pertinence.length || d.pertinence.some((g) => !t.tags.includes(g)))) bad.push(`SIGNE_DEF : « ${s} » a une pertinence vide ou inconnue`);
    if (d.bank) {
      if (!(d.bank in t.probes)) bad.push(`SIGNE_DEF : la banque « ${d.bank} » de « ${s} » n'est pas une sonde`);
      const sucht = t.sucht[d.bank];
      if (!sucht || sucht.length !== 1 || sucht[0] !== s) bad.push(`INV-77 : la banque « ${d.bank} » de « ${s} » ne cherche pas exactement [${s}] (déclaré : [${(sucht ?? []).join(', ')}])`);
    }
  }
  for (const tag of t.tags) {
    if (!(tag in t.exige)) bad.push(`PROFIL_EXIGE : le tag « ${tag} » manque`);
    for (const s of t.exige[tag] ?? []) {
      const d = t.def[s];
      if (!d) { bad.push(`PROFIL_EXIGE[${tag}] : « ${s} » n'est pas un signe`); continue; }
      if (!d.bank) bad.push(`INV-77 : « ${s} » est exigé par « ${tag} » mais n'a pas de banque`);
      if (!pertinentPour(d, tag)) bad.push(`INV-77 : « ${tag} » exige « ${s} », qui ne lui est pas pertinent`);
      if (t.exclut[tag]?.includes(s)) bad.push(`INV-77 : « ${tag} » exige ET exclut « ${s} »`);
    }
    for (const s of t.exclut[tag] ?? []) if (!t.def[s] || t.def[s].pertinence === 'screening') bad.push(`INV-77 : PROFIL_EXCLUT[${tag}] vise « ${s} », signe de dépistage ou inconnu`);
  }
  for (const [probe, sucht] of Object.entries(t.sucht)) {
    if (!(probe in t.probes)) bad.push(`PROBE_SUCHT : « ${probe} » n'est pas une sonde`);
    for (const s of sucht) if (!known.has(s)) bad.push(`PROBE_SUCHT[${probe}] : « ${s} » n'est pas un signe`);
  }
  for (const [probe, byTag] of Object.entries(t.ausser)) for (const [tag, signes] of Object.entries(byTag ?? {})) for (const s of signes ?? []) {
    if (!t.tags.includes(tag as ProfilTag)) bad.push(`SUCHT_AUSSER[${probe}] : tag « ${tag} » inconnu`);
    if (!t.sucht[probe]?.includes(s)) bad.push(`SUCHT_AUSSER[${probe}][${tag}] : la sonde ne cherche pas « ${s} »`);
  }
  for (const [a, b] of t.paires) {
    const shared = (t.sucht[a] ?? []).filter((s) => (t.sucht[b] ?? []).includes(s));
    if (!t.sucht[a] || !t.sucht[b]) bad.push(`INV-78 : la paire ${a} / ${b} n'est pas déclarée`);
    else if (shared.length) bad.push(`INV-78 : ${a} et ${b} cherchent tous deux [${shared.join(', ')}]`);
  }
  return bad;
}
