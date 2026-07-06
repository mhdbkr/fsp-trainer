// ============================================================================
// Fallvorstellung — 13 chapitres dans l'ordre de présentation (source :
// ArztbriefVorstellung_2.pdf / ODAK V4). Chaque chapitre expose ses
// Redewendungen ALTERNATIVES (le candidat choisit et DIT ; jamais auto-généré).
// Le même contenu sert de guide au Arztbrief (rédigé, Konjunktiv I / Passiv).
// ============================================================================

export interface VorstellungChapter {
  id: string;
  order: number;
  title: string;       // titre allemand
  subtitle: string;    // aide FR
  icon: string;        // clé picto
  keywords: string[];  // mots-clés surlignés
  redewendungen: string[]; // formulations alternatives
}

export const VORSTELLUNG_CHAPTERS: VorstellungChapter[] = [
  {
    id: 'persoenliche-daten', order: 1, title: 'Persönliche Daten', subtitle: 'Ouverture + identité',
    icon: 'id', keywords: ['jährige', 'Patient', 'Notaufnahme', 'vorstellte'],
    redewendungen: [
      'Guten Tag, Frau/Herr Dr. X. Wir haben einen neuen Patienten. Ich würde gern über ihn berichten. Darf ich?',
      'Herr/Frau X ist ein/eine …-jährige/r Patient/in, der/die sich vor … in der Notaufnahme vorstellte.',
    ],
  },
  {
    id: 'aktuelle-beschwerden', order: 2, title: 'Aktuelle Beschwerden', subtitle: 'Motif (dit en premier)',
    icon: 'pain', keywords: ['stellte sich', 'wegen', 'Ausstrahlung', 'Schmerzintensität', 'Begleitsymptome'],
    redewendungen: [
      '… der/die sich wegen seit/vor … aufgetretener persistierender/rezidivierender + [Charakter] + Schmerzen + [Lokalisation] mit Ausstrahlung in … vorstellte.',
      'Die Beschwerden seien plötzlich/langsam aufgetreten und hätten sich im Verlauf verschlechtert/nicht verändert.',
      'Die Schmerzintensität läge bei … von 10 auf der Schmerzskala.',
      'Als Auslöser gebe der Patient … an; als Verstärkungs-/Linderungsfaktor …',
      'Die Frage nach ähnlichen früheren Beschwerden sei bejaht/verneint worden.',
      'Zusätzlich träten folgende Begleitsymptome auf: …',
      'Die vegetative Anamnese sei unauffällig bis auf … / sei auffällig: …',
    ],
  },
  {
    id: 'allergien', order: 3, title: 'Allergien', subtitle: 'Allergies',
    icon: 'allergy', keywords: ['Allergie', 'bekannt', 'reagiere'],
    redewendungen: [
      'Bei dem Patienten/der Patientin seien keine Allergien bekannt.',
      'Eine XXX-Allergie sei bekannt, auf die er/sie mit … reagiere.',
    ],
  },
  {
    id: 'rauchen', order: 4, title: 'Rauchen', subtitle: 'Tabac (py)',
    icon: 'cigarette', keywords: ['rauche', 'py', 'Nichtraucher', 'Ex-Raucher'],
    redewendungen: [
      'Der Patient/Die Patientin rauche … Zigaretten pro Tag seit … Jahren (… py).',
      'Der Patient/Die Patientin sei Nichtraucher.',
      'Der Patient/Die Patientin habe das Rauchen aufgegeben und sei seit … Jahren rauchfrei.',
    ],
  },
  {
    id: 'alkohol', order: 5, title: 'Alkohol', subtitle: 'Alcool (Konsum!)',
    icon: 'glass', keywords: ['Alkoholkonsum', 'gelegentlich', 'regelmäßig'],
    redewendungen: [
      'Er/Sie gebe an, keinen Alkohol zu trinken.',
      'Gelegentlich trinke er/sie Alkohol, und zwar … pro Woche.',
      'Regelmäßig trinke er/sie Alkohol, nämlich … pro Tag.',
    ],
  },
  {
    id: 'drogen', order: 6, title: 'Drogen', subtitle: 'Drogues',
    icon: 'cannabis', keywords: ['Drogen', 'Marihuana', 'konsumiert'],
    redewendungen: [
      'Er/Sie habe keine Drogen konsumiert und nie welche ausprobiert.',
      'In der Vergangenheit habe er/sie Marihuana/Cannabis ausprobiert.',
    ],
  },
  {
    id: 'sozialanamnese', order: 7, title: 'Sozialanamnese', subtitle: 'Social',
    icon: 'family', keywords: ['Beruf', 'verheiratet', 'Kinder', 'wohne'],
    redewendungen: [
      'Er/Sie sei beruflich als … tätig. Stress am Arbeitsplatz wurde verneint/bejaht.',
      'Er/Sie sei verheiratet/ledig/geschieden/verwitwet, habe … Kinder und wohne allein / mit der Familie.',
    ],
  },
  {
    id: 'familienanamnese', order: 8, title: 'Familienanamnese', subtitle: 'Antécédents familiaux',
    icon: 'family', keywords: ['Mutter', 'Vater', 'leide an', 'gestorben'],
    redewendungen: [
      'In der Familie fänden sich folgende relevante Erkrankungen: …',
      'Die Mutter leide an … (Dativ).',
      'Der Vater sei an … gelitten und vor … Jahren an … gestorben.',
    ],
  },
  {
    id: 'vorerkrankungen', order: 9, title: 'Vorerkrankungen / Voroperationen', subtitle: 'Antécédents',
    icon: 'history', keywords: ['bekannt', 'Z. n.', 'operiert'],
    redewendungen: [
      'Folgende Erkrankungen seien bekannt: … (seit … Jahren).',
      'Z. n. … im Jahr … / Er sei … wegen … operiert worden.',
    ],
  },
  {
    id: 'medikation', order: 10, title: 'Medikation', subtitle: 'Traitements',
    icon: 'pill', keywords: ['nehme', 'ein', 'bei Bedarf'],
    redewendungen: [
      'Er/Sie nehme regelmäßig folgende Medikamente ein: [Name] [Dosierung] [0-0-0].',
      'Außerdem nehme er/sie … bei Bedarf.',
    ],
  },
  {
    id: 'impfung', order: 11, title: 'Impfung / Reiseanamnese', subtitle: 'Vaccins / voyage',
    icon: 'syringe', keywords: ['geimpft', 'Impfstatus'],
    redewendungen: [
      'Er/Sie sei vollständig geimpft.',
      'Der Impfstatus sei unbekannt / nicht komplett.',
    ],
  },
  {
    id: 'frauenanamnese', order: 12, title: 'Frauenanamnese', subtitle: 'Si patiente',
    icon: 'female', keywords: ['schwanger', 'Periode', 'Verhütungsmittel'],
    redewendungen: [
      'Aktuelle Gravidität wurde verneint. Die Periode sei regelmäßig.',
      'Sie nehme ein/kein Verhütungsmittel.',
    ],
  },
  {
    id: 'diagnostik-procedere', order: 13, title: 'Diagnostik & Procedere', subtitle: 'VD → DD → Diagnostik → Therapie',
    icon: 'stethoscope', keywords: ['deuten auf', 'Differentialdiagnosen', 'Abklärung', 'Therapie'],
    redewendungen: [
      'Die anamnestischen Angaben deuten am ehesten auf … hin.',
      'Als Differentialdiagnosen kommen in Betracht: …',
      'Als erste Maßnahme ist eine körperliche Untersuchung vorgesehen (Vitalparameter, BB-Messung).',
      'Zur weiteren Abklärung schlage ich vor: Labor (BB, CRP/BSG, Nieren-/Leberwerte…), apparativ (EKG, Sono, CT/MRT, Endoskopie…).',
      'Sollte sich die Verdachtsdiagnose bestätigen, schlage ich folgende Therapie vor: stationäre Aufnahme, medikamentös, ggf. chirurgisch, allgemeine Maßnahmen.',
      'Das war zunächst alles. Des Weiteren möchte ich den Fall gern mit Ihnen besprechen.',
    ],
  },
];
