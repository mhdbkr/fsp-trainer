// Appel de la fonction `ai` (F3 §3.5) : JWT du compte, corps sans prompt système,
// réponse SSE lue au fil de l'eau.
import { getAccessToken, useSession, AUTH_MODE } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { sseDeltas } from '../../supabase/functions/_shared/aiChain.ts';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai`;

export class ServerAiError extends Error {
  constructor(public status: number, public code: string) { super(`ai ${status} ${code}`); }
}

export function serverAiAvailable(): boolean {
  return AUTH_MODE === 'founder' && !!useSession.getState().user && getEntitlements().plan === 'premium';
}

type Body =
  | { kind: 'brief'; selection: string }
  | { kind: 'chat'; turns: { role: 'user' | 'assistant'; text: string }[] };

export async function serverStream(body: Body, onToken?: (d: string) => void, signal?: AbortSignal): Promise<string> {
  const t = await getAccessToken();
  if (!t) throw new ServerAiError(401, 'unauthorized');
  let res: Response;
  try {
    res = await fetch(FN, {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${t}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ServerAiError(0, 'network');
  }
  if (!res.ok || !res.body) {
    const code = await res.json().then((x) => x?.error ?? 'error', () => 'error');
    throw new ServerAiError(res.status, code);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '';
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try { chunk = await reader.read(); }
    catch { throw new ServerAiError(0, 'network'); }
    if (chunk.done) break;
    buf += dec.decode(chunk.value, { stream: true });
    const r = sseDeltas(buf);
    buf = r.rest;
    for (const d of r.deltas) { text += d; onToken?.(d); }
  }
  // Flux fermé : vider le décodeur (octets multi-octets en attente), puis
  // traiter le dernier évènement même sans double saut de ligne final (le
  // serveur ne termine pas toujours proprement sur `\n\n`).
  buf += dec.decode();
  if (buf.trim()) {
    const r = sseDeltas(`${buf}\n\n`);
    for (const d of r.deltas) { text += d; onToken?.(d); }
  }
  if (!text.trim()) throw new ServerAiError(502, 'empty');
  return text;
}
