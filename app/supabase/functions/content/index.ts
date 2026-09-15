import { userClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';

const Query = z.object({ since: z.coerce.number().int().min(0).default(0) });

Deno.serve(handle(async (req) => {
  const url = new URL(req.url);
  const { since } = parse(Query, Object.fromEntries(url.searchParams));
  const sb = userClient(req);
  const [{ data: v }, { data: items, error }] = await Promise.all([
    sb.from('content_versions').select('version').order('version', { ascending: false }).limit(1).single(),
    sb.rpc('content_since', { since }),
  ]);
  if (error) throw error;
  return json({ version: v?.version ?? 0, items: items ?? [] });
}));
