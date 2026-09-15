import Stripe from 'npm:stripe@16';
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

Deno.serve(handle(async (req) => {
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  parse(z.object({ confirm: z.literal(true) }), await req.json());
  const admin = serviceClient();
  // Résilier chez Stripe d'abord (best effort : un abonnement déjà annulé ne bloque pas la suppression).
  const { data: sub } = await admin.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).maybeSingle();
  if (sub?.stripe_subscription_id) await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch((e) => console.warn('[stripe] cancel', e.message));
  // La suppression de auth.users cascade : profiles → subscriptions, credit_ledger, progress_events.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
}));
