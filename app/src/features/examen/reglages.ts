// ============================================================================
// Les deux décisions de l'Examen encore EN DISCUSSION avec la direction (6 oct.) — isolées ici pour changer en un point.
//
// Décision 7 — le partenaire n'est PAS enregistré avec la partie. Le choix « seul / avec un simulant » vit sur l'appareil
// (`PartnerCard`, localStorage `fsp-partenaire`) et ne sort nulle part. Pour l'enregistrer : un champ de `projektion`
// (`lib/lauf/speichern.ts`), et rien d'autre.
//
// Décision 10 — aucune limite ni message sur la fréquence des examens : `null`. Un nombre ⇒ au-delà de ce nombre
// d'examens dans la semaine, `/examen` le dit, sans bloquer.
// ============================================================================
export const EXAMENS_PAR_SEMAINE_CONSEILLES: number | null = null;
