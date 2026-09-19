// Sauvegarde d'une simulation — extraite du runner SANS changement de
// comportement, pour être partagée avec le retour d'une simulation IA externe.
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { caseMastery } from '@/lib/simScope';
import { partScore } from '@/lib/scoring';
import type { AssistanceMode, BogenNotes, Case, Layer, MusterCity, PartResult, SimTeil, SketchNotes, Simulation, SimulationMode } from '@/db/types';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

export interface SaveInput {
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
  const sim: Simulation = {
    id: `sim-${Date.now()}`,
    caseId: i.c.id,
    date: Date.now(),
    parts,
    notes: i.notes ?? {},
    bogen: i.bogen,
    arztbriefText: i.arztbriefText,
    prioritizedCorrections: buildCorrections(parts),
    passed: Object.values(parts).filter((p) => p?.done).every((p) => partScore(p!) >= 60),
    assistance: i.assistance, layer: i.layer, muster: i.muster,
    scope: i.scope ?? 'full', teil: i.teil,
    ...(i.mode ? { mode: i.mode } : {}),
    ...(i.externalTarget ? { externalTarget: i.externalTarget } : {}),
  };
  await db.simulations.put(sim);
  // La sync ne doit jamais bloquer la fin de simulation : la sauvegarde
  // locale est faite, un échec d'enfilement se journalise sans casser l'écran.
  syncQueue.push({ type: 'simulation.completed', subject_id: i.c.id, payload: sim }).catch((e) => console.warn('[sync]', e));
  // met à jour confiance + statut du cas — confiance pondérée (assistance × couche)
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
