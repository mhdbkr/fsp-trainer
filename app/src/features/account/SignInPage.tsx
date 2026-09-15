import { useState } from 'react';
import { signInWithMagicLink, signInWithGoogle } from '@/lib/auth/session';
import { Icon } from '@/components/icons';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try { await signInWithMagicLink(email.trim()); setSent(true); }
    catch (err) { setError((err as Error).message); }
  };
  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div>
        <div className="label">Doctopus</div>
        <h1 className="text-2xl font-bold">Se connecter</h1>
        <p className="text-sm text-slate-500">Un lien par e-mail, pas de mot de passe. Ta progression te suit sur tous tes appareils.</p>
      </div>
      {sent ? (
        <div className="card p-4 text-sm">Lien envoyé à <b>{email}</b>. Ouvre-le sur cet appareil.</div>
      ) : (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.de" className="input w-full" autoFocus />
          <button type="submit" className="btn-primary w-full justify-center">Recevoir le lien</button>
          {error && <p className="text-xs text-signal-600">{error}</p>}
        </form>
      )}
      <button onClick={() => signInWithGoogle().catch((err) => setError((err as Error).message))} className="btn-outline w-full justify-center gap-2"><Icon name="google" className="h-4 w-4" />Continuer avec Google</button>
      {error && !sent ? null : error ? <p className="text-center text-xs text-signal-600">{error}</p> : null}
    </div>
  );
}
