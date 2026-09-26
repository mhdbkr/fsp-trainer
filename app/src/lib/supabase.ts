import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
function realClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!url || !anon) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (voir .env.example)');
  client = createClient(url, anon, {
    // PKCE : le lien magique et l'OAuth reviennent avec `?code=` dans la QUERY,
    // que supabase-js échange automatiquement (detectSessionInUrl). Le flux
    // implicite mettrait les tokens dans le FRAGMENT (#access_token=…), qui
    // écraserait la route du hash router (#/auth/callback) — collision réelle.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
  });
  return client;
}

// Le client réel n'est créé qu'au premier accès, pas à l'import du module :
// les fichiers qui importent (même transitivement) '@/lib/supabase' sans
// jamais toucher au réseau — la plupart des tests unitaires — ne doivent pas
// planter faute de .env (CI : `vitest run` tourne sans .env).
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = realClient();
    const v = Reflect.get(c, prop, c);
    return typeof v === 'function' ? v.bind(c) : v;
  },
});

export async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body: body as Record<string, unknown> });
  if (error) throw error; return data as T;
}
