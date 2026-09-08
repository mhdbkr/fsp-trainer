import type { Specialty } from '@/db/types';
import type { Phrase } from './phrases';
import { FACH_PROBES } from './anamneseProbes';

// ============================================================================
// Guide d'anamnèse — Allgemeine Anamnese + Spezielle Anamnese par spécialité.
// Contenu fidèle aux trames de préparation de référence (entretien d'admission
// complet) et au manuel (Schmerzanalyse + anamnèses spécialisées).
// REGISTRE PATIENT : langage courant, aucun Fachbegriff avec le patient.
// `alts` = formulations équivalentes ; `followUp` = relances « Falls ja : … ».
// ============================================================================

export interface AnamneseChapter {
  id: string;
  title: string;          // titre allemand
  subtitle?: string;      // aide en français
  icon: string;
  keywords: string[];
  questions: Phrase[];    // questions modèles, registre patient
  tip?: string;           // conseil d'interrogatoire
  optional?: boolean;     // chapitre conditionnel (ex. Frauenanamnese)
}

/** Allgemeine Anamnese — chapitres cochables, dans l'ordre de l'entretien. */
export const ALLGEMEINE_ANAMNESE: AnamneseChapter[] = [
  {
    id: 'eroeffnung', title: 'Gesprächseröffnung', subtitle: 'Accueil, présentation et consentement',
    icon: 'handshake', keywords: ['Aufnahmegespräch', 'einverstanden'],
    questions: [
      'Guten Tag, mein Name ist … , ich bin der zuständige Arzt / die zuständige Ärztin für Sie.',
      {
        text: 'Ich würde gern das Aufnahmegespräch mit Ihnen führen: Ich stelle Ihnen Fragen zu Ihren Symptomen, Ihrer Vorgeschichte und Ihren Lebensgewohnheiten. Jede Ihrer Antworten trägt zur Diagnose und zur Behandlungsplanung bei. Sind Sie damit einverstanden?',
        alts: ['Ich möchte gern das Aufnahmegespräch mit Ihnen führen. Sind Sie damit einverstanden?'],
      },
      'Zuerst möchte ich Ihnen einige persönliche Fragen stellen und anschließend detailliert auf Ihre Beschwerden eingehen.',
      'Fühlen Sie sich wohl, oder brauchen Sie zuerst etwas?',
    ],
    tip: 'Ouvre toujours par une présentation claire et le consentement, puis ANNONCE le plan de l\'entretien (« zuerst …, anschließend … ») : cela montre que tu pilotes le dialogue.',
  },
  {
    id: 'personalia', title: 'Persönliche Daten', subtitle: 'Identité et données de base',
    icon: 'id', keywords: ['buchstabieren', 'Beruf', 'Hausarzt'],
    questions: [
      {
        text: 'Wie heißen Sie mit vollständigem Namen?',
        probe: 'pers-name',
        alts: ['Darf ich Ihren vollständigen Namen erfragen?', 'Darf ich Sie bitten, mir Ihren vollständigen Namen mitzuteilen?'],
      },
      {
        text: 'Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?',
        probe: 'pers-name',
        alts: ['Um Sie korrekt anzusprechen: Buchstabieren Sie das bitte langsam.'],
      },
      { text: 'Wie alt sind Sie? Wann sind Sie geboren?', probe: 'pers-alter' },
      { text: 'Wie groß sind Sie und wie viel wiegen Sie derzeit?', probe: 'pers-groesse' },
      { text: 'Was sind Sie von Beruf? Arbeiten Sie mit besonderen Stoffen (Staub, Chemikalien)?', probe: 'pers-beruf' },
      { text: 'Haben Sie einen Hausarzt? Wie heißt er / sie?', probe: 'pers-hausarzt' },
      {
        text: 'Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?',
        probe: ['pers-name', 'pers-alter', 'pers-groesse'],
        label: 'Technique pro',
      },
    ],
    tip: 'Répéter les données et faire valider (« Ist das korrekt notiert? ») est une technique d\'examen très appréciée : elle sécurise tes notes ET montre une écoute active.',
  },
  {
    id: 'aktuell', title: 'Aktuelle Beschwerden', subtitle: 'Motif + analyse de la douleur (OPQRST)',
    icon: 'pain', keywords: ['Ort', 'Beginn', 'Charakter', 'Intensität', 'Ausstrahlung', 'Verlauf', 'Auslöser', 'Einflussfaktoren', 'Begleitbeschwerden'],
    questions: [
      {
        text: 'Was führt Sie heute zu uns?',
        probe: 'akt-motiv',
        alts: ['Welche Beschwerden möchten Sie mir schildern?', 'Welche Symptome bringen Sie heute zu uns?'],
      },
      {
        text: 'Ort — Wo genau spüren Sie die Beschwerden? Können Sie mit dem Finger zeigen, wo es wehtut?',
        probe: 'akt-ort',
        alts: ['Könnten Sie mir bitte genauer beschreiben, wo Sie die Schmerzen empfinden?'],
      },
      {
        text: 'Beginn — Seit wann haben Sie die Schmerzen? Kamen sie plötzlich oder schleichend?',
        probe: 'akt-beginn',
        alts: ['Wann haben die Schmerzen begonnen?', 'Haben sich die Schmerzen langsam entwickelt oder kamen sie plötzlich?'],
      },
      {
        text: 'Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?',
        probe: 'akt-charakter',
        alts: ['Könnten Sie die Schmerzen genauer beschreiben? Sind sie eher bohrend, ziehend, kribbelnd, scharf, kolikartig oder wellenförmig?'],
      },
      {
        text: 'Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?',
        probe: 'akt-intensitaet',
        followUp: [
          'Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“',
          'Vor jedem Schmerzmittel zuerst fragen: „Gibt es Allergien oder Unverträglichkeiten gegenüber Medikamenten?“',
        ],
      },
      {
        text: 'Ausstrahlung — Strahlen die Schmerzen aus? Wohin, zum Beispiel in den Arm, den Rücken oder die Schulter?',
        probe: 'akt-ausstrahlung',
        alts: ['Breiten sich die Schmerzen auf andere Körperregionen aus?', 'Sind die Schmerzen lokalisiert oder eher diffus? Wandern sie?'],
      },
      {
        text: 'Verlauf — Sind die Schmerzen dauerhaft da oder treten sie anfallsartig auf?',
        probe: 'akt-verlauf',
        followUp: ['Falls anfallsartig: Wie lange dauert eine typische Episode? Wie oft treten die Episoden auf?'],
      },
      { text: 'Auslöser — Gab es etwas Bestimmtes, das die Schmerzen ausgelöst hat? Was taten Sie, als sie begannen?', probe: 'akt-ausloeser' },
      {
        text: 'Einflussfaktoren — Gibt es etwas, das die Beschwerden bessert oder verschlimmert (Essen, Bewegung, Atmung, Körperhaltung)?',
        probe: 'akt-einfluss',
        alts: [
          'Haben Sie festgestellt, dass bestimmte Maßnahmen die Schmerzen lindern oder verschlimmern?',
          'Haben Sie schon Medikamente dagegen probiert? Hat das etwas gebracht?',
        ],
      },
      {
        text: 'Frühere Episoden — Hatten Sie solche Beschwerden schon einmal?',
        probe: 'akt-frueher',
        followUp: ['Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?'],
      },
      { text: 'Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?', probe: 'akt-begleit' },
    ],
    tip: 'C\'est le cœur de l\'interrogatoire : creuse chaque dimension (lieu, début, caractère, intensité, irradiation, évolution, déclencheurs, facteurs, épisodes antérieurs, symptômes associés). Merke : « Schmerzen in + Dativ », « Ausstrahlung in + Akkusativ ».',
  },
  {
    id: 'vegetativ', title: 'Vegetative Anamnese', subtitle: 'Fonctions générales du corps',
    icon: 'pulse', keywords: ['Fieber', 'Schüttelfrost', 'Nachtschweiß', 'Gewicht', 'Appetit', 'Stuhlgang', 'Wasserlassen'],
    questions: [
      {
        text: 'Haben Sie Ihre Körpertemperatur in letzter Zeit gemessen? Haben Sie Fieber festgestellt?',
        probe: 'veg-fieber',
        followUp: [
          'Falls ja: Seit wann? Wie hoch war die Temperatur, und wo gemessen (z. B. im Mund)?',
          'Waren Sie kürzlich im Ausland? Sind Sie regelmäßig geimpft?',
        ],
      },
      { text: 'Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?', probe: 'veg-schuettelfrost' },
      {
        text: 'Ist Ihnen übel? Mussten Sie sich übergeben?',
        probe: 'veg-uebelkeit',
        followUp: ['Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?'],
      },
      {
        text: 'Haben Sie Schwierigkeiten mit dem Stuhlgang oder beim Wasserlassen?',
        probe: 'veg-ausscheidung',
        followUp: ['Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen von Stuhl oder Urin näher beschreiben?'],
      },
      {
        text: 'Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?',
        probe: 'veg-gewicht',
        followUp: ['Falls ja: Wie viele Kilogramm, und in welchem Zeitraum?'],
      },
      { text: 'Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?', probe: 'veg-appetit' },
      { text: 'Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?', probe: 'veg-schlaf' },
    ],
    tip: 'Une perte de poids involontaire, des sueurs nocturnes et de la fièvre forment ensemble un signal d\'alarme (« B-Symptomatik ») à ne jamais manquer. Merke : « Haben Sie gemessen? » (jamais « gemesst »).',
  },
  {
    id: 'vorerkrankungen', title: 'Vorerkrankungen & Voroperationen', subtitle: 'Antécédents médicaux et chirurgicaux',
    icon: 'history', keywords: ['Bluthochdruck', 'Zuckerkrankheit', 'operiert', 'Komplikationen'],
    questions: [
      {
        text: 'Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?',
        label: 'Transition',
      },
      {
        text: 'Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?',
        probe: 'vor-erkrank',
        followUp: ['Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?'],
      },
      {
        text: 'Wurden Sie schon einmal operiert?',
        probe: 'vor-op',
        followUp: ['Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?'],
      },
      { text: 'Waren Sie in letzter Zeit im Krankenhaus?', probe: 'vor-krankenhaus' },
    ],
    tip: 'Cite des exemples concrets de maladies chroniques : les patients « habitués » oublient l\'hypertension ou le diabète. Demande toujours les complications opératoires.',
  },
  {
    id: 'medikamente', title: 'Medikamente', subtitle: 'Traitements en cours',
    icon: 'pill', keywords: ['Dosierung', 'Blutverdünner', 'Kortison', 'Schmerzmittel'],
    questions: [
      {
        text: 'Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?',
        probe: 'med-regelmaessig',
        followUp: ['Falls ja: Welche, seit wann, in welcher Dosierung und wie oft am Tag?'],
      },
      { text: 'Nehmen Sie Blutverdünner oder Kortison?', probe: 'med-blutverduenner' },
      { text: 'Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?', probe: 'med-otc' },
    ],
    tip: 'Demande explicitement les anticoagulants et les antalgiques en vente libre (AINS) : fréquents et cliniquement décisifs. Note le schéma en 1-0-1.',
  },
  {
    id: 'allergien', title: 'Allergien & Unverträglichkeiten', subtitle: 'Allergies et intolérances',
    icon: 'allergy', keywords: ['Allergien', 'Medikamente', 'Hautausschlag', 'Atemnot'],
    questions: [
      {
        text: 'Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?',
        probe: 'all-allergie',
        followUp: ['Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — Hautausschlag, Atemnot, Kreislaufprobleme?'],
      },
      { text: 'Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?', probe: 'all-unvertraeglich' },
    ],
    tip: 'N\'oublie jamais l\'allergie médicamenteuse : elle conditionne toute prescription — y compris l\'antalgique que tu proposes en début d\'entretien.',
  },
  {
    id: 'noxen', title: 'Noxen / Genussmittel', subtitle: 'Tabac, alcool, drogues',
    icon: 'cigarette', keywords: ['Zigaretten', 'Alkohol', 'Drogen'],
    questions: [
      {
        text: 'Rauchen Sie?',
        probe: 'nox-rauchen',
        followUp: [
          'Falls ja: Seit wann, und wie viele Zigaretten ungefähr pro Tag?',
          'Falls aufgehört: Wann haben Sie aufgehört? Wie viele Jahre und wie viel pro Tag davor?',
        ],
      },
      {
        text: 'Trinken Sie Alkohol?',
        probe: 'nox-alkohol',
        followUp: [
          'Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?',
          'Trinken Sie täglich oder nur zu besonderen Anlässen? Wie viel ungefähr pro Woche?',
        ],
      },
      {
        text: 'Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?',
        probe: 'nox-drogen',
        alts: ['Nehmen Sie Drogen, zum Beispiel Cannabis?'],
      },
    ],
    tip: 'Reste neutre et sans jugement — c\'est la condition pour une réponse honnête. Le tabac se quantifie en paquets-années ; pour l\'alcool, note le TYPE, la FRÉQUENCE et la QUANTITÉ.',
  },
  {
    id: 'familie-sozial', title: 'Familien- & Sozialanamnese', subtitle: 'Famille et vie quotidienne',
    icon: 'family', keywords: ['Familie', 'Beruf', 'Stockwerk', 'Aufzug'],
    questions: [
      {
        text: 'Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?',
        probe: 'fam-familie',
        followUp: ['Falls ja: Welche, und seit wann?'],
      },
      {
        text: 'Leben Ihre Eltern noch?',
        probe: 'fam-eltern',
        followUp: ['Falls verstorben: Woran, und wann? (Avec empathie : „Mein herzliches Beileid.“)'],
      },
      { text: 'Wie ist Ihr Familienstand? Haben Sie Kinder — wie viele, und sind sie gesund?', probe: 'fam-stand' },
      {
        text: 'Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?',
        probe: 'fam-beruf',
        alts: ['Falls in Rente: Was haben Sie früher beruflich gemacht?'],
      },
      { text: 'Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?', probe: 'fam-wohnen' },
      { text: 'Haben Sie Haustiere, um die sich jemand kümmern muss?', probe: 'fam-haustiere' },
    ],
    tip: 'Le logement (étage, ascenseur) et l\'entourage comptent pour la sortie et l\'autonomie. En cas de deuil récent, marque un temps d\'empathie avant de continuer.',
  },
  {
    id: 'frauenanamnese', title: 'Frauenanamnese', subtitle: 'Seulement si patiente', optional: true,
    icon: 'female', keywords: ['Monatsblutung', 'schwanger', 'Regelblutung', 'Verhütungsmethoden', 'Wechseljahre'],
    questions: [
      { text: 'Verläuft Ihre Monatsblutung regelmäßig? Wann war Ihre letzte Regelblutung?', probe: 'frau-periode' },
      { text: 'Besteht die Möglichkeit, dass Sie derzeit schwanger sind?', probe: 'frau-schwanger' },
      { text: 'Verwenden Sie Verhütungsmethoden? Wenn ja, welche?', probe: 'frau-verhuetung' },
      {
        text: 'Falls in den Wechseljahren: Wann hatten Sie Ihre letzte Periode? Gehen Sie regelmäßig zum Frauenarzt?',
        probe: 'frau-wechseljahre',
      },
    ],
    tip: 'Obligatoire chez toute patiente en âge de procréer : pense grossesse AVANT toute imagerie ou médicament potentiellement tératogène.',
  },
  {
    id: 'abschluss', title: 'Abschluss & Verdachtsdiagnose', subtitle: 'Clôture et prochaines étapes',
    icon: 'stethoscope', keywords: ['Verdacht', 'Oberarzt'],
    questions: [
      {
        text: 'Das waren meine Fragen. Möchten Sie noch etwas hinzufügen, das mir helfen könnte?',
        alts: ['Ich habe nun alle meine Fragen gestellt und fühle mich gut informiert.'],
      },
      'Als Nächstes werde ich Sie körperlich untersuchen und Blut abnehmen, um Laborwerte zu bestimmen.',
      'Ich bespreche Ihre Beschwerden mit meinem Oberarzt. Danach komme ich zurück und erkläre Ihnen die weiteren Schritte — zum Beispiel apparative Untersuchungen wie Ultraschall.',
      'Haben Sie noch Fragen? Ich stehe Ihnen gerne zur Verfügung.',
    ],
    tip: 'Termine en laissant le patient compléter, annonce les prochaines étapes en langage simple, et propose de répondre aux questions — cela structure et rassure.',
  },
];

// ---------------------------------------------------------------------------
// Spezielle Anamnese par spécialité (manuel, chap. anamnèses spécialisées).
// S'affiche en sous-chapitre EXTRA quand le cas appartient à la spécialité.
// ---------------------------------------------------------------------------
export interface FachanamneseGuide {
  specialty: Specialty;
  icon: string;
  chapter: AnamneseChapter;
}

const F = (specialty: Specialty, icon: string, id: string, title: string, keywords: string[], questions: Phrase[], tip: string): FachanamneseGuide => ({
  specialty, icon, chapter: { id: `fach-${id}`, title, subtitle: 'Questions spécifiques à la spécialité', icon, keywords, questions, tip },
});

export const FACHANAMNESEN: FachanamneseGuide[] = [
  F('Kardiologie', 'heart', 'kardio', 'Fachanamnese Kardiologie',
    ['Brustschmerzen', 'Belastung', 'Nitrospray', 'Herzrasen', 'Ödeme', 'Treppen', 'Kissen'],
    [
      'Haben Sie Schmerzen oder ein Engegefühl in der Brust? Wo genau — hinter dem Brustbein oder eher in der Magengrube?',
      'Treten die Schmerzen nur bei Belastung oder auch in Ruhe auf? Wie lange dauern sie?',
      'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?',
      {
        text: 'Sind die Beschwerden mit dem Atmen verbunden? Mit dem Essen? Mit der Körperlage?',
        alts: ['Also wenn Sie tief einatmen oder ausatmen — ändert sich etwas?'],
      },
      {
        text: 'Haben Sie ein Nitrospray benutzt? Haben sich die Beschwerden dadurch verbessert?',
      },
      'Haben Sie Herzrasen, Herzklopfen oder Herzstolpern bemerkt?',
      'Bekommen Sie schwer Luft, besonders beim Treppensteigen? Wie viele Stockwerke schaffen Sie ohne Pause?',
      'Sind Ihre Beine oder Knöchel geschwollen — eher morgens oder abends? Mit wie vielen Kissen schlafen Sie?',
      'Müssen Sie nachts Wasser lassen? Wie oft?',
      'Wird es Ihnen manchmal schwarz vor Augen, zum Beispiel beim Aufstehen? Sind Sie schon einmal ohnmächtig geworden?',
    ],
    'Douleur typique : rétrosternale, à l\'effort, avec irradiation ; demande le test au Nitro. Cherche les signes d\'insuffisance cardiaque : œdèmes, orthopnée (nombre d\'oreillers), nycturie, dyspnée d\'effort quantifiée (étages).'),
  F('Pneumologie', 'lung', 'pneumo', 'Fachanamnese Pneumologie',
    ['Atemnot', 'Husten', 'Auswurf', 'Blut', 'heiser', 'Schnarchen'],
    [
      'Haben Sie Probleme beim Atmen — eher beim Einatmen (ggf. beim tiefen Luftholen) oder beim Ausatmen?',
      'Wann treten die Beschwerden auf: bei Belastung oder auch in Ruhe?',
      'Bekommen Sie Brustschmerzen beim Atmen? Eher beim tiefen Einatmen oder beim Ausatmen?',
      {
        text: 'Seit wann husten Sie? Ist der Husten trocken oder haben Sie Auswurf bemerkt?',
        followUp: ['Falls Auswurf: Welche Farbe und Konsistenz — durchsichtig, gelblich, grünlich, eitrig, blutig oder nur mit Blutfäden, dünn, wässerig, schleimig, schaumig?'],
      },
      'Haben Sie etwas verschluckt?',
      'Sind Sie heiser?',
      'Klagt Ihr Partner / Ihre Partnerin, dass Sie schnarchen? Ist es passiert, dass Sie beim Schlafen Luftnot bekamen?',
      'Wie viele Kissen nutzen Sie, wenn Sie schlafen?',
    ],
    'Distingue dyspnée inspiratoire/expiratoire et d\'effort/repos ; précise TOUJOURS couleur et consistance de l\'expectoration — l\'hémoptysie est un signal d\'alarme. Pense aux expositions professionnelles (vapeurs, amiante).'),
  F('Gastroenterologie', 'stomach', 'gastro', 'Fachanamnese Gastroenterologie',
    ['Übelkeit', 'Erbrechen', 'Sodbrennen', 'Völlegefühl', 'Stuhl', 'schwarz', 'Blut'],
    [
      {
        text: 'Leiden Sie an Übelkeit? Haben Sie sich übergeben?',
        followUp: [
          'Falls ja: Wie oft, wie viel? Wie sah es aus — wie Kaffeesatz, mit Blut? Wie lange nach dem Essen?',
          'Geht es Ihnen besser, nachdem Sie sich erbrochen haben?',
        ],
      },
      'Haben Sie Sodbrennen? Müssen Sie aufstoßen?',
      'Haben Sie ein Völlegefühl? Werden Sie viel schneller satt als früher? Fühlen Sie sich aufgebläht?',
      'Treten die Beschwerden nach dem Verzehr bestimmter Speisen auf? Was haben Sie in den letzten Stunden gegessen?',
      {
        text: 'Haben Sie Durchfall oder Verstopfung? Wechseln sich beide ab?',
        followUp: [
          'Welche Farbe hat der Stuhl — blutig, teerschwarz, sehr hell, gelblich?',
          'Welche Konsistenz — hart, fest, weich, schleimig, wässerig?',
        ],
      },
      'Haben Sie manchmal das Gefühl, zur Toilette zu müssen, aber es kommt eigentlich nichts?',
      'Wann hatten Sie die letzte Magen- oder Darmspiegelung, und was war das Ergebnis?',
    ],
    'Le sang joue un rôle capital : vomissement « café moulu » et selles noires (méléna) = hémorragie haute ; sang rouge = basse. Précise toujours couleur ET consistance. Les faux besoins (Tenesmen) orientent vers le rectum.'),
  F('Nephrologie', 'kidney', 'nephro', 'Fachanamnese Néphrologie',
    ['Wasserlassen', 'Brennen', 'Blut im Urin', 'Schwellungen', 'Flanken'],
    [
      'Haben Sie Probleme beim Wasserlassen — Brennen, Schmerzen, häufiger Drang?',
      'Müssen Sie häufig Wasser lassen? Welche Menge? Auch nachts — wie oft?',
      'Welche Farbe hat Ihr Urin? War Blut dabei? Riecht er ungewöhnlich?',
      'Haben Sie Schwellungen im Gesicht, an den Augen oder an den Beinen bemerkt?',
      {
        text: 'Haben Sie Rücken- oder Flankenschmerzen?',
        followUp: ['Strahlen die Schmerzen aus — wohin? (Typisch für la colique néphrétique : vers l\'aine.)'],
      },
    ],
    'La colique néphrétique irradie typiquement vers l\'aine — pose la question SPÉCIFIQUEMENT. Œdèmes du visage/paupières = piste rénale ; cherche hématurie et dysurie.'),
  F('Urologie', 'kidney', 'uro', 'Fachanamnese Urologie & Sexualanamnese',
    ['Wasserlassen', 'nachts', 'Ausfluss', 'Verhütung', 'Erektion'],
    [
      'Haben Sie Schmerzen oder Brennen beim Wasserlassen? Müssen Sie häufig oder nachts Wasser lassen?',
      'Ist der Urinstrahl schwächer geworden? Haben Sie das Gefühl, die Blase nicht vollständig zu entleeren?',
      'Haben Sie Blut im Urin oder einen Ausfluss bemerkt?',
      {
        text: 'Könnten Sie mir etwas über Ihre Beziehung erzählen?',
        label: 'Sexualanamnese', alts: ['Mit einer offenen Frage anfangen — nie direkt mit intimen Details.'],
      },
      'Wie verhüten Sie? Wie schützen Sie sich vor Geschlechtskrankheiten?',
      'Hatten Sie schon einmal eine sexuell übertragbare Erkrankung?',
      'Haben Sie Schmerzen oder Blutungen beim / nach dem Geschlechtsverkehr? Haben Sie Probleme, die Erektion zu halten?',
    ],
    'L\'anamnèse sexuelle s\'ouvre par une question OUVERTE et un ton neutre — annonce que ces questions sont routinières et médicalement nécessaires. Protection et antécédents de MST font partie du standard.'),
  F('Gynäkologie', 'female', 'gyn', 'Fachanamnese Gynäkologie',
    ['Tage', 'Blutung', 'Ausfluss', 'schwanger', 'Wechseljahre', 'Kaiserschnitt'],
    [
      'Bekommen Sie Ihre Tage regelmäßig? Wie lange dauern sie? Wie stark blutet es — wie viele Tampons oder Binden pro Tag?',
      {
        text: 'Haben Sie einen Ausfluss aus der Scheide bemerkt?',
        followUp: ['Falls ja: Welche Farbe und Konsistenz? Welcher Geruch? Seit wann?'],
      },
      'Haben Sie Schmierblutungen bemerkt? Blutungen bei oder nach dem Geschlechtsverkehr?',
      'Ist Ihre Periode ausgeblieben? Kann es sein, dass Sie schwanger sind?',
      {
        text: 'Wie viele Schwangerschaften haben Sie gehabt? Gab es Probleme?',
        followUp: ['Hatten Sie Fehlgeburten oder Abtreibungen?', 'Haben Sie normal entbunden oder per Kaiserschnitt? Warum?'],
      },
      {
        text: 'Sind Sie schon in den Wechseljahren? Hatten Sie Blutungen, seitdem Ihre Periode aufgehört ist?',
        label: 'Alarmzeichen',
      },
      'Leiden Sie unter Kopfschmerzen? Sehen Sie Blitze?',
    ],
    'Toute métrorragie post-ménopausique est un signal d\'alarme. Chez la femme enceinte : céphalées + hypertension + protéinurie → penser pré-éclampsie (urgence).'),
  F('Neurologie', 'brain', 'neuro', 'Fachanamnese Neurologie',
    ['Kopfschmerzen', 'einseitig', 'Ohnmacht', 'Aura', 'Zungenbiss', 'Kribbeln'],
    [
      'Haben Sie Kopfschmerzen? Wo genau — einseitig oder beidseitig? Bleiben sie auf einer Seite oder wechseln sie?',
      'Ist Ihnen während der Schmerzen übel? Sind Sie licht- oder lärmempfindlich?',
      'Kommen die Kopfschmerzen plötzlich, oder gibt es Vorboten — Lichtblitze, Kribbeln in den Fingern oder im Gesicht?',
      'Haben Sie Begleitbeschwerden — Tränenfluss, Nasenverstopfung, Augenschmerzen?',
      'Haben Sie Schwindel, Sehstörungen oder Taubheitsgefühle in Armen oder Beinen? Tragen Sie eine Brille?',
      {
        text: 'Hatten Sie Bewusstseinsausfälle? Sind Sie ohnmächtig geworden?',
        followUp: [
          'Erinnern Sie sich an etwas vor, während oder gleich nach der Ohnmacht?',
          'Haben Sie sich dabei verletzt — Kopfverletzung, Zungenbiss? Ging unwillkürlich Urin ab?',
          'Haben Sie Kopfschmerzen oder Brechreiz vor oder nach diesen Episoden?',
        ],
      },
    ],
    'Sépare la céphalée primaire (migraine avec aura, photophobie) des signaux d\'alarme (déficit, morsure de langue + perte d\'urine = crise épileptique). La latéralité et les prodromes sont décisifs.'),
  F('Orthopädie', 'bone', 'ortho', 'Fachanamnese Orthopédie/Trauma',
    ['Sturz', 'Bewegung', 'Taubheit', 'kälter', 'Helm'],
    [
      'Wie ist es passiert — sind Sie gestürzt? Auf welche Seite, und worauf (Erde, Sand, Asphalt, Zement)?',
      'Trugen Sie einen Helm? Sind Sie ohnmächtig geworden?',
      {
        text: 'Können Sie das betroffene Gelenk / die Extremität normal bewegen?',
        label: 'Motorik',
      },
      {
        text: 'Haben Sie ein Taubheitsgefühl, ein Kribbeln oder Schmerzen darin?',
        label: 'Sensibilität',
      },
      {
        text: 'Haben Sie das Gefühl, dass die Hand / der Fuß kälter, blasser oder bläulich geworden ist?',
        label: 'Durchblutung',
      },
      'Haben Sie auch andere Verletzungen, zum Beispiel Abschürfungen?',
    ],
    'Toujours vérifier le trio « Durchblutung – Motorik – Sensibilität » d\'un membre traumatisé (les 3 questions étiquetées), plus les questions spécifiques au cas.'),
  F('Rheumatologie', 'bone', 'rheuma', 'Fachanamnese Rhumatologie',
    ['Gelenke', 'Morgensteifigkeit', 'geschwollen', 'gerötet'],
    [
      'Welche Gelenke tun weh? Ein Gelenk oder mehrere, symmetrisch?',
      'Haben Sie morgens eine Steifigkeit? Wie lange dauert sie an?',
      'Sind die Gelenke geschwollen, gerötet oder überwärmt?',
      'Gibt es Begleitsymptome wie Hautausschlag, Augenentzündung oder Fieber?',
    ],
    'La durée de la raideur matinale (> 30–60 min = inflammatoire) et la symétrie sont les clés du raisonnement rhumatologique.'),
  F('Hämatologie', 'blood', 'haemato', 'Fachanamnese Hématologie',
    ['Blutungen', 'blaue Flecke', 'blasser', 'erkältet', 'Nachtschweiß'],
    [
      {
        text: 'Haben Sie Blutungen gehabt, eventuell auch kleinere Mengen?',
        followUp: ['Blut im Erbrochenen, Auswurf, Stuhl oder Urin? Welche Farbe — wie Kaffeesatz, schaumig, wässerig?'],
      },
      'Bekommen Sie in letzter Zeit leichter blaue Flecke als üblich, auch ohne Stoß?',
      'Fühlen Sie sich müde? Haben Sie bemerkt, dass Sie blasser geworden sind?',
      'Waren Sie in letzter Zeit häufiger erkältet?',
      'Haben Sie Fieber, Schüttelfrost oder Nachtschweiß bemerkt?',
      'Haben Sie ungewollt ab- oder zugenommen? Wie viel, und in welchem Zeitraum?',
    ],
    'La triade fièvre + sueurs nocturnes + amaigrissement (B-Symptomatik), une pâleur, des infections répétées et une tendance hémorragique nouvelle : pense hémopathie.'),
  F('Onkologie', 'virus', 'onko', 'Fachanamnese Onkologie',
    ['Veränderung', 'vergrößert', 'verschieben', 'Gewicht', 'Appetit'],
    [
      'Wann haben Sie diese Veränderung / diesen Knoten das erste Mal bemerkt?',
      'Hat er / sie sich vergrößert?',
      'Tut es weh beim Tasten?',
      'Können Sie den Knoten verschieben, oder ist er fest?',
      'Haben Sie ungewollt ab- oder zugenommen? Wie viel, und in welchem Zeitraum?',
      'Hat sich Ihr Appetit verändert?',
    ],
    'Un nodule DUR, FIXÉ et INDOLORE qui grossit est plus suspect qu\'un nodule mou, mobile et douloureux. Cherche systématiquement la B-Symptomatik.'),
  F('Endokrinologie', 'thyroid', 'endo', 'Fachanamnese Endocrinologie',
    ['Gewicht', 'Schwitzen', 'Durst', 'Herzrasen'],
    [
      'Haben Sie ohne Grund an Gewicht zu- oder abgenommen?',
      'Vertragen Sie Wärme oder Kälte schlechter als früher? Schwitzen Sie viel?',
      'Haben Sie Herzrasen, innere Unruhe oder Zittern — oder eher Müdigkeit und Verstopfung?',
      'Haben Sie großen Durst und müssen viel Wasser lassen?',
    ],
    'Oppose systématiquement hyper- et hypofonction (thyroïde) ; devant polyurie-polydipsie, pense diabète.'),
  F('Chirurgie', 'syringe', 'chirurgie', 'Fachanamnese Chirurgie / Akutes Abdomen',
    ['gegessen', 'Erbrechen', 'Stuhlgang', 'Winde', 'Narben', 'Blutverdünner'],
    [
      'Wann haben Sie zuletzt gegessen und getrunken? Was genau?',
      'Ist Ihnen übel? Haben Sie sich übergeben?',
      {
        text: 'Hatten Sie heute Stuhlgang? Gehen noch Winde ab?',
        label: 'Ileus-Frage',
      },
      'Haben Sie Fieber?',
      'Wurden Sie schon einmal am Bauch operiert? Haben Sie Narben?',
      'Nehmen Sie Blutverdünner ein? (Wichtig vor jeder Operation!)',
      'Haben Sie bekannte Gallensteine oder einen Leistenbruch?',
    ],
    'Devant un abdomen aigu : dernier repas (anesthésie !), arrêt des matières ET des gaz (iléus), anticoagulants, antécédents opératoires (brides). Ces questions préparent déjà l\'Aufklärung opératoire.'),
  F('Psychiatrie', 'mind', 'psy', 'Fachanamnese Psychiatrie',
    ['Stimmung', 'Schlaf', 'Ängste', 'Panikattacke', 'Selbstmord'],
    [
      {
        text: 'Was führt Sie zu uns? Erzählen Sie einfach, bitte.',
        alts: ['Wann hat alles begonnen? Was, glauben Sie, ist der Auslöser dafür?'],
      },
      'Wie ist Ihre Stimmung? Fühlen Sie sich niedergeschlagen? Weinen Sie oft, auch scheinbar ohne Grund?',
      {
        text: 'Haben Sie Ängste, oder machen Sie sich viele Sorgen — auch wenn Sie eigentlich in Sicherheit sind?',
        followUp: ['Haben Sie Panikattacken — mit Luftnot, Herzrasen, Herzklopfen oder sogar Todesangst?'],
      },
      'Haben Sie schon einmal das Gefühl gehabt, Ihren Körper zu verlassen, oder dass eigene Körperteile Ihnen fremd sind?',
      'Können Sie sich gut konzentrieren, etwa um zu lesen oder zu lernen? Fühlen Sie sich ruhelos?',
      'Leiden Sie an Einschlaf- oder Durchschlafstörungen?',
      {
        text: 'Haben Sie daran gedacht, sich das Leben zu nehmen? Haben Sie einen konkreten Plan gemacht?',
        label: 'Pflichtfrage',
        followUp: ['Falls bejaht: NOTFALL — der Patient bleibt stationär. Rücksprache mit dem Oberarzt nach der Anamnese.'],
      },
      'Haben Sie sich selbst verletzt, oder haben Sie den Wunsch, sich zu verletzen?',
    ],
    'Commence par une question OUVERTE et écoute. La question suicidaire est obligatoire, directe et calme ; une réponse positive = urgence, le patient reste hospitalisé.'),
  F('Infektiologie', 'virus', 'infektio', 'Fachanamnese Infectiologie',
    ['Fieber', 'Reise', 'Kontakt', 'Impfung'],
    [
      'Seit wann haben Sie diese Beschwerden? Hatten Sie Fieber — haben Sie es gemessen, wie hoch?',
      'Hat jemand in Ihrer Familie oder Ihrem Umfeld ähnliche Beschwerden gehabt?',
      'Haben Sie eine Reise ins Ausland gemacht? Wohin, und wie lange?',
      'Arbeiten Sie mit vielen Menschen? Mit wie vielen Menschen sind Sie in letzter Zeit in Kontakt gekommen?',
      'Sind Sie geimpft? Gab es Kontakt zu Tieren oder ungewöhnlichem Essen?',
    ],
    'Voyage, contage, vaccination et contacts orientent le diagnostic ET déclenchent l\'isolement. Maladie à déclaration : écrire « Gesundheitsamt wurde informiert » dans l\'Arztbrief.'),
  F('Dermatologie', 'skin', 'derma', 'Fachanamnese Dermatologie',
    ['Hautausschlag', 'Juckreiz', 'Bläschen', 'Muttermal', 'verändert'],
    [
      'Wo genau haben Sie den Hautausschlag? Juckt es? Tut es weh?',
      'Wie sieht er aus — welche Farbe? Ist er trocken oder eher nässend? Schuppend?',
      {
        text: 'Haben Sie auch Bläschen bemerkt?',
        followUp: ['Wie groß sind sie? Welche Farbe? Sind sie mit klarer Flüssigkeit oder mit etwas Eitrigem gefüllt?'],
      },
      'Ist die Stelle größer geworden? Haben Sie so eine Veränderung auch irgendwo anders?',
      {
        text: 'Seit wann haben Sie das Muttermal hier? War es immer so groß / unregelmäßig? Hat es geblutet?',
        label: 'Alarmzeichen',
      },
      'Waren Sie schon einmal bei der Hautkrebsvorsorge?',
      'Haben Sie etwas daraufgemacht / daraufgeschmiert? Nehmen Sie neue Medikamente?',
      'Hat jemand in der Familie im Moment etwas Ähnliches?',
    ],
    'Devant un grain de beauté : logique ABCDE (asymétrie, bords, couleur, diamètre, évolution) — l\'ÉVOLUTION récente est le signe le plus important. Toujours demander les nouveaux produits/médicaments.'),
];

export function getFachanamnese(specialty: Specialty): FachanamneseGuide | undefined {
  return FACHANAMNESEN.find((f) => f.specialty === specialty);
}

/** Chapitre Fachanamnese POUR LA SIMULATION — généré depuis les SONDES de la
 *  spécialité, pas depuis le guide rédigé ci-dessus. Raison : le guide rédigé
 *  et les sondes ont été écrits séparément (appariement lexical ~25 %) ; or ce
 *  sont les sondes que la fiche patient de chaque cas est tenue de répondre
 *  (contrat checkProbeCoverage). En affichant leurs questions canoniques, on
 *  garantit que TOUTE question Fach posée en simulation a sa réplique côté
 *  simulant — le guide rédigé reste la référence de lecture (page Guides).
 *  L'id, le titre, l'icône et le conseil sont repris du guide rédigé quand il
 *  existe, pour ne pas casser l'état des cases cochées. */
export function fachChapterForSimulation(specialty: Specialty): FachanamneseGuide | undefined {
  const guide = getFachanamnese(specialty);
  const probes = FACH_PROBES[specialty];
  if (!probes || probes.length === 0) return guide;
  const base = guide?.chapter;
  return {
    specialty,
    icon: guide?.icon ?? 'stethoscope',
    chapter: {
      id: base?.id ?? `fach-${specialty.toLowerCase()}`,
      title: base?.title ?? `Fachanamnese · ${specialty}`,
      subtitle: base?.subtitle ?? 'Questions spécifiques à la spécialité',
      icon: base?.icon ?? guide?.icon ?? 'stethoscope',
      keywords: base?.keywords ?? [],
      tip: base?.tip,
      questions: probes.map((pr) => ({ text: pr.frage, probe: pr.id })),
    },
  };
}
