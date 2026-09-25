// ============================================================================
// IA serveur GRATUITE (spec F3 §3.5) — pas un proxy ouvert : prompts système
// côté serveur (_shared/prompts.ts), premium seulement (my_tier() = 3), quota
// 300/jour, cache brief 30 j, flux SSE relayé, amont annulé à la déconnexion.
// Clés fournisseurs lues dans l'env, jamais journalisées ni renvoyées.
// ============================================================================
import { userClient, serviceClient } from '../_shared/supabase.ts';
import { z, parse, BadRequest } from '../_shared/validate.ts';
import { rateLimit, TooMany } from '../_shared/ratelimit.ts';
import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind } from '../_shared/prompts.ts';
import { openStream, normalizeSelection, NoProvider, type OAIMessage } from '../_shared/aiChain.ts';
import { MAX_BODY, MAX_CHAT_CHARS, mockAllowed, usableChain, relay } from './guards.ts';

const ALLOWED = /^(https:\/\/mhdbkr\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
const corsFor = (req: Request): Record<string, string> => {
  const o = req.headers.get('origin') ?? '';
  return ALLOWED.test(o)
    ? { 'access-control-allow-origin': o, vary: 'origin', 'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-expose-headers': 'x-ai-provider' }
    : { vary: 'origin' };
};
const j = (req: Request, body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...corsFor(req) } });

const Turn = z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1).max(2000) }).strict();
const Body = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('brief'), selection: z.string().trim().min(1).max(220) }).strict(),
  z.object({ kind: z.literal('chat'), turns: z.array(Turn).min(1).max(20) }).strict(),
]).refine((b) => b.kind !== 'chat' || b.turns.reduce((n, t) => n + t.text.length, 0) <= MAX_CHAT_CHARS, 'chat_too_long');
const MAX_TOKENS = { brief: 300, chat: 1200 } as const;
const CACHE_DAYS = 30;
const allowMock = mockAllowed(Deno.env.get('AI_ALLOW_MOCK'), Deno.env.get('SUPABASE_URL'));
const keys = { GROQ_API_KEY: Deno.env.get('GROQ_API_KEY'), GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') };

const sseOf = (text: string) => new ReadableStream<Uint8Array>({ start(c) {
  const e = new TextEncoder();
  c.enqueue(e.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)); c.enqueue(e.encode('data: [DONE]\n\n')); c.close();
} });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsFor(req) });
  if (req.method !== 'POST') return j(req, { error: 'method' }, 405);
  try {
    const sb = userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return j(req, { error: 'unauthorized' }, 401);
    const { data: tier } = await sb.rpc('my_tier');
    if (tier !== 3) return j(req, { error: 'premium_only' }, 403);
    if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) return j(req, { error: 'too_large' }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY) return j(req, { error: 'too_large' }, 413); // corps « chunked » sans Content-Length
    let json: unknown;
    try { json = JSON.parse(raw); } catch { throw new BadRequest('json'); }
    const body = parse(Body, json);
    const admin = serviceClient();

    let messages: OAIMessage[]; let cacheKey: string | null = null;
    if (body.kind === 'brief') {
      // Cache consulté AVANT le quota : une glose déjà connue ne coûte rien.
      cacheKey = `brief:${normalizeSelection(body.selection)}`;
      const since = new Date(Date.now() - CACHE_DAYS * 86400_000).toISOString();
      const { data: hit } = await admin.from('ai_cache').select('text').eq('key', cacheKey).gt('created_at', since).maybeSingle();
      if (hit) return new Response(sseOf(hit.text), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-ai-provider': 'cache', ...corsFor(req) } });
      const { system, user: u } = buildBriefPrompt(body.selection, briefKind(body.selection));
      messages = [{ role: 'system', content: system }, { role: 'user', content: u }];
    } else {
      messages = [{ role: 'system', content: DOCTOPUS_SYSTEM }, ...body.turns.map((t) => ({ role: t.role, content: t.text }))];
    }

    // Chaîne validée AVANT le quota : sans fournisseur appelable, 503 sans rien consommer.
    const chain = usableChain(Deno.env.get(body.kind === 'brief' ? 'AI_CHAIN_BRIEF' : 'AI_CHAIN_CHAT'), keys, allowMock);
    if (!chain.length) return j(req, { error: 'no_provider' }, 503);

    // rate_hit est révoqué pour authenticated : service role, clé = uid du JWT vérifié.
    try { await rateLimit(admin, `ai:${user.id}`, 300, 86400); }
    catch (e) { if (e instanceof TooMany) return j(req, { error: 'quota' }, 429); throw e; }

    const upstreamAbort = new AbortController();
    req.signal.addEventListener('abort', () => upstreamAbort.abort());
    let opened;
    try { opened = await openStream(chain, messages, MAX_TOKENS[body.kind], keys, upstreamAbort.signal); }
    catch (e) { if (e instanceof NoProvider) return j(req, { error: 'no_provider' }, 503); throw e; }

    // Relais : octets renvoyés tels quels ; brief mis en cache seulement si l'amont a fini ([DONE]).
    const key = cacheKey;
    const out = relay(opened.body,
      key ? (text) => admin.from('ai_cache').upsert({ key, text: text.slice(0, 4000), created_at: new Date().toISOString() }) : undefined,
      () => upstreamAbort.abort());
    return new Response(out, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-ai-provider': opened.entry.provider, ...corsFor(req) } });
  } catch (e) {
    if (e instanceof BadRequest) return j(req, { error: 'bad_request' }, 400);
    console.error(e instanceof Error ? e.message : 'internal');
    return j(req, { error: 'internal' }, 500);
  }
});
