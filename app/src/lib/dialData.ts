// ============================================================================
// La donnée du cadran (`CaseDial`) — training-journal.md §12.7. S4-1 PRODUIT cette
// donnée ; S4-4 la rendra. INV-59 : le cadran LIT, il ne calcule pas — une seule
// source (`case_progress`, la tâche figée, le `Lauf` en fin de partie), jamais
// `db.simulations`, et la même valeur sur une progression incrémentale et sur une
// progression reconstruite.
// ============================================================================

import type { CaseId, CaseProgress, ConditionExamen, SimTeil, TaskInstance, TeilStatus } from '@/db/types';
import type { Lauf } from '@/lib/lauf/types';
import { estNonMesure } from '@/lib/progression';
import { teileDeTache } from '@/lib/program/tacheDeCas';

const TEILE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

export interface CaseDialData {
  caseId: CaseId;
  /** Position FIXE par clé : le Teil se lit à sa place, la couleur dit l'état. */
  teile: Record<SimTeil, {
    status: TeilStatus;
    lastScore: number | null;
    lastAt: number | null;
    nonMesure: boolean;                 // « faite — non mesurée »
    solideDes: string | null;           // R1 : jour (yyyy-MM-dd) à partir duquel un ≥ 80 rendrait ce Teil solide
  }>;
  couverture: 0 | 1 | 2 | 3;
  maitrise: number | null;              // null → aucun chiffre, jamais « 0 »
  soude: boolean;                       // etat === 'pret'
  pretAt: number | null;
  pretManque: ConditionExamen[];        // R1 : ce qui manque au meilleur run récent pour souder
  prochaineConsolidation: string | null;
  tache?: { teile: SimTeil[]; avancement: SimTeil[]; aRejouerDUnTrait: boolean };
  vientDEtreJoue?: SimTeil[];
}

/** PURE (INV-59). Tolère une ligne `case_progress` d'avant la série 4 : les champs absents valent « rien ». */
export function dialData(
  cp: CaseProgress,
  ctx: { tache?: TaskInstance; avancement?: SimTeil[]; lauf?: Pick<Lauf, 'teileGespielt'> } = {},
): CaseDialData {
  const teile = {} as CaseDialData['teile'];
  for (const t of TEILE) {
    const p = cp.teile[t];
    teile[t] = { status: p.status, lastScore: p.lastScore, lastAt: p.lastAt, nonMesure: estNonMesure(p), solideDes: p.status === 'solide' ? null : p.solideDes ?? null };
  }
  const avancement = ctx.avancement ?? [];
  return {
    caseId: cp.caseId,
    teile,
    couverture: TEILE.filter((t) => cp.teile[t].attempts >= 1).length as 0 | 1 | 2 | 3,
    maitrise: cp.maitrise ?? null,
    soude: cp.etat === 'pret',
    pretAt: cp.pretAt ?? null,
    pretManque: cp.pretManque ? [...cp.pretManque] : [],
    prochaineConsolidation: cp.prochaineConsolidation ?? null,
    // « À rejouer d'un trait » : les trois Teile joués SÉPARÉMENT n'ont pas fait une tâche `dUnTrait` (I5).
    ...(ctx.tache ? { tache: { teile: teileDeTache(ctx.tache), avancement: [...avancement], aRejouerDUnTrait: ctx.tache.dUnTrait === true && ctx.tache.doneAt === undefined && TEILE.every((t) => avancement.includes(t)) } } : {}),
    ...(ctx.lauf ? { vientDEtreJoue: TEILE.filter((t) => (ctx.lauf!.teileGespielt as readonly string[]).includes(t)) } : {}),
  };
}
