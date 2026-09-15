import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';
interface SessionState { user: User | null; status: SessionStatus }

/** État de session — l'anonyme est un état normal (tier 1), pas une erreur. */
export const useSession = create<SessionState>(() => ({ user: null, status: 'loading' }));

const apply = (user: User | null) => useSession.setState({ user, status: user ? 'authenticated' : 'anonymous' });

let started = false;

/** Test-only : réinitialise le garde d'idempotence entre les cas de test. */
export const __resetSessionForTests = () => { started = false; };

/** À appeler une fois au démarrage (idempotent : la souscription ne doit jamais être enregistrée deux fois). */
export async function initSession(): Promise<void> {
  if (started) return;
  started = true;
  // Retour d'un lien magique / OAuth (PKCE) : `?code=` est dans la query. On
  // l'échange EXPLICITEMENT et tout de suite — si on laissait supabase-js le
  // détecter passivement, le hash router aurait le temps de réécrire l'URL
  // (`/?code=…` → `/#/`) et le code serait perdu. Le code est à usage unique.
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code) {
    // Route de callback posée AVANT l'échange, et par `location.hash` (pas
    // `replaceState`) : le hash router est créé au chargement du module et
    // n'écoute que `hashchange` — un replaceState silencieux le laisserait sur `/`.
    window.history.replaceState(null, '', window.location.pathname);   // retire ?code=
    window.location.hash = '#/auth/callback';
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.warn('[auth] échange du code refusé :', error.message);
  }
  const { data } = await supabase.auth.getSession();
  apply(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
}

// Sans fragment : GoTrue ajoute `?code=` à cette URL ; supabase-js l'échange
// au chargement, puis onAuthStateChange émet SIGNED_IN. La route de callback
// est posée dans le hash APRÈS, par initSession (voir plus bas).
const redirect = () => `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`;

export const signInWithMagicLink = (email: string) =>
  supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

/** Déconnexion : la progression locale part avec la session. Sur un appareil
 *  partagé, la laisser ferait fusionner les événements de A dans le compte de
 *  B (pull), et pousser l'outbox de A sous le jeton de B. */
export async function clearLocalProgress(): Promise<void> {
  const { db } = await import('@/db/db');
  await db.transaction('rw', [db.progress_events, db.outbox, db.simulations, db.plan, db.meta], async () => {
    await db.progress_events.clear(); await db.outbox.clear(); await db.simulations.clear(); await db.plan.clear();
    await db.meta.bulkDelete(['migratedLocal', 'migrationDismissed', 'program', 'entitlements']);
  });
  // SRS et couches : remis à neuf (ils appartiennent au compte, pas à l'appareil)
  await db.fachbegriffe.toCollection().modify((fb: { srs?: unknown }) => { fb.srs = undefined; });
  await db.cases.toCollection().modify((c: { layerProgress?: unknown; confidence?: unknown; status?: unknown }) => { c.layerProgress = undefined; c.confidence = undefined; c.status = undefined; });
}
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await clearLocalProgress();
};

export const getAccessToken = async (): Promise<string | null> => (await supabase.auth.getSession()).data.session?.access_token ?? null;
