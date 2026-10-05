import { phraseProbes, type Phrase } from '@/data/guides/phrases';

/** Chapitre d'anamnèse → rubrique(s) candidates du Muster-Bogen, par ordre de
 *  préférence : les modèles n'ont pas tous les mêmes rubriques, on prend la
 *  première que le modèle courant possède. */
const CHAPTER_TO_BOGEN: Record<string, string[]> = {
  personalia: ['personalia'],
  eroeffnung: ['personalia'],
  aktuell: ['hauptbeschwerde'],
  vegetativ: ['vegetativ', 'hauptbeschwerde'],
  vorerkrankungen: ['vorerkrankungen', 'medikamente'],
  medikamente: ['medikamente', 'vorerkrankungen'],
  allergien: ['allergien'],
  noxen: ['noxen', 'genussmittel'],
  'familie-sozial': ['sozial', 'familie'],
  frauenanamnese: ['frauen'],
};

/** Rubriques candidates des notes pour l'item courant (`ii` = −1 : intro du chapitre).
 *  La Frauenanamnese est fondue dans la Fach gynéco (`fach-gyn`) : sa tête de bloc
 *  — tout ce qui précède la première sonde `fach-gyn-*` — va dans « frauen » ; les
 *  signes gynécologiques gardent le comportement d'une Fach (rien de forcé). */
export function bogenKeysFor(chapterId: string, items: Phrase[], ii: number): string[] {
  if (chapterId === 'fach-gyn') {
    const firstGyn = items.findIndex((q) => phraseProbes(q).some((p) => p.startsWith('fach-gyn-')));
    return Math.max(ii, 0) < (firstGyn < 0 ? items.length : firstGyn) ? ['frauen'] : [];
  }
  return CHAPTER_TO_BOGEN[chapterId] ?? [];
}
