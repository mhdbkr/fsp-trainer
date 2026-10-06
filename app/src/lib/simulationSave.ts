// Sauvegarde d'une simulation — extraite du runner SANS changement de
// comportement, pour être partagée avec le retour d'une simulation IA externe.
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { now } from '@/lib/clock';
import { applySimulationToJournal, resolveSimulationTask } from '@/lib/journal';
import { isEntered, simulationPassed } from '@/lib/scoring';
import { getActiveUserId } from '@/lib/auth/accounts';
import type { AssistanceMode, BogenNotes, Case, Layer, MusterArt, MusterCity, PartResult, SimTeil, SketchNotes, Simulation, SimulationMode } from '@/db/types';

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
  muster?: MusterArt | MusterCity;
  scope?: 'teil' | 'full';
  teil?: SimTeil;
  mode?: SimulationMode;
  externalTarget?: Simulation['externalTarget'];
  /** Tâche du plan lancée (R-C4). Gardée seulement si CETTE partie la satisfait. */
  taskId?: string;
  // --- [S4] la partie entière (simulation-run.md §3.2, §10.4) — posés par `projektion` ---
  /** Début de la partie (m5) ; absent ⇒ l'instant de l'écriture (séance IA externe). */
  date?: number;
  enchaine?: true;
  reihenfolge?: SimTeil[];
  dauerGesamtSec?: number;
  /** [S4-7] Partie lancée depuis l'Examen (simulation-run.md §11.6). */
  modeExamen?: true;
}

// Corrections prioritaires : dérivées des critères non cochés + langue faible.
function buildCorrections(parts: Partial<Record<Part, PartResult>>): string[] {
  const out: string[] = [];
  for (const [part, res] of Object.entries(parts)) {
    if (!res?.done) continue;
    const missed = res.checklist.filter((it) => !it.checked).slice(0, 2);
    for (const m of missed) out.push(`${part} — ${m.label}`);
    if (res.languageGrid) {
      const weak = Object.entries(res.languageGrid).filter(([, v]) => isEntered(v) && v <= 2);
      for (const [k] of weak) out.push(`${part} — Sprache: ${k} verbessern`);
    }
  }
  return out.slice(0, 6);
}

export async function saveSimulation(i: SaveInput): Promise<Simulation> {
  const parts = { ...i.parts };
  const id = i.id ?? `sim-${now()}`;
  const draft: Simulation = {
    id,
    caseId: i.c.id,
    date: i.date ?? now(),                                  // [S4] début de la partie (m5) ; sinon l'horloge de l'app (I10)
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
    ...(i.taskId ? { taskId: i.taskId } : {}),
    ...(i.enchaine ? { enchaine: true as const } : {}),
    ...(i.reihenfolge ? { reihenfolge: [...i.reihenfolge] } : {}),
    ...(typeof i.dauerGesamtSec === 'number' ? { dauerGesamtSec: i.dauerGesamtSec } : {}),
    ...(i.modeExamen ? { modeExamen: true as const } : {}),
  };
  draft.passed = simulationPassed(draft);
  // D-C4 / R-C4 : la tâche est résolue AVANT l'écriture — persistée dans la
  // ligne ET dans l'événement, donc rejouée à l'identique au rebuild.
  const sim = await resolveSimulationTask(draft);

  // Idempotence sur l'identifiant de partie (contrat §3.2, INV-22).
  // La lecture et l'écriture sont dans UNE transaction : deux clics vraiment
  // concurrents ne peuvent pas voir tous les deux « absent » et enfiler chacun
  // son événement. `put` seul rendrait la LIGNE idempotente, pas l'ÉVÉNEMENT —
  // `newId()` (`sync/queue.ts:42`) en fabrique un neuf à chaque push.
  const nouveau = await db.transaction('rw', db.simulations, async () => {
    const deja = await db.simulations.get(id);
    // La date est celle de la PREMIÈRE écriture (M9) : un second appel
    // idempotent ne déplace pas la simulation dans l'historique.
    if (deja) { sim.date = deja.date; if (deja.taskId) sim.taskId = deja.taskId; else delete sim.taskId; }
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
  // AWAIT : le journal se reconstruit depuis progress_events (B-C1) ; la
  // projection locale ne doit jamais devancer l'événement.
  await syncQueue.push({ type: 'simulation.completed', subject_id: sim.id, payload: { ...sim, selfDeclared } }).catch((e) => console.warn('[sync]', e));
  await applySimulationToJournal(sim);                      // R-C2 : historique, case_progress, tâche cochée — aussitôt
  // R-C5 : plus de confidence / status / lastSimulationId — `case_progress` fait
  // foi (training-journal.md §4.1). La DÉVIATION de `simulation-run.md` §3.2
  // est retirée dans ce merge, comme convenu (GATE G2). `layerProgress` garde
  // des lecteurs (layerAdvice, PendingExternalSimCard) : maximum, comme la
  // projection `rebuildProjections` — redescendre de couche ne le fait pas baisser.
  if (Object.values(parts).some((p) => p?.done)) {
    const prev = (await db.cases.get(i.c.id))?.layerProgress ?? 0;
    if (i.layer > prev) await db.cases.update(i.c.id, { layerProgress: i.layer });
    syncQueue.push({ type: 'case.layer_reached', subject_id: i.c.id, payload: { layer: i.layer } }).catch((e) => console.warn('[sync]', e));
  }
  return sim;
}
