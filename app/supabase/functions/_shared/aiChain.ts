// ============================================================================
// Chaîne de fournisseurs IA GRATUITS appelés en direct (spec F3 D7). Les deux
// parlent l'API compatible OpenAI — un seul adaptateur :
//   Groq   https://console.groq.com/docs/openai
//   Gemini https://ai.google.dev/gemini-api/docs/openai
// Module FEUILLE : aucun import (Deno + Vitest + esbuild).
// ============================================================================
export type ProviderId = 'groq' | 'gemini' | 'mock';
export interface ChainEntry { provider: ProviderId; model: string }
export const BASE_URL = { groq: 'https://api.groq.com/openai/v1', gemini: 'https://generativelanguage.googleapis.com/v1beta/openai' } as const;
export const KEY_ENV = { groq: 'GROQ_API_KEY', gemini: 'GEMINI_API_KEY' } as const;
export interface OAIMessage { role: 'system' | 'user' | 'assistant'; content: string }
export class NoProvider extends Error { constructor(public lastStatus: number | null) { super('no_provider'); } }

export function parseChain(spec: string | undefined, allowMock = false): ChainEntry[] {
  const out: ChainEntry[] = [];
  for (const raw of (spec ?? '').split(',')) {
    const [p, ...m] = raw.trim().split(':'); const model = m.join(':').trim();
    if (!model) continue;
    if (p === 'groq' || p === 'gemini' || (p === 'mock' && allowMock)) out.push({ provider: p, model });
  }
  return out;
}

const enc = new TextEncoder();
function mockStream(model: string): ReadableStream<Uint8Array> {
  const chunks = [`data: ${JSON.stringify({ choices: [{ delta: { content: `mock:${model}` } }] })}\n\n`, 'data: [DONE]\n\n'];
  return new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(enc.encode(ch)); c.close(); } });
}

export async function openStream(chain: ChainEntry[], messages: OAIMessage[], maxTokens: number, keys: Partial<Record<string, string>>, signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<{ entry: ChainEntry; body: ReadableStream<Uint8Array> }> {
  let lastStatus: number | null = null;
  for (const entry of chain) {
    if (entry.provider === 'mock') return { entry, body: mockStream(entry.model) };
    const key = keys[KEY_ENV[entry.provider]];
    if (!key) continue;
    try {
      const res = await fetchImpl(`${BASE_URL[entry.provider]}/chat/completions`, {
        method: 'POST', signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: entry.model, messages, temperature: 0.3, max_tokens: maxTokens, stream: true }),
      });
      if (res.ok && res.body) return { entry, body: res.body };
      lastStatus = res.status; await res.body?.cancel();
    } catch (e) {
      if (signal?.aborted) throw e;
      lastStatus = null;
    }
  }
  throw new NoProvider(lastStatus);
}

/** Découpe un tampon SSE OpenAI en fragments de texte ; renvoie le reste incomplet. */
export function sseDeltas(buffer: string): { deltas: string[]; rest: string; done: boolean } {
  const deltas: string[] = []; let done = false;
  const events = buffer.split('\n\n'); const rest = events.pop() ?? '';
  for (const ev of events) for (const line of ev.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') { done = true; continue; }
    try { const c = JSON.parse(data)?.choices?.[0]?.delta?.content; if (typeof c === 'string' && c) deltas.push(c); } catch { /* ligne non JSON ignorée */ }
  }
  return { deltas, rest, done };
}
export const normalizeSelection = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();
