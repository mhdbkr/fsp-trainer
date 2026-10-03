import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { listAccounts, getActiveUserId, forgetAccount, initials, setActiveUserId, ACCOUNT_DOT as DOT } from '@/lib/auth/accounts';
import { switchAccount, signOut } from '@/lib/auth/session';
import { deleteAccountDb } from '@/db/db';
import { restartApp } from '@/lib/auth/restart';
import { Icon } from '@/components/icons';
import { Portal } from './Portal';

// Bascule de compte sans login (mode fondateur). Basculer recharge l'app :
// la base Dexie et tous les stores repartent propres pour l'autre personne.

const toGate = () => { setActiveUserId(null); restartApp(); };

/** Oublier sur cet appareil : session locale fermée si c'était le compte
 *  actif (sinon `sb-*-auth-token` resterait valide), registre, base locale.
 *  Les données restent sur le serveur. */
export async function forgetAccountOnDevice(userId: string): Promise<void> {
  const wasActive = getActiveUserId() === userId;
  if (wasActive) await signOut();                            // founder : signOut({ scope: 'local' })
  forgetAccount(userId);
  await deleteAccountDb(userId);
  if (wasActive) restartApp();
}

/** Largeur du menu (px) : sert au calage dans le viewport. */
const W = 224;

export function AccountSwitcher({ dock = false }: { dock?: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const accounts = listAccounts();
  const activeId = getActiveUserId();
  const active = accounts.find((a) => a.userId === activeId);
  const others = accounts.filter((a) => a.userId !== activeId);

  useEffect(() => {
    if (!open) return;
    // Téléporté dans <body>, le menu est hors de l'ordre de tabulation du
    // déclencheur : sans ce focus, il était inatteignable au clavier.
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!active) return null;

  const go = async (userId: string) => {
    const r = await switchAccount(userId);
    if (r === 'switched') restartApp(); else toGate();   // la porte demandera le mot de passe
  };
  const out = async () => { await signOut(); restartApp(); };

  const avatar = <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${DOT[active.color] ?? 'bg-brand-500'}`}>{initials(active.displayName)}</span>;

  return (
    <div className="relative" ref={rootRef}>
      <button ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        aria-label={`Compte : ${active.displayName}`}
        className={dock ? 'grid h-11 w-11 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10' : 'btn-ghost w-full justify-center gap-2 md:justify-start'}>
        {avatar}{!dock && <span className="hidden md:inline">{active.displayName}</span>}
      </button>
      {/* Téléporté (Portal) et calé sur le déclencheur.
          Monté dans la barre, le menu était du verre DANS du verre (`aside.glass`,
          et le dock dont les tuiles sont transformées) : il n'y floutait pas, et
          à 390 px il débordait de l'écran et passait sous `main` (Re-revue 2, I-B). */}
      {open && (() => {
        const r = triggerRef.current?.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const left = Math.max(8, Math.min(r?.left ?? 0, vw - W - 8));
        // Au-dessus du déclencheur s'il est dans la moitié basse, sinon dessous.
        const place = r && r.top > vh / 2 ? { bottom: vh - r.top + 8 } : { top: (r?.bottom ?? 0) + 8 };
        return (
        <Portal>
        <div ref={menuRef} role="menu" style={{ position: 'fixed', left, width: W, ...place }} className="glass glass-edge z-[90] rounded-xl p-1">
          {others.map((a) => (
            <button key={a.userId} role="menuitem" onClick={() => go(a.userId)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>{a.displayName}
            </button>
          ))}
          <button role="menuitem" onClick={toGate} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="user" className="h-4 w-4" />Ajouter un compte</button>
          <NavLink role="menuitem" to="/account" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="user" className="h-4 w-4" />Mon compte</NavLink>
          <button role="menuitem" onClick={out} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Se déconnecter</button>
        </div>
        </Portal>
        );
      })()}
    </div>
  );
}
