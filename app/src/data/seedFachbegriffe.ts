import type { Fachbegriff, Specialty, Center } from '@/db/types';
import { freshSrs } from '@/lib/srs';

// ============================================================================
// ~45 Fachbegriffe de démonstration (issus du deck FSP réel, focus gastro/cardio
// + termes transversaux). En PHASE 2, les 2249 termes du CSV seront importés.
// Format compact → transformé en Fachbegriff complet par `mk`.
// t=term, s=simple(FR/DE), sp=specialty, p=pronunciation, tags, c=centers, def
// ============================================================================

type Row = {
  t: string; s: string; sp: Specialty; p?: string;
  tags?: string[]; c?: Center[]; def?: string;
};

const R: Row[] = [
  // --- Gastroenterologie / Hepatologie ---
  { t: 'Aszites', s: 'Bauchwassersucht — Flüssigkeit im Bauchraum', sp: 'Gastroenterologie', p: 'asˈtsiːtəs', tags: ['Leberzirrhose'], c: ['Reutlingen', 'Freiburg'], def: 'Pathologische Ansammlung von freier Flüssigkeit in der Bauchhöhle (Peritonealraum).' },
  { t: 'Ikterus', s: 'Gelbfärbung von Haut und Augen', sp: 'Gastroenterologie', p: 'ˈɪktəʁʊs', tags: ['Leberzirrhose', 'Cholezystolithiasis'], c: ['Freiburg', 'Stuttgart'], def: 'Gelbfärbung von Haut, Schleimhäuten und Skleren durch erhöhtes Bilirubin.' },
  { t: 'Hämatemesis', s: 'Bluterbrechen', sp: 'Gastroenterologie', p: 'hɛmaˈteːmezɪs', tags: ['Obere GI-Blutung'], c: ['Karlsruhe', 'Stuttgart'], def: 'Erbrechen von Blut, hellrot oder kaffeesatzartig bei oberer GI-Blutung.' },
  { t: 'Meläna', s: 'Teerstuhl — schwarzer Stuhl durch Blut', sp: 'Gastroenterologie', p: 'meˈlɛːna', tags: ['Obere GI-Blutung'], c: ['Reutlingen', 'Stuttgart'], def: 'Schwarz gefärbter, klebriger Stuhl durch verdautes Blut (obere GI-Blutung).' },
  { t: 'Ösophagusvarizen', s: 'Krampfadern der Speiseröhre', sp: 'Gastroenterologie', p: 'øˈzoːfaɡʊsvaˌʁiːt͡sn̩', tags: ['Leberzirrhose', 'Obere GI-Blutung'], c: ['Reutlingen', 'Freiburg'], def: 'Erweiterte Venen der Speiseröhre bei portaler Hypertension; Blutungsgefahr.' },
  { t: 'Dysphagie', s: 'Schluckstörung', sp: 'Gastroenterologie', p: 'dʏsˈfaːɡiː', tags: ['Ösophaguskarzinom'], c: ['Stuttgart'], def: 'Störung des Schluckakts, Schwierigkeiten beim Transport von Nahrung.' },
  { t: 'Pyrosis', s: 'Sodbrennen', sp: 'Gastroenterologie', p: 'pyˈʁoːzɪs', tags: ['GERD (Refluxkrankheit)'], c: ['Karlsruhe', 'Freiburg'], def: 'Brennendes Gefühl hinter dem Brustbein durch Rückfluss von Magensäure.' },
  { t: 'Meteorismus', s: 'Blähungen / aufgeblähter Bauch', sp: 'Gastroenterologie', p: 'meteoˈʁɪsmʊs', tags: ['Reizdarm / funktionell'], c: ['Freiburg'], def: 'Vermehrte Gasansammlung im Magen-Darm-Trakt.' },
  { t: 'Hepatomegalie', s: 'Lebervergrößerung', sp: 'Gastroenterologie', p: 'hepatomeɡaˈliː', tags: ['Leberzirrhose'], c: ['Freiburg'], def: 'Vergrößerung der Leber über die normale Größe hinaus.' },
  { t: 'Cholezystektomie', s: 'operative Entfernung der Gallenblase', sp: 'Chirurgie', p: 'kolet͡sʏstɛktoˈmiː', tags: ['Cholezystolithiasis', 'Akute Cholezystitis'], c: ['Reutlingen'], def: 'Chirurgische Entfernung der Gallenblase, meist laparoskopisch.' },
  { t: 'Koliken', s: 'krampfartige, wellenförmige Schmerzen', sp: 'Gastroenterologie', p: 'ˈkoːlɪkn̩', tags: ['Cholezystolithiasis', 'Nephrolithiasis'], c: ['Reutlingen', 'Freiburg'], def: 'Wellenförmige, an- und abschwellende Schmerzen eines Hohlorgans.' },
  { t: 'Inappetenz', s: 'Appetitlosigkeit', sp: 'Allgemein', p: 'ɪnapeˈtɛnt͡s', tags: ['Magenkarzinom', 'Leberzirrhose'], c: ['Stuttgart', 'Freiburg'], def: 'Fehlender oder verminderter Appetit.' },
  { t: 'Tenesmen', s: 'schmerzhafter Stuhldrang ohne Entleerung', sp: 'Gastroenterologie', p: 'teˈnɛsmən', tags: ['Divertikulitis', 'CED (Crohn/Colitis)'], c: ['Karlsruhe'], def: 'Schmerzhafter, häufiger Stuhl- oder Harndrang bei geringer Entleerung.' },
  { t: 'Aszitespunktion', s: 'Ablassen von Bauchwasser mit einer Nadel', sp: 'Gastroenterologie', p: 'asˈt͡siːtəspʊŋkˌt͡si̯oːn', tags: ['Leberzirrhose'], c: ['Reutlingen'], def: 'Punktion der Bauchhöhle zur Entlastung oder Diagnostik von Aszites.' },

  // --- Kardiologie / Gefäße ---
  { t: 'Angina pectoris', s: 'Brustenge — Engegefühl in der Brust', sp: 'Kardiologie', p: 'aŋˈɡiːna ˈpɛktoʁɪs', tags: ['Angina pectoris / KHK'], c: ['Karlsruhe', 'Reutlingen'], def: 'Anfallsartige retrosternale Schmerzen durch Myokardischämie.' },
  { t: 'Dyspnoe', s: 'Atemnot / Kurzatmigkeit', sp: 'Pneumologie', p: 'dʏsˈpnøː', tags: ['Herzinsuffizienz', 'Lungenembolie', 'Pneumonie'], c: ['Reutlingen', 'Stuttgart'], def: 'Subjektiv erschwerte Atmung, Gefühl der Luftnot.' },
  { t: 'Palpitationen', s: 'Herzklopfen / Herzstolpern', sp: 'Kardiologie', p: 'palpitaˈt͡si̯oːnən', tags: ['Angina pectoris / KHK'], c: ['Karlsruhe'], def: 'Wahrnehmung des eigenen Herzschlags, oft als Stolpern oder Rasen.' },
  { t: 'Tachykardie', s: 'zu schneller Herzschlag (>100/min)', sp: 'Kardiologie', p: 'taxykaʁˈdiː', tags: ['Angina pectoris / KHK', 'Lungenembolie'], c: ['Reutlingen'], def: 'Herzfrequenz über 100 Schlägen pro Minute in Ruhe.' },
  { t: 'Synkope', s: 'kurze Bewusstlosigkeit / Ohnmacht', sp: 'Kardiologie', p: 'zʏŋˈkoːpə', tags: ['Angina pectoris / KHK'], c: ['Freiburg'], def: 'Plötzlicher, kurzer Bewusstseinsverlust durch zerebrale Minderperfusion.' },
  { t: 'Ödem', s: 'Wasseransammlung / Schwellung im Gewebe', sp: 'Kardiologie', p: 'øˈdeːm', tags: ['Herzinsuffizienz', 'Leberzirrhose'], c: ['Stuttgart', 'Reutlingen'], def: 'Ansammlung von Flüssigkeit im Interstitium, sichtbar als Schwellung.' },
  { t: 'Koronarangiographie', s: 'Darstellung der Herzkranzgefäße mit Kontrastmittel', sp: 'Kardiologie', p: 'koʁoˌnaːʁaŋɡi̯oˈɡʁaːfiː', tags: ['Angina pectoris / KHK', 'Akutes Koronarsyndrom'], c: ['Karlsruhe', 'Reutlingen'], def: 'Invasive Kontrastmitteldarstellung der Koronararterien via Herzkatheter.' },
  { t: 'Claudicatio intermittens', s: 'Schaufensterkrankheit — Beinschmerz beim Gehen', sp: 'Kardiologie', p: 'klau̯diˈkaːt͡si̯o ɪntɐˈmɪtəns', tags: ['pAVK'], c: ['Reutlingen', 'Karlsruhe'], def: 'Belastungsabhängiger Beinschmerz bei pAVK, der zum Stehenbleiben zwingt.' },
  { t: 'Thrombose', s: 'Blutgerinnsel in einem Gefäß', sp: 'Kardiologie', p: 'tʁɔmˈboːzə', tags: ['Tiefe Venenthrombose (TVT)'], c: ['Freiburg', 'Stuttgart'], def: 'Intravasale Bildung eines Blutgerinnsels mit Gefäßverschluss.' },

  // --- Transversaux / examen ---
  { t: 'Verdachtsdiagnose', s: 'vermutete Diagnose (noch nicht bestätigt)', sp: 'Allgemein', p: 'fɛɐ̯ˈdaxt͡sdiaˌɡnoːzə', tags: [], c: ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'], def: 'Auf Anamnese und Klinik gestützte, noch zu bestätigende Arbeitsdiagnose.' },
  { t: 'Differenzialdiagnose', s: 'andere mögliche Erklärungen der Symptome', sp: 'Allgemein', p: 'dɪfəˌʁɛnt͡si̯aːldiaˌɡnoːzə', tags: [], c: ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'], def: 'Alternativ in Betracht kommende Erkrankungen mit ähnlicher Symptomatik.' },
  { t: 'Nüchternheit', s: 'nichts essen/trinken vor einer Untersuchung', sp: 'Allgemein', p: 'ˈnʏçtɐnhaɪ̯t', tags: [], c: ['Karlsruhe'], def: 'Verzicht auf Nahrung (und ggf. Flüssigkeit) vor Eingriffen/Untersuchungen.' },
  { t: 'Kontrastmittel', s: 'Substanz, die Strukturen im Bild sichtbar macht', sp: 'Allgemein', p: 'kɔnˈtʁastmɪtl̩', tags: [], c: ['Karlsruhe', 'Reutlingen'], def: 'Substanz zur Verbesserung des Bildkontrasts bei radiologischen Verfahren.' },
  { t: 'Anamnese', s: 'Krankengeschichte / Befragung des Patienten', sp: 'Allgemein', p: 'anaˈmneːzə', tags: [], c: ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'], def: 'Systematische Erhebung der Krankengeschichte durch Befragung.' },
  { t: 'Noxen', s: 'schädliche Genussmittel (Tabak, Alkohol, Drogen)', sp: 'Allgemein', p: 'ˈnɔksn̩', tags: [], c: ['Freiburg', 'Stuttgart'], def: 'Gesundheitsschädigende Substanzen/Einflüsse (Nikotin, Alkohol, Drogen).' },
  { t: 'Adynamie', s: 'Kraftlosigkeit / Schwäche', sp: 'Allgemein', p: 'adyˈnaːmiː', tags: ['Leberzirrhose', 'Anämie'], c: ['Reutlingen'], def: 'Ausgeprägte Muskelschwäche und allgemeine Kraftlosigkeit.' },
  { t: 'Hämatom', s: 'Bluterguss / blauer Fleck', sp: 'Allgemein', p: 'hɛmaˈtoːm', tags: ['Leberzirrhose'], c: ['Reutlingen'], def: 'Ansammlung von Blut im Gewebe nach Gefäßverletzung.' },
  { t: 'Nausea', s: 'Übelkeit', sp: 'Gastroenterologie', p: 'ˈnaʊ̯zea', tags: ['Akute Pankreatitis', 'Akute Cholezystitis'], c: ['Reutlingen', 'Stuttgart'], def: 'Unangenehmes Gefühl im Oberbauch mit Brechreiz.' },
  { t: 'Vomitus', s: 'Erbrechen', sp: 'Gastroenterologie', p: 'ˈvoːmitʊs', tags: ['Akute Pankreatitis'], c: ['Reutlingen'], def: 'Schwallartige Entleerung von Mageninhalt über den Mund.' },
  { t: 'Obstipation', s: 'Verstopfung', sp: 'Gastroenterologie', p: 'ɔpstiˈpaːt͡si̯oːn', tags: ['Divertikulitis', 'Reizdarm / funktionell'], c: ['Stuttgart'], def: 'Erschwerte, seltene oder unvollständige Stuhlentleerung.' },
  { t: 'Diarrhö', s: 'Durchfall', sp: 'Gastroenterologie', p: 'diaˈʁøː', tags: ['Gastroenteritis', 'CED (Crohn/Colitis)'], c: ['Karlsruhe', 'Reutlingen'], def: 'Häufige, dünnflüssige Stuhlentleerungen (>3/Tag).' },
  { t: 'Epigastrium', s: 'Oberbauch (Magengrube)', sp: 'Anatomie', p: 'epiˈɡastʁiʊm', tags: ['Akute Pankreatitis', 'Ulcus / Gastritis'], c: ['Reutlingen'], def: 'Mittlere Oberbauchregion oberhalb des Nabels unter dem Brustbein.' },
  { t: 'retrosternal', s: 'hinter dem Brustbein', sp: 'Anatomie', p: 'ʁetʁoˈstɛʁnaːl', tags: ['Angina pectoris / KHK'], c: ['Karlsruhe'], def: 'Lokalisation hinter dem Sternum (Brustbein).' },
  { t: 'Ausstrahlung', s: 'Ausbreitung des Schmerzes in andere Regionen', sp: 'Allgemein', p: 'ˈaʊ̯sˌʃtʁaːlʊŋ', tags: ['Angina pectoris / KHK', 'Akute Pankreatitis'], c: ['Reutlingen'], def: 'Fortleitung von Schmerz in benachbarte oder entfernte Körperregionen.' },
  { t: 'Nachtschweiß', s: 'starkes Schwitzen in der Nacht', sp: 'Allgemein', p: 'ˈnaxtʃvaɪ̯s', tags: ['Malignes Lymphom', 'Lyme-Borreliose'], c: ['Freiburg'], def: 'Nächtliches, oft profuses Schwitzen; B-Symptom bei Malignomen/Infekten.' },
  { t: 'Gewichtsverlust', s: 'ungewollte Gewichtsabnahme', sp: 'Allgemein', p: 'ɡəˈvɪçt͡sfɛɐ̯ˌlʊst', tags: ['Ösophaguskarzinom', 'Magenkarzinom'], c: ['Stuttgart'], def: 'Ungewollte Abnahme des Körpergewichts; B-Symptom bei Tumoren.' },
  { t: 'Stationäre Aufnahme', s: 'Aufnahme ins Krankenhaus', sp: 'Allgemein', p: 'ʃtatsi̯oˈnɛːʁə ˈaʊ̯fnaːmə', tags: [], c: ['Freiburg'], def: 'Aufnahme eines Patienten zur Behandlung mit Übernachtung im Krankenhaus.' },
  { t: 'Rezidiv', s: 'Rückfall / Wiederauftreten einer Krankheit', sp: 'Allgemein', p: 'ʁet͡siˈdiːf', tags: ['Kolorektales Karzinom', 'Divertikulitis'], c: ['Karlsruhe'], def: 'Wiederauftreten einer Erkrankung nach zwischenzeitlicher Besserung.' },
  { t: 'Palliativ', s: 'lindernd, nicht heilend', sp: 'Allgemein', p: 'paliaˈtiːf', tags: ['Ösophaguskarzinom', 'Pankreaskarzinom'], c: ['Stuttgart'], def: 'Auf Symptomlinderung und Lebensqualität statt Heilung ausgerichtet.' },
  { t: 'Resektion', s: 'operative Entfernung von Gewebe', sp: 'Chirurgie', p: 'ʁezɛkˈt͡si̯oːn', tags: ['Kolorektales Karzinom'], c: ['Karlsruhe'], def: 'Chirurgische (Teil-)Entfernung eines Organs oder Gewebes.' },
  { t: 'Anastomose', s: 'operative Verbindung zweier Hohlorgane', sp: 'Chirurgie', p: 'anastoˈmoːzə', tags: ['Kolorektales Karzinom'], c: ['Karlsruhe'], def: 'Chirurgisch angelegte Verbindung zwischen zwei Hohlorganen/Gefäßen.' },
];

let n = 0;
export function seedFachbegriffe(): Fachbegriff[] {
  return R.map((r) => ({
    id: `fb-${(n++).toString().padStart(3, '0')}`,
    term: r.t,
    translationSimple: r.s,
    definitionDetailed: r.def,
    pronunciation: r.p,
    specialty: r.sp,
    pathologyTags: r.tags ?? [],
    centers: r.c ?? ['Freiburg'],
    linkedCaseIds: [], // rempli au seed via linkage automatique
    srs: freshSrs(),
  }));
}
