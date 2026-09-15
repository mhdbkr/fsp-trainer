import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, serviceClient, URL } from './helpers';

let A: Awaited<ReturnType<typeof createTestUser>>;
let B: Awaited<ReturnType<typeof createTestUser>>;

beforeAll(async () => {
  A = await createTestUser('rls-a@test.dev');
  B = await createTestUser('rls-b@test.dev');
  const admin = serviceClient();
  await admin.from('profiles').update({ display_name: 'Alice', target_land: 'BW' }).eq('id', A.id);
  await admin.from('profiles').update({ display_name: 'Bob', target_land: 'BY' }).eq('id', B.id);
  await admin.from('credit_ledger').insert({ user_id: B.id, delta: 50, reason: 'demo_grant', ref: 'rls-test' });
});

describe('RLS — isolation entre utilisateurs', () => {
  it('A lit son profil et pas celui de B', async () => {
    const { data } = await A.client.from('profiles').select('id, display_name');
    expect(data?.map((p) => p.id)).toEqual([A.id]);
  });
  it("A ne peut pas modifier le profil de B (0 ligne, pas d'erreur)", async () => {
    const { data } = await A.client.from('profiles').update({ display_name: 'Hacked' }).eq('id', B.id).select();
    expect(data).toEqual([]);
    const { data: b } = await serviceClient().from('profiles').select('display_name').eq('id', B.id).single();
    expect(b?.display_name).toBe('Bob');
  });
  it('A ne voit pas le ledger de B (aucune ligne d\'un autre user_id)', async () => {
    const { data } = await A.client.from('credit_ledger').select('user_id');
    // A peut avoir ses propres lignes (bloc « crédits » ci-dessous) ; aucune ne doit être à B.
    expect(data!.every((r) => r.user_id === A.id)).toBe(true);
    expect(data!.some((r) => r.user_id === B.id)).toBe(false);
  });
  it('A ne peut pas écrire dans le ledger', async () => {
    const { error } = await A.client.from('credit_ledger').insert({ user_id: A.id, delta: 999, reason: 'purchase', ref: 'x' });
    expect(error).not.toBeNull();
  });
  it('A ne peut pas se créer un abonnement', async () => {
    const { error } = await A.client.from('subscriptions').insert({ user_id: A.id, plan_id: 'premium', stripe_customer_id: 'cus_fake', status: 'active' });
    expect(error).not.toBeNull();
  });
  it('plans et entitlements sont lisibles anonymement', async () => {
    const { data } = await A.client.from('entitlements').select('plan_id, feature');
    expect(data!.length).toBeGreaterThan(5);
  });
  it("A appelant rpc('tier_of', {uid: B.id}) obtient une erreur de permission, tandis que rpc('my_tier') fonctionne", async () => {
    const { error: tierOfError } = await A.client.rpc('tier_of', { uid: B.id });
    expect(tierOfError).not.toBeNull();
    const { error: myTierError } = await A.client.rpc('my_tier');
    expect(myTierError).toBeNull();
  });
});

describe('crédits', () => {
  it('débit atomique, 409 si insuffisant, idempotent par ref', async () => {
    const admin = serviceClient();
    await admin.from('credit_ledger').insert({ user_id: A.id, delta: 5, reason: 'demo_grant', ref: 'credits-test' });
    const tok = (await A.client.auth.getSession()).data.session!.access_token;
    const call = (body: unknown) => fetch(`${URL}/functions/v1/credits-consume`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect((await (await call({ amount: 3, reason: 'ai.arztbrief', ref: 'job-1' })).json()).balance).toBe(2);
    expect((await (await call({ amount: 3, reason: 'ai.arztbrief', ref: 'job-1' })).json()).balance).toBe(2);   // même ref : pas de double débit
    expect((await call({ amount: 3, reason: 'ai.arztbrief', ref: 'job-2' })).status).toBe(409);
  });
});
