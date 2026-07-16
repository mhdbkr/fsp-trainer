import type { Case, PatientState, ConversationTurn, SimulationMode, TurnResponseType, AudioMeta } from '@/db/types';
import { PROBE_BY_ID } from '@/data/guides/anamneseProbes';

// ============================================================================
// PHASE 2b — SCAFFOLDING « Patient IA ». Point d'entrée UNIFIÉ de la simulation
// (analogue local, offline-first, d'un `/api/simulation/step`).
//
// AUCUNE logique IA/vocale ici. Le matcher et la machine d'état sont des règles
// SIMPLES hardcodées, explicitement conçues comme des HOOKS remplaçables par un
// LLM orchestrateur + TTS (ElevenLabs…) en Phase 2b — sans refonte.
//
// Rien n'appelle encore ce module : le MVP texte (partenaire + fiche de rôle)
// reste inchangé. C'est la fondation du futur mode « patient IA solo ».
// ============================================================================

/** État initial du patient : depuis patientAIProfile s'il existe, sinon dérivé
 *  du cas (douleur = intensité×10, anxiété ↑ si Notfall). */
export function initialPatientState(c: Case): PatientState {
  if (c.patientAIProfile?.initialState) return { ...c.patientAIProfile.initialState };
  const pain = c.patientSheet.schmerz?.intensitaet ? c.patientSheet.schmerz.intensitaet * 10 : 20;
  const notfall = !!c.medicalView.notfall;
  return {
    pain,
    anxiety: notfall ? 70 : 35,
    clarity: 70,
    emotion: notfall ? 'ängstlich' : pain >= 60 ? 'schmerzgeplagt' : 'ruhig',
  };
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const STOP = new Set('der die das und oder ich sie er es ein eine haben sind ist wie was wo wann warum mit von auf im in den dem sich mir mich ihre ihren'.split(' '));
const words = (s: string) => norm(s).split(/[^a-zäöüß0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Matcher texte-libre → sonde. HOOK : à remplacer par embeddings/LLM en 2b.
 *  Score = recouvrement de mots-clés entre l'input et la `frage` de chaque sonde
 *  applicable (= clés de `antworten`). Renvoie null si rien de probant. */
export function matchProbe(c: Case, input: string): string | null {
  const q = new Set(words(input));
  if (!q.size) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const probeId of Object.keys(c.patientSheet.antworten ?? {})) {
    const probe = PROBE_BY_ID[probeId];
    if (!probe) continue;
    const hay = new Set(words(probe.frage));
    let score = 0;
    q.forEach((w) => { if (hay.has(w)) score += 1; });
    if (score > bestScore) { bestScore = score; best = probeId; }
  }
  return bestScore >= 1 ? best : null;
}

const KAPITEL_TYPE: Record<string, TurnResponseType> = {
  personalia: 'history', aktuell: 'symptom', vegetativ: 'symptom', fach: 'symptom',
  vorerkrankungen: 'history', medikamente: 'history', allergien: 'history',
  noxen: 'history', 'familie-sozial': 'history', frauenanamnese: 'history',
};

/** Machine d'état du patient. HOOK : à remplacer par un LLM orchestrateur.
 *  Règles MVP : question comprise → rapport ↑, anxiété ↓ ; incomprise → clarté ↓
 *  (agacement) ; sujet aigu → anxiété ↑. L'émotion découle des curseurs. */
export function advancePatientState(prev: PatientState, probeId: string | null, c: Case): PatientState {
  const s = { ...prev };
  if (probeId) { s.clarity = Math.min(100, s.clarity + 3); s.anxiety = Math.max(0, s.anxiety - 2); }
  else { s.clarity = Math.max(0, s.clarity - 5); }
  const probe = probeId ? PROBE_BY_ID[probeId] : null;
  if (probe?.kapitel === 'aktuell' && c.medicalView.notfall) s.anxiety = Math.min(100, s.anxiety + 3);
  s.emotion =
    s.pain >= 60 ? 'schmerzgeplagt'
    : s.anxiety >= 60 ? 'ängstlich'
    : s.anxiety >= 40 ? 'besorgt'
    : s.clarity < 40 ? 'gereizt'
    : 'ruhig';
  return s;
}

/** Choisit la réplique : variante émotionnelle (calm/distress) si disponible et
 *  si l'état le justifie, sinon la réponse de base `antworten`. */
function pickReply(c: Case, probeId: string, state: PatientState): { text: string; audio?: AudioMeta } {
  const base = c.patientSheet.antworten?.[probeId] ?? '';
  const emo = c.patientSheet.antwortenEmotional?.[probeId];
  if (emo) {
    const distress = state.anxiety >= 60 || state.pain >= 70;
    return { text: (distress ? emo.distress : emo.calm) ?? base, audio: emo.audio };
  }
  return { text: base };
}

/**
 * Point d'entrée UNIFIÉ. Gère `candidateInput` → `{ patientResponse,
 * patientState, turn }`. `mode` prépare la Phase 2b : en MVP seul 'texte' est
 * actif ; 'tts'/'vocal' renverront les mêmes données + `audio`, la synthèse
 * vocale étant branchée au point marqué ci-dessous — jamais une refonte.
 */
export function simulationStep(args: {
  c: Case; candidateInput: string; state: PatientState; mode?: SimulationMode;
}): { patientResponse: string; patientState: PatientState; turn: ConversationTurn } {
  const { c, candidateInput, state } = args;
  const probeId = matchProbe(c, candidateInput);
  const stateAfter = advancePatientState(state, probeId, c);

  let patientResponse: string;
  let responseType: TurnResponseType;
  let audio: AudioMeta | undefined;
  if (probeId) {
    const r = pickReply(c, probeId, stateAfter);
    patientResponse = r.text;
    audio = r.audio;
    responseType = KAPITEL_TYPE[PROBE_BY_ID[probeId]?.kapitel ?? ''] ?? 'symptom';
  } else {
    patientResponse = 'Entschuldigung, das habe ich nicht ganz verstanden. Können Sie die Frage anders stellen?';
    responseType = 'clarification';
  }

  const turn: ConversationTurn = {
    ts: Date.now(), candidateInput, probeId: probeId ?? undefined,
    patientResponse, responseType, stateBefore: state, stateAfter, audio,
  };

  // ── HOOK Phase 2b ──────────────────────────────────────────────────────
  // if (mode === 'tts' || mode === 'vocal') { synthétiser `patientResponse`
  //   via le provider de `c.patientAIProfile.voice`, en modulant par `audio`
  //   (tone/speed) et `stateAfter.emotion`. }
  return { patientResponse, patientState: stateAfter, turn };
}
