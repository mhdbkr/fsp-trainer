import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON = process.env.SUPABASE_ANON_KEY!;
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const serviceClient = (): SupabaseClient => createClient(URL, SERVICE, { auth: { persistSession: false } });

/** Crée (ou récupère) un utilisateur et rend un client authentifié en son nom. */
export async function createTestUser(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const admin = serviceClient();
  const password = 'test-password-123';
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const id = created.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === email)!.id;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id, client };
}
