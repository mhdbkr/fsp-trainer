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
  ];
}
