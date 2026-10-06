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
export const DATE_NOUVELLE_REGLE = '2026-10-06';

// --- §13.1 Consolidation espacée (S4-2) -----------------------------------
export const CONSOLIDATION_JOURS = [7, 21, 45] as const;   // plafond : le dernier
export const POIDS_CONSOLIDATION = 1 / 3;
export const SEUIL_FREQUENT = 0.5;                          // de `freq`
export const FENETRE_D_UN_TRAIT_JOURS_OUVRES = 15;          // décision (a) de la direction
/** Vrai depuis le déploiement de S4-3 (§12.12) : la partie sait enchaîner les trois Teile, la tâche « d'un trait » peut être générée. */
export const D_UN_TRAIT_ACTIF = true;

// --- §13.3 Erreurs transversales (S4-2) ------------------------------------
export const ERREUR_FENETRE = 5;
export const ERREUR_SEUIL = 3;
export const ERREUR_CAS_MIN = 2;

// --- §13.4 Durées apprises (S4-2) ------------------------------------------
/** Le REPLI tant qu'il y a moins de `DUREE_MIN_MESURES` mesures (20/20/12 min) — ni `SIM_MIN` ni `MOCK_MIN` ne survivent. */
export const TEIL_MIN: Record<'anamnese' | 'dokumentation' | 'fallvorstellung', number> = { anamnese: 20, dokumentation: 20, fallvorstellung: 12 };
export const DUREE_FENETRE = 10;
export const DUREE_MIN_MESURES = 3;
export const DUREE_BORNES = [5, 45] as const;               // minutes par Teil

// --- §13.5 Rythme proposé (S4-2) -------------------------------------------
export const RYTHME_FENETRE_JOURS = 7;
export const RYTHME_SEUIL = 0.6;
export const RYTHME_MIN_JOURS = 3;
export const BUDGET_PLANCHER_MIN = 20;
export const RYTHME_REFUS_MAX = 2;
/** Le curseur « Volume par session » de ProgramSetup, en MINUTES de session (revue m4) : toute config écrite par
 *  `accepterRythme` y tombe sur un point — jamais 0,2564 h. */
export const SESSION_PAS_MIN = 5;
export const SESSION_MIN_MIN = 15;
export const SESSION_MAX_MIN = 360;

// --- S4-5 « Jusqu'à l'examen » : la projection sur le rythme réel (proposition validée, § 4 · Programme) -------------
/** « À ton rythme des deux dernières semaines » : la fenêtre du rythme, en jours calendaires finissant hier. Proposé
 *  au tableau §13 du contrat (S4-5). Sous `RYTHME_MIN_JOURS` jours ouvrés dans la fenêtre, rien n'est projeté. */
export const PROJECTION_FENETRE_JOURS = 14;

// --- simulation-run.md §10.7 : l'annonce unique des changements rétroactifs ---
// Chaque sujet a sa garde : l'annonce ne parle d'un changement qu'une fois LIVRÉ.
// `teile` est livré par S4-1. `mode` passe à `true` avec S4-2 en production,
// `muster` avec S4-3 — dans le commit qui les déploie, comme `D_UN_TRAIT_ACTIF`.
export const ANNONCE_TEILE_ACTIVE = true;
export const ANNONCE_MODE_ACTIVE = true;           // S4-2 : un `teil-first` explicite devient `cas-complet` (§12.5) — livré avec ce commit
export const ANNONCE_MUSTER_ACTIVE = true;         // S4-3 : le Muster de ville devient « libre » (§10.6) — livré avec la branche (merger = déployer)
