import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!url || !anon) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (voir .env.example)');
export const supabase = createClient(url, anon, {
  // PKCE : le lien magique et l'OAuth reviennent avec `?code=` dans la QUERY,
  // que supabase-js échange automatiquement (detectSessionInUrl). Le flux
  // implicite mettrait les tokens dans le FRAGMENT (#access_token=…), qui
  // écraserait la route du hash router (#/auth/callback) — collision réelle.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
});

export async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body as Record<string, unknown> });
  if (error) throw error; return data as T;
}
