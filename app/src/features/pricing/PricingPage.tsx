import { callFn } from '@/lib/supabase';
import { useSession } from '@/lib/auth/session';
import { useEntitlements } from '@/lib/entitlements';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  { id: 'free', name: 'Free', price: '0 €', lines: ['12 cas cliniques', 'Glossaire complet', 'Simulations locales illimitées'] },
  { id: 'pro', name: 'Pro', price: '— €/mois', lines: ['Tous les cas', 'Binôme en ligne', 'Ligue', '200 crédits IA / mois'] },
  { id: 'premium', name: 'Premium', price: '— €/mois', lines: ['Tout Pro', '1 000 crédits IA / mois', 'Patient vocal (bientôt)'] },
] as const;

export function PricingPage() {
  const nav = useNavigate(); const authed = useSession((s) => s.status === 'authenticated'); const { plan } = useEntitlements();
  const buy = async (id: 'pro' | 'premium') => {
    if (!authed) return nav('/signin');
    const { url } = await callFn<{ url: string }>('checkout', { plan: id, returnUrl: window.location.origin + import.meta.env.BASE_URL });
    window.location.href = url;
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div><div className="label">Tarifs</div><h1 className="text-2xl font-bold">Choisis ton rythme</h1></div>
      <div className="grid gap-4 md:grid-cols-3">{PLANS.map((p) => (
        <div key={p.id} className={`card flex flex-col p-5 ${plan === p.id ? 'border-brand-500' : ''}`}>
          <div className="text-lg font-bold">{p.name}</div><div className="font-display text-3xl">{p.price}</div>
          <ul className="my-4 flex-1 space-y-1 text-sm text-slate-600">{p.lines.map((l) => <li key={l}>· {l}</li>)}</ul>
          {p.id === 'free' ? <span className="text-xs text-slate-400">{plan === 'free' ? 'Ton plan actuel' : ''}</span>
            : plan === p.id ? <span className="btn-outline justify-center">Ton plan actuel</span>
            : <button onClick={() => buy(p.id)} className="btn-primary justify-center">Choisir {p.name}</button>}
        </div>))}</div>
      <p className="text-xs text-slate-400">Résiliable à tout moment depuis ton compte. Les prix affichés seront fixés avant le lancement.</p>
    </div>
  );
}
