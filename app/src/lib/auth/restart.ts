// Redémarrage de l'app après un changement d'identité (bascule, déconnexion,
// oubli, session étrangère reçue d'un autre onglet). La base Dexie et tous les
// stores sont résolus au chargement du module : seul un rechargement complet
// remet ce tab sur la base du compte actif. Module séparé pour être mockable.

/** Recharge l'app. Par défaut revient à `#/` ; `keepRoute` garde la route
 *  courante (ex. page de pré-simulation, identique pour le nouveau compte). */
export function restartApp(opts?: { keepRoute?: boolean }): void {
  if (!opts?.keepRoute) history.replaceState(null, '', location.pathname + location.search + '#/');
  location.reload();
}
