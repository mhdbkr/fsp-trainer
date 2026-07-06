// ============================================================================
// Kommunikative Strategien (livre 2.4) — 6 situations de patient difficile.
// `cue` = réplique déclenchable par le partenaire ; `parades` = réponses modèles.
// Utilisées : (1) en simulation (répliques déclenchables des cas concernés),
// (2) dans un guide dédié « Schwieriger Patient » avec mini-drill.
// ============================================================================

export interface KommunikativeSituation {
  id: string;
  title: string;
  icon: string;
  situation: string;   // description FR
  cue: string;         // réplique-type du patient (déclenchable)
  parades: string[];   // réponses modèles (DE)
}

export const KOMMUNIKATIVE_STRATEGIEN: KommunikativeSituation[] = [
  {
    id: 'ohnmacht', title: 'Patient ist ohnmächtig', icon: 'alert',
    situation: 'Le patient perd connaissance pendant l\'anamnèse.',
    cue: '(le patient ne répond plus)',
    parades: [
      'Ich prüfe Ansprechbarkeit und Atmung, lagere den Patienten und rufe Hilfe.',
      'Bei den Prüfern: „Ich würde sofort einen Notfall auslösen und den OA rufen. Darf ich mit der Anamnese fortfahren?"',
    ],
  },
  {
    id: 'keine-einsicht', title: 'Keine Krankheitseinsicht', icon: 'question',
    situation: 'Le patient dit n\'avoir « aucun problème » et ne sait pas pourquoi il est là.',
    cue: '„Ich habe doch gar kein Problem, warum bin ich hier?"',
    parades: [
      'Wer hat Sie hierhergebracht? Wie sind Sie hergekommen?',
      'Orientierung prüfen: Können Sie mir das heutige Datum / den Wochentag nennen? Wissen Sie, wo Sie sind?',
      'Hatten Sie in letzter Zeit Beschwerden, einen Unfall, Gedächtnisprobleme?',
    ],
  },
  {
    id: 'verweigert', title: 'Verweigert Zusammenarbeit', icon: 'shield',
    situation: 'Le patient veut parler à l\'Oberarzt, pas à vous.',
    cue: '„Sie sind zu jung. Ich möchte mit dem Oberarzt sprechen."',
    parades: [
      'Wenn ich die Ausbildung nicht hätte, dürfte ich Sie gar nicht fragen. Meine Qualifikationen sind anerkannt.',
      'Nach diesem Gespräch bespreche ich alles mit dem Oberarzt. Wir arbeiten im Team — Sie sind in besten Händen.',
      'Wenn Sie zuerst mit dem OA sprechen möchten, kann ich Ihnen leider noch keine Medikamente geben; Ihr Zustand könnte sich verschlechtern.',
    ],
  },
  {
    id: 'spricht-unklar', title: 'Spricht nicht klar', icon: 'ear',
    situation: 'Trop vite / trop lent / trop bas / dialecte / interrompt / trop bavard.',
    cue: '(le patient parle très vite, en dialecte, et vous coupe)',
    parades: [
      'Zu schnell: „Langsamer bitte, ich notiere mir alles."',
      'Zu langsam: „Geben Sie gern ein bisschen Gas, damit wir schnell beginnen können."',
      'Dialekt: „Würden Sie das bitte auf Hochdeutsch wiederholen?"',
      'Unterbricht: „Lassen Sie mich bitte erst alle Fragen stellen. Ihre Fragen beantworte ich am Schluss."',
    ],
  },
  {
    id: 'fordert-diagnose', title: 'Fordert sofortige Diagnose', icon: 'brain',
    situation: 'Le patient panique : « Ai-je un cancer ? »',
    cue: '„Habe ich Krebs? Sagen Sie es mir sofort!"',
    parades: [
      'Unwahrscheinlich: „Wieso denken Sie gleich an das Schlimmste? Wir machen ein paar Untersuchungen, um sicher zu sein."',
      'Ernst: „Ich bitte Sie um Geduld. Erst wenn alle Ergebnisse da sind, können wir eine klare Diagnose stellen."',
      'Unklar: „Ich bespreche den Fall mit dem Oberarzt und wir stimmen das weitere Vorgehen ab."',
    ],
  },
  {
    id: 'fordert-therapie', title: 'Fordert sofortige Therapie', icon: 'pill',
    situation: 'Le patient exige un traitement immédiat.',
    cue: '„Geben Sie mir sofort etwas gegen die Schmerzen!"',
    parades: [
      'Wenn ich Ihnen die falschen Medikamente gebe, bringt das nichts Gutes. Ich muss Ihnen zuerst ein paar Fragen stellen.',
      'Um Ihre Situation zu erleichtern, bekommen Sie erst einmal etwas Sauerstoff. Ein Schmerzmittel darf ich erst nach den Fragen geben.',
    ],
  },
];

export function getSituations(ids?: string[]): KommunikativeSituation[] {
  if (!ids?.length) return [];
  return KOMMUNIKATIVE_STRATEGIEN.filter((s) => ids.includes(s.id));
}
