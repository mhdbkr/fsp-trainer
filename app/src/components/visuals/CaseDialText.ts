// ============================================================================
// Les mots du cadran (`CaseDial`, S4-4). Tout se dérive de `CaseDialData`
// (training-journal.md §12.7) ; rien n'est calculé sur la mesure (INV-59) : on
// compare une date à aujourd'hui et on choisit une phrase.
//
// Critères de la revue pédagogique, tous testés (CaseDialText.test.ts) :
//  · jamais « ≥ » ni « % » ;
//  · la maîtrise n'est JAMAIS dite sans la couverture (« 74 en moyenne sur 2 Teile ») ;
//  · `solideDes` futur → « Solide si tu refais 80 ou plus à partir du jeudi 9 oct. » ;
//    passé → « Solide à ta prochaine partie à 80 ou plus. » ;
//  · `pretManque` dit ce qui manque en mots du candidat ;
//  · aucune affirmation sur l'examen (garde EXAM_CLAIM).
// ============================================================================
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ConditionExamen, SimTeil } from '@/db/types';
import { nowDate, todayKey } from '@/lib/clock';
import type { CaseDialData } from '@/lib/dialData';
import { TEILE } from '@/lib/simScope';

type TeilDial = CaseDialData['teile'][SimTeil];

/** L'état affiché d'un Teil : les quatre états de la mesure, plus deux nuances d'affichage. */
export type EtatTeil = TeilDial['status'] | 'a-confirmer' | 'non-mesure';

export const MOT_ETAT: Record<EtatTeil, string> = {
  vierge: 'pas encore travaillé',
  fragile: 'fragile',
  acquis: 'acquis',
  'a-confirmer': 'acquis, à confirmer',
  solide: 'solide',
  'non-mesure': 'faite — non mesurée',
};

const ARTICLE: Record<SimTeil, string> = { anamnese: 'l\'Anamnese', dokumentation: 'la Dokumentation', fallvorstellung: 'la Fallvorstellung' };
const NOM: Record<SimTeil, string> = { anamnese: 'Anamnese', dokumentation: 'Dokumentation', fallvorstellung: 'Fallvorstellung' };

/** « À confirmer » (§13.2) : acquis, déjà réussi à 80 ou plus, et l'écart est passé. Dérivé, pas stocké. */
export function etatTeil(p: TeilDial, jour: string = todayKey()): EtatTeil {
  if (p.nonMesure) return 'non-mesure';
  if (p.status === 'acquis' && p.solideDes != null && p.solideDes <= jour) return 'a-confirmer';
  return p.status;
}

const joliJour = (yyyyMMdd: string): string => format(parseISO(yyyyMMdd), 'EEEE d MMM', { locale: fr });
const fin = (s: string): string => (s.endsWith('.') ? s : `${s}.`);   // « oct. » porte déjà son point

/** « il y a 3 j » — le jour calendaire, pas les 24 h. */
export function quand(at: number): string {
  const n = differenceInCalendarDays(nowDate(), new Date(at));
  return n <= 0 ? 'aujourd\'hui' : n === 1 ? 'hier' : `il y a ${n} j`;
}

/** R1 : la date à partir de laquelle un 80 ou plus rendrait le Teil solide. */
export function phraseSolideDes(solideDes: string | null | undefined): string | null {
  if (!solideDes) return null;
  return solideDes > todayKey()
    ? fin(`Solide si tu refais 80 ou plus à partir du ${joliJour(solideDes)}`)
    : 'Solide à ta prochaine partie à 80 ou plus.';
}

/** La maîtrise ne va jamais sans sa couverture. */
export function resume(d: CaseDialData): string {
  if (d.maitrise === null) return Object.values(d.teile).some((p) => p.nonMesure) ? 'Fait — non mesuré' : 'Pas encore travaillé';   // « un cas » : masculin
  return d.couverture === 1 ? `${d.maitrise} sur 1 Teil` : `${d.maitrise} en moyenne sur ${d.couverture} Teile`;
}

const MANQUE: Record<ConditionExamen, string> = {
  enchaine: 'd\'un trait',
  autonome: 'en Autonome',
  ordre: 'dans l\'ordre Anamnese, Dokumentation, Fallvorstellung',
  grille: 'grille de langue remplie',
};
const ORDRE_MANQUE: ConditionExamen[] = ['enchaine', 'autonome', 'ordre', 'grille'];

/** R1 : « prêt », ou ce qui manque pour l'être. `null` s'il n'y a rien à dire. */
export function phrasePret(d: CaseDialData): string | null {
  if (d.soude) return 'Prêt : trois Teile solides, rejoués d\'un trait en Autonome.';
  const manque = ORDRE_MANQUE.filter((c) => d.pretManque.includes(c)).map((c) => MANQUE[c]);
  return manque.length === 0 ? null : `Pour être prêt : rejoue-le ${manque.join(', ')}.`;
}

/** Le retour planifié du cas (§13.1) : une date, dite telle quelle. */
export function phraseReprise(d: CaseDialData): string | null {
  return d.prochaineConsolidation ? fin(`Prochaine reprise : ${joliJour(d.prochaineConsolidation)}`) : null;
}

export interface LigneDetail {
  teil: SimTeil;
  nom: string;
  etat: EtatTeil;
  mot: string;
  score: number | null;
  quand: string | null;
  phrase: string | null;       // R1 : « Solide si tu refais… »
}

/** Une ligne par Teil, toujours dans l'ordre de l'examen. */
export function lignesDetail(d: CaseDialData): LigneDetail[] {
  const jour = todayKey();
  return TEILE.map(({ key }) => {
    const p = d.teile[key];
    const etat = etatTeil(p, jour);
    return {
      teil: key, nom: NOM[key], etat, mot: MOT_ETAT[etat], score: p.lastScore,
      quand: p.lastAt !== null ? quand(p.lastAt) : null,
      phrase: phraseSolideDes(p.solideDes),
    };
  });
}

/** La suite proposée. `teil` est non nul quand on peut démarrer sur un Teil précis. */
export function actionSuivante(d: CaseDialData): { label: string; teil: SimTeil | null } {
  if (d.tache?.aRejouerDUnTrait) return { label: 'Rejouer le cas d\'un trait', teil: null };
  if (d.couverture === 0) return { label: 'Commencer le cas', teil: null };
  const jour = todayKey();
  const etats = TEILE.map(({ key }) => ({ key, etat: etatTeil(d.teile[key], jour) }));
  const vierge = etats.find((e) => e.etat === 'vierge' || e.etat === 'non-mesure');
  if (vierge) return { label: `Reprendre par ${ARTICLE[vierge.key]}`, teil: vierge.key };
  const fragile = etats.find((e) => e.etat === 'fragile');
  if (fragile) return { label: `Retravailler ${ARTICLE[fragile.key]}`, teil: fragile.key };
  const aConfirmer = etats.find((e) => e.etat === 'a-confirmer');
  if (aConfirmer) return { label: `Confirmer ${ARTICLE[aConfirmer.key]}`, teil: aConfirmer.key };
  const acquis = etats.find((e) => e.etat === 'acquis');
  if (acquis) return { label: `Consolider ${ARTICLE[acquis.key]}`, teil: acquis.key };
  return d.pretManque.length > 0 ? { label: 'Rejouer le cas d\'un trait', teil: null } : { label: 'Rejouer le cas entier', teil: null };
}

/** Où mène l'action suivante : le cas, sur le Teil proposé (`?teil=` existe déjà côté pré-simulation). */
export function lienAction(d: CaseDialData): string {
  const { teil } = actionSuivante(d);
  return `/simulation/${d.caseId}/pre${teil ? `?teil=${teil}` : ''}`;
}

/** L'étiquette complète pour les lecteurs d'écran : la couleur n'est jamais le seul signal. */
export function etiquette(d: CaseDialData, nom?: string): string {
  const teile = lignesDetail(d).map((l) => `${l.nom} : ${l.mot}${l.score !== null ? `, ${l.score}` : ''}${l.quand ? `, ${l.quand}` : ''}`);
  const pret = phrasePret(d);
  return [nom ? `${nom} : ${resume(d)}` : resume(d), ...teile, ...(pret ? [pret] : [])].map(fin).join(' ');
}
