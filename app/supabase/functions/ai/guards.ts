// Garde-fous purs de la fonction `ai` — module FEUILLE (aucun Deno.*) : testé sous Node.
import { parseChain, KEY_ENV, sseDeltas, type ChainEntry } from '../_shared/aiChain.ts';

export const MAX_BODY = 64_000;       // 20 tours × 2 000 car. + JSON
export const MAX_CHAT_CHARS = 12_000; // total cumulé des tours d'une conversation

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'kong', 'host.docker.internal']);
/** Le fournisseur factice n'est admis que sur une pile LOCALE, même si AI_ALLOW_MOCK=1 fuit en prod. */
export function mockAllowed(flag: string | undefined, supabaseUrl: string | undefined): boolean {
  if (flag !== '1') return false;
  try { return LOCAL_HOSTS.has(new URL(supabaseUrl ?? '').hostname); } catch { return false; }
}

/** Entrées réellement appelables (mock admis, ou clé présente) — vide ⇒ 503 sans consommer de quota. */
export const usableChain = (spec: string | undefined, keys: Partial<Record<string, string>>, allowMock: boolean): ChainEntry[] =>
  parseChain(spec, allowMock).filter((e) => e.provider === 'mock' || !!keys[KEY_ENV[e.provider]]);

/** Relaie les octets SSE tels quels. `onComplete(texte)` n'est appelé que si l'amont a émis `[DONE]`. */
export function relay(upstream: ReadableStream<Uint8Array>, onComplete: ((text: string) => unknown) | undefined, onCancel: () => void): ReadableStream<Uint8Array> {
  const reader = upstream.getReader(); const dec = new TextDecoder();
  let buf = ''; let text = ''; let done = false;
  return new ReadableStream<Uint8Array>({
    async pull(c) {
      const r = await reader.read();
      if (r.done) {
        if (onComplete && done && text.trim()) await onComplete(text.trim());
        c.close(); return;
      }
      if (onComplete) { buf += dec.decode(r.value, { stream: true }); const d = sseDeltas(buf); buf = d.rest; text += d.deltas.join(''); done ||= d.done; }
      c.enqueue(r.value);
    },
    cancel() { onCancel(); void reader.cancel(); },
  });
}
