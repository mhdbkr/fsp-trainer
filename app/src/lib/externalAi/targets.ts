// ============================================================================
// Cibles d'IA externes et lancement. Vérifié 2026-09-17 : ChatGPT `?q=`
// pré-remplit ET envoie ; Claude `/new?q=` pré-remplit (Entrée manuel) ;
// Perplexity, Grok `?q=` ; Gemini n'a aucun paramètre → presse-papiers.
// Les prompts réels (12-44 k caractères) dépassent presque toujours
// PREFILL_MAX (6000, limite d'URL) : le chemin normal est « app ouverte +
// prompt copié → coller + Entrée » — les voiceHint ci-dessous décrivent ce
// chemin ; `submits` ne s'applique qu'au cas rare où le prompt tient dans
// l'URL. Le presse-papiers est TOUJOURS écrit (filet) ; l'ouverture doit
// rester dans le gestionnaire de clic (mobile bloque les popups différés).
import { getMeta, setMeta } from '@/db/db';
import { PREFILL_MAX, type Scope, type FeedbackLang } from './prompt';

export type TargetId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok';
export interface AiTarget { id: TargetId; label: string; base: string; prefill: ((prompt: string) => string) | null; submits: boolean; voiceHint: string }

const q = (base: string) => (p: string) => `${base}${encodeURIComponent(p)}`;
export const AI_TARGETS: AiTarget[] = [
  { id: 'chatgpt', label: 'ChatGPT', base: 'https://chatgpt.com/', prefill: q('https://chatgpt.com/?q='), submits: true, voiceHint: 'Colle le prompt (déjà copié) et appuie sur Entrée, puis active le mode vocal.' },
  { id: 'claude', label: 'Claude', base: 'https://claude.ai/new', prefill: q('https://claude.ai/new?q='), submits: false, voiceHint: 'Colle le prompt (déjà copié), appuie sur Entrée, puis active la voix.' },
  { id: 'gemini', label: 'Gemini', base: 'https://gemini.google.com/app', prefill: null, submits: false, voiceHint: 'Colle le prompt (déjà copié), envoie, puis active Gemini Live.' },
  { id: 'perplexity', label: 'Perplexity', base: 'https://www.perplexity.ai/', prefill: q('https://www.perplexity.ai/search?q='), submits: true, voiceHint: 'Colle le prompt (déjà copié) et appuie sur Entrée, puis active le mode vocal.' },
  { id: 'grok', label: 'Grok', base: 'https://grok.com/', prefill: q('https://grok.com/?q='), submits: false, voiceHint: 'Colle le prompt (déjà copié), envoie, puis active la voix.' },
];

export function buildLaunchUrl(t: AiTarget, prompt: string): { url: string; prefilled: boolean } {
  if (!t.prefill || prompt.length > PREFILL_MAX) return { url: t.base, prefilled: false };
  return { url: t.prefill(prompt), prefilled: true };
}

export async function launch(t: AiTarget, prompt: string, deps: { open?: (url: string) => void; copy?: (text: string) => Promise<void> } = {}): Promise<{ opened: boolean; copied: boolean; prefilled: boolean }> {
  const copy = deps.copy ?? ((text: string) => navigator.clipboard.writeText(text));
  const open = deps.open ?? ((url: string) => { window.open(url, '_blank', 'noopener'); });
  let copied = false;
  try { await copy(prompt); copied = true; } catch { copied = false; }
  const { url, prefilled } = buildLaunchUrl(t, prompt);
  open(url);
  return { opened: true, copied, prefilled };
}

export interface ExternalAiPrefs { target: TargetId; scope: Scope; feedbackLang: FeedbackLang }
const DEFAULT_PREFS: ExternalAiPrefs = { target: 'chatgpt', scope: 'exam+feedback', feedbackLang: 'fr' };
export async function loadPrefs(): Promise<ExternalAiPrefs> {
  const [target, scope, feedbackLang] = await Promise.all([
    getMeta<TargetId>('externalAi.target', DEFAULT_PREFS.target),
    getMeta<Scope>('externalAi.scope', DEFAULT_PREFS.scope),
    getMeta<FeedbackLang>('externalAi.feedbackLang', DEFAULT_PREFS.feedbackLang),
  ]);
  return { target, scope, feedbackLang };
}
export async function savePrefs(p: ExternalAiPrefs): Promise<void> {
  await Promise.all([
    setMeta('externalAi.target', p.target),
    setMeta('externalAi.scope', p.scope),
    setMeta('externalAi.feedbackLang', p.feedbackLang),
  ]);
}

export interface PendingExternalSim { caseId: string; targetId: TargetId; scope: Scope; at: number }
export const getPending = (): Promise<PendingExternalSim | null> => getMeta<PendingExternalSim | null>('externalAi.pending', null);
export const setPending = (p: PendingExternalSim | null): Promise<void> => setMeta('externalAi.pending', p);
