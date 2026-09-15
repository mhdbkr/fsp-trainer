import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/auth/session';
import { getMeta, setMeta } from '@/db/db';
import { buildMatrix, has as hasIn, limit as limitIn, type Matrix, type PlanId } from './matrix';

interface EntState { plan: PlanId; matrix: Matrix; credits: number; loaded: boolean }
const store = create<EntState>(() => ({ plan: 'free', matrix: {}, credits: 0, loaded: false }));

/** Charge la matrice publique, le plan effectif et le solde ; met en cache dans meta. */
export async function loadEntitlements(): Promise<void> {
  const cached = await getMeta<EntState | null>('entitlements', null);
  if (cached) store.setState({ ...cached, loaded: true });
  try {
    const { data: rows } = await supabase.from('entitlements').select('plan_id, feature, limit_value');
    const matrix = rows ? buildMatrix(rows) : store.getState().matrix;
    const uid = useSession.getState().user?.id;
    let plan: PlanId = 'free', credits = 0;
    if (uid) {
      // Wrappers sans argument : agissent uniquement sur auth.uid() (les
      // fonctions paramétrées sont révoquées côté client — revue Tasks 2-3).
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.rpc('my_plan'),
        supabase.rpc('my_credits'),
      ]);
      plan = (p as PlanId) ?? 'free'; credits = (c as number) ?? 0;
    }
    const next = { plan, matrix, credits, loaded: true };
    const prevPlan = store.getState().plan;
    store.setState(next);
    // Changement de plan (paiement, résiliation) → le contenu autorisé change : resync.
    if (next.plan !== prevPlan) { const { contentLoader } = await import('@/lib/content/loader'); void contentLoader.sync(); }
    await setMeta('entitlements', next);
  } catch { /* hors ligne : on garde le cache */ }
}

/** Realtime : se rafraîchit quand l'abonnement ou le ledger de l'utilisateur change. */
export function watchEntitlements(): () => void {
  const uid = useSession.getState().user?.id;
  if (!uid) return () => {};
  const ch = supabase.channel(`ent-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${uid}` }, () => loadEntitlements())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'credit_ledger', filter: `user_id=eq.${uid}` }, () => loadEntitlements())
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export function useEntitlements() {
  const s = store();
  return {
    plan: s.plan, credits: s.credits, loaded: s.loaded,
    has: (feature: string) => hasIn(s.matrix, s.plan, feature),
    limit: (feature: string) => limitIn(s.matrix, s.plan, feature),
    refresh: loadEntitlements,
  };
}
export const getEntitlements = () => ({ ...store.getState(), has: (f: string) => hasIn(store.getState().matrix, store.getState().plan, f), limit: (f: string) => limitIn(store.getState().matrix, store.getState().plan, f) });
