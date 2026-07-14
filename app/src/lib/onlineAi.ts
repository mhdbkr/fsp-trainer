import { buildLlmPrompt, buildBriefPrompt } from './dictionary';

// ============================================================================
// Doctopus — cerveau IA EN LIGNE, ultra-rapide, léger, gratuit (clé requise).
// API compatible OpenAI. Fournisseur par défaut : Groq (inférence très rapide,
// niveau gratuit généreux, modèle Llama 3.1 8B instant). La clé est fournie par
// l'utilisateur et stockée localement (localStorage) — jamais envoyée ailleurs
// qu'au fournisseur choisi.
//
// Pour changer de fournisseur, il suffit d'un endpoint OpenAI-compatible et
// d'un modèle (ex. OpenRouter, Together, etc.).
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
  { id: 'openrouter', label: 'OpenRouter (free models)', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.1-8b-instruct:free', keyUrl: 'https://openrouter.ai/keys' },
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

// Appel générique à l'IA en ligne (OpenAI-compatible).
async function chat(system: string, user: string, maxTokens: number): Promise<string> {
  const key = getKey();
  const provider = getProvider();
  if (!key) throw new Error('Aucune clé configurée.');

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

/** Réponse complète de Doctopus (allemand puis français). */
export async function askOnline(query: string): Promise<string> {
  const { system, user } = buildLlmPrompt(query);
  return chat(system, user, 800);
}

/** Glose ultra-brève pour le quick-search (bulle sur sélection). */
export async function askBrief(term: string): Promise<string> {
  const { system, user } = buildBriefPrompt(term);
  return (await chat(system, user, 60)).trim();
}
