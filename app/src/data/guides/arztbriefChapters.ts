import type { Phrase } from './phrases';

// ============================================================================
// Arztbrief (Dokumentation) — structure ÉCRITE, registre technique, fidèle aux
// trames de référence (manuel, chap. Arztbrief + trame de documentation).
// REGISTRE ÉCRIT UNIQUEMENT : Konjunktiv I pour l'anamnèse rapportée, Passiv
// pour les mesures. AUCUNE formule orale (« Darf ich ? », « Guten Tag ») —
// ce serait une faute dans un courrier.
//
// Chaque chapitre expose ses Redewendungen avec leurs VARIANTES équivalentes
// (le candidat en choisit une et RÉDIGE lui-même — jamais auto-généré).
// ============================================================================

export interface ArztbriefChapter {
  id: string;
  order: number;
  title: string;        // titre allemand
  subtitle: string;     // aide en français
  icon: string;
  keywords: string[];   // mots-clés surlignés
  register: 'Konjunktiv I' | 'Passiv' | 'Form';  // registre grammatical du bloc
  redewendungen: Phrase[];
  tip?: string;         // conseil de rédaction
}

export const ARZTBRIEF_CHAPTERS: ArztbriefChapter[] = [
  {
    id: 'anrede', order: 1, title: 'Anrede & Briefkopf', subtitle: 'En-tête formel du courrier',
    icon: 'id', register: 'Form', keywords: ['Sehr geehrte', 'Kollegin', 'Kollege'],
    redewendungen: [
      {
        text: 'Sehr geehrte Frau Kollegin, sehr geehrter Herr Kollege,',
        alts: ['Sehr geehrte Frau Prof. / Dr. X, sehr geehrter Herr Prof. / Dr. Y,'],
      },
    ],
    tip: 'Après la formule d’appel, une virgule ; la ligne suivante commence par une MINUSCULE (« wir berichten … »). Oublier l’Anrede peut coûter la réussite.',
  },
  {
    id: 'einleitung', order: 2, title: 'Einleitung', subtitle: 'Phrase d’introduction du patient',
    icon: 'handshake', register: 'Form', keywords: ['berichten', 'vorstellte', 'Notaufnahme', 'geb.'],
    redewendungen: [
      {
        text: 'wir berichten Ihnen nachfolgend über Herrn/Frau …, geboren am …, wohnhaft in …, der/die sich am … in unserer Notaufnahme vorstellte.',
        alts: ['wir berichten Ihnen über unseren Patienten / unsere Patientin …, der/die sich am … notfallmäßig bei uns vorstellte.'],
      },
    ],
    tip: 'On indique le nom, la date de naissance (et éventuellement le domicile) ainsi que la date et le contexte de présentation.',
  },
  {
    id: 'patientenzustand', order: 3, title: 'Allgemein- & Ernährungszustand', subtitle: 'État général + orientation (« Dativ-Paragraf »)',
    icon: 'pulse', register: 'Form', keywords: ['Allgemeinzustand', 'Ernährungszustand', 'orientiert'],
    redewendungen: [
      {
        text: 'Der Patient / Die Patientin befand sich in gutem / schlechtem / schmerzbedingt reduziertem Allgemeinzustand und normalem / schlankem / (prä)adipösem / kachektischem Ernährungszustand.',
        alts: ['Der Allgemeinzustand war leicht / deutlich reduziert.'],
      },
      'Er/Sie war zu Ort, Zeit, Person und Situation (voll) orientiert / desorientiert.',
    ],
    tip: 'Ce paragraphe s’écrit au Präteritum (constat d’examen), pas au Konjunktiv I. Vocabulaire : Allgemeinzustand (gut, schlecht, reduziert), Ernährungszustand (schlank, mager, adipös, kachektisch).',
  },
  {
    id: 'aktuelle-beschwerden', order: 4, title: 'Aktuelle Beschwerden', subtitle: 'Motif de consultation (rédigé)',
    icon: 'pain', register: 'Konjunktiv I', keywords: ['stellte sich', 'klagte', 'Ausstrahlung', 'Begleitsymptome', 'bejaht', 'verneint'],
    redewendungen: [
      {
        text: 'Der Patient / Die Patientin stellte sich mit seit … bestehenden, … (Charakter) Schmerzen im/in … (Lokalisation) mit Ausstrahlung in … / ohne Ausstrahlung vor.',
        alts: ['Herr Z stellte sich mit seit … Tagen bestehenden starken epigastrischen Schmerzen vor. (N-Deklination !)'],
      },
      'Die Beschwerden seien plötzlich/allmählich aufgetreten und hätten sich im Verlauf verschlechtert / verbessert / nicht verändert.',
      'Die Schmerzintensität habe bei … von 10 gelegen.',
      {
        text: 'Darüber hinaus erwähnte der Patient … als Auslöser, … als Verstärkungsfaktor und … als Linderungsfaktor der Beschwerden.',
        alts: ['Auslöser, Verstärkungs- oder Linderungsfaktoren seien nicht bekannt.', 'Die Einnahme von [Medikament] habe keine / eine leichte / eine deutliche Verbesserung gebracht.'],
      },
      {
        text: 'Die Frage nach ähnlichen, früheren Beschwerden wurde bejaht/verneint.',
        followUp: ['Falls bejaht: Der Patient sei deswegen beim Hausarzt gewesen, der bei ihm [Diagnose] diagnostiziert habe, welche mit [Medikation] behandelt würde.'],
      },
      {
        text: 'Des Weiteren klagte er/sie über … Der Patient / Die Patientin gab an, dass …',
        alts: ['Zusätzlich zu den Hauptbeschwerden träten folgende Begleitsymptome auf: …'],
      },
      {
        text: 'Die vegetative Anamnese sei unauffällig bis auf …',
        alts: [
          'Die vegetative Anamnese sei auffällig: eine schmerzbedingte Insomnie, eine Obstipation seit …, eine Inappetenz.',
          'Die Fragen nach [Symptom] seien bejaht worden, während die Fragen nach [Symptom] verneint worden seien.',
        ],
      },
    ],
    tip: 'Registre technique (Fachbegriffe : Nausea, Vomitus, Pyrosis, Tussis…) ; les propos rapportés du patient sont au Konjunktiv I (« sei », « habe », « träten »). Merke : « des Weiteren » (jamais « desweiteren »).',
  },
  {
    id: 'vorerkrankungen', order: 5, title: 'Vorerkrankungen & Voroperationen', subtitle: 'Antécédents',
    icon: 'history', register: 'Konjunktiv I', keywords: ['bekannt', 'leide an', 'Zustand nach', 'Komplikation'],
    redewendungen: [
      {
        text: 'An Vorerkrankungen leide der Patient / die Patientin an … (seit … Jahren).',
        alts: [
          'Folgende Erkrankungen seien bekannt: …',
          'Die Krankengeschichte umfasst die folgenden Diagnosen: arterielle Hypertonie seit 5 Jahren, Diabetes mellitus Typ 2 seit 2 Jahren.',
        ],
      },
      {
        text: 'Es bestünden keine relevanten Vorerkrankungen.',
        alts: ['Bis auf … und … bestehen keine anderen Vorerkrankungen.'],
      },
      {
        text: 'Zustand nach … (Operation) im Jahr … / vor … Jahren.',
        alts: [
          'Beispiel: „Appendektomie im Jahr 2010, mit postoperativer Wundinfektion als Komplikation.“',
          'Zustand nach Chemotherapie / Strahlentherapie bei …-Karzinom vor … Jahren.',
        ],
      },
    ],
    tip: '« leiden an » + maladie ; « leiden unter » + symptôme. Les opérations : « vor … Jahren » — jamais « seit » (aucune opération ne dure des années !). Note aussi les complications.',
  },
  {
    id: 'medikation', order: 6, title: 'Medikation', subtitle: 'Traitements',
    icon: 'pill', register: 'Konjunktiv I', keywords: ['nehme', 'bei Bedarf', 'unauffällig'],
    redewendungen: [
      {
        text: 'Der Patient / Die Patientin nehme regelmäßig … (Wirkstoff, Dosierung, Einnahmeschema, z. B. 1-0-1) ein.',
        alts: ['Herr/Frau X berichtet über die Einnahme von: Paracetamol 1000 mg 1-0-0.'],
      },
      'Zusätzlich werde … bei Bedarf eingenommen.',
      {
        text: 'Die Medikamentenanamnese sei unauffällig.',
        alts: [
          'Eine regelmäßige Medikamenteneinnahme werde verneint.',
          'Bis auf … mg bei Bedarf nehme der Patient / die Patientin keine weiteren Medikamente ein.',
        ],
      },
    ],
    tip: 'Dosage + schéma (1-0-1). Merke : « Medikamente einnehmen » (Akkusativ, jamais « Medikamenten ») ; au Konjunktiv I : « er nehme … ein ».',
  },
  {
    id: 'allergien-noxen', order: 7, title: 'Allergien & Noxen', subtitle: 'Allergies, tabac, alcool, drogues',
    icon: 'allergy', register: 'Konjunktiv I', keywords: ['Allergie', 'bekannt', 'Nikotinkonsum', 'Alkoholkonsum', 'py'],
    redewendungen: [
      {
        text: 'Eine …-Allergie sei bekannt, auf die er/sie mit … reagiere.',
        alts: [
          'Allergien wurden verneint / seien nicht bekannt.',
          'Eine …-Unverträglichkeit sei bekannt.',
        ],
      },
      {
        text: 'Ein Nikotinkonsum von … Zigaretten täglich über … Jahre (… py) wurde angegeben.',
        alts: [
          'Tabakabusus wurde mit … py bejaht. / Tabak-/Nikotinabusus wurde verneint.',
          'Der Patient habe das Rauchen aufgegeben und sei seit … Jahren rauchfrei.',
        ],
      },
      {
        text: 'Der Alkoholkonsum wurde mit … (z. B. 3 Flaschen Bier pro Tag) angegeben.',
        alts: ['Alkoholkonsum wurde verneint.', 'Der Patient trinke gelegentlich Alkohol, und zwar … pro Woche.'],
      },
      {
        text: 'Ein Drogenkonsum werde verneint / mit … angegeben.',
        alts: ['In der Vergangenheit habe er/sie Marihuana/Cannabis ausprobiert; aktuell bestehe kein Kontakt zu Drogen.'],
      },
    ],
    tip: 'On écrit « Alkoholkonsum » (neutre) et JAMAIS « Alkoholabusus » — la frontière entre consommation et abus est discutée. Le tabac se quantifie en paquets-années (py).',
  },
  {
    id: 'familie-sozial', order: 8, title: 'Familien- & Sozialanamnese', subtitle: 'Famille et situation sociale',
    icon: 'family', register: 'Konjunktiv I', keywords: ['leide an', 'verstorben', 'wohne', 'berufstätig', 'Geschwister'],
    redewendungen: [
      {
        text: 'In der Familienanamnese fänden sich … Der Vater / Die Mutter leide an … / habe an … gelitten.',
        alts: [
          'Die Familienanamnese sei unauffällig.',
          'Die Mutter sei an den Folgen eines/einer … verstorben. (+ Genitiv)',
          'Er/Sie habe keine Geschwister. / Er/Sie habe eine gesunde Schwester und einen Bruder, der an … erkrankt sei.',
        ],
      },
      'Der Patient / Die Patientin sei verheiratet / ledig / geschieden / verwitwet und habe … Kinder.',
      {
        text: 'Er/Sie wohne allein / mit der Familie in einer Wohnung / einem Haus (… Etage, mit/ohne Aufzug) und sei als … berufstätig / berentet.',
        alts: ['Stress am Arbeitsplatz wurde verneint/bejaht.'],
      },
    ],
  },
  {
    id: 'diagnose', order: 9, title: 'Verdachtsdiagnose & Differenzialdiagnosen', subtitle: 'Hypothèses diagnostiques',
    icon: 'stethoscope', register: 'Form', keywords: ['deute auf', 'Differenzialdiagnostisch', 'in Betracht', 'Ausschluss'],
    redewendungen: [
      {
        text: 'Die Anamnese deutet am ehesten auf … hin.',
        alts: [
          'Die anamnestischen Angaben lassen am ehesten auf … schließen.',
          'Die vorliegenden anamnestischen Informationen sprechen am ehesten für …',
          'Aufgrund der anamnestischen Angaben erscheint … am wahrscheinlichsten.',
        ],
      },
      {
        text: 'Differenzialdiagnostisch kommen … in Betracht.',
        alts: ['Zu den Differenzialdiagnosen gehören: …', 'Die folgenden Differenzialdiagnosen sollten erwogen werden: …'],
      },
      'Zum Ausschluss eines/einer … sollte … erfolgen.',
    ],
  },
  {
    id: 'diagnostik-therapie', order: 10, title: 'Diagnostik & Therapie', subtitle: 'Mesures (au Passiv)',
    icon: 'syringe', register: 'Passiv', keywords: ['wurde', 'wurden', 'angemeldet', 'eingeleitet', 'Konsil', 'Prognose'],
    redewendungen: [
      {
        text: 'Der Patient / Die Patientin wurde stationär aufgenommen. Ein venöser Zugang wurde gelegt und Blut abgenommen (Blutbild, CRP/BSG, Nieren- und Leberwerte, Elektrolyte — je nach Verdacht).',
        alts: ['Bei Verdacht auf … wurde Blut abgenommen. Urin- und Stuhlprobe wurden entnommen.'],
      },
      {
        text: 'Ein EKG wurde geschrieben. Eine Sonographie / ein CT wurde angemeldet.',
        alts: ['Ein Röntgen-Thorax wurde angefertigt. Ein CT-Thorax/-Abdomen wurde geplant. Die Ergebnisse stehen noch aus.'],
      },
      {
        text: 'Ein chirurgisches / psychologisches Konsil zur Mitbeurteilung / zur Optimierung der Therapie wurde angemeldet.',
        alts: ['Konsile immer begründen: zur Mitbeurteilung / zur Optimierung der Therapie / der Nachbehandlung / des Pflegekonzeptes.'],
      },
      {
        text: 'Eine … Therapie wurde eingeleitet. … wurde verabreicht/verschrieben. Eine Sauerstoffgabe wurde angeordnet.',
        alts: [
          'Es erfolgte eine deutliche / rasche / leider keine Verbesserung.',
          'Je nach den Ergebnissen der apparativen Untersuchungen wird eine passende Therapie eingeleitet.',
        ],
      },
      {
        text: 'Wir empfehlen Ernährungsberatung, Patientenschulung, Gewichtsabnahme und regelmäßige Kontrollen. Der Patient wurde für … Tage krankgeschrieben.',
        alts: ['Prognose: positiv / negativ / fraglich, abhängig von der Compliance des Patienten / der Patientin.'],
      },
    ],
    tip: 'Mesures au Passiv : « Blut wurde abgenommen », « ein EKG wurde geschrieben » (les médicaments, eux, sont « verschrieben »). N’invente pas d’examens absurdes pour le cas — reste plausible.',
  },
  {
    id: 'schluss', order: 11, title: 'Schlussformel & Sonderfälle', subtitle: 'Formule finale (obligatoire) + cas particuliers',
    icon: 'handshake', register: 'Form', keywords: ['Für weitere Fragen', 'freundlichen', 'Grüßen', 'Gesundheitsamt', 'Hausarzt'],
    redewendungen: [
      'Für weitere Fragen stehen wir Ihnen gern zur Verfügung.',
      'Mit freundlichen kollegialen Grüßen',
      {
        text: 'Rücksprache mit dem Hausarzt wegen früherer Medikation / Vorerkrankungen / Voroperationen folgt.', label: 'Sonderfall',
        alts: ['Zur weiteren Aufklärung wurde der Hausarzt kontaktiert.'],
      },
      {
        text: 'Gesundheitsamt wurde informiert. (Bei meldepflichtiger Infektionskrankheit — der Patient wird isoliert.)', label: 'Sonderfall',
      },
      {
        text: 'Psychosozialer Dienst wurde kontaktiert. (Bei Kindern / Angehörigen, die allein zu Hause Hilfe brauchen.)', label: 'Sonderfall',
      },
    ],
    tip: 'Ne jamais oublier la formule finale — son absence fait perdre beaucoup de points. Les mentions spéciales (Gesundheitsamt, psychosozialer Dienst) montrent une vraie conscience clinique.',
  },
];
