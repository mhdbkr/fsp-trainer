// ============================================================================
// Arztbrief (Dokumentation) — structure ÉCRITE, registre technique.
// Source : template ODAK « Dokumentation / Patientenvorstellung V4 » + livre
// (Kap. 3 Arztbrief). REGISTRE ÉCRIT UNIQUEMENT : Konjunktiv I pour l'anamnèse
// rapportée, Passiv pour les mesures. AUCUNE formule orale (« Darf ich ? »,
// « Guten Tag ») — ce serait une faute dans un courrier.
//
// Chaque chapitre expose plusieurs Redewendungen alternatives (le candidat en
// choisit une et RÉDIGE lui-même — jamais de génération automatique).
// ============================================================================

export interface ArztbriefChapter {
  id: string;
  order: number;
  title: string;        // titre allemand
  subtitle: string;     // aide en français
  icon: string;
  keywords: string[];   // mots-clés surlignés
  register: 'Konjunktiv I' | 'Passiv' | 'Form';  // registre grammatical du bloc
  redewendungen: string[];
  tip?: string;         // conseil de rédaction
}

export const ARZTBRIEF_CHAPTERS: ArztbriefChapter[] = [
  {
    id: 'anrede', order: 1, title: 'Anrede & Briefkopf', subtitle: 'En-tête formel du courrier',
    icon: 'id', register: 'Form', keywords: ['Sehr geehrte', 'Kollegin', 'Kollege'],
    redewendungen: [
      'Sehr geehrte Frau Kollegin, sehr geehrter Herr Kollege,',
      'Sehr geehrte Frau Dr. …, sehr geehrter Herr Dr. …,',
    ],
    tip: 'Après la formule d’appel, une virgule ; la ligne suivante commence par une minuscule (« wir berichten … »).',
  },
  {
    id: 'einleitung', order: 2, title: 'Einleitung', subtitle: 'Phrase d’introduction du patient',
    icon: 'handshake', register: 'Form', keywords: ['berichten', 'vorstellte', 'Notaufnahme'],
    redewendungen: [
      'wir berichten Ihnen nachfolgend über Herrn/Frau …, geboren am …, der/die sich am … in unserer Notaufnahme vorstellte.',
      'wir berichten Ihnen über unseren Patienten/unsere Patientin …, der/die sich am … notfallmäßig bei uns vorstellte.',
    ],
    tip: 'On indique le nom, la date de naissance et la date/le contexte de présentation.',
  },
  {
    id: 'aktuelle-beschwerden', order: 3, title: 'Aktuelle Beschwerden', subtitle: 'Motif de consultation (rédigé)',
    icon: 'pain', register: 'Konjunktiv I', keywords: ['stellte sich', 'klagte', 'Ausstrahlung', 'Begleitsymptome'],
    redewendungen: [
      'Der Patient/Die Patientin stellte sich mit seit … bestehenden, … (Charakter) Schmerzen im/in … (Lokalisation) mit Ausstrahlung in … vor.',
      'Die Beschwerden seien plötzlich/allmählich aufgetreten und hätten sich im Verlauf verschlechtert/nicht verändert.',
      'Die Schmerzintensität habe bei … von 10 gelegen.',
      'Des Weiteren klagte er/sie über … Der Patient/Die Patientin gab an, dass …',
      'Als Begleitsymptome bestünden … Die vegetative Anamnese sei unauffällig bis auf …',
    ],
    tip: 'Registre technique (Fachbegriffe) ; les propos rapportés du patient sont au Konjunktiv I (« sei », « habe », « klagte »).',
  },
  {
    id: 'vorerkrankungen', order: 4, title: 'Vorerkrankungen & Voroperationen', subtitle: 'Antécédents',
    icon: 'history', register: 'Konjunktiv I', keywords: ['bekannt', 'leide an', 'Z. n.'],
    redewendungen: [
      'An Vorerkrankungen leide der Patient/die Patientin an … (seit … Jahren).',
      'Folgende Erkrankungen seien bekannt: …',
      'Zustand nach … (Operation) im Jahr … / vor … Jahren.',
      'Es bestünden keine relevanten Vorerkrankungen.',
    ],
    tip: '« leiden an » + maladie ; « leiden unter » + symptôme. Les opérations : « vor … Jahren », pas « seit ».',
  },
  {
    id: 'medikation', order: 5, title: 'Medikation', subtitle: 'Traitements',
    icon: 'pill', register: 'Konjunktiv I', keywords: ['nehme', 'ein', 'bei Bedarf'],
    redewendungen: [
      'Der Patient/Die Patientin nehme regelmäßig … (Wirkstoff, Dosierung, Einnahmeschema) ein.',
      'Zusätzlich werde … bei Bedarf eingenommen.',
      'Eine regelmäßige Medikamenteneinnahme werde verneint.',
    ],
    tip: 'On note dosage et schéma d’administration (par ex. matin-midi-soir).',
  },
  {
    id: 'allergien-noxen', order: 6, title: 'Allergien & Noxen', subtitle: 'Allergies, tabac, alcool, drogues',
    icon: 'allergy', register: 'Konjunktiv I', keywords: ['Allergie', 'bekannt', 'Nikotinkonsum', 'Alkoholkonsum'],
    redewendungen: [
      'Eine …-Allergie sei bekannt, auf die er/sie mit … reagiere. / Allergien seien nicht bekannt.',
      'Ein Nikotinkonsum von … über … Jahre wurde angegeben. / Ein Nikotinkonsum werde verneint.',
      'Der Alkoholkonsum wurde mit … angegeben. (Terme « Alkoholkonsum », jamais « Alkoholabusus ».)',
      'Ein Drogenkonsum werde verneint / mit … angegeben.',
    ],
    tip: 'On écrit « Alkoholkonsum » (neutre) et non « Alkoholabusus ». Le tabac se quantifie en paquets-années.',
  },
  {
    id: 'familie-sozial', order: 7, title: 'Familien- & Sozialanamnese', subtitle: 'Famille et situation sociale',
    icon: 'family', register: 'Konjunktiv I', keywords: ['leide an', 'verstorben', 'wohne', 'berufstätig'],
    redewendungen: [
      'In der Familienanamnese fänden sich … Der Vater/Die Mutter leide an … / sei an … verstorben.',
      'Der Patient/Die Patientin sei verheiratet/ledig/geschieden/verwitwet, habe … Kinder.',
      'Er/Sie wohne allein/mit der Familie und sei als … berufstätig / berentet.',
    ],
  },
  {
    id: 'diagnose', order: 8, title: 'Verdachtsdiagnose & Differenzialdiagnosen', subtitle: 'Hypothèses diagnostiques',
    icon: 'stethoscope', register: 'Form', keywords: ['deute auf', 'Differenzialdiagnostisch', 'in Betracht'],
    redewendungen: [
      'Anamnestisch ergibt sich der Verdacht auf … / Die Anamnese deutet am ehesten auf … hin.',
      'Differenzialdiagnostisch kommen … in Betracht.',
      'Zum Ausschluss von … sollte … erfolgen.',
    ],
  },
  {
    id: 'diagnostik-therapie', order: 9, title: 'Diagnostik & Therapie', subtitle: 'Mesures (au Passiv)',
    icon: 'syringe', register: 'Passiv', keywords: ['wurde', 'wurden', 'angemeldet', 'eingeleitet'],
    redewendungen: [
      'Der Patient/Die Patientin wurde stationär aufgenommen. Ein venöser Zugang wurde gelegt und Blut abgenommen (…).',
      'Ein EKG wurde geschrieben. Eine Sonographie/ein CT wurde angemeldet.',
      'Eine … Therapie wurde eingeleitet. … wurde verabreicht.',
      'Die weitere Diagnostik/Therapie richtet sich nach den Befunden.',
    ],
    tip: 'Les examens et traitements se rédigent au Passiv : « Blut wurde abgenommen », « ein CT wurde angemeldet ».',
  },
  {
    id: 'schluss', order: 10, title: 'Schlussformel', subtitle: 'Formule de politesse finale (obligatoire)',
    icon: 'handshake', register: 'Form', keywords: ['Für weitere Fragen', 'freundlichen', 'Grüßen'],
    redewendungen: [
      'Für weitere Fragen stehen wir Ihnen gern zur Verfügung.',
      'Mit freundlichen kollegialen Grüßen',
    ],
    tip: 'Ne jamais oublier la formule finale — son absence fait perdre des points à l’examen.',
  },
];
