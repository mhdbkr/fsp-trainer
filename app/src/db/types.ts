import type { Symptom } from '../data/guides/symptoms';
// ============================================================================
// FSP-Cockpit — Modèle de données
// Toutes les entités sont reliées bidirectionnellement pour permettre
// l'interconnexion totale (cf. ANALYSE.md §5). Les IDs sont des slugs stables
// (string) pour que le seed et les imports restent lisibles et référençables.
// ============================================================================
// `import type` est effacé à la compilation : pas de cycle runtime même si
// targets.ts importe par ailleurs '@/db/db' (qui importe ces mêmes types).
import type { TargetId } from '@/lib/externalAi/targets';

/** Les 4 centres d'examen de la région Baden + un bucket "Complément" pour les
 *  cas classiques tombables ajoutés hors protocoles. */
export type Center = 'Freiburg' | 'Karlsruhe' | 'Reutlingen' | 'Stuttgart' | 'Complément';

/** Spécialités (alignées sur les colonnes du CSV Fachbegriffe + ODAK). */
export type Specialty =
  | 'Angiologie'
  | 'Kardiologie'
  | 'Pneumologie'
  | 'Gastroenterologie'
  | 'Nephrologie'
  | 'Urologie'
  | 'Neurologie'
  | 'Hämatologie'
  | 'Endokrinologie'
  | 'Rheumatologie'
  | 'Orthopädie'
  | 'Chirurgie'
  | 'Psychiatrie'
  | 'Infektiologie'
  | 'Dermatologie'
  | 'Gynäkologie'
  | 'Onkologie'
  | 'Anatomie'
  | 'Allgemein';

/** Les 6 axes de compétence — pilotent la heatmap et le scoring. */
export type Axis =
  | 'Anamnese'
  | 'Dokumentation'
  | 'Fallvorstellung'
  | 'Aufklärung'
  | 'Fachbegriffe'
  | 'Fachwissen';

export const AXES: Axis[] = [
  'Anamnese', 'Dokumentation', 'Fallvorstellung', 'Aufklärung', 'Fachbegriffe', 'Fachwissen',
];

export type CaseStatus = 'À faire' | 'En cours' | 'Maîtrisé';
export type Difficulty = 1 | 2 | 3; // 1 = accessible, 3 = piège/rare

// --- Itération 2 : niveaux d'assistance, couches, Muster-Bogen ---------------
/** Niveau d'assistance choisi en début de simulation. Autonome > Assisté pour
 *  le calcul du score (conditions plus proches du réel). */
export type AssistanceMode = 'assiste' | 'autonome';

/** Révision par couches : couche 1 = découverte (Assisté), 2-3 = consolidation
 *  (Autonome). La couche atteinte pondère le niveau. */
export type Layer = 1 | 2 | 3;

/** Muster-Bogen : le modèle de feuille de notes reproduit par ville
 *  (+ ODAK = modèle pédagogique complet). */
export type MusterCity = 'Standard' | 'Freiburg' | 'Karlsruhe' | 'Reutlingen' | 'Stuttgart';

/** [S4] Les deux Muster de la série 4 (simulation-run.md §10.6). Les villes se
 *  lisent par `musterArt()` (S4-3) ; ce type n'est ajouté ici que parce que
 *  `db/types.ts` est de la propriété de S4-1 (training-journal.md §12.12, m-d). */
export type MusterArt = 'guide' | 'libre';

// ----------------------------------------------------------------------------
// Fiche patient (jouable par le partenaire) — reproduit la structure réelle
// des protocoles (Personalia, Noxen, Vorerkrankungen…).
// ----------------------------------------------------------------------------
export interface PatientSheet {
  personalia: {
    name: string;
    age: number;
    geschlecht?: 'm' | 'w'; // pilote l'inclusion de la Frauenanamnese
    geburtsdatum?: string;
    groesseCm?: number;
    gewichtKg?: number;
    beruf?: string;
    hausarzt?: string;
    familienstand?: string;
    wohnsituation?: string; // Wohnung/Haus, Etage, Aufzug, mit wem
  };
  leitsymptome: string[];       // motif principal, formulé côté patient
  begleitsymptome: string[];
  /** Nature du motif de consultation : pilote la déclinaison du chapitre
   *  « Aktuelle Beschwerden » (FB2-J1). Absent = `schmerz` si un bloc
   *  `schmerz` existe ; sinon la porte CI refuse le cas. */
  leitsymptomKategorie?: LeitsymptomKategorie;
  /** Dimensions de la variante qui n'ont PAS de sens pour CE cas (ex.
   *  l'orthopnée pour un rhume des foins) : sondes retirées du guide, réponse
   *  non exigée. Explicite et relu, plutôt qu'un gabarit subi. */
  aktuellSkip?: string[];
  /** Sondes de la Fachanamnese qui n'ont PAS de sens pour CE cas (le grain de
   *  beauté pour un érysipèle) : retirées de la trame jouée ; la réponse reste
   *  exigée (le candidat peut la poser de lui-même) et chaque id appartient à
   *  la Fach jouée (checkProbeCoverage). Le résidu clinique que les règles par
   *  sexe/âge/motif ne voient pas. */
  fachSkip?: string[];
  /** Nature du motif que le texte ne permet pas de déduire (« ohne Sturz »
   *  piège toute regex) : traumatisme ou non, et région. Requis pour les cas
   *  qui jouent la Fach Ortho ; pilote les règles de Fach (série 3, L0). */
  motiv?: { trauma: boolean; region: 'obere' | 'untere' | 'lws' | 'bws' | 'hws' | 'thorax' | 'abdomen' };
  schmerz?: {                   // Schmerzanalyse pré-remplie si douleur
    ort?: string; charakter?: string; intensitaet?: number;
    ausstrahlung?: string; beginn?: string; verlauf?: string;
    verstaerker?: string; linderer?: string;
  };
  vegetativeAnamnese: string[]; // items positifs (Fieber, Gewichtsverlust…)
  /** Signes explicitement NIÉS par le patient (« kein Fieber », « kein
   *  Erbrechen »). Permet au partenaire de répondre « non » de façon cohérente
   *  aux questions de dépistage, et au candidat d'apprendre quoi demander. */
  negativeFindings?: string[];
  vorerkrankungen: string[];
  voroperationen: string[];
  medikamente: string[];
  allergien: string[];
  unvertraeglichkeiten?: string[];
  noxen: { tabak?: string; alkohol?: string; drogen?: string };
  familienanamnese: string[];
  sozialanamnese: string[];
  /** SCHÉMA DE COUVERTURE — réponses du patient aux sondes canoniques du guide
   *  d'anamnèse (data/guides/anamneseProbes.ts), sous forme `probeId → réplique`.
   *  Le Rollenskript retrouve la question et le chapitre via la sonde ; la
   *  couverture est ainsi structurelle (le validateur refuse tout trou). En
   *  PHASE 2, importer un cas = remplir cette carte pour toutes ses sondes. */
  antworten?: Record<string, string>;
  /** PHASE 2b (optionnel) — variantes émotionnelles par sonde (calme/détresse +
   *  méta audio). Absent = on sert `antworten` tel quel. */
  antwortenEmotional?: Record<string, EmotionalReply>;
  /** Répliques ad-hoc HORS checklist canonique (rare). `kapitel` force le
   *  chapitre ; sinon classées par mots-clés (voir lib/rolePlay.ts). Conservé
   *  pour rétrocompatibilité et cas particuliers. */
  frageAntworten?: { frage: string; antwort: string; kapitel?: RolePlayKapitel }[];
  /** Répliques "patient difficile" que le partenaire peut déclencher. */
  schwierigeReaktionen?: string[];
  /** Consigne de jeu (FR, 2-3 lignes) : qui tu es, ton humeur, ce que tu
   *  minimises / ne dis que sur relance — l'âme du personnage. */
  persona?: string;
}

/** Chapitres du Rollenskript (fiche de rôle jouable) — alignés sur le guide
 *  d'anamnèse du candidat pour que le partenaire suive le même fil.
 *  'fach' = réponses aux questions de la Fachanamnese de la spécialité. */
export type RolePlayKapitel =
  | 'personalia' | 'aktuell' | 'fach' | 'vegetativ' | 'vorerkrankungen'
  | 'medikamente' | 'allergien' | 'noxen' | 'familie-sozial' | 'frauenanamnese';

// ----------------------------------------------------------------------------
// PHASE 2b — Scaffolding « Patient IA vocal » (hooks & structures uniquement).
// AUCUNE logique IA/vocale ici : ce sont des fondations pour que la Phase 2b
// soit une intégration, pas une refonte. Tous les champs sont OPTIONNELS et le
// MVP texte fonctionne avec patientAIProfile absent/null.
// ----------------------------------------------------------------------------
/** État émotionnel du patient (pilote la voix + le choix de variante). */
export type PatientEmotion =
  | 'neutral' | 'ruhig' | 'besorgt' | 'schmerzgeplagt' | 'ängstlich' | 'gereizt' | 'erleichtert';

/** Mode de rendu de la simulation. 'texte' = MVP actuel ; 'tts'/'vocal' = 2b ;
 *  'external-ai' = auto-évaluation après une simulation dans une IA externe. */
export type SimulationMode = 'texte' | 'tts' | 'vocal' | 'external-ai';

/** État dynamique du patient (0..100), avancé à chaque tour. MVP : règles
 *  simples hardcodées (lib/simulationStep), remplaçables par un LLM orchestrateur. */
export interface PatientState {
  pain: number;      // douleur ressentie
  anxiety: number;   // anxiété
  clarity: number;   // clarté/coopération du discours
  emotion: PatientEmotion;
}

/** Profil patient pour l'orchestration IA (Phase 2b). Absent/null = sim texte. */
export interface PatientAIProfile {
  demografie: string;           // « 64-jähriger Apotheker, gestresst… »
  systemPrompt: string;         // consigne système du LLM patient
  initialState: PatientState;
  voice?: { provider?: string; voiceId?: string; language?: string };
}

/** Métadonnées audio d'une réplique (optionnel, pour TTS futur). */
export interface AudioMeta { tone?: string; speed?: number }

/** Variantes émotionnelles d'une réplique pré-écrite (optionnel, Phase 2b). */
export interface EmotionalReply { calm?: string; distress?: string; audio?: AudioMeta }

/** Nature de la réponse du patient (continuité IA + analytics). */
export type TurnResponseType = 'symptom' | 'history' | 'clarification' | 'smalltalk' | 'unknown';

/** Un tour de conversation loggé (question candidat → réponse patient + état). */
export interface ConversationTurn {
  ts: number;
  candidateInput: string;
  probeId?: string;             // sonde reconnue (le cas échéant)
  patientResponse: string;
  responseType: TurnResponseType;
  stateBefore: PatientState;
  stateAfter: PatientState;
  audio?: AudioMeta;
}

// ----------------------------------------------------------------------------
// Vue médecin (ce que le candidat doit découvrir / viser)
// ----------------------------------------------------------------------------
export interface MedicalView {
  verdachtsdiagnose: string;
  differenzialdiagnosen: { dd: string; unterscheidung: string }[]; // + critères distinctifs
  /** Même axe pédagogique que Fachwissen.diagnostik (étape du raisonnement,
   *  PAS invasivité) — cohérence cas ↔ fiche pathologie. */
  diagnostik: { stufe: DiagnostikStufe; text: string }[];
  /** Même principe que Fachwissen.therapie : sections LIBRES propres à CE cas
   *  précis (pas de moule konservativ/interventionell/chirurgisch imposé). */
  therapie: TherapieSektion[];
  erstmassnahmen?: string[]; // ce qu'on fait tout de suite (Zugang, O2…)
  notfall?: boolean;
  /** La fin de l'entretien EN LANGAGE PATIENT (FB2-J7) : ce que le candidat dit
   *  au patient en clôture — soupçon, examens, suite — sans Fachbegriff.
   *  Compléments de « Ich vermute, dass … », « Um das abzuklären, … »,
   *  « Je nach Ergebnis … ». Alimente aussi la phrase d'ouverture de la
   *  Fallvorstellung. */
  patientWorte?: { verdacht: string; diagnostik: string; therapie: string };
}

/** Fiche de rôle du médecin examinateur (Teil 3, Fallvorstellung) — permet au
 *  simulant de jouer le senior : questions et réactions par thème, au cas par cas. */
export interface ExaminerSheetSection {
  title: string;                 // ex. "Nach der Vorstellung", "Differenzialdiagnosen", "Therapie"
  interactions: { frage: string; reaktion?: string }[]; // question du senior + réaction/attendu
}

export interface Case {
  id: string;
  name: string;            // ex. "Leberzirrhose bei Alkoholabhängigkeit"
  pathology: string;       // clé pathologie normalisée (lien Fachwissen)
  specialty: Specialty;
  centers: Center[];
  frequency: number;       // nb d'apparitions dans les protocoles
  difficulty: Difficulty;
  patientSheet: PatientSheet;
  medicalView: MedicalView;
  linkedFachwissenId?: string;
  linkedFachbegriffeIds: string[];
  probableAufklaerungIds: string[];
  /** Questions d'anamnèse propres au cas, chacune rangée dans SON sous-chapitre
   *  du guide (FB2-J4) : elle y apparaît pendant la simulation avec un marqueur
   *  « Für diesen Fall ». `string` seul = rétrocompatibilité (chapitre aktuell). */
  caseSpecificQuestions: CaseQuestion[];
  /** Fachanamnese jouée quand elle diffère de la spécialité du cas (FB2-K1) :
   *  une TVT est classée « Kardiologie » mais s'interroge en angiologie. */
  fachanamnese?: Specialty;
  examinerQuestions: string[];       // questions Arzt-Arzt réellement posées
  pruefungsfallen?: string[];        // pièges du cas (Cave-Radar)
  /** @deprecated ADR-0017 — plus jamais écrit. Lire `case_progress`. */
  status: CaseStatus;
  /** @deprecated ADR-0017 — plus jamais écrit (le `/3` de `caseMastery`). */
  confidence: number;                // 0..100, dérivé des simulations
  /** @deprecated ADR-0017 — plus jamais écrit. */
  lastSimulationId?: string;
  sourceDates?: string[];            // dates réelles d'apparition (timeline)
  // --- Itération 2 ---
  referenceArztbrief?: string;       // corrigé-type (comparaison, jamais auto-inséré)
  kommunikativeSituationIds?: string[]; // situations "patient difficile" du cas
  examinerSheet?: ExaminerSheetSection[]; // fiche de rôle du médecin senior (Teil 3)
  /** @deprecated ADR-0017 — plus jamais écrit (source du saut de couche). */
  layerProgress?: Layer;             // couche la plus haute validée sur ce cas
  /** SCHÉMA DE COUVERTURE (Muster) — phrases-modèles AUTHORÉES par chapitre,
   *  personnalisées à 100 % aux données du cas et au registre du guide. La
   *  grammaire vit dans du texte rédigé (jamais générée à l'exécution). Alimente
   *  les vignettes « Pour ce cas » de la Dokumentation (écrit) et de la
   *  Fallvorstellung (oral). Clés = ids des chapitres des guides correspondants.
   *  Le validateur (scripts/checkMusterCoverage.mjs) refuse tout trou. */
  musterSaetze?: CaseMuster;
  /** PHASE 2b (optionnel) — profil patient IA vocal. null/absent = sim texte. */
  patientAIProfile?: PatientAIProfile | null;
  tier?: 1 | 2 | 3; // 1 = Free ; défaut 2
}

/** Phrases-modèles par chapitre, pour les deux modules rédigés/parlés. */
export interface CaseMuster {
  arztbrief: Record<string, string>;   // chapitre Arztbrief → phrase écrite (Konj. I / Passiv)
  vorstellung: Record<string, string>; // chapitre Fallvorstellung → phrase orale
}

// ----------------------------------------------------------------------------
// Fachbegriff + SRS (SM-2)
// ----------------------------------------------------------------------------
/** Double registre (F3 §3.2) : parole du patient, phrase de Vorstellung/Doku, question d'anamnèse sans le terme. */
export interface TermRegisterData { patient: string; vorstellung: string; anamnese: string }

export interface Srs {
  interval: number;      // jours
  easeFactor: number;    // 1.3..2.5+
  dueDate: number;       // epoch ms
  repetitions: number;
  lapses: number;
  state: 'Neu' | 'Gelernt' | 'Zu wiederholen';
}

export type LeitsymptomKategorie = 'schmerz' | 'atemnot' | 'allgemein' | 'psychisch' | 'neurologisch' | 'nerven' | 'infekt' | 'veraenderung' | 'ausscheidung' | 'anfall';

export type CaseQuestionKapitel =
  | 'aktuell' | 'vegetativ' | 'vorerkrankungen' | 'medikamente' | 'allergien'
  | 'noxen' | 'familie-sozial' | 'frauenanamnese' | 'fach';
/** Une question du cas peut chercher un symptôme que le guide cherche aussi
 *  (FB2-J10) : `sucht` = elle REMPLACE la question générale (celle de son
 *  chapitre, et toute générale plus bas dans la trame) pour ces symptômes ;
 *  `relu` = relue : elle approfondit ce qui a été demandé, ou ne cherche pas
 *  vraiment ce symptôme (« rheumatisches Fieber »). Sans l'un des deux, la
 *  porte `checkTrameSymptoms` refuse la collision. */
// `sucht` non vide et typé : un tableau vide n'efface rien (re-revue I-3), un concept
// inconnu n'existe pas (revue finale I-7) — tsc le refuse.
// `followUp` (Q0) : la relance de la question, avec sa condition dans le texte
// (« Falls ja: … ») — même règle que les relances des questions générales.
export type CaseQuestion = string | { frage: string; kapitel: CaseQuestionKapitel; sucht?: [Symptom, ...Symptom[]]; relu?: true; followUp?: string };

export interface Fachbegriff {
  id: string;
  term: string;                 // terme allemand (nettoyé, sans indice mnémo)
  translationSimple: string;    // reformulation/traduction patient
  definitionDetailed?: string;  // définition détaillée (allemand, ex-Anki)
  pronunciation?: string;       // IPA
  specialty: Specialty;
  pathologyTags: string[];
  centers: Center[];
  linkedCaseIds: string[];
  srs: Srs;
  register?: TermRegisterData;       // termes liés à ≥ 1 cas (F3)
}

// ----------------------------------------------------------------------------
// Collections Fachbegriffe (F1) — projetées depuis le journal d'événements.
// ----------------------------------------------------------------------------
export interface DeckQuery { q?: string; specialty?: Specialty; state?: Srs['state']; center?: Center }
export interface Deck { id: string; name: string; kind: 'manual' | 'smart'; query?: DeckQuery; createdAt: string; updatedAt: string }
export interface DeckTerm { deckId: string; termId: string; addedAt: string }
export interface Favorite { termId: string; since: string }
/** Deck manuel réservé : jamais créé/renommé/supprimé par événement, fabriqué par l'UI. */
export const FAVORITES_DECK_ID = 'deck-favorites';

/** Terme personnel (F3) : créé par ★ sur une sélection hors glossaire. Projeté
 *  depuis le journal (term.personal_created / _deleted) — jamais écrit dans
 *  `fachbegriffe`, que la sync de contenu réécrit. */
export interface PersonalTerm { id: string; term: string; context?: string; explanation?: string; caseId?: string; createdAt: string; srs: Srs }

// ----------------------------------------------------------------------------
// Fachwissen (fiche pathologie riche)
// ----------------------------------------------------------------------------
/** Étapes du raisonnement diagnostique, dans l'ordre où on les récite à l'oral. */
export const DIAGNOSTIK_STUFEN = ['Anamnese/Klinik', 'Labor', 'Apparativ & Bildgebung', 'Invasiv & Speziell'] as const;
export type DiagnostikStufe = (typeof DIAGNOSTIK_STUFEN)[number];

/** Section de thérapie : libellé libre (propre à la pathologie) + contenu. */
export interface TherapieSektion {
  label: string;      // ex. « Konservativ », « Erstlinie », « Psychotherapie », « Kurativ »
  items: string[];
  akut?: boolean;     // met en avant les mesures d'urgence
}

export interface Fachwissen {
  id: string;
  pathology: string;
  specialty: Specialty;
  definition: string;
  aetiologie?: string;
  risikofaktoren?: string[];
  klinik: { text: string; atypisch?: boolean }[];
  /** Scores/stadifications réellement demandés à l'oral (Child-Pugh, TNM,
   *  CURB-65, GOLD…). Nommé + contenu, pour le rappel « classification ». */
  klassifikation?: { name: string; inhalt: string }[];
  /** Signes d'alarme CLINIQUES imposant l'urgence — distinct des Prüfungsfallen
   *  (qui listent les pièges DU CANDIDAT). */
  redFlags?: string[];
  /** Démarche diagnostique groupée par ÉTAPE du raisonnement (ordre pédagogique
   *  allemand, celui-là même qu'on récite en Fallvorstellung) plutôt que par
   *  invasivité — un axe contre-intuitif pour l'apprenant.
   *  `stufe` : 'Anamnese/Klinik' → 'Labor' → 'Bildgebung' → 'Invasiv/Speziell'. */
  diagnostik: { stufe: DiagnostikStufe; text: string }[];
  differenzialdiagnosen: { dd: string; unterscheidung: string }[];
  /** Thérapie en sections ORDONNÉES et LIBREMENT nommées : chaque pathologie a
   *  sa propre logique de prise en charge (konservativ/interventionell/
   *  chirurgisch pour la chirurgie ; Erstlinie/Alternative/schwerer Verlauf en
   *  infectiologie ; Psychotherapie/Pharmakotherapie/Krisenintervention en
   *  psychiatrie ; kurativ/palliativ en oncologie…). Ne jamais forcer un moule
   *  qui ne correspond pas à la réalité clinique de la pathologie. */
  therapie: TherapieSektion[];
  prognose?: string;
  pruefungsfallen: string[];    // encarts "piège d'examen"
  /** Questions Arzt-Arzt réellement posées AVEC leur réponse-type. */
  askedInExam: { frage: string; antwort: string }[];
  /** Aide-mémoire d'une ligne (voix « Merke : ») — rappel flash avant drill. */
  merksatz?: string;
  linkedCaseIds: string[];
  keyFachbegriffeIds: string[];
  linkedAufklaerungIds: string[];
}

// ----------------------------------------------------------------------------
// Aufklärung — 7 blocs standards répétables + bloc spécifique
// ----------------------------------------------------------------------------
export interface AufklaerungBlocks {
  einleitung: string;
  metakommunikation: string;
  warum: string;
  ablauf: string;
  vorbereitung: string;
  standardRisiken: string[];    // hérités (accès veineux + KM)
  spezifischeRisiken: string[]; // propres à l'acte
  abschluss: string;
}

export interface AufklaerungItem {
  id: string;
  name: string;                 // "Ösophago-Gastro-Duodenoskopie (ÖGD)"
  shortName?: string;           // "Gastroskopie"
  category: 'Untersuchung' | 'OP' | 'Therapie';
  blocks: AufklaerungBlocks;
  patientQuestions: { frage: string; antwort: string }[];
  linkedCaseIds: string[];
}

// ----------------------------------------------------------------------------
// Guides & templates
// ----------------------------------------------------------------------------
export type GuideType =
  | 'anamnese' | 'arztbrief' | 'fallvorstellung' | 'kommunikation' | 'spezialguide' | 'grammatik';

export interface GuideSection {
  id: string;
  title: string;
  items: string[];         // puces / Redemittel
  note?: string;           // Cave / Tipp
}

export interface Guide {
  id: string;
  title: string;
  type: GuideType;
  specialty: Specialty | null; // null = standard
  intro?: string;
  sections: GuideSection[];
}

// ----------------------------------------------------------------------------
// Simulation (journal) + évaluation hybride
// ----------------------------------------------------------------------------
export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  axisWeight?: number; // pondération dans le score contenu (défaut 1)
}

/** Grille de langue officielle-like (0..5 chacune), commune aux parties orales.
 *  Passe = ≥60% par partie (cf. mémoire fsp-official-grading). */
export interface LanguageGrid {
  aussprache: number;      // Aussprache / Intonation
  wortschatz: number;      // différenciation du vocabulaire
  grammatik: number;       // syntaxe / structures
  redefluss: number;       // fluidité
  kommunikation: number;   // patientengerecht / registre / Hörverstehen
}

export interface PartResult {
  done: boolean;
  durationSec: number;
  checklist: ChecklistItem[];
  languageGrid?: LanguageGrid;   // parties orales (Anamnese, Fallvorstellung, Aufklärung)
  feeling: number;               // curseur ressenti 0..100 (Fragile→Solide)
  contentPct: number;            // % de critères contenu cochés
  officialPct: number;           // % grille langue (0..100)
  assistanceUsed?: AssistanceMode; // mode réellement utilisé sur cette partie
}

export type SimRole = 'Candidat' | 'Partenaire';

/** Profil d'apprenant — chaque profil a ses propres simulations, stats, streak
 *  et programme personnalisé. App locale : création sans authentification.
 *  En pré-simulation, on choisit le profil qui joue le médecin (= profil actif). */
export interface Profile {
  id: string;
  name: string;
  color: string;           // clé de teinte (voir lib/profiles.PROFILE_COLORS)
  createdAt: number;
}

export interface Simulation {
  id: string;
  caseId: string;
  date: number;            // epoch ms
  /** Profil crédité (celui qui a joué le médecin). Pilote stats/streak/programme. */
  profileId?: string;
  role?: SimRole;          // hérité (rétrocompat) — remplacé par profileId
  parts: {
    anamnese?: PartResult;
    dokumentation?: PartResult;
    fallvorstellung?: PartResult;
    aufklaerung?: PartResult;
  };
  notes: SketchNotes;      // le "croquis" — source unique
  bogen?: BogenNotes;      // Anamnese-Bogen structuré (Muster par ville)
  prioritizedCorrections: string[];
  passed?: boolean;        // ≥60% sur chaque partie tentée
  // --- Itération 2 ---
  assistance?: AssistanceMode;
  layer?: Layer;
  muster?: MusterCity | MusterArt;   // [S4] les villes série 3 restent lisibles
  arztbriefText?: string;  // ce que le candidat a rédigé (jamais auto-généré)
  /** PHASE 2b (optionnel) — journal de conversation (continuité IA + analytics). */
  conversation?: ConversationTurn[];
  mode?: SimulationMode;   // rendu utilisé (défaut 'texte')
  /** Cible IA externe utilisée quand mode === 'external-ai'. */
  externalTarget?: TargetId;
  /** Portée de la session (FB2-P) : complète (3 Teile) ou un seul Teil.
   *  Absent sur l'historique = complète. Un Teil nourrit les stats par axe
   *  et le streak, pas la maîtrise du cas (lib/simScope.ts). */
  scope?: 'full' | 'teil';
  teil?: SimTeil;
  /** TaskInstance du plan figé que ce run satisfait (ADR-0017 §3.4). Absent =
   *  exercice libre. Écrit par le lanceur de simulation (chantier C2). */
  taskId?: string;
  // --- [S4] la partie entière (simulation-run.md §3.2, §10.4) — écrits par S4-3,
  // lus ici avec tolérance : absents de toute simulation antérieure. ----------
  /** Les trois Teile joués d'un trait, sans reprise de plus de 5 min (`enchainiert`). */
  enchaine?: true;
  /** L'ordre dans lequel les Teile ont été joués. Sa présence est le discriminant
   *  « simulation série 4 » (training-journal.md §2.3, m-e). */
  reihenfolge?: SimTeil[];
  /** Durée totale de la partie, Teil abandonné compris (m6). `date` = début. */
  dauerGesamtSec?: number;
}
export type SimTeil = 'anamnese' | 'dokumentation' | 'fallvorstellung';

/** Notes structurées par rubrique (mêmes cases que le Arztbrief) →
 *  double sortie automatique (Arztbrief + Fallvorstellung). */
export interface SketchNotes {
  aktuell?: string;
  vegetativ?: string;
  vorerkrankungen?: string;
  medikamente?: string;
  allergien?: string;
  noxen?: string;
  familie?: string;
  sozial?: string;
  verdacht?: string;
  dd?: string;
  diagnostik?: string;
  therapie?: string;
}

/** Anamnese-Bogen structuré : valeur libre par clé de champ du Muster choisi
 *  (les clés viennent de MusterBogenSpec.fields[].key). */
export type BogenNotes = Record<string, string>;

// Réglages / méta (clé-valeur) : thème, streak, centre visé…
export interface Meta {
  key: string;
  value: unknown;
}

// ----------------------------------------------------------------------------
// Programme de révision dynamique (Module 1)
// ----------------------------------------------------------------------------
export type Intensity = 'leicht' | 'mittel' | 'intensiv';

export interface ProgramConfig {
  startDate: string;              // ISO yyyy-MM-dd
  examDate?: string;              // ISO (sinon on utilise weeks)
  weeks?: number;                 // durée si pas de date d'examen
  intensity: Intensity;
  hoursPerSession: number;        // volume horaire par jour travaillé
  offDays: number[];              // jours off (0=dim … 6=sam), style date-fns getDay
  prioritySpecialties: Specialty[];
  selfLevel: Partial<Record<Axis, number>>; // auto-éval 0..100 par axe
  createdAt: number;
  /** Ajustements manuels de l'utilisateur — le planificateur re-raisonne avec. */
  adjust?: ProgramAdjust;
  /** Courbe d'apprentissage (FB2-P, retour direction) : « teil-first » entraîne
   *  d'abord chaque partie seule (Anamnese, puis Dokumentation, puis
   *  Fallvorstellung) avant les simulations complètes ; « full » commence
   *  directement en complète.
   *  @deprecated ADR-0017 — remplacé par `modus`. Lecture tolérante :
   *  `strategy === 'full'` -> `modus = 'cas-complet'`. */
  strategy?: 'teil-first' | 'full';
  /** Mode d'avancement explicite (ADR-0017 §7) : demande une fois, jamais
   *  devine. Fige dans chaque `DayPlan.mode` a la materialisation. */
  modus?: Fortschrittsmodus;
}

/** Interventions manuelles sur le plan, prises en compte à chaque recalcul :
 *  marquer une couche faite, reporter un cas, ajouter/retirer des tâches. */
export interface ProgramAdjust {
  doneLayers?: Record<string, number>;  // caseId → nb de couches validées à la main
  postpone?: Record<string, number>;    // caseId → jours ouvrés de report (couche suivante)
  skipDrillDates?: string[];            // dates ISO où le drill du jour est annulé
  extras?: ExtraTask[];                 // révisions/tâches ajoutées manuellement
}

/** Tâche ajoutée à la main sur une date précise (révision supplémentaire…). */
export interface ExtraTask {
  id: string;
  date: string;                         // ISO yyyy-MM-dd
  kind: ProgramBlockKind;
  label: string;
  caseId?: string;
  specialty?: Specialty;
  estMin?: number;
}

export type ProgramBlockKind = 'simulation' | 'drill' | 'fachwissen' | 'aufklaerung' | 'revision';

export interface ProgramBlock {
  kind: ProgramBlockKind;
  label: string;
  estMin: number;                 // durée estimée (min)
  caseId?: string;
  layer?: Layer;                  // couche visée (simulation)
  assistance?: AssistanceMode;    // mode conseillé (couche 1 = assisté)
  axis?: Axis;
  specialty?: Specialty;
  id?: string;                    // identifiant stable (actions manuelles)
  manual?: boolean;               // tâche ajoutée à la main (retirable)
  reason?: string;                // micro-justification affichée (transparence du plan)
  phase?: 'discovery' | 'consolidation' | 'taper'; // phase du plan (bandeau calendrier)
  teil?: SimTeil;                 // session d'une seule partie (courbe teil-first)
}

export interface ProgramDay {
  date: string;                   // ISO
  isOff: boolean;
  targetMin: number;              // budget du jour (min)
  blocks: ProgramBlock[];
  worked: boolean;                // ≥1 activité ce jour (dérivé des simulations)
  spentMin: number;               // temps réellement passé ce jour
}

// ----------------------------------------------------------------------------
// Journal d'entraînement, plan du jour figé, progression par Teil
// Contrat : docs/contracts/training-journal.md · ADR-0017
// ----------------------------------------------------------------------------

/** Identifiant d'un cas. Alias de lisibilité : `Case.id` est une chaîne. */
export type CaseId = string;

export type TrainingKind =
  | 'simulation'      // une partie ou un run, joués dans l'app
  | 'drill'           // une SÉANCE de répétition espacée (pas une carte)
  | 'fiche'           // Fachwissen / guide lu de bout en bout
  | 'aufklaerung'     // une Aufklärung jouée
  | 'examen-blanc';   // run complet en conditions d'examen

export type TrainingSource = 'plan' | 'libre';

/** Un exercice fait = exactement un événement. Append-only : jamais modifié,
 *  jamais supprimé ; une correction est un nouvel événement. */
export interface TrainingEvent {
  id: string;                  // uuid v4 ; JAMAIS `${prefix}-${Date.now()}`
  at: number;                  // epoch ms, début de l'exercice
  kind: TrainingKind;
  caseId?: CaseId;             // absent pour un drill non lié à un cas
  teile: SimTeil[];            // ce qui a RÉELLEMENT été joué (fait, pas intention)
  source: TrainingSource;
  taskId?: string;             // TaskInstance satisfaite, si une l'a été
  spentMin: number;            // entier ≥ 0, MESURÉ — jamais estimé
  laufId?: string;             // run de simulation associé
  scores?: Partial<Record<SimTeil, number>>; // 0..100 par Teil joué
  selbstbewertet?: boolean;    // true = score déclaré par le candidat, pas mesuré
  profileId?: string;          // profil crédité
  // --- [S4] DÉRIVÉS de `simulation.completed` (training-journal.md §2.3) ;
  // jamais écrits par `training.logged` (son schéma serveur est `.strict()`). ---
  enchaine?: true;             // les 3 Teile joués d'un trait
  examen?: true;               // conditions d'examen (`conditionsExamen`)
  /** Ce qui manque pour que la partie soit « en conditions d'examen » ; présent
   *  seulement pour une simulation série 4. Même fonction que `examen` : `[]` ⇔ `examen`.
   *  Ajout de S4-1 (le contrat §12.7 `pretManque` n'a sinon aucune source). */
  examenManque?: ConditionExamen[];
  minutesParTeil?: Partial<Record<SimTeil, number>>;       // durée mesurée par Teil joué
  manques?: Partial<Record<SimTeil, ChecklistItemId[]>>;  // items NON cochés par Teil joué
}

/** Identifiant sémantique et stable d'un item de checklist (simulation-run.md §4). */
export type ChecklistItemId = string;

/** Ce qu'il faut pour qu'une partie soit « en conditions d'examen » (décision (b)). */
export type ConditionExamen = 'enchaine' | 'autonome' | 'ordre' | 'grille';

export type TaskKind = 'simulation' | 'drill' | 'fachwissen' | 'aufklaerung' | 'revision' | 'examen-blanc';

/** Une tâche MATÉRIALISÉE : elle a une identité, une date, et un état « faite ».
 *  C'est l'entité qui manquait — sans elle, figer le jour n'a aucune prise. */
export interface TaskInstance {
  id: string;                  // uuid v4, stable pour toujours
  date: string;                // ISO yyyy-MM-dd, = la clé du DayPlan porteur
  kind: TaskKind;
  caseId?: CaseId;
  /** Le sujet, et lui seul. Le type, le Teil, la couche et le coût se lisent
   *  dans les champs — l'étiquette ne les concatène JAMAIS (ADR-0020 §8). */
  label: string;
  /** @deprecated [S4] À lire par `teileDeTache`. Plans série 3 : LECTURE SEULE. Encore ÉCRIT par `dayPlan.ts`
   *  (tâches `teil-first`) jusqu'à S4-2, qui cesse de l'écrire (INV-50). */
  teil?: SimTeil;              // absent = run complet
  teile?: SimTeil[];           // [S4] ce qui RESTAIT au moment du plan, ordre d'examen
  rappel?: ChecklistItemId;    // [S4] erreur transversale à rappeler, au plus une, figée
  dUnTrait?: true;             // [S4] ne se coche que par une partie enchaînée
  creeA?: number;              // [S4] instant de création ; absent = début du jour
  layer?: Layer;
  specialty?: Specialty;
  assistance?: AssistanceMode;
  estMin: number;
  source: 'plan';              // une TaskInstance vient toujours du plan
  reason: string;              // le « pourquoi aujourd'hui », FIGÉ avec la tâche
  doneAt?: number;             // epoch ms ; absent = non faite
  spentMin?: number;           // renseigné en même temps que doneAt
  eventId?: string;            // TrainingEvent qui l'a satisfaite
  diversityRelaxed?: boolean;  // contrainte de diversité relâchée (pool épuisé)
}

/** Mode d'avancement : la stratégie du candidat, demandée une fois, jamais
 *  devinée. Figée dans chaque jour au moment de la matérialisation. */
export type Fortschrittsmodus =
  | 'teil-first'     // un geste à la fois : le même Teil sur plusieurs cas
  | 'cas-complet'    // les trois Teile d'un cas avant de passer au suivant
  | 'specialite'     // une spécialité travaillée à fond, puis la suivante
  | 'examen-blanc';  // runs complets chronométrés, sans assistance

/** Le plan d'un jour, matérialisé UNE FOIS à la première ouverture de ce jour. */
export interface DayPlan {
  date: string;                // ISO yyyy-MM-dd — clé primaire
  materializedAt: number;      // epoch ms de la matérialisation
  mode: Fortschrittsmodus;     // figé avec le jour
  seed: string;                // graine de la sélection, rejouable
  targetMin: number;
  tasks: TaskInstance[];
  replannedAt?: number;
  tz?: string;                 // [S4] fuseau IANA de l'appareil qui a matérialisé : bornes du jour
}

export type TeilStatus = 'vierge' | 'fragile' | 'acquis' | 'solide';

export interface TeilProgress {
  status: TeilStatus;
  lastScore: number | null;    // null ⇔ status === 'vierge'
  lastAt: number | null;
  attempts: number;
  /** Dernière fois que ce Teil a été déclaré FAIT sans mesure (coche, séance
   *  IA auto-déclarée). N'entre ni dans `status`, ni dans `attempts`, ni dans
   *  l'indice, ni dans la série : « faite — non mesurée » (re-revue I-4). */
  nonMesureAt?: number;
  /** [S4] R1 : jour (yyyy-MM-dd) à partir duquel un ≥ 80 rendrait ce Teil solide ;
   *  `null` s'il l'est déjà ou si aucune réussite ≥ 80 n'a encore eu lieu. */
  solideDes?: string | null;
  /** [S4] La PREMIÈRE réussite ≥ 80 (jamais remise à zéro) : le témoin de l'écart de 3 jours, et la
   *  phrase « Réussi à 85 le 12 sept. ». Absent tant qu'aucune réussite ≥ 80 n'a eu lieu. */
  premiereReussite?: { at: number; score: number };
}

/** Projection de `training_events`. Un cas n'a PLUS de pourcentage : il a un
 *  état par Teil. `vierge` n'est jamais un point faible — c'est « pas encore
 *  travaillé », une information neutre. */
export type CaseEtat = 'vierge' | 'entame' | 'couvert' | 'solide' | 'pret';

export interface CaseProgress {
  caseId: CaseId;
  teile: Record<SimTeil, TeilProgress>;   // les TROIS clés, toujours présentes
  /** @deprecated [S4] dérivé de `etat` : vierge → vierge ; entame|couvert → entame ; solide|pret → solide. */
  overall: 'vierge' | 'entame' | 'solide';
  // --- [S4] training-journal.md §12.6. Toujours posés par `computeCaseProgress` ;
  // optionnels dans le type pour qu'une ligne `case_progress` d'avant la série 4
  // reste lisible (lecture tolérante) jusqu'à la reconstruction du démarrage. ---
  couverture?: 0 | 1 | 2 | 3;             // Teile avec ≥ 1 essai MESURÉ
  maitrise?: number | null;               // moyenne des derniers scores des Teile joués ; null ⇔ couverture 0
  etat?: CaseEtat;
  solideDepuis?: number | null;           // `at` de l'événement qui a rendu les 3 Teile solides (dernier passage)
  pretAt?: number | null;                 // la soudure
  prochaineConsolidation?: string | null; // yyyy-MM-dd (§13.1)
  /** Ce qui manque au meilleur run récent pour souder (R1) ; `[]` si soudé ou non solide. */
  pretManque?: ConditionExamen[];
}
