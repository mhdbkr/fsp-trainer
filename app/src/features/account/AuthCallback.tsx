import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return <div className="py-12 text-center text-slate-400">Connexion…</div>;
}
