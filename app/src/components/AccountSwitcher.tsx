import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { listAccounts, getActiveUserId, forgetAccount, initials, setActiveUserId } from '@/lib/auth/accounts';
import { switchAccount, signOut } from '@/lib/auth/session';
import { deleteAccountDb } from '@/db/db';
import { Icon } from '@/components/icons';

// Bascule de compte sans login (mode fondateur). Basculer recharge l'app :
// la base Dexie et tous les stores repartent propres pour l'autre personne.

const DOT: Record<string, string> = {
  petrol: 'bg-brand-500', coral: 'bg-signal-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', emerald: 'bg-emerald-500', sky: 'bg-sky-500', violet: 'bg-violet-500',
};

const toGate = () => { setActiveUserId(null); location.reload(); };

/** Oublier sur cet appareil : registre + base locale. Les données restent sur le serveur. */
export async function forgetAccountOnDevice(userId: string): Promise<void> {
  const wasActive = getActiveUserId() === userId;
  forgetAccount(userId);
  await deleteAccountDb(userId);
  if (wasActive) location.reload();
}

export function AccountSwitcher({ dock = false }: { dock?: boolean }) {
  const [open, setOpen] = useState(false);
  const accounts = listAccounts();
  const activeId = getActiveUserId();
  const active = accounts.find((a) => a.userId === activeId);
  if (!active) return null;
  const others = accounts.filter((a) => a.userId !== activeId);

  const go = async (userId: string) => {
    const r = await switchAccount(userId);
    if (r === 'switched') location.reload(); else toGate();   // la porte demandera le mot de passe
  };
  const out = async () => { await signOut(); location.reload(); };

  const avatar = <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${DOT[active.color] ?? 'bg-brand-500'}`}>{initials(active.displayName)}</span>;

  return (
    <div className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={dock ? 'grid h-11 w-11 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10' : 'btn-ghost w-full justify-center gap-2 md:justify-start'}>
        {avatar}{!dock && <span className="hidden md:inline">{active.displayName}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {others.map((a) => (
            <button key={a.userId} role="menuitem" onClick={() => go(a.userId)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>{a.displayName}
            </button>
          ))}
          <button role="menuitem" onClick={toGate} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="user" className="h-4 w-4" />Ajouter un compte</button>
          <NavLink role="menuitem" to="/account" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="user" className="h-4 w-4" />Mon compte</NavLink>
          <button role="menuitem" onClick={out} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Se déconnecter</button>
        </div>
      )}
    </div>
  );
}
