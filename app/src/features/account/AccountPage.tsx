import { Link } from 'react-router-dom';
import { callFn } from '@/lib/supabase';
import { useSession, signOut } from '@/lib/auth/session';
import { useEntitlements } from '@/lib/entitlements';
import { db } from '@/db/db';

export function AccountPage() {
  const user = useSession((s) => s.user); const { plan, credits } = useEntitlements();
  const portal = async () => { const { url } = await callFn<{ url: string }>('portal', { returnUrl: window.location.origin + import.meta.env.BASE_URL }); window.location.href = url; };
  const exportJson = async () => {
    const data = { exportedAt: new Date().toISOString(), events: await db.progress_events.toArray() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `doctopus-${Date.now()}.json` }); a.click();
  };
  const remove = async () => {
    if (!confirm('Supprimer définitivement ton compte et ta progression ? Exporte d\'abord si tu veux garder une copie.')) return;
    await callFn('delete-account', { confirm: true }); await signOut(); window.location.hash = '#/';
  };
  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <div><div className="label">Compte</div><h1 className="text-2xl font-bold">{user?.email}</h1></div>
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between"><span>Plan</span><b className="capitalize">{plan}</b></div>
        <div className="flex items-center justify-between"><span>Crédits IA</span><b className="font-mono">{credits}</b></div>
        {plan === 'free' ? <Link to="/pricing" className="btn-primary justify-center">Passer à Pro</Link> : <button onClick={portal} className="btn-outline justify-center">Gérer l'abonnement · factures</button>}
      </div>
      <div className="card space-y-3 p-5">
        <button onClick={exportJson} className="btn-outline w-full justify-center">Exporter ma progression (JSON)</button>
        <button onClick={() => signOut()} className="btn-outline w-full justify-center">Se déconnecter</button>
        <button onClick={remove} className="w-full text-xs text-signal-600 hover:underline">Supprimer mon compte</button>
      </div>
    </div>
  );
}
