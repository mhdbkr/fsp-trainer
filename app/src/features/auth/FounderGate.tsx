import { useState } from 'react';
import { listAccounts, initials } from '@/lib/auth/accounts';
import { signUpWithPassword, signInWithPassword, switchAccount } from '@/lib/auth/session';

// Écran unique de première ouverture en mode fondateur (ADR-0015) : créer un
// compte en trois champs, ou reprendre un compte connu sur cet appareil sans
// mot de passe. Aucun lien magique. `onDone` = recharger l'app (la base Dexie
// du compte est résolue au chargement du module).

const DOT: Record<string, string> = {
  petrol: 'bg-brand-500', coral: 'bg-signal-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', emerald: 'bg-emerald-500', sky: 'bg-sky-500', violet: 'bg-violet-500',
};
type Mode = 'create' | 'signin';

/** Erreur Supabase « User already registered » (422) → message français +
 *  passage à la connexion, e-mail conservé. Les autres erreurs restent telles quelles. */
const isAlreadyRegistered = (e: unknown): boolean => {
  const err = e as { message?: string; status?: number };
  return /already registered/i.test(err?.message ?? '') || (err?.status === 422 && /already/i.test(err?.message ?? ''));
};

export function FounderGate({ onDone }: { onDone: () => void }) {
  const known = listAccounts();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null); setEmailTaken(false); setBusy(true);
    try { await fn(); onDone(); }
    catch (e) { if (isAlreadyRegistered(e)) setEmailTaken(true); else setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const toSignin = () => { setMode('signin'); setEmailTaken(false); setError(null); };

  // Titre : sans compte connu → création ; avec comptes → « Qui s'entraîne ? »
  // (la liste d'abord, le formulaire de création dessous) ; connexion → « Se connecter ».
  const title = mode === 'signin' ? 'Se connecter' : known.length > 0 ? "Qui s'entraîne ?" : 'Créer mon compte';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (mode === 'create') void run(() => signUpWithPassword({ email: email.trim(), password, displayName: name.trim() }));
    else void run(() => signInWithPassword({ email: email.trim(), password }));
  };

  const resume = async (userId: string, accountEmail: string) => {
    setError(null); setBusy(true);
    try {
      const r = await switchAccount(userId);
      if (r === 'switched') { onDone(); return; }
      setMode('signin'); setEmail(accountEmail);
      setError('Reconnexion nécessaire pour ce compte : saisis son mot de passe.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <div className="label">Doctopus · FSP Trainer</div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-slate-500">Chaque personne a son compte : sa progression, ses simulations, son programme. Rien n'est partagé.</p>
        </div>

        {known.length > 0 && (
          <div className="card space-y-1 p-3">
            <div className="label mb-1">Sur cet appareil</div>
            {known.map((a) => (
              <button key={a.userId} type="button" onClick={() => resume(a.userId, a.email)} disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>
                <span className="flex-1"><span className="block font-semibold">{a.displayName}</span><span className="block text-xs text-slate-500">{a.email}</span></span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="card space-y-3 p-4">
          {mode === 'create' && known.length > 0 && <h2 className="label">Nouveau compte</h2>}
          {mode === 'create' && (
            <label className="block text-sm"><span className="label">Prénom</span>
              <input aria-label="Prénom" required autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" autoFocus={known.length === 0} /></label>
          )}
          <label className="block text-sm"><span className="label">E-mail</span>
            <input aria-label="E-mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" /></label>
          <label className="block text-sm"><span className="label">Mot de passe</span>
            <input aria-label="Mot de passe" type="password" required minLength={8} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full" /></label>
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">{mode === 'create' ? 'Créer et commencer' : 'Se connecter'}</button>
          {error && <p role="alert" className="text-xs text-signal-600">{error}</p>}
          {emailTaken && (
            <p role="alert" className="text-xs text-signal-600">Cet e-mail a déjà un compte — <button type="button" onClick={toSignin} className="font-semibold underline">Se connecter</button></p>
          )}
        </form>

        <button type="button" onClick={() => { setMode(mode === 'create' ? 'signin' : 'create'); setError(null); setEmailTaken(false); }} className="w-full text-center text-sm text-slate-500 hover:underline">
          {mode === 'create' ? "J'ai déjà un compte" : 'Créer un nouveau compte'}
        </button>
      </div>
    </div>
  );
}
