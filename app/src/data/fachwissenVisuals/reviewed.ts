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

export const REVIEWED_ERGAENZT: ReviewedEntry[] = [];
