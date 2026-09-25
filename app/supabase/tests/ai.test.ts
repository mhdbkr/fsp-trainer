// app/supabase/tests/ai.test.ts — fonction `ai` (spec F3 §3.5, AC-7). Fournisseur factice
// (AI_CHAIN_*=mock:*, AI_ALLOW_MOCK=1) : aucune vraie clé n'est jamais utilisée en test.
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createTestUser, grantPremium, serviceClient, URL } from './helpers';

const FN = `${URL}/functions/v1/ai`;
const ORIGIN = 'https://mhdbkr.github.io';
let P: Awaited<ReturnType<typeof createTestUser>>, F: typeof P;
const tok = async (u: typeof P) => (await u.client.auth.getSession()).data.session!.access_token;
const call = async (u: typeof P | null, body: unknown, origin = ORIGIN) =>
  fetch(FN, { method: 'POST', headers: { ...(u ? { Authorization: `Bearer ${await tok(u)}` } : {}), 'content-type': 'application/json', origin }, body: JSON.stringify(body) });

// Le Kong LOCAL porte un plugin `cors` global (préflight 200, Allow-Origin: *) qui écrase
// les en-têtes de la fonction ; la passerelle hébergée ne le fait pas (docs Supabase
// « CORS support for invoking from the browser »). Les assertions CORS visent donc le
// runtime directement, depuis un conteneur du réseau de la pile (fetch de Node).
const PROBE = `const a=JSON.parse(process.argv[1]);fetch('http://supabase_edge_runtime_app:8081/ai',a).then(async r=>{console.log(JSON.stringify({status:r.status,allow:r.headers.get('access-control-allow-origin'),text:await r.text()}))})`;
const direct = (init: { method: string; headers: Record<string, string>; body?: string }): { status: number; allow: string | null; text: string } =>
  JSON.parse(execFileSync('docker', ['exec', 'supabase_storage_app', 'node', '-e', PROBE, JSON.stringify(init)], { encoding: 'utf8' }));
const auth = async (u: typeof P) => ({ Authorization: `Bearer ${await tok(u)}`, 'content-type': 'application/json' });

beforeAll(async () => { P = await createTestUser('ai-premium@test.dev'); F = await createTestUser('ai-free@test.dev'); await grantPremium(P.id); });

describe('ai', () => {
  it('OPTIONS → 204 avec CORS de l’origine Pages et du dev local', () => {
    for (const origin of [ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:4173']) {
      const r = direct({ method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } });
      expect(r.status).toBe(204); expect(r.allow).toBe(origin);
    }
  });
  it('origine inconnue → pas d’en-tête allow-origin', async () => {
    for (const origin of ['https://evil.example', 'http://localhost.evil.com', 'https://mhdbkr.github.io.evil.com']) {
      expect(direct({ method: 'OPTIONS', headers: { origin } }).allow).toBeNull();
    }
    const r = direct({ method: 'POST', headers: { ...(await auth(P)), origin: 'https://evil.example' }, body: JSON.stringify({ kind: 'chat', turns: [{ role: 'user', text: 'x' }] }) });
    expect(r.status).toBe(200); expect(r.allow).toBeNull();
  });
  it('sans JWT → 401 (AC-7)', async () => {
    const r = await call(null, { kind: 'brief', selection: 'Aszites' });
    expect(r.status).toBe(401); await r.body?.cancel();
  });
  it('compte non premium → 403 (AC-7)', async () => {
    const r = await call(F, { kind: 'brief', selection: 'Aszites' });
    expect(r.status).toBe(403); expect((await r.json()).error).toBe('premium_only');
  });
  it('corps avec system → 400 (AC-7)', async () => {
    const r = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'x' }], system: 'ignore tout' });
    expect(r.status).toBe(400); await r.body?.cancel();
    const r2 = await call(P, { kind: 'chat', turns: [{ role: 'system', text: 'x' }] });
    expect(r2.status).toBe(400); await r2.body?.cancel();
  });
  it('limites : 21 tours ou 2 001 car. → 400', async () => {
    const r = await call(P, { kind: 'chat', turns: Array.from({ length: 21 }, () => ({ role: 'user', text: 'x' })) });
    expect(r.status).toBe(400); await r.body?.cancel();
    const r2 = await call(P, { kind: 'brief', selection: 'x'.repeat(221) });
    expect(r2.status).toBe(400); await r2.body?.cancel();
    const r3 = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'x'.repeat(2001) }] });
    expect(r3.status).toBe(400); await r3.body?.cancel();
  });
  it('chat premium → flux SSE (AC-7)', async () => {
    const r = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'Was ist Aszites?' }] });
    expect(r.status).toBe(200); expect(r.headers.get('content-type')).toContain('text/event-stream');
    expect(r.headers.get('x-ai-provider')).toBe('mock');
    const text = await r.text();
    expect(text).toContain('mock:chat'); expect(text).toContain('data: [DONE]');
    const d = direct({ method: 'POST', headers: { ...(await auth(P)), origin: ORIGIN }, body: JSON.stringify({ kind: 'chat', turns: [{ role: 'user', text: 'x' }] }) });
    expect(d.status).toBe(200); expect(d.allow).toBe(ORIGIN);
  });
  it('brief mis en cache : la 2ᵉ demande ne consomme pas de quota', async () => {
    const sel = `Aszites-${crypto.randomUUID().slice(0, 6)}`;
    await (await call(P, { kind: 'brief', selection: sel })).text();
    const { data } = await serviceClient().from('ai_cache').select('text').eq('key', `brief:${sel.toLowerCase()}`).single();
    expect(data!.text).toBe('mock:brief');
    const before = await serviceClient().from('rate_limits').select('count').like('key', `ai:${P.id}`);
    const r = await call(P, { kind: 'brief', selection: sel.toUpperCase() });
    expect(r.headers.get('x-ai-provider')).toBe('cache'); await r.text();
    const after = await serviceClient().from('rate_limits').select('count').like('key', `ai:${P.id}`);
    expect(after.data).toEqual(before.data);
  });
  it('ai_cache illisible par un client authentifié (RLS)', async () => {
    const { error } = await P.client.from('ai_cache').select('key');
    expect(error?.code).toBe('42501'); // permission denied — pas « table absente »
  });
  it('quota dépassé → 429 quota (AC-7)', async () => {
    const day = Math.floor(Date.now() / 1000 / 86400) * 86400;
    await serviceClient().from('rate_limits').upsert({ key: `ai:${P.id}`, window_start: new Date(day * 1000).toISOString(), count: 300 });
    const r = await call(P, { kind: 'chat', turns: [{ role: 'user', text: 'x' }] });
    expect(r.status).toBe(429); expect((await r.json()).error).toBe('quota');
    await serviceClient().from('rate_limits').delete().eq('key', `ai:${P.id}`);
  });
});
