// app/scripts/grantFounder.mjs
// Pose un abonnement premium actif SANS Stripe pour un compte fondateur.
// Usage : SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/grantFounder.mjs <email>
// Jamais en CI. Jamais sur le contexte Stripe live (aucun appel Stripe ici).
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email) { console.error('usage: grantFounder.mjs <email>'); process.exit(2); }
if (!url || !key) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis'); process.exit(2); }

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: users, error: e1 } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (e1) { console.error(e1.message); process.exit(1); }
const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) { console.error(`aucun utilisateur ${email}`); process.exit(3); }

const { error: e2 } = await admin.from('subscriptions').upsert({
  user_id: user.id, plan_id: 'premium', status: 'active',
  stripe_customer_id: `founder:${user.id}`, stripe_subscription_id: null, current_period_end: null,
}, { onConflict: 'user_id' });
if (e2) { console.error(e2.message); process.exit(1); }
console.log(`ok: ${email} → premium (fondateur)`);
