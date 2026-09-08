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
}

export type Phrase = string | PhraseVariant;

export const phraseText = (p: Phrase): string => (typeof p === 'string' ? p : p.text);
export const phraseAlts = (p: Phrase): string[] => (typeof p === 'string' ? [] : p.alts ?? []);
export const phraseFollowUp = (p: Phrase): string[] => (typeof p === 'string' ? [] : p.followUp ?? []);
export const phraseLabel = (p: Phrase): string | undefined => (typeof p === 'string' ? undefined : p.label);
export const phraseProbes = (p: Phrase): string[] => (typeof p === 'string' || !p.probe ? [] : Array.isArray(p.probe) ? p.probe : [p.probe]);
