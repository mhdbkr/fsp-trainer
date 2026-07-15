import { useState } from 'react';
import { useProfiles, PROFILE_COLORS, initials } from '@/store/profile';
import { Icon } from './icons';
import { Portal } from './Portal';

// ============================================================================
// Sélecteur de profil — chip dans la barre latérale (déployée ou dock) + menu
// (basculer · renommer · supprimer · nouveau). Le profil actif pilote stats,
// streak et programme dans toute l'app.
// ============================================================================

export function ProfileSwitcher({ variant = 'full' }: { variant?: 'full' | 'dock' }) {
  const { profiles, activeId, setActive, create, rename, remove } = useProfiles();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const active = profiles.find((p) => p.id === activeId);
  const col = PROFILE_COLORS[active?.color ?? 'petrol'] ?? PROFILE_COLORS.petrol;

  const openMenu = (e: React.MouseEvent) => { setRect(e.currentTarget.getBoundingClientRect()); setOpen(true); setEditId(null); setAdding(false); };
  const close = () => { setOpen(false); setEditId(null); setAdding(false); setDraft(''); };
  const startAdd = () => { setAdding(true); setEditId(null); setDraft(''); };
  const commitAdd = async () => { const id = await create(draft); await setActive(id); close(); };
  const commitRename = async (id: string) => { await rename(id, draft); setEditId(null); setDraft(''); };

  const Avatar = ({ p, size = 'h-7 w-7', text = 'text-[10px]' }: { p: typeof active; size?: string; text?: string }) => {
    const c = PROFILE_COLORS[p?.color ?? 'petrol'] ?? PROFILE_COLORS.petrol;
    return <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${size} ${text} ${c.dot}`}>{initials(p?.name ?? '?')}</span>;
  };

  // Menu positionné : au-dessus (barre déployée, footer) ou à droite (dock).
  const menuStyle: React.CSSProperties = rect
    ? variant === 'dock'
      ? { left: rect.right + 10, top: rect.top }
      : { left: rect.left, bottom: window.innerHeight - rect.top + 8 }
    : {};

  return (
    <>
      {variant === 'dock' ? (
        <button onClick={openMenu} title={`Profil : ${active?.name ?? ''}`}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ${col.soft} ${col.ring}`}>
          <Avatar p={active} size="h-7 w-7" text="text-[11px]" />
        </button>
      ) : (
        <button onClick={openMenu}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-left transition-colors hover:border-brand-300 dark:border-ink-600 dark:hover:border-brand-500/60">
          <Avatar p={active} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{active?.name ?? 'Profil'}</span>
            <span className="block font-mono text-[8px] uppercase tracking-[0.16em] text-slate-400">Profil actif</span>
          </span>
          <Icon name="chevron" className="h-3.5 w-3.5 shrink-0 -rotate-90 text-slate-400" />
        </button>
      )}

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[80]" onClick={close} />
          <div style={menuStyle} className="reveal fixed z-[81] w-60 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 p-1.5 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-white/10 dark:bg-ink-800/95">
            <div className="px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">Profils</div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {profiles.map((p) => {
                const c = PROFILE_COLORS[p.color] ?? PROFILE_COLORS.petrol;
                const on = p.id === activeId;
                if (editId === p.id) {
                  return (
                    <input key={p.id} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(p.id); if (e.key === 'Escape') setEditId(null); }}
                      onBlur={() => commitRename(p.id)} className="input mx-1 my-0.5 h-8 w-[calc(100%-0.5rem)] py-0 text-sm" />
                  );
                }
                return (
                  <div key={p.id} className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${on ? c.soft : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                    <button onClick={() => { setActive(p.id); close(); }} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white ${c.dot}`}>{initials(p.name)}</span>
                      <span className={`truncate text-sm font-medium ${on ? c.text : ''}`}>{p.name}</span>
                      {on && <Icon name="check" className={`ml-auto h-3.5 w-3.5 shrink-0 ${c.text}`} />}
                    </button>
                    <button onClick={() => { setEditId(p.id); setDraft(p.name); }} title="Renommer" className="hidden h-6 w-6 place-items-center rounded text-slate-400 hover:text-brand-600 group-hover:grid"><Icon name="pen" className="h-3.5 w-3.5" /></button>
                    {profiles.length > 1 && (
                      <button onClick={() => remove(p.id)} title="Supprimer ce profil et ses données" className="hidden h-6 w-6 place-items-center rounded text-slate-400 hover:text-rose-500 group-hover:grid"><Icon name="trash" className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 border-t border-slate-100 pt-1 dark:border-white/10">
              {adding ? (
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAdding(false); }}
                  placeholder="Nom du nouveau profil…" className="input mx-1 h-8 w-[calc(100%-0.5rem)] py-0 text-sm" />
              ) : (
                <button onClick={startAdd} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-white/5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-slate-300 text-sm leading-none dark:border-slate-600">+</span>
                  Nouveau profil
                </button>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
