// ============================================================================
// Les paramètres nommés de la série 4 — UN endroit chacun
// (training-journal.md §13). Toute valeur en dur ailleurs est un défaut de contrat.
// ============================================================================

/** Écart minimal, en jours calendaires, entre deux réussites ≥ 80 pour qu'un Teil soit solide (§13.2). */
export const SOLIDE_ECART_JOURS = 3;

/**
 * Premier jour où la règle « solide stable » s'applique à la FRISE (INV-69) :
 * avant ce jour (`yyyy-MM-dd`, exclu), `indiceAt` garde la règle série 3.
 * C'est la date de déploiement de S4-1 ; elle se pose avec le merge. Trop
 * tardive, elle fige quelques jours de frise de plus (inoffensif) ; trop
 * précoce, elle réécrirait des points déjà montrés (INV-69).
 */
export const DATE_NOUVELLE_REGLE = '2026-10-05';

// --- §13.1 Consolidation espacée (S4-2) -----------------------------------
export const CONSOLIDATION_JOURS = [7, 21, 45] as const;   // plafond : le dernier
export const POIDS_CONSOLIDATION = 1 / 3;
export const SEUIL_FREQUENT = 0.5;                          // de `freq`
export const FENETRE_D_UN_TRAIT_JOURS_OUVRES = 15;          // décision (a) de la direction
/** `false` jusqu'à ce que S4-3 soit en production : aucune tâche `dUnTrait` n'est générée avant. */
export const D_UN_TRAIT_ACTIF = false;

// --- §13.3 Erreurs transversales (S4-2) ------------------------------------
export const ERREUR_FENETRE = 5;
export const ERREUR_SEUIL = 3;
export const ERREUR_CAS_MIN = 2;

// --- §13.4 Durées apprises (S4-2) ------------------------------------------
export const DUREE_FENETRE = 10;
export const DUREE_MIN_MESURES = 3;
export const DUREE_BORNES = [5, 45] as const;               // minutes par Teil

// --- §13.5 Rythme proposé (S4-2) -------------------------------------------
export const RYTHME_FENETRE_JOURS = 7;
export const RYTHME_SEUIL = 0.6;
export const RYTHME_MIN_JOURS = 3;
export const BUDGET_PLANCHER_MIN = 20;
export const RYTHME_REFUS_MAX = 2;
