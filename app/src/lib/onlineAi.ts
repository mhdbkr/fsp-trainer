import { OpenRouter } from '@openrouter/sdk';
import { DOCTOPUS_SYSTEM, buildBriefPrompt } from './dictionary';

// ============================================================================
// Doctopus — cerveau IA EN LIGNE, ultra-rapide, léger, gratuit (clé requise).
// API compatible OpenAI. Fournisseur par défaut : Groq (inférence très rapide,
// niveau gratuit généreux, modèle Llama 3.1 8B instant). La clé est fournie par
// l'utilisateur et stockée localement (localStorage) — jamais envoyée ailleurs
// qu'au fournisseur choisi.
//
// Pour changer de fournisseur, il suffit d'un endpoint OpenAI-compatible et
// d'un modèle (ex. Together, etc.) — sauf OpenRouter, qui passe par son SDK
// officiel (@openrouter/sdk) en streaming plutôt que par le fetch générique,
// pour l'affichage token-par-token et l'accès aux jetons de raisonnement.
//
// CONVERSATION MULTI-TOUR : Doctopus garde l'historique des tours. Avec un
// modèle de raisonnement (Nemotron 3 Ultra), le tour assistant conserve ses
// `reasoningDetails` et les RENVOIE TELS QUELS au tour suivant — c'est ainsi
// que le modèle reprend son raisonnement là où il l'avait laissé au lieu de
// repartir de zéro (contrat OpenRouter : « pass back unmodified »).
// ============================================================================

export interface AiProvider {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  keyUrl: string;   // page pour obtenir une clé gratuite
}

export const PROVIDERS: AiProvider[] = [
  { id: 'groq', label: 'Groq (rapide, gratuit)', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant', keyUrl: 'https://console.groq.com/keys' },
  { id: 'groq-70b', label: 'Groq 70B (meilleure qualité)', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys' },
  { id: 'openrouter', label: 'OpenRouter — LFM 2.5 (gratuit, ultra-léger)', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'liquid/lfm-2.5-2.6b:free', keyUrl: 'https://openrouter.ai/keys' },
];

const KEY_LS = 'doctopus-key';
const PROVIDER_LS = 'doctopus-provider';

export function getKey(): string { return localStorage.getItem(KEY_LS) ?? ''; }
export function setKey(k: string) { localStorage.setItem(KEY_LS, k.trim()); }
export function getProvider(): AiProvider {
  const id = localStorage.getItem(PROVIDER_LS);
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}
export function setProvider(id: string) { localStorage.setItem(PROVIDER_LS, id); }
export function hasKey(): boolean { return getKey().length > 8; }

/** Un tour de conversation. `reasoningDetails` n'existe que sur les tours
 *  assistant produits par un modèle de raisonnement via OpenRouter ; il est
 *  opaque pour nous et doit être renvoyé sans modification. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  reasoningDetails?: unknown[];
}

/** Jetons de raisonnement de la dernière réponse OpenRouter (undefined si le modèle n'en émet pas). */
let lastReasoningTokens: number | undefined;
export function getLastReasoningTokens(): number | undefined { return lastReasoningTokens; }

// Forme minimale d'un chunk de stream de chat OpenRouter — le SDK ne réexporte
// pas son type interne `ChatStreamChunk` depuis la racine du paquet, donc on
// type ici exactement ce qu'on consomme plutôt que d'importer un chemin privé.
interface ChatStreamChunk {
  choices?: Array<{ delta?: { content?: string | null; reasoningDetails?: unknown[] } }>;
  usage?: { completionTokensDetails?: { reasoningTokens?: number } };
}

// Modèles gratuits de repli : les modèles ":free" d'OpenRouter tournent sur
// une capacité partagée et échouent transitoirement (« Provider returned
// error », 502/503). Plutôt que de changer de modèle par défaut à chaque
// panne, on donne à OpenRouter une LISTE : il essaie le premier, et bascule
// lui-même sur le suivant si le fournisseur amont échoue — c'est son routage
// natif (`models`), pas une boucle de retry codée ici.
const OPENROUTER_FALLBACKS = [
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'meta-llama/llama-3.1-8b-instruct:free',
];

// Extrait le message d'erreur le plus informatif possible d'une erreur du SDK
// OpenRouter : ses classes exposent `.body` (JSON brut du fournisseur, avec
// souvent la vraie cause derrière un libellé générique comme « Provider
// returned error ») en plus de `.message`. On tente `.body`, sinon `.message`.
function describeOpenRouterError(e: unknown): string {
  const err = e as { message?: string; body?: string; statusCode?: number };
  let detail = err?.message || String(e);
  if (err?.body) {
    try {
      const parsed = JSON.parse(err.body);
      const inner = parsed?.error?.message || parsed?.error?.metadata?.raw || parsed?.error;
      if (inner) detail = typeof inner === 'string' ? inner : JSON.stringify(inner);
    } catch { /* body non-JSON : on garde .message */ }
  }
  return err?.statusCode ? `${detail} (HTTP ${err.statusCode})` : detail;
}

// Appel via le SDK officiel OpenRouter, en streaming — permet d'afficher la
// réponse au fil de l'eau (onToken), expose les jetons de raisonnement et
// collecte les reasoningDetails pour la continuation multi-tour.
async function chatOpenRouter(system: string, turns: ChatTurn[], maxTokens: number, key: string, model: string, onToken?: (delta: string) => void): Promise<ChatTurn> {
  const openrouter = new OpenRouter({ apiKey: key });
  const messages = [
    { role: 'system' as const, content: system },
    ...turns.map((t) => (t.role === 'assistant'
      ? { role: 'assistant' as const, content: t.content, reasoningDetails: t.reasoningDetails }
      : { role: 'user' as const, content: t.content })),
  ];
  let content = '';
  const reasoningDetails: unknown[] = [];
  lastReasoningTokens = undefined;
  try {
    const result = await openrouter.chat.send({
      chatRequest: {
        model,
        // Liste de repli : le modèle choisi d'abord, puis les autres gratuits
        // vérifiés, sans doublon. OpenRouter bascule seul en cas de panne amont.
        models: [model, ...OPENROUTER_FALLBACKS.filter((m) => m !== model)],
        // Type dérivé de la signature du SDK plutôt qu'importé d'un chemin
        // interne : `reasoningDetails` est opaque de notre côté.
        messages: messages as Parameters<typeof openrouter.chat.send>[0]['chatRequest']['messages'],
        temperature: 0.3,
        maxTokens,
        stream: true,
        // Active le raisonnement — Nemotron 3 Ultra en a besoin explicitement
        // pour émettre des jetons de raisonnement (le champ typé du SDK est
        // « effort », équivalent à reasoning.enabled côté API REST).
        reasoningEffort: 'medium',
      },
    });
    const stream = result as AsyncIterable<ChatStreamChunk>;
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) { content += delta.content; onToken?.(delta.content); }
      // En streaming, les reasoning_details arrivent en fragments : on les
      // concatène dans l'ordre et on renverra la liste complète, intacte.
      if (delta?.reasoningDetails?.length) reasoningDetails.push(...delta.reasoningDetails);
      if (chunk.usage) lastReasoningTokens = chunk.usage.completionTokensDetails?.reasoningTokens;
    }
  } catch (e) {
    throw new Error(`Erreur OpenRouter : ${describeOpenRouterError(e)}`);
  }
  return { role: 'assistant', content: content || '(réponse vide)', reasoningDetails: reasoningDetails.length ? reasoningDetails : undefined };
}

// Appel générique aux autres fournisseurs OpenAI-compatibles (Groq…). Pas de
// streaming ni de raisonnement : les reasoningDetails éventuels ne sont pas
// transmis (ces fournisseurs ne les connaissent pas).
async function chatGeneric(system: string, turns: ChatTurn[], maxTokens: number, key: string, provider: AiProvider): Promise<ChatTurn> {
  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'system', content: system }, ...turns.map((t) => ({ role: t.role, content: t.content }))],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Erreur ${res.status} : ${t.slice(0, 140) || res.statusText}`);
  }
  const data = await res.json();
  return { role: 'assistant', content: data?.choices?.[0]?.message?.content ?? '(réponse vide)' };
}

async function chat(system: string, turns: ChatTurn[], maxTokens: number, onToken?: (delta: string) => void): Promise<ChatTurn> {
  const key = getKey();
  const provider = getProvider();
  if (!key) throw new Error('Aucune clé configurée.');
  return provider.id === 'openrouter'
    ? chatOpenRouter(system, turns, maxTokens, key, provider.model, onToken)
    : chatGeneric(system, turns, maxTokens, key, provider);
}

/** Tour suivant d'une conversation Doctopus : envoie tout l'historique (le
 *  dernier tour doit être un tour utilisateur) et renvoie le tour assistant,
 *  à AJOUTER à l'historique tel quel — ses reasoningDetails servent au tour
 *  d'après. onToken (OpenRouter uniquement) reçoit chaque fragment du stream. */
export async function askConversation(turns: ChatTurn[], onToken?: (delta: string) => void): Promise<ChatTurn> {
  return chat(DOCTOPUS_SYSTEM, turns, 800, onToken);
}

/** Réponse à une question isolée (un seul tour). Conservé pour les appels
 *  sans historique. */
export async function askOnline(query: string, onToken?: (delta: string) => void): Promise<string> {
  return (await askConversation([{ role: 'user', content: query }], onToken)).content;
}

/** Glose ultra-brève pour le quick-search (bulle sur sélection). */
export async function askBrief(term: string): Promise<string> {
  const { system, user } = buildBriefPrompt(term);
  return (await chat(system, [{ role: 'user', content: user }], 60)).content.trim();
}
