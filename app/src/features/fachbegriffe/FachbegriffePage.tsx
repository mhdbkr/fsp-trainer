import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFachbegriffe } from '@/hooks/useData';
import { Icon } from '@/components/icons';
import { useUi } from '@/store/ui';
import { dueCount } from '@/lib/stats';
import type { Specialty, Srs } from '@/db/types';
import { EmptyState } from '@/components/ui';

const STATE_COLORS: Record<Srs['state'], string> = {
  Neu: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Gelernt: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'Zu wiederholen': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export function FachbegriffePage() {
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState<Specialty | ''>('');
  const [state, setState] = useState<Srs['state'] | ''>('');

  const specialties = useMemo(() => [...new Set((begriffe ?? []).map((b) => b.specialty))].sort(), [begriffe]);
  if (!begriffe) return <div className="text-slate-400">Chargement…</div>;

  const filtered = begriffe.filter((b) => {
    if (q && !`${b.term} ${b.translationSimple}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (specialty && b.specialty !== specialty) return false;
    if (state && b.srs.state !== state) return false;
    return true;
  });
  const due = dueCount(begriffe);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Vocabulaire</div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Fachbegriffe</h1>
          <p className="text-slate-500 dark:text-slate-400">{begriffe.length} termes · <b className="text-amber-600 dark:text-amber-400">{due}</b> dus aujourd'hui · répétition espacée native (SM-2)</p>
        </div>
        <Link to="/fachbegriffe/drill" className="btn-primary gap-1.5"><Icon name="nav-abc" className="h-4 w-4" />Lancer le drill{due > 0 ? ` (${due})` : ''}</Link>
      </header>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">Recherche</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Terme, traduction…" className="input mt-1" />
        </div>
        <div>
          <label className="label">Spécialité</label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value as never)} className="input mt-1">
            <option value="">Toutes</option>
            {specialties.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">État</label>
          <select value={state} onChange={(e) => setState(e.target.value as never)} className="input mt-1">
            <option value="">Tous</option>
            <option>Neu</option><option>Gelernt</option><option>Zu wiederholen</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="nav-abc" title="Aucun terme" />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <button key={b.id} onClick={() => openGlossary(b)} className="card p-3 text-left transition-all hover:border-brand-400">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-brand-700 dark:text-brand-300">{b.term}</span>
                <span className={`chip ${STATE_COLORS[b.srs.state]}`}>{b.srs.state === 'Zu wiederholen' ? '↻' : b.srs.state[0]}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{b.translationSimple}</p>
              <div className="mt-1 text-[10px] text-slate-400">{b.specialty}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
