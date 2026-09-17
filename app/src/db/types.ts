// ============================================================================
// FSP-Cockpit — Modèle de données
// Toutes les entités sont reliées bidirectionnellement pour permettre
// l'interconnexion totale (cf. ANALYSE.md §5). Les IDs sont des slugs stables
// (string) pour que le seed et les imports restent lisibles et référençables.
// ============================================================================

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

/** Mode de rendu de la simulation. 'texte' = MVP actuel ; 'tts'/'vocal' = 2b. */
export type SimulationMode = 'texte' | 'tts' | 'vocal';

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
  status: CaseStatus;
  confidence: number;                // 0..100, dérivé des simulations
  lastSimulationId?: string;
  sourceDates?: string[];            // dates réelles d'apparition (timeline)
  // --- Itération 2 ---
  referenceArztbrief?: string;       // corrigé-type (comparaison, jamais auto-inséré)
  kommunikativeSituationIds?: string[]; // situations "patient difficile" du cas
  examinerSheet?: ExaminerSheetSection[]; // fiche de rôle du médecin senior (Teil 3)
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
export type CaseQuestion = string | { frage: string; kapitel: CaseQuestionKapitel };

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
}

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
  muster?: MusterCity;
  arztbriefText?: string;  // ce que le candidat a rédigé (jamais auto-généré)
  /** PHASE 2b (optionnel) — journal de conversation (continuité IA + analytics). */
  conversation?: ConversationTurn[];
  mode?: SimulationMode;   // rendu utilisé (défaut 'texte')
}

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

// ----------------------------------------------------------------------------
// Planning (session du jour / calendrier)
// ----------------------------------------------------------------------------
export interface PlanEntry {
  id: string;
  date: string;            // ISO yyyy-MM-dd
  caseId?: string;
  kind: 'simulation' | 'drill' | 'revision';
  label: string;
  done: boolean;
}

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
}

export interface ProgramDay {
  date: string;                   // ISO
  isOff: boolean;
  targetMin: number;              // budget du jour (min)
  blocks: ProgramBlock[];
  worked: boolean;                // ≥1 activité ce jour (dérivé des simulations)
  spentMin: number;               // temps réellement passé ce jour
}
