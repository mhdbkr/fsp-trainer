/** `sim-demo-*` : anciennes simulations de démonstration (retirées en v6 de la base).
 *  Jamais des données du candidat : aucun score ne les lit, aucune synchro ne les pousse.
 *  Module SANS dépendance : `db.ts` et `readiness.ts` l'importent sans instancier Dexie. */
export const isDemoSimulation = (id: string): boolean => id.startsWith('sim-demo-');
