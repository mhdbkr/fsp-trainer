import type { SigneDefBody } from './signes';

// ============================================================================
// LES DÉFINITIONS DU LEXIQUE DE SIGNES — K0 (69 signes) puis K1 (le reste des sondes).
// `Signe` est dérivé des clés : un signe ne s'écrit qu'ici, une fois. Le compilateur
// refuse un signe sans définition ou un id inconnu ; `SIGNES` suit l'ordre de déclaration.
// ============================================================================
const S = 'screening' as const;
export const DEFS = {
  // --- les dimensions : l'ordre de l'entretien --------------------------------
  ort: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ort' },
  beginn: { kapitel: 'aktuell', pertinence: S, bank: 'akt-beginn' },
  charakter: { kapitel: 'aktuell', pertinence: S, bank: 'akt-charakter' },
  intensitaet: { kapitel: 'aktuell', pertinence: S, bank: 'akt-intensitaet' },
  ausstrahlung: { kapitel: 'aktuell', pertinence: ['schmerz', 'anfall', 'neurologisch', 'nerven', 'stein', 'hoden'], bank: 'akt-ausstrahlung' },
  verlauf: { kapitel: 'aktuell', pertinence: S, bank: 'akt-verlauf' },
  ausloeser: { kapitel: 'aktuell', pertinence: S, bank: 'akt-ausloeser' },
  einfluss: { kapitel: 'aktuell', pertinence: S, bank: 'akt-einfluss' },
  frueher: { kapitel: 'aktuell', pertinence: S, bank: 'akt-frueher' },
  begleit: { kapitel: 'aktuell', pertinence: S, bank: 'akt-begleit' },
  // K2 : + `lyme` — la Lyme-Arthritis (genou) se cherche par le schéma articulaire (`fach-infekt-gelenke`).
  gelenke: { kapitel: 'fach', pertinence: ['gelenk', 'arthritis', 'lyme'], bank: 'fach-rheuma-gelenke' },
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
  blutung: { kapitel: 'aktuell', pertinence: S },          // signe GROSSIER : ce que la lecture du texte trouve ; les sondes déclarent l'un des signes fins (revue K1 C5)
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
  insektenstich: { kapitel: 'fach', pertinence: S },   // K2 (revue clinique C3) : « oder einen Insektenstich » — les piqûres de moustique du paludisme, hors du gabarit borréliose
  erythem_ring: { kapitel: 'fach', pertinence: ['lyme'] },
  meningismus: { kapitel: 'fach', pertinence: ['meningitis', 'lyme', 'fieber'] },   // K2 (revue clinique C1) : + fieber — la raideur de nuque est un drapeau rouge de tout tableau fébrile
  fazialis: { kapitel: 'fach', pertinence: ['lyme'] },
  steifigkeit: { kapitel: 'fach', pertinence: ['steifigkeit'], bank: 'fach-rheuma-morgensteifigkeit' },
  // K2 : + `generalisiert` — devant une douleur diffuse, « ein Gelenk jemals geschwollen ? » écarte l'arthrite (DD de la fibromyalgie) ; « Welche Gelenke » (`gelenke`) reste hors profil.
  gelenk_entzuendung: { kapitel: 'fach', pertinence: ['gelenk', 'arthritis', 'generalisiert'], bank: 'fach-rheuma-entzuendung' },
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

  // ==========================================================================
  // K1 (ADR-0023) : le lexique s'étend aux 229 sondes. Liste fermée ; chaque signe
  // est celui d'UNE réplique de la fiche (règle d'identité). L'ordre n'est plus celui
  // de l'entretien : il groupe par chapitre. Il ne sert qu'aux banques (r3), toutes en K0.
  // `screening` partout : K2 affine la pertinence avec les profils, pas K1.
  // ==========================================================================
  // --- Personalia -------------------------------------------------------------
  name: { kapitel: 'personalia', pertinence: S },
  alter: { kapitel: 'personalia', pertinence: S },
  koerpermasse: { kapitel: 'personalia', pertinence: S },   // taille et poids ACTUELS (≠ `gewicht`, un changement)
  hausarzt: { kapitel: 'personalia', pertinence: S },
  // --- Aktuelle Beschwerden : ce que les variantes par nature cherchent --------
  motiv: { kapitel: 'aktuell', pertinence: S },
  giemen: { kapitel: 'aktuell', pertinence: S },            // Pfeifen, Brummen à la respiration
  leistung: { kapitel: 'aktuell', pertinence: S },          // ce que le patient ne fait plus au quotidien
  tageszeit: { kapitel: 'aktuell', pertinence: S },         // moment de la journée où c'est pire
  antrieb: { kapitel: 'aktuell', pertinence: S },
  dauer: { kapitel: 'aktuell', pertinence: S },             // durée d'un épisode
  halsschmerzen: { kapitel: 'aktuell', pertinence: S },
  wunde: { kapitel: 'aktuell', pertinence: S },
  knoten: { kapitel: 'aktuell', pertinence: S },            // nodule, tuméfaction, induration palpables
  haematome: { kapitel: 'aktuell', pertinence: S },         // blaue Flecken, Einblutungen
  entwicklung: { kapitel: 'aktuell', pertinence: S },       // plus grand, plus fréquent, plus mauvais
  urinmenge: { kapitel: 'aktuell', pertinence: S },
  miktion_frequenz: { kapitel: 'aktuell', pertinence: S },  // combien de fois on urine dans la journée (scission K1 de « Häufigkeit »)
  sprache: { kapitel: 'aktuell', pertinence: S },
  gang: { kapitel: 'aktuell', pertinence: S },
  feinmotorik: { kapitel: 'aktuell', pertinence: S },       // boutons, écriture, tenir une tasse
  anfallsablauf: { kapitel: 'aktuell', pertinence: S },
  anfallszeichen: { kapitel: 'aktuell', pertinence: S },    // Zungenbiss, perte d'urine, amnésie de la crise
  fremdanamnese: { kapitel: 'aktuell', pertinence: S },     // quelqu'un a-t-il vu ce qui s'est passé
  lokalschmerz: { kapitel: 'aktuell', pertinence: S },      // « tut es weh », sur une lésion
  // --- Fachanamnese ----------------------------------------------------------
  sodbrennen: { kapitel: 'fach', pertinence: S },
  voellegefuehl: { kapitel: 'fach', pertinence: S },
  speisen: { kapitel: 'fach', pertinence: S },              // les troubles surviennent-ils après certains aliments
  tenesmen: { kapitel: 'fach', pertinence: S },
  spiegelung: { kapitel: 'fach', pertinence: S },
  belastung: { kapitel: 'fach', pertinence: S },            // à l'effort ou au repos (cardio)
  lageabhaengig: { kapitel: 'fach', pertinence: S },        // lié à la respiration, au repas, à la position
  atemabhaengig: { kapitel: 'fach', pertinence: S },
  nuechternheit: { kapitel: 'fach', pertinence: S },
  windabgang: { kapitel: 'fach', pertinence: S },
  bauch_op: { kapitel: 'fach', pertinence: S },
  gallensteine: { kapitel: 'fach', pertinence: S },
  interesse: { kapitel: 'fach', pertinence: S },
  auswurf: { kapitel: 'fach', pertinence: S },
  schlafapnoe: { kapitel: 'fach', pertinence: S },
  atemwegsinfekt: { kapitel: 'fach', pertinence: S },
  lungennoxen: { kapitel: 'fach', pertinence: S },          // amiante, oiseaux, moisissures, farine
  asthma: { kapitel: 'fach', pertinence: S },
  arthralgie: { kapitel: 'fach', pertinence: ['lyme', 'arthritis', 'gelenk'] },   // douleurs articulaires ou musculaires migrantes (Fach Infekt)
  impfung: { kapitel: 'fach', pertinence: S },
  verschlucken: { kapitel: 'fach', pertinence: S },
  panikattacke: { kapitel: 'fach', pertinence: S },
  selbstverletzung: { kapitel: 'fach', pertinence: S },
  stimme: { kapitel: 'fach', pertinence: S },
  harnwegsinfekt: { kapitel: 'fach', pertinence: S },
  prostata: { kapitel: 'fach', pertinence: S },
  drang: { kapitel: 'fach', pertinence: S },
  harnstrahl: { kapitel: 'fach', pertinence: S },
  sexualanamnese: { kapitel: 'fach', pertinence: S },
  std_vorgeschichte: { kapitel: 'fach', pertinence: S },
  sexualfunktion: { kapitel: 'fach', pertinence: S },
  unfallhergang: { kapitel: 'fach', pertinence: S },
  begleitverletzung: { kapitel: 'fach', pertinence: S },
  bewegungsschmerz: { kapitel: 'fach', pertinence: S },
  ruheschmerz: { kapitel: 'fach', pertinence: S },
  belastbarkeit: { kapitel: 'fach', pertinence: S },
  ortho_vorgeschichte: { kapitel: 'fach', pertinence: S },
  durchblutung: { kapitel: 'fach', pertinence: S },
  augenentzuendung: { kapitel: 'fach', pertinence: S },
  ulzera: { kapitel: 'fach', pertinence: S },               // Mund-, Genitalgeschwüre
  aura: { kapitel: 'fach', pertinence: S },
  autonome_zeichen: { kapitel: 'fach', pertinence: S },     // Tränenfluss, Nasenverstopfung, Ptosis
  temperaturtoleranz: { kapitel: 'fach', pertinence: S },
  tremor: { kapitel: 'fach', pertinence: S },
  unruhe: { kapitel: 'fach', pertinence: S },
  halsschwellung: { kapitel: 'fach', pertinence: S },
  augenveraenderung: { kapitel: 'fach', pertinence: S },
  haut_haare: { kapitel: 'fach', pertinence: S },
  hypoglykaemie: { kapitel: 'fach', pertinence: S },
  nierenprobleme: { kapitel: 'fach', pertinence: S },
  endokrine_therapie: { kapitel: 'fach', pertinence: S },
  blaesse: { kapitel: 'fach', pertinence: S },
  blutdruck: { kapitel: 'fach', pertinence: S },
  nephrotoxika: { kapitel: 'fach', pertinence: S },
  geschmack: { kapitel: 'fach', pertinence: S },
  vorinfekt: { kapitel: 'fach', pertinence: S },
  nierenvorgeschichte: { kapitel: 'fach', pertinence: S },
  ernaehrung: { kapitel: 'fach', pertinence: S },
  lymphknoten: { kapitel: 'fach', pertinence: S },
  infektneigung: { kapitel: 'fach', pertinence: S },
  wundheilung: { kapitel: 'fach', pertinence: S },
  knochenschmerz: { kapitel: 'fach', pertinence: S },
  thrombose_vorgeschichte: { kapitel: 'fach', pertinence: S },
  ausbreitung: { kapitel: 'fach', pertinence: S },
  hautbefund: { kapitel: 'fach', pertinence: S },
  hautvorgeschichte: { kapitel: 'fach', pertinence: S },
  muttermal: { kapitel: 'fach', pertinence: S },
  vorbehandlung: { kapitel: 'fach', pertinence: S },
  unterbauchschmerz: { kapitel: 'fach', pertinence: S },
  fluor: { kapitel: 'fach', pertinence: S },
  dyspareunie: { kapitel: 'fach', pertinence: S },
  geburten: { kapitel: 'fach', pertinence: S },
  kinderwunsch: { kapitel: 'fach', pertinence: S },
  brust: { kapitel: 'fach', pertinence: S },
  vorsorge_gyn: { kapitel: 'fach', pertinence: S },
  gyn_op: { kapitel: 'fach', pertinence: S },
  hormone: { kapitel: 'fach', pertinence: S },
  gehstrecke: { kapitel: 'fach', pertinence: S },
  beinschwellung: { kapitel: 'fach', pertinence: S },
  immobilisation: { kapitel: 'fach', pertinence: S },
  gefaess_vorgeschichte: { kapitel: 'fach', pertinence: S },
  tumor_vorgeschichte: { kapitel: 'fach', pertinence: S },
  vorsorge_krebs: { kapitel: 'fach', pertinence: S },
  familie_krebs: { kapitel: 'fach', pertinence: S },
  familie_thrombose: { kapitel: 'fach', pertinence: S },
  familie_endokrin: { kapitel: 'fach', pertinence: S },
  familie_haut: { kapitel: 'fach', pertinence: S },
  familie_niere: { kapitel: 'fach', pertinence: S },
  // --- Revue K1 (C1, C2, C3, C5, DPN) : granularité clinique ---------------------
  atopie: { kapitel: 'fach', pertinence: S },               // terrain atopique (rhume des foins, eczéma) ≠ `allergie` (médicamenteuse, à la pénicilline…)
  auswurf_aspekt: { kapitel: 'fach', pertinence: S },       // couleur, quantité, consistance du crachat ≠ `auswurf` (en crache-t-il ?) — modèle stuhl / stuhlaussehen
  haemoptyse: { kapitel: 'fach', pertinence: S },           // sang dans le crachat : red flag, une réplique à elle seule
  flankenschmerz: { kapitel: 'fach', pertinence: S },       // douleur du flanc ou du dos (colique) ≠ `ort` de la plainte
  dpn: { kapitel: 'aktuell', pertinence: S },               // dyspnée paroxystique nocturne (réveil par la dyspnée) ≠ `orthopnoe` (dormir surélevé)
  blutungsneigung: { kapitel: 'fach', pertinence: S },      // diathèse : hématomes spontanés, épistaxis, gingivorragies
  blutverlust: { kapitel: 'fach', pertinence: S },          // source d'une perte de sang chronique (selles, règles)
  vaginalblutung: { kapitel: 'fach', pertinence: S },       // saignement génital anormal (intermenstruel, post-ménopausique, post-coïtal)
  lokalblutung: { kapitel: 'aktuell', pertinence: S },      // une lésion (grain de beauté, nodule, plaie) qui saigne
  // --- Frauenanamnese ---------------------------------------------------------
  zyklus: { kapitel: 'frauenanamnese', pertinence: S },      // régularité du cycle ≠ `blutung` (une hémorragie qui a changé)
  schwangerschaft: { kapitel: 'frauenanamnese', pertinence: S },
  verhuetung: { kapitel: 'frauenanamnese', pertinence: S },
  wechseljahre: { kapitel: 'frauenanamnese', pertinence: S },
  // --- Vorerkrankungen, Medikamente, Allergien, Noxen, Familie & Sozial ------
  vorerkrankung: { kapitel: 'vorerkrankungen', pertinence: S },
  operation: { kapitel: 'vorerkrankungen', pertinence: S },
  krankenhaus: { kapitel: 'vorerkrankungen', pertinence: S },
  medikation: { kapitel: 'medikamente', pertinence: S },
  antikoagulation: { kapitel: 'medikamente', pertinence: S },
  kortison: { kapitel: 'medikamente', pertinence: S },
  selbstmedikation: { kapitel: 'medikamente', pertinence: S },
  allergie: { kapitel: 'allergien', pertinence: S },
  unvertraeglichkeit: { kapitel: 'allergien', pertinence: S },
  rauchen: { kapitel: 'noxen', pertinence: S },
  alkohol: { kapitel: 'noxen', pertinence: S },
  drogen: { kapitel: 'noxen', pertinence: S },
  familie_krank: { kapitel: 'familie-sozial', pertinence: S },
  eltern: { kapitel: 'familie-sozial', pertinence: S },
  familienstand: { kapitel: 'familie-sozial', pertinence: S },
  kinder: { kapitel: 'familie-sozial', pertinence: S },
  beruf: { kapitel: 'familie-sozial', pertinence: S },
  stress: { kapitel: 'familie-sozial', pertinence: S },
  berufsstoffe: { kapitel: 'familie-sozial', pertinence: S },
  wohnsituation: { kapitel: 'familie-sozial', pertinence: S },
  haustiere: { kapitel: 'familie-sozial', pertinence: S },
} satisfies Record<string, SigneDefBody>;

export type Signe = keyof typeof DEFS;
