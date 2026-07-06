// ============================================================================
// Comparateur Arztbrief LÉGER — feedback formatif, PAS une correction magique.
// Détecte la présence des blocs attendus + indices de registre (Konjunktiv I,
// Passiv) + Schlussformeln, sans réécrire le texte du candidat.
// 100 % local (heuristiques), aucune IA nécessaire.
// ============================================================================

export interface ArztbriefBlock {
  key: string;
  label: string;
  patterns: RegExp[];   // marqueurs de présence
}

// Blocs attendus dans un Arztbrief FSP (ordre indicatif).
export const ARZTBRIEF_BLOCKS: ArztbriefBlock[] = [
  { key: 'anrede', label: 'Anrede (Sehr geehrte…)', patterns: [/sehr geehrte/i] },
  { key: 'einleitung', label: 'Einleitung / Vorstellung', patterns: [/berichten|vorstellte|stellte sich|aufnahme/i] },
  { key: 'beschwerden', label: 'Aktuelle Beschwerden', patterns: [/beschwerden|schmerzen|klagte|gab an/i] },
  { key: 'vegetativ', label: 'Vegetative Anamnese', patterns: [/vegetative|appetit|schlaf|stuhl|fieber/i] },
  { key: 'vorerkrankungen', label: 'Vorerkrankungen', patterns: [/vorerkrankung|leide an|z\.\s?n\.|bekannt sei/i] },
  { key: 'medikamente', label: 'Medikamente', patterns: [/medikament|nehme.*ein|mg\b|bei bedarf/i] },
  { key: 'noxen', label: 'Noxen', patterns: [/noxen|nikotin|py\b|alkoholkonsum|rauche/i] },
  { key: 'verdacht', label: 'Verdachtsdiagnose', patterns: [/verdacht|deutet auf|am ehesten|v\.\s?a\./i] },
  { key: 'differenzial', label: 'Differenzialdiagnosen', patterns: [/differenzial|differential|kommen in betracht|dd\b/i] },
  { key: 'diagnostik', label: 'Diagnostik / Maßnahmen', patterns: [/abklärung|labor|sonograf|ekg|ct\b|mrt|endoskop|untersuchung/i] },
  { key: 'therapie', label: 'Therapie / Procedere', patterns: [/therapie|behandlung|stationär|verabreicht|eingeleitet/i] },
  { key: 'schlussformel', label: 'Schlussformel', patterns: [/für weitere fragen|freundlichen kollegialen|mit freundlichen/i] },
];

export interface RegisterFlag {
  key: 'konjunktiv1' | 'passiv';
  label: string;
  ok: boolean;
  hint: string;
}

export interface ArztbriefFeedback {
  blocksPresent: string[];
  blocksMissing: string[];
  coveragePct: number;
  registerFlags: RegisterFlag[];
  wordCount: number;
}

/** Analyse le texte du candidat vs les blocs attendus. `reference` sert de
 *  garde-fou (non utilisé pour réécrire — juste pour d'éventuelles extensions). */
export function compareArztbrief(userText: string, _reference?: string): ArztbriefFeedback {
  const text = (userText ?? '').trim();
  const present: string[] = [];
  const missing: string[] = [];
  for (const b of ARZTBRIEF_BLOCKS) {
    (b.patterns.some((re) => re.test(text)) ? present : missing).push(b.key);
  }
  // Indices de registre.
  const konjunktiv = /\b(sei|seien|habe|hätte|nehme|leide|klage|gebe|träte)\b/i.test(text);
  const passiv = /\b(wurde|wurden|werde|worden)\b/i.test(text);

  return {
    blocksPresent: present,
    blocksMissing: missing,
    coveragePct: Math.round((present.length / ARZTBRIEF_BLOCKS.length) * 100),
    registerFlags: [
      { key: 'konjunktiv1', label: 'Konjunktiv I (Anamnese)', ok: konjunktiv, hint: 'Rapporter les dires du patient : « Der Patient leide an … », « … sei bekannt ».' },
      { key: 'passiv', label: 'Passiv (Maßnahmen)', ok: passiv, hint: 'Décrire les mesures au passif : « Blut wurde abgenommen », « CT wurde geplant ».' },
    ],
    wordCount: text ? text.split(/\s+/).length : 0,
  };
}

export function blockLabel(key: string): string {
  return ARZTBRIEF_BLOCKS.find((b) => b.key === key)?.label ?? key;
}
