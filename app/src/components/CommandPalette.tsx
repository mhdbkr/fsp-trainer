import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases, useFachwissenAll, useAufklaerungen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon, SpecialtyIcon } from '@/components/icons';
import { NAV } from './nav';

// ============================================================================
// Palette de commandes (⌘K / Ctrl+K) — la navigation « instrument » : un seul
// geste pour sauter vers n'importe quel module, cas clinique, simulation ou
// action, au clavier. Filtrage insensible aux accents, groupes, ↑↓ + ↵.
// ============================================================================

type Item = { id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void; group: string };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();
  const cases = useCases();
  const fachwissen = useFachwissenAll();
  const aufklaerungen = useAufklaerungen();
  const begriffe = useFachbegriffe();
  const toggleTheme = useUi((s) => s.toggleTheme);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const openGlossary = useUi((s) => s.openGlossary);
  const inputRef = useRef<HTMLInputElement>(null);

  // Raccourci global ⌘K / Ctrl+K (toggle) + Échap (fermer).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => { navigate(to); setOpen(false); };
    const mods: Item[] = NAV.map((n) => ({ id: `nav:${n.to}`, label: n.label, group: 'Modules', icon: <Icon name={n.icon} className="h-4 w-4" />, run: go(n.to) }));
    const actions: Item[] = [
      { id: 'a:drill', label: 'Lancer le drill Fachbegriffe', group: 'Actions', icon: <Icon name="nav-abc" className="h-4 w-4" />, run: go('/fachbegriffe/drill') },
      { id: 'a:theme', label: 'Basculer clair / sombre', group: 'Actions', icon: <Icon name="nav-moon" className="h-4 w-4" />, run: () => { toggleTheme(); setOpen(false); } },
      { id: 'a:sidebar', label: 'Basculer la barre latérale (immersion)', hint: '⌘B', group: 'Actions', icon: <Icon name="chevron" className="h-4 w-4" />, run: () => { toggleSidebar(); setOpen(false); } },
    ];
    const cs: Item[] = (cases ?? []).map((c) => ({ id: `cas:${c.id}`, label: c.name, hint: c.specialty, group: 'Cas cliniques', icon: <SpecialtyIcon specialty={c.specialty} className="h-4 w-4" />, run: go(`/cas/${c.id}`) }));
    const sims: Item[] = (cases ?? []).map((c) => ({ id: `sim:${c.id}`, label: `Simuler — ${c.name}`, hint: c.specialty, group: 'Simulations', icon: <Icon name="play" className="h-4 w-4" />, run: go(`/simulation/${c.id}/pre`) }));
    const fw: Item[] = (fachwissen ?? []).map((f) => ({ id: `fw:${f.id}`, label: f.pathology, hint: f.specialty, group: 'Fachwissen', icon: <SpecialtyIcon specialty={f.specialty} className="h-4 w-4" />, run: go(`/fachwissen/${f.id}`) }));
    const aufk: Item[] = (aufklaerungen ?? []).map((a) => ({ id: `auf:${a.id}`, label: a.shortName ?? a.name, hint: a.category, group: 'Aufklärung', icon: <Icon name="nav-clipboard" className="h-4 w-4" />, run: go(`/aufklaerung?open=${a.id}`) }));
    const guides: Item[] = [
      { t: 'Anamnese', id: 'guide-anamnese-v4' }, { t: 'Arztbrief', id: 'guide-arztbrief' },
      { t: 'Fallvorstellung', id: 'guide-fallvorstellung' }, { t: 'Kommunikation', id: 'guide-kommunikation' },
    ].map((g) => ({ id: `g:${g.id}`, label: `Guide — ${g.t}`, group: 'Guides', icon: <Icon name="nav-compass" className="h-4 w-4" />, run: go(`/guides?open=${g.id}`) }));
    // Fachbegriffe : ouvre directement le glossaire (définition + prononciation).
    const terms: Item[] = (begriffe ?? []).map((t) => ({ id: `fb:${t.id}`, label: t.term, hint: t.translationSimple?.slice(0, 30), group: 'Fachbegriffe', icon: <Icon name="nav-abc" className="h-4 w-4" />, run: () => { openGlossary(t); setOpen(false); } }));
    return [...mods, ...actions, ...cs, ...sims, ...fw, ...aufk, ...guides, ...terms];
  }, [cases, fachwissen, aufklaerungen, begriffe, navigate, toggleTheme, toggleSidebar, openGlossary]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items.filter((i) => i.group === 'Modules' || i.group === 'Actions');
    // Multi-mots : chaque token doit matcher (label, hint ou groupe) — « guide arzt » → Guide — Arztbrief.
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      const hay = norm(`${i.label} ${i.hint ?? ''} ${i.group}`);
      return tokens.every((t) => hay.includes(t));
    }).slice(0, 14);
  }, [q, items]);

  useEffect(() => setSel(0), [q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter' && filtered[sel]) filtered[sel].run();
  };

  if (!open) return null;
  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[70] bg-ink/50 p-4 pt-[14vh] backdrop-blur-sm" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Palette de commandes">
      <div onClick={(e) => e.stopPropagation()} className="glass glass-edge reveal mx-auto w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 dark:border-ink-600">
          <Icon name="search" className="h-4 w-4 shrink-0 text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Aller à… (module, cas, action)" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          <span className="kbd">esc</span>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">Rien trouvé — essaie un nom de cas ou de module.</p>}
          {filtered.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null; lastGroup = it.group;
            return (
              <div key={it.id}>
                {header && <div className="label px-2.5 pb-1 pt-2.5">{header}</div>}
                <button onClick={it.run} onMouseEnter={() => setSel(i)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${i === sel ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-100' : 'text-slate-600 dark:text-slate-300'}`}>
                  <span className={`shrink-0 ${i === sel ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400'}`}>{it.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="shrink-0 text-[11px] text-slate-400">{it.hint}</span>}
                  {i === sel && <span className="kbd">↵</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-[10px] font-semibold text-slate-400 dark:border-ink-600">
          <span className="flex items-center gap-1"><span className="kbd">↑↓</span> naviguer</span>
          <span className="flex items-center gap-1"><span className="kbd">↵</span> ouvrir</span>
          <span className="ml-auto">FSP·Cockpit</span>
        </div>
      </div>
    </div>
  );
}
