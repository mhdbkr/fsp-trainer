import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { createTestUser, serviceClient, URL } from './helpers';

// Événements construits à la main et SIGNÉS comme Stripe le fait
// (t=<unix>,v1=HMAC-SHA256("<t>.<body>", secret)) : le test exerce la vraie
// vérification de signature, pas un mock. Secret = celui de supabase/.env.
const SECRET = 'whsec_test_local_secret';
const FN = `${URL}/functions/v1/stripe-webhook`;
const sign = (body: string, secret = SECRET) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`; };
const send = async (event: object, tamper = false) => {
  const body = JSON.stringify(event); const sig = sign(body);
  const res = await fetch(FN, { method: 'POST', headers: { 'stripe-signature': sig, 'content-type': 'application/json' }, body: tamper ? body.replace('"active"', '"trialing"') : body });
  return { status: res.status, body: await res.json() };
};
const evt = (type: string, object: object, id = `evt_${randomUUID()}`) => ({ id, object: 'event', type, api_version: '2024-06-20', created: Math.floor(Date.now() / 1000), livemode: false, data: { object } });
const day = 86400;

let A: Awaited<ReturnType<typeof createTestUser>>;
const sub = (over: object) => ({ id: 'sub_test_A', object: 'subscription', customer: 'cus_test_A', status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 30 * day, metadata: { user_id: A.id, plan: 'pro' }, ...over });
const plan = async () => (await serviceClient().rpc('effective_plan', { uid: A.id })).data as string;

beforeAll(async () => { A = await createTestUser('stripe-wh@test.dev'); await serviceClient().from('subscriptions').delete().eq('user_id', A.id); });

describe('stripe-webhook', () => {
  it('signature falsifiée → 400, rien n\'est écrit', async () => {
    const r = await send(evt('customer.subscription.created', sub({})), true);
    expect(r.status).toBe(400); expect(r.body.error).toBe('bad_signature');
    expect((await serviceClient().from('subscriptions').select('*').eq('user_id', A.id)).data).toEqual([]);
  });
  it('subscription.created → ligne active, plan effectif pro ; rejeu du même event → duplicate, une seule ligne', async () => {
    const e = evt('customer.subscription.created', sub({}));
    expect((await send(e)).status).toBe(200);
    const { data } = await serviceClient().from('subscriptions').select('plan_id,status').eq('user_id', A.id);
    expect(data).toEqual([{ plan_id: 'pro', status: 'active' }]);
    expect(await plan()).toBe('pro');
    const replay = await send(e);
    expect(replay.body.duplicate).toBe(true);
    expect((await serviceClient().from('subscriptions').select('*').eq('user_id', A.id)).data!.length).toBe(1);
  });
  it('past_due → statut miroir, droits conservés (grâce 7 jours)', async () => {
    await send(evt('customer.subscription.updated', sub({ status: 'past_due' })));
    expect((await serviceClient().from('subscriptions').select('status').eq('user_id', A.id).single()).data!.status).toBe('past_due');
    expect(await plan()).toBe('pro');
  });
  it('deleted avec période échue → free ; deleted avec période en cours → plan conservé jusqu\'à la fin', async () => {
    await send(evt('customer.subscription.deleted', sub({ status: 'canceled', current_period_end: Math.floor(Date.now() / 1000) + 5 * day })));
    expect(await plan()).toBe('pro');
    await send(evt('customer.subscription.deleted', sub({ status: 'canceled', current_period_end: Math.floor(Date.now() / 1000) - day })));
    expect(await plan()).toBe('free');
  });
  it('invoice.paid sur un abonnement Stripe inconnu → aucun grant ; 404 Stripe ignoré (200), toute autre erreur Stripe → 500 pour que Stripe rejoue', async () => {
    const r = await send(evt('invoice.paid', { id: `in_${randomUUID()}`, object: 'invoice', subscription: 'sub_does_not_exist' }));
    // Vraie clé sandbox (local) : Stripe répond 404 → ignoré → 200.
    // Clé factice (CI, .env.ci) : Stripe répond 401 → au-moins-une-fois → 500 (et l'event est libéré).
    expect([200, 500]).toContain(r.status);
    if (r.status === 500) expect(r.body.error).toBe('processing_failed');
    expect((await serviceClient().from('credit_ledger').select('*').eq('user_id', A.id).eq('reason', 'monthly_grant')).data).toEqual([]);
  });
});
