import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
import { rateLimit, TooMany } from '../_shared/ratelimit.ts';

const TYPES = ['simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited','deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed','term.personal_created','term.personal_deleted','term.personal_updated',
  // Série 3 — journal d'entraînement (docs/contracts/training-journal.md §2.2).
  'training.logged','plan.materialized','plan.replanned'] as const;
const Event = z.object({
  id: z.string().uuid(),
  type: z.string(),
  subject_id: z.string().max(200).nullable(),
  payload: z.record(z.unknown()),
  occurred_at: z.string().datetime(),
});

// Schéma STRICT par type pour le journal (revue sécurité S-I3) : le serveur est
// autoritaire, une valeur hors bornes ne doit jamais entrer dans une projection.
const Id = z.string().min(1).max(100);
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Min = z.number().int().min(0).max(1440);
const Teil = z.enum(['anamnese', 'dokumentation', 'fallvorstellung']);
const Score = z.number().min(0).max(100);
const Tasks = z.array(z.object({
  id: Id, date: Day, estMin: Min, caseId: Id.optional(), teil: Teil.optional(),
  kind: z.enum(['simulation', 'drill', 'fachwissen', 'aufklaerung', 'revision', 'examen-blanc']),
}).passthrough()).max(50);
const SCHEMAS: Partial<Record<(typeof TYPES)[number], { subject: z.ZodTypeAny; payload: z.ZodTypeAny }>> = {
  'training.logged': { subject: Id, payload: z.object({
    at: z.number().int().nonnegative(),
    kind: z.enum(['simulation', 'drill', 'fiche', 'aufklaerung', 'examen-blanc']),
    caseId: Id.optional(), teile: z.array(Teil).max(3), source: z.enum(['plan', 'libre']),
    taskId: Id.optional(), spentMin: Min, laufId: Id.optional(),
    scores: z.object({ anamnese: Score, dokumentation: Score, fallvorstellung: Score }).partial().strict().optional(),
    selbstbewertet: z.boolean().optional(), profileId: Id.optional(),
  }).strict() },
  'plan.materialized': { subject: Day, payload: z.object({
    tasks: Tasks, mode: z.enum(['teil-first', 'cas-complet', 'specialite', 'examen-blanc']),
    seed: z.string().max(200), targetMin: Min.optional(),
  }).strict() },
  'plan.replanned': { subject: Day, payload: z.object({ tasks: Tasks, reason: z.string().max(40) }).strict() },
};
const Body = z.object({ events: z.array(z.unknown()).min(1).max(100) });
type Rejected = { id: string | null; reason: string; retry?: true };
const issues = (e: z.ZodError) => e.issues.slice(0, 3).map((i) => `${i.path.join('.') || '·'}: ${i.message}`).join('; ');

/** Valide UN événement. Un refus ne concerne que lui, jamais le lot (S-C1).
 *  `retry` : le refus peut venir d'un client en avance sur le serveur (type
 *  inconnu ici ou pas encore dans la contrainte) — le client le GARDE. */
function check(raw: unknown): { ok: z.infer<typeof Event> } | { ko: Rejected } {
  const rawId = typeof (raw as { id?: unknown })?.id === 'string' ? String((raw as { id: string }).id).slice(0, 100) : null;
  const base = Event.safeParse(raw);
  if (!base.success) return { ko: { id: rawId, reason: `invalid: ${issues(base.error)}` } };
  const e = base.data;
  if (!(TYPES as readonly string[]).includes(e.type)) return { ko: { id: e.id, reason: `unknown_type: ${e.type.slice(0, 60)}`, retry: true } };
  const s = SCHEMAS[e.type as (typeof TYPES)[number]];
  if (s) {
    const sub = s.subject.safeParse(e.subject_id); if (!sub.success) return { ko: { id: e.id, reason: `invalid subject_id: ${issues(sub.error)}` } };
    const pay = s.payload.safeParse(e.payload); if (!pay.success) return { ko: { id: e.id, reason: `invalid payload: ${issues(pay.error)}` } };
  }
  return { ok: e };
}

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
  const acked: string[] = []; const rejected: Rejected[] = [];
  const received: Record<string, string> = {};
  // Validation ET insertion une à une : un événement invalide ne fait jamais
  // échouer le lot (S-C1 — un 400 de lot faisait perdre les valides au client).
  for (const raw of events) {
    const c = check(raw);
    if ('ko' in c) { rejected.push(c.ko); continue; }
    const e = c.ok;
    const { error } = await sb.from('progress_events').upsert({ ...e, user_id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      rejected.push({ id: e.id, reason: error.message, ...(error.message.includes('progress_events_type_check') ? { retry: true as const } : {}) });
      continue;
    }
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
