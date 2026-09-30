// Sauvegarde d'une simulation — extraite du runner SANS changement de
// comportement, pour être partagée avec le retour d'une simulation IA externe.
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { caseMastery } from '@/lib/simScope';
import { simulationPassed } from '@/lib/scoring';
import { getActiveUserId } from '@/lib/auth/accounts';
import type { AssistanceMode, BogenNotes, Case, Layer, MusterCity, PartResult, SimTeil, SketchNotes, Simulation, SimulationMode } from '@/db/types';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

export interface SaveInput {
  /** Identifiant de la partie — uuid v4 posé une seule fois à l'entrée dans
   *  `laufend` (contrat §3.2). Fourni ⇒ l'écriture est IDEMPOTENTE : n appels
   *  produisent une ligne et un événement. Le `sim-${Date.now()}` d'autrefois
   *  en fabriquait un nouveau par clic : deux clics rapprochés donnaient deux
   *  enregistrements, ou l'écrasement du premier par un second partiel. */
  id?: string;
  /** Profil crédité (§6, INV-26). Absent ⇒ compte actif (mode fondateur).
   *  Jamais écrit jusqu'ici : `layerAdvice.ts:40` filtre dessus et toute
   *  simulation restait non attribuée (audit 8.2). */
  profileId?: string;
  c: Case;
  parts: Partial<Record<Part, PartResult>>;
  notes?: SketchNotes;
  bogen?: BogenNotes;
  arztbriefText?: string;
  assistance: AssistanceMode;
  layer: Layer;
  muster?: MusterCity;
  scope?: 'teil' | 'full';
  teil?: SimTeil;
  mode?: SimulationMode;
  externalTarget?: Simulation['externalTarget'];
}

// Corrections prioritaires : dérivées des critères non cochés + langue faible.
function buildCorrections(parts: Partial<Record<Part, PartResult>>): string[] {
  const out: string[] = [];
  for (const [part, res] of Object.entries(parts)) {
    if (!res?.done) continue;
    const missed = res.checklist.filter((it) => !it.checked).slice(0, 2);
    for (const m of missed) out.push(`${part} — ${m.label}`);
    if (res.languageGrid) {
      const weak = Object.entries(res.languageGrid).filter(([, v]) => v <= 2);
      for (const [k] of weak) out.push(`${part} — Sprache: ${k} verbessern`);
    }
  }
  return out.slice(0, 6);
}

export async function saveSimulation(i: SaveInput): Promise<Simulation> {
  const parts = { ...i.parts };
  const id = i.id ?? `sim-${Date.now()}`;
  const sim: Simulation = {
    id,
    caseId: i.c.id,
    date: Date.now(),
    profileId: i.profileId ?? getActiveUserId() ?? undefined,
    parts,
    notes: i.notes ?? {},
    bogen: i.bogen,
    arztbriefText: i.arztbriefText,
    prioritizedCorrections: buildCorrections(parts),
    // UNE source de vérité pour le verdict. Le recalcul à la main dupliquait
    // `simulationPassed()` (`scoring.ts:77-81`) — deux sources, donc deux
    // chances de diverger (audit 8.3).
    passed: false,
    assistance: i.assistance, layer: i.layer, muster: i.muster,
    scope: i.scope ?? 'full', teil: i.teil,
    ...(i.mode ? { mode: i.mode } : {}),
    ...(i.externalTarget ? { externalTarget: i.externalTarget } : {}),
  };
  sim.passed = simulationPassed(sim);

  // Idempotence sur l'identifiant de partie (contrat §3.2, INV-22).
  // La lecture et l'écriture sont dans UNE transaction : deux clics vraiment
  // concurrents ne peuvent pas voir tous les deux « absent » et enfiler chacun
  // son événement. `put` seul rendrait la LIGNE idempotente, pas l'ÉVÉNEMENT —
  // `newId()` (`sync/queue.ts:42`) en fabrique un neuf à chaque push.
  const nouveau = await db.transaction('rw', db.simulations, async () => {
    const deja = await db.simulations.get(id);
    await db.simulations.put(sim);
    return !deja;
  });
  if (!nouveau) return sim;

  // La sync ne doit jamais bloquer la fin de simulation : la sauvegarde
  // locale est faite, un échec d'enfilement se journalise sans casser l'écran.
  // Une séance jouée dans une IA externe est AUTO-DÉCLARÉE : le candidat
  // rapporte ce qu'il a fait, l'app ne l'a pas observé. Elle compte dans
  // l'historique et dans la série, jamais dans l'indice de préparation
  // (décision de direction). Le fait est marqué ICI, une fois, à l'émission :
  // laisser chaque consommateur redécouvrir que `mode === 'external-ai'`
  // signifie « non observé », c'est la même règle réécrite à n endroits.
  // Sur le payload seulement — la LIGNE `Simulation` porte déjà `mode`, et
  // `db/types.ts` appartient à un autre chantier.
  const selfDeclared = sim.mode === 'external-ai';
  syncQueue.push({ type: 'simulation.completed', subject_id: sim.id, payload: { ...sim, selfDeclared } }).catch((e) => console.warn('[sync]', e));
  // met à jour confiance + statut du cas — confiance pondérée (assistance × couche)
  //
  // DÉVIATION ASSUMÉE du contrat `simulation-run.md` §3.2 (« speichern()
  // n'écrit plus dans db.cases »). La projection `case_progress` qui doit
  // prendre le relais (`training-journal.md` §4.1) appartient au chantier
  // Programme et n'existe pas encore ici (`lib/journal.ts` absent de la
  // branche). La retirer maintenant ferait régresser la progression visible
  // des cas — exactement la règle que la direction a tranchée (FB2-P : toute
  // session fait avancer le cas). À retirer dans le MÊME merge que
  // `case_progress`, pas avant. Escaladé à `main` (GATE G2).
  const done = Object.values(parts).filter((p): p is PartResult => !!p?.done);
  // Toute session fait avancer le cas (FB2-P, retour direction) : la
  // confiance est la maîtrise au prorata des trois parties, dernière
  // session de chaque partie comprise — celle-ci incluse.
  if (done.length) {
    const prior = await db.simulations.where('caseId').equals(i.c.id).toArray();
    const mastery = caseMastery(prior, i.c.id, sim).score ?? 0;
    const conf = Math.round(mastery * (i.assistance === 'autonome' ? 1 : 0.9));
    const status = conf >= 80 ? 'Maîtrisé' : conf >= 40 ? 'En cours' : 'À faire';
    await db.cases.update(i.c.id, { confidence: conf, status, lastSimulationId: sim.id, layerProgress: i.layer });
    syncQueue.push({ type: 'case.layer_reached', subject_id: i.c.id, payload: { layer: i.layer } }).catch((e) => console.warn('[sync]', e));
  }
  return sim;
}
