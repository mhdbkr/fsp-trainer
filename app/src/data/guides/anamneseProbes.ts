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
  /** Sonde générale que cette sonde Fach RECOUVRE. Le candidat a déjà posé la
   *  question dans l'anamnèse générale : le guide le signale au lieu de le
   *  laisser répéter — c'est le « ça se répète entre les chapitres » du retour
   *  d'usage. On ne supprime pas la question : la version Fach ajoute presque
   *  toujours un axe clinique décisif (Reithosenanästhesie, Kaffeesatz,
   *  poids ↔ appétit…). */
  deepens?: string;
  /** Vrai doublon : la version générale est strictement plus riche, la question
   *  Fach n'ajoute rien → le guide invite à passer. */
  redundant?: boolean;
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
    { id: 'fach-gastro-uebelkeit', kapitel: 'fach', frage: 'Leiden Sie an Übelkeit oder Erbrechen? Wie sah es aus (wie Kaffeesatz, mit Blut)? Wie lange nach dem Essen? Geht es Ihnen danach besser?', deepens: 'veg-uebelkeit' },
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
    { id: 'fach-kardio-ausstrahlung', kapitel: 'fach', frage: 'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?', deepens: 'akt-ausstrahlung' },
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
    { id: 'fach-chir-uebelkeit', kapitel: 'fach', frage: 'Ist Ihnen übel? Haben Sie sich übergeben?', deepens: 'veg-uebelkeit', redundant: true },
    { id: 'fach-chir-ileus', kapitel: 'fach', frage: 'Hatten Sie heute Stuhlgang? Gehen noch Winde ab?' },
    { id: 'fach-chir-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber?', deepens: 'veg-fieber', redundant: true },
    { id: 'fach-chir-op', kapitel: 'fach', frage: 'Wurden Sie schon einmal am Bauch operiert? Haben Sie Narben?', deepens: 'vor-op' },
    { id: 'fach-chir-blutverduenner', kapitel: 'fach', frage: 'Nehmen Sie Blutverdünner ein?', deepens: 'med-blutverduenner', redundant: true },
    { id: 'fach-chir-gallensteine', kapitel: 'fach', frage: 'Haben Sie bekannte Gallensteine oder einen Leistenbruch?' },
  ],
  Psychiatrie: [
    { id: 'fach-psych-stimmung', kapitel: 'fach', frage: 'Wie ist Ihre Stimmung in letzter Zeit? Fühlen Sie sich niedergeschlagen, traurig oder innerlich leer?' },
    { id: 'fach-psych-interesse', kapitel: 'fach', frage: 'Haben Sie noch Freude oder Interesse an Dingen, die Ihnen früher wichtig waren?' },
    { id: 'fach-psych-antrieb', kapitel: 'fach', frage: 'Wie ist Ihr Antrieb und Ihre Energie? Fällt es Ihnen schwer, den Alltag zu bewältigen?' },
    { id: 'fach-psych-schlaf', kapitel: 'fach', frage: 'Wie schlafen Sie? Haben Sie Ein- oder Durchschlafstörungen, oder wachen Sie morgens sehr früh auf?', deepens: 'veg-schlaf' },
    { id: 'fach-psych-tagesverlauf', kapitel: 'fach', frage: 'Gibt es Tageszeiten, zu denen es Ihnen besser oder schlechter geht (zum Beispiel ein Morgentief)?' },
    { id: 'fach-psych-konzentration', kapitel: 'fach', frage: 'Können Sie sich noch gut konzentrieren und Entscheidungen treffen?' },
    // Promue du guide rédigé (harmonisation) : l'angoisse et l'attaque de
    // panique changent le diagnostic (trouble anxieux vs dépression) et ne
    // se déduisent d'aucune autre sonde.
    { id: 'fach-psych-angst', kapitel: 'fach', frage: 'Haben Sie Ängste, oder machen Sie sich viele Sorgen — auch wenn Sie eigentlich in Sicherheit sind? Haben Sie Panikattacken mit Luftnot oder Herzrasen?' },
    { id: 'fach-psych-suizid', kapitel: 'fach', frage: 'Denken Sie manchmal, dass das Leben nicht mehr lebenswert ist? Haben Sie Gedanken, sich etwas anzutun?' },
    { id: 'fach-psych-ausloeser', kapitel: 'fach', frage: 'Gab es belastende Ereignisse — ein Verlust, eine Trennung, Stress bei der Arbeit?', deepens: 'akt-ausloeser' },
    { id: 'fach-psych-frueher', kapitel: 'fach', frage: 'Hatten Sie so etwas schon einmal? Waren Sie deswegen in Behandlung oder haben Sie Medikamente eingenommen?', deepens: 'akt-frueher' },
  ],
  Pneumologie: [
    { id: 'fach-pneumo-husten', kapitel: 'fach', frage: 'Haben Sie Husten? Seit wann, und ist er trocken oder mit Auswurf?', deepens: 'akt-beginn' },
    { id: 'fach-pneumo-auswurf', kapitel: 'fach', frage: 'Wie sieht der Auswurf aus — Farbe und Menge? Ist Blut beigemengt?' },
    { id: 'fach-pneumo-atemnot', kapitel: 'fach', frage: 'Bekommen Sie schwer Luft? In Ruhe oder bei Belastung? Wie viele Stockwerke schaffen Sie ohne Pause?' },
    // Promue du guide rédigé (harmonisation) : orthopnée, nombre d'oreillers et
    // apnées nocturnes — la bascule vers l'insuffisance cardiaque gauche et le
    // SAOS ne se déduisait d'aucune sonde pneumologique.
    { id: 'fach-pneumo-orthopnoe', kapitel: 'fach', frage: 'Wie viele Kissen brauchen Sie zum Schlafen? Wachen Sie nachts mit Luftnot auf, oder klagt Ihr Partner über lautes Schnarchen und Atemaussetzer?' },
    { id: 'fach-pneumo-schmerz', kapitel: 'fach', frage: 'Haben Sie Schmerzen beim Atmen oder Husten? Sind sie atemabhängig?' },
    { id: 'fach-pneumo-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber oder Schüttelfrost?', deepens: 'veg-schuettelfrost' },
    { id: 'fach-pneumo-giemen', kapitel: 'fach', frage: 'Hören Sie beim Atmen ein Pfeifen oder Giemen?' },
    { id: 'fach-pneumo-infekt', kapitel: 'fach', frage: 'Hatten Sie kürzlich einen Atemwegsinfekt, Kontakt zu Kranken oder eine Reise?' },
    { id: 'fach-pneumo-noxen', kapitel: 'fach', frage: 'Rauchen Sie? Waren Sie beruflich Stäuben, Asbest oder Vögeln ausgesetzt?' },
    { id: 'fach-pneumo-allergie', kapitel: 'fach', frage: 'Haben Sie Allergien oder ein bekanntes Asthma?', deepens: 'all-allergie' },
  ],
  Infektiologie: [
    { id: 'fach-infekt-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber gemessen? Wie hoch, seit wann, und verläuft es in Schüben?', deepens: 'veg-fieber' },
    { id: 'fach-infekt-zecke', kapitel: 'fach', frage: 'Hatten Sie einen Zeckenstich oder einen Insektenstich bemerkt? Waren Sie im Wald, im hohen Gras oder im Garten?' },
    { id: 'fach-infekt-haut', kapitel: 'fach', frage: 'Haben Sie eine Hautveränderung oder Rötung bemerkt? Hat sie sich ausgebreitet, zum Beispiel ringförmig?' },
    { id: 'fach-infekt-gelenke', kapitel: 'fach', frage: 'Haben Sie Gelenk- oder Muskelschmerzen? Wandern sie von Gelenk zu Gelenk?' },
    { id: 'fach-infekt-neuro', kapitel: 'fach', frage: 'Haben Sie Kopfschmerzen, Nackensteifigkeit, Missempfindungen oder eine Gesichtslähmung bemerkt?' },
    { id: 'fach-infekt-reise', kapitel: 'fach', frage: 'Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?', deepens: 'veg-fieber' },
    { id: 'fach-infekt-kontakt', kapitel: 'fach', frage: 'Hatten Sie Kontakt zu kranken Personen oder zu Tieren?' },
    { id: 'fach-infekt-impfung', kapitel: 'fach', frage: 'Wie ist Ihr Impfstatus, insbesondere gegen FSME und Tetanus?' },
  ],
  Urologie: [
    { id: 'fach-uro-miktion', kapitel: 'fach', frage: 'Haben Sie Schmerzen oder ein Brennen beim Wasserlassen?', deepens: 'veg-ausscheidung' },
    { id: 'fach-uro-frequenz', kapitel: 'fach', frage: 'Müssen Sie häufiger als sonst Wasser lassen, auch nachts? Kommt dabei nur wenig?' },
    { id: 'fach-uro-drang', kapitel: 'fach', frage: 'Haben Sie plötzlichen, starken Harndrang? Können Sie den Urin noch halten?' },
    { id: 'fach-uro-farbe', kapitel: 'fach', frage: 'Welche Farbe hat der Urin? Ist Blut dabei, oder riecht er auffällig?' },
    { id: 'fach-uro-flanke', kapitel: 'fach', frage: 'Haben Sie Schmerzen in der Flanke oder im Rücken? Strahlen sie in die Leiste aus?' },
    { id: 'fach-uro-fieber', kapitel: 'fach', frage: 'Haben Sie Fieber oder Schüttelfrost?', deepens: 'veg-schuettelfrost' },
    { id: 'fach-uro-strahl', kapitel: 'fach', frage: 'Wie ist der Harnstrahl — abgeschwächt? Müssen Sie pressen, oder tropft es nach?' },
    // Promues du guide rédigé (harmonisation) : l'anamnèse sexuelle fait partie
    // du standard urologique de l'examen (IST, protection, fonction) et
    // n'apparaissait dans aucune sonde.
    { id: 'fach-uro-sexualanamnese', kapitel: 'fach', frage: 'Darf ich Ihnen ein paar Fragen zu Ihrer Partnerschaft stellen — das gehört zur Untersuchung dazu? Wie verhüten Sie, und wie schützen Sie sich vor Geschlechtskrankheiten? Hatten Sie schon einmal eine Geschlechtskrankheit?' },
    { id: 'fach-uro-funktion', kapitel: 'fach', frage: 'Haben Sie Schmerzen oder Blutungen beim oder nach dem Geschlechtsverkehr? Haben Sie Probleme, eine Erektion zu bekommen oder zu halten?' },
    { id: 'fach-uro-vorgeschichte', kapitel: 'fach', frage: 'Hatten Sie schon einmal einen Harnwegsinfekt, Nierensteine oder Probleme mit der Prostata?' },
  ],
  Orthopädie: [
    { id: 'fach-ortho-mechanismus', kapitel: 'fach', frage: 'Gab es einen Unfall oder Sturz? Wie genau ist es passiert, und konnten Sie danach noch auftreten oder das Gelenk bewegen?' },
    { id: 'fach-ortho-bewegung', kapitel: 'fach', frage: 'Sind die Schmerzen von Bewegung und Belastung abhängig, oder treten sie auch in Ruhe und nachts auf?' },
    { id: 'fach-ortho-ausstrahlung', kapitel: 'fach', frage: 'Strahlen die Schmerzen aus — zum Beispiel ins Bein oder in den Arm? Bis wohin genau?', deepens: 'akt-ausstrahlung' },
    { id: 'fach-ortho-sensomotorik', kapitel: 'fach', frage: 'Haben Sie Kribbeln, Taubheitsgefühl oder Kraftverlust in Arm oder Bein bemerkt?' },
    // Promue du guide rédigé (harmonisation) : le trio Durchblutung–Motorik–
    // Sensibilität d'un membre traumatisé ; la perfusion manquait aux sondes.
    { id: 'fach-ortho-durchblutung', kapitel: 'fach', frage: 'Haben Sie das Gefühl, dass die Hand oder der Fuß kälter, blasser oder bläulich geworden ist?' },
    { id: 'fach-ortho-cauda', kapitel: 'fach', frage: 'Haben Sie Probleme beim Wasserlassen oder Stuhlgang oder ein Taubheitsgefühl im Reithosen-/Genitalbereich?', deepens: 'veg-ausscheidung' },
    { id: 'fach-ortho-schwellung', kapitel: 'fach', frage: 'Ist das Gelenk geschwollen, gerötet, überwärmt oder haben Sie einen Bluterguss bemerkt?' },
    { id: 'fach-ortho-belastung', kapitel: 'fach', frage: 'Können Sie das Bein/den Arm noch belasten? Wie weit können Sie gehen, und was hilft oder verschlimmert?' },
    { id: 'fach-ortho-vorgeschichte', kapitel: 'fach', frage: 'Hatten Sie an dieser Stelle schon einmal Beschwerden, eine Verletzung oder eine Operation?' },
  ],
  Rheumatologie: [
    { id: 'fach-rheuma-gelenke', kapitel: 'fach', frage: 'Welche Gelenke sind betroffen — nur eines oder mehrere? Wechseln die Beschwerden von Gelenk zu Gelenk?' },
    { id: 'fach-rheuma-morgensteifigkeit', kapitel: 'fach', frage: 'Sind die Gelenke morgens steif? Wie lange dauert die Steifigkeit, bis Sie sich wieder normal bewegen können?' },
    { id: 'fach-rheuma-entzuendung', kapitel: 'fach', frage: 'Ist das Gelenk geschwollen, gerötet oder überwärmt? Können Sie es überhaupt noch berühren?' },
    { id: 'fach-rheuma-verlauf', kapitel: 'fach', frage: 'Kamen die Beschwerden plötzlich und anfallsartig, oder haben sie sich langsam über Wochen entwickelt?', deepens: 'akt-verlauf' },
    { id: 'fach-rheuma-ausloeser', kapitel: 'fach', frage: 'Gab es einen Auslöser — ein üppiges Essen mit Fleisch, Alkohol (besonders Bier), Fasten oder eine neue Tablette (z. B. eine Wassertablette)?', deepens: 'akt-ausloeser' },
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
    { id: 'fach-neuro-verlauf', kapitel: 'fach', frage: 'Kamen die Beschwerden schubweise und bildeten sich zwischendurch zurück? Werden sie bei Wärme oder Anstrengung schlimmer?', deepens: 'akt-verlauf' },
    { id: 'fach-neuro-kopfschmerz', kapitel: 'fach', frage: 'Haben Sie Kopfschmerzen? Wo genau — einseitig oder beidseitig? Wie fühlen sie sich an, und ist Ihnen dabei übel oder lichtempfindlich?' },
    // Promues du guide rédigé (harmonisation) : trois axes cliniques que
    // l'examen neurologique systématique des sondes ne couvrait pas, et qui
    // décident du diagnostic dans les trois cas neuro du corpus.
    { id: 'fach-neuro-aura', kapitel: 'fach', frage: 'Kamen die Beschwerden plötzlich wie ein Schlag, oder gab es Vorboten — Lichtblitze, Zickzacklinien, Kribbeln in den Fingern oder im Gesicht?' },
    { id: 'fach-neuro-autonom', kapitel: 'fach', frage: 'Hatten Sie dabei Begleitbeschwerden an Auge oder Nase — Tränenfluss, Nasenverstopfung, ein hängendes Augenlid?' },
    { id: 'fach-neuro-anfallzeichen', kapitel: 'fach', frage: 'Erinnern Sie sich an alles vor und nach der Episode? Haben Sie sich dabei verletzt — Zungenbiss? Ging unwillkürlich Urin ab?' },
  ],
  // Un seul jeu couvre les deux grands axes endocriniens de l'examen : le
  // métabolisme glucidique (polyurie/polydipsie, hypoglycémies, complications
  // d'organe) et la thyroïde (hyper ET hypo, symétriques dans la même sonde,
  // pour que le candidat apprenne à trancher entre les deux en interrogeant).
  Endokrinologie: [
    { id: 'fach-endo-durst', kapitel: 'fach', frage: 'Haben Sie vermehrt Durst und müssen Sie häufiger Wasser lassen, auch nachts?' },
    { id: 'fach-endo-gewicht', kapitel: 'fach', frage: 'Hat sich Ihr Gewicht verändert, ohne dass Sie etwas umgestellt haben? Und wie ist Ihr Appetit dabei?', deepens: 'veg-gewicht' },
    { id: 'fach-endo-temperatur', kapitel: 'fach', frage: 'Schwitzen Sie vermehrt oder frieren Sie leicht? Vertragen Sie Wärme oder Kälte schlechter als früher?' },
    { id: 'fach-endo-herz-nerven', kapitel: 'fach', frage: 'Haben Sie Herzrasen, Zittern der Hände, innere Unruhe oder umgekehrt Antriebslosigkeit und Müdigkeit bemerkt?' },
    { id: 'fach-endo-hals', kapitel: 'fach', frage: 'Haben Sie eine Schwellung am Hals, ein Engegefühl, Schluckbeschwerden oder eine Veränderung der Stimme bemerkt?' },
    { id: 'fach-endo-augen', kapitel: 'fach', frage: 'Haben sich Ihre Augen verändert — hervortretende Augen, Druckgefühl, Doppelbilder oder Sehstörungen?' },
    { id: 'fach-endo-haut-haare', kapitel: 'fach', frage: 'Haben sich Haut, Haare oder Nägel verändert? Und heilen kleine Wunden schlechter als früher?' },
    { id: 'fach-endo-unterzucker', kapitel: 'fach', frage: 'Hatten Sie Episoden mit Zittern, Schwitzen, Heißhunger oder Verwirrtheit, die nach dem Essen besser wurden?' },
    { id: 'fach-endo-folgeschaeden', kapitel: 'fach', frage: 'Haben Sie Kribbeln oder Taubheit in den Füßen, Sehverschlechterung oder Probleme mit den Nieren?' },
    { id: 'fach-endo-familie-therapie', kapitel: 'fach', frage: 'Sind Zucker- oder Schilddrüsenerkrankungen in der Familie bekannt? Werden Sie deswegen schon behandelt oder kontrolliert?' },
  ],
  // Anémie, hémopathies et troubles de la coagulation. La sonde sur les pertes
  // de sang est décisive : chez la femme réglée et chez le sujet âgé, la cause
  // d'une anémie ferriprive est une HÉMORRAGIE jusqu'à preuve du contraire.
  Hämatologie: [
    { id: 'fach-haem-leistung', kapitel: 'fach', frage: 'Fühlen Sie sich müde und weniger leistungsfähig als früher? Hat man Ihnen gesagt, dass Sie blass aussehen?' },
    { id: 'fach-haem-belastung', kapitel: 'fach', frage: 'Bekommen Sie bei Anstrengung schneller Luftnot, Herzklopfen oder Schwindel als früher?' },
    { id: 'fach-haem-blutung', kapitel: 'fach', frage: 'Bekommen Sie leicht blaue Flecken? Haben Sie Nasenbluten, Zahnfleischbluten oder kleine punktförmige Hauteinblutungen bemerkt?' },
    { id: 'fach-haem-blutverlust', kapitel: 'fach', frage: 'Haben Sie Blut im Stuhl oder schwarzen Stuhlgang bemerkt? Ist Ihre Regelblutung stark oder verlängert?' },
    { id: 'fach-haem-ernaehrung', kapitel: 'fach', frage: 'Wie ernähren Sie sich — essen Sie Fleisch? Ernähren Sie sich vegetarisch oder vegan?' },
    { id: 'fach-haem-bsymptomatik', kapitel: 'fach', frage: 'Haben Sie Fieber, Nachtschweiß — so stark, dass Sie die Wäsche wechseln müssen — oder ungewollt Gewicht verloren?' },
    { id: 'fach-haem-lymphknoten', kapitel: 'fach', frage: 'Haben Sie Schwellungen oder Knoten am Hals, in den Achseln oder in der Leiste getastet?' },
    { id: 'fach-haem-infekte', kapitel: 'fach', frage: 'Haben Sie in letzter Zeit häufiger Infekte, Fieber oder eine schlechte Wundheilung bemerkt?' },
    { id: 'fach-haem-knochen', kapitel: 'fach', frage: 'Haben Sie Knochen- oder Rückenschmerzen, die auch in Ruhe und nachts auftreten?' },
    { id: 'fach-haem-thrombose', kapitel: 'fach', frage: 'Hatten Sie schon einmal eine Thrombose oder Lungenembolie? Sind Blutgerinnungsstörungen in der Familie bekannt?' },
  ],
  // Le motif dermatologique se décrit par sa TOPOGRAPHIE et son ÉVOLUTION avant
  // son aspect : c'est ce qui distingue un eczéma de contact d'un zona ou d'un
  // exanthème médicamenteux. La sonde « grain de beauté » couvre l'ABCDE.
  Dermatologie: [
    { id: 'fach-derma-beginn-ort', kapitel: 'fach', frage: 'Wo hat die Hautveränderung angefangen, und wie hat sie sich seitdem ausgebreitet?', deepens: 'akt-ort' },
    { id: 'fach-derma-empfinden', kapitel: 'fach', frage: 'Juckt es, brennt es oder tut es weh? Und wann ist es am schlimmsten?' },
    { id: 'fach-derma-aussehen', kapitel: 'fach', frage: 'Wie sieht die Stelle aus — gerötet, schuppend, mit Bläschen, Knötchen oder nässend? Hat sie sich verändert?' },
    { id: 'fach-derma-ausloeser', kapitel: 'fach', frage: 'Gab es einen Auslöser — ein neues Medikament, eine neue Creme oder ein Waschmittel, Pflanzen, Sonne oder etwas bei der Arbeit?', deepens: 'akt-ausloeser' },
    { id: 'fach-derma-verlauf', kapitel: 'fach', frage: 'Tritt das in Schüben auf? Wird es zu bestimmten Jahreszeiten oder im Urlaub besser?', deepens: 'akt-verlauf' },
    { id: 'fach-derma-systemisch', kapitel: 'fach', frage: 'Haben Sie dazu Fieber, Gelenkschmerzen oder Veränderungen an Mund, Augen oder im Genitalbereich?' },
    { id: 'fach-derma-vorgeschichte', kapitel: 'fach', frage: 'Hatten Sie früher Hautkrankheiten wie Neurodermitis oder Schuppenflechte? Gibt es so etwas in Ihrer Familie?' },
    { id: 'fach-derma-muttermal', kapitel: 'fach', frage: 'Hat sich ein Muttermal verändert — in Größe, Farbe oder Form —, juckt es oder blutet es?' },
    { id: 'fach-derma-vorbehandlung', kapitel: 'fach', frage: 'Womit haben Sie die Stelle bisher behandelt, und hat das geholfen?' },
  ],
  // Complète la Frauenanamnese générale (règles, grossesse, contraception,
  // ménopause) : ici on entre dans le motif gynécologique lui-même.
  Gynäkologie: [
    { id: 'fach-gyn-blutung', kapitel: 'fach', frage: 'Hat sich Ihre Blutung verändert — stärker, länger, Zwischenblutungen oder Blutungen nach dem Geschlechtsverkehr?' },
    { id: 'fach-gyn-unterbauch', kapitel: 'fach', frage: 'Haben Sie Unterbauchschmerzen? Wo genau, und hängen sie mit Ihrem Zyklus zusammen?' },
    { id: 'fach-gyn-fluor', kapitel: 'fach', frage: 'Haben Sie Ausfluss bemerkt? Welche Farbe hat er, riecht er, und juckt oder brennt es dabei?' },
    { id: 'fach-gyn-dyspareunie', kapitel: 'fach', frage: 'Haben Sie Schmerzen beim Geschlechtsverkehr oder beim Wasserlassen?', deepens: 'veg-ausscheidung' },
    { id: 'fach-gyn-schwangerschaften', kapitel: 'fach', frage: 'Wie viele Schwangerschaften und Geburten hatten Sie? Gab es Fehlgeburten oder Abbrüche?' },
    { id: 'fach-gyn-kinderwunsch', kapitel: 'fach', frage: 'Besteht ein Kinderwunsch, oder gab es Schwierigkeiten, schwanger zu werden?' },
    { id: 'fach-gyn-brust', kapitel: 'fach', frage: 'Haben Sie in der Brust einen Knoten, Schmerzen, Absonderungen aus der Brustwarze oder Hautveränderungen bemerkt?' },
    { id: 'fach-gyn-vorsorge', kapitel: 'fach', frage: 'Wann waren Sie zuletzt bei der Vorsorge — Krebsabstrich, Mammographie? Sind Sie gegen HPV geimpft?' },
    { id: 'fach-gyn-eingriffe', kapitel: 'fach', frage: 'Wurden Sie schon an der Gebärmutter oder den Eierstöcken operiert? Nehmen Sie Hormone ein?' },
  ],
  // Le rein est longtemps muet : on interroge donc les signes indirects (urine
  // mousseuse, œdèmes, tension) et les néphrotoxiques, que le patient ne cite
  // jamais spontanément parce qu'ils sont en vente libre.
  Nephrologie: [
    { id: 'fach-nephro-menge', kapitel: 'fach', frage: 'Hat sich die Urinmenge verändert — deutlich weniger oder mehr? Müssen Sie nachts aufstehen?' },
    { id: 'fach-nephro-aussehen', kapitel: 'fach', frage: 'Wie sieht Ihr Urin aus — schaumig, trüb, rötlich oder cola-farben?' },
    { id: 'fach-nephro-oedeme', kapitel: 'fach', frage: 'Sind Ihre Augenlider morgens geschwollen oder die Beine abends dick? Haben Sie rasch an Gewicht zugenommen?' },
    { id: 'fach-nephro-blutdruck', kapitel: 'fach', frage: 'Ist bei Ihnen ein hoher Blutdruck bekannt, und wie ist er eingestellt?' },
    { id: 'fach-nephro-nephrotoxisch', kapitel: 'fach', frage: 'Nehmen Sie Schmerzmittel wie Ibuprofen oder Diclofenac ein — und wie oft? Hatten Sie kürzlich eine Untersuchung mit Kontrastmittel?' },
    { id: 'fach-nephro-uraemie', kapitel: 'fach', frage: 'Haben Sie Juckreiz am ganzen Körper, Übelkeit, Appetitverlust oder einen metallischen Geschmack im Mund?' },
    { id: 'fach-nephro-infekt', kapitel: 'fach', frage: 'Hatten Sie in den letzten Wochen eine Halsentzündung oder eine Hautinfektion?' },
    { id: 'fach-nephro-vorgeschichte', kapitel: 'fach', frage: 'Ist eine Nierenerkrankung bei Ihnen oder in Ihrer Familie bekannt — etwa Zystennieren oder eine Dialyse?' },
  ],
  // Sondes transversales : la B-Symptomatik et le statut de prise en charge se
  // demandent quelle que soit la localisation du cancer.
  Onkologie: [
    { id: 'fach-onko-bsymptomatik', kapitel: 'fach', frage: 'Haben Sie Fieber ohne Infekt, Nachtschweiß mit Wäschewechsel oder ungewollt Gewicht verloren — wie viel in welcher Zeit?' },
    { id: 'fach-onko-leistung', kapitel: 'fach', frage: 'Wie ist Ihre Belastbarkeit im Alltag? Was schaffen Sie nicht mehr, was vor einem halben Jahr noch ging?' },
    { id: 'fach-onko-schmerz', kapitel: 'fach', frage: 'Haben Sie Schmerzen, die nachts oder in Ruhe auftreten und allmählich stärker werden?' },
    { id: 'fach-onko-knoten', kapitel: 'fach', frage: 'Haben Sie irgendwo einen Knoten, eine Schwellung oder eine Verhärtung getastet?' },
    { id: 'fach-onko-blutung', kapitel: 'fach', frage: 'Haben Sie Blutungen bemerkt — im Stuhl, im Urin, beim Husten oder aus der Scheide?' },
    { id: 'fach-onko-appetit', kapitel: 'fach', frage: 'Haben Sie Schluckbeschwerden, ein Völlegefühl oder keinen Appetit mehr?', deepens: 'veg-appetit' },
    { id: 'fach-onko-vorbehandlung', kapitel: 'fach', frage: 'Ist bei Ihnen bereits eine Tumorerkrankung bekannt? Wurden Sie operiert, bestrahlt oder mit einer Chemotherapie behandelt?' },
    { id: 'fach-onko-familie', kapitel: 'fach', frage: 'Gibt es Krebserkrankungen in Ihrer Familie — und in welchem Alter sind die Angehörigen erkrankt?', deepens: 'fam-familie' },
    { id: 'fach-onko-vorsorge', kapitel: 'fach', frage: 'Nehmen Sie die Vorsorgeuntersuchungen wahr — Darmspiegelung, Mammographie, Hautkrebsscreening?' },
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
