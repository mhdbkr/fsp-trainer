// ============================================================================
// Mémo de réflexes d'examen (Module 6) — le déroulé du jour J et les réflexes
// de transition module→module. Consultable pendant l'entraînement pour ancrer
// les enchaînements. Source : livre Rogoveanu (Ablauf FSP, Handlungsplan,
// transitions) + templates ODAK.
// ============================================================================

export interface ReflexPhase {
  id: string;
  title: string;      // titre allemand
  subtitle: string;   // FR
  icon: string;
  minutes: number;
  steps: string[];        // à faire dans cette phase
  transition?: string;    // réflexe de passage vers la phase suivante
  cave?: string;          // piège à ne pas oublier
}

export const REFLEX_PHASES: ReflexPhase[] = [
  {
    id: 'start', title: 'Ankommen & Ruhe', subtitle: 'Avant de commencer', icon: 'handshake', minutes: 0,
    steps: [
      'Respire, pose ton stylo et ta feuille (Muster-Bogen) devant toi.',
      'Rappelle-toi la structure : Anamnese → Doku → Fallvorstellung.',
      'Objectif de langue, pas de médecine parfaite : parler, structurer, ne pas rester muet.',
    ],
    transition: 'Salue, présente-toi, demande le Einverständnis — puis enchaîne directement.',
  },
  {
    id: 'anamnese', title: 'Anamnese', subtitle: '~20 min · Arzt-Patient', icon: 'pain', minutes: 20,
    steps: [
      'Gesprächseröffnung + Einverständnis.',
      'Personalia → aktuelle Beschwerden (Schmerzanalyse OPQRST) → vegetativ.',
      'Vorerkrankungen/OP → Medikamente → Allergien → Noxen → Familie/Sozial.',
      'Registre patient : kein Fachchinesisch. Note les Stichpunkte sur le Bogen.',
      'Termine par la Verdachtsdiagnose énoncée au patient.',
    ],
    transition: '⏱️ À ~2 min de la fin : « Möchten Sie noch etwas hinzufügen? » puis vérifie tes notes AVANT de passer à la Doku.',
    cave: 'Notfall (MI, Lungenembolie, Apoplex, GIB) → stabiliser + OA d\'abord, puis reprendre.',
  },
  {
    id: 'doku', title: 'Dokumentation', subtitle: '~20 min · Arztbrief', icon: 'history', minutes: 20,
    steps: [
      'Anrede formelle + Einleitung.',
      'Anamnèse au Konjunktiv I ; mesures au Passiv.',
      'VD + DD → Diagnostik (Labor → apparativ) → Therapie.',
      'N\'oublie JAMAIS la Schlussformel (sinon points en moins).',
    ],
    transition: 'Avant la Fallvorstellung : tu n\'auras QUE tes notes (pas le brief). Relis ton Bogen, structure mentalement les 13 chapitres.',
    cave: '"Alkoholkonsum" (pas -abusus) · py pour le tabac · Z. n. pour les OP.',
  },
  {
    id: 'fallvorstellung', title: 'Fallvorstellung', subtitle: '~20 min · Arzt-Arzt', icon: 'stethoscope', minutes: 20,
    steps: [
      'Demande la permission de présenter, puis Fachsprache.',
      'AZ/EZ → Anamnese (Konjunktiv I) → VD/DD → Diagnostik → Therapie/Prognose.',
      'Les Prüfer t\'interrompent : normal. Tu peux poser des questions.',
      '« Das weiß ich leider nicht. Was meinen Sie, Frau/Herr X? » plutôt qu\'un blackout.',
    ],
    transition: 'On peut te demander une Aufklärung à l\'improviste : bascule sur les 7 blocs, garde ton calme.',
    cave: 'Fachbegriffe à clarifier en fin de partie — reste précis.',
  },
];

export const GENERAL_REFLEXES: { icon: string; text: string }[] = [
  { icon: 'alert', text: 'Ne reste jamais muet — reformule, gagne du temps, mais parle.' },
  { icon: 'ear', text: 'Pas compris ? « Könnten Sie das bitte wiederholen? » — c\'est autorisé.' },
  { icon: 'shield', text: 'Patient difficile ? Reste poli, garde le contrôle du dialogue.' },
  { icon: 'history', text: 'Gère le temps : ~2 min de marge en fin de chaque partie pour vérifier.' },
  { icon: 'question', text: 'Tu ne sais pas ? Propose de demander l\'Oberarzt — c\'est valorisé, pas pénalisé.' },
];
