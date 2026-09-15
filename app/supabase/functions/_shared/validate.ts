import { z, type ZodTypeAny } from 'npm:zod@3';
export { z };
export class BadRequest extends Error { constructor(public issues: unknown) { super('bad request'); } }
/** Valide ou lève BadRequest — chaque fonction répond 400, jamais stocké. */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new BadRequest(r.error.flatten());
  return r.data;
}
export const handle = (fn: (req: Request) => Promise<Response>) => async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
  try { return await fn(req); }
  catch (e) {
    if (e instanceof BadRequest) return new Response(JSON.stringify({ error: 'bad_request', issues: e.issues }), { status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    console.error(e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  }
};
