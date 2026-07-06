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
      title: 'Anamnese — Struktur (V4 / ODAK)',
      type: 'anamnese',
      specialty: null,
      intro: 'Trame d\'entretien d\'admission. 20 min. Registre patient, pas de Fachchinesisch. Le candidat pilote le dialogue.',
      sections: [
        { id: 'a1', title: 'I. Gesprächsbeginn', items: [
          'Guten Tag. Mein Name ist … , ich bin der zuständige Arzt/die zuständige Ärztin.',
          'Ich möchte gerne das Aufnahmegespräch mit Ihnen führen. Sind Sie damit einverstanden?',
        ], note: 'Refus possible ("Sie sind zu jung"). Rester calme, expliquer qu\'on est qualifié et qu\'on décide en équipe avec l\'Oberarzt.' },
        { id: 'a2', title: 'II. Personalia', items: [
          'Wie heißen Sie? Bitte buchstabieren Sie das langsam.',
          'Wie alt sind Sie? Wann sind Sie geboren?',
          'Wie groß sind Sie? Wie viel wiegen Sie?',
          'Was sind Sie von Beruf? Wie heißt Ihr Hausarzt?',
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
          'Wie viel Alkohol trinken Sie? (Konsum, nicht Abusus)',
          'Nehmen Sie Drogen (Cannabis, Kokain, Heroin)?',
        ] },
        { id: 'a7', title: 'IX–X. Familien- + Sozialanamnese', items: [
          'Gibt es in Ihrer Familie chronische Erkrankungen?',
          'Sind Sie verheiratet? Haben Sie Kinder? Wohnen Sie allein?',
          'Wohnung oder Haus? Welche Etage? Aufzug? Haustiere?',
        ], note: 'Bei verwitwet → Empathie: "Mein Beileid."' },
        { id: 'a8', title: 'XI. Schlussformeln', items: [
          'Das waren meine Fragen. Möchten Sie noch etwas hinzufügen?',
          'Aufgrund der Anamnese habe ich einen Verdacht auf …',
          'Sie sollen stationär aufgenommen werden. Ich lege Ihnen einen Zugang …',
          'Ich bespreche den Fall mit dem Oberarzt und melde mich wieder. Bis dahin.',
        ] },
      ],
    },

    // ---------------------------------------------------------------- ARZTBRIEF
    {
      id: 'guide-arztbrief',
      title: 'Arztbrief — Dokumentation',
      type: 'arztbrief',
      specialty: null,
      intro: 'Anamnèse au Konjunktiv I, mesures au Passiv. Formules d\'ouverture/clôture obligatoires (perte de points si oubli).',
      sections: [
        { id: 'b1', title: 'Anrede + Einleitung', items: [
          'Sehr geehrte Frau Prof. / Dr. … , / Sehr geehrter Herr Kollege,',
          'wir berichten Ihnen nachfolgend über Frau/Herrn Z, geb. TT.MM.JJJJ, die/der sich am … in unserer Notaufnahme vorstellte.',
        ], note: 'Nach der Anrede: Komma, dann klein weiter ("wir").' },
        { id: 'b2', title: 'Haupt-/Nebenbeschwerden (Konjunktiv I, "Dativ-Paragraf")', items: [
          'Der Patient befand sich in … AZ und … EZ, war zu Ort/Zeit/Person/Situation orientiert.',
          'Herr Z stellte sich mit seit … bestehenden starken epigastrischen Schmerzen vor.',
          'Des Weiteren klagte er über … Der Patient gab an, dass …',
        ] },
        { id: 'b3', title: 'Vegetative Anamnese · Vorerkrankungen · Medikamente', items: [
          'Bis auf o. g. sei die vegetative Anamnese unauffällig.',
          'Der Patient leide an … (Leiden an + Krankheit; leiden unter + Symptom).',
          'Z. n. Appendektomie vor x Jahren.',
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
          'Bei V. a. … wurde Blut abgenommen (BB, CRP, …). EKG wurde geschrieben. CT wurde geplant.',
          'X-Therapie wurde eingeleitet. N wurde verabreicht/verschrieben.',
          'Prognose: positiv / fraglich (abhängig von der Compliance).',
        ] },
        { id: 'b6', title: 'Schlussformeln (obligatorisch!)', items: [
          'Für weitere Fragen stehen wir Ihnen gern zur Verfügung.',
          'Mit freundlichen kollegialen Grüßen, AA/FA …',
        ], note: 'Bei Infektion: "Gesundheitsamt wurde informiert." Bei HA-Rücksprache: "Rücksprache mit dem HA folgt."' },
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
          'Guten Tag, Frau/Herr Dr. X. Wir haben einen neuen Patienten … Ich würde gern über ihn berichten. Darf ich?',
          'Herr X ist ein y-jähriger Patient, der sich vor z Minuten in der Notaufnahme vorstellte.',
        ] },
        { id: 'f2', title: 'Struktur AZ/EZ → Anamnese (Konjunktiv I)', items: [
          'Der Patient befand sich in … AZ und … EZ, war zu Ort/Zeit/Person orientiert.',
          'Er stellte sich mit seit … bestehendem starkem … vor. Des Weiteren klagte er über …',
          'Der Patient leide an … Z. n. … Tabakabusus … py. Alkoholkonsum … Der Vater habe an … gelitten.',
        ] },
        { id: 'f3', title: 'VD/DD → Diagnostik → Therapie → Prognose', items: [
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
          '2. Prüfer ansprechen: "In der Klinik würde ich sofort den OA rufen. Ich habe V. a. … Darf ich mit der Anamnese weitermachen?"',
          'Häufige Notfälle: Myokardinfarkt, Lungenembolie, Schlaganfall, GI-Blutung.',
        ] },
      ],
    },

    // ------------------------------------------------------------- SPEZIALGUIDE
    {
      id: 'guide-spezial-gastro',
      title: 'Spezialguide Gastroenterologie',
      type: 'spezialguide',
      specialty: 'Gastroenterologie',
      intro: 'Questions ciblées à ajouter à l\'anamnèse standard pour un cas gastro.',
      sections: [
        { id: 'g1', title: 'Gezielte Fragen', items: [
          'Leiden Sie an Übelkeit? Haben Sie sich erbrochen? Wie sah es aus (Kaffeesatz, Blut)?',
          'Haben Sie Sodbrennen? Ein Völlegefühl? Werden Sie schneller satt als früher?',
          'Welche Farbe hat der Stuhl (teerschwarz, hell, blutig)? Konsistenz?',
          'Haben Sie Durchfall oder Verstopfung? Wechseln sich beide ab?',
          'Wann war die letzte Magen-/Darmspiegelung? Ergebnis?',
        ] },
        { id: 'g2', title: 'Risikofaktoren / Red Flags', items: [
          'NSAR/ASS-Einnahme, Alkohol, Nikotin.',
          'Ungewollter Gewichtsverlust, Nachtschweiß, Dysphagie → Tumorverdacht.',
          'Teerstuhl / Bluterbrechen → obere GI-Blutung (Notfall).',
          'Bekannte Lebererkrankung → portale Hypertension, Varizen.',
        ] },
      ],
    },
  ];
}
