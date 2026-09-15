import { useSyncStatus } from '@/lib/sync/queue';
import { useSession } from '@/lib/auth/session';
/** Pastille discrète : hors ligne · en attente · synchronisé. Rien si invité. */
export function SyncBadge() {
  const { pending, online } = useSyncStatus();
  const authed = useSession((s) => s.status === 'authenticated');
  if (!authed) return null;
  const label = !online ? 'Hors ligne' : pending > 0 ? `${pending} à synchroniser` : 'Synchronisé';
  const dot = !online ? 'bg-slate-400' : pending > 0 ? 'bg-amber-400' : 'bg-emerald-500';
  return <span className="label flex items-center gap-1.5 text-slate-400" title={label}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</span>;
}
