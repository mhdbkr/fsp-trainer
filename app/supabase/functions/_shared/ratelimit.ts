import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
export class TooMany extends Error {}
/** Lève TooMany au-delà de `max` appels par `windowSec` pour la clé. */
export async function rateLimit(sb: SupabaseClient, key: string, max: number, windowSec: number) {
  const { data, error } = await sb.rpc('rate_hit', { k: key, max_hits: max, window_sec: windowSec });
  if (error) throw error;
  if (!data) throw new TooMany();
}
