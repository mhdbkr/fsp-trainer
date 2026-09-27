import { describe, it, expect, vi } from 'vitest';
import { parseChain, openStream, sseDeltas, NoProvider, normalizeSelection } from '../../supabase/functions/_shared/aiChain.ts';

const sse = (...parts: string[]) => new Response(parts.map((p) => `data: ${p}\n\n`).join(''), { status: 200, headers: { 'content-type': 'text/event-stream' } });

describe('aiChain', () => {
  it('parseChain : ordre conservé, fournisseurs inconnus et mock (hors test) ignorés', () => {
    expect(parseChain('groq:llama-3.3-70b-versatile, gemini:gemini-flash-lite-latest,foo:x,mock:m')).toEqual([
      { provider: 'groq', model: 'llama-3.3-70b-versatile' }, { provider: 'gemini', model: 'gemini-flash-lite-latest' }]);
    expect(parseChain('mock:m', true)).toEqual([{ provider: 'mock', model: 'm' }]);
    expect(parseChain(undefined)).toEqual([]);
  });
  it('bascule sur le suivant si le premier échoue (429) ou n’a pas de clé', async () => {
    const f = vi.fn(async (url: string) => (String(url).includes('groq') ? new Response('quota', { status: 429 }) : sse('{"choices":[{"delta":{"content":"ok"}}]}', '[DONE]')));
    const chain = parseChain('groq:a,gemini:b');
    const r = await openStream(chain, [{ role: 'user', content: 'x' }], 50, { GROQ_API_KEY: 'k1', GEMINI_API_KEY: 'k2' }, undefined, f as never);
    expect(r.entry.provider).toBe('gemini');
    const [, init] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(f.mock.calls[1][0]).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'b', stream: true, max_tokens: 50 });
    const noKey = await openStream(chain, [{ role: 'user', content: 'x' }], 50, { GEMINI_API_KEY: 'k2' }, undefined, f as never);
    expect(noKey.entry.provider).toBe('gemini');
  });
  it('tout échoue → NoProvider avec le dernier statut', async () => {
    const f = vi.fn(async () => new Response('down', { status: 503 }));
    await expect(openStream(parseChain('groq:a'), [], 10, { GROQ_API_KEY: 'k' }, undefined, f as never)).rejects.toMatchObject({ lastStatus: 503 });
    await expect(openStream(parseChain('groq:a'), [], 10, {}, undefined, f as never)).rejects.toBeInstanceOf(NoProvider);
  });
  it('sseDeltas : fragments, reste partiel, [DONE]', () => {
    const r = sseDeltas('data: {"choices":[{"delta":{"content":"Hal"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: {"cho');
    expect(r).toEqual({ deltas: ['Hal', 'lo'], rest: 'data: {"cho', done: false });
    expect(sseDeltas('data: [DONE]\n\n').done).toBe(true);
  });
  it('normalizeSelection', () => expect(normalizeSelection('  Aszites \n ')).toBe('aszites'));
});
