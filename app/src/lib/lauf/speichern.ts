import { db, getMeta, setMeta } from '@/db/db';
import { saveSimulation, type SaveInput } from '@/lib/simulationSave';
import { migriereChecklist } from '@/lib/checklists.legacy';
import type { Case, ChecklistItem, PartResult, SimTeil, Simulation } from '@/db/types';
import { checklisteFuer, enchainiert, istVollstaendig } from './automat';
import { ZUSTAENDE, zuPartResult, type Lauf, type LaufTeil } from './types';
import { now } from '@/lib/clock';

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
export function ladeAktivenLauf(): Promise<Lauf | null> {
  // Par la FILE (mineur 10) : une lecture ne passe jamais devant une écriture
  // encore en attente — sinon elle rendait l'état d'avant.
  return enfile(ladeJetzt);
}

async function ladeJetzt(): Promise<Lauf | null> {
  const l = await getMeta<Lauf | null>(LAUF_AKTIV_KEY, null);
  if (!l) return null;
  // Un Lauf invalide ou d'ancien format est ÉCARTÉ (mineur 11) : repris, il
  // devenait un run vide (`geplanteTeile: []`) ou levait au premier `.map`
  // (`checkliste: {}`, P4) — et bloquait le runner.
  if (!hatLaufForm(l)) {
    await db.meta.delete(LAUF_AKTIV_KEY);
    return null;
  }
  if (l.zustand === 'gespeichert') return null;
  return restauriere(l);
}

const istObjekt = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
const LAUF_TEILE: readonly string[] = ['anamnese', 'dokumentation', 'fallvorstellung', 'aufklaerung'];
const istItem = (i: unknown): i is ChecklistItem =>
  istObjekt(i) && typeof (i as ChecklistItem).id === 'string' && typeof (i as ChecklistItem).label === 'string';

/** Dernier recours quand la reprise a levé : relit `lauf.aktiv` BRUT et le
 *  confie à `gibAuf` — qui écrit une partie jouée et ne lève jamais. Sans lui,
 *  le `catch` de `useLauf` écartait le Lauf, et l'Anamnese jouée avec. */
export async function retteAktivenLauf(): Promise<void> {
  try {
    const roh = await getMeta<Partial<Lauf> | null>(LAUF_AKTIV_KEY, null);
    if (roh && typeof roh.id === 'string' && typeof roh.caseId === 'string') {
      return await gibAuf(restauriere(roh as Partial<Lauf> & { id: string; caseId: string }));
    }
  } catch (e) { console.warn('[lauf] sauvetage impossible', e); }
  await verwerfeAktivenLauf().catch(() => {});
}

/** La forme minimale d'un Lauf reprenable. Les champs facultatifs (brouillon,
 *  notes…) reprennent leur valeur neutre dans `restauriere` ; ceux-ci, non. */
function hatLaufForm(l: Partial<Lauf>): l is Lauf {
  return typeof l.id === 'string' && !!l.id && typeof l.caseId === 'string' && !!l.caseId
    && (ZUSTAENDE as readonly string[]).includes(l.zustand as string)
    && (l.modus === 'komplett' || l.modus === 'teil')
    && Array.isArray(l.geplanteTeile) && l.geplanteTeile.length > 0
    && Array.isArray(l.checkliste) && Array.isArray(l.teileGespielt)
    && istObjekt(l.teile) && istObjekt(l.sekundenProTeil);
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

/** [S4] Chaque persistance date le Lauf (`zuletztAktiv`, §3.1) : c'est la
 *  mesure de la pause que `nimmWiederAuf` lira à la reprise (INV-73). */
export function speichereAktivenLauf(lauf: Lauf): Promise<void> {
  // Daté à l'APPEL, pas quand la file l'exécute (fixeur I2) : une écriture restée en attente pendant une
  // pause la daterait de l'après-pause, et la pause mesurée vaudrait 0.
  const stamp = now();
  return enfile(() => setMeta(LAUF_AKTIV_KEY, { ...lauf, zuletztAktiv: stamp }));
}

export function verwerfeAktivenLauf(): Promise<void> {
  return enfile(async () => { await db.meta.delete(LAUF_AKTIV_KEY); });
}

/** Un Lauf actif de plus de 24 h est abandonné : écrit tel quel s'il a au moins
 *  un Teil joué, supprimé sinon (§3.1). Rend le Lauf encore reprenable. */
export async function bereinigeAltenLauf(jetzt = now()): Promise<Lauf | null> {
  const l = await ladeAktivenLauf();
  if (!l) return null;
  if (jetzt - l.startedAt < LAUF_MAX_ALTER_MS) return l;
  await gibAuf(l);
  return null;
}

/** Abandon d'un Lauf (§3.1) : ÉCRIT tel quel s'il a au moins un des trois
 *  Teile joué (l'Aufklärung seule ne compte pas) —
 *  une partie jouée n'est jamais jetée —, supprimé sinon. Seule règle, pour
 *  l'abandon par l'âge comme pour l'abandon par changement de mode ou de cas.
 *
 *  NE LÈVE JAMAIS. Un abandon qui lève bloquait le runner sur TOUS les cas :
 *  le cas d'un Lauf en cours pouvait avoir quitté `db.cases` (perte de droits
 *  → purge de `content/apply.ts`) et `speichern` levait « cas introuvable » à
 *  chaque ouverture. Le cas manquant est remplacé par un cas minimal ; si
 *  l'écriture échoue malgré tout, le Lauf est écarté plutôt que de bloquer. */
export async function gibAuf(l: Lauf): Promise<void> {
  try {
    // « Un Teil joué » = un des TROIS Teile (décision `main`, mineur 6) :
    // une Aufklärung seule n'en est pas un, rien n'est écrit.
    if (!l.teileGespielt.some((t) => t !== 'aufklaerung')) return await verwerfeAktivenLauf();
    const fall = (await db.cases.get(l.caseId)) ?? ({ id: l.caseId, name: l.caseName } as Case);
    await speichern(l, fall);
  } catch (e) {
    console.warn('[lauf] abandon non écrit, Lauf écarté', e);
    await verwerfeAktivenLauf();
  }
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
    ...(lauf.taskId ? { taskId: lauf.taskId } : {}),          // R-C4 : resolveSimulationTask le garde ou le retire (I-A)
    // [S4] §3.2 — quatre points de projection :
    //  · le jour d'une partie est celui de son DÉBUT (m5, INV-75), minuit ou reprise du lendemain compris ;
    //  · `reihenfolge` = les SimTeil joués, dans l'ordre joué — sa présence fait de la partie une « série 4 » (m-e) ;
    //  · `dauerGesamtSec` = tous les Teile COMMENCÉS : le Teil quitté par `springeZu` ou « Terminer ici », et
    //    l'Aufklärung (m6, INV-72) ;
    //  · `enchaine` présent seulement s'il est vrai (INV-73) ; `examen` s'en dérive au journal (`lib/examen.ts`).
    date: lauf.startedAt,
    reihenfolge: gespielteTeile,
    dauerGesamtSec: Object.values(lauf.sekundenProTeil).reduce<number>((s, v) => s + (typeof v === 'number' ? v : 0), 0),
    ...(enchainiert(lauf) ? { enchaine: true as const } : {}),
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
    caseName: '', modus: 'komplett', geplanteTeile: [],
    zustand: 'vorbereitung', aktuellerTeil: null, teilVorAufklaerung: null,
    startedAt: now(), teile: {},
    sekundenProTeil: {}, entwurf: {}, notes: {}, bogen: {}, arztbriefText: '',
    assistance: 'assiste', layer: 1, mode: 'texte',
    // Un champ présent mais `undefined` ne doit pas écraser sa valeur neutre.
    ...(Object.fromEntries(Object.entries(roh).filter(([, v]) => v !== undefined)) as typeof roh),
    // Les ITEMS aussi ont une forme : un élément corrompu (`null`, sans id) est
    // retiré, le Lauf est gardé. Rejeter tout le Lauf jetterait une partie
    // jouée pour une case de checklist illisible (re-revue 2, item 1).
    checkliste: migriereChecklist((Array.isArray(roh.checkliste) ? roh.checkliste : []).filter(istItem)),
    teileGespielt: (Array.isArray(roh.teileGespielt) ? roh.teileGespielt : [])
      .filter((t): t is LaufTeil => LAUF_TEILE.includes(t as string)),
  };
}
