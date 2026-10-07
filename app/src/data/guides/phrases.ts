// ============================================================================
// Modèle « Phrase » partagé par les guides (Anamnese, Fallvorstellung,
// Arztbrief). Une phrase peut être une simple chaîne, ou un objet riche :
//  • alts     : formulations ÉQUIVALENTES (registre identique) — l'utilisateur
//               en choisit une ; l'UI les présente repliées derrière un toggle.
//  • followUp : relances conditionnelles (« Falls ja : … ») — affichées en
//               retrait sous la question principale.
//  • label    : étiquette de groupe (ex. « Nichtraucher », « Ex-Raucher »)
//               quand plusieurs phrases couvrent des situations différentes.
// ============================================================================

export interface PhraseVariant {
  text: string;
  alts?: string[];
  followUp?: string[];
  label?: string;
  /** Sonde(s) d'anamnèse que cette question sert : UNE = question simple ;
   *  PLUSIEURS = question progressive (chaque sonde est une étape, avec sa
   *  question canonique et sa réponse déjà authorée dans la fiche patient). */
  probe?: string | string[];
  /** Question propre au cas joué, insérée dans son sous-chapitre (FB2-J4) :
   *  rendue avec le marqueur « Für diesen Fall ». */
  caseSpecific?: boolean;
  /** Décomposition par symptôme cherché (FB2-J10) : quand une partie de la
   *  question a déjà été posée plus haut dans la trame du cas, seules les
   *  parties restantes sont affichées — texte rédigé à la main pour chacune. */
  parts?: Array<{ sucht: string[]; text: string; followUp?: string[]; followUpSucht?: string[][]; braucht?: string[] }>;   // K3 : une part peut présupposer un signe (r4b)
  /** Symptômes que cette phrase cherche, quand la carte des sondes ne suffit
   *  pas : posé par la modulation (ce qui reste d'une question réduite) ou
   *  explicitement sur une question du cas. */
  sucht?: string[];
  /** K1 (contrat §10.2, I9) — signes de CHAQUE relance, parallèle à `followUp` : entrée absente ou `[]` = précision,
   *  elle hérite des signes de sa mère ; sinon la relance cherche un autre signe et devient une unité à part. */
  followUpSucht?: string[][];
  /** K1 — signes que CETTE variante énumère au-delà de sa sonde (D1 : une énumération cherche chaque signe qu'elle
   *  nomme ; `akt-begleit` énumère autre chose selon la nature du motif). Lu par la porte ; le montage l'ignore jusqu'à K3. */
  enumere?: string[];
  /** K1 — discordance voulue (contrat §10.2) : le texte nomme un signe absent de `sucht` sans l'interroger
   *  (un exemple de réaction allergique). Jamais sur une énumération : la porte le refuse. */
  relu?: boolean;
  /** K3 — signes que la question présuppose (r4b : jamais posée avant la question qui les cherche). Déclaré en K4. */
  braucht?: string[];
  /** K3 — relance détachée de sa mère par r4a (elle cherche un autre signe) : son identifiant `<mère>#<n>`. */
  detacheDe?: string;
  /** Lot Banque (r5) — signes que la RÉPLIQUE à cette question a dits, et qu'une question de banque plus loin ne redemande plus.
   *  Comptés dans `sucht` (un signe reste cherché une fois : r2, r3, la porte), mais le texte ne les demande pas. */
  porte?: string[];
}

export type Phrase = string | PhraseVariant;

export const phraseText = (p: Phrase): string => (typeof p === 'string' ? p : p.text);
export const phraseAlts = (p: Phrase): string[] => (typeof p === 'string' ? [] : p.alts ?? []);
/** Une relance et, si elle cherche un autre signe que sa mère, ce signe (`sucht` absent = précision). */
export interface FollowUpLine { text: string; sucht?: string[] }
/** Le point de lecture des relances (I9, m13) : texte + signes déclarés. `phraseFollowUp` n'en garde que le texte. */
export const phraseFollowUps = (p: Phrase): FollowUpLine[] =>
  typeof p === 'string' ? [] : (p.followUp ?? []).map((text, i) => {
    const sucht = p.followUpSucht?.[i];
    return sucht?.length ? { text, sucht } : { text };
  });
export const phraseFollowUp = (p: Phrase): string[] => phraseFollowUps(p).map((l) => l.text);
export const phraseLabel = (p: Phrase): string | undefined => (typeof p === 'string' ? undefined : p.label);
export const phraseIsCaseSpecific = (p: Phrase): boolean => typeof p !== 'string' && !!p.caseSpecific;
export const phraseProbes = (p: Phrase): string[] => (typeof p === 'string' || !p.probe ? [] : Array.isArray(p.probe) ? p.probe : [p.probe]);

/** « Beginn — Seit wann … » : la DIMENSION d'analyse en tête de question
 *  (Beginn, Verlauf, Herd, Frühere Episoden…) rendue comme une étiquette, pas
 *  noyée dans le texte (FB2-J12). Une tête = un à trois mots, nominale ; une
 *  question qui commence par un verbe ou un interrogatif n'en est pas une. */
const DIM_RE = /^([A-ZÄÖÜ][a-zäöüß]+(?: (?:und|des|der) [A-ZÄÖÜa-zäöüß]+| [A-ZÄÖÜ][a-zäöüß]+)?) — (.+)$/s;
const NOT_DIM = /^(Wie|Was|Wo|Wann|Gab|Haben|Hatten|Hat|Sind|Waren|Welche|Strahlen|Nehmen|Arbeiten|Können|Müssen|Tritt|Treten|Ist|Kam|Kamen|Bekommen|Fühlen|Leiden|Denken|Wurden|Besteht)\b/;
export function splitDimension(text: string): { dim?: string; body: string } {
  const m = DIM_RE.exec(text);
  if (!m || NOT_DIM.test(m[1])) return { body: text };
  return { dim: m[1], body: m[2] };
}

/** Garde-fou K4 (relecture de langue, décision de main) : une `part` peut devenir la question d'ouverture quand celles
 *  qui la précèdent sont retirées (`coherence.ts`, rendu des parts) — elle doit donc se dire SEULE. Autonome =
 *  (1) elle s'ouvre sur un interrogatif (« Wie… », « Seit wann… ») ou sur un verbe conjugué de `PART_VERBES` ;
 *  (2) elle ne commence pas par « und / oder / dabei / dazu… » ; (3) pas d'anaphore « sie / es » en tête.
 *  ponytail: verbe conjugué = liste fermée des verbes d'ouverture ; une part qui s'ouvre sur un verbe nouveau échoue
 *  et l'auteur l'ajoute ici (revu). Le « es » impersonnel après le verbe (« Brennt es… ») n'est pas distingué. */
const PART_VERBES = new Set(('ist sind war waren hat haben hatte hatten wird werden wurde wurden kann können konnten muss müssen '
  + 'mussten darf dürfen gibt gab geht gehen ging kommt kommen kam kamen tut tritt treten nehmen leiden fühlen bekommen '
  + 'strahlen wandern heilen sehen brennt schwitzen wachen trinken rauchen essen leben wohnen arbeiten verwenden vertragen '
  + 'empfinden klagt erinnern blutet juckt lassen bleiben wechseln').split(' '));   // lot Banque : + lassen, bleiben, wechseln (relances ouvertes par r5)
const PART_INTERROG = /^(wie|was|wann|wo|woher|wohin|welche[rnms]?|wer|wem|wen|warum|weshalb|wieso|wodurch|womit|wovon|wofür|wozu)$/;
const PART_PREP = /^(ab|an|auf|aus|bei|für|in|mit|nach|seit|über|um|unter|von|vor|zu)$/;   // lot Banque : + ab (« Ab welcher Belastung …? »)
const PART_LIEN = /^(und|oder|dabei|dazu|auch|sonst)$/;
/** Les parts « relance seulement » : elles ne se disent qu'après leur mère (« Und… », « Falls …: »). Elles ne sont pas
 *  autonomes et ne doivent JAMAIS ouvrir une question jouée (`partsOuvertureFautes`, anamneseChapters.ts). */
export const PART_RELANCE_SEULE: ReadonlySet<string> = new Set([
  'Und beim Gehen — sind Sie schon gestürzt?',                                              // akt-nerven-alltag, après la motricité fine
  'Falls ein üppiges Essen: Gab es viel Fleisch oder Alkohol, besonders Bier?',             // fach-rheuma-ausloeser, part goutte
]);
export function partNonAutonome(text: string): string | undefined {
  const w = splitDimension(text).body.replace(/[?!.,:;()«»„“"]/g, ' ').split(/\s+/).filter(Boolean);
  const f = (w[0] ?? '').toLowerCase();
  if (PART_LIEN.test(f)) return `commence par « ${w[0]} » sans référent`;
  if (f === 'es' || f === 'sie' || w[1] === 'sie' || w[2] === 'sie') return 'anaphore « sie / es » en tête';
  if (PART_INTERROG.test(f) || (PART_PREP.test(f) && PART_INTERROG.test((w[1] ?? '').toLowerCase()))) return undefined;
  return PART_VERBES.has(f) ? undefined : `ne s'ouvre ni sur un verbe conjugué ni sur un interrogatif (« ${w[0] ?? ''} »)`;
}
