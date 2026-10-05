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
  parts?: Array<{ sucht: string[]; text: string; followUp?: string[]; followUpSucht?: string[][] }>;
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
