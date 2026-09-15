// app/supabase/functions/credits-consume/index.ts
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const Body = z.object({ amount: z.number().int().min(1).max(1000), reason: z.enum(['ai.arztbrief', 'ai.voice']), ref: z.string().min(1).max(200) });
Deno.serve(handle(async (req) => {
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { amount, reason, ref } = parse(Body, await req.json());
  const { data, error } = await serviceClient().rpc('consume_credits', { uid: user.id, amount, reason, ref });
  if (error?.message.includes('insufficient_credits')) return json({ error: 'insufficient_credits', balance: Number(error.details ?? 0) }, 409);
  if (error) throw error;
  return json({ balance: data });
}));
