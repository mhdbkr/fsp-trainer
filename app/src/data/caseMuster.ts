import type { CaseMuster } from '@/db/types';

// ============================================================================
// MUSTER — phrases-modèles AUTHORÉES, personnalisées à 100 % à chaque cas.
//
// Contrat de couverture (jumeau de anamneseProbes) : chaque chapitre de contenu
// des guides Arztbrief (écrit) et Fallvorstellung (oral) reçoit UNE phrase
// rédigée à la main, cohérente avec la fiche patient (nom, sexe, plaintes,
// antécédents, chiffres) et calée sur les slots du guide. La grammaire vit dans
// du texte relu — jamais générée à l'exécution. Le validateur
// scripts/checkMusterCoverage.mjs refuse tout trou.
//
// Registre :
//  • arztbrief   — courrier : Konjunktiv I (propos rapportés), Passiv (mesures),
//                  Präteritum (état). Aucune formule orale.
//  • vorstellung — oral Arzt-Arzt : « ich möchte vorstellen », « schlage vor »…
//
// Chapitres couverts (ids = guides correspondants) :
//  arztbrief   : einleitung · patientenzustand · aktuelle-beschwerden ·
//                vorerkrankungen · medikation · allergien-noxen · familie-sozial
//                · diagnose · diagnostik-therapie
//  vorstellung : persoenliche-daten · allgemeinzustand · aktuelle-beschwerden ·
//                allergien · rauchen · alkohol · drogen · sozialanamnese ·
//                familienanamnese · vorerkrankungen · medikation ·
//                diagnostik-procedere (+ frauenanamnese si patiente)
// ============================================================================

export const CASE_MUSTER: Record<string, CaseMuster> = {
  // ── Kardiologie ──────────────────────────────────────────────────────────
  'case-angina-pectoris': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Herrn Manfred Bauer, einen 64-jährigen Patienten, der sich am Aufnahmetag mit seit einigen Wochen bestehenden belastungsabhängigen retrosternalen Druckschmerzen in unserer Ambulanz vorstellte.',
      patientenzustand: 'Herr Bauer befand sich in gutem Allgemeinzustand und präadipösem Ernährungszustand und war zu Ort, Zeit, Person und Situation voll orientiert.',
      'aktuelle-beschwerden': 'Der Patient berichtete über seit einigen Wochen bestehende, belastungsabhängige drückende Schmerzen hinter dem Brustbein mit Ausstrahlung in den linken Arm und den Unterkiefer (Intensität 6/10), die beim Treppensteigen und bei Kälte aufträten und sich in Ruhe besserten. Begleitend bestünden eine Belastungsdyspnoe und gelegentliches Schwitzen während der Anfälle. Ruheschmerzen, nächtliche Beschwerden sowie ein Zusammenhang mit der Atmung oder der Nahrungsaufnahme wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen leide der Patient an einer arteriellen Hypertonie seit zehn Jahren, einem Diabetes mellitus Typ 2 sowie einer Hypercholesterinämie. Voroperationen seien keine bekannt.',
      medikation: 'Der Patient nehme regelmäßig Ramipril 5 mg (1-0-0), Metformin 1000 mg (1-0-1) und Atorvastatin 20 mg (0-0-1) ein.',
      'allergien-noxen': 'Allergien seien keine bekannt. Es bestehe ein Nikotinkonsum von 30 Packungsjahren (eine Schachtel täglich seit 30 Jahren); Alkohol werde gelegentlich in Form von Bier am Wochenende konsumiert, ein Drogenkonsum werde verneint.',
      'familie-sozial': 'In der Familienanamnese sei der Vater im Alter von 60 Jahren an einem Myokardinfarkt verstorben, die Mutter leide an einem Diabetes mellitus. Der Patient sei verheiratet, habe zwei erwachsene Kinder, wohne mit seiner Ehefrau im zweiten Stock ohne Aufzug und sei berentet (früher als Busfahrer tätig).',
      diagnose: 'Die Anamnese deutet am ehesten auf eine stabile Angina pectoris bei koronarer Herzkrankheit hin. Differenzialdiagnostisch kommen ein akutes Koronarsyndrom, eine Refluxkrankheit sowie eine Lungenembolie in Betracht.',
      'diagnostik-therapie': 'Es wurden ein Ruhe-EKG geschrieben sowie Troponin, Lipidstatus und HbA1c bestimmt; ergänzend wurden ein Belastungs-EKG bzw. eine Stressechokardiographie und ggf. eine Koronarangiographie angemeldet. Therapeutisch wurden ASS, ein Statin und ein Betablocker eingeleitet, Nitrospray bei Bedarf verordnet sowie ein konsequentes Risikofaktorenmanagement mit Nikotinkarenz empfohlen.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Herrn Manfred Bauer vorstellen, einen 64-jährigen Patienten, der sich wegen seit einigen Wochen bestehender belastungsabhängiger Brustschmerzen in unserer Ambulanz vorstellte.',
      allgemeinzustand: 'Herr Bauer befand sich in gutem Allgemeinzustand und präadipösem Ernährungszustand und war zu Ort, Zeit, Person und Situation voll orientiert.',
      'aktuelle-beschwerden': 'Er stellte sich wegen seit einigen Wochen bestehender, belastungsabhängiger drückender Schmerzen hinter dem Brustbein mit Ausstrahlung in den linken Arm und den Unterkiefer vor. Die Schmerzintensität läge bei 6 von 10. Als Auslöser gebe er Treppensteigen und Kälte an, in Ruhe besserten sich die Beschwerden. Begleitend träten eine Belastungsdyspnoe und Schwitzen auf. Ruheschmerzen und nächtliche Beschwerden seien verneint worden.',
      allergien: 'Bei dem Patienten seien keine Allergien bekannt.',
      rauchen: 'Der Patient rauche eine Schachtel Zigaretten pro Tag, und dies seit 30 Jahren (30 py).',
      alkohol: 'Gelegentlich trinke er Alkohol, und zwar Bier am Wochenende.',
      drogen: 'Einen Drogenkonsum habe er verneint.',
      sozialanamnese: 'Er sei berentet, früher als Busfahrer tätig, verheiratet und habe zwei erwachsene Kinder. Er wohne mit seiner Ehefrau im zweiten Stock ohne Aufzug.',
      familienanamnese: 'Der Vater sei mit 60 Jahren an einem Herzinfarkt verstorben, die Mutter leide an einem Diabetes mellitus.',
      vorerkrankungen: 'Bekannt seien eine arterielle Hypertonie seit zehn Jahren, ein Diabetes mellitus Typ 2 und eine Hypercholesterinämie. Voroperationen seien keine bekannt.',
      medikation: 'Er nehme regelmäßig Ramipril 5 mg (1-0-0), Metformin 1000 mg (1-0-1) und Atorvastatin 20 mg (0-0-1) ein.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine stabile Angina pectoris bei KHK hin. Als Differenzialdiagnosen kommen ein akutes Koronarsyndrom, eine Refluxkrankheit und eine Lungenembolie in Betracht. Zur Abklärung schlage ich ein Ruhe- und Belastungs-EKG, Labor mit Troponin und Lipiden sowie ggf. eine Koronarangiographie vor. Therapeutisch empfehle ich ASS, Statin, Betablocker, Nitro bei Bedarf und eine konsequente Kontrolle der Risikofaktoren.',
    },
  },

  'case-myokardinfarkt': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Herrn Dieter Fischer, einen 59-jährigen Patienten, der sich am Aufnahmetag notfallmäßig mit seit 45 Minuten bestehenden stärksten retrosternalen Schmerzen in unserer Notaufnahme vorstellte.',
      patientenzustand: 'Herr Fischer befand sich in schmerzbedingt deutlich reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Der Patient berichtete über seit 45 Minuten bestehende, auch in Ruhe aufgetretene stärkste, drückende retrosternale Vernichtungsschmerzen mit Ausstrahlung in den linken Arm und den Unterkiefer (Intensität 10/10). Begleitend bestünden Kaltschweißigkeit, Übelkeit und Todesangst. Ein Zusammenhang mit der Atmung sowie frühere derartige Beschwerden wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen leide der Patient an einer arteriellen Hypertonie und einer Hypercholesterinämie. Voroperationen seien keine bekannt.',
      medikation: 'Der Patient nehme regelmäßig Amlodipin 5 mg (1-0-0) ein.',
      'allergien-noxen': 'Allergien seien keine bekannt. Es bestehe ein Nikotinkonsum von 40 Packungsjahren (starker Raucher); Alkohol werde gelegentlich konsumiert, ein Drogenkonsum werde verneint.',
      'familie-sozial': 'In der Familienanamnese habe der Bruder im Alter von 55 Jahren einen Myokardinfarkt erlitten. Der Patient sei verheiratet, habe drei Kinder und sei als Bauleiter berufstätig.',
      diagnose: 'Die Anamnese deutet am ehesten auf einen akuten ST-Hebungsinfarkt (STEMI) hin. Differenzialdiagnostisch kommen eine Lungenembolie, eine Aortendissektion sowie eine Perikarditis in Betracht.',
      'diagnostik-therapie': 'Es wurde umgehend ein 12-Kanal-EKG geschrieben (innerhalb von 10 Minuten), Troponin und CK-MB wurden bestimmt und eine sofortige Koronarangiographie veranlasst. Therapeutisch wurde eine leitliniengerechte Akuttherapie (Sauerstoff bei Bedarf, Nitrat, ASS und Heparin, Analgesie, Betablocker) eingeleitet und eine sofortige PTCA mit Stentimplantation angestrebt.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Herrn Dieter Fischer vorstellen, einen 59-jährigen Patienten, der sich notfallmäßig wegen seit 45 Minuten bestehender stärkster Brustschmerzen in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Herr Fischer befand sich in schmerzbedingt deutlich reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Er stellte sich wegen seit 45 Minuten auch in Ruhe bestehender stärkster drückender Schmerzen hinter dem Brustbein mit Ausstrahlung in den linken Arm und den Unterkiefer vor. Die Schmerzintensität läge bei 10 von 10. Begleitend träten Kaltschweißigkeit, Übelkeit und Todesangst auf. Ein Zusammenhang mit der Atmung sei verneint worden.',
      allergien: 'Bei dem Patienten seien keine Allergien bekannt.',
      rauchen: 'Der Patient sei starker Raucher, insgesamt 40 py.',
      alkohol: 'Er trinke gelegentlich Alkohol.',
      drogen: 'Einen Drogenkonsum habe er verneint.',
      sozialanamnese: 'Er sei als Bauleiter tätig, verheiratet und habe drei Kinder.',
      familienanamnese: 'Der Bruder habe im Alter von 55 Jahren einen Herzinfarkt erlitten.',
      vorerkrankungen: 'Bekannt seien eine arterielle Hypertonie und eine Hypercholesterinämie; Voroperationen bestünden keine.',
      medikation: 'Er nehme regelmäßig Amlodipin 5 mg ein.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten hochgradig auf einen akuten STEMI hin. Als Differenzialdiagnosen kommen eine Lungenembolie, eine Aortendissektion und eine Perikarditis in Betracht. Ich schlage ein sofortiges 12-Kanal-EKG, Troponin und eine umgehende Koronarangiographie vor. Therapeutisch empfehle ich die Akuttherapie mit O2 bei Bedarf, Nitro, ASS und Heparin, Analgesie und eine sofortige PTCA mit Stent.',
    },
  },

  // ── Chirurgie / Gastroenterologie ────────────────────────────────────────
  'case-cholezystitis': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Frau Rosa Schneider, eine 49-jährige Patientin, die sich am Aufnahmetag mit seit dem Vortag bestehenden starken Schmerzen im rechten Oberbauch nach fettigem Essen in unserer Notaufnahme vorstellte.',
      patientenzustand: 'Frau Schneider befand sich in schmerzbedingt reduziertem Allgemeinzustand und normalem Ernährungszustand und war zu allen Qualitäten voll orientiert.',
      'aktuelle-beschwerden': 'Die Patientin berichtete über seit dem Vortag nach fettigem Essen aufgetretene, zunächst kolikartige, dann anhaltende Schmerzen im rechten Oberbauch mit Ausstrahlung in die rechte Schulter (Intensität 7/10). Begleitend bestünden Übelkeit, Fieber und Schüttelfrost bei vermindertem Appetit. Ein Ikterus, Bluterbrechen, dunkler Urin oder ein entfärbter Stuhl wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen sei ein Gallensteinleiden bekannt. Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme werde verneint.',
      'allergien-noxen': 'Allergien seien keine bekannt. Die Patientin sei Nichtraucherin, konsumiere gelegentlich ein Glas Wein und verneine einen Drogenkonsum.',
      'familie-sozial': 'In der Familienanamnese habe die Mutter ebenfalls an Gallensteinen gelitten. Die Patientin sei verheiratet, habe zwei Kinder und sei als Köchin berufstätig.',
      diagnose: 'Die Anamnese deutet am ehesten auf eine akute Cholezystitis bei Cholezystolithiasis hin. Differenzialdiagnostisch kommen eine akute Pankreatitis, ein Ulcus sowie ein Hinterwandinfarkt in Betracht.',
      'diagnostik-therapie': 'Es wurden Labor (CRP, Blutbild, Leber- und Cholestasewerte, Lipase) abgenommen und eine Abdomensonographie (Murphy-Zeichen, Wandverdickung) angemeldet, ggf. ergänzt durch eine MRCP/ERCP. Therapeutisch wurden Nahrungskarenz, Analgesie und eine antibiotische Therapie eingeleitet; eine frühe laparoskopische Cholezystektomie wurde geplant.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Frau Rosa Schneider vorstellen, eine 49-jährige Patientin, die sich wegen seit dem Vortag bestehender starker Schmerzen im rechten Oberbauch in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Frau Schneider befand sich in schmerzbedingt reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Sie stellte sich wegen seit dem Vortag nach fettigem Essen aufgetretener, kolikartig-anhaltender Schmerzen im rechten Oberbauch mit Ausstrahlung in die rechte Schulter vor. Die Schmerzintensität läge bei 7 von 10. Begleitend träten Übelkeit, Fieber und Schüttelfrost auf. Ein Ikterus und dunkler Urin seien verneint worden.',
      allergien: 'Bei der Patientin seien keine Allergien bekannt.',
      rauchen: 'Die Patientin sei Nichtraucherin.',
      alkohol: 'Gelegentlich trinke sie ein Glas Wein.',
      drogen: 'Einen Drogenkonsum habe sie verneint.',
      sozialanamnese: 'Sie sei als Köchin tätig, verheiratet und habe zwei Kinder.',
      familienanamnese: 'Die Mutter habe ebenfalls an Gallensteinen gelitten.',
      vorerkrankungen: 'Bekannt sei ein Gallensteinleiden; Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme habe sie verneint.',
      frauenanamnese: 'Eine aktuelle Schwangerschaft habe sie verneint, die Menstruation sei regelmäßig.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine akute Cholezystitis bei Gallensteinen hin. Als Differenzialdiagnosen kommen eine Pankreatitis, ein Ulcus und ein Hinterwandinfarkt in Betracht. Ich schlage Labor, eine Abdomensonographie und ggf. eine MRCP vor. Therapeutisch empfehle ich Nahrungskarenz, Analgesie, Antibiotika und eine frühe laparoskopische Cholezystektomie.',
    },
  },

  'case-pankreatitis': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Frau Gisela Hoffmann, eine 55-jährige Patientin, die sich am Aufnahmetag mit seit dem Vorabend bestehenden heftigen Oberbauchschmerzen in unserer Notaufnahme vorstellte.',
      patientenzustand: 'Frau Hoffmann befand sich in schmerzbedingt reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Die Patientin berichtete über seit dem Vorabend nach fettigem Essen aufgetretene, bohrende, ständige Oberbauchschmerzen mit gürtelförmiger Ausstrahlung in den Rücken (Intensität 8/10), die durch Essen und Rückenlage verstärkt und durch Vornüberbeugen gelindert würden. Begleitend bestünden Übelkeit, mehrfaches Erbrechen, ein aufgeblähter Bauch, dunkler Urin und ein hellerer Stuhl sowie ein Stuhl- und Windverhalt. Ein Bluterbrechen und ein gemessenes Fieber wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen sei ein Gallensteinleiden bekannt (seit zwei Jahren sonographisch gesichert). Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme werde verneint.',
      'allergien-noxen': 'Allergien seien keine bekannt. Die Patientin sei Nichtraucherin, trinke selten ein Glas Wein zum Essen und verneine einen Drogenkonsum.',
      'familie-sozial': 'In der Familienanamnese habe die Mutter ebenfalls an Gallensteinen gelitten. Die Patientin sei verheiratet, habe drei Kinder und sei als Verkäuferin berufstätig.',
      diagnose: 'Die Anamnese deutet am ehesten auf eine akute biliäre Pankreatitis hin. Differenzialdiagnostisch kommen eine akute Cholezystitis, ein perforiertes Ulkus sowie ein Hinterwandinfarkt in Betracht.',
      'diagnostik-therapie': 'Es wurden Lipase, Amylase, CRP, Kalzium und Leberwerte bestimmt sowie eine Abdomensonographie (Steine), ein CT-Abdomen mit Kontrastmittel und bei Obstruktion eine ERCP veranlasst. Therapeutisch wurden eine Volumentherapie, eine Analgesie und ein früher enteraler Kostaufbau eingeleitet; bei biliärer Obstruktion wurde eine ERCP mit Papillotomie vorgesehen.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Frau Gisela Hoffmann vorstellen, eine 55-jährige Patientin, die sich wegen seit dem Vorabend bestehender heftiger Oberbauchschmerzen in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Frau Hoffmann befand sich in schmerzbedingt reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Sie stellte sich wegen seit dem Vorabend nach fettigem Essen aufgetretener, bohrender Oberbauchschmerzen mit gürtelförmiger Ausstrahlung in den Rücken vor. Die Schmerzintensität läge bei 8 von 10. Verstärkt würden die Beschwerden durch Essen und Rückenlage, gelindert durch Vornüberbeugen. Begleitend träten Übelkeit und mehrfaches Erbrechen auf. Ein Bluterbrechen sei verneint worden.',
      allergien: 'Bei der Patientin seien keine Allergien bekannt.',
      rauchen: 'Die Patientin sei Nichtraucherin.',
      alkohol: 'Sie trinke selten ein Glas Wein zum Essen.',
      drogen: 'Einen Drogenkonsum habe sie verneint.',
      sozialanamnese: 'Sie sei als Verkäuferin tätig, verheiratet und habe drei Kinder.',
      familienanamnese: 'Die Mutter habe ebenfalls an Gallensteinen gelitten.',
      vorerkrankungen: 'Bekannt sei ein Gallensteinleiden (seit zwei Jahren sonographisch gesichert); Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme habe sie verneint.',
      frauenanamnese: 'Sie befinde sich in der Postmenopause; eine Schwangerschaft sei somit ausgeschlossen.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine akute biliäre Pankreatitis hin. Als Differenzialdiagnosen kommen eine Cholezystitis, ein perforiertes Ulkus und ein Hinterwandinfarkt in Betracht. Ich schlage Labor mit Lipase und Amylase, eine Sonographie, ein CT-Abdomen und ggf. eine ERCP vor. Therapeutisch empfehle ich Volumentherapie, Analgesie, einen frühen Kostaufbau und bei biliärer Obstruktion eine ERCP mit Papillotomie.',
    },
  },

  'case-divertikulitis': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Frau Ursula Maier, eine 67-jährige Patientin, die sich am Aufnahmetag mit seit drei Tagen bestehenden Schmerzen im linken Unterbauch in unserer Notaufnahme vorstellte.',
      patientenzustand: 'Frau Maier befand sich in leicht reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Die Patientin berichtete über seit drei Tagen bestehende, dumpf-drückende Schmerzen im linken Unterbauch (Intensität 6/10). Begleitend bestünden Fieber bis 38,5 °C, eine Obstipation und ein verminderter Appetit. Blut im Stuhl, Erbrechen, ein Gewichtsverlust sowie eine Dysurie wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen sei eine Divertikulose bekannt (Koloskopie vor zwei Jahren). Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme werde verneint.',
      'allergien-noxen': 'Es bestehe eine Penicillinallergie, auf die die Patientin mit einem Hautausschlag reagiere. Sie sei Nichtraucherin, trinke selten ein Glas Wein und verneine einen Drogenkonsum.',
      'familie-sozial': 'Die Familienanamnese sei unauffällig. Die Patientin sei verheiratet, habe zwei Kinder und sei berentet.',
      diagnose: 'Die Anamnese deutet am ehesten auf eine akute Divertikulitis des Sigmas hin. Differenzialdiagnostisch kommen ein kolorektales Karzinom, ein Reizdarmsyndrom sowie ein Harnwegsinfekt in Betracht.',
      'diagnostik-therapie': 'Es wurden Labor (CRP, Blutbild) abgenommen und eine Abdomensonographie sowie ein CT-Abdomen angemeldet; eine Koloskopie wurde erst für das beschwerdefreie Intervall geplant (nicht in der Akutphase). Therapeutisch wurden eine antibiotische Behandlung, eine Nahrungskarenz bzw. leichte Kost und eine Analgesie eingeleitet.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Frau Ursula Maier vorstellen, eine 67-jährige Patientin, die sich wegen seit drei Tagen bestehender Schmerzen im linken Unterbauch in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Frau Maier befand sich in leicht reduziertem Allgemeinzustand und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Sie stellte sich wegen seit drei Tagen bestehender dumpf-drückender Schmerzen im linken Unterbauch vor. Die Schmerzintensität läge bei 6 von 10. Begleitend träten Fieber und eine Verstopfung auf. Blut im Stuhl und Erbrechen seien verneint worden.',
      allergien: 'Es bestehe eine Penicillinallergie, auf die sie mit einem Hautausschlag reagiere.',
      rauchen: 'Die Patientin sei Nichtraucherin.',
      alkohol: 'Sie trinke selten ein Glas Wein.',
      drogen: 'Einen Drogenkonsum habe sie verneint.',
      sozialanamnese: 'Sie sei Rentnerin, verheiratet und habe zwei Kinder.',
      familienanamnese: 'Die Familienanamnese sei unauffällig.',
      vorerkrankungen: 'Bekannt sei eine Divertikulose (Koloskopie vor zwei Jahren); Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme habe sie verneint.',
      frauenanamnese: 'Sie befinde sich in der Postmenopause; eine Schwangerschaft sei somit ausgeschlossen.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine akute Divertikulitis hin. Als Differenzialdiagnosen kommen ein kolorektales Karzinom, ein Reizdarmsyndrom und ein Harnwegsinfekt in Betracht. Ich schlage Labor, eine Sonographie und ein CT-Abdomen vor, eine Koloskopie erst im Intervall. Therapeutisch empfehle ich Antibiotika, leichte Kost und Analgesie.',
    },
  },

  'case-gerd': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Frau Sabine Wolf, eine 42-jährige Patientin, die sich mit seit Monaten bestehendem Sodbrennen, besonders nach dem Essen und im Liegen, in unserer Sprechstunde vorstellte.',
      patientenzustand: 'Frau Wolf befand sich in gutem Allgemeinzustand und adipösem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Die Patientin berichtete über seit Monaten bestehendes brennendes Sodbrennen hinter dem Brustbein (Intensität 4/10), das durch Liegen, fettiges Essen und Kaffee verstärkt und durch Aufrechtsitzen und Antazida gelindert werde. Begleitend bestünden saures Aufstoßen und gelegentlich ein nächtlicher Reizhusten. Schluckbeschwerden, ein Gewichtsverlust, Bluterbrechen oder ein belastungsabhängiger Brustschmerz wurden verneint (Alarmsymptome negativ).',
      vorerkrankungen: 'An Vorerkrankungen bestehe eine Adipositas. Voroperationen seien keine bekannt.',
      medikation: 'Die Patientin nehme gelegentlich rezeptfreie Antazida ein; eine regelmäßige Medikamenteneinnahme werde verneint.',
      'allergien-noxen': 'Allergien seien keine bekannt. Es bestehe ein Nikotinkonsum von 10 Packungsjahren; Alkohol werde in Form von Wein am Wochenende konsumiert, ein Drogenkonsum werde verneint.',
      'familie-sozial': 'Die Familienanamnese sei unauffällig. Die Patientin sei ledig und als Bürokauffrau berufstätig.',
      diagnose: 'Die Anamnese deutet am ehesten auf eine gastroösophageale Refluxkrankheit hin. Differenzialdiagnostisch kommen eine Angina pectoris, ein Ulcus sowie ein Ösophaguskarzinom in Betracht.',
      'diagnostik-therapie': 'Bei fehlenden Alarmsymptomen wurde zunächst ein klinischer Behandlungsversuch mit einem PPI eingeleitet; eine ÖGD wurde für den Fall von Alarmsymptomen bzw. Therapieversagen vorgesehen, ggf. ergänzt durch eine 24-Stunden-pH-Metrie. Ergänzend wurden Lebensstilmaßnahmen (Gewichtsreduktion, Nikotinkarenz, kleine Mahlzeiten, Oberkörperhochlagerung) empfohlen.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Frau Sabine Wolf vorstellen, eine 42-jährige Patientin, die sich wegen seit Monaten bestehenden Sodbrennens in unserer Sprechstunde vorstellte.',
      allgemeinzustand: 'Frau Wolf befand sich in gutem Allgemeinzustand und adipösem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Sie stellte sich wegen seit Monaten bestehenden brennenden Sodbrennens hinter dem Brustbein vor. Die Beschwerden würden durch Liegen und fettiges Essen verstärkt und durch Aufrechtsitzen gelindert. Begleitend träten saures Aufstoßen und ein nächtlicher Reizhusten auf. Schluckbeschwerden und ein Gewichtsverlust seien verneint worden.',
      allergien: 'Bei der Patientin seien keine Allergien bekannt.',
      rauchen: 'Die Patientin rauche, insgesamt 10 py.',
      alkohol: 'Sie trinke Wein am Wochenende.',
      drogen: 'Einen Drogenkonsum habe sie verneint.',
      sozialanamnese: 'Sie sei ledig und als Bürokauffrau tätig.',
      familienanamnese: 'Die Familienanamnese sei unauffällig.',
      vorerkrankungen: 'Bekannt sei eine Adipositas; Voroperationen bestünden keine.',
      medikation: 'Sie nehme gelegentlich rezeptfreie Antazida ein, sonst keine regelmäßigen Medikamente.',
      frauenanamnese: 'Eine Schwangerschaft habe sie verneint, die Menstruation sei regelmäßig; ein hormonelles Verhütungsmittel nehme sie nicht ein.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine Refluxkrankheit hin. Als Differenzialdiagnosen kommen eine Angina pectoris, ein Ulcus und ein Ösophaguskarzinom in Betracht. Bei fehlenden Alarmsymptomen schlage ich einen PPI-Versuch vor, eine ÖGD nur bei Alarmsymptomen. Therapeutisch empfehle ich einen PPI und Lebensstilmaßnahmen.',
    },
  },

  'case-gib': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Herrn Werner Klein, einen 71-jährigen Patienten, der sich am Aufnahmetag notfallmäßig mit seit dem Morgen bestehendem Teerstuhl und einmaligem kaffeesatzartigem Erbrechen in unserer Notaufnahme vorstellte.',
      patientenzustand: 'Herr Klein befand sich in reduziertem Allgemeinzustand mit Blässe und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Der Patient berichtete über seit dem Morgen bestehenden schwarzen, klebrigen Stuhl und einmaliges kaffeesatzartiges Erbrechen sowie über seit Wochen bestehende brennende Oberbauchschmerzen (Intensität 4/10), die nüchtern zunähmen. Begleitend bestünden Schwindel beim Aufstehen, Schwäche und Blässe. Ein hellrotes Bluterbrechen, Fieber sowie eine bekannte Lebererkrankung wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen leide der Patient an einer Kniearthrose (mit häufiger Selbstmedikation von Schmerzmitteln) und einer arteriellen Hypertonie. Zustand nach Hüft-TEP rechts vor drei Jahren.',
      medikation: 'Der Patient nehme mehrmals täglich selbst gekauftes Ibuprofen 600 mg ein sowie Ramipril 5 mg (1-0-0) und ASS 100 mg (1-0-0).',
      'allergien-noxen': 'Allergien seien keine bekannt. Der Patient sei Ex-Raucher (20 py, vor zehn Jahren aufgegeben) und trinke täglich zwei Bier; ein Drogenkonsum werde verneint.',
      'familie-sozial': 'Die Familienanamnese sei unauffällig, ein Magenkarzinom sei nicht bekannt. Der Patient sei verwitwet, lebe allein, werde von einem in der Nähe wohnenden Sohn unterstützt und sei berentet.',
      diagnose: 'Die Anamnese deutet am ehesten auf eine obere gastrointestinale Blutung bei NSAR-induziertem Ulcus ventriculi hin. Differenzialdiagnostisch kommen eine Ösophagusvarizenblutung, eine Mallory-Weiss-Läsion sowie ein Magenkarzinom in Betracht.',
      'diagnostik-therapie': 'Der Patient wurde unter Kreislaufmonitoring stationär aufgenommen; es wurden Blutbild (Hämoglobin), Gerinnung sowie Blutgruppe und Kreuzblut bestimmt und eine Notfall-ÖGD veranlasst. Therapeutisch wurden eine Kreislaufstabilisierung mit Volumengabe (ggf. Transfusion), eine hochdosierte intravenöse PPI-Gabe sowie das Absetzen von NSAR und ASS eingeleitet.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Herrn Werner Klein vorstellen, einen 71-jährigen Patienten, der sich notfallmäßig wegen seit dem Morgen bestehenden Teerstuhls und kaffeesatzartigen Erbrechens in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Herr Klein befand sich in reduziertem Allgemeinzustand mit Blässe und normalem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Er stellte sich wegen seit dem Morgen bestehenden schwarzen Stuhls und einmaligen kaffeesatzartigen Erbrechens vor, bei seit Wochen bestehenden nüchternen Oberbauchschmerzen. Begleitend träten Schwindel, Schwäche und Blässe auf. Ein hellrotes Bluterbrechen sei verneint worden.',
      allergien: 'Bei dem Patienten seien keine Allergien bekannt.',
      rauchen: 'Der Patient sei Ex-Raucher; früher habe er über 20 py geraucht und vor zehn Jahren aufgehört.',
      alkohol: 'Er trinke täglich zwei Bier.',
      drogen: 'Einen Drogenkonsum habe er verneint.',
      sozialanamnese: 'Er sei verwitwet, lebe allein, werde von einem Sohn in der Nähe unterstützt und sei Rentner.',
      familienanamnese: 'Die Familienanamnese sei unauffällig, ein Magenkarzinom sei nicht bekannt.',
      vorerkrankungen: 'Bekannt seien eine Kniearthrose und eine arterielle Hypertonie; Zustand nach Hüft-TEP rechts vor drei Jahren.',
      medikation: 'Er nehme mehrmals täglich Ibuprofen 600 mg (selbst gekauft) sowie Ramipril 5 mg und ASS 100 mg ein.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine obere GI-Blutung bei NSAR-Ulcus hin. Als Differenzialdiagnosen kommen eine Varizenblutung, eine Mallory-Weiss-Läsion und ein Magenkarzinom in Betracht. Ich schlage ein Kreislaufmonitoring, Labor mit Hämoglobin und Gerinnung, Blutgruppe und Kreuzblut sowie eine Notfall-ÖGD vor. Therapeutisch empfehle ich Volumengabe, hochdosiert PPI intravenös und das Absetzen von NSAR und ASS.',
    },
  },

  'case-kolorektales-ca': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Herrn Heinrich Vogt, einen 68-jährigen Patienten, der sich mit seit Wochen bestehendem wechselndem Stuhlgang und Blutbeimengungen im Stuhl in unserer Sprechstunde vorstellte.',
      patientenzustand: 'Herr Vogt befand sich in leicht reduziertem Allgemeinzustand und schlankem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Der Patient berichtete über seit Wochen bestehenden wechselnden Stuhlgang mit teils bleistiftförmigen Stühlen und Blutauflagerungen. Begleitend bestünden ein ungewollter Gewichtsverlust von etwa sechs Kilogramm, ein Leistungsknick und Müdigkeit im Sinne einer Anämie. Fieber, Nachtschweiß und Erbrechen wurden verneint; eine Koloskopie sei bislang nie erfolgt.',
      vorerkrankungen: 'Relevante Vorerkrankungen bestünden nicht. Voroperationen seien keine bekannt.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme werde verneint.',
      'allergien-noxen': 'Allergien seien keine bekannt. Es bestehe ein Nikotinkonsum von 15 Packungsjahren; Alkohol werde mit ein bis zwei Bier täglich angegeben, ein Drogenkonsum werde verneint.',
      'familie-sozial': 'In der Familienanamnese habe der Vater im Alter von 70 Jahren an einem Darmkrebs gelitten. Der Patient sei verheiratet und berentet.',
      diagnose: 'Die Anamnese deutet am ehesten auf ein kolorektales Karzinom hin. Differenzialdiagnostisch kommen Hämorrhoiden, eine chronisch-entzündliche Darmerkrankung sowie eine Divertikulitis in Betracht.',
      'diagnostik-therapie': 'Es wurden Labor (Blutbild mit Frage nach einer Anämie, CEA) abgenommen und eine Koloskopie mit Biopsie sowie ein CT von Thorax und Abdomen zum Staging angemeldet. Die weitere Therapie (onkologische Resektion, ggf. neoadjuvante bzw. adjuvante Radiochemotherapie) richtet sich nach dem histologischen Befund und dem Tumorstadium.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Herrn Heinrich Vogt vorstellen, einen 68-jährigen Patienten, der sich wegen seit Wochen bestehenden wechselnden Stuhlgangs und Blutes im Stuhl in unserer Sprechstunde vorstellte.',
      allgemeinzustand: 'Herr Vogt befand sich in leicht reduziertem Allgemeinzustand und schlankem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Er stellte sich wegen seit Wochen wechselnden Stuhlgangs mit Blutauflagerungen und bleistiftförmigen Stühlen vor. Begleitend träten ein ungewollter Gewichtsverlust von etwa sechs Kilogramm und Müdigkeit auf. Fieber und Nachtschweiß seien verneint worden; eine Darmspiegelung habe er nie gehabt.',
      allergien: 'Bei dem Patienten seien keine Allergien bekannt.',
      rauchen: 'Der Patient rauche, insgesamt 15 py.',
      alkohol: 'Er trinke täglich ein bis zwei Bier.',
      drogen: 'Einen Drogenkonsum habe er verneint.',
      sozialanamnese: 'Er sei verheiratet und Rentner.',
      familienanamnese: 'Der Vater habe im Alter von 70 Jahren an einem Darmkrebs gelitten.',
      vorerkrankungen: 'Relevante Vorerkrankungen und Voroperationen bestünden keine.',
      medikation: 'Eine regelmäßige Medikamenteneinnahme habe er verneint.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf ein kolorektales Karzinom hin. Als Differenzialdiagnosen kommen Hämorrhoiden, eine CED und eine Divertikulitis in Betracht. Ich schlage Labor mit Blutbild und CEA, eine Koloskopie mit Biopsie und ein Staging-CT vor. Die Therapie richtet sich nach Histologie und Stadium (Resektion, ggf. Radiochemotherapie).',
    },
  },

  'case-leberzirrhose': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Herrn Karl Aupperle, einen 58-jährigen Patienten, der sich mit seit drei Monaten langsam zunehmenden, ständigen, diffusen Bauchschmerzen in unserer Notaufnahme vorstellte.',
      patientenzustand: 'Herr Aupperle befand sich in reduziertem Allgemeinzustand und normalem Ernährungszustand bei zunehmendem Bauchumfang und war voll orientiert.',
      'aktuelle-beschwerden': 'Der Patient berichtete über seit drei Monaten langsam zunehmende, ständige, dumpfe und diffuse Bauchschmerzen ohne Ausstrahlung (Intensität 5/10). Begleitend bestünden eine Zunahme des Bauchumfangs, spontane Hämatome, eine Leistungsminderung, ein heller Stuhl und Beinödeme sowie eine Gewichtszunahme von etwa fünf Kilogramm. Ein Ikterus, Fieber, Bluterbrechen oder Teerstuhl sowie eine Verwirrtheit wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen leide der Patient an einer Hypothyreose und einer arteriellen Hypertonie seit fünf Jahren. Zustand nach Nagelosteosynthese am rechten Unterschenkel vor 15 Jahren (Arbeitsunfall, Materialentfernung nach einem Jahr).',
      medikation: 'Der Patient nehme regelmäßig L-Thyroxin 125 µg (1-0-0) und ein Antihypertensivum ein sowie zusätzlich Aspirin-Brausetabletten.',
      'allergien-noxen': 'Allergien seien keine bekannt. Der Patient sei Nichtraucher; anamnestisch bestehe ein langjähriger schwerer Alkoholkonsum (über 20 Jahre bis zu 10 Flaschen Bier und 3 Flaschen Schnaps täglich, zuletzt schmerzbedingt auf etwa 3 Bier täglich reduziert). Ein Drogenkonsum werde verneint.',
      'familie-sozial': 'Die Familienanamnese sei unauffällig; Lebererkrankungen oder Tumorerkrankungen seien nicht bekannt. Der Patient sei geschieden, lebe allein, habe zwei gesunde Töchter und sei als Maschinenarbeiter berufstätig.',
      diagnose: 'Die Anamnese deutet am ehesten auf eine dekompensierte Leberzirrhose bei Alkoholabhängigkeit mit Aszites hin. Differenzialdiagnostisch kommen ein hepatozelluläres Karzinom, ein Pankreaskarzinom sowie eine Rechtsherzinsuffizienz in Betracht.',
      'diagnostik-therapie': 'Es wurden Blutbild, Nieren- und Leberwerte, AP, γGT und Gerinnung (Quick/INR) bestimmt sowie eine Abdomensonographie, ein CT-Abdomen, eine Aszitespunktion (SAAG, Zellzahl) und eine ÖGD (Frage nach Ösophagusvarizen) angemeldet. Therapeutisch wurden eine absolute Alkoholabstinenz, eine Aszitestherapie (Diuretika, Kochsalzrestriktion) sowie eine Entwöhnungs- bzw. psychotherapeutische Anbindung eingeleitet.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Herrn Karl Aupperle vorstellen, einen 58-jährigen Patienten, der sich wegen seit drei Monaten zunehmender diffuser Bauchschmerzen in unserer Notaufnahme vorstellte.',
      allgemeinzustand: 'Herr Aupperle befand sich in reduziertem Allgemeinzustand bei zunehmendem Bauchumfang und war voll orientiert.',
      'aktuelle-beschwerden': 'Er stellte sich wegen seit drei Monaten langsam zunehmender, ständiger, diffuser Bauchschmerzen ohne Ausstrahlung vor. Die Schmerzintensität läge bei 5 von 10. Begleitend träten eine Zunahme des Bauchumfangs, spontane blaue Flecke, Beinödeme und ein heller Stuhl auf. Ein Ikterus und eine Verwirrtheit seien verneint worden.',
      allergien: 'Bei dem Patienten seien keine Allergien bekannt.',
      rauchen: 'Der Patient sei Nichtraucher und habe nie geraucht.',
      alkohol: 'Er konsumiere seit über 20 Jahren regelmäßig große Mengen Alkohol (bis zu 10 Flaschen Bier und 3 Flaschen Schnaps täglich), zuletzt auf etwa 3 Bier täglich reduziert.',
      drogen: 'Einen Drogenkonsum habe er verneint.',
      sozialanamnese: 'Er sei geschieden, lebe allein, habe zwei gesunde Töchter und arbeite als Maschinenarbeiter.',
      familienanamnese: 'Die Familienanamnese sei unauffällig, insbesondere seien keine Lebererkrankungen bekannt.',
      vorerkrankungen: 'Bekannt seien eine Hypothyreose und eine arterielle Hypertonie; Zustand nach Nagelosteosynthese am rechten Unterschenkel vor 15 Jahren.',
      medikation: 'Er nehme L-Thyroxin 125 µg, ein Blutdruckmedikament und Aspirin-Brausetabletten ein.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf eine dekompensierte Leberzirrhose bei Alkoholabhängigkeit mit Aszites hin. Als Differenzialdiagnosen kommen ein HCC, ein Pankreaskarzinom und eine Rechtsherzinsuffizienz in Betracht. Ich schlage Labor, eine Sonographie, ein CT-Abdomen, eine Aszitespunktion und eine ÖGD vor. Therapeutisch empfehle ich eine absolute Alkoholabstinenz, eine Aszitestherapie mit Diuretika und eine Entwöhnung.',
    },
  },

  'case-oesophaguskarzinom': {
    arztbrief: {
      einleitung: 'wir berichten Ihnen nachfolgend über Frau Anna Sichel, eine 53-jährige Patientin, die sich mit seit vier Wochen zunehmenden Schluckbeschwerden in unserer Sprechstunde vorstellte.',
      patientenzustand: 'Frau Sichel befand sich in reduziertem Allgemeinzustand und schlankem bis kachektischem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Die Patientin berichtete über seit vier Wochen zunehmende Schluckbeschwerden, zunächst für feste, inzwischen auch für weiche Kost. Begleitend bestünden ein ungewollter Gewichtsverlust von 15 Kilogramm im letzten Jahr, eine Heiserkeit und Schmerzen beim Schlucken. Ein Bluterbrechen und Fieber wurden verneint.',
      vorerkrankungen: 'An Vorerkrankungen bestehe eine langjährige Refluxkrankheit. Voroperationen seien keine bekannt.',
      medikation: 'Die Patientin nehme gelegentlich einen PPI ein; eine regelmäßige Medikamenteneinnahme werde verneint.',
      'allergien-noxen': 'Allergien seien keine bekannt. Es bestehe ein Nikotinkonsum von 30 Packungsjahren; Alkohol werde seit Jahren täglich in Form von Wein und Schnaps konsumiert, ein Drogenkonsum werde verneint.',
      'familie-sozial': 'Die Familienanamnese sei unauffällig. Die Patientin sei verheiratet und als Schneiderin berufstätig.',
      diagnose: 'Die Anamnese deutet am ehesten auf ein Ösophaguskarzinom hin. Differenzialdiagnostisch kommen eine Achalasie, eine peptische Stenose sowie eine Ösophagitis in Betracht.',
      'diagnostik-therapie': 'Es wurden eine ÖGD mit Biopsie sowie zur Ausbreitungsdiagnostik eine Endosonographie und ein CT veranlasst und Laboruntersuchungen (Anämie, Ernährungsstatus) abgenommen. Die weitere Therapie (neoadjuvante Radiochemotherapie und Ösophagektomie in kurativer Situation bzw. palliative Maßnahmen zur Ernährungssicherung) richtet sich nach dem Tumorstadium.',
    },
    vorstellung: {
      'persoenliche-daten': 'Ich möchte Ihnen Frau Anna Sichel vorstellen, eine 53-jährige Patientin, die sich wegen seit vier Wochen zunehmender Schluckbeschwerden in unserer Sprechstunde vorstellte.',
      allgemeinzustand: 'Frau Sichel befand sich in reduziertem Allgemeinzustand und schlankem bis kachektischem Ernährungszustand und war voll orientiert.',
      'aktuelle-beschwerden': 'Sie stellte sich wegen seit vier Wochen zunehmender Schluckbeschwerden vor, zunächst für feste, inzwischen auch für weiche Kost. Begleitend träten ein Gewichtsverlust von 15 Kilogramm, Heiserkeit und Schmerzen beim Schlucken auf. Ein Bluterbrechen sei verneint worden.',
      allergien: 'Bei der Patientin seien keine Allergien bekannt.',
      rauchen: 'Die Patientin rauche, insgesamt 30 py.',
      alkohol: 'Sie konsumiere seit Jahren täglich Wein und Schnaps.',
      drogen: 'Einen Drogenkonsum habe sie verneint.',
      sozialanamnese: 'Sie sei verheiratet und als Schneiderin tätig.',
      familienanamnese: 'Die Familienanamnese sei unauffällig.',
      vorerkrankungen: 'Bekannt sei eine langjährige Refluxkrankheit; Voroperationen bestünden keine.',
      medikation: 'Sie nehme gelegentlich einen PPI ein.',
      frauenanamnese: 'Sie befinde sich in der Perimenopause; eine aktuelle Schwangerschaft habe sie verneint.',
      'diagnostik-procedere': 'Die anamnestischen Angaben deuten am ehesten auf ein Ösophaguskarzinom hin. Als Differenzialdiagnosen kommen eine Achalasie, eine peptische Stenose und eine Ösophagitis in Betracht. Ich schlage eine ÖGD mit Biopsie sowie eine Endosonographie und ein CT zum Staging vor. Die Therapie richtet sich nach dem Stadium (neoadjuvante Radiochemotherapie, Ösophagektomie oder palliative Ernährungssicherung).',
    },
  },
};
