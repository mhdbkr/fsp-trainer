// ============================================================================
// Cibles d'IA externes et lancement (contrat docs/contracts/ai-bridge.md §3).
// Cibles retenues par la direction : ChatGPT et Gemini.
// Chaque capacité est un relevé daté et sourcé — aucun fait deviné. Les faits
// et leurs sources : app/docs/reports/lead-s3-ia-sources.md. Le libellé du
// bouton est une fonction pure de la capacité (`launchPlan`) : il ne promet le
// pré-remplissage que si le paramètre ET sa limite sont vérifiés et frais.
// ============================================================================
import { getMeta, setMeta } from '@/db/db';
import type { AnkerTeil } from './prompt';

export type TargetId = 'chatgpt' | 'gemini';

export interface TargetCapability {
  targetId: TargetId;
  prefillParam: string | null;     // null = pas de pré-remplissage vérifié
  maxPrefillChars: number | null;  // limite EFFECTIVE mesurée (URL encodée)
  autoSubmits: boolean;
  nativeScheme: string | null;     // schéma propriétaire documenté, sinon null
  nativeAcceptsText: boolean;
  verifiedAt: string;              // date ISO de la vérification à la source
  evidence: string;
}

export interface AiTarget {
  id: TargetId;
  label: string;
  origin: string;      // base du pré-remplissage éventuel (`${origin}?${param}=`)
  openUrl: string;     // ce qu'on ouvre au niveau 2
  capability: TargetCapability;
}

const EVIDENCE = 'app/docs/reports/lead-s3-ia-sources.md';

export const AI_TARGETS: AiTarget[] = [
  {
    id: 'chatgpt', label: 'ChatGPT', origin: 'https://chatgpt.com/',
    // Lien universel déclaré par OpenAI : « start a new conversation in-app »
    // (iOS) ; page d'accueil ailleurs. `?q=` est reconnu mais sa limite n'est
    // pas mesurable (Cloudflare) ⇒ C3 ⇒ pas de pré-remplissage (sources §1, §2).
    openUrl: 'https://chatgpt.com/#native',
    capability: { targetId: 'chatgpt', prefillParam: null, maxPrefillChars: null, autoSubmits: false, nativeScheme: null, nativeAcceptsText: false, verifiedAt: '2026-09-30', evidence: `${EVIDENCE} §1–§2` },
  },
  {
    id: 'gemini', label: 'Gemini', origin: 'https://gemini.google.com/app',
    openUrl: 'https://gemini.google.com/app',
    capability: { targetId: 'gemini', prefillParam: null, maxPrefillChars: null, autoSubmits: false, nativeScheme: null, nativeAcceptsText: false, verifiedAt: '2026-09-30', evidence: `${EVIDENCE} §1–§2` },
  },
];

export const CAPABILITY_TTL_DAYS = 90;

/** Règles C1 et C3 du contrat, plus AUTO_SUBMIT : un pré-remplissage qui
 *  envoie seul (Tenable TRA-2025-22 : « inserted … and submitted ») partirait
 *  avec `Meine Begrüßung:` vide — l'IA parlerait avant le candidat. Liste
 *  vide = capacité valide. */
export function capabilityProblems(c: TargetCapability): string[] {
  const out: string[] = [];
  if (!c.evidence.trim() || Number.isNaN(Date.parse(c.verifiedAt))) out.push('C1');
  if (c.prefillParam !== null && c.maxPrefillChars === null) out.push('C3');
  if (c.prefillParam !== null && c.autoSubmits) out.push('AUTO_SUBMIT');
  return out;
}

export interface LaunchPlan { level: 1 | 2; url: string; label: string }

/** Le barreau atteint pour ce texte, aujourd'hui (§3.3). Pur. Le niveau 1
 *  exige une capacité sans problème — donc jamais d'envoi automatique. */
export function launchPlan(t: AiTarget, text: string, now: number = Date.now()): LaunchPlan {
  const c = t.capability;
  const fresh = now - Date.parse(c.verifiedAt) <= CAPABILITY_TTL_DAYS * 86_400_000;
  if (c.prefillParam && c.maxPrefillChars !== null && fresh && capabilityProblems(c).length === 0) {
    const url = `${t.origin}?${c.prefillParam}=${encodeURIComponent(text)}`;
    if (url.length - t.origin.length <= c.maxPrefillChars) return { level: 1, url, label: `Ouvrir ${t.label} avec le prompt` };
  }
  return { level: 2, url: t.openUrl, label: `Copier et ouvrir ${t.label}` };
}

/** Vrai seulement si l'écriture dans le presse-papiers a réussi (F3). */
export async function copyText(text: string, write: ((t: string) => Promise<void>) | undefined = navigator.clipboard?.writeText?.bind(navigator.clipboard)): Promise<boolean> {
  if (!write) return false;
  try { await write(text); return true; } catch { return false; }
}

// --- La cible mémorisée -------------------------------------------------------
const isTarget = (x: unknown): x is TargetId => AI_TARGETS.some((t) => t.id === x);
/** `null` = aucun choix encore (ou une cible retirée depuis). */
export async function loadTarget(): Promise<TargetId | null> {
  const v = await getMeta<unknown>('externalAi.target', null);
  return isTarget(v) ? v : null;
}
export const saveTarget = (id: TargetId): Promise<void> => setMeta('externalAi.target', id);

// --- La trace de séance (retour dans l'app, ≤ 12 h) -----------------------------
export interface PendingExternalSim {
  caseId: string;
  targetId: TargetId;
  teil?: AnkerTeil;        // absent = séance complète (traces anciennes)
  at: number;
  snoozedUntil?: number;
}
type LegacyPending = Omit<PendingExternalSim, 'teil'> & { teil?: AnkerTeil; scope?: string };

export const getPending = (): Promise<PendingExternalSim | null> => getMeta<PendingExternalSim | null>('externalAi.pending', null);
export const setPending = (p: PendingExternalSim | null): Promise<void> => setMeta('externalAi.pending', p);

/** Lecture tolérante (§5) : les traces posées avant le Teil d'ancrage portent
 *  `scope` — 'anamnese' ⇒ Teil Anamnese, 'exam' et 'exam+feedback' ⇒ séance complète. */
export async function readPending(): Promise<PendingExternalSim | null> {
  const raw = await getMeta<LegacyPending | null>('externalAi.pending', null);
  if (!raw) return null;
  const { scope, teil, ...rest } = raw;
  const t = teil ?? (scope === 'anamnese' ? 'anamnese' : undefined);
  return t ? { ...rest, teil: t } : rest;
}
