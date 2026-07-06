import type { Specialty } from '@/db/types';

// ============================================================================
// Guide d'anamnèse — Allgemeine Anamnese + Fachanamnese par spécialité.
// Source : template ODAK « Allgemeine Anamnese V4 » + livre (Kap. 2.1 / 2.2).
// REGISTRE PATIENT : langage courant, aucun Fachbegriff avec le patient.
// `tip` = note pédagogique (comment bien interroger). `keywords` = surlignés.
// ============================================================================

export interface AnamneseChapter {
  id: string;
  title: string;          // titre allemand
  subtitle?: string;      // aide en français
  icon: string;
  keywords: string[];
  questions: string[];    // questions modèles, registre patient
  tip?: string;           // conseil d'interrogatoire
}

/** Allgemeine Anamnese — chapitres cochables, dans l'ordre de l'entretien. */
export const ALLGEMEINE_ANAMNESE: AnamneseChapter[] = [
  {
    id: 'eroeffnung', title: 'Gesprächseröffnung', subtitle: 'Accueil, présentation et consentement',
    icon: 'handshake', keywords: ['Aufnahmegespräch', 'einverstanden', 'zuständige'],
    questions: [
      'Guten Tag, mein Name ist … , ich bin der zuständige Arzt / die zuständige Ärztin für Sie.',
      'Ich würde gern ein Aufnahmegespräch mit Ihnen führen und Ihnen einige Fragen zu Ihren Beschwerden stellen. Sind Sie damit einverstanden?',
      'Wie darf ich Sie ansprechen? Fühlen Sie sich wohl, oder brauchen Sie zuerst etwas?',
    ],
    tip: 'Ouvre toujours par une présentation claire et demande le consentement. Si le patient est agité ou méfiant, reste calme et rassure avant de continuer.',
  },
  {
    id: 'personalia', title: 'Persönliche Daten', subtitle: 'Identité et données de base',
    icon: 'id', keywords: ['buchstabieren', 'geboren', 'Beruf', 'Hausarzt'],
    questions: [
      'Wie heißen Sie mit vollständigem Namen? Könnten Sie ihn bitte langsam buchstabieren?',
      'Wann sind Sie geboren? Wie alt sind Sie?',
      'Wie groß sind Sie und wie viel wiegen Sie ungefähr?',
      'Was sind Sie von Beruf? Arbeiten Sie mit besonderen Stoffen (Staub, Chemikalien)?',
      'Haben Sie einen Hausarzt? Wie heißt er / sie?',
    ],
    tip: 'Le nom (à épeler) et le médecin traitant sont importants pour la documentation. La profession peut révéler des expositions (poussières, solvants).',
  },
  {
    id: 'aktuell', title: 'Aktuelle Beschwerden', subtitle: 'Motif + analyse de la douleur (OPQRST)',
    icon: 'pain', keywords: ['seit wann', 'Charakter', 'Ausstrahlung', 'stärker', 'Begleitbeschwerden'],
    questions: [
      'Was führt Sie heute zu uns? Erzählen Sie mir bitte, was Sie haben.',
      'Ort — Wo genau spüren Sie die Beschwerden? Können Sie mit dem Finger zeigen?',
      'Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?',
      'Intensität — Auf einer Skala von 1 bis 10, wie stark ist der Schmerz gerade?',
      'Ausstrahlung — Strahlt der Schmerz irgendwohin aus, zum Beispiel in den Arm, den Rücken oder die Schulter?',
      'Beginn & Verlauf — Seit wann haben Sie das? Kam es plötzlich oder langsam? Ist es dauerhaft oder kommt es in Anfällen?',
      'Auslöser & Linderung — Gibt es etwas, das es besser oder schlimmer macht (Bewegung, Essen, Atmung, eine bestimmte Haltung)?',
      'Frühere Episoden — Hatten Sie so etwas schon einmal? Waren Sie deswegen schon beim Arzt?',
      'Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?',
    ],
    tip: 'C’est le cœur de l’interrogatoire : creuse chaque dimension (lieu, caractère, intensité, irradiation, chronologie, facteurs, épisodes antérieurs, symptômes associés). Ne te contente pas d’une réponse vague — relance.',
  },
  {
    id: 'vegetativ', title: 'Vegetative Anamnese', subtitle: 'Fonctions générales du corps',
    icon: 'pulse', keywords: ['Fieber', 'Nachtschweiß', 'Gewicht', 'Appetit', 'Stuhlgang', 'Schlaf'],
    questions: [
      'Hatten Sie Fieber, Schüttelfrost oder Nachtschweiß?',
      'Haben Sie ungewollt an Gewicht zu- oder abgenommen? Wie viel und in welchem Zeitraum?',
      'Wie ist Ihr Appetit? Ist Ihnen übel, mussten Sie erbrechen?',
      'Haben Sie Probleme mit dem Stuhlgang oder beim Wasserlassen? Farbe, Häufigkeit?',
      'Wie schlafen Sie? Fühlen Sie sich in letzter Zeit sehr gestresst?',
    ],
    tip: 'Une perte de poids involontaire, des sueurs nocturnes et de la fièvre forment ensemble un signal d’alarme (« B-Symptomatik ») à ne jamais manquer.',
  },
  {
    id: 'vorerkrankungen', title: 'Vorerkrankungen & Voroperationen', subtitle: 'Antécédents médicaux et chirurgicaux',
    icon: 'history', keywords: ['chronische', 'Bluthochdruck', 'operiert', 'Komplikationen'],
    questions: [
      'Sind bei Ihnen chronische Krankheiten bekannt, zum Beispiel Bluthochdruck, Zuckerkrankheit, Herz-, Lungen-, Leber- oder Nierenerkrankungen?',
      'Seit wann bestehen diese, und werden sie behandelt?',
      'Wurden Sie schon einmal operiert? Weswegen, wann, und gab es Komplikationen?',
      'Waren Sie in letzter Zeit im Krankenhaus?',
    ],
    tip: 'Cite quelques exemples concrets de maladies chroniques : les patients oublient souvent l’hypertension ou le diabète s’ils sont « habitués ».',
  },
  {
    id: 'medikamente', title: 'Medikamente', subtitle: 'Traitements en cours',
    icon: 'pill', keywords: ['regelmäßig', 'Dosierung', 'Blutverdünner', 'Schmerzmittel'],
    questions: [
      'Nehmen Sie regelmäßig Medikamente ein? Welche, in welcher Dosierung und wie oft am Tag?',
      'Nehmen Sie gelegentlich etwas ein, zum Beispiel Schmerzmittel?',
      'Nehmen Sie Blutverdünner oder Kortison?',
      'Nehmen Sie pflanzliche Mittel oder Nahrungsergänzung?',
    ],
    tip: 'Demande explicitement les anticoagulants et les antalgiques en vente libre (AINS) : ils sont fréquents et cliniquement décisifs.',
  },
  {
    id: 'allergien', title: 'Allergien & Unverträglichkeiten', subtitle: 'Allergies et intolérances',
    icon: 'allergy', keywords: ['Allergien', 'Medikamente', 'reagieren'],
    questions: [
      'Haben Sie Allergien, zum Beispiel gegen Medikamente, Nahrungsmittel oder Kontrastmittel?',
      'Wie äußert sich die Allergie — Hautausschlag, Atemnot, Kreislaufprobleme?',
      'Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?',
    ],
    tip: 'N’oublie jamais l’allergie médicamenteuse : elle conditionne toute prescription ultérieure.',
  },
  {
    id: 'noxen', title: 'Noxen', subtitle: 'Tabac, alcool, drogues',
    icon: 'cigarette', keywords: ['rauchen', 'Zigaretten', 'Alkohol', 'Drogen'],
    questions: [
      'Rauchen Sie? Wie viele Zigaretten pro Tag, und seit wie vielen Jahren?',
      'Falls Sie aufgehört haben: wann, und wie viel haben Sie vorher geraucht?',
      'Trinken Sie Alkohol? Was, wie oft und wie viel ungefähr?',
      'Nehmen Sie oder haben Sie Drogen genommen, zum Beispiel Cannabis?',
    ],
    tip: 'Reste neutre et sans jugement, surtout sur l’alcool et les drogues — c’est la condition pour obtenir une réponse honnête. Le tabac se quantifie en paquets-années.',
  },
  {
    id: 'familie-sozial', title: 'Familien- & Sozialanamnese', subtitle: 'Famille et vie quotidienne',
    icon: 'family', keywords: ['Familie', 'verheiratet', 'Kinder', 'Wohnung', 'Stockwerk'],
    questions: [
      'Gibt es in Ihrer Familie schwere oder chronische Krankheiten (Herzinfarkt, Krebs, Zuckerkrankheit)?',
      'Leben Ihre Eltern noch? Falls nicht, woran sind sie verstorben?',
      'Sind Sie verheiratet oder in einer Partnerschaft? Haben Sie Kinder?',
      'Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?',
      'Haben Sie Haustiere, um die sich jemand kümmern muss?',
    ],
    tip: 'La situation de logement (étage, ascenseur) et l’entourage comptent pour la sortie et l’autonomie. En cas de deuil récent, montre de l’empathie.',
  },
  {
    id: 'abschluss', title: 'Abschluss & Verdachtsdiagnose', subtitle: 'Clôture et hypothèse partagée',
    icon: 'stethoscope', keywords: ['hinzufügen', 'Verdacht', 'weiteres Vorgehen'],
    questions: [
      'Das waren meine Fragen. Möchten Sie noch etwas hinzufügen, das mir helfen könnte?',
      'Nach unserem Gespräch habe ich den Verdacht auf … Ich erkläre Ihnen die nächsten Schritte.',
      'Wir werden Sie zunächst untersuchen und einige Untersuchungen veranlassen. Ich bespreche Ihren Fall dann mit meinem Oberarzt.',
    ],
    tip: 'Termine toujours en laissant le patient compléter, puis annonce une hypothèse en langage simple et les prochaines étapes — cela rassure et structure la fin de l’entretien.',
  },
];

// ---------------------------------------------------------------------------
// Fachanamnese / Spezielle Anamnese par spécialité (livre 2.2.2–2.2.14).
// S'affiche en sous-chapitre EXTRA quand le cas appartient à la spécialité.
// ---------------------------------------------------------------------------
export interface FachanamneseGuide {
  specialty: Specialty;
  icon: string;
  chapter: AnamneseChapter;
}

const F = (specialty: Specialty, icon: string, id: string, title: string, keywords: string[], questions: string[], tip: string): FachanamneseGuide => ({
  specialty, icon, chapter: { id: `fach-${id}`, title, subtitle: 'Questions spécifiques à la spécialité', icon, keywords, questions, tip },
});

export const FACHANAMNESEN: FachanamneseGuide[] = [
  F('Kardiologie', 'heart', 'kardio', 'Fachanamnese Kardiologie',
    ['Brustschmerzen', 'Belastung', 'Herzrasen', 'Ödeme', 'Treppen'],
    [
      'Haben Sie Schmerzen oder ein Druckgefühl in der Brust? Wo genau, hinter dem Brustbein oder eher in der Magengegend?',
      'Treten die Beschwerden bei körperlicher Anstrengung auf oder auch in Ruhe? Wie lange dauern sie?',
      'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?',
      'Haben Sie Herzrasen, Herzstolpern oder das Gefühl, dass das Herz unregelmäßig schlägt?',
      'Bekommen Sie schwer Luft, besonders beim Treppensteigen? Wie viele Stockwerke schaffen Sie ohne Pause?',
      'Sind Ihre Beine oder Knöchel geschwollen, vor allem abends? Mit wie vielen Kissen schlafen Sie?',
      'Ist Ihnen schon einmal schwarz vor Augen geworden oder sind Sie in Ohnmacht gefallen?',
    ],
    'La douleur cardiaque typique est rétrosternale, déclenchée à l’effort, avec irradiation. Cherche aussi les signes d’insuffisance cardiaque : œdèmes, orthopnée (nombre d’oreillers), dyspnée d’effort quantifiée.'),
  F('Pneumologie', 'lung', 'pneumo', 'Fachanamnese Pneumologie',
    ['Atemnot', 'Husten', 'Auswurf', 'Blut'],
    [
      'Haben Sie Probleme beim Atmen? Eher beim Einatmen oder beim Ausatmen? Bei Belastung oder in Ruhe?',
      'Haben Sie Schmerzen beim Atmen, besonders beim tiefen Einatmen?',
      'Seit wann husten Sie? Ist der Husten trocken oder mit Auswurf?',
      'Welche Farbe und Menge hat der Auswurf? War Blut dabei?',
      'Haben Sie nachts Atemaussetzer oder schnarchen Sie stark? Sind Sie heiser?',
    ],
    'Distingue dyspnée d’effort et de repos, précise le caractère de la toux et surtout la couleur de l’expectoration ; l’hémoptysie est un signal d’alarme.'),
  F('Gastroenterologie', 'stomach', 'gastro', 'Fachanamnese Gastroenterologie',
    ['Übelkeit', 'Erbrechen', 'Sodbrennen', 'Stuhl', 'schwarz', 'Blut'],
    [
      'Ist Ihnen übel, mussten Sie erbrechen? Wie sah das Erbrochene aus — wie Kaffeesatz oder mit Blut?',
      'Haben Sie Sodbrennen, saures Aufstoßen oder ein Völlegefühl? Werden Sie schneller satt als früher?',
      'Wie ist Ihr Stuhlgang? Ist der Stuhl schwarz, sehr hell oder mit Blut?',
      'Haben Sie Durchfall oder Verstopfung? Wechseln sich beide ab?',
      'Sind die Beschwerden von bestimmten Speisen oder vom Essen abhängig?',
      'Wann hatten Sie die letzte Magen- oder Darmspiegelung, und was war das Ergebnis?',
    ],
    'Le sang joue un rôle capital : « café moulu » dans les vomissements et selles noires (méléna) orientent vers une hémorragie haute. Précise toujours la couleur des selles et des vomissements.'),
  F('Nephrologie', 'kidney', 'nephro', 'Fachanamnese Néphrologie/Uro',
    ['Wasserlassen', 'Brennen', 'Blut im Urin', 'Schwellungen'],
    [
      'Haben Sie Probleme beim Wasserlassen — Brennen, Schmerzen, häufiger Drang?',
      'Müssen Sie nachts aufstehen, um Wasser zu lassen? Wie oft?',
      'Welche Farbe hat der Urin? War Blut dabei? Riecht er ungewöhnlich?',
      'Haben Sie Schwellungen im Gesicht, an den Augen oder an den Beinen bemerkt?',
      'Haben Sie Rücken- oder Flankenschmerzen? Strahlen sie in die Leiste aus?',
    ],
    'La colique néphrétique irradie typiquement vers l’aine. Cherche l’hématurie, la dysurie et les œdèmes (visage/paupières = origine rénale).'),
  F('Neurologie', 'brain', 'neuro', 'Fachanamnese Neurologie',
    ['Kopfschmerzen', 'einseitig', 'Ohnmacht', 'Sehstörungen', 'Kribbeln'],
    [
      'Haben Sie Kopfschmerzen? Wo genau, ein- oder beidseitig? Wie fühlen sie sich an?',
      'Wird Ihnen dabei übel, sind Sie licht- oder lärmempfindlich?',
      'Gibt es Vorboten wie Lichtblitze, Kribbeln oder Sprachstörungen?',
      'Haben Sie Schwindel, Sehstörungen oder Taubheitsgefühle in Armen oder Beinen?',
      'Waren Sie schon einmal ohnmächtig? Haben Sie sich dabei verletzt oder auf die Zunge gebissen? Ging Urin ab?',
    ],
    'Sépare la céphalée primaire (migraine) des signes d’alarme (déficit, trouble de la parole, perte de connaissance avec morsure de langue = crise). Précise la latéralité et les prodromes.'),
  F('Orthopädie', 'bone', 'ortho', 'Fachanamnese Orthopédie/Trauma',
    ['Sturz', 'Bewegung', 'Taubheit', 'Durchblutung'],
    [
      'Wie ist es passiert — sind Sie gestürzt? Auf welche Seite, und worauf (Asphalt, Boden)?',
      'Können Sie das betroffene Gelenk / die Extremität normal bewegen?',
      'Haben Sie ein Taubheitsgefühl, ein Kribbeln oder Schmerzen darin? (Sensibilität)',
      'Ist die Hand / der Fuß kälter, blasser oder bläulich geworden? (Durchblutung)',
      'Haben Sie einen Helm getragen? Waren Sie kurz bewusstlos? Gibt es andere Verletzungen?',
    ],
    'Toujours vérifier « Durchblutung, Motorik, Sensibilität » (DMS) d’un membre traumatisé, et rechercher d’autres lésions associées.'),
  F('Rheumatologie', 'bone', 'rheuma', 'Fachanamnese Rhumatologie',
    ['Gelenke', 'Morgensteifigkeit', 'geschwollen', 'gerötet'],
    [
      'Welche Gelenke tun weh? Ein Gelenk oder mehrere, symmetrisch?',
      'Haben Sie morgens eine Steifigkeit? Wie lange dauert sie an?',
      'Sind die Gelenke geschwollen, gerötet oder überwärmt?',
      'Gibt es Begleitsymptome wie Hautausschlag, Augenentzündung oder Fieber?',
    ],
    'La durée de la raideur matinale (> 30–60 min oriente vers une cause inflammatoire) et la symétrie sont des éléments clés du raisonnement rhumatologique.'),
  F('Hämatologie', 'blood', 'haemato', 'Fachanamnese Hématologie',
    ['Blutungen', 'blaue Flecke', 'Müdigkeit', 'Nachtschweiß'],
    [
      'Haben Sie Blutungen bemerkt — Nasenbluten, Zahnfleisch, im Stuhl oder Urin?',
      'Bekommen Sie leichter blaue Flecke als früher, auch ohne Stoß?',
      'Fühlen Sie sich müde, schwach oder blass? Sind Sie öfter krank als sonst?',
      'Haben Sie Fieber, Nachtschweiß oder ungewollt Gewicht verloren?',
    ],
    'La triade fièvre + sueurs nocturnes + amaigrissement (B-Symptomatik) et une tendance hémorragique nouvelle orientent vers une pathologie hématologique sérieuse.'),
  F('Endokrinologie', 'thyroid', 'endo', 'Fachanamnese Endocrinologie',
    ['Gewicht', 'Schwitzen', 'Durst', 'Herzrasen'],
    [
      'Haben Sie ohne Grund an Gewicht zu- oder abgenommen?',
      'Vertragen Sie Wärme oder Kälte schlechter als früher? Schwitzen Sie viel?',
      'Haben Sie Herzrasen, innere Unruhe oder Zittern — oder eher Müdigkeit und Verstopfung?',
      'Haben Sie großen Durst und müssen viel Wasser lassen?',
    ],
    'Oppose systématiquement les tableaux d’hyper- et d’hypofonction (thyroïde), et pense au diabète devant polyurie-polydipsie.'),
  F('Psychiatrie', 'mind', 'psy', 'Fachanamnese Psychiatrie',
    ['Stimmung', 'Schlaf', 'Ängste', 'Selbstmord'],
    [
      'Erzählen Sie mir einfach, was Sie belastet. Wann hat das begonnen?',
      'Wie ist Ihre Stimmung? Fühlen Sie sich niedergeschlagen, oder weinen Sie oft ohne Grund?',
      'Haben Sie Ängste oder Panikattacken? Können Sie noch Freude empfinden?',
      'Wie schlafen Sie? Haben Sie Ein- oder Durchschlafstörungen?',
      'Hatten Sie Gedanken, sich das Leben zu nehmen? Haben Sie einen konkreten Plan?',
    ],
    'Commence par une question ouverte et de l’écoute. La question sur les idées suicidaires est obligatoire et directe : une réponse positive est une urgence.'),
  F('Infektiologie', 'virus', 'infektio', 'Fachanamnese Infectiologie',
    ['Fieber', 'Reise', 'Kontakt', 'Impfung'],
    [
      'Seit wann haben Sie Fieber? Haben Sie es gemessen, wie hoch?',
      'Waren Sie kürzlich im Ausland? Wo genau, und wie lange?',
      'Hatte jemand in Ihrem Umfeld ähnliche Beschwerden?',
      'Sind Sie geimpft? Gab es Kontakt zu Tieren oder ungewöhnlichem Essen?',
    ],
    'L’anamnèse de voyage, de contage et de vaccination oriente le diagnostic infectieux et déclenche les mesures d’isolement si nécessaire.'),
  F('Dermatologie', 'skin', 'derma', 'Fachanamnese Dermatologie',
    ['Hautausschlag', 'Juckreiz', 'Muttermal', 'verändert'],
    [
      'Wo genau ist der Hautausschlag? Juckt er oder tut er weh?',
      'Wie sieht er aus — rot, schuppend, mit Bläschen? Hat er sich ausgebreitet?',
      'Hat sich ein Muttermal verändert (Größe, Form, Farbe, Blutung)?',
      'Haben Sie etwas Neues aufgetragen oder ein neues Medikament genommen?',
    ],
    'Devant un grain de beauté, applique la logique ABCDE (asymétrie, bords, couleur, diamètre, évolution) ; l’évolution récente est le signe le plus important.'),
];

export function getFachanamnese(specialty: Specialty): FachanamneseGuide | undefined {
  return FACHANAMNESEN.find((f) => f.specialty === specialty);
}
