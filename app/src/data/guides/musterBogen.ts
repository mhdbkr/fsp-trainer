import type { MusterCity } from '@/db/types';

// ============================================================================
// Muster-Bogen — layouts relevés sur les vrais formulaires (PDF rendus).
// Le Bogen p.1 capture les données STATIQUES ; l'anamnèse du motif va dans le
// Bericht (rédigé par le candidat). L'ODAK est le modèle pédagogique complet.
// `kind` : 'header' (identité), 'box' (zone libre), 'split' (2 sous-champs).
// ============================================================================

export interface BogenField {
  key: string;               // clé de stockage (BogenNotes)
  label: string;
  icon: string;
  kind: 'header' | 'box' | 'split';
  hint?: string;             // question-guide (mode Assisté)
  subFields?: { key: string; label: string }[]; // pour kind 'split'
}

export interface MusterBogenSpec {
  city: MusterCity;
  title: string;
  instruction: string;       // consigne officielle (Stichpunkte vs ganze Sätze)
  style: 'stichpunkte' | 'ganze-saetze' | 'frei';
  fields: BogenField[];
  berichtLabel: string;      // libellé de la page Bericht
}

const HEADER: BogenField = {
  key: 'personalia', label: 'Patient/-in', icon: 'id', kind: 'header',
  hint: 'Name · Geburtsdatum · Alter · Größe · Gewicht',
};
const ALLERGIEN: BogenField = { key: 'allergien', label: 'Allergien / Unverträglichkeiten', icon: 'allergy', kind: 'box', hint: 'Medikamente, Nahrung…' };
const SOZIAL: BogenField = { key: 'sozial', label: 'Sozialanamnese', icon: 'family', kind: 'box', hint: 'Beruf, Familienstand, Wohnen…' };
const FAMILIE: BogenField = { key: 'familie', label: 'Familienanamnese', icon: 'family', kind: 'box', hint: 'chron. Erkrankungen der Familie' };

export const MUSTER_BOGEN: Record<MusterCity, MusterBogenSpec> = {
  ODAK: {
    city: 'ODAK', title: 'Muster ODAK (komplett)',
    instruction: 'Modèle pédagogique complet — couvre aussi l\'anamnèse du motif.',
    style: 'stichpunkte',
    berichtLabel: 'Diagnostik & Procedere',
    fields: [
      HEADER,
      { key: 'hauptbeschwerde', label: 'Hauptbeschwerde', icon: 'pain', kind: 'box', hint: 'Ort · Dauer · Charakter · Verlauf · Intensität · Ausstrahlung' },
      { key: 'vegetativ', label: 'Vegetativ', icon: 'pulse', kind: 'box', hint: 'Fieber, Übelkeit, Gewicht, Schlaf, Stuhl…' },
      { key: 'vorerkrankungen', label: 'Vorerkrankungen · Voroperationen · Medikamente', icon: 'history', kind: 'box' },
      SOZIAL, FAMILIE, ALLERGIEN,
      { key: 'impfung', label: 'Impfung', icon: 'syringe', kind: 'box' },
      { key: 'noxen', label: 'Noxen', icon: 'cigarette', kind: 'split', subFields: [{ key: 'rauchen', label: 'Rauchen' }, { key: 'drogen', label: 'Drogen' }] },
      { key: 'frauen', label: 'Frauenanamnese', icon: 'female', kind: 'box' },
    ],
  },
  Freiburg: {
    city: 'Freiburg', title: 'Muster Freiburg',
    instruction: 'Données de fond ; le motif va dans le « Brief ».',
    style: 'frei',
    berichtLabel: 'Brief',
    fields: [HEADER, ALLERGIEN, { key: 'noxen', label: 'Noxen', icon: 'cigarette', kind: 'box' }, SOZIAL, FAMILIE],
  },
  Karlsruhe: {
    city: 'Karlsruhe', title: 'Berichtsbogen – Karlsruhe',
    instruction: 'Bericht en ganzen Sätzen ; ne pas répéter la page 1.',
    style: 'ganze-saetze',
    berichtLabel: 'Bericht: Anamnese / Verdachtsdiagnose / weitere Diagnostik / Therapievorschläge',
    fields: [HEADER, ALLERGIEN, { key: 'genussmittel', label: 'Genussmittel / Drogen', icon: 'cigarette', kind: 'box' }, SOZIAL, FAMILIE],
  },
  Reutlingen: {
    city: 'Reutlingen', title: 'Berichtbogen – FSP Reutlingen',
    instruction: 'Notez in kurzen Stichpunkten.',
    style: 'stichpunkte',
    berichtLabel: 'Bericht (Anamnese, VD, Diagnostik, Therapie)',
    fields: [
      HEADER, ALLERGIEN,
      { key: 'medikamente', label: 'Medikamente', icon: 'pill', kind: 'box', hint: 'Name · Dosierung · 0-0-0' },
      { key: 'noxen', label: 'Noxen', icon: 'cigarette', kind: 'split', subFields: [{ key: 'genussmittel', label: 'Genussmittel' }, { key: 'drogen', label: 'Drogen' }] },
      SOZIAL, FAMILIE,
    ],
  },
  Stuttgart: {
    city: 'Stuttgart', title: 'Berichtbogen – Fachsprachenprüfung (Stuttgart)',
    instruction: 'Notez in kurzen Stichpunkten.',
    style: 'stichpunkte',
    berichtLabel: 'Bericht (Anamnese, VD, Diagnostik, Therapie)',
    fields: [HEADER, ALLERGIEN, { key: 'genussmittel', label: 'Genussmittel / Drogen', icon: 'cigarette', kind: 'box' }, SOZIAL, FAMILIE],
  },
};

export const MUSTER_CITIES: MusterCity[] = ['ODAK', 'Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'];
