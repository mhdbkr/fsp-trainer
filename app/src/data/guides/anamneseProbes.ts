import type { RolePlayKapitel, Specialty } from '@/db/types';

// ============================================================================
// CHECKLIST CANONIQUE DES SONDES D'ANAMNÈSE — le « contrat de couverture ».
// ----------------------------------------------------------------------------
// C'est la SOURCE UNIQUE DE VÉRITÉ des questions que le candidat peut poser.
// Elle est dérivée fidèlement du guide d'anamnèse (anamneseChapters.ts) :
//   • BASE_PROBES        = Allgemeine Anamnese (tous cas)
//   • FRAUEN_PROBES      = Frauenanamnese (uniquement patientes)
//   • FACH_PROBES[spec]  = Spezielle Anamnese de la spécialité du cas
//
// Chaque cas clinique répond à ces sondes via `patientSheet.antworten`
// (probeId → réplique). La couverture devient STRUCTURELLE : un validateur
// (scripts/checkProbeCoverage) refuse tout cas qui laisse une sonde applicable
// sans réponse. Ce schéma sera réutilisé tel quel en PHASE 2 (import de masse) :
// importer un cas = remplir sa carte `antworten` pour toutes ses sondes.
//
// `frage` = formulation patient de la question (repère affiché au simulant).
// L'ordre des sondes = l'ordre de l'entretien (il pilote l'affichage).
// ============================================================================

export interface AnamneseProbe {
  id: string;
  kapitel: RolePlayKapitel;
  frage: string;
}

// --- Allgemeine Anamnese (tous les cas) -------------------------------------
export const BASE_PROBES: AnamneseProbe[] = [
  // Persönliche Daten
  { id: 'pers-name', kapitel: 'personalia', frage: 'Wie heißen Sie mit vollständigem Namen? Können Sie ihn buchstabieren?' },
  { id: 'pers-alter', kapitel: 'personalia', frage: 'Wie alt sind Sie? Wann sind Sie geboren?' },
  { id: 'pers-groesse', kapitel: 'personalia', frage: 'Wie groß sind Sie und wie viel wiegen Sie?' },
  { id: 'pers-beruf', kapitel: 'personalia', frage: 'Was sind Sie von Beruf? Arbeiten Sie mit besonderen Stoffen (Staub, Chemikalien)?' },
  { id: 'pers-hausarzt', kapitel: 'personalia', frage: 'Haben Sie einen Hausarzt?' },

  // Aktuelle Beschwerden (OPQRST)
  { id: 'akt-motiv', kapitel: 'aktuell', frage: 'Was führt Sie heute zu uns?' },
  { id: 'akt-ort', kapitel: 'aktuell', frage: 'Wo genau spüren Sie die Beschwerden? Können Sie mit dem Finger zeigen?' },
  { id: 'akt-beginn', kapitel: 'aktuell', frage: 'Seit wann haben Sie das? Kam es plötzlich oder schleichend?' },
  { id: 'akt-charakter', kapitel: 'aktuell', frage: 'Wie fühlt es sich an — dumpf, stechend, brennend, drückend, krampfartig?' },
  { id: 'akt-intensitaet', kapitel: 'aktuell', frage: 'Wie stark sind die Beschwerden auf einer Skala von 1 bis 10?' },
  { id: 'akt-ausstrahlung', kapitel: 'aktuell', frage: 'Strahlen die Beschwerden aus? Wohin?' },
  { id: 'akt-verlauf', kapitel: 'aktuell', frage: 'Sind sie dauerhaft da oder treten sie anfallsartig auf? Wie lange dauert eine Episode?' },
  { id: 'akt-ausloeser', kapitel: 'aktuell', frage: 'Gab es einen Auslöser? Was taten Sie, als es begann?' },
  { id: 'akt-einfluss', kapitel: 'aktuell', frage: 'Was bessert oder verschlimmert es (Essen, Bewegung, Atmung, Körperhaltung)? Haben Sie schon etwas dagegen genommen?' },
  { id: 'akt-frueher', kapitel: 'aktuell', frage: 'Hatten Sie solche Beschwerden schon einmal? Waren Sie deswegen beim Arzt?' },
  { id: 'akt-begleit', kapitel: 'aktuell', frage: 'Haben Sie außerdem noch andere Beschwerden bemerkt?' },

  // Vegetative Anamnese
  { id: 'veg-fieber', kapitel: 'vegetativ', frage: 'Haben Sie Fieber gemessen? Seit wann, wie hoch? Waren Sie kürzlich im Ausland?' },
  { id: 'veg-schuettelfrost', kapitel: 'vegetativ', frage: 'Haben Sie Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche?' },
  { id: 'veg-uebelkeit', kapitel: 'vegetativ', frage: 'Ist Ihnen übel? Mussten Sie sich übergeben? Wie sah es aus, seit wann, wie häufig?' },
  { id: 'veg-ausscheidung', kapitel: 'vegetativ', frage: 'Haben Sie Probleme mit dem Stuhlgang oder beim Wasserlassen? Aussehen, wie oft?' },
  { id: 'veg-gewicht', kapitel: 'vegetativ', frage: 'Haben Sie Gewichtsveränderungen bemerkt? Wie viele Kilo, in welchem Zeitraum?' },
  { id: 'veg-appetit', kapitel: 'vegetativ', frage: 'Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten geändert?' },
  { id: 'veg-schlaf', kapitel: 'vegetativ', frage: 'Ist Ihr Schlaf erholsam? Haben Sie Ein- oder Durchschlafstörungen?' },

  // Vorerkrankungen & Voroperationen
  { id: 'vor-erkrank', kapitel: 'vorerkrankungen', frage: 'Haben Sie Vorerkrankungen (Bluthochdruck, Zuckerkrankheit, erhöhte Blutfette)? Seit wann, behandelt?' },
  { id: 'vor-op', kapitel: 'vorerkrankungen', frage: 'Wurden Sie schon einmal operiert? Welche Eingriffe, wann, Komplikationen?' },
  { id: 'vor-krankenhaus', kapitel: 'vorerkrankungen', frage: 'Waren Sie in letzter Zeit im Krankenhaus?' },

  // Medikamente
  { id: 'med-regelmaessig', kapitel: 'medikamente', frage: 'Nehmen Sie regelmäßig oder gelegentlich Medikamente? Welche, seit wann, Dosierung?' },
  { id: 'med-blutverduenner', kapitel: 'medikamente', frage: 'Nehmen Sie Blutverdünner oder Kortison?' },
  { id: 'med-otc', kapitel: 'medikamente', frage: 'Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?' },

  // Allergien & Unverträglichkeiten
  { id: 'all-allergie', kapitel: 'allergien', frage: 'Sind Sie allergisch gegen Medikamente oder Nahrungsmittel? Wie reagieren Sie?' },
  { id: 'all-unvertraeglich', kapitel: 'allergien', frage: 'Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?' },

  // Noxen / Genussmittel
  { id: 'nox-rauchen', kapitel: 'noxen', frage: 'Rauchen Sie? Seit wann und wie viel? (Oder: wann aufgehört?)' },
  { id: 'nox-alkohol', kapitel: 'noxen', frage: 'Trinken Sie Alkohol? Was, wie oft und wie viel?' },
  { id: 'nox-drogen', kapitel: 'noxen', frage: 'Konsumieren Sie Drogen, zum Beispiel Cannabis?' },

  // Familien- & Sozialanamnese
  { id: 'fam-familie', kapitel: 'familie-sozial', frage: 'Gibt es in Ihrer Familie chronische Erkrankungen? Welche, seit wann?' },
  { id: 'fam-eltern', kapitel: 'familie-sozial', frage: 'Leben Ihre Eltern noch? (Falls verstorben: woran und wann?)' },
  { id: 'fam-stand', kapitel: 'familie-sozial', frage: 'Wie ist Ihr Familienstand? Haben Sie Kinder — wie viele, und sind sie gesund?' },
  { id: 'fam-beruf', kapitel: 'familie-sozial', frage: 'Was sind Sie von Beruf? Haben Sie Stress bei der Arbeit? (Oder: in Rente?)' },
  { id: 'fam-wohnen', kapitel: 'familie-sozial', frage: 'Wohnen Sie allein oder mit jemandem? Wohnung oder Haus, welches Stockwerk, mit Aufzug?' },
  { id: 'fam-haustiere', kapitel: 'familie-sozial', frage: 'Haben Sie Haustiere, um die sich jemand kümmern muss?' },
];

// --- Frauenanamnese (uniquement patientes) ----------------------------------
export const FRAUEN_PROBES: AnamneseProbe[] = [
  { id: 'frau-periode', kapitel: 'frauenanamnese', frage: 'Ist Ihre Monatsblutung regelmäßig? Wann war Ihre letzte Regelblutung?' },
  { id: 'frau-schwanger', kapitel: 'frauenanamnese', frage: 'Besteht die Möglichkeit, dass Sie schwanger sind?' },
  { id: 'frau-verhuetung', kapitel: 'frauenanamnese', frage: 'Verwenden Sie Verhütungsmethoden? Wenn ja, welche?' },
  { id: 'frau-wechseljahre', kapitel: 'frauenanamnese', frage: 'Sind Sie in den Wechseljahren? Gehen Sie regelmäßig zum Frauenarzt?' },
];

// --- Spezielle Anamnese par spécialité --------------------------------------
// Chaque spécialité reprend fidèlement les questions de sa Fachanamnese.
// (Ajouter ici les autres spécialités au fil de la PHASE 2.)
export const FACH_PROBES: Partial<Record<Specialty, AnamneseProbe[]>> = {
  Gastroenterologie: [
    { id: 'fach-gastro-uebelkeit', kapitel: 'fach', frage: 'Leiden Sie an Übelkeit oder Erbrechen? Wie sah es aus (wie Kaffeesatz, mit Blut)? Wie lange nach dem Essen? Geht es Ihnen danach besser?' },
    { id: 'fach-gastro-sodbrennen', kapitel: 'fach', frage: 'Haben Sie Sodbrennen? Müssen Sie aufstoßen?' },
    { id: 'fach-gastro-voelle', kapitel: 'fach', frage: 'Haben Sie ein Völlegefühl? Werden Sie schneller satt als früher? Fühlen Sie sich aufgebläht?' },
    { id: 'fach-gastro-speisen', kapitel: 'fach', frage: 'Treten die Beschwerden nach bestimmten Speisen auf? Was haben Sie zuletzt gegessen?' },
    { id: 'fach-gastro-stuhl', kapitel: 'fach', frage: 'Haben Sie Durchfall oder Verstopfung, evtl. im Wechsel? Welche Farbe (blutig, teerschwarz, hell) und Konsistenz hat der Stuhl?' },
    { id: 'fach-gastro-tenesmen', kapitel: 'fach', frage: 'Haben Sie manchmal das Gefühl, zur Toilette zu müssen, aber es kommt nichts?' },
    { id: 'fach-gastro-spiegelung', kapitel: 'fach', frage: 'Wann hatten Sie die letzte Magen- oder Darmspiegelung? Was war das Ergebnis?' },
  ],
  Kardiologie: [
    { id: 'fach-kardio-brust', kapitel: 'fach', frage: 'Haben Sie Schmerzen oder ein Engegefühl in der Brust? Wo genau — hinter dem Brustbein oder in der Magengrube?' },
    { id: 'fach-kardio-belastung', kapitel: 'fach', frage: 'Treten die Beschwerden nur bei Belastung oder auch in Ruhe auf? Wie lange dauern sie?' },
    { id: 'fach-kardio-ausstrahlung', kapitel: 'fach', frage: 'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?' },
    { id: 'fach-kardio-atem', kapitel: 'fach', frage: 'Hängen die Beschwerden mit dem Atmen, dem Essen oder der Körperlage zusammen?' },
    { id: 'fach-kardio-nitro', kapitel: 'fach', frage: 'Haben Sie ein Nitrospray benutzt? Hat es geholfen?' },
    { id: 'fach-kardio-herzrasen', kapitel: 'fach', frage: 'Haben Sie Herzrasen, Herzklopfen oder Herzstolpern bemerkt?' },
    { id: 'fach-kardio-luft', kapitel: 'fach', frage: 'Bekommen Sie schwer Luft, besonders beim Treppensteigen? Wie viele Stockwerke schaffen Sie ohne Pause?' },
    { id: 'fach-kardio-oedeme', kapitel: 'fach', frage: 'Sind Ihre Beine oder Knöchel geschwollen? Mit wie vielen Kissen schlafen Sie?' },
    { id: 'fach-kardio-nykturie', kapitel: 'fach', frage: 'Müssen Sie nachts Wasser lassen? Wie oft?' },
    { id: 'fach-kardio-synkope', kapitel: 'fach', frage: 'Wird es Ihnen manchmal schwarz vor Augen? Sind Sie schon einmal ohnmächtig geworden?' },
  ],
  Chirurgie: [
    { id: 'fach-chir-essen', kapitel: 'fach', frage: 'Wann haben Sie zuletzt gegessen und getrunken? Was genau?' },
    { id: 'fach-chir-uebelkeit', kapitel: 'fach', frage: 'Ist Ihnen übel? Haben Sie sich übergeben?' },
    { id: 'fach-chir-ileus', kapitel: 'fach', frage: 'Hatten Sie heute Stuhlgang? Gehen noch Winde ab?' },
    { id: 'fach-chir-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber?' },
    { id: 'fach-chir-op', kapitel: 'fach', frage: 'Wurden Sie schon einmal am Bauch operiert? Haben Sie Narben?' },
    { id: 'fach-chir-blutverduenner', kapitel: 'fach', frage: 'Nehmen Sie Blutverdünner ein?' },
    { id: 'fach-chir-gallensteine', kapitel: 'fach', frage: 'Haben Sie bekannte Gallensteine oder einen Leistenbruch?' },
  ],
  Psychiatrie: [
    { id: 'fach-psych-stimmung', kapitel: 'fach', frage: 'Wie ist Ihre Stimmung in letzter Zeit? Fühlen Sie sich niedergeschlagen, traurig oder innerlich leer?' },
    { id: 'fach-psych-interesse', kapitel: 'fach', frage: 'Haben Sie noch Freude oder Interesse an Dingen, die Ihnen früher wichtig waren?' },
    { id: 'fach-psych-antrieb', kapitel: 'fach', frage: 'Wie ist Ihr Antrieb und Ihre Energie? Fällt es Ihnen schwer, den Alltag zu bewältigen?' },
    { id: 'fach-psych-schlaf', kapitel: 'fach', frage: 'Wie schlafen Sie? Haben Sie Ein- oder Durchschlafstörungen, oder wachen Sie morgens sehr früh auf?' },
    { id: 'fach-psych-tagesverlauf', kapitel: 'fach', frage: 'Gibt es Tageszeiten, zu denen es Ihnen besser oder schlechter geht (zum Beispiel ein Morgentief)?' },
    { id: 'fach-psych-konzentration', kapitel: 'fach', frage: 'Können Sie sich noch gut konzentrieren und Entscheidungen treffen?' },
    { id: 'fach-psych-suizid', kapitel: 'fach', frage: 'Denken Sie manchmal, dass das Leben nicht mehr lebenswert ist? Haben Sie Gedanken, sich etwas anzutun?' },
    { id: 'fach-psych-ausloeser', kapitel: 'fach', frage: 'Gab es belastende Ereignisse — ein Verlust, eine Trennung, Stress bei der Arbeit?' },
    { id: 'fach-psych-frueher', kapitel: 'fach', frage: 'Hatten Sie so etwas schon einmal? Waren Sie deswegen in Behandlung oder haben Sie Medikamente eingenommen?' },
  ],
  Pneumologie: [
    { id: 'fach-pneumo-husten', kapitel: 'fach', frage: 'Haben Sie Husten? Seit wann, und ist er trocken oder mit Auswurf?' },
    { id: 'fach-pneumo-auswurf', kapitel: 'fach', frage: 'Wie sieht der Auswurf aus — Farbe und Menge? Ist Blut beigemengt?' },
    { id: 'fach-pneumo-atemnot', kapitel: 'fach', frage: 'Bekommen Sie schwer Luft? In Ruhe oder bei Belastung? Wie viele Stockwerke schaffen Sie ohne Pause?' },
    { id: 'fach-pneumo-schmerz', kapitel: 'fach', frage: 'Haben Sie Schmerzen beim Atmen oder Husten? Sind sie atemabhängig?' },
    { id: 'fach-pneumo-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber oder Schüttelfrost?' },
    { id: 'fach-pneumo-giemen', kapitel: 'fach', frage: 'Hören Sie beim Atmen ein Pfeifen oder Giemen?' },
    { id: 'fach-pneumo-infekt', kapitel: 'fach', frage: 'Hatten Sie kürzlich einen Atemwegsinfekt, Kontakt zu Kranken oder eine Reise?' },
    { id: 'fach-pneumo-noxen', kapitel: 'fach', frage: 'Rauchen Sie? Waren Sie beruflich Stäuben, Asbest oder Vögeln ausgesetzt?' },
    { id: 'fach-pneumo-allergie', kapitel: 'fach', frage: 'Haben Sie Allergien oder ein bekanntes Asthma?' },
  ],
  Infektiologie: [
    { id: 'fach-infekt-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber gemessen? Wie hoch, seit wann, und verläuft es in Schüben?' },
    { id: 'fach-infekt-zecke', kapitel: 'fach', frage: 'Hatten Sie einen Zeckenstich oder einen Insektenstich bemerkt? Waren Sie im Wald, im hohen Gras oder im Garten?' },
    { id: 'fach-infekt-haut', kapitel: 'fach', frage: 'Haben Sie eine Hautveränderung oder Rötung bemerkt? Hat sie sich ausgebreitet, zum Beispiel ringförmig?' },
    { id: 'fach-infekt-gelenke', kapitel: 'fach', frage: 'Haben Sie Gelenk- oder Muskelschmerzen? Wandern sie von Gelenk zu Gelenk?' },
    { id: 'fach-infekt-neuro', kapitel: 'fach', frage: 'Haben Sie Kopfschmerzen, Nackensteifigkeit, Missempfindungen oder eine Gesichtslähmung bemerkt?' },
    { id: 'fach-infekt-reise', kapitel: 'fach', frage: 'Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?' },
    { id: 'fach-infekt-kontakt', kapitel: 'fach', frage: 'Hatten Sie Kontakt zu kranken Personen oder zu Tieren?' },
    { id: 'fach-infekt-impfung', kapitel: 'fach', frage: 'Wie ist Ihr Impfstatus, insbesondere gegen FSME und Tetanus?' },
  ],
  Urologie: [
    { id: 'fach-uro-miktion', kapitel: 'fach', frage: 'Haben Sie Schmerzen oder ein Brennen beim Wasserlassen?' },
    { id: 'fach-uro-frequenz', kapitel: 'fach', frage: 'Müssen Sie häufiger als sonst Wasser lassen, auch nachts? Kommt dabei nur wenig?' },
    { id: 'fach-uro-drang', kapitel: 'fach', frage: 'Haben Sie plötzlichen, starken Harndrang? Können Sie den Urin noch halten?' },
    { id: 'fach-uro-farbe', kapitel: 'fach', frage: 'Welche Farbe hat der Urin? Ist Blut dabei, oder riecht er auffällig?' },
    { id: 'fach-uro-flanke', kapitel: 'fach', frage: 'Haben Sie Schmerzen in der Flanke oder im Rücken? Strahlen sie in die Leiste aus?' },
    { id: 'fach-uro-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber oder Schüttelfrost?' },
    { id: 'fach-uro-strahl', kapitel: 'fach', frage: 'Wie ist der Harnstrahl — abgeschwächt? Müssen Sie pressen, oder tropft es nach?' },
    { id: 'fach-uro-vorgeschichte', kapitel: 'fach', frage: 'Hatten Sie schon einmal einen Harnwegsinfekt, Nierensteine oder Probleme mit der Prostata?' },
  ],
  Orthopädie: [
    { id: 'fach-ortho-mechanismus', kapitel: 'fach', frage: 'Gab es einen Unfall oder Sturz? Wie genau ist es passiert, und konnten Sie danach noch auftreten oder das Gelenk bewegen?' },
    { id: 'fach-ortho-bewegung', kapitel: 'fach', frage: 'Sind die Schmerzen von Bewegung und Belastung abhängig, oder treten sie auch in Ruhe und nachts auf?' },
    { id: 'fach-ortho-ausstrahlung', kapitel: 'fach', frage: 'Strahlen die Schmerzen aus — zum Beispiel ins Bein oder in den Arm? Bis wohin genau?' },
    { id: 'fach-ortho-sensomotorik', kapitel: 'fach', frage: 'Haben Sie Kribbeln, Taubheitsgefühl oder Kraftverlust in Arm oder Bein bemerkt?' },
    { id: 'fach-ortho-cauda', kapitel: 'fach', frage: 'Haben Sie Probleme beim Wasserlassen oder Stuhlgang oder ein Taubheitsgefühl im Reithosen-/Genitalbereich?' },
    { id: 'fach-ortho-schwellung', kapitel: 'fach', frage: 'Ist das Gelenk geschwollen, gerötet, überwärmt oder haben Sie einen Bluterguss bemerkt?' },
    { id: 'fach-ortho-belastung', kapitel: 'fach', frage: 'Können Sie das Bein/den Arm noch belasten? Wie weit können Sie gehen, und was hilft oder verschlimmert?' },
    { id: 'fach-ortho-vorgeschichte', kapitel: 'fach', frage: 'Hatten Sie an dieser Stelle schon einmal Beschwerden, eine Verletzung oder eine Operation?' },
  ],
  Rheumatologie: [
    { id: 'fach-rheuma-gelenke', kapitel: 'fach', frage: 'Welche Gelenke sind betroffen — nur eines oder mehrere? Wechseln die Beschwerden von Gelenk zu Gelenk?' },
    { id: 'fach-rheuma-morgensteifigkeit', kapitel: 'fach', frage: 'Sind die Gelenke morgens steif? Wie lange dauert die Steifigkeit, bis Sie sich wieder normal bewegen können?' },
    { id: 'fach-rheuma-entzuendung', kapitel: 'fach', frage: 'Ist das Gelenk geschwollen, gerötet oder überwärmt? Können Sie es überhaupt noch berühren?' },
    { id: 'fach-rheuma-verlauf', kapitel: 'fach', frage: 'Kamen die Beschwerden plötzlich und anfallsartig, oder haben sie sich langsam über Wochen entwickelt?' },
    { id: 'fach-rheuma-ausloeser', kapitel: 'fach', frage: 'Gab es einen Auslöser — ein üppiges Essen mit Fleisch, Alkohol (besonders Bier), Fasten oder eine neue Tablette (z. B. eine Wassertablette)?' },
    { id: 'fach-rheuma-haut', kapitel: 'fach', frage: 'Haben Sie Hautveränderungen bemerkt — Schuppenflechte, Knötchen unter der Haut oder an den Ohren?' },
    { id: 'fach-rheuma-systemisch', kapitel: 'fach', frage: 'Haben Sie Fieber, Augenentzündungen, Mund- oder Genitalgeschwüre, Durchfall oder eine Bindehautentzündung bemerkt?' },
    { id: 'fach-rheuma-vorgeschichte', kapitel: 'fach', frage: 'Hatten Sie so einen Anfall schon einmal? Sind Nierensteine oder rheumatische Erkrankungen in der Familie bekannt?' },
  ],
  Neurologie: [
    { id: 'fach-neuro-sehen', kapitel: 'fach', frage: 'Haben Sie Sehstörungen bemerkt — Doppelbilder, verschwommenes Sehen, einen Schleier oder Schmerzen bei Augenbewegungen?' },
    { id: 'fach-neuro-sensibilitaet', kapitel: 'fach', frage: 'Haben Sie Kribbeln, Taubheitsgefühl oder ein pelziges Gefühl? Wo genau, und seit wann?' },
    { id: 'fach-neuro-kraft', kapitel: 'fach', frage: 'Ist ein Arm oder Bein schwächer geworden? Lassen Sie Dinge fallen oder bleiben Sie mit dem Fuß hängen?' },
    { id: 'fach-neuro-koordination', kapitel: 'fach', frage: 'Haben Sie Schwindel, Gangunsicherheit oder das Gefühl zu schwanken? Sind Sie schon gestürzt?' },
    { id: 'fach-neuro-sprache', kapitel: 'fach', frage: 'Haben Sie Schwierigkeiten beim Sprechen, beim Finden von Wörtern oder beim Schlucken?' },
    { id: 'fach-neuro-blase', kapitel: 'fach', frage: 'Haben Sie Probleme mit der Blase oder dem Stuhlgang — plötzlichen Drang, Einnässen oder Entleerungsstörungen?' },
    { id: 'fach-neuro-anfall', kapitel: 'fach', frage: 'Hatten Sie einen Krampfanfall, eine Bewusstlosigkeit oder eine Phase, an die Sie sich nicht erinnern können?' },
    { id: 'fach-neuro-verlauf', kapitel: 'fach', frage: 'Kamen die Beschwerden schubweise und bildeten sich zwischendurch zurück? Werden sie bei Wärme oder Anstrengung schlimmer?' },
    { id: 'fach-neuro-kopfschmerz', kapitel: 'fach', frage: 'Haben Sie Kopfschmerzen? Wie fühlen sie sich an, und ist Ihnen dabei übel oder lichtempfindlich?' },
  ],
};

// --- Index & helpers --------------------------------------------------------
/** Toutes les sondes connues, indexées par id (résolution O(1) au rendu). */
export const PROBE_BY_ID: Record<string, AnamneseProbe> = (() => {
  const map: Record<string, AnamneseProbe> = {};
  const all = [
    ...BASE_PROBES,
    ...FRAUEN_PROBES,
    ...Object.values(FACH_PROBES).flatMap((arr) => arr ?? []),
  ];
  for (const p of all) map[p.id] = p;
  return map;
})();

/** Ordre global d'affichage d'une sonde (pour trier les répliques d'un chapitre
 *  dans l'ordre de l'entretien, quelle que soit la clé de la carte antworten). */
export const PROBE_ORDER: Record<string, number> = (() => {
  const order: Record<string, number> = {};
  let i = 0;
  for (const p of BASE_PROBES) order[p.id] = i++;
  for (const p of FRAUEN_PROBES) order[p.id] = i++;
  for (const arr of Object.values(FACH_PROBES)) for (const p of arr ?? []) order[p.id] = i++;
  return order;
})();

/** Liste des sondes APPLICABLES à un cas — le contrat de couverture à remplir.
 *  = Allgemeine Anamnese + Fachanamnese de la spécialité + Frauenanamnese si
 *  patiente. Utilisé par le validateur et (optionnellement) pour signaler les
 *  trous au rendu. */
export function probesForCase(specialty: Specialty, weiblich: boolean): AnamneseProbe[] {
  return [
    ...BASE_PROBES,
    ...(FACH_PROBES[specialty] ?? []),
    ...(weiblich ? FRAUEN_PROBES : []),
  ];
}
