import { userClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';

const Query = z.object({ since: z.coerce.number().int().min(0).default(0) });

Deno.serve(handle(async (req) => {
  const url = new URL(req.url);
  const { since } = parse(Query, Object.fromEntries(url.searchParams));
  const sb = userClient(req);
  const { data: v, error: ve } = await sb.from('content_versions').select('version').order('version', { ascending: false }).limit(1).single();
  if (ve) throw ve;
  // PostgREST plafonne à 1 000 lignes par requête : on pagine côté fonction
  // (par id, index PK) et on renvoie l'ensemble — le client n'a pas à boucler.
  const PAGE = 1000;
  const items: unknown[] = [];
  let after = '';
  for (;;) {
    const { data, error } = await sb.from('content_items').select('*').gt('version', since).gt('id', after).order('id').limit(PAGE);
    if (error) throw error;
    items.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    after = (data[data.length - 1] as { id: string }).id;
  }
  return json({ version: v?.version ?? 0, items: items ?? [] });
}));
