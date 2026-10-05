// La sortie « bilan » des erreurs transversales (training-journal.md §13.3) : pour chaque item que le
// candidat manque d'habitude (signal d'AVANT cette partie), ce qu'il en a fait cette fois — « cochée
// cette fois » ou « encore manquée (n/5) ». Rien n'est stocké : tout se relit dans le journal, et le
// signal se calcule par `erreursTransversales` (S4-2), jamais redéfini ici.
import type { CaseProgress, ChecklistItemId, SimTeil, Simulation, TrainingEvent } from '@/db/types';
import { erreursTransversales, libelleItem } from '@/lib/program/erreurs';

export interface LigneBilan {
  teil: SimTeil;
  item: ChecklistItemId;
  libelle: string;
  /** Cochée dans cette partie ; sinon encore manquée, `manques` fois sur les `sur` dernières (celle-ci comprise). */
  cochee: boolean;
  manques: number;
  sur: number;
}

const avant = (a: TrainingEvent, b: TrainingEvent) => a.at < b.at || (a.at === b.at && a.id < b.id);

/** PURE. `simId` : la partie dont on fait le bilan. Le signal est celui du journal ANTÉRIEUR à elle (ordre
 *  `(at, id)`, déterministe même si l'écran est rouvert plus tard) ; seuls les Teile qu'elle a joués avec une
 *  checklist (`manques[t]` défini) répondent. */
export function bilanErreurs(events: readonly TrainingEvent[], simId: string): LigneBilan[] {
  const ici = events.find((e) => e.id === `te-${simId}`);
  if (!ici?.manques) return [];
  const anterieurs = events.filter((e) => avant(e, ici));
  const apres = erreursTransversales([...anterieurs, ici]);
  return erreursTransversales(anterieurs)
    .filter((s) => ici.manques![s.teil] !== undefined)
    .map((s) => {
      const cochee = !ici.manques![s.teil]!.includes(s.item);
      const a = apres.find((x) => x.teil === s.teil && x.item === s.item);
      return {
        teil: s.teil, item: s.item, libelle: libelleItem(s.item, s.teil) ?? s.item, cochee,
        manques: a?.manques ?? s.manques, sur: a?.sur ?? s.sur,
      };
    });
}

/** Le cas vient-il d'être soudé PAR CETTE partie ? `pretAt` est l'`at` du passage qualifiant, et l'`at` d'une partie est
 *  sa `date` (m5) : égalité stricte (fixeur M2) — `≥` animait aussi la soudure en rouvrant une partie plus ancienne. */
export const vientDeSouder = (cp: Pick<CaseProgress, 'etat' | 'pretAt'>, sim: Pick<Simulation, 'date'>): boolean =>
  cp.etat === 'pret' && cp.pretAt === sim.date;
