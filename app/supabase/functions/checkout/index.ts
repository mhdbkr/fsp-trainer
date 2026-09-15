import Stripe from 'npm:stripe@16';
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const Body = z.object({ plan: z.enum(['pro', 'premium']), returnUrl: z.string().url() });

Deno.serve(handle(async (req) => {
  const sb = userClient(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { plan, returnUrl } = parse(Body, await req.json());
  const admin = serviceClient();
  const { data: p } = await admin.from('plans').select('stripe_price_id').eq('id', plan).single();
  if (!p?.stripe_price_id) return json({ error: 'plan_not_purchasable' }, 400);
  // un customer Stripe par utilisateur, réutilisé
  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  const customer = sub?.stripe_customer_id ?? (await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })).id;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', customer, line_items: [{ price: p.stripe_price_id, quantity: 1 }],
    success_url: `${returnUrl}#/merci`, cancel_url: `${returnUrl}#/pricing`,
    metadata: { user_id: user.id, plan }, subscription_data: { metadata: { user_id: user.id, plan } },
    automatic_tax: { enabled: true }, customer_update: { address: 'auto' },
  });
  return json({ url: session.url });
}));
