import { db, getMeta, setMeta } from '@/db/db';
import { saveSimulation, type SaveInput } from '@/lib/simulationSave';
import { migriereChecklist } from '@/lib/checklists.legacy';
import type { Case, PartResult, SimTeil, Simulation } from '@/db/types';
import { checklisteFuer, istVollstaendig } from './automat';
import { zuPartResult, type Lauf, type LaufTeil } from './types';

// ============================================================================
// Persistance du `Lauf`. Contrat §3.
//
// EN VOL : le Lauf complet vit dans `db.meta['lauf.aktiv']`, réécrit à chaque
// transition. `sessionStorage` (`fsp.simSession`) ne survit ni à la fermeture
// d'onglet ni à un changement d'appareil : sur un examen à 60 minutes, une
// interruption perdue est inacceptable.
//
// À LA FIN : écriture idempotente sur `lauf.id` — n appels, une ligne, un
// événement (INV-22).
// ============================================================================

export const LAUF_AKTIV_KEY = 'lauf.aktiv';

/** Au-delà, un Lauf laissé ouvert est abandonné (§3.1). */
export const LAUF_MAX_ALTER_MS = 24 * 60 * 60 * 1000;

/** LA porte unique de la reprise : `bereinigeAltenLauf` et donc `useLauf` y
 *  passent tous les deux. C'est ici que `restauriere` doit s'appliquer — tant
 *  qu'elle n'était appelée que par son propre test, un Lauf écrit par une
 *  version antérieure revenait brut, ids de checklist legacy compris, et le
 *  runner lisait `.length` sur des champs absents. */
export async function ladeAktivenLauf(): Promise<Lauf | null> {
  const l = await getMeta<Lauf | null>(LAUF_AKTIV_KEY, null);
  if (!l || typeof l.id !== 'string' || !l.caseId) return null;
  if (l.zustand === 'gespeichert') return null;
  return restauriere(l);
}

// Les écritures de `lauf.aktiv` sont SÉRIALISÉES par cette chaîne.
// Sans elle : le runner persiste à chaque frappe sans attendre (`void`), et la
// suppression de fin de partie pouvait être DOUBLÉE par une écriture partie
// avant elle. Mesuré en navigateur : après une simulation enregistrée,
// `lauf.aktiv` restait en `zustand: 'laufend'` — rouvrir le cas reprenait une
// partie déjà écrite. Une queue d'un seul maillon suffit, il n'y a qu'un
// écrivain (le runner de cet onglet).
let queue: Promise<unknown> = Promise.resolve();
const enfile = <T>(op: () => Promise<T>): Promise<T> => {
  const next = queue.then(op, op);
  queue = next.catch(() => {});
  return next;
};

export function speichereAktivenLauf(lauf: Lauf): Promise<void> {
  return enfile(() => setMeta(LAUF_AKTIV_KEY, lauf));
}

export function verwerfeAktivenLauf(): Promise<void> {
  return enfile(async () => { await db.meta.delete(LAUF_AKTIV_KEY); });
}

/** Un Lauf actif de plus de 24 h est abandonné : écrit tel quel s'il a au moins
 *  un Teil joué, supprimé sinon (§3.1). Rend le Lauf encore reprenable. */
export async function bereinigeAltenLauf(jetzt = Date.now()): Promise<Lauf | null> {
  const l = await ladeAktivenLauf();
  if (!l) return null;
  if (jetzt - l.startedAt < LAUF_MAX_ALTER_MS) return l;
  await gibAuf(l);
  return null;
}

/** Abandon d'un Lauf (§3.1) : ÉCRIT tel quel s'il a au moins un Teil joué —
 *  une partie jouée n'est jamais jetée —, supprimé sinon. Seule règle, pour
 *  l'abandon par l'âge comme pour l'abandon par changement de mode ou de cas. */
export async function gibAuf(l: Lauf): Promise<void> {
  if (l.teileGespielt.length) await speichern(l);
  else await verwerfeAktivenLauf();
}

// ------------------------------------------------------------- Projection

/** `Lauf` → l'entrée d'historique `Simulation`. La checklist de chaque Teil est
 *  découpée dans la liste unique du Lauf : c'est ce qui fait remonter ce qui a
 *  été coché PENDANT la partie, au lieu d'une liste reconstruite à neuf. */
export function projektion(lauf: Lauf, c: Case): SaveInput {
  const parts: Partial<Record<LaufTeil, PartResult>> = {};
  for (const t of lauf.teileGespielt) {
    const tl = lauf.teile[t];
    if (tl?.done) parts[t] = zuPartResult(tl, checklisteFuer(lauf, t));
  }
  // La portée est le FAIT, jamais l'intention (§5, INV-25) : un run déclaré
  // complet mais abandonné après une partie n'est pas une simulation complète.
  const vollstaendig = istVollstaendig(lauf);
  const gespielteTeile = lauf.teileGespielt.filter((t): t is SimTeil => t !== 'aufklaerung');
  return {
    id: lauf.id,
    profileId: lauf.profileId,
    c,
    parts,
    notes: lauf.notes,
    bogen: lauf.bogen,
    arztbriefText: lauf.arztbriefText || undefined,
    assistance: lauf.assistance,
    layer: lauf.layer,
    muster: lauf.muster,
    scope: vollstaendig ? 'full' : 'teil',
    // `teil` seulement si EXACTEMENT un SimTeil a été joué : un run complet
    // abandonné après deux parties s'affichait « Anamnese seule ».
    teil: gespielteTeile.length === 1 ? gespielteTeile[0] : undefined,
    mode: lauf.mode,
  };
}

/** Écriture finale. Idempotente sur `lauf.id` (INV-22) : appelée n fois, elle
 *  produit UNE ligne dans `db.simulations` et UN événement de sync. */
export async function speichern(lauf: Lauf, c?: Case): Promise<Simulation> {
  const fall = c ?? (await db.cases.get(lauf.caseId));
  if (!fall) throw new Error(`speichern: cas introuvable (${lauf.caseId})`);
  const sim = await saveSimulation(projektion(lauf, fall));
  await verwerfeAktivenLauf();
  return sim;
}

// ---------------------------------------------------------------- Reprise

/** Restaure un `Lauf` sérialisé. Les champs absents (Lauf écrit par une version
 *  antérieure) reprennent leur valeur neutre, et les ids de checklist legacy
 *  sont traduits à la lecture (§4.4) — `db` n'est jamais réécrite pour ça. */
export function restauriere(roh: Partial<Lauf> & { id: string; caseId: string }): Lauf {
  return {
    caseName: '', profileId: '', modus: 'komplett', geplanteTeile: [],
    zustand: 'vorbereitung', aktuellerTeil: null, teilVorAufklaerung: null,
    startedAt: Date.now(), teileGespielt: [], teile: {},
    sekundenProTeil: {}, entwurf: {}, notes: {}, bogen: {}, arztbriefText: '',
    assistance: 'assiste', layer: 1, mode: 'texte',
    ...roh,
    checkliste: migriereChecklist(roh.checkliste ?? []),
  };
}
