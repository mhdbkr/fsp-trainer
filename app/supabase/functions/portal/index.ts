import Stripe from 'npm:stripe@16';
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
Deno.serve(handle(async (req) => {
  const sb = userClient(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { returnUrl } = parse(z.object({ returnUrl: z.string().url() }), await req.json());
  const { data: sub } = await serviceClient().from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!sub) return json({ error: 'no_subscription' }, 404);
  const s = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${returnUrl}#/account` });
  return json({ url: s.url });
}));
