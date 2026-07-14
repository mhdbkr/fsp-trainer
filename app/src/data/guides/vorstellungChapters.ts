import type { Phrase } from './phrases';

// ============================================================================
// Fallvorstellung (Arzt-Arzt-Gespräch) — chapitres dans l'ordre de
// présentation, fidèles aux trames de référence (présentation orale + manuel,
// chap. Fallvorstellung). Chaque chapitre expose ses Redewendungen avec leurs
// VARIANTES équivalentes (le candidat en choisit une et la DIT lui-même —
// jamais de trame auto-générée).
// ============================================================================

export interface VorstellungChapter {
  id: string;
  order: number;
  title: string;       // titre allemand
  subtitle: string;    // aide FR
  icon: string;        // clé picto
  keywords: string[];  // mots-clés surlignés
  redewendungen: Phrase[]; // formulations (+ variantes)
}

export const VORSTELLUNG_CHAPTERS: VorstellungChapter[] = [
  {
    id: 'persoenliche-daten', order: 1, title: 'Persönliche Daten', subtitle: 'Ouverture + identité',
    icon: 'id', keywords: ['jährige', 'Notaufnahme', 'vorstellte', 'Darf ich'],
    redewendungen: [
      {
        text: 'Guten Tag, Frau/Herr Doktor. Wir haben einen neuen Patienten / eine neue Patientin, nämlich Herrn/Frau X, und ich würde gern über ihn/sie berichten. Darf ich? — Vielen Dank.',
        alts: ['Guten Tag, Frau/Herr Professor X. Ich möchte Ihnen unseren neuen Patienten vorstellen.'],
      },
      'Herr/Frau X ist ein/eine …-jährige/r Patient/in, der/die sich vor … Minuten in der Notaufnahme / auf unserer Station vorstellte.',
    ],
  },
  {
    id: 'allgemeinzustand', order: 2, title: 'Allgemein- & Ernährungszustand', subtitle: 'État général + orientation',
    icon: 'pulse', keywords: ['Allgemeinzustand', 'Ernährungszustand', 'orientiert'],
    redewendungen: [
      {
        text: 'Der Patient / Die Patientin befand sich in gutem / schlechtem / schmerzbedingt reduziertem Allgemeinzustand und normalem / schlankem / adipösem / kachektischem Ernährungszustand.',
        alts: ['Der Allgemeinzustand war leicht / stark / deutlich reduziert.'],
      },
      'Er/Sie war zu Ort, Zeit, Person und Situation (voll) orientiert / desorientiert.',
    ],
  },
  {
    id: 'aktuelle-beschwerden', order: 3, title: 'Aktuelle Beschwerden', subtitle: 'Motif (dit en premier)',
    icon: 'pain', keywords: ['stellte sich', 'Ausstrahlung', 'Schmerzintensität', 'Begleitsymptome', 'bejaht', 'verneint'],
    redewendungen: [
      {
        text: '… der/die sich wegen seit/vor … aufgetretener persistierender/rezidivierender + [Charakter] + Schmerzen + [Lokalisation] mit Ausstrahlung in … / ohne Ausstrahlung vorstellte.',
        alts: ['Beispiel: „… wegen vor einer Woche aufgetretener permanenter drückender Oberbauchschmerzen rechts mit Ausstrahlung in den Rücken.“'],
      },
      'Die Beschwerden seien plötzlich/langsam aufgetreten und hätten sich im Laufe der Zeit verschlechtert / verbessert / nicht verändert.',
      'Die Schmerzintensität läge bei … von 10 auf der Schmerzskala.',
      {
        text: 'Als Auslöser gebe der Patient … an; … wirke als Verstärkungsfaktor und … als Linderungsfaktor.',
        alts: ['Auslöser, Verstärkungs- oder Linderungsfaktoren seien nicht vorhanden.'],
      },
      'Die Einnahme von [Medikament] habe keine / eine leichte / eine deutliche / eine temporäre Verbesserung gebracht.',
      {
        text: 'Die Frage nach ähnlichen früheren Beschwerden sei bejaht/verneint worden.',
        followUp: ['Falls bejaht: Der Patient sei deswegen beim Hausarzt gewesen, der [Diagnose] diagnostiziert habe, welche mit [Medikation] behandelt würde.'],
      },
      'Zusätzlich zu den Hauptbeschwerden träten folgende Begleitsymptome auf: …',
      {
        text: 'Die vegetative Anamnese sei unauffällig bis auf … / sei auffällig: …',
        alts: ['Die Fragen nach [Symptom] seien bejaht worden, während die Fragen nach [Symptom] verneint worden seien.'],
      },
    ],
  },
  {
    id: 'allergien', order: 4, title: 'Allergien', subtitle: 'Allergies',
    icon: 'allergy', keywords: ['Allergie', 'bekannt', 'reagiere'],
    redewendungen: [
      {
        text: 'Bei dem Patienten / der Patientin seien keine Allergien bekannt.', label: 'Ohne Allergie',
        alts: [
          'Es seien keine Allergien dokumentiert.',
          'Der Patient / Die Patientin habe keine bekannten Allergien.',
          'Es liegen keine bekannten Allergien vor.',
        ],
      },
      {
        text: 'Eine …-Allergie sei bekannt, auf die er/sie mit … reagiere.', label: 'Mit Allergie',
        alts: [
          'Der Patient / Die Patientin weise eine bekannte …-Allergie auf, die eine Reaktion mit … auslöse.',
          'Es bestehe eine bekannte …-Allergie, welche Reaktionen mit … hervorrufe.',
        ],
      },
    ],
  },
  {
    id: 'rauchen', order: 5, title: 'Rauchen', subtitle: 'Tabac (paquets-années)',
    icon: 'cigarette', keywords: ['rauche', 'py', 'Nichtraucher', 'Ex-Raucher', 'rauchfrei'],
    redewendungen: [
      {
        text: 'Der Patient / Die Patientin rauche … Zigaretten pro Tag, und dies seit … Jahren (… py).', label: 'Raucher',
        alts: [
          'Der Patient gebe an, seit … Jahren täglich … Zigaretten zu rauchen.',
          'Der Nikotinkonsum betrage … Zigaretten pro Tag seit … Jahren.',
          'Ein täglicher Konsum von … Zigaretten seit … Jahren sei bestätigt worden.',
        ],
      },
      {
        text: 'Der Patient / Die Patientin rauche nicht.', label: 'Nichtraucher',
        alts: [
          'Es bestünden keine Hinweise auf Nikotinkonsum.',
          'Der Patient / Die Patientin sei als Nichtraucher bekannt.',
        ],
      },
      {
        text: 'Der Patient / Die Patientin habe das Rauchen aufgegeben und sei seit … Jahren rauchfrei.', label: 'Ex-Raucher',
        alts: [
          'Das Rauchen sei beendet worden; Ex-Raucher seit …',
          'Früher habe er/sie … Zigaretten pro Tag über einen Zeitraum von … Jahren geraucht.',
        ],
      },
    ],
  },
  {
    id: 'alkohol', order: 6, title: 'Alkohol', subtitle: 'Alcool (Konsum!)',
    icon: 'glass', keywords: ['Alkoholkonsum', 'gelegentlich', 'regelmäßig', 'verzichte'],
    redewendungen: [
      {
        text: 'Er/Sie gebe an, keinen Alkohol zu trinken.', label: 'Kein Konsum',
        alts: ['Es sei bekannt, dass er/sie keinen Alkohol konsumiere.', 'Er/Sie verzichte auf Alkoholkonsum.'],
      },
      {
        text: 'Gelegentlich trinke er/sie Alkohol, und zwar … (z. B. 2 Gläser Wein) pro Woche.', label: 'Gelegentlich',
        alts: ['Er/Sie trinke hin und wieder Alkohol: … wöchentlich.'],
      },
      {
        text: 'Regelmäßig trinke er/sie Alkohol, nämlich … (z. B. 2 Gläser Wein) pro Tag.', label: 'Regelmäßig',
        alts: ['Er/Sie konsumiere regelmäßig Alkohol: … täglich.'],
      },
    ],
  },
  {
    id: 'drogen', order: 7, title: 'Drogen', subtitle: 'Drogues',
    icon: 'cannabis', keywords: ['Drogen', 'Marihuana', 'Kontakt', 'konsumiert'],
    redewendungen: [
      { text: 'Er/Sie habe keine Drogen konsumiert und nie welche ausprobiert.', label: 'Nie' },
      {
        text: 'Er/Sie habe aktuell keinen Kontakt zu Drogen.', label: 'Aktuell keiner',
        alts: ['Zurzeit stehe er/sie in keinem Kontakt mit Drogen.', 'Derzeit habe er/sie keinen Umgang mit Drogen.'],
      },
      {
        text: 'In der Vergangenheit habe er/sie bereits Drogen, insbesondere Marihuana/Cannabis, ausprobiert.', label: 'Früher',
        alts: ['Er/Sie habe schon einmal Marihuana/Cannabis konsumiert.'],
      },
    ],
  },
  {
    id: 'sozialanamnese', order: 8, title: 'Sozialanamnese', subtitle: 'Social',
    icon: 'family', keywords: ['Beruf', 'verheiratet', 'Kinder', 'wohne', 'Etage', 'Aufzug'],
    redewendungen: [
      {
        text: 'Er/Sie sei beruflich als … tätig. Stress am Arbeitsplatz wurde verneint/bejaht.',
        alts: ['Der Patient / Die Patientin sei … von Beruf.'],
      },
      'Er/Sie sei verheiratet / ledig / geschieden / verwitwet / in einer Partnerschaft lebend und habe keine / … gesunde Kinder.',
      {
        text: 'Er/Sie wohne allein / mit der Familie in einer Wohnung / einem Haus, … Etage, mit/ohne Aufzug.',
        alts: ['Er/Sie habe einen Hund. (Wichtig für die Entlassplanung!)'],
      },
    ],
  },
  {
    id: 'familienanamnese', order: 9, title: 'Familienanamnese', subtitle: 'Antécédents familiaux',
    icon: 'family', keywords: ['Mutter', 'Vater', 'leide an', 'gestorben', 'Geschwister'],
    redewendungen: [
      'Es fänden sich in der Familie folgende relevante Erkrankungen: …',
      {
        text: 'Die Mutter leide an … (+ Dativ).',
        alts: ['Der Vater habe an … gelitten und sei vor … Jahren an … gestorben. (Beispiel: „Der Vater habe an arterieller Hypertonie gelitten und sei vor 3 Jahren an einem Myokardinfarkt gestorben.“)'],
      },
      {
        text: 'Er/Sie habe keine Geschwister.',
        alts: ['Er/Sie habe eine gesunde Schwester und einen Bruder, der an … erkrankt sei.'],
      },
    ],
  },
  {
    id: 'vorerkrankungen', order: 10, title: 'Vorerkrankungen / Voroperationen', subtitle: 'Antécédents',
    icon: 'history', keywords: ['bekannt', 'Zustand nach', 'operiert', 'Komplikation'],
    redewendungen: [
      {
        text: 'Folgende Erkrankungen seien bekannt: … (seit … Jahren).',
        alts: ['Die Krankengeschichte umfasst die folgenden Diagnosen: arterielle Hypertonie seit 5 Jahren, Diabetes mellitus Typ 2 seit 2 Jahren …'],
      },
      {
        text: 'Zustand nach … (Operation) im Jahr … / vor … Jahren.',
        alts: [
          'Er/Sie sei … wegen … operiert worden.',
          'Beispiel: „Appendektomie im Jahr 2010, mit postoperativer Wundinfektion als Komplikation. Cholezystektomie vor 5 Jahren ohne Komplikationen.“',
        ],
      },
    ],
  },
  {
    id: 'medikation', order: 11, title: 'Medikation', subtitle: 'Traitements',
    icon: 'pill', keywords: ['nehme', 'bei Bedarf', 'unauffällig'],
    redewendungen: [
      {
        text: 'Er/Sie nehme regelmäßig folgende Medikamente ein: [Name] [Dosierung] [1-0-1].',
        alts: ['Herr/Frau X berichtet über die Einnahme von: Paracetamol 1000 mg 1-0-0 …'],
      },
      'Außerdem nehme er/sie … bei Bedarf.',
      {
        text: 'Die Medikamentenanamnese sei unauffällig.', label: 'Keine Medikamente',
        alts: ['Bis auf … mg bei Bedarf nehme der Patient / die Patientin keine weiteren Medikamente ein.'],
      },
    ],
  },
  {
    id: 'impfung', order: 12, title: 'Impfung / Reiseanamnese', subtitle: 'Vaccins / voyage',
    icon: 'syringe', keywords: ['geimpft', 'Impfstatus'],
    redewendungen: [
      'Er/Sie sei vollständig geimpft.',
      'Der Impfstatus sei unbekannt / nicht komplett.',
    ],
  },
  {
    id: 'frauenanamnese', order: 13, title: 'Frauenanamnese', subtitle: 'Si patiente',
    icon: 'female', keywords: ['schwanger', 'Periode', 'Verhütungsmittel'],
    redewendungen: [
      {
        text: 'Aktuelle Gravidität wurde verneint. Die Periode sei regelmäßig.',
        alts: ['Sie sei nicht schwanger. / Regelmäßige Menstruation.'],
      },
      {
        text: 'Sie nehme ein/kein Verhütungsmittel.',
        alts: ['Keine Kontrazeptiva.'],
      },
    ],
  },
  {
    id: 'diagnostik-procedere', order: 14, title: 'Diagnostik & Procedere', subtitle: 'Diagnostic → diagnostics différentiels → examens → traitement',
    icon: 'stethoscope', keywords: ['deuten auf', 'Differentialdiagnosen', 'Abklärung', 'Therapie', 'Prognose'],
    redewendungen: [
      {
        text: 'Die anamnestischen Angaben deuten am ehesten auf … hin.',
        alts: [
          'Der anamnestische Befund deutet am ehesten auf … hin.',
          'Die anamnestischen Angaben lassen am ehesten auf … schließen.',
          'Die vorliegenden Informationen sprechen am ehesten für …',
          'Aufgrund der anamnestischen Angaben erscheint … am wahrscheinlichsten.',
        ],
      },
      {
        text: 'Als Differentialdiagnosen kommen die Folgenden in Betracht: …',
        alts: ['Die folgenden Differentialdiagnosen sollten erwogen werden: …', 'Als mögliche Differentialdiagnosen sind zu berücksichtigen: …'],
      },
      {
        text: 'Als erste Maßnahme würde ich den Patienten / die Patientin körperlich untersuchen (Vitalparameter, Blutdruckmessung, Körpertemperatur).',
        alts: ['Die körperliche Untersuchung ist als erste Maßnahme geplant.', 'Die körperliche Untersuchung wurde durchgeführt. Der Patient wurde stationär aufgenommen.'],
      },
      {
        text: 'Zur weiteren Abklärung schlage ich vor — Labor: Blutbild, Entzündungsparameter (CRP/BSG), Nieren- und Leberwerte, Elektrolyte; apparativ: EKG, Sonographie, ggf. CT/MRT, Endoskopie.',
        alts: [
          'Zur weiterführenden Diagnostik schlage ich die folgenden Schritte vor: …',
          'Für eine umfassendere Abklärung halte ich die folgenden Maßnahmen für notwendig: …',
        ],
      },
      {
        text: 'Sollte sich die Verdachtsdiagnose bestätigen, schlage ich folgende Therapie vor: stationäre Aufnahme / ambulante Therapie, medikamentös (Analgetikum, Antibiotikum …), ggf. chirurgisch, allgemeine Maßnahmen.',
        alts: [
          'Falls sich die Verdachtsdiagnose bestätigt, empfehle ich die folgende Therapie: …',
          'Allgemeine Maßnahmen: körperliche Aktivität, Nikotinkarenz / Noxenkarenz, Gewichtsnormalisierung, Blutdruck- und Blutzuckereinstellung, Ernährungsumstellung, Patientenschulung.',
        ],
      },
      'Ein chirurgisches / psychologisches Konsil zur Mitbeurteilung / zur Optimierung der Therapie wurde angemeldet.',
      'Der Patient wurde für … Tage krankgeschrieben. Prognose: positiv / fraglich, abhängig von der Compliance.',
      {
        text: 'Die Ergebnisse (der Untersuchungen) stehen noch aus.', label: 'Rettungsphrase',
        alts: ['Das weiß ich leider nicht. Was meinen Sie, Frau/Herr Doktor?'],
      },
      'Das war zunächst alles. Des Weiteren möchte ich den Fall gern mit Ihnen besprechen.',
    ],
  },
];
