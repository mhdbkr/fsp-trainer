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
        'Welche Komplikationen der Leberzirrhose kennen Sie?',
        'Was ist eine hepatische Enzephalopathie und wie behandeln Sie sie?',
        'Wie gehen Sie bei einer akuten Ösophagusvarizenblutung vor?',
        'Hat sich der Patient schon einer Entwöhnungstherapie unterzogen?',
        'Was bedeutet der Child-Pugh-Score?',
      ],
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
        'Nennen Sie die kardiovaskulären Risikofaktoren.',
        'Wie unterscheiden Sie stabile von instabiler Angina pectoris?',
        'Welche Diagnostik in welcher Reihenfolge?',
        'Was ist der Unterschied zwischen NSTEMI und STEMI?',
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
      risikofaktoren: ['Cholelithiasis', 'Alkoholabusus', 'Hypertriglyzeridämie', 'Z. n. ERCP'],
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
        'Was sind die zwei häufigsten Ursachen der akuten Pankreatitis?',
        'Welcher Laborwert ist am wichtigsten?',
        'Wie sieht der Schmerz typischerweise aus?',
        'Wie behandeln Sie eine biliäre Pankreatitis?',
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
        'Was ist Meläna und was bedeutet sie?',
        'Nennen Sie die häufigsten Ursachen einer oberen GI-Blutung.',
        'Wie gehen Sie beim kreislaufinstabilen Patienten vor?',
        'Welche Rolle spielt die ÖGD?',
      ],
      linkedCaseIds: [],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: ['auf-gastroskopie'],
    },
  ];
}
