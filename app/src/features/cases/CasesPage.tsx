import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCases } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import type { Case, Center, Specialty, CaseStatus } from '@/db/types';
import { CenterBadge, StatusBadge, FreqBadge, DifficultyDots, ConfidenceRing, EmptyState } from '@/components/ui';
import { Icon, SpecialtyIcon } from '@/components/icons';
import { CasePreviewPanel } from './CasePreviewPanel';

const CENTERS: Center[] = ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart', 'Complément'];
const STATUSES: CaseStatus[] = ['À faire', 'En cours', 'Maîtrisé'];
type SortKey = 'frequency' | 'alpha' | 'specialty' | 'confidence';

export function CasesPage() {
  const cases = useCases();
  const { openCasePreview, previewCaseId } = useUi();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState('');
  const [center, setCenter] = useState<Center | ''>('');
  const [specialty, setSpecialty] = useState<Specialty | ''>((params.get('specialty') as Specialty) || '');
  const [status, setStatus] = useState<CaseStatus | ''>('');
  const [minFreq, setMinFreq] = useState(0);
  const [sort, setSort] = useState<SortKey>('frequency');

  useEffect(() => {
    const sp = params.get('specialty');
    if (sp) setSpecialty(sp as Specialty);
  }, [params]);

  const specialties = useMemo(
    () => [...new Set((cases ?? []).map((c) => c.specialty))].sort(),
    [cases],
  );

  const filtered = useMemo(() => {
    let list = (cases ?? []).filter((c) => {
      if (q && !`${c.name} ${c.pathology}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (center && !c.centers.includes(center)) return false;
      if (specialty && c.specialty !== specialty) return false;
      if (status && c.status !== status) return false;
      if (c.frequency < minFreq) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'frequency': return b.frequency - a.frequency;
        case 'alpha': return a.name.localeCompare(b.name);
        case 'specialty': return a.specialty.localeCompare(b.specialty) || b.frequency - a.frequency;
        case 'confidence': return a.confidence - b.confidence;
      }
    });
    return list;
  }, [cases, q, center, specialty, status, minFreq, sort]);

  if (!cases) return <div className="text-slate-400">Chargement…</div>;

  const total = cases.length;
  const mastered = cases.filter((c) => c.status === 'Maîtrisé').length;
  const todo = cases.filter((c) => c.status === 'À faire').length;
  const bySpecialty = specialties.map((sp) => ({ sp, n: cases.filter((c) => c.specialty === sp).length }));

  const clearSpecialty = () => { setSpecialty(''); params.delete('specialty'); setParams(params); };

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">Bibliothèque</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Cas cliniques</h1>
        <p className="text-slate-500 dark:text-slate-400">
          <b>{total}</b> cas · <b className="text-emerald-600 dark:text-emerald-400">{mastered}</b> maîtrisés · <b>{todo}</b> à faire
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {bySpecialty.map(({ sp, n }) => (
            <button key={sp} onClick={() => setSpecialty(specialty === sp ? '' : sp)} className={`chip py-1 ${specialty === sp ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
              <SpecialtyIcon specialty={sp} className="h-3.5 w-3.5" />{sp} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Filtres */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label">Recherche</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pathologie, nom…" className="input mt-1" />
        </div>
        <div>
          <label className="label">Centre</label>
          <select value={center} onChange={(e) => setCenter(e.target.value as never)} className="input mt-1">
            <option value="">Tous</option>
            {CENTERS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as never)} className="input mt-1">
            <option value="">Tous</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Fréquence min. ({minFreq})</label>
          <input type="range" min={0} max={26} value={minFreq} onChange={(e) => setMinFreq(+e.target.value)} className="mt-2 w-32 accent-brand-600" />
        </div>
        <div>
          <label className="label">Tri</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input mt-1">
            <option value="frequency">Fréquence</option>
            <option value="alpha">Alphabétique</option>
            <option value="specialty">Spécialité</option>
            <option value="confidence">Confiance (faible→fort)</option>
          </select>
        </div>
        {(specialty || center || status || q || minFreq > 0) && (
          <button onClick={() => { setQ(''); setCenter(''); clearSpecialty(); setStatus(''); setMinFreq(0); }} className="btn-ghost text-xs">
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Grille de cartes */}
      {filtered.length === 0 ? (
        <EmptyState title="Aucun cas ne correspond" hint="Élargis les filtres." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} c={c} onPreview={() => openCasePreview(c.id)} active={previewCaseId === c.id} />
          ))}
        </div>
      )}

      {/* Panneau d'aperçu latéral */}
      <CasePreviewPanel />
    </div>
  );
}

function CaseCard({ c, onPreview, active }: { c: Case; onPreview: () => void; active: boolean }) {
  return (
    <div className={`card flex flex-col p-4 transition-all hover:shadow-md ${active ? 'ring-2 ring-brand-400' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={onPreview} className="flex items-start gap-2.5 text-left">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <SpecialtyIcon specialty={c.specialty} className="h-5 w-5" />
          </span>
          <span>
            <h3 className="font-semibold leading-tight hover:text-brand-600 dark:hover:text-brand-300">{c.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{c.specialty}</p>
          </span>
        </button>
        <ConfidenceRing pct={c.confidence} size={40} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <FreqBadge n={c.frequency} />
        <StatusBadge status={c.status} />
        <DifficultyDots level={c.difficulty} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {c.centers.slice(0, 4).map((ct) => <CenterBadge key={ct} center={ct} />)}
      </div>
      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Link to={`/simulation/${c.id}/pre`} className="btn-primary flex-1 justify-center gap-1 text-xs"><Icon name="play" className="h-3 w-3" />Simuler</Link>
        <button onClick={onPreview} className="btn-outline text-xs">Aperçu</button>
        <Link to={`/cas/${c.id}`} className="btn-ghost text-xs">Fiche</Link>
      </div>
    </div>
  );
}
