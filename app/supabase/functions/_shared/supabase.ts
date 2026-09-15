import { createClient } from 'npm:@supabase/supabase-js@2';
const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
/** Client qui agit AU NOM de l'appelant (RLS appliquée). Anonyme si pas d'Authorization. */
export const userClient = (req: Request) =>
  createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
/** Client service role — uniquement pour les écritures que le client n'a pas le droit de faire. */
export const serviceClient = () => createClient(URL, SERVICE, { auth: { persistSession: false } });
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' } });
export const cors = () => new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
