import type { LeitsymptomKategorie } from '@/db/types';
import type { KapitelId } from '@/lib/checklists';
import { PROBE_BY_ID } from './anamneseProbes';

// ============================================================================
// LE LEXIQUE DE SIGNES — lot K0 du moteur de cohérence (ADR-0023,
// `docs/contracts/frage-atomique.md` §10.1). Réexporté par `symptoms.ts` :
// il n'y a qu'un lexique, ce fichier n'en est que la moitié déclarative.
//
// K0 ne branche RIEN sur le montage : ni `dedupeBySymptom`, ni `PROBE_SUCHT`
// ne lisent ces tables. Elles sont mesurées (`scripts/checkCoherence.mjs`) et
// vérifiées (`lexiqueIncoherences`, INV-77 / INV-78). Le branchement est K3.
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

export type Signe =
  // les 11 dimensions de plainte, dans l'ordre de l'entretien
  | 'ort' | 'beginn' | 'charakter' | 'intensitaet' | 'ausstrahlung' | 'verlauf'
  | 'ausloeser' | 'einfluss' | 'frueher' | 'begleit' | 'gelenke'
  // les 39 concepts d'origine (série 3). Les frontières fines (schwaeche ≠ fatigue,
  // taubheit ≠ anesthésie en selle, polyurie ≠ miktion…) sont commentées dans symptoms.ts.
  | 'fieber' | 'schuettelfrost' | 'nachtschweiss' | 'reise' | 'kontakt'
  | 'uebelkeit' | 'stuhl' | 'miktion' | 'gewicht' | 'appetit' | 'schlaf'
  | 'husten' | 'oedeme' | 'orthopnoe' | 'blutung' | 'schwindel'
  | 'kopfschmerz' | 'atemnot' | 'brustschmerz' | 'bewusstlos' | 'sehstoerung'
  | 'krampf' | 'taubheit' | 'schwaeche' | 'herzrasen' | 'schwitzen'
  | 'durst' | 'juckreiz' | 'ausschlag' | 'schluck' | 'gelbfaerbung'
  | 'sturz' | 'stimmung' | 'angst' | 'suizid' | 'gedaechtnis' | 'polyurie'
  | 'schub' | 'waerme'
  // --- ajoutés par K0 (liste fermée ; chaque ajout est commenté) ------------
  | 'stuhlfrequenz'        // « wie oft » — ≠ `stuhl` (ce qui a changé) : autre réplique de la fiche
  | 'stuhlaussehen'        // Farbe, Blut, Schleim, Konsistenz du selle
  | 'nykturie'             // Wasserlassen nachts
  | 'inkontinenz'          // Einnässen, Urinverlust
  | 'urin_aspekt'          // Farbe, Blut, Schaum de l'urine
  | 'steifigkeit'          // Morgensteifigkeit, Dauer
  | 'gelenk_entzuendung'   // geschwollen / gerötet / überwärmt (une articulation)
  | 'gicht'                // antécédent de Gichtanfall — autre signe que l'arthrite actuelle (e)
  | 'nierensteine'         // antécédent lithiasique
  | 'essen_expo'           // ce qui a été mangé / bu (exposition alimentaire)
  | 'zecke' | 'erythem_ring' | 'meningismus' | 'fazialis'   // gabarit borréliose de la Fach Infekt
  | 'familie_rheuma'       // Rheuma / Gicht dans la famille (chapitre Familie, (e))
  | 'konzentration'        // Konzentration, Wortfindung
  | 'nitro'                // réponse au Nitro (Angina pectoris)
  | 'muedigkeit'           // fatigue générale — ≠ `schwaeche` (déficit moteur focal), INV-78
  | 'sattel';              // Reithosenanästhesie — ≠ `taubheit` d'un membre, INV-78

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
  | 'gicht' | 'stein';                       // goutte / lithiase

export const PROFIL_TAGS: readonly ProfilTag[] = [
  'schmerz', 'atemnot', 'allgemein', 'psychisch', 'neurologisch', 'nerven', 'infekt', 'veraenderung', 'ausscheidung', 'anfall',
  'hoden', 'diarrhoe', 'reise', 'fieber', 'dyspnoe', 'husten', 'gewichtsverlust', 'dysphagie', 'hals',
  'gelenk', 'arthritis', 'steifigkeit', 'generalisiert', 'lyme', 'meningitis', 'gicht', 'stein',
];

export interface SigneDef {
  id: Signe;
  kapitel: SigneKapitel;                      // chapitre où il se cherche (r3, r4a ; repli §10.4)
  /** `screening` = pertinent pour tout cas (une red flag, un signe du terrain) : r1 n'y touche jamais.
   *  Sinon : pertinent seulement si le profil porte l'un de ces tags. K0 ne gate que ce que la mesure
   *  de la spec gate ; l'affinage clinique (relecteur par spécialité) vient avec K1/K2. */
  pertinence: 'screening' | [ProfilTag, ...ProfilTag[]];
  bank?: ProbeId;                             // sonde canonique mono-signe (r3)
}

const S = 'screening' as const;
const DEFS: Record<Signe, Omit<SigneDef, 'id'>> = {
  // --- les dimensions : l'ordre de l'entretien --------------------------------
  ort: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ort' },
  beginn: { kapitel: 'aktuell', pertinence: S, bank: 'akt-beginn' },
  charakter: { kapitel: 'aktuell', pertinence: S, bank: 'akt-charakter' },
  intensitaet: { kapitel: 'aktuell', pertinence: S, bank: 'akt-intensitaet' },
  ausstrahlung: { kapitel: 'aktuell', pertinence: ['schmerz', 'anfall', 'neurologisch', 'nerven'], bank: 'akt-ausstrahlung' },
  verlauf: { kapitel: 'aktuell', pertinence: S, bank: 'akt-verlauf' },
  ausloeser: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ausloeser' },
  einfluss: { kapitel: 'aktuell', pertinence: S, bank: 'akt-einfluss' },
  frueher: { kapitel: 'aktuell', pertinence: S, bank: 'akt-frueher' },
  begleit: { kapitel: 'aktuell', pertinence: S, bank: 'akt-begleit' },
  gelenke: { kapitel: 'fach', pertinence: ['gelenk', 'arthritis'], bank: 'fach-rheuma-gelenke' },
  // --- Aktuelle Beschwerden ---------------------------------------------------
  fieber: { kapitel: 'aktuell', pertinence: S, bank: 'akt-infekt-fieber' },
  atemnot: { kapitel: 'aktuell', pertinence: S, bank: 'akt-atemnot-belastung' },
  husten: { kapitel: 'aktuell', pertinence: S, bank: 'akt-atemnot-husten' },
  orthopnoe: { kapitel: 'aktuell', pertinence: S },
  kopfschmerz: { kapitel: 'aktuell', pertinence: S },
  schwindel: { kapitel: 'aktuell', pertinence: S },
  bewusstlos: { kapitel: 'aktuell', pertinence: S },
  sturz: { kapitel: 'aktuell', pertinence: S },
  taubheit: { kapitel: 'aktuell', pertinence: S },
  schwaeche: { kapitel: 'aktuell', pertinence: S },
  muedigkeit: { kapitel: 'aktuell', pertinence: S },
  oedeme: { kapitel: 'aktuell', pertinence: S },
  blutung: { kapitel: 'aktuell', pertinence: S },
  stuhlfrequenz: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ausscheid-haeufigkeit' },
  stuhlaussehen: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ausscheid-aussehen' },
  nykturie: { kapitel: 'aktuell', pertinence: S },
  schluck: { kapitel: 'aktuell', pertinence: ['dysphagie', 'hals'], bank: 'akt-ausscheid-schlucken' },
  gelbfaerbung: { kapitel: 'aktuell', pertinence: S },
  stimmung: { kapitel: 'aktuell', pertinence: S },
  suizid: { kapitel: 'aktuell', pertinence: S },
  // --- Fachanamnese -----------------------------------------------------------
  reise: { kapitel: 'fach', pertinence: S, bank: 'fach-infekt-reise' },
  kontakt: { kapitel: 'fach', pertinence: S },
  zecke: { kapitel: 'fach', pertinence: ['lyme'] },
  erythem_ring: { kapitel: 'fach', pertinence: ['lyme'] },
  meningismus: { kapitel: 'fach', pertinence: ['meningitis', 'lyme'] },
  fazialis: { kapitel: 'fach', pertinence: ['lyme'] },
  steifigkeit: { kapitel: 'fach', pertinence: ['steifigkeit'], bank: 'fach-rheuma-morgensteifigkeit' },
  gelenk_entzuendung: { kapitel: 'fach', pertinence: ['gelenk', 'arthritis'], bank: 'fach-rheuma-entzuendung' },
  gicht: { kapitel: 'fach', pertinence: ['gicht'] },
  nierensteine: { kapitel: 'fach', pertinence: ['stein', 'gicht'] },
  essen_expo: { kapitel: 'fach', pertinence: S },
  brustschmerz: { kapitel: 'fach', pertinence: S },
  herzrasen: { kapitel: 'fach', pertinence: S },
  nitro: { kapitel: 'fach', pertinence: S },
  sehstoerung: { kapitel: 'fach', pertinence: S },
  krampf: { kapitel: 'fach', pertinence: S },
  schub: { kapitel: 'fach', pertinence: S },
  waerme: { kapitel: 'fach', pertinence: S },
  sattel: { kapitel: 'fach', pertinence: S },
  inkontinenz: { kapitel: 'fach', pertinence: S },
  urin_aspekt: { kapitel: 'fach', pertinence: S },
  polyurie: { kapitel: 'fach', pertinence: S },
  durst: { kapitel: 'fach', pertinence: S },
  juckreiz: { kapitel: 'fach', pertinence: S },
  ausschlag: { kapitel: 'fach', pertinence: S },
  angst: { kapitel: 'fach', pertinence: S },
  konzentration: { kapitel: 'fach', pertinence: S },
  gedaechtnis: { kapitel: 'fach', pertinence: S },
  // --- Vegetative Anamnese ----------------------------------------------------
  schuettelfrost: { kapitel: 'vegetativ', pertinence: S },
  nachtschweiss: { kapitel: 'vegetativ', pertinence: S },
  schwitzen: { kapitel: 'vegetativ', pertinence: S },
  uebelkeit: { kapitel: 'vegetativ', pertinence: S },
  stuhl: { kapitel: 'vegetativ', pertinence: S },
  miktion: { kapitel: 'vegetativ', pertinence: S },
  gewicht: { kapitel: 'vegetativ', pertinence: S, bank: 'veg-gewicht' },
  appetit: { kapitel: 'vegetativ', pertinence: S },
  schlaf: { kapitel: 'vegetativ', pertinence: S },
  // --- Familie ----------------------------------------------------------------
  familie_rheuma: { kapitel: 'familie-sozial', pertinence: ['gelenk', 'arthritis'] },
};

/** Ordre de déclaration = ordre de l'entretien (règle d'insertion, §10.4). */
export const SIGNES: readonly Signe[] = Object.keys(DEFS) as Signe[];
export const SIGNE_DEF = Object.fromEntries(SIGNES.map((id) => [id, { id, ...DEFS[id] }])) as Record<Signe, SigneDef>;

/** Signes exigés par un tag (r3 les ajoute depuis la banque si aucune unité ne les cherche). */
export const PROFIL_EXIGE: Record<ProfilTag, Signe[]> = {
  schmerz: ['ort', 'charakter', 'intensitaet'],          // D2 : aussi pour une douleur du premier symptôme d'un motif mixte
  diarrhoe: ['stuhlfrequenz', 'stuhlaussehen'],
  reise: ['reise'], fieber: ['fieber'], dyspnoe: ['atemnot'], husten: ['husten'], gewichtsverlust: ['gewicht'],
  dysphagie: ['schluck'], arthritis: ['gelenke', 'gelenk_entzuendung'],
  atemnot: [], allgemein: [], psychisch: [], neurologisch: [], nerven: [], infekt: [], veraenderung: [], ausscheidung: [], anfall: [],
  hoden: [], hals: [], gelenk: [], steifigkeit: [], generalisiert: [], lyme: [], meningitis: [], gicht: [], stein: [],
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

/** Déclarations de `sucht` dans le lexique AFFINÉ, pour les sondes que K0 doit trancher : les banques
 *  (r3 en insère une, elle ne cherche que son signe) et les paires de granularité (INV-78).
 *  `PROBE_SUCHT` (symptoms.ts) reste celle du montage jusqu'à K3 ; K1 la rend totale et absorbe cette table.
 *  OUVERT pour K1 : `akt-ausscheid-haeufigkeit` (« auf die Toilette ») cherche aussi la fréquence
 *  mictionnelle d'un cas d'urologie ; ici elle est la banque de `stuhlfrequenz` (diarrhée). */
export const SUCHT_AFFINE: Record<ProbeId, Signe[]> = {
  // banques
  'akt-ort': ['ort'], 'akt-beginn': ['beginn'], 'akt-charakter': ['charakter'], 'akt-intensitaet': ['intensitaet'],
  'akt-ausstrahlung': ['ausstrahlung'], 'akt-verlauf': ['verlauf'], 'akt-ausloeser': ['ausloeser'],
  'akt-einfluss': ['einfluss'], 'akt-frueher': ['frueher'], 'akt-begleit': ['begleit'],
  'fach-rheuma-gelenke': ['gelenke'], 'fach-rheuma-morgensteifigkeit': ['steifigkeit'], 'fach-rheuma-entzuendung': ['gelenk_entzuendung'],
  'akt-infekt-fieber': ['fieber'], 'fach-infekt-reise': ['reise'], 'akt-atemnot-belastung': ['atemnot'], 'akt-atemnot-husten': ['husten'],
  'akt-ausscheid-haeufigkeit': ['stuhlfrequenz'], 'akt-ausscheid-aussehen': ['stuhlaussehen'], 'akt-ausscheid-schlucken': ['schluck'],
  'veg-gewicht': ['gewicht'],
  // paires de granularité (INV-78) et cible de SUCHT_AUSSER
  'akt-ausscheid-was': ['stuhl', 'miktion'],
  'fach-endo-durst': ['durst', 'polyurie'], 'fach-uro-miktion': ['miktion'],
  'fach-neuro-kraft': ['schwaeche'], 'fach-haem-leistung': ['muedigkeit'],
  'fach-neuro-sensibilitaet': ['taubheit'], 'fach-ortho-cauda': ['sattel', 'miktion', 'stuhl'],
  'fach-uro-flanke': ['ort', 'ausstrahlung'],
};

/** Paires de discrimination (INV-78) : leurs `sucht` déclarés sont disjoints. Chaque lot qui touche le lexique en ajoute une. */
export const GRANULARITE_PAIRES: ReadonlyArray<readonly [ProbeId, ProbeId]> = [
  ['akt-ausscheid-was', 'akt-ausscheid-haeufigkeit'],   // stuhl ≠ stuhlfrequenz
  ['fach-endo-durst', 'fach-uro-miktion'],              // polyurie ≠ miktion (décision D4, série 3)
  ['fach-neuro-kraft', 'fach-haem-leistung'],           // schwaeche ≠ muedigkeit
  ['fach-neuro-sensibilitaet', 'fach-ortho-cauda'],     // taubheit ≠ sattel
];

export interface LexiqueTables {
  signes: readonly Signe[]; def: Record<Signe, SigneDef>; tags: readonly ProfilTag[];
  exige: Record<ProfilTag, Signe[]>; exclut: Partial<Record<ProfilTag, Signe[]>>;
  ausser: Partial<Record<ProbeId, Partial<Record<ProfilTag, Signe[]>>>>;
  affine: Record<ProbeId, Signe[]>; paires: ReadonlyArray<readonly [ProbeId, ProbeId]>;
  probes: Record<ProbeId, unknown>;
}
export const LEXIQUE: LexiqueTables = {
  signes: SIGNES, def: SIGNE_DEF, tags: PROFIL_TAGS, exige: PROFIL_EXIGE, exclut: PROFIL_EXCLUT,
  ausser: SUCHT_AUSSER, affine: SUCHT_AFFINE, paires: GRANULARITE_PAIRES, probes: PROBE_BY_ID,
};

/** Un signe est pertinent pour un tag s'il est de dépistage ou si le tag figure dans sa pertinence. */
export const pertinentPour = (d: SigneDef, tag: ProfilTag): boolean => d.pertinence === 'screening' || d.pertinence.includes(tag);

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
      const sucht = t.affine[d.bank];
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
  for (const [probe, sucht] of Object.entries(t.affine)) {
    if (!(probe in t.probes)) bad.push(`SUCHT_AFFINE : « ${probe} » n'est pas une sonde`);
    for (const s of sucht) if (!known.has(s)) bad.push(`SUCHT_AFFINE[${probe}] : « ${s} » n'est pas un signe`);
  }
  for (const [probe, byTag] of Object.entries(t.ausser)) for (const [tag, signes] of Object.entries(byTag ?? {})) for (const s of signes ?? []) {
    if (!t.tags.includes(tag as ProfilTag)) bad.push(`SUCHT_AUSSER[${probe}] : tag « ${tag} » inconnu`);
    if (!t.affine[probe]?.includes(s)) bad.push(`SUCHT_AUSSER[${probe}][${tag}] : la sonde ne cherche pas « ${s} »`);
  }
  for (const [a, b] of t.paires) {
    const shared = (t.affine[a] ?? []).filter((s) => (t.affine[b] ?? []).includes(s));
    if (!t.affine[a] || !t.affine[b]) bad.push(`INV-78 : la paire ${a} / ${b} n'est pas déclarée`);
    else if (shared.length) bad.push(`INV-78 : ${a} et ${b} cherchent tous deux [${shared.join(', ')}]`);
  }
  return bad;
}
