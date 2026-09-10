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

// Risques standard d'un acte CHIRURGICAL/en anesthésie (hérités, communs aux OP).
const OP_RISIKEN = [
  'Risiken der Narkose (Herz-Kreislauf, Atmung, allergische Reaktion) — der Narkosearzt klärt Sie gesondert auf.',
  'Nachblutung, Bluterguss und ggf. Notwendigkeit einer Bluttransfusion (minimales Infektionsrestrisiko).',
  'Wundinfektion und Wundheilungsstörung, Narbenbildung.',
  'Thrombose und Embolie — wir beugen mit Spritzen (Heparin) und Bewegung vor.',
  'Verletzung von Nachbarorganen, Nerven oder Gefäßen.',
];

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

    // ── Bildgebung ──────────────────────────────────────────────────────────
    {
      id: 'auf-roentgen-thorax',
      name: 'Röntgenaufnahme des Brustkorbs (Röntgen-Thorax)',
      shortName: 'Röntgen-Thorax',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen eine Röntgenaufnahme des Brustkorbs machen.',
        metakommunikation: META,
        warum: 'Damit beurteilen wir Lunge, Herz und Rippen — zum Beispiel auf eine Lungenentzündung, Wasser in der Lunge, einen Erguss oder einen Tumor.',
        ablauf: 'Sie stellen sich mit dem Brustkorb an die Aufnahmeplatte, atmen tief ein und halten kurz die Luft an. Die Aufnahme dauert nur Sekunden und ist völlig schmerzfrei.',
        vorbereitung: 'Sie müssen den Oberkörper frei machen und Schmuck ablegen. Bei Frauen fragen wir vorher nach einer möglichen Schwangerschaft.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Geringe Strahlenbelastung, vergleichbar mit einigen Tagen natürlicher Umgebungsstrahlung.',
          'In der Schwangerschaft nur bei zwingender Notwendigkeit und mit Bauchschutz.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Ist die Strahlung gefährlich?', antwort: 'Die Dosis ist sehr gering und der Nutzen für die Diagnose überwiegt deutlich. Wir röntgen nur, wenn es wirklich nötig ist.' },
        { frage: 'Muss ich mich ganz ausziehen?', antwort: 'Nein, nur den Oberkörper frei machen und Schmuck ablegen, damit nichts das Bild überlagert.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-ct',
      name: 'Computertomographie (CT), ggf. mit Kontrastmittel',
      shortName: 'CT',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen ist eine Computertomographie — eine Schichtröntgenuntersuchung — nötig.',
        metakommunikation: META,
        warum: 'Damit erstellen wir genaue Schnittbilder des Körpers und können Organe, Gefäße, Entzündungen, Blutungen oder Tumoren sehr detailliert beurteilen. Für manche Fragen geben wir dazu ein Kontrastmittel über die Vene.',
        ablauf: 'Sie liegen auf einer Liege, die durch einen ringförmigen Scanner fährt. Die Untersuchung dauert nur wenige Minuten. Bei Bedarf spritzen wir Kontrastmittel; dabei kann ein kurzes Wärmegefühl auftreten.',
        vorbereitung: 'Vor Kontrastmittel prüfen wir Nieren- und Schilddrüsenwerte und fragen nach Allergien. Metformin und eine mögliche Schwangerschaft besprechen wir vorher. Für Bauchaufnahmen sind Sie ggf. nüchtern.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Höhere Strahlenbelastung als beim normalen Röntgen.',
          'Kontrastmittel: allergische Reaktion, vorübergehende Nierenbelastung, Wärmegefühl.',
          'In der Schwangerschaft möglichst vermeiden.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Ist das wie eine Röhre, in der man feststeckt?', antwort: 'Nein, das CT ist nur ein kurzer, offener Ring — kein enger Tunnel. Die meisten empfinden das nicht als beengend.' },
        { frage: 'Brauche ich unbedingt Kontrastmittel?', antwort: 'Nur wenn es die Fragestellung verlangt. Wenn ja, prüfen wir vorher Ihre Nieren- und Schilddrüsenwerte.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-mrt',
      name: 'Magnetresonanztomographie (MRT / Kernspin)',
      shortName: 'MRT',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen möchten wir eine Kernspintomographie (MRT) durchführen.',
        metakommunikation: META,
        warum: 'Damit stellen wir vor allem Weichteile, Gehirn, Rückenmark, Gelenke und Organe sehr genau dar — ganz ohne Röntgenstrahlung, mithilfe eines starken Magnetfeldes.',
        ablauf: 'Sie liegen ruhig in einer Röhre; das Gerät macht dabei laute Klopfgeräusche, dafür bekommen Sie einen Gehörschutz. Die Untersuchung dauert 15 bis 45 Minuten. Sie können jederzeit über einen Knopf Bescheid geben.',
        vorbereitung: 'Ganz wichtig: Sagen Sie uns, ob Sie Metall im Körper tragen — Herzschrittmacher, Metallsplitter, bestimmte Implantate. Schmuck, Uhr, Karten und Hörgeräte müssen abgelegt werden.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Bei Metallteilen oder einem Herzschrittmacher kann das Magnetfeld gefährlich sein — deshalb die genaue Abfrage.',
          'Enge- oder Beklemmungsgefühl in der Röhre (Klaustrophobie); auf Wunsch ein Beruhigungsmittel.',
          'Bei Kontrastmittel (Gadolinium): sehr selten allergische Reaktion; Vorsicht bei stark eingeschränkter Nierenfunktion.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Ist das schädlich wegen der Strahlen?', antwort: 'Nein, das MRT arbeitet mit einem Magnetfeld, nicht mit Röntgenstrahlen — es gibt keine Strahlenbelastung.' },
        { frage: 'Ich habe Angst in engen Räumen.', antwort: 'Das kommt häufig vor. Sie bekommen einen Notfallknopf, und bei Bedarf können wir Ihnen ein leichtes Beruhigungsmittel geben.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-sonographie',
      name: 'Ultraschalluntersuchung (Sonographie)',
      shortName: 'Sonographie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen eine Ultraschalluntersuchung machen.',
        metakommunikation: META,
        warum: 'Damit beurteilen wir Organe wie Leber, Galle, Nieren, Bauchspeicheldrüse oder Gefäße in Echtzeit — zum Beispiel auf Steine, Stauungen, Flüssigkeit oder Verengungen. Die Methode ist völlig strahlungsfrei.',
        ablauf: 'Wir tragen ein Gel auf die Haut auf und fahren mit einem Schallkopf über die Körperregion. Das ist schmerzfrei und dauert nur wenige Minuten.',
        vorbereitung: 'Für den Oberbauch sollten Sie einige Stunden nüchtern sein; für die Blase/Nieren manchmal mit voller Blase kommen. Sonst keine besondere Vorbereitung.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Praktisch keine Risiken — die Untersuchung ist schmerz- und strahlungsfrei.',
          'Bei einer Kontrastmittel-Sonographie sehr selten eine allergische Reaktion.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Tut das weh?', antwort: 'Nein, überhaupt nicht. Sie spüren nur den Schallkopf und das etwas kühle Gel auf der Haut.' },
        { frage: 'Ist das ungefährlich?', antwort: 'Ja, Ultraschall ist sehr sicher, ohne Strahlung — wir setzen ihn deshalb auch in der Schwangerschaft ein.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-angiographie',
      name: 'Angiographie der Gefäße (DSA), ggf. mit Aufdehnung (PTA)',
      shortName: 'Angiographie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen ist eine Röntgendarstellung der Gefäße (Angiographie) nötig.',
        metakommunikation: META,
        warum: 'Damit stellen wir Ihre Arterien mit Kontrastmittel dar und sehen, wo ein Gefäß verengt oder verschlossen ist. Wenn nötig, können wir eine Engstelle gleich mit einem Ballon aufdehnen (PTA) und einen Stent einsetzen.',
        ablauf: 'Über die Leiste führen wir unter örtlicher Betäubung einen dünnen Katheter in das Gefäß, geben Kontrastmittel und machen Röntgenaufnahmen. Sie sind wach; ein kurzes Wärmegefühl ist möglich.',
        vorbereitung: 'Sie sollten nüchtern sein. Wir prüfen Nieren- und Gerinnungswerte, besprechen Blutverdünner und Metformin. Nach dem Eingriff halten Sie die Punktionsstelle mit einem Druckverband einige Stunden ruhig.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Gefäßverletzung an der Punktionsstelle (Nachblutung, Bluterguss, Aneurysma).',
          'Verschluss oder Ablösung eines Gerinnsels mit Durchblutungsstörung.',
          'Kontrastmittelbedingte Nierenfunktionsstörung.',
          'Bei einer Aufdehnung/Stent: erneute Verengung sowie Notwendigkeit einer Blutverdünnung.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Bekomme ich eine Vollnarkose?', antwort: 'Nein, nur eine örtliche Betäubung an der Einstichstelle in der Leiste. Sie bleiben wach.' },
        { frage: 'Wird die Engstelle gleich behandelt?', antwort: 'Wenn wir eine relevante Verengung finden, können wir sie meist in derselben Sitzung mit einem Ballon aufdehnen und stützen.' },
      ],
      linkedCaseIds: [],
    },
    // ── Endoskopie ──────────────────────────────────────────────────────────
    {
      id: 'auf-koloskopie',
      name: 'Darmspiegelung (Koloskopie)',
      shortName: 'Koloskopie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen ist eine Darmspiegelung (Koloskopie) nötig.',
        metakommunikation: META,
        warum: 'Damit schauen wir den gesamten Dickdarm von innen an — auf Blutungsquellen, Entzündungen, Divertikel oder Polypen und Tumoren. Polypen können wir dabei gleich abtragen und Gewebeproben entnehmen.',
        ablauf: 'Sie bekommen auf Wunsch ein Schlafmittel über die Vene. Dann führen wir einen biegsamen Schlauch mit Kamera über den After ein und schauen den Darm ein. Die Untersuchung dauert etwa 20 bis 30 Minuten.',
        vorbereitung: 'Wichtig ist die Darmreinigung: Am Vortag nur klare Flüssigkeit und eine Spüllösung trinken, bis der Darm sauber ist. Blutverdünner besprechen wir vorher. Nach einer Sedierung dürfen Sie 24 Stunden nicht Auto fahren.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Verletzung oder — sehr selten — Durchstoßung (Perforation) der Darmwand.',
          'Blutung, vor allem nach Abtragung von Polypen.',
          'Blähungen und Bauchkrämpfe durch die eingeblasene Luft.',
          'Reaktion auf das Schlafmittel (Atmung, Kreislauf) — wir überwachen Sie.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Ist das unangenehm?', antwort: 'Mit dem Schlafmittel bekommen die meisten Patienten kaum etwas mit. Ohne Sedierung kann ein Druck- oder Blähgefühl auftreten.' },
        { frage: 'Muss ich wirklich die ganze Spüllösung trinken?', antwort: 'Ja, ein sauberer Darm ist entscheidend — sonst sehen wir nicht alles und müssten die Untersuchung eventuell wiederholen.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-ercp',
      name: 'Endoskopische Darstellung der Gallen- und Pankreasgänge (ERCP)',
      shortName: 'ERCP',
      category: 'Therapie',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen ist eine ERCP nötig — eine Spiegelung mit Darstellung der Gallen- und Bauchspeicheldrüsengänge.',
        metakommunikation: META,
        warum: 'Damit stellen wir die Gallenwege mit Kontrastmittel dar und können die Ursache eines Gallenstaus finden. Vor allem können wir einen eingeklemmten Gallenstein gleich entfernen oder einen verengten Gang mit einem Röhrchen (Stent) offen halten.',
        ablauf: 'Sie bekommen ein Schlafmittel. Wir führen ein Endoskop über den Mund bis zum Zwölffingerdarm, spritzen dort Kontrastmittel in die Gänge und behandeln bei Bedarf — zum Beispiel mit einem kleinen Schnitt an der Mündung (Papillotomie).',
        vorbereitung: 'Sie müssen nüchtern sein. Blutverdünner und Gerinnungswerte prüfen wir vorher. Wegen des Kontrastmittels fragen wir nach Allergien und Nierenwerten.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Entzündung der Bauchspeicheldrüse (Post-ERCP-Pankreatitis) — das häufigste ernste Risiko.',
          'Blutung, besonders nach einem Schnitt an der Gangmündung.',
          'Verletzung oder Durchstoßung von Darm oder Gang.',
          'Aufsteigende Gallenwegsinfektion (Cholangitis).',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Wird der Stein gleich entfernt?', antwort: 'In der Regel ja. Wenn wir einen eingeklemmten Stein finden, können wir ihn meist in derselben Untersuchung bergen.' },
        { frage: 'Warum ist das riskanter als eine Magenspiegelung?', antwort: 'Weil wir an den empfindlichen Gängen der Bauchspeicheldrüse arbeiten; deshalb überwachen wir Sie danach besonders auf eine Entzündung.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-bronchoskopie',
      name: 'Lungenspiegelung (Bronchoskopie)',
      shortName: 'Bronchoskopie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen möchten wir eine Lungenspiegelung (Bronchoskopie) durchführen.',
        metakommunikation: META,
        warum: 'Damit schauen wir die Atemwege von innen an, um die Ursache von Husten, Bluthusten oder einer auffälligen Röntgenveränderung zu klären. Wir können dabei Sekret absaugen und Gewebeproben oder eine Spülung (Lavage) entnehmen.',
        ablauf: 'Wir betäuben den Rachen und geben auf Wunsch ein Beruhigungsmittel. Dann führen wir einen dünnen, biegsamen Schlauch mit Kamera über Mund oder Nase in die Atemwege. Die Untersuchung dauert meist 10 bis 20 Minuten.',
        vorbereitung: 'Sie müssen nüchtern sein. Blutverdünner und Gerinnungswerte besprechen wir vorher. Nach einer Sedierung dürfen Sie 24 Stunden nicht Auto fahren.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Vorübergehender Husten, Heiserkeit oder Halsschmerzen.',
          'Blutung nach Entnahme von Gewebeproben.',
          'Abfall des Sauerstoffgehalts — wir überwachen und geben bei Bedarf Sauerstoff.',
          'Sehr selten: Verletzung der Atemwege oder ein Pneumothorax (Luft im Rippenfellspalt).',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Bekomme ich dabei keine Luft?', antwort: 'Doch, Sie können die ganze Zeit atmen — der Schlauch ist dünn und lässt genug Platz. Wir überwachen Ihren Sauerstoff durchgehend.' },
        { frage: 'Bin ich wach?', antwort: 'Auf Wunsch bekommen Sie ein Beruhigungsmittel und merken kaum etwas; der Rachen wird zusätzlich örtlich betäubt.' },
      ],
      linkedCaseIds: [],
    },
    // ── Punktion / Biopsie ──────────────────────────────────────────────────
    {
      id: 'auf-lumbalpunktion',
      name: 'Entnahme von Nervenwasser (Lumbalpunktion)',
      shortName: 'Lumbalpunktion',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen Nervenwasser aus dem unteren Rücken entnehmen (Lumbalpunktion).',
        metakommunikation: META,
        warum: 'Wir untersuchen die Flüssigkeit, die Gehirn und Rückenmark umgibt, um eine Entzündung oder Infektion des Nervensystems festzustellen — zum Beispiel eine Hirnhautentzündung oder eine Neuroborreliose.',
        ablauf: 'Sie sitzen oder liegen mit rundem Rücken (Katzenbuckel). Wir desinfizieren und betäuben die Stelle örtlich und führen unterhalb des Rückenmarks eine dünne Nadel zwischen die Wirbel ein, um einige Milliliter Flüssigkeit zu gewinnen.',
        vorbereitung: 'Wir prüfen vorher die Gerinnung und besprechen Blutverdünner. Bei Verdacht auf erhöhten Hirndruck machen wir zuerst eine Bildgebung. Danach sollten Sie eine Weile flach liegen bleiben.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Kopfschmerzen nach der Punktion (postpunktioneller Kopfschmerz), oft im Liegen besser.',
          'Rückenschmerzen oder vorübergehende Missempfindungen im Bein.',
          'Blutung oder Infektion an der Einstichstelle (selten).',
          'Sehr selten Verletzung von Nervenwurzeln.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Trefft ihr das Rückenmark?', antwort: 'Nein. Wir stechen bewusst unterhalb des Rückenmarks, dort schwimmen nur einzelne Nervenfäden, denen die Nadel ausweicht.' },
        { frage: 'Werde ich danach gelähmt?', antwort: 'Nein, eine Lähmung ist nicht zu erwarten. Am häufigsten sind vorübergehende Kopfschmerzen.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-feinnadelpunktion',
      name: 'Gewebeentnahme mit einer feinen Nadel (Feinnadelpunktion/Biopsie)',
      shortName: 'Feinnadelpunktion',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten mit einer feinen Nadel eine Gewebeprobe entnehmen (Feinnadelpunktion).',
        metakommunikation: META,
        warum: 'Wir entnehmen aus einem auffälligen Knoten oder Organ (zum Beispiel Schilddrüse, Lymphknoten, Leber) eine kleine Probe, um sie unter dem Mikroskop zu untersuchen und gut- von bösartig zu unterscheiden.',
        ablauf: 'Wir suchen die Stelle mit Ultraschall oder CT, desinfizieren und betäuben sie örtlich und führen eine dünne Nadel ein, um Zellen oder einen kleinen Gewebezylinder zu gewinnen. Das dauert nur wenige Minuten.',
        vorbereitung: 'Wir prüfen vorher die Gerinnung und besprechen Blutverdünner. Je nach Organ sollten Sie danach eine Weile ruhen und die Stelle beobachten.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Blutung oder Bluterguss an der Einstichstelle.',
          'Infektion (selten).',
          'Je nach Lage: Verletzung von Nachbarorganen; bei der Lunge ein Pneumothorax.',
          'Gelegentlich reicht die Probe nicht aus und muss wiederholt werden.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Kann die Nadel den Krebs streuen?', antwort: 'Dieses Risiko ist bei den heutigen feinen Nadeln äußerst gering und der Nutzen der Diagnose überwiegt bei Weitem.' },
        { frage: 'Tut das sehr weh?', antwort: 'Wir betäuben die Stelle. Sie spüren meist nur den Einstich und einen kurzen Druck.' },
      ],
      linkedCaseIds: [],
    },
    // ── Operation / Therapie ────────────────────────────────────────────────
    {
      id: 'auf-laparoskopie',
      name: 'Bauchspiegelung / Schlüssellochoperation (Laparoskopie)',
      shortName: 'Laparoskopie',
      category: 'OP',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, bei Ihnen ist eine Bauchspiegelung — eine Operation in Schlüssellochtechnik — geplant.',
        metakommunikation: META,
        warum: 'Über kleine Schnitte können wir die Bauchhöhle ansehen und schonend operieren, zum Beispiel den Blinddarm oder die Gallenblase entfernen. Das ist meist weniger belastend als ein großer Bauchschnitt.',
        ablauf: 'Der Eingriff erfolgt in Vollnarkose. Wir füllen den Bauch mit Gas, führen über kleine Schnitte eine Kamera und feine Instrumente ein und operieren. Manchmal muss auf einen offenen Bauchschnitt gewechselt werden.',
        vorbereitung: 'Sie müssen nüchtern sein. Blutverdünner besprechen wir vorher, der Narkosearzt klärt Sie gesondert auf. Nach der OP helfen frühe Bewegung und Thrombosespritzen.',
        standardRisiken: OP_RISIKEN,
        spezifischeRisiken: [
          'Umstieg auf eine offene Operation, wenn es die Situation erfordert.',
          'Verletzung von Darm, Blase, Gefäßen oder anderen Organen.',
          'Vorübergehende Schulterschmerzen durch das eingeleitete Gas.',
          'Bauchfellentzündung oder Verwachsungen im späteren Verlauf.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Warum kann man nicht sicher sagen, ob es Schlüsselloch bleibt?', antwort: 'Manchmal zeigt sich erst während der OP, dass ein offener Schnitt sicherer ist — Ihre Sicherheit hat dann Vorrang.' },
        { frage: 'Wie groß sind die Narben?', antwort: 'Meist nur wenige kleine Schnitte von etwa einem Zentimeter, die gut verheilen.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-operation',
      name: 'Allgemeine Aufklärung zur Operation',
      shortName: 'Operation',
      category: 'OP',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, ich habe mit dem Oberarzt gesprochen: Bei Ihnen ist eine Operation nötig.',
        metakommunikation: META,
        warum: 'Wir erklären Ihnen, warum der Eingriff nötig ist, was wir dabei tun und welche Alternativen es gibt, damit Sie in Ruhe entscheiden können. Ohne die Operation würde Ihre Erkrankung voraussichtlich fortschreiten.',
        ablauf: 'Der Eingriff erfolgt in der Regel in Narkose. Der genaue Ablauf hängt vom Befund ab; wir erklären Ihnen die einzelnen Schritte und was Sie danach im Aufwachraum und auf der Station erwartet.',
        vorbereitung: 'Sie müssen nüchtern sein. Blutverdünner, Diabetesmedikamente und Allergien besprechen wir vorher; der Narkosearzt klärt Sie gesondert auf. Nach der OP sind Bewegung und Thromboseprophylaxe wichtig.',
        standardRisiken: OP_RISIKEN,
        spezifischeRisiken: [
          'Eingriffsspezifische Risiken je nach Operationsgebiet (werden gesondert erläutert).',
          'Notwendigkeit einer Erweiterung der Operation bei unerwartetem Befund.',
          'Verzögerte Wundheilung, Narbenbruch oder chronische Schmerzen.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Gibt es eine Alternative zur Operation?', antwort: 'Das besprechen wir offen mit Ihnen. Manchmal gibt es abwartende oder medikamentöse Wege, oft ist die Operation aber die beste Lösung.' },
        { frage: 'Wie lange falle ich aus?', antwort: 'Das hängt vom Eingriff ab; wir geben Ihnen eine realistische Einschätzung und stellen Ihnen eine Krankschreibung aus.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-bluttransfusion',
      name: 'Übertragung von Blut (Bluttransfusion)',
      shortName: 'Bluttransfusion',
      category: 'Therapie',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wegen Ihres niedrigen Blutwertes ist eine Bluttransfusion nötig oder möglich.',
        metakommunikation: META,
        warum: 'Ihr Körper hat zu wenig rote Blutkörperchen, die den Sauerstoff transportieren. Mit einer Bluttransfusion füllen wir das auf, damit Herz und Organe wieder ausreichend versorgt werden.',
        ablauf: 'Wir bestimmen zuerst Ihre Blutgruppe und machen einen Verträglichkeitstest (Kreuzprobe). Dann geben wir das passende Spenderblut über einen venösen Zugang. Während der Übertragung überwachen wir Sie engmaschig.',
        vorbereitung: 'Für die Kreuzprobe nehmen wir Blut ab. Bitte sagen Sie uns, ob Sie früher schon einmal Blut bekommen haben und ob es dabei Reaktionen gab.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Transfusionsreaktion (Fieber, Schüttelfrost, Hautausschlag) — deshalb die Überwachung.',
          'Sehr selten eine schwere Unverträglichkeit bei Verwechslung der Blutgruppe.',
          'Sehr geringes Restrisiko einer Infektion (HIV, Hepatitis B/C) trotz strenger Tests.',
          'Bei großen Mengen: Kreislaufüberlastung, besonders bei Herzschwäche.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        { frage: 'Kann ich mich mit dem Blut anstecken?', antwort: 'Das Restrisiko ist dank strenger Tests äußerst gering. Der Nutzen bei einem gefährlich niedrigen Blutwert überwiegt deutlich.' },
        { frage: 'Kann ich es ablehnen?', antwort: 'Ja, die Entscheidung liegt bei Ihnen. Wir erklären Ihnen dann, welche Risiken ohne Transfusion bestehen und welche Alternativen es gibt.' },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-appendektomie',
      name: 'Blinddarmoperation (laparoskopische Appendektomie)',
      shortName: 'Appendektomie',
      category: 'OP',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir müssen bei Ihnen den entzündeten Wurmfortsatz entfernen (Blinddarmoperation, Appendektomie).',
        metakommunikation: META,
        warum: 'Bei Ihnen ist der Wurmfortsatz des Blinddarms entzündet. Ohne Operation kann er durchbrechen (Perforation), und es droht eine lebensgefährliche Bauchfellentzündung (Peritonitis). Deshalb operieren wir zeitnah und ohne Verzögerung. Der Wurmfortsatz hat keine wichtige Aufgabe — Sie werden ihn nicht vermissen.',
        ablauf: 'Der Eingriff erfolgt in Vollnarkose. Meist operieren wir in Schlüssellochtechnik: über drei kleine Schnitte führen wir eine Kamera am Nabel und feine Instrumente ein, füllen den Bauch mit Gas und entfernen den Wurmfortsatz. Wenn es nötig ist, zum Beispiel bei starken Verwachsungen, wechseln wir auf einen offenen Schnitt. Die Operation dauert etwa 30 bis 60 Minuten, danach bleiben Sie meist zwei bis drei Tage bei uns.',
        vorbereitung: 'Ab jetzt bitte nichts mehr essen und trinken — Sie müssen nüchtern sein. Der Narkosearzt klärt Sie gesondert auf und fragt nach Blutverdünnern und Allergien. Nach der OP bauen wir die Kost langsam auf, Sie stehen früh auf und bekommen Thrombosespritzen. Fäden oder Klammern werden nach etwa 10 Tagen entfernt; bitte schonen Sie sich zwei bis vier Wochen und kommen Sie bei Fieber oder Bauchschmerzen sofort wieder.',
        standardRisiken: OP_RISIKEN,
        spezifischeRisiken: [
          'Wundinfektion an den kleinen Schnitten (häufig, gut behandelbar).',
          'Eiteransammlung (Abszess) im Bauch, vor allem bei bereits durchgebrochenem Wurmfortsatz (selten) — dann ist eine Drainage oder ein weiterer Eingriff nötig.',
          'Umstieg auf eine offene Operation, wenn es die Situation erfordert.',
          'Verletzung von Darm oder Blase und Undichtigkeit des Blinddarmstumpfs (Stumpfinsuffizienz) (selten).',
          'Verwachsungen im Bauch, die später Beschwerden oder einen Darmverschluss verursachen können (selten).',
          'Narbenbruch an einer Einstichstelle im späteren Verlauf (sehr selten).',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Kann man nicht erst mit Antibiotika abwarten?',
          antwort: 'In manchen leichten Fällen ist das möglich, aber bei Ihnen ist die Entzündung deutlich. Wenn wir warten, kann der Wurmfortsatz durchbrechen — die Operation ist dann viel schwieriger. Deshalb raten wir dringend, jetzt zu operieren.',
        },
        {
          frage: 'Wie lange dauert es, bis ich wieder arbeiten kann?',
          antwort: 'Nach einer Schlüssellochoperation sind Sie meist nach ein bis zwei Wochen wieder fit für leichte Tätigkeiten. Schweres Heben und Sport sollten Sie zwei bis vier Wochen vermeiden.',
        },
        {
          frage: 'Bleiben große Narben?',
          antwort: 'Nein, meist nur drei kleine Narben von etwa einem Zentimeter, eine davon im Nabel. Nur wenn wir auf einen offenen Schnitt wechseln müssen, bleibt eine größere Narbe am rechten Unterbauch.',
        },
        {
          frage: 'Wann darf ich wieder essen?',
          antwort: 'Meist schon am Abend nach der OP etwas trinken und am nächsten Tag leichte Kost. Wir steigern das Schritt für Schritt, je nachdem, wie es Ihnen geht.',
        },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-echokardiographie',
      name: 'Ultraschalluntersuchung des Herzens (Echokardiographie, transthorakal und transösophageal)',
      shortName: 'Echokardiographie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen eine Ultraschalluntersuchung des Herzens durchführen (Echokardiographie) — zunächst von außen über den Brustkorb, bei Bedarf zusätzlich über die Speiseröhre (Schluckecho).',
        metakommunikation: META,
        warum: 'Mit dem Ultraschall sehen wir, wie kräftig das Herz pumpt und ob die Herzklappen dicht sind und richtig öffnen. Wir erkennen auch Flüssigkeit im Herzbeutel (Perikarderguss). Beim Schluckecho liegt die Sonde direkt hinter dem Herzen — so sehen wir sehr genau, ob sich Ablagerungen auf den Klappen (bei einer Herzklappenentzündung) oder ein Blutgerinnsel im Vorhof gebildet haben, zum Beispiel bevor wir einen Herzrhythmus wieder in Takt bringen (Kardioversion).',
        ablauf: 'Bei der Untersuchung von außen liegen Sie auf der linken Seite, wir tragen Gel auf die Brust auf und setzen den Schallkopf an — das ist völlig harmlos und dauert 20 bis 30 Minuten. Beim Schluckecho betäuben wir den Rachen mit einem Spray und geben Ihnen auf Wunsch ein leichtes Beruhigungsmittel über die Vene. Dann schlucken Sie einen dünnen, biegsamen Schlauch mit einer kleinen Ultraschallsonde an der Spitze; die Untersuchung selbst dauert etwa 10 bis 15 Minuten.',
        vorbereitung: 'Für die Untersuchung von außen ist keine Vorbereitung nötig. Für das Schluckecho müssen Sie 6 Stunden nüchtern sein und eine herausnehmbare Zahnprothese vorher entfernen. Blutverdünner müssen Sie dafür nicht absetzen. Danach dürfen Sie 2 Stunden nichts essen und trinken, bis die Rachenbetäubung nachlässt, und nach dem Beruhigungsmittel 24 Stunden nicht Auto fahren.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Häufig: Würgereiz und Halsschmerzen oder ein Fremdkörpergefühl nach dem Schluckecho, das nach ein bis zwei Tagen vergeht.',
          'Selten: Beschädigung von Zähnen oder Zahnersatz durch den Beißring.',
          'Selten: Vorübergehender Abfall von Sauerstoff, Blutdruck oder Herzrhythmusstörungen durch das Beruhigungsmittel — wir überwachen Sie die ganze Zeit.',
          'Sehr selten: Verletzung oder Blutung der Speiseröhre oder des Magens.',
          'Extrem selten: Durchstoßung (Perforation) der Speiseröhre, die operiert werden müsste.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Warum reicht der Ultraschall von außen nicht?',
          antwort: 'Von außen stören Rippen und Lunge die Sicht. Über die Speiseröhre liegt die Sonde direkt hinter dem Herzen, und wir sehen die Klappen und den Vorhof viel genauer — das brauchen wir zum Beispiel, um ein Blutgerinnsel sicher auszuschließen.',
        },
        {
          frage: 'Muss ich beim Schluckecho den Schlauch wirklich schlucken?',
          antwort: 'Ja, aber der Rachen ist betäubt und Sie bekommen auf Wunsch ein Beruhigungsmittel. Die meisten Patienten spüren nur einen kurzen Würgereiz beim Einführen und können die ganze Zeit normal atmen.',
        },
        {
          frage: 'Ist der Ultraschall schädlich, zum Beispiel Strahlung?',
          antwort: 'Nein. Ultraschall arbeitet mit Schallwellen, nicht mit Röntgenstrahlen. Die Untersuchung von außen kann man beliebig oft wiederholen, auch in der Schwangerschaft.',
        },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-gelenkpunktion',
      name: 'Gelenkpunktion (Punktion des Kniegelenks)',
      shortName: 'Gelenkpunktion',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen Flüssigkeit aus dem Kniegelenk entnehmen (Gelenkpunktion).',
        metakommunikation: META,
        warum: 'Ihr Knie ist geschwollen, weil sich Flüssigkeit im Gelenk gebildet hat (Erguss). Wir untersuchen diese Flüssigkeit, um die Ursache zu finden: Kristalle bei Gicht, Bakterien bei einer Gelenkinfektion — das wäre ein Notfall, den wir sofort behandeln müssen — oder Blut nach einer Verletzung. Gleichzeitig entlastet die Punktion das Gelenk, und bei Bedarf können wir ein entzündungshemmendes Medikament (Kortison) hineinspritzen.',
        ablauf: 'Sie liegen auf dem Rücken mit leicht gebeugtem Knie. Wir desinfizieren die Haut mehrfach und arbeiten unter streng sterilen Bedingungen. Die Einstichstelle betäuben wir örtlich oder mit einem Kältespray, dann führen wir seitlich neben der Kniescheibe eine Nadel in das Gelenk ein und ziehen die Flüssigkeit ab — die Entlastung spüren Sie meist sofort. Das Ganze dauert nur wenige Minuten.',
        vorbereitung: 'Sie müssen nicht nüchtern sein. Blutverdünner besprechen wir vorher, meist ist eine Punktion trotzdem möglich. Danach bekommen Sie ein Pflaster und sollten das Knie für einen Tag schonen. Bitte beobachten Sie das Gelenk: Bei zunehmender Rötung, Schwellung, starken Schmerzen oder Fieber melden Sie sich sofort.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Häufig: Schmerz oder Druckgefühl an der Einstichstelle für ein bis zwei Tage.',
          'Gelegentlich: Ein blauer Fleck oder eine kleine Blutung ins Gelenk, vor allem bei Blutverdünnern.',
          'Selten: Eine Infektion des Gelenks durch die Punktion — das ist das wichtigste Risiko, deshalb arbeiten wir streng steril.',
          'Selten: Vorübergehendes Aufflammen der Beschwerden nach einer Kortisonspritze; bei Diabetes kann der Blutzucker kurz ansteigen.',
          'Sehr selten: Verletzung des Knorpels oder von Nerven und Gefäßen neben dem Gelenk.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Kann ich danach laufen?',
          antwort: 'Ja, Sie können das Bein gleich belasten. Meist geht es sogar besser, weil der Druck weg ist. Schonen Sie das Knie für einen Tag und verzichten Sie auf Sport.',
        },
        {
          frage: 'Warum geben Sie nicht einfach ein Antibiotikum ohne Punktion?',
          antwort: 'Weil wir erst wissen müssen, ob überhaupt Bakterien im Gelenk sind — und welche. Bei Gicht hilft ein Antibiotikum gar nicht, und bei einer Infektion brauchen wir den Erreger, um das richtige Mittel zu wählen. Ein Antibiotikum vorher würde das Ergebnis verfälschen.',
        },
        {
          frage: 'Kommt die Flüssigkeit wieder?',
          antwort: 'Das kann passieren, solange die Ursache nicht behandelt ist. Deshalb ist die Untersuchung der Flüssigkeit so wichtig — dann behandeln wir gezielt, und der Erguss bleibt weg.',
        },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-knochenmarkpunktion',
      name: 'Knochenmarkpunktion und -biopsie (Beckenkammpunktion)',
      shortName: 'Knochenmarkpunktion',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen Knochenmark aus dem Beckenknochen entnehmen (Knochenmarkpunktion).',
        metakommunikation: META,
        warum: 'Das Knochenmark ist die Fabrik für unsere Blutzellen. Wenn im Blut zu wenige oder auffällige Zellen sind, schauen wir dort nach, wo sie entstehen. So können wir eine Blutkrebserkrankung (Leukämie), eine Erkrankung der Lymphdrüsen (Lymphom), ein Plasmozytom oder die Ursache einer unklaren Blutarmut erkennen — oder ausschließen.',
        ablauf: 'Sie liegen auf der Seite oder auf dem Bauch. Wir desinfizieren die Haut über dem hinteren Beckenkamm und betäuben die Stelle örtlich bis zur Knochenhaut. Dann führen wir eine Nadel in den Knochen ein und ziehen zuerst etwas flüssiges Mark an — dieses Ansaugen tut für zwei bis drei Sekunden ziehend weh, wir sagen Ihnen vorher Bescheid. Danach entnehmen wir mit derselben Nadel einen kleinen Knochenzylinder (Stanzbiopsie). Insgesamt dauert das etwa 15 bis 20 Minuten.',
        vorbereitung: 'Sie müssen nicht nüchtern sein. Wir prüfen vorher die Gerinnung und das Blutbild; Blutverdünner besprechen wir vorher und setzen sie eventuell ab. Danach bekommen Sie einen Druckverband und liegen 30 Minuten auf dem Rücken auf der Einstichstelle. Wir empfehlen, dass Sie nicht selbst fahren, falls Sie ein Beruhigungsmittel wünschen.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Häufig: Ein Druck- oder Wundschmerz an der Einstichstelle für ein bis zwei Tage — ein leichtes Schmerzmittel hilft.',
          'Gelegentlich: Ein blauer Fleck (Hämatom) oder Nachblutung an der Punktionsstelle, vor allem bei Blutverdünnern oder wenigen Blutplättchen.',
          'Selten: Infektion der Einstichstelle oder des Knochens.',
          'Selten: Kreislaufreaktion (Schwindel, Übelkeit) während der Punktion.',
          'Sehr selten: Verletzung von Nachbarstrukturen wie Gefäßen oder Nerven; gelegentlich muss die Punktion wiederholt werden, wenn kein Mark gewonnen werden konnte.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Tut das sehr weh?',
          antwort: 'Die Haut und die Knochenhaut betäuben wir. Was Sie spüren, ist ein Druck und beim Ansaugen des Marks ein kurzer ziehender Schmerz von wenigen Sekunden — ich kündige ihn Ihnen vorher an.',
        },
        {
          frage: 'Bin ich danach gelähmt?',
          antwort: 'Nein. Wir punktieren den Beckenknochen, nicht die Wirbelsäule. Das Rückenmark ist weit entfernt, eine Lähmung ist nicht möglich.',
        },
        {
          frage: 'Wann bekomme ich das Ergebnis?',
          antwort: 'Ein erstes Ergebnis aus dem flüssigen Mark haben wir meist nach ein bis zwei Tagen. Die Untersuchung des Knochenzylinders und spezielle Tests dauern bis zu ein bis zwei Wochen. Wir besprechen alles mit Ihnen, sobald es vorliegt.',
        },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-nierenbiopsie',
      name: 'Gewebeentnahme aus der Niere (Nierenbiopsie)',
      shortName: 'Nierenbiopsie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen eine kleine Gewebeprobe aus der Niere entnehmen (Nierenbiopsie).',
        metakommunikation: META,
        warum: 'Blut- und Urinwerte zeigen uns, dass die Niere nicht richtig arbeitet — aber nicht, warum. Nur unter dem Mikroskop sehen wir, ob zum Beispiel eine Entzündung der Nierenkörperchen (Glomerulonephritis) vorliegt, warum Sie so viel Eiweiß im Urin verlieren oder warum die Nierenfunktion nachlässt. Bei einer Spenderniere prüfen wir so, ob eine Abstoßung vorliegt. Davon hängt ab, welche Behandlung Ihnen wirklich hilft.',
        ablauf: 'Sie liegen auf dem Bauch, bei einer Spenderniere auf dem Rücken. Wir suchen die Niere mit Ultraschall, desinfizieren und betäuben die Haut und die tieferen Schichten örtlich. Dann führen wir unter Ultraschallsicht eine dünne Stanznadel bis zur Niere und entnehmen zwei bis drei kleine Gewebezylinder; dabei bitten wir Sie, kurz die Luft anzuhalten, damit sich die Niere nicht bewegt. Das dauert etwa 20 bis 30 Minuten.',
        vorbereitung: 'Wir prüfen vorher die Gerinnung, das Blutbild und die Blutgruppe. Der Blutdruck muss gut eingestellt sein. Blutverdünner und ASS (Aspirin) müssen vorher pausiert werden — das besprechen wir genau mit Ihnen. Sie sollten 4 bis 6 Stunden nüchtern sein. Danach liegen Sie 24 Stunden im Bett, wir kontrollieren Blutdruck, Blutbild und Urin, und Sie sollten 2 Wochen keinen Sport treiben und nichts Schweres heben.',
        standardRisiken: STANDARD_RISIKEN,
        spezifischeRisiken: [
          'Häufig: Blut im Urin (Hämaturie) in den ersten Tagen — meist harmlos und hört von selbst auf.',
          'Häufig: Ein Bluterguss um die Niere (perirenales Hämatom), der meist keine Beschwerden macht und von selbst verschwindet.',
          'Selten: Stärkere Blutung, die eine Bluttransfusion oder einen Verschluss des blutenden Gefäßes über einen Katheter (Embolisation) nötig macht.',
          'Selten: Infektion oder eine Kurzschlussverbindung zwischen Arterie und Vene in der Niere (arteriovenöse Fistel).',
          'Sehr selten: Verletzung von Nachbarorganen wie Darm, Milz oder Lunge.',
          'Extrem selten: Eine Blutung, die so stark ist, dass die Niere operativ entfernt werden muss.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Warum muss ich danach so lange liegen?',
          antwort: 'Die Niere ist sehr gut durchblutet, und eine Nachblutung zeigt sich meist in den ersten 24 Stunden. Durch die Bettruhe und unsere Kontrollen können wir sie früh erkennen und behandeln.',
        },
        {
          frage: 'Was passiert, wenn es doch stark blutet?',
          antwort: 'Das ist selten. Dann können wir das Gefäß über einen Katheter verschließen oder Blut geben. Wir haben vorher Ihre Blutgruppe bestimmt, damit alles bereit ist.',
        },
        {
          frage: 'Geht das nicht mit Ultraschall oder Blutwerten allein?',
          antwort: 'Leider nein. Bildgebung und Laborwerte zeigen uns, dass die Niere krank ist, aber nicht die genaue Ursache. Die Behandlung — zum Beispiel Kortison oder andere Medikamente — hängt genau davon ab.',
        },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-pleurapunktion',
      name: 'Punktion des Brustfellraums (Pleurapunktion)',
      shortName: 'Pleurapunktion',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen Flüssigkeit aus dem Brustfellraum ablassen (Pleurapunktion).',
        metakommunikation: META,
        warum: 'Zwischen Lunge und Brustwand hat sich bei Ihnen Flüssigkeit angesammelt (Pleuraerguss). Wir untersuchen diese Flüssigkeit, um die Ursache zu finden — zum Beispiel eine Herzschwäche, eine Lungenentzündung, eine Tuberkulose oder einen Tumor. Gleichzeitig entlasten wir die Lunge, damit Sie wieder leichter atmen können.',
        ablauf: 'Sie sitzen auf der Bettkante und lehnen sich nach vorn über einen Tisch. Mit dem Ultraschall suchen wir die beste Stelle, desinfizieren und betäuben die Haut örtlich. Dann führen wir eine dünne Nadel am Oberrand einer Rippe ein — die Blutgefäße und Nerven laufen am Unterrand, so schonen wir sie. Über die Nadel lassen wir die Flüssigkeit langsam ab, pro Sitzung höchstens etwa ein bis eineinhalb Liter. Ein Husten oder Ziehen in der Brust beim Ablassen ist normal.',
        vorbereitung: 'Sie müssen nicht nüchtern sein. Wir prüfen vorher die Blutgerinnung und besprechen Ihre Blutverdünner. Danach machen wir ein Röntgenbild der Lunge, um sicherzugehen, dass die Lunge sich gut entfaltet hat. Bitte melden Sie sich sofort, wenn Sie nach der Punktion plötzlich schlechter Luft bekommen.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Husten und Ziehen in der Brust beim Ablassen (häufig, harmlos) — wir stoppen, wenn es zu stark wird.',
          'Luft im Brustfellraum (Pneumothorax), wenn die Lunge angestochen wird (selten); deshalb das Röntgenbild danach, manchmal ist eine Drainage nötig.',
          'Blutung oder Bluterguss an der Einstichstelle, sehr selten Verletzung eines Rippengefäßes.',
          'Infektion des Brustfellraums (selten).',
          'Kreislaufreaktion mit Schwindel oder Übelkeit während der Punktion (selten).',
          'Sehr selten Verletzung von Leber oder Milz, wenn zu tief punktiert wird — der Ultraschall schützt davor.',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Tut das weh?',
          antwort: 'Die örtliche Betäubung brennt kurz. Danach spüren Sie meist nur einen Druck. Beim Ablassen kann ein Hustenreiz oder ein Ziehen kommen — das ist normal und hört nach der Punktion auf.',
        },
        {
          frage: 'Warum lassen Sie nicht die ganze Flüssigkeit auf einmal ab?',
          antwort: 'Wenn sich die Lunge zu schnell wieder entfaltet, kann sie Wasser einlagern (Reexpansionsödem). Deshalb nehmen wir pro Sitzung höchstens etwa ein bis eineinhalb Liter. Wenn nötig, wiederholen wir die Punktion.',
        },
        {
          frage: 'Muss ich danach im Krankenhaus bleiben?',
          antwort: 'Nach dem Kontroll-Röntgen und einer kurzen Beobachtung können Sie meist auf die Station zurück oder nach Hause. Bei Luftnot oder Schmerzen melden Sie sich bitte sofort.',
        },
      ],
      linkedCaseIds: [],
    },
    {
      id: 'auf-zystoskopie',
      name: 'Blasenspiegelung (Zystoskopie)',
      shortName: 'Zystoskopie',
      category: 'Untersuchung',
      blocks: {
        einleitung: 'Guten Tag Herr/Frau X, wir möchten bei Ihnen eine Blasenspiegelung (Zystoskopie) durchführen.',
        metakommunikation: META,
        warum: 'Damit schauen wir die Harnröhre und die Blase von innen an. Das ist wichtig bei Blut im Urin, um einen Tumor der Blase auszuschließen, bei immer wiederkehrenden Blasenentzündungen, bei Beschwerden durch die Prostata oder bei Verdacht auf Blasensteine. Nach einem Blasentumor dient die Untersuchung auch der regelmäßigen Kontrolle.',
        ablauf: 'Sie liegen auf dem Rücken mit angewinkelten Beinen in Halterungen (Steinschnittlage). Wir geben ein Gleitgel mit Betäubungsmittel in die Harnröhre und führen ein dünnes, meist biegsames Instrument mit Kamera in die Blase ein. Die Blase wird mit Flüssigkeit gefüllt, damit wir die Schleimhaut, die Prostata und die Mündungen der Harnleiter gut sehen. Die Untersuchung dauert etwa 10 bis 15 Minuten und erfolgt ambulant.',
        vorbereitung: 'Sie müssen nicht nüchtern sein. Vorher untersuchen wir Ihren Urin — bei einer Infektion behandeln wir erst und spiegeln später. Je nach Risiko bekommen Sie vorher ein Antibiotikum. Danach sollten Sie viel trinken, um die Blase durchzuspülen.',
        standardRisiken: [],
        spezifischeRisiken: [
          'Brennen beim Wasserlassen und leichte Blutbeimengung im Urin für ein bis zwei Tage (häufig, normal).',
          'Harnwegsinfekt mit Fieber (selten) — viel trinken hilft, bei Fieber bitte melden.',
          'Verletzung der Harnröhre oder der Blasenwand (selten).',
          'Vorübergehender Harnverhalt, so dass kurz ein Katheter nötig wird (selten).',
          'Narbige Verengung der Harnröhre (Striktur) im späteren Verlauf (sehr selten).',
        ],
        abschluss: ABSCHLUSS,
      },
      patientQuestions: [
        {
          frage: 'Tut das weh?',
          antwort: 'Das Gel betäubt die Harnröhre. Bei Frauen ist die Harnröhre kurz, die Untersuchung ist meist nur unangenehm. Bei Männern ist sie länger und führt durch die Prostata, daher spürt man mehr Druck — mit dem biegsamen Instrument ist das aber gut aushaltbar.',
        },
        {
          frage: 'Muss ich nüchtern sein?',
          antwort: 'Nein, Sie dürfen ganz normal essen und trinken. Es ist keine Narkose nötig, nur das Betäubungsgel.',
        },
        {
          frage: 'Kann ich danach normal Wasser lassen?',
          antwort: 'Ja. Ein Brennen und etwas Blut im Urin sind in den ersten ein bis zwei Tagen normal. Trinken Sie viel. Wenn Sie gar nicht Wasser lassen können oder Fieber bekommen, kommen Sie bitte sofort wieder.',
        },
      ],
      linkedCaseIds: [],
    },
  ];
}
