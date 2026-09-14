import { OpenRouter } from '@openrouter/sdk';
import { buildLlmPrompt, buildBriefPrompt } from './dictionary';

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
  { id: 'openrouter', label: 'OpenRouter — Nemotron 3 Ultra (gratuit, raisonnement)', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', keyUrl: 'https://openrouter.ai/keys' },
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

/** Jetons de raisonnement de la dernière réponse OpenRouter (undefined si le modèle n'en émet pas). */
let lastReasoningTokens: number | undefined;
export function getLastReasoningTokens(): number | undefined { return lastReasoningTokens; }

// Forme minimale d'un chunk de stream de chat OpenRouter — le SDK ne réexporte
// pas son type interne `ChatStreamChunk` depuis la racine du paquet, donc on
// type ici exactement ce qu'on consomme plutôt que d'importer un chemin privé.
interface ChatStreamChunk {
  choices?: Array<{ delta?: { content?: string } }>;
  usage?: { completionTokensDetails?: { reasoningTokens?: number } };
}

// Appel via le SDK officiel OpenRouter, en streaming — permet d'afficher la
// réponse au fil de l'eau (onToken) et expose les jetons de raisonnement.
async function chatOpenRouter(system: string, user: string, maxTokens: number, key: string, model: string, onToken?: (delta: string) => void): Promise<string> {
  const openrouter = new OpenRouter({ apiKey: key });
  let response = '';
  lastReasoningTokens = undefined;
  try {
    const result = await openrouter.chat.send({
      chatRequest: {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
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
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) { response += delta; onToken?.(delta); }
      if (chunk.usage) lastReasoningTokens = chunk.usage.completionTokensDetails?.reasoningTokens;
    }
  } catch (e) {
    throw new Error(`Erreur OpenRouter : ${(e as Error).message}`);
  }
  return response || '(réponse vide)';
}

// Appel générique aux autres fournisseurs OpenAI-compatibles (Groq…).
async function chatGeneric(system: string, user: string, maxTokens: number, key: string, provider: AiProvider): Promise<string> {
  const res = await fetch(provider.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Erreur ${res.status} : ${t.slice(0, 140) || res.statusText}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '(réponse vide)';
}

async function chat(system: string, user: string, maxTokens: number, onToken?: (delta: string) => void): Promise<string> {
  const key = getKey();
  const provider = getProvider();
  if (!key) throw new Error('Aucune clé configurée.');
  return provider.id === 'openrouter'
    ? chatOpenRouter(system, user, maxTokens, key, provider.model, onToken)
    : chatGeneric(system, user, maxTokens, key, provider);
}

/** Réponse complète de Doctopus (allemand puis français). onToken (optionnel, OpenRouter uniquement) reçoit chaque fragment au fil du stream. */
export async function askOnline(query: string, onToken?: (delta: string) => void): Promise<string> {
  const { system, user } = buildLlmPrompt(query);
  return chat(system, user, 800, onToken);
}

/** Glose ultra-brève pour le quick-search (bulle sur sélection). */
export async function askBrief(term: string): Promise<string> {
  const { system, user } = buildBriefPrompt(term);
  return (await chat(system, user, 60)).trim();
}
