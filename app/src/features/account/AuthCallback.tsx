import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase';
import { loadEntitlements } from '@/lib/entitlements';

/** Cible du lien magique / OAuth : attend la session, puis route vers l'onboarding si le profil est incomplet. */
export function AuthCallback() {
  const nav = useNavigate();
  const status = useSession((s) => s.status);
  const uid = useSession((s) => s.user?.id);
  useEffect(() => {
    if (status !== 'authenticated' || !uid) return;
    (async () => {
      await loadEntitlements();
      const { data } = await supabase.from('profiles').select('target_land, language_level, procedure_stage').eq('id', uid).single();
      const complete = !!(data?.target_land && data?.language_level && data?.procedure_stage);
      nav(complete ? '/' : '/onboarding', { replace: true });
    })();
  }, [status, uid, nav]);

  // Échange refusé (lien expiré — ils valent une heure et servent une fois —,
  // lien ouvert dans un autre navigateur que celui qui l'a demandé, réseau) :
  // la session est retombée en `anonymous`. Sans cette branche l'utilisateur
  // resterait sur « Connexion… » sans issue.
  if (status === 'anonymous') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <div className="label">Connexion</div>
        <h1 className="text-xl font-bold">Ce lien n'est plus valable</h1>
        <p className="text-sm text-slate-500">Un lien de connexion sert une seule fois et expire après une heure. Il doit aussi être ouvert dans le navigateur qui l'a demandé.</p>
        <Link to="/signin" className="btn-primary inline-flex justify-center">Recevoir un nouveau lien</Link>
      </div>
    );
  }
  return <div className="py-12 text-center text-slate-400">Connexion…</div>;
}
