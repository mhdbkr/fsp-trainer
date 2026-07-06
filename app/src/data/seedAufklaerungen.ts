import type { AufklaerungItem } from '@/db/types';

// ============================================================================
// Aufklärungen — chaque acte suit les 7 blocs standards (cf. ANALYSE.md §2).
// Le bloc `standardRisiken` est HÉRITÉ (accès veineux + KM), commun à tous ;
// seul `spezifischeRisiken` (+ ablauf/vorbereitung) est propre à l'acte.
// Textes en registre patient, tirés/adaptés du livre Rogoveanu (Kap. 5).
// ============================================================================

// Bloc de risques standard réutilisé (accès veineux + produit de contraste).
const STANDARD_RISIKEN = [
  'Allergien/Unverträglichkeiten (Kontrastmittel, Betäubungs-, Desinfektionsmittel, Latex).',
  'Verletzung/Durchstoßung von Blutgefäßen — meist nur ein blauer Fleck (Hämatom).',
  'Nachblutung (selten); bei starker Blutung ggf. Bluttransfusion mit minimalem Restrisiko einer HIV-/HBV-/HCV-Infektion.',
  'Infektion und Wundheilungsstörung an der Einstichstelle.',
  'Bei Kontrastmittel: Schilddrüsenüberfunktion (vorher TSH-Test) und vorübergehende Nierenfunktionsstörung.',
];

const META = 'Ich versuche, Sie über alles aufzuklären. Wenn ich zu schnell spreche oder Sie etwas nicht verstehen, sagen Sie mir bitte jederzeit Bescheid, einverstanden?';
const ABSCHLUSS = 'Haben Sie noch Fragen? — Dann würde ich Sie bitten, hier zu unterschreiben, dass Sie alles verstanden haben und mit der Maßnahme einverstanden sind. Die Aufklärung erfolgt normalerweise 24 Stunden vorher, außer im Notfall.';

export function seedAufklaerungen(): AufklaerungItem[] {
  return [
    {
      id: 'auf-gastroskopie',
      name: 'Ösophago-Gastro-Duodenoskopie (ÖGD)',
      shortName: 'Gastroskopie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, ich habe gerade mit dem Oberarzt gesprochen: Bei Ihnen ist eine Magenspiegelung (Gastroskopie) nötig.',
        metakommunikation: META,
        warum: 'Wir schauen uns damit die Speiseröhre, den Magen und den Zwölffingerdarm von innen an, um die Ursache Ihrer Beschwerden zu finden — zum Beispiel eine Blutungsquelle, ein Geschwür oder eine Entzündung. Wir können dabei auch gleich Gewebeproben entnehmen oder eine Blutung stillen.',
        ablauf: 'Sie bekommen auf Wunsch ein Beruhigungs- bzw. Schlafmittel über einen venösen Zugang. Dann führen wir einen dünnen, biegsamen Schlauch mit einer kleinen Kamera über den Mund ein. Die Untersuchung dauert nur wenige Minuten. Ein Beißring schützt Ihre Zähne und das Gerät.',
        vorbereitung: 'Sie müssen mindestens 6 Stunden nüchtern sein (nichts essen, nichts trinken, nicht rauchen). Blutverdünner besprechen wir vorher. Nach einer Sedierung dürfen Sie 24 Stunden nicht selbst Auto fahren.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Verletzung oder — sehr selten — Durchstoßung (Perforation) von Speiseröhre/Magen.',
          'Blutung, besonders nach Entnahme von Gewebeproben oder Abtragung von Polypen.',
          'Vorübergehende Heiserkeit oder Halsschmerzen.',
          'Reaktion auf das Beruhigungsmittel (Atmung, Kreislauf) — wir überwachen Sie deshalb.',
          'Aspiration (Verschlucken von Speichel in die Luftröhre).',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Tut das weh?', antwort: 'Nein, in der Regel nicht. Mit dem Beruhigungsmittel bekommen die meisten Patienten kaum etwas mit. Unangenehm kann höchstens ein Würgereiz sein, den wir mit einem Rachenspray dämpfen.' },
        { frage: 'Bin ich dabei wach?', antwort: 'Das entscheiden Sie mit. Sie können die Untersuchung wach mit Rachenbetäubung machen oder ein Schlafmittel bekommen und praktisch nichts davon merken.' },
        { frage: 'Wie lange dauert das?', antwort: 'Die reine Untersuchung dauert meist nur 5 bis 10 Minuten.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-koronarangiographie',
      name: 'Koronarangiographie (Herzkatheter)',
      shortName: 'Koronarangiographie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, ich habe mit dem Oberarzt gesprochen: Bei Ihnen ist eine Herzkatheteruntersuchung (Koronarangiographie) nötig.',
        metakommunikation: META,
        warum: 'Damit stellen wir die Herzkranzgefäße mit einem Kontrastmittel dar und sehen, ob und wo ein Gefäß verengt oder verschlossen ist. Falls nötig, können wir eine Engstelle gleich in derselben Sitzung mit einem Ballon aufdehnen und einen Stent (kleine Gefäßstütze) einsetzen.',
        ablauf: 'Über die Leiste oder das Handgelenk führen wir unter örtlicher Betäubung einen dünnen Schlauch (Katheter) bis zum Herzen. Sie sind dabei wach. Über den Katheter geben wir Kontrastmittel und machen Röntgenaufnahmen. Manchmal spüren Sie kurz ein Wärmegefühl.',
        vorbereitung: 'Sie sollten nüchtern sein. Blutverdünner und Metformin besprechen wir vorher. Wir prüfen Nieren- und Schilddrüsenwerte wegen des Kontrastmittels. Nach dem Eingriff müssen Sie die Punktionsstelle einige Stunden ruhig halten (Druckverband).',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Herzrhythmusstörungen während der Untersuchung.',
          'Sehr selten: Auslösung eines Herzinfarkts oder Schlaganfalls.',
          'Gefäßverletzung an der Punktionsstelle (Nachblutung, Aneurysma, Gefäßverschluss).',
          'Kontrastmittelbedingte Nierenfunktionsstörung.',
          'Bei Stentimplantation: Notwendigkeit einer dauerhaften Blutverdünnung.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Ist das gefährlich?', antwort: 'Die Untersuchung ist ein Routineeingriff, den wir sehr häufig durchführen. Schwere Komplikationen sind selten, und wir überwachen Sie die ganze Zeit engmaschig.' },
        { frage: 'Bekomme ich eine Vollnarkose?', antwort: 'Nein, nur eine örtliche Betäubung an der Einstichstelle. Sie sind wach und können mit uns sprechen.' },
        { frage: 'Bekomme ich sofort einen Stent?', antwort: 'Nur wenn wir eine relevante Engstelle finden. Dann können wir sie meist gleich behandeln — das besprechen wir mit Ihnen, soweit möglich.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-aszitespunktion',
      name: 'Aszitespunktion (Parazentese)',
      shortName: 'Aszitespunktion',
      category: 'Therapie',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, ich habe mit dem Oberarzt gesprochen: Wir möchten bei Ihnen das Bauchwasser mit einer Nadel ablassen (Aszitespunktion).',
        metakommunikation: META,
        warum: 'In Ihrem Bauchraum hat sich Flüssigkeit angesammelt. Wir lassen sie ab, damit Sie besser Luft bekommen und weniger Druck spüren. Gleichzeitig untersuchen wir die Flüssigkeit im Labor, um die Ursache zu klären und eine Infektion auszuschließen.',
        ablauf: 'Wir suchen mit dem Ultraschall die beste Stelle am Unterbauch, desinfizieren und betäuben sie örtlich. Dann führen wir eine dünne Nadel ein und lassen die Flüssigkeit über einen Schlauch kontrolliert ablaufen. Sie liegen dabei bequem.',
        vorbereitung: 'Sie müssen nicht nüchtern sein, sollten aber vorher die Blase entleeren. Blutverdünner und die Gerinnungswerte prüfen wir vorher. Bei großen Mengen geben wir Eiweiß (Albumin) über die Vene.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Verletzung von Darm, Blase oder Blutgefäßen (durch Ultraschallkontrolle selten).',
          'Blutung in die Bauchhöhle.',
          'Infektion der Bauchhöhle (Peritonitis).',
          'Kreislaufabfall bei zu schnellem Ablassen großer Mengen.',
          'Erneute Flüssigkeitsansammlung — die Punktion behandelt die Ursache nicht.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Kommt das Wasser wieder?', antwort: 'Ja, das kann sein, weil wir nur die Flüssigkeit ablassen, nicht die Ursache. Deshalb behandeln wir zusätzlich die Grunderkrankung und mit Medikamenten und Ernährung.' },
        { frage: 'Tut die Nadel weh?', antwort: 'Wir betäuben die Stelle örtlich. Sie spüren höchstens einen kurzen Piks und ein Druckgefühl.' },
      ],
      linkedCaseIds: [],
    },
  ];
}
