import { OpenRouter } from '@openrouter/sdk';
import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind } from './dictionary';
import { AUTH_MODE } from '@/lib/auth/session';
import { getActiveUserId } from '@/lib/auth/accounts';

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

export { PROVIDERS, OPENROUTER_FALLBACKS, type AiProvider } from './aiModels';
import { PROVIDERS, OPENROUTER_FALLBACKS, type AiProvider } from './aiModels';


const KEY_LS = 'doctopus-key';
const PROVIDER_LS = 'doctopus-provider';

// Mode fondateur : la clé appartient au compte actif (sinon B dépenserait la
// clé de A sur un appareil partagé). Mode public : clé unique, inchangée.
const keyName = (): string => (AUTH_MODE === 'founder' ? `${KEY_LS}:${getActiveUserId() ?? 'anon'}` : KEY_LS);

export function getKey(): string {
  const name = keyName();
  const v = localStorage.getItem(name);
  if (v !== null || name === KEY_LS) return v ?? '';
  // Première lecture après la mise à jour : l'ancienne clé (non namespacée)
  // migre vers le compte actif — copie, puis retrait de l'ancienne entrée.
  const legacy = localStorage.getItem(KEY_LS);
  if (legacy === null) return '';
  localStorage.setItem(name, legacy);
  localStorage.removeItem(KEY_LS);
  return legacy;
}
export function setKey(k: string) { localStorage.setItem(keyName(), k.trim()); }
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

/** Effort de raisonnement demandé au modèle. `none` pour une question
 *  directe : sur un modèle de raisonnement, les jetons de réflexion sont
 *  décomptés du budget de réponse — avec un petit maxTokens, le modèle
 *  réfléchit et n'a plus rien pour répondre (« (réponse vide) »). */
export type ReasoningEffort = 'none' | 'low' | 'medium';

/** Une question est « directe » si elle est courte, sans historique : une
 *  définition, un terme, une tournure. Là, le raisonnement coûte du temps et
 *  du budget sans rien apporter. Les échanges longs ou suivis gardent un
 *  raisonnement léger. */
export function pickReasoning(turns: ChatTurn[]): ReasoningEffort {
  const last = turns[turns.length - 1];
  const direct = turns.length === 1 && (last?.content.trim().length ?? 0) <= 160;
  return direct ? 'none' : 'low';
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
async function chatOpenRouter(system: string, turns: ChatTurn[], maxTokens: number, key: string, model: string, reasoning: ReasoningEffort, onToken?: (delta: string) => void): Promise<ChatTurn> {
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
        // `none` coupe le raisonnement (question directe) ; sinon effort
        // léger. Le champ typé du SDK est « effort », équivalent REST de
        // reasoning.enabled / reasoning.effort.
        reasoningEffort: reasoning,
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
  return { role: 'assistant', content, reasoningDetails: reasoningDetails.length ? reasoningDetails : undefined };
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
  return { role: 'assistant', content: data?.choices?.[0]?.message?.content ?? '' };
}

// Une réponse VIDE n'est jamais affichée telle quelle (FB2-M3) : les modèles
// gratuits en rendent parfois une sous charge. On réessaie une fois, puis on
// dit honnêtement ce qui s'est passé.
async function chat(system: string, turns: ChatTurn[], maxTokens: number, reasoning: ReasoningEffort, onToken?: (delta: string) => void): Promise<ChatTurn> {
  const key = getKey();
  const provider = getProvider();
  if (!key) throw new Error('Aucune clé configurée.');
  const once = () => (provider.id === 'openrouter'
    ? chatOpenRouter(system, turns, maxTokens, key, provider.model, reasoning, onToken)
    : chatGeneric(system, turns, maxTokens, key, provider));
  let reply = await once();
  if (!reply.content.trim()) reply = await once();
  if (!reply.content.trim()) throw new Error('Le modèle n’a rien répondu (capacité gratuite saturée ?). Réessaie dans un instant.');
  return reply;
}

/** Tour suivant d'une conversation Doctopus : envoie tout l'historique (le
 *  dernier tour doit être un tour utilisateur) et renvoie le tour assistant,
 *  à AJOUTER à l'historique tel quel — ses reasoningDetails servent au tour
 *  d'après. onToken (OpenRouter uniquement) reçoit chaque fragment du stream. */
export async function askConversation(turns: ChatTurn[], onToken?: (delta: string) => void): Promise<ChatTurn> {
  return chat(DOCTOPUS_SYSTEM, turns, 800, pickReasoning(turns), onToken);
}

/** Réponse à une question isolée (un seul tour). Conservé pour les appels
 *  sans historique. */
export async function askOnline(query: string, onToken?: (delta: string) => void): Promise<string> {
  return (await askConversation([{ role: 'user', content: query }], onToken)).content;
}

/** Glose brève pour le quick-search (bulle sur sélection). Jamais de
 *  raisonnement : c'est LA question directe par excellence, et un petit budget
 *  ne survit pas à une phase de réflexion. Un terme → une ligne ; une phrase
 *  (FB2-M2) → deux phrases, budget plus large. */
export async function askBrief(selection: string): Promise<string> {
  const kind = briefKind(selection);
  const { system, user } = buildBriefPrompt(selection, kind);
  return (await chat(system, [{ role: 'user', content: user }], kind === 'phrase' ? 220 : 120, 'none')).content.trim();
}
