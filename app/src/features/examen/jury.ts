// La demande du jury quand il interrompt l'Anamnese pour une Aufklärung (simulation-run.md §11.1) — une phrase allemande
// RÉSOLUE : l'acte à l'accusatif avec son article, et « die Patientin » / « den Patienten » selon la fiche.
//   « Klären Sie die Patientin bitte über die Koloskopie auf. »
// Le nom d'un acte n'est jamais celui de sa fiche (« Allgemeine Aufklärung zur Operation ») : chaque acte a sa forme ici.
import type { Case } from '@/db/types';

/** L'acte, à l'accusatif, avec son article — une entrée par `AufklaerungItem` publié. */
export const ACTE_AKKUSATIV: Record<string, string> = {
  'auf-angiographie': 'die Angiographie der Gefäße',
  'auf-appendektomie': 'die geplante Blinddarmoperation',
  'auf-aszitespunktion': 'die Aszitespunktion',
  'auf-bluttransfusion': 'die Bluttransfusion',
  'auf-bronchoskopie': 'die Bronchoskopie',
  'auf-ct': 'die Computertomographie',
  'auf-echokardiographie': 'die Echokardiographie',
  'auf-ercp': 'die ERCP',
  'auf-feinnadelpunktion': 'die Feinnadelpunktion',
  'auf-gastroskopie': 'die Gastroskopie',
  'auf-gelenkpunktion': 'die Gelenkpunktion',
  'auf-knochenmarkpunktion': 'die Knochenmarkpunktion',
  'auf-koloskopie': 'die Koloskopie',
  'auf-koronarangiographie': 'die Koronarangiographie',
  'auf-laparoskopie': 'die Laparoskopie',
  'auf-lumbalpunktion': 'die Lumbalpunktion',
  'auf-mrt': 'die MRT-Untersuchung',
  'auf-nierenbiopsie': 'die Nierenbiopsie',
  'auf-operation': 'die geplante Operation',
  'auf-pleurapunktion': 'die Pleurapunktion',
  'auf-roentgen-thorax': 'die Röntgenaufnahme des Brustkorbs',
  'auf-sonographie': 'die Ultraschalluntersuchung',
  'auf-zystoskopie': 'die Zystoskopie',
};

/** Un acte sans forme connue (contenu ajouté après coup) reste une phrase juste, sans nom d'acte inventé. */
const REPLI = 'die geplante Untersuchung';

export function demandeDuJury(c: Pick<Case, 'patientSheet'>, acteId: string): string {
  const patientin = c.patientSheet?.personalia?.geschlecht === 'w';
  return `Klären Sie ${patientin ? 'die Patientin' : 'den Patienten'} bitte über ${ACTE_AKKUSATIV[acteId] ?? REPLI} auf.`;
}
