import type { Guide } from '@/db/types';

// ============================================================================
// Guides & templates — reproduits fidèlement depuis le livre Rogoveanu et les
// templates ODAK (Anamnese V4, Arztbrief-Vorstellung). Affichés en toggles.
// ============================================================================

export function seedGuides(): Guide[] {
  return [
    // ---------------------------------------------------------------- ANAMNESE
    {
      id: 'guide-anamnese-v4',
      title: 'Anamnese — Structure de l\'entretien',
      type: 'anamnese',
      specialty: null,
      intro: 'Trame d\'entretien d\'admission. 20 min. Registre patient, pas de Fachchinesisch. Le candidat pilote le dialogue.',
      sections: [
        { id: 'a1', title: 'I. Gesprächsbeginn', items: [
          'Guten Tag. Mein Name ist … , ich bin der zuständige Arzt/die zuständige Ärztin.',
          'Ich würde gern das Aufnahmegespräch mit Ihnen führen: Fragen zu Ihren Symptomen, Ihrer Vorgeschichte und Ihren Lebensgewohnheiten. Jede Ihrer Antworten trägt zur Diagnose und Behandlungsplanung bei. Sind Sie damit einverstanden?',
          'Zuerst möchte ich Ihnen einige persönliche Fragen stellen und anschließend detailliert auf Ihre Beschwerden eingehen.',
        ], note: 'Refus possible ("Sie sind zu jung"). Rester calme, expliquer qu\'on est qualifié et qu\'on décide en équipe avec l\'Oberarzt.' },
        { id: 'a2', title: 'II. Personalia', items: [
          'Wie heißen Sie? Bitte buchstabieren Sie das langsam.',
          'Wie alt sind Sie? Wann sind Sie geboren?',
          'Wie groß sind Sie? Wie viel wiegen Sie?',
          'Was sind Sie von Beruf? Wie heißt Ihr Hausarzt?',
          'Récap pro : "Nur zur Sicherheit wiederhole ich Ihre Daten: Sie heißen …, sind … Jahre alt, … groß, … kg. Ist das korrekt notiert?"',
        ] },
        { id: 'a3', title: 'III. Aktuelle Beschwerden + Schmerzanalyse (OPQRST)', items: [
          'Was führt Sie zu uns? / Welche Beschwerden haben Sie?',
          'Ort: Wo tut es weh? Können Sie zeigen, wo?',
          'Charakter: dumpf, stechend, brennend, drückend, kolikartig, wellenförmig?',
          'Intensität: Von 1 bis 10 — wie stark?',
          'Ausstrahlung: Strahlen die Schmerzen aus? Wohin? (in + Akkusativ!)',
          'Dauer/Verlauf: Seit wann? Plötzlich oder langsam? Ständig oder anfallsartig?',
          'Einflussfaktoren: Was verbessert/verschlimmert (Essen, Bewegung, Lage, Atmung)?',
          'Begleitbeschwerden: Haben Sie noch andere Beschwerden?',
        ], note: 'Merke: "Schmerzen in + Dativ", "Ausstrahlung in + Akkusativ".' },
        { id: 'a4', title: 'IV. Vegetative Anamnese', items: [
          'Fieber, Schüttelfrost, Nachtschweiß?',
          'Ungewollte Gewichtsveränderung? Appetit?',
          'Probleme mit Stuhlgang oder beim Wasserlassen?',
          'Schlaf? Stress? (vorsichtig fragen)',
        ] },
        { id: 'a5', title: 'V–VII. Vorerkrankungen · Medikamente · Allergien', items: [
          'Leiden Sie an chronischen Erkrankungen (Bluthochdruck, Diabetes, Herz, Leber, Nieren…)?',
          'Sind Sie schon einmal operiert worden? Warum? Wo?',
          'Welche Medikamente nehmen Sie? Dosierung? Wann? (0-0-0)',
          'Haben Sie Allergien? — Medikamentenallergien nicht vergessen!',
        ] },
        { id: 'a6', title: 'VIII. Noxen', items: [
          'Rauchen Sie? Wie viele Zigaretten/Schachteln pro Tag? Seit wann? (→ py)',
          'Falls aufgehört: Wann? Wie viele Jahre und wie viel pro Tag davor?',
          'Trinken Sie Alkohol? Welche Getränke (Bier, Wein, Schnaps)? Täglich oder zu Anlässen? Wie viel pro Woche?',
          'Drogen (routinier, sans jugement) : "Wie Sie wissen, ist Cannabis legalisiert — daher frage ich aus medizinischen Gründen routinemäßig: Konsumieren Sie Drogen?"',
        ] },
        { id: 'a7', title: 'IX–X. Familien- + Sozialanamnese', items: [
          'Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen? Welche, seit wann?',
          'Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? Und wann?',
          'Sind Sie verheiratet? Haben Sie Kinder — wie viele, sind sie gesund?',
          'Was ist Ihr Beruf? Empfinden Sie Stress durch die Arbeit? (Falls Rente: Was haben Sie früher gemacht?)',
          'Wohnung oder Haus? Welche Etage? Aufzug? Haustiere?',
        ], note: 'Bei verwitwet → Empathie: "Mein Beileid."' },
        { id: 'a7b', title: 'X bis. Frauenanamnese (si patiente)', items: [
          'Verläuft Ihre Monatsblutung regelmäßig? Wann war die letzte Regelblutung?',
          'Besteht die Möglichkeit, dass Sie derzeit schwanger sind?',
          'Verwenden Sie Verhütungsmethoden? Wenn ja, welche?',
          'Falls Wechseljahre: Wann war die letzte Periode? Gehen Sie regelmäßig zum Frauenarzt?',
        ], note: 'Obligatoire chez toute patiente en âge de procréer — penser grossesse avant imagerie/médicaments.' },
        { id: 'a8', title: 'XI. Schlussformeln', items: [
          'Das waren meine Fragen. Möchten Sie noch etwas hinzufügen? / Ich habe nun alle meine Fragen gestellt und fühle mich gut informiert.',
          'Als Nächstes untersuche ich Sie körperlich und nehme Blut ab, um Laborwerte zu bestimmen.',
          'Ich bespreche Ihre Beschwerden mit meinem Oberarzt und komme dann zurück — zum Beispiel für weitere Untersuchungen wie Ultraschall.',
          'Haben Sie noch Fragen? Ich stehe Ihnen gerne zur Verfügung.',
        ] },
      ],
    },

    // ---------------------------------------------------------------- ARZTBRIEF
    {
      id: 'guide-arztbrief',
      title: 'Arztbrief — La documentation écrite',
      type: 'arztbrief',
      specialty: null,
      intro: 'Anamnèse au Konjunktiv I, mesures au Passiv. Formules d\'ouverture/clôture obligatoires (perte de points si oubli).',
      sections: [
        { id: 'b1', title: 'Anrede + Einleitung', items: [
          'Sehr geehrte Frau Prof. / Dr. … , / Sehr geehrter Herr Kollege,',
          'wir berichten Ihnen nachfolgend über Frau/Herrn Z, geb. TT.MM.JJJJ, die/der sich am … in unserer Notaufnahme vorstellte.',
        ], note: 'Nach der Anrede: Komma, dann klein weiter ("wir").' },
        { id: 'b2', title: 'Haupt-/Nebenbeschwerden (Konjunktiv I, "Dativ-Paragraf")', items: [
          'Der Patient befand sich in … Allgemeinzustand und … Ernährungszustand, war zu Ort/Zeit/Person/Situation orientiert.',
          'Herr Z stellte sich mit seit … bestehenden starken epigastrischen Schmerzen vor.',
          'Des Weiteren klagte er über … Der Patient gab an, dass …',
        ] },
        { id: 'b3', title: 'Vegetative Anamnese · Vorerkrankungen · Medikamente', items: [
          'Bis auf das oben Genannte sei die vegetative Anamnese unauffällig.',
          'Der Patient leide an … (Leiden an + Krankheit; leiden unter + Symptom).',
          'Zustand nach Appendektomie vor x Jahren.',
          'Bis auf … mg 1-0-0 nehme der Patient keine weiteren Medikamente ein.',
        ] },
        { id: 'b4', title: 'Allergien · Noxen', items: [
          'Allergien wurden verneint / X-Allergie sei bekannt.',
          'Tabakabusus wurde mit … py bejaht.',
          'Alkoholkonsum wurde mit … bejaht. (Konsum, nicht Abusus!)',
          'Drogenabusus wurde verneint.',
        ] },
        { id: 'b5', title: 'Diagnose · Diagnostik · Therapie (Passiv)', items: [
          'Die Anamnese deutet auf … hin. Differenzialdiagnostisch kommen in Betracht: …',
          'Bei Verdacht auf … wurde Blut abgenommen (Blutbild, CRP …). Ein EKG wurde geschrieben, ein CT geplant.',
          'X-Therapie wurde eingeleitet. N wurde verabreicht/verschrieben.',
          'Prognose: positiv / fraglich (abhängig von der Compliance).',
        ] },
        { id: 'b6', title: 'Schlussformeln (obligatorisch!)', items: [
          'Für weitere Fragen stehen wir Ihnen gern zur Verfügung.',
          'Mit freundlichen kollegialen Grüßen, [Arzt/Ärztin]',
        ], note: 'Bei Infektion: „Gesundheitsamt wurde informiert." Bei Rücksprache mit dem Hausarzt: „Rücksprache mit dem Hausarzt folgt."' },
      ],
    },

    // ----------------------------------------------------------- FALLVORSTELLUNG
    {
      id: 'guide-fallvorstellung',
      title: 'Fallvorstellung — Arzt-Arzt-Gespräch',
      type: 'fallvorstellung',
      specialty: null,
      intro: 'Oral, en Fachsprache. À partir des seules notes d\'anamnèse. On a le droit de poser des questions.',
      sections: [
        { id: 'f1', title: 'Einstieg', items: [
          'Guten Tag, Frau/Herr Doktor. Wir haben einen neuen Patienten … Ich würde gern über ihn berichten. Darf ich?',
          'Der/die Patient/in ist … Jahre alt und stellte sich vor … Minuten in der Notaufnahme vor.',
        ] },
        { id: 'f2', title: 'Structure : état général → anamnèse (Konjunktiv I)', items: [
          'Der Patient befand sich in … Allgemeinzustand und … Ernährungszustand, war zu Ort/Zeit/Person orientiert.',
          'Er stellte sich mit seit … bestehendem starkem … vor. Des Weiteren klagte er über …',
          'Der Patient leide an … Zustand nach … Nikotinkonsum … Packungsjahre. Alkoholkonsum … Der Vater habe an … gelitten.',
        ] },
        { id: 'f3', title: 'Diagnostic → examens → traitement → pronostic', items: [
          'Die Anamnese deutet auf … hin. Differenzialdiagnostisch kommen in Betracht: …',
          'Bei V. a. … wurde Blut abgenommen … EKG geschrieben … CT geplant.',
          'Therapie wurde eingeleitet. Prognose: positiv.',
          'Das war zunächst alles. Des Weiteren möchte ich den Fall gern mit Ihnen besprechen.',
        ] },
        { id: 'f4', title: 'Umgang mit Fragen', items: [
          'Die Prüfer unterbrechen — das ist normal.',
          'Man darf Fragen stellen: "Das weiß ich leider nicht. Was meinen Sie, Frau/Herr X?"',
          'Nicht stumm bleiben — immer etwas sagen.',
        ] },
      ],
    },

    // ------------------------------------------------------------- KOMMUNIKATION
    {
      id: 'guide-kommunikation',
      title: 'Kommunikative Strategien — schwieriger Patient',
      type: 'kommunikation',
      specialty: null,
      intro: 'Parades pour les situations difficiles (Kap. 2.4). Le jury teste la gestion du dialogue.',
      sections: [
        { id: 'k1', title: 'Patient verweigert Zusammenarbeit (will den OA)', items: [
          '"Wenn ich die Ausbildung nicht hätte, dürfte ich Sie gar nicht fragen. Meine Qualifikationen sind anerkannt."',
          '"Nach diesem Gespräch bespreche ich alles mit dem Oberarzt. Sie sind in besten Händen."',
          '"Wenn Sie zuerst mit dem OA sprechen möchten, kann ich Ihnen leider noch keine Medikamente geben."',
        ] },
        { id: 'k2', title: 'Patient spricht nicht klar', items: [
          'Zu schnell: "Langsamer bitte, ich notiere mir alles."',
          'Zu langsam: "Geben Sie gern ein bisschen Gas, damit wir schnell beginnen können."',
          'Zu leise: "Würden Sie bitte etwas lauter sprechen?"',
          'Dialekt: "Würden Sie das bitte auf Hochdeutsch wiederholen?"',
          'Unterbricht: "Lassen Sie mich bitte erst alle Fragen stellen. Ihre Fragen beantworte ich am Schluss."',
        ] },
        { id: 'k3', title: 'Patient fordert sofortige Diagnose ("Habe ich Krebs?")', items: [
          'Wenn unwahrscheinlich: "Wieso denken Sie gleich an das Schlimmste? Wir machen ein paar Untersuchungen, um sicher zu sein."',
          'Wenn ernst: "Ich bitte Sie um etwas Geduld. Erst wenn alle Ergebnisse da sind, können wir eine klare Diagnose stellen."',
          'Wenn unklar: "Ich bespreche den Fall mit dem Oberarzt und wir stimmen das weitere Vorgehen ab."',
        ] },
        { id: 'k4', title: 'Patient fordert sofortige Therapie', items: [
          '"Wenn ich Ihnen die falschen Medikamente gebe, bringt das nichts Gutes. Ich muss Ihnen zuerst ein paar Fragen stellen."',
          '"Um Ihre Situation zu erleichtern, bekommen Sie erst einmal etwas Sauerstoff. Ein Schmerzmittel darf ich erst nach den Fragen geben."',
        ] },
        { id: 'k5', title: 'Notfall während der Anamnese', items: [
          '1. Patient beruhigen: "Bleiben Sie bitte hier, ich lege Ihnen einen Zugang, Sie bekommen Sauerstoff."',
          '2. Prüfer ansprechen: "In der Klinik würde ich sofort den Oberarzt rufen. Ich habe Verdacht auf … Darf ich mit der Anamnese weitermachen?"',
          'Häufige Notfälle: Myokardinfarkt, Lungenembolie, Schlaganfall, GI-Blutung.',
        ] },
        { id: 'k6', title: 'Patient hat sehr starke Schmerzen', items: [
          '"Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?"',
          'Vor dem Schmerzmittel IMMER fragen: "Gibt es Allergien oder Unverträglichkeiten gegenüber Medikamenten?"',
        ] },
        { id: 'k7', title: 'Patient will gegen ärztlichen Rat gehen', items: [
          'Risiken klar erklären und auf dem Bogen "Behandlungsverweigerung" notieren.',
          'Der Patient unterschreibt eine Entlassung gegen ärztlichen Rat — erst danach darf er gehen.',
          'Zusatz schreiben lassen: "Mir wurden die Risiken der gegen ärztlichen Rat vorzeitigen Entlassung erklärt und ich habe sie verstanden."',
          'Dasselbe gilt, wenn der Patient eine Therapie oder ein Medikament ablehnt.',
        ] },
        { id: 'k8', title: 'Infektionsverdacht: Patient will ein geteiltes Zimmer', items: [
          'Nicht zusagen! Zuerst erklären: "Wir führen erst einige Untersuchungen durch — danach wird entschieden, ob Sie allein oder mit einem anderen Patienten untergebracht werden."',
          'Bei meldepflichtiger Krankheit: Patient wird isoliert, und im Arztbrief steht "Gesundheitsamt wurde informiert."',
        ] },
        { id: 'k9', title: 'Patient äußert Suizidgedanken', items: [
          'Direkt und ruhig nachfragen: "Haben Sie daran gedacht, sich das Leben zu nehmen? Haben Sie einen konkreten Plan?"',
          'Falls bejaht: NOTFALL — der Patient bleibt stationär.',
          'Rücksprache mit dem Oberarzt folgt NACH der Anamnese (anders als bei Myokardinfarkt, Lungenembolie, Apoplex oder GI-Blutung).',
        ] },
      ],
    },

    // ------------------------------------------------------ REDEMITTEL & GRAMMATIK
    {
      id: 'guide-redemittel',
      title: 'Redemittel & Grammatik-Fallen',
      type: 'grammatik',
      specialty: null,
      intro: 'Les tournures qui font gagner des points — et les fautes classiques qui en font perdre. À réviser avant chaque simulation.',
      sections: [
        { id: 'r1', title: 'Grammatik-Merksätze (fautes classiques)', items: [
          'leiden an + Krankheit („Er leide an Diabetes") · leiden unter + Symptom („Sie leide unter Übelkeit").',
          'Schmerzen in + Dativ („Schmerzen im Oberbauch") · Ausstrahlung in + Akkusativ („mit Ausstrahlung in den Rücken").',
          'Operationen: „vor x Jahren" — niemals „seit" (keine OP dauert Jahre!).',
          '„Alkoholkonsum" schreiben — niemals „Alkoholabusus" (wo Konsum endet, ist umstritten).',
          '„des Weiteren" (großes W, getrennt) — nicht „desweiteren".',
          'Medikamente einnehmen (Akkusativ!) — nicht „Medikamenten". Konjunktiv I: „Er nehme … ein."',
          '„Haben Sie gemessen?" — nicht „gemesst".',
          'Ein EKG wird geschrieben · Medikamente werden verschrieben.',
        ] },
        { id: 'r2', title: 'Therapie-Verben (Passiv)', items: [
          'Therapie / Sauerstoffgabe: eingeleitet · angeordnet · durchgeführt · verabreicht · verschrieben.',
          '„Der Patient wurde auf … eingestellt."',
          '„Die Therapie richtet sich nach den klinischen und apparativen Untersuchungen."',
          '„Je nach den Ergebnissen wird eine passende Therapie eingeleitet."',
        ] },
        { id: 'r3', title: 'Konsile & Untersuchungen', items: [
          'Konsil / Untersuchung: angemeldet · organisiert · geplant · durchgeführt · erbeten.',
          'Konsile IMMER begründen: zur Mitbeurteilung · zur Optimierung der Therapie · der Nachbehandlung · des Pflegekonzeptes.',
          '„Zum Ausschluss eines/einer … wurde … angemeldet."',
          '„Bei Verdacht auf … wurde Blut abgenommen (Blutbild, CRP/BSG, Nieren- und Leberwerte — je nach Verdacht)."',
        ] },
        { id: 'r4', title: 'Rettungsphrasen (wenn du nicht weiterweißt)', items: [
          '„Die Ergebnisse (der Untersuchungen) stehen noch aus." — gagne du temps avec élégance.',
          '„Das weiß ich leider nicht. Was meinen Sie, Frau/Herr Doktor?" — mieux qu\'un blackout ; l\'examen évalue la communication.',
          '„Es erfolgte eine deutliche / rasche / leider keine Verbesserung."',
        ] },
        { id: 'r5', title: 'Sonderfälle im Arztbrief', items: [
          'Meldepflichtige Infektion: „Gesundheitsamt wurde informiert." (+ Patient wird isoliert.)',
          'Kinder/Angehörige allein zu Hause: „Psychosozialer Dienst wurde kontaktiert."',
          'Unklare Vormedikation: „Rücksprache mit dem Hausarzt wegen früherer Medikation / Vorerkrankungen folgt."',
          'Prognose: positiv · negativ · fraglich, abhängig von der Compliance des Patienten.',
          'Ggf.: „Der Patient wurde für … Tage krankgeschrieben."',
        ] },
      ],
    },
  ];
}
