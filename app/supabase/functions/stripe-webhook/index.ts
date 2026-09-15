import Stripe from 'npm:stripe@16';
import { serviceClient, json } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
// Miroir des statuts Stripe → nos cinq statuts (contrainte CHECK de `subscriptions`).
const STATUS: Record<string, string> = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled', unpaid: 'past_due', incomplete: 'incomplete', incomplete_expired: 'canceled', paused: 'canceled' };

type Admin = ReturnType<typeof serviceClient>;

async function upsertSubscription(admin: Admin, sub: Stripe.Subscription) {
  const user_id = sub.metadata?.user_id; const plan_id = sub.metadata?.plan;
  if (!user_id || !plan_id) { console.warn('[stripe] subscription sans metadata user_id/plan', sub.id); return; }
  const { error } = await admin.from('subscriptions').upsert({
    user_id, plan_id, stripe_customer_id: String(sub.customer), stripe_subscription_id: sub.id,
    status: STATUS[sub.status] ?? 'incomplete',
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

/** Ligne de ledger idempotente : (user_id, reason, ref) unique — un rejeu ne double pas. */
async function ledger(admin: Admin, row: { user_id: string; delta: number; reason: string; ref: string }) {
  const { error } = await admin.from('credit_ledger').insert(row);
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

/** Appel Stripe tolérant : un objet introuvable (sandbox, rejeu ancien) se journalise, ne fait pas 500. */
async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); }
  catch (e) {
    // 404 = objet inexistant (sandbox, rejeu ancien) : on ignore. Tout autre
    // échec (réseau, 5xx Stripe) doit faire ÉCHOUER le webhook pour que
    // Stripe rejoue — sinon un grant mensuel serait perdu pour toujours.
    const err = e as { statusCode?: number; message: string };
    if (err.statusCode === 404) { console.warn(`[stripe] ${label} : introuvable`); return null; }
    throw e;
  }
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? '';
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(await req.text(), sig, SECRET); }
  catch { return json({ error: 'bad_signature' }, 400); }

  const admin = serviceClient();
  // Idempotence : un événement Stripe n'est traité qu'une fois — réservé AVANT,
  // libéré en cas d'échec (au-moins-une-fois : Stripe rejouera).
  const { error: dup } = await admin.from('stripe_events').insert({ event_id: event.id, type: event.type });
  if (dup) return json({ received: true, duplicate: true });
  try {
  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (!s.subscription) break;
      const sub = await safe('retrieve subscription', () => stripe.subscriptions.retrieve(String(s.subscription)));
      if (sub) await upsertSubscription(admin, sub);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await upsertSubscription(admin, event.data.object as Stripe.Subscription);
      break;
    case 'invoice.paid': {
      // Nouveau cycle payé → grant mensuel, idempotent par invoice.id
      const inv = event.data.object as Stripe.Invoice;
      if (!inv.subscription) break;
      const sub = await safe('retrieve subscription (invoice)', () => stripe.subscriptions.retrieve(String(inv.subscription)));
      const user_id = sub?.metadata?.user_id; const plan_id = sub?.metadata?.plan;
      if (!user_id || !plan_id) break;
      const { data: p } = await admin.from('plans').select('monthly_credits').eq('id', plan_id).single();
      if (p?.monthly_credits) await ledger(admin, { user_id, delta: p.monthly_credits, reason: 'monthly_grant', ref: inv.id });
      break;
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      const cust = await safe('retrieve customer', () => stripe.customers.retrieve(String(ch.customer)));
      const user_id = cust && !('deleted' in cust && cust.deleted) ? (cust as Stripe.Customer).metadata?.user_id : undefined;
      if (!user_id) break;
      const { data: s } = await admin.from('subscriptions').select('plan_id').eq('user_id', user_id).maybeSingle();
      const { data: plan } = s ? await admin.from('plans').select('monthly_credits').eq('id', s.plan_id).single() : { data: null };
      if (plan?.monthly_credits) await ledger(admin, { user_id, delta: -plan.monthly_credits, reason: 'refund', ref: ch.id });
      break;
    }
  }
  } catch (e) {
    await admin.from('stripe_events').delete().eq('event_id', event.id);
    console.error('[stripe] traitement échoué, event libéré pour rejeu :', event.id, (e as Error).message);
    return json({ error: 'processing_failed' }, 500);
  }
  return json({ received: true });
});
