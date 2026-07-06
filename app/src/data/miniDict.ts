// ============================================================================
// Mini-dictionnaire DE↔FR hors-ligne (voie 1, complément des Fachbegriffe).
// Termes médicaux/courants fréquents en anamnèse. 100 % local, instantané.
// En PHASE 2, remplaçable par un import FreeDict deu-fra complet (drop-in).
// ============================================================================

export interface MiniEntry { de: string; fr: string }

export const MINI_DICT: MiniEntry[] = [
  { de: 'Schmerzen', fr: 'douleurs' },
  { de: 'Fieber', fr: 'fièvre' },
  { de: 'Husten', fr: 'toux' },
  { de: 'Atemnot', fr: 'essoufflement / dyspnée' },
  { de: 'Übelkeit', fr: 'nausée' },
  { de: 'Erbrechen', fr: 'vomissement' },
  { de: 'Durchfall', fr: 'diarrhée' },
  { de: 'Verstopfung', fr: 'constipation' },
  { de: 'Schwindel', fr: 'vertige' },
  { de: 'Müdigkeit', fr: 'fatigue' },
  { de: 'Ausschlag', fr: 'éruption cutanée' },
  { de: 'Juckreiz', fr: 'démangeaison' },
  { de: 'Schwellung', fr: 'gonflement' },
  { de: 'Blutung', fr: 'saignement / hémorragie' },
  { de: 'Ohnmacht', fr: 'évanouissement' },
  { de: 'Krampf', fr: 'crampe / spasme' },
  { de: 'Taubheitsgefühl', fr: 'engourdissement' },
  { de: 'Herzrasen', fr: 'palpitations / tachycardie' },
  { de: 'Sodbrennen', fr: 'brûlures d\'estomac' },
  { de: 'Appetitlosigkeit', fr: 'perte d\'appétit' },
  { de: 'Gewichtsverlust', fr: 'perte de poids' },
  { de: 'Nachtschweiß', fr: 'sueurs nocturnes' },
  { de: 'Schüttelfrost', fr: 'frissons' },
  { de: 'Bauchschmerzen', fr: 'douleurs abdominales' },
  { de: 'Kopfschmerzen', fr: 'maux de tête / céphalées' },
  { de: 'Brustschmerzen', fr: 'douleurs thoraciques' },
  { de: 'Rückenschmerzen', fr: 'douleurs dorsales' },
  { de: 'Wasserlassen', fr: 'miction / uriner' },
  { de: 'Stuhlgang', fr: 'selles / défécation' },
  { de: 'Vorerkrankung', fr: 'antécédent médical' },
  { de: 'Vorerkrankungen', fr: 'antécédents médicaux' },
  { de: 'Medikament', fr: 'médicament' },
  { de: 'Allergie', fr: 'allergie' },
  { de: 'Impfung', fr: 'vaccination' },
  { de: 'Schwangerschaft', fr: 'grossesse' },
  { de: 'Behandlung', fr: 'traitement' },
  { de: 'Untersuchung', fr: 'examen' },
  { de: 'Diagnose', fr: 'diagnostic' },
  { de: 'Beschwerden', fr: 'symptômes / plaintes' },
  { de: 'Anamnese', fr: 'anamnèse / interrogatoire' },
  { de: 'stationär', fr: 'hospitalisé / en hospitalisation' },
  { de: 'ambulant', fr: 'ambulatoire' },
  { de: 'nüchtern', fr: 'à jeun' },
  { de: 'plötzlich', fr: 'soudain' },
  { de: 'ständig', fr: 'constant / permanent' },
  { de: 'ausstrahlen', fr: 'irradier' },
  { de: 'Verdacht', fr: 'suspicion' },
  { de: 'Notfall', fr: 'urgence' },
  { de: 'Aufklärung', fr: 'information / consentement éclairé' },
  { de: 'Einverständnis', fr: 'consentement / accord' },
];

// Index rapide (clé normalisée → entrée), pour les deux sens.
const norm = (s: string) => s.trim().toLowerCase();
const deIndex = new Map(MINI_DICT.map((e) => [norm(e.de), e]));
const frIndex = new Map(MINI_DICT.map((e) => [norm(e.fr.split(/[\/(]/)[0]), e]));

export function miniLookup(query: string): { direction: 'de-fr' | 'fr-de'; result: string } | null {
  const q = norm(query);
  const de = deIndex.get(q);
  if (de) return { direction: 'de-fr', result: de.fr };
  const fr = frIndex.get(q);
  if (fr) return { direction: 'fr-de', result: fr.de };
  return null;
}
