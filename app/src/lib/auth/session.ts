import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';
interface SessionState { user: User | null; status: SessionStatus }

/** État de session — l'anonyme est un état normal (tier 1), pas une erreur. */
export const useSession = create<SessionState>(() => ({ user: null, status: 'loading' }));

const apply = (user: User | null) => useSession.setState({ user, status: user ? 'authenticated' : 'anonymous' });

/** À appeler une fois au démarrage. */
export async function initSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  apply(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
}

const redirect = () => `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}#/auth/callback`;

export const signInWithMagicLink = (email: string) =>
  supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

export const signOut = () => supabase.auth.signOut().then(({ error }) => { if (error) throw error; });

export const getAccessToken = async (): Promise<string | null> => (await supabase.auth.getSession()).data.session?.access_token ?? null;
