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
// Vue médecin (ce que le candidat doit découvrir / viser)
// ----------------------------------------------------------------------------
export interface MedicalView {
  verdachtsdiagnose: string;
  differenzialdiagnosen: { dd: string; unterscheidung: string }[]; // + critères distinctifs
  diagnostik: string[];   // ordonné non-invasif → invasif
  therapie: {
    konservativ?: string[];
    interventionell?: string[];
    chirurgisch?: string[];
  };
  erstmassnahmen?: string[]; // ce qu'on fait tout de suite (Zugang, O2…)
  notfall?: boolean;
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
  caseSpecificQuestions: string[];   // questions d'anamnèse propres au cas
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
export interface Fachwissen {
  id: string;
  pathology: string;
  specialty: Specialty;
  definition: string;
  aetiologie?: string;
  risikofaktoren?: string[];
  klinik: { text: string; atypisch?: boolean }[];
  diagnostik: { text: string; invasiv?: boolean }[]; // non-invasif → invasif
  differenzialdiagnosen: { dd: string; unterscheidung: string }[];
  therapie: { konservativ?: string[]; interventionell?: string[]; chirurgisch?: string[] };
  prognose?: string;
  pruefungsfallen: string[];    // encarts "piège d'examen"
  askedInExam: string[];        // questions réellement posées (protocoles)
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
