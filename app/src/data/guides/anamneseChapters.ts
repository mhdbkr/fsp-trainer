import type { Case, Specialty } from '@/db/types';
import type { Phrase } from './phrases';
import { phraseProbes } from './phrases';
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
      {
        text: 'Haben Sie Schmerzen oder ein Engegefühl in der Brust? Wo genau — hinter dem Brustbein oder eher in der Magengrube?',
        probe: 'fach-kardio-brust',
        followUp: ['Können Sie mit einem Finger auf die Stelle zeigen, oder ist es eher flächig?'],
      },
      {
        text: 'Treten die Beschwerden nur bei Belastung oder auch in Ruhe auf? Wie lange dauern sie?',
        probe: 'fach-kardio-belastung',
        label: 'Schlüsselfrage',
      },
      {
        text: 'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?',
        probe: 'fach-kardio-ausstrahlung',
      },
      {
        text: 'Hängen die Beschwerden mit dem Atmen, dem Essen oder der Körperlage zusammen?',
        probe: 'fach-kardio-atem',
        alts: ['Also wenn Sie tief einatmen oder ausatmen — ändert sich etwas?'],
      },
      {
        text: 'Haben Sie ein Nitrospray benutzt? Haben sich die Beschwerden dadurch verbessert?',
        probe: 'fach-kardio-nitro',
        label: 'Nitro-Test',
      },
      { text: 'Haben Sie Herzrasen, Herzklopfen oder Herzstolpern bemerkt?', probe: 'fach-kardio-herzrasen' },
      {
        text: 'Bekommen Sie schwer Luft, besonders beim Treppensteigen? Wie viele Stockwerke schaffen Sie ohne Pause?',
        probe: 'fach-kardio-luft',
      },
      {
        text: 'Sind Ihre Beine oder Knöchel geschwollen — eher morgens oder abends? Mit wie vielen Kissen schlafen Sie?',
        probe: 'fach-kardio-oedeme',
        label: 'Herzinsuffizienz',
      },
      { text: 'Müssen Sie nachts Wasser lassen? Wie oft?', probe: 'fach-kardio-nykturie' },
      {
        text: 'Wird es Ihnen manchmal schwarz vor Augen, zum Beispiel beim Aufstehen? Sind Sie schon einmal ohnmächtig geworden?',
        probe: 'fach-kardio-synkope',
      },
    ],
    'Douleur typique : rétrosternale, à l\'effort, avec irradiation ; demande le test au Nitro. Cherche les signes d\'insuffisance cardiaque : œdèmes, orthopnée (nombre d\'oreillers), nycturie, dyspnée d\'effort quantifiée (étages).'),
  F('Pneumologie', 'lung', 'pneumo', 'Fachanamnese Pneumologie',
    ['Atemnot', 'Husten', 'Auswurf', 'Blut', 'Pfeifen', 'Kissen'],
    [
      {
        text: 'Haben Sie Husten? Seit wann, und ist er trocken oder mit Auswurf?',
        probe: 'fach-pneumo-husten',
        alts: ['Seit wann husten Sie? Ist der Husten trocken oder haben Sie Auswurf bemerkt?'],
        followUp: ['Sind Sie heiser? Haben Sie sich verschluckt?'],
      },
      {
        text: 'Wie sieht der Auswurf aus — Farbe und Menge? Ist Blut beigemengt?',
        probe: 'fach-pneumo-auswurf',
        followUp: ['Welche Konsistenz — durchsichtig, gelblich, grünlich, eitrig, dünn, schaumig? Nur Blutfäden oder richtig blutig?'],
      },
      {
        text: 'Bekommen Sie schwer Luft? In Ruhe oder bei Belastung? Wie viele Stockwerke schaffen Sie ohne Pause?',
        probe: 'fach-pneumo-atemnot',
        alts: ['Haben Sie Probleme beim Atmen — eher beim Einatmen oder beim Ausatmen? Bei Belastung oder auch in Ruhe?'],
      },
      {
        text: 'Wie viele Kissen brauchen Sie zum Schlafen? Wachen Sie nachts mit Luftnot auf, oder klagt Ihr Partner über lautes Schnarchen und Atemaussetzer?',
        probe: 'fach-pneumo-orthopnoe',
        label: 'Nachts',
      },
      {
        text: 'Haben Sie Schmerzen beim Atmen oder Husten? Sind sie atemabhängig?',
        probe: 'fach-pneumo-schmerz',
        alts: ['Bekommen Sie Brustschmerzen beim Atmen? Eher beim tiefen Einatmen oder beim Ausatmen?'],
      },
      { text: 'Haben Sie Fieber oder Schüttelfrost?', probe: 'fach-pneumo-fieber' },
      { text: 'Hören Sie beim Atmen ein Pfeifen oder Giemen?', probe: 'fach-pneumo-giemen' },
      { text: 'Hatten Sie kürzlich einen Atemwegsinfekt, Kontakt zu Kranken oder eine Reise?', probe: 'fach-pneumo-infekt' },
      {
        text: 'Rauchen Sie? Waren Sie beruflich Stäuben, Asbest oder Vögeln ausgesetzt?',
        probe: 'fach-pneumo-noxen',
        label: 'Exposition',
      },
      { text: 'Haben Sie Allergien oder ein bekanntes Asthma?', probe: 'fach-pneumo-allergie' },
    ],
    'Distingue dyspnée inspiratoire/expiratoire et d\'effort/repos ; précise TOUJOURS couleur et consistance de l\'expectoration — l\'hémoptysie est un signal d\'alarme. Orthopnée et nombre d\'oreillers font la bascule vers l\'insuffisance cardiaque gauche ; ronflement + apnées vers le SAOS. Pense aux expositions professionnelles (poussières, amiante, oiseaux).'),
  F('Gastroenterologie', 'stomach', 'gastro', 'Fachanamnese Gastroenterologie',
    ['Übelkeit', 'Erbrechen', 'Sodbrennen', 'Völlegefühl', 'Stuhl', 'schwarz', 'Blut'],
    [
      {
        text: 'Leiden Sie an Übelkeit oder Erbrechen?',
        probe: 'fach-gastro-uebelkeit',
        followUp: [
          'Falls ja: Wie oft, wie viel? Wie sah es aus — wie Kaffeesatz, mit Blut? Wie lange nach dem Essen?',
          'Geht es Ihnen besser, nachdem Sie sich erbrochen haben?',
        ],
      },
      { text: 'Haben Sie Sodbrennen? Müssen Sie aufstoßen?', probe: 'fach-gastro-sodbrennen' },
      {
        text: 'Haben Sie ein Völlegefühl? Werden Sie viel schneller satt als früher? Fühlen Sie sich aufgebläht?',
        probe: 'fach-gastro-voelle',
      },
      {
        text: 'Treten die Beschwerden nach bestimmten Speisen auf? Was haben Sie in den letzten Stunden gegessen?',
        probe: 'fach-gastro-speisen',
      },
      {
        text: 'Haben Sie Durchfall oder Verstopfung? Wechseln sich beide ab?',
        probe: 'fach-gastro-stuhl',
        followUp: [
          'Welche Farbe hat der Stuhl — blutig, teerschwarz, sehr hell, gelblich?',
          'Welche Konsistenz — hart, fest, weich, schleimig, wässerig?',
        ],
      },
      {
        text: 'Haben Sie manchmal das Gefühl, zur Toilette zu müssen, aber es kommt eigentlich nichts?',
        probe: 'fach-gastro-tenesmen',
        label: 'Tenesmen',
      },
      {
        text: 'Wann hatten Sie die letzte Magen- oder Darmspiegelung, und was war das Ergebnis?',
        probe: 'fach-gastro-spiegelung',
      },
    ],
    'Le sang joue un rôle capital : vomissement « café moulu » et selles noires (méléna) = hémorragie haute ; sang rouge = basse. Précise toujours couleur ET consistance. Les faux besoins (Tenesmen) orientent vers le rectum.'),
  F('Nephrologie', 'kidney', 'nephro', 'Fachanamnese Néphrologie',
    ['Wasserlassen', 'Urin', 'Blut im Urin', 'Schwellungen', 'Juckreiz'],
    [
      {
        text: 'Müssen Sie häufig Wasser lassen? Hat sich die Menge verändert — deutlich weniger oder mehr? Müssen Sie nachts aufstehen?',
        probe: 'fach-nephro-menge',
        alts: ['Hat sich die Urinmenge in letzter Zeit verändert? Wie oft müssen Sie nachts zur Toilette?'],
        followUp: ['Falls ja: Wie oft stehen Sie nachts auf? Seit wann ist das so?'],
      },
      {
        text: 'Welche Farbe hat Ihr Urin — schaumig, trüb, rötlich oder cola-farben? War sichtbar Blut dabei?',
        probe: 'fach-nephro-aussehen',
        alts: ['Wie sieht Ihr Urin aus? Riecht er ungewöhnlich?'],
      },
      {
        text: 'Sind Ihre Augenlider morgens geschwollen oder die Beine abends dick? Haben Sie rasch an Gewicht zugenommen?',
        probe: 'fach-nephro-oedeme',
        alts: ['Haben Sie Schwellungen im Gesicht, an den Augen oder an den Beinen bemerkt?'],
        label: 'Ödeme',
      },
      { text: 'Ist bei Ihnen ein hoher Blutdruck bekannt, und wie ist er eingestellt?', probe: 'fach-nephro-blutdruck' },
      {
        text: 'Nehmen Sie Schmerzmittel wie Ibuprofen oder Diclofenac ein — und wie oft? Hatten Sie kürzlich eine Untersuchung mit Kontrastmittel?',
        probe: 'fach-nephro-nephrotoxisch',
        label: 'Nierengifte',
      },
      {
        text: 'Haben Sie Juckreiz am ganzen Körper, Übelkeit, Appetitverlust oder einen metallischen Geschmack im Mund?',
        probe: 'fach-nephro-uraemie',
        label: 'Urämie',
      },
      { text: 'Hatten Sie in den letzten Wochen eine Halsentzündung oder eine Hautinfektion?', probe: 'fach-nephro-infekt' },
      {
        text: 'Ist eine Nierenerkrankung bei Ihnen oder in Ihrer Familie bekannt — etwa Zystennieren oder eine Dialyse?',
        probe: 'fach-nephro-vorgeschichte',
      },
    ],
    'Œdèmes du visage/paupières le matin = piste rénale ; jambes le soir = piste cardiaque. Urine mousseuse → protéinurie ; couleur coca → glomérulonéphrite. Demande TOUJOURS les AINS et le produit de contraste : la cause est souvent iatrogène. La colique néphrétique, elle, irradie vers l\'aine — cherche-la dans l\'analyse de la douleur.'),
  F('Urologie', 'kidney', 'uro', 'Fachanamnese Urologie & Sexualanamnese',
    ['Wasserlassen', 'nachts', 'Harnstrahl', 'Flanke', 'Sexualanamnese'],
    [
      {
        text: 'Haben Sie Schmerzen oder ein Brennen beim Wasserlassen?',
        probe: 'fach-uro-miktion',
        followUp: ['Falls ja: Wo genau — vorne in der Harnröhre oder tief im Unterbauch?'],
      },
      {
        text: 'Müssen Sie häufiger als sonst Wasser lassen, auch nachts? Kommt dabei nur wenig?',
        probe: 'fach-uro-frequenz',
        followUp: ['Wie oft müssen Sie nachts aufstehen?'],
      },
      {
        text: 'Haben Sie plötzlichen, starken Harndrang? Können Sie den Urin noch halten?',
        probe: 'fach-uro-drang',
      },
      {
        text: 'Welche Farbe hat der Urin? Ist Blut dabei, oder riecht er auffällig?',
        probe: 'fach-uro-farbe',
        alts: ['Haben Sie Blut im Urin oder einen Ausfluss bemerkt?'],
      },
      {
        text: 'Wie ist der Harnstrahl — abgeschwächt? Müssen Sie pressen, oder tropft es nach?',
        probe: 'fach-uro-strahl',
        alts: ['Ist der Urinstrahl schwächer geworden? Haben Sie das Gefühl, die Blase nicht vollständig zu entleeren?'],
      },
      {
        text: 'Haben Sie Schmerzen in der Flanke oder im Rücken? Strahlen sie in die Leiste aus?',
        probe: 'fach-uro-flanke',
        label: 'Kolik',
      },
      {
        text: 'Haben Sie Fieber oder Schüttelfrost?',
        probe: 'fach-uro-fieber',
        label: 'Alarmzeichen',
      },
      {
        text: 'Darf ich Ihnen ein paar Fragen zu Ihrer Partnerschaft stellen — das gehört zur Untersuchung dazu? Wie verhüten Sie, und wie schützen Sie sich vor Geschlechtskrankheiten?',
        probe: 'fach-uro-sexualanamnese',
        label: 'Sexualanamnese',
        alts: ['Könnten Sie mir etwas über Ihre Beziehung erzählen?'],
        followUp: ['Hatten Sie schon einmal eine sexuell übertragbare Erkrankung?'],
      },
      {
        text: 'Haben Sie Schmerzen oder Blutungen beim oder nach dem Geschlechtsverkehr? Haben Sie Probleme, eine Erektion zu bekommen oder zu halten?',
        probe: 'fach-uro-funktion',
      },
      {
        text: 'Hatten Sie schon einmal einen Harnwegsinfekt, Nierensteine oder Probleme mit der Prostata?',
        probe: 'fach-uro-vorgeschichte',
      },
    ],
    'L\'anamnèse sexuelle s\'ouvre par une question OUVERTE et un ton neutre — annonce que ces questions sont routinières et médicalement nécessaires. Sépare l\'irritatif (brûlure, urgence, pollakiurie = infection) de l\'obstructif (jet faible, poussée, gouttes retardataires = prostate). Fièvre + douleur de flanc = pyélonéphrite, ce n\'est plus une simple cystite.'),
  F('Gynäkologie', 'female', 'gyn', 'Fachanamnese Gynäkologie',
    ['Blutung', 'Ausfluss', 'Unterbauch', 'Brust', 'Vorsorge'],
    [
      {
        text: 'Hat sich Ihre Blutung verändert — stärker, länger, Zwischenblutungen oder Blutungen nach dem Geschlechtsverkehr?',
        probe: 'fach-gyn-blutung',
        label: 'Alarmzeichen',
        alts: ['Bekommen Sie Ihre Tage regelmäßig? Wie stark blutet es — wie viele Binden pro Tag?'],
        followUp: ['Falls die Periode schon aufgehört hat: Hatten Sie seitdem noch einmal eine Blutung?'],
      },
      {
        text: 'Haben Sie Unterbauchschmerzen? Wo genau, und hängen sie mit Ihrem Zyklus zusammen?',
        probe: 'fach-gyn-unterbauch',
      },
      {
        text: 'Haben Sie Ausfluss bemerkt? Welche Farbe hat er, riecht er, und juckt oder brennt es dabei?',
        probe: 'fach-gyn-fluor',
        alts: ['Haben Sie einen Ausfluss aus der Scheide bemerkt?'],
        followUp: ['Falls ja: Welche Konsistenz, und seit wann?'],
      },
      {
        text: 'Haben Sie Schmerzen beim Geschlechtsverkehr oder beim Wasserlassen?',
        probe: 'fach-gyn-dyspareunie',
      },
      {
        text: 'Wie viele Schwangerschaften und Geburten hatten Sie? Gab es Fehlgeburten oder Abbrüche?',
        probe: 'fach-gyn-schwangerschaften',
        followUp: ['Haben Sie normal entbunden oder per Kaiserschnitt? Warum?'],
      },
      {
        text: 'Besteht ein Kinderwunsch, oder gab es Schwierigkeiten, schwanger zu werden?',
        probe: 'fach-gyn-kinderwunsch',
      },
      {
        text: 'Haben Sie in der Brust einen Knoten, Schmerzen, Absonderungen aus der Brustwarze oder Hautveränderungen bemerkt?',
        probe: 'fach-gyn-brust',
        label: 'Brust',
      },
      {
        text: 'Wann waren Sie zuletzt bei der Vorsorge — Krebsabstrich, Mammographie? Sind Sie gegen HPV geimpft?',
        probe: 'fach-gyn-vorsorge',
      },
      {
        text: 'Wurden Sie schon an der Gebärmutter oder den Eierstöcken operiert? Nehmen Sie Hormone ein?',
        probe: 'fach-gyn-eingriffe',
      },
    ],
    'Toute métrorragie post-ménopausique est un signal d\'alarme jusqu\'à preuve du contraire, comme le saignement post-coïtal. Le cycle, la grossesse et la contraception sont déjà demandés dans la Frauenanamnese générale — ici on approfondit. Chez la femme enceinte : céphalées + éclairs visuels + hypertension → pré-éclampsie (urgence), à demander explicitement.'),
  F('Neurologie', 'brain', 'neuro', 'Fachanamnese Neurologie',
    ['Kopfschmerzen', 'einseitig', 'Ohnmacht', 'Aura', 'Zungenbiss', 'Kribbeln'],
    [
      {
        text: 'Haben Sie Kopfschmerzen? Wo genau — einseitig oder beidseitig? Bleiben sie auf einer Seite oder wechseln sie?',
        probe: 'fach-neuro-kopfschmerz',
        alts: ['Haben Sie Kopfschmerzen? Wie fühlen sie sich an — pochend, drückend oder stechend?'],
        followUp: ['Ist Ihnen während der Schmerzen übel? Sind Sie licht- oder lärmempfindlich?'],
      },
      {
        text: 'Kamen die Beschwerden plötzlich wie ein Schlag, oder gab es Vorboten — Lichtblitze, Zickzacklinien, Kribbeln in den Fingern oder im Gesicht?',
        probe: 'fach-neuro-aura',
      },
      {
        text: 'Hatten Sie dabei Begleitbeschwerden an Auge oder Nase — Tränenfluss, Nasenverstopfung, ein hängendes Augenlid?',
        probe: 'fach-neuro-autonom',
      },
      { text: 'Haben Sie Sehstörungen bemerkt — Doppelbilder, verschwommenes Sehen, einen Schleier oder Schmerzen bei Augenbewegungen?', probe: 'fach-neuro-sehen' },
      { text: 'Haben Sie Kribbeln, Taubheitsgefühl oder ein pelziges Gefühl? Wo genau, und seit wann?', probe: 'fach-neuro-sensibilitaet' },
      { text: 'Ist ein Arm oder Bein schwächer geworden? Lassen Sie Dinge fallen oder bleiben Sie mit dem Fuß hängen?', probe: 'fach-neuro-kraft' },
      { text: 'Haben Sie Schwindel, Gangunsicherheit oder das Gefühl zu schwanken? Sind Sie schon gestürzt?', probe: 'fach-neuro-koordination' },
      { text: 'Haben Sie Schwierigkeiten beim Sprechen, beim Finden von Wörtern oder beim Schlucken?', probe: 'fach-neuro-sprache' },
      { text: 'Haben Sie Probleme mit der Blase oder dem Stuhlgang — plötzlichen Drang, Einnässen oder Entleerungsstörungen?', probe: 'fach-neuro-blase' },
      { text: 'Hatten Sie einen Krampfanfall, eine Bewusstlosigkeit oder eine Phase, an die Sie sich nicht erinnern können?', probe: 'fach-neuro-anfall' },
      { text: 'Erinnern Sie sich an alles vor und nach der Episode? Haben Sie sich dabei verletzt — Zungenbiss? Ging unwillkürlich Urin ab?', probe: 'fach-neuro-anfallzeichen' },
      { text: 'Kamen die Beschwerden schubweise und bildeten sich zwischendurch zurück? Werden sie bei Wärme oder Anstrengung schlimmer?', probe: 'fach-neuro-verlauf' },
    ],
    'Sépare la céphalée primaire (migraine avec aura, photophobie) des signaux d\'alarme : début en coup de tonnerre (hémorragie méningée), déficit focal, morsure de langue + perte d\'urine (crise épileptique). La latéralité, les prodromes et les signes autonomes (cluster) sont décisifs.'),
  F('Orthopädie', 'bone', 'ortho', 'Fachanamnese Orthopédie/Trauma',
    ['Sturz', 'Bewegung', 'Taubheit', 'kälter', 'Ausstrahlung'],
    [
      {
        text: 'Gab es einen Unfall oder Sturz? Wie genau ist es passiert, und konnten Sie danach noch auftreten oder das Gelenk bewegen?',
        probe: 'fach-ortho-mechanismus',
        alts: ['Wie ist es passiert — sind Sie gestürzt? Auf welche Seite, und worauf (Erde, Sand, Asphalt, Zement)?'],
        followUp: ['Trugen Sie einen Helm? Sind Sie dabei ohnmächtig geworden? Haben Sie sich noch woanders verletzt?'],
      },
      {
        text: 'Sind die Schmerzen von Bewegung und Belastung abhängig, oder treten sie auch in Ruhe und nachts auf?',
        probe: 'fach-ortho-bewegung',
      },
      {
        text: 'Strahlen die Schmerzen aus — zum Beispiel ins Bein oder in den Arm? Bis wohin genau?',
        probe: 'fach-ortho-ausstrahlung',
      },
      {
        text: 'Haben Sie Kribbeln, ein Taubheitsgefühl oder Kraftverlust in Arm oder Bein bemerkt?',
        probe: 'fach-ortho-sensomotorik',
        label: 'Sensibilität/Motorik',
      },
      {
        text: 'Haben Sie das Gefühl, dass die Hand oder der Fuß kälter, blasser oder bläulich geworden ist?',
        probe: 'fach-ortho-durchblutung',
        label: 'Durchblutung',
      },
      {
        text: 'Haben Sie Probleme beim Wasserlassen oder Stuhlgang oder ein Taubheitsgefühl im Reithosen- und Genitalbereich?',
        probe: 'fach-ortho-cauda',
        label: 'Notfall',
      },
      {
        text: 'Ist das Gelenk geschwollen, gerötet, überwärmt, oder haben Sie einen Bluterguss bemerkt?',
        probe: 'fach-ortho-schwellung',
      },
      {
        text: 'Können Sie das Bein oder den Arm noch belasten? Wie weit können Sie gehen, und was hilft oder verschlimmert?',
        probe: 'fach-ortho-belastung',
      },
      {
        text: 'Hatten Sie an dieser Stelle schon einmal Beschwerden, eine Verletzung oder eine Operation?',
        probe: 'fach-ortho-vorgeschichte',
      },
    ],
    'Toujours vérifier le trio « Durchblutung – Motorik – Sensibilität » d\'un membre traumatisé (les 3 questions étiquetées). Devant une lombalgie : le syndrome de la queue de cheval (troubles sphinctériens, anesthésie en selle) est LA question qui fait basculer vers l\'urgence chirurgicale.'),
  F('Rheumatologie', 'bone', 'rheuma', 'Fachanamnese Rhumatologie',
    ['Gelenke', 'Morgensteifigkeit', 'geschwollen', 'gerötet', 'anfallsartig'],
    [
      {
        text: 'Welche Gelenke sind betroffen — nur eines oder mehrere? Wechseln die Beschwerden von Gelenk zu Gelenk?',
        probe: 'fach-rheuma-gelenke',
        alts: ['Welche Gelenke tun weh? Ein Gelenk oder mehrere, symmetrisch?'],
        followUp: ['Sind beide Seiten gleichermaßen betroffen, oder nur eine?'],
      },
      {
        text: 'Sind die Gelenke morgens steif? Wie lange dauert die Steifigkeit, bis Sie sich wieder normal bewegen können?',
        probe: 'fach-rheuma-morgensteifigkeit',
        label: 'Schlüsselfrage',
        followUp: ['Falls ja: Länger oder kürzer als eine halbe Stunde?'],
      },
      {
        text: 'Ist das Gelenk geschwollen, gerötet oder überwärmt? Können Sie es überhaupt noch berühren?',
        probe: 'fach-rheuma-entzuendung',
        alts: ['Sind die Gelenke geschwollen, gerötet oder überwärmt?'],
      },
      {
        text: 'Kamen die Beschwerden plötzlich und anfallsartig, oder haben sie sich langsam über Wochen entwickelt?',
        probe: 'fach-rheuma-verlauf',
      },
      {
        text: 'Gab es einen Auslöser — ein üppiges Essen mit Fleisch, Alkohol (besonders Bier), Fasten oder eine neue Tablette, etwa eine Wassertablette?',
        probe: 'fach-rheuma-ausloeser',
        label: 'Gicht-Trigger',
      },
      {
        text: 'Haben Sie Hautveränderungen bemerkt — Schuppenflechte, Knötchen unter der Haut oder an den Ohren?',
        probe: 'fach-rheuma-haut',
      },
      {
        text: 'Haben Sie Fieber, Augenentzündungen, Mund- oder Genitalgeschwüre, Durchfall oder eine Bindehautentzündung bemerkt?',
        probe: 'fach-rheuma-systemisch',
        alts: ['Gibt es Begleitsymptome wie Hautausschlag, Augenentzündung oder Fieber?'],
      },
      {
        text: 'Hatten Sie so einen Anfall schon einmal? Sind Nierensteine oder rheumatische Erkrankungen in der Familie bekannt?',
        probe: 'fach-rheuma-vorgeschichte',
      },
    ],
    'Deux questions décident presque tout : la DURÉE de la raideur matinale (> 30–60 min = inflammatoire) et le MODE d\'installation (brutal, monoarticulaire, nocturne = goutte / arthrite septique ; lent et symétrique = polyarthrite rhumatoïde). Le déclencheur alimentaire ou diurétique oriente vers la goutte.'),
  F('Hämatologie', 'blood', 'haemato', 'Fachanamnese Hématologie',
    ['Blutungen', 'blaue Flecke', 'blasser', 'Nachtschweiß', 'Lymphknoten'],
    [
      {
        text: 'Fühlen Sie sich müde und weniger leistungsfähig als früher? Hat man Ihnen gesagt, dass Sie blass aussehen?',
        probe: 'fach-haem-leistung',
        alts: ['Fühlen Sie sich müde? Haben Sie bemerkt, dass Sie blasser geworden sind?'],
      },
      {
        text: 'Bekommen Sie bei Anstrengung schneller Luftnot, Herzklopfen oder Schwindel als früher?',
        probe: 'fach-haem-belastung',
        followUp: ['Falls ja: Ab welcher Belastung — Treppensteigen, Gehen in der Ebene, schon in Ruhe?'],
      },
      {
        text: 'Bekommen Sie leicht blaue Flecken, auch ohne Stoß? Haben Sie Nasenbluten, Zahnfleischbluten oder kleine punktförmige Hauteinblutungen bemerkt?',
        probe: 'fach-haem-blutung',
        alts: ['Haben Sie Blutungen gehabt, eventuell auch kleinere Mengen?'],
        followUp: ['Falls ja: Seit wann? Blutet es länger nach, etwa nach dem Zähneputzen oder einem kleinen Schnitt?'],
      },
      {
        text: 'Haben Sie Blut im Stuhl oder schwarzen Stuhlgang bemerkt? Ist Ihre Regelblutung stark oder verlängert?',
        probe: 'fach-haem-blutverlust',
        label: 'Blutverlustquelle',
        followUp: ['Blut im Erbrochenen, im Auswurf oder im Urin? Welche Farbe — wie Kaffeesatz, hellrot, teerschwarz?'],
      },
      {
        text: 'Wie ernähren Sie sich — essen Sie Fleisch? Ernähren Sie sich vegetarisch oder vegan?',
        probe: 'fach-haem-ernaehrung',
      },
      {
        text: 'Haben Sie Fieber, Nachtschweiß — so stark, dass Sie die Wäsche wechseln müssen — oder ungewollt Gewicht verloren?',
        probe: 'fach-haem-bsymptomatik',
        label: 'B-Symptomatik',
        alts: ['Haben Sie Fieber, Schüttelfrost oder Nachtschweiß bemerkt?'],
        followUp: ['Falls Gewichtsverlust: Wie viele Kilo, und in welchem Zeitraum?'],
      },
      {
        text: 'Haben Sie Schwellungen oder Knoten am Hals, in den Achseln oder in der Leiste getastet?',
        probe: 'fach-haem-lymphknoten',
      },
      {
        text: 'Haben Sie in letzter Zeit häufiger Infekte, Fieber oder eine schlechte Wundheilung bemerkt?',
        probe: 'fach-haem-infekte',
        alts: ['Waren Sie in letzter Zeit häufiger erkältet?'],
      },
      {
        text: 'Haben Sie Knochen- oder Rückenschmerzen, die auch in Ruhe und nachts auftreten?',
        probe: 'fach-haem-knochen',
      },
      {
        text: 'Hatten Sie schon einmal eine Thrombose oder Lungenembolie? Sind Blutgerinnungsstörungen in der Familie bekannt?',
        probe: 'fach-haem-thrombose',
      },
    ],
    'Deux axes à séparer : la lignée rouge (fatigue, pâleur, dyspnée d\'effort → cherche la SOURCE du saignement et l\'alimentation) et la moelle (B-Symptomatik, adénopathies, infections répétées, douleurs osseuses nocturnes). La triade fièvre + sueurs nocturnes + amaigrissement fait basculer vers l\'hémopathie maligne.'),
  F('Onkologie', 'virus', 'onko', 'Fachanamnese Onkologie',
    ['Knoten', 'verschieben', 'Gewicht', 'Appetit', 'Nachtschweiß'],
    [
      {
        text: 'Haben Sie irgendwo einen Knoten, eine Schwellung oder eine Verhärtung getastet?',
        probe: 'fach-onko-knoten',
        alts: ['Wann haben Sie diese Veränderung / diesen Knoten das erste Mal bemerkt?'],
        followUp: [
          'Falls ja: Ist er hart oder weich? Lässt er sich verschieben, oder sitzt er fest?',
          'Tut er beim Tasten weh? Ist er seitdem größer geworden?',
        ],
      },
      {
        text: 'Haben Sie Fieber ohne Infekt, Nachtschweiß mit Wäschewechsel oder ungewollt Gewicht verloren — wie viel in welcher Zeit?',
        probe: 'fach-onko-bsymptomatik',
        label: 'B-Symptomatik',
        alts: ['Haben Sie ungewollt ab- oder zugenommen? Wie viel, und in welchem Zeitraum?'],
      },
      {
        text: 'Wie ist Ihre Belastbarkeit im Alltag? Was schaffen Sie nicht mehr, was vor einem halben Jahr noch ging?',
        probe: 'fach-onko-leistung',
      },
      {
        text: 'Haben Sie Schmerzen, die nachts oder in Ruhe auftreten und allmählich stärker werden?',
        probe: 'fach-onko-schmerz',
        label: 'Alarmzeichen',
      },
      {
        text: 'Haben Sie Blutungen bemerkt — im Stuhl, im Urin, beim Husten oder aus der Scheide?',
        probe: 'fach-onko-blutung',
      },
      {
        text: 'Haben Sie Schluckbeschwerden, ein Völlegefühl oder keinen Appetit mehr?',
        probe: 'fach-onko-appetit',
        alts: ['Hat sich Ihr Appetit verändert?'],
      },
      {
        text: 'Ist bei Ihnen bereits eine Tumorerkrankung bekannt? Wurden Sie operiert, bestrahlt oder mit einer Chemotherapie behandelt?',
        probe: 'fach-onko-vorbehandlung',
      },
      {
        text: 'Gibt es Krebserkrankungen in Ihrer Familie — und in welchem Alter sind die Angehörigen erkrankt?',
        probe: 'fach-onko-familie',
      },
      {
        text: 'Nehmen Sie die Vorsorgeuntersuchungen wahr — Darmspiegelung, Mammographie, Hautkrebsscreening?',
        probe: 'fach-onko-vorsorge',
      },
    ],
    'Un nodule DUR, FIXÉ et INDOLORE qui grossit est plus suspect qu\'un nodule mou, mobile et douloureux. Cherche systématiquement la B-Symptomatik, la douleur nocturne de repos et la perte de performance sur six mois — ce sont elles qui font basculer le raisonnement vers le malin.'),
  F('Endokrinologie', 'thyroid', 'endo', 'Fachanamnese Endocrinologie',
    ['Gewicht', 'Schwitzen', 'Durst', 'Herzrasen', 'Hals'],
    [
      {
        text: 'Haben Sie vermehrt Durst und müssen Sie häufiger Wasser lassen, auch nachts?',
        probe: 'fach-endo-durst',
        alts: ['Haben Sie großen Durst und müssen viel Wasser lassen?'],
      },
      {
        text: 'Hat sich Ihr Gewicht verändert, ohne dass Sie etwas umgestellt haben? Und wie ist Ihr Appetit dabei?',
        probe: 'fach-endo-gewicht',
        alts: ['Haben Sie ohne Grund an Gewicht zu- oder abgenommen?'],
        followUp: ['Falls ja: Wie viele Kilo, und in welchem Zeitraum?'],
      },
      {
        text: 'Schwitzen Sie vermehrt oder frieren Sie leicht? Vertragen Sie Wärme oder Kälte schlechter als früher?',
        probe: 'fach-endo-temperatur',
      },
      {
        text: 'Haben Sie Herzrasen, Zittern der Hände, innere Unruhe — oder umgekehrt Antriebslosigkeit und Müdigkeit bemerkt?',
        probe: 'fach-endo-herz-nerven',
        label: 'Hyper/Hypo',
      },
      {
        text: 'Haben Sie eine Schwellung am Hals, ein Engegefühl, Schluckbeschwerden oder eine Veränderung der Stimme bemerkt?',
        probe: 'fach-endo-hals',
      },
      {
        text: 'Haben sich Ihre Augen verändert — hervortretende Augen, Druckgefühl, Doppelbilder oder Sehstörungen?',
        probe: 'fach-endo-augen',
      },
      {
        text: 'Haben sich Haut, Haare oder Nägel verändert? Und heilen kleine Wunden schlechter als früher?',
        probe: 'fach-endo-haut-haare',
      },
      {
        text: 'Hatten Sie Episoden mit Zittern, Schwitzen, Heißhunger oder Verwirrtheit, die nach dem Essen besser wurden?',
        probe: 'fach-endo-unterzucker',
        label: 'Hypoglykämie',
      },
      {
        text: 'Haben Sie Kribbeln oder Taubheit in den Füßen, eine Sehverschlechterung oder Probleme mit den Nieren?',
        probe: 'fach-endo-folgeschaeden',
        label: 'Folgeschäden',
      },
      {
        text: 'Sind Zucker- oder Schilddrüsenerkrankungen in der Familie bekannt? Werden Sie deswegen schon behandelt oder kontrolliert?',
        probe: 'fach-endo-familie-therapie',
      },
    ],
    'Oppose systématiquement hyper- et hypofonction thyroïdienne (chaleur/froid, agitation/apathie, poids, transit) ; devant polyurie-polydipsie, pense diabète et déroule les complications (pieds, yeux, reins) — c\'est ce que l\'examinateur attend.'),
  F('Chirurgie', 'syringe', 'chirurgie', 'Fachanamnese Chirurgie / Akutes Abdomen',
    ['gegessen', 'Erbrechen', 'Stuhlgang', 'Winde', 'Narben', 'Blutverdünner'],
    [
      {
        text: 'Wann haben Sie zuletzt gegessen und getrunken? Was genau?',
        probe: 'fach-chir-essen',
        label: 'Nüchternheit',
      },
      { text: 'Ist Ihnen übel? Haben Sie sich übergeben?', probe: 'fach-chir-uebelkeit' },
      {
        text: 'Hatten Sie heute Stuhlgang? Gehen noch Winde ab?',
        probe: 'fach-chir-ileus',
        label: 'Ileus-Frage',
      },
      { text: 'Haben Sie Fieber?', probe: 'fach-chir-fieber' },
      {
        text: 'Wurden Sie schon einmal am Bauch operiert? Haben Sie Narben?',
        probe: 'fach-chir-op',
        followUp: ['Wann war das, und weswegen? Gab es Komplikationen bei der Narkose?'],
      },
      {
        text: 'Nehmen Sie Blutverdünner ein?',
        probe: 'fach-chir-blutverduenner',
        followUp: ['Wichtig vor jeder Operation: Wann haben Sie die letzte Tablette genommen?'],
      },
      { text: 'Haben Sie bekannte Gallensteine oder einen Leistenbruch?', probe: 'fach-chir-gallensteine' },
    ],
    'Devant un abdomen aigu : dernier repas (anesthésie !), arrêt des matières ET des gaz (iléus), anticoagulants, antécédents opératoires (brides). Ces questions préparent déjà l\'Aufklärung opératoire.'),
  F('Psychiatrie', 'mind', 'psy', 'Fachanamnese Psychiatrie',
    ['Stimmung', 'Schlaf', 'Ängste', 'Panikattacke', 'Selbstmord'],
    [
      {
        text: 'Wie ist Ihre Stimmung in letzter Zeit? Fühlen Sie sich niedergeschlagen, traurig oder innerlich leer?',
        probe: 'fach-psych-stimmung',
        alts: ['Wie ist Ihre Stimmung? Weinen Sie oft, auch scheinbar ohne Grund?'],
      },
      {
        text: 'Haben Sie noch Freude oder Interesse an Dingen, die Ihnen früher wichtig waren?',
        probe: 'fach-psych-interesse',
      },
      {
        text: 'Wie ist Ihr Antrieb und Ihre Energie? Fällt es Ihnen schwer, den Alltag zu bewältigen?',
        probe: 'fach-psych-antrieb',
      },
      {
        text: 'Wie schlafen Sie? Haben Sie Ein- oder Durchschlafstörungen, oder wachen Sie morgens sehr früh auf?',
        probe: 'fach-psych-schlaf',
        alts: ['Leiden Sie an Einschlaf- oder Durchschlafstörungen?'],
      },
      {
        text: 'Gibt es Tageszeiten, zu denen es Ihnen besser oder schlechter geht — zum Beispiel ein Morgentief?',
        probe: 'fach-psych-tagesverlauf',
      },
      {
        text: 'Können Sie sich noch gut konzentrieren und Entscheidungen treffen?',
        probe: 'fach-psych-konzentration',
        alts: ['Können Sie sich gut konzentrieren, etwa um zu lesen oder zu lernen? Fühlen Sie sich ruhelos?'],
      },
      {
        text: 'Haben Sie Ängste, oder machen Sie sich viele Sorgen — auch wenn Sie eigentlich in Sicherheit sind?',
        probe: 'fach-psych-angst',
        followUp: ['Haben Sie Panikattacken — mit Luftnot, Herzrasen, Herzklopfen oder sogar Todesangst?'],
      },
      {
        text: 'Denken Sie manchmal, dass das Leben nicht mehr lebenswert ist? Haben Sie Gedanken, sich etwas anzutun?',
        probe: 'fach-psych-suizid',
        label: 'Pflichtfrage',
        alts: ['Haben Sie daran gedacht, sich das Leben zu nehmen? Haben Sie einen konkreten Plan gemacht?'],
        followUp: [
          'Haben Sie sich selbst verletzt, oder haben Sie den Wunsch, sich zu verletzen?',
          'Falls bejaht: NOTFALL — der Patient bleibt stationär. Rücksprache mit dem Oberarzt nach der Anamnese.',
        ],
      },
      {
        text: 'Gab es belastende Ereignisse — ein Verlust, eine Trennung, Stress bei der Arbeit?',
        probe: 'fach-psych-ausloeser',
        alts: ['Wann hat alles begonnen? Was, glauben Sie, ist der Auslöser dafür?'],
      },
      {
        text: 'Hatten Sie so etwas schon einmal? Waren Sie deswegen in Behandlung oder haben Sie Medikamente eingenommen?',
        probe: 'fach-psych-frueher',
      },
    ],
    'Ouvre le chapitre par une question ouverte et écoute — puis déroule la triade (humeur, intérêt, énergie) et les symptômes de rythme (sommeil, creux matinal). La question suicidaire est obligatoire, directe et calme ; une réponse positive = urgence, le patient reste hospitalisé. L\'anxiété et les attaques de panique se demandent explicitement : elles changent le diagnostic.'),
  F('Infektiologie', 'virus', 'infektio', 'Fachanamnese Infectiologie',
    ['Fieber', 'Zecke', 'Reise', 'Kontakt', 'Impfung'],
    [
      {
        text: 'Haben Sie Fieber gemessen? Wie hoch, seit wann, und verläuft es in Schüben?',
        probe: 'fach-infekt-fieber',
        alts: ['Hatten Sie Fieber — haben Sie es gemessen, wie hoch?'],
        followUp: ['Haben Sie Schüttelfrost oder Nachtschweiß dabei?'],
      },
      {
        text: 'Hatten Sie einen Zeckenstich oder einen Insektenstich bemerkt? Waren Sie im Wald, im hohen Gras oder im Garten?',
        probe: 'fach-infekt-zecke',
        label: 'Exposition',
      },
      {
        text: 'Haben Sie eine Hautveränderung oder Rötung bemerkt? Hat sie sich ausgebreitet, zum Beispiel ringförmig?',
        probe: 'fach-infekt-haut',
      },
      {
        text: 'Haben Sie Gelenk- oder Muskelschmerzen? Wandern sie von Gelenk zu Gelenk?',
        probe: 'fach-infekt-gelenke',
      },
      {
        text: 'Haben Sie Kopfschmerzen, Nackensteifigkeit, Missempfindungen oder eine Gesichtslähmung bemerkt?',
        probe: 'fach-infekt-neuro',
        label: 'Alarmzeichen',
      },
      {
        text: 'Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?',
        probe: 'fach-infekt-reise',
        alts: ['Haben Sie eine Reise ins Ausland gemacht? Wohin, und wie lange?'],
      },
      {
        text: 'Hatten Sie Kontakt zu kranken Personen oder zu Tieren?',
        probe: 'fach-infekt-kontakt',
        alts: ['Hat jemand in Ihrer Familie oder Ihrem Umfeld ähnliche Beschwerden gehabt?'],
        followUp: ['Arbeiten Sie mit vielen Menschen? Haben Sie ungewöhnliche Lebensmittel gegessen — rohe Milch, rohes Fleisch?'],
      },
      {
        text: 'Wie ist Ihr Impfstatus, insbesondere gegen FSME und Tetanus?',
        probe: 'fach-infekt-impfung',
      },
    ],
    'Voyage, contage, piqûre de tique et vaccination orientent le diagnostic ET déclenchent l\'isolement. Érythème migrant + arthralgies migratrices + paralysie faciale = borréliose jusqu\'à preuve du contraire. Maladie à déclaration : écrire « Gesundheitsamt wurde informiert » dans l\'Arztbrief.'),
  F('Dermatologie', 'skin', 'derma', 'Fachanamnese Dermatologie',
    ['Hautausschlag', 'Juckreiz', 'Bläschen', 'Muttermal', 'verändert'],
    [
      {
        text: 'Wo hat die Hautveränderung angefangen, und wie hat sie sich seitdem ausgebreitet?',
        probe: 'fach-derma-beginn-ort',
        alts: ['Wo genau haben Sie den Hautausschlag? Ist die Stelle größer geworden?'],
        followUp: ['Haben Sie so eine Veränderung auch irgendwo anders am Körper?'],
      },
      {
        text: 'Juckt es, brennt es oder tut es weh? Und wann ist es am schlimmsten?',
        probe: 'fach-derma-empfinden',
        followUp: ['Hält der Juckreiz Sie nachts wach?'],
      },
      {
        text: 'Wie sieht die Stelle aus — gerötet, schuppend, mit Bläschen, Knötchen oder nässend? Hat sie sich verändert?',
        probe: 'fach-derma-aussehen',
        alts: ['Wie sieht er aus — welche Farbe? Ist er trocken oder eher nässend? Schuppend?'],
        followUp: ['Falls Bläschen: Wie groß sind sie? Sind sie mit klarer Flüssigkeit oder mit etwas Eitrigem gefüllt?'],
      },
      {
        text: 'Gab es einen Auslöser — ein neues Medikament, eine neue Creme oder ein Waschmittel, Pflanzen, Sonne oder etwas bei der Arbeit?',
        probe: 'fach-derma-ausloeser',
        label: 'Auslöser',
      },
      {
        text: 'Tritt das in Schüben auf? Wird es zu bestimmten Jahreszeiten oder im Urlaub besser?',
        probe: 'fach-derma-verlauf',
      },
      {
        text: 'Haben Sie dazu Fieber, Gelenkschmerzen oder Veränderungen an Mund, Augen oder im Genitalbereich?',
        probe: 'fach-derma-systemisch',
        label: 'Alarmzeichen',
      },
      {
        text: 'Hatten Sie früher Hautkrankheiten wie Neurodermitis oder Schuppenflechte? Gibt es so etwas in Ihrer Familie?',
        probe: 'fach-derma-vorgeschichte',
        alts: ['Hat jemand in der Familie im Moment etwas Ähnliches?'],
      },
      {
        text: 'Hat sich ein Muttermal verändert — in Größe, Farbe oder Form —, juckt es oder blutet es?',
        probe: 'fach-derma-muttermal',
        label: 'ABCDE',
        followUp: ['Waren Sie schon einmal bei der Hautkrebsvorsorge?'],
      },
      {
        text: 'Womit haben Sie die Stelle bisher behandelt, und hat das geholfen?',
        probe: 'fach-derma-vorbehandlung',
        alts: ['Haben Sie etwas daraufgeschmiert? Nehmen Sie neue Medikamente?'],
      },
    ],
    'Devant un grain de beauté : logique ABCDE (asymétrie, bords, couleur, diamètre, évolution) — l\'ÉVOLUTION récente est le signe le plus important. Pour un exanthème : cherche le déclencheur (médicament, cosmétique, travail, soleil) et les signes systémiques (fièvre, muqueuses) qui font l\'urgence.'),
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
/** Le guide rédigé d'une spécialité est-il HARMONISÉ avec ses sondes ?
 *  Deux conditions : chaque question affichée porte une sonde (donc la fiche
 *  patient sait y répondre), et l'ensemble des sondes est couvert (donc rien
 *  d'attendu par la fiche n'est absent du guide). Tant que les deux ne sont pas
 *  vraies, on retombe sur la génération depuis les sondes — migration
 *  progressive, spécialité par spécialité, sans big bang. */
export function isFachGuideHarmonised(specialty: Specialty): boolean {
  const questions = getFachanamnese(specialty)?.chapter.questions;
  const probes = FACH_PROBES[specialty];
  if (!questions?.length || !probes?.length) return false;
  const bound = new Set<string>();
  for (const q of questions) {
    const ids = phraseProbes(q);
    if (ids.length === 0) return false;
    for (const id of ids) bound.add(id);
  }
  return probes.every((pr) => bound.has(pr.id));
}

export function fachChapterForSimulation(specialty: Specialty): FachanamneseGuide | undefined {
  const guide = getFachanamnese(specialty);
  const probes = FACH_PROBES[specialty];
  if (!probes || probes.length === 0) return guide;
  // Spécialité harmonisée : le texte rédigé fait foi (relances, variantes,
  // ordre clinique) — il couvre déjà toutes les sondes.
  if (isFachGuideHarmonised(specialty)) return guide;
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

// ============================================================================
// ADAPTATION AU CAS — le guide doit refléter CE patient, pas un patient moyen.
// Deux inadéquations relevées à l'usage :
//   1. la Frauenanamnese était proposée aux patients masculins ;
//   2. l'analyse de la douleur (OPQRST) se déroulait intégralement même quand
//      le cas n'a AUCUNE douleur (diabète, hyperthyroïdie, COPD, anémie…) —
//      demander « dumpf, stechend, brennend? » à un diabétique est exactement
//      ce qui donne l'impression d'un guide récité.
// On ne supprime pas les sondes (le contrat de couverture reste), on REFORMULE
// en registre « Beschwerden » et on retire ce qui n'a pas de sens sans douleur.
// ============================================================================

/** Reformulations neutres des questions d'analyse de la douleur, pour un cas
 *  sans douleur. Clé = sonde ; valeur = texte de remplacement. */
const PAINLESS_TEXT: Record<string, string> = {
  'akt-ort': 'Ort — Wo genau spüren Sie die Beschwerden? Können Sie mir die Stelle zeigen?',
  'akt-beginn': 'Beginn — Seit wann haben Sie die Beschwerden? Kamen sie plötzlich oder schleichend?',
  'akt-charakter': 'Charakter — Wie würden Sie die Beschwerden beschreiben? Womit könnte man sie vergleichen?',
  'akt-intensitaet': 'Ausmaß — Wie stark beeinträchtigen die Beschwerden Sie im Alltag? Auf einer Skala von 1 bis 10?',
  'akt-ausstrahlung': 'Ausbreitung — Betreffen die Beschwerden nur eine Stelle, oder breiten sie sich aus?',
  'akt-verlauf': 'Verlauf — Sind die Beschwerden dauerhaft da oder treten sie zeitweise auf?',
  'akt-ausloeser': 'Auslöser — Gab es etwas Bestimmtes, das die Beschwerden ausgelöst hat?',
  'akt-einfluss': 'Einflussfaktoren — Gibt es etwas, das die Beschwerden bessert oder verschlimmert?',
  'akt-frueher': 'Frühere Episoden — Hatten Sie solche Beschwerden schon einmal?',
};

/** Le cas comporte-t-il une douleur à analyser ? */
export const caseHasPain = (c: Case): boolean => !!c.patientSheet.schmerz;

/** Chapitres de l'Allgemeine Anamnese ADAPTÉS au cas joué. */
export function adaptChaptersForCase(c: Case): AnamneseChapter[] {
  const weiblich = c.patientSheet.personalia.geschlecht === 'w';
  const pain = caseHasPain(c);
  return ALLGEMEINE_ANAMNESE
    // Frauenanamnese : uniquement pour une patiente (elle est `optional`).
    .filter((ch) => !(ch.id === 'frauenanamnese' && !weiblich))
    .map((ch) => {
      if (pain || ch.id !== 'aktuell') return ch;
      return {
        ...ch,
        subtitle: 'Motif + analyse des symptômes',
        questions: ch.questions.map((q) => {
          if (typeof q === 'string') return q;
          const probe = typeof q.probe === 'string' ? q.probe : undefined;
          const rewritten = probe ? PAINLESS_TEXT[probe] : undefined;
          // Sans douleur, les relances « sehr stark / Schmerzmittel » n'ont pas
          // lieu d'être : on ne garde que celles qui ne parlent pas de douleur.
          const followUp = q.followUp?.filter((f) => !/schmerz/i.test(f));
          return { ...q, ...(rewritten ? { text: rewritten } : {}), ...(followUp ? { followUp } : {}) };
        }),
      };
    });
}
