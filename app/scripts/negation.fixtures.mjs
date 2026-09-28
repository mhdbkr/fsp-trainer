// Phrases RÉELLES du corpus (cas et champ en commentaire) + 5 synthétiques marquées.
// [phrase, mot cherché (première occurrence), nié ?]. Toute régression de
// isNegated se lit ici : ajouter la phrase qui a trompé la règle, jamais l'ôter.
export const NEGATION_FIXTURES = [
  // case-leberzirrhose · arztbrief.aktuelle-beschwerden
  ['Der Patient berichtete über seit drei Monaten langsam zunehmende, ständige, dumpfe und diffuse Bauchschmerzen ohne Ausstrahlung (Intensität 5/10).', 'Ausstrahlung', true],
  ['Der Patient berichtete über seit drei Monaten langsam zunehmende, ständige, dumpfe und diffuse Bauchschmerzen ohne Ausstrahlung (Intensität 5/10).', 'Bauchschmerzen', false],
  ['Ein Ikterus, Fieber, Bluterbrechen oder Teerstuhl sowie eine Verwirrtheit wurden verneint.', 'Teerstuhl', true],
  ['Ein Ikterus, Fieber, Bluterbrechen oder Teerstuhl sowie eine Verwirrtheit wurden verneint.', 'Ikterus', true],
  ['Begleitend bestünden eine Zunahme des Bauchumfangs, spontane Hämatome, eine Leistungsminderung, ein heller Stuhl und Beinödeme sowie eine Gewichtszunahme von etwa fünf Kilogramm.', 'Hämatome', false],
  // case-cholezystitis · arztbrief.allergien-noxen
  ['Allergien seien keine bekannt.', 'Allergien', true],
  // case-ulcus · arztbrief.vorerkrankungen
  ['An chronischen Vorerkrankungen leide der Patient nicht; gelegentlich bestünden Spannungskopfschmerzen.', 'Spannungskopfschmerzen', false],
  // case-depression · vorstellung.aktuelle-beschwerden
  ['Frühere manische Phasen und psychotische Symptome seien verneint worden.', 'Symptome', true],
  // case-reizdarm · vorstellung.aktuelle-beschwerden
  ['Begleitend träten ein ausgeprägter Meteorismus, Übelkeit ohne Erbrechen, Sodbrennen und ein Gefühl der unvollständigen Entleerung auf.', 'Erbrechen', true],
  ['Begleitend träten ein ausgeprägter Meteorismus, Übelkeit ohne Erbrechen, Sodbrennen und ein Gefühl der unvollständigen Entleerung auf.', 'Sodbrennen', false],
  ['Begleitend träten ein ausgeprägter Meteorismus, Übelkeit ohne Erbrechen, Sodbrennen und ein Gefühl der unvollständigen Entleerung auf.', 'Meteorismus', false],
  // case-hyperthyreose · pruefungsfallen (« nicht nur » n'est pas une négation)
  ['Der Rauchstopp ist bei dieser Patientin (30 Packungsjahre) nicht nur eine allgemeine Empfehlung, sondern eine gezielte Therapiemaßnahme wegen der endokrinen Orbitopathie — das wird von den Prüfern honoriert.', 'Orbitopathie', false],
  // case-herzinsuffizienz · vorstellung.aktuelle-beschwerden
  ['Brustschmerzen, Fieber und eine einseitige Beinschwellung seien verneint worden.', 'Fieber', true],
  // case-gicht · vorstellung.familienanamnese
  ['Ein Onkel väterlicherseits habe an einer Gicht gelitten; Nierensteine und rheumatische Erkrankungen seien in der Familie nicht bekannt.', 'Gicht', false],
  ['Ein Onkel väterlicherseits habe an einer Gicht gelitten; Nierensteine und rheumatische Erkrankungen seien in der Familie nicht bekannt.', 'Nierensteine', true],
  // case-eug · vorstellung.aktuelle-beschwerden (négation dans une subordonnée)
  ['Sie berichtet über seit drei Tagen bestehende krampfartig-ziehende Schmerzen im rechten Unterbauch mit einer Intensität von 5 von 10, die wellenförmig verlaufen, nicht ausstrahlen und nicht gewandert sind; verstärkt werden sie durch Bewegung, Aufstehen und Geschlechtsverkehr, gelindert durch Ruhe und Wärme.', 'Unterbauch', false],
  // case-panikstoerung · vorstellung.drogen
  ['Einen Drogenkonsum habe sie verneint; sie trinke jedoch etwa sechs Tassen Kaffee und zusätzlich einen Energydrink täglich, insgesamt etwa 620 mg Koffein.', 'Drogenkonsum', true],
  ['Einen Drogenkonsum habe sie verneint; sie trinke jedoch etwa sechs Tassen Kaffee und zusätzlich einen Energydrink täglich, insgesamt etwa 620 mg Koffein.', 'Kaffee', false],
  // case-lagerungsschwindel · vorstellung.frauenanamnese
  ['Eine Schwangerschaft sei ausgeschlossen, eine Verhütung und eine Hormonersatztherapie bestünden nicht; die gynäkologische Vorsorge nehme sie jährlich wahr, zuletzt vor vier Monaten ohne auffälligen Befund.', 'Hormonersatztherapie', true],
  ['Eine Schwangerschaft sei ausgeschlossen, eine Verhütung und eine Hormonersatztherapie bestünden nicht; die gynäkologische Vorsorge nehme sie jährlich wahr, zuletzt vor vier Monaten ohne auffälligen Befund.', 'Vorsorge', false],
  // case-delir · vorstellung.diagnostik-procedere
  ['Parallel die nichtmedikamentösen Basismaßnahmen mit Reorientierung, Brille und Hörgerät, Tag-Nacht-Rhythmus, Frühmobilisation und Einbeziehung der Tochter; ein Antipsychotikum nur bei Gefährdung, keine Benzodiazepine und keine Fixierung.', 'Benzodiazepine', true],
  ['Parallel die nichtmedikamentösen Basismaßnahmen mit Reorientierung, Brille und Hörgerät, Tag-Nacht-Rhythmus, Frühmobilisation und Einbeziehung der Tochter; ein Antipsychotikum nur bei Gefährdung, keine Benzodiazepine und keine Fixierung.', 'Antipsychotikum', false],
  ['Parallel die nichtmedikamentösen Basismaßnahmen mit Reorientierung, Brille und Hörgerät, Tag-Nacht-Rhythmus, Frühmobilisation und Einbeziehung der Tochter; ein Antipsychotikum nur bei Gefährdung, keine Benzodiazepine und keine Fixierung.', 'Frühmobilisation', false],
  // case-nephrotisches-syndrom · arztbrief.vorerkrankungen
  ['An Vorerkrankungen seien eine seit etwa fünf Jahren bekannte, bislang gut eingestellte arterielle Hypertonie, eine Gonarthrose rechts seit etwa drei Jahren sowie eine allergische Rhinitis bekannt; ein Diabetes mellitus und Nierenerkrankungen wurden verneint.', 'Gonarthrose', false],
  ['An Vorerkrankungen seien eine seit etwa fünf Jahren bekannte, bislang gut eingestellte arterielle Hypertonie, eine Gonarthrose rechts seit etwa drei Jahren sowie eine allergische Rhinitis bekannt; ein Diabetes mellitus und Nierenerkrankungen wurden verneint.', 'Diabetes mellitus', true],
  // case-lumboischialgie · medicalView.diagnostik
  ['Systematische Red-Flag-Anamnese — bei diesem Patienten sämtlich negativ: Alter 42, kein Trauma, keine Osteoporose, kein Kortison, kein Fieber, kein Infekt, keine Tumoranamnese, kein Gewichtsverlust, kein Ruhe- oder Nachtschmerz ohne Lageabhängigkeit, keine Morgensteifigkeit über 30 Minuten, kein Kribbeln, keine Taubheit, keine Schwäche, keine Reithosenanästhesie, keine Blasen- oder Mastdarmstörung, kein intravenöser Drogenkonsum', 'Osteoporose', true],
  ['Systematische Red-Flag-Anamnese — bei diesem Patienten sämtlich negativ: Alter 42, kein Trauma, keine Osteoporose, kein Kortison, kein Fieber, kein Infekt, keine Tumoranamnese, kein Gewichtsverlust, kein Ruhe- oder Nachtschmerz ohne Lageabhängigkeit, keine Morgensteifigkeit über 30 Minuten, kein Kribbeln, keine Taubheit, keine Schwäche, keine Reithosenanästhesie, keine Blasen- oder Mastdarmstörung, kein intravenöser Drogenkonsum', 'Alter', false],
  // case-arterielle-hypertonie · vorstellung.diagnostik-procedere
  ['Die anamnestischen Angaben und der Befund sprechen am ehesten für eine hypertensive Entgleisung ohne akuten Endorganschaden bei bekannter, schlecht eingestellter arterieller Hypertonie — ausgelöst durch das Absetzen des Ramipril, die Ibuprofen-Einnahme und den Stress; zusätzlich vermute ich ein obstruktives Schlafapnoe-Syndrom.', 'Hypertonie', false],
  ['Die anamnestischen Angaben und der Befund sprechen am ehesten für eine hypertensive Entgleisung ohne akuten Endorganschaden bei bekannter, schlecht eingestellter arterieller Hypertonie — ausgelöst durch das Absetzen des Ramipril, die Ibuprofen-Einnahme und den Stress; zusätzlich vermute ich ein obstruktives Schlafapnoe-Syndrom.', 'Endorganschaden', true],
  // case-cml · pruefungsfallen
  ['Die Lymphknoten sind bei der CML NICHT vergrößert — wer Lymphadenopathie dokumentiert, die der Patient verneint, verrät, dass er an CLL oder Lymphom denkt.', 'Lymphknoten', true],
  // case-bph · vorstellung.sozialanamnese
  ['Er wohne mit seiner Ehefrau in einer Wohnung im ersten Stock ohne Aufzug, versorge sich vollständig selbst und gehe dreimal wöchentlich zum Kegeln; Busausflüge und Kinobesuche meide er inzwischen, weil er ständig eine Toilette in der Nähe brauche.', 'Ehefrau', false],
  // case-septische-arthritis · vorstellung.aktuelle-beschwerden
  ['Ein Trauma, ein Befall weiterer Gelenke, eine verlängerte Morgensteifigkeit, ein Zeckenstich sowie ein vorangegangener Racheninfekt seien verneint worden.', 'Zeckenstich', true],
  // case-schizophrenie · arztbrief.medikation
  ['Die Einnahme von Antikoagulanzien, Glukokortikoiden und Psychopharmaka wurde verneint.', 'Psychopharmaka', true],
  // case-bronchialkarzinom · arztbrief.medikation (« ohne » ne nie que son groupe)
  ['In Selbstmedikation seien Hustensaft und ein schleimlösendes Präparat ohne Wirkung eingenommen worden.', 'Hustensaft', false],
  // case-struma · arztbrief.vorerkrankungen
  ['Eine Bestrahlung im Kopf- oder Halsbereich in der Kindheit wurde verneint.', 'Bestrahlung', true],
  // case-abszess · vorstellung.aktuelle-beschwerden
  ['Eine Ausstrahlung ins Bein, Taubheitsgefühle, perianale Beschwerden und ein Trauma seien verneint worden; Paracetamol sei wirkungslos geblieben.', 'Taubheitsgefühle', true],
  ['Eine Ausstrahlung ins Bein, Taubheitsgefühle, perianale Beschwerden und ein Trauma seien verneint worden; Paracetamol sei wirkungslos geblieben.', 'Paracetamol', false],
  // case-anaphylaxie · vorstellung.alkohol
  ['Am Wochenende trinkt sie ein bis zwei Gläser Weißwein; heute hat sie keinen Alkohol getrunken.', 'Weißwein', false],
  ['Am Wochenende trinkt sie ein bis zwei Gläser Weißwein; heute hat sie keinen Alkohol getrunken.', 'Alkohol', true],
  // case-endokarditis · arztbrief.allergien-noxen
  ['Ein Drogenkonsum, insbesondere intravenös, sei verneint worden.', 'Drogenkonsum', true],
  // SYNTHÉTIQUES — verbe de négation antéposé, adversative, composés
  ['Der Patient verneint Fieber und Nachtschweiß, klagt aber über Husten.', 'Nachtschweiß', true],
  ['Der Patient verneint Fieber und Nachtschweiß, klagt aber über Husten.', 'Husten', false],
  ['Kein Hinweis auf eine Pneumonie, aber eine Pleuritis.', 'Pneumonie', true],
  ['Kein Hinweis auf eine Pneumonie, aber eine Pleuritis.', 'Pleuritis', false],
  ['Es handelt sich um einen Nicht-ST-Hebungsinfarkt.', 'Nicht-ST-Hebungsinfarkt', false],
  ['Therapie mit nichtsteroidalen Antirheumatika.', 'Antirheumatika', false],
];
