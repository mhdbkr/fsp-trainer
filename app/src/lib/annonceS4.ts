// ============================================================================
// L'annonce unique des changements rétroactifs de la série 4
// (simulation-run.md §10.7, décision (f) de la direction).
//
// Trois changements, annoncés UNE FOIS, par appareil, sans événement synchronisé :
//   • `teile`  — des Teile solides sur une seule réussite repassent à « acquis » :
//                « solide » se confirme en deux fois (leur dette est celle d'un Teil
//                à confirmer, pas d'un Teil jamais travaillé — revue P1) ;
//   • `mode`   — un `teil-first` explicite est devenu « cas complet » ;
//   • `muster` — un Muster de ville par défaut est devenu « libre ».
// Chaque annonce est tracée par `db.meta['annonce.s4.<sujet>']`. Un sujet n'est
// annoncé que si son changement est LIVRÉ (gardes de `parametres.ts`) et s'applique
// à CE candidat : un candidat neuf n'a rien à qui annoncer.
// ============================================================================

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProgramConfig, TrainingEvent } from '@/db/types';
import { dayKey } from '@/lib/clock';
import { computeCaseProgress } from '@/lib/progression';
import { ANNONCE_MODE_ACTIVE, ANNONCE_MUSTER_ACTIVE, ANNONCE_TEILE_ACTIVE, DATE_NOUVELLE_REGLE } from '@/lib/program/parametres';

export type SujetAnnonce = 'teile' | 'mode' | 'muster';

export const annonceKey = (s: SujetAnnonce): string => `annonce.s4.${s}`;

export interface Annonce { sujet: SujetAnnonce; titre: string; texte: string }

const VILLES = ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'];

/**
 * Combien de Teile étaient « solides » sur la règle série 3 le jour du changement et ne le
 * sont plus : ils redeviennent « acquis » et reviennent dans le plan. On compare le journal
 * ARRÊTÉ à `DATE_NOUVELLE_REGLE` sous les deux règles — jamais le journal entier, sinon
 * chaque partie jouée depuis passerait pour un effet du changement — et l'on retire ceux
 * qui sont redevenus solides depuis.
 */
export function teilesRedevenusAcquis(events: TrainingEvent[]): { teile: number; cas: number } {
  const avant = events.filter((e) => dayKey(e.at) < DATE_NOUVELLE_REGLE);
  const ancienne = computeCaseProgress(avant, { regle: 'serie3' });
  const nouvelle = new Map(computeCaseProgress(avant).map((cp) => [cp.caseId, cp]));
  const aujourdhui = new Map(computeCaseProgress(events).map((cp) => [cp.caseId, cp]));
  let teile = 0, cas = 0;
  for (const cp of ancienne) {
    const n = (Object.keys(cp.teile) as (keyof typeof cp.teile)[]).filter((t) =>
      cp.teile[t].status === 'solide' && nouvelle.get(cp.caseId)?.teile[t].status !== 'solide' && aujourdhui.get(cp.caseId)?.teile[t].status !== 'solide').length;
    teile += n;
    if (n) cas++;
  }
  return { teile, cas };
}

export interface EntreeAnnonce {
  events: TrainingEvent[];
  config?: Pick<ProgramConfig, 'modus' | 'strategy'> | null;
  /** Le Muster par défaut mémorisé sur l'appareil (`localStorage['fsp-muster']`). */
  musterLocal?: string | null;
  /** Sujets déjà annoncés sur cet appareil. */
  vues: ReadonlySet<SujetAnnonce>;
  /** Les gardes de livraison ; par défaut celles de `parametres.ts`. */
  actifs?: Record<SujetAnnonce, boolean>;
}

const ACTIFS: Record<SujetAnnonce, boolean> = { teile: ANNONCE_TEILE_ACTIVE, mode: ANNONCE_MODE_ACTIVE, muster: ANNONCE_MUSTER_ACTIVE };

/** Les annonces à montrer, dans l'ordre. Pure. */
export function annoncesEnAttente({ events, config, musterLocal, vues, actifs = ACTIFS }: EntreeAnnonce): Annonce[] {
  const out: Annonce[] = [];
  if (actifs.teile && !vues.has('teile')) {
    const { teile } = teilesRedevenusAcquis(events);
    if (teile > 0) {
      const date = format(parseISO(DATE_NOUVELLE_REGLE), 'd MMMM', { locale: fr });
      out.push({
        sujet: 'teile',
        titre: '« Solide » se confirme maintenant en deux fois',
        texte: `Un Teil devient solide quand tu refais 80 ou plus au moins trois jours après une première réussite : la première peut tenir à un cas encore frais, la seconde montre qu'il tient. ${teile === 1 ? 'Un de tes Teile repasse donc à « acquis ». Pour lui' : `${teile} de tes Teile repassent donc à « acquis ». Pour la plupart`}, une nouvelle partie à 80 ou plus suffit. Ta frise garde son passé : la marche du ${date} vient de cette règle, pas d'un recul.`,
      });
    }
  }
  const modus = config?.modus ?? (config?.strategy === 'teil-first' ? 'teil-first' : undefined);
  if (actifs.mode && !vues.has('mode') && modus === 'teil-first') {
    out.push({ sujet: 'mode', titre: 'Le programme planifie des cas entiers', texte: 'Ton réglage « par Teil » est devenu « cas complet » : une tâche est un cas, et elle dit ce qui t\'y reste.' });
  }
  if (actifs.muster && !vues.has('muster') && musterLocal && VILLES.includes(musterLocal)) {
    out.push({ sujet: 'muster', titre: 'Le Muster est guidé ou libre', texte: 'Ton Muster de ville est devenu « libre ». Les notes déjà prises restent lisibles.' });
  }
  return out;
}
