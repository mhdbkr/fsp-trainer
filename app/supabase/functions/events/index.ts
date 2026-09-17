import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
import { rateLimit, TooMany } from '../_shared/ratelimit.ts';

const Event = z.object({
  id: z.string().uuid(),
  type: z.enum(['simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
    'term.favorited','term.unfavorited','deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
    'srs.settings_changed']),
  subject_id: z.string().max(200).nullable(),
  payload: z.record(z.unknown()),
  occurred_at: z.string().datetime(),
});
const Body = z.object({ events: z.array(Event).min(1).max(100) });

Deno.serve(handle(async (req) => {
  const sb = userClient(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  try { await rateLimit(serviceClient(), `events:${user.id}`, 600, 60); } catch (e) { if (e instanceof TooMany) return json({ error: 'rate_limited' }, 429); throw e; }

  if (req.method === 'GET') {
    const { since } = parse(z.object({ since: z.string().datetime({ offset: true }).default('1970-01-01T00:00:00Z') }), Object.fromEntries(new URL(req.url).searchParams));
    // Curseur sur received_at (horloge SERVEUR) — cf. fix Task 12 : occurred_at est
    // l'horloge client et ferait rater les événements poussés en retard.
    const { data, error } = await sb.from('progress_events').select('*').gt('received_at', since).order('received_at').limit(1000);
    if (error) throw error;
    return json({ events: data });
  }

  const { events } = parse(Body, await req.json());
  const acked: string[] = []; const rejected: { id: string; reason: string }[] = [];
  const received: Record<string, string> = {};
  // insertion une à une : un événement invalide ne doit pas faire échouer le lot
  for (const e of events) {
    const { error } = await sb.from('progress_events').upsert({ ...e, user_id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) { rejected.push({ id: e.id, reason: error.message }); continue; }
    acked.push(e.id);
  }
  // received_at par événement acquitté (y compris ceux déjà présents — rejeu) :
  // le client le rétro-remplit pour faire avancer son curseur de pull.
  if (acked.length) {
    const { data } = await sb.from('progress_events').select('id, received_at').in('id', acked);
    for (const r of data ?? []) received[r.id] = r.received_at;
  }
  return json({ acked, received, rejected });
}));
