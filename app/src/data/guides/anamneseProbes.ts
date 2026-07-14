import type { RolePlayKapitel, Specialty } from '@/db/types';

// ============================================================================
// CHECKLIST CANONIQUE DES SONDES D'ANAMNÈSE — le « contrat de couverture ».
// ----------------------------------------------------------------------------
// C'est la SOURCE UNIQUE DE VÉRITÉ des questions que le candidat peut poser.
// Elle est dérivée fidèlement du guide d'anamnèse (anamneseChapters.ts) :
//   • BASE_PROBES        = Allgemeine Anamnese (tous cas)
//   • FRAUEN_PROBES      = Frauenanamnese (uniquement patientes)
//   • FACH_PROBES[spec]  = Spezielle Anamnese de la spécialité du cas
//
// Chaque cas clinique répond à ces sondes via `patientSheet.antworten`
// (probeId → réplique). La couverture devient STRUCTURELLE : un validateur
// (scripts/checkProbeCoverage) refuse tout cas qui laisse une sonde applicable
// sans réponse. Ce schéma sera réutilisé tel quel en PHASE 2 (import de masse) :
// importer un cas = remplir sa carte `antworten` pour toutes ses sondes.
//
// `frage` = formulation patient de la question (repère affiché au simulant).
// L'ordre des sondes = l'ordre de l'entretien (il pilote l'affichage).
// ============================================================================

export interface AnamneseProbe {
  id: string;
  kapitel: RolePlayKapitel;
  frage: string;
}

// --- Allgemeine Anamnese (tous les cas) -------------------------------------
export const BASE_PROBES: AnamneseProbe[] = [
  // Persönliche Daten
  { id: 'pers-name', kapitel: 'personalia', frage: 'Wie heißen Sie mit vollständigem Namen? Können Sie ihn buchstabieren?' },
  { id: 'pers-alter', kapitel: 'personalia', frage: 'Wie alt sind Sie? Wann sind Sie geboren?' },
  { id: 'pers-groesse', kapitel: 'personalia', frage: 'Wie groß sind Sie und wie viel wiegen Sie?' },
  { id: 'pers-beruf', kapitel: 'personalia', frage: 'Was sind Sie von Beruf? Arbeiten Sie mit besonderen Stoffen (Staub, Chemikalien)?' },
  { id: 'pers-hausarzt', kapitel: 'personalia', frage: 'Haben Sie einen Hausarzt?' },

  // Aktuelle Beschwerden (OPQRST)
  { id: 'akt-motiv', kapitel: 'aktuell', frage: 'Was führt Sie heute zu uns?' },
  { id: 'akt-ort', kapitel: 'aktuell', frage: 'Wo genau spüren Sie die Beschwerden? Können Sie mit dem Finger zeigen?' },
  { id: 'akt-beginn', kapitel: 'aktuell', frage: 'Seit wann haben Sie das? Kam es plötzlich oder schleichend?' },
  { id: 'akt-charakter', kapitel: 'aktuell', frage: 'Wie fühlt es sich an — dumpf, stechend, brennend, drückend, krampfartig?' },
  { id: 'akt-intensitaet', kapitel: 'aktuell', frage: 'Wie stark sind die Beschwerden auf einer Skala von 1 bis 10?' },
  { id: 'akt-ausstrahlung', kapitel: 'aktuell', frage: 'Strahlen die Beschwerden aus? Wohin?' },
  { id: 'akt-verlauf', kapitel: 'aktuell', frage: 'Sind sie dauerhaft da oder treten sie anfallsartig auf? Wie lange dauert eine Episode?' },
  { id: 'akt-ausloeser', kapitel: 'aktuell', frage: 'Gab es einen Auslöser? Was taten Sie, als es begann?' },
  { id: 'akt-einfluss', kapitel: 'aktuell', frage: 'Was bessert oder verschlimmert es (Essen, Bewegung, Atmung, Körperhaltung)? Haben Sie schon etwas dagegen genommen?' },
  { id: 'akt-frueher', kapitel: 'aktuell', frage: 'Hatten Sie solche Beschwerden schon einmal? Waren Sie deswegen beim Arzt?' },
  { id: 'akt-begleit', kapitel: 'aktuell', frage: 'Haben Sie außerdem noch andere Beschwerden bemerkt?' },

  // Vegetative Anamnese
  { id: 'veg-fieber', kapitel: 'vegetativ', frage: 'Haben Sie Fieber gemessen? Seit wann, wie hoch? Waren Sie kürzlich im Ausland?' },
  { id: 'veg-schuettelfrost', kapitel: 'vegetativ', frage: 'Haben Sie Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche?' },
  { id: 'veg-uebelkeit', kapitel: 'vegetativ', frage: 'Ist Ihnen übel? Mussten Sie sich übergeben? Wie sah es aus, seit wann, wie häufig?' },
  { id: 'veg-ausscheidung', kapitel: 'vegetativ', frage: 'Haben Sie Probleme mit dem Stuhlgang oder beim Wasserlassen? Aussehen, wie oft?' },
  { id: 'veg-gewicht', kapitel: 'vegetativ', frage: 'Haben Sie Gewichtsveränderungen bemerkt? Wie viele Kilo, in welchem Zeitraum?' },
  { id: 'veg-appetit', kapitel: 'vegetativ', frage: 'Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten geändert?' },
  { id: 'veg-schlaf', kapitel: 'vegetativ', frage: 'Ist Ihr Schlaf erholsam? Haben Sie Ein- oder Durchschlafstörungen?' },

  // Vorerkrankungen & Voroperationen
  { id: 'vor-erkrank', kapitel: 'vorerkrankungen', frage: 'Haben Sie Vorerkrankungen (Bluthochdruck, Zuckerkrankheit, erhöhte Blutfette)? Seit wann, behandelt?' },
  { id: 'vor-op', kapitel: 'vorerkrankungen', frage: 'Wurden Sie schon einmal operiert? Welche Eingriffe, wann, Komplikationen?' },
  { id: 'vor-krankenhaus', kapitel: 'vorerkrankungen', frage: 'Waren Sie in letzter Zeit im Krankenhaus?' },

  // Medikamente
  { id: 'med-regelmaessig', kapitel: 'medikamente', frage: 'Nehmen Sie regelmäßig oder gelegentlich Medikamente? Welche, seit wann, Dosierung?' },
  { id: 'med-blutverduenner', kapitel: 'medikamente', frage: 'Nehmen Sie Blutverdünner oder Kortison?' },
  { id: 'med-otc', kapitel: 'medikamente', frage: 'Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?' },

  // Allergien & Unverträglichkeiten
  { id: 'all-allergie', kapitel: 'allergien', frage: 'Sind Sie allergisch gegen Medikamente oder Nahrungsmittel? Wie reagieren Sie?' },
  { id: 'all-unvertraeglich', kapitel: 'allergien', frage: 'Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?' },

  // Noxen / Genussmittel
  { id: 'nox-rauchen', kapitel: 'noxen', frage: 'Rauchen Sie? Seit wann und wie viel? (Oder: wann aufgehört?)' },
  { id: 'nox-alkohol', kapitel: 'noxen', frage: 'Trinken Sie Alkohol? Was, wie oft und wie viel?' },
  { id: 'nox-drogen', kapitel: 'noxen', frage: 'Konsumieren Sie Drogen, zum Beispiel Cannabis?' },

  // Familien- & Sozialanamnese
  { id: 'fam-familie', kapitel: 'familie-sozial', frage: 'Gibt es in Ihrer Familie chronische Erkrankungen? Welche, seit wann?' },
  { id: 'fam-eltern', kapitel: 'familie-sozial', frage: 'Leben Ihre Eltern noch? (Falls verstorben: woran und wann?)' },
  { id: 'fam-stand', kapitel: 'familie-sozial', frage: 'Wie ist Ihr Familienstand? Haben Sie Kinder — wie viele, und sind sie gesund?' },
  { id: 'fam-beruf', kapitel: 'familie-sozial', frage: 'Was sind Sie von Beruf? Haben Sie Stress bei der Arbeit? (Oder: in Rente?)' },
  { id: 'fam-wohnen', kapitel: 'familie-sozial', frage: 'Wohnen Sie allein oder mit jemandem? Wohnung oder Haus, welches Stockwerk, mit Aufzug?' },
  { id: 'fam-haustiere', kapitel: 'familie-sozial', frage: 'Haben Sie Haustiere, um die sich jemand kümmern muss?' },
];

// --- Frauenanamnese (uniquement patientes) ----------------------------------
export const FRAUEN_PROBES: AnamneseProbe[] = [
  { id: 'frau-periode', kapitel: 'frauenanamnese', frage: 'Ist Ihre Monatsblutung regelmäßig? Wann war Ihre letzte Regelblutung?' },
  { id: 'frau-schwanger', kapitel: 'frauenanamnese', frage: 'Besteht die Möglichkeit, dass Sie schwanger sind?' },
  { id: 'frau-verhuetung', kapitel: 'frauenanamnese', frage: 'Verwenden Sie Verhütungsmethoden? Wenn ja, welche?' },
  { id: 'frau-wechseljahre', kapitel: 'frauenanamnese', frage: 'Sind Sie in den Wechseljahren? Gehen Sie regelmäßig zum Frauenarzt?' },
];

// --- Spezielle Anamnese par spécialité --------------------------------------
// Chaque spécialité reprend fidèlement les questions de sa Fachanamnese.
// (Ajouter ici les autres spécialités au fil de la PHASE 2.)
export const FACH_PROBES: Partial<Record<Specialty, AnamneseProbe[]>> = {
  Gastroenterologie: [
    { id: 'fach-gastro-uebelkeit', kapitel: 'fach', frage: 'Leiden Sie an Übelkeit oder Erbrechen? Wie sah es aus (wie Kaffeesatz, mit Blut)? Wie lange nach dem Essen? Geht es Ihnen danach besser?' },
    { id: 'fach-gastro-sodbrennen', kapitel: 'fach', frage: 'Haben Sie Sodbrennen? Müssen Sie aufstoßen?' },
    { id: 'fach-gastro-voelle', kapitel: 'fach', frage: 'Haben Sie ein Völlegefühl? Werden Sie schneller satt als früher? Fühlen Sie sich aufgebläht?' },
    { id: 'fach-gastro-speisen', kapitel: 'fach', frage: 'Treten die Beschwerden nach bestimmten Speisen auf? Was haben Sie zuletzt gegessen?' },
    { id: 'fach-gastro-stuhl', kapitel: 'fach', frage: 'Haben Sie Durchfall oder Verstopfung, evtl. im Wechsel? Welche Farbe (blutig, teerschwarz, hell) und Konsistenz hat der Stuhl?' },
    { id: 'fach-gastro-tenesmen', kapitel: 'fach', frage: 'Haben Sie manchmal das Gefühl, zur Toilette zu müssen, aber es kommt nichts?' },
    { id: 'fach-gastro-spiegelung', kapitel: 'fach', frage: 'Wann hatten Sie die letzte Magen- oder Darmspiegelung? Was war das Ergebnis?' },
  ],
  Kardiologie: [
    { id: 'fach-kardio-brust', kapitel: 'fach', frage: 'Haben Sie Schmerzen oder ein Engegefühl in der Brust? Wo genau — hinter dem Brustbein oder in der Magengrube?' },
    { id: 'fach-kardio-belastung', kapitel: 'fach', frage: 'Treten die Beschwerden nur bei Belastung oder auch in Ruhe auf? Wie lange dauern sie?' },
    { id: 'fach-kardio-ausstrahlung', kapitel: 'fach', frage: 'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?' },
    { id: 'fach-kardio-atem', kapitel: 'fach', frage: 'Hängen die Beschwerden mit dem Atmen, dem Essen oder der Körperlage zusammen?' },
    { id: 'fach-kardio-nitro', kapitel: 'fach', frage: 'Haben Sie ein Nitrospray benutzt? Hat es geholfen?' },
    { id: 'fach-kardio-herzrasen', kapitel: 'fach', frage: 'Haben Sie Herzrasen, Herzklopfen oder Herzstolpern bemerkt?' },
    { id: 'fach-kardio-luft', kapitel: 'fach', frage: 'Bekommen Sie schwer Luft, besonders beim Treppensteigen? Wie viele Stockwerke schaffen Sie ohne Pause?' },
    { id: 'fach-kardio-oedeme', kapitel: 'fach', frage: 'Sind Ihre Beine oder Knöchel geschwollen? Mit wie vielen Kissen schlafen Sie?' },
    { id: 'fach-kardio-nykturie', kapitel: 'fach', frage: 'Müssen Sie nachts Wasser lassen? Wie oft?' },
    { id: 'fach-kardio-synkope', kapitel: 'fach', frage: 'Wird es Ihnen manchmal schwarz vor Augen? Sind Sie schon einmal ohnmächtig geworden?' },
  ],
  Chirurgie: [
    { id: 'fach-chir-essen', kapitel: 'fach', frage: 'Wann haben Sie zuletzt gegessen und getrunken? Was genau?' },
    { id: 'fach-chir-uebelkeit', kapitel: 'fach', frage: 'Ist Ihnen übel? Haben Sie sich übergeben?' },
    { id: 'fach-chir-ileus', kapitel: 'fach', frage: 'Hatten Sie heute Stuhlgang? Gehen noch Winde ab?' },
    { id: 'fach-chir-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber?' },
    { id: 'fach-chir-op', kapitel: 'fach', frage: 'Wurden Sie schon einmal am Bauch operiert? Haben Sie Narben?' },
    { id: 'fach-chir-blutverduenner', kapitel: 'fach', frage: 'Nehmen Sie Blutverdünner ein?' },
    { id: 'fach-chir-gallensteine', kapitel: 'fach', frage: 'Haben Sie bekannte Gallensteine oder einen Leistenbruch?' },
  ],
};

// --- Index & helpers --------------------------------------------------------
/** Toutes les sondes connues, indexées par id (résolution O(1) au rendu). */
export const PROBE_BY_ID: Record<string, AnamneseProbe> = (() => {
  const map: Record<string, AnamneseProbe> = {};
  const all = [
    ...BASE_PROBES,
    ...FRAUEN_PROBES,
    ...Object.values(FACH_PROBES).flatMap((arr) => arr ?? []),
  ];
  for (const p of all) map[p.id] = p;
  return map;
})();

/** Ordre global d'affichage d'une sonde (pour trier les répliques d'un chapitre
 *  dans l'ordre de l'entretien, quelle que soit la clé de la carte antworten). */
export const PROBE_ORDER: Record<string, number> = (() => {
  const order: Record<string, number> = {};
  let i = 0;
  for (const p of BASE_PROBES) order[p.id] = i++;
  for (const p of FRAUEN_PROBES) order[p.id] = i++;
  for (const arr of Object.values(FACH_PROBES)) for (const p of arr ?? []) order[p.id] = i++;
  return order;
})();

/** Liste des sondes APPLICABLES à un cas — le contrat de couverture à remplir.
 *  = Allgemeine Anamnese + Fachanamnese de la spécialité + Frauenanamnese si
 *  patiente. Utilisé par le validateur et (optionnellement) pour signaler les
 *  trous au rendu. */
export function probesForCase(specialty: Specialty, weiblich: boolean): AnamneseProbe[] {
  return [
    ...BASE_PROBES,
    ...(FACH_PROBES[specialty] ?? []),
    ...(weiblich ? FRAUEN_PROBES : []),
  ];
}
