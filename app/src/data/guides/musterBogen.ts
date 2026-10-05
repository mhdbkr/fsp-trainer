import type { MusterArt, MusterCity } from '@/db/types';

// ============================================================================
// Muster-Bogen — la feuille de notes de l'anamnèse (simulation-run.md §10.6,
// ADR-0021 déc. 9). DEUX choix, et deux seulement :
//   · GUIDÉ : toutes les rubriques de l'anamnèse, un champ par rubrique ;
//   · LIBRE : les rubriques d'identité, puis un grand champ de rédaction libre.
// Les cinq feuilles par ville de la série 3 se ressemblaient trop pour être un
// choix (décision de la direction) ; leur forme réelle est « données de fond +
// Bericht », d'où leur lecture en « libre ». Elles restent ici en LECTURE SEULE
// (`MUSTER_BOGEN_LEGACY`) pour libeller les notes déjà prises : aucune note
// n'est perdue, aucune clé n'est renommée (INV-74).
// `kind` : 'header' (identité), 'box' (zone libre), 'split' (2 sous-champs).
// ============================================================================

export interface BogenField {
  key: string;               // clé de stockage (BogenNotes)
  label: string;
  icon: string;
  kind: 'header' | 'box' | 'split';
  hint?: string;             // question-guide (mode Assisté)
  subFields?: { key: string; label: string }[]; // pour kind 'split'
  rows?: number;             // hauteur d'une zone 'box' (2 par défaut)
}

export interface MusterBogenSpec {
  name: string;              // nom court, dit dans l'aperçu
  title: string;
  instruction: string;
  style: 'stichpunkte' | 'ganze-saetze' | 'frei';
  fields: BogenField[];
  berichtLabel: string;      // libellé de la page Bericht
}

/** L'aide de Hauptbeschwerde quand le cas ne dit pas la nature de son motif. */
export const HAUPTBESCHWERDE_REPLI = 'Seit wann · Verlauf · Begleitbeschwerden';

const HEADER: BogenField = {
  key: 'personalia', label: 'Patient/-in', icon: 'id', kind: 'header',
  hint: 'Name · Geburtsdatum · Alter · Größe · Gewicht',
};
const ALLERGIEN: BogenField = { key: 'allergien', label: 'Allergien / Unverträglichkeiten', icon: 'allergy', kind: 'box', hint: 'Medikamente, Nahrung…' };
const SOZIAL: BogenField = { key: 'sozial', label: 'Sozialanamnese', icon: 'family', kind: 'box', hint: 'Beruf, Familienstand, Wohnen…' };
const FAMILIE: BogenField = { key: 'familie', label: 'Familienanamnese', icon: 'family', kind: 'box', hint: 'chron. Erkrankungen der Familie' };

/** Les deux Muster de la série 4. Guidé : toutes les clés de l'ancien `Standard`
 *  (contrat : aucune n'est retirée), plus `medikamente`. */
export const MUSTER_BOGEN: Record<MusterArt, MusterBogenSpec> = {
  guide: {
    name: 'guidé', title: 'Muster guidé',
    instruction: 'Une rubrique par chapitre de l’anamnèse, en mots-clés.',
    style: 'stichpunkte',
    berichtLabel: 'Diagnostik & Procedere',
    fields: [
      HEADER,
      // L'aide suit la nature du motif du cas (`AnamneseBogen`, fixeur B1) ; celle-ci est le repli, valable pour tout motif.
      { key: 'hauptbeschwerde', label: 'Hauptbeschwerde', icon: 'pain', kind: 'box', hint: HAUPTBESCHWERDE_REPLI },
      { key: 'vegetativ', label: 'Vegetativ', icon: 'pulse', kind: 'box', hint: 'Fieber, Übelkeit, Gewicht, Schlaf, Stuhl…' },
      { key: 'vorerkrankungen', label: 'Vorerkrankungen · Voroperationen', icon: 'history', kind: 'box' },
      { key: 'medikamente', label: 'Medikamente', icon: 'pill', kind: 'box', hint: 'Name · Dosierung · 0-0-0' },
      SOZIAL, FAMILIE, ALLERGIEN,
      { key: 'impfung', label: 'Impfung', icon: 'syringe', kind: 'box' },
      // Les clés du Standard (`noxen.rauchen`, `noxen.drogen`) sont gardées ; l'alcool a sa case (fixeur B1).
      { key: 'noxen', label: 'Noxen', icon: 'cigarette', kind: 'split', subFields: [{ key: 'rauchen', label: 'Rauchen' }, { key: 'alkohol', label: 'Alkohol' }, { key: 'drogen', label: 'Drogen' }] },
      { key: 'frauen', label: 'Frauenanamnese', icon: 'female', kind: 'box' },     // une patiente seulement (`AnamneseBogen`)
    ],
  },
  libre: {
    name: 'libre', title: 'Muster libre',
    instruction: 'L’identité, puis tes notes dans l’ordre où tu les prends.',
    style: 'frei',
    berichtLabel: 'Bericht',
    fields: [
      HEADER,
      { key: 'freitext', label: 'Notes', icon: 'pen', kind: 'box', rows: 14, hint: 'Hauptbeschwerde, Verlauf, Vorerkrankungen, Medikamente, Allergien, Noxen, Sozial- und Familienanamnese…' },
    ],
  },
};

export const MUSTER_ARTEN: MusterArt[] = ['guide', 'libre'];

/** Lecture tolérante, TOTALE (INV-74) : un Muster série 4, une ville série 3, ou rien. */
export const musterArt = (m: MusterArt | MusterCity | string | undefined | null): MusterArt =>
  m === 'libre' ? 'libre'
  : m === 'guide' || m === 'Standard' || m == null ? 'guide'
  : 'libre';                                        // Freiburg, Karlsruhe, Reutlingen, Stuttgart

/** Les cinq feuilles de la série 3, en LECTURE SEULE : elles ne servent qu'à libeller une
 *  note déjà prise sous une clé que les deux Muster n'ont pas (`genussmittel`…). */
export const MUSTER_BOGEN_LEGACY: Record<MusterCity, Pick<MusterBogenSpec, 'fields'>> = {
  Standard: { fields: MUSTER_BOGEN.guide.fields.filter((f) => f.key !== 'medikamente') },   // libellés : ceux du guidé
  Freiburg: { fields: [HEADER, ALLERGIEN, { key: 'noxen', label: 'Noxen', icon: 'cigarette', kind: 'box' }, SOZIAL, FAMILIE] },
  Karlsruhe: { fields: [HEADER, ALLERGIEN, { key: 'genussmittel', label: 'Genussmittel / Drogen', icon: 'cigarette', kind: 'box' }, SOZIAL, FAMILIE] },
  Reutlingen: {
    fields: [
      HEADER, ALLERGIEN,
      { key: 'medikamente', label: 'Medikamente', icon: 'pill', kind: 'box' },
      { key: 'noxen', label: 'Noxen', icon: 'cigarette', kind: 'split', subFields: [{ key: 'genussmittel', label: 'Genussmittel' }, { key: 'drogen', label: 'Drogen' }] },
      SOZIAL, FAMILIE,
    ],
  },
  Stuttgart: { fields: [HEADER, ALLERGIEN, { key: 'genussmittel', label: 'Genussmittel / Drogen', icon: 'cigarette', kind: 'box' }, SOZIAL, FAMILIE] },
};

/** La rubrique d'une clé de `BogenNotes` : libellée par le Muster courant, sinon par une
 *  feuille de ville, sinon par la clé elle-même (INV-74). `noxen.rauchen` se dit « Noxen · Rauchen ». */
export function bogenRubrik(key: string, spec: Pick<MusterBogenSpec, 'fields'>): { label: string; icon: string } {
  for (const s of [spec, ...Object.values(MUSTER_BOGEN_LEGACY)]) {
    for (const f of s.fields) {
      if (f.key === key) return { label: f.label, icon: f.icon };
      const sf = f.subFields?.find((x) => `${f.key}.${x.key}` === key);
      if (sf) return { label: `${f.label} · ${sf.label}`, icon: f.icon };
    }
  }
  return { label: key, icon: 'pen' };
}

/** Les clés qu'un Muster SAISIT, dans son ordre : un champ `split` saisit ses sous-clés
 *  (`noxen.rauchen`), jamais sa clé nue — une note `noxen` d'une feuille de ville n'a pas de case ici. */
export const bogenKeysOf = (spec: Pick<MusterBogenSpec, 'fields'>): string[] =>
  spec.fields.flatMap((f) => (f.kind === 'split' && f.subFields ? f.subFields.map((x) => `${f.key}.${x.key}`) : [f.key]));

/** Les notes non vides qu'un Muster n'a pas de case pour saisir : elles restent éditables
 *  dans « Autres notes » et visibles dans l'aperçu (INV-74). */
export const autresNotes = (bogen: Record<string, string>, spec: Pick<MusterBogenSpec, 'fields'>): string[] => {
  const saisies = new Set(bogenKeysOf(spec));
  return Object.keys(bogen).filter((k) => !saisies.has(k) && !!bogen[k]?.trim());
};
