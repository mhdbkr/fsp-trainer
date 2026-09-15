import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, getMeta } from '@/db/db';
import { useSession } from '@/lib/auth/session';
import { migrateLocalProgress, isDemoSimulation } from '@/lib/sync/migrateLocal';

/** Au premier lancement après mise à jour : propose de reprendre la progression locale dans le compte. */
export function MigrationPrompt() {
  const nav = useNavigate();
  const status = useSession((s) => s.status); const uid = useSession((s) => s.user?.id);
  const [show, setShow] = useState(false); const [count, setCount] = useState(0);
  useEffect(() => { (async () => {
    if (await getMeta('migratedLocal', false) || await getMeta('migrationDismissed', false)) return;
    // Seules les VRAIES simulations comptent — un invité neuf n'a que les démos et n'a rien à reprendre.
    const n = (await db.simulations.toArray()).filter((x) => !isDemoSimulation(x.id)).length; setCount(n); setShow(n > 0);
  })(); }, []);
  if (!show) return null;
  const accept = async () => { if (status === 'authenticated' && uid) { await migrateLocalProgress(uid); setShow(false); } else nav('/signin'); };
  const later = async () => { await db.meta.put({ key: 'migrationDismissed', value: true }); setShow(false); };
  return (
    <div className="card mb-4 flex items-center justify-between gap-4 border-brand-300 p-4">
      <div><div className="font-semibold">Reprendre ta progression</div><div className="text-sm text-slate-500">{count} simulation{count > 1 ? 's' : ''} sur cet appareil. Crée ton compte pour les retrouver partout.</div></div>
      <div className="flex gap-2"><button onClick={later} className="btn-outline">Plus tard</button><button onClick={accept} className="btn-primary">{status === 'authenticated' ? 'Reprendre' : 'Créer mon compte'}</button></div>
    </div>
  );
}
