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
        { stufe: 'Labor', text: 'Labor: γGT, AP, GOT/GPT, Bilirubin, Albumin↓, Quick↓/INR↑, Thrombozyten↓' },
        { stufe: 'Apparativ & Bildgebung', text: 'Abdomen-Sonographie: höckerige Leberoberfläche, Splenomegalie, Aszites' },
        { stufe: 'Apparativ & Bildgebung', text: 'Duplex-Sonographie der Pfortader (portale Hypertension)' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT/MRT-Abdomen zur Beurteilung + HCC-Ausschluss' },
        { stufe: 'Invasiv & Speziell', text: 'ÖGD zum Nachweis von Ösophagus-/Fundusvarizen' },
        { stufe: 'Invasiv & Speziell', text: 'Aszitespunktion (SAAG, Zellzahl — SBP-Ausschluss)' },
        { stufe: 'Invasiv & Speziell', text: 'Ggf. Leberbiopsie zur Ätiologieklärung' },
      ],
      differenzialdiagnosen: [
        { dd: 'Hepatozelluläres Karzinom (HCC)', unterscheidung: 'Fokale Läsion im Bild, AFP↑; entwickelt sich oft auf Zirrhoseboden.' },
        { dd: 'Rechtsherzinsuffizienz', unterscheidung: 'Gestaute Halsvenen, kardiale Vorgeschichte; Aszites kardialer Genese.' },
        { dd: 'Peritonealkarzinose', unterscheidung: 'Bekannter Primärtumor, Aszites mit malignen Zellen.' },
        { dd: 'Nephrotisches Syndrom', unterscheidung: 'Massive Proteinurie, Hypalbuminämie renaler Genese.' },
      ],
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Absolute Alkoholabstinenz (kausal bei alkoholischer Genese)',
            'Behandlung der Grundkrankheit (antivirale Therapie bei Hepatitis)',
            'Aszites: Kochsalzrestriktion, Spironolacton + Schleifendiuretika',
            'Ösophagusvarizen: nicht-selektive Betablocker zur Prophylaxe',
            'Hepatische Enzephalopathie: Lactulose, Rifaximin, Eiweißmodulation',
          ],
        },
        {
          label: 'Interventionell',
          items: [
            'Endoskopische Varizenligatur / Sklerosierung',
            'TIPS (transjugulärer intrahepatischer portosystemischer Shunt) bei refraktärem Aszites/Varizen',
            'Therapeutische Aszitespunktion (mit Albumingabe)',
          ],
        },
        {
          label: 'Chirurgisch',
          items: [
            'Lebertransplantation (einzige kurative Option im Endstadium)',
          ],
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Anamnese + Risikofaktoren, körperliche Untersuchung' },
        { stufe: 'Labor', text: 'Ruhe-EKG (oft unauffällig bei stabiler AP)' },
        { stufe: 'Labor', text: 'Labor: Troponin (Ausschluss Infarkt), Lipide, HbA1c' },
        { stufe: 'Apparativ & Bildgebung', text: 'Belastungs-EKG (Ergometrie), Stressechokardiographie' },
        { stufe: 'Apparativ & Bildgebung', text: 'Myokardperfusionsszintigraphie, Kardio-CT/-MRT' },
        { stufe: 'Invasiv & Speziell', text: 'Koronarangiographie (Goldstandard, ggf. mit Intervention)' },
      ],
      differenzialdiagnosen: [
        { dd: 'Akuter Myokardinfarkt / ACS', unterscheidung: 'Ruheschmerz >20 min, Troponin↑, EKG-Veränderungen.' },
        { dd: 'Lungenembolie', unterscheidung: 'Akute Dyspnoe, atemabhängiger Schmerz, D-Dimere↑, Risikofaktoren TVT.' },
        { dd: 'Aortendissektion', unterscheidung: 'Vernichtungsschmerz mit Ausstrahlung in den Rücken, RR-Differenz.' },
        { dd: 'Refluxkrankheit / Ösophagusspasmus', unterscheidung: 'Nahrungsabhängig, brennend, Besserung auf PPI.' },
        { dd: 'Costochondritis / muskuloskelettal', unterscheidung: 'Druckschmerz, bewegungs-/atemabhängig.' },
      ],
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Akut: Ruhe, Nitroglycerin, O2 bei Hypoxie',
            'Risikofaktoren-Management (Blutdruck, Diabetes, Nikotinkarenz)',
            'Medikamentös: ASS, Statin, Betablocker, ggf. Ca-Antagonist / Langzeitnitrat',
          ],
          akut: true,
        },
        {
          label: 'Interventionell',
          items: [
            'PTCA (Ballondilatation) mit Stentimplantation',
          ],
        },
        {
          label: 'Chirurgisch',
          items: [
            'Aortokoronare Bypass-Operation (ACVB) bei Mehrgefäß-/Hauptstammbefall',
          ],
        },
      ],
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
        { stufe: 'Labor', text: 'Labor: Lipase (>3-fach), Amylase, CRP, Kalzium, Triglyzeride, Leberwerte' },
        { stufe: 'Apparativ & Bildgebung', text: 'Abdomen-Sonographie: Gallensteine, Pankreasödem, freie Flüssigkeit' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT-Abdomen mit KM (Nekrosenachweis, ab 72 h aussagekräftig)' },
        { stufe: 'Invasiv & Speziell', text: 'ERCP bei biliärer Genese mit Cholestase/Cholangitis (therapeutisch)' },
      ],
      differenzialdiagnosen: [
        { dd: 'Perforiertes Ulkus', unterscheidung: 'Brettharter Bauch, freie Luft im Röntgen/CT.' },
        { dd: 'Akute Cholezystitis', unterscheidung: 'Rechtsseitiger Oberbauchschmerz, Murphy-Zeichen positiv.' },
        { dd: 'Myokardinfarkt (Hinterwand)', unterscheidung: 'EKG-Veränderungen, Troponin↑.' },
        { dd: 'Mesenterialischämie', unterscheidung: 'Schmerz > Befund, Laktat↑, Vorhofflimmern.' },
      ],
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Intensive Flüssigkeitssubstitution (Volumentherapie)',
            'Ausreichende Analgesie (z. B. Metamizol, Opioide)',
            'Frühe enterale Ernährung nach Toleranz',
            'Bei Alkoholgenese: Abstinenz; bei Hypertriglyzeridämie: Senkung',
          ],
        },
        {
          label: 'Interventionell',
          items: [
            'ERCP mit Papillotomie bei biliärer Pankreatitis mit Obstruktion',
          ],
        },
        {
          label: 'Chirurgisch',
          items: [
            'Nekrosektomie nur bei infizierten Nekrosen (spät, wenn nötig)',
            'Cholezystektomie im Verlauf bei biliärer Genese',
          ],
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Anamnese: NSAR, Alkohol, Vorerkrankungen (Zirrhose)' },
        { stufe: 'Labor', text: 'Kreislaufmonitoring, Labor: BB (Hb), Gerinnung, Blutgruppe + Kreuzblut' },
        { stufe: 'Invasiv & Speziell', text: 'Notfall-ÖGD (Diagnostik UND Therapie: Ligatur, Clip, Sklerosierung)' },
      ],
      differenzialdiagnosen: [
        { dd: 'Untere GI-Blutung', unterscheidung: 'Hämatochezie ohne Hämatemesis; Quelle distal des Treitz-Bandes.' },
        { dd: 'Bluthusten (Hämoptyse)', unterscheidung: 'Hellrotes, schaumiges Blut aus den Atemwegen, nicht erbrochen.' },
        { dd: 'Pseudomeläna', unterscheidung: 'Schwarzer Stuhl durch Eisen/Kohle/Heidelbeeren, kein Blut.' },
      ],
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Stabilisierung: großlumige venöse Zugänge, Volumen, ggf. Transfusion',
            'PPI hochdosiert i. v.',
            'Bei Varizen: Terlipressin + Antibiotikaprophylaxe',
            'Antikoagulation pausieren/antagonisieren',
          ],
          akut: true,
        },
        {
          label: 'Interventionell',
          items: [
            'Endoskopische Blutstillung (Ligatur, Clip, Adrenalininjektion, Sklerosierung)',
            'Angiographische Embolisation bei Versagen',
          ],
        },
        {
          label: 'Chirurgisch',
          items: [
            'Notfall-OP bei endoskopisch nicht beherrschbarer Blutung',
          ],
          akut: true,
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Anamnese: Schmerzcharakter und Zeitbezug zum Essen, NSAR-/ASS- und Kortisoneinnahme, Selbstmedikation, Stress, Noxen, frühere Ulzera' },
        { stufe: 'Labor', text: 'Labor: Blutbild (Anämie bei chronischem Blutverlust), ggf. Gerinnung; bei rezidivierenden/atypischen Ulzera Gastrin (Zollinger-Ellison)' },
        { stufe: 'Labor', text: 'Nicht-invasiver H.-pylori-Nachweis: 13C-Harnstoff-Atemtest oder Stuhl-Antigen-Test (Cave: PPI ≥ 2 Wochen vorher pausieren, sonst falsch negativ)' },
        { stufe: 'Invasiv & Speziell', text: 'Körperliche Untersuchung: epigastrischer Druckschmerz, Prüfung auf Abwehrspannung; digital-rektale Untersuchung auf Meläna' },
        { stufe: 'Invasiv & Speziell', text: 'ÖGD (Ösophago-Gastro-Duodenoskopie) — Goldstandard: direkte Darstellung, Lokalisation und Biopsie des Ulkus' },
        { stufe: 'Invasiv & Speziell', text: 'Biopsie: bei jedem Ulcus ventriculi obligat zum Malignitätsausschluss; zugleich Urease-Schnelltest (CLO-Test) und Histologie auf H. pylori' },
        { stufe: 'Invasiv & Speziell', text: 'Kontroll-ÖGD des Magenulkus nach 6–8 Wochen zur Bestätigung der Abheilung und erneuter Biopsie (Karzinomausschluss)' },
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
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Protonenpumpeninhibitor (z. B. Pantoprazol 40 mg 1-0-0) über 4–8 Wochen als Basistherapie',
            'Auslösende NSAR/ASS absetzen oder pausieren; Bedarfsanalgesie auf Paracetamol umstellen',
            'Noxenkarenz: Nikotin- und Alkoholverzicht, Stressreduktion',
            'Bei H.-pylori-Nachweis Eradikation: italienische Triple-Therapie (PPI + Clarithromycin + Metronidazol) oder französische Variante (PPI + Clarithromycin + Amoxicillin) über 7–14 Tage; bei Resistenz Bismut-Quadrupeltherapie',
            'Eradikationskontrolle nach frühestens 4 Wochen (13C-Atemtest oder Stuhl-Antigen)',
            'Bei fortgesetzter NSAR-Notwendigkeit begleitende PPI-Prophylaxe',
          ],
        },
        {
          label: 'Interventionell',
          items: [
            'Endoskopische Blutstillung bei blutendem Ulkus (Adrenalininjektion, Clip, Thermokoagulation) nach Forrest-Stadium',
            'Endoskopische Ballondilatation bei narbiger Magenausgangsstenose',
          ],
        },
        {
          label: 'Chirurgisch',
          items: [
            'Notfalloperation bei Perforation: Übernähung/Exzision und Lavage',
            'Operation bei endoskopisch nicht beherrschbarer Blutung oder therapierefraktärer Stenose',
            'Resektion (z. B. Billroth) bei malignem Befund oder Komplikationen',
          ],
          akut: true,
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Test auf okkultes Blut im Stuhl' },
        { stufe: 'Labor', text: 'Labor: Blutbild (Anämie), Eisen und Ferritin, Entzündungsparameter, Leberwerte; Tumormarker CA 72-4, CEA und CA 19-9 nur zur Verlaufs- und Therapiekontrolle, nicht zur Diagnosestellung' },
        { stufe: 'Apparativ & Bildgebung', text: 'Abdomen-Sonographie: Lebermetastasen, Aszites, Lymphadenopathie' },
        { stufe: 'Apparativ & Bildgebung', text: 'Endosonographie zur Beurteilung der Wandinfiltrationstiefe (T) und der regionären Lymphknoten (N)' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT von Thorax und Abdomen mit Kontrastmittel zum Staging (Fernmetastasen, insbesondere pulmonal und hepatisch)' },
        { stufe: 'Invasiv & Speziell', text: 'Anamnese und körperliche Untersuchung: Abdomenpalpation (Resistenz), Lymphknotenstatus (Virchow-Lymphknoten links supraklavikulär), digital-rektale Untersuchung' },
        { stufe: 'Invasiv & Speziell', text: 'Ösophago-Gastro-Duodenoskopie (ÖGD) mit Biopsie — Goldstandard zur Diagnosesicherung durch Histologie' },
        { stufe: 'Invasiv & Speziell', text: 'Diagnostische Laparoskopie zum Ausschluss einer Peritonealkarzinose bei lokal fortgeschrittenem Befund' },
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
      therapie: [
        {
          label: 'Systemtherapie / (neo)adjuvant',
          items: [
            'Perioperative (neoadjuvante und adjuvante) Chemotherapie nach dem FLOT-Schema bei lokal fortgeschrittenem, resektablem Karzinom',
            'Palliative Chemotherapie bei metastasiertem Stadium; bei HER2-Überexpression zusätzlich Trastuzumab',
            'Helicobacter-pylori-Eradikation (Triple-Therapie) — kurativ beim frühen MALT-Lymphom, kausal bei Risikoschleimhaut',
            'Ernährungstherapie / Ernährungsberatung, Substitution (Eisen, Vitamin B12 nach Gastrektomie)',
            'Psychoonkologische Begleitung und Schmerz-/Palliativtherapie',
          ],
        },
        {
          label: 'Endoskopisch / palliativ',
          items: [
            'Endoskopische Mukosaresektion (EMR) bzw. Submukosadissektion (ESD) beim mukosalen Frühkarzinom (gut differenziert, ohne Lymphgefäßinvasion)',
            'Endoskopische Stentimplantation bei stenosierendem Tumor zur Sicherung der Passage',
            'Endoskopische Blutstillung bei tumorbedingter Blutung',
          ],
        },
        {
          label: 'Chirurgisch (kurativ)',
          items: [
            'Subtotale Gastrektomie bei distalem Sitz bzw. totale Gastrektomie bei proximalem/diffusem Befall, jeweils mit D2-Lymphadenektomie — kurativer Ansatz',
            'Bei ösophagogastralem Übergang (AEG) erweiterte transhiatale bzw. abdominothorakale Resektion',
            'Palliative Verfahren (Gastroenterostomie/Bypass) bei nicht resektabler Stenose',
          ],
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Anamnese und körperliche Untersuchung mit Appendizitiszeichen (McBurney, Blumberg, Rovsing, Psoas); rektale digitale Untersuchung (Douglas-Schmerz)' },
        { stufe: 'Anamnese/Klinik', text: 'Vitalparameter und rektoaxilläre Temperaturmessung (Differenz > 1 °C spricht für einen entzündlichen Prozess)' },
        { stufe: 'Anamnese/Klinik', text: 'Schwangerschaftstest (β-hCG) bei jeder Frau im gebärfähigen Alter (Ausschluss Extrauteringravidität)' },
        { stufe: 'Labor', text: 'Labor: Blutbild (Leukozytose mit Linksverschiebung), CRP-Erhöhung, ggf. BSG' },
        { stufe: 'Labor', text: 'Urinstatus zum Ausschluss eines Harnwegsinfekts / einer Urolithiasis (Differenzialdiagnose)' },
        { stufe: 'Apparativ & Bildgebung', text: 'Abdomen-Sonographie: aufgetriebene, nicht komprimierbare Appendix > 6 mm, Kokardenphänomen (Zielscheibe), freie Flüssigkeit, ggf. Kotstein' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT-Abdomen bei unklarem Sonographiebefund, adipösen oder älteren Patienten (höhere Sensitivität)' },
        { stufe: 'Invasiv & Speziell', text: 'Diagnostische Laparoskopie bei weiterhin unklarem Befund – zugleich therapeutisch (Appendektomie in gleicher Sitzung)' },
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
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Nahrungskarenz, intravenöse Flüssigkeitssubstitution und Analgesie zur OP-Vorbereitung',
            'Perioperative kalkulierte Antibiotikaprophylaxe (z. B. Cephalosporin + Metronidazol)',
            'Rein antibiotisch-konservatives Vorgehen nur in ausgewählten Fällen unkomplizierter Appendizitis oder bei OP-Kontraindikation (erhöhtes Rezidivrisiko)',
          ],
        },
        {
          label: 'Interventionell',
          items: [
            'Ultraschall-/CT-gesteuerte Drainage eines perityphlitischen Abszesses mit anschließender Intervall-Appendektomie',
          ],
        },
        {
          label: 'Chirurgisch',
          items: [
            'Laparoskopische Appendektomie (\'Schlüsselloch-Operation\') als Goldstandard – Standardverfahren bei unkomplizierter Appendizitis',
            'Offene (konventionelle) Appendektomie über Wechselschnitt bei Perforation, ausgedehnter Peritonitis oder Verwachsungen',
            'Bei Perforation zusätzlich intraabdominelle Lavage und postoperative therapeutische Antibiose',
          ],
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Psychopathologischer Befund und Exploration (u. a. nach AMDP): Stimmung, Antrieb, Schlaf, Tagesverlauf, Denkinhalte, Konzentration' },
        { stufe: 'Anamnese/Klinik', text: 'Aktive und explizite Abschätzung der Suizidalität (Gedanken, Pläne, Vorbereitungen, Absprachefähigkeit) — immer erfragen' },
        { stufe: 'Anamnese/Klinik', text: 'Erhebung des Auslösers und der psychosozialen Situation sowie Fremdanamnese (Angehörige)' },
        { stufe: 'Anamnese/Klinik', text: 'Frühere manische oder hypomane Phasen erfragen, um eine bipolare Störung auszuschließen' },
        { stufe: 'Anamnese/Klinik', text: 'Körperliche und orientierend neurologische Untersuchung zum Ausschluss organischer Ursachen' },
        { stufe: 'Apparativ & Bildgebung', text: '12-Kanal-EKG vor Beginn einer antidepressiven Medikation (QT-Zeit-Kontrolle)' },
        { stufe: 'Invasiv & Speziell', text: 'Psychiatrisches Konsil zur weiteren Behandlungsplanung veranlassen' },
        { stufe: 'Labor', text: 'Standardisierte Skalen zur Schweregradbeurteilung und Verlaufskontrolle (PHQ-9, BDI, HAMD)' },
        { stufe: 'Labor', text: 'Labor zum Ausschluss sekundärer Ursachen: TSH, fT3/fT4 (Hypothyreose), Blutbild (Anämie), Vitamin B12 und Folsäure, Blutzucker/HbA1c, Elektrolyte, Leber- und Nierenwerte, ggf. CRP' },
        { stufe: 'Apparativ & Bildgebung', text: 'Kraniale Bildgebung (cCT/cMRT) bei atypischer Präsentation, Erstmanifestation im höheren Alter oder neurologischen Auffälligkeiten' },
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
      therapie: [
        {
          label: 'Psychotherapie & Basismaßnahmen',
          items: [
            'Tragfähige therapeutische Beziehung, Psychoedukation und Aufklärung über Krankheitsbild und Verlauf',
            'Psychotherapie (kognitive Verhaltenstherapie, interpersonelle Therapie) — bei leichter Episode als alleinige Maßnahme möglich',
            'Pharmakotherapie: SSRI als Mittel der 1. Wahl (z. B. Citalopram, Sertralin); Alternativen SNRI (Venlafaxin, Duloxetin), Mirtazapin (günstig bei Schlafstörung und Appetitverlust), trizyklische Antidepressiva als Reserve',
            'Wirklatenz von 2–3 Wochen aufklären; Cave erhöhtes Suizidrisiko in der frühen Antriebssteigerungsphase',
            'Kombination aus Psychotherapie und Pharmakotherapie bei mittelschwerer bis schwerer Episode',
            'Begleitend Tagesstrukturierung, Schlafhygiene, körperliche Aktivierung und Einbindung des sozialen Umfelds',
            'Psychiatrisches Konsil veranlassen; nach Remission Erhaltungstherapie über mindestens 6 Monate (Rezidivprophylaxe länger)',
          ],
        },
        {
          label: 'Pharmakotherapie',
          items: [
            'Stationäre Aufnahme bei Suizidalität, psychotischen Symptomen oder Selbstgefährdung — bei fehlender Absprachefähigkeit ggf. Unterbringung nach PsychKG/BW',
            'Elektrokonvulsionstherapie (EKT) bei therapieresistenter oder schwerer wahnhafter Depression und beim depressiven Stupor',
            'Ergänzend Lichttherapie (saisonale Depression), Wachtherapie (Schlafentzug) und repetitive transkranielle Magnetstimulation (rTMS)',
          ],
        },
        {
          label: 'Bei Therapieresistenz / Krise',
          items: [
            'Keine chirurgische Standardtherapie; die tiefe Hirnstimulation bleibt experimentellen Fällen therapierefraktärer Depression im Studienrahmen vorbehalten.',
          ],
        },
      ],
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
        { stufe: 'Anamnese/Klinik', text: 'Vitalparametermessung inklusive Pulsoxymetrie (SpO2) zur Einschätzung der Oxygenierung' },
        { stufe: 'Anamnese/Klinik', text: 'Körperliche Untersuchung — Inspektion: Tachypnoe, Zyanose, Nasenflügeln; Palpation: verstärkter Stimmfremitus über dem Infiltrat; Perkussion: Klopfschalldämpfung; Auskultation: klingende feinblasige Rasselgeräusche, Bronchialatmen, verstärkte Bronchophonie' },
        { stufe: 'Labor', text: 'Labor: Blutbild (Leukozytose mit Neutrophilie und Linksverschiebung), CRP und BSG erhöht, Prokalzitonin (bakterielle Genese), Elektrolyte (Hyponatriämie bei Legionellen), Harnstoff/Kreatinin (für CURB-65), Leberwerte, Blutzucker und HbA1c' },
        { stufe: 'Labor', text: 'Arterielle Blutgasanalyse (BGA) zur Beurteilung von Oxygenierung und respiratorischer Insuffizienz' },
        { stufe: 'Labor', text: 'Mikrobiologie: Sputumkultur mit Antibiogramm und 2 Blutkulturen — jeweils VOR der ersten Antibiotikagabe abnehmen; Legionellen- und Pneumokokken-Antigen im Urin; Nasen-Rachen-Abstrich (Influenza-/SARS-CoV-2-PCR)' },
        { stufe: 'Apparativ & Bildgebung', text: 'Thorax-Sonographie: Nachweis von Infiltrat, Pleuraerguss, Hepatisation des minderbelüfteten Lungengewebes und B-Linien' },
        { stufe: 'Apparativ & Bildgebung', text: 'Röntgen-Thorax in zwei Ebenen: Infiltratnachweis (lobär/segmental bei typischer, diffus interstitiell bei atypischer Pneumonie), positives Bronchopneumogramm, Erguss- und Verlaufsbeurteilung' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT-Thorax bei unklarem Röntgenbefund, Komplikationsverdacht oder Immunsuppression' },
        { stufe: 'Invasiv & Speziell', text: 'Diagnostische Pleurapunktion bei relevantem Pleuraerguss (Ausschluss eines Empyems)' },
        { stufe: 'Invasiv & Speziell', text: 'Bronchoskopie mit bronchoalveolärer Lavage (BAL) bei therapierefraktärem Verlauf oder Immunsuppression zur gezielten Erregersicherung' },
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
      therapie: [
        {
          label: 'Allgemeinmaßnahmen',
          items: [
            'Allgemeinmaßnahmen: körperliche Schonung, ausreichende Flüssigkeitszufuhr, Antipyrese/Analgesie (bevorzugt Paracetamol; NSAR mit Vorsicht bei RAAS-Hemmer/Diuretikum oder Exsikkose), Sauerstoffgabe bei SpO2 < 92 %, Sekretolyse und Atemtherapie/Mobilisation, Thromboseprophylaxe bei stationärer Aufnahme',
            'Kalkulierte (empirische) Antibiose je nach Schweregrad — leichte ambulante CAP: Amoxicillin; bei Penicillinallergie Makrolid (Clarithromycin/Azithromycin) oder Doxycyclin',
            'Mittelschwere/schwere, stationäre CAP: Aminopenicillin + β-Laktamase-Inhibitor (Ampicillin/Sulbactam) oder Cephalosporin (Ceftriaxon/Cefotaxim), kombiniert mit einem Makrolid',
            'Bei Penicillinallergie (wie hier): stationär ein respiratorisches Fluorchinolon (Levofloxacin/Moxifloxacin) als Monotherapie der Wahl — ein Makrolid allein genügt nur ambulant bei leichter CAP',
            'Deeskalation der Antibiose nach Sputum-/Blutkultur und Antibiogramm; Therapiedauer meist 5–7 Tage',
            'Prophylaxe: Pneumokokken- und jährliche Influenzaimpfung; gute Diabeteseinstellung',
          ],
        },
        {
          label: 'Antibiotische Therapie',
          items: [
            'Diagnostische und ggf. therapeutische Pleurapunktion, bei Empyem Anlage einer Thoraxdrainage',
            'Bronchoskopische Sekretabsaugung und BAL zur Erregersicherung bei Sekretretention oder Immunsuppression',
            'Intensivmedizinische Betreuung mit nicht-invasiver (NIV) oder invasiver Beatmung bei respiratorischer Insuffizienz oder Sepsis',
          ],
        },
        {
          label: 'Bei Komplikationen',
          items: [
            'Operative Sanierung (Dekortikation, videoassistierte Thorakoskopie/VATS) bei gekammertem, chronischem Pleuraempyem',
            'Operative Ausräumung eines konservativ/interventionell nicht beherrschbaren Lungenabszesses',
          ],
        },
      ],
      prognose: 'Bei jüngeren, gesunden Patienten mit leichter CAP meist folgenlose Ausheilung. Die Prognose verschlechtert sich mit steigendem Alter, Komorbidität (Diabetes mellitus, Immunsuppression) und Schweregrad (CURB-65). Eine schwere CAP mit Sepsis oder respiratorischer Insuffizienz hat eine erhebliche Letalität. Mögliche Komplikationen: parapneumonischer Pleuraerguss und Pleuraempyem, Lungenabszess, respiratorische Insuffizienz, ARDS und Sepsis.',
      pruefungsfallen: [
        'Immer den Typ der Pneumonie benennen UND begründen: "ambulant erworben, da in den letzten 48 Stunden bzw. Tagen keine Hospitalisierung" — sehr häufige Prüferfrage.',
        'Immunsuppression (Diabetes mellitus, Strahlentherapie/Zytostatika) erkennen: rechtfertigt eine stationäre, oft intensivmedizinische Aufnahme — nicht als banale ambulante CAP abtun.',
        'Penicillinallergie beachten: keine Aminopenicilline, Cephalosporine nur bei gesicherter Verträglichkeit (Kreuzreaktion) → ambulant Makrolid/Doxycyclin, stationär respiratorisches Fluorchinolon nennen können.',
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
          antwort: 'Bei diesem stationären Patienten ein respiratorisches Fluorchinolon wie Levofloxacin oder Moxifloxacin — ein Makrolid allein würde nur ambulant bei leichter CAP genügen. Aminopenicilline meide ich wegen der Allergie; Cephalosporine nur bei gesicherter Verträglichkeit (Kreuzreaktion).',
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
      merksatz: 'Merke: Bei der CAP immer den Typ begründen ("ambulant erworben, keine Hospitalisierung") und den Schweregrad mit CURB-65 abschätzen; Blut- und Sputumkultur vor der kalkulierten Antibiose abnehmen — bei Penicillinallergie ambulant ein Makrolid, stationär ein respiratorisches Fluorchinolon wählen.',
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
        { stufe: 'Anamnese/Klinik', text: 'Anamnese und körperliche Untersuchung inkl. Prüfung des Nierenlagerklopfschmerzes und der Vitalparameter (Fieber, Kreislauf)' },
        { stufe: 'Labor', text: 'Urinstix: Nachweis von Leukozyten, Nitrit und Erythrozyten' },
        { stufe: 'Labor', text: 'Urinsediment: Leukozyturie, Bakteriurie, ggf. Leukozytenzylinder als Zeichen der Nierenbeteiligung' },
        { stufe: 'Labor', text: 'Urinkultur mit Antibiogramm/Resistogramm aus Mittelstrahlurin — zwingend VOR der ersten Antibiotikagabe' },
        { stufe: 'Labor', text: 'Labor: Blutbild (Leukozytose), CRP und Procalcitonin, Kreatinin/Harnstoff (Nierenfunktion), Blutzucker/HbA1c, Elektrolyte' },
        { stufe: 'Labor', text: 'Blutkultur bei Fieber und Sepsisverdacht' },
        { stufe: 'Apparativ & Bildgebung', text: 'Sonographie der Nieren und ableitenden Harnwege: Frage nach Harnstau, Abszess, Konkrementen, Restharn (erste Bildgebung)' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT-Abdomen mit Kontrastmittel bei Komplikation oder ausbleibendem Ansprechen: Abszess, emphysematöse Form, Obstruktion' },
        { stufe: 'Invasiv & Speziell', text: 'Ggf. Zystoskopie / retrograde Darstellung bzw. Harnableitung bei nachgewiesener Obstruktion' },
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
      therapie: [
        {
          label: 'Antibiotische Therapie & Allgemeinmaßnahmen',
          items: [
            'Stationäre Aufnahme bei Erbrechen, Sepsiszeichen, Schwangerschaft, komplizierter Form, Diabetes/Immunsuppression; ambulant nur bei unkomplizierter Form und gutem AZ',
            'Allgemein: ausreichende Flüssigkeitszufuhr (i.v. bei Erbrechen), körperliche Schonung',
            'Symptomatisch: Antipyretika/Analgetika mit Paracetamol oder Metamizol (CAVE Metamizol-/Novalginallergie im Fall Häberle → Paracetamol wählen), Spasmolytikum Butylscopolamin (Buscopan), Antiemetika',
            'Kalkulierte Antibiotikatherapie SOFORT nach Kulturabnahme; ambulant unkompliziert: Fluorchinolon (Ciprofloxacin/Levofloxacin) oder orales Cephalosporin',
            'Stationär: Cephalosporin der 3. Generation i.v. (Ceftriaxon/Cefotaxim) oder Fluorchinolon i.v.; bei schwerer/komplizierter Infektion Piperacillin/Tazobactam oder Carbapenem',
            'Deeskalation nach Antibiogramm, Gesamtdauer 7–14 Tage; in der Schwangerschaft Cephalosporine (Fluorchinolone kontraindiziert)',
          ],
          akut: true,
        },
        {
          label: 'Harnableitung bei Obstruktion',
          items: [
            'Harnableitung bei infizierter Harnstauung als Notfall: innere DJ-Harnleiterschiene oder perkutane Nephrostomie',
            'Sonographisch/CT-gesteuerte Drainage eines Nieren- oder paranephritischen Abszesses',
          ],
          akut: true,
        },
        {
          label: 'Bei Abszess / Komplikation',
          items: [
            'Operative Abszessentlastung; bei Pyonephrose oder emphysematöser Pyelonephritis im äußersten Fall Nephrektomie',
          ],
        },
      ],
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
    {
      id: 'fw-pavk',
      pathology: 'Periphere arterielle Verschlusskrankheit (pAVK)',
      specialty: 'Kardiologie',
      definition: 'Chronische, meist atherosklerotisch bedingte Stenosierung oder Verschluss der extremitätenversorgenden Arterien (überwiegend der unteren Extremität), die zu einer belastungsabhängigen Minderdurchblutung (Ischämie) führt. Leitsymptom ist die Claudicatio intermittens („Schaufensterkrankheit“): ein belastungsabhängiger, krampfartiger Muskelschmerz (typisch in der Wade), der den Patienten zum Stehenbleiben zwingt und sich in Ruhe innerhalb weniger Minuten bessert. Der volkstümliche Name rührt daher, dass die Betroffenen wie beim Schaufensterbummeln immer wieder stehen bleiben müssen, um den Schmerz abklingen zu lassen. Die pAVK ist Ausdruck einer generalisierten Atherosklerose und damit ein Marker für ein hohes kardiovaskuläres Gesamtrisiko (KHK, Karotisstenose).',
      aetiologie: 'In über 90 % der Fälle Folge einer Atherosklerose (arteriosklerotische Plaques mit Lumeneinengung). Die Lokalisation bestimmt die Symptomhöhe: Beckentyp (aortoiliakal, ca. 35 %) verursacht Gluteal-/Oberschenkelschmerz, der Oberschenkeltyp (femoropopliteal, ca. 50 %, häufigster Typ) Wadenschmerz, der Unterschenkeltyp (kruropedal, ca. 15 %, gehäuft bei Diabetikern) Fußschmerz. Seltene, nicht-atherosklerotische Ursachen: Thrombangiitis obliterans (Morbus Winiwarter-Buerger, junge Raucher), Vaskulitiden, Entrapment-Syndrom der A. poplitea, fibromuskuläre Dysplasie sowie kardiale/arterielle Embolien (dann eher akuter Verschluss). Ein kompletter Verschluss der distalen Aorta bzw. beider Beckenarterien wird als Leriche-Syndrom bezeichnet (Trias: Claudicatio beidseits/gluteal, fehlende Leistenpulse, erektile Dysfunktion).',
      risikofaktoren: [
        'Nikotinabusus — der wichtigste und stärkste Risikofaktor (im Fall 45 Packyears)',
        'Diabetes mellitus (fördert v. a. den distalen Unterschenkeltyp und Mediasklerose)',
        'Arterielle Hypertonie',
        'Hyperlipidämie / Hypercholesterinämie (LDL↑)',
        'Höheres Lebensalter und männliches Geschlecht',
        'Positive Familienanamnese für Atherosklerose (KHK, Apoplex, pAVK)',
        'Hyperhomocysteinämie',
        'Chronische Niereninsuffizienz',
        'Adipositas und Bewegungsmangel',
      ],
      klinik: [
        {
          text: 'Claudicatio intermittens: belastungsabhängiger, krampfartiger Wadenschmerz, der nach einer reproduzierbaren Gehstrecke auftritt, zum Stehenbleiben zwingt und sich in Ruhe binnen Minuten bessert',
        },
        {
          text: 'Verkürzte, reproduzierbare schmerzfreie Gehstrecke (z. B. 50–100 m); Verschlechterung bergauf oder bei schnellem Gehen',
        },
        {
          text: 'Betroffenes Bein kühl, blass, mit abgeschwächten oder fehlenden Fußpulsen (A. dorsalis pedis, A. tibialis posterior)',
        },
        {
          text: 'Trophische Störungen bei fortgeschrittenem Befund: Haarverlust, brüchige Nägel, glänzend-atrophe Haut, verzögerte Wundheilung',
        },
        {
          text: 'Ruheschmerz — typischerweise nachts im Liegen, Besserung durch Tieflagerung des Beins (Herabhängen aus dem Bett) — signalisiert kritische Ischämie (ab Stadium III)',
          atypisch: true,
        },
        {
          text: 'Schlecht heilende Ulzera, Nekrosen oder Gangrän an Zehen/Ferse/Druckstellen (Stadium IV)',
          atypisch: true,
        },
        {
          text: 'Beim Diabetiker durch begleitende Polyneuropathie oft schmerzarm/stumm — die Ischämie wird erst über ein Ulkus oder eine Gangrän auffällig (Cave: verschleppte Diagnose)',
          atypisch: true,
        },
        {
          text: 'Erektile Dysfunktion in Kombination mit gluteal-beidseitiger Claudicatio und fehlenden Leistenpulsen → Leriche-Syndrom (aortoiliakaler Verschluss)',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Fontaine-Klassifikation (in Deutschland gebräuchlich)',
          inhalt: 'Stadium I: asymptomatische Stenose (nur apparativ nachweisbar). Stadium II: Claudicatio intermittens — IIa schmerzfreie Gehstrecke > 200 m, IIb < 200 m. Stadium III: ischämischer Ruheschmerz. Stadium IV: trophische Läsion — Ulkus, Nekrose, Gangrän. Ab Stadium III spricht man von kritischer Extremitätenischämie (CLI).',
        },
        {
          name: 'Rutherford-Klassifikation (angloamerikanisch)',
          inhalt: 'Kategorie 0: asymptomatisch. Kategorie 1–3: milde / mäßige / schwere Claudicatio. Kategorie 4: Ruheschmerz. Kategorie 5: geringer Gewebeverlust (kleine Nekrose). Kategorie 6: großer Gewebeverlust / ausgedehnte Gangrän. Feinere Abstufung als Fontaine.',
        },
        {
          name: 'ABI-Schweregrade (Knöchel-Arm-Index)',
          inhalt: '> 1,3: falsch-hoch, Verdacht auf Mediasklerose (v. a. Diabetiker, Niereninsuffizienz). 0,9–1,3: Normalbefund. 0,75–0,9: leichte pAVK. 0,5–0,75: mittelgradige pAVK. < 0,5: schwere pAVK / kritische Ischämie.',
        },
      ],
      redFlags: [
        'Ischämischer Ruheschmerz (v. a. nachts, Besserung bei herabhängendem Bein) → kritische Extremitätenischämie, Gefäßkonsil',
        'Ulkus, Nekrose oder Gangrän an Zehen/Fuß → Stadium IV, drohender Extremitätenverlust',
        'Plötzlicher Beginn mit den 6 P nach Pratt (Pain, Paleness/Blässe, Pulslosigkeit, Parästhesie, Paralyse, „Prostration“/Schock) → akuter Arterienverschluss = Notfall, Ischämiezeit begrenzt (ca. 6 h)',
        'Kaltes, marmoriertes, gefühlloses Bein mit Bewegungsunfähigkeit → drohender irreversibler Gewebeschaden',
        'Fieber, Rötung und Sekretion aus einem Fußulkus beim Diabetiker → infizierter diabetischer Fuß / Sepsisgefahr',
      ],
      diagnostik: [
        { stufe: 'Anamnese/Klinik', text: 'Anamnese: schmerzfreie Gehstrecke, Lokalisation und Belastungsabhängigkeit des Schmerzes, Ruheschmerz, kardiovaskuläre Risikofaktoren (v. a. Nikotin, Diabetes), Begleit-KHK/-Karotisstenose' },
        { stufe: 'Anamnese/Klinik', text: 'Körperliche Untersuchung: Inspektion (Blässe, trophische Störungen, Ulzera), Seitenvergleich der Hauttemperatur, systematisches Pulsstatus-Tasten (A. femoralis, A. poplitea, A. dorsalis pedis, A. tibialis posterior) und Auskultation auf Stenosegeräusche' },
        { stufe: 'Anamnese/Klinik', text: 'Ratschow-Lagerungsprobe und standardisierte Gehstreckenmessung auf dem Laufband (Bestätigung und Objektivierung des Stadiums)' },
        { stufe: 'Labor', text: 'Labor: Lipidstatus (LDL/HDL/Cholesterin), HbA1c/Nüchternglukose, Nierenwerte (Kreatinin/eGFR vor KM), Blutbild, CRP' },
        { stufe: 'Apparativ & Bildgebung', text: 'Knöchel-Arm-Index (ABI, Doppler): zentrale, einfache Basisuntersuchung — Quotient aus systolischem Knöchel- und Armdruck; < 0,9 beweist eine pAVK, < 0,5 zeigt eine kritische Ischämie an' },
        { stufe: 'Apparativ & Bildgebung', text: 'Farbkodierte Duplexsonographie: erste bildgebende, nicht-invasive Methode zur Lokalisation und Graduierung der Stenosen/Verschlüsse' },
        { stufe: 'Apparativ & Bildgebung', text: 'MR-Angiographie (MRA) — nicht-invasive Gefäßdarstellung zur OP-/Interventionsplanung, ohne Röntgenstrahlung' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT-Angiographie (CTA) mit jodhaltigem Kontrastmittel zur Gefäßdarstellung (Cave: Niereninsuffizienz, KM-Allergie)' },
        { stufe: 'Apparativ & Bildgebung', text: 'Digitale Subtraktionsangiographie (DSA) — Goldstandard, ermöglicht die Intervention im selben Eingriff; bei KM-Allergie alternativ CO2-Angiographie' },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Spinalkanalstenose (Claudicatio spinalis / neurogen)',
          unterscheidung: 'Belastungsschmerz ebenfalls beim Gehen, aber Besserung erst durch Vornüberbeugen/Hinsetzen (nicht durch bloßes Stehenbleiben); wechselnde Lokalisation, Parästhesien, erhaltene Fußpulse, normaler ABI. Bergauf-/Fahrradfahren wird besser toleriert.',
        },
        {
          dd: 'Tiefe Venenthrombose (TVT)',
          unterscheidung: 'Akute einseitige Schwellung, Überwärmung, livide Verfärbung und Spannungsschmerz (nicht belastungsabhängig); Fußpulse tastbar. Homans-/Payr-Zeichen, D-Dimer↑, Nachweis in der Kompressionssonographie.',
        },
        {
          dd: 'Periphere Polyneuropathie (v. a. diabetisch)',
          unterscheidung: 'Brennende, socken-/handschuhförmige Missempfindungen und Taubheit, belastungsUNabhängig, oft in Ruhe/nachts betont; Pulse und ABI normal, gestörtes Vibrations-/Berührungsempfinden.',
        },
        {
          dd: 'Gonarthrose / muskuloskelettaler Schmerz',
          unterscheidung: 'Gelenkbezogener Anlauf- und Belastungsschmerz mit Krepitation und Bewegungseinschränkung im Knie, keine reproduzierbare fixe Gehstrecke, erhaltene Pulse, normaler ABI.',
        },
        {
          dd: 'Akuter arterieller Verschluss (Embolie/Thrombose)',
          unterscheidung: 'Plötzlicher Beginn mit den 6 P (Schmerz, Blässe, Pulslosigkeit, Parästhesie, Paralyse, Schock); Notfall — im Gegensatz zur langsam progredienten chronischen pAVK.',
        },
        {
          dd: 'Thrombangiitis obliterans (M. Winiwarter-Buerger)',
          unterscheidung: 'Junge, stark rauchende Patienten, oft mit Beteiligung der oberen Extremität und Thrombophlebitis migrans; nicht-atherosklerotische Genese.',
        },
      ],
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Konsequente Ausschaltung der Risikofaktoren als Basis jeder Therapie — absoluter Nikotinverzicht (wirksamste Einzelmaßnahme), optimale Diabetes- und Blutdruckeinstellung',
            'Strukturiertes Gehtraining / Gefäßsport (Ausbildung von Kollateralkreisläufen) — Therapie der ersten Wahl im Stadium II',
            'Thrombozytenaggregationshemmung mit ASS 100 mg (oder Clopidogrel) zur Reduktion des kardiovaskulären Gesamtrisikos',
            'Statin zur LDL-Senken (Zielwert < 1,4 mmol/l bzw. < 55 mg/dl) und Plaquestabilisierung',
            'Optimierung von Blutdruck (ACE-Hemmer/ARB) und Blutzucker',
            'Cilostazol als medikamentöse Option zur Verlängerung der Gehstrecke bei Claudicatio',
            'Konsequente Fußpflege und Wundmanagement, besonders beim Diabetiker (Vermeidung von Druckstellen/Ulzera)',
          ],
          akut: true,
        },
        {
          label: 'Interventionell',
          items: [
            'Perkutane transluminale Angioplastie (PTA, Ballondilatation), meist mit Stentimplantation — Methode der Wahl bei umschriebenen Stenosen/kurzstreckigen Verschlüssen',
            'Kathetergestützte Rekanalisation; ab Stadium IIb bei hohem Leidensdruck relative, ab Stadium III/IV absolute Revaskularisationsindikation',
            'Lokale Thrombolyse / Thrombektomie beim akuten Verschluss',
          ],
          akut: true,
        },
        {
          label: 'Chirurgisch',
          items: [
            'Bypass-Operation (z. B. femoropoplitealer Venen- oder Prothesenbypass) bei langstreckigen Verschlüssen',
            'Thrombendarteriektomie (TEA) mit Patchplastik, v. a. an der Femoralisgabel',
            'Grenzzonen-/Minoramputation nur als Ultima Ratio bei nicht rettbarer Nekrose/Gangrän oder lebensbedrohlicher Infektion',
          ],
        },
      ],
      prognose: 'Die pAVK ist Ausdruck einer generalisierten Atherosklerose: prognosebestimmend ist nicht das Bein, sondern das hohe kardiovaskuläre Gesamtrisiko — die meisten Patienten versterben an Herzinfarkt oder Schlaganfall. Die lokale Prognose ist im Stadium II unter konsequenter Risikofaktorenkontrolle und Gehtraining günstig; nur eine Minderheit schreitet zur kritischen Ischämie fort. Entscheidend für die Extremitätenprognose sind absoluter Nikotinverzicht und die Diabeteseinstellung. Im Stadium IV (kritische Ischämie) drohen ohne Revaskularisation Amputation und eine deutlich erhöhte Letalität.',
      pruefungsfallen: [
        'Umgangssprache parat haben: pAVK = „Schaufensterkrankheit“; auf die häufige Prüferfrage „Warum heißt sie so?“ die Erklärung mit dem erzwungenen Stehenbleiben (wie beim Schaufensterbummel) liefern.',
        'Der ABI (Knöchel-Arm-Index) ist DIE zentrale, nicht-invasive Basisuntersuchung — nie vergessen; bei Diabetikern/Niereninsuffizienz kann er durch Mediasklerose falsch-hoch (> 1,3) und damit falsch-negativ sein.',
        'Nikotin als führenden Risikofaktor nennen und beim Patienten aktiv das Rauchen erfragen und ansprechen (wichtigste therapeutische Maßnahme).',
        'Fußpulse systematisch und benannt tasten (A. dorsalis pedis und A. tibialis posterior) — die Prüfer fragen konkret, WO man tastet.',
        'Claudicatio spinalis von Claudicatio intermittens abgrenzen: Besserung durch Vornüberbeugen/Hinsetzen (spinal) vs. durch bloßes Stehenbleiben (arteriell).',
        'Bei KM-Allergie eine Alternative zur konventionellen Angiographie parat haben: CO2-Angiographie oder strahlenfreie MR-Angiographie.',
        'Die Therapie stadiengerecht (Fontaine I–IV) darstellen können und die Revaskularisationsindikation kennen: relativ ab IIb, absolut ab Stadium III/IV.',
        'Beim Diabetiker an den schmerzarmen/stummen Verlauf durch Polyneuropathie denken — die pAVK wird sonst erst über ein Ulkus entdeckt.',
      ],
      askedInExam: [
        {
          frage: 'Wie heißt die pAVK umgangssprachlich und warum?',
          antwort: 'Schaufensterkrankheit. Weil die Patienten wegen des belastungsabhängigen Wadenschmerzes immer wieder stehen bleiben müssen — wie beim Bummeln vor Schaufenstern —, bis der Schmerz in Ruhe nachlässt.',
        },
        {
          frage: 'Was ist die wichtigste Untersuchung bei der pAVK?',
          antwort: 'Der Knöchel-Arm-Index (ABI): das Verhältnis aus systolischem Knöchel- und Armdruck. Ein Wert unter 0,9 sichert die pAVK, unter 0,5 zeigt eine kritische Ischämie an. Ergänzend die farbkodierte Duplexsonographie.',
        },
        {
          frage: 'Wo genau tasten Sie die Fußpulse?',
          antwort: 'An der A. dorsalis pedis am Fußrücken und an der A. tibialis posterior hinter dem Innenknöchel; proximal zusätzlich A. poplitea und A. femoralis im Seitenvergleich.',
        },
        {
          frage: 'Nennen Sie die Fontaine-Stadien und die stadiengerechte Therapie.',
          antwort: 'Stadium I asymptomatisch, II Claudicatio (IIa > 200 m, IIb < 200 m), III Ruheschmerz, IV Nekrose/Gangrän. Stadium I–II: Risikofaktoren ausschalten, Gehtraining, ASS und Statin; ab IIb bei Leidensdruck relative Revaskularisationsindikation; Stadium III–IV: dringliche Revaskularisation (PTA/Stent oder Bypass), im Endstadium ggf. Amputation.',
        },
        {
          frage: 'Sollten wir die Kollegen der Gefäßchirurgie hinzuziehen? Wie würden Sie den Patienten einordnen?',
          antwort: 'Ja. Bei einer pAVK im Stadium IIb besteht eine relative Indikation zur Rekanalisation; deshalb sollte ein Gefäßkonsil erfolgen, um Duplexbefund und Angiographie zu bewerten und über PTA/Stent oder Bypass zu entscheiden.',
        },
        {
          frage: 'Was passiert, wenn wir nicht diagnostizieren bzw. behandeln?',
          antwort: 'Die Durchblutungsstörung schreitet fort: von der Claudicatio über den Ruheschmerz (Stadium III) bis zu Nekrose und Gangrän (Stadium IV) mit drohender Amputation. Zudem bleibt das hohe Herzinfarkt- und Schlaganfallrisiko unbehandelt.',
        },
        {
          frage: 'Welche Differenzialdiagnosen kommen infrage und wie grenzen Sie sie ab?',
          antwort: 'Vor allem die Spinalkanalstenose (Besserung durch Vornüberbeugen, nicht durch Stehenbleiben), die tiefe Venenthrombose (akute Schwellung, tastbare Pulse), die Polyneuropathie (belastungsunabhängig, normaler ABI) und die Gonarthrose (gelenkbezogen). Abgrenzung über ABI, Pulsstatus und Duplexsonographie.',
        },
        {
          frage: 'Was ist der wichtigste Risikofaktor und was empfehlen Sie dem Patienten?',
          antwort: 'Das Rauchen ist der wichtigste Risikofaktor. Wichtigste Empfehlung ist der absolute Nikotinverzicht, dazu strukturiertes Gehtraining, Statin und ASS sowie die optimale Einstellung von Blutdruck und Blutzucker.',
        },
        {
          frage: 'Der Patient ist gegen Kontrastmittel allergisch — welche Untersuchung bieten Sie an?',
          antwort: 'Statt der konventionellen jodhaltigen Angiographie eine CO2-Angiographie oder eine strahlen- und jodfreie MR-Angiographie; die Duplexsonographie ist ohnehin kontrastmittelfrei.',
        },
        {
          frage: 'Was ist das Leriche-Syndrom?',
          antwort: 'Ein chronischer Verschluss der distalen Aorta bzw. beider Beckenarterien mit der Trias aus beidseitiger (gluteal-/oberschenkelbetonter) Claudicatio, fehlenden Leistenpulsen und erektiler Dysfunktion.',
        },
      ],
      merksatz: 'Merke: Claudicatio intermittens + kühles, pulsloses Bein = pAVK — der ABI (< 0,9) sichert die Diagnose. Rauchstopp und Gehtraining sind die Basis; die pAVK ist ein Warnzeichen für Herzinfarkt und Schlaganfall, daher immer ASS und Statin.',
      linkedCaseIds: [
        'case-pavk',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
    {
      id: 'fw-lyme',
      pathology: 'Lyme-Borreliose',
      specialty: 'Infektiologie',
      definition: 'Lyme-Borreliose (Lyme-Krankheit): durch Zecken übertragene bakterielle Multisystemerkrankung, verursacht durch Spirochäten des Komplexes Borrelia burgdorferi sensu lato. Sie ist die häufigste durch Zecken übertragene Infektionskrankheit in Europa und verläuft klassisch in drei Stadien (früh-lokalisiert, früh-disseminiert, spät-chronisch) mit charakteristischer Haut-, Nerven-, Herz- und Gelenkbeteiligung. Leitbefund des Frühstadiums ist das Erythema migrans (Wanderröte). Abzugrenzen ist die Frühsommer-Meningoenzephalitis (FSME), die durch dieselbe Zecke, aber durch ein Virus übertragen wird.',
      aetiologie: 'Erreger sind gramnegative, schraubenförmige Spirochäten des Komplexes Borrelia burgdorferi sensu lato (in Europa v. a. Borrelia afzelii — eher Hautmanifestationen, Borrelia garinii — eher Neuroborreliose, sowie Borrelia burgdorferi sensu stricto). Überträger (Vektor) ist der Gemeine Holzbock (Ixodes ricinus), eine Schildzecke; Reservoir sind Nagetiere, Vögel und Wild. Die Übertragung erfolgt über den Speichel der Zecke beim Blutsaugen — das Übertragungsrisiko steigt mit der Saugdauer und ist bei einer Anhaftung über 24 Stunden deutlich erhöht. Wichtig für die Prüfung: Der Zeckenstich selbst ist harmlos; gefährlich ist erst die Übertragung des Erregers. Eine Mensch-zu-Mensch-Übertragung findet nicht statt.',
      risikofaktoren: [
        'Aufenthalt in Endemiegebieten (Wälder, Wiesen, hohes Gras, Unterholz) — z. B. Wandern, Waldarbeit, Gartenarbeit, Camping',
        'Warme Jahreszeit (Frühjahr bis Herbst), in der die Zecken aktiv sind',
        'Lange Saugdauer der Zecke (Übertragungsrisiko steigt deutlich ab > 24 h Anhaftung)',
        'Verzögerte oder unsachgemäße Zeckenentfernung (Quetschen der Zecke)',
        'Berufliche Exposition (Förster, Landwirte, Gärtner, Waldarbeiter)',
        'Fehlende Schutzmaßnahmen (keine bedeckende Kleidung, keine Repellents, kein Absuchen der Haut)',
      ],
      klinik: [
        {
          text: 'Stadium I (früh-lokalisiert, Tage bis Wochen nach Stich): Erythema migrans (Wanderröte) — eine sich zentrifugal ausbreitende, randbetonte Rötung mit zentraler Abblassung (\'Schießscheiben\'-/Kokardenform), meist > 5 cm, rundlich-anulär, kaum schmerzhaft, gelegentlich juckend, im Verlauf größer werdend; typischerweise an der Stichstelle (Bein, Oberschenkel, Rumpf)',
        },
        {
          text: 'Stadium I: begleitendes grippeähnliches Allgemeinbild — Fieber, Kopf- und Gliederschmerzen, Abgeschlagenheit (Fatigue), Myalgien, Arthralgien, regionale Lymphadenopathie',
        },
        {
          text: 'Borrelien-Lymphozytom (Lymphadenosis cutis benigna): livider Knoten bevorzugt an Ohrläppchen, Mamille oder Skrotum — seltene Frühmanifestation, v. a. bei B. afzelii',
          atypisch: true,
        },
        {
          text: 'Stadium II (früh-disseminiert, Wochen bis Monate): Neuroborreliose als häufigste Organmanifestation — Bannwarth-Syndrom (schmerzhafte Meningoradikulitis mit nächtlich betonten radikulären Schmerzen), Hirnnervenausfälle, v. a. ein- oder beidseitige periphere Fazialisparese, sowie lymphozytäre Meningitis',
          atypisch: true,
        },
        {
          text: 'Stadium II: Lyme-Karditis — AV-Block wechselnden Grades, Myokarditis, mit Palpitationen, Schwindel oder Synkope; multiple sekundäre Erythemata migrantia',
          atypisch: true,
        },
        {
          text: 'Stadium III (spät-chronisch, Monate bis Jahre): Lyme-Arthritis — meist mono- oder oligoartikuläre, schubweise rezidivierende Arthritis großer Gelenke, bevorzugt des Kniegelenks (Gonarthritis) mit Erguss',
          atypisch: true,
        },
        {
          text: 'Stadium III: Acrodermatitis chronica atrophicans (Morbus Herxheimer) — livide, teigige Schwellung und später zigarettenpapierartige Hautatrophie an den Streckseiten der Extremitäten, v. a. bei B. afzelii',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Stadieneinteilung der Lyme-Borreliose',
          inhalt: 'Stadium I (früh-lokalisiert): Erythema migrans ± Allgemeinsymptome, Tage bis Wochen nach Stich. Stadium II (früh-disseminiert): hämatogene Streuung mit Neuroborreliose (Bannwarth-Syndrom, Fazialisparese, Meningitis), Karditis (AV-Block), multiplen Erythemen; Wochen bis Monate. Stadium III (spät/chronisch): Lyme-Arthritis (v. a. Knie) und Acrodermatitis chronica atrophicans; Monate bis Jahre. Häufige Prüferfrage: Stadium benennen und die passende Manifestation zuordnen.',
        },
        {
          name: 'Zweistufen-Serodiagnostik (Stufendiagnostik)',
          inhalt: 'Stufe 1 = ELISA/IFT als sensibler Suchtest (IgM und IgG); Stufe 2 = bei positivem oder grenzwertigem Ergebnis Bestätigung durch Immunoblot/Western-Blot als spezifischerer Test. Nur ein reaktiver Blot bestätigt die Serologie.',
        },
      ],
      redFlags: [
        'Periphere Fazialisparese (ein- oder beidseitig), Meningismus/Nackensteifigkeit oder nächtlich betonte radikuläre Schmerzen → Verdacht auf Neuroborreliose, Indikation zur Lumbalpunktion',
        'Palpitationen, Schwindel, Synkopen oder Bradykardie → Lyme-Karditis mit AV-Block (EKG-Monitoring, ggf. stationäre Aufnahme)',
        'Neu aufgetretener rezidivierender Gelenkerguss, v. a. am Knie → Lyme-Arthritis (Spätstadium)',
        'Multiple, an mehreren Körperstellen auftretende Erytheme → hämatogene Dissemination (Stadium II)',
        'Hohes Fieber mit Meningismus zur Abgrenzung einer FSME oder bakteriellen Meningitis',
      ],
      diagnostik: [
        { stufe: 'Anamnese/Klinik', text: 'Anamnese: Zeckenstich oder Zeckenexposition (Waldaufenthalt, Wanderung, Endemiegebiet), Zeitverlauf, Aussehen und Wandern der Hautrötung, neurologische Begleitsymptome (Paresen, Parästhesien, radikuläre Schmerzen) — Cave: an einen Zeckenstich erinnern sich viele Patienten nicht' },
        { stufe: 'Anamnese/Klinik', text: 'Körperliche Untersuchung inklusive orientierender neurologischer Untersuchung (Hirnnerven, v. a. N. facialis; Meningismuszeichen) und Gelenkstatus' },
        { stufe: 'Apparativ & Bildgebung', text: 'EKG bei Verdacht auf Lyme-Karditis (AV-Block, Reizleitungsstörung)' },
        { stufe: 'Labor', text: 'Klinische Inspektion der Haut: Erythema migrans ist eine Blickdiagnose. Im Stadium I ist bei typischem Erythema migrans KEINE Serologie erforderlich — die Therapie erfolgt allein klinisch (Antikörper sind früh oft noch negativ, die Serokonversion dauert Wochen)' },
        { stufe: 'Labor', text: 'Labor: Entzündungsparameter (BSG, CRP, Blutbild) — bei isoliertem Erythema migrans meist normal oder nur gering erhöht; dienen v. a. der Abgrenzung eines Erysipels' },
        { stufe: 'Labor', text: 'Zweistufen-Serologie ab Stadium II/III oder bei unklarem Bild: ELISA als Suchtest (IgM/IgG), bei Reaktivität Bestätigung mit Immunoblot (Western-Blot). Cave: eine \'Seronarbe\' (persistierende IgG-Antikörper nach durchgemachter Infektion) und die fehlende Eignung des Titers zur Therapie- oder Verlaufskontrolle' },
        { stufe: 'Invasiv & Speziell', text: 'Lumbalpunktion (Liquordiagnostik) bei Verdacht auf Neuroborreliose: lymphozytäre Pleozytose, Eiweißerhöhung (Schrankenstörung) und Nachweis einer intrathekalen Borrelien-Antikörpersynthese (Liquor-Serum-Index); ergänzend CXCL13' },
        { stufe: 'Invasiv & Speziell', text: 'Gelenkpunktion mit Synovia-Analyse und Borrelien-PCR aus dem Punktat bei Verdacht auf Lyme-Arthritis' },
      ],
      differenzialdiagnosen: [
        {
          dd: 'FSME (Frühsommer-Meningoenzephalitis)',
          unterscheidung: 'Wird durch DIESELBE Zecke, aber durch ein VIRUS (Flavivirus) übertragen; kein Erythema migrans; meningoenzephalitisches Bild; NICHT antibiotisch behandelbar (nur symptomatisch), aber durch Impfung vermeidbar. Merksatz: FSME = viral + Impfung, Lyme = bakteriell + Antibiotikum.',
        },
        {
          dd: 'Erysipel (Wundrose)',
          unterscheidung: 'Flächige, scharf begrenzte, schmerzhafte, überwärmte, druckdolente Rötung mit hohem Fieber und deutlich erhöhten Entzündungsparametern; meist Streptokokken über eine Eintrittspforte. Das Erythema migrans ist dagegen zentral abblassend, kaum schmerzhaft und wenig entzündlich; Ausschluss über Klinik und Labor.',
        },
        {
          dd: 'Idiopathische periphere Fazialisparese (Bell-Parese)',
          unterscheidung: 'Isolierte Fazialisparese ohne Zeckenexposition, ohne Meningismus und mit unauffälligem Liquor; bei Neuroborreliose finden sich anamnestische Exposition, oft bilaterale Parese und ein entzündlicher Liquor mit intrathekaler Antikörpersynthese.',
        },
        {
          dd: 'Rheumatoide oder reaktive Arthritis / Gonarthrose',
          unterscheidung: 'Bei der Lyme-Arthritis mono-/oligoartikulärer, schubweiser Befall v. a. des Knies mit Zeckenanamnese und Borrelien-Serologie/PCR; die rheumatoide Arthritis ist symmetrisch-polyartikulär mit Rheumafaktor/ACPA, die Gonarthrose degenerativ ohne Entzündungszeichen.',
        },
        {
          dd: 'Tinea corporis / Erythema anulare centrifugum',
          unterscheidung: 'Ringförmige Hauteffloreszenzen mit randständiger Schuppung (Tinea, Pilznachweis im Nativpräparat) ohne Zeckenanamnese und ohne die typische zentrifugale Wanderung des Erythema migrans.',
        },
        {
          dd: 'Tiefe Venenthrombose (TVT) / pAVK / diabetischer Fuß (bei Beinbefund)',
          unterscheidung: 'Bei Rötung/Verfärbung am Bein differenzialdiagnostisch zu bedenken: TVT mit Schwellung und Umfangsdifferenz (D-Dimer, Kompressionssonographie), pAVK mit Claudicatio und fehlenden Pulsen, diabetischer Fuß bei bekanntem Diabetes — keine wandernde randbetonte Rötung.',
        },
      ],
      therapie: [
        {
          label: 'Antibiotische Therapie (Erstlinie)',
          items: [
            'Stadium I (Erythema migrans) und leichte Frühmanifestationen: Doxycyclin 2 x 100 mg/d p.o. für 10–21 Tage (üblich 14 Tage). Wirkprinzip: Hemmung der bakteriellen Proteinsynthese (Bindung an die 30S-Untereinheit des Ribosoms), bakteriostatisch. Nebenwirkungen: Photosensibilisierung (Sonnenschutz!), gastrointestinale Beschwerden.',
            'Kontraindikationen von Doxycyclin — Schwangerschaft/Stillzeit und Kinder unter 9 Jahren (Zahnverfärbung, Einlagerung in Knochen): dann Amoxicillin p.o. (alternativ Cefuroximaxetil) für 14 Tage.',
            'Neuroborreliose und Lyme-Karditis: Ceftriaxon 2 g/d i.v. für 14–21 Tage (Alternativen: Cefotaxim oder Penicillin G i.v.). Ceftriaxon ist auch die orale Doxycyclin-Alternative, nach der Prüfer häufig fragen.',
            'Lyme-Arthritis (Spätstadium): Doxycyclin p.o. über 28 Tage oder Ceftriaxon i.v.',
            'Symptomatisch: Analgetika und Antipyretika (z. B. Ibuprofen/Paracetamol) gegen Schmerzen und Fieber.',
            'Keine Isolation erforderlich, da keine Übertragung von Mensch zu Mensch. Nach reinem Zeckenstich ohne Symptome KEINE routinemäßige Antibiotikaprophylaxe — nur Beobachtung der Stichstelle (Rötung? → Wiedervorstellung).',
            'Prävention: Schutzkleidung, Repellents, Absuchen der Haut, frühzeitige mechanische Zeckenentfernung mit Pinzette hautnah ohne Quetschen. WICHTIG: Es gibt KEINE Impfung gegen die Lyme-Borreliose; die FSME-Impfung schützt NICHT gegen Borreliose.',
          ],
        },
        {
          label: 'Alternativen (KI / Schwangerschaft)',
          items: [
            'Temporärer Herzschrittmacher bei höhergradigem, symptomatischem AV-Block im Rahmen der Lyme-Karditis, bis die Reizleitungsstörung unter Antibiose reversibel ist.',
            'Diagnostische/entlastende Gelenkpunktion bei ausgeprägtem Erguss der Lyme-Arthritis.',
          ],
        },
        {
          label: 'Neuroborreliose / schwerer Verlauf',
          items: [
            'Eine operative Therapie ist in aller Regel nicht erforderlich; in seltenen therapierefraktären Fällen einer chronischen Lyme-Arthritis kann eine (arthroskopische) Synovektomie erwogen werden.',
          ],
        },
      ],
      prognose: 'Bei rechtzeitiger antibiotischer Therapie ist die Prognose sehr gut. Das Erythema migrans heilt unter Therapie folgenlos ab. Auch die Neuroborreliose hat eine gute Prognose; die Fazialisparese bildet sich in den meisten Fällen über Wochen bis Monate weitgehend zurück. Unbehandelt drohen die Progression in Stadium II und III mit Neuroborreliose, Karditis und chronischer Lyme-Arthritis. Ein sogenanntes Post-Lyme-Syndrom (persistierende unspezifische Beschwerden) ist selten; eine dauerhafte oder wiederholte Antibiotikatherapie ist dabei nicht indiziert. Eine \'chronische Borreliose\' als Rechtfertigung für Langzeitantibiose ist nicht belegt.',
      pruefungsfallen: [
        'Das Erythema migrans ist eine Blickdiagnose: Im Stadium I wird KLINISCH therapiert, eine Serologie ist NICHT nötig (Antikörper früh oft noch negativ — Serokonversion dauert Wochen).',
        'FSME vs. Lyme sicher unterscheiden können: gleiche Zecke, aber FSME = Virus (nur symptomatisch, Impfung schützt), Lyme = Bakterium (Antibiotikum, keine Impfung).',
        'Serologie immer als Zweistufentest erklären: erst ELISA (Suchtest), dann Immunoblot/Western-Blot (Bestätigung) — nie den Blot allein oder den Titer als Verlaufskontrolle nutzen (Seronarbe!).',
        'Doxycyclin ist kontraindiziert in Schwangerschaft/Stillzeit und bei Kindern < 9 Jahren → dann Amoxicillin; bei Neuroborreliose/Karditis Ceftriaxon i.v.',
        'Bei Fazialisparese, Meningismus oder radikulären Schmerzen an die Neuroborreliose denken und die Lumbalpunktion nennen (lymphozytäre Pleozytose, intrathekale Antikörpersynthese).',
        'Der Zeckenstich selbst ist harmlos — gefährlich ist die Übertragung des Erregers; nach reinem Stich ohne Symptome keine Routine-Antibiotikaprophylaxe.',
        'Keine Isolation nötig (keine Mensch-zu-Mensch-Übertragung) — häufige Fangfrage zur stationären Aufnahme.',
        'Die FSME-Impfung schützt NICHT vor der Borreliose; gegen die Borreliose gibt es keine Impfung.',
        'Bei einer Rötung am Bein die Differenzialdiagnosen Erysipel, TVT, pAVK und diabetischer Fuß aktiv nennen, nicht nur die Borreliose.',
      ],
      askedInExam: [
        {
          frage: 'Wie lautet Ihre Verdachtsdiagnose und warum?',
          antwort: 'Ich vermute eine Lyme-Borreliose, weil die Patientin nach einem Waldaufenthalt eine wandernde, randbetonte Rötung mit zentraler Abblassung — ein Erythema migrans — zusammen mit grippeähnlichen Allgemeinsymptomen zeigt. Der zeitliche Verlauf und die typische Hautveränderung passen gut zur Borreliose.',
        },
        {
          frage: 'Was ist der Auslöser der Erkrankung und wie wird sie übertragen?',
          antwort: 'Erreger ist das Bakterium Borrelia burgdorferi, eine Spirochäte. Übertragen wird es durch den Stich einer Zecke, des Gemeinen Holzbocks. Nicht der Stich selbst ist gefährlich, sondern die Übertragung des Erregers über den Speichel der Zecke, deren Risiko mit der Saugdauer steigt.',
        },
        {
          frage: 'Wie heißt die Hautveränderung wissenschaftlich und wie sieht sie aus?',
          antwort: 'Es handelt sich um ein Erythema migrans, die Wanderröte. Es ist eine sich zentrifugal ausbreitende, ringförmige (anuläre) Rötung, die am Rand dunkelrot ist und in der Mitte abblasst, meist über 5 cm groß, kaum schmerzhaft und im Verlauf größer werdend.',
        },
        {
          frage: 'Was ist der wichtigste Unterschied zwischen Lyme-Borreliose und FSME?',
          antwort: 'Beide werden durch dieselbe Zecke übertragen. Die FSME wird jedoch durch ein Virus verursacht, verläuft als Meningoenzephalitis, ist nur symptomatisch behandelbar und durch eine Impfung vermeidbar. Die Lyme-Borreliose ist bakteriell, wird mit Antibiotika behandelt, und gegen sie gibt es keine Impfung.',
        },
        {
          frage: 'Welche weiteren Differenzialdiagnosen kommen bei dieser Rötung in Betracht?',
          antwort: 'Vor allem ein Erysipel, das aber flächig, schmerzhaft, überwärmt und mit hohen Entzündungswerten einhergeht. Bei einer Rötung am Bein außerdem eine tiefe Venenthrombose, eine pAVK oder ein diabetischer Fuß, sowie eine Tinea corporis.',
        },
        {
          frage: 'Wie sichern Sie die Diagnose — brauchen Sie eine Serologie?',
          antwort: 'Bei einem typischen Erythema migrans im Stadium I ist die Diagnose klinisch eine Blickdiagnose, eine Serologie ist nicht nötig, da die Antikörper früh oft noch negativ sind. In späteren Stadien führe ich eine Zweistufen-Serologie durch: zuerst einen ELISA als Suchtest, bei Reaktivität einen Immunoblot zur Bestätigung.',
        },
        {
          frage: 'Wann und wozu führen Sie eine Lumbalpunktion durch?',
          antwort: 'Bei Verdacht auf eine Neuroborreliose, etwa bei einer Fazialisparese, Meningismus oder radikulären Schmerzen. Im Liquor erwarte ich eine lymphozytäre Pleozytose, eine Eiweißerhöhung und den Nachweis einer intrathekalen Borrelien-Antikörpersynthese.',
        },
        {
          frage: 'Welche Therapie schlagen Sie vor, und wie wirkt das Antibiotikum?',
          antwort: 'Im Stadium I Doxycyclin 2 x 100 mg täglich über etwa 14 Tage. Doxycyclin hemmt die bakterielle Proteinsynthese an der 30S-Untereinheit des Ribosoms und wirkt bakteriostatisch; als Nebenwirkung ist die Photosensibilisierung zu beachten.',
        },
        {
          frage: 'Gibt es eine Alternative zu Doxycyclin?',
          antwort: 'Ja. In der Schwangerschaft, Stillzeit und bei Kindern unter 9 Jahren gebe ich Amoxicillin. Bei einer Neuroborreliose oder Karditis behandle ich mit Ceftriaxon intravenös über 14 bis 21 Tage.',
        },
        {
          frage: 'Muss die Patientin isoliert oder stationär aufgenommen werden?',
          antwort: 'Eine Isolation ist nicht nötig, weil die Borreliose nicht von Mensch zu Mensch übertragen wird. Ein unkompliziertes Erythema migrans kann ambulant oral behandelt werden; stationär nehme ich bei Neuroborreliose für die intravenöse Therapie oder bei Karditis mit Reizleitungsstörung auf.',
        },
        {
          frage: 'Was passiert, wenn die Borreliose nicht behandelt wird?',
          antwort: 'Dann kann die Erkrankung in spätere Stadien übergehen: in Stadium II mit Neuroborreliose und Herzbeteiligung wie einem AV-Block, und in Stadium III mit einer chronischen Lyme-Arthritis, vor allem des Knies, sowie einer Acrodermatitis chronica atrophicans.',
        },
        {
          frage: 'Was machen Sie, wenn die Zecke noch vorhanden ist, und geben Sie nach einem Stich vorsorglich Antibiotika?',
          antwort: 'Ich entferne die Zecke mechanisch mit einer Pinzette hautnah, ohne sie zu quetschen. Nach einem reinen Zeckenstich ohne Symptome gebe ich keine routinemäßige Antibiotikaprophylaxe, sondern beobachte die Stichstelle — bei Auftreten einer Rötung soll sich die Patientin wieder vorstellen.',
        },
      ],
      merksatz: 'Merke: Erythema migrans nach Zeckenstich ist eine Blickdiagnose — im Stadium I klinisch mit Doxycyclin behandeln (keine Serologie nötig); bei Neuroborreliose Lumbalpunktion und Ceftriaxon i.v. FSME = Virus + Impfung, Lyme = Bakterium + Antibiotikum. Serologie immer zweistufig: ELISA, dann Immunoblot.',
      linkedCaseIds: [
        'case-lyme',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
    {
      id: 'fw-osg-fraktur',
      pathology: 'Sprunggelenkfraktur (OSG-Fraktur)',
      specialty: 'Orthopädie',
      definition: 'Knöcherne Verletzung des oberen Sprunggelenks (OSG), meist als Malleolarfraktur (Innen-/Außenknöchel) infolge eines Umknicktraumas (Supinations-/Pronations-Distorsionstrauma). Betroffen sind Malleolus lateralis (distale Fibula), Malleolus medialis (Tibia) und/oder die hintere Tibiakante (Volkmann-Dreieck); zusätzlich können die Syndesmose und der Bandapparat verletzt sein. Man unterscheidet uni-, bi- und trimalleoläre Frakturen sowie die Luxationsfraktur (Fraktur mit Gelenkverrenkung). Die Einteilung nach Weber richtet sich nach der Höhe der Fibulafraktur im Verhältnis zur Syndesmose und bestimmt Stabilität und Therapie.',
      aetiologie: 'Häufigster Mechanismus ist das indirekte Umknicktrauma (Supination/Inversion oder Pronation/Eversion), typischerweise beim Sport (Fußball), auf unebenem Boden, beim Treppensteigen oder Sturz. Es entstehen Scher-, Abriss- und Kompressionskräfte an den Malleolen und der Syndesmose. Bei älteren Patienten und Osteoporose genügt ein Bagatelltrauma. Eine Sonderform ist die Maisonneuve-Fraktur (hohe proximale Fibulafraktur mit kompletter Syndesmosen- und Membrana-interossea-Ruptur).',
      risikofaktoren: [
        'Sportarten mit Richtungswechsel und Sprüngen (Fußball, Basketball, Volleyball)',
        'Frühere Sprunggelenksverletzungen / chronische Bandinstabilität',
        'Unebener Untergrund, Stolpern, Sturz aus geringer Höhe',
        'Osteoporose und höheres Lebensalter (Bagatelltrauma)',
        'Adipositas (erhöhte Belastung)',
        'Ungeeignetes Schuhwerk (hohe Absätze)',
        'Gerinnungsstörung/Antikoagulation als Risiko für Immobilisationskomplikationen (Thrombose)',
      ],
      klinik: [
        {
          text: 'Akuter, stechender, belastungsabhängiger Schmerz im oberen Sprunggelenk nach Umknicktrauma',
        },
        {
          text: 'Schwellung (Ödem) und Bluterguss (Hämatom) über dem betroffenen Knöchel',
        },
        {
          text: 'Druck- und Bewegungsschmerz über Malleolus lateralis und/oder medialis',
        },
        {
          text: 'Schmerzbedingte oder mechanische Bewegungseinschränkung; Belastungs- und Gehunfähigkeit',
        },
        {
          text: 'Fehlstellung / sichtbare Deformität bei Luxationsfraktur (achsengerechte Reposition dringlich!)',
          atypisch: true,
        },
        {
          text: 'Bei Weber-C-/Maisonneuve-Verletzung Druckschmerz auch proximal an der Wade / am Fibulaköpfchen — leicht zu übersehen',
          atypisch: true,
        },
        {
          text: 'Bei ausgeprägter Osteoporose nur geringe Beschwerden trotz relevanter Fraktur',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Weber-Klassifikation (AO-Danis-Weber)',
          inhalt: 'Einteilung nach Höhe der Fibulafraktur zur Syndesmose: Weber A = unterhalb der Syndesmose (Syndesmose intakt, meist stabil → oft konservativ); Weber B = auf Höhe der Syndesmose (Syndesmose kann teilverletzt sein → häufig operativ); Weber C = oberhalb der Syndesmose (Syndesmose immer zerrissen, instabil → operativ, ggf. Stellschraube/Syndesmosennaht).',
        },
        {
          name: 'Ottawa Ankle Rules',
          inhalt: 'Klinische Entscheidungsregel, wann eine Röntgenaufnahme nötig ist. Röntgen des OSG bei Schmerz in der Malleolarregion UND einem der folgenden Kriterien: Knochendruckschmerz an der Hinterkante/Spitze des Malleolus lateralis oder medialis (jeweils distale 6 cm) ODER Unfähigkeit, unmittelbar und in der Notaufnahme vier Schritte zu belasten. Foot Rules zusätzlich bei Mittelfußschmerz mit Druckschmerz über Basis Os metatarsale V oder Os naviculare.',
        },
        {
          name: 'Lauge-Hansen-Klassifikation',
          inhalt: 'Unfallmechanistische Einteilung nach Fußstellung und Krafteinwirkung (Supination-Adduktion, Supination-Eversion, Pronation-Abduktion, Pronation-Eversion). Erklärt das Verletzungsmuster von Knochen und Bändern; im FSP nachrangig, Weber genügt.',
        },
      ],
      redFlags: [
        'Offene Fraktur (Wunde über der Frakturstelle) → chirurgischer Notfall, Antibiose, Tetanusschutz, Not-OP',
        'Durchblutungs-, Motorik- oder Sensibilitätsstörung (DMS!) — fehlender Fußpuls, blasser/kalter Fuß, Taubheit → Gefäß-/Nervenschaden',
        'Luxationsfraktur mit deutlicher Fehlstellung und Hautspannung → drohende Hautnekrose, sofortige (geschlossene) Reposition',
        'Zunehmender, unter Analgesie kaum beherrschbarer Schmerz, pralle Schwellung, Schmerz bei passiver Dehnung → Kompartmentsyndrom',
        'Proximaler Wadenschmerz / Druckschmerz am Fibulaköpfchen → Maisonneuve-Fraktur nicht übersehen',
      ],
      diagnostik: [
        { stufe: 'Anamnese/Klinik', text: 'Klinische Untersuchung: Inspektion (Schwellung, Hämatom, Fehlstellung, offene Wunde), gezielte Palpation beider Malleolen UND der proximalen Fibula (Maisonneuve)' },
        { stufe: 'Anamnese/Klinik', text: 'DMS-Prüfung obligat: Durchblutung (A. dorsalis pedis, A. tibialis posterior), Motorik und Sensibilität distal — vor und nach jeder Reposition/Ruhigstellung dokumentieren' },
        { stufe: 'Labor', text: 'Anamnese: Unfallmechanismus (Umknicken, Richtung), Belastbarkeit, Vorverletzungen; gezielt nach Antikoagulation, Gerinnungsstörung und früherer Thrombose fragen' },
        { stufe: 'Labor', text: 'Labor bei geplanter Operation: Blutbild, Gerinnung (Quick/INR, PTT), Entzündungsparameter, Elektrolyte, Kreatinin' },
        { stufe: 'Apparativ & Bildgebung', text: 'Anwendung der Ottawa Ankle Rules zur Indikationsstellung der Bildgebung' },
        { stufe: 'Apparativ & Bildgebung', text: 'Röntgen des OSG in zwei Ebenen (a.-p. mit 20° Innenrotation/Mortise-Aufnahme und seitlich); bei Verdacht auf Maisonneuve zusätzlich Unterschenkel/Knie' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT des OSG bei unklarem Röntgenbefund, Gelenkbeteiligung (Volkmann-Dreieck) und zur OP-Planung' },
        { stufe: 'Apparativ & Bildgebung', text: 'MRT nur bei Verdacht auf begleitende Band-, Knorpel- oder Syndesmosenverletzung ohne eindeutigen Frakturnachweis' },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Bandruptur / Distorsion (Supinationstrauma, Außenbandruptur)',
          unterscheidung: 'Schwellung und Hämatom vor allem am Außenband, kein Knochendruckschmerz an den Malleolen; Belastung oft noch möglich; Ottawa-Kriterien negativ, Röntgen ohne Fraktur.',
        },
        {
          dd: 'Achillessehnenruptur',
          unterscheidung: 'Peitschenhiebartiger Schmerz an der Ferse, tastbare Delle, positiver Thompson-Test (kein Plantarflexionsreflex bei Wadenkompression); Schmerz nicht am Knöchel.',
        },
        {
          dd: 'Talusfraktur / osteochondrale Läsion',
          unterscheidung: 'Druckschmerz eher zentral/tief im Sprunggelenk; oft nur im CT/MRT sicher; hohes Nekrose- und Arthroserisiko.',
        },
        {
          dd: 'Fraktur der Basis Os metatarsale V (Jones-/Abrissfraktur)',
          unterscheidung: 'Druckschmerz am seitlichen Fußaußenrand (Basis MT V), nicht an den Malleolen; Ottawa Foot Rules statt Ankle Rules; typisch nach Supinationstrauma.',
        },
        {
          dd: 'Kontusion / Prellung',
          unterscheidung: 'Diffuser Weichteilschmerz und Hämatom ohne umschriebenen Knochendruckschmerz; Röntgen unauffällig; rasche Besserung.',
        },
        {
          dd: 'Maisonneuve-Fraktur',
          unterscheidung: 'Hohe Fibulafraktur proximal mit Syndesmosenruptur; Schmerz und Druckschmerz an der proximalen Wade — leicht übersehen, wenn nur das OSG untersucht wird.',
        },
      ],
      therapie: [
        {
          label: 'Konservativ',
          items: [
            'Sofortmaßnahmen nach PECH-Schema: Pause, Eis (Kühlung), Kompression, Hochlagern',
            'Ausreichende Analgesie (z. B. Metamizol oder Ibuprofen, ggf. Paracetamol)',
            'Weber-A-Fraktur (stabil): Ruhigstellung in Unterschenkelgips, Orthese (z. B. Aircast/Vacoped) für ca. 6 Wochen mit Teilbelastung nach Maßgabe',
            'Medikamentöse Thromboseprophylaxe mit niedermolekularem Heparin während der Immobilisation — bei bekannter Gerinnungsstörung (z. B. Faktor-V-Leiden) besonders beachten',
            'Frühfunktionelle Nachbehandlung und Physiotherapie nach Konsolidierung',
          ],
          akut: true,
        },
        {
          label: 'Interventionell',
          items: [
            'Notfallmäßige geschlossene Reposition und Retention (Gipsschiene) bei Luxationsfraktur/Fehlstellung zur Entlastung der Haut und Wiederherstellung der Durchblutung',
            'Ggf. Fixateur externe zur temporären Stabilisierung bei ausgeprägter Weichteilschwellung oder offener Fraktur bis zur definitiven Versorgung',
          ],
          akut: true,
        },
        {
          label: 'Chirurgisch',
          items: [
            'Weber-B- und Weber-C-Frakturen sowie instabile/dislozierte und bimalleoläre Frakturen: offene Reposition und interne Fixation (ORIF) mittels Platten- und Schraubenosteosynthese',
            'Versorgung des Innenknöchels (Zugschrauben) und des Volkmann-Dreiecks bei relevanter Gelenkbeteiligung',
            'Syndesmosenstabilisierung durch Stellschraube oder Syndesmosennaht (Weber C, instabile Syndesmose)',
            'Offene Fraktur: notfallmäßiges Débridement, Antibiose, Tetanusschutz und Stabilisierung',
            'Orthopädisch-unfallchirurgisches Konsil, ggf. Verlegung in eine (unfall-)chirurgische Abteilung',
          ],
          akut: true,
        },
      ],
      prognose: 'Bei anatomischer Reposition und stabiler Osteosynthese ist die Prognose gut; entscheidend ist die exakte Wiederherstellung von Gelenkkongruenz und Syndesmose. Verbleibende Gelenkstufen, Fehlstellungen oder eine nicht ausgeheilte Syndesmoseninstabilität begünstigen die posttraumatische OSG-Arthrose. Weitere Komplikationen sind Wundheilungsstörung/Infekt (v. a. bei schlechtem Weichteilmantel, Diabetes, Rauchen), Thrombose während der Immobilisation, Materiallockerung und Bewegungseinschränkung. Weber-A-Frakturen heilen konservativ meist folgenlos aus.',
      pruefungsfallen: [
        'DMS immer prüfen und dokumentieren (Durchblutung, Motorik, Sensibilität) — vor UND nach Reposition/Gips; im Protokoll ausdrücklich als „pdms/PDMS überprüfen“ genannt.',
        'Röntgen des OSG in ZWEI Ebenen ist die Standardaussage; auf die Prüferfrage „Und wenn wir nichts finden?“ folgt CT bei unklarem Befund oder zur OP-Planung.',
        'Weber-Klassifikation (A/B/C nach Höhe der Fibulafraktur zur Syndesmose) parat haben — ein Prüfer sagte zwar „nicht nötig, es geht um die Sprache“, gefragt wird sie trotzdem gern.',
        'Gerinnungsstörung aktiv erfragen: Ein Patient mit Faktor-V-Leiden muss bei Immobilisation heparinisiert werden; nach früherer Thrombose fragen (im Protokoll als „sehr wichtig“ moniert).',
        '„Sind Sie Orthopäde/Chirurg?“ — richtige Antwort: orthopädisch-unfallchirurgisches Konsil veranlassen oder verlegen, nicht selbst operieren.',
        'Beim Schmerzmittel konkret bleiben (Metamizol oder Ibuprofen) und die Frage nach dem Wirkstoff erwarten.',
        'Ottawa Ankle Rules kennen, um die Röntgenindikation zu begründen; proximale Fibula mituntersuchen (Maisonneuve nicht übersehen).',
      ],
      askedInExam: [
        {
          frage: 'Welche Verdachtsdiagnose stellen Sie und welche Differenzialdiagnosen kommen infrage?',
          antwort: 'Verdacht auf eine Sprunggelenkfraktur rechts nach Umknicktrauma. Differenzialdiagnosen sind eine Distorsion bzw. Bandruptur, eine Kontusion, eine Achillessehnenruptur sowie eine Fraktur der Basis des fünften Mittelfußknochens.',
        },
        {
          frage: 'Was würden Sie als erste Maßnahmen veranlassen?',
          antwort: 'Zuerst die klinische Untersuchung mit Prüfung von Durchblutung, Motorik und Sensibilität (DMS), dann ein Röntgen des Sprunggelenks in zwei Ebenen. Begleitend Kühlung, Hochlagerung und Analgesie.',
        },
        {
          frage: 'Und wenn wir im Röntgen nichts finden?',
          antwort: 'Bei unklaren Befunden oder zur Operationsplanung veranlasse ich ein CT des Sprunggelenks, außerdem ein Labor mit Blutbild, Gerinnungs- und Entzündungsparametern.',
        },
        {
          frage: 'Sind Sie Orthopädin bzw. Chirurgin — was machen Sie?',
          antwort: 'Nein. Ich veranlasse ein orthopädisch-unfallchirurgisches Konsil und gegebenenfalls eine Verlegung, da die operative Versorgung in die Unfallchirurgie gehört.',
        },
        {
          frage: 'Welches Schmerzmittel geben Sie?',
          antwort: 'Zum Beispiel Metamizol oder Ibuprofen; bei Kontraindikationen Paracetamol. Wichtig ist eine ausreichende Analgesie, da der Patient starke Schmerzen hat.',
        },
        {
          frage: 'Erklären Sie die Weber-Klassifikation.',
          antwort: 'Sie teilt die Fraktur nach der Höhe der Fibulafraktur zur Syndesmose ein: Weber A unterhalb (Syndesmose intakt, meist konservativ), Weber B auf Höhe der Syndesmose (oft operativ), Weber C oberhalb (Syndesmose zerrissen, immer operativ).',
        },
        {
          frage: 'Welche Narkosemöglichkeiten gibt es und welche Komplikationen sind mit der Narkose verbunden?',
          antwort: 'Möglich sind eine Vollnarkose, eine rückenmarksnahe Regionalanästhesie (Spinal-/Periduralanästhesie) oder eine periphere Nervenblockade. Komplikationen sind unter anderem Übelkeit und Erbrechen, Blutdruckabfall, allergische Reaktionen, bei Regionalanästhesie Kopfschmerz oder Nervenreizung sowie das allgemeine Thrombose- und Kreislaufrisiko.',
        },
        {
          frage: 'Warum ist die Gerinnungsanamnese hier so wichtig?',
          antwort: 'Weil der Patient bei einer Ruhigstellung immobilisiert ist und ein hohes Thromboserisiko hat. Bei einer Gerinnungsstörung wie dem Faktor-V-Leiden muss konsequent eine Thromboseprophylaxe mit Heparin erfolgen, und ich frage gezielt nach einer früheren Thrombose.',
        },
      ],
      merksatz: 'Merke: Nach jedem Umknicktrauma DMS prüfen und dokumentieren, Ottawa Ankle Rules anwenden und Röntgen OSG in zwei Ebenen — Weber A meist konservativ (Gips/Orthese), Weber B/C operativ (Osteosynthese ± Syndesmose); bei Immobilisation immer an die Thromboseprophylaxe denken.',
      linkedCaseIds: [
        'case-osg-fraktur',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-operation',
        'auf-ct',
      ],
    },
    {
      id: 'fw-bandscheibenvorfall',
      pathology: 'Lumbaler Bandscheibenvorfall',
      specialty: 'Orthopädie',
      definition: 'Verlagerung von Bandscheibengewebe über die Grenzen des Zwischenwirbelraums hinaus. Man unterscheidet die Protrusion (Vorwölbung bei noch intaktem Anulus fibrosus) vom eigentlichen Prolaps bzw. der Extrusion (Durchtritt von Nucleus-pulposus-Gewebe durch den zerrissenen Anulus fibrosus), bei der ein abgetrenntes Fragment als Sequester frei im Spinalkanal liegen kann. Der Vorfall erfolgt meist nach dorsolateral und komprimiert eine abgehende Nervenwurzel, wodurch das radikuläre Schmerz- und Ausfallsyndrom entsteht. In der Lendenwirbelsäule sind die untersten Segmente L4/L5 und L5/S1 am häufigsten betroffen; das klinische Leitbild ist die Lumboischialgie — der Kreuzschmerz mit dermatombezogener Ausstrahlung in das Bein.',
      aetiologie: 'Ursache ist eine degenerative Bandscheibendegeneration: Mit zunehmendem Alter verliert der Nucleus pulposus Wasser und Elastizität (Chondrose bzw. Osteochondrose), im Anulus fibrosus entstehen Risse, durch die Bandscheibengewebe austritt. Häufig wird der Vorfall akut durch eine Belastung ausgelöst — typischerweise durch das Heben eines schweren Gegenstands aus gebückter, gedrehter Haltung (in den Protokollen wiederkehrend: „beim Aufheben einer schweren Kiste"). Der Altersgipfel liegt zwischen dem 30. und 50. Lebensjahr, also deutlich früher als bei den rein degenerativen Alterserkrankungen der Wirbelsäule.',
      risikofaktoren: [
        'Schwere körperliche Arbeit mit Heben und Tragen von Lasten',
        'Überwiegend sitzende Tätigkeit und Bewegungsmangel (schwache Rumpf- und Rückenmuskulatur)',
        'Übergewicht / Adipositas',
        'Nikotinabusus (verschlechtert die Ernährung der bradytrophen Bandscheibe)',
        'Chronische Fehlhaltung sowie Ganzkörpervibration (z. B. Berufskraftfahrer)',
        'Genetische Disposition und familiäre Häufung',
        'Frühere Rückenbeschwerden oder ein vorangegangener Bandscheibenvorfall',
        'Höheres Lebensalter mit fortgeschrittener Bandscheibendegeneration',
      ],
      klinik: [
        {
          text: 'Akuter, in die Lendenwirbelsäule einschießender Schmerz mit schmerzreflektorischer Bewegungssperre und Schonhaltung („Hexenschuss"/Lumbago)',
        },
        {
          text: 'Radikuläre, ins Bein ausstrahlende Schmerzen entlang eines Dermatoms (Lumboischialgie) — das eigentliche Leitsymptom des Wurzelkompressionssyndroms',
        },
        {
          text: 'Verstärkung der Ausstrahlung durch Husten, Niesen und Pressen (Valsalva-Manöver) sowie durch Bücken und Belastung — wichtiger Hinweis auf eine radikuläre Genese',
        },
        {
          text: 'Sensibilitätsstörungen im betroffenen Dermatom: Hypästhesie, Kribbelparästhesien und Taubheitsgefühl',
        },
        {
          text: 'Positives Lasègue-Zeichen (Dehnungsschmerz des N. ischiadicus beim passiven Anheben des gestreckten Beins) beim tiefen lumbalen Vorfall L5/S1',
        },
        {
          text: 'Wurzel L5: Schwäche der Großzehen- und Fußhebung (M. extensor hallucis longus, Fußheberschwäche), Dermatom über lateralem Unterschenkel, Fußrücken und Großzehe; typischerweise kein Reflexausfall',
        },
        {
          text: 'Wurzel S1: Schwäche der Fußsenkung (Zehenstand/Einbeinhüpfen erschwert), abgeschwächter oder erloschener Achillessehnenreflex, Dermatom über Fußaußenrand und Ferse',
        },
        {
          text: 'Reithosenanästhesie mit Blasen- und Mastdarmstörung (Harnverhalt oder Inkontinenz) — Cauda-equina-Syndrom, absoluter Notfall',
          atypisch: true,
        },
        {
          text: 'Hochgradige oder rasch progrediente motorische Parese (z. B. Fußheberschwäche mit Steppergang) als Warnzeichen für eine dringliche OP-Indikation',
          atypisch: true,
        },
        {
          text: 'Bis zu einem Drittel der bildmorphologischen Bandscheibenvorfälle bleibt klinisch stumm (Zufallsbefund im MRT ohne passende Klinik) — daher immer Klinik und Bild zusammenführen',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Morphologische Einteilung',
          inhalt: 'Protrusion (Vorwölbung bei intaktem Anulus fibrosus) < Extrusion/Prolaps (Durchtritt von Nucleus-pulposus-Gewebe durch den zerrissenen Anulus) < Sequester (vollständig abgetrenntes, frei im Spinalkanal liegendes Fragment). Bestimmt Verlauf und Resorptionsneigung.',
        },
        {
          name: 'Segment- und Dermatomzuordnung (Kennmuskeln/Reflexe)',
          inhalt: 'L4 (L3/L4): Dermatom über Knie und medialem Unterschenkel, Kennmuskel M. quadriceps femoris, abgeschwächter Patellarsehnenreflex (PSR). — L5 (L4/L5): Dermatom lateraler Unterschenkel/Fußrücken/Großzehe, Kennmuskel Fuß- und Großzehenheber, kein Reflexausfall. — S1 (L5/S1): Dermatom Fußaußenrand/Ferse, Kennmuskel Fußsenker (Zehenstand), abgeschwächter Achillessehnenreflex (ASR).',
        },
        {
          name: 'Kraftgrade nach Janda (0–5)',
          inhalt: 'Standardisierte Graduierung der Parese: 5 = normale Kraft, 3 = Bewegung gegen die Schwerkraft, 0 = keine Muskelaktivität. Ein Kraftgrad ≤ 3 (relevante/progrediente Parese) ist ein Warnzeichen und mitentscheidend für die OP-Indikation.',
        },
      ],
      redFlags: [
        'Reithosenanästhesie mit Blasen-/Mastdarmstörung (Harnverhalt, Inkontinenz) → Cauda-equina-Syndrom: Notfall-MRT und neurochirurgische Notfall-OP (möglichst innerhalb von 48 Stunden)',
        'Rasch progrediente oder hochgradige motorische Parese (z. B. Fußheberschwäche, Kraftgrad ≤ 3) → dringliche operative Dekompression',
        'Nachtschmerz, ungewollter Gewichtsverlust, bekannte Tumorerkrankung → Verdacht auf Wirbelmetastasen / Malignom',
        'Fieber, i. v.-Drogenabusus, Immunsuppression → Verdacht auf Spondylodiszitis / spinalen Abszess',
        'Adäquates Trauma oder Osteoporose / Kortikoidtherapie → Verdacht auf Wirbelkörperfraktur',
        'Beidseitige Ischialgie oder rasch aufsteigende sensomotorische Ausfälle → Konus-/Cauda-Syndrom',
      ],
      diagnostik: [
        { stufe: 'Anamnese/Klinik', text: 'Gezielte Anamnese: Schmerzcharakter und Ausstrahlung entlang eines Dermatoms, Husten-/Press-/Niesabhängigkeit, auslösendes Hebe-/Drehtrauma sowie aktives Erfragen von Blasen- und Mastdarmstörung und Reithosengefühl (Cauda-Screening)' },
        { stufe: 'Anamnese/Klinik', text: 'Klinisch-neurologische Untersuchung: Lasègue-Zeichen und gekreuztes Lasègue-Zeichen, Kraftprüfung im Seitenvergleich (Zehen- und Hackengang), Muskeleigenreflexe (PSR, ASR), Sensibilitätsprüfung nach Dermatomen, Prüfung der Beweglichkeit und des Klopf-/Druckschmerzes über der LWS' },
        { stufe: 'Labor', text: 'Labor (Blutbild, CRP/BSG) nur bei Verdacht auf Infektion (Spondylodiszitis) oder Tumor' },
        { stufe: 'Apparativ & Bildgebung', text: 'MRT der Lendenwirbelsäule — bildgebender Goldstandard: beste Darstellung von Bandscheibe, Nervenwurzel und Spinalkanal, ohne Strahlenbelastung; bei Cauda-Verdacht als Notfalluntersuchung' },
        { stufe: 'Apparativ & Bildgebung', text: 'CT der LWS nur als Alternative bei MRT-Kontraindikation (z. B. Herzschrittmacher) oder zur Beurteilung knöcherner Strukturen' },
        { stufe: 'Apparativ & Bildgebung', text: 'Konventionelles Röntgen der LWS NICHT zur Darstellung der Bandscheibe geeignet — nur bei Verdacht auf Fraktur, Instabilität oder knöcherne Ursache' },
        { stufe: 'Invasiv & Speziell', text: 'Digital-rektale Untersuchung bei Verdacht auf Cauda-equina-Syndrom (Prüfung von Sphinktertonus und perianaler Sensibilität)' },
        { stufe: 'Invasiv & Speziell', text: 'Elektrophysiologie (EMG/NLG) bei unklarer, atypischer oder persistierender Parese zur Höhenlokalisation und Abgrenzung einer Polyneuropathie' },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Spinalkanalstenose (Claudicatio spinalis)',
          unterscheidung: 'Meist ältere Patienten; belastungs- und gehstreckenabhängige Beinschmerzen, die sich beim Vornüberbeugen und Sitzen bessern (Einkaufswagen-Zeichen). Beschwerdebesserung im Gegensatz zur pAVK nicht durch Stehenbleiben allein.',
        },
        {
          dd: 'ISG-Syndrom (Iliosakralgelenk-Blockade)',
          unterscheidung: 'Schmerzmaximum über dem ISG, pseudoradikuläre Ausstrahlung ohne klaren Dermatombezug; positive Provokationstests (z. B. Mennell, Patrick/FABER), unauffälliger neurologischer Status.',
        },
        {
          dd: 'Facettensyndrom (Spondylarthrose)',
          unterscheidung: 'Belastungs- und reklinationsabhängiger, tief lumbaler Schmerz mit pseudoradikulärer Ausstrahlung, die selten über das Knie hinausreicht; kein sensomotorisches Defizit, kein echtes Dermatom.',
        },
        {
          dd: 'Coxarthrose',
          unterscheidung: 'Leisten- und Hüftschmerz mit Ausstrahlung ins Knie, schmerzhaft eingeschränkte Innenrotation der Hüfte; kein radikuläres Muster, Lasègue negativ, Nachweis im Beckenröntgen.',
        },
        {
          dd: 'periphere arterielle Verschlusskrankheit (pAVK)',
          unterscheidung: 'Belastungsabhängige Wadenschmerzen mit reproduzierbarer Gehstrecke (Claudicatio intermittens), Besserung bereits im Stehen; abgeschwächte Fußpulse, kein Dermatombezug, keine Press-/Hustenabhängigkeit.',
        },
        {
          dd: 'Piriformis-Syndrom',
          unterscheidung: 'Ischialgieforme Beschwerden ohne Wurzelkompression; Druckschmerz über dem M. piriformis, Provokation bei Innenrotation, bildgebend kein relevanter Vorfall.',
        },
        {
          dd: 'Wirbelmetastasen / Wirbelfraktur / Spondylodiszitis',
          unterscheidung: 'Red-Flag-Konstellationen: Nachtschmerz, Gewichtsverlust und Tumoranamnese (Metastasen), adäquates Trauma bzw. Osteoporose (Fraktur), Fieber und erhöhte Entzündungswerte (Spondylodiszitis) — in den Protokollen als DD Wirbelfraktur und Knochenmetastasen genannt.',
        },
      ],
      therapie: [
        {
          label: 'Konservativ (Basistherapie, ~90 %)',
          items: [
            'Basistherapie bei rund 90 % der Fälle: die überwiegende Mehrheit heilt ohne Operation aus',
            'Analgesie nach Stufenschema: NSAR (z. B. Ibuprofen oder Diclofenac) stets mit PPI-Magenschutz, ergänzend Metamizol/Paracetamol, kurzfristig ggf. schwache Opioide (Tilidin, Tramadol)',
            'Kurzfristig Muskelrelaxans bei ausgeprägter reflektorischer Muskelverspannung',
            'KEINE strenge Bettruhe — frühe Mobilisation und Erhalt der Aktivität; in der Akutphase kann eine Stufenbettlagerung entlasten',
            'Physiotherapie, Rückenschule, Wärmeanwendung und im Verlauf Aufbau der Rumpfmuskulatur',
            'Aufklärung über die günstige Spontanprognose sowie Anleitung zu rückengerechtem Heben und Gewichtsreduktion',
          ],
          akut: true,
        },
        {
          label: 'Interventionell (PRT)',
          items: [
            'CT- oder bildgesteuerte periradikuläre Therapie (PRT) bzw. epidurale/periradikuläre Infiltration mit Lokalanästhetikum und Glukokortikoid an die betroffene Nervenwurzel bei therapieresistenten radikulären Schmerzen',
          ],
        },
        {
          label: 'Operativ (nur bei Indikation)',
          items: [
            'Notfalloperation (Dekompression) beim Cauda-equina-Syndrom — möglichst innerhalb von 48 Stunden',
            'Dringliche Operation bei progredienter oder hochgradiger motorischer Parese',
            'Elektive Operation bei therapieresistenten radikulären Schmerzen über etwa 6 Wochen trotz adäquater konservativer Therapie',
            'Verfahren: mikrochirurgische Diskektomie/Nukleotomie mit Sequestrektomie (Entfernung des vorgefallenen Gewebes und Entlastung der Nervenwurzel)',
          ],
          akut: true,
        },
      ],
      prognose: 'Die Prognose ist insgesamt sehr gut: Mehr als 85–90 % der Patienten bessern sich unter konsequenter konservativer Therapie innerhalb von etwa sechs Wochen, und Sequester können sich spontan zurückbilden (resorbieren). Entscheidend für die Vorbeugung von Rezidiven sind Rückenschule, Kräftigung der Rumpfmuskulatur, Gewichtsreduktion und rückengerechtes Verhalten. Beim operativ versorgten Cauda-equina-Syndrom hängt die Erholung der Blasen-, Mastdarm- und Sensibilitätsfunktion entscheidend vom präoperativen Ausmaß der Ausfälle und vom Zeitpunkt der Operation ab — je früher entlastet wird, desto besser.',
      pruefungsfallen: [
        'Die Bandscheibe wird per MRT dargestellt, NICHT per Röntgen — ein häufig geprüfter Punkt. Röntgen zeigt nur Knochen (Frakturausschluss), das MRT ist strahlenfrei und bildet Nervenwurzel und Bandscheibe ab; im AAG wird oft gefragt, warum das MRT dem CT vorzuziehen ist.',
        'Blasen-/Mastdarmstörung und Reithosenanästhesie IMMER aktiv erfragen: Sie definieren das Cauda-equina-Syndrom als neurochirurgischen Notfall — bei Nachweis nicht weiter „normal" anamnesieren, sondern OA informieren, Notfall-MRT und OP veranlassen.',
        'Die Husten-, Press- und Niesabhängigkeit der Ausstrahlung gezielt erfragen: Sie spricht für eine radikuläre Genese. Im Freiburger AAG wurde genau nachgehakt, warum die Reichweite der Ausstrahlung (bis zum Knie vs. bis in die Fußsohle) wichtig ist — Antwort: zum Nachweis/Ausschluss einer Radikulopathie.',
        'Etwa 90 % heilen konservativ — die Operation ist die Ausnahme (nur bei Cauda-Syndrom, progredienter/hochgradiger Parese oder Therapieresistenz > 6 Wochen). Nicht vorschnell die OP als Erstmaßnahme nennen.',
        'Die Wurzeln L5 und S1 sicher unterscheiden können: L5 = Fußheber-/Großzehenheberschwäche ohne Reflexausfall; S1 = Fußsenkerschwäche (Zehenstand) mit abgeschwächtem Achillessehnenreflex.',
        'NSAR immer mit PPI-Magenschutz kombinieren und an Kontraindikationen (Niereninsuffizienz, Ulkusanamnese) denken — in den Protokollen wird ausdrücklich „NSAID (+PPI)" dokumentiert.',
        'Red Flags für eine ernste Ursache (Tumor: Nachtschmerz, Gewichtsverlust, Malignomanamnese; Infekt: Fieber; Fraktur: Trauma/Osteoporose) nicht übersehen — im AAG werden Wirbelfraktur und Knochenmetastasen als DD erwartet.',
      ],
      askedInExam: [
        {
          frage: 'Warum führen Sie ein MRT und nicht ein Röntgen oder CT durch?',
          antwort: 'Das MRT stellt als einzige Methode strahlenfrei die Bandscheibe, die Nervenwurzel und den Spinalkanal im Weichteilkontrast dar. Das Röntgen zeigt nur den Knochen und dient dem Frakturausschluss; das CT ist die Alternative nur bei MRT-Kontraindikation oder für knöcherne Fragestellungen.',
        },
        {
          frage: 'Was ist das Lasègue-Zeichen?',
          antwort: 'Ein Nervendehnungszeichen: Beim passiven Anheben des gestreckten Beins löst der gedehnte N. ischiadicus einen ins Bein einschießenden radikulären Schmerz aus. Ein positives Zeichen spricht für eine Wurzelreizung bei tiefem lumbalem Bandscheibenvorfall (L5/S1).',
        },
        {
          frage: 'Wann ist ein Bandscheibenvorfall ein Notfall und muss operiert werden?',
          antwort: 'Beim Cauda-equina-Syndrom — Reithosenanästhesie mit Blasen- und Mastdarmstörung — sowie bei rasch progredienter oder hochgradiger motorischer Parese. Dann sind ein Notfall-MRT und eine neurochirurgische Dekompression möglichst innerhalb von 48 Stunden erforderlich.',
        },
        {
          frage: 'Wie behandeln Sie den unkomplizierten Bandscheibenvorfall konservativ?',
          antwort: 'Mit einer Analgesie nach Stufenschema (NSAR plus PPI, ggf. Metamizol oder kurzfristig schwache Opioide), früher Mobilisation statt Bettruhe, Physiotherapie und Rückenschule. Etwa 90 Prozent heilen so aus.',
        },
        {
          frage: 'Welche Differenzialdiagnosen kommen in Betracht?',
          antwort: 'Spinalkanalstenose, ISG-Syndrom, Facettensyndrom, Coxarthrose und pAVK; als ernste Ursachen Wirbelfraktur, Wirbelmetastasen und Spondylodiszitis.',
        },
        {
          frage: 'Wie unterscheiden Sie eine L5- von einer S1-Wurzel?',
          antwort: 'Bei L5 findet sich eine Fußheber- und Großzehenheberschwäche mit Dermatom am lateralen Unterschenkel und Fußrücken, ohne Reflexausfall. Bei S1 bestehen eine Fußsenkerschwäche mit erschwertem Zehenstand, ein abgeschwächter Achillessehnenreflex und ein Dermatom am Fußaußenrand.',
        },
        {
          frage: 'Warum ist es wichtig, wie weit die Schmerzen ausstrahlen?',
          antwort: 'Eine dermatombezogene Ausstrahlung bis in den Fuß spricht für eine echte radikuläre Kompression (Radikulopathie), während ein nur bis zum Knie reichender, diffuser Schmerz eher pseudoradikulär ist. Die Reichweite hilft also, eine Wurzelbeteiligung nachzuweisen oder auszuschließen.',
        },
        {
          frage: 'Worauf achten Sie bei der körperlichen Untersuchung?',
          antwort: 'Auf das Lasègue-Zeichen, die Kraftgrade im Seitenvergleich mit Zehen- und Hackengang, die Muskeleigenreflexe PSR und ASR, die Sensibilität nach Dermatomen sowie bei Cauda-Verdacht auf Sphinktertonus und perianale Sensibilität.',
        },
      ],
      merksatz: 'Merke: Die Diagnose sichert das MRT (nicht das Röntgen), und rund 90 % heilen konservativ — aber Reithosenanästhesie mit Blasen-/Mastdarmstörung bedeutet Cauda-equina-Syndrom und damit einen neurochirurgischen Notfall.',
      linkedCaseIds: [
        'case-bandscheibenvorfall',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-mrt',
      ],
    },
    {
      id: 'fw-gicht',
      pathology: 'Gichtarthritis (akuter Gichtanfall)',
      specialty: 'Rheumatologie',
      definition: 'Die Gicht ist eine Störung des Purinstoffwechsels mit einer Hyperurikämie (Harnsäure im Serum über 6,8 mg/dl, dem Löslichkeitsprodukt). Übersteigt die Harnsäurekonzentration die Löslichkeitsgrenze, fallen Natriumuratkristalle in Gelenken und Weichteilen aus und lösen über das NLRP3-Inflammasom eine hochakute Entzündungsreaktion aus. Der akute Gichtanfall (Arthritis urica) ist die typischerweise monoartikuläre, perakut einsetzende Kristallarthritis; der Befall des Großzehengrundgelenks (MTP I) heißt Podagra.',
      aetiologie: 'In etwa 90–95 % der Fälle primäre (idiopathische) Hyperurikämie durch eine genetisch bedingte verminderte renale Harnsäureausscheidung („Unter-Ausscheider“), seltener durch Überproduktion (z. B. Lesch-Nyhan-Syndrom). Sekundäre Hyperurikämie (5–10 %) durch vermehrten Anfall (Tumorlyse-Syndrom, myeloproliferative Erkrankungen, Hämolyse, Psoriasis) oder verminderte Ausscheidung (Niereninsuffizienz, Thiazid- und Schleifendiuretika, niedrig dosierte Acetylsalicylsäure, Ciclosporin, Laktat- und Ketoazidose bei Alkohol oder Fasten). Auslöser eines Anfalls sind purinreiche Mahlzeiten, Alkohol — besonders Bier —, Fasten und rasche Gewichtsabnahme, Exsikkose, Operationen, Infekte sowie jede rasche Änderung des Harnsäurespiegels nach oben ODER nach unten.',
      risikofaktoren: [
        'Männliches Geschlecht (Verhältnis etwa 4:1); Frauen erkranken meist erst nach der Menopause, da Östrogene urikosurisch wirken',
        'Adipositas und metabolisches Syndrom (Insulinresistenz hemmt die renale Harnsäureausscheidung)',
        'Purinreiche Ernährung: rotes Fleisch, Wurst, Innereien, Meeresfrüchte, Fleischbrühen',
        'Alkoholkonsum, insbesondere Bier (purinreich durch Hefe und zusätzlich ausscheidungshemmend)',
        'Fruktosehaltige Softdrinks',
        'Thiazid- und Schleifendiuretika, niedrig dosierte Acetylsalicylsäure, Ciclosporin, Tacrolimus',
        'Chronische Niereninsuffizienz',
        'Fasten, Nulldiät, sehr rasche Gewichtsabnahme, Exsikkose',
        'Positive Familienanamnese',
        'Arterielle Hypertonie, Diabetes mellitus, Hyperlipidämie',
        'Bleiexposition (Saturnismus, historisch „Bleigicht“)',
      ],
      klinik: [
        {
          text: 'Perakuter Beginn, typischerweise nachts oder in den frühen Morgenstunden aus dem Schlaf heraus',
        },
        {
          text: 'Monarthritis mit stärkstem, pochend-pulsierendem Schmerz (VAS häufig 8–10/10)',
        },
        {
          text: 'Podagra: Befall des Großzehengrundgelenks (MTP I) in etwa 60 % der Erstmanifestationen',
        },
        {
          text: 'Alle klassischen Entzündungszeichen: Rubor, Calor, Tumor, Dolor und Functio laesa',
        },
        {
          text: 'Extreme Berührungsempfindlichkeit (Hyperalgesie) — schon der Druck der Bettdecke ist unerträglich',
        },
        {
          text: 'Deutliche Bewegungs- und Belastungseinschränkung: Gehen, Auftreten, Schuhtragen und Autofahren sind unmöglich',
        },
        {
          text: 'Häufig glänzend gerötete, später schuppende Haut über dem betroffenen Gelenk',
        },
        {
          text: 'Anamnestisch fassbarer Auslöser (üppiges Fleischessen, Bier/Schnaps, Feier, Fasten, neue Diuretika)',
        },
        {
          text: 'Selbstlimitierender Verlauf: auch unbehandelt Abklingen innerhalb von 1–2 Wochen, danach beschwerdefreie interkritische Phase',
        },
        {
          text: 'Gonagra (Knie), Chiragra (Daumengrundgelenk) oder Befall von Sprung-, Hand- und Fingergelenken als weniger typische Lokalisation',
          atypisch: true,
        },
        {
          text: 'Polyartikulärer Anfall mit Fieber, Leukozytose und reduziertem Allgemeinzustand — imitiert eine Sepsis bzw. septische Arthritis',
          atypisch: true,
        },
        {
          text: 'Chronische Gicht mit Tophi an Ohrmuschel, Olecranon, Achillessehne und Fingerstreckseiten, gelegentlich mit Ulzeration und Entleerung kreidiger Massen',
          atypisch: true,
        },
        {
          text: 'Erstmanifestation als Nierenkolik bei Harnsäurestein oder als asymptomatische Niereninsuffizienz (Uratnephropathie)',
          atypisch: true,
        },
        {
          text: 'Bei Frauen nach der Menopause und bei Diureti­ka-Einnahme häufig polyartikulärer Befall der Fingergelenke, leicht mit einer aktivierten Arthrose (Heberden-/Bouchard-Knoten) zu verwechseln',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Stadien der Hyperurikämie und Gicht (klassische Vierteilung)',
          inhalt: 'Stadium I: asymptomatische Hyperurikämie (nur Laborbefund, keine Beschwerden — allein keine Therapieindikation). Stadium II: akuter Gichtanfall (perakute Monarthritis, meist Podagra). Stadium III: interkritische Phase (beschwerdefreies Intervall zwischen den Anfällen, Kristalldepots bestehen fort). Stadium IV: chronische Gicht mit Tophi, chronischer Gichtarthropathie mit Gelenkdestruktion und Uratnephropathie.',
        },
        {
          name: 'ACR/EULAR-Klassifikationskriterien 2015',
          inhalt: 'Eintrittskriterium: mindestens eine Episode einer Schwellung oder eines Schmerzes in einem peripheren Gelenk. Ist im Punktat der Nachweis von Natriumuratkristallen gelungen, ist die Diagnose sofort gesichert (Goldstandard). Andernfalls Punktesystem (Diagnose ab 8 Punkten) aus klinischen Kriterien (Befallsmuster MTP I, Rötung, Berührungsempfindlichkeit, Anfallsdynamik, Tophus), Serumharnsäure und Bildgebung (Doppelkontur im Ultraschall, Uratdepot im Dual-Energy-CT, gelenknahe Erosionen im Röntgen).',
        },
        {
          name: 'Ätiologische Einteilung',
          inhalt: 'Primäre Hyperurikämie (90–95 %): angeborene Störung, meist verminderte tubuläre Harnsäuresekretion („Unter-Ausscheider“), selten Enzymdefekte mit Überproduktion (Lesch-Nyhan-Syndrom, PRPP-Synthetase-Überaktivität). Sekundäre Hyperurikämie (5–10 %): vermehrter Zellumsatz (Tumorlyse, Leukämie, Hämolyse, Psoriasis) oder verminderte Ausscheidung (Niereninsuffizienz, Diuretika, ASS, Ciclosporin, Ketoazidose).',
        },
        {
          name: 'Einteilung nach der Harnsäureausscheidung im 24-Stunden-Urin',
          inhalt: 'Unter-Ausscheider (< 600–800 mg/24 h bei purinarmer Kost, ca. 90 %) — Urikostatika und Urikosurika möglich. Über-Produzierer (> 800 mg/24 h) — Urikostatika (Allopurinol), keine Urikosurika wegen der Steingefahr.',
        },
      ],
      redFlags: [
        'Fieber, Schüttelfrost oder reduzierter Allgemeinzustand bei akuter Monarthritis → dringender Verdacht auf septische Arthritis, sofortige Gelenkpunktion mit Gramfärbung und Kultur',
        'Eintrittspforte, Wunde, Ulcus oder Interdigitalmykose am betroffenen Fuß → bakterielle Genese bzw. Erysipel',
        'Immunsuppression, Diabetes mellitus, Gelenkprothese oder vorangegangene Gelenkinjektion → deutlich erhöhtes Infektionsrisiko, Infektion bis zum Beweis des Gegenteils annehmen',
        'Polyartikulärer Befall mit hohem Fieber und Leukozytose → Sepsis abgrenzen',
        'Anurie/Oligurie, rascher Kreatininanstieg → akute Uratnephropathie, insbesondere bei Tumorlyse-Syndrom',
        'Kolikartiger Flankenschmerz mit Hämaturie → Harnsäurestein mit Harnstau',
        'Ulzerierender Tophus mit Sekretion → Superinfektion',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Anamnese: perakuter nächtlicher Beginn, Monarthritis, Auslöser (purinreiche Mahlzeit, Bier/Schnaps, Fasten, rasche Gewichtsabnahme, neu angesetzte Diuretika), frühere selbstlimitierende Episoden, Familienanamnese, Nierensteine',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Körperliche Untersuchung: Vitalparameter einschließlich Temperatur, lokaler Gelenkstatus mit Rubor, Calor, Tumor, Dolor und Functio laesa, Prüfung der Beweglichkeit, Suche nach einer Eintrittspforte, Durchblutung/Motorik/Sensibilität',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Ganzkörperlicher Gelenkstatus und gezielte Suche nach Tophi (Helix der Ohrmuschel, Olecranon, Achillessehne, Fingerstreckseiten); Erhebung von BMI und Blutdruck',
        },
        {
          stufe: 'Labor',
          text: 'Harnsäure im Serum — Cave: in bis zu einem Drittel der akuten Anfälle normal oder erniedrigt; eine normale Harnsäure schließt die Gicht NICHT aus. Kontrolle 2–4 Wochen nach dem Anfall',
        },
        {
          stufe: 'Labor',
          text: 'Entzündungsparameter: CRP und BSG erhöht, Blutbild mit Differenzialblutbild (Leukozytose mit Neutrophilie); Procalcitonin bleibt bei der Gicht typischerweise normal und dient dem Ausschluss einer bakteriellen Genese',
        },
        {
          stufe: 'Labor',
          text: 'Nierenfunktion: Kreatinin, Harnstoff, eGFR, Urinstatus (Harnsäurekristalle, Hämaturie) — entscheidend für die Auswahl von NSAR bzw. die Dosierung von Colchicin',
        },
        {
          stufe: 'Labor',
          text: 'Harnsäureausscheidung im 24-Stunden-Urin zur Unterscheidung von Unter-Ausscheider und Über-Produzierer (steuert die Wahl zwischen Urikostatikum und Urikosurikum)',
        },
        {
          stufe: 'Labor',
          text: 'Metabolisches Begleitscreening und Ausgangswerte vor der Dauertherapie: Nüchternblutzucker/HbA1c, Lipidstatus, Transaminasen; bei asiatischer Herkunft ggf. HLA-B*58:01-Testung vor Allopurinol',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Arthrosonographie: Gelenkerguss, Synovitis, Doppelkontur-Zeichen (echoreiche Uratauflagerung auf dem hyalinen Knorpel) und tophusartige Aggregate — früh nachweisbar und nicht invasiv',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Konventionelles Röntgen des betroffenen Gelenks in zwei Ebenen: im akuten Anfall nur Weichteilschwellung; erst bei chronischer Gicht gelenknahe Stanzdefekte („Lochdefekte“) mit überhängendem Randwall bei lange erhaltenem Gelenkspalt. Zugleich Ausschluss von Fraktur und Arthrose',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Sonographie der Nieren und ableitenden Harnwege: Harnsäuresteine (im Röntgen nicht schattengebend!), Harnstau, Zeichen der Uratnephropathie',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Dual-Energy-CT (DECT) zum direkten, farbkodierten Nachweis von Uratdepots, wenn eine Punktion nicht möglich oder das Ergebnis unklar ist',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Gelenkpunktion mit Synovia-Analyse — GOLDSTANDARD: Polarisationsmikroskopie mit nadelförmigen, negativ doppelbrechenden Natriumuratkristallen, teils intrazellulär in Granulozyten phagozytiert; Punktat trüb, Zellzahl meist 2 000–50 000/µl mit Granulozytose',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Aus demselben Punktat obligat Gramfärbung und mikrobiologische Kultur zum Ausschluss einer septischen Arthritis (dort Zellzahl typischerweise > 50 000/µl mit über 90 % Granulozyten)',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Ggf. Biopsie eines Tophus mit histologischem Nachweis von Uratablagerungen und Fremdkörperriesenzellen (Alkoholfixierung erforderlich, da Urate wasserlöslich sind)',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Septische (bakterielle) Arthritis',
          unterscheidung: 'Die wichtigste und gefährlichste DD — klinisch nicht sicher abgrenzbar! Fieber, Schüttelfrost, reduzierter Allgemeinzustand, Eintrittspforte, CRP und Procalcitonin deutlich erhöht. Beweisend ist die Punktion: Zellzahl > 50 000/µl, positive Gramfärbung und Kultur, keine Kristalle. Cave: beides kann gleichzeitig vorliegen.',
        },
        {
          dd: 'Pseudogicht (CPPD-Arthritis, Chondrokalzinose)',
          unterscheidung: 'Ältere Patienten, bevorzugt Knie und Handgelenk; im Röntgen Verkalkung des Faserknorpels (Meniskus, Discus triangularis); im Punktat rhomboide, positiv doppelbrechende Kalziumpyrophosphatkristalle.',
        },
        {
          dd: 'Aktivierte Arthrose, Hallux rigidus/valgus',
          unterscheidung: 'Chronisch progredienter Anlauf- und Belastungsschmerz über Monate bis Jahre, Bewegungseinschränkung, im Röntgen Gelenkspaltverschmälerung, subchondrale Sklerose und Osteophyten; keine perakute Dramatik und keine Auslöseanamnese.',
        },
        {
          dd: 'Erysipel / Phlegmone',
          unterscheidung: 'Flächige, scharf begrenzte, flammend rote Überwärmung, die über das Gelenk hinausreicht, meist mit Fieber, Schüttelfrost, Lymphangitis und Lymphknotenschwellung sowie einer Eintrittspforte; das Gelenk selbst ist passiv frei beweglich.',
        },
        {
          dd: 'Reaktive Arthritis (Morbus Reiter)',
          unterscheidung: '1–4 Wochen nach gastrointestinalem (Yersinien, Campylobacter, Salmonellen) oder urogenitalem Infekt (Chlamydien); asymmetrische Oligoarthritis der unteren Extremität, häufig mit Konjunktivitis und Urethritis, HLA-B27-Assoziation.',
        },
        {
          dd: 'Rheumatoide Arthritis',
          unterscheidung: 'Schleichender Beginn, symmetrische Polyarthritis der MCP- und PIP-Gelenke unter Aussparung der Endgelenke, Morgensteifigkeit über 60 Minuten, Rheumafaktor und Anti-CCP positiv, im Röntgen gelenknahe Osteoporose und Erosionen.',
        },
        {
          dd: 'Psoriasisarthritis',
          unterscheidung: 'Psoriatische Hautveränderungen und Nagelbefall (Tüpfelnägel), Strahlbefall eines Fingers oder Zehs (Daktylitis, „Wurstzehe“), Befall der Endgelenke, häufig Enthesitis.',
        },
        {
          dd: 'Trauma: Fraktur, Distorsion, Weichteilläsion',
          unterscheidung: 'Adäquates Trauma in der Anamnese, Hämatom, punktueller Knochendruckschmerz; Klärung durch Röntgen in zwei Ebenen.',
        },
        {
          dd: 'Sarkoidose (Löfgren-Syndrom), rheumatisches Fieber',
          unterscheidung: 'Löfgren-Syndrom: Sprunggelenkarthritis mit Erythema nodosum und bihilärer Lymphadenopathie. Rheumatisches Fieber: wandernde Polyarthritis großer Gelenke 2–3 Wochen nach Streptokokken-Angina, Karditis, erhöhter Antistreptolysin-Titer.',
        },
      ],
      therapie: [
        {
          label: 'Akuttherapie des Gichtanfalls',
          akut: true,
          items: [
            'Ruhigstellung, Hochlagerung und lokale Kühlung des betroffenen Gelenks, Entlastung, Bettbügel gegen den Druck der Bettdecke — je früher die Therapie beginnt, desto schneller das Ansprechen (möglichst innerhalb von 12–24 Stunden)',
            'NSAR in ausreichend hoher Dosis als Erstlinie: z. B. Naproxen 2 × 500 mg, Indometacin 3 × 50 mg oder Ibuprofen 3 × 800 mg, immer unter Magenschutz mit einem Protonenpumpenhemmer; Kontraindikationen: Niereninsuffizienz, Ulkusanamnese, Herzinsuffizienz, Antikoagulation',
            'Colchicin als gleichwertige Alternative, besonders bei NSAR-Kontraindikation: 1 mg initial, nach einer Stunde 0,5 mg, Tageshöchstdosis 1,5 mg (die früheren hohen Dosierungen sind wegen der Toxizität verlassen). Dosisreduktion bei Niereninsuffizienz und Leberfunktionsstörung; typische Nebenwirkung Diarrhoe; keine Kombination mit starken CYP3A4- oder P-Glykoprotein-Hemmern (Clarithromycin, Ciclosporin)',
            'Glukokortikoide — im Examen ausdrücklich zu nennen: Prednisolon 30–35 mg täglich oral über 3–5 Tage, oder nach sicherem Ausschluss einer Infektion intraartikuläre Injektion; Mittel der Wahl bei Niereninsuffizienz, Antikoagulation oder Multimorbidität',
            'Reservetherapie bei therapierefraktärem oder polyartikulärem Verlauf: Interleukin-1-Antagonisten (Canakinumab, Anakinra)',
            'reichliche Flüssigkeitszufuhr (mindestens 2 Liter täglich), strikte Alkoholkarenz, purinarme Schonkost während des Anfalls',
            'eine bereits laufende harnsäuresenkende Therapie wird im Anfall NICHT unterbrochen; eine neue Therapie wird klassischerweise erst nach Abklingen begonnen (moderne Leitlinien erlauben den Beginn im Anfall unter wirksamer Anfallsprophylaxe)',
            'bei Fieber, Schüttelfrost oder Verdacht auf eine bakterielle Genese: Gelenkpunktion mit Kultur und kalkulierte intravenöse Antibiose, bis die septische Arthritis ausgeschlossen ist',
          ],
        },
        {
          label: 'Nicht-medikamentöse Basismaßnahmen (Lebensstil und Ernährung)',
          items: [
            'Purinarme Ernährung: deutliche Reduktion von rotem Fleisch, Wurstwaren, Innereien (Leber, Niere, Bries), Fleischbrühen, Sardellen, Sardinen, Heringen und Meeresfrüchten; Hefeextrakt meiden',
            'Alkoholreduktion, insbesondere Bier — purinreich durch Hefe und zusätzlich ausscheidungshemmend; auch alkoholfreies Bier ist purinreich. Spirituosen ebenfalls ungünstig, Wein in geringen Mengen am ehesten tolerabel',
            'Verzicht auf fruktosehaltige Softdrinks und gezuckerte Säfte; günstig sind fettarme Milchprodukte, Gemüse, Kirschen und Kaffee',
            'Trinkmenge von 2–3 Litern täglich zur Steigerung der Harnsäureausscheidung und zur Steinprophylaxe (bei Herz- oder Niereninsuffizienz anpassen)',
            'langsame, kontrollierte Gewichtsreduktion (etwa 0,5–1 kg pro Woche) und regelmäßige moderate Bewegung — CAVE: Fasten, Nulldiät und zu rasche Gewichtsabnahme lösen über Ketose und Laktatanstieg neue Anfälle aus',
            'Überprüfung und Umstellung auslösender Medikamente: Thiazid- und Schleifendiuretika möglichst ersetzen — Losartan und Amlodipin sind bei Hypertonie günstig, Losartan wirkt zusätzlich urikosurisch; Fenofibrat senkt Harnsäure und Triglyzeride',
            'Mitbehandlung des metabolischen Syndroms (Blutdruck, Blutzucker, Lipide) und der psychosozialen Belastung; bei reaktivem Alkoholkonsum Psychotherapie und Suchtberatung anbieten',
          ],
        },
        {
          label: 'Harnsäuresenkende Dauertherapie mit Anfallsprophylaxe',
          items: [
            'Indikation: rezidivierende Anfälle (ab dem zweiten Anfall pro Jahr), Tophi, Gichtarthropathie, Uratnephropathie oder Harnsäuresteine, Harnsäure dauerhaft über 9 mg/dl sowie sekundäre Hyperurikämie bei Tumortherapie. Die asymptomatische Hyperurikämie allein wird nicht medikamentös behandelt',
            'Beginn 2–4 Wochen NACH Abklingen des akuten Anfalls; Zielwert der Serumharnsäure unter 6 mg/dl, bei Tophi unter 5 mg/dl („treat to target“)',
            'Urikostatikum der ersten Wahl: Allopurinol (Xanthinoxidase-Hemmer), einschleichend mit 100 mg täglich, Steigerung alle 2–4 Wochen bis meist 300 mg 1-0-0 (maximal 800 mg); Dosisanpassung bei Niereninsuffizienz. Nebenwirkungen: Exanthem, selten DRESS/Stevens-Johnson-Syndrom',
            'Alternative Urikostatika: Febuxostat (potenter, auch bei mäßiger Niereninsuffizienz einsetzbar; Cave kardiovaskuläre Vorerkrankungen); Rasburicase (Urikase) beim Tumorlyse-Syndrom',
            'Urikosurika: Benzbromaron oder Probenecid — nur bei Unter-Ausscheidern mit guter Nierenfunktion, ausreichender Trinkmenge und Harnalkalisierung; kontraindiziert bei Nephrolithiasis und Über-Produzierern',
            'Anfallsprophylaxe während der ersten 3–6 Monate der Harnsäuresenkung mit Colchicin 0,5 mg täglich oder einem niedrig dosierten NSAR, da jede rasche Spiegeländerung einen Anfall provozieren kann',
            'Wichtige Interaktion: Allopurinol nicht mit Azathioprin oder 6-Mercaptopurin kombinieren (Hemmung des Abbaus, Knochenmarkdepression) — bei zwingender Kombination Dosis auf ein Viertel reduzieren; niedrig dosierte Acetylsalicylsäure erhöht die Harnsäure',
            'Verlaufskontrollen von Harnsäure, Kreatinin und Leberwerten; die Therapie ist in der Regel lebenslang und wird auch während eines Anfalls fortgeführt',
            'Bei chronischer tophöser Gicht ergänzend operative Tophusentfernung bei Ulzeration, Nervenkompression oder Funktionsverlust',
          ],
        },
      ],
      prognose: 'Der einzelne Anfall ist selbstlimitierend und klingt auch unbehandelt innerhalb von ein bis zwei Wochen ab; unter adäquater Therapie tritt die Besserung meist binnen 24 bis 48 Stunden ein. Ohne Behandlung der Hyperurikämie kommt es bei etwa 60 % der Patienten innerhalb eines Jahres und bei bis zu 80 % innerhalb von zwei Jahren zu einem Rezidiv, mit dem Risiko der chronischen tophösen Gicht, der Gelenkdestruktion und der Uratnephropathie. Unter konsequenter harnsäuresenkender Therapie mit einem Zielwert unter 6 mg/dl und angepasstem Lebensstil ist die Prognose sehr gut: Anfälle bleiben aus und bestehende Tophi bilden sich über Monate bis Jahre zurück. Entscheidend ist die Therapieadhärenz — die Gicht ist zudem ein Marker des metabolischen Syndroms und mit einem erhöhten kardiovaskulären und renalen Risiko verbunden.',
      pruefungsfallen: [
        'Der Harnsäurespiegel kann im akuten Anfall NORMAL oder sogar erniedrigt sein (bis zu ein Drittel der Fälle) — eine normale Harnsäure schließt einen Gichtanfall niemals aus. Sowohl ein plötzlicher Anstieg als auch ein plötzlicher Abfall des Spiegels kann den Anfall auslösen; Kontrolle erst 2–4 Wochen nach dem Anfall.',
        'Die septische Arthritis muss immer ausgeschlossen werden — sie ist klinisch nicht sicher von der Gicht zu unterscheiden und beide können gleichzeitig vorliegen. Die Gelenkpunktion mit Zellzahl, Gramfärbung und Kultur gehört zwingend in die Antwort.',
        'Bei der Akuttherapie ausdrücklich die KORTIKOSTEROIDE nennen — Prüfer bestehen darauf; NSAR und Colchicin allein reichen als Antwort oft nicht.',
        '„Sollte der Patient abnehmen?“ ist eine Fangfrage: ja, aber langsam. Fasten, Nulldiät und rasche Gewichtsabnahme verschlechtern die Symptome und lösen über Ketose und Laktat neue Anfälle aus.',
        'Vor dem Patienten „Harnsäure“ statt nur „Urat“ sagen und „Arthritis urica“ übersetzen: Gicht bzw. Gichtanfall; Podagra = Befall des Großzehengrundgelenks, Gonagra = Knie, Chiragra = Daumengrundgelenk.',
        'Eine laufende Allopurinol-Therapie wird im akuten Anfall NICHT abgesetzt; eine neue wird klassischerweise erst nach Abklingen begonnen — und dann immer einschleichend und unter Anfallsprophylaxe.',
        'Die asymptomatische Hyperurikämie ist allein keine Indikation für Allopurinol — nur Lebensstilmaßnahmen und Kontrollen.',
        'Allopurinol darf nicht mit Azathioprin oder 6-Mercaptopurin kombiniert werden (Knochenmarkdepression durch Hemmung des Abbaus).',
        'Die Nierenfunktion nicht vergessen: Sie steuert die Auswahl zwischen NSAR und Colchicin, und die Hyperurikämie führt selbst zu Harnsäuresteinen und Uratnephropathie. Harnsäuresteine sind im Röntgen NICHT schattengebend — Sonographie!',
        'Im akuten Anfall ist das Röntgen meist unauffällig (nur Weichteilschwellung); die typischen Stanzdefekte sind ein Spätzeichen der chronischen Gicht.',
        'Bei der Punktion die Kristalle korrekt beschreiben: nadelförmig und NEGATIV doppelbrechend bei der Gicht, rhomboid und POSITIV doppelbrechend bei der Pseudogicht.',
        'Auslösende Medikamente aktiv erfragen — Thiaziddiuretika werden von Patienten oft nur als „Wassertablette“ erwähnt, ebenso niedrig dosierte Acetylsalicylsäure und Ciclosporin.',
      ],
      askedInExam: [
        {
          frage: 'Wie lautet Ihre Verdachtsdiagnose, und was spricht dafür?',
          antwort: 'Ein akuter Gichtanfall, eine Arthritis urica des Großzehengrundgelenks, also eine Podagra. Dafür sprechen der perakute nächtliche Beginn, der monoartikuläre Befall des MTP I mit Rubor, Calor, Tumor, Dolor und Functio laesa, die extreme Berührungsempfindlichkeit, der Auslöser in Form einer purin- und alkoholreichen Mahlzeit sowie die Risikofaktoren männliches Geschlecht, Adipositas und regelmäßiger Bierkonsum.',
        },
        {
          frage: 'Wie nennen Sie „Arthritis urica“ dem Patienten gegenüber auf Deutsch?',
          antwort: 'Gicht beziehungsweise Gichtanfall — eine Gelenkentzündung durch Harnsäurekristalle. Podagra heißt sie, weil das Großzehengrundgelenk befallen ist; beim Knie spricht man von Gonagra, beim Daumengrundgelenk von Chiragra.',
        },
        {
          frage: 'Welche Differenzialdiagnosen kommen in Betracht, und warum sind sie unwahrscheinlich?',
          antwort: 'Septische Arthritis, Pseudogicht, aktivierte Arthrose, Erysipel, reaktive Arthritis, rheumatoide Arthritis, rheumatisches Fieber und ein Trauma. Gegen die meisten sprechen der monoartikuläre Befall ohne Beteiligung mehrerer Gelenke, das Fehlen von Fieber, die fehlende Morgensteifigkeit, das fehlende Trauma und der fehlende vorangegangene Infekt.',
        },
        {
          frage: 'Kann der Harnsäurespiegel bei einem akuten Gichtanfall normal sein? Dürfen wir dann einen Gichtanfall ausschließen?',
          antwort: 'Ja, er kann normal sein — in bis zu einem Drittel der Fälle, weil die Harnsäure gerade im Gelenk auskristallisiert. Ausschließen darf man die Gicht deshalb nicht. Sowohl ein plötzlicher Anstieg als auch ein plötzlicher Abfall der Harnsäure kann einen Anfall auslösen; der Wert wird 2–4 Wochen nach dem Anfall kontrolliert.',
        },
        {
          frage: 'Welche Entzündungsparameter bestimmen Sie, und wozu das Procalcitonin?',
          antwort: 'CRP, BSG und ein Blutbild mit Differenzialblutbild — bei der Gicht finden sich eine Leukozytose mit Neutrophilie und ein erhöhtes CRP. Das Procalcitonin bleibt bei der Kristallarthritis typischerweise normal und dient dem Ausschluss einer bakteriellen Genese.',
        },
        {
          frage: 'Was ist im Labor bei diesem Patienten besonders wichtig, und was würden Sie zusätzlich untersuchen?',
          antwort: 'Neben der Harnsäure vor allem das Kreatinin und die Nierenwerte, da die Hyperurikämie zu Harnsäuresteinen und einer Uratnephropathie führt und die Nierenfunktion die Therapieauswahl bestimmt. Zusätzlich eine Sonographie der Nieren zum Ausschluss von Harnsäuresteinen und einem Harnstau.',
        },
        {
          frage: 'Was findet man in der Gelenkpunktion beziehungsweise in der Pathologie?',
          antwort: 'Ein trübes, entzündliches Punktat mit erhöhter Zellzahl und Granulozytose sowie im Polarisationsmikroskop nadelförmige, negativ doppelbrechende Natriumuratkristalle, teils intrazellulär phagozytiert. Gramfärbung und Kultur bleiben steril. Histologisch zeigen Tophi Uratablagerungen mit Fremdkörperriesenzellen — die Probe muss in Alkohol fixiert werden, da Urate wasserlöslich sind.',
        },
        {
          frage: 'Welche Risikofaktoren für einen Gichtanfall bestehen bei diesem Patienten?',
          antwort: 'Alkoholkonsum, insbesondere Bier, Übergewicht beziehungsweise morbide Adipositas, purinreiche fleischbetonte Ernährung, männliches Geschlecht, Lebensalter, eine Thiaziddiuretika-Einnahme, körperliche Belastung im Beruf sowie psychische Belastung mit reaktivem Ess- und Trinkverhalten.',
        },
        {
          frage: 'Was sind purinreiche Lebensmittel, und welche Lebensstiländerungen empfehlen Sie?',
          antwort: 'Innereien wie Leber und Niere, rotes Fleisch und Wurst, Fleischbrühen, Sardellen, Sardinen, Hering, Meeresfrüchte und Hefeextrakt. Empfohlen werden purinarme Kost, Verzicht auf Bier und fruktosehaltige Softdrinks, eine Trinkmenge von 2–3 Litern täglich, langsame Gewichtsreduktion und regelmäßige moderate Bewegung.',
        },
        {
          frage: 'Wie behandeln Sie den akuten Anfall?',
          antwort: 'Ruhigstellung, Hochlagerung und Kühlung, dazu NSAR in ausreichender Dosis unter Magenschutz, alternativ Colchicin 1 mg initial und 0,5 mg nach einer Stunde, sowie Kortikosteroide — Prednisolon 30–35 mg über drei bis fünf Tage oder intraartikulär nach Ausschluss einer Infektion. Zusätzlich reichlich Flüssigkeit und Alkoholkarenz.',
        },
        {
          frage: 'Und wie sieht die Dauertherapie aus?',
          antwort: 'Nach Abklingen des Anfalls eine harnsäuresenkende Therapie mit einem Urikostatikum: Allopurinol einschleichend ab 100 mg bis meist 300 mg täglich, Zielwert unter 6 mg/dl; alternativ Febuxostat oder ein Urikosurikum wie Benzbromaron. Begleitend für drei bis sechs Monate eine Anfallsprophylaxe mit niedrig dosiertem Colchicin, dazu purinarme Ernährung, Alkoholkarenz, Gewichtsreduktion und Umstellung auslösender Medikamente.',
        },
        {
          frage: 'Welche Komplikationen kann eine Hyperurikämie außer der Gicht haben?',
          antwort: 'Harnsäuresteine mit Nierenkoliken, die akute und chronische Uratnephropathie mit Niereninsuffizienz, Tophi in Weichteilen, Ohrmuschel und Sehnen, die chronische Gichtarthropathie mit Gelenkdestruktion sowie ein erhöhtes kardiovaskuläres Risiko im Rahmen des metabolischen Syndroms.',
        },
        {
          frage: 'Der Patient ist übergewichtig — sollte er abnehmen? Was kann eine Gewichtsabnahme bewirken?',
          antwort: 'Ja, aber langsam und kontrolliert, etwa ein halbes bis ein Kilogramm pro Woche. Eine zu rasche Gewichtsabnahme oder Fasten führt über Ketonkörper und Laktat zu einer verminderten renalen Harnsäureausscheidung und kann die Symptome verschlechtern beziehungsweise einen neuen Anfall auslösen.',
        },
        {
          frage: 'Warum würden Sie eine Psychotherapie empfehlen?',
          antwort: 'Wegen des Alkoholabusus, der als Bewältigungsstrategie eines Verlusttraumas nach dem Motorradunfall dient, wegen der depressiven Symptomatik und Schuldgefühle, des übermäßigen Essverhaltens und des Verlusts sozialer Kontakte. Ohne Bearbeitung dieser Belastung sind Alkoholkarenz und Gewichtsreduktion — die kausalen Maßnahmen — kaum umsetzbar.',
        },
        {
          frage: 'Warum treten die Beschwerden gerade nachts auf?',
          antwort: 'Nachts sinken die Temperatur im peripheren Gewebe und der Flüssigkeitsgehalt des Gelenks. Dadurch nimmt die Löslichkeit der Harnsäure ab und Natriumuratkristalle fallen aus — deshalb ist das kühle, periphere Großzehengrundgelenk der klassische Erstmanifestationsort.',
        },
      ],
      merksatz: 'Podagra nachts nach Bier und Braten = Gicht — aber eine normale Harnsäure schließt sie NIE aus, und ohne Gelenkpunktion ist die septische Arthritis nicht ausgeschlossen. Im Anfall NSAR, Colchicin oder Kortikosteroide; Allopurinol erst zwei Wochen später, einschleichend und unter Colchicin-Schutz.',
      linkedCaseIds: [
        'case-gicht',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-feinnadelpunktion',
        'auf-sonographie',
      ],
    },
    {
      id: 'fw-multiple-sklerose',
      pathology: 'Multiple Sklerose',
      specialty: 'Neurologie',
      definition: 'Chronisch-entzündliche, immunvermittelte Erkrankung des zentralen Nervensystems mit herdförmiger Demyelinisierung (Entmarkungsherde/Plaques) und axonaler Schädigung in Gehirn, Sehnerv und Rückenmark. Charakteristisch ist die Dissemination der Läsionen in ORT und ZEIT. Häufigste neurologische Ursache einer bleibenden Behinderung bei jungen Erwachsenen; Erkrankungsgipfel zwischen dem 20. und 40. Lebensjahr, Frauen sind etwa doppelt bis dreifach häufiger betroffen.',
      aetiologie: 'Multifaktoriell: autoimmune, überwiegend T-Zell-vermittelte Reaktion gegen Myelinbestandteile des ZNS bei genetischer Prädisposition (HLA-DRB1*15:01) und Umweltfaktoren. Als wichtigste Umweltfaktoren gelten eine durchgemachte Epstein-Barr-Virus-Infektion, Vitamin-D-Mangel bzw. geringe Sonnenexposition (Nord-Süd-Gefälle der Prävalenz), Nikotinkonsum, Adipositas im Jugendalter und Störungen des Darmmikrobioms. Eine einzelne Ursache existiert nicht; die Erkrankung ist nicht im klassischen Sinne erblich, das Risiko für Verwandte ersten Grades ist jedoch leicht erhöht.',
      risikofaktoren: [
        'Weibliches Geschlecht',
        'Alter zwischen 20 und 40 Jahren',
        'Positive Familienanamnese (Verwandte ersten Grades)',
        'HLA-DRB1*15:01',
        'Durchgemachte Epstein-Barr-Virus-Infektion (infektiöse Mononukleose)',
        'Vitamin-D-Mangel, geringe Sonnenexposition, Wohnort in höheren geographischen Breiten',
        'Nikotinkonsum',
        'Adipositas in Kindheit und Jugend',
      ],
      klinik: [
        {
          text: 'Sensibilitätsstörungen als häufigste Erstmanifestation: Kribbelparästhesien, Taubheits- und pelziges Gefühl, meist einseitig und schmerzlos',
        },
        {
          text: 'Optikusneuritis/Retrobulbärneuritis: einseitiger, über Stunden bis Tage zunehmender Visusverlust, Schmerz bei Augenbewegung, Farbentsättigung, Zentralskotom, relative afferente Pupillenstörung (Marcus-Gunn-Pupille) — „der Patient sieht nichts und der Arzt sieht nichts“',
        },
        {
          text: 'Zentrale Paresen: Kraftminderung mit Spastik, gesteigerten Muskeleigenreflexen und positivem Babinski-Zeichen; Gehstrecke verkürzt, Treppensteigen erschwert',
        },
        {
          text: 'Zerebelläre Symptome: Gang- und Standataxie, Intentionstremor, Dysmetrie, skandierende Sprache (Charcot-Trias: Nystagmus, Intentionstremor, skandierende Sprache)',
        },
        {
          text: 'Hirnstammsymptome: Doppelbilder, internukleäre Ophthalmoplegie, Nystagmus, Schwindel, Fazialisparese',
        },
        {
          text: 'Uhthoff-Phänomen: reversible Verschlechterung bestehender Symptome bei Wärme, Fieber oder körperlicher Anstrengung (Pseudoschub, kein neuer Schub)',
        },
        {
          text: 'Lhermitte-Zeichen: beim Vorbeugen des Kopfes elektrisierende Missempfindung entlang der Wirbelsäule in Arme oder Beine (Hinweis auf zervikale Läsion)',
        },
        {
          text: 'Fatigue — abnorme, durch Schlaf nicht behebbare Erschöpfung; für Betroffene oft das belastendste Symptom, wird ohne gezielte Frage nicht berichtet',
          atypisch: true,
        },
        {
          text: 'Blasenstörungen (imperativer Harndrang, Restharnbildung, Inkontinenz) und Sexualfunktionsstörungen — werden aus Scham häufig verschwiegen',
          atypisch: true,
        },
        {
          text: 'Kognitive Störungen (Aufmerksamkeit, Gedächtnis, Verarbeitungsgeschwindigkeit) und depressive Symptome',
          atypisch: true,
        },
        {
          text: 'Trigeminusneuralgie bei jungen Menschen — bis zum Beweis des Gegenteils an eine Multiple Sklerose denken',
          atypisch: true,
        },
        {
          text: 'Primär progredienter Verlauf ohne Schübe mit langsam zunehmender spastischer Paraparese, vor allem bei Erkrankungsbeginn jenseits des 40. Lebensjahres',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'McDonald-Kriterien (Revision 2017)',
          inhalt: 'Diagnosestellung über den Nachweis der Dissemination in ORT (Läsionen in mindestens zwei von vier typischen Regionen: periventrikulär, kortikal/juxtakortikal, infratentoriell, spinal) und in ZEIT (gleichzeitiges Vorliegen kontrastmittelaufnehmender und nicht aufnehmender Läsionen, neue Läsion im Verlaufs-MRT oder ein zweiter Schub). Der Nachweis liquorspezifischer oligoklonaler Banden kann die zeitliche Dissemination ersetzen — dadurch ist die Diagnose bereits beim ersten Schub möglich. Voraussetzung ist stets der Ausschluss besser erklärender Differenzialdiagnosen.',
        },
        {
          name: 'Verlaufsformen',
          inhalt: 'Klinisch isoliertes Syndrom (CIS) und radiologisch isoliertes Syndrom (RIS) als Vorstufen; schubförmig-remittierend (RRMS, ca. 85 % zu Beginn); sekundär progredient (SPMS) nach initial schubförmigem Verlauf; primär progredient (PPMS, ca. 10–15 %, ohne Schübe von Anfang an). Zusätzlich wird nach Krankheitsaktivität (aktiv/nicht aktiv) und Progression unterschieden.',
        },
        {
          name: 'EDSS (Expanded Disability Status Scale nach Kurtzke)',
          inhalt: 'Skala von 0 (normaler neurologischer Befund) bis 10 (Tod infolge der MS); 4,0 = Gehstrecke 500 m ohne Hilfe, 6,0 = einseitige Gehhilfe erforderlich, 7,0 = überwiegend Rollstuhl. Standard zur Verlaufsbeurteilung und in Studien.',
        },
        {
          name: 'Schub-Definition',
          inhalt: 'Neue oder erneut aufgetretene neurologische Symptomatik, die länger als 24 Stunden anhält, mindestens 30 Tage nach Beginn des letzten Schubes auftritt und nicht durch Fieber, Infekt oder Wärme erklärbar ist (Abgrenzung zum Pseudoschub).',
        },
      ],
      redFlags: [
        'Schwerer Schub mit Hirnstammbeteiligung: Schluckstörung, Dysarthrie, Atemstörung, Vigilanzminderung',
        'Akute Querschnittsymptomatik mit Blasen-Mastdarm-Störung → sofortiges MRT, Ausschluss einer Rückenmarkskompression',
        'Beidseitige oder schwere Optikusneuritis mit ausgeprägtem Visusverlust → Verdacht auf NMOSD (Aquaporin-4-Antikörper), da Interferone hier den Verlauf verschlechtern',
        'Fieber, Meningismus oder Bewusstseinsstörung → Infektion bzw. ADEM ausschließen, keine Kortison-Stoßtherapie vor Infektausschluss',
        'Rasch progrediente Parese oder Verschlechterung unter laufender Immuntherapie (bei Natalizumab an eine progressive multifokale Leukenzephalopathie denken)',
        'Neu aufgetretene Krampfanfälle oder ausgeprägte kognitive Verschlechterung → alternative Diagnose prüfen',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Anamnese mit gezielter Suche nach der zeitlichen Dissemination: frühere, spontan rückläufige Episoden (Sehstörung, Doppelbilder, Taubheitsgefühle, Gangstörung), Uhthoff-Phänomen, Lhermitte-Zeichen, Fatigue, Blasen- und Sexualfunktionsstörungen',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Vollständiger neurologischer Status: Hirnnerven inklusive Visus, Farbsehen und Pupillenreaktion (RAPD), Augenmotilität (internukleäre Ophthalmoplegie, Nystagmus), Kraftgrade 0–5 im Seitenvergleich, Muskeltonus, Muskeleigenreflexe, Pyramidenbahnzeichen (Babinski), Sensibilität für Berührung, Schmerz, Temperatur und Vibration nach Dermatomen, Koordination (Finger-Nase-, Knie-Hacken-Versuch, Romberg, Unterberger), Gangbild',
        },
        {
          stufe: 'Labor',
          text: 'Basislabor zum Ausschluss von Differenzialdiagnosen: Blutbild, CRP, BSG, Elektrolyte, Leber- und Nierenwerte, TSH, Vitamin B12 und Folsäure, HbA1c, Vitamin D',
        },
        {
          stufe: 'Labor',
          text: 'Immunologie und Infektiologie: ANA/ENA, ANCA, Borrelien-Serologie, HIV, Lues; Aquaporin-4- und MOG-Antikörper zur Abgrenzung von NMOSD und MOG-Antikörper-Erkrankung',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'MRT des Schädels und der gesamten Wirbelsäule mit Kontrastmittel — Methode der Wahl: Entmarkungsherde periventrikulär (Dawson-Finger), juxtakortikal, infratentoriell und spinal; kontrastmittelaufnehmende Läsionen entsprechen aktiven Herden mit Blut-Hirn-Schranken-Störung',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Optische Kohärenztomographie (OCT): Verdünnung der retinalen Nervenfaserschicht nach abgelaufener Optikusneuritis',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Lumbalpunktion mit Liquordiagnostik: liquorspezifische oligoklonale Banden (in über 90 % nachweisbar), erhöhter IgG-Index, leichte mononukleäre Pleozytose (< 50 Zellen/µl), positive MRZ-Reaktion (Masern, Röteln, Varizella zoster); zugleich Ausschluss von Infektionen',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Evozierte Potenziale zum Nachweis klinisch stummer Läsionen: VEP (verlängerte P100-Latenz), SEP und MEP',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Urodynamik und Restharnbestimmung bei Blasenstörungen; neuropsychologische Testung bei kognitiven Beschwerden',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Neuromyelitis-optica-Spektrum-Erkrankung (NMOSD)',
          unterscheidung: 'schwere, oft beidseitige Optikusneuritis und langstreckige Myelitis über mindestens drei Wirbelkörpersegmente; Aquaporin-4-Antikörper positiv, oligoklonale Banden meist negativ; therapeutisch entscheidend, da Interferon-beta den Verlauf verschlechtert.',
        },
        {
          dd: 'Akute disseminierte Enzephalomyelitis (ADEM)',
          unterscheidung: 'monophasisch, meist bei Kindern, wenige Tage bis Wochen nach Infekt oder Impfung; Enzephalopathie mit Bewusstseinsstörung und Fieber, große konfluierende Herde, keine zeitliche Dissemination.',
        },
        {
          dd: 'Neuroborreliose',
          unterscheidung: 'Zeckenstich, Erythema migrans; schmerzhafte Radikulitis (Bannwarth-Syndrom), Fazialisparese; Liquor mit lymphozytärer Pleozytose und intrathekaler Borrelien-Antikörperbildung (positiver Antikörper-Index).',
        },
        {
          dd: 'Funikuläre Myelose bei Vitamin-B12-Mangel',
          unterscheidung: 'symmetrische Hinterstrang- und Pyramidenbahnsymptomatik, Pallhypästhesie, makrozytäre Anämie; Risikogruppen: vegane Ernährung, atrophische Gastritis, Zustand nach Magenresektion, Metformin.',
        },
        {
          dd: 'Zerebrale Vaskulitis / Kollagenose (SLE, Neuro-Sjögren)',
          unterscheidung: 'Allgemeinsymptome, Gelenk- und Hautbeteiligung, Sicca-Symptomatik, erhöhte Entzündungsparameter, positive Autoantikörper; MRT-Läsionen eher vaskulär verteilt.',
        },
        {
          dd: 'Spinaler Tumor oder Rückenmarkskompression (Bandscheibenvorfall, Spinalkanalstenose)',
          unterscheidung: 'Schmerzen, sensibles Niveau, langsam progredient ohne Remissionen; klare Darstellung der Kompression im MRT der Wirbelsäule.',
        },
        {
          dd: 'Polyneuropathie',
          unterscheidung: 'distal-symmetrische, sockenförmige Missempfindungen mit abgeschwächten Reflexen (peripheres Muster) — bei MS zentrales Muster mit gesteigerten Reflexen und Babinski-Zeichen; Elektroneurographie.',
        },
        {
          dd: 'Migräne mit Aura',
          unterscheidung: 'kurze, vollständig reversible Aura über 5–60 Minuten mit anschließendem Kopfschmerz, Übelkeit und Photophobie; MRT-Marklagerläsionen ohne typische MS-Verteilung, oligoklonale Banden negativ.',
        },
        {
          dd: 'Funktionelle neurologische Störung',
          unterscheidung: 'inkonsistente Befunde, positive klinische Zeichen (Hoover-Zeichen), fehlendes strukturelles Korrelat; nur als Ausschlussdiagnose nach unauffälligem MRT und Liquor zulässig.',
        },
      ],
      therapie: [
        {
          label: 'Schubtherapie (akuter Schub)',
          items: [
            'Methylprednisolon 1000 mg i.v. über 3 bis 5 Tage als Stoßtherapie, morgendliche Gabe',
            'Begleitend Protonenpumpenhemmer als Magenschutz und Thromboseprophylaxe, Kontrolle von Blutzucker, Blutdruck und Elektrolyten',
            'Vor Therapiebeginn Infekt ausschließen (Harnwegsinfekt, Atemwegsinfekt) — ein Pseudoschub bei Fieber oder Wärme (Uhthoff-Phänomen) wird nicht mit Kortison behandelt',
            'Bei unzureichendem Ansprechen: eskalierte Stoßtherapie mit 2000 mg/Tag oder Plasmapherese bzw. Immunadsorption',
            'Leichte, rein sensible Schübe können auch ohne Kortison beobachtet werden',
          ],
          akut: true,
        },
        {
          label: 'Verlaufsmodifizierende Immuntherapie (Basistherapie)',
          items: [
            'Möglichst früher Beginn nach Diagnosesicherung — Ziel: Senkung der Schubrate, der MRT-Aktivität und der Behinderungsprogression',
            'Milde bis moderate Verlaufsform: Interferon-beta, Glatirameracetat, Dimethylfumarat, Teriflunomid',
            'Hochaktive Verlaufsform: Natalizumab, Ocrelizumab, Ofatumumab, Fingolimod, Cladribin, Alemtuzumab',
            'Primär progrediente MS: Ocrelizumab als einzige zugelassene verlaufsmodifizierende Option',
            'Vor Beginn: Impfstatus vervollständigen, Tuberkulose- und Hepatitis-Screening, JC-Virus-Antikörper vor Natalizumab (Risiko der progressiven multifokalen Leukenzephalopathie), Familienplanung und Verhütung besprechen (Teriflunomid teratogen)',
            'Verlaufskontrollen mit klinischer Untersuchung, EDSS, Labor und regelmäßigem MRT',
          ],
        },
        {
          label: 'Symptomatische Therapie und Rehabilitation',
          items: [
            'Physiotherapie, Ergotherapie und Logopädie; regelmäßiges, dosiertes Ausdauer- und Krafttraining',
            'Spastik: Baclofen, Tizanidin, bei fokaler Spastik Botulinumtoxin; Cannabinoid-Spray als Reserveoption',
            'Fatigue: Energiemanagement, Aktivitätsdosierung, Vermeidung von Hitze, Behandlung von Schlafstörung und Depression',
            'Blasenstörung: urologische Abklärung, Anticholinergika, intermittierender Selbstkatheterismus bei Restharn',
            'Neuropathische Schmerzen: Gabapentin oder Pregabalin; Trigeminusneuralgie: Carbamazepin',
            'Depression und Angst: psychologische Mitbetreuung, ggf. Antidepressivum',
            'Hilfsmittelversorgung, Wohnraumanpassung (barrierefreies Wohnen, Erdgeschoss oder Aufzug), Sozialdienst, berufliche Rehabilitation',
          ],
        },
        {
          label: 'Patientenführung und Langzeitbetreuung',
          items: [
            'Aufklärung: chronische, derzeit nicht heilbare, aber gut behandelbare Erkrankung — realistische Perspektive vermitteln, keine Heilung versprechen',
            'Schubauslöser meiden und behandeln: Infekte frühzeitig therapieren, Hitze meiden, Stress reduzieren, konsequente Nikotinkarenz',
            'Vitamin-D-Substitution und ausgewogene Ernährung; Impfungen rechtzeitig vor Immuntherapie',
            'Kinderwunsch und Schwangerschaft planen — Schwangerschaft ist möglich, die Schubrate sinkt im letzten Trimenon und steigt postpartal; Therapieauswahl entsprechend anpassen',
            'Anbindung an eine MS-Ambulanz, MS-Nurse, Selbsthilfegruppe und Sozialberatung (Schwerbehindertenausweis, Arbeitsplatzanpassung)',
          ],
        },
      ],
      prognose: 'Sehr variabel und individuell nicht sicher vorhersagbar. Etwa 85 % beginnen schubförmig-remittierend; ein erheblicher Teil geht ohne Therapie im Verlauf in eine sekundär progrediente Form über. Die Lebenserwartung ist nur wenig verkürzt. Günstige Prognosefaktoren sind weibliches Geschlecht, junges Erkrankungsalter, rein sensible oder Optikusneuritis-Erstmanifestation, vollständige Rückbildung des ersten Schubes, niedrige Schubfrequenz in den ersten Jahren und geringe MRT-Läsionslast. Ungünstig sind männliches Geschlecht, motorische oder zerebelläre Erstsymptomatik, hohe frühe Schubrate, unvollständige Remission, hohe Läsionslast und ein primär progredienter Verlauf. Moderne, früh begonnene Immuntherapien haben den Verlauf deutlich verbessert.',
      pruefungsfallen: [
        'Die MS ist eine Diagnose der Dissemination in ORT UND ZEIT — immer aktiv nach früheren, spontan abgeklungenen Episoden fragen (Sehstörung, Doppelbilder, Taubheitsgefühl); ohne diese Frage fehlt der entscheidende Baustein.',
        'Uhthoff-Phänomen (Verschlechterung bei Wärme/Fieber) ist ein PSEUDOSCHUB und keine Indikation für eine Kortison-Stoßtherapie — vor jeder Stoßtherapie einen Infekt ausschließen.',
        'MRT immer von Schädel UND Wirbelsäule und immer mit Kontrastmittel — nur so lassen sich aktive von älteren Läsionen unterscheiden.',
        'Parese = unvollständige Lähmung, Plegie/Paralyse = vollständige Lähmung; Hypästhesie = herabgesetzte Berührungsempfindung, Parästhesie = Missempfindung ohne Reiz.',
        'Vor Interferon-beta die Aquaporin-4-Antikörper bedenken: Bei NMOSD verschlechtern Interferone den Verlauf.',
        'Oligoklonale Banden müssen LIQUORSPEZIFISCH sein — nur im Liquor, nicht parallel im Serum nachweisbar.',
        'Die Diagnose darf nur nach Ausschluss besser erklärender Differenzialdiagnosen gestellt werden (Vitamin-B12-Mangel, Borreliose, Kollagenose, spinale Kompression).',
        'Aufklärung: chronisch und nicht heilbar, aber behandelbar — niemals eine vollständige Heilung versprechen, aber auch nicht die Hoffnung nehmen.',
        'Fatigue, Blasen- und Sexualfunktionsstörungen sowie depressive Symptome werden spontan nicht berichtet — aktiv und taktvoll erfragen.',
        'Bei einer Trigeminusneuralgie oder einer internukleären Ophthalmoplegie beim jungen Erwachsenen immer an eine MS denken.',
      ],
      askedInExam: [
        {
          frage: 'Wie lautet Ihre Verdachtsdiagnose und wie begründen Sie sie?',
          antwort: 'Eine Multiple Sklerose als Erstmanifestation: junge Patientin mit schmerzloser sensomotorischer Symptomatik eines Beins seit drei Monaten und anamnestisch einer spontan rückläufigen einseitigen Sehstörung vor drei Jahren — damit besteht eine Dissemination in Ort und in Zeit; zusätzlich sprechen Uhthoff-Phänomen und Lhermitte-Zeichen dafür.',
        },
        {
          frage: 'Warum sprechen Sie von einer Parese?',
          antwort: 'Weil es sich um eine Kraftminderung, also eine unvollständige Lähmung handelt. Eine vollständige Lähmung wäre eine Plegie oder Paralyse.',
        },
        {
          frage: 'Wie unterscheiden Sie eine Hypästhesie von einer Parästhesie?',
          antwort: 'Die Hypästhesie ist eine herabgesetzte Empfindung für Berührungsreize — der Patient spürt weniger. Die Parästhesie ist eine Missempfindung ohne äußeren Reiz, also Kribbeln, Ameisenlaufen oder ein pelziges Gefühl.',
        },
        {
          frage: 'In welchen Formen kann eine Multiple Sklerose verlaufen?',
          antwort: 'Schubförmig-remittierend in etwa 85 % zu Beginn, sekundär progredient nach initial schubförmigem Verlauf und primär progredient von Anfang an; vorgeschaltet sind das klinisch isolierte Syndrom und das radiologisch isolierte Syndrom.',
        },
        {
          frage: 'Was verstehen Sie unter einem Schub?',
          antwort: 'Eine neue oder erneut aufgetretene neurologische Symptomatik, die länger als 24 Stunden anhält, mindestens 30 Tage nach dem letzten Schub auftritt und nicht durch Fieber, Infekt oder Wärme erklärbar ist.',
        },
        {
          frage: 'Was sehen Sie im MRT?',
          antwort: 'Entmarkungsherde beziehungsweise Plaques periventrikulär, juxtakortikal, infratentoriell und spinal; periventrikulär die senkrecht zu den Ventrikeln verlaufenden Dawson-Finger. Kontrastmittelaufnehmende Läsionen entsprechen aktiven Herden mit gestörter Blut-Hirn-Schranke.',
        },
        {
          frage: 'Wie sichern Sie die Diagnose einer Multiplen Sklerose?',
          antwort: 'Nach den McDonald-Kriterien aus Klinik, MRT und Liquor: liquorspezifische oligoklonale Banden, erhöhter IgG-Index, leichte mononukleäre Pleozytose und positive MRZ-Reaktion; ergänzend evozierte Potenziale, insbesondere ein VEP mit verlängerter P100-Latenz, sowie die Bestimmung der Aquaporin-4- und MOG-Antikörper.',
        },
        {
          frage: 'Welche Untersuchung machen Sie bei Verdacht auf eine Optikusneuritis?',
          antwort: 'Visusprüfung, Farbsehen, Gesichtsfeld, Prüfung der relativen afferenten Pupillenstörung (Swinging-Flashlight-Test), Funduskopie — meist unauffällig, da retrobulbär — sowie VEP und OCT.',
        },
        {
          frage: 'Benötigt die Patientin eine dringende Hospitalisierung?',
          antwort: 'Nein, es handelt sich nicht um einen Notfall. Die Abklärung kann elektiv oder kurzstationär erfolgen. Dringlich wird es bei schwerem Schub mit Hirnstammbeteiligung, akuter Querschnittsymptomatik oder Blasen-Mastdarm-Störung.',
        },
        {
          frage: 'Welche Therapie empfehlen Sie?',
          antwort: 'Im Schub eine Kortikosteroid-Stoßtherapie mit Methylprednisolon 1000 mg i.v. über drei bis fünf Tage unter Magenschutz und Thromboseprophylaxe, bei Steroidrefraktärität eine Plasmapherese. Anschließend eine verlaufsmodifizierende Immuntherapie je nach Krankheitsaktivität sowie eine symptomatische Therapie mit Physio- und Ergotherapie.',
        },
        {
          frage: 'Was ist das Uhthoff-Phänomen und was das Lhermitte-Zeichen?',
          antwort: 'Das Uhthoff-Phänomen ist eine vorübergehende Verschlechterung bestehender Symptome bei Wärme oder Anstrengung. Das Lhermitte-Zeichen ist eine elektrisierende Missempfindung entlang der Wirbelsäule beim Vorbeugen des Kopfes und weist auf eine zervikale Läsion hin.',
        },
        {
          frage: 'Ist die Multiple Sklerose heilbar? Wie klären Sie den Patienten auf?',
          antwort: 'Nein, sie ist chronisch und nach heutigem Stand nicht heilbar, aber gut behandelbar. Ich erkläre in einfachen Worten, dass Schübe wirksam behandelt werden können, dass moderne Medikamente die Schubrate senken und das Fortschreiten verzögern und dass viele Betroffene über Jahrzehnte ein weitgehend normales Leben führen — ohne eine Heilung zu versprechen.',
        },
        {
          frage: 'Kann die Pille die Ursache der Beschwerden sein?',
          antwort: 'Nein, orale Kontrazeptiva verursachen keine Multiple Sklerose. Sie müssen nicht abgesetzt werden, sind aber bei der Auswahl der Immuntherapie und bei der Familienplanung mitzubedenken.',
        },
        {
          frage: 'Welche Prognose hat die Erkrankung?',
          antwort: 'Sehr variabel. Günstig sind weibliches Geschlecht, junges Alter, sensible oder Optikusneuritis-Erstmanifestation und vollständige Remission des ersten Schubes; ungünstig sind motorische oder zerebelläre Erstsymptome, hohe frühe Schubrate und ein primär progredienter Verlauf. Die Lebenserwartung ist nur wenig verkürzt.',
        },
      ],
      merksatz: 'Multiple Sklerose = Dissemination in ORT und ZEIT: Bei jedem jungen Erwachsenen mit neurologischem Defizit aktiv nach früheren, spontan abgeklungenen Episoden fragen (Sehstörung!). Merke: Uhthoff bei Wärme = Pseudoschub (kein Kortison), Lhermitte beim Kopfbeugen = zervikale Läsion.',
      linkedCaseIds: [
        'case-multiple-sklerose',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-mrt',
        'auf-lumbalpunktion',
      ],
    },
    {
      id: 'fw-reizdarm',
      pathology: 'Reizdarmsyndrom',
      specialty: 'Gastroenterologie',
      definition: 'Das Reizdarmsyndrom (Colon irritabile, Reizkolon) ist eine funktionelle Darmerkrankung mit chronischen Bauchschmerzen und Stuhlgangsveränderungen ohne nachweisbare strukturelle, infektiöse oder biochemische Ursache. Es ist eine AUSSCHLUSSDIAGNOSE: Sie wird anhand der Rom-IV-Kriterien positiv gestellt, nachdem organische Erkrankungen ausgeschlossen wurden. Mit einer Prävalenz von etwa 10-15 % ist es die häufigste Diagnose in der gastroenterologischen Sprechstunde, Frauen sind etwa doppelt so häufig betroffen.',
      aetiologie: 'Multifaktoriell: Störung der Darm-Hirn-Achse mit viszeraler Hypersensitivität, veränderter Darmmotilität, gestörter epithelialer Barrierefunktion ("leaky gut"), niedriggradiger Schleimhautentzündung und Dysbiose der Darmflora. Psychosozialer Stress, ein postinfektiöser Verlauf nach Gastroenteritis (postinfektiöses Reizdarmsyndrom), Antibiotikatherapien und Ernährungsfaktoren (FODMAP) wirken als Trigger. CAVE: Es handelt sich NICHT um eine psychosomatische Erkrankung im engeren Sinne — Stress ist Triggerfaktor und Verstärker, nicht Ursache, und die Beschwerden sind organisch real.',
      risikofaktoren: [
        'Weibliches Geschlecht (etwa 2:1)',
        'Alter zwischen 20 und 50 Jahren bei Erstmanifestation',
        'Chronischer psychosozialer Stress, belastende Lebensereignisse',
        'Zustand nach infektiöser Gastroenteritis (postinfektiöses RDS)',
        'Komorbide Angststörung, Depression oder Somatisierungsstörung',
        'Positive Familienanamnese für funktionelle Störungen',
        'Vorangegangene Antibiotikatherapien',
        'Fibromyalgie, chronisches Erschöpfungssyndrom, chronische Beckenschmerzen',
      ],
      klinik: [
        {
          text: 'Rezidivierende, krampfartige oder drückende Bauchschmerzen, oft im Unterbauch oder diffus, häufig postprandial',
        },
        {
          text: 'Besserung der Schmerzen nach der Defäkation oder nach Windabgang — das wichtigste anamnestische Leitmerkmal',
        },
        {
          text: 'Änderung der Stuhlfrequenz (Obstipation, Diarrhoe oder Wechsel beider)',
        },
        {
          text: 'Änderung der Stuhlform und -konsistenz (Bristol-Stuhlformenskala)',
        },
        {
          text: 'Meteorismus, Flatulenz, Völlegefühl, sichtbar aufgeblähter Bauch',
        },
        {
          text: 'Gefühl der unvollständigen Entleerung, imperativer Stuhldrang, Schleimauflagerungen',
        },
        {
          text: 'Beschwerden treten typischerweise TAGSÜBER auf und wecken den Patienten nie nachts',
        },
        {
          text: 'Ausgeprägte Krankheitsangst und Karzinophobie mit häufigen Arztwechseln',
        },
        {
          text: 'Extraintestinale Begleitsymptome: Kopfschmerzen, Rückenschmerzen, Müdigkeit, Schlafstörungen, Dysurie',
          atypisch: true,
        },
        {
          text: 'Überlappung mit funktioneller Dyspepsie: Sodbrennen, Übelkeit, frühes Sättigungsgefühl',
          atypisch: true,
        },
        {
          text: 'Postinfektiöse Erstmanifestation direkt nach einer Gastroenteritis',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Rom-IV-Kriterien',
          inhalt: 'Rezidivierende Bauchschmerzen an mindestens einem Tag pro Woche in den letzten drei Monaten (Beginn der Symptome mindestens sechs Monate zuvor), verknüpft mit mindestens zwei von drei Punkten: (1) Zusammenhang mit der Defäkation, (2) Änderung der Stuhlfrequenz, (3) Änderung der Stuhlform bzw. -konsistenz.',
        },
        {
          name: 'Subtypen nach der Bristol-Stuhlformenskala',
          inhalt: 'RDS-D (Diarrhoe-Typ, >25 % Typ 6-7), RDS-O bzw. RDS-C (Obstipations-Typ, >25 % Typ 1-2), RDS-M (Mischtyp, beides >25 %), RDS-U (unklassifiziert). Die Subtypisierung steuert die symptomorientierte Medikation.',
        },
        {
          name: 'Deutsche S3-Leitlinien-Definition',
          inhalt: 'Drei Bedingungen müssen erfüllt sein: (1) chronische, länger als drei Monate bestehende Darmbeschwerden, die von Patient und Arzt auf den Darm bezogen werden, (2) relevante Beeinträchtigung der Lebensqualität, (3) keine für andere Krankheitsbilder charakteristischen Veränderungen nachweisbar.',
        },
      ],
      redFlags: [
        'Ungewollter Gewichtsverlust und B-Symptomatik',
        'Blut im Stuhl oder Meläna',
        'Fieber',
        'Nächtliche Schmerzen oder nächtliche Diarrhoe, die den Patienten wecken',
        'Erstmanifestation jenseits des 50. Lebensjahres',
        'Anämie oder Eisenmangel',
        'Positive Familienanamnese für kolorektales Karzinom, CED oder Zöliakie',
        'Tastbare abdominelle oder rektale Resistenz, Lymphadenopathie',
        'Progrediente, kontinuierliche Verschlechterung der Beschwerden',
        'Erhöhte Entzündungsparameter oder erhöhtes fäkales Calprotectin',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Prüfung der Rom-IV-Kriterien: Dauer, Häufigkeit, Kopplung an die Defäkation, Änderung von Stuhlfrequenz und Stuhlform',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Vollständige und explizite Abfrage der Alarmsymptome — der zentrale Schritt jeder Reizdarm-Anamnese',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Reise-, Medikamenten- und Antibiotikaanamnese, Ernährungsanamnese, psychosoziale Anamnese (Stress, Angst, Depression)',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Komplette körperliche Untersuchung: Inspektion, Auskultation, Perkussion, Palpation des Abdomens und digital-rektale Untersuchung',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Ernährungs-, Stuhl- und Symptomtagebuch über zwei bis vier Wochen mit Bristol-Stuhlformenskala',
        },
        {
          stufe: 'Labor',
          text: 'Basislabor: Blutbild, CRP, BSG, Elektrolyte, Leber- und Nierenwerte, Ferritin',
        },
        {
          stufe: 'Labor',
          text: 'TSH zum Ausschluss einer Hyper- oder Hypothyreose',
        },
        {
          stufe: 'Labor',
          text: 'Zöliakie-Serologie: Transglutaminase-IgA IMMER zusammen mit dem Gesamt-IgA (falsch negativ bei IgA-Mangel)',
        },
        {
          stufe: 'Labor',
          text: 'Fäkales Calprotectin zur Abgrenzung einer chronisch-entzündlichen Darmerkrankung',
        },
        {
          stufe: 'Labor',
          text: 'Test auf okkultes Blut im Stuhl (immunologischer Test, iFOBT)',
        },
        {
          stufe: 'Labor',
          text: 'Stuhlkultur auf pathogene Keime sowie Parasiten- und Giardia-Antigen-Nachweis bei Diarrhoetyp oder Reiseanamnese',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Abdomensonographie zum Ausschluss struktureller Ursachen (Raumforderung, Wandverdickung, Aszites, Gallenwege)',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'H2-Atemtest auf Laktose und ggf. Fruktose (Kohlenhydratmalabsorption)',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Bei Frauen gynäkologische Mitbeurteilung mit transvaginaler Sonographie (Ovarialprozess, Endometriose)',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Ileokoloskopie mit Stufenbiopsien — obligat bei Alarmsymptomen und bei Erstmanifestation über 50 Jahre; schließt Karzinom, CED und mikroskopische Kolitis aus',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'ÖGD mit Duodenalbiopsien bei positiver Zöliakie-Serologie oder führenden Oberbauchbeschwerden',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Bei therapierefraktärer Diarrhoe: Ausschluss eines Gallensäureverlustsyndroms (SeHCAT-Test bzw. Therapieversuch mit Colestyramin)',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Chronisch-entzündliche Darmerkrankung (Morbus Crohn, Colitis ulcerosa)',
          unterscheidung: 'Blutig-schleimige Diarrhoe, nächtliche Beschwerden, Fieber, Gewichtsverlust, extraintestinale Manifestationen (Arthritis, Uveitis, Erythema nodosum); CRP↑ und fäkales Calprotectin↑, endoskopisch-histologische Sicherung.',
        },
        {
          dd: 'Zöliakie (einheimische Sprue)',
          unterscheidung: 'Blähungen, Steatorrhoe, Eisen- und Folsäuremangel, Gewichtsverlust, Dermatitis herpetiformis; Transglutaminase-IgA plus Gesamt-IgA positiv, Zottenatrophie in der Duodenalbiopsie.',
        },
        {
          dd: 'Laktose- bzw. Fruktoseintoleranz',
          unterscheidung: 'Reproduzierbarer zeitlicher Zusammenhang mit Milchprodukten oder Fruchtzucker, Beschwerdefreiheit unter Karenz; positiver H2-Atemtest.',
        },
        {
          dd: 'Kolorektales Karzinom',
          unterscheidung: 'Erstmanifestation meist über 50 Jahre, neu aufgetretene Stuhlunregelmäßigkeit, Blut im Stuhl, Eisenmangelanämie, Gewichtsverlust; Sicherung per Koloskopie mit Biopsie.',
        },
        {
          dd: 'Mikroskopische Kolitis (kollagene oder lymphozytäre Kolitis)',
          unterscheidung: 'Wässrige Diarrhoe ohne Blut bei endoskopisch UNAUFFÄLLIGER Schleimhaut — nur die Stufenbiopsie sichert die Diagnose; typisch bei älteren Frauen.',
        },
        {
          dd: 'Infektiöse Ursachen (Giardiasis, Yersiniose, Clostridioides difficile)',
          unterscheidung: 'Reise-, Antibiotika- oder Trinkwasseranamnese, akuter Beginn, Fieber; Stuhlkultur, Parasitologie, Giardia-Antigen, Toxinnachweis.',
        },
        {
          dd: 'Hyperthyreose',
          unterscheidung: 'Diarrhoe mit Gewichtsverlust trotz gutem Appetit, Tachykardie, Tremor, Wärmeintoleranz, Schwitzen; TSH supprimiert.',
        },
        {
          dd: 'Divertikelkrankheit / Divertikulitis',
          unterscheidung: 'Umschriebener Druckschmerz im linken Unterbauch, Fieber und Entzündungszeichen im Schub; CT-Abdomen, Koloskopie im entzündungsfreien Intervall.',
        },
        {
          dd: 'Funktionelle Dyspepsie',
          unterscheidung: 'Beschwerden auf den Oberbauch begrenzt (Völlegefühl, frühe Sättigung, Epigastralgie) OHNE Kopplung an den Stuhlgang; häufige Überlappung mit dem RDS.',
        },
        {
          dd: 'Chronische Pankreasinsuffizienz',
          unterscheidung: 'Fettstühle, Gewichtsverlust, Alkoholanamnese; Elastase-1 im Stuhl erniedrigt.',
        },
        {
          dd: 'Gynäkologische Ursachen (Endometriose, Ovarialtumor)',
          unterscheidung: 'Zyklusabhängigkeit der Schmerzen, Dyspareunie; gynäkologische Untersuchung und transvaginale Sonographie.',
        },
        {
          dd: 'Medikamentös bedingte Stuhlveränderung',
          unterscheidung: 'Opioide, Eisenpräparate und Anticholinergika obstipieren; Metformin, Magnesium, PPI und Antibiotika führen zu Diarrhoe — Medikamentenanamnese klärt.',
        },
      ],
      therapie: [
        {
          label: 'Basistherapie: Aufklärung, Ernährung, Lebensstil',
          items: [
            'Ausführliche Aufklärung über die Gutartigkeit, den chronisch-rezidivierenden Verlauf und das NICHT erhöhte Karzinomrisiko — eine tragfähige Arzt-Patienten-Beziehung ist selbst therapeutisch wirksam',
            'Die Diagnose positiv mitteilen und nicht als "wir haben nichts gefunden" formulieren',
            'Ernährungsumstellung: befristete FODMAP-arme Kost unter diätologischer Begleitung mit strukturierter Wiedereinführung; Meiden individueller Triggerspeisen',
            'Lösliche Ballaststoffe einschleichend (Flohsamenschalen); unlösliche Kleie meiden, da sie Blähungen verstärkt',
            'Regelmäßige kleine Mahlzeiten, ausreichende Trinkmenge, Reduktion von Koffein, Alkohol, Süßstoffen und blähenden Speisen',
            'Ernährungs- und Symptomtagebuch zur Identifikation der Trigger',
            'Regelmäßige körperliche Aktivität und aktive Stressreduktion',
          ],
        },
        {
          label: 'Symptomorientierte Pharmakotherapie (nach Subtyp)',
          items: [
            'Schmerzen und Krämpfe: Spasmolytika (Butylscopolamin, Mebeverin) sowie Pfefferminzöl in magensaftresistenten Kapseln',
            'Obstipationstyp (RDS-O): Macrogol und Quellstoffe; bei Versagen Prucaloprid oder Linaclotid; stimulierende Laxantien nur kurzfristig',
            'Diarrhoetyp (RDS-D): Loperamid bedarfsweise, Colestyramin bei Gallensäureverlustsyndrom',
            'Meteorismus: Probiotika über mindestens vier Wochen, Simeticon, ggf. Rifaximin (off label)',
            'Therapierefraktäre Schmerzen: niedrig dosierte trizyklische Antidepressiva (Amitriptylin) als Neuromodulatoren gegen die viszerale Hypersensitivität — beim Obstipationstyp eher SSRI',
            'Grundsatz: befristeter Therapieversuch über etwa vier Wochen, dann Wirksamkeitsprüfung und ggf. Absetzen',
          ],
        },
        {
          label: 'Psychotherapie und Entspannungsverfahren',
          items: [
            'Kognitive Verhaltenstherapie mit guter Evidenz für Symptomlast und Lebensqualität',
            'Bauchgerichtete Hypnotherapie (darmbezogene Hypnose) — eines der am besten belegten Verfahren',
            'Entspannungsverfahren: progressive Muskelrelaxation, autogenes Training, Yoga, Achtsamkeitstraining',
            'Diagnostik und Behandlung komorbider Angststörungen und Depressionen',
            'Feste Wiedervorstellungstermine vereinbaren, um wiederholte Notfallvorstellungen und unnötige Doppeldiagnostik zu vermeiden',
          ],
        },
      ],
      prognose: 'Gutartig, aber chronisch-rezidivierend mit wechselnder Symptomintensität. Es besteht KEINE erhöhte Mortalität und KEIN erhöhtes Karzinomrisiko. Etwa ein Drittel der Patienten wird langfristig beschwerdefrei, ein Drittel bleibt stabil, ein Drittel zeigt einen fluktuierenden Verlauf. Die Lebensqualität kann jedoch erheblich eingeschränkt sein, mit hoher Arbeitsunfähigkeitsrate. Nach abgeschlossener Ausschlussdiagnostik ist eine wiederholte apparative Abklärung ohne neu aufgetretene Alarmsymptome nicht indiziert und schadet der Arzt-Patienten-Beziehung.',
      pruefungsfallen: [
        'Das Reizdarmsyndrom ist eine AUSSCHLUSSDIAGNOSE — sie darf nie genannt werden, ohne im selben Atemzug zu sagen, WAS man ausschließt: Zöliakie, CED, kolorektales Karzinom, Laktoseintoleranz, Infektion, Hyperthyreose.',
        'NIEMALS sagen, das Colon irritabile sei eine "psychosomatische Krankheit" — eine Oberärztin hat dieser Formulierung in der Prüfung ausdrücklich widersprochen. Korrekt: funktionelle Störung der Darm-Hirn-Achse, bei der Stress ein Triggerfaktor ist.',
        'Die Alarmsymptome müssen aktiv und vollständig abgefragt werden; ihr Fehlen ist der Kern der Diagnose und muss in der Fallvorstellung explizit genannt werden.',
        'Normale Befunde sind hier DER Befund — die Normalität von Blutbild, CRP, Calprotectin und Zöliakie-Serologie stützt die Diagnose.',
        'Zöliakie-Serologie immer mit Gesamt-IgA bestimmen: Bei selektivem IgA-Mangel (bei Zöliakie gehäuft) ist die Transglutaminase-IgA falsch negativ.',
        'Bei Erstmanifestation über 50 Jahre ist die Koloskopie obligat — ohne sie darf die Diagnose nicht gestellt werden.',
        'Nicht überdiagnostizieren: Nicht jeder chronische Bauchschmerz ist ein Reizdarm (in der Prüfung wurde "Reizdarmsyndrom" geschrieben, obwohl eine Gastroenteritis vorlag).',
        'Mikroskopische Kolitis nicht vergessen: endoskopisch unauffällige Schleimhaut, nur die Stufenbiopsie sichert sie.',
        'Unlösliche Ballaststoffe (Weizenkleie) verschlechtern die Blähungen — nur lösliche Ballaststoffe wie Flohsamen empfehlen.',
        'Amitriptylin beim Reizdarm nicht als "Antidepressivum" verkaufen, sondern als Neuromodulator in niedriger Dosis erklären, sonst fühlt sich der Patient nicht ernst genommen.',
      ],
      askedInExam: [
        {
          frage: 'Wie lautet Ihre Verdachtsdiagnose und warum sprechen wir von einer Ausschlussdiagnose?',
          antwort: 'Ein Reizdarmsyndrom. Es ist eine Ausschlussdiagnose, weil es keinen beweisenden Test gibt: Die Rom-IV-Kriterien stellen die Diagnose positiv, aber erst nachdem Zöliakie, chronisch-entzündliche Darmerkrankung, kolorektales Karzinom, Kohlenhydratmalabsorption, Infektion und Hyperthyreose ausgeschlossen wurden.',
        },
        {
          frage: 'Welche Rom-IV-Kriterien kennen Sie?',
          antwort: 'Rezidivierende Bauchschmerzen an mindestens einem Tag pro Woche in den letzten drei Monaten, verbunden mit mindestens zwei von drei Kriterien: Zusammenhang mit der Defäkation, Änderung der Stuhlfrequenz oder Änderung der Stuhlform.',
        },
        {
          frage: 'Was spricht gegen eine chronisch-entzündliche Darmerkrankung?',
          antwort: 'Das Fehlen von Blut im Stuhl, von Fieber und von B-Symptomatik, ein stabiles Gewicht, keine nächtlichen Beschwerden, keine extraintestinalen Manifestationen sowie normales CRP und ein negatives fäkales Calprotectin.',
        },
        {
          frage: 'Welche Laborbefunde erwarten Sie?',
          antwort: 'Unauffällige Befunde: normales Blutbild ohne Anämie, normale Entzündungsparameter, normales TSH, negative Zöliakie-Serologie und negatives Calprotectin. Gerade diese Normalität stützt die Diagnose.',
        },
        {
          frage: 'Warum sollten wir einen Test auf okkultes Blut im Stuhl veranlassen? Erklären Sie bitte das Verfahren.',
          antwort: 'Um eine mit bloßem Auge nicht sichtbare Blutung, insbesondere aus einem Polypen oder Karzinom, aufzudecken. Heute wird der immunologische Test verwendet, der spezifisch menschliches Hämoglobin nachweist; der Patient bringt eine Stuhlprobe im Röhrchen mit, eine Diät ist nicht erforderlich. Ein positiver Test beweist nichts, er ist die Indikation zur Koloskopie.',
        },
        {
          frage: 'Wie schließen Sie eine Zöliakie und eine Laktoseintoleranz aus?',
          antwort: 'Die Zöliakie serologisch über Transglutaminase-IgA zusammen mit dem Gesamt-IgA, bei positivem Befund mit Duodenalbiopsien unter glutenhaltiger Kost. Die Laktoseintoleranz über den H2-Atemtest mit Laktose oder eine befristete Karenz mit anschließender Provokation.',
        },
        {
          frage: 'Wie behandeln Sie ein Reizdarmsyndrom?',
          antwort: 'Auf drei Ebenen: erstens Basistherapie mit ausführlicher Aufklärung, Ernährungsumstellung (FODMAP-arm, lösliche Ballaststoffe, Ernährungstagebuch), Bewegung und Stressreduktion; zweitens symptomorientierte Medikation nach Subtyp mit Spasmolytika und Pfefferminzöl, Macrogol bei Obstipation, Loperamid bei Diarrhoe, Probiotika bei Blähungen und niedrig dosiertem Amitriptylin bei therapierefraktären Schmerzen; drittens Psychotherapie und Entspannungsverfahren.',
        },
        {
          frage: 'Ist das Colon irritabile eine psychosomatische Krankheit?',
          antwort: 'So würde ich es nicht formulieren. Es ist eine funktionelle Störung der Darm-Hirn-Achse mit viszeraler Hypersensitivität und veränderter Motilität. Psychosozialer Stress ist ein wichtiger Trigger und Verstärker, aber nicht die Ursache; die Beschwerden der Patienten sind real.',
        },
        {
          frage: 'Wie klären Sie über eine Koloskopie auf?',
          antwort: 'Indikation, Vorbereitung mit Abführlösung und klarer Flüssigkeit, Ablauf in Linksseitenlage mit einem biegsamen Endoskop über den After, Dauer 20 bis 30 Minuten, Sedierung mit Propofol oder Midazolam mit anschließendem Fahrverbot für 24 Stunden, sowie die Risiken Blähungen, Blutung nach Polypenabtragung, sehr selten Perforation und Kreislaufreaktion auf die Sedierung.',
        },
        {
          frage: 'Der Patient fragt, ob Marihuana helfen könnte — was antworten Sie?',
          antwort: 'Ich reagiere wertfrei und nehme die Frage ernst, erkläre aber, dass Cannabis für das Reizdarmsyndrom nicht zugelassen ist, keinen gesicherten Nutzen zeigt und die Beschwerden sogar verstärken kann, und verweise auf die gut belegten Alternativen.',
        },
        {
          frage: 'Was tun Sie, wenn der Patient zusätzlich 6 kg in vier Monaten abgenommen hat?',
          antwort: 'Dann liegt ein Alarmsymptom vor und die Diagnose Reizdarmsyndrom ist nicht zulässig. Ich müsste zügig ein Malignom, eine chronisch-entzündliche Darmerkrankung, eine Zöliakie und eine Hyperthyreose abklären, mit dringlicher Koloskopie und ÖGD.',
        },
        {
          frage: 'Ein Patient fragt: Was ist ein Reizdarmsyndrom?',
          antwort: 'Patientengerecht: Ihr Darm ist nicht krank im Sinne einer Entzündung oder eines Tumors, aber er ist überempfindlich. Die Zusammenarbeit zwischen Darm und Nervensystem ist gestört, deshalb reagiert der Darm auf normale Reize wie Essen oder Stress mit Krämpfen, Blähungen und Stuhlveränderungen. Es ist gutartig und gut behandelbar.',
        },
      ],
      merksatz: 'Reizdarm = Rom IV plus NULL Alarmsymptome. Der normale Befund IST der Befund — aber erst nach Ausschluss von Zöliakie, CED und Karzinom. Und niemals "psychosomatisch" sagen: funktionelle Störung der Darm-Hirn-Achse.',
      linkedCaseIds: [
        'case-reizdarm',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-koloskopie',
        'auf-gastroskopie',
        'auf-sonographie',
      ],
    },
    {
      id: 'fw-schlaganfall',
      pathology: 'Ischämischer Schlaganfall (Hirninfarkt)',
      specialty: 'Neurologie',
      definition: 'Akut auftretendes fokal-neurologisches Defizit infolge einer umschriebenen Durchblutungsstörung des Gehirns. Beim ischämischen Schlaganfall (Hirninfarkt) führt ein Gefäßverschluss zur Minderperfusion mit Untergang von Hirngewebe. Persistiert das Defizit, spricht man vom Apoplex/Hirninfarkt; bilden sich die Symptome innerhalb von 24 Stunden vollständig zurück (meist < 1 h) ohne Nachweis eines Infarkts, handelt es sich um eine transitorische ischämische Attacke (TIA).',
      aetiologie: 'Etwa 85 % der Schlaganfälle sind ischämisch, 15 % hämorrhagisch. Die ischämische Genese wird nach TOAST eingeteilt: makroangiopathisch (arteriosklerotische Stenosen, z. B. der A. carotis), kardioembolisch (v. a. Vorhofflimmern, seltener paradoxe Embolie bei persistierendem Foramen ovale), mikroangiopathisch (lakunäre Infarkte) sowie seltene und ungeklärte Ursachen.',
      risikofaktoren: [
        'Arterielle Hypertonie',
        'Vorhofflimmern',
        'Diabetes mellitus',
        'Hyperlipidämie',
        'Nikotinabusus',
        'Höheres Lebensalter',
        'Karotisstenose',
        'Frühere TIA oder Schlaganfall',
        'Adipositas / Bewegungsmangel',
      ],
      klinik: [
        {
          text: 'Akut aufgetretenes fokal-neurologisches Defizit, häufig als brachiofazial betonte Hemiparese',
        },
        {
          text: 'Zentrale faziale Parese: hängender Mundwinkel bei ausgesparter Stirn',
        },
        {
          text: 'Sprachstörung — Aphasie bei Betroffensein der dominanten Hemisphäre oder Dysarthrie',
        },
        {
          text: 'Halbseitige Sensibilitätsstörung (Hypästhesie, Parästhesie)',
        },
        {
          text: 'Gesichtsfeldausfall (homonyme Hemianopsie), Blickdeviation zum Herd',
        },
        {
          text: 'Amaurosis fugax (kurzzeitige einseitige Erblindung) bei Karotisstenose',
          atypisch: true,
        },
        {
          text: 'Hinterkreislaufsymptome: Schwindel, Doppelbilder, Ataxie, Dysarthrie, gekreuzte Symptomatik',
          atypisch: true,
        },
        {
          text: 'Neglect und Anosognosie bei Infarkt der nicht-dominanten (meist rechten) Hemisphäre',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'TOAST',
          inhalt: 'Ätiologische Einteilung des ischämischen Schlaganfalls: makroangiopathisch, kardioembolisch, mikroangiopathisch (lakunär), andere und ungeklärte Ursache.',
        },
        {
          name: 'NIHSS',
          inhalt: 'National Institutes of Health Stroke Scale (0–42): quantifiziert den Schweregrad des neurologischen Defizits und steuert Therapieentscheidung und Verlaufskontrolle.',
        },
        {
          name: 'Oxford/Bamford (OCSP)',
          inhalt: 'Klinische Syndrome nach betroffenem Territorium: TACI, PACI, LACI und POCI.',
        },
        {
          name: 'modified Rankin Scale (mRS)',
          inhalt: 'Erfasst den funktionellen Behinderungsgrad im Verlauf: 0 = symptomfrei bis 6 = Tod.',
        },
      ],
      redFlags: [
        'Akut aufgetretenes fokal-neurologisches Defizit — Zeitfenster beachten (time is brain), sofortige Bildgebung',
        'Zunehmende Vigilanzminderung, Pupillendifferenz → drohende Einklemmung, maligner Mediainfarkt oder Basilaristhrombose',
        'Plötzlicher Vernichtungskopfschmerz → eher Subarachnoidalblutung',
        'Hypoglykämie als rasch behebbare Ursache eines fokalen Defizits (immer Blutzucker messen)',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Fremd-/Eigenanamnese mit Bestimmung des Zeitfensters (letzter beschwerdefreier Zeitpunkt, „last seen well"), FAST-Schema (Face-Arm-Speech-Time), orientierende neurologische Untersuchung und NIHSS',
        },
        {
          stufe: 'Labor',
          text: 'Sofort Blutzucker (Hypoglykämie ausschließen!), Blutbild, Gerinnung (INR/aPTT vor Lyse), Elektrolyte, Nieren- und Leberwerte, Lipide, Troponin',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Umgehend natives cCT zum Blutungsausschluss VOR jeder Lyse, ergänzt durch CT-Angiographie (Gefäßverschluss) und ggf. CT-Perfusion; alternativ MRT mit DWI zum Nachweis des Frühinfarkts',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'EKG und Langzeit-EKG zur Detektion von Vorhofflimmern; Duplexsonographie der hirnversorgenden Arterien (Karotis); transthorakale/transösophageale Echokardiographie zur Emboliequellensuche',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Digitale Subtraktionsangiographie (DSA) im Rahmen der mechanischen Thrombektomie; TEE mit Bubble-Test bei Verdacht auf offenes Foramen ovale (paradoxe Embolie)',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Intrazerebrale Blutung',
          unterscheidung: 'Klinisch nicht vom Infarkt zu unterscheiden — nur per cCT/MRT abgrenzbar; zwingender Blutungsausschluss vor jeder Lyse.',
        },
        {
          dd: 'Transitorische ischämische Attacke (TIA)',
          unterscheidung: 'Vollständige Rückbildung der Symptome innerhalb von 24 h (meist < 1 h) ohne Infarktnachweis im DWI.',
        },
        {
          dd: 'Hypoglykämie',
          unterscheidung: 'Niedriger Blutzucker, rasche Besserung nach Glukosegabe; imitiert fokale Defizite.',
        },
        {
          dd: 'Epileptischer Anfall mit Todd-Parese',
          unterscheidung: 'Vorangehendes Anfallsereignis, postiktale passagere Parese, Rückbildung über Stunden.',
        },
        {
          dd: 'Migräne mit Aura (migraine accompagnée)',
          unterscheidung: 'Langsam wandernde, ausbreitende Symptomatik, häufig mit Kopfschmerz, eher jüngere Patienten.',
        },
        {
          dd: 'Hirntumor / Raumforderung',
          unterscheidung: 'Meist langsam progrediente Symptomatik; Nachweis in der Bildgebung.',
        },
      ],
      therapie: [
        {
          label: 'Akutphase (Notfall)',
          items: [
            'Aufnahme auf die Stroke Unit mit kontinuierlichem Monitoring von Blutdruck, Herzrhythmus, Sauerstoffsättigung, Blutzucker und Temperatur',
            'Intravenöse Thrombolyse mit rtPA (Alteplase) innerhalb des 4,5-Stunden-Zeitfensters — erst nach zwingendem Blutungsausschluss im cCT',
            'Mechanische Thrombektomie bei großem Gefäßverschluss der vorderen Zirkulation (bis 6 h, in ausgewählten Fällen bis 24 h nach Perfusionsbildgebung)',
            'Vorsichtige Blutdruckführung (permissive Hypertonie), Blutzucker- und Temperaturkontrolle, frühe Schluckdiagnostik zur Aspirationsprophylaxe',
          ],
          akut: true,
        },
        {
          label: 'Sekundärprophylaxe',
          items: [
            'Bei Vorhofflimmern: orale Antikoagulation (DOAK oder Vitamin-K-Antagonist/Marcumar) — kein alleiniger Thrombozytenaggregationshemmer',
            'Bei nicht-kardioembolischer Genese: Thrombozytenaggregationshemmer (ASS, alternativ Clopidogrel)',
            'Statin, konsequente Einstellung von Blutdruck und Diabetes, Nikotin- und Alkoholkarenz',
            'Bei symptomatischer Karotisstenose: Karotis-Thrombendarteriektomie (TEA) oder Stenting',
          ],
        },
        {
          label: 'Rehabilitation',
          items: [
            'Frührehabilitation mit Physiotherapie, Ergotherapie und Logopädie',
            'Prävention und Behandlung von Komplikationen (Aspiration, Dekubitus, Thrombose, Post-Stroke-Depression)',
            'Anschlussheilbehandlung und Schulung zur Sekundärprävention',
          ],
        },
      ],
      prognose: 'Entscheidend ist die Zeit bis zur Rekanalisation („time is brain"): je früher Lyse bzw. Thrombektomie, desto besser das funktionelle Ergebnis. Die Prognose hängt von Infarktgröße, Lokalisation, initialem NIHSS und Komplikationen ab; ohne konsequente Sekundärprophylaxe besteht ein hohes Rezidivrisiko.',
      pruefungsfallen: [
        'Vor jeder Lyse zwingend eine intrazerebrale Blutung per cCT ausschließen — Blutung und Infarkt sind klinisch nicht zu unterscheiden.',
        'Immer sofort den Blutzucker messen: eine Hypoglykämie kann einen Schlaganfall vortäuschen.',
        'FAST-Schema (Face-Arm-Speech-Time) nicht mit dem peripheren Fazialistest (Stirnrunzeln, Lidschluss) verwechseln — bei zentraler Fazialisparese bleibt die Stirn verschont.',
        'Bei beim Aufwachen bemerkten Symptomen nach dem letzten beschwerdefreien Zeitpunkt („last seen well") fragen, nicht nach dem Bemerken.',
        'Bei Vorhofflimmern gehört eine orale Antikoagulation zur Sekundärprophylaxe — ASS allein ist unzureichend.',
        'Stationäre Aufnahme auf die Stroke Unit und neurologisches Konsil anmelden; Emboliequellensuche mit EKG/Langzeit-EKG, Karotis-Doppler und Echokardiographie nicht vergessen.',
      ],
      askedInExam: [
        {
          frage: 'Was ist der Unterschied zwischen einer TIA und einem Apoplex?',
          antwort: 'Bei der TIA bilden sich die fokal-neurologischen Symptome vollständig innerhalb von 24 Stunden (meist unter einer Stunde) zurück und es zeigt sich kein Infarkt im DWI; beim Apoplex/Hirninfarkt persistiert das Defizit und es liegt ein umschriebener Gewebeuntergang vor.',
        },
        {
          frage: 'Was ist die wahrscheinlichste Ursache eines embolischen Schlaganfalls?',
          antwort: 'Ein Vorhofflimmern als kardioembolische Quelle.',
        },
        {
          frage: 'Welche Sofortmaßnahmen ergreifen Sie?',
          antwort: 'Vitalparameter und ABCDE, i.v.-Zugang, sofort Blutzucker, umgehend natives cCT mit CT-Angiographie zum Blutungsausschluss, Labor mit Gerinnung, EKG, Aufnahme auf die Stroke Unit und neurologisches Konsil.',
        },
        {
          frage: 'Wie lautet das Zeitfenster für die intravenöse Thrombolyse?',
          antwort: 'Bis 4,5 Stunden nach Symptombeginn; die mechanische Thrombektomie bei großem Gefäßverschluss ist bis 6, in ausgewählten Fällen bis 24 Stunden möglich.',
        },
        {
          frage: 'Was besagt das FAST-Schema?',
          antwort: 'Face (hängender Mundwinkel), Arm (Armschwäche), Speech (Sprachstörung), Time (Zeit / sofort Notruf) — ein einfaches Screening auf einen Schlaganfall.',
        },
        {
          frage: 'Was versteht man unter einer paradoxen Embolie?',
          antwort: 'Bei persistierendem Foramen ovale kann ein venöser Thrombus durch den Rechts-Links-Shunt in den arteriellen Kreislauf und ins Hirngefäß gelangen.',
        },
        {
          frage: 'Welche Therapie ist bei Vorhofflimmern zur Sekundärprophylaxe angezeigt?',
          antwort: 'Eine orale Antikoagulation mit einem DOAK oder einem Vitamin-K-Antagonisten (Marcumar), nicht ein alleiniger Thrombozytenaggregationshemmer.',
        },
      ],
      merksatz: '„Time is brain" — jedes akute fokale Defizit ist ein Schlaganfall bis zum Beweis des Gegenteils: sofort cCT zum Blutungsausschluss, dann Lyse im Zeitfenster.',
      linkedCaseIds: [
        'case-schlaganfall',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
    {
      id: 'fw-gallenkolik',
      pathology: 'Cholelithiasis mit Gallenkolik',
      specialty: 'Chirurgie',
      definition: 'Vorhandensein von Konkrementen (Steinen) im Gallensystem. Cholezystolithiasis = Steine in der Gallenblase, Choledocholithiasis = Steine im Ductus choledochus. Die Gallenkolik ist der durch einen im Gallenblasenhals oder Ductus cysticus eingeklemmten Stein ausgelöste, wellenförmige (kolikartige), krampfartige rechtsseitige Oberbauchschmerz. Zu unterscheiden ist die reine (unkomplizierte) Kolik von den Komplikationen: akute Cholezystitis, Choledocholithiasis mit Cholestase/Ikterus, biliäre Pankreatitis und Cholangitis.',
      aetiologie: 'Ursache ist eine Störung des Gleichgewichts der Gallenbestandteile: Übersättigung der Galle mit Cholesterin führt zu Cholesterinsteinen (ca. 80 %, häufig gemischt), eine vermehrte Bilirubinbelastung (Hämolyse, Infektion) zu Pigmentsteinen. Die Kolik entsteht durch temporäre Einklemmung eines Steins mit reflektorischer Kontraktion der glatten Muskulatur gegen den Widerstand; löst sich der Stein, endet die Kolik. Persistierende Obstruktion führt zu Komplikationen.',
      risikofaktoren: [
        '6 F: female (weiblich), fat (adipös), forty (~40 Jahre), fertile (fruchtbar/Multiparität), fair (hellhäutig/blond), family (positive Familienanamnese)',
        'Rasche Gewichtsabnahme und Fastenkuren',
        'Schwangerschaft, Östrogene und orale Kontrazeptiva',
        'Hypercholesterinämie / Hypertriglyzeridämie',
        'Diabetes mellitus',
        'Leberzirrhose und Hämolyse (Pigmentsteine)',
        'Fettreiche, ballaststoffarme Ernährung',
      ],
      klinik: [
        {
          text: 'Wellenförmig-kolikartiger, krampfartiger Schmerz im rechten Oberbauch/Epigastrium, Minuten bis mehrere Stunden anhaltend',
        },
        {
          text: 'Auslösung typischerweise nach fettreichem Essen, häufig abends oder nachts',
        },
        {
          text: 'Ausstrahlung in die rechte Schulter, das rechte Schulterblatt und den Rücken (Head-Zone)',
        },
        {
          text: 'Begleitend Übelkeit, Erbrechen, Meteorismus und Völlegefühl',
        },
        {
          text: 'Bewegungsdrang und Unruhe (im Gegensatz zur Schonhaltung bei Peritonitis)',
        },
        {
          text: 'Zwischen den Attacken Beschwerdefreiheit bei unkomplizierter Kolik',
        },
        {
          text: 'Asymptomatische (stumme) Gallensteine als Zufallsbefund sind sehr häufig',
          atypisch: true,
        },
        {
          text: 'Bei älteren Menschen und Diabetikern können Komplikationen schmerzarm verlaufen',
          atypisch: true,
        },
        {
          text: 'Maskierung als inferiorer (Hinterwand-)Myokardinfarkt möglich',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Steintypen',
          inhalt: 'Cholesterinsteine (ca. 80 %, oft gemischt, röntgennegativ, im Sono echoreich mit Schallschatten) vs. Pigmentsteine (Bilirubinsteine bei Hämolyse/Infektion).',
        },
        {
          name: 'Lokalisation / Terminologie',
          inhalt: 'Cholezystolithiasis = Steine in der Gallenblase; Choledocholithiasis = Steine im Ductus choledochus (Cholestase, Ikterus). Wichtig für Therapieweg (Cholezystektomie vs. ERCP).',
        },
        {
          name: 'Charcot-Trias / Reynolds-Pentade',
          inhalt: 'Charcot-Trias der Cholangitis: rechtsseitiger Oberbauchschmerz + Fieber/Schüttelfrost + Ikterus. Erweiterung zur Reynolds-Pentade um Hypotonie und Bewusstseinstrübung (septischer Verlauf).',
        },
      ],
      redFlags: [
        'Anhaltender Dauerschmerz mit Fieber, Schüttelfrost und Abwehrspannung → akute Cholezystitis',
        'Ikterus, dunkler Urin und entfärbter (acholischer) Stuhl → Choledocholithiasis mit Cholestase',
        'Charcot-Trias (Schmerz + Fieber + Ikterus) → akute Cholangitis (Notfall)',
        'Gürtelförmiger Oberbauchschmerz mit Lipase-Erhöhung → biliäre Pankreatitis',
        'Bretthartes Abdomen / Peritonismus → Gallenblasenperforation oder -empyem',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Anamnese: kolikartiger Schmerz nach fettreichem Essen, Ausstrahlung rechte Schulter/Rücken, frühere Episoden; gezielt nach Ikterus, dunklem Urin, hellem Stuhl und Fieber fragen',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Körperliche Untersuchung: Druckschmerz im rechten Oberbauch, Murphy-Zeichen; Courvoisier-Zeichen und Ikterus-Prüfung bei Cholestaseverdacht; Vitalparameter',
        },
        {
          stufe: 'Labor',
          text: 'Labor: Blutbild und CRP (Entzündung), Cholestasewerte GGT, AP und Bilirubin (gesamt/direkt), Transaminasen; Lipase zum Ausschluss einer biliären Pankreatitis',
        },
        {
          stufe: 'Labor',
          text: 'Bei Ikterus und zum Ausschluss eines Malignoms Tumormarker CA 19-9 und AFP',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Abdomen-Sonographie (Goldstandard): Steinnachweis mit Schallschatten, Wandverdickung/Dreischichtung, Gangstau bzw. erweiterter Ductus choledochus',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'MRCP oder Endosonographie bei Verdacht auf Choledocholithiasis',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'ERCP mit Papillotomie und Steinextraktion — therapeutisch bei nachgewiesener Choledocholithiasis',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Akute Cholezystitis',
          unterscheidung: 'Dauerschmerz statt Kolik, Fieber, Schüttelfrost, Leukozytose/CRP-Anstieg, Murphy-Zeichen positiv.',
        },
        {
          dd: 'Choledocholithiasis',
          unterscheidung: 'Ikterus, dunkler Urin, entfärbter Stuhl, Cholestasewerte (GGT/AP/Bilirubin) erhöht.',
        },
        {
          dd: 'Biliäre Pankreatitis',
          unterscheidung: 'Gürtelförmige Ausstrahlung in den Rücken, Lipase mehr als dreifach erhöht.',
        },
        {
          dd: 'Akute Cholangitis',
          unterscheidung: 'Charcot-Trias: Schmerz + Fieber + Ikterus; septischer Verlauf möglich.',
        },
        {
          dd: 'Ulcus ventriculi/duodeni',
          unterscheidung: 'Epigastrischer, nüchtern- oder essensabhängiger Schmerz, kein Ausstrahlungsmuster in die Schulter; Nachweis per ÖGD.',
        },
        {
          dd: 'Rechtsseitige Nierenkolik (Urolithiasis)',
          unterscheidung: 'Flankenschmerz mit Ausstrahlung in Leiste/Genitale, Mikrohämaturie, Klopfschmerz Nierenlager.',
        },
        {
          dd: 'Inferiorer (Hinterwand-)Myokardinfarkt',
          unterscheidung: 'Kardiale Risikofaktoren, EKG-Veränderungen, Troponin-Anstieg — bei rechtsseitigem Oberbauchschmerz mitbedenken.',
        },
        {
          dd: 'Retrozökale Appendizitis',
          unterscheidung: 'Schmerzwanderung, McBurney/Lanz, Fieber, tiefer rechtsseitiger Druckschmerz.',
        },
      ],
      therapie: [
        {
          label: 'Symptomatisch (Akut)',
          items: [
            'Nahrungskarenz und intravenöse Flüssigkeitsgabe',
            'Analgesie mit Metamizol (Novalgin) i.v.',
            'Spasmolyse mit Butylscopolamin (Buscopan) i.v.',
            'Bei stärksten Schmerzen Pethidin; klassisches Morphin klassischerweise meiden wegen Kontraktion des Sphinkter Oddi',
            'Antiemetikum (z. B. Metoclopramid) bei Übelkeit/Erbrechen',
          ],
          akut: true,
        },
        {
          label: 'Kausal',
          items: [
            'Elektive bzw. frühelektive laparoskopische Cholezystektomie bei symptomatischer Cholezystolithiasis',
            'Fettarme Kost und Ernährungsberatung bis zur Operation',
            'Asymptomatische Gallensteine: keine OP-Indikation — Ausnahmen: Porzellangallenblase, Steine > 3 cm, erhöhtes Karzinomrisiko',
          ],
        },
        {
          label: 'Bei Komplikation',
          items: [
            'Akute Cholezystitis: Antibiotikatherapie und frühe laparoskopische Cholezystektomie',
            'Choledocholithiasis: ERCP mit Papillotomie und Steinextraktion, anschließend Cholezystektomie',
            'Biliäre Pankreatitis / Cholangitis: stationäre bzw. intensivmedizinische Therapie und dringliche ERCP',
          ],
        },
      ],
      prognose: 'Bei unkomplizierter, rechtzeitig operierter symptomatischer Cholelithiasis sehr gut. Ohne Therapie Rezidivkolik und Komplikationen (Cholezystitis, Choledocholithiasis, biliäre Pankreatitis, Cholangitis, selten Gallenblasenkarzinom). Nach Cholezystektomie können bei zuvor bestehender Choledocholithiasis erneut Steine im Ductus choledochus auftreten.',
      pruefungsfallen: [
        'Reine Gallenkolik (wellenförmig, kein Fieber, beschwerdefreie Intervalle) klar von der akuten Cholezystitis (Dauerschmerz + Fieber + Entzündungszeichen) trennen.',
        'Bei jeder Kolik aktiv nach Ikterus, dunklem Urin und hellem Stuhl fragen (Choledocholithiasis) und Lipase bestimmen (biliäre Pankreatitis).',
        'Kein klassisches Morphin bei der Kolik (Sphinkter-Oddi-Tonus); zudem auf eine Metamizol-(Novalgin-)Allergie achten.',
        'Asymptomatische Gallensteine werden nicht operiert — Cholezystektomie erst bei Symptomen/Komplikationen.',
        'Rechtsseitiger Oberbauchschmerz kann ein inferiorer Myokardinfarkt sein — EKG nicht vergessen.',
      ],
      askedInExam: [
        {
          frage: 'Was bedeutet es, wenn ein Wort auf -itis endet?',
          antwort: 'Es bezeichnet eine Entzündung; Cholezystitis ist also die Entzündung der Gallenblase, im Unterschied zur Cholezystolithiasis (Steine ohne Entzündung).',
        },
        {
          frage: 'Welches Medikament haben Sie verabreicht und warum?',
          antwort: 'Metamizol als Nicht-Opioid-Analgetikum kombiniert mit dem Spasmolytikum Butylscopolamin, weil der kolikartige Schmerz durch Krämpfe der glatten Muskulatur entsteht; klassisches Morphin wird gemieden, da es den Sphinkter Oddi kontrahiert.',
        },
        {
          frage: 'Wie unterscheiden Sie eine Cholezystitis von einer Cholezystolithiasis?',
          antwort: 'Bei der Cholezystitis bestehen Fieber, Schüttelfrost, ein Dauerschmerz, ein positives Murphy-Zeichen und erhöhte Entzündungswerte (Leukozytose, CRP); die reine Cholezystolithiasis verläuft kolikartig ohne Entzündungszeichen.',
        },
        {
          frage: 'Kann man die Steine im Sono sehen?',
          antwort: 'Ja, die Abdomen-Sonographie ist der Goldstandard; Cholesterinsteine stellen sich echoreich mit dorsalem Schallschatten dar.',
        },
        {
          frage: 'Welche Tumormarker bestimmen Sie zum Ausschluss eines Malignoms?',
          antwort: 'CA 19-9 (Gallenwegs-/Pankreaskarzinom) und AFP (hepatozelluläres Karzinom).',
        },
        {
          frage: 'Ist das hepatozelluläre Karzinom eine Erbkrankheit?',
          antwort: 'Nein, es ist keine klassische Erbkrankheit; Hauptrisikofaktoren sind Leberzirrhose sowie chronische Hepatitis B und C.',
        },
        {
          frage: 'Wie entsteht eine Pankreatitis durch Cholelithiasis?',
          antwort: 'Ein Stein verlegt die Papilla Vateri am gemeinsamen Endabschnitt von Ductus choledochus und Ductus pancreaticus; der Sekretrückstau aktiviert die Pankreasenzyme und löst die Selbstverdauung aus.',
        },
        {
          frage: 'Was machen Sie, wenn im Sono kein Stein sichtbar ist, die Klinik aber typisch ist?',
          antwort: 'Bei typischer symptomatischer Klinik erfolgt dennoch die weitere Abklärung (Endosonographie/MRCP) und ggf. die Cholezystektomie; kleine Steine und Sludge können sonographisch entgehen.',
        },
      ],
      merksatz: '6 F (weiblich, fett, vierzig, fruchtbar, hell, familiär): bei symptomatischer Cholelithiasis Cholezystektomie — die Kolik selbst mit Metamizol und Butylscopolamin behandeln, nicht mit klassischem Morphin.',
      linkedCaseIds: [
        'case-gallenkolik',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [],
    },
    {
      id: 'fw-tvt',
      pathology: 'Tiefe Beinvenenthrombose (TVT)',
      specialty: 'Kardiologie',
      definition: 'Teilweiser oder vollständiger thrombotischer Verschluss einer tiefen Vene, meist der Bein- und Beckenvenen (v. a. Unterschenkel-, Poplitea-, Femoral- und Beckenvenen). Hauptgefahr ist die Lungenembolie durch Verschleppung des Thrombus; Spätfolge ist das postthrombotische Syndrom.',
      aetiologie: 'Pathogenetisch erklärt durch die Virchow-Trias: Endothelschädigung, venöse Stase (Immobilisation) und Hyperkoagulabilität. Auslöser sind häufig Immobilisation (lange Reise, Operation, Gipsverband), hormonelle Faktoren (Östrogenpille, Schwangerschaft), Malignome und angeborene Thrombophilien (z. B. Faktor-V-Leiden-Mutation).',
      risikofaktoren: [
        'Immobilisation (langer Flug/lange Reise, Bettlägerigkeit, Operation, Gipsverband)',
        'Orale Kontrazeptiva (Östrogene), Schwangerschaft und Wochenbett',
        'Malignom (paraneoplastische Hyperkoagulabilität)',
        'Angeborene Thrombophilie (Faktor-V-Leiden, Prothrombin-Mutation, Protein-C/-S-Mangel)',
        'Frühere TVT oder Lungenembolie',
        'Varikosis / chronisch-venöse Insuffizienz',
        'Nikotinabusus',
        'Adipositas',
        'Höheres Lebensalter',
        'Exsikkose',
      ],
      klinik: [
        {
          text: 'Einseitig geschwollenes Bein mit tastbarer Umfangsdifferenz im Seitenvergleich',
        },
        {
          text: 'Überwärmung, rötlich-livide Verfärbung und Spannungsgefühl der betroffenen Extremität',
        },
        {
          text: 'Ziehender Wadenschmerz und Schweregefühl, verstärkt beim Gehen und Stehen',
        },
        {
          text: 'Klinische (unspezifische) Zeichen: Homans-Zeichen (Wadenschmerz bei Dorsalflexion des Fußes), Meyer-Zeichen (Wadenkompressionsschmerz), Payr-Zeichen (Fußsohlendruckschmerz)',
        },
        {
          text: 'Glänzende Haut und vermehrte Venenzeichnung (Prattsche Warnvenen)',
        },
        {
          text: 'Häufig oligo- oder asymptomatischer Verlauf — bis zu 50 % klinisch stumm; Erstmanifestation kann eine Lungenembolie sein',
          atypisch: true,
        },
        {
          text: 'Phlegmasia coerulea dolens: massive Schwellung mit Zyanose und drohender Gangrän — absoluter Notfall',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Wells-Score (TVT)',
          inhalt: 'Klinischer Score zur Vortestwahrscheinlichkeit (u. a. aktives Malignom, Immobilisation/OP, einseitige Schwellung > 3 cm, Ödem, Kollateralvenen, frühere TVT). Niedrige Wahrscheinlichkeit + negativer D-Dimer schließt eine TVT weitgehend aus; hohe Wahrscheinlichkeit → direkt Kompressionssonographie.',
        },
        {
          name: 'Lokalisationstypen',
          inhalt: 'Nach Ausdehnung: distale (Unterschenkel-)TVT vs. proximale (popliteale, femorale, iliakale) TVT; Mehretagenthrombose bei ausgedehntem Befall. Proximale und deszendierende Becken-/Beinvenenthrombosen haben ein höheres Embolierisiko.',
        },
      ],
      redFlags: [
        'Plötzliche Dyspnoe, atemabhängiger Thoraxschmerz, Tachykardie, Husten oder Hämoptyse → Verdacht auf Lungenembolie',
        'Synkope oder Kreislaufinstabilität → fulminante Lungenembolie',
        'Massive Schwellung mit Zyanose und starkem Schmerz → Phlegmasia coerulea dolens (drohende venöse Gangrän)',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Anamnese mit gezielter Frage nach Auslösern (langer Flug/Immobilisation, Östrogenpille, früherer Thrombose, familiärer Thrombophilie) und aktiver Abfrage von Lungenembolie-Zeichen',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Körperliche Untersuchung: Inspektion (einseitige Schwellung, Rötung, livide Verfärbung), seitenvergleichende Umfangmessung, Homans-/Meyer-/Payr-Zeichen (unspezifisch), Palpation der Fußpulse zur Abgrenzung einer pAVK, Vitalparameter',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Wells-Score zur Bestimmung der klinischen Vortestwahrscheinlichkeit',
        },
        {
          stufe: 'Labor',
          text: 'D-Dimer: hoher negativer prädiktiver Wert — bei niedriger Wahrscheinlichkeit und negativem Wert ist eine TVT nahezu ausgeschlossen; unspezifisch bei Erhöhung',
        },
        {
          stufe: 'Labor',
          text: 'Blutbild, CRP, Gerinnung (Quick/INR, aPTT) und Nierenwerte (vor Antikoagulation zur Substanz- und Dosiswahl)',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Kompressions-/Duplexsonographie der Beinvenen (Goldstandard): fehlende Komprimierbarkeit der Vene als Nachweis',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Bei Verdacht auf Lungenembolie CT-Angiographie des Thorax; ggf. Phlebographie bei unklarem Befund',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Bei unprovozierter TVT alters- und geschlechtsgerechte Tumorsuche; erweiterte Thrombophilie-Diagnostik (Faktor-V-Leiden u. a.) bei jungen Patienten, Rezidiv oder positiver Familienanamnese',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Rupturierte Baker-Zyste',
          unterscheidung: 'Plötzlicher Schmerz in der Kniekehle mit Unterschenkelschwellung; sonographisch Zystennachweis, Vene komprimierbar.',
        },
        {
          dd: 'Erysipel / Zellulitis',
          unterscheidung: 'Scharf begrenzte, hochrote, überwärmte Hautrötung mit Fieber und Schüttelfrost, oft Eintrittspforte; entzündungsbetont statt schwellungsbetont.',
        },
        {
          dd: 'Muskelfaserriss / Hämatom',
          unterscheidung: 'Akutes Trauma bzw. abrupter Belastungsschmerz in der Anamnese, umschriebene Druckdolenz, ggf. sichtbares Hämatom.',
        },
        {
          dd: 'Chronisch-venöse Insuffizienz',
          unterscheidung: 'Beidseitige, langsam progrediente Ödeme mit Stauungsdermatitis und Varizen; keine akute einseitige Schwellung.',
        },
        {
          dd: 'Lymphödem',
          unterscheidung: 'Chronische, teigige, nicht eindrückbare Schwellung mit Zehenbeteiligung (Stemmer-Zeichen positiv), keine Überwärmung oder Rötung.',
        },
        {
          dd: 'Periphere arterielle Verschlusskrankheit (pAVK)',
          unterscheidung: 'Genau gegenteilig — blasses, kühles Bein mit abgeschwächten/fehlenden Pulsen und belastungsabhängigem Schmerz; einfach durch Pulstasten abzugrenzen.',
        },
      ],
      therapie: [
        {
          label: 'Antikoagulation',
          akut: true,
          items: [
            'Sofortige therapeutische Antikoagulation bereits bei hoher klinischer Wahrscheinlichkeit (noch vor Bildgebung)',
            'Akut: DOAK (z. B. Rivaroxaban, Apixaban) oder gewichtsadaptiertes niedermolekulares Heparin (NMH) s. c.; alternativ Fondaparinux s. c. oder unfraktioniertes Heparin i. v. mit aPTT-Steuerung (bei Niereninsuffizienz)',
            'Erhaltungstherapie mit DOAK oder Vitamin-K-Antagonist (Phenprocoumon/Marcumar, Ziel-INR 2–3) mit überlappendem Bridging',
            'Therapiedauer nach Ursache: provozierte TVT mind. 3 Monate, unprovozierte/rezidivierende TVT 6 Monate bis dauerhaft, bei aktivem Malignom langfristig',
            'Vor Beginn Blutungsrisiko und Nierenfunktion prüfen',
          ],
        },
        {
          label: 'Kompressionstherapie',
          items: [
            'Initial Kompressionsverband, nach Abschwellung medizinische Kompressionsstrümpfe (Klasse II)',
            'Ziel: Beschwerdelinderung und Prophylaxe des postthrombotischen Syndroms',
          ],
        },
        {
          label: 'Mobilisation & Allgemeinmaßnahmen',
          items: [
            'Frühe Mobilisation — keine strikte Bettruhe mehr',
            'Hochlagern des betroffenen Beins und ausreichende Analgesie',
            'Ausschalten von Auslösern: Absetzen der Östrogenpille, Umstellung der Kontrazeption',
            'Patientenschulung, ausreichende Hydratation, Bewegungsübungen bei langen Reisen als Rezidivprophylaxe',
          ],
        },
        {
          label: 'Interventionell (bei ausgedehnter TVT)',
          items: [
            'Bei ausgedehnter deszendierender Becken-/Oberschenkelvenenthrombose oder Phlegmasia coerulea dolens: kathetergestützte Thrombolyse oder Thrombektomie',
            'Vena-cava-Filter nur bei absoluter Kontraindikation gegen eine Antikoagulation oder Rezidiv trotz suffizienter Antikoagulation',
          ],
        },
      ],
      prognose: 'Unter suffizienter Antikoagulation günstig. Hauptrisiko der akuten Phase ist die Lungenembolie; häufigste Spätfolge ist das postthrombotische Syndrom mit chronischer Schwellung, Schmerz und Ulcus cruris. Rezidivrisiko besonders bei unprovozierter TVT und persistierenden Risikofaktoren (Thrombophilie, Malignom).',
      pruefungsfallen: [
        'Frage nach einer FRÜHEREN Thrombose/Lungenembolie vergessen — ein Prüfer hat dies ausdrücklich als \'sehr wichtig in diesem Fall\' bemängelt.',
        'Auslöser nicht herausgearbeitet: langer Flug/Immobilisation UND Östrogenpille müssen aktiv erfragt werden.',
        'Familiäre Thrombophilie (Faktor-V-Leiden) nicht abgefragt — bei jungen Patienten und positiver Familienanamnese zentral.',
        'Lungenembolie als Komplikation nicht aktiv abgefragt (Dyspnoe, Thoraxschmerz, Herzrasen, Hämoptyse) — die entscheidende Gefahr.',
        'pAVK als DD nicht abgegrenzt — einfache Unterscheidung durch seitenvergleichendes Tasten der Fußpulse.',
        'D-Dimer als Ausschluss überschätzt: nur bei niedriger Vortestwahrscheinlichkeit aussagekräftig; die Kompressionssonographie ist der Goldstandard.',
        'Antikoagulationsdauer falsch: 3 Monate bei provozierter, länger/dauerhaft bei unprovozierter TVT oder Malignom.',
      ],
      askedInExam: [
        {
          frage: 'Was spricht bei dieser Patientin für eine TVT?',
          antwort: 'Die einseitig geschwollene, überwärmte, gerötete und schmerzhafte rechte Wade mit Spannungsgefühl, der zeitliche Zusammenhang mit einem langen Flug und die Einnahme der Östrogenpille.',
        },
        {
          frage: 'Welche Risikofaktoren hat die Patientin?',
          antwort: 'Immobilisation durch den zwölfstündigen Flug aus Bangkok, orale Kontrazeptiva, Varikosis, Nikotinkonsum, arterielle Hypertonie sowie eine familiäre Gerinnungsstörung des Vaters.',
        },
        {
          frage: 'Welche klinischen Zeichen prüfen Sie bei der Untersuchung?',
          antwort: 'Homans-Zeichen (Wadenschmerz bei Dorsalflexion), Meyer-Zeichen (Wadenkompressionsschmerz) und Payr-Zeichen (Fußsohlendruckschmerz); sie sind allerdings unspezifisch. Zusätzlich seitenvergleichende Umfangmessung.',
        },
        {
          frage: 'Was bestimmen Sie im Labor und warum?',
          antwort: 'Den D-Dimer wegen des hohen negativen prädiktiven Werts sowie die Gerinnung; bei jungem Alter und positiver Familienanamnese eine Thrombophilie-Diagnostik auf eine Faktor-V-Leiden-Mutation.',
        },
        {
          frage: 'Welche bildgebende Untersuchung ist der Goldstandard?',
          antwort: 'Die Kompressions- bzw. Duplexsonographie der Beinvenen; die fehlende Komprimierbarkeit der Vene beweist die Thrombose.',
        },
        {
          frage: 'Welche gefährliche Komplikation müssen Sie ausschließen?',
          antwort: 'Die Lungenembolie — ich frage aktiv nach Dyspnoe, atemabhängigem Thoraxschmerz, Herzrasen, Husten und Hämoptyse; bei Verdacht folgt eine CT-Angiographie.',
        },
        {
          frage: 'Wie unterscheiden Sie eine TVT von einer pAVK bei der Untersuchung?',
          antwort: 'Durch seitenvergleichendes Tasten der Fußpulse: bei der TVT sind sie erhalten, das Bein ist warm und geschwollen; bei der pAVK ist das Bein blass und kühl mit abgeschwächten oder fehlenden Pulsen.',
        },
        {
          frage: 'Wie lange muss antikoaguliert werden?',
          antwort: 'Bei provozierter TVT mindestens drei Monate; bei unprovozierter oder rezidivierender TVT sechs Monate bis dauerhaft; bei aktivem Malignom langfristig.',
        },
      ],
      merksatz: 'Einseitig geschwollenes, warmes, schmerzhaftes Bein nach langem Flug + Pille = an TVT denken — Wells-Score, D-Dimer, Kompressionssono, sofort antikoagulieren und immer aktiv nach Lungenembolie fragen.',
      linkedCaseIds: [
        'case-tvt',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-sonographie',
      ],
    },
    {
      id: 'fw-diabetes',
      pathology: 'Diabetes mellitus Typ 2 (Erstdiagnose)',
      specialty: 'Endokrinologie',
      definition: 'Der Diabetes mellitus Typ 2 ist eine chronische Stoffwechselerkrankung, die durch eine periphere Insulinresistenz in Muskel-, Fett- und Lebergewebe in Kombination mit einer zunehmenden Sekretionsstörung der Betazellen der Langerhans-Inseln gekennzeichnet ist. Daraus resultiert ein relativer Insulinmangel mit chronischer Hyperglykämie. Er macht etwa 90 bis 95 % aller Diabetesfälle aus, entwickelt sich über Jahre schleichend und wird deshalb häufig erst als Zufallsbefund oder über Folgeerkrankungen entdeckt. Er ist die zentrale Komponente des metabolischen Syndroms und mit erheblicher mikro- und makrovaskulärer Morbidität verbunden.',
      aetiologie: 'Multifaktoriell: starke genetische Prädisposition (Konkordanz eineiiger Zwillinge über 90 %, deutlich höher als beim Typ 1) trifft auf einen adipogenen Lebensstil mit hyperkalorischer, kohlenhydrat- und fettreicher Ernährung, Bewegungsmangel und viszeraler Adipositas. Das viszerale Fettgewebe wirkt als endokrines Organ: freie Fettsäuren, TNF-alpha, Interleukin-6 und Resistin fördern die Insulinresistenz, während Adiponectin abnimmt. Die Betazellen kompensieren zunächst durch Hyperinsulinämie (Stadium des Prädiabetes), erschöpfen sich jedoch über Jahre; bei Erstdiagnose ist die Betazellfunktion oft bereits um etwa 50 % reduziert. Abzugrenzen sind sekundäre Diabetesformen: pankreopriver Diabetes (Typ 3c) nach chronischer Pankreatitis, Pankreasresektion, Hämochromatose oder Mukoviszidose; endokrine Ursachen wie Cushing-Syndrom, Akromegalie, Phäochromozytom und Hyperthyreose; medikamentös induziert durch Glukokortikoide, Thiazide, Neuroleptika, Tacrolimus oder eine antiretrovirale Therapie; sowie monogene Formen (MODY).',
      risikofaktoren: [
        'Adipositas, insbesondere viszerale/abdominelle Fettverteilung (Taillenumfang bei Männern über 94 bzw. 102 cm, bei Frauen über 80 bzw. 88 cm)',
        'Bewegungsmangel',
        'Positive Familienanamnese: ein Elternteil mit Typ-2-Diabetes verdoppelt bis verdreifacht das Risiko, bei beiden Eltern steigt es auf über 50 %',
        'Lebensalter über 45 Jahre',
        'Arterielle Hypertonie',
        'Dyslipidämie mit niedrigem HDL und erhöhten Triglyzeriden',
        'Prädiabetes: abnorme Nüchternglukose oder gestörte Glukosetoleranz',
        'Zustand nach Gestationsdiabetes oder Geburt eines Kindes über 4000 g',
        'Polyzystisches Ovarialsyndrom',
        'Nikotinkonsum (erhöht die Insulinresistenz und potenziert das makrovaskuläre Risiko)',
        'Zuckerhaltige Getränke und stark verarbeitete Nahrungsmittel',
        'Schichtarbeit und chronischer Schlafmangel',
        'Bestimmte Medikamente: Glukokortikoide, Thiazide, atypische Neuroleptika, Tacrolimus, Ciclosporin',
        'Ethnische Prädisposition (süd- und ostasiatische, afrikanische, hispanische Herkunft — dort bereits bei niedrigerem BMI)',
      ],
      klinik: [
        {
          text: 'Sehr häufig ZUFALLSBEFUND oder völlig asymptomatischer Verlauf über Jahre — bei Erstdiagnose bestehen bei etwa einem Fünftel der Patienten bereits Folgeschäden',
        },
        {
          text: 'Polyurie: osmotische Diurese, sobald die Nierenschwelle von etwa 180 mg/dl überschritten wird und Glukose im Urin osmotisch Wasser bindet',
        },
        {
          text: 'Polydipsie mit quälendem Durst und Mundtrockenheit als Folge des renalen Wasserverlusts',
        },
        {
          text: 'Nykturie mit konsekutiver Ein- und Durchschlafstörung',
        },
        {
          text: 'Müdigkeit, Abgeschlagenheit, Leistungsknick und Konzentrationsstörungen — häufig das führende Symptom',
        },
        {
          text: 'Ungewollter Gewichtsverlust trotz erhaltenem oder gesteigertem Appetit (Katabolie und kalorischer Verlust über die Glukosurie) — beim Typ 2 weniger ausgeprägt als beim Typ 1',
        },
        {
          text: 'Generalisierter Pruritus und trockene Haut',
        },
        {
          text: 'Rezidivierende Infekte: Harnwegsinfekte, Hautinfektionen, Furunkel, Abszesse, Fußpilz, Soor der Mundhöhle, Balanitis oder Vulvovaginitis candidomycetica',
        },
        {
          text: 'Wundheilungsstörungen — kleine Verletzungen heilen über Wochen nicht ab',
        },
        {
          text: 'Passagere Sehstörungen mit verschwommenem Sehen durch osmotische Quellung der Linse (reversibel nach Normalisierung des Blutzuckers — nicht mit einer Retinopathie verwechseln)',
        },
        {
          text: 'Wadenkrämpfe und Muskelschwäche',
        },
        {
          text: 'Erstmanifestation über eine Folgeerkrankung: Myokardinfarkt, Schlaganfall, pAVK, nicht heilendes Fußulkus, Sehverschlechterung oder Niereninsuffizienz',
          atypisch: true,
        },
        {
          text: 'Erstmanifestation als hyperosmolares hyperglykämisches Syndrom mit extremer Hyperglykämie über 600 mg/dl, ausgeprägter Exsikkose und Bewusstseinstrübung bis zum Koma — typischerweise bei älteren Patienten, ausgelöst durch einen Infekt',
          atypisch: true,
        },
        {
          text: 'Diabetische Ketoazidose beim Typ 2 (selten, aber möglich, etwa unter SGLT2-Inhibitoren als euglykäme Ketoazidose oder bei schwerem Stress)',
          atypisch: true,
        },
        {
          text: 'Rezidivierende Hypoglykämie-ähnliche Symptome durch überschießende, verzögerte Insulinsekretion im Frühstadium der Insulinresistenz',
          atypisch: true,
        },
        {
          text: 'Acanthosis nigricans (samtartig-hyperpigmentierte Hautverdickung in Nacken und Axillen) als kutaner Marker der Insulinresistenz',
          atypisch: true,
        },
        {
          text: 'Erektile Dysfunktion oder Gastroparese mit Völlegefühl und Erbrechen als Erstmanifestation einer autonomen Neuropathie',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Diagnosekriterien des Diabetes mellitus (DDG/ADA)',
          inhalt: 'Ein Diabetes liegt vor bei: Nüchternplasmaglukose ≥ 126 mg/dl (7,0 mmol/l) nach mindestens 8 Stunden Nahrungskarenz; ODER HbA1c ≥ 6,5 % (≥ 48 mmol/mol); ODER 2-Stunden-Wert im oGTT mit 75 g Glukose ≥ 200 mg/dl (11,1 mmol/l); ODER Gelegenheitsplasmaglukose ≥ 200 mg/dl (11,1 mmol/l) zusammen mit klassischen Symptomen (Polyurie, Polydipsie, ungewollter Gewichtsverlust). Ein pathologischer Wert muss an einem zweiten Tag bestätigt werden — außer bei eindeutiger klinischer Symptomatik oder bei zwei gleichzeitig pathologischen unterschiedlichen Parametern. Prädiabetes: abnorme Nüchternglukose 100–125 mg/dl, gestörte Glukosetoleranz (oGTT-2-h-Wert) 140–199 mg/dl, HbA1c 5,7–6,4 %.',
        },
        {
          name: 'Ätiologische Klassifikation (DDG/WHO)',
          inhalt: 'Typ 1: autoimmune Betazellzerstörung mit absolutem Insulinmangel (Typ 1a autoimmun, Typ 1b idiopathisch; LADA = langsam progrediente Autoimmunform des Erwachsenen). Typ 2: Insulinresistenz mit relativem Insulinmangel und sekretorischem Defekt. Typ 3: andere spezifische Typen — 3a genetische Betazelldefekte (MODY), 3b genetische Insulinwirkungsdefekte, 3c pankreopriv (chronische Pankreatitis, Pankreatektomie, Hämochromatose, Mukoviszidose), 3d endokrinopathiebedingt (Cushing, Akromegalie, Phäochromozytom, Hyperthyreose), 3e medikamentös/toxisch (Glukokortikoide, Thiazide, Neuroleptika), 3f infektionsbedingt, 3g/3h immunologisch bzw. syndromal. Typ 4: Gestationsdiabetes.',
        },
        {
          name: 'Definition des metabolischen Syndroms (IDF)',
          inhalt: 'Obligat ist die abdominelle Adipositas (Taillenumfang bei europäischen Männern ≥ 94 cm, bei Frauen ≥ 80 cm) plus mindestens zwei der folgenden Kriterien: Triglyzeride ≥ 150 mg/dl oder Therapie; HDL-Cholesterin < 40 mg/dl bei Männern bzw. < 50 mg/dl bei Frauen oder Therapie; Blutdruck ≥ 130/85 mmHg oder antihypertensive Therapie; Nüchternglukose ≥ 100 mg/dl oder bereits diagnostizierter Typ-2-Diabetes. Das metabolische Syndrom wird auch als „tödliches Quartett" bezeichnet.',
        },
        {
          name: 'Stadien der diabetischen Nephropathie (Albuminurie nach KDIGO)',
          inhalt: 'A1 Normoalbuminurie: Albumin-Kreatinin-Quotient < 30 mg/g. A2 moderat erhöhte Albuminurie (früher Mikroalbuminurie): 30–300 mg/g — Frühstadium, unter konsequenter Blutdruck- und Blutzuckereinstellung noch reversibel. A3 stark erhöhte Albuminurie (früher Makroalbuminurie/Proteinurie): > 300 mg/g. Parallel Stadieneinteilung nach eGFR (G1 bis G5). Der Nachweis erfordert zwei von drei pathologischen Proben innerhalb von drei bis sechs Monaten; falsch positive Werte durch Harnwegsinfekt, Fieber, körperliche Belastung und Menstruation.',
        },
        {
          name: 'Stadien der diabetischen Retinopathie',
          inhalt: 'Nichtproliferative Retinopathie (mild, mäßig, schwer): Mikroaneurysmen, intraretinale Blutungen, harte Exsudate, Cotton-wool-Herde, perlschnurartige Venen. Proliferative Retinopathie: Neovaskularisationen mit Gefahr von Glaskörperblutung, traktiver Netzhautablösung und Rubeosis iridis mit Sekundärglaukom. Unabhängig davon in jedem Stadium möglich: diabetisches Makulaödem — die häufigste Ursache des Visusverlusts. Therapie: panretinale Laserkoagulation bzw. intravitreale VEGF-Hemmer.',
        },
        {
          name: 'Wagner-Armstrong-Klassifikation des diabetischen Fußsyndroms',
          inhalt: 'Wagner-Grad 0 bis 5 nach Tiefe: 0 Risikofuß ohne Läsion, 1 oberflächliches Ulkus, 2 Ulkus bis Sehne/Kapsel, 3 Ulkus mit Knochenbeteiligung/Abszess, 4 begrenzte Nekrose/Vorfußgangrän, 5 Nekrose des gesamten Fußes. Armstrong-Stadien A bis D beschreiben ergänzend Infektion und Ischämie: A ohne beides, B mit Infektion, C mit Ischämie, D mit Infektion und Ischämie.',
        },
      ],
      redFlags: [
        'Bewusstseinstrübung, Somnolenz oder Koma bei Hyperglykämie → hyperosmolares hyperglykämisches Syndrom oder Ketoazidose, sofortige stationäre Aufnahme',
        'Azetongeruch der Atemluft, vertiefte Kussmaul-Atmung, Übelkeit, Erbrechen und Pseudoperitonitis diabetica → diabetische Ketoazidose',
        'Ketonurie oder Ketonämie bei Hyperglykämie, auch bei nur mäßig erhöhtem Blutzucker unter SGLT2-Inhibitoren (euglykäme Ketoazidose)',
        'Blutzucker unter 50 mg/dl mit Kaltschweißigkeit, Tremor, Verwirrtheit oder Krampfanfall → schwere Hypoglykämie, sofortige Glukosegabe',
        'Ausgeprägte Exsikkose mit Hypotonie, Tachykardie und Oligurie',
        'Fieber mit Flankenschmerz und Klopfschmerz im Nierenlager bei Diabetes → Pyelonephritis mit Gefahr der Urosepsis und Stoffwechselentgleisung',
        'Nicht heilendes, gerötetes oder sezernierendes Fußulkus, Knochenkontakt bei der Sondierung, Krepitation oder Gangrän → infiziertes diabetisches Fußsyndrom, Osteomyelitis, Amputationsgefahr',
        'Plötzliche schmerzlose Sehverschlechterung oder „Rußregen" → Glaskörperblutung bei proliferativer Retinopathie',
        'Atypischer oder stummer Myokardinfarkt: Diabetiker präsentieren sich wegen der autonomen Neuropathie häufig ohne Angina pectoris, nur mit Dyspnoe, Übelkeit oder Schwäche',
        'Rasch progrediente Niereninsuffizienz mit Kreatininanstieg und Hyperkaliämie',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Anamnese der osmotischen Leitsymptome: Trinkmenge, Urinmenge, Nykturie, Gewichtsverlauf mit Zeitraum, Leistungsknick, Pruritus, rezidivierende Infekte, Wundheilungsstörungen, Sehstörungen; bei bekanntem Diabetes IMMER fragen, seit wann er besteht, wie er behandelt und wie er kontrolliert wird',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Risikoprofil erheben: Familienanamnese, Gestationsdiabetes, Ernährung, Bewegung, Nikotin in Packungsjahren, Alkohol, Medikamente (insbesondere Glukokortikoide, Thiazide, Neuroleptika), frühere Pankreatitis',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Körperliche Untersuchung: Blutdruck, Herzfrequenz, Größe, Gewicht, BMI, Taillenumfang; Inspektion von Haut (Acanthosis nigricans, Mykosen, Necrobiosis lipoidica), Mundhöhle (Soor) und Genitale',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Kompletter Fußstatus: Inspektion einschließlich Zehenzwischenräumen, Nägeln und Druckstellen, Prüfung des Berührungsempfindens mit dem 10-g-Monofilament nach Semmes-Weinstein, des Vibrationsempfindens mit der Stimmgabel nach Rydel-Seiffer (8/8), Temperatur- und Schmerzempfinden, Achillessehnenreflex, Palpation der Fußpulse und Bestimmung des Knöchel-Arm-Index',
        },
        {
          stufe: 'Labor',
          text: 'Nüchternplasmaglukose (≥ 126 mg/dl diagnostisch) und Gelegenheitsglukose (≥ 200 mg/dl mit klassischer Symptomatik diagnostisch); die Bestimmung erfolgt im venösen Plasma, kapilläre Messungen dienen nur der Orientierung und der Selbstkontrolle',
        },
        {
          stufe: 'Labor',
          text: 'HbA1c (≥ 6,5 % bzw. 48 mmol/mol diagnostisch): Maß der mittleren Glykämie der letzten 8 bis 12 Wochen; nicht verwertbar bei Anämie, Hämolyse, Hämoglobinopathien, nach Transfusion, in der Schwangerschaft und bei fortgeschrittener Niereninsuffizienz',
        },
        {
          stufe: 'Labor',
          text: 'Urinstatus mit Teststreifen und Sediment: Glukosurie ab Überschreiten der Nierenschwelle von etwa 180 mg/dl, Ketonkörper zur Erkennung einer Entgleisung, Leukozyten, Nitrit und Erythrozyten bei Harnwegsinfekt; bei Infektverdacht Mittelstrahlurinkultur mit Antibiogramm',
        },
        {
          stufe: 'Labor',
          text: 'Albumin-Kreatinin-Quotient im Morgenurin als Screening auf die diabetische Nephropathie (pathologisch ab 30 mg/g; Bestätigung durch zwei von drei Proben)',
        },
        {
          stufe: 'Labor',
          text: 'Nierenretentionswerte und eGFR, Elektrolyte einschließlich Kalium, Leberwerte (nichtalkoholische Fettleber), Blutbild mit Differenzialblutbild und CRP; Blutgasanalyse mit Anionenlücke bei jedem Entgleisungsverdacht',
        },
        {
          stufe: 'Labor',
          text: 'Nüchtern-Lipidstatus mit Gesamtcholesterin, LDL, HDL und Triglyzeriden sowie TSH zur Abgrenzung einer Schilddrüsenfunktionsstörung',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Augenärztliche Untersuchung des Augenhintergrunds in Mydriasis: beim Typ 2 SOFORT bei Erstdiagnose (die Erkrankung bestand oft jahrelang unerkannt), beim Typ 1 erst fünf Jahre nach Manifestation; anschließend jährliche Kontrolle, bei Retinopathie engmaschiger',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Sonographie von Nieren und ableitenden Harnwegen (Nierengröße, Parenchymbreite, Harnstau, Restharn bei autonomer Blasenstörung) sowie des Abdomens (Steatosis hepatis, Pankreas)',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Ruhe-EKG als kardiovaskuläre Ausgangsuntersuchung wegen der Gefahr stummer Ischämien, Blutdruck-Langzeitmessung; bei Beschwerden oder hohem Risiko Belastungs-EKG, Echokardiographie und Duplexsonographie der Carotiden und Beinarterien',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Bei Verdacht auf ein diabetisches Fußsyndrom: Röntgen des Fußes in zwei Ebenen (Osteolysen, Osteomyelitis, Charcot-Fuß), im Zweifel MRT',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Oraler Glukosetoleranztest mit 75 g Glukose nach dreitägiger kohlenhydratreicher Kost und mindestens achtstündiger Nüchternheit — nur bei Grauzonenwerten indiziert; bei bereits eindeutiger Diagnose überflüssig und kontraindiziert',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'C-Peptid zur Beurteilung der endogenen Restsekretion (beim Typ 2 normal bis erhöht, beim Typ 1 erniedrigt) — es wird bestimmt, weil es im Gegensatz zum Insulin keinem hepatischen First-Pass-Effekt unterliegt und auch unter exogener Insulintherapie verwertbar bleibt',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Autoantikörper (Anti-GAD65, Anti-IA2, Insulinautoantikörper, ZnT8) zur Abgrenzung von Typ 1 und LADA bei untypischer Konstellation (schlanker Patient, rascher Verlauf, Ketoseneigung, positive Autoimmunanamnese)',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Kontinuierliches Glukosemonitoring (CGM) mit Auswertung von „time in range" bei instabiler Einstellung oder Hypoglykämieproblematik; Elektroneurographie und quantitative sensorische Testung bei unklarer Polyneuropathie; genetische Diagnostik bei Verdacht auf MODY',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Diabetes mellitus Typ 1',
          unterscheidung: 'Jüngere, meist schlanke Patienten, rascher Beginn über Wochen, starker Gewichtsverlust, Ketoseneigung bis zur Ketoazidose als Erstmanifestation, C-Peptid erniedrigt, Autoantikörper positiv, HLA-Assoziation (DR3/DR4), von Beginn an insulinpflichtig.',
        },
        {
          dd: 'LADA (late-onset autoimmune diabetes in adults)',
          unterscheidung: 'Autoimmuner Diabetes des Erwachsenen mit langsamer Progression — wird häufig als Typ 2 fehlgedeutet. Verdacht bei normalgewichtigen Patienten über 30 Jahren, raschem Versagen oraler Antidiabetika und anderen Autoimmunerkrankungen; entscheidend sind Anti-GAD-Antikörper und ein niedriges C-Peptid.',
        },
        {
          dd: 'Diabetes insipidus (zentral oder renal)',
          unterscheidung: 'Polyurie und Polydipsie OHNE Hyperglykämie und OHNE Glukosurie; der Urin ist hypoton mit niedriger Osmolalität und niedrigem spezifischem Gewicht, das Serumnatrium eher erhöht. Ursache ist ein ADH-Mangel oder eine renale ADH-Resistenz; Klärung über Serum-/Urinosmolalität und Durstversuch.',
        },
        {
          dd: 'Pankreopriver Diabetes (Typ 3c)',
          unterscheidung: 'Nach chronischer Pankreatitis (meist alkoholtoxisch), Pankreasresektion, Hämochromatose oder Mukoviszidose. Hinweise: Oberbauchschmerzen, Steatorrhoe, Gewichtsverlust, exokrine Insuffizienz mit erniedrigter Elastase im Stuhl, Verkalkungen im CT; typischerweise „brittle" mit gleichzeitigem Glukagonmangel und hoher Hypoglykämiegefahr.',
        },
        {
          dd: 'Steroiddiabetes und andere medikamenteninduzierte Formen',
          unterscheidung: 'Zeitlicher Zusammenhang mit Glukokortikoiden, Thiaziden, atypischen Neuroleptika, Tacrolimus oder Ciclosporin; typisch sind vor allem postprandiale Hyperglykämien bei häufig normalem Nüchternwert. Nach Absetzen oft reversibel.',
        },
        {
          dd: 'Cushing-Syndrom',
          unterscheidung: 'Stammbetonte Adipositas mit Vollmondgesicht und Büffelnacken, Striae rubrae, Muskelatrophie der Extremitäten, Hautatrophie, Hypertonie, Hypokaliämie, Osteoporose. Klärung über Dexamethason-Hemmtest, freies Cortisol im 24-Stunden-Urin und Mitternachtscortisol im Speichel.',
        },
        {
          dd: 'Hyperthyreose',
          unterscheidung: 'Gewichtsverlust bei gesteigertem Appetit, aber mit Tachykardie, Tremor, Hitzeintoleranz, vermehrtem Schwitzen, Diarrhoe, Nervosität und ggf. Struma oder endokriner Orbitopathie; TSH supprimiert, fT3 und fT4 erhöht. Kann einen Diabetes zusätzlich demaskieren.',
        },
        {
          dd: 'Harnwegsinfekt / chronische Zystitis',
          unterscheidung: 'Dysurie, Pollakisurie und imperativer Harndrang mit kleinen Urinportionen — im Gegensatz zur Polyurie mit großen Volumina; kein Durst, kein Gewichtsverlust. Beim Diabetiker ist der rezidivierende Harnwegsinfekt jedoch typische FOLGE der Glukosurie und sollte zur Blutzuckerbestimmung führen.',
        },
        {
          dd: 'Depression und chronisches Erschöpfungssyndrom',
          unterscheidung: 'Erklären Müdigkeit, Antriebslosigkeit und Schlafstörung, nicht aber Polyurie, Polydipsie, Pruritus und Wundheilungsstörung. Typisch sind gedrückte Stimmung, Interessenverlust, Früherwachen und Appetitminderung. Häufige Prüfungsfalle: die Depression zu diagnostizieren, bevor der Blutzucker bestimmt wurde — Diabetes und Depression sind zudem häufig komorbid.',
        },
        {
          dd: 'Anämie',
          unterscheidung: 'Häufige Ursache von Müdigkeit und Leistungsknick, jedoch mit Blässe, Belastungsdyspnoe und Tachykardie und ohne osmotische Symptomatik; Klärung über Blutbild, Ferritin und Retikulozyten.',
        },
        {
          dd: 'Chronische Niereninsuffizienz',
          unterscheidung: 'Nykturie, Müdigkeit, Pruritus und Übelkeit; Kreatinin und Harnstoff erhöht, eGFR vermindert, häufig renale Anämie und Elektrolytstörungen. Beim Diabetiker ist sie meist Folge der Nephropathie und nicht Differenzialdiagnose.',
        },
        {
          dd: 'Psychogene Polydipsie',
          unterscheidung: 'Primär gesteigerte Trinkmenge mit sekundärer Polyurie, häufig bei psychiatrischer Grunderkrankung; Serumnatrium und Serumosmolalität eher niedrig, Blutzucker normal, keine Glukosurie.',
        },
      ],
      therapie: [
        {
          label: 'Basistherapie: Lebensstil, Ernährung und strukturierte Schulung',
          items: [
            'Strukturierte Diabetesschulung als Fundament jeder Behandlung: Krankheitsverständnis, Bedeutung der Blutzucker- und HbA1c-Werte, Blutzuckerselbstmessung, Erkennen und Behandeln von Hypo- und Hyperglykämien, Fußpflege, Verhalten bei interkurrenten Erkrankungen (Sick-Day-Rules) und im Straßenverkehr',
            'Ernährungstherapie mit individueller Beratung: Reduktion schnell resorbierbarer Kohlenhydrate und zuckerhaltiger Getränke, ballaststoffreiche Vollkornprodukte, Gemüse, mediterrane Kostform, Reduktion gesättigter Fette; keine speziellen „Diabetikerprodukte"',
            'Gewichtsreduktion um zunächst 5 bis 10 % des Ausgangsgewichts — verbessert die Insulinresistenz erheblich; bei kurzer Erkrankungsdauer und deutlicher Gewichtsabnahme ist sogar eine Remission möglich',
            'Körperliche Aktivität: mindestens 150 Minuten moderate Ausdaueraktivität pro Woche auf mindestens drei Tage verteilt, ergänzt durch Krafttraining an zwei Tagen; Bewegung senkt die Insulinresistenz unmittelbar und verbessert das Lipidprofil',
            'Konsequente Nikotinkarenz mit Angebot einer Raucherentwöhnung — die wirksamste Einzelmaßnahme gegen die Makroangiopathie',
            'Alkoholreduktion: Alkohol ist kalorienreich, fördert die Hypertriglyzeridämie und begünstigt unter Insulin oder Sulfonylharnstoffen verzögerte Hypoglykämien durch Hemmung der hepatischen Glukoneogenese',
            'Bariatrische bzw. metabolische Chirurgie (Schlauchmagen, Roux-Y-Magenbypass) als Option bei Adipositas Grad III oder Grad II mit schlecht einstellbarem Diabetes nach Ausschöpfung konservativer Maßnahmen — hohe Remissionsraten, aber lebenslange Substitution und Nachsorge erforderlich',
            'Anbindung an ein Disease-Management-Programm, Einbeziehung von Angehörigen, Selbsthilfegruppen und Diabetesberatung',
          ],
        },
        {
          label: 'Medikamentöse Stufentherapie der Blutzuckersenkung',
          items: [
            'Individualisiertes HbA1c-Ziel gemeinsam mit dem Patienten festlegen: etwa 6,5 bis 7,5 % bei jungen Patienten mit kurzer Krankheitsdauer und langer Lebenserwartung; ein höheres Ziel bis etwa 8 % bei älteren, multimorbiden Patienten mit Hypoglykämierisiko oder begrenzter Lebenserwartung',
            'Erste Stufe: Metformin als Mittel der ersten Wahl, gleichzeitig mit den Basismaßnahmen begonnen — einschleichend 500 mg, Steigerung über zwei bis vier Wochen auf 2 × 1000 mg zu den Mahlzeiten. Wirkung: Hemmung der hepatischen Glukoneogenese, Verbesserung der Insulinsensitivität, gewichtsneutral bis gewichtssenkend, keine Hypoglykämie in Monotherapie. Nebenwirkungen: gastrointestinale Beschwerden, Vitamin-B12-Mangel. Kontraindikationen: eGFR < 30 ml/min, schwere Leberinsuffizienz, respiratorische Insuffizienz, dekompensierte Herzinsuffizienz, Alkoholabusus — CAVE Laktatazidose; Pausieren 48 Stunden um eine Kontrastmittelgabe und bei jeder Erkrankung mit Exsikkose, Hypoxie oder Sepsis',
            'Zweite Stufe nach drei bis sechs Monaten bei Nichterreichen des Ziels — Auswahl nach kardiorenalem Profil statt nach HbA1c allein: SGLT2-Inhibitoren (Empagliflozin, Dapagliflozin) bei Herzinsuffizienz, chronischer Nierenerkrankung oder atherosklerotischer Herz-Kreislauf-Erkrankung; sie senken den Blutzucker insulinunabhängig über eine Glukosurie, reduzieren Gewicht und Blutdruck und verbessern die Prognose. Nebenwirkungen: genitale Mykosen und Harnwegsinfekte, Volumenmangel, selten euglykäme Ketoazidose',
            'GLP-1-Rezeptoragonisten (Semaglutid, Dulaglutid, Liraglutid) bei ausgeprägter Adipositas und hohem kardiovaskulärem Risiko: glukoseabhängige Insulinsekretion, Glukagonhemmung, verzögerte Magenentleerung und Sättigung mit deutlicher Gewichtsreduktion; Nebenwirkungen Übelkeit und Erbrechen, Kontraindikation bei medullärem Schilddrüsenkarzinom und MEN 2, Vorsicht bei Pankreatitisanamnese',
            'Weitere Optionen: DPP-4-Inhibitoren (Sitagliptin — gewichtsneutral, gut verträglich, hypoglykämiearm, nicht mit GLP-1-Analoga kombinieren), Sulfonylharnstoffe (Glimepirid — wirksam und preiswert, aber Gewichtszunahme und relevantes Hypoglykämierisiko, daher nachrangig), Glinide, Pioglitazon (Cave Ödeme, Herzinsuffizienz, Frakturrisiko) und Alpha-Glukosidasehemmer',
            'Insulintherapie bei Versagen der oralen Kombination, bei symptomatischer schwerer Hyperglykämie mit Katabolie, bei Kontraindikationen gegen orale Antidiabetika sowie passager perioperativ, bei schwerer Infektion, unter hochdosierten Glukokortikoiden und in der Schwangerschaft: Beginn meist als basalunterstützte orale Therapie (BOT) mit einem Basalinsulin zur Nacht, danach supplementäre Insulintherapie (SIT) mit Mahlzeiteninsulin oder intensivierte konventionelle Therapie (ICT) im Basis-Bolus-Schema',
            'Bei jeder Einleitung von Insulin oder Sulfonylharnstoffen obligat Hypoglykämieschulung: Symptome erkennen, 15–20 g schnelle Kohlenhydrate (Traubenzucker, Saft), bei Bewusstlosigkeit Glukagon oder Glukose i.v.; Aufklärung über Fahrtauglichkeit und Berufsrisiken',
            'Regelmäßige Reevaluation: HbA1c alle drei Monate bis zur Stabilisierung, danach halbjährlich; Deeskalation der Therapie bei erfolgreicher Gewichtsreduktion und bei älteren Patienten mit Übertherapie',
          ],
        },
        {
          label: 'Behandlung der Begleitrisiken und strukturierte Vorsorgeuntersuchungen',
          items: [
            'Blutdruckeinstellung mit Zielwert um 130/80 mmHg: bevorzugt ACE-Hemmer oder Angiotensin-Rezeptorblocker wegen der nephroprotektiven Wirkung, kombinierbar mit Kalziumantagonisten und Thiaziden; bei Albuminurie zusätzlich ein SGLT2-Inhibitor und ggf. Finerenon',
            'Lipidsenkung mit einem Statin nach Risikokategorie: LDL-Ziel unter 100 mg/dl bei moderatem, unter 70 mg/dl bei hohem und unter 55 mg/dl bei sehr hohem kardiovaskulärem Risiko; bei Nichterreichen Kombination mit Ezetimib, gegebenenfalls PCSK9-Hemmer',
            'Thrombozytenaggregationshemmung mit ASS 100 mg nur in der Sekundärprävention nach kardiovaskulärem Ereignis, nicht routinemäßig primärpräventiv',
            'Jährliches Screening auf Folgeschäden: Augenhintergrund beim Augenarzt, Albumin-Kreatinin-Quotient und eGFR, Fußstatus mit Monofilament, Stimmgabel und Fußpulsen (bei Risikofuß bis vierteljährlich), Lipidstatus, Blutdruck, Gewicht und Taillenumfang',
            'Behandlung manifester Folgeschäden: Retinopathie mit panretinaler Laserkoagulation oder intravitrealen VEGF-Hemmern; Nephropathie mit RAS-Blockade, SGLT2-Inhibitor und Vermeidung nephrotoxischer Substanzen; schmerzhafte Polyneuropathie mit Duloxetin, Pregabalin oder Gabapentin (NICHT mit NSAR); diabetisches Fußsyndrom interdisziplinär mit Druckentlastung, Débridement, Revaskularisation, Antibiotikatherapie und podologischer Versorgung',
            'Impfungen nach STIKO für chronisch Kranke: jährlich Influenza, Pneumokokken, Herpes zoster ab 50 Jahren, COVID-19-Auffrischung',
            'Psychosoziale Betreuung: Diabetes ist mit einer etwa doppelt so hohen Depressionsprävalenz assoziiert; Screening auf Depression und Diabetes-Distress, Angebot psychologischer Unterstützung, Klärung von Beruf, Führerschein und Reisen',
            'Strukturierte Einbindung in ein Disease-Management-Programm mit festen Kontrollintervallen und Gesundheitspass Diabetes',
          ],
        },
      ],
      prognose: 'Die Prognose hängt fast vollständig davon ab, wie früh die Diagnose gestellt und wie konsequent das gesamte Risikoprofil behandelt wird. Der Typ-2-Diabetes verkürzt die Lebenserwartung im Mittel um etwa fünf bis zehn Jahre, wobei die kardiovaskuläre Mortalität die entscheidende Rolle spielt: Etwa 70 bis 80 % der Patienten versterben an makroangiopathischen Folgen wie Myokardinfarkt oder Schlaganfall. Der Diabetes ist außerdem in Deutschland die häufigste Ursache für Erblindung im Erwerbsalter, für terminale Niereninsuffizienz mit Dialysepflicht und für nichttraumatische Amputationen. Entscheidend ist das multifaktorielle Vorgehen: Die Steno-2-Studie zeigte, dass die gleichzeitige Behandlung von Blutzucker, Blutdruck, Lipiden und Thrombozytenaggregation die kardiovaskulären Ereignisse etwa halbiert — die alleinige Blutzuckersenkung verhindert vor allem die Mikroangiopathie. Bei früher Diagnose, deutlicher Gewichtsreduktion oder metabolischer Chirurgie ist eine Remission mit normwertigem HbA1c ohne Medikation möglich; die Erkrankung bleibt jedoch grundsätzlich chronisch und rezidiviert bei Rückkehr zum alten Lebensstil. Eine zu strenge Einstellung bei älteren, multimorbiden Patienten verschlechtert die Prognose durch Hypoglykämien.',
      pruefungsfallen: [
        'Die Diagnosekriterien werden mit ZAHLEN abgefragt: Nüchternglukose ≥ 126 mg/dl (7,0 mmol/l), HbA1c ≥ 6,5 % (48 mmol/mol), oGTT-2-h-Wert ≥ 200 mg/dl (11,1 mmol/l), Gelegenheitsglukose ≥ 200 mg/dl plus klassische Symptome. Ohne eindeutige Symptomatik ist eine Bestätigung an einem zweiten Tag erforderlich.',
        'Bei bereits eindeutig erhöhten Werten mit typischer Symptomatik ist der oGTT überflüssig und kontraindiziert — ihn dennoch zu nennen gilt als Fehler.',
        'Typ 1 und Typ 2 sauber gegenüberstellen (Alter, Gewicht, Verlaufsgeschwindigkeit, Ketoseneigung, C-Peptid, Autoantikörper, Therapie) — diese Frage kommt fast immer, auch wenn der Diabetes nur Nebendiagnose ist.',
        'Bei bekanntem Diabetes IMMER fragen, seit wann er besteht, wie er behandelt wird (Tabletten, Pen, Pumpe) und wie er kontrolliert wird (Selbstmessung, Sensor, HbA1c, Fußkontrollen) — mehrere Kandidaten haben genau dieses Versäumnis notiert bekommen.',
        'Mikro- und Makroangiopathie strikt trennen: Mikro = Retinopathie, Nephropathie, Polyneuropathie, diabetischer Fuß; Makro = KHK, pAVK, zerebrovaskuläre Erkrankung.',
        'Ketoazidose und hyperosmolares hyperglykämisches Syndrom nicht verwechseln: Ketoazidose typischerweise beim Typ 1 mit Azetongeruch, Kussmaul-Atmung und Pseudoperitonitis; hyperosmolares Syndrom typischerweise beim Typ 2 mit extremer Hyperglykämie, Exsikkose und Bewusstseinsstörung, aber ohne relevante Ketose, da die Restinsulinsekretion die Lipolyse noch bremst.',
        'Metformin: Kontraindikationen und das Pausieren vor Kontrastmittelgabe aktiv nennen (Laktatazidose) — ein Dauerbrenner der Nachfrage.',
        'Beim Typ 2 wird die augenärztliche Untersuchung SOFORT bei Erstdiagnose veranlasst, beim Typ 1 erst fünf Jahre nach Manifestation — dieser Unterschied wird gerne geprüft.',
        'Eine verschwommene Sicht bei Erstdiagnose ist meist eine reversible osmotische Linsenquellung und nicht automatisch eine Retinopathie; trotzdem muss der Augenhintergrund untersucht werden.',
        'Der Diabetes wirkt wie eine Immunschwäche: rezidivierende Harnwegsinfekte, Hautinfektionen, Soor und auch eine Pneumonie sind Komplikationen der Hyperglykämie — bei jedem Infekt eines Diabetikers an eine Stoffwechseldekompensation denken (Insulinbedarf steigt).',
        'Vor dem Patienten Alltagssprache benutzen: „Zuckerkrankheit" statt Diabetes mellitus, „Blutzuckerlangzeitwert" statt HbA1c, „Netzhaut" statt Retina, „Nervenschädigung der Füße" statt Polyneuropathie, „Verkalkung der Gefäße" statt Makroangiopathie.',
        'Die diabetische Polyneuropathie NICHT mit NSAR behandeln — Mittel der Wahl sind Duloxetin, Pregabalin oder Gabapentin, kausal die Blutzuckereinstellung.',
        'SGLT2-Inhibitoren sind bei rezidivierenden Harnwegsinfekten und Genitalmykosen ungünstig; außerdem an die euglykäme Ketoazidose denken.',
        'Das HbA1c-Ziel ist nicht bei allen gleich: Bei alten, multimorbiden Patienten sind Hypoglykämien gefährlicher als ein moderat erhöhter Wert.',
        'Die Betazellfunktion ist bei Erstdiagnose bereits um etwa die Hälfte reduziert — deshalb ist der Typ-2-Diabetes keine „leichte" Erkrankung, die man nur beobachtet.',
        'Sekundäre Diabetesformen aktiv abfragen: frühere Pankreatitis (Typ 3c), Kortisontherapie (Steroiddiabetes), Cushing-Habitus, Hämochromatose („Bronzediabetes").',
      ],
      askedInExam: [
        {
          frage: 'Was ist Ihre Verdachtsdiagnose, und was spricht dafür?',
          antwort: 'Die Erstdiagnose eines Diabetes mellitus Typ 2 im Rahmen eines metabolischen Syndroms. Dafür sprechen die klassische osmotische Symptomatik mit Polyurie, Nykturie und Polydipsie, der Leistungsknick, der ungewollte Gewichtsverlust bei gutem Appetit, der generalisierte Pruritus, die rezidivierenden Harnwegsinfekte, die verzögerte Wundheilung und die passagere Sehstörung — bei Adipositas, arterieller Hypertonie, Hyperlipidämie und positiver Familienanamnese.',
        },
        {
          frage: 'Was ist der Unterschied zwischen Diabetes mellitus Typ 1 und Typ 2?',
          antwort: 'Der Typ 1 beruht auf einer autoimmunen Zerstörung der Betazellen mit absolutem Insulinmangel: junge, meist schlanke Patienten, rascher Beginn über Wochen, deutlicher Gewichtsverlust, Ketoseneigung, positive Autoantikörper, niedriges C-Peptid, von Anfang an Insulintherapie. Der Typ 2 beruht auf einer Insulinresistenz mit relativem Insulinmangel: meist ältere, übergewichtige Patienten, schleichender Verlauf über Jahre, oft Zufallsbefund, C-Peptid normal bis erhöht, Therapie zunächst mit Lebensstiländerung und oralen Antidiabetika.',
        },
        {
          frage: 'Wie lauten die diagnostischen Kriterien des Diabetes mellitus?',
          antwort: 'Nüchternplasmaglukose ≥ 126 mg/dl beziehungsweise 7,0 mmol/l; HbA1c ≥ 6,5 % beziehungsweise 48 mmol/mol; 2-Stunden-Wert im oGTT ≥ 200 mg/dl beziehungsweise 11,1 mmol/l; oder eine Gelegenheitsglukose ≥ 200 mg/dl zusammen mit klassischen Symptomen. Ein pathologischer Wert muss an einem zweiten Tag bestätigt werden, außer bei eindeutiger Symptomatik oder zwei gleichzeitig pathologischen Parametern.',
        },
        {
          frage: 'Was ist ein Prädiabetes, und wie behandeln Sie ihn?',
          antwort: 'Prädiabetes bedeutet eine abnorme Nüchternglukose von 100 bis 125 mg/dl, eine gestörte Glukosetoleranz mit einem oGTT-2-Stunden-Wert von 140 bis 199 mg/dl oder ein HbA1c von 5,7 bis 6,4 %. Behandelt wird primär nicht medikamentös: Gewichtsreduktion um 5 bis 10 %, Ernährungsumstellung, mindestens 150 Minuten Bewegung pro Woche, Nikotinkarenz und jährliche Kontrolle. Damit lässt sich die Progression zum manifesten Diabetes etwa halbieren. Metformin nur ausnahmsweise bei jungen Hochrisikopatienten oder nach Gestationsdiabetes.',
        },
        {
          frage: 'Warum sind das C-Peptid und der Urinstatus wichtig?',
          antwort: 'Das C-Peptid wird äquimolar mit dem Insulin aus dem Proinsulin abgespalten, unterliegt aber keinem hepatischen First-Pass-Effekt und ist deshalb ein zuverlässiges Maß der körpereigenen Insulinproduktion — auch unter exogener Insulintherapie. Beim Typ 2 ist es normal bis erhöht, beim Typ 1 erniedrigt. Der Urinstatus zeigt die Glukosurie oberhalb der Nierenschwelle von etwa 180 mg/dl, vor allem aber Ketonkörper als Warnzeichen einer Entgleisung sowie Leukozyten und Nitrit bei Harnwegsinfekt; ergänzend bestimmt man den Albumin-Kreatinin-Quotienten zur Erfassung einer beginnenden Nephropathie.',
        },
        {
          frage: 'Ist das HbA1c wichtig? Warum?',
          antwort: 'Ja, es ist der wichtigste Verlaufs- und Prognoseparameter: Glukose bindet nichtenzymatisch an das Hämoglobin, sodass das HbA1c die mittlere Blutzuckerlage der letzten acht bis zwölf Wochen abbildet. Ein hoher Wert bedeutet ein hohes Risiko für mikro- und makrovaskuläre Folgeschäden und für Infektionen — beispielsweise ist eine Pneumonie beim Diabetiker durch die eingeschränkte Immunabwehr eine typische Komplikation. Nicht verwertbar ist das HbA1c bei Anämie, Hämolyse, Hämoglobinopathien, nach Transfusion und bei fortgeschrittener Niereninsuffizienz.',
        },
        {
          frage: 'Welche akuten und welche chronischen Komplikationen kennen Sie?',
          antwort: 'Akut: die diabetische Ketoazidose, das hyperosmolare hyperglykämische Syndrom und die Hypoglykämie unter Therapie. Chronisch die Mikroangiopathie mit Retinopathie, Nephropathie, Polyneuropathie und diabetischem Fußsyndrom sowie die Makroangiopathie mit koronarer Herzkrankheit, peripherer arterieller Verschlusskrankheit und Schlaganfall. Hinzu kommen die erhöhte Infektanfälligkeit, die nichtalkoholische Fettleber, die erektile Dysfunktion und ein erhöhtes Demenzrisiko.',
        },
        {
          frage: 'Wie unterscheiden sich Ketoazidose und hyperosmolares Syndrom?',
          antwort: 'Die Ketoazidose tritt typischerweise beim Typ 1 auf: absoluter Insulinmangel führt zu ungebremster Lipolyse mit Ketonkörperbildung, der Blutzucker liegt meist zwischen 300 und 600 mg/dl, es bestehen metabolische Azidose, Kussmaul-Atmung, Azetongeruch, Übelkeit und Pseudoperitonitis diabetica. Das hyperosmolare hyperglykämische Syndrom tritt typischerweise beim Typ 2 auf: Die Restinsulinsekretion bremst die Lipolyse, daher fehlt die Ketose weitgehend; im Vordergrund stehen extreme Hyperglykämie über 600 mg/dl, hohe Serumosmolalität, massive Exsikkose und Bewusstseinsstörung. Beide werden mit vorsichtiger Volumensubstitution, niedrig dosiertem Insulin und Kaliumsubstitution unter engmaschiger Kontrolle behandelt.',
        },
        {
          frage: 'Warum hat ein Diabetiker gehäuft Infektionen?',
          antwort: 'Die Hyperglykämie beeinträchtigt Chemotaxis, Phagozytose und intrazelluläre Abtötung der Granulozyten und schwächt die zelluläre Immunantwort; zugleich bietet die Glukosurie in den Harnwegen und die zuckerreiche Gewebeflüssigkeit einen idealen Nährboden für Bakterien und Pilze. Hinzu kommen Mikroangiopathie mit schlechterer Gewebeperfusion und die Polyneuropathie mit unbemerkten Verletzungen. Umgekehrt lässt jeder Infekt den Insulinbedarf steigen und kann den Diabetes dekompensieren lassen.',
        },
        {
          frage: 'Wie diagnostizieren und behandeln Sie eine diabetische Polyneuropathie?',
          antwort: 'Diagnostisch anamnestisch symmetrische, strumpfförmige, nachts betonte Missempfindungen, Brennen und Taubheit; klinisch Prüfung mit dem 10-g-Monofilament, der Stimmgabel nach Rydel-Seiffer, Temperatur- und Schmerzempfinden sowie Achillessehnenreflex, ergänzend Elektroneurographie und Ausschluss anderer Ursachen wie Alkohol, Vitamin-B12-Mangel, Hypothyreose oder Urämie. Therapeutisch kausal die optimale Blutzuckereinstellung, Alkohol- und Nikotinkarenz sowie Fußpflege; symptomatisch Duloxetin, Pregabalin oder Gabapentin, alternativ trizyklische Antidepressiva oder topisch Capsaicin — nicht mit NSAR.',
        },
        {
          frage: 'Welche Screeninguntersuchungen gehören bei Erstdiagnose dazu?',
          antwort: 'Augenhintergrund in Mydriasis beim Augenarzt — beim Typ 2 sofort bei Erstdiagnose —, Albumin-Kreatinin-Quotient und eGFR, kompletter Fußstatus mit Monofilament, Stimmgabel, Reflexen und Fußpulsen einschließlich Knöchel-Arm-Index, Lipidstatus, Blutdruckmessung und Ruhe-EKG sowie Gewicht, BMI und Taillenumfang. Danach jährliche Wiederholung, bei pathologischem Befund häufiger.',
        },
        {
          frage: 'Wie sieht die Therapie aus? Erklären Sie die Stufen.',
          antwort: 'Erstens die Basistherapie: strukturierte Schulung, Ernährungsumstellung, Gewichtsreduktion um 5 bis 10 %, mindestens 150 Minuten Bewegung pro Woche, Nikotin- und Alkoholkarenz. Zweitens die medikamentöse Stufentherapie: Metformin als erste Wahl, nach drei bis sechs Monaten Erweiterung um einen SGLT2-Inhibitor oder ein GLP-1-Analogon je nach kardiorenalem Risiko, später Insulin. Drittens die Behandlung der Begleitrisiken und die Vorsorge: Blutdruckziel um 130/80 mmHg mit einem ACE-Hemmer, Statin mit LDL-Zielwert nach Risikokategorie, Impfungen und das jährliche Screeningprogramm.',
        },
        {
          frage: 'Warum ist die Schulung wichtig und notwendig?',
          antwort: 'Weil der Diabetes eine lebenslange Erkrankung ist, die der Patient im Alltag selbst steuert — der Arzt sieht ihn nur wenige Stunden im Jahr. Der Patient muss Werte einordnen, Kohlenhydrate abschätzen, Unterzuckerungen erkennen und behandeln, seine Füße täglich kontrollieren und wissen, wie er sich bei Krankheit, auf Reisen und im Straßenverkehr verhält. Schulung verbessert nachweislich die Stoffwechseleinstellung und die Adhärenz und senkt Komplikationen und Krankenhausaufenthalte.',
        },
        {
          frage: 'Welche Nebenwirkungen und Kontraindikationen hat Metformin?',
          antwort: 'Nebenwirkungen sind vor allem gastrointestinal — Übelkeit, Diarrhoe, metallischer Geschmack —, langfristig ein Vitamin-B12-Mangel; gefürchtet, aber selten ist die Laktatazidose. Kontraindiziert ist Metformin bei einer eGFR unter 30 ml/min, schwerer Leberinsuffizienz, dekompensierter Herzinsuffizienz, respiratorischer Insuffizienz und Alkoholabusus. Es wird um eine Kontrastmittelgabe herum sowie bei akuten Erkrankungen mit Exsikkose, Hypoxie oder Sepsis pausiert.',
        },
        {
          frage: 'Der Patient sagt, seine Mutter nehme Tabletten — kann er die auch nehmen? Und wenn er nicht spritzen will?',
          antwort: 'Beim Typ-2-Diabetes beginnt man tatsächlich mit Tabletten, weil noch eigenes Insulin gebildet wird; Insulin wird erst nötig, wenn Lebensstil und Tabletten nicht mehr ausreichen. Beim Typ-1-Diabetes ist Insulin dagegen von Anfang an unverzichtbar, weil die Bauchspeicheldrüse kein Insulin mehr herstellt — hier gibt es keine Tablettenalternative. Als einzige experimentelle Alternativen zur Injektion existieren die Pankreas- oder Inselzelltransplantation, die aber eine lebenslange Immunsuppression erfordern und speziellen Indikationen vorbehalten sind.',
        },
        {
          frage: 'Welche Rolle spielt der Diabetes, wenn er nur Nebendiagnose ist — etwa bei einer Pneumonie oder einem Abszess?',
          antwort: 'Eine doppelte: Der Diabetes ist erstens ein Risikofaktor für die Infektion selbst, weil die Hyperglykämie die Immunabwehr schwächt und die Wundheilung stört, und zweitens wird er durch den Infekt dekompensiert, da Stresshormone den Insulinbedarf erhöhen. Deshalb gehören bei jedem infizierten Diabetiker engmaschige Blutzuckerkontrollen, häufig eine passagere Insulintherapie, die Bestimmung des HbA1c und die Suche nach Folgeschäden zum Vorgehen.',
        },
        {
          frage: 'Warum ist die Blutzuckersenkung allein nicht ausreichend?',
          antwort: 'Weil die alleinige Blutzuckersenkung vor allem die Mikroangiopathie verhindert, die Patienten aber überwiegend an der Makroangiopathie versterben. Erst die gleichzeitige Behandlung von Blutdruck, Lipiden, Gewicht und Nikotin senkt die kardiovaskuläre Ereignisrate deutlich — die Steno-2-Studie zeigte für dieses multifaktorielle Vorgehen etwa eine Halbierung der Ereignisse.',
        },
      ],
      merksatz: 'Polyurie, Polydipsie und Müdigkeit beim übergewichtigen Patienten mittleren Alters — aber viel häufiger ist der Zufallsbefund: einmal Zucker messen kostet nichts. Diagnose mit Zahlen (Nüchtern ≥ 126, HbA1c ≥ 6,5 %, oGTT ≥ 200, Gelegenheit ≥ 200 plus Symptome), bei Erstdiagnose SOFORT Augen, Nieren und Füße screenen, und behandelt wird nicht der Zucker allein, sondern Lebensstil, Zucker, Blutdruck, Lipide und Nikotin gemeinsam.',
      linkedCaseIds: [
        'case-diabetes',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-sonographie',
      ],
    },
    {
      id: 'fw-hyperthyreose',
      pathology: 'Hyperthyreose (Morbus Basedow)',
      specialty: 'Endokrinologie',
      definition: 'Die Hyperthyreose ist eine Überfunktion der Schilddrüse mit einem Überangebot der Schilddrüsenhormone Trijodthyronin (T3) und Thyroxin (T4) im Organismus und daraus folgender Steigerung des Grundumsatzes sowie einer erhöhten Ansprechbarkeit auf Katecholamine. Laborchemisch unterscheidet man die latente (subklinische) Hyperthyreose mit supprimiertem basalem TSH bei noch normalen freien Hormonen von der manifesten Hyperthyreose mit supprimiertem TSH und erhöhtem fT3 und/oder fT4. Der Morbus Basedow (Graves\' disease) ist die häufigste Ursache im Jodmangelgebiet bei jüngeren Patienten: eine Autoimmunerkrankung, bei der stimulierende Autoantikörper gegen den TSH-Rezeptor (TRAK) die Schilddrüse dauerhaft aktivieren. Klassisch ist die Merseburger Trias aus Struma, Tachykardie und Exophthalmus; die endokrine Orbitopathie ist eine eigenständige, extrathyreoidale Manifestation derselben Autoimmunreaktion gegen gemeinsame Antigene des retrobulbären Bindegewebes. Als Thyreotoxikose bezeichnet man das klinische Vollbild der Hormonüberflutung, als thyreotoxische Krise deren lebensbedrohliche Entgleisung.',
      aetiologie: 'Häufigste Ursachen sind der Morbus Basedow (etwa 60–70 % der Hyperthyreosen bei jüngeren Patienten; Gipfel zwischen dem 20. und 50. Lebensjahr, Frauen etwa fünfmal häufiger betroffen) und die funktionelle Schilddrüsenautonomie (unifokal als \'heißer Knoten\', multifokal oder disseminiert; typisch für ältere Patienten in Jodmangelgebieten). Beim Morbus Basedow binden agonistisch wirkende IgG-Autoantikörper (TRAK) an den TSH-Rezeptor der Thyreozyten und stimulieren TSH-unabhängig Hormonsynthese und Wachstum; genetische Disposition (HLA-DR3, CTLA-4, PTPN22) und Trigger wie Rauchen, psychischer Stress, Infekte, Jodexposition und die postpartale Phase spielen zusammen. Bei der Autonomie führen aktivierende Mutationen des TSH-Rezeptor-Gens zu einer regulationsunabhängigen Hormonproduktion, die durch Jodzufuhr dekompensieren kann. Seltenere Ursachen sind die Destruktionshyperthyreose bei Thyreoiditis (de Quervain, Hashimoto-Initialphase = Hashitoxikose, Postpartum-Thyreoiditis), die jodinduzierte Hyperthyreose (Kontrastmittel, Amiodaron), die iatrogene und die artifizielle Hyperthyreose (Thyreotoxicosis factitia bei Einnahme von Schilddrüsenhormonen, etwa zum Abnehmen), sehr selten ein TSH-produzierendes Hypophysenadenom (sekundäre Hyperthyreose mit erhöhtem TSH), ein metastasiertes follikuläres Schilddrüsenkarzinom, eine Struma ovarii oder eine Schwangerschaftsthyreotoxikose durch die TSH-ähnliche Wirkung des hCG.',
      risikofaktoren: [
        'Weibliches Geschlecht (Frauen etwa fünfmal häufiger betroffen)',
        'Alter zwischen 20 und 50 Jahren beim Morbus Basedow; höheres Lebensalter bei der funktionellen Autonomie',
        'Positive Familienanamnese für Schilddrüsen- oder andere Autoimmunerkrankungen (genetische Disposition, HLA-DR3, CTLA-4, PTPN22)',
        'Andere Autoimmunerkrankungen des Patienten: Diabetes mellitus Typ 1, Zöliakie, Vitiligo, perniziöse Anämie, Morbus Addison, rheumatoide Arthritis (polyglanduläres Autoimmunsyndrom)',
        'RAUCHEN — erhöht die Erkrankungswahrscheinlichkeit und ist der stärkste Risikofaktor für Auftreten und Schweregrad der endokrinen Orbitopathie',
        'Jodexposition: jodhaltige Röntgenkontrastmittel, Amiodaron, jodhaltige Desinfektionsmittel und hochdosierte Jodpräparate (insbesondere bei vorbestehender Autonomie)',
        'Leben in einem Jodmangelgebiet mit Strumaprävalenz (Süddeutschland) — begünstigt die Knotenstruma und die Autonomie',
        'Postpartale Phase (erste 6–12 Monate nach Entbindung) und starke psychische Belastung oder Stress als Auslöser',
        'Vorangegangene virale Infekte (Thyreoiditis de Quervain)',
        'Interferon- und Lithiumtherapie, Checkpoint-Inhibitoren (immunvermittelte Thyreoiditis)',
      ],
      klinik: [
        {
          text: 'Herzrasen, Palpitationen, Tachykardie in Ruhe und erhöhte Blutdruckamplitude durch die gesteigerte Katecholaminsensibilität',
        },
        {
          text: 'Nervosität, innere Unruhe, Reizbarkeit, Konzentrationsstörung und Stimmungslabilität',
        },
        {
          text: 'Feinschlägiger Tremor der vorgehaltenen Hände',
        },
        {
          text: 'Wärmeintoleranz, Hyperhidrose, warme und feuchte Haut, subfebrile Temperaturen',
        },
        {
          text: 'Gewichtsverlust TROTZ gutem oder gesteigertem Appetit (Polyphagie) — das pathognomonische Missverhältnis',
        },
        {
          text: 'Häufigerer, breiiger Stuhlgang bis zur Diarrhoe durch die beschleunigte Darmpassage',
        },
        {
          text: 'Ein- und Durchschlafstörung, Erschöpfung trotz innerer Getriebenheit',
        },
        {
          text: 'Proximal betonte Muskelschwäche (Schwierigkeiten beim Treppensteigen und beim Aufstehen aus der Hocke), gesteigerte Muskeleigenreflexe, thyreogene Myopathie',
        },
        {
          text: 'Struma diffusa mit Engegefühl am Hals; bei ausgeprägter Hypervaskularisation ein auskultierbares Schwirren über der Drüse',
        },
        {
          text: 'Endokrine Orbitopathie — NUR beim Morbus Basedow: Exophthalmus, Lidretraktion (Dalrymple-Zeichen), Zurückbleiben des Oberlids beim Blick nach unten (Graefe-Zeichen), seltener Lidschlag (Stellwag-Zeichen), Konvergenzschwäche (Möbius-Zeichen), Fremdkörper- und Druckgefühl, Tränenfluss, Photophobie, Doppelbilder',
        },
        {
          text: 'Zyklusstörungen bis zur Amenorrhoe bei Frauen, Libidoverlust und erektile Dysfunktion bei Männern, verminderte Fertilität',
        },
        {
          text: 'Haarausfall, feine brüchige Nägel (Onycholyse), warme rosige Haut',
        },
        {
          text: 'Sinkender Insulinbedarf mit Hypoglykämieneigung oder umgekehrt Entgleisung eines vorbestehenden Diabetes mellitus; erniedrigte Cholesterinwerte',
          atypisch: true,
        },
        {
          text: 'Prätibiales Myxödem (derbe, nicht eindrückbare Schwellung über der Tibia) und Akropachie — seltene, aber für den Morbus Basedow spezifische Manifestationen',
          atypisch: true,
        },
        {
          text: 'Tachykardes Vorhofflimmern als Erstmanifestation, besonders bei älteren Patienten — bei jedem neu aufgetretenen Vorhofflimmern muss das TSH bestimmt werden',
          atypisch: true,
        },
        {
          text: 'Apathische (oligosymptomatische) Hyperthyreose des alten Menschen: Adynamie, Depression, Gewichtsverlust und Herzinsuffizienz ohne die typische Hyperaktivität — leicht als Malignom oder Depression fehlgedeutet',
          atypisch: true,
        },
        {
          text: 'Thyreotoxische periodische hypokaliämische Paralyse mit anfallsartigen Lähmungen, vor allem bei asiatischen Männern',
          atypisch: true,
        },
        {
          text: 'Osteoporose mit pathologischen Frakturen bei langjähriger latenter Hyperthyreose',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'Einteilung nach dem Schweregrad der Funktionsstörung',
          inhalt: 'Latente (subklinische) Hyperthyreose: TSH supprimiert, fT3 und fT4 normal — häufig asymptomatisch, aber bereits mit erhöhtem Risiko für Vorhofflimmern und Osteoporose. Manifeste Hyperthyreose: TSH supprimiert, fT3 und/oder fT4 erhöht. Sonderformen: T3-Hyperthyreose (nur fT3 erhöht, typisch für die Autonomie) und sekundäre Hyperthyreose bei TSH-produzierendem Hypophysenadenom (TSH nicht supprimiert, sondern normal oder erhöht bei erhöhten freien Hormonen).',
        },
        {
          name: 'Ätiologische Einteilung',
          inhalt: 'Immunhyperthyreose Typ Morbus Basedow (TRAK positiv, diffuse Struma, endokrine Orbitopathie, diffus erhöhter Uptake). Funktionelle Autonomie: unifokal (heißer Knoten, Plummer-Adenom), multifokal oder disseminiert (TRAK negativ, keine Orbitopathie, fokale Mehrspeicherung). Destruktionshyperthyreose bei Thyreoiditis (de Quervain, Hashitoxikose, Postpartum-Thyreoiditis; verminderter Uptake). Exogen/iatrogen: jodinduziert (Kontrastmittel, Amiodaron Typ I und II), Thyreotoxicosis factitia, Überdosierung von L-Thyroxin. Seltene Ursachen: TSHom, Struma ovarii, hCG-vermittelt, metastasiertes follikuläres Karzinom.',
        },
        {
          name: 'Merseburger Trias (Morbus Basedow)',
          inhalt: 'Struma + Tachykardie + Exophthalmus. Benannt nach Carl Adolph von Basedow, der 1840 in Merseburg wirkte. Die vollständige Trias findet sich nur bei etwa der Hälfte der Patienten; ihr Fehlen schließt einen Morbus Basedow keineswegs aus.',
        },
        {
          name: 'Endokrine Orbitopathie — Werner-Klassifikation (NOSPECS) und EUGOGO',
          inhalt: 'NOSPECS-Stadien nach Werner: 0 = No signs; 1 = Only signs (Lidretraktion); 2 = Soft tissue involvement (Bindegewebsbeteiligung, Chemosis); 3 = Proptosis (Exophthalmus); 4 = Extraocular muscle involvement (Motilitätsstörung, Doppelbilder); 5 = Corneal involvement (Hornhautbeteiligung, Keratitis e lagophthalmo); 6 = Sight loss (Optikuskompression mit Visusverlust). EUGOGO teilt nach Aktivität (Clinical Activity Score, CAS ab 3/7 aktiv) und Schweregrad (mild, moderat bis schwer, visusbedrohend) ein — daraus leitet sich die Therapieentscheidung ab.',
        },
        {
          name: 'WHO-Klassifikation der Struma',
          inhalt: 'Grad 0: keine Struma tastbar oder sichtbar. Grad I: tastbar, bei normaler Kopfhaltung nicht sichtbar (Ia nur tastbar, Ib bei Reklination sichtbar). Grad II: bei normaler Kopfhaltung sichtbar. Grad III: sehr große Struma mit lokalen Komplikationen wie Stridor, oberer Einflussstauung oder Schluckstörung. Normvolumen sonographisch: Frauen bis 18 ml, Männer bis 25 ml.',
        },
        {
          name: 'Thyreotoxische Krise — Stadien nach Herrmann und Burch-Wartofsky-Score',
          inhalt: 'Stadium I: Tachykardie über 150/min, Fieber, Erbrechen, Diarrhoe, Exsikkose, Adynamie, Tremor, Unruhe. Stadium II: zusätzlich Bewusstseinsstörung, Desorientiertheit, Somnolenz, Psychose. Stadium III: Koma, Kreislaufversagen, Nebenniereninsuffizienz. Der Burch-Wartofsky-Score quantifiziert Temperatur, ZNS-, gastrointestinale und kardiovaskuläre Symptome (ab 45 Punkten Krise wahrscheinlich).',
        },
      ],
      redFlags: [
        'Fieber über 38,5 °C mit Tachykardie über 150/min, Erbrechen, Exsikkose und Agitation oder Bewusstseinstrübung → thyreotoxische Krise, sofortige intensivmedizinische Behandlung (Letalität 20–30 %)',
        'Neu aufgetretenes tachykardes Vorhofflimmern, insbesondere beim älteren Patienten → TSH bestimmen, Thromboembolie- und Dekompensationsrisiko',
        'Zeichen der kardialen Dekompensation: Ruhedyspnoe, Orthopnoe, Beinödeme, Angina pectoris → thyreotoxische Kardiomyopathie',
        'Rasche Visusverschlechterung, Farbsinnstörung, Papillenödem oder inkompletter Lidschluss mit Hornhautulkus → visusbedrohende endokrine Orbitopathie, sofortige augenärztliche Vorstellung und Steroidstoßtherapie',
        'Fieber, Halsschmerzen oder Aphthen unter laufender Thiamazol-Therapie → Verdacht auf Agranulozytose, sofortiges Absetzen und Notfall-Blutbild',
        'Inspiratorischer Stridor, Schluckstörung, obere Einflussstauung oder Heiserkeit → mechanische Komplikation einer großen bzw. retrosternalen Struma, Malignitätsverdacht bei neu aufgetretener Rekurrensparese',
        'Rasch wachsender, derber, nicht schluckverschieblicher Knoten mit zervikaler Lymphadenopathie → Verdacht auf Schilddrüsenkarzinom',
        'Geplante jodhaltige Kontrastmitteluntersuchung bei bekannter oder vermuteter Hyperthyreose → Gefahr der Auslösung einer thyreotoxischen Krise, vorher TSH bestimmen und Prophylaxe erwägen',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Leitsymptome gezielt erfragen: Gewichtsverlust bei gutem oder gesteigertem Appetit, Palpitationen, Tremor, Nervosität, Wärmeintoleranz und Schwitzen, Diarrhoe, Schlafstörung, Muskelschwäche, Zyklusstörungen, Haarausfall; ergänzend Halsengegefühl, Schluckbeschwerden, Heiserkeit und Augenbeschwerden',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Ätiologisch entscheidende Anamnese: Jodexposition (Kontrastmittel, Amiodaron, Jodpräparate), Einnahme von Schilddrüsenhormonen oder Abnehmpräparaten, vorangegangener viraler Infekt mit schmerzhafter Schilddrüse, Entbindung in den letzten Monaten, Familienanamnese für Schilddrüsen- und Autoimmunerkrankungen, Nikotinkonsum',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Vitalparameter mit Puls und Rhythmus, Blutdruck (erhöhte Amplitude), Temperatur; Bestimmung von Größe, Gewicht, BMI und Gewichtsverlauf',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Inspektion, Palpation und Auskultation der Schilddrüse: Palpation von hinten mit beiden Händen, wobei der Patient während der Untersuchung SCHLUCKEN muss; beurteilt werden Größe (WHO-Grad), Konsistenz, Oberfläche, Knoten, Schluckverschieblichkeit, Druckschmerz und ein Schwirren als Zeichen der Hypervaskularisation; zusätzlich Palpation der zervikalen Lymphknoten',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Augenstatus: Exophthalmus (Hertel-Exophthalmometrie), Dalrymple-, Graefe-, Stellwag- und Möbius-Zeichen, Lidschluss, Bulbusmotilität, Doppelbilder, Chemosis; Erhebung des Clinical Activity Score',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Weitere körperliche Untersuchung: Herzauskultation, Prüfung des feinschlägigen Fingertremors, gesteigerte Muskeleigenreflexe, warme feuchte Haut, proximale Muskelkraft, Prätibialregion (prätibiales Myxödem) und Finger (Akropachie)',
        },
        {
          stufe: 'Labor',
          text: 'Basales TSH als SCREENING-PARAMETER NUMMER 1 — bei jeder primären Hyperthyreose supprimiert; ein normales basales TSH schließt eine primäre Hyperthyreose praktisch aus',
        },
        {
          stufe: 'Labor',
          text: 'fT3 und fT4 zur Bestätigung und zur Abgrenzung der latenten (freie Hormone normal) von der manifesten Hyperthyreose; die isolierte fT3-Erhöhung (T3-Hyperthyreose) spricht für eine Autonomie',
        },
        {
          stufe: 'Labor',
          text: 'TRAK (TSH-Rezeptor-Autoantikörper): bei über 90 % der Basedow-Patienten positiv und damit praktisch beweisend; hohe Titer sprechen für ein Rezidivrisiko und sind in der Schwangerschaft für die Beurteilung des fetalen Risikos entscheidend',
        },
        {
          stufe: 'Labor',
          text: 'TPO-Antikörper (bei Basedow in etwa 70 % positiv, hochtitrig bei Hashimoto) und Thyreoglobulin-Antikörper; Thyreoglobulin selbst ist bei der Thyreotoxicosis factitia erniedrigt',
        },
        {
          stufe: 'Labor',
          text: 'Ausgangs- und Sicherheitslabor vor Thyreostatika: Blutbild mit Differenzialblutbild (Leukozyten wegen der Agranulozytose), Transaminasen, γ-GT und alkalische Phosphatase, Kreatinin und Elektrolyte einschließlich Kalzium',
        },
        {
          stufe: 'Labor',
          text: 'Begleitparameter: BSG und CRP (stark erhöht bei Thyreoiditis de Quervain), Blutzucker und HbA1c, Lipidstatus (Cholesterin bei Hyperthyreose typischerweise erniedrigt), bei Frauen im gebärfähigen Alter ein Schwangerschaftstest vor Szintigraphie und Radiojodtherapie',
        },
        {
          stufe: 'Labor',
          text: 'Differenzialdiagnostisches Zusatzlabor bei unklarem Befund: 5-Hydroxyindolessigsäure im 24-Stunden-Urin und Chromogranin A (Karzinoid/NET), Metanephrine in Plasma oder 24-Stunden-Urin (Phäochromozytom), Transglutaminase-Antikörper (Zöliakie), Kalium (thyreotoxische Paralyse)',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Sonographie der Schilddrüse mit Volumetrie: beim Morbus Basedow diffus vergrößerte, echoarme, inhomogene Drüse; in der Farbduplexsonographie exzessiv gesteigerte Perfusion — das \'vaskuläre Inferno\'. Knoten werden nach Größe, Echogenität, Randkontur, Mikroverkalkungen, Höhenbetonung und Perfusion beurteilt (Malignitätskriterien)',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Schilddrüsenszintigraphie mit Technetium-99m-Pertechnetat und Bestimmung des TcTU: beim Morbus Basedow diffus homogen erhöhter Uptake; fokale Mehrspeicherung mit Suppression des umgebenden Gewebes bei der Autonomie (heißer Knoten); verminderter Uptake bei Destruktionsthyreoiditis, jodinduzierter und artifizieller Hyperthyreose. Die Szintigraphie erfolgt bei Knoten IMMER VOR einer Feinnadelpunktion',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: '12-Kanal-EKG (Sinustachykardie, Vorhofflimmern, Ischämiezeichen), bei Bedarf Langzeit-EKG und Echokardiographie zur Beurteilung der Pumpfunktion und des pulmonalen Drucks',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Bei mittelschwerer bis schwerer endokriner Orbitopathie MRT (bevorzugt) oder CT der Orbitae: Verdickung der geraden Augenmuskeln unter Aussparung der Sehnenansätze, Vermehrung des Orbitafetts, Beurteilung einer Optikuskompression an der Orbitaspitze',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Bei großer oder retrosternaler Struma Röntgen-Thorax bzw. CT des Halses (jodfreies Protokoll!) und Lungenfunktionsprüfung mit Fluss-Volumen-Kurve zur Beurteilung einer Trachealkompression; Osteodensitometrie bei langjähriger Hyperthyreose',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Sonographisch gesteuerte Feinnadelpunktion mit Zytologie nur bei szintigraphisch KALTEM und sonographisch suspektem Knoten; ein heißer Knoten ist praktisch nie maligne und wird nicht punktiert',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'HNO-ärztliche Laryngoskopie zur präoperativen Dokumentation der Stimmbandfunktion vor jeder Thyreoidektomie und bei Heiserkeit',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Fachärztliche Mitbeurteilung durch Endokrinologie, Nuklearmedizin und Ophthalmologie; bei Verdacht auf ein TSH-produzierendes Hypophysenadenom MRT der Sella und TRH-Test',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Funktionelle Schilddrüsenautonomie (unifokal, multifokal, disseminiert)',
          unterscheidung: 'Ältere Patienten aus Jodmangelgebieten, oft nach Jodexposition; KEINE endokrine Orbitopathie, TRAK negativ, knotige Struma in der Sonographie, szintigraphisch fokal vermehrte Speicherung mit Suppression des übrigen Gewebes. Häufig als T3-Hyperthyreose.',
        },
        {
          dd: 'Thyreoiditis de Quervain (subakute granulomatöse Thyreoiditis)',
          unterscheidung: 'Schmerzhafte, druckdolente Schilddrüse nach viralem Infekt, ausgeprägtes Krankheitsgefühl, BSG stark beschleunigt bei nur mäßiger Leukozytose, szintigraphisch ERNIEDRIGTER Uptake; selbstlimitierend, Therapie mit NSAR oder Glukokortikoiden, keine Thyreostatika.',
        },
        {
          dd: 'Hashimoto-Thyreoiditis in der Initialphase (Hashitoxikose)',
          unterscheidung: 'Passagere Hyperthyreose durch Freisetzung präformierter Hormone aus zerstörten Follikeln; TPO-AK hochtitrig, TRAK meist negativ, echoarme Drüse ohne \'vaskuläres Inferno\', verminderter Uptake; Übergang in eine dauerhafte Hypothyreose.',
        },
        {
          dd: 'Jodinduzierte und amiodaroninduzierte Hyperthyreose',
          unterscheidung: 'Anamnese der Jodexposition (Kontrastmittel, Amiodaron, Desinfektionsmittel). Amiodaron Typ I entsteht auf dem Boden einer Autonomie (Perfusion erhalten, Therapie mit Thyreostatika und Perchlorat), Typ II ist eine Destruktionsthyreoiditis (Perfusion aufgehoben, Therapie mit Glukokortikoiden).',
        },
        {
          dd: 'Thyreotaxicosis factitia (artifizielle Hyperthyreose)',
          unterscheidung: 'Heimliche Einnahme von Schilddrüsenhormonen, häufig zur Gewichtsreduktion: keine Struma, kein Exophthalmus, Thyreoglobulin erniedrigt und szintigraphisch supprimierte Speicherung. Die Anamnese muss gezielt und wertfrei danach fragen.',
        },
        {
          dd: 'Karzinoid bzw. neuroendokriner Tumor (NET) mit Karzinoid-Syndrom',
          unterscheidung: 'Diarrhoe, Gewichtsverlust und Tachykardie wie bei der Hyperthyreose, jedoch mit anfallsartigem FLUSH, asthmoiden Beschwerden und rechtsseitiger Endokardfibrose (Hedinger-Syndrom); Nachweis über 5-Hydroxyindolessigsäure im 24-Stunden-Urin und Chromogranin A. Häufigste Lokalisation: Appendix, Ileum, Rektum, Bronchien.',
        },
        {
          dd: 'Phäochromozytom',
          unterscheidung: 'Paroxysmale Trias aus Kopfschmerz, Palpitationen und Schweißausbruch mit krisenhafter Hypertonie und Blässe statt Wärmeröte; Nachweis über Metanephrine in Plasma oder 24-Stunden-Urin, Lokalisation im CT/MRT und MIBG-Szintigraphie.',
        },
        {
          dd: 'Panikstörung, generalisierte Angststörung, Somatisierung',
          unterscheidung: 'Attacken mit Herzrasen, Zittern, Schwitzen und Todesangst, jedoch ohne Gewichtsverlust bei gesteigertem Appetit, ohne Wärmeintoleranz, ohne Diarrhoe und ohne Struma; TSH normal. Erst nach organischem Ausschluss zu diagnostizieren.',
        },
        {
          dd: 'Maligne Grunderkrankung mit B-Symptomatik (Lymphom, Kolon- oder Bronchialkarzinom)',
          unterscheidung: 'Ungewollter Gewichtsverlust und Nachtschweiß, jedoch typischerweise mit vermindertem Appetit, Anämie und Leistungsknick ohne adrenerge Hyperaktivität; bei negativem Schilddrüsenbefund und Risikoprofil ist eine Tumorsuche zwingend.',
        },
        {
          dd: 'Klimakterium und Wechseljahresbeschwerden',
          unterscheidung: 'Hitzewallungen, Schwitzen, Schlafstörung und Stimmungsschwankungen bei Frauen um das 50. Lebensjahr, jedoch ohne Gewichtsverlust (eher Gewichtszunahme), ohne Tachykardie in Ruhe, ohne Diarrhoe und mit normalem TSH; FSH erhöht.',
        },
        {
          dd: 'Diabetes mellitus mit Entgleisung bzw. Erstmanifestation',
          unterscheidung: 'Gewichtsverlust bei Polyurie, Polydipsie und Hyperglykämie; bei der Hyperthyreose sinkt der Insulinbedarf hingegen häufig. Die beiden Erkrankungen treten als Autoimmunerkrankungen jedoch gehäuft gemeinsam auf.',
        },
        {
          dd: 'Sekundäre Hyperthyreose bei TSH-produzierendem Hypophysenadenom (TSHom)',
          unterscheidung: 'Sehr selten: erhöhte freie Hormone bei normalem oder sogar erhöhtem TSH (fehlende Suppression); Nachweis im MRT der Sella, häufig mit weiteren hypophysären Störungen und Gesichtsfeldausfällen.',
        },
      ],
      therapie: [
        {
          label: 'Thyreostatische Erstlinientherapie mit symptomatischer Betablockade',
          items: [
            'Thiamazol als Mittel der ersten Wahl: Initialdosis 20–30 mg täglich (bei schwerer Hyperthyreose bis 40 mg), nach Erreichen der Euthyreose in etwa 4–6 Wochen Reduktion auf eine Erhaltungsdosis von 5–10 mg täglich; alternativ Carbimazol (Prodrug von Thiamazol)',
            'Propylthiouracil als Reservemittel wegen der Hepatotoxizität — indiziert im ersten Schwangerschaftstrimenon (geringeres Embryopathierisiko als Thiamazol) und in der thyreotoxischen Krise, da es zusätzlich die periphere Konversion von T4 zu T3 hemmt',
            'Wirkprinzip erklären können: Thionamide hemmen die Thyreoperoxidase und damit Jodination und Kopplung — der Wirkungseintritt ist deshalb verzögert, weil die gespeicherten Hormone zunächst noch freigesetzt werden',
            'Therapiedauer beim Morbus Basedow 12–18 Monate, anschließend Auslassversuch; etwa 50 % bleiben in Remission. Bei der funktionellen Autonomie ist die alleinige Thyreostatikatherapie NICHT kurativ und dient nur der Vorbereitung der definitiven Therapie',
            'symptomatische Betablockade zur raschen Linderung von Tachykardie, Tremor, Unruhe und Schwitzen: Propranolol 3 × 20–40 mg als nicht selektiver Betablocker mit zusätzlicher Hemmung der peripheren T4-T3-Konversion, alternativ Metoprolol oder Bisoprolol; CAVE bei Diabetes (Verschleierung der Hypoglykämiesymptome), Asthma bronchiale und AV-Block',
            'allgemeine Maßnahmen: körperliche Schonung, ausreichende Kalorien- und Flüssigkeitszufuhr in der katabolen Phase, passager ein Sedativum bei ausgeprägter Unruhe, konsequente Vermeidung hochdosierter Jodexposition (Kontrastmittel, Amiodaron); normales jodiertes Speisesalz ist erlaubt',
          ],
        },
        {
          label: 'Definitive Therapie bei Rezidiv, Therapieversagen oder großer Struma',
          items: [
            'Indikationen: Rezidiv nach Auslassversuch, fehlende Remission, Unverträglichkeit oder Nebenwirkung der Thyreostatika, funktionelle Autonomie, große Struma mit mechanischer Beeinträchtigung, Malignitätsverdacht, Kinderwunsch mit dem Ziel einer stabilen Stoffwechsellage',
            'Radiojodtherapie mit Jod-131 unter stationären Bedingungen (in Deutschland strahlenschutzrechtlich vorgeschrieben): Mittel der Wahl bei kleiner Struma, bei der Autonomie und bei erhöhtem Operationsrisiko; Voraussetzung ist eine weitgehende Euthyreose, die Thyreostatika werden vor der Applikation pausiert. Kontraindiziert in Schwangerschaft und Stillzeit, danach Kontrazeption für 6 Monate; bei aktiver endokriner Orbitopathie zurückhaltend bzw. unter Steroidprophylaxe, da sich diese verschlechtern kann. Erwünschte Folge ist meist eine bleibende Hypothyreose',
            'Thyreoidektomie (nahezu totale Resektion beim Morbus Basedow, Hemithyreoidektomie bei unifokaler Autonomie): indiziert bei großer oder retrosternaler Struma mit Kompression, bei Malignitätsverdacht, bei schwerer Orbitopathie und bei Kinderwunsch. Präoperativ muss zwingend eine Euthyreose erreicht sein, um eine thyreotoxische Krise zu vermeiden; präoperativ Laryngoskopie, intraoperativ Neuromonitoring des Nervus laryngeus recurrens',
            'typische Operationsrisiken, die aufgeklärt werden müssen: Rekurrensparese mit Heiserkeit (bei beidseitiger Parese Atemnot), postoperativer Hypoparathyreoidismus mit Hypokalzämie, Parästhesien und Tetanie (Chvostek- und Trousseau-Zeichen), Nachblutung mit Kompression der Atemwege, Wundinfektion und die dauerhafte Hypothyreose',
            'nach jeder definitiven Therapie lebenslange Substitution mit L-Thyroxin, etwa 1,5–2 µg/kg Körpergewicht, nüchtern 30 Minuten vor dem Frühstück eingenommen, Steuerung und Kontrolle über das TSH; nach Thyreoidektomie zusätzlich Kalzium- und Parathormonkontrolle',
          ],
        },
        {
          label: 'Begleitmaßnahmen, Sicherheitskontrollen und Verlauf',
          items: [
            'AGRANULOZYTOSE unter Thionamiden (etwa 0,3–0,6 %): Blutbild vor Therapiebeginn und in den ersten Wochen; der Patient muss ausdrücklich instruiert werden, bei Fieber, Halsschmerzen oder Aphthen das Medikament sofort abzusetzen und umgehend ein Blutbild kontrollieren zu lassen',
            'weitere Nebenwirkungen überwachen: Transaminasenanstieg und cholestatische Hepatopathie (unter Propylthiouracil auch fulminantes Leberversagen), allergisches Exanthem und Juckreiz, Arthralgien, Geschmacksstörung, ANCA-assoziierte Vaskulitis unter Propylthiouracil',
            'Verlaufskontrolle: In der Frühphase wird nach fT3 und fT4 gesteuert (alle 4 Wochen), da das TSH noch monatelang supprimiert bleibt und NICHT zur Steuerung taugt; später TSH-Kontrollen alle 3 Monate. Eine iatrogene Hypothyreose ist zu vermeiden, da sie eine Orbitopathie verschlechtern kann',
            'Management der endokrinen Orbitopathie: ophthalmologische Mitbetreuung mit Verlaufsdokumentation, künstliche Tränenflüssigkeit und Nachtsalbe, Schlafen mit erhöhtem Kopfteil, getönte Brille, Prismengläser bei Doppelbildern; Selen bei milder aktiver Form; bei moderat bis schwerer aktiver Form intravenöse Glukokortikoid-Stoßtherapie (Methylprednisolon), alternativ Tocilizumab, Rituximab oder Teprotumumab; Orbitabestrahlung und operative Dekompression bei visusbedrohendem Verlauf, rehabilitative Lid- und Schieloperationen erst im inaktiven Stadium',
            'STRIKTER RAUCHSTOPP als eigenständige Therapiemaßnahme: Rauchen vervielfacht Risiko und Schweregrad der endokrinen Orbitopathie, verschlechtert das Ansprechen auf Steroide und Radiojod und erhöht die Rezidivrate — strukturierte Raucherentwöhnung anbieten',
            'Besonderheiten bei Begleiterkrankungen: bei Diabetes mellitus engmaschige Blutzuckerkontrolle und ärztlich gesteuerte Insulinanpassung (der Bedarf steigt mit Erreichen der Euthyreose wieder an); Osteoporoseprophylaxe mit Kalzium und Vitamin D bei langbestehender Hyperthyreose; bei Vorhofflimmern Frequenzkontrolle und Prüfung der Antikoagulationsindikation',
            'Schwangerschaft und Kinderwunsch: Thiamazol im ersten Trimenon meiden (Aplasia cutis, Choanal- und Ösophagusatresie), niedrigstmögliche Dosis, TRAK-Bestimmung im dritten Trimenon wegen der diaplazentaren Übertragung und der Gefahr einer fetalen bzw. neonatalen Hyperthyreose',
            'Screening auf assoziierte Autoimmunerkrankungen (Zöliakie, Typ-1-Diabetes, Nebenniereninsuffizienz, perniziöse Anämie) und Aufklärung über den chronisch-rezidivierenden Charakter der Erkrankung',
          ],
        },
        {
          label: 'Notfall: thyreotoxische Krise',
          akut: true,
          items: [
            'Auslöser erkennen und beseitigen: Jodexposition (Kontrastmittel!), Infektion, Operation, Trauma, Absetzen der Thyreostatika, Entbindung; klinisch Fieber über 38,5 °C, Tachykardie über 150/min, Erbrechen und Exsikkose, Agitation bis Koma (Stadien I–III nach Herrmann, Burch-Wartofsky-Score)',
            'sofortige intensivmedizinische Überwachung: großlumige venöse Zugänge, Monitoring, Volumen- und Elektrolytsubstitution bis 3–4 Liter täglich, hochkalorische Ernährung, Thromboembolieprophylaxe, physikalische Fiebersenkung und Paracetamol — KEINE Salicylate, da sie Schilddrüsenhormone aus der Eiweißbindung verdrängen',
            'Thiamazol hochdosiert intravenös (z. B. 80 mg alle 8 Stunden) oder Propylthiouracil (zusätzliche Konversionshemmung); Glukokortikoide (Hydrocortison 100 mg alle 8 Stunden) zur Konversionshemmung und wegen der relativen Nebenniereninsuffizienz; Betablockade mit Propranolol unter Kreislaufmonitoring, alternativ Esmolol',
            'Natriumperchlorat zur Hemmung der Jodaufnahme, insbesondere bei jodinduzierter Krise; als Ultima Ratio Plasmapherese zur Hormonelimination und notfallmäßige Thyreoidektomie innerhalb von 48 Stunden',
            'begleitend Antibiotikatherapie bei infektiöser Auslösung, Behandlung der kardialen Dekompensation und des Vorhofflimmerns; die Letalität beträgt trotz maximaler Therapie 20–30 %',
          ],
        },
      ],
      prognose: 'Unter thyreostatischer Therapie werden die meisten Patienten innerhalb von 4–6 Wochen euthyreot und beschwerdefrei. Nach einem 12- bis 18-monatigen Therapiezyklus bleibt etwa die Hälfte der Basedow-Patienten dauerhaft in Remission; Rezidive treten überwiegend in den ersten zwei Jahren nach Absetzen auf. Ungünstige prognostische Faktoren für eine Remission sind hohe TRAK-Titer, eine große Struma, männliches Geschlecht, junges Alter, ausgeprägte Hyperthyreose bei Diagnosestellung und fortgesetztes Rauchen. Nach Radiojodtherapie oder Thyreoidektomie ist die Hyperthyreose definitiv beseitigt, um den Preis einer meist lebenslangen, gut substituierbaren Hypothyreose. Die funktionelle Autonomie heilt unter Thyreostatika nicht aus und benötigt regelhaft eine definitive Therapie. Die endokrine Orbitopathie verläuft unabhängig von der Schilddrüsenfunktion: Sie brennt nach 1–3 Jahren aus, bildet sich häufig nur teilweise zurück und ist beim Nichtraucher deutlich milder. Unbehandelt drohen Vorhofflimmern mit Thromboembolien, thyreotoxische Kardiomyopathie, Osteoporose und die thyreotoxische Krise mit einer Letalität von 20–30 %.',
      pruefungsfallen: [
        'Der Screening-Parameter ist das BASALE TSH — es muss zuerst genannt werden, danach erst fT3 und fT4. Ein normales TSH schließt eine primäre Hyperthyreose praktisch aus.',
        'In der Frühphase der Therapie darf NICHT nach dem TSH gesteuert werden: es bleibt Wochen bis Monate supprimiert. Gesteuert wird nach fT3 und fT4.',
        'Die endokrine Orbitopathie kommt nur beim Morbus Basedow vor, nicht bei der funktionellen Autonomie — sie ist damit ein klinisches Unterscheidungsmerkmal; beweisend sind aber die TRAK.',
        'Die Merseburger Trias (Struma, Tachykardie, Exophthalmus) ist nur bei etwa der Hälfte der Patienten vollständig; ihr Fehlen — insbesondere das Fehlen einer Struma — schließt einen Morbus Basedow NICHT aus.',
        'Reihenfolge bei einem Knoten: Labor, dann Sonographie, dann SZINTIGRAPHIE und erst danach die Punktion. Heißer Knoten = mehrspeichernd, praktisch nie maligne, wird nicht punktiert; kalter Knoten = nicht speichernd, malignitätsverdächtig, wird punktiert.',
        'Bei der Thyreoiditis de Quervain ist der Uptake im Szintigramm ERNIEDRIGT, obwohl eine Hyperthyreose besteht — Destruktions- statt Produktionshyperthyreose; behandelt wird mit NSAR oder Steroiden, nicht mit Thyreostatika.',
        'Die Agranulozytose unter Thiamazol muss aktiv genannt werden, samt Blutbildkontrolle und der Patientenanweisung, bei Fieber, Halsschmerzen oder Aphthen sofort abzusetzen.',
        'Jodiertes SPEISESALZ verursacht keinen Morbus Basedow und muss nicht gemieden werden; gefährlich sind hochdosierte Jodmengen (Kontrastmittel, Amiodaron, Jodpräparate), die eine Autonomie dekompensieren und eine thyreotoxische Krise auslösen können.',
        'Vor jeder jodhaltigen Kontrastmitteluntersuchung ist bei Verdacht auf Hyperthyreose das TSH zu bestimmen — ein klassischer, gefährlicher und gern geprüfter Fehler.',
        'Bei jedem neu aufgetretenen Vorhofflimmern gehört das TSH zur Basisdiagnostik.',
        'Betablocker verschleiern die Warnsymptome der Hypoglykämie — bei Diabetikern ansprechen; Propranolol ist bevorzugt, weil es zusätzlich die periphere T4-T3-Konversion hemmt.',
        'In der thyreotoxischen Krise dürfen keine Salicylate zur Fiebersenkung gegeben werden, weil sie Schilddrüsenhormone aus der Eiweißbindung verdrängen.',
        'Vor einer Thyreoidektomie muss der Patient euthyreot sein, sonst droht intra- oder postoperativ eine thyreotoxische Krise.',
        'Nicht \'Hyperthyreose\' und \'Hyperthyreoidismus\' mit \'Hyperparathyreoidismus\' verwechseln — und vor dem Patienten von \'Schilddrüsenüberfunktion\' sprechen, nicht von \'Hyperthyreose\'.',
      ],
      askedInExam: [
        {
          frage: 'Was ist Ihre Verdachtsdiagnose, und warum denken Sie an eine Hyperthyreose, wenn die Patientin gar keinen Kropf hat?',
          antwort: 'Verdacht auf eine manifeste Hyperthyreose, am ehesten Morbus Basedow. Eine Struma ist dafür nicht obligat: Tragend sind die Symptomkonstellation aus Tachykardie, Gewichtsverlust trotz gutem Appetit, Hyperhidrose mit Wärmeintoleranz, Tremor, innerer Unruhe und Diarrhoe sowie die Augenbeschwerden und die Familienanamnese. Gesichert wird die Diagnose laborchemisch über das supprimierte TSH mit erhöhten freien Hormonen und die TRAK, nicht über den Tastbefund am Hals.',
        },
        {
          frage: 'Wie würden Sie die Hyperthyreose bestätigen?',
          antwort: 'Zuerst das basale TSH als Screening-Parameter — es ist supprimiert. Dann fT3 und fT4 zur Bestätigung und zur Unterscheidung von latenter und manifester Form. Anschließend die Antikörper: TRAK als praktisch beweisender Marker des Morbus Basedow und TPO-Antikörper. Ergänzend Sonographie und, zur Klärung der Ursache, die Szintigraphie.',
        },
        {
          frage: 'Hat das Jodsalz etwas damit zu tun?',
          antwort: 'Nein. Normales jodiertes Speisesalz löst weder einen Morbus Basedow aus noch muss es gemieden werden. Problematisch sind nur große Jodmengen — jodhaltige Röntgenkontrastmittel, Amiodaron, jodhaltige Desinfektionsmittel oder hochdosierte Jodpräparate. Sie können vor allem eine bestehende Autonomie dekompensieren lassen und im schlimmsten Fall eine thyreotoxische Krise auslösen.',
        },
        {
          frage: 'Welche körperliche Untersuchung ist wichtig? Beschreiben Sie bitte die Palpation der Schilddrüse.',
          antwort: 'Die Palpation der Schilddrüse. Ich stelle mich hinter den sitzenden Patienten, taste mit den Fingerkuppen beider Hände beidseits der Trachea und lasse den Patienten dabei schlucken, da sich die Schilddrüse beim Schluckakt mitbewegt. Beurteilt werden Größe, Konsistenz, Oberfläche, Knoten, Schluckverschieblichkeit und Druckschmerz; anschließend auskultiere ich die Drüse auf ein Schwirren und taste die Halslymphknoten.',
        },
        {
          frage: 'Sie haben einen Knoten in der Schilddrüse getastet — wie gehen Sie weiter vor? Und was machen Sie vor einer Biopsie?',
          antwort: 'Zuerst Blutabnahme mit TSH, fT3, fT4 und Antikörpern, dann die Sonographie der Schilddrüse und danach die Szintigraphie. Erst wenn sich ein kalter, sonographisch suspekter Knoten zeigt, folgt die sonographisch gesteuerte Feinnadelpunktion. Vor jeder Biopsie steht also die Szintigraphie.',
        },
        {
          frage: 'Wie unterscheidet man in der Szintigraphie einen bösartigen von einem anderen Knoten?',
          antwort: 'Über das Speicherverhalten: Ein heißer Knoten speichert vermehrt Radionuklid und ist praktisch nie maligne — er ist autonom und wird nicht punktiert. Ein kalter Knoten speichert nicht oder vermindert; er ist malignitätsverdächtig, wenn auch die meisten kalten Knoten gutartig sind, und muss deshalb punktiert werden.',
        },
        {
          frage: 'Was sehen Sie in der Sonographie der Schilddrüse?',
          antwort: 'Beim Morbus Basedow eine diffus vergrößerte, echoarme und inhomogene Schilddrüse mit in der Farbduplexsonographie exzessiv gesteigerter Durchblutung — das sogenannte vaskuläre Inferno. Bei der funktionellen Autonomie sieht man dagegen umschriebene Knoten in einer sonst normalen Drüse.',
        },
        {
          frage: 'Wenn die Hyperthyreose bestätigt wäre — wie würden Sie sie behandeln?',
          antwort: 'Mit einem Thyreostatikum, in erster Linie Thiamazol, initial 20 bis 30 mg täglich mit Reduktion auf 5 bis 10 mg nach Erreichen der Euthyreose, beim Morbus Basedow über 12 bis 18 Monate. Symptomatisch gebe ich einen Betablocker wie Propranolol gegen Herzrasen, Tremor und Unruhe. Bei Rezidiv oder Unverträglichkeit folgt die definitive Therapie mit Radiojod oder Thyreoidektomie.',
        },
        {
          frage: 'Die Biopsie war negativ — wie gehen Sie mit dem Knoten weiter um?',
          antwort: 'Sonographische Verlaufskontrolle etwa alle sechs Monate mit Volumetrie und Beurteilung der Malignitätskriterien; bei Größenzunahme, neuen suspekten Kriterien oder mechanischer Beeinträchtigung erfolgt die operative Entfernung.',
        },
        {
          frage: 'Warum denken Sie an ein Karzinoid, und wo befindet es sich am häufigsten?',
          antwort: 'Wegen der Kombination aus Diarrhoe, Gewichtsverlust und Tachykardie; heute spricht man von neuroendokrinen Tumoren. Am häufigsten sitzen sie im Gastrointestinaltrakt, klassischerweise im Wurmfortsatz, also in der Appendix, außerdem im Ileum, im Rektum und in den Bronchien. Gegen ein Karzinoid spricht ein fehlender Flush.',
        },
        {
          frage: 'Welche Spezialisten ziehen Sie hinzu, und wohin überweisen Sie den Patienten?',
          antwort: 'Zum Endokrinologen zur Therapieplanung, zum Nuklearmediziner für Szintigraphie und gegebenenfalls Radiojodtherapie, zum Ophthalmologen wegen der endokrinen Orbitopathie und bei Operationsindikation zum Chirurgen mit vorheriger HNO-ärztlicher Laryngoskopie.',
        },
        {
          frage: 'Können nur Frauen an einer Schilddrüsenüberfunktion erkranken?',
          antwort: 'Nein. Frauen sind etwa fünfmal häufiger betroffen, Männer erkranken aber ebenfalls, und bei ihnen verläuft die Erkrankung oft schwerer und die Remissionsrate ist niedriger.',
        },
        {
          frage: 'Muss das Insulin eines Diabetikers reduziert werden, weil er abgenommen hat?',
          antwort: 'Nicht eigenmächtig. Die Hyperthyreose steigert den Stoffwechsel und verändert den Insulinbedarf; angepasst wird ärztlich anhand des Blutzuckertagesprofils. Mit Erreichen der Euthyreose steigt der Bedarf in der Regel wieder an. Zusätzlich ist zu bedenken, dass ein Betablocker die Warnzeichen einer Unterzuckerung verschleiert.',
        },
        {
          frage: 'Was ist eine thyreotoxische Krise und wie behandeln Sie sie?',
          antwort: 'Die lebensbedrohliche Entgleisung der Hyperthyreose, meist ausgelöst durch Jodexposition, Infektion, Operation oder Absetzen der Thyreostatika: Fieber über 38,5 Grad, Tachykardie über 150 pro Minute, Erbrechen, Exsikkose, Agitation bis zum Koma. Therapie auf der Intensivstation mit hochdosiertem Thiamazol intravenös, Glukokortikoiden, Propranolol, Volumen- und Elektrolytsubstitution, Fiebersenkung ohne Salicylate, Perchlorat bei Jodexposition; als Ultima Ratio Plasmapherese oder Notfalloperation. Letalität 20 bis 30 Prozent.',
        },
        {
          frage: 'Welche Nebenwirkung der Thyreostatika ist die gefährlichste?',
          antwort: 'Die Agranulozytose. Deshalb Blutbild vor Therapiebeginn und in den ersten Wochen sowie die klare Anweisung an den Patienten, bei Fieber, Halsschmerzen oder Mundgeschwüren das Medikament sofort abzusetzen und sich umgehend vorzustellen. Daneben sind Leberwerterhöhungen, Exanthem und Geschmacksstörungen zu beachten.',
        },
      ],
      merksatz: 'Merke: TSH zuerst — supprimiertes TSH plus erhöhtes fT3/fT4 ist die Hyperthyreose, TRAK positiv plus Merseburger Trias (Struma, Tachykardie, Exophthalmus) ist der Basedow. Der Patient nimmt AB, obwohl er MEHR isst; die Szintigraphie kommt VOR der Punktion (heiß = harmlos, kalt = klärungsbedürftig); und unter Thiamazol gilt: Fieber und Halsschmerzen bedeuten Blutbild — Agranulozytose.',
      linkedCaseIds: [
        'case-hyperthyreose',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-sonographie',
        'auf-feinnadelpunktion',
        'auf-operation',
      ],
    },
    {
      id: 'fw-copd',
      pathology: 'Chronisch obstruktive Lungenerkrankung (COPD)',
      specialty: 'Pneumologie',
      definition: 'Die chronisch obstruktive Lungenerkrankung (COPD) ist eine vermeidbare und behandelbare, chronisch progrediente Erkrankung der Atemwege und des Lungenparenchyms, die durch eine persistierende, nicht vollständig reversible Atemwegsobstruktion gekennzeichnet ist. Sie entsteht durch eine überschießende chronische Entzündungsreaktion auf inhalative Noxen und vereint zwei Komponenten: die chronisch obstruktive Bronchitis und das Lungenemphysem. Eine chronische Bronchitis liegt nach der WHO-Definition vor, wenn Husten und Auswurf an den meisten Tagen während mindestens drei Monaten in zwei aufeinanderfolgenden Jahren bestehen; das Lungenemphysem ist die irreversible Erweiterung der Lufträume distal der Bronchioli terminales mit Destruktion der Alveolarsepten. Gesichert wird die Diagnose spirometrisch durch einen FEV1/FVC-Quotienten (Tiffeneau-Index) unter 0,7 NACH Bronchodilatation — genau dieses Kriterium trennt die COPD vom voll reversiblen Asthma bronchiale.',
      aetiologie: 'In den Industrieländern sind 80–90 % der Fälle durch inhalatives Zigarettenrauchen bedingt; weltweit spielt zusätzlich die Verbrennung von Biomasse in Innenräumen eine große Rolle. Die inhalierten Noxen unterhalten eine neutrophilen- und makrophagendominierte Entzündung der kleinen Atemwege („small airway disease“) mit Becherzellhyperplasie, Hypersekretion zähen Schleims, Störung der mukoziliären Clearance, Wandverdickung und Fibrosierung. Parallel führt ein Ungleichgewicht zwischen Proteasen und Antiproteasen (Elastase gegen Alpha-1-Antitrypsin) zusammen mit oxidativem Stress zur Zerstörung der Alveolarsepten und damit zum Emphysem. Der Verlust der elastischen Rückstellkräfte lässt die kleinen Atemwege bei der Exspiration kollabieren: Es kommt zu Air trapping und dynamischer Überblähung mit vergrößertem Residualvolumen, erhöhter Atemarbeit und schließlich zur respiratorischen Insuffizienz. Die hypoxische pulmonale Vasokonstriktion (Euler-Liljestrand-Mechanismus) und der Kapillarverlust im Emphysem erhöhen den pulmonalarteriellen Druck und führen über die Rechtsherzbelastung zum Cor pulmonale. Genetisch bedeutsam ist der Alpha-1-Antitrypsin-Mangel (autosomal-kodominant, PiZZ), der ein früh auftretendes, basal betontes panlobuläres Emphysem verursacht.',
      risikofaktoren: [
        'Zigarettenrauchen — der mit Abstand wichtigste Risikofaktor; das Risiko steigt mit der Zahl der Packungsjahre (Packungsjahre = täglich gerauchte Schachteln × Raucherjahre)',
        'Passivrauchexposition, auch in Kindheit und Schwangerschaft',
        'Berufliche Exposition gegenüber Stäuben, Dämpfen, Gasen und Rauch: Bergbau, Bau- und Landwirtschaft, Schweißen, Getreide- und Mehlstaub (Bäcker), Dieselabgase im Fahrdienst',
        'Verbrennung von Biomasse und offene Feuerstellen in Innenräumen, hohe Feinstaubbelastung der Außenluft',
        'Alpha-1-Antitrypsin-Mangel — an ihn denken bei Erstdiagnose vor dem 45. Lebensjahr, Nichtrauchern, basal betontem Emphysem, positiver Familienanamnese oder begleitender Leberzirrhose',
        'Höheres Lebensalter und männliches Geschlecht (die Prävalenz bei Frauen steigt jedoch stark an, Frauen sind bei gleicher Exposition empfindlicher)',
        'Rezidivierende bronchopulmonale Infekte, besonders in der Kindheit; durchgemachte Tuberkulose',
        'Gestörtes Lungenwachstum: Frühgeburtlichkeit, niedriges Geburtsgewicht, bronchopulmonale Dysplasie',
        'Niedriger sozioökonomischer Status, Mangelernährung',
        'Bronchiale Hyperreagibilität und vorbestehendes Asthma bronchiale',
      ],
      klinik: [
        {
          text: 'AHA-Symptomatik als Leittrias: Auswurf, Husten, Atemnot — in dieser Reihenfolge des zeitlichen Auftretens',
        },
        {
          text: 'Chronischer Husten, typischerweise morgens nach dem Aufstehen, produktiv („Raucherhusten“) — von den Patienten oft jahrelang bagatellisiert',
        },
        {
          text: 'Zäher, glasig-weißer Auswurf in kleiner Menge; gelb-grüne Verfärbung und Zunahme sprechen für eine Exazerbation mit bakterieller Beteiligung',
        },
        {
          text: 'Belastungsdyspnoe, zunächst nur bei stärkerer Anstrengung, im Verlauf bei alltäglichen Tätigkeiten und schließlich in Ruhe; typisch ist der schleichende Verlust der Belastbarkeit über Jahre, den die Patienten dem Alter zuschreiben',
        },
        {
          text: 'Exspiratorisches Giemen, Brummen und ein verlängertes Exspirium; Einsatz der Lippenbremse und atemerleichternde Körperstellungen (Kutschersitz)',
        },
        {
          text: 'Fassthorax, hypersonorer Klopfschall, tiefstehende und wenig verschiebliche Zwerchfellgrenzen, abgeschwächtes Atemgeräusch („silent lung“ bei schwerer Überblähung)',
        },
        {
          text: 'Einsatz der Atemhilfsmuskulatur, Tachypnoe, Zyanose der Lippen und Akren bei fortgeschrittener Hypoxie',
        },
        {
          text: 'Rezidivierende Atemwegsinfekte und Exazerbationen, häufig saisonal in den Wintermonaten',
        },
        {
          text: 'Zeichen des Cor pulmonale in fortgeschrittenen Stadien: gestaute Halsvenen, Hepatomegalie, Aszites, symmetrische Beinödeme mit Stauungsdermatose, Nykturie',
        },
        {
          text: 'Systemische Manifestationen: ungewollter Gewichtsverlust bis zur pulmonalen Kachexie, Verlust der Skelettmuskelmasse, Osteoporose, Anämie oder sekundäre Polyglobulie, Depression und Angststörung',
        },
        {
          text: 'Erstmanifestation direkt als schwere Exazerbation oder als akute respiratorische Insuffizienz bei einem Patienten, der sich zuvor für „nur etwas kurzatmig“ hielt',
          atypisch: true,
        },
        {
          text: 'Morgendliche Kopfschmerzen, Konzentrationsstörungen, Tagesmüdigkeit und Flapping tremor als Zeichen der chronischen Hyperkapnie',
          atypisch: true,
        },
        {
          text: 'Trockener Husten ohne Auswurf beim emphysemdominanten Typ („Pink Puffer“) — der fehlende Auswurf schließt eine COPD nicht aus',
          atypisch: true,
        },
        {
          text: 'COPD beim jungen Nichtraucher oder mit basal betontem Emphysem — Verdacht auf Alpha-1-Antitrypsin-Mangel, ggf. mit Leberbeteiligung',
          atypisch: true,
        },
        {
          text: 'Stumme Obstruktion („silent chest“) ohne Giemen bei schwerster Exazerbation — ein Alarmzeichen, kein Zeichen der Besserung',
          atypisch: true,
        },
      ],
      klassifikation: [
        {
          name: 'GOLD-Schweregrade der Obstruktion (nach FEV1 in % des Solls, immer NACH Bronchodilatation und nur bei FEV1/FVC < 0,7)',
          inhalt: 'GOLD 1 (leicht): FEV1 ≥ 80 % des Solls. GOLD 2 (mittelschwer): FEV1 50–79 %. GOLD 3 (schwer): FEV1 30–49 %. GOLD 4 (sehr schwer): FEV1 < 30 %. Der Tiffeneau-Index sichert die Diagnose, das FEV1 bestimmt den Schweregrad der Obstruktion.',
        },
        {
          name: 'ABE-Gruppen (GOLD ab 2023; zuvor ABCD) — Grundlage der Dauertherapie',
          inhalt: 'Eingeteilt wird nach Symptomlast und Exazerbationsrate des letzten Jahres. Gruppe A: 0 oder 1 mittelschwere Exazerbation ohne Hospitalisierung UND mMRC 0–1 bzw. CAT < 10 → ein langwirksamer Bronchodilatator (LAMA oder LABA). Gruppe B: gleiche Exazerbationsrate, aber mMRC ≥ 2 bzw. CAT ≥ 10 → LAMA + LABA. Gruppe E (Exazerbierer): ≥ 2 mittelschwere Exazerbationen oder ≥ 1 mit Hospitalisierung → LAMA + LABA, bei Bluteosinophilen ≥ 300/µl zusätzlich ein ICS.',
        },
        {
          name: 'mMRC-Dyspnoeskala',
          inhalt: 'Grad 0: Atemnot nur bei starker Anstrengung. Grad 1: Atemnot beim schnellen Gehen in der Ebene oder bei leichter Steigung. Grad 2: geht wegen Atemnot langsamer als Gleichaltrige oder muss in der Ebene Pausen machen. Grad 3: muss nach etwa 100 Metern oder wenigen Minuten in der Ebene stehenbleiben. Grad 4: zu atemlos, um das Haus zu verlassen, oder Atemnot beim An- und Ausziehen. Der CAT-Fragebogen (8 Items, 0–40 Punkte) erfasst ergänzend die Symptomlast; ab 10 Punkten gilt sie als hoch.',
        },
        {
          name: 'Anthonisen-Kriterien der Exazerbation',
          inhalt: 'Die drei Kardinalsymptome sind: Zunahme der Dyspnoe, Zunahme der Sputummenge und Zunahme der Sputumpurulenz. Typ I: alle drei Kriterien; Typ II: zwei Kriterien; Typ III: ein Kriterium plus ein Nebenkriterium (Infekt der oberen Atemwege, Fieber, Giemen, Husten, Anstieg von Atem- oder Herzfrequenz um mehr als 20 %). Der Nutzen einer Antibiotikatherapie ist bei Typ I und II mit purulentem Sputum belegt.',
        },
        {
          name: 'Schweregrad der respiratorischen Insuffizienz',
          inhalt: 'Respiratorische Partialinsuffizienz (Typ I): pO2 < 60 mmHg bei normalem oder erniedrigtem pCO2 — reines Oxygenierungsversagen. Respiratorische Globalinsuffizienz (Typ II): zusätzlich pCO2 > 45–50 mmHg — Versagen der Atempumpe, bei akutem Anstieg mit respiratorischer Azidose (pH < 7,35) und Indikation zur nicht-invasiven Beatmung.',
        },
        {
          name: 'Klinische Phänotypen',
          inhalt: '„Pink Puffer“: emphysemdominant, asthenisch bis kachektisch, ausgeprägte Dyspnoe, wenig Husten und Auswurf, kaum zyanotisch, normale bis niedrige pCO2-Werte. „Blue Bloater“: bronchitisdominant, übergewichtig, ausgeprägter produktiver Husten, Zyanose, Hyperkapnie, frühe Rechtsherzinsuffizienz und Polyglobulie. In der Realität überwiegen Mischbilder.',
        },
        {
          name: 'BODE-Index (Prognoseabschätzung)',
          inhalt: 'Vier Parameter mit je 0–3 Punkten: Body-Mass-Index, Obstruktion (FEV1 % Soll), Dyspnoe (mMRC) und Exercise capacity (Gehstrecke im 6-Minuten-Gehtest). Je höher der Punktwert (0–10), desto höher die Mortalität — er prognostiziert besser als das FEV1 allein.',
        },
      ],
      redFlags: [
        'Hämoptysen, ungewollter Gewichtsverlust, Heiserkeit, obere Einflussstauung oder ein neuer Rundherd beim Raucher → dringender Verdacht auf ein Bronchialkarzinom',
        'Atemfrequenz > 30/min, Einsatz der Atemhilfsmuskulatur, paradoxe abdominelle Atmung, Sprechdyspnoe → drohende Erschöpfung der Atempumpe',
        'SpO2 < 90 % trotz Sauerstoffgabe, Zyanose, pO2 < 60 mmHg',
        '„Silent chest“ — Verschwinden des Giemens bei fortbestehender Atemnot: Zeichen der schwersten Obstruktion, nicht der Besserung',
        'Somnolenz, Verwirrtheit, Flapping tremor, Kopfschmerzen → Hyperkapnie bis zur CO2-Narkose, besonders nach unkontrollierter Sauerstoffgabe',
        'Respiratorische Azidose mit pH < 7,35 und pCO2 > 45 mmHg → Indikation zur nicht-invasiven Beatmung',
        'Hämodynamische Instabilität, neu aufgetretene Arrhythmien, Zeichen der akuten Rechtsherzdekompensation',
        'Plötzliche einseitige Verschlechterung mit hypersonorem Klopfschall und fehlendem Atemgeräusch → Spannungspneumothorax bei rupturierter Bulla',
        'Fieber mit Infiltrat, Thoraxschmerz und Sepsiszeichen → Pneumonie als Auslöser der Exazerbation',
        'Neu aufgetretene, nicht erklärbare Dyspnoe mit Tachykardie und Hypokapnie → Lungenembolie als häufig übersehene Ursache einer scheinbaren Exazerbation',
      ],
      diagnostik: [
        {
          stufe: 'Anamnese/Klinik',
          text: 'Anamnese der AHA-Symptomatik mit exakter Chronologie: Husten und Auswurf über Jahre (Definitionskriterium der chronischen Bronchitis: die meisten Tage, mindestens drei Monate, in zwei aufeinanderfolgenden Jahren), Tageszeit des Hustens, Farbe, Menge und Konsistenz des Sputums, Blutbeimengung',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Quantifizierung der Noxen: Packungsjahre berechnen (täglich gerauchte Schachteln × Raucherjahre), auch bei Ex-Rauchern nach Menge und Zeitpunkt des Aufhörens fragen; Passivrauch, Berufsanamnese (Stäube, Mehlstaub, Abgase, Asbest), Wohn- und Heizsituation',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Graduierung der Belastbarkeit mit der mMRC-Skala und dem CAT-Fragebogen; Erfassung der Exazerbationen und Hospitalisierungen im letzten Jahr, des Impfstatus (Influenza, Pneumokokken, COVID-19, Pertussis) und der aktuellen Inhalativa einschließlich Prüfung der Inhalationstechnik',
        },
        {
          stufe: 'Anamnese/Klinik',
          text: 'Körperliche Untersuchung: Vitalparameter mit Atemfrequenz und Pulsoxymetrie; Inspektion (Fassthorax, Lippenbremse, Atemhilfsmuskulatur, Zyanose, Uhrglasnägel und Trommelschlegelfinger als Hinweis auf Karzinom oder Bronchiektasen), Perkussion (hypersonorer Klopfschall, Zwerchfelltiefstand mit verminderter Verschieblichkeit), Auskultation (abgeschwächtes Atemgeräusch, verlängertes Exspirium, Giemen und Brummen), Suche nach Zeichen der Rechtsherzinsuffizienz und Bestimmung von BMI und Muskelmasse',
        },
        {
          stufe: 'Labor',
          text: 'Blutgasanalyse zur Erfassung von Partial- oder Globalinsuffizienz und einer respiratorischen Azidose — sie steuert Sauerstoffgabe, NIV-Indikation und die Indikation zur Langzeit-Sauerstofftherapie',
        },
        {
          stufe: 'Labor',
          text: 'Blutbild mit Differenzialblutbild: sekundäre Polyglobulie bei chronischer Hypoxie, Leukozytose bei Infekt und vor allem die Bluteosinophilen, die über die Indikation für ein inhalatives Kortikosteroid entscheiden (≥ 300/µl spricht dafür, < 100/µl dagegen)',
        },
        {
          stufe: 'Labor',
          text: 'CRP und ggf. Procalcitonin zur Abgrenzung eines bakteriellen Infekts; NT-proBNP zur Abgrenzung der kardialen Dyspnoe; D-Dimere nur bei begründetem Verdacht auf eine Lungenembolie; Elektrolyte, Kreatinin, Blutzucker und HbA1c (Steroidtherapie!)',
        },
        {
          stufe: 'Labor',
          text: 'Sputumdiagnostik mit Gramfärbung, Kultur und Antibiogramm bei purulentem Auswurf, häufigen Exazerbationen oder Verdacht auf Pseudomonas; bei B-Symptomatik zusätzlich Sputumzytologie und Untersuchung auf säurefeste Stäbchen',
        },
        {
          stufe: 'Labor',
          text: 'Alpha-1-Antitrypsin im Serum — bei jedem COPD-Patienten mindestens einmal bestimmen, obligat bei Erstdiagnose vor dem 45. Lebensjahr, bei Nichtrauchern, basal betontem Emphysem oder positiver Familienanamnese; bei erniedrigtem Wert Genotypisierung',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'SPIROMETRIE MIT BRONCHOSPASMOLYSETEST — die Schlüsseluntersuchung: FEV1/FVC < 0,7 NACH Inhalation eines kurzwirksamen Bronchodilatators beweist die nicht vollständig reversible Obstruktion; ein FEV1-Anstieg um ≥ 12 % und ≥ 200 ml mit Normalisierung des Quotienten spricht für ein Asthma bronchiale. Das FEV1 in % des Solls legt das GOLD-Stadium fest; ergänzend Peak-Flow-Messung und Fluss-Volumen-Kurve mit charakteristischem exspiratorischem „Emphysemknick“',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Ganzkörperplethysmographie: Residualvolumen und totale Lungenkapazität erhöht (Überblähung, Air trapping), Atemwegswiderstand erhöht; CO-Diffusionskapazität (DLCO) beim Emphysem vermindert, beim Asthma normal',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'Röntgen-Thorax in zwei Ebenen: Überblähung mit Zwerchfelltiefstand und abgeflachten Zwerchfellkuppeln, verbreiterte Interkostalräume, Fassthorax, vermehrte Strahlentransparenz, schmales „Tropfenherz“, ggf. Bullae; zugleich Ausschluss von Pneumonie, Pleuraerguss, Pneumothorax, Stauung und Bronchialkarzinom',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'CT beziehungsweise HRCT des Thorax: Typ und Verteilung des Emphysems, Bronchiektasen, und vor allem der Ausschluss eines Bronchialkarzinoms beim Raucher mit B-Symptomatik — ein kleines oder zentrales Karzinom kann im Röntgenbild verborgen bleiben',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: 'EKG (P pulmonale, Rechtstyp, Rechtsschenkelblock, Zeichen der Rechtsherzhypertrophie, Arrhythmien) und Echokardiographie zur Beurteilung des rechten Ventrikels, zur Abschätzung des systolischen pulmonalarteriellen Drucks und zum Ausschluss einer linksventrikulären Ursache der Dyspnoe',
        },
        {
          stufe: 'Apparativ & Bildgebung',
          text: '6-Minuten-Gehtest zur Objektivierung der Belastbarkeit und als Bestandteil des BODE-Index; nächtliche Oxymetrie bei Verdacht auf nächtliche Entsättigungen',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Bronchoskopie mit Biopsie, Bürstenzytologie und bronchoalveolärer Lavage bei Karzinomverdacht, Rundherd, Hämoptysen oder therapierefraktärem Infekt; EBUS zum Lymphknotenstaging',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Polygraphie oder Polysomnographie bei Verdacht auf ein Overlap-Syndrom mit obstruktiver Schlafapnoe; Rechtsherzkatheter zur Sicherung und Quantifizierung einer pulmonalen Hypertonie',
        },
        {
          stufe: 'Invasiv & Speziell',
          text: 'Perfusions- und Ventilationsszintigraphie sowie Emphysemquantifizierung im CT vor endoskopischer oder chirurgischer Lungenvolumenreduktion; Evaluation im Transplantationszentrum bei Endstadium',
        },
      ],
      differenzialdiagnosen: [
        {
          dd: 'Asthma bronchiale',
          unterscheidung: 'Beginn meist in Kindheit/Jugend, anfallsartige Beschwerden mit beschwerdefreien Intervallen, nächtliche und frühmorgendliche Symptomatik, Allergien und Atopie, Eosinophilie; in der Spirometrie VOLLE Reversibilität nach Bronchodilatation (FEV1-Anstieg ≥ 12 % und ≥ 200 ml, Tiffeneau-Index normalisiert), DLCO normal. Die COPD ist nur teilreversibel und schreitet trotz Therapie fort.',
        },
        {
          dd: 'Herzinsuffizienz (Links- und Rechtsherzinsuffizienz)',
          unterscheidung: 'Orthopnoe, paroxysmale nächtliche Dyspnoe, feuchte basale Rasselgeräusche, gestaute Halsvenen, Beinödeme, dritter Herzton; NT-proBNP erhöht, im Röntgen Kardiomegalie und Stauungszeichen, in der Echokardiographie eingeschränkte Pumpfunktion; in der Lungenfunktion Restriktion statt Obstruktion. CAVE: COPD und Herzinsuffizienz koexistieren häufig.',
        },
        {
          dd: 'Bronchialkarzinom',
          unterscheidung: 'Die wichtigste DD beim Raucher: Hämoptysen, ungewollter Gewichtsverlust, Nachtschweiß, Heiserkeit, persistierender Husten mit Charakterwechsel, poststenotische Pneumonie, obere Einflussstauung, Paraneoplasien. Nachweis durch Röntgen, CT-Thorax und Bronchoskopie mit Biopsie — die COPD schließt ein Karzinom nicht aus, sondern ist ein eigenständiger Risikofaktor dafür.',
        },
        {
          dd: 'Bronchiektasen',
          unterscheidung: 'Große Mengen dreischichtigen, oft übelriechenden Auswurfs („maulvolle Expektoration“), rezidivierende Infekte mit Pseudomonas, Hämoptysen, Trommelschlegelfinger und Uhrglasnägel; im HRCT erweiterte Bronchien mit Ringschatten und Signet-Ring-Zeichen.',
        },
        {
          dd: 'Lungenembolie',
          unterscheidung: 'Plötzliche Dyspnoe, Tachykardie, atemabhängiger Thoraxschmerz, Hypoxie mit Hypokapnie, Zeichen einer tiefen Beinvenenthrombose, Immobilisation oder Malignom in der Vorgeschichte; Wells-Score, D-Dimere, CT-Angiographie. Sie ist eine häufige und häufig übersehene Ursache einer scheinbaren Exazerbation.',
        },
        {
          dd: 'Pneumonie',
          unterscheidung: 'Akutes Fieber mit Schüttelfrost, atemabhängiger Thoraxschmerz, Klopfschalldämpfung, feinblasige Rasselgeräusche und Bronchialatmen, deutlich erhöhte Entzündungsparameter, Infiltrat im Röntgen-Thorax.',
        },
        {
          dd: 'Interstitielle Lungenerkrankungen / Lungenfibrose',
          unterscheidung: 'Trockener Reizhusten, Sklerosiphonie („Knisterrasseln“ wie ein Klettverschluss), Trommelschlegelfinger; restriktives Muster mit vermindertem TLC bei normalem oder erhöhtem Tiffeneau-Index, verminderte DLCO, im HRCT Retikulationen und Honigwaben.',
        },
        {
          dd: 'Lungentuberkulose',
          unterscheidung: 'Subakuter Verlauf über Wochen, B-Symptomatik mit Nachtschweiß, Fieber und Gewichtsverlust, Hämoptysen, Oberlappeninfiltrate mit Kavernen; Sputum auf säurefeste Stäbchen, PCR, Kultur, IGRA. Meldepflichtig.',
        },
        {
          dd: 'Alpha-1-Antitrypsin-Mangel-Emphysem',
          unterscheidung: 'Keine echte Alternative, sondern eine spezielle Ätiologie: junge Patienten, häufig Nichtraucher, basal betontes panlobuläres Emphysem, positive Familienanamnese, oft begleitende Leberbeteiligung bis zur Zirrhose; Serumspiegel und Genotypisierung sichern die Diagnose, eine Substitutionstherapie ist möglich.',
        },
        {
          dd: 'ACE-Hemmer-induzierter Husten',
          unterscheidung: 'Trockener Reizhusten ohne Auswurf und ohne Obstruktion, Beginn Wochen bis Monate nach Ansetzen eines ACE-Hemmers, Rückbildung innerhalb von Wochen nach Umstellung auf einen AT1-Blocker — bei jedem chronischen Husten die Medikamentenanamnese prüfen.',
        },
        {
          dd: 'Obstruktives Schlafapnoe-Syndrom (Overlap-Syndrom)',
          unterscheidung: 'Lautes Schnarchen mit beobachteten Atempausen, nicht erholsamer Schlaf, Tagesmüdigkeit, morgendliche Kopfschmerzen, Adipositas; Epworth-Skala und Polygraphie. Die Kombination mit einer COPD verschlechtert Hypoxie und Prognose erheblich.',
        },
        {
          dd: 'Zentrale Atemwegsobstruktion (Trachealstenose, Fremdkörper, Struma)',
          unterscheidung: 'Inspiratorischer Stridor statt exspiratorischem Giemen, abgeflachte inspiratorische Fluss-Volumen-Kurve, plötzlicher Beginn nach Aspiration oder Zustand nach Langzeitintubation; Klärung durch Bronchoskopie und CT.',
        },
      ],
      therapie: [
        {
          label: 'Kausale und krankheitsmodifizierende Basismaßnahmen',
          items: [
            'Tabakentwöhnung — die EINZIGE Maßnahme, die den beschleunigten Abfall des FEV1 verlangsamt; strukturiert vorgehen nach den 5 A (Ask, Advise, Assess, Assist, Arrange) mit motivierender Gesprächsführung, festem Rauchstopp-Tag, Nikotinersatztherapie (Pflaster in Kombination mit Kaugummi, Lutschtablette oder Spray), medikamentöser Unterstützung durch Vareniclin oder Bupropion sowie verhaltenstherapeutischen Programmen der Krankenkassen; Rückfälle als Teil des Prozesses werten und erneut anbieten',
            'Vermeidung weiterer inhalativer Noxen: Passivrauch, berufliche Stäube und Abgase, hohe Feinstaubbelastung; ggf. Berufskrankheitenverfahren und Arbeitsplatzwechsel prüfen',
            'Schutzimpfungen: jährliche Influenzaimpfung, Pneumokokkenimpfung, COVID-19-Impfung, Auffrischung gegen Pertussis, ab dem 60. Lebensjahr Herpes-zoster-Impfung — sie senken Exazerbationen und Mortalität',
            'Pneumologische Rehabilitation und Lungensport: Ausdauer- und Krafttraining, Atemphysiotherapie mit Lippenbremse und atemerleichternden Körperstellungen, Hustentechnik und Sekretmanagement (autogene Drainage, PEP-Systeme, Flutter)',
            'Strukturierte Patientenschulung: Krankheitsverständnis, korrekte Inhalationstechnik (vorführen und nachmachen lassen), schriftlicher Aktionsplan für Exazerbationen, Selbstkontrolle',
            'Ernährungstherapie bei pulmonaler Kachexie ebenso wie bei Adipositas; Osteoporoseprophylaxe mit Vitamin D und Kalzium bei wiederholten Steroidstößen',
            'Konsequente Behandlung der Komorbiditäten (kardiovaskuläre Erkrankungen, Diabetes mellitus, Osteoporose, Anämie, Depression und Angststörung), da sie Prognose und Lebensqualität wesentlich mitbestimmen',
          ],
        },
        {
          label: 'Medikamentöse Stufentherapie (Dauertherapie)',
          items: [
            'Die Stufentherapie richtet sich nach Symptomlast (mMRC, CAT) und Exazerbationsrate — also nach den Gruppen A, B und E —, nicht allein nach dem FEV1',
            'Bedarfsmedikation für alle: kurzwirksame Bronchodilatatoren, SABA (Salbutamol, Fenoterol) und/oder SAMA (Ipratropiumbromid)',
            'Gruppe A: ein langwirksamer Bronchodilatator — LAMA (Tiotropium, Glycopyrronium, Aclidinium) oder LABA (Formoterol, Salmeterol, Indacaterol, Olodaterol)',
            'Gruppe B: duale Bronchodilatation mit LAMA + LABA als Fixkombination — wirksamer als jede Monotherapie',
            'Gruppe E: LAMA + LABA; bei Bluteosinophilen ≥ 300/µl (oder bei Asthma-COPD-Overlap) Dreifachtherapie LAMA + LABA + ICS in einem Inhalator',
            'Inhalative Kortikosteroide niemals als Monotherapie und nur bei Exazerbationen mit Eosinophilie; Nebenwirkungen sind Mundsoor (Mund nach Inhalation ausspülen), Heiserkeit und ein erhöhtes Pneumonierisiko — bei Eosinophilen < 100/µl Deeskalation erwägen',
            'Reserveoptionen bei fortbestehenden Exazerbationen: Roflumilast (PDE-4-Hemmer) bei chronischer Bronchitis mit FEV1 < 50 %, Azithromycin als Langzeit-Makrolidtherapie (zuvor QT-Zeit und atypische Mykobakterien prüfen), Mukolytika wie N-Acetylcystein oder Carbocystein',
            'Theophyllin nur noch als Reservemittel wegen der engen therapeutischen Breite und der Interaktionen; systemische Steroide sind KEINE Dauertherapie der COPD',
            'Antitussiva nur kurzfristig und nur beim quälenden trockenen Reizhusten — sie behindern die Sekretclearance; Sedativa und Betablocker vom nichtselektiven Typ meiden (kardioselektive Betablocker sind bei kardialer Indikation erlaubt)',
            'Bei jedem Kontakt Inhalationstechnik, Adhärenz und Nebenwirkungen überprüfen — die häufigste Ursache eines vermeintlichen Therapieversagens ist die falsche Anwendung des Inhalators',
          ],
        },
        {
          label: 'Management der akuten Exazerbation',
          akut: true,
          items: [
            'Sofortmaßnahmen: sitzende Lagerung mit aufgestütztem Oberkörper, Lippenbremse, Beruhigung, Monitoring von Atemfrequenz, SpO2, Puls und Blutdruck, venöser Zugang, Blutgasanalyse',
            'KONTROLLIERTE Sauerstoffgabe mit Zielsättigung 88–92 % über Nasensonde oder Venturi-Maske; zu hohe Flussraten können beim chronisch hyperkapnischen Patienten über Wegfall des hypoxischen Atemantriebs, Aufhebung der hypoxischen pulmonalen Vasokonstriktion und den Haldane-Effekt eine CO2-Narkose auslösen — BGA-Kontrolle nach 30–60 Minuten',
            'Intensivierte inhalative Bronchodilatation: SABA plus SAMA als Vernebler oder Dosieraerosol mit Spacer, initial alle 15–30 Minuten, danach nach Bedarf',
            'Systemische Glukokortikoide: Prednisolon 40 mg täglich über 5 Tage oral oder intravenös — verkürzt die Erholungszeit und senkt die Rezidivrate; kein Ausschleichen erforderlich, beim Diabetiker engmaschige Blutzuckerkontrollen',
            'Antibiotische Therapie bei purulentem Sputum plus mindestens einem weiteren Anthonisen-Kriterium, bei erhöhten Entzündungsparametern oder Beatmungspflicht: Amoxicillin mit Clavulansäure, Makrolid oder Doxycyclin über 5–7 Tage; bei Risikofaktoren für Pseudomonas gezielt nach Antibiogramm',
            'Nicht-invasive Beatmung bei respiratorischer Azidose (pH < 7,35 mit pCO2 > 45 mmHg) oder erschöpfter Atempumpe — sie senkt Intubationsrate, Krankenhausverweildauer und Mortalität; invasive Beatmung bei NIV-Versagen, Vigilanzminderung, Aspirationsgefahr oder Kreislaufinstabilität',
            'Begleitend: Thromboseprophylaxe, ausgeglichene Flüssigkeitsbilanz, Physiotherapie und Sekretmobilisation, Behandlung von Auslösern (Infekt, Pneumonie, Lungenembolie, kardiale Dekompensation, Pneumothorax, Medikamentenfehler)',
            'Nach jeder Exazerbation: Dauertherapie überprüfen und eskalieren, Inhalationstechnik schulen, Impfungen nachholen, Rauchstopp erneut ansprechen, Wiedervorstellung innerhalb von vier Wochen und Rehabilitation anbieten',
          ],
        },
        {
          label: 'Fortgeschrittene Stadien und Komplikationen',
          items: [
            'Langzeit-Sauerstofftherapie (LTOT) bei chronischer Hypoxämie: pO2 ≤ 55 mmHg im stabilen Zustand oder ≤ 60 mmHg bei Cor pulmonale bzw. Polyglobulie, mindestens 16 Stunden täglich — neben dem Rauchstopp die einzige lebensverlängernde Maßnahme; Voraussetzung ist die Nikotinkarenz (Brandgefahr)',
            'Außerklinische nicht-invasive Beatmung bei chronisch stabiler Hyperkapnie mit pCO2 dauerhaft > 50 mmHg — sie senkt die Mortalität und verbessert die Lebensqualität',
            'Cor pulmonale: konsequente Therapie der Hypoxie, vorsichtige Diuretikagabe bei Ödemen und Stauung, Bilanzierung und Gewichtskontrolle; spezifische pulmonale Vasodilatatoren sind bei COPD-assoziierter pulmonaler Hypertonie in der Regel nicht indiziert, ein Aderlass nur bei extremer Polyglobulie',
            'Interventionelle und chirurgische Lungenvolumenreduktion bei fortgeschrittenem Emphysem mit Überblähung: endobronchiale Ventile oder Coils, chirurgische Volumenreduktion, Bullektomie bei großen Bullae',
            'Lungentransplantation als Ultima Ratio bei jüngeren Patienten mit sehr schwerer COPD, insbesondere beim Alpha-1-Antitrypsin-Mangel; bei nachgewiesenem Mangel wöchentliche Substitution von Alpha-1-Antitrypsin',
            'Erkennen und Behandeln der Komplikationen: Pneumothorax bei rupturierter Bulla, rezidivierende Pneumonien, sekundäre Polyglobulie mit Thromboserisiko, Osteoporose, Kachexie und Muskelschwund, Depression und Angststörung',
            'Palliativmedizinische Mitbetreuung im Endstadium: niedrig dosierte Opioide gegen die refraktäre Atemnot, Ventilator oder Luftzug ins Gesicht, Anxiolyse, frühzeitige Gespräche über Therapieziel, Patientenverfügung und Vorsorgevollmacht',
          ],
        },
      ],
      prognose: 'Die COPD ist nicht heilbar und verläuft chronisch progredient; sie zählt weltweit zu den häufigsten Todesursachen. Während das FEV1 beim Gesunden ab dem 30. Lebensjahr um etwa 25–30 ml pro Jahr abnimmt, verliert der rauchende COPD-Patient 60–100 ml jährlich. Der Rauchstopp normalisiert die Verlustrate zwar nicht vollständig, bremst sie aber deutlich und ist in jedem Stadium und in jedem Lebensalter wirksam — die verlorene Lungenfunktion kehrt jedoch nicht zurück. Prognostisch entscheidend sind weniger das FEV1 allein als der BODE-Index, die Exazerbationsfrequenz, die Belastbarkeit, der Ernährungszustand und die Komorbiditäten. Jede schwere Exazerbation beschleunigt den Funktionsverlust und geht mit einer erhöhten Ein-Jahres-Mortalität einher; die Entwicklung eines Cor pulmonale mit Rechtsherzinsuffizienz verschlechtert die Prognose erheblich. Lebensverlängernd wirken nachweislich nur die Tabakentwöhnung, die Langzeit-Sauerstofftherapie bei chronischer Hypoxämie, die außerklinische NIV bei Hyperkapnie sowie — in ausgewählten Fällen — die Lungenvolumenreduktion und die Transplantation. Lebensqualität und Exazerbationsrate lassen sich durch Impfungen, Inhalationstherapie und Rehabilitation deutlich verbessern.',
      pruefungsfallen: [
        'Die Diagnose wird durch den Tiffeneau-Index FEV1/FVC < 0,7 NACH Bronchodilatation gestellt — die Angabe „nach Bronchospasmolyse“ muss fallen, sonst fehlt die Abgrenzung zum Asthma. Das FEV1 in % des Solls liefert nur das GOLD-Stadium.',
        'Sauerstoff nur kontrolliert mit Zielsättigung 88–92 %: Die unkontrollierte Sauerstoffgabe ist die klassische Fangfrage und kann beim chronisch hyperkapnischen Patienten zur CO2-Narkose führen.',
        'Inhalative Kortikosteroide sind KEINE Basistherapie der COPD (anders als beim Asthma): Sie werden nur bei Exazerbationen und Bluteosinophilen ≥ 300/µl ergänzt und nie als Monotherapie gegeben.',
        'Die Packungsjahre müssen berechnet und laut genannt werden (täglich gerauchte Schachteln × Raucherjahre). Sagt der Patient „ich rauche nicht“, immer nachfragen, seit wann er aufgehört hat und wie viel es vorher war.',
        'Die chronische Bronchitis hat eine exakte Definition: Husten mit Auswurf an den meisten Tagen über mindestens drei Monate in zwei aufeinanderfolgenden Jahren. Ohne nachgewiesene Obstruktion ist sie noch keine COPD.',
        'Beim Raucher mit Gewichtsverlust, Hämoptysen oder Charakterwechsel des Hustens muss das Bronchialkarzinom genannt und mit CT-Thorax ausgeschlossen werden — ein kleines oder zentrales Karzinom kann im Röntgen verborgen bleiben.',
        'Beinödeme, Nykturie und gestaute Halsvenen beim COPD-Patienten sind Cor pulmonale, also Rechtsherzinsuffizienz als Komplikation der Grunderkrankung — dieser Zusammenhang wird ausdrücklich erwartet.',
        '„Silent chest“ ist keine Besserung, sondern ein Alarmzeichen der schwersten Obstruktion.',
        'Bei einer scheinbaren Exazerbation immer die Auslöser durchgehen: Infekt, Pneumonie, Lungenembolie, kardiale Dekompensation, Pneumothorax, Therapiefehler — die Lungenembolie wird am häufigsten übersehen.',
        'Nur Rauchstopp, Langzeit-Sauerstofftherapie bei Hypoxämie und außerklinische NIV bei Hyperkapnie verlängern nachweislich das Leben; Bronchodilatatoren verbessern Symptome und Exazerbationsrate, nicht die Mortalität.',
        'Systemische Steroide bei der Exazerbation für nur 5 Tage und in fester Dosis (Prednisolon 40 mg) — kein wochenlanges Ausschleichen; beim Diabetiker Blutzucker engmaschig kontrollieren.',
        'Impfungen (Influenza, Pneumokokken, COVID-19, Pertussis) gehören in jede Therapieantwort — sie werden regelmäßig abgefragt und ebenso regelmäßig vergessen.',
        'Fachbegriffe patientengerecht übersetzen: Dyspnoe = Atemnot, Sputum = Auswurf, Exazerbation = akute Verschlechterung, Emphysem = Lungenüberblähung, Cor pulmonale = Rechtsherzbelastung durch die Lungenerkrankung, Spirometrie = Lungenfunktionsprüfung.',
      ],
      askedInExam: [
        {
          frage: 'Wie lautet Ihre Verdachtsdiagnose, und wie sichern Sie sie?',
          antwort: 'Eine chronisch obstruktive Lungenerkrankung, gegebenenfalls in akuter Exazerbation. Gesichert wird sie durch die Spirometrie mit Bronchospasmolysetest: Ein FEV1/FVC-Quotient unter 0,7 nach Gabe eines Bronchodilatators beweist die nicht vollständig reversible Obstruktion. Das FEV1 in Prozent des Solls legt anschließend das GOLD-Stadium 1 bis 4 fest.',
        },
        {
          frage: 'Wie unterscheiden Sie eine COPD von einem Asthma bronchiale?',
          antwort: 'Das Asthma beginnt meist in Kindheit oder Jugend, verläuft anfallsartig mit beschwerdefreien Intervallen und nächtlicher Symptomatik, ist mit Allergien und einer Eosinophilie assoziiert und im Bronchospasmolysetest voll reversibel — der Tiffeneau-Index normalisiert sich. Die COPD beginnt im höheren Lebensalter beim Raucher, verläuft schleichend progredient, die Obstruktion bleibt nach Bronchodilatation bestehen und die Diffusionskapazität ist beim Emphysem vermindert.',
        },
        {
          frage: 'Was bedeutet die Abkürzung COPD, und wie erklären Sie sie dem Patienten?',
          antwort: 'COPD steht für chronic obstructive pulmonary disease, also chronisch obstruktive Lungenerkrankung. Dem Patienten erkläre ich: Die Atemwege sind dauerhaft entzündet und verengt und die Lungenbläschen überdehnt, deshalb bekommt er schlecht Luft und hustet morgens Schleim. Heilen können wir das nicht, aber wir können die Beschwerden lindern und das Fortschreiten aufhalten.',
        },
        {
          frage: 'Wie definiert man die chronische Bronchitis?',
          antwort: 'Nach der WHO-Definition liegt eine chronische Bronchitis vor, wenn Husten und Auswurf an den meisten Tagen während mindestens drei Monaten in zwei aufeinanderfolgenden Jahren bestehen. Kommt eine nicht vollständig reversible Obstruktion hinzu, spricht man von einer COPD.',
        },
        {
          frage: 'Was sind die Leitsymptome?',
          antwort: 'Die AHA-Symptomatik: Auswurf, Husten und Atemnot. Der Husten ist typischerweise morgendlich und produktiv, der Auswurf zäh und glasig-weiß, und die Atemnot tritt zunächst nur bei Belastung, später auch in Ruhe auf.',
        },
        {
          frage: 'Was sind Packungsjahre, und wie berechnen Sie sie?',
          antwort: 'Ein Packungsjahr entspricht dem Konsum einer Schachtel Zigaretten mit zwanzig Stück täglich über ein Jahr. Man multipliziert die Zahl der täglich gerauchten Schachteln mit der Zahl der Raucherjahre — bei einer Schachtel täglich seit dem 16. Lebensjahr und einem Alter von 66 Jahren sind das 50 Packungsjahre.',
        },
        {
          frage: 'Welchen Zusammenhang gibt es zwischen dem Rauchen und der Diagnose?',
          antwort: 'Das Zigarettenrauchen ist die Ursache von 80 bis 90 Prozent aller COPD-Fälle: Es unterhält eine chronische Entzündung der kleinen Atemwege und stört das Gleichgewicht zwischen Proteasen und Antiproteasen, wodurch die Alveolarsepten zerstört werden. Zusätzlich ist es der wichtigste Risikofaktor für das Bronchialkarzinom sowie für kardiovaskuläre Erkrankungen und periphere arterielle Verschlusskrankheit.',
        },
        {
          frage: 'Was ist Mehlstaub, und hat er mit der Entstehung einer COPD zu tun?',
          antwort: 'Mehlstaub ist der feine, beim Sieben, Schütten und Kneten freigesetzte Getreidestaub, dem Bäcker und Müller ausgesetzt sind. Er kann eine allergische Bäckerasthma-Erkrankung auslösen und gehört als chronische inhalative Belastung zu den beruflichen Risikofaktoren für eine chronische Bronchitis und eine COPD; beides ist als Berufskrankheit anerkennungsfähig.',
        },
        {
          frage: 'Welche Röntgenzeichen erwarten Sie?',
          antwort: 'Zeichen der Überblähung: einen Zwerchfelltiefstand mit abgeflachten Zwerchfellkuppeln, verbreiterte Interkostalräume, einen Fassthorax, eine vermehrte Strahlentransparenz und ein schmales Tropfenherz, gegebenenfalls Bullae. Zugleich dient die Aufnahme dem Ausschluss von Pneumonie, Pneumothorax, Erguss und Bronchialkarzinom.',
        },
        {
          frage: 'Muss unbedingt ein CT durchgeführt werden?',
          antwort: 'Für die Diagnose der COPD nicht — sie wird durch die Lungenfunktion gestellt. Bei einem langjährigen Raucher mit Gewichtsverlust oder Hämoptysen ist die Computertomographie des Thorax jedoch indiziert, weil ein kleines oder zentral gelegenes Bronchialkarzinom im Röntgenbild verborgen bleiben kann; sie zeigt außerdem Ausmaß und Typ des Emphysems und mögliche Bronchiektasen.',
        },
        {
          frage: 'Wie behandeln Sie die akute Exazerbation?',
          antwort: 'Sitzende Lagerung und Monitoring, kontrollierte Sauerstoffgabe mit Zielsättigung 88 bis 92 Prozent, vernebelte kurzwirksame Bronchodilatatoren — Salbutamol kombiniert mit Ipratropiumbromid —, Prednisolon 40 mg über fünf Tage sowie bei purulentem Auswurf eine Antibiotikatherapie über fünf bis sieben Tage. Bei respiratorischer Azidose mit einem pH unter 7,35 eine nicht-invasive Beatmung.',
        },
        {
          frage: 'Warum darf man nicht einfach viel Sauerstoff geben?',
          antwort: 'Weil der chronisch hyperkapnische Patient seinen Atemantrieb überwiegend über den Sauerstoffmangel steuert. Eine unkontrollierte Sauerstoffgabe dämpft diesen Antrieb, hebt zusätzlich die hypoxische pulmonale Vasokonstriktion auf und verstärkt über den Haldane-Effekt den CO2-Anstieg — bis zur CO2-Narkose mit Somnolenz und Koma. Deshalb Zielsättigung 88 bis 92 Prozent und Blutgaskontrolle nach 30 bis 60 Minuten.',
        },
        {
          frage: 'Wonach richtet sich die medikamentöse Dauertherapie?',
          antwort: 'Nach der Symptomlast, gemessen mit der mMRC-Skala und dem CAT-Fragebogen, und nach der Exazerbationsrate des letzten Jahres — also nach den Gruppen A, B und E. Gruppe A erhält einen langwirksamen Bronchodilatator, Gruppe B die duale Bronchodilatation mit LAMA und LABA, Gruppe E ebenfalls LAMA und LABA, bei Eosinophilen über 300 pro Mikroliter ergänzt um ein inhalatives Kortikosteroid.',
        },
        {
          frage: 'Welche Maßnahme beeinflusst den Krankheitsverlauf am stärksten?',
          antwort: 'Der Rauchstopp — er ist die einzige Maßnahme, die den beschleunigten Abfall des FEV1 bremst. Lebensverlängernd wirken darüber hinaus nur die Langzeit-Sauerstofftherapie bei chronischer Hypoxämie und die außerklinische nicht-invasive Beatmung bei chronischer Hyperkapnie.',
        },
        {
          frage: 'Wann verordnen Sie eine Langzeit-Sauerstofftherapie?',
          antwort: 'Bei einem im stabilen Zustand wiederholt gemessenen pO2 von höchstens 55 mmHg oder von höchstens 60 mmHg, wenn ein Cor pulmonale oder eine sekundäre Polyglobulie besteht. Sie muss mindestens 16 Stunden täglich angewendet werden, und der Patient muss das Rauchen eingestellt haben.',
        },
        {
          frage: 'Welche Komplikationen erwarten Sie im Verlauf?',
          antwort: 'Rezidivierende Exazerbationen und Pneumonien, die respiratorische Insuffizienz mit Hyperkapnie, die pulmonale Hypertonie mit Cor pulmonale und Rechtsherzinsuffizienz, einen Pneumothorax bei rupturierter Bulla, eine sekundäre Polyglobulie, Osteoporose, Kachexie und Muskelschwund sowie Depression und Angststörung. Außerdem ist das Risiko für ein Bronchialkarzinom deutlich erhöht.',
        },
        {
          frage: 'Welche Impfungen empfehlen Sie einem COPD-Patienten?',
          antwort: 'Die jährliche Influenzaimpfung, die Pneumokokkenimpfung, die COVID-19-Impfung und eine Auffrischung gegen Pertussis; ab dem 60. Lebensjahr zusätzlich die Impfung gegen Herpes zoster.',
        },
        {
          frage: 'Der Patient hat eine COPD als Nebendiagnose — hat er zurzeit Beschwerden deswegen?',
          antwort: 'Das muss man aktiv erfragen. Husten und Auswurf können seit Jahren unverändert bestehen; erst wenn Dyspnoe, Sputummenge oder Sputumpurulenz akut zunehmen, also die Anthonisen-Kriterien erfüllt sind, liegt eine Exazerbation vor. Unveränderte chronische Symptome bedeuten keine akute Verschlechterung.',
        },
      ],
      merksatz: 'COPD = AHA (Auswurf, Husten, Atemnot) beim Raucher, bewiesen durch FEV1/FVC < 0,7 NACH Bronchospasmolyse — nur teilreversibel, das trennt sie vom Asthma. Sauerstoff nur bis 88–92 % Sättigung, ICS nur bei Exazerbationen mit Eosinophilie, und lebensverlängernd sind allein Rauchstopp, Langzeit-Sauerstoff und NIV.',
      linkedCaseIds: [
        'case-copd',
      ],
      keyFachbegriffeIds: [],
      linkedAufklaerungIds: [
        'auf-roentgen-thorax',
        'auf-ct',
        'auf-bronchoskopie',
      ],
    },
  ];
}
