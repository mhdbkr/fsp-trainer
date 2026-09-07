// ============================================================================
// EXTRAIT DE RÉFÉRENCE POUR L'AUTHORING — NE PAS IMPORTER, NE PAS MODIFIER.
// Généré par scripts/makeStyleSample.py (cas de référence : case-gicht).
//
// Remplace la lecture de seedCases.ts + seedFachwissen.ts + caseMuster.ts
// (~1,5 Mo), qui faisait caler les agents d'authoring : ils épuisaient leur
// contexte en lecture avant de produire quoi que ce soit.
// ============================================================================

// ---------- 1) UN CAS COMPLET (seedCases.ts) ----------
{
      id: 'case-gicht',
      name: 'Akuter Gichtanfall',
      pathology: 'Gichtarthritis (akuter Gichtanfall)',
      specialty: 'Rheumatologie',
      centers: [
        'Karlsruhe',
        'Reutlingen',
        'Freiburg',
        'Stuttgart',
      ],
      frequency: 22,
      difficulty: 2,
      patientSheet: {
        personalia: {
          name: 'Hans Hedgke',
          age: 45,
          geschlecht: 'm',
          groesseCm: 172,
          gewichtKg: 114,
          beruf: 'Maschinenschlosser',
          hausarzt: 'Dr. Wagner',
          familienstand: 'verheiratet',
          wohnsituation: 'mit Ehefrau und zwei Kindern, Wohnung im 2. Stock ohne Aufzug',
        },
        leitsymptome: [
          'Seit zwei Tagen plötzlich, in der Nacht aus dem Schlaf heraus aufgetretene, extrem starke Schmerzen im linken Großzehengrundgelenk (Intensität 8/10), aufgetreten nach einer Geburtstagsfeier mit viel Fleisch, Wurst, Bier und Schnaps',
        ],
        begleitsymptome: [
          'deutliche Schwellung, Rötung und Überwärmung des linken Großzehengrundgelenks',
          'extreme Berührungsempfindlichkeit — selbst die Bettdecke und der Schuh sind nicht auszuhalten',
          'Bewegungseinschränkung: kann den Fuß nicht aufsetzen, hinkt, kann weder Auto fahren noch die Treppe in den 2. Stock steigen',
          'schmerzbedingte Ein- und Durchschlafstörung seit zwei Nächten',
        ],
        schmerz: {
          ort: 'linkes Großzehengrundgelenk (Großzehe innen am Fußballen)',
          charakter: 'pochend, pulsierend, stechend-brennend',
          intensitaet: 8,
          ausstrahlung: 'keine, der Schmerz bleibt auf die Großzehe und den Fußballen begrenzt',
          beginn: 'vor zwei Tagen, plötzlich in der Nacht gegen drei Uhr, aus dem Schlaf heraus',
          verlauf: 'seitdem dauerhaft vorhanden, in der Nacht am stärksten, nicht anfallsartig unterbrochen',
          verstaerker: 'Auftreten, Gehen, Belastung, Berührung (Bettdecke, Socke, Schuh)',
          linderer: 'Ruhe, Hochlagern, Kühlen mit einem feuchten Tuch; Ibuprofen 600 mg hat den Schmerz nur dumpfer gemacht',
        },
        vegetativeAnamnese: [
          'seit zwei Nächten schmerzbedingte Ein- und Durchschlafstörung',
          'guter, eher gesteigerter Appetit, sehr fleischbetonte Ernährung',
          'sonst vegetative Anamnese unauffällig',
        ],
        negativeFindings: [
          'kein Fieber (zuletzt 37,1 °C gemessen), kein Schüttelfrost, kein Nachtschweiß (gegen septische Arthritis und Erysipel)',
          'kein Trauma, kein Umknicken, kein Sturz auf den Fuß (gegen Fraktur oder Distorsion)',
          'keine weiteren betroffenen Gelenke, kein wandernder Gelenkbefall, kein symmetrischer Befall der Fingergrundgelenke (gegen rheumatoide Arthritis)',
          'keine Morgensteifigkeit über wenige Minuten hinaus (gegen entzündlich-rheumatische Systemerkrankung)',
          'keine Schuppenflechte, keine Hautknötchen an Ohrmuschel oder Ellenbogen, keine offenen Hautstellen oder Eintrittspforte (gegen Psoriasisarthritis, Tophi, Erysipel)',
          'kein Durchfall, keine Bindehautentzündung, kein Brennen beim Wasserlassen, keine Mund- oder Genitalgeschwüre in den letzten Wochen (gegen reaktive Arthritis)',
          'kein Kribbeln, kein Taubheitsgefühl, keine Lähmung am Fuß',
          'keine Wadenschwellung, keine belastungsabhängigen Wadenschmerzen mit reproduzierbarer Gehstrecke (gegen TVT und pAVK)',
          'keine Nierensteine oder Nierenkoliken in der Vorgeschichte, keine Blutbeimengung im Urin',
          'kein ungewollter Gewichtsverlust, keine Leistungsminderung, keine bekannte Tumorerkrankung',
          'keine Auslandsreise in den letzten Monaten, kein Zeckenstich',
        ],
        vorerkrankungen: [
          'arterielle Hypertonie seit etwa acht Jahren',
          'Adipositas Grad II (114 kg bei 1,72 m, BMI ca. 38,5)',
          'Migräne seit etwa 20 Jahren, seit dem Motorradunfall',
          'Zustand nach Commotio cerebri bei Motorradunfall vor 20 Jahren (konservativ behandelt); bei diesem Unfall verstarb die damalige Freundin, die hinten mitfuhr — anschließend längere psychotherapeutische Behandlung wegen belastender Erinnerungen und niedergedrückter Stimmung',
          'vor etwa einem Jahr einmalig eine selbstlimitierende schmerzhafte Schwellung derselben Großzehe über wenige Tage, damals kein Arztbesuch',
        ],
        voroperationen: [
          'keine Operationen; nach dem Motorradunfall vor 20 Jahren zweiwöchige stationäre Behandlung, jedoch ohne Eingriff',
        ],
        medikamente: [
          'Bisoprolol 5 mg 1-0-0 (gegen den Bluthochdruck)',
          'Ramipril/Hydrochlorothiazid 5/12,5 mg 1-0-0, seit etwa drei Monaten vom Hausarzt zusätzlich angesetzt',
          'Ibuprofen 600 mg bei Bedarf, in den letzten zwei Tagen mehrfach eingenommen',
          'Sumatriptan 50 mg bei Bedarf bei Migräneattacken (etwa einmal im Monat)',
        ],
        allergien: [
          'keine bekannt',
        ],
        unvertraeglichkeiten: [
          'keine bekannt',
        ],
        noxen: {
          tabak: 'Nichtraucher, hat nie geraucht',
          alkohol: 'täglich zwei Flaschen Bier, an Wochenenden und Feiern mehr, dazu Schnaps; in belastenden Phasen deutlich mehr',
          drogen: 'verneint',
        },
        familienanamnese: [
          'Vater im Alter von 67 Jahren an einem Kolonkarzinom verstorben',
          'Bruder im Alter von 37 Jahren an einem Pankreaskarzinom verstorben',
          'Mutter im Alter von 76 Jahren verstorben, litt an Bluthochdruck und Diabetes mellitus',
          'ein Onkel väterlicherseits hatte Gicht',
          'keine Nierensteine und keine rheumatischen Erkrankungen in der Familie bekannt',
        ],
        sozialanamnese: [
          'verheiratet, zwei Kinder: ein Sohn (12 Jahre) und eine Tochter (8 Jahre) mit Trisomie 21',
          'Maschinenschlosser in einem mittelständischen Betrieb, überwiegend stehende Tätigkeit mit schwerem Heben; derzeit wegen der Schmerzen arbeitsunfähig',
          'wohnt mit der Familie in einer Wohnung im 2. Stock ohne Aufzug',
          'kein Sport, sehr fleischbetonte Ernährung',
          'Familienhund, mit dem er derzeit nicht spazieren gehen kann',
        ],
        antworten: {
          'pers-name': 'Hedgke, Hans Hedgke. H-e-d-g-k-e.',
          'pers-alter': 'Ich bin 45 Jahre alt.',
          'pers-groesse': 'Ich bin 1,72 m groß und wiege 114 Kilo. Ja, ich weiß, das ist zu viel.',
          'pers-beruf': 'Ich bin Maschinenschlosser. Ich stehe den ganzen Tag und hebe viel Schweres; mit besonderen Chemikalien habe ich nichts zu tun. Im Moment kann ich gar nicht arbeiten.',
          'pers-hausarzt': 'Ja, mein Hausarzt ist Dr. Wagner.',
          'akt-motiv': 'Herr Doktor, mein linker großer Zeh — das halte ich nicht mehr aus. Seit vorgestern Nacht tut der so weh, dass ich nicht mehr auftreten kann.',
          'akt-ort': 'Hier, ganz vorne am linken Fuß, am großen Zeh, da wo er am Ballen ansetzt. (zeigt vorsichtig auf das Großzehengrundgelenk, ohne es zu berühren)',
          'akt-beginn': 'Seit vorgestern. Es kam ganz plötzlich, mitten in der Nacht, so gegen drei Uhr — ich bin von den Schmerzen aufgewacht.',
          'akt-charakter': 'Es pocht und pulsiert, und dazu ist es stechend und brennend. Als ob der Zeh platzen würde.',
          'akt-intensitaet': '8 von 10. Nachts eher 10.',
          'akt-ausstrahlung': 'Nein, das bleibt genau da, im Zeh und im Ballen. Es strahlt nirgendwo hin.',
          'akt-verlauf': 'Es ist die ganze Zeit da, Tag und Nacht, ohne Pause. Nachts ist es am schlimmsten.',
          'akt-ausloeser': 'Am Abend davor war ich auf einer Geburtstagsfeier — da gab es viel Fleisch und Wurst, ich habe ordentlich Bier getrunken und ein paar Schnäpse dazu. In der Nacht ging es dann los. Gestürzt oder umgeknickt bin ich nicht.',
          'akt-einfluss': 'Schlimmer wird es, sobald ich auftrete oder den Fuß bewege — und wenn irgendetwas den Zeh berührt. Nicht einmal die Bettdecke halte ich aus, den Schuh bekomme ich gar nicht an, ich bin in Pantoffeln gekommen. Besser wird es, wenn ich den Fuß hochlege und kühle. Ibuprofen 600 habe ich mehrmals genommen, die Schmerzen sind davon nur dumpfer geworden, weg sind sie nicht.',
          'akt-frueher': 'So schlimm noch nie. Aber vor etwa einem Jahr war derselbe Zeh schon mal ein paar Tage dick und schmerzhaft, das ist von allein wieder weggegangen. Beim Arzt war ich deswegen nicht.',
          'akt-begleit': 'Der Zeh ist dick geschwollen, richtig rot und heiß — man sieht das schon von Weitem. Ich kann den Fuß nicht aufsetzen, ich hinke, und Auto fahren geht auch nicht. Sonst ist mir nichts aufgefallen.',
          'veg-fieber': 'Nein, Fieber habe ich nicht, ich habe gemessen: 37,1. Im Ausland war ich in letzter Zeit auch nicht.',
          'veg-schuettelfrost': 'Nein, Schüttelfrost habe ich nicht, und Nachtschweiß auch nicht.',
          'veg-uebelkeit': 'Nein, übel ist mir nicht, erbrochen habe ich nicht.',
          'veg-ausscheidung': 'Nein, Stuhlgang und Wasserlassen sind ganz normal. Blut im Urin hatte ich nie, Nierensteine auch nicht.',
          'veg-gewicht': 'Nein, mein Gewicht ist leider ziemlich stabil — stabil hoch. Abgenommen habe ich nicht.',
          'veg-appetit': 'Der Appetit ist gut, fast zu gut. Ich esse gerne Fleisch und Wurst, jeden Tag.',
          'veg-schlaf': 'Die letzten zwei Nächte habe ich wegen der Schmerzen kaum geschlafen. Sonst schlafe ich eigentlich normal.',
          'vor-erkrank': 'Ich habe hohen Blutdruck, seit ungefähr acht Jahren. Und Migräne, die habe ich seit etwa zwanzig Jahren, seit dem Motorradunfall damals — ich hatte eine Gehirnerschütterung, zwei Wochen Krankenhaus, operiert wurde nichts. (schneller, beiläufig) Bei dem Unfall ist meine damalige Freundin gestorben, sie saß hinten drauf. Ich war danach eine Zeit lang in Therapie. Naja. Und dann eben das Gewicht.',
          'vor-op': 'Nein, operiert wurde ich noch nie.',
          'vor-krankenhaus': 'In letzter Zeit nicht. Das letzte Mal war vor zwanzig Jahren nach dem Unfall, zwei Wochen.',
          'med-regelmaessig': 'Für den Blutdruck nehme ich Bisoprolol 5 Milligramm morgens, und seit etwa drei Monaten noch eine zweite Tablette dazu, Ramipril mit einer Wassertablette drin — der Hausarzt hat sie angesetzt, weil der Druck nicht runterging.',
          'med-blutverduenner': 'Nein, Blutverdünner oder Kortison nehme ich nicht.',
          'med-otc': 'Ibuprofen 600 aus der Apotheke, in den letzten zwei Tagen mehrfach. Bei Migräne nehme ich Sumatriptan, ungefähr einmal im Monat. Pflanzliche Mittel oder Vitamine nehme ich keine.',
          'all-allergie': 'Nein, allergisch bin ich gegen nichts, weder gegen Medikamente noch gegen Lebensmittel.',
          'all-unvertraeglich': 'Nein, ich vertrage alles. Milch, Brot — da habe ich keine Probleme.',
          'nox-rauchen': 'Nein, geraucht habe ich noch nie.',
          'nox-alkohol': '(zögert) Naja … zwei Flaschen Bier am Abend, jeden Tag. Am Wochenende und auf Feiern auch mehr, dann kommt Schnaps dazu. (leiser, wenn nachgefragt wird) Und wenn mir was im Kopf herumgeht, wird es auch mal mehr. Das gehört bei uns irgendwie dazu.',
          'nox-drogen': 'Nein, Drogen nehme ich nicht, auch kein Cannabis.',
          'fam-familie': 'Mein Vater ist mit 67 an Darmkrebs gestorben, mein Bruder mit nur 37 an Bauchspeicheldrüsenkrebs. Meine Mutter hatte hohen Blutdruck und Zucker. Ein Onkel von mir, väterlicherseits, hatte Gicht.',
          'fam-eltern': 'Beide sind verstorben. Mein Vater mit 67 an Darmkrebs, meine Mutter mit 76 — sie hatte Bluthochdruck und Diabetes.',
          'fam-stand': 'Ich bin verheiratet und habe zwei Kinder, einen Sohn von zwölf und eine Tochter von acht. Meine jüngste Tochter hat das Down-Syndrom. Wir kommen gut zurecht, aber es ist schon viel Organisation.',
          'fam-beruf': 'Maschinenschlosser, wie gesagt. Ich stehe den ganzen Tag und hebe schwer, und es ist oft hektisch. Im Moment bin ich krankgeschrieben, ich kann ja nicht auftreten.',
          'fam-wohnen': 'Wir wohnen zu viert in einer Wohnung im zweiten Stock, ohne Aufzug. Die Treppe ist gerade ein echtes Problem.',
          'fam-haustiere': 'Ja, wir haben einen Hund. Gassi gehen kann ich im Moment gar nicht, das macht meine Frau.',
          'fach-rheuma-gelenke': 'Nur dieses eine Gelenk, der linke große Zeh. Sonst tut mir nichts weh, und es wandert auch nicht von Gelenk zu Gelenk.',
          'fach-rheuma-morgensteifigkeit': 'Steif sind meine Gelenke morgens eigentlich nicht. Der Zeh tut morgens weh, aber das ist der Schmerz, keine Steifigkeit — nach ein paar Minuten ist das nicht anders als sonst.',
          'fach-rheuma-entzuendung': 'Ja, alles davon: geschwollen, knallrot und richtig heiß. Und anfassen — nein, bitte nicht. Ich halte nicht mal die Bettdecke darauf aus.',
          'fach-rheuma-verlauf': 'Ganz plötzlich, wie ein Anfall. Ich bin nachts davon aufgewacht, vorher war überhaupt nichts. Das hat sich nicht über Wochen entwickelt.',
          'fach-rheuma-ausloeser': 'Ja — am Abend vorher war die Geburtstagsfeier mit viel Fleisch, Wurst, Bier und Schnaps. Gefastet habe ich nicht. Und eine neue Tablette habe ich schon: seit drei Monaten die Blutdrucktablette mit der Wassertablette drin.',
          'fach-rheuma-haut': 'Nein, Schuppenflechte habe ich nicht, und Knötchen unter der Haut oder an den Ohren sind mir nie aufgefallen. Offene Stellen oder eine Verletzung am Fuß habe ich auch nicht.',
          'fach-rheuma-systemisch': 'Nein, nichts davon. Kein Fieber, keine entzündeten Augen, keine Geschwüre im Mund oder unten herum, keinen Durchfall und keine Bindehautentzündung — auch nicht in den letzten Wochen.',
          'fach-rheuma-vorgeschichte': 'So einen Anfall hatte ich in der Form noch nie, nur vor etwa einem Jahr war derselbe Zeh ein paar Tage dick. Nierensteine hatte ich nie und rheumatische Erkrankungen sind in der Familie nicht bekannt — aber ein Onkel von mir hatte Gicht.',
        },
        schwierigeReaktionen: [
          '"Was habe ich denn jetzt? Ist das was Schlimmes?"',
          '"Muss ich deswegen im Krankenhaus bleiben? Ich muss doch arbeiten."',
          '(auf die Empfehlung abzunehmen) "Sie wissen doch noch gar nicht sicher, was ich habe — und jetzt soll ich gleich abnehmen?"',
          '(auf die Frage nach dem Alkohol) "Zwei Bier am Abend, das ist doch normal, oder? Das trinkt bei uns jeder."',
          '(nach dem Unfall, falls das Thema aufgegriffen wird, leise) "Sie saß hinten drauf. Ich habe damals gefahren."',
        ],
        persona: 'Tu es Hans Hedgke, 45 ans, serrurier-mécanicien, costaud et bourru, un peu gêné par ton poids et ta consommation de bière. Tu souffres énormément : tu grimaces dès qu\'on parle de toucher ton pied, tu es venu en pantoufle. Tu parles vite et tu donnes volontiers plusieurs informations dans la même phrase. Tu minimises l\'alcool au début (« nur ein, zwei Bier ») et tu n\'avoues les quantités réelles que si le médecin insiste sans te juger. Point clé : quand tu racontes ton accident de moto, tu glisses très vite, presque en passant, que ta petite amie de l\'époque, assise derrière toi, est morte — puis tu enchaînes aussitôt sur autre chose. Si le médecin s\'arrête, pose son stylo et montre de l\'empathie, tu t\'ouvres : les souvenirs, la culpabilité, le fait que tu manges et bois parfois pour ne plus y penser, la psychothérapie d\'alors. S\'il ne réagit pas, tu n\'en reparles plus. Tu dis toi-même « meine jüngste Tochter hat das Down-Syndrom » — sans pathos, c\'est ta fille et tu l\'aimes.',
      },
      medicalView: {
        verdachtsdiagnose: 'Akuter Gichtanfall (Arthritis urica) des Großzehengrundgelenks links — Podagra bei Hyperurikämie, ausgelöst durch eine purin- und alkoholreiche Mahlzeit sowie durch das seit drei Monaten eingenommene Thiaziddiuretikum',
        differenzialdiagnosen: [
          {
            dd: 'Septische (bakterielle) Arthritis',
            unterscheidung: 'Muss zwingend ausgeschlossen werden — die klinische Unterscheidung allein ist unmöglich! Meist Fieber, Schüttelfrost, reduzierter Allgemeinzustand, Eintrittspforte, deutlich erhöhtes CRP und Procalcitonin. Beweis über die Gelenkpunktion: Zellzahl > 50 000/µl, Granulozytose, Gramfärbung und Kultur. Hier: kein Fieber (37,1 °C), keine Eintrittspforte, guter Allgemeinzustand — dennoch punktieren.',
          },
          {
            dd: 'Pseudogicht (Chondrokalzinose, CPPD-Arthritis)',
            unterscheidung: 'Bevorzugt Knie und Handgelenk, seltener das MTP-I; höheres Lebensalter. Im Röntgen Verkalkung des Faserknorpels; im Punktat rhomboide, positiv doppelbrechende Kalziumpyrophosphat-Kristalle statt nadelförmiger, negativ doppelbrechender Uratkristalle.',
          },
          {
            dd: 'Aktivierte Arthrose des Großzehengrundgelenks (Hallux rigidus/valgus)',
            unterscheidung: 'Chronischer, langsam progredienter Belastungs- und Anlaufschmerz über Monate bis Jahre, Bewegungseinschränkung ohne dramatische Rötung und Überwärmung; kein nächtlich-perakuter Beginn und keine Auslöseanamnese.',
          },
          {
            dd: 'Erysipel / Weichteilinfektion des Vorfußes',
            unterscheidung: 'Flächige, scharf begrenzte, überwärmte Rötung, die über das Gelenk hinausreicht, meist mit Fieber, Schüttelfrost, Lymphangitis und einer Eintrittspforte (Rhagade, Interdigitalmykose); das Gelenk selbst ist passiv frei beweglich.',
          },
          {
            dd: 'Reaktive Arthritis (Morbus Reiter)',
            unterscheidung: 'Ein bis vier Wochen nach gastrointestinalem oder urogenitalem Infekt, meist Oligoarthritis der unteren Extremität, häufig mit Konjunktivitis und Urethritis; hier anamnestisch kein vorangegangener Infekt, keine Augen- oder Harnwegssymptome.',
          },
          {
            dd: 'Rheumatoide Arthritis (Erstmanifestation) bzw. Psoriasisarthritis',
            unterscheidung: 'Symmetrischer Befall mehrerer kleiner Gelenke (MCP, PIP), Morgensteifigkeit über 60 Minuten, schleichender Beginn über Wochen; bei Psoriasisarthritis Hautbefund und Daktylitis. Hier monoartikulär, perakut, keine Morgensteifigkeit, keine Hautveränderungen.',
          },
          {
            dd: 'Trauma (Fraktur, Distorsion) oder Weichteilläsion',
            unterscheidung: 'Adäquates Trauma in der Anamnese, Hämatom, Druckschmerz über dem Knochen; hier ausdrücklich kein Sturz und kein Umknicken. Röntgen zur Abgrenzung.',
          },
        ],
        diagnostik: [
          {
            stufe: 'Anamnese/Klinik',
            text: 'Gezielte Anamnese: perakuter nächtlicher Beginn, Monarthritis des MTP-I, Auslöser (purinreiche Mahlzeit, Bier/Schnaps, Fasten, neu angesetztes Thiaziddiuretikum), frühere selbstlimitierende Episoden, Fieber als Warnsignal',
          },
          {
            stufe: 'Anamnese/Klinik',
            text: 'Vitalparameter (Temperatur, Blutdruck, Puls) und Erhebung von Größe, Gewicht und BMI (hier 114 kg bei 1,72 m, BMI ca. 38,5)',
          },
          {
            stufe: 'Anamnese/Klinik',
            text: 'Lokaler Gelenkstatus: Inspektion und Palpation mit den klassischen Entzündungszeichen Rubor, Calor, Tumor, Dolor und Functio laesa; Prüfung der Beweglichkeit, Suche nach einer Eintrittspforte, Beurteilung von Durchblutung, Motorik und Sensibilität',
          },
          {
            stufe: 'Anamnese/Klinik',
            text: 'Ganzkörperlicher Gelenkstatus und Suche nach Tophi (Ohrmuschel/Helix, Olecranon, Achillessehne, Fingerstreckseiten)',
          },
          {
            stufe: 'Labor',
            text: 'Harnsäure im Serum — Cave: im akuten Anfall in bis zu einem Drittel der Fälle normal; eine normale Harnsäure schließt einen Gichtanfall NICHT aus. Kontrolle zwei bis vier Wochen nach dem Anfall',
          },
          {
            stufe: 'Labor',
            text: 'Entzündungsparameter: CRP, BSG, Blutbild mit Differenzialblutbild (Leukozytose) sowie Procalcitonin zum Ausschluss einer bakteriellen Genese',
          },
          {
            stufe: 'Labor',
            text: 'Nierenwerte (Kreatinin, Harnstoff, eGFR) und Urinstatus — entscheidend für die Auswahl von NSAR bzw. Colchicin und wegen der Uratnephropathie; ergänzend Harnsäureausscheidung im 24-Stunden-Urin (Über-Produzierer vs. Unter-Ausscheider)',
          },
          {
            stufe: 'Labor',
            text: 'Metabolisches Begleitscreening: Nüchternblutzucker/HbA1c, Lipidstatus, Leberwerte (auch als Ausgangswert vor einer Allopurinol-Therapie)',
          },
          {
            stufe: 'Apparativ & Bildgebung',
            text: 'Arthrosonographie des Großzehengrundgelenks: Gelenkerguss, Synovitis und das typische Doppelkontur-Zeichen (Uratablagerung auf dem Gelenkknorpel)',
          },
          {
            stufe: 'Apparativ & Bildgebung',
            text: 'Röntgen des linken Vorfußes in zwei Ebenen: im akuten Anfall meist nur Weichteilschwellung; gelenknahe Stanzdefekte (Lochdefekte, „overhanging edge“) erst bei chronischer Gicht — zugleich Ausschluss von Fraktur und Arthrose',
          },
          {
            stufe: 'Apparativ & Bildgebung',
            text: 'Sonographie der Nieren und ableitenden Harnwege zum Ausschluss von Harnsäuresteinen und einer Nephropathie; ergänzend ggf. Dual-Energy-CT zum direkten Nachweis von Uratdepots',
          },
          {
            stufe: 'Invasiv & Speziell',
            text: 'Gelenkpunktion mit Synovia-Analyse — Goldstandard: Polarisationsmikroskopie mit Nachweis nadelförmiger, negativ doppelbrechender Natriumuratkristalle (intra- und extrazellulär); zusätzlich Zellzahl, Gramfärbung und mikrobiologische Kultur zum sicheren Ausschluss einer septischen Arthritis',
          },
        ],
        therapie: [
          {
            label: 'Akuttherapie des Gichtanfalls',
            akut: true,
            items: [
              'sofortige Ruhigstellung, Hochlagerung und lokale Kühlung des linken Fußes, Entlastung an Unterarmgehstützen, Bettbügel gegen den Druck der Bettdecke',
              'NSAR in ausreichender Dosis als Mittel der ersten Wahl, z. B. Naproxen 2 × 500 mg oder Ibuprofen 3 × 800 mg unter Magenschutz mit einem Protonenpumpenhemmer — bei diesem Patienten Nierenfunktion abwarten, da er ein ACE-Hemmer-/Diuretika-Kombinationspräparat einnimmt (Triple-Whammy-Risiko)',
              'Colchicin als Alternative oder bei NSAR-Kontraindikation: 1 mg initial, nach einer Stunde 0,5 mg (Tageshöchstdosis 1,5 mg); Dosisreduktion bei Niereninsuffizienz, Cave Diarrhoe',
              'Glukokortikoide als gleichwertige und bei Kontraindikationen bevorzugte Option: Prednisolon 30–35 mg täglich über drei bis fünf Tage oral oder — nach Ausschluss einer Infektion — intraartikuläre Injektion',
              'reichliche Flüssigkeitszufuhr (mindestens 2 Liter täglich), strikte Alkoholkarenz während des Anfalls',
              'eine bereits laufende harnsäuresenkende Therapie wird im Anfall NICHT abgesetzt; eine neue wird erst nach Abklingen begonnen',
              'bei Fieber, Schüttelfrost oder reduziertem Allgemeinzustand: Gelenkpunktion mit Kultur und kalkulierte Antibiose bis zum Ausschluss einer septischen Arthritis',
            ],
          },
          {
            label: 'Nicht-medikamentöse Basismaßnahmen (Lebensstil und Ernährung)',
            items: [
              'purinarme Ernährung: deutliche Reduktion von Fleisch, Wurst, Innereien (Leber, Niere), Meeresfrüchten, Sardellen und Hefeextrakt',
              'konsequente Reduktion des Alkoholkonsums, insbesondere von Bier (purinreich durch Hefe) und Schnaps; Bier auch als alkoholfreie Variante purinreich',
              'Verzicht auf fruktosehaltige Softdrinks; Milchprodukte, Gemüse, Kaffee und Kirschen wirken günstig',
              'Trinkmenge mindestens 2 bis 3 Liter täglich zur Steigerung der Harnsäureausscheidung und Steinprophylaxe',
              'langsame, kontrollierte Gewichtsreduktion mit dem Ziel etwa 0,5 bis 1 kg pro Woche und Aufbau moderater Bewegung — Cave: Nulldiät, Fasten und zu rasche Gewichtsabnahme lösen durch Ketose und Laktatanstieg neue Anfälle aus',
              'Überprüfung der Dauermedikation: Umstellung des Thiaziddiuretikums, günstiger sind Losartan oder Amlodipin, die die Harnsäure senken bzw. neutral sind',
              'Behandlung des begleitenden metabolischen Risikos (Blutdruck, Blutzucker, Lipide); psychosoziale Anbindung — hier Gesprächs- bzw. Psychotherapie wegen der Verlusterfahrung nach dem Motorradunfall und des reaktiven Alkoholkonsums, ggf. Suchtberatung',
            ],
          },
          {
            label: 'Harnsäuresenkende Dauertherapie mit Anfallsprophylaxe',
            items: [
              'Indikation bei diesem Patienten gegeben: bereits zweiter Anfall, ausgeprägte Adipositas und Hyperurikämie — Beginn zwei bis vier Wochen nach Abklingen des akuten Anfalls',
              'Urikostatikum der ersten Wahl: Allopurinol, einschleichend mit 100 mg täglich, Steigerung alle zwei bis vier Wochen nach Harnsäurespiegel und Nierenfunktion, üblich 300 mg 1-0-0; Zielwert der Harnsäure unter 6 mg/dl, bei Tophi unter 5 mg/dl',
              'Alternative bei Unverträglichkeit oder unzureichender Wirkung: Febuxostat (Cave kardiovaskuläre Vorerkrankungen) oder das Urikosurikum Benzbromaron (nur bei guter Nierenfunktion und ausreichender Trinkmenge, nicht bei Nephrolithiasis)',
              'Anfallsprophylaxe in den ersten drei bis sechs Monaten der Harnsäuresenkung mit niedrig dosiertem Colchicin 0,5 mg täglich oder einem niedrig dosierten NSAR, da jede Spiegeländerung selbst einen Anfall auslösen kann',
              'Interaktionen beachten: Allopurinol darf nicht mit Azathioprin oder 6-Mercaptopurin kombiniert werden (Kumulationsgefahr); niedrig dosierte Acetylsalicylsäure erhöht die Harnsäure',
              'Verlaufskontrollen von Harnsäure, Kreatinin und Leberwerten; die Dauertherapie ist in der Regel lebenslang und wird auch im nächsten Anfall fortgeführt',
            ],
          },
        ],
        erstmassnahmen: [
          'Vitalparameter erheben, insbesondere Temperatur — Fieber lenkt sofort auf eine septische Arthritis',
          'Fuß entlasten, hochlagern und kühlen, Bettbügel anordnen, Untersuchung des Gelenks so schonend wie möglich',
          'sofortige Analgesie einleiten (NSAR unter Magenschutz bzw. Glukokortikoid) und Blut abnehmen: Blutbild, CRP, BSG, Procalcitonin, Harnsäure, Kreatinin, Blutzucker, Leberwerte',
          'Gelenkpunktion zum Kristallnachweis und zum Ausschluss einer bakteriellen Arthritis anmelden, Punktat in Polarisationsmikroskopie und Mikrobiologie schicken',
          'das Thiaziddiuretikum als möglichen Auslöser identifizieren und die antihypertensive Medikation überprüfen',
        ],
        notfall: false,
      },
      probableAufklaerungIds: [
        'auf-feinnadelpunktion',
        'auf-sonographie',
      ],
      caseSpecificQuestions: [
        'Was haben Sie am Abend vor den Beschwerden gegessen und getrunken — gab es eine Feier mit viel Fleisch, Bier oder Schnaps?',
        'Kam der Schmerz aus dem Schlaf heraus, und war das Gelenk am Morgen bereits rot und geschwollen?',
        'Können Sie das Gelenk überhaupt noch berühren — halten Sie die Bettdecke oder einen Schuh darauf aus?',
        'Ist außer der Großzehe noch ein anderes Gelenk betroffen, oder wandern die Beschwerden von Gelenk zu Gelenk?',
        'Haben Sie Fieber gemessen? Gibt es eine Verletzung, einen Insektenstich oder eine offene Stelle am Fuß?',
        'Hatten Sie so eine Episode schon einmal, und ist sie damals von allein wieder verschwunden?',
        'Wurde bei Ihnen in letzter Zeit eine neue Tablette angesetzt, insbesondere eine Wassertablette?',
        'Haben Sie in der letzten Zeit gefastet, eine Diät gemacht oder rasch Gewicht verloren?',
        'Sind bei Ihnen jemals Nierensteine aufgetreten, und gibt es in der Familie Gicht oder Nierensteine?',
      ],
      examinerQuestions: [
        'Wie lautet Ihre Verdachtsdiagnose, und was hat Sie zu dieser Diagnose geführt?',
        'Wie erklären Sie dem Patienten den Begriff „Arthritis urica“ auf Deutsch? Was bedeutet Podagra?',
        'Welche Differenzialdiagnosen kommen in Betracht, und warum sind sie bei diesem Patienten unwahrscheinlich?',
        'Welche Differenzialdiagnose müssen Sie unbedingt ausschließen, und wie machen Sie das?',
        'Welche diagnostischen Maßnahmen leiten Sie ein? Welcher Laborparameter ist bei der Gicht entscheidend?',
        'Kann der Harnsäurespiegel bei einem akuten Gichtanfall normal sein? Dürfen Sie einen Gichtanfall ausschließen, wenn die Harnsäure nicht erhöht ist?',
        'Welche Entzündungsparameter bestimmen Sie, und wozu dient das Procalcitonin?',
        'Was findet man in der Gelenkpunktion bzw. in der Pathologie bei der Gicht?',
        'Welche Risikofaktoren für einen Gichtanfall bestehen bei diesem Patienten konkret?',
        'Welche Lebensmittel sind purinreich, und welche Änderungen des Lebensstils empfehlen Sie?',
        'Wie behandeln Sie den akuten Anfall? Und wie sieht die Dauertherapie aus?',
        'Der Patient ist stark übergewichtig — sollte er abnehmen? Was kann eine zu rasche Gewichtsabnahme bewirken?',
        'Welche Komplikationen kann eine Hyperurikämie außer der Gicht haben?',
        'Warum würden Sie diesem Patienten eine Psychotherapie empfehlen?',
        'Klären Sie den Patienten in zwei Minuten über die Diagnose auf.',
      ],
      pruefungsfallen: [
        'Der Harnsäurespiegel kann im akuten Anfall NORMAL sein — ein normaler Wert schließt die Gicht nicht aus. Sowohl ein plötzlicher Anstieg als auch ein plötzlicher Abfall der Harnsäure kann einen Anfall auslösen. Diese Frage wurde in Karlsruhe und Reutlingen mehrfach gestellt.',
        'Die septische Arthritis nicht nur nennen, sondern aktiv ausschließen: die Gelenkpunktion mit Zellzahl, Gramfärbung und Kultur gehört zwingend in die Antwort.',
        'Bei der Therapie ausdrücklich die KORTIKOSTEROIDE nennen — ein Prüfer in Reutlingen wollte sie als stärkeres Analgetikum explizit hören; NSAR und Colchicin allein genügten ihm nicht.',
        '„Sollte er abnehmen?“ ist eine Fangfrage: ja, aber langsam — eine zu rasche Gewichtsabnahme oder Fasten kann durch Ketose einen neuen Anfall auslösen.',
        'Vor dem Patienten „Harnsäure“ sagen, nicht nur „Urat“, und „Arthritis urica“ in Alltagssprache übersetzen (Gicht, Gichtanfall; Podagra = Befall des Großzehengrundgelenks).',
        'Das Thiaziddiuretikum in der Dauermedikation als Auslöser übersehen — der Patient nennt es beiläufig als „Wassertablette“ in der Blutdrucktablette.',
        'Die Nierenfunktion vergessen: Kreatinin, Urinstatus und Nierensonographie gehören dazu (Uratnephropathie, Harnsäuresteine) — in Freiburg regelmäßig gefragt; außerdem steuert sie die Wahl zwischen NSAR und Colchicin.',
        'Der emotionale Fallstrick: Der Patient erwähnt beiläufig, dass bei seinem Motorradunfall die damalige Freundin ums Leben kam. Hier muss der Stift weggelegt und Empathie gezeigt werden („Das ist bestimmt nicht einfach für Sie“, „Wie kommen Sie damit klar?“) — daraus ergibt sich der Zusammenhang zwischen Verlusterfahrung, Alkoholkonsum und Essverhalten, den die Prüfer stark honorieren.',
        'Formulierungsfalle Trisomie 21: NICHT „die Tochter leidet an Down-Syndrom“ sagen, sondern „die Tochter hat das Down-Syndrom / eine Trisomie 21“ — dieser Fehler wurde von einem Prüfer ausdrücklich korrigiert.',
        'Der BMI von etwa 38,5 ist eine Adipositas Grad II und kein bloßes Übergewicht — bei 114 kg und 1,72 m nicht verharmlosen.',
        'Zeitmanagement: Die Dokumentation dauert nur 20 Minuten. Wenn Diagnostik und Therapie nicht mehr schriftlich geschafft werden, dies zu Beginn des Arzt-Arzt-Gesprächs offen ansagen und mündlich nachliefern — mehrere Kandidaten haben so bestanden.',
      ],
      examinerSheet: [
        {
          title: 'Verdachtsdiagnose und Begründung',
          interactions: [
            {
              frage: 'Herr Kollege, stellen Sie uns bitte den Patienten vor. Wie lautet Ihre Verdachtsdiagnose?',
              reaktion: 'Erwartet wird: akuter Gichtanfall (Arthritis urica) des Großzehengrundgelenks links, also eine Podagra. Begründung: perakuter nächtlicher Beginn, Monarthritis des MTP-I, alle fünf Entzündungszeichen, extreme Berührungsempfindlichkeit, typische Auslöser (Fleisch- und Bierexzess, Thiaziddiuretikum) und die Risikokonstellation aus männlichem Geschlecht, Adipositas Grad II und täglichem Bierkonsum.',
            },
            {
              frage: 'Wie nennen Sie „Arthritis urica“ dem Patienten gegenüber auf Deutsch?',
              reaktion: 'Gicht beziehungsweise Gichtanfall — eine Gelenkentzündung durch Harnsäurekristalle. Podagra heißt sie deshalb, weil das Großzehengrundgelenk befallen ist; ist das Knie befallen, spricht man von Gonagra, beim Daumengrundgelenk von Chiragra.',
            },
            {
              frage: 'Warum tritt der Schmerz gerade nachts auf?',
              reaktion: 'Nachts sinkt die Körpertemperatur im peripheren, gelenknahen Gewebe und der Flüssigkeitsgehalt des Gelenks nimmt ab — die Löslichkeit der Harnsäure fällt und Natriumuratkristalle fallen aus. Deshalb ist das kühle, peripher gelegene Großzehengrundgelenk der klassische Erstmanifestationsort.',
            },
          ],
        },
        {
          title: 'Differenzialdiagnosen',
          interactions: [
            {
              frage: 'Welche Differenzialdiagnosen kommen in Frage, und warum sind sie hier unwahrscheinlich?',
              reaktion: 'Septische Arthritis, Pseudogicht, aktivierte Arthrose/Hallux rigidus, Erysipel, reaktive Arthritis, rheumatoide Arthritis und ein Trauma. Gegen die meisten spricht der monoartikuläre, perakute Befall ohne Fieber, ohne Befall mehrerer Gelenke, ohne Morgensteifigkeit, ohne Trauma und ohne vorangegangenen Infekt.',
            },
            {
              frage: 'Welche dieser Diagnosen dürfen Sie auf keinen Fall übersehen, und wie schließen Sie sie aus?',
              reaktion: 'Die septische Arthritis — sie ist klinisch nicht sicher von der Gicht zu unterscheiden und zerstört das Gelenk innerhalb von Tagen. Ausschluss über die Gelenkpunktion mit Zellzahl, Gramfärbung und Kultur, dazu CRP, Leukozyten und Procalcitonin. Bis zum Ergebnis wird bei Verdacht kalkuliert antibiotisch behandelt.',
            },
            {
              frage: 'Wie grenzen Sie die Pseudogicht ab?',
              reaktion: 'Über den Kristallbefund: bei der Gicht nadelförmige, negativ doppelbrechende Natriumuratkristalle, bei der Pseudogicht rhomboide, positiv doppelbrechende Kalziumpyrophosphatkristalle. Zusätzlich anderes Befallsmuster (Knie, Handgelenk) und Knorpelverkalkungen im Röntgen.',
            },
          ],
        },
        {
          title: 'Diagnostik und Labor',
          interactions: [
            {
              frage: 'Welche diagnostischen Maßnahmen leiten Sie ein?',
              reaktion: 'Körperliche Untersuchung mit Vitalparametern und Gelenkstatus; Labor mit Harnsäure, CRP, BSG, Blutbild mit Differenzialblutbild, Procalcitonin, Kreatinin und Nierenwerten, Blutzucker, Lipiden und Leberwerten; Sonographie des Gelenks und der Nieren, Röntgen des Vorfußes in zwei Ebenen; als Goldstandard die Gelenkpunktion mit Polarisationsmikroskopie.',
            },
            {
              frage: 'Kann der Harnsäurespiegel im akuten Anfall normal sein? Dürfen Sie dann die Gicht ausschließen?',
              reaktion: 'Nein, ausschließen darf man sie nicht. In bis zu einem Drittel der akuten Anfälle ist die Harnsäure normal oder sogar erniedrigt, weil die Harnsäure gerade im Gelenk auskristallisiert. Sowohl ein plötzlicher Anstieg als auch ein plötzlicher Abfall des Spiegels kann den Anfall auslösen. Deshalb wird der Wert zwei bis vier Wochen nach dem Anfall kontrolliert.',
            },
            {
              frage: 'Wozu bestimmen Sie das Procalcitonin?',
              reaktion: 'Zur Abgrenzung einer bakteriellen Genese: Bei der Gicht sind CRP und Leukozyten oft deutlich erhöht, das Procalcitonin bleibt aber typischerweise normal, während es bei einer septischen Arthritis oder Sepsis ansteigt.',
            },
            {
              frage: 'Was findet man in der Gelenkpunktion?',
              reaktion: 'Ein trübes, entzündliches Punktat mit erhöhter Zellzahl und Granulozytose sowie im Polarisationsmikroskop nadelförmige, negativ doppelbrechende Natriumuratkristalle, teils intrazellulär in den Granulozyten phagozytiert. Gramfärbung und Kultur bleiben steril.',
            },
            {
              frage: 'Was erwarten Sie im Röntgen, und was zeigt der Ultraschall?',
              reaktion: 'Im akuten Anfall zeigt das Röntgen meist nur eine Weichteilschwellung; die typischen gelenknahen Stanzdefekte mit überhängendem Rand entstehen erst bei chronischer Gicht nach Jahren. Der Ultraschall kann früh das Doppelkontur-Zeichen und einen Erguss zeigen, ein Dual-Energy-CT weist Uratdepots direkt nach.',
            },
            {
              frage: 'Was würden Sie bei diesem Patienten außerdem untersuchen?',
              reaktion: 'Die Nieren: Kreatinin, eGFR, Urinstatus und eine Nierensonographie, weil eine Hyperurikämie zu Harnsäuresteinen und einer Uratnephropathie führt und die Nierenfunktion über die Auswahl von NSAR beziehungsweise Colchicin entscheidet.',
            },
          ],
        },
        {
          title: 'Risikofaktoren und Therapie',
          interactions: [
            {
              frage: 'Welche Risikofaktoren bestehen bei diesem Patienten konkret?',
              reaktion: 'Männliches Geschlecht, Alter 45 Jahre, Adipositas Grad II mit einem BMI von etwa 38,5, täglicher Bierkonsum von zwei Flaschen plus Schnaps, sehr fleisch- und wurstbetonte Ernährung, ein seit drei Monaten eingenommenes Thiaziddiuretikum, körperlich schwere Arbeit als Maschinenschlosser sowie eine psychische Belastung mit reaktivem Alkoholkonsum. Zusätzlich eine positive Familienanamnese (Onkel mit Gicht).',
            },
            {
              frage: 'Was sind purinreiche Lebensmittel?',
              reaktion: 'Innereien wie Leber und Niere, rotes Fleisch und Wurstwaren, Haut und Fleischbrühen, Sardellen, Sardinen, Hering, Meeresfrüchte, Hülsenfrüchte in größeren Mengen sowie Hefeextrakt. Bier ist doppelt ungünstig — es ist purinreich durch die Hefe und hemmt zusätzlich die Harnsäureausscheidung; das gilt auch für alkoholfreies Bier. Fruktosehaltige Softdrinks erhöhen die Harnsäure ebenfalls.',
            },
            {
              frage: 'Wie behandeln Sie den akuten Anfall?',
              reaktion: 'Ruhigstellung, Hochlagerung und Kühlung, dazu NSAR in ausreichender Dosis unter Magenschutz, alternativ Colchicin 1 mg initial und 0,5 mg nach einer Stunde, und — gleichwertig oder bei Kontraindikationen bevorzugt — Kortikosteroide, zum Beispiel Prednisolon 30 bis 35 mg über drei bis fünf Tage oder intraartikulär nach Ausschluss einer Infektion. Dazu reichlich Flüssigkeit und Alkoholkarenz.',
            },
            {
              frage: 'Und die Dauertherapie?',
              reaktion: 'Zwei bis vier Wochen nach dem Anfall Beginn einer harnsäuresenkenden Therapie mit dem Urikostatikum Allopurinol, einschleichend ab 100 mg bis meist 300 mg täglich, Zielwert unter 6 mg/dl; alternativ Febuxostat oder das Urikosurikum Benzbromaron. In den ersten drei bis sechs Monaten begleitend eine Anfallsprophylaxe mit niedrig dosiertem Colchicin. Dazu purinarme Kost, Alkoholreduktion, Gewichtsreduktion, Trinkmenge über zwei Liter und Umstellung des Thiaziddiuretikums, zum Beispiel auf Losartan.',
            },
            {
              frage: 'Der Patient ist stark übergewichtig. Sollte er abnehmen — und was kann eine Gewichtsabnahme bewirken?',
              reaktion: 'Ja, aber langsam und kontrolliert, etwa 0,5 bis 1 kg pro Woche. Eine zu rasche Gewichtsabnahme, eine Nulldiät oder Fasten führen über Ketonkörper und Laktat zu einer verminderten renalen Harnsäureausscheidung und können die Symptome verschlechtern beziehungsweise einen neuen Anfall auslösen.',
            },
            {
              frage: 'Welche Komplikationen kann eine Hyperurikämie außer der Gicht haben?',
              reaktion: 'Harnsäuresteine mit Nierenkoliken, die akute und chronische Uratnephropathie mit Niereninsuffizienz, Tophi in Weichteilen und Ohrmuschel, die chronische Gichtarthropathie mit Gelenkdestruktion sowie ein erhöhtes kardiovaskuläres Risiko im Rahmen des metabolischen Syndroms.',
            },
            {
              frage: 'Warum empfehlen Sie diesem Patienten eine Psychotherapie?',
              reaktion: 'Weil bei ihm der Alkoholkonsum reaktiv ist: Nach dem Motorradunfall vor 20 Jahren, bei dem seine damalige Freundin starb, bestehen Schuldgefühle und belastende Erinnerungen; er isst und trinkt nach eigener Aussage auch, um diese Gedanken zu bewältigen. Ohne Bearbeitung dieser Belastung sind Alkoholkarenz und Gewichtsreduktion — also die kausalen Maßnahmen — kaum umsetzbar.',
            },
            {
              frage: 'Muss der Patient stationär aufgenommen werden?',
              reaktion: 'In der Regel nicht — der unkomplizierte Gichtanfall wird ambulant behandelt. Eine stationäre Aufnahme wäre indiziert bei Verdacht auf eine septische Arthritis, bei polyartikulärem Befall mit reduziertem Allgemeinzustand, bei relevanter Niereninsuffizienz mit eingeschränkten Therapieoptionen oder bei nicht beherrschbaren Schmerzen.',
            },
          ],
        },
        {
          title: 'Aufklärung des Patienten (2 Minuten)',
          interactions: [
            {
              frage: 'Klären Sie den Patienten bitte über die Diagnose auf.',
              reaktion: 'Erwartet wird: Diagnose in Alltagssprache mitteilen („Sie haben einen Gichtanfall — eine Gelenkentzündung, weil sich Kristalle aus Harnsäure in Ihrem Zehengelenk abgelagert haben“), die typischen nächtlichen Schmerzattacken erklären, beruhigen („Wir haben sehr wirksame Medikamente, die Beschwerden gehen in wenigen Tagen deutlich zurück“), die Untersuchungen ankündigen (Blutabnahme, Ultraschall, Röntgen, Gelenkpunktion) und die Vorbeugung weiterer Anfälle betonen (weniger Fleisch und Bier, viel trinken, langsam abnehmen, Umstellung der Blutdrucktablette). Rückfragen zulassen und die Aufklärung mit einer Rückversicherung abschließen.',
            },
            {
              frage: '(als Patient) Muss ich denn im Krankenhaus bleiben? Ich muss doch arbeiten.',
              reaktion: 'Erwartet wird eine patientengerechte Antwort: In den allermeisten Fällen kann die Gicht ambulant behandelt werden; für einige Tage ist jedoch eine Krankschreibung nötig, weil der Fuß entlastet werden muss. Nur wenn sich in der Gelenkpunktion ein Infekt zeigt, wäre eine stationäre Behandlung erforderlich.',
            },
          ],
        },
      ],
      linkedFachwissenId: 'fw-gicht',
      linkedFachbegriffeIds: [],
      status: 'À faire',
      confidence: 0,
      sourceDates: [
        '2023-12-11',
        '2024-12-11',
        '2023-07-26',
        '2023-08-31',
        '2022-06-09',
        '2020-09-17',
        '2024-04-09',
      ],
    }

// ---------- 2) SA FICHE FACHWISSEN (seedFachwissen.ts) ----------
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
    }

// ---------- 3) SES MUSTER (caseMuster.ts) ----------
{
      'persoenliche-daten': 'Ich möchte Ihnen Herrn Reinhold Ackermann vorstellen, einen 52-jährigen Patienten, der sich wegen seit fünf Tagen bestehender, ins rechte Bein ausstrahlender Kreuzschmerzen in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Herr Ackermann befand sich in schmerzbedingt reduziertem Allgemeinzustand und präadipösem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Er stellte sich wegen seit fünf Tagen bestehender, akut beim Heben einer schweren Kiste aufgetretener einschießender Kreuzschmerzen mit Ausstrahlung bis zur rechten Großzehe vor. Die Schmerzintensität läge bei 8 von 10. Die Beschwerden würden durch Husten, Niesen und Bücken verstärkt und im Liegen gelindert. Begleitend träten ein Kribbeln und ein Taubheitsgefühl am rechten Fußrücken auf. Eine Blasen-/Mastdarmstörung und eine Beinschwäche seien verneint worden.',
      allergien: 'Bei dem Patienten seien keine Allergien bekannt.',
      rauchen: 'Der Patient rauche, insgesamt etwa 20 Packungsjahre.',
      alkohol: 'Gelegentlich trinke er am Wochenende ein Bier.',
      drogen: 'Einen Drogenkonsum habe er verneint.',
      sozialanamnese: 'Er sei als Lagerarbeiter mit schwerem Heben tätig, verheiratet und habe zwei erwachsene Kinder; er wohne mit seiner Ehefrau im Erdgeschoss.',
      familienanamnese: 'Der Vater sei an einem Bandscheibenvorfall operiert worden, die Mutter leide an einer arteriellen Hypertonie.',
      vorerkrankungen: 'Bekannt seien eine arterielle Hypertonie und ein Übergewicht (Präadipositas) sowie eine frühere Lumbago-Episode; Voroperationen bestünden keine.',
      medikation: 'Er nehme regelmäßig Ramipril 5 mg ein sowie seit drei Tagen Ibuprofen 400 mg in Selbstmedikation.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf einen lumbalen Bandscheibenvorfall L4/L5 mit Wurzelreizsyndrom L5 rechts hin. Als Differenzialdiagnosen kommen eine Spinalkanalstenose, ein ISG-Syndrom, ein Facettensyndrom, eine Coxarthrose und eine pAVK in Betracht. Ich schlage eine klinisch-neurologische Untersuchung mit Lasègue-Zeichen und ein MRT der LWS vor und schließe aktiv ein Cauda-Syndrom aus. Therapeutisch empfehle ich eine Analgesie mit NSAR und Magenschutz, eine frühe Mobilisation ohne Bettruhe und Physiotherapie; operiert würde nur bei Cauda-Syndrom, progredienter Parese oder Therapieresistenz.',
    }
