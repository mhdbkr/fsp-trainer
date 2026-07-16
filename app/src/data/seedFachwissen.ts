import type { Fachwissen } from '@/db/types';

// ============================================================================
// Fachwissen de démonstration — fiches riches (livre Rogoveanu + ODAK).
// 4 pathologies : Leberzirrhose, Angina pectoris/KHK, Akute Pankreatitis,
// Obere GI-Blutung. Structure: Definition → Ätiologie → Klinik (atypies) →
// Diagnostik (non-invasif→invasif) → DD (critères) → Therapie → Prognose +
// pièges d'examen + questions réellement posées.
// ============================================================================

export function seedFachwissen(): Fachwissen[] {
  return [
    {
      id: 'fw-leberzirrhose',
      pathology: 'Leberzirrhose',
      specialty: 'Gastroenterologie',
      definition:
        'Irreversibler Endzustand chronischer Lebererkrankungen mit Untergang von Leberzellen, bindegewebigem Umbau (Fibrose) und Knotenbildung. Folge: Leberinsuffizienz und portale Hypertension.',
      aetiologie:
        'Häufigste Ursachen in Deutschland: chronischer Alkoholkonsum und chronische Virushepatitis (B, C). Seltener: NASH, Hämochromatose, Autoimmunhepatitis, primär biliäre Cholangitis, Morbus Wilson.',
      risikofaktoren: ['Chronischer Alkoholkonsum', 'Hepatitis B/C', 'Adipositas / metabolisches Syndrom', 'Hämochromatose'],
      klinik: [
        { text: 'Müdigkeit, Leistungsknick (Adynamie), Inappetenz' },
        { text: 'Ikterus (Gelbfärbung), Juckreiz' },
        { text: 'Aszites, Beinödeme, Zunahme des Bauchumfangs' },
        { text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
        { text: 'Hämatome/Blutungsneigung (verminderte Gerinnungsfaktoren)' },
        { text: 'Hepatische Enzephalopathie: Konzentrationsstörung, Flapping tremor, Somnolenz', atypisch: true },
        { text: 'Ösophagusvarizenblutung als lebensbedrohliche Erstmanifestation', atypisch: true },
      ],
      diagnostik: [
        { text: 'Labor: γGT, AP, GOT/GPT, Bilirubin, Albumin↓, Quick↓/INR↑, Thrombozyten↓' },
        { text: 'Abdomen-Sonographie: höckerige Leberoberfläche, Splenomegalie, Aszites' },
        { text: 'Duplex-Sonographie der Pfortader (portale Hypertension)' },
        { text: 'CT/MRT-Abdomen zur Beurteilung + HCC-Ausschluss', invasiv: true },
        { text: 'ÖGD zum Nachweis von Ösophagus-/Fundusvarizen', invasiv: true },
        { text: 'Aszitespunktion (SAAG, Zellzahl — SBP-Ausschluss)', invasiv: true },
        { text: 'Ggf. Leberbiopsie zur Ätiologieklärung', invasiv: true },
      ],
      differenzialdiagnosen: [
        { dd: 'Hepatozelluläres Karzinom (HCC)', unterscheidung: 'Fokale Läsion im Bild, AFP↑; entwickelt sich oft auf Zirrhoseboden.' },
        { dd: 'Rechtsherzinsuffizienz', unterscheidung: 'Gestaute Halsvenen, kardiale Vorgeschichte; Aszites kardialer Genese.' },
        { dd: 'Peritonealkarzinose', unterscheidung: 'Bekannter Primärtumor, Aszites mit malignen Zellen.' },
        { dd: 'Nephrotisches Syndrom', unterscheidung: 'Massive Proteinurie, Hypalbuminämie renaler Genese.' },
      ],
      therapie: {
        konservativ: [
          'Absolute Alkoholabstinenz (kausal bei alkoholischer Genese)',
          'Behandlung der Grundkrankheit (antivirale Therapie bei Hepatitis)',
          'Aszites: Kochsalzrestriktion, Spironolacton + Schleifendiuretika',
          'Ösophagusvarizen: nicht-selektive Betablocker zur Prophylaxe',
          'Hepatische Enzephalopathie: Lactulose, Rifaximin, Eiweißmodulation',
        ],
        interventionell: [
          'Endoskopische Varizenligatur / Sklerosierung',
          'TIPS (transjugulärer intrahepatischer portosystemischer Shunt) bei refraktärem Aszites/Varizen',
          'Therapeutische Aszitespunktion (mit Albumingabe)',
        ],
        chirurgisch: ['Lebertransplantation (einzige kurative Option im Endstadium)'],
      },
      prognose:
        'Abhängig von Child-Pugh-/MELD-Score und Compliance (v. a. Alkoholabstinenz). Kompensiert deutlich besser als dekompensiert. Es gibt keine kausale Therapie außer Transplantation.',
      pruefungsfallen: [
        'Bei Verdacht auf Varizenblutung: NOTFALL — erst stabilisieren, OA rufen, dann Anamnese fortsetzen.',
        'Immer nach Alkohol fragen und Empathie zeigen (kein Vorwurf) — die Schauspieler reagieren oft emotional.',
        'Child-Pugh-Kriterien (Albumin, Bilirubin, Quick/INR, Aszites, Enzephalopathie) parat haben.',
        '"Es gibt keine kausale Therapie der Leberzirrhose" — außer Lebertransplantation.',
      ],
      askedInExam: [
        { frage: 'Welche Komplikationen der Leberzirrhose kennen Sie?', antwort: 'Aszites, Ösophagusvarizenblutung, hepatische Enzephalopathie, spontan bakterielle Peritonitis, hepatorenales Syndrom und hepatozelluläres Karzinom.' },
        { frage: 'Was ist eine hepatische Enzephalopathie und wie behandeln Sie sie?', antwort: 'Eine durch Ammoniak bedingte Hirnfunktionsstörung. Therapie: Lactulose und ggf. Rifaximin, plus Behandlung des Auslösers.' },
        { frage: 'Wie gehen Sie bei einer akuten Ösophagusvarizenblutung vor?', antwort: 'Kreislaufstabilisierung, endoskopische Varizenligatur, vasoaktive Medikamente (Terlipressin) und Antibiotikaprophylaxe.' },
        { frage: 'Hat sich der Patient schon einer Entwöhnungstherapie unterzogen?', antwort: 'Anamnestisch zu erfragen; entscheidend, da die absolute Alkoholabstinenz die einzige kausale Maßnahme ist.' },
        { frage: 'Was bedeutet der Child-Pugh-Score?', antwort: 'Er schätzt Leberfunktion und Prognose anhand von Bilirubin, Albumin, INR, Aszites und Enzephalopathie (Stadien A–C).' },
      ],
      klassifikation: [
        { name: 'Child-Pugh', inhalt: 'Bilirubin, Albumin, INR, Aszites, Enzephalopathie → Stadien A (5–6), B (7–9), C (10–15); schätzt Prognose und OP-Risiko.' },
        { name: 'MELD-Score', inhalt: 'Bilirubin, Kreatinin, INR → priorisiert die Dringlichkeit der Lebertransplantation.' },
      ],
      redFlags: [
        'Hämatemesis oder Meläna → Verdacht auf Ösophagusvarizenblutung',
        'zunehmende Somnolenz, Asterixis, Verwirrtheit → hepatische Enzephalopathie',
        'Fieber und Bauchschmerz bei Aszites → spontan bakterielle Peritonitis (Punktion!)',
        'Oligurie und Kreatininanstieg → hepatorenales Syndrom',
      ],
      merksatz: 'Jede dekompensierte Zirrhose mit Fieber = SBP ausschließen (diagnostische Aszitespunktion); Alkoholkarenz ist die einzige kausale Therapie.',
      linkedCaseIds: [],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: ['auf-gastroskopie', 'auf-aszitespunktion'],
    },
    {
      id: 'fw-khk',
      pathology: 'Angina pectoris / KHK',
      specialty: 'Kardiologie',
      definition:
        'Koronare Herzkrankheit (KHK): Manifestation der Atherosklerose an den Herzkranzgefäßen mit konsekutiver Myokardischämie. Leitsymptom ist die Angina pectoris (anfallsartige retrosternale Schmerzen).',
      aetiologie:
        'Atherosklerose der Koronararterien durch kardiovaskuläre Risikofaktoren; Missverhältnis zwischen Sauerstoffangebot und -bedarf des Myokards.',
      risikofaktoren: ['Arterielle Hypertonie', 'Diabetes mellitus', 'Nikotinabusus', 'Hypercholesterinämie', 'Positive Familienanamnese', 'Adipositas', 'Männliches Geschlecht / Alter'],
      klinik: [
        { text: 'Retrosternales Druck-/Engegefühl, belastungsabhängig, Besserung in Ruhe/auf Nitro' },
        { text: 'Ausstrahlung in linken Arm, Hals, Unterkiefer, Epigastrium' },
        { text: 'Dyspnoe, vegetative Begleitsymptome (Schwitzen, Übelkeit)' },
        { text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
        { text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!', atypisch: true },
        { text: 'Atypisch bei Frauen/Diabetikern: nur Dyspnoe, Oberbauchschmerz, Müdigkeit', atypisch: true },
      ],
      diagnostik: [
        { text: 'Anamnese + Risikofaktoren, körperliche Untersuchung' },
        { text: 'Ruhe-EKG (oft unauffällig bei stabiler AP)' },
        { text: 'Labor: Troponin (Ausschluss Infarkt), Lipide, HbA1c' },
        { text: 'Belastungs-EKG (Ergometrie), Stressechokardiographie' },
        { text: 'Myokardperfusionsszintigraphie, Kardio-CT/-MRT' },
        { text: 'Koronarangiographie (Goldstandard, ggf. mit Intervention)', invasiv: true },
      ],
      differenzialdiagnosen: [
        { dd: 'Akuter Myokardinfarkt / ACS', unterscheidung: 'Ruheschmerz >20 min, Troponin↑, EKG-Veränderungen.' },
        { dd: 'Lungenembolie', unterscheidung: 'Akute Dyspnoe, atemabhängiger Schmerz, D-Dimere↑, Risikofaktoren TVT.' },
        { dd: 'Aortendissektion', unterscheidung: 'Vernichtungsschmerz mit Ausstrahlung in den Rücken, RR-Differenz.' },
        { dd: 'Refluxkrankheit / Ösophagusspasmus', unterscheidung: 'Nahrungsabhängig, brennend, Besserung auf PPI.' },
        { dd: 'Costochondritis / muskuloskelettal', unterscheidung: 'Druckschmerz, bewegungs-/atemabhängig.' },
      ],
      therapie: {
        konservativ: [
          'Akut: Ruhe, Nitroglycerin, O2 bei Hypoxie',
          'Risikofaktoren-Management (Blutdruck, Diabetes, Nikotinkarenz)',
          'Medikamentös: ASS, Statin, Betablocker, ggf. Ca-Antagonist / Langzeitnitrat',
        ],
        interventionell: ['PTCA (Ballondilatation) mit Stentimplantation'],
        chirurgisch: ['Aortokoronare Bypass-Operation (ACVB) bei Mehrgefäß-/Hauptstammbefall'],
      },
      prognose: 'Gut bei konsequenter Risikofaktorenkontrolle; abhängig von Ausmaß der KHK und LV-Funktion.',
      pruefungsfallen: [
        'Instabile Angina pectoris ist ein ACS → NOTFALL, sofort EKG (innerhalb 10 min) und OA informieren.',
        'Nitroglycerin ist bei Verdacht auf Rechtsherzinfarkt / Hypotonie kontraindiziert.',
        'Bei atypischer Klinik (Frau, Diabetiker) trotzdem an KHK denken.',
      ],
      askedInExam: [
        { frage: 'Nennen Sie die kardiovaskulären Risikofaktoren.', antwort: 'Arterielle Hypertonie, Diabetes mellitus, Hypercholesterinämie, Nikotinabusus, Adipositas, positive Familienanamnese und Alter.' },
        { frage: 'Wie unterscheiden Sie stabile von instabiler Angina pectoris?', antwort: 'Stabil: belastungsabhängig, reproduzierbar, in Ruhe/mit Nitro besser. Instabil: neu, in Ruhe oder zunehmend – ein akutes Koronarsyndrom.' },
        { frage: 'Welche Diagnostik in welcher Reihenfolge?', antwort: 'Ruhe-EKG und Troponin, dann Belastungs-EKG bzw. Stressecho, und bei Bestätigung die Koronarangiographie.' },
        { frage: 'Was ist der Unterschied zwischen NSTEMI und STEMI?', antwort: 'Beide mit Troponinanstieg; der STEMI zeigt ST-Hebungen (transmurale Ischämie, sofortige PCI), der NSTEMI nicht.' },
      ],
      linkedCaseIds: [],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: ['auf-koronarangiographie'],
    },
    {
      id: 'fw-pankreatitis',
      pathology: 'Akute Pankreatitis',
      specialty: 'Gastroenterologie',
      definition:
        'Akute Entzündung der Bauchspeicheldrüse mit Selbstverdauung des Organs durch aktivierte Enzyme. Verlauf von mild (ödematös) bis schwer (nekrotisierend).',
      aetiologie: 'Häufigste Ursachen: Gallensteine (biliär) und Alkohol (~80 %). Weitere: Hypertriglyzeridämie, Hyperkalzämie, Medikamente, post-ERCP, idiopathisch.',
      risikofaktoren: ['Cholelithiasis', 'Alkoholkonsum', 'Hypertriglyzeridämie', 'Zustand nach ERCP'],
      klinik: [
        { text: 'Akuter, heftiger Oberbauchschmauch, gürtelförmig in den Rücken ausstrahlend' },
        { text: 'Übelkeit, Erbrechen' },
        { text: 'Meteorismus, "Gummibauch" (elastische Abwehrspannung)' },
        { text: 'Fieber, Tachykardie' },
        { text: 'Schwere Verläufe: Kreislaufschock, Nierenversagen (SIRS)', atypisch: true },
        { text: 'Grey-Turner-/Cullen-Zeichen bei hämorrhagischer Nekrose', atypisch: true },
      ],
      diagnostik: [
        { text: 'Labor: Lipase (>3-fach), Amylase, CRP, Kalzium, Triglyzeride, Leberwerte' },
        { text: 'Abdomen-Sonographie: Gallensteine, Pankreasödem, freie Flüssigkeit' },
        { text: 'CT-Abdomen mit KM (Nekrosenachweis, ab 72 h aussagekräftig)', invasiv: true },
        { text: 'ERCP bei biliärer Genese mit Cholestase/Cholangitis (therapeutisch)', invasiv: true },
      ],
      differenzialdiagnosen: [
        { dd: 'Perforiertes Ulkus', unterscheidung: 'Brettharter Bauch, freie Luft im Röntgen/CT.' },
        { dd: 'Akute Cholezystitis', unterscheidung: 'Rechtsseitiger Oberbauchschmerz, Murphy-Zeichen positiv.' },
        { dd: 'Myokardinfarkt (Hinterwand)', unterscheidung: 'EKG-Veränderungen, Troponin↑.' },
        { dd: 'Mesenterialischämie', unterscheidung: 'Schmerz > Befund, Laktat↑, Vorhofflimmern.' },
      ],
      therapie: {
        konservativ: [
          'Intensive Flüssigkeitssubstitution (Volumentherapie)',
          'Ausreichende Analgesie (z. B. Metamizol, Opioide)',
          'Frühe enterale Ernährung nach Toleranz',
          'Bei Alkoholgenese: Abstinenz; bei Hypertriglyzeridämie: Senkung',
        ],
        interventionell: ['ERCP mit Papillotomie bei biliärer Pankreatitis mit Obstruktion'],
        chirurgisch: ['Nekrosektomie nur bei infizierten Nekrosen (spät, wenn nötig)', 'Cholezystektomie im Verlauf bei biliärer Genese'],
      },
      prognose: 'Milde Form meist folgenlos ausheilend; schwere nekrotisierende Form mit hoher Letalität. Schweregrad-Scores: Ranson, APACHE II.',
      pruefungsfallen: [
        'Lipase ist spezifischer als Amylase — Höhe korreliert NICHT mit Schweregrad.',
        'Biliäre vs. alkoholische Genese unbedingt trennen (Therapie unterscheidet sich).',
        'Nach Gallensteinen und Alkohol gezielt fragen.',
      ],
      askedInExam: [
        { frage: 'Was sind die zwei häufigsten Ursachen der akuten Pankreatitis?', antwort: 'Gallensteine (biliär) und Alkohol.' },
        { frage: 'Welcher Laborwert ist am wichtigsten?', antwort: 'Die Lipase (mindestens dreifach über der Norm); spezifischer als die Amylase.' },
        { frage: 'Wie sieht der Schmerz typischerweise aus?', antwort: 'Heftiger Oberbauchschmerz mit gürtelförmiger Ausstrahlung in den Rücken, oft nach fettigem Essen.' },
        { frage: 'Wie behandeln Sie eine biliäre Pankreatitis?', antwort: 'Volumentherapie, Analgesie und früher Kostaufbau; bei Obstruktion ERCP mit Papillotomie und Cholezystektomie im Intervall.' },
      ],
      linkedCaseIds: [],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: ['auf-gastroskopie'],
    },
    {
      id: 'fw-gib',
      pathology: 'Obere GI-Blutung',
      specialty: 'Gastroenterologie',
      definition:
        'Blutung im Gastrointestinaltrakt oberhalb des Treitz-Bandes (Ösophagus, Magen, Duodenum). Häufigster gastroenterologischer Notfall.',
      aetiologie: 'Häufigste Ursachen: Ulcus ventriculi/duodeni, erosive Gastritis, Ösophagusvarizen (bei Zirrhose), Mallory-Weiss-Läsion, Tumoren.',
      risikofaktoren: ['NSAR/ASS-Einnahme', 'Helicobacter pylori', 'Leberzirrhose', 'Alkohol', 'Antikoagulation'],
      klinik: [
        { text: 'Hämatemesis (Bluterbrechen, hellrot oder kaffeesatzartig)' },
        { text: 'Meläna (Teerstuhl)' },
        { text: 'Bei massiver Blutung: Hämatochezie (frisches Blut anal)', atypisch: true },
        { text: 'Zeichen der Anämie/Hypovolämie: Blässe, Tachykardie, Hypotonie, Schock' },
        { text: 'Epigastrische Schmerzen (bei Ulkus)' },
      ],
      diagnostik: [
        { text: 'Kreislaufmonitoring, Labor: BB (Hb), Gerinnung, Blutgruppe + Kreuzblut' },
        { text: 'Anamnese: NSAR, Alkohol, Vorerkrankungen (Zirrhose)' },
        { text: 'Notfall-ÖGD (Diagnostik UND Therapie: Ligatur, Clip, Sklerosierung)', invasiv: true },
      ],
      differenzialdiagnosen: [
        { dd: 'Untere GI-Blutung', unterscheidung: 'Hämatochezie ohne Hämatemesis; Quelle distal des Treitz-Bandes.' },
        { dd: 'Bluthusten (Hämoptyse)', unterscheidung: 'Hellrotes, schaumiges Blut aus den Atemwegen, nicht erbrochen.' },
        { dd: 'Pseudomeläna', unterscheidung: 'Schwarzer Stuhl durch Eisen/Kohle/Heidelbeeren, kein Blut.' },
      ],
      therapie: {
        konservativ: [
          'Stabilisierung: großlumige venöse Zugänge, Volumen, ggf. Transfusion',
          'PPI hochdosiert i. v.',
          'Bei Varizen: Terlipressin + Antibiotikaprophylaxe',
          'Antikoagulation pausieren/antagonisieren',
        ],
        interventionell: ['Endoskopische Blutstillung (Ligatur, Clip, Adrenalininjektion, Sklerosierung)', 'Angiographische Embolisation bei Versagen'],
        chirurgisch: ['Notfall-OP bei endoskopisch nicht beherrschbarer Blutung'],
      },
      prognose: 'Abhängig von Ursache, Ausmaß und Komorbidität; Varizenblutung prognostisch ungünstiger. Risikoscores: Rockall, Glasgow-Blatchford.',
      pruefungsfallen: [
        'NOTFALL — erst Kreislauf stabilisieren, OA informieren, dann Anamnese fortsetzen.',
        'Immer nach NSAR/ASS und Alkohol/Leberzirrhose fragen (Ursachenlenkung).',
        'Meläna ≠ frisches Blut: Farbe des Blutes lokalisiert die Blutungsquelle.',
      ],
      askedInExam: [
        { frage: 'Was ist Meläna und was bedeutet sie?', antwort: 'Schwarzer, klebriger Teerstuhl durch verdautes Blut – Zeichen einer oberen gastrointestinalen Blutung.' },
        { frage: 'Nennen Sie die häufigsten Ursachen einer oberen GI-Blutung.', antwort: 'Ulcus ventriculi/duodeni (oft NSAR-assoziiert), Ösophagusvarizen, Mallory-Weiss-Läsion und Erosionen.' },
        { frage: 'Wie gehen Sie beim kreislaufinstabilen Patienten vor?', antwort: 'Zwei großlumige Zugänge, Volumen- und ggf. Transfusionstherapie, Kreislaufmonitoring, PPI i.v. und Notfall-ÖGD.' },
        { frage: 'Welche Rolle spielt die ÖGD?', antwort: 'Sie ist diagnostisch und therapeutisch: Lokalisation der Blutungsquelle und endoskopische Blutstillung (Clip, Adrenalin, Ligatur).' },
      ],
      linkedCaseIds: [],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: ['auf-gastroskopie'],
    },
    {
      id: 'fw-ulcus',
      pathology: 'Ulcus ventriculi / Gastritis',
      specialty: 'Gastroenterologie',
      definition: 'Umschriebener Substanzdefekt der Magen- (Ulcus ventriculi) oder Zwölffingerdarmschleimhaut (Ulcus duodeni), der die Muscularis mucosae durchbricht — im Gegensatz zur oberflächlichen Erosion bei der Gastritis. Ursache ist ein Ungleichgewicht zwischen aggressiven (Säure, Pepsin, H. pylori, NSAR) und protektiven Faktoren (Schleim, Bikarbonat, Durchblutung). Diese Fiche behandelt das Ulkus OHNE aktive Blutung; die akute obere GI-Blutung ist gesondert erfasst.',
      aetiologie: 'Zwei Hauptursachen: Infektion mit Helicobacter pylori (verantwortlich für ca. 90 % der Ulcera duodeni und ca. 70 % der Ulcera ventriculi) und Einnahme von NSAR/ASS (Hemmung der protektiven Prostaglandinsynthese). Seltener: Kortikosteroide (v. a. in Kombination mit NSAR), schwerer Stress (Stressulkus bei Intensivpatienten), Rauchen, sowie das Gastrinom (Zollinger-Ellison-Syndrom). Bei jedem Ulcus ventriculi muss zusätzlich ein Magenkarzinom ausgeschlossen werden.',
      risikofaktoren: [
        'Helicobacter-pylori-Infektion',
        'NSAR- und ASS-Einnahme (oft Selbstmedikation)',
        'Glukokortikoide (besonders kombiniert mit NSAR)',
        'Nikotinabusus',
        'Alkoholkonsum',
        'Beruflicher oder psychischer Stress',
        'Höheres Lebensalter',
        'Positive Ulkus- oder Magenkarzinomanamnese',
      ],
      klinik: [
        {
          text: 'Epigastrische, brennende oder nagende Schmerzen (Epigastralgie) als Leitsymptom',
        },
        {
          text: 'Ulcus ventriculi: Sofort- bzw. postprandialer Schmerz (kurz nach dem Essen), teils mit Essensangst und Gewichtsverlust',
        },
        {
          text: 'Ulcus duodeni: Nüchtern- und Nachtschmerz, Besserung durch Nahrungsaufnahme',
        },
        {
          text: 'Übelkeit, Völlegefühl, Aufstoßen, Appetitlosigkeit',
        },
        {
          text: 'Häufig NSAR-Einnahme oder beruflicher Stress in der Vorgeschichte (z. B. Apotheker, Schichtarbeit)',
        },
        {
          text: 'Bis zu ein Drittel der Ulzera, besonders NSAR-induzierte, verläuft klinisch stumm und manifestiert sich erst durch eine Komplikation (Blutung, Perforation)',
          atypisch: true,
        },
        {
          text: 'Erstmanifestation als Meläna oder Hämatemesis ohne vorherige Schmerzen',
          atypisch: true,
        },
        {
          text: 'Bei Hinterwandinfarkt kann sich ein kardialer Schmerz als Epigastralgie \'maskieren\' — kardiale DD nicht übersehen',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Forrest-Klassifikation',
          inhalt: 'Endoskopische Einteilung des blutenden Ulkus: Ia spritzende / Ib sickernde aktive Blutung; IIa sichtbarer Gefäßstumpf, IIb anhaftendes Koagel, IIc Hämatinbelag; III Läsion ohne Blutungszeichen. Steuert Rezidivrisiko und Therapie.',
        },
        {
          name: 'Ätiologische Einteilung (Ulkustyp)',
          inhalt: 'Peptisches Ulkus meist H.-pylori- oder NSAR-assoziiert; Stressulkus (Curling bei Verbrennung, Cushing bei Hirnprozessen); Ulkus bei Zollinger-Ellison-Syndrom (Gastrinom).',
        },
      ],
      redFlags: [
        'Akuter, heftigster Vernichtungsschmerz mit bretthartem Abdomen und Abwehrspannung → Perforation mit Peritonitis',
        'Hämatemesis (Bluterbrechen, kaffeesatzartig) oder Meläna (Teerstuhl) → obere GI-Blutung',
        'Blässe, Tachykardie, Hypotonie → hämorrhagischer Schock',
        'Rezidivierendes, schwallartiges Erbrechen mit Gewichtsverlust → narbige Magenausgangsstenose',
        'Dysphagie, ungewollter Gewichtsverlust, Anämie, Alter > 50 mit neuen Beschwerden → Malignomverdacht (Alarmsymptome)',
      ],
      diagnostik: [
        {
          text: 'Anamnese: Schmerzcharakter und Zeitbezug zum Essen, NSAR-/ASS- und Kortisoneinnahme, Selbstmedikation, Stress, Noxen, frühere Ulzera',
        },
        {
          text: 'Körperliche Untersuchung: epigastrischer Druckschmerz, Prüfung auf Abwehrspannung; digital-rektale Untersuchung auf Meläna',
        },
        {
          text: 'Labor: Blutbild (Anämie bei chronischem Blutverlust), ggf. Gerinnung; bei rezidivierenden/atypischen Ulzera Gastrin (Zollinger-Ellison)',
        },
        {
          text: 'Nicht-invasiver H.-pylori-Nachweis: 13C-Harnstoff-Atemtest oder Stuhl-Antigen-Test (Cave: PPI ≥ 2 Wochen vorher pausieren, sonst falsch negativ)',
        },
        {
          text: 'ÖGD (Ösophago-Gastro-Duodenoskopie) — Goldstandard: direkte Darstellung, Lokalisation und Biopsie des Ulkus',
          invasiv: true,
        },
        {
          text: 'Biopsie: bei jedem Ulcus ventriculi obligat zum Malignitätsausschluss; zugleich Urease-Schnelltest (CLO-Test) und Histologie auf H. pylori',
          invasiv: true,
        },
        {
          text: 'Kontroll-ÖGD des Magenulkus nach 6–8 Wochen zur Bestätigung der Abheilung und erneuter Biopsie (Karzinomausschluss)',
          invasiv: true,
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Ulcus duodeni',
          unterscheidung: 'Nüchtern- und Nachtschmerz mit Besserung durch Essen (statt postprandialem Sofortschmerz); fast nie maligne, daher keine Routine-Biopsie nötig.',
        },
        {
          dd: 'Gastritis / funktionelle Dyspepsie (Reizmagen)',
          unterscheidung: 'Nur oberflächliche Schleimhautreizung ohne Substanzdefekt in der ÖGD; bei funktioneller Dyspepsie endoskopisch unauffälliger Befund.',
        },
        {
          dd: 'Refluxkrankheit (GERD)',
          unterscheidung: 'Retrosternales Brennen (Pyrosis) und saures Aufstoßen, lageabhängig; Ösophagitis statt Ulkus.',
        },
        {
          dd: 'Magenkarzinom',
          unterscheidung: 'Alarmsymptome (Gewichtsverlust, Anämie, Dysphagie), höheres Alter; nur durch Biopsie sicher auszuschließen — Grund für die obligate Histologie beim Magenulkus.',
        },
        {
          dd: 'Cholezystolithiasis / Cholezystitis',
          unterscheidung: 'Rechtsseitige postprandiale Kolik nach fettem Essen, Ausstrahlung in die rechte Schulter, positives Murphy-Zeichen.',
        },
        {
          dd: 'Akute Pankreatitis',
          unterscheidung: 'Gürtelförmiger Oberbauchschmerz mit Ausstrahlung in den Rücken, Lipase-Erhöhung.',
        },
        {
          dd: 'Hinterwandinfarkt / KHK',
          unterscheidung: 'Belastungsabhängig, Ausstrahlung, Dyspnoe; per EKG und Troponin abzugrenzen — bei epigastrischem Schmerz stets mitbedenken.',
        },
      ],
      therapie: {
        konservativ: [
          'Protonenpumpeninhibitor (z. B. Pantoprazol 40 mg 1-0-0) über 4–8 Wochen als Basistherapie',
          'Auslösende NSAR/ASS absetzen oder pausieren; Bedarfsanalgesie auf Paracetamol umstellen',
          'Noxenkarenz: Nikotin- und Alkoholverzicht, Stressreduktion',
          'Bei H.-pylori-Nachweis Eradikation: italienische Triple-Therapie (PPI + Clarithromycin + Metronidazol) oder französische Variante (PPI + Clarithromycin + Amoxicillin) über 7–14 Tage; bei Resistenz Bismut-Quadrupeltherapie',
          'Eradikationskontrolle nach frühestens 4 Wochen (13C-Atemtest oder Stuhl-Antigen)',
          'Bei fortgesetzter NSAR-Notwendigkeit begleitende PPI-Prophylaxe',
        ],
        interventionell: [
          'Endoskopische Blutstillung bei blutendem Ulkus (Adrenalininjektion, Clip, Thermokoagulation) nach Forrest-Stadium',
          'Endoskopische Ballondilatation bei narbiger Magenausgangsstenose',
        ],
        chirurgisch: [
          'Notfalloperation bei Perforation: Übernähung/Exzision und Lavage',
          'Operation bei endoskopisch nicht beherrschbarer Blutung oder therapierefraktärer Stenose',
          'Resektion (z. B. Billroth) bei malignem Befund oder Komplikationen',
        ],
      },
      prognose: 'Unter PPI-Therapie und erfolgreicher H.-pylori-Eradikation heilen die meisten Ulzera ab, und die Rezidivrate sinkt drastisch (von über 50 % auf unter 10 % pro Jahr). Entscheidend sind das Weglassen von NSAR und die Noxenkarenz. Prognosebestimmend sind Komplikationen (Blutung, Perforation, Stenose) und beim Ulcus ventriculi der Ausschluss eines Karzinoms.',
      pruefungsfallen: [
        'Jedes Ulcus ventriculi wird biopsiert UND nach 6–8 Wochen endoskopisch kontrolliert (Malignitätsausschluss) — das Ulcus duodeni dagegen nicht.',
        'Vor dem H.-pylori-Test (Atemtest/Stuhl/Schnelltest) muss der PPI ca. 2 Wochen pausiert werden, sonst falsch-negatives Ergebnis.',
        'Aktiv nach NSAR/ASS und Selbstmedikation fragen — Patienten nennen \'Schmerzmittel\' oft nicht spontan als Medikament.',
        'Schmerzrhythmus zur Unterscheidung nutzen: postprandialer Sofortschmerz spricht für Ulcus ventriculi, Nüchtern-/Nachtschmerz für Ulcus duodeni.',
        'Alarmsymptome und Komplikationen (Perforation, Blutung, Stenose) nicht übersehen und den kardialen DD (Hinterwandinfarkt) mitbedenken.',
      ],
      askedInExam: [
        {
          frage: 'Was ist der C13-Atemtest und wozu dient er?',
          antwort: 'Ein nicht-invasiver Test zum Nachweis von Helicobacter pylori: Der Patient trinkt mit 13C markierten Harnstoff, den die bakterielle Urease spaltet; das markierte CO2 wird in der Ausatemluft gemessen. Der PPI muss vorher pausiert werden.',
        },
        {
          frage: 'Wie behandeln Sie ein Ulcus ventriculi?',
          antwort: 'Mit einem PPI über mehrere Wochen, Absetzen der NSAR und Noxenkarenz. Bei Nachweis von H. pylori zusätzlich eine Eradikation mittels Triple-Therapie aus PPI und zwei Antibiotika.',
        },
        {
          frage: 'Was ist die Triple-Therapie?',
          antwort: 'Die H.-pylori-Eradikation mit einem PPI plus zwei Antibiotika — Clarithromycin kombiniert mit Amoxicillin oder Metronidazol — über 7 bis 14 Tage.',
        },
        {
          frage: 'Welche Prädispositionsfaktoren für ein Ulkus hat der Patient?',
          antwort: 'Typischerweise regelmäßige NSAR-Einnahme, eine H.-pylori-Infektion, Rauchen, Alkohol und beruflicher Stress.',
        },
        {
          frage: 'Wie unterscheiden Sie ein Ulcus ventriculi von einem Ulcus duodeni?',
          antwort: 'Über den Schmerzrhythmus: Das Magenulkus verursacht Sofortschmerz kurz nach dem Essen, das Duodenalulkus dagegen Nüchtern- und Nachtschmerz, der sich durch Essen bessert.',
        },
        {
          frage: 'Warum führen Sie eine ÖGD durch und warum eine Biopsie?',
          antwort: 'Die ÖGD ist der Goldstandard zur direkten Darstellung des Ulkus. Beim Magenulkus wird biopsiert, um ein Magenkarzinom auszuschließen und H. pylori nachzuweisen.',
        },
        {
          frage: 'Was erwarten Sie im Blutbild und wie weisen Sie eine Blutung nach?',
          antwort: 'Bei chronischem Blutverlust eine Anämie mit erniedrigtem Hämoglobin. Eine okkulte Blutung weist man über den Haemoccult-Test im Stuhl nach.',
        },
      ],
      merksatz: 'Merke: Jedes Ulcus ventriculi muss bioptisch gesichert und nach 6–8 Wochen endoskopisch kontrolliert werden (Karzinomausschluss) — Basistherapie ist PPI plus H.-pylori-Eradikation und das Absetzen der NSAR.',
      linkedCaseIds: [
        'case-ulcus',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-gastroskopie',
      ],
    },
    {
      id: 'fw-magenkarzinom',
      pathology: 'Magenkarzinom',
      specialty: 'Gastroenterologie',
      definition: 'Maligne Neoplasie der Magenschleimhaut, in über 90 % der Fälle ein vom Drüsenepithel ausgehendes Adenokarzinom. Nach Laurén werden ein intestinaler Typ (drüsig, umschrieben, bessere Prognose) und ein diffuser Typ (infiltrativ wachsend, oft als Linitis plastica, ungünstigere Prognose) unterschieden. Häufig lange asymptomatisch, weshalb die Diagnose oft erst im fortgeschrittenen Stadium gestellt wird.',
      aetiologie: 'Meist Folge einer chronischen Schädigung der Magenschleimhaut. Zentral ist die Correa-Kaskade: chronische Helicobacter-pylori-Infektion → chronisch-atrophische Gastritis → intestinale Metaplasie → Dysplasie → Karzinom. Weitere Auslöser sind die Epstein-Barr-Virus-Infektion sowie genetische Formen (hereditäres diffuses Magenkarzinom bei CDH1-Mutation).',
      risikofaktoren: [
        'Chronische Helicobacter-pylori-Infektion (wichtigster Risikofaktor)',
        'Chronisch-atrophische Gastritis und intestinale Metaplasie',
        'Nikotinabusus',
        'Ernährung reich an Nitrosaminen, Salz und geräucherten Speisen; nitratreiche Kost',
        'Alkoholkonsum',
        'Positive Familienanamnese (z. B. Vater an Magenkarzinom verstorben)',
        'Zustand nach Magenteilresektion (Magenstumpfkarzinom)',
        'Perniziöse Anämie / Typ-A-Gastritis, Morbus Ménétrier',
        'Adipositas, Blutgruppe A',
      ],
      klinik: [
        {
          text: 'Epigastrisches Druck- und Völlegefühl, uncharakteristische Oberbauchbeschwerden',
        },
        {
          text: 'Ungewollter Gewichtsverlust und Inappetenz',
        },
        {
          text: 'B-Symptomatik: Nachtschweiß, subfebrile Temperaturen, Leistungsknick (Fatigue)',
        },
        {
          text: 'Übelkeit, frühes Sättigungsgefühl, gelegentlich Erbrechen',
        },
        {
          text: 'Dysphagie bei kardianahem Sitz, Magenausgangsstenose bei antralem Sitz',
        },
        {
          text: 'Neu aufgetretene Abneigung gegen Fleisch und Wurst — klassisches Warnzeichen',
          atypisch: true,
        },
        {
          text: 'Lange asymptomatisch bzw. nur uncharakteristische Dyspepsie — verzögert die Diagnose',
          atypisch: true,
        },
        {
          text: 'Meläna / okkulte Blutung mit sekundärer Eisenmangelanämie (Müdigkeit, Blässe)',
          atypisch: true,
        },
        {
          text: 'Erstmanifestation über Metastasen: Virchow-Lymphknoten (linkssupraklavikulär), Krukenberg-Tumor (Ovar), Lebermetastasen, Aszites bei Peritonealkarzinose',
          atypisch: true,
        },
        {
          text: 'Paraneoplastisch: Acanthosis nigricans, Thrombophlebitis migrans (selten)',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'TNM / UICC-Stadien',
          inhalt: 'T = Tiefe der Wandinfiltration (T1 Mukosa/Submukosa bis T4 Serosadurchbruch/Nachbarorgane), N = Zahl befallener regionärer Lymphknoten, M = Fernmetastasen. Bestimmt Stadium (I–IV) und Therapie (endoskopisch, kurativ-chirurgisch, palliativ).',
        },
        {
          name: 'Laurén-Klassifikation',
          inhalt: 'Intestinaler Typ (drüsig, umschrieben, ältere Patienten, bessere Prognose) vs. diffuser Typ (infiltrativ, siegelringzellig, Linitis plastica, jüngere Patienten, schlechtere Prognose).',
        },
        {
          name: 'Siewert-Klassifikation (AEG)',
          inhalt: 'Adenokarzinome des ösophagogastralen Übergangs: Typ I (distaler Ösophagus), Typ II (Kardia), Typ III (subkardial) — steuert das operative Vorgehen.',
        },
        {
          name: 'Borrmann-Klassifikation',
          inhalt: 'Makroskopische Wachstumsform fortgeschrittener Karzinome: I polypös, II ulzerierend begrenzt, III ulzerierend infiltrierend, IV diffus infiltrierend (Linitis plastica).',
        },
      ],
      redFlags: [
        'Neu aufgetretene Dysphagie oder Magenausgangsstenose (Erbrechen unverdauter Speisen)',
        'Obere GI-Blutung: Hämatemesis oder Meläna → notfallmäßige Abklärung',
        'Tastbare epigastrische Resistenz oder derber, vergrößerter Virchow-Lymphknoten links supraklavikulär',
        'Rasch progredienter, ungewollter Gewichtsverlust mit B-Symptomatik',
        'Neue Dyspepsie mit Alarmsymptomen ab dem 45. Lebensjahr → zeitnahe ÖGD zwingend',
        'Symptomatische Anämie bei okkultem Blutverlust (Belastungsdyspnoe, Blässe)',
      ],
      diagnostik: [
        {
          text: 'Anamnese und körperliche Untersuchung: Abdomenpalpation (Resistenz), Lymphknotenstatus (Virchow-Lymphknoten links supraklavikulär), digital-rektale Untersuchung',
        },
        {
          text: 'Labor: Blutbild (Anämie), Eisen und Ferritin, Entzündungsparameter, Leberwerte; Tumormarker CA 72-4, CEA und CA 19-9 nur zur Verlaufs- und Therapiekontrolle, nicht zur Diagnosestellung',
        },
        {
          text: 'Test auf okkultes Blut im Stuhl',
        },
        {
          text: 'Abdomen-Sonographie: Lebermetastasen, Aszites, Lymphadenopathie',
        },
        {
          text: 'Ösophago-Gastro-Duodenoskopie (ÖGD) mit Biopsie — Goldstandard zur Diagnosesicherung durch Histologie',
          invasiv: true,
        },
        {
          text: 'Endosonographie zur Beurteilung der Wandinfiltrationstiefe (T) und der regionären Lymphknoten (N)',
          invasiv: true,
        },
        {
          text: 'CT von Thorax und Abdomen mit Kontrastmittel zum Staging (Fernmetastasen, insbesondere pulmonal und hepatisch)',
          invasiv: true,
        },
        {
          text: 'Diagnostische Laparoskopie zum Ausschluss einer Peritonealkarzinose bei lokal fortgeschrittenem Befund',
          invasiv: true,
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Ulcus ventriculi',
          unterscheidung: 'Nahrungsabhängiger epigastrischer Schmerz, Besserung auf PPI; benigne, aber jedes Magenulkus muss biopsiert und endoskopisch bis zur Abheilung kontrolliert werden.',
        },
        {
          dd: 'Ösophaguskarzinom',
          unterscheidung: 'Dysphagie steht im Vordergrund, Sitz im Ösophagus; Abgrenzung durch ÖGD und Biopsie.',
        },
        {
          dd: 'Pankreaskarzinom',
          unterscheidung: 'Gürtelförmiger Rückenschmerz, schmerzloser Ikterus, CA 19-9 deutlich erhöht; Nachweis im CT/MRT.',
        },
        {
          dd: 'Gallenwegs- bzw. Gallenblasenkarzinom',
          unterscheidung: 'Cholestase mit Ikterus, rechtsseitiger Oberbauchschmerz; Bildgebung der Gallenwege.',
        },
        {
          dd: 'Refluxkrankheit (GERD)',
          unterscheidung: 'Retrosternales Brennen, saures Aufstoßen, gutes Ansprechen auf PPI, keine Alarmsymptome.',
        },
        {
          dd: 'Funktionelle Dyspepsie (Reizmagen)',
          unterscheidung: 'Ausschlussdiagnose; keine Alarmsymptome, unauffällige ÖGD, kein Gewichtsverlust.',
        },
        {
          dd: 'MALT-Lymphom des Magens',
          unterscheidung: 'H.-pylori-assoziiert; histologische Sicherung, oft Rückbildung nach Eradikationstherapie.',
        },
        {
          dd: 'Myokardinfarkt (Hinterwand)',
          unterscheidung: 'Epigastrische Schmerzen können kardial bedingt sein; Ausschluss durch EKG und Troponin.',
        },
      ],
      therapie: {
        konservativ: [
          'Perioperative (neoadjuvante und adjuvante) Chemotherapie nach dem FLOT-Schema bei lokal fortgeschrittenem, resektablem Karzinom',
          'Palliative Chemotherapie bei metastasiertem Stadium; bei HER2-Überexpression zusätzlich Trastuzumab',
          'Helicobacter-pylori-Eradikation (Triple-Therapie) — kurativ beim frühen MALT-Lymphom, kausal bei Risikoschleimhaut',
          'Ernährungstherapie / Ernährungsberatung, Substitution (Eisen, Vitamin B12 nach Gastrektomie)',
          'Psychoonkologische Begleitung und Schmerz-/Palliativtherapie',
        ],
        interventionell: [
          'Endoskopische Mukosaresektion (EMR) bzw. Submukosadissektion (ESD) beim mukosalen Frühkarzinom (gut differenziert, ohne Lymphgefäßinvasion)',
          'Endoskopische Stentimplantation bei stenosierendem Tumor zur Sicherung der Passage',
          'Endoskopische Blutstillung bei tumorbedingter Blutung',
        ],
        chirurgisch: [
          'Subtotale Gastrektomie bei distalem Sitz bzw. totale Gastrektomie bei proximalem/diffusem Befall, jeweils mit D2-Lymphadenektomie — kurativer Ansatz',
          'Bei ösophagogastralem Übergang (AEG) erweiterte transhiatale bzw. abdominothorakale Resektion',
          'Palliative Verfahren (Gastroenterostomie/Bypass) bei nicht resektabler Stenose',
        ],
      },
      prognose: 'Stark stadienabhängig. Das auf die Mukosa begrenzte Frühkarzinom hat nach endoskopischer/chirurgischer Resektion eine sehr gute Prognose. Da in Deutschland viele Karzinome erst spät (mit Lymphknoten- oder Fernmetastasen) diagnostiziert werden, liegt die 5-Jahres-Überlebensrate insgesamt bei etwa 30 %. Der diffuse Typ nach Laurén ist prognostisch ungünstiger als der intestinale Typ.',
      pruefungsfallen: [
        'Direkte Patientenfrage "Habe ich Krebs?" oder "Muss ich sterben?" empathisch UND neutral beantworten: den Verdacht nicht bagatellisieren, aber keine Diagnose ohne Magenspiegelung und Gewebeprobe stellen — "Der Verdacht steht im Raum, wir klären ihn mit einer Magenspiegelung ab."',
        'Nicht zu früh beruhigen: Floskeln wie "Sie sind bei uns in guten Händen" oder "machen Sie sich keine Sorgen" werden vom Oberarzt kritisiert, wenn tatsächlich ein Tumorverdacht besteht.',
        'Tumormarker (CA 72-4, CEA, CA 19-9) NICHT als Diagnosemittel nennen — die Diagnose stellt allein die ÖGD mit Biopsie; Marker dienen der Verlaufskontrolle.',
        'Die neu aufgetretene Abneigung gegen Fleisch aktiv erfragen und dokumentieren — sie ist ein typisches, gern geprüftes Zeichen.',
        'Die Todesursache des Vaters (Magenkarzinom) in der Familienanamnese vollständig dokumentieren — wird häufig nachgefragt.',
        'Bei belasteter Familienanamnese (Vater im gleichen Alter verstorben) Empathie zeigen und die Angst des Patienten aufgreifen.',
        'Den Gewichtsverlust nicht dem vorbekannten Diabetes zuschreiben — er ist tumorbedingt (konsumierende Erkrankung).',
      ],
      askedInExam: [
        {
          frage: 'Welche Tumormarker bestimmen Sie beim Magenkarzinom?',
          antwort: 'CA 72-4 ist am spezifischsten, ergänzt durch CEA und CA 19-9. Sie dienen nicht der Diagnose, sondern der Verlaufs- und Therapiekontrolle.',
        },
        {
          frage: 'Was bedeutet CA 19-9?',
          antwort: 'Ein Tumormarker vor allem für Pankreas- und Gallenwegskarzinome; beim Magenkarzinom unspezifisch, nützlich zur Differenzialdiagnose und Verlaufskontrolle.',
        },
        {
          frage: 'Warum veranlassen Sie ein Röntgen bzw. CT des Thorax?',
          antwort: 'Zum Nachweis oder Ausschluss pulmonaler Metastasen und zum präoperativen Staging.',
        },
        {
          frage: 'Erklären Sie die ÖGD.',
          antwort: 'Die Ösophago-Gastro-Duodenoskopie ist eine endoskopische Untersuchung von Speiseröhre, Magen und Zwölffingerdarm mit einem flexiblen Schlauch; sie erlaubt die Inspektion der Schleimhaut und die Entnahme von Gewebeproben.',
        },
        {
          frage: 'Der Patient hat einen Diabetes, ist aber untergewichtig — ist das wirklich ein Typ II?',
          antwort: 'Der Diabetes Typ II war vorbekannt und mit Metformin eingestellt; der aktuelle Gewichtsverlust ist am ehesten tumorbedingt, also Ausdruck der konsumierenden Erkrankung, nicht des Diabetes.',
        },
        {
          frage: 'Er raucht viel — könnte es auch ein Bronchialkarzinom sein?',
          antwort: 'Das Rauchen ist ein Risikofaktor, ein Bronchialkarzinom ist möglich. Die Symptomkonstellation aus epigastrischem Druck, Fleischabneigung und Meläna spricht jedoch eher für ein Magenkarzinom; ein CT-Thorax klärt beides mit ab.',
        },
        {
          frage: 'Was antworten Sie, wenn der Patient direkt fragt, ob er Krebs hat oder sterben muss?',
          antwort: 'Empathisch und neutral: dass der Verdacht auf eine bösartige Erkrankung besteht, dieser aber erst durch die Magenspiegelung mit Gewebeprobe gesichert werden kann, und dass wir ihn in jedem Fall begleiten.',
        },
        {
          frage: 'Welche Differenzialdiagnosen kommen in Betracht?',
          antwort: 'Vor allem Ulcus ventriculi und Ösophaguskarzinom, außerdem Pankreas- und Gallenwegskarzinom sowie eine Refluxkrankheit; bei epigastrischem Schmerz differenzialdiagnostisch auch ein Myokardinfarkt.',
        },
        {
          frage: 'Sollen wir den Patienten stationär aufnehmen?',
          antwort: 'Bei Alarmsymptomen wie GI-Blutung, relevanter Anämie oder drohender Stenose ja; ansonsten ist eine zügige endoskopische Abklärung mittels ÖGD das Wichtigste.',
        },
        {
          frage: 'Was ist neben der Diagnostik und Therapie noch wichtig?',
          antwort: 'Die psychoonkologische bzw. psychologische Unterstützung des Patienten, eine einfühlsame Aufklärung sowie eine begleitende Ernährungsberatung.',
        },
      ],
      merksatz: 'Merke: Jede neu aufgetretene Dyspepsie mit Alarmsymptomen — Gewichtsverlust, Dysphagie, Anämie/Meläna, Fleischabneigung — ab dem 45. Lebensjahr gehört zur ÖGD mit Biopsie; sie ist der Goldstandard zur Sicherung des Magenkarzinoms.',
      linkedCaseIds: [
        'case-magenkarzinom',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-gastroskopie',
      ],
    },
    {
      id: 'fw-appendizitis',
      pathology: 'Appendizitis',
      specialty: 'Chirurgie',
      definition: 'Akute Entzündung der Appendix vermiformis (Wurmfortsatz des Zäkums). Häufigster abdomineller Notfall und häufigste Ursache des akuten Abdomens; eine unbehandelte Entzündung kann in Perforation, Peritonitis und Sepsis übergehen und stellt damit eine dringliche OP-Indikation dar.',
      aetiologie: 'Meist Verlegung (Obstruktion) des Appendixlumens mit nachfolgendem bakteriellem Aufstau: durch einen Kotstein (Fäkolith), lymphatische Hyperplasie (v. a. nach Infekten bei Kindern/Jugendlichen), seltener durch Fremdkörper, Narbenstränge (Abknickung) oder einen Tumor. Der Sekretstau und der intraluminale Druckanstieg führen zu Wandischämie und bakterieller Durchwanderung.',
      risikofaktoren: [
        'Alter zwischen 10 und 30 Jahren (Häufigkeitsgipfel), grundsätzlich aber in jedem Alter möglich',
        'Ballaststoffarme, faserarme Ernährung',
        'Positive Familienanamnese',
        'Vorausgegangene gastrointestinale Infekte (reaktive Lymphhyperplasie)',
      ],
      klinik: [
        {
          text: 'Zunächst diffuser, viszeraler periumbilikaler/epigastrischer Schmerz, der innerhalb von Stunden in den rechten Unterbauch wandert und dort lokalisiert und stärker wird (typischer Schmerzwechsel)',
        },
        {
          text: 'Druckschmerz über dem McBurney-Punkt (Mitte zwischen Nabel und rechter Spina iliaca anterior superior) und Lanz-Punkt',
        },
        {
          text: 'Loslassschmerz (Blumberg-Zeichen), Abwehrspannung, kontralateraler Loslassschmerz',
        },
        {
          text: 'Appetitlosigkeit (Inappetenz), Übelkeit, ggf. einmaliges Erbrechen',
        },
        {
          text: 'Subfebrile bis mäßige Temperaturerhöhung; rektoaxilläre Temperaturdifferenz > 1 °C',
        },
        {
          text: 'Schonhaltung: angezogenes rechtes Bein, Schmerzverstärkung beim Auftreten/Hüpfen und im Flachliegen',
        },
        {
          text: 'Retrozäkale Lage: Schmerzen mehr in die Flanke, positives Psoas-Zeichen, wenig abdominelle Abwehrspannung',
          atypisch: true,
        },
        {
          text: 'Pelvine/retroiliakale Lage: Schmerz tief im Becken, Dysurie, Durchfall, Schmerz bei rektaler Untersuchung (Douglas-Schmerz)',
          atypisch: true,
        },
        {
          text: 'Schwangerschaft: Schmerzpunkt nach kranial verlagert (verdrängtes Zäkum) – erschwerte Diagnose',
          atypisch: true,
        },
        {
          text: 'Kleinkinder und alte Patienten: oligosymptomatisch, rasche Perforation, hohes Übersehungsrisiko',
          atypisch: true,
        },
        {
          text: 'Plötzliche Schmerzlinderung gefolgt von diffusem Bauchschmerz und Zustandsverschlechterung: Warnsignal der Perforation!',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Appendizitiszeichen (klinische Prüfzeichen)',
          inhalt: 'McBurney-Punkt (Druckschmerz), Lanz-Punkt; Blumberg-Zeichen (kontralateraler Loslassschmerz); Rovsing-Zeichen (Schmerz rechts beim retrograden Ausstreichen des Kolons); Psoas-Zeichen (Schmerz bei Anheben/Streckung des rechten Beins gegen Widerstand – retrozäkale Lage); Obturator-Zeichen (Schmerz bei Innenrotation der gebeugten Hüfte – pelvine Lage); Douglas-Schmerz (Druckschmerz bei rektaler Untersuchung).',
        },
        {
          name: 'Alvarado-Score (MANTRELS)',
          inhalt: 'Punktwertschätzung der Wahrscheinlichkeit: Migration des Schmerzes, Anorexie, Nausea/Erbrechen, Druckschmerz im rechten Unterbauch, Loslassschmerz (Rebound), erhöhte Temperatur, Leukozytose, Linksverschiebung. Höhere Werte machen eine Appendizitis wahrscheinlich und stützen die OP-Indikation.',
        },
      ],
      redFlags: [
        'Plötzliches Nachlassen des Schmerzes, dann diffuser Bauchschmerz und brettharte Abwehrspannung → Perforation mit Peritonitis',
        'Hohes Fieber, Tachykardie, Hypotonie, Kaltschweißigkeit → beginnende Sepsis',
        'Diffuse Abwehrspannung des gesamten Abdomens (akutes Abdomen) → sofortige chirurgische Vorstellung',
        'Zunehmende Zustandsverschlechterung bei Kindern oder alten Patienten (rasche Perforation, wenig Symptome)',
      ],
      diagnostik: [
        {
          text: 'Anamnese und körperliche Untersuchung mit Appendizitiszeichen (McBurney, Blumberg, Rovsing, Psoas); rektale digitale Untersuchung (Douglas-Schmerz)',
        },
        {
          text: 'Vitalparameter und rektoaxilläre Temperaturmessung (Differenz > 1 °C spricht für einen entzündlichen Prozess)',
        },
        {
          text: 'Labor: Blutbild (Leukozytose mit Linksverschiebung), CRP-Erhöhung, ggf. BSG',
        },
        {
          text: 'Urinstatus zum Ausschluss eines Harnwegsinfekts / einer Urolithiasis (Differenzialdiagnose)',
        },
        {
          text: 'Schwangerschaftstest (β-hCG) bei jeder Frau im gebärfähigen Alter (Ausschluss Extrauteringravidität)',
        },
        {
          text: 'Abdomen-Sonographie: aufgetriebene, nicht komprimierbare Appendix > 6 mm, Kokardenphänomen (Zielscheibe), freie Flüssigkeit, ggf. Kotstein',
        },
        {
          text: 'CT-Abdomen bei unklarem Sonographiebefund, adipösen oder älteren Patienten (höhere Sensitivität)',
        },
        {
          text: 'Diagnostische Laparoskopie bei weiterhin unklarem Befund – zugleich therapeutisch (Appendektomie in gleicher Sitzung)',
          invasiv: true,
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Divertikulitis',
          unterscheidung: 'Meist linker Unterbauch (Sigma); bei rechtsseitiger Zäkumdivertikulitis klinisch kaum abgrenzbar – Klärung durch Sonographie/CT.',
        },
        {
          dd: 'Gynäkologische Ursachen (Adnexitis, Ovarialtorsion, Extrauteringravidität, rupturierte Ovarialzyste)',
          unterscheidung: 'Bei Frauen im gebärfähigen Alter obligat; Zyklusanamnese, β-hCG, vaginale Sonographie, gynäkologisches Konsil.',
        },
        {
          dd: 'Urolithiasis / Ureterkolik',
          unterscheidung: 'Kolikartiger, wellenförmiger Flankenschmerz mit Ausstrahlung in die Leiste, Hämaturie im Urinstatus, bewegungsunruhiger Patient.',
        },
        {
          dd: 'Akute Gastroenteritis / mesenteriale Lymphadenitis',
          unterscheidung: 'Diffuse Bauchschmerzen mit ausgeprägtem Durchfall/Erbrechen, oft nach Infekt; kein lokalisierter McBurney-Punktschmerz.',
        },
        {
          dd: 'Morbus Crohn (terminale Ileitis)',
          unterscheidung: 'Chronisch-rezidivierende Beschwerden, Diarrhö, Gewichtsverlust; typische Wandveränderungen im terminalen Ileum in der Bildgebung.',
        },
        {
          dd: 'Cholezystitis',
          unterscheidung: 'Rechter Oberbauch, positives Murphy-Zeichen, Steinnachweis in der Sonographie.',
        },
        {
          dd: 'Meckel-Divertikulitis',
          unterscheidung: 'Klinisch identisches Bild; wird häufig erst intraoperativ diagnostiziert.',
        },
      ],
      therapie: {
        konservativ: [
          'Nahrungskarenz, intravenöse Flüssigkeitssubstitution und Analgesie zur OP-Vorbereitung',
          'Perioperative kalkulierte Antibiotikaprophylaxe (z. B. Cephalosporin + Metronidazol)',
          'Rein antibiotisch-konservatives Vorgehen nur in ausgewählten Fällen unkomplizierter Appendizitis oder bei OP-Kontraindikation (erhöhtes Rezidivrisiko)',
        ],
        interventionell: [
          'Ultraschall-/CT-gesteuerte Drainage eines perityphlitischen Abszesses mit anschließender Intervall-Appendektomie',
        ],
        chirurgisch: [
          'Laparoskopische Appendektomie (\'Schlüsselloch-Operation\') als Goldstandard – Standardverfahren bei unkomplizierter Appendizitis',
          'Offene (konventionelle) Appendektomie über Wechselschnitt bei Perforation, ausgedehnter Peritonitis oder Verwachsungen',
          'Bei Perforation zusätzlich intraabdominelle Lavage und postoperative therapeutische Antibiose',
        ],
      },
      prognose: 'Bei rechtzeitiger Operation sehr gut mit niedriger Letalität und rascher Genesung. Prognose verschlechtert sich deutlich bei Perforation und Peritonitis (höhere Morbidität, Abszess-, Ileus- und Sepsisrisiko). Verzögerte Diagnose bei Kindern, Schwangeren und alten Patienten ist der Hauptrisikofaktor für Komplikationen.',
      pruefungsfallen: [
        'Den typischen Schmerzwechsel aktiv erfragen: erst periumbilikal/diffus, dann Wanderung in den rechten Unterbauch – das ist der klassische Hinweis, den die Prüfer hören wollen.',
        'Bei jeder Frau im gebärfähigen Alter an Extrauteringravidität und Adnexerkrankungen denken und β-hCG nennen (häufige Rückfrage: \'Und wenn es eine Frau wäre?\').',
        'Normale Entzündungsparameter schließen eine Appendizitis nicht aus – bei lokalisierter Frühentzündung können Leukozyten und CRP noch normal sein.',
        'Urinstatus nicht vergessen: dient dem Ausschluss von Harnwegsinfekt und Urolithiasis, nicht der Bestätigung der Appendizitis.',
        'Appendizitiszeichen (McBurney, Blumberg, Rovsing, Psoas) und den McBurney-Punkt exakt lokalisieren können – wird regelmäßig gefragt.',
        'Bei der Aufklärung den laienverständlichen Begriff \'Blinddarmentzündung\' und \'Schlüsselloch-Operation\' verwenden.',
        'Die plötzliche Schmerzlinderung als Perforationszeichen (nicht als Besserung!) erkennen und benennen.',
      ],
      askedInExam: [
        {
          frage: 'Welche Verdachtsdiagnose haben Sie und warum?',
          antwort: 'Eine akute Appendizitis: wegen des zunächst periumbilikalen, dann in den rechten Unterbauch gewanderten Schmerzes mit Druckschmerz über dem McBurney-Punkt, Loslassschmerz, Appetitlosigkeit, Übelkeit und subfebriler Temperatur.',
        },
        {
          frage: 'Welche Differenzialdiagnosen kommen in Betracht – und was, wenn es eine Frau wäre?',
          antwort: 'Divertikulitis, Urolithiasis, Gastroenteritis und Morbus Crohn. Bei einer Frau zusätzlich Adnexitis, Ovarialtorsion und vor allem eine Extrauteringravidität, die ich mit β-hCG und gynäkologischer Untersuchung ausschließe.',
        },
        {
          frage: 'Wie gehen Sie vor, um Ihren Verdacht zu bestätigen?',
          antwort: 'Körperliche Untersuchung mit Appendizitiszeichen und rektaler Untersuchung, Labor mit Blutbild und CRP, Urinstatus, bei Frauen β-hCG, anschließend eine Abdomen-Sonographie und bei unklarem Befund ein CT.',
        },
        {
          frage: 'Welche Laborwerte möchten Sie anfordern, und welche Informationen liefert ein Blutbild?',
          antwort: 'Blutbild und CRP, gegebenenfalls die BSG. Das Blutbild gibt unter anderem die Zahl der Leukozyten, Erythrozyten und Thrombozyten an; bei Appendizitis erwarte ich eine Leukozytose mit Linksverschiebung.',
        },
        {
          frage: 'Würden Sie den Urin untersuchen? Warum?',
          antwort: 'Ja, um einen Harnwegsinfekt oder eine Urolithiasis als Differenzialdiagnose auszuschließen, die ähnliche Unterbauchschmerzen verursachen können.',
        },
        {
          frage: 'Falls die Entzündungsparameter nicht erhöht sind – was könnte der Grund sein?',
          antwort: 'Eine noch lokal begrenzte Frühentzündung: Leukozyten und CRP können anfangs normal sein und schließen eine Appendizitis daher nicht aus.',
        },
        {
          frage: 'Was können Sie in der Sonographie sehen?',
          antwort: 'Eine aufgetriebene, nicht komprimierbare Appendix über 6 mm Durchmesser mit Kokardenphänomen, gegebenenfalls einen Kotstein, freie Flüssigkeit oder einen Abszess.',
        },
        {
          frage: 'Welche Therapie schlagen Sie vor?',
          antwort: 'Die operative Entfernung, in der Regel als laparoskopische Appendektomie, unter perioperativer Antibiotikaprophylaxe; bei Perforation offene Operation mit Lavage und therapeutischer Antibiose.',
        },
        {
          frage: 'Welche Appendizitiszeichen kennen Sie, zum Beispiel das Psoas-Zeichen?',
          antwort: 'McBurney- und Lanz-Punkt, Blumberg-Zeichen (kontralateraler Loslassschmerz), Rovsing-Zeichen und das Psoas-Zeichen: Schmerz im rechten Unterbauch beim Anheben oder Strecken des rechten Beins gegen Widerstand, typisch für eine retrozäkale Lage.',
        },
        {
          frage: 'Wie kann man Fieber messen und welcher Unterschied ist relevant?',
          antwort: 'Axillär, oral oder rektal; rektal ist am genauesten. Eine rektoaxilläre Temperaturdifferenz von mehr als 1 °C spricht für einen entzündlichen intraabdominellen Prozess wie die Appendizitis.',
        },
        {
          frage: 'Wie können Sie eine Divertikulitis ausschließen?',
          antwort: 'Durch die Bildgebung – Sonographie und gegebenenfalls CT –, die die entzündeten Darmwandabschnitte lokalisiert; die Divertikulitis betrifft meist das linksseitige Sigma.',
        },
      ],
      merksatz: 'Merke: Wandernder Schmerz von periumbilikal in den rechten Unterbauch mit McBurney-Druckschmerz und Loslassschmerz = Appendizitis bis zum Beweis des Gegenteils – bei Frauen immer β-hCG, und die plötzliche Schmerzlinderung ist keine Besserung, sondern das Perforationszeichen.',
      linkedCaseIds: [
        'case-appendizitis',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-appendektomie',
      ],
    },
    {
      id: 'fw-depression',
      pathology: 'Depression (depressive Episode)',
      specialty: 'Psychiatrie',
      definition: 'Affektive Störung mit einer über mindestens zwei Wochen anhaltenden Symptomkonstellation aus gedrückter Stimmung, Verlust von Interesse und Freude (Anhedonie) sowie verminderter Antriebs- und Energie. Diagnostisch führend nach ICD-10 (F32) sind diese drei Hauptsymptome, ergänzt durch Zusatzsymptome (u. a. Konzentrationsstörung, vermindertes Selbstwertgefühl, Schuldgefühle, negative Zukunftsperspektive, Schlafstörung, Appetitminderung, Suizidgedanken). Man unterscheidet die unipolare depressive Episode von der bipolaren Störung sowie primäre von sekundären (organisch oder substanzinduziert bedingten) Formen.',
      aetiologie: 'Multifaktoriell im Sinne eines Vulnerabilitäts-Stress-Modells: genetische Disposition (positive Familienanamnese), neurobiologische Dysbalance zentraler Neurotransmitter (Serotonin, Noradrenalin, Dopamin) und Dysregulation der Hypothalamus-Hypophysen-Nebennierenrinden-Achse treffen auf psychosoziale Auslöser (Verlust, Trennung, Arbeitslosigkeit, chronische Belastung). Sekundäre Depressionen entstehen organisch (z. B. Hypothyreose, Anämie, Vitamin-B12-Mangel, Morbus Parkinson, zerebrale Prozesse) oder substanzinduziert (Alkohol, Betablocker, Kortikosteroide, Interferon).',
      risikofaktoren: [
        'Positive Familienanamnese (Verwandte mit Depression oder vollendetem Suizid)',
        'Frühere depressive Episoden (hohe Rezidivneigung)',
        'Belastende Lebensereignisse: Verlust, Trennung, Arbeitslosigkeit',
        'Weibliches Geschlecht (etwa doppelt so häufig betroffen)',
        'Soziale Isolation, fehlender sozialer Rückhalt',
        'Chronische somatische Erkrankungen und chronische Schmerzen',
        'Substanzkonsum, insbesondere Alkohol- und Benzodiazepinabusus',
        'Höheres Lebensalter und Multimorbidität',
        'Postpartalperiode',
      ],
      klinik: [
        {
          text: 'Gedrückte, niedergeschlagene Stimmung, Gefühl innerer Leere oder der "Gefühllosigkeit" (Hauptsymptom)',
        },
        {
          text: 'Interessen- und Freudlosigkeit (Anhedonie), Verlust von Freude an früher wichtigen Aktivitäten (Hauptsymptom)',
        },
        {
          text: 'Antriebsminderung, erhöhte Ermüdbarkeit, sozialer Rückzug (Hauptsymptom)',
        },
        {
          text: 'Konzentrations- und Aufmerksamkeitsstörung, Entscheidungsunfähigkeit',
        },
        {
          text: 'Vermindertes Selbstwertgefühl, Schuld- und Wertlosigkeitsgefühle',
        },
        {
          text: 'Negative, pessimistische Zukunftsperspektive, Hoffnungslosigkeit',
        },
        {
          text: 'Suizidgedanken oder -handlungen ("Mir ist egal, ob ich lebe oder nicht")',
        },
        {
          text: 'Somatisches Syndrom: Früherwachen, Morgentief (Morgenpessimum), psychomotorische Hemmung, Appetit- und Gewichtsverlust, Libidoverlust',
        },
        {
          text: 'Larvierte (somatisierte) Depression: Kopfschmerzen, Ganzkörperschmerzen oder Müdigkeit als führende Beschwerde, während die Stimmungsstörung erst auf gezielte Nachfrage genannt wird',
          atypisch: true,
        },
        {
          text: 'Atypische Depression: Stimmungsreagibilität, Hypersomnie und gesteigerter Appetit (Heißhunger) statt Früherwachen und Inappetenz',
          atypisch: true,
        },
        {
          text: 'Agitierte Depression mit ausgeprägter innerer Unruhe, v. a. im höheren Lebensalter',
          atypisch: true,
        },
        {
          text: 'Psychotische (wahnhafte) Depression: Schuld-, Verarmungs- oder nihilistischer Wahn bei schwerer Episode',
          atypisch: true,
        },
        {
          text: 'Depressiver Stupor mit Mutismus sowie Nahrungs- und Flüssigkeitsverweigerung als schwerste Verlaufsform',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'ICD-10 F32 — Schweregrad',
          inhalt: '3 Hauptsymptome (gedrückte Stimmung, Anhedonie, Antriebsminderung) und Zusatzsymptome, Dauer ≥ 2 Wochen. Leicht = 2 Haupt- + 2 Zusatzsymptome; mittelgradig = 2 Haupt- + 3–4 Zusatzsymptome; schwer = 3 Haupt- + ≥ 4 Zusatzsymptome. Zusatz: mit/ohne somatisches Syndrom, schwer mit/ohne psychotische Symptome.',
        },
        {
          name: 'PHQ-9 (Gesundheitsfragebogen für Patienten)',
          inhalt: 'Neun Items entsprechend den ICD-/DSM-Kriterien, jeweils 0–3 Punkte (0–27). Kurzes, im Alltag und in der Prüfung genanntes Screening- und Verlaufsinstrument; Item 9 erfasst Suizidalität.',
        },
        {
          name: 'Weitere Skalen',
          inhalt: 'Hamilton-Depressionsskala (HAMD, Fremdbeurteilung) und Beck-Depressions-Inventar (BDI, Selbstbeurteilung) zur Schweregradbeurteilung und Verlaufskontrolle.',
        },
        {
          name: 'Verlaufsformen',
          inhalt: 'Einzelne Episode (F32) vs. rezidivierende depressive Störung (F33); Abgrenzung zur bipolaren Störung (F31) und zur Dysthymie (F34.1, chronisch-leicht, ≥ 2 Jahre).',
        },
      ],
      redFlags: [
        'Akute Suizidalität mit konkreten Plänen, Vorbereitungen oder Ankündigungen (z. B. Sprungabsicht) → sofortige Sicherung, Patient nicht allein lassen',
        'Psychotische Symptome (Schuld-, Verarmungs-, nihilistischer Wahn) bei schwerer Episode',
        'Depressiver Stupor mit Nahrungs- und Flüssigkeitsverweigerung',
        'Fremdgefährdung / Hinweise auf einen erweiterten Suizid (Gefährdung Angehöriger)',
        'Schwere Agitiertheit oder ausgeprägte innere Anspannung',
        'Antriebssteigerung unter beginnender Antidepressiva-Therapie bei noch gedrückter Stimmung (erhöhtes Suizidrisiko)',
      ],
      diagnostik: [
        {
          text: 'Psychopathologischer Befund und Exploration (u. a. nach AMDP): Stimmung, Antrieb, Schlaf, Tagesverlauf, Denkinhalte, Konzentration',
        },
        {
          text: 'Aktive und explizite Abschätzung der Suizidalität (Gedanken, Pläne, Vorbereitungen, Absprachefähigkeit) — immer erfragen',
        },
        {
          text: 'Standardisierte Skalen zur Schweregradbeurteilung und Verlaufskontrolle (PHQ-9, BDI, HAMD)',
        },
        {
          text: 'Erhebung des Auslösers und der psychosozialen Situation sowie Fremdanamnese (Angehörige)',
        },
        {
          text: 'Frühere manische oder hypomane Phasen erfragen, um eine bipolare Störung auszuschließen',
        },
        {
          text: 'Körperliche und orientierend neurologische Untersuchung zum Ausschluss organischer Ursachen',
        },
        {
          text: 'Labor zum Ausschluss sekundärer Ursachen: TSH, fT3/fT4 (Hypothyreose), Blutbild (Anämie), Vitamin B12 und Folsäure, Blutzucker/HbA1c, Elektrolyte, Leber- und Nierenwerte, ggf. CRP',
        },
        {
          text: '12-Kanal-EKG vor Beginn einer antidepressiven Medikation (QT-Zeit) sowie Drogen-/Alkoholscreening bei Verdacht',
        },
        {
          text: 'Kraniale Bildgebung (cCT/cMRT) bei atypischer Präsentation, Erstmanifestation im höheren Alter oder neurologischen Auffälligkeiten',
          invasiv: true,
        },
        {
          text: 'Psychiatrisches Konsil zur weiteren Behandlungsplanung veranlassen',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Bipolare affektive Störung',
          unterscheidung: 'Anamnestisch frühere manische oder hypomane Phasen; vor Gabe eines Antidepressivums ausschließen (Switch-/Manierisiko).',
        },
        {
          dd: 'Dysthymie',
          unterscheidung: 'Chronisch-leichte depressive Verstimmung über mindestens zwei Jahre, ohne die volle Ausprägung einer Episode.',
        },
        {
          dd: 'Anpassungsstörung / normale Trauerreaktion',
          unterscheidung: 'Klar auf ein belastendes Ereignis bezogen, zeitlich begrenzt, ohne durchgängige Anhedonie und ohne anhaltende Wertlosigkeitsgefühle.',
        },
        {
          dd: 'Hypothyreose',
          unterscheidung: 'Müdigkeit, Antriebsarmut, Gewichtszunahme, Kälteintoleranz; Abgrenzung durch TSH/fT4 — von Patienten oft selbst vermutet.',
        },
        {
          dd: 'Anämie / Vitamin-B12-Mangel',
          unterscheidung: 'Blässe, Leistungsknick, Belastungsdyspnoe; Abgrenzung über Blutbild bzw. B12-Spiegel.',
        },
        {
          dd: 'Larvierte / somatoforme Störung',
          unterscheidung: 'Multiple körperliche Beschwerden ohne organisches Korrelat trotz wiederholter Abklärung; die affektive Störung wird erst auf Nachfrage deutlich.',
        },
        {
          dd: 'Demenz (depressive Pseudodemenz)',
          unterscheidung: 'Kognitive Defizite, die sich unter antidepressiver Therapie bessern; der Patient klagt selbst über Gedächtnisstörungen (bei Demenz eher dissimuliert).',
        },
        {
          dd: 'Burnout / Erschöpfungssyndrom',
          unterscheidung: 'Arbeitsbezogene Erschöpfung; Übergänge zur Depression fließend, jedoch keine eigenständige ICD-Diagnose.',
        },
        {
          dd: 'Substanzinduzierte / medikamenteninduzierte Depression',
          unterscheidung: 'Zeitlicher Zusammenhang mit Alkohol, Benzodiazepinen, Betablockern oder Kortikosteroiden.',
        },
      ],
      therapie: {
        konservativ: [
          'Tragfähige therapeutische Beziehung, Psychoedukation und Aufklärung über Krankheitsbild und Verlauf',
          'Psychotherapie (kognitive Verhaltenstherapie, interpersonelle Therapie) — bei leichter Episode als alleinige Maßnahme möglich',
          'Pharmakotherapie: SSRI als Mittel der 1. Wahl (z. B. Citalopram, Sertralin); Alternativen SNRI (Venlafaxin, Duloxetin), Mirtazapin (günstig bei Schlafstörung und Appetitverlust), trizyklische Antidepressiva als Reserve',
          'Wirklatenz von 2–3 Wochen aufklären; Cave erhöhtes Suizidrisiko in der frühen Antriebssteigerungsphase',
          'Kombination aus Psychotherapie und Pharmakotherapie bei mittelschwerer bis schwerer Episode',
          'Begleitend Tagesstrukturierung, Schlafhygiene, körperliche Aktivierung und Einbindung des sozialen Umfelds',
          'Psychiatrisches Konsil veranlassen; nach Remission Erhaltungstherapie über mindestens 6 Monate (Rezidivprophylaxe länger)',
        ],
        interventionell: [
          'Stationäre Aufnahme bei Suizidalität, psychotischen Symptomen oder Selbstgefährdung — bei fehlender Absprachefähigkeit ggf. Unterbringung nach PsychKG/BW',
          'Elektrokonvulsionstherapie (EKT) bei therapieresistenter oder schwerer wahnhafter Depression und beim depressiven Stupor',
          'Ergänzend Lichttherapie (saisonale Depression), Wachtherapie (Schlafentzug) und repetitive transkranielle Magnetstimulation (rTMS)',
        ],
        chirurgisch: [
          'Keine chirurgische Standardtherapie; die tiefe Hirnstimulation bleibt experimentellen Fällen therapierefraktärer Depression im Studienrahmen vorbehalten.',
        ],
      },
      prognose: 'Depressive Episoden sind grundsätzlich gut behandelbar; die Mehrzahl der Patienten remittiert unter adäquater Therapie. Die Erkrankung neigt jedoch zu Rezidiven (Wiedererkrankungsrisiko rund 50 % nach der ersten, bis 90 % nach der dritten Episode), weshalb eine Erhaltungs- und ggf. Rezidivprophylaxe wichtig ist. Prognosebestimmend sind das Suizidrisiko (etwa 10–15 % der schwer und wiederholt Erkrankten versterben durch Suizid), Komorbiditäten und die Therapieadhärenz.',
      pruefungsfallen: [
        'Suizidalität immer aktiv und explizit ansprechen — das Nachfragen erhöht das Risiko NICHT (verbreiteter Irrtum). Der Prüfer fragt fast immer danach.',
        '"Können wir den Patienten entlassen?" → Bei Suizidalität NEIN; depressive Patienten können suizidale Tendenzen haben (reale Prüferfrage, Karlsruhe 08.11.2021).',
        'Organische Ursachen aktiv ausschließen und dabei das TSH nicht vergessen — der Patient äußert oft selbst "ich glaube, ich habe eine Schilddrüsenunterfunktion" (Karlsruhe 01.08.2023).',
        'Larvierte Depression: Kopf- oder Ganzkörperschmerzen sind häufig das Leitsymptom — nicht in der Schmerz-Schiene verharren, sondern gezielt nach Stimmung, Antrieb, Schlaf und Suizidalität fragen.',
        'Vor der Gabe eines Antidepressivums eine bipolare Störung ausschließen (frühere manische Phasen erfragen), sonst Gefahr eines Umschlags in die Manie.',
        'Wirklatenz der Antidepressiva von 2–3 Wochen kennen; Cave erhöhtes Suizidrisiko, wenn der Antrieb vor der Stimmung steigt.',
        'Auslöser erfragen (z. B. Tod der Schwester, Suizid des Vaters) und Empathie zeigen, ohne zu werten.',
        'Dauereinnahme von Schlafmitteln (Benzodiazepin, z. B. Adumbran) bedeutet Abusus/Abhängigkeitsrisiko — Beratung und langsames Ausschleichen thematisieren.',
        'Morgendliche Kopfschmerzen können auch medikamentös bedingt sein (Ramipril, HCT, Benzodiazepin am Morgen) — an Medikamentenumstellung denken (reale Prüfernachfrage).',
      ],
      askedInExam: [
        {
          frage: 'Wie stellen Sie die Diagnose einer Depression — welche Kriterien?',
          antwort: 'Nach ICD-10 die drei Hauptsymptome gedrückte Stimmung, Interessen- und Freudlosigkeit sowie Antriebsminderung, ergänzt durch Zusatzsymptome wie Konzentrationsstörung, Schuldgefühle, Schlafstörung und Suizidgedanken, über mindestens zwei Wochen. Der Schweregrad ergibt sich aus der Zahl der Symptome.',
        },
        {
          frage: 'Können wir diesen Patienten nach Hause entlassen?',
          antwort: 'Bei bestehender Suizidalität nein. Depressive Patienten können suizidale Tendenzen haben; ich würde den Patienten nicht allein lassen, die Suizidalität abschätzen und ein psychiatrisches Konsil veranlassen, gegebenenfalls stationär aufnehmen.',
        },
        {
          frage: 'Was tun Sie, wenn der Patient akut suizidal ist und ankündigt, aus dem Fenster zu springen?',
          antwort: 'Den Patienten nicht allein lassen und die Umgebung sichern, ruhig das Gespräch halten, den psychiatrischen Dienst hinzuziehen und bei fehlender Absprachefähigkeit eine geschützte Unterbringung nach PsychKG in die Wege leiten.',
        },
        {
          frage: 'Wie schließen Sie eine Hypothyreose als Ursache aus?',
          antwort: 'Durch Bestimmung des TSH und, bei Auffälligkeit, von fT3 und fT4. Eine Hypothyreose kann Müdigkeit, Antriebsarmut und depressive Stimmung imitieren.',
        },
        {
          frage: 'Welche Differenzialdiagnosen kommen in Betracht?',
          antwort: 'Eine bipolare Störung, die Dysthymie, eine Anpassungs- bzw. Trauerreaktion sowie organische Ursachen wie Hypothyreose, Anämie oder Vitamin-B12-Mangel, außerdem eine larvierte oder substanzinduzierte Depression.',
        },
        {
          frage: 'Wie behandeln Sie die Depression?',
          antwort: 'Grundlage sind Psychoedukation und eine tragfähige Beziehung. Bei leichter Episode kann Psychotherapie allein genügen; bei mittelschwerer bis schwerer Episode kombiniere ich Psychotherapie mit einem Antidepressivum, meist einem SSRI, und veranlasse ein psychiatrisches Konsil.',
        },
        {
          frage: 'Welches Antidepressivum wählen Sie und warum?',
          antwort: 'Als Mittel der ersten Wahl einen SSRI wie Citalopram oder Sertralin wegen des günstigen Nebenwirkungsprofils. Mirtazapin ist bei ausgeprägter Schlafstörung und Appetitverlust vorteilhaft. Die Wirkung setzt erst nach zwei bis drei Wochen ein.',
        },
        {
          frage: 'Was bedeutet Abusus, wenn der Patient täglich ein Schlafmittel einnimmt?',
          antwort: 'Die tägliche Einnahme eines Benzodiazepins birgt ein Abhängigkeitsrisiko. Ich würde den Patienten aufklären, das Medikament langsam ausschleichen und eine fachärztliche Beratung empfehlen.',
        },
        {
          frage: 'Warum ist es wichtig, den Patienten nach Suizidgedanken zu fragen?',
          antwort: 'Weil die Suizidalität über das weitere Vorgehen und die Notwendigkeit einer stationären Aufnahme entscheidet. Das offene Ansprechen erhöht das Risiko nicht, sondern entlastet den Patienten häufig.',
        },
      ],
      merksatz: 'Merke: Hinter Kopf- und Ganzkörperschmerzen kann eine larvierte Depression stecken — Stimmung, Antrieb, Schlaf UND Suizidalität aktiv erfragen; vor jeder Therapie TSH bestimmen und eine bipolare Störung ausschließen.',
      linkedCaseIds: [
        'case-depression',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
    {
      id: 'fw-pneumonie',
      pathology: 'Ambulant erworbene Pneumonie (CAP)',
      specialty: 'Pneumologie',
      definition: 'Ambulant erworbene Pneumonie (CAP, community-acquired pneumonia): akute Infektion des Lungenparenchyms (Alveolen und/oder Interstitium), die außerhalb des Krankenhauses bzw. innerhalb der ersten 48 Stunden nach stationärer Aufnahme bei einem nicht schwer immunsupprimierten Patienten erworben wird. Abzugrenzen von der nosokomialen Pneumonie (Erwerb ≥ 48 h nach Aufnahme) und der Pneumonie bei ausgeprägter Immunsuppression, da sich Erregerspektrum und kalkulierte Antibiose unterscheiden.',
      aetiologie: 'Häufigster Erreger ist Streptococcus pneumoniae (Pneumokokken). Weitere typische Erreger: Haemophilus influenzae, Moraxella catarrhalis, Staphylococcus aureus. Atypische Erreger (v. a. bei jüngeren Patienten): Mycoplasma pneumoniae, Chlamydophila pneumoniae, Legionella pneumophila. Virale Genese (Influenza, RSV, SARS-CoV-2), oft mit bakterieller Superinfektion. Bei älteren, komorbiden oder immunsupprimierten Patienten (hier: Diabetes mellitus und Z. n. Strahlentherapie/Zytostatika) auch gramnegative Enterobakterien und opportunistische Erreger.',
      risikofaktoren: [
        'Höheres Lebensalter',
        'Diabetes mellitus (Immunschwäche, hier vorbekannt)',
        'Immunsuppression durch Zytostatika/Strahlentherapie oder Glukokortikoide',
        'Chronische Lungenerkrankung (COPD, Bronchiektasen)',
        'Herzinsuffizienz und andere kardiale Vorerkrankungen',
        'Nikotin- und Alkoholabusus',
        'Immobilität/Bettlägerigkeit und Schluckstörungen (Aspiration)',
        'Rezidivierende Atemwegsinfekte / Infektanfälligkeit',
        'Fehlende Pneumokokken- und Influenzaimpfung',
      ],
      klinik: [
        {
          text: 'Plötzliches hohes Fieber (> 38,5 °C) mit Schüttelfrost',
        },
        {
          text: 'Produktiver Husten mit gelb-grünlichem, purulentem Auswurf (Sputum)',
        },
        {
          text: 'Atemabhängiger, stechender Thoraxschmerz (pleuritisch)',
        },
        {
          text: 'Dyspnoe und Tachypnoe, ggf. Belastungsdyspnoe',
        },
        {
          text: 'Abgeschlagenheit, reduzierter Allgemeinzustand, Krankheitsgefühl, Tachykardie',
        },
        {
          text: 'Begleitend Nachtschweiß, Inappetenz, hustenbedingte Insomnie',
        },
        {
          text: 'Atypische Pneumonie (Mykoplasmen/Chlamydien): schleichender Beginn, trockener Reizhusten, Kopf- und Gliederschmerzen, nur subfebrile Temperatur',
          atypisch: true,
        },
        {
          text: 'Beim alten oder immunsupprimierten Patienten oft fehlendes Fieber — nur Verwirrtheit, Sturz, Exsikkose oder Tachypnoe als Leitsymptom',
          atypisch: true,
        },
        {
          text: 'Legionellenpneumonie: hohes Fieber, Diarrhö, relative Bradykardie und Hyponatriämie',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'CURB-65',
          inhalt: 'Je 1 Punkt für: Confusion (neue Verwirrtheit), Urea > 7 mmol/l (Harnstoff), Respiratory rate ≥ 30/min, Blutdruck < 90 mmHg systolisch oder ≤ 60 mmHg diastolisch, Alter ≥ 65 Jahre. 0–1 Punkte: ambulante Behandlung möglich; 2 Punkte: stationäre Aufnahme erwägen; ≥ 3 Punkte: stationär, ggf. intensivmedizinisch. Schätzt Letalität und Behandlungsort.',
        },
        {
          name: 'CRB-65',
          inhalt: 'Vereinfachte Variante ohne Laborwert (ohne Harnstoff) für die ambulante Praxis: Confusion, Respiratory rate ≥ 30, Blutdruck erniedrigt, Alter ≥ 65. Bereits ≥ 1 Punkt → Krankenhauseinweisung erwägen.',
        },
        {
          name: 'Einteilung nach Erwerbsort und Immunstatus',
          inhalt: 'Ambulant erworbene Pneumonie (CAP) vs. nosokomiale Pneumonie (HAP, ≥ 48 h nach Aufnahme) vs. Pneumonie unter Immunsuppression — bestimmt das Erregerspektrum und die kalkulierte Antibiose (häufige Prüferfrage: Typ nennen und begründen).',
        },
        {
          name: 'Typische vs. atypische Pneumonie',
          inhalt: 'Typische (alveoläre) Lobärpneumonie, meist Pneumokokken, mit purulentem Sputum und lobärem Infiltrat; atypische (interstitielle) Pneumonie durch Mykoplasmen/Chlamydien/Legionellen mit trockenem Husten und diffusem interstitiellem Muster.',
        },
      ],
      redFlags: [
        'Tachypnoe ≥ 30/min, SpO2 < 92 % oder Zyanose → respiratorische Insuffizienz',
        'Hypotonie (RR < 90 mmHg systolisch), Tachykardie, Oligurie → beginnende Sepsis / septischer Schock',
        'Neu aufgetretene Verwirrtheit (Confusion) — CURB-65-Kriterium',
        'Immunsuppression (Diabetes mellitus, Strahlentherapie/Zytostatika) → Indikation zur stationären, ggf. intensivmedizinischen Aufnahme',
        'Persistierend hohes Fieber trotz Antibiose, Hämoptysen → Komplikation (Pleuraempyem, Lungenabszess)',
      ],
      diagnostik: [
        {
          text: 'Vitalparametermessung inklusive Pulsoxymetrie (SpO2) zur Einschätzung der Oxygenierung',
        },
        {
          text: 'Körperliche Untersuchung — Inspektion: Tachypnoe, Zyanose, Nasenflügeln; Palpation: verstärkter Stimmfremitus über dem Infiltrat; Perkussion: Klopfschalldämpfung; Auskultation: klingende feinblasige Rasselgeräusche, Bronchialatmen, verstärkte Bronchophonie',
        },
        {
          text: 'Labor: Blutbild (Leukozytose mit Neutrophilie und Linksverschiebung), CRP und BSG erhöht, Prokalzitonin (bakterielle Genese), Elektrolyte (Hyponatriämie bei Legionellen), Harnstoff/Kreatinin (für CURB-65), Leberwerte, Blutzucker und HbA1c',
        },
        {
          text: 'Arterielle Blutgasanalyse (BGA) zur Beurteilung von Oxygenierung und respiratorischer Insuffizienz',
        },
        {
          text: 'Mikrobiologie: Sputumkultur mit Antibiogramm und 2 Blutkulturen — jeweils VOR der ersten Antibiotikagabe abnehmen; Legionellen- und Pneumokokken-Antigen im Urin; Nasen-Rachen-Abstrich (Influenza-/SARS-CoV-2-PCR)',
        },
        {
          text: 'Thorax-Sonographie: Nachweis von Infiltrat, Pleuraerguss, Hepatisation des minderbelüfteten Lungengewebes und B-Linien',
        },
        {
          text: 'Röntgen-Thorax in zwei Ebenen: Infiltratnachweis (lobär/segmental bei typischer, diffus interstitiell bei atypischer Pneumonie), positives Bronchopneumogramm, Erguss- und Verlaufsbeurteilung',
        },
        {
          text: 'CT-Thorax bei unklarem Röntgenbefund, Komplikationsverdacht oder Immunsuppression',
        },
        {
          text: 'Diagnostische Pleurapunktion bei relevantem Pleuraerguss (Ausschluss eines Empyems)',
          invasiv: true,
        },
        {
          text: 'Bronchoskopie mit bronchoalveolärer Lavage (BAL) bei therapierefraktärem Verlauf oder Immunsuppression zur gezielten Erregersicherung',
          invasiv: true,
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Akute Bronchitis',
          unterscheidung: 'Meist viral, kein oder nur geringes Fieber, kein Infiltrat im Röntgen-Thorax; auskultatorisch eher Giemen/Brummen als klingende Rasselgeräusche; selbstlimitierend, keine kalkulierte Antibiose nötig.',
        },
        {
          dd: 'Lungenembolie',
          unterscheidung: 'Akut einsetzende Dyspnoe und atemabhängiger Schmerz, meist ohne purulentes Sputum und ohne hohes Fieber; D-Dimere erhöht, Risikofaktoren (Immobilisation, Tumorleiden, TVT); Sicherung per CT-Angiographie.',
        },
        {
          dd: 'Linksherzinsuffizienz / kardiales Lungenödem',
          unterscheidung: 'Orthopnoe, beidseitige feuchte Rasselgeräusche basal, periphere Ödeme, kardiale Vorgeschichte; NT-proBNP erhöht; Röntgen zeigt Stauungszeichen (Kerley-B-Linien) statt umschriebenen Infiltrats.',
        },
        {
          dd: 'Lungentuberkulose',
          unterscheidung: 'Subakuter/chronischer Verlauf mit Nachtschweiß, Gewichtsverlust und Hämoptysen; Oberlappeninfiltrate/Kavernen; Reise- und Expositionsanamnese; Sputum auf säurefeste Stäbchen, IGRA/Tuberkulin-Test.',
        },
        {
          dd: 'COVID-19 / Influenza',
          unterscheidung: 'Kontakt- und Reiseanamnese, saisonales Auftreten, oft trockener Husten und Anosmie/Ageusie; Sicherung per PCR bzw. Antigentest.',
        },
        {
          dd: 'Lungenkarzinom / pulmonale Metastasen (bei Tumoranamnese)',
          unterscheidung: 'Bei Z. n. Prostatakarzinom an poststenotische Pneumonie oder Metastasen denken: persistierendes Infiltrat oder Rundherd ohne durchgreifende Entzündungszeichen, keine Rückbildung nach Antibiose — Verlaufskontrolle und CT.',
        },
      ],
      therapie: {
        konservativ: [
          'Allgemeinmaßnahmen: körperliche Schonung, ausreichende Flüssigkeitszufuhr, Antipyrese/Analgesie (Paracetamol oder NSAR), Sauerstoffgabe bei SpO2 < 92 %, Sekretolyse und Atemtherapie/Mobilisation, Thromboseprophylaxe bei stationärer Aufnahme',
          'Kalkulierte (empirische) Antibiose je nach Schweregrad — leichte ambulante CAP: Amoxicillin; bei Penicillinallergie Makrolid (Clarithromycin/Azithromycin) oder Doxycyclin',
          'Mittelschwere/schwere, stationäre CAP: Aminopenicillin + β-Laktamase-Inhibitor (Ampicillin/Sulbactam) oder Cephalosporin (Ceftriaxon/Cefotaxim), kombiniert mit einem Makrolid',
          'Bei Penicillinallergie (wie hier): respiratorisches Fluorchinolon (Levofloxacin/Moxifloxacin) oder Makrolid; bei schwerem Verlauf/Immunsuppression ggf. Piperacillin/Tazobactam',
          'Deeskalation der Antibiose nach Sputum-/Blutkultur und Antibiogramm; Therapiedauer meist 5–7 Tage',
          'Prophylaxe: Pneumokokken- und jährliche Influenzaimpfung; gute Diabeteseinstellung',
        ],
        interventionell: [
          'Diagnostische und ggf. therapeutische Pleurapunktion, bei Empyem Anlage einer Thoraxdrainage',
          'Bronchoskopische Sekretabsaugung und BAL zur Erregersicherung bei Sekretretention oder Immunsuppression',
          'Intensivmedizinische Betreuung mit nicht-invasiver (NIV) oder invasiver Beatmung bei respiratorischer Insuffizienz oder Sepsis',
        ],
        chirurgisch: [
          'Operative Sanierung (Dekortikation, videoassistierte Thorakoskopie/VATS) bei gekammertem, chronischem Pleuraempyem',
          'Operative Ausräumung eines konservativ/interventionell nicht beherrschbaren Lungenabszesses',
        ],
      },
      prognose: 'Bei jüngeren, gesunden Patienten mit leichter CAP meist folgenlose Ausheilung. Die Prognose verschlechtert sich mit steigendem Alter, Komorbidität (Diabetes mellitus, Immunsuppression) und Schweregrad (CURB-65). Eine schwere CAP mit Sepsis oder respiratorischer Insuffizienz hat eine erhebliche Letalität. Mögliche Komplikationen: parapneumonischer Pleuraerguss und Pleuraempyem, Lungenabszess, respiratorische Insuffizienz, ARDS und Sepsis.',
      pruefungsfallen: [
        'Immer den Typ der Pneumonie benennen UND begründen: "ambulant erworben, da in den letzten 48 Stunden bzw. Tagen keine Hospitalisierung" — sehr häufige Prüferfrage.',
        'Immunsuppression (Diabetes mellitus, Strahlentherapie/Zytostatika) erkennen: rechtfertigt eine stationäre, oft intensivmedizinische Aufnahme — nicht als banale ambulante CAP abtun.',
        'Penicillinallergie beachten: keine Aminopenicilline oder Cephalosporine (Kreuzreaktion) → Makrolid oder respiratorisches Fluorchinolon nennen können.',
        'Blut- und Sputumkulturen unbedingt VOR der ersten Antibiotikagabe abnehmen.',
        'Die KU-Trias der Infiltration parat haben: verstärkter Stimmfremitus, Klopfschalldämpfung und klingende feuchte Rasselgeräusche.',
        'Sonographiezeichen der Pneumonie kennen (in Stuttgart gefragt): Pleuraerguss, Hepatisation der Lunge und B-Linien.',
        'CURB-65 vollständig mit allen 5 Kriterien aufsagen können.',
        'Bei Tumoranamnese (z. B. Prostatakarzinom) an poststenotische Pneumonie oder Metastasen denken, nicht nur an die banale Pneumonie.',
      ],
      askedInExam: [
        {
          frage: 'Welche Verdachtsdiagnose haben Sie und warum?',
          antwort: 'Eine ambulant erworbene Pneumonie, denn der Patient zeigt die typische Trias aus Fieber mit Schüttelfrost, produktivem Husten mit gelbem Auswurf und atemabhängigem Thoraxschmerz, und die Infektion wurde außerhalb des Krankenhauses erworben.',
        },
        {
          frage: 'Welchen Typ der Pneumonie hat der Patient und warum?',
          antwort: 'Eine ambulant erworbene Pneumonie, da der Patient in den letzten 48 Stunden bzw. Tagen nicht im Krankenhaus war. Wäre sie erst ab 48 Stunden nach einer Aufnahme aufgetreten, spräche man von einer nosokomialen Pneumonie.',
        },
        {
          frage: 'Welche Risikofaktoren für eine Pneumonie hat der Patient?',
          antwort: 'Vor allem der Diabetes mellitus und die Immunsuppression durch die Strahlentherapie beziehungsweise die Zytostatika; beide schwächen die Immunabwehr und begünstigen eine Pneumonie. Hinzu kommen das Alter und die weiteren Vorerkrankungen.',
        },
        {
          frage: 'Was erwarten Sie in der körperlichen Untersuchung?',
          antwort: 'Bei der Inspektion eine Tachypnoe und eventuell eine Zyanose, bei der Palpation einen verstärkten Stimmfremitus, bei der Perkussion eine Klopfschalldämpfung und bei der Auskultation klingende feuchte Rasselgeräusche über dem Infiltrat.',
        },
        {
          frage: 'Was erwarten Sie im Labor?',
          antwort: 'Eine Leukozytose mit Neutrophilie sowie ein erhöhtes CRP und eine erhöhte BSG; ein erhöhtes Prokalzitonin stützt die bakterielle Genese.',
        },
        {
          frage: 'Was erwarten Sie im Röntgen-Thorax und in welchem Lappen?',
          antwort: 'Ein Infiltrat mit positivem Bronchopneumogramm; bei der typischen Lobärpneumonie lobär oder segmental begrenzt, bei atypischer Genese eher eine diffuse interstitielle Zeichnungsvermehrung. Die genaue Lappenlokalisation zeigt erst das Bild.',
        },
        {
          frage: 'Welche Zeichen können Sie in der Lungen-Sonographie erkennen?',
          antwort: 'Einen Pleuraerguss, eine Hepatisation des minderbelüfteten Lungengewebes und B-Linien als Zeichen des interstitiellen Ödems.',
        },
        {
          frage: 'Wie messen Sie die Sauerstoffsättigung?',
          antwort: 'Nichtinvasiv mit dem Fingerpulsoxymeter und genauer mit einer arteriellen Blutgasanalyse.',
        },
        {
          frage: 'Werden Sie den Patienten stationär aufnehmen?',
          antwort: 'Ja, wegen der Immunsuppression und der Komorbiditäten; hier ist sogar eine intensivmedizinische Überwachung zu erwägen. Zur Objektivierung nutze ich den CURB-65-Score.',
        },
        {
          frage: 'Welches Antibiotikum wählen Sie bei der Penicillinallergie?',
          antwort: 'Ein Makrolid wie Clarithromycin oder Azithromycin, alternativ ein respiratorisches Fluorchinolon wie Levofloxacin. Aminopenicilline und Cephalosporine meide ich wegen der Allergie und der möglichen Kreuzreaktion.',
        },
        {
          frage: 'Welche Erreger sind bei der ambulant erworbenen Pneumonie am häufigsten?',
          antwort: 'Am häufigsten Streptococcus pneumoniae, außerdem Haemophilus influenzae, atypische Erreger wie Mykoplasmen und Legionellen sowie Viren, teils mit bakterieller Superinfektion.',
        },
        {
          frage: 'Welche Impfungen sind in Bezug auf die Pneumonie relevant?',
          antwort: 'Die Pneumokokkenimpfung und die jährliche Influenzaimpfung, ergänzend die COVID-19-Impfung.',
        },
        {
          frage: 'Warum ist der HbA1c bei diesem Patienten wichtig?',
          antwort: 'Ein schlecht eingestellter Diabetes schwächt die Immunabwehr; ein erhöhter HbA1c erklärt die Infektanfälligkeit und die erhöhte Komplikationsneigung der Pneumonie.',
        },
      ],
      merksatz: 'Merke: Bei der CAP immer den Typ begründen ("ambulant erworben, keine Hospitalisierung") und den Schweregrad mit CURB-65 abschätzen; Blut- und Sputumkultur vor der kalkulierten Antibiose abnehmen — bei Penicillinallergie ein Makrolid oder ein respiratorisches Fluorchinolon wählen.',
      linkedCaseIds: [
        'case-pneumonie',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
    {
      id: 'fw-pyelonephritis',
      pathology: 'Akute Pyelonephritis',
      specialty: 'Urologie',
      definition: 'Akute bakterielle Entzündung des Nierenbeckens (Pyelon) und des Nierenparenchyms mit interstitieller Beteiligung — also eine Harnwegsinfektion des oberen Harntrakts. Sie entsteht meist als Komplikation einer aufsteigenden (aszendierenden) unteren Harnwegsinfektion. Leitbefund ist die Kombination aus Fieber, einseitigem Flankenschmerz und klopfschmerzhaftem Nierenlager.',
      aetiologie: 'In über 80 % aszendierende Infektion aus der Blase mit Escherichia coli aus der eigenen Darmflora. Weitere typische Erreger: Proteus mirabilis, Klebsiella pneumoniae, Enterokokken, Staphylococcus saprophyticus (bei jungen Frauen). Selten hämatogene Streuung (z. B. Staphylococcus aureus). Begünstigt wird der Aufstieg durch Harnabflussstörungen und eine Störung der lokalen Abwehr.',
      risikofaktoren: [
        'Weibliches Geschlecht (kurze Harnröhre) und Geschlechtsverkehr',
        'Rezidivierende Zystitis / untere Harnwegsinfektionen',
        'Harnabflussstörung: Nephrolithiasis, Prostatahyperplasie, Tumor, vesikoureteraler Reflux',
        'Diabetes mellitus (Fall Häberle) — erhöhtes Komplikationsrisiko',
        'Schwangerschaft (Ureterdilatation, Harnstau)',
        'Blasenkatheter oder urologische Instrumentierung',
        'Immunsuppression',
        'Postmenopausaler Östrogenmangel, anatomische Fehlbildungen',
      ],
      klinik: [
        {
          text: 'Klassische Trias: hohes Fieber (>38,5 °C) mit Schüttelfrost, einseitiger Flankenschmerz, Dysurie',
        },
        {
          text: 'Klopf- und Druckschmerz im Nierenlager (kostovertebraler Winkel) — der Schlüsselbefund der körperlichen Untersuchung',
        },
        {
          text: 'Symptome der unteren Harnwege: Pollakisurie, Algurie/Dysurie, imperativer Harndrang, ggf. Nykturie',
        },
        {
          text: 'Trüber, übelriechender Urin, evtl. Makrohämaturie',
        },
        {
          text: 'Allgemeinsymptome: Übelkeit, Erbrechen, Abgeschlagenheit, reduzierter Allgemeinzustand',
        },
        {
          text: 'Beim älteren Patienten oft nur Verwirrtheit/Delir, Sturz oder reduzierter AZ ohne führendes Fieber',
          atypisch: true,
        },
        {
          text: 'Bei Säuglingen und Kleinkindern unspezifisch: Fieber unklarer Ursache, Trinkschwäche, Erbrechen, Gedeihstörung',
          atypisch: true,
        },
        {
          text: 'Urosepsis mit Kreislaufinstabilität als Erstmanifestation, besonders bei Diabetikern und Immunsupprimierten',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Unkompliziert vs. kompliziert',
          inhalt: 'Kompliziert bei männlichem Geschlecht, Schwangerschaft, Harnabflussstörung/Katheter, Diabetes mellitus, Immunsuppression oder anatomisch-funktionellen Anomalien. Steuert Aufnahme (stationär), Antibiotikawahl und Therapiedauer (7–14 statt 7 Tage).',
        },
        {
          name: 'qSOFA (Urosepsis-Screening)',
          inhalt: 'Atemfrequenz ≥22/min, verändertes Bewusstsein (GCS <15), systolischer RR ≤100 mmHg. ≥2 Kriterien → hohes Sepsisrisiko, sofortige Eskalation.',
        },
        {
          name: 'SIRS-Kriterien',
          inhalt: 'Temperatur >38 °C oder <36 °C, Herzfrequenz >90/min, Atemfrequenz >20/min, Leukozyten >12.000 oder <4.000/µl. Hilft, die drohende Urosepsis zu erkennen.',
        },
      ],
      redFlags: [
        'Hypotonie, Tachykardie, Verwirrtheit → Urosepsis / drohender septischer Schock',
        'Harnstau im Ultraschall bei gleichzeitigem Fieber (infizierte Obstruktion) → urologischer Notfall, sofortige Harnableitung',
        'Anurie/Oligurie und Kreatininanstieg → akutes Nierenversagen',
        'Fehlende Besserung nach 48–72 h Antibiose → Nierenabszess oder paranephritischer Abszess',
        'Schwangerschaft → immer stationäre Aufnahme',
        'Diabetiker mit Luft im Nierenparenchym (CT) → emphysematöse Pyelonephritis, hohe Letalität',
      ],
      diagnostik: [
        {
          text: 'Anamnese und körperliche Untersuchung inkl. Prüfung des Nierenlagerklopfschmerzes und der Vitalparameter (Fieber, Kreislauf)',
        },
        {
          text: 'Urinstix: Nachweis von Leukozyten, Nitrit und Erythrozyten',
        },
        {
          text: 'Urinsediment: Leukozyturie, Bakteriurie, ggf. Leukozytenzylinder als Zeichen der Nierenbeteiligung',
        },
        {
          text: 'Urinkultur mit Antibiogramm/Resistogramm aus Mittelstrahlurin — zwingend VOR der ersten Antibiotikagabe',
        },
        {
          text: 'Labor: Blutbild (Leukozytose), CRP und Procalcitonin, Kreatinin/Harnstoff (Nierenfunktion), Blutzucker/HbA1c, Elektrolyte',
        },
        {
          text: 'Blutkultur bei Fieber und Sepsisverdacht',
          invasiv: true,
        },
        {
          text: 'Sonographie der Nieren und ableitenden Harnwege: Frage nach Harnstau, Abszess, Konkrementen, Restharn (erste Bildgebung)',
        },
        {
          text: 'CT-Abdomen mit Kontrastmittel bei Komplikation oder ausbleibendem Ansprechen: Abszess, emphysematöse Form, Obstruktion',
          invasiv: true,
        },
        {
          text: 'Ggf. Zystoskopie / retrograde Darstellung bzw. Harnableitung bei nachgewiesener Obstruktion',
          invasiv: true,
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Zystitis (untere Harnwegsinfektion)',
          unterscheidung: 'Dysurie und Pollakisurie OHNE Fieber, ohne Flankenschmerz und ohne klopfschmerzhaftes Nierenlager — das ist die klassische Prüferfrage ‚Warum Pyelonephritis und nicht Zystitis?‘.',
        },
        {
          dd: 'Nephrolithiasis / Nierenkolik',
          unterscheidung: 'Kolikartiger, wellenförmiger Flankenschmerz mit Ausstrahlung in Leiste/Genitale, Bewegungsdrang, Hämaturie, meist kein Fieber (außer bei infizierter Obstruktion).',
        },
        {
          dd: 'Adnexitis (bei der Frau)',
          unterscheidung: 'Tiefer Unterbauchschmerz, Portioschiebeschmerz, Fluor vaginalis, gynäkologische Anamnese; Nierenlager frei.',
        },
        {
          dd: 'Appendizitis',
          unterscheidung: 'Wandernder Schmerz in den rechten Unterbauch, McBurney-/Loslassschmerz, kein Miktionsbezug.',
        },
        {
          dd: 'Extrauteringravidität',
          unterscheidung: 'Bei Frau im gebärfähigen Alter: Amenorrhoe, positiver Schwangerschaftstest — nie vergessen.',
        },
        {
          dd: 'Basale Pneumonie',
          unterscheidung: 'Atemabhängiger Schmerz, Husten, auskultatorisches Rasseln; Röntgen-Thorax.',
        },
        {
          dd: 'Cholezystitis / Cholangitis',
          unterscheidung: 'Rechter Oberbauch, Murphy-Zeichen, bei Cholangitis Ikterus (Charcot-Trias).',
        },
      ],
      therapie: {
        konservativ: [
          'Stationäre Aufnahme bei Erbrechen, Sepsiszeichen, Schwangerschaft, komplizierter Form, Diabetes/Immunsuppression; ambulant nur bei unkomplizierter Form und gutem AZ',
          'Allgemein: ausreichende Flüssigkeitszufuhr (i.v. bei Erbrechen), körperliche Schonung',
          'Symptomatisch: Antipyretika/Analgetika mit Paracetamol oder Metamizol (CAVE Metamizol-/Novalginallergie im Fall Häberle → Paracetamol wählen), Spasmolytikum Butylscopolamin (Buscopan), Antiemetika',
          'Kalkulierte Antibiotikatherapie SOFORT nach Kulturabnahme; ambulant unkompliziert: Fluorchinolon (Ciprofloxacin/Levofloxacin) oder orales Cephalosporin',
          'Stationär: Cephalosporin der 3. Generation i.v. (Ceftriaxon/Cefotaxim) oder Fluorchinolon i.v.; bei schwerer/komplizierter Infektion Piperacillin/Tazobactam oder Carbapenem',
          'Deeskalation nach Antibiogramm, Gesamtdauer 7–14 Tage; in der Schwangerschaft Cephalosporine (Fluorchinolone kontraindiziert)',
        ],
        interventionell: [
          'Harnableitung bei infizierter Harnstauung als Notfall: innere DJ-Harnleiterschiene oder perkutane Nephrostomie',
          'Sonographisch/CT-gesteuerte Drainage eines Nieren- oder paranephritischen Abszesses',
        ],
        chirurgisch: [
          'Operative Abszessentlastung; bei Pyonephrose oder emphysematöser Pyelonephritis im äußersten Fall Nephrektomie',
        ],
      },
      prognose: 'Bei rechtzeitiger, adäquater antibiotischer Therapie sehr gut mit meist folgenloser Ausheilung. Komplikationen: Urosepsis, Nieren-/paranephritischer Abszess, akutes Nierenversagen, chronische Pyelonephritis mit narbiger Nierenschädigung und die seltene emphysematöse Pyelonephritis (v. a. Diabetiker, hohe Letalität). Rezidivneigung bei fortbestehenden Risikofaktoren (Harnstau, Diabetes, rezidivierende Zystitiden).',
      pruefungsfallen: [
        'Urinkultur (Mittelstrahlurin) IMMER VOR der ersten Antibiotikagabe abnehmen — wird laut Protokollen fast immer gefragt und oft vergessen.',
        'Den Nierenlagerklopfschmerz in der körperlichen Untersuchung ausdrücklich nennen — er trennt obere von unterer Harnwegsinfektion.',
        'Zystitis vs. Pyelonephritis sicher abgrenzen können: Fieber + Flanke + Klopfschmerz = oben.',
        'Bei der Frau im gebärfähigen Alter Schwangerschaftstest und EUG als DD nicht vergessen.',
        'Diabetiker/komplizierte Form NICHT einfach mit Rezept nach Hause schicken → stationäre Aufnahme wegen Komplikationsrisiko.',
        'Fieber trotz Antibiose >72 h → an Abszess oder Harnstau denken und Bildgebung (Sono/CT) veranlassen.',
        'CAVE Analgetika bei bekannter Allergie (Fall Häberle: Novalgin-/Metamizolallergie) — Alternative wählen.',
      ],
      askedInExam: [
        {
          frage: 'Welcher Erreger verursacht am häufigsten eine Pyelonephritis?',
          antwort: 'In über 80 % Escherichia coli aus der körpereigenen Darmflora, das über die Harnröhre aufsteigt.',
        },
        {
          frage: 'Welche Urinprobe nehmen Sie und wann?',
          antwort: 'Mittelstrahlurin für Urinstix und Urinkultur mit Antibiogramm, unbedingt VOR der ersten Antibiotikagabe.',
        },
        {
          frage: 'Was sehen Sie in der Sonographie?',
          antwort: 'Ich beurteile einen Harnstau des Nierenbeckenkelchsystems, Konkremente, einen Abszess und den Restharn; die Entzündung selbst ist sonographisch oft unauffällig.',
        },
        {
          frage: 'Welche Komplikation fürchten Sie am meisten?',
          antwort: 'Die Urosepsis; außerdem Nierenabszess und akutes Nierenversagen.',
        },
        {
          frage: 'Was ist eine Urosepsis? Erklären Sie sie.',
          antwort: 'Eine lebensbedrohliche systemische Entzündungsreaktion (Sepsis) mit Organdysfunktion, ausgehend vom Harntrakt. Sie erfordert sofortige i.v.-Antibiose, Volumengabe und bei Harnstau eine Harnableitung.',
        },
        {
          frage: 'Welches Antibiotikum geben Sie?',
          antwort: 'Kalkuliert ein Cephalosporin der 3. Generation i.v., zum Beispiel Ceftriaxon, oder ein Fluorchinolon wie Ciprofloxacin — nach Kulturabnahme, dann Anpassung nach Antibiogramm.',
        },
        {
          frage: 'Der Patient bessert sich trotz Antibiose nicht — was tun Sie?',
          antwort: 'An eine Komplikation denken: Umstellung auf ein Breitspektrumantibiotikum, Bildgebung mit CT zum Ausschluss von Abszess oder Harnstau und gegebenenfalls Harnableitung.',
        },
        {
          frage: 'Schicken Sie die Patientin mit einem Rezept nach Hause?',
          antwort: 'Nein — bei Diabetes und reduziertem Allgemeinzustand nehme ich sie wegen des erhöhten Komplikationsrisikos stationär auf.',
        },
        {
          frage: 'Warum Pyelonephritis und nicht Zystitis?',
          antwort: 'Weil Fieber, Flankenschmerz und ein klopfschmerzhaftes Nierenlager vorliegen — das spricht für eine Beteiligung des oberen Harntrakts und nicht nur der Blase.',
        },
        {
          frage: 'Welche Analgetika und Spasmolytika geben Sie?',
          antwort: 'Analgesie mit Paracetamol oder Metamizol — hier CAVE Novalginallergie, daher Paracetamol — und als Spasmolytikum Butylscopolamin (Buscopan).',
        },
      ],
      merksatz: 'Fieber + Flankenschmerz + klopfschmerzhaftes Nierenlager = obere Harnwegsinfektion (Pyelonephritis): IMMER Mittelstrahl-Urinkultur VOR der ersten Antibiotikagabe, dann kalkuliert Ceftriaxon oder Ciprofloxacin — und bei Harnstau mit Fieber sofort entlasten.',
      linkedCaseIds: [
        'case-pyelonephritis',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
  ];
}
