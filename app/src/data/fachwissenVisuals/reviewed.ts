// Liste blanche des champs `source: 'ergänzt'` acceptés (contrat §4/§5#8).
// Un `'ergänzt'` bloque le validateur tant qu'il n'a pas de ligne ici.
//
// Écrit UNIQUEMENT par un relecteur `content-*` — le visualizer (implémenteur
// front) ne s'y inscrit jamais lui-même. `text` = le libellé exact
// (`label`/`answer`/`criterion`/…) porté par le champ marqué `'ergänzt'`.

export interface ReviewedEntry {
  fachwissenId: string;
  blockId: string;
  text: string;
}

export const REVIEWED_ERGAENZT: ReviewedEntry[] = [
  // Child-Pugh — seuils par critère absents de la fiche ; relu par
  // fsp-clinical-reviewer 2026-09-16 (reports/clinical-childpugh.md) : exacts
  // (Herold/AMBOSS), bandes A 5–6 / B 7–9 / C 10–15 identiques à la fiche.
  { fachwissenId: 'fw-leberzirrhose', blockId: 'gauge-child-pugh', text: 'Bilirubin (mg/dl)' },
  { fachwissenId: 'fw-leberzirrhose', blockId: 'gauge-child-pugh', text: 'Albumin (g/dl)' },
  { fachwissenId: 'fw-leberzirrhose', blockId: 'gauge-child-pugh', text: 'INR' },
  { fachwissenId: 'fw-leberzirrhose', blockId: 'gauge-child-pugh', text: 'Aszites' },
  { fachwissenId: 'fw-leberzirrhose', blockId: 'gauge-child-pugh', text: 'Enzephalopathie' },
];
