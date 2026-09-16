import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { isAuthApiError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { upsertAccount, setRefreshToken, setActiveUserId, getActiveUserId, listAccounts } from './accounts';
import { DB_USER_ID } from '@/db/db';
import { restartApp } from './restart';

/** founder : comptes immédiats + bascule locale (ADR-0015). public : comportement SaaS. */
export const AUTH_MODE: 'founder' | 'public' = import.meta.env.VITE_AUTH_MODE === 'founder' ? 'founder' : 'public';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';
interface SessionState { user: User | null; status: SessionStatus }

/** État de session — l'anonyme est un état normal (tier 1), pas une erreur. */
export const useSession = create<SessionState>(() => ({ user: null, status: 'loading' }));

const apply = (user: User | null) => useSession.setState({ user, status: user ? 'authenticated' : 'anonymous' });

let started = false;
/** Compte actif au boot (mode fondateur) — même valeur que DB_USER_ID en prod,
 *  capturée ici pour les tests où le module db est résolu sans compte. */
let bootUid: string | null = null;
/** Ce tab est en train de changer d'identité lui-même (bascule, déconnexion) :
 *  l'événement qui en résulte n'est pas « étranger », l'appelant redémarre. */
let ownChange = false;

/** Compte auquel ce tab est lié (base Dexie) ; null hors mode fondateur / à la porte. */
const boundUserId = (): string | null => (AUTH_MODE === 'founder' ? DB_USER_ID ?? bootUid : null);

/** Isolation inter-onglets : supabase-js partage la session entre onglets
 *  (localStorage + BroadcastChannel) alors que la base Dexie est fixée au
 *  boot. Une session d'un autre compte, ou une déconnexion, reçue alors que ce
 *  tab est lié à un compte → on ne l'applique pas ici : on redémarre. */
const isForeign = (event: string, incomingUserId: string | null): boolean => {
  if (ownChange) return false;
  const bound = boundUserId();
  if (!bound) return false;
  if (event === 'SIGNED_OUT') return true;
  return !!incomingUserId && incomingUserId !== bound;
};

const asOwnChange = async <T>(fn: () => Promise<T>): Promise<T> => {
  ownChange = true;
  try { return await fn(); } finally { ownChange = false; }
};

/** Test-only : réinitialise le garde d'idempotence entre les cas de test. */
export const __resetSessionForTests = () => { started = false; bootUid = null; ownChange = false; };

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
  if (AUTH_MODE === 'founder') bootUid = getActiveUserId();
  const { data } = await supabase.auth.getSession();
  apply(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((event, session) => {
    if (isForeign(event, session?.user?.id ?? null)) { restartApp(); return; }
    apply(session?.user ?? null);
    // Rotation des jetons : seul le dernier est valide → on le garde pour ce compte.
    if (AUTH_MODE === 'founder' && session?.user && session.refresh_token && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
      setRefreshToken(session.user.id, session.refresh_token);
    }
  });
}

// Sans fragment : GoTrue ajoute `?code=` à cette URL ; supabase-js l'échange
// au chargement, puis onAuthStateChange émet SIGNED_IN. La route de callback
// est posée dans le hash APRÈS, par initSession (voir plus bas).
const redirect = () => `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`;

export const signInWithMagicLink = (email: string) =>
  supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

// ── Mode fondateur : mot de passe, sans lien magique ────────────────────────
type SessionLike = { refresh_token: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } };

const remember = (s: SessionLike, displayName: string) => {
  upsertAccount({ userId: s.user.id, email: s.user.email ?? '', displayName, refreshToken: s.refresh_token });
  setActiveUserId(s.user.id);
};

export async function signUpWithPassword(p: { email: string; password: string; displayName: string }): Promise<void> {
  const { data, error } = await supabase.auth.signUp({ email: p.email, password: p.password, options: { data: { display_name: p.displayName } } });
  if (error) throw error;
  if (!data.session) throw new Error('Le serveur exige une confirmation par e-mail : désactiver « Confirm email » dans Supabase Auth (spec §4).');
  await supabase.from('profiles').update({ display_name: p.displayName }).eq('id', data.session.user.id);
  remember(data.session as SessionLike, p.displayName);
}

export async function signInWithPassword(p: { email: string; password: string }): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: p.email, password: p.password });
  if (error) throw error;
  const s = data.session as SessionLike;
  const name = (s.user.user_metadata?.display_name as string | undefined) || s.user.email?.split('@')[0] || 'Moi';
  remember(s, name);
}

/** Bascule sans mot de passe. L'appelant recharge la page après 'switched'. */
export async function switchAccount(userId: string): Promise<'switched' | 'password-required'> {
  const a = listAccounts().find((x) => x.userId === userId);
  if (!a?.refreshToken) return 'password-required';
  // Le compte actif est posé AVANT l'appel : un autre onglet qui reçoit la
  // nouvelle session redémarre sur la bonne base. Restauré en cas d'échec.
  const prev = getActiveUserId();
  setActiveUserId(userId);
  const { data, error } = await asOwnChange(() => supabase.auth.refreshSession({ refresh_token: a.refreshToken! }));
  if (error || !data.session) {
    setActiveUserId(prev);
    // Le jeton n'est nullifié que si le serveur l'a explicitement refusé
    // (400/401/403). Une erreur réseau/transitoire (offline-first) laisse le
    // jeton et le compte actif intacts — l'utilisateur pourra réessayer.
    if (isAuthApiError(error)) setRefreshToken(userId, null);
    return 'password-required';
  }
  setRefreshToken(userId, data.session.refresh_token);
  return 'switched';
}

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
  if (AUTH_MODE === 'founder') {
    // La base locale est celle du compte : rien à purger. On invalide juste le jeton local.
    const id = getActiveUserId();
    const { error } = await asOwnChange(() => supabase.auth.signOut({ scope: 'local' }));
    if (error) throw error;
    if (id) setRefreshToken(id, null);
    setActiveUserId(null);
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await clearLocalProgress();
};

/** Jeton d'accès de la session courante — ou null si, en mode fondateur, la
 *  session partagée appartient à un autre compte que celui de ce tab (ceinture :
 *  rien ne part sous un JWT étranger). */
export const getAccessToken = async (): Promise<string | null> => {
  const s = (await supabase.auth.getSession()).data.session;
  if (!s) return null;
  const bound = boundUserId();
  if (bound && s.user.id !== bound) return null;
  return s.access_token ?? null;
};
