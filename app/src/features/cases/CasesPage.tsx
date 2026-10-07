import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCases } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import type { Case, CaseProgress, Center, Specialty } from '@/db/types';
import { CenterBadge, FreqBadge, DifficultyDots, EmptyState } from '@/components/ui';
import { useCaseProgress } from '@/features/program/useProgram';
import { blankProgress } from '@/lib/journal';
import { OVERALL, nonMesureSeulement, progressRank } from './CaseProgressView';
import { CaseDial } from '@/components/visuals/CaseDial';
import { actionSuivante, lienAction } from '@/components/visuals/CaseDialText';
import { dialDeCarte, useDerniereVisite, vientDeSouder } from './dialCarte';
import { Icon, SpecialtyIcon } from '@/components/icons';
import { CasePreviewPanel } from './CasePreviewPanel';

const CENTERS: Center[] = ['Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart', 'Complément'];
const OVERALLS = Object.keys(OVERALL) as CaseProgress['overall'][];
type SortKey = 'frequency' | 'alpha' | 'specialty' | 'progress';

export function CasesPage() {
  const cases = useCases();
  const progress = useCaseProgress();
  const cpOf = (c: Case) => progress?.get(c.id) ?? blankProgress(c.id);
  const { openCasePreview, previewCaseId } = useUi();
  const [params, setParams] = useSearchParams();
  const visite = useDerniereVisite();
  const apercu = useCallback((id: string) => openCasePreview(id), [openCasePreview]);     // stable : la carte mémoïsée ne se rerend pas à chaque frappe       // S4-4 : l'arc d'un Teil joué depuis se dessine une fois

  const [q, setQ] = useState('');
  const [center, setCenter] = useState<Center | ''>('');
  const [specialty, setSpecialty] = useState<Specialty | ''>((params.get('specialty') as Specialty) || '');
  const [status, setStatus] = useState<CaseProgress['overall'] | ''>('');
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
      if (status && cpOf(c).overall !== status) return false;
      if (c.frequency < minFreq) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'frequency': return b.frequency - a.frequency;
        case 'alpha': return a.name.localeCompare(b.name);
        case 'specialty': return a.specialty.localeCompare(b.specialty) || b.frequency - a.frequency;
        case 'progress': return progressRank(cpOf(a)) - progressRank(cpOf(b)) || b.frequency - a.frequency;
      }
    });
    return list;
  }, [cases, progress, q, center, specialty, status, minFreq, sort]);

  if (!cases || !progress) return <div className="text-slate-400">Chargement…</div>;

  const total = cases.length;
  const solides = cases.filter((c) => cpOf(c).overall === 'solide').length;
  const nonMesures = cases.filter((c) => nonMesureSeulement(cpOf(c))).length;
  const vierges = cases.filter((c) => cpOf(c).overall === 'vierge').length - nonMesures;
  const bySpecialty = specialties.map((sp) => ({ sp, n: cases.filter((c) => c.specialty === sp).length }));

  const clearSpecialty = () => { setSpecialty(''); params.delete('specialty'); setParams(params); };

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">Bibliothèque</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Cas cliniques</h1>
        <p className="text-slate-500 dark:text-slate-400">
          <b>{total}</b> cas · <b className="text-brand-600 dark:text-brand-300">{solides}</b> solides · <b>{vierges}</b> pas encore travaillés{nonMesures > 0 && <> · <b>{nonMesures}</b> fait{nonMesures > 1 ? 's' : ''} — non mesuré{nonMesures > 1 ? 's' : ''}</>}
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
          <label className="label">Progression</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as never)} className="input mt-1">
            <option value="">Tous</option>
            {OVERALLS.map((s) => <option key={s} value={s}>{OVERALL[s].label}</option>)}
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
            <option value="progress">Progression (moins avancés d'abord)</option>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} c={c} cp={cpOf(c)} visite={visite} onPreview={apercu} active={previewCaseId === c.id} />
          ))}
        </div>
      )}

      {/* Panneau d'aperçu latéral */}
      <CasePreviewPanel />
    </div>
  );
}

// m4 : 130 cartes et une frappe dans le filtre — la carte ne se rerend que si SA donnée change.
const CaseCard = memo(function CaseCard({ c, cp, visite, onPreview, active }: { c: Case; cp: CaseProgress; visite: number | null; onPreview: (id: string) => void; active: boolean }) {
  const ouvrir = () => onPreview(c.id);
  const dial = dialDeCarte(cp, visite);
  const suite = actionSuivante(dial);        // UN bouton principal : la suite que le cadran propose
  return (
    <div className={`card flex min-w-0 flex-col p-4 transition-all hover:shadow-md ${active ? 'ring-2 ring-brand-400' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={ouvrir} className="flex min-w-0 items-start gap-2.5 text-left">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
            <SpecialtyIcon specialty={c.specialty} className="h-5 w-5" />
          </span>
          {/* Titre et spécialité en allemand dans une interface française : `lang="de"` pour la césure
              (« Wortfindungsstörungen »), `break-words` en secours si le moteur n'a pas le dictionnaire. */}
          <span lang="de" className="min-w-0 hyphens-auto break-words">
            <h3 className="font-semibold leading-tight hover:text-brand-600 dark:hover:text-brand-300">{c.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{c.specialty}</p>
          </span>
        </button>
        <CaseDial data={dial} size={64} nom={c.name} action={false} vientDeSouder={vientDeSouder(dial, visite)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <FreqBadge n={c.frequency} />
      </div>
      <div className="mb-4 mt-2 flex flex-wrap items-center gap-1">
        {c.centers.slice(0, 4).map((ct) => <CenterBadge key={ct} center={ct} />)}
        {/* Loin du cadran : trois points près de lui se lisent « 2 Teile sur 3 ». */}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-slate-400">Difficulté <DifficultyDots level={c.difficulty} /></span>
      </div>
      <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Link to={lienAction(dial)} className="btn-primary flex-1 justify-center gap-1 text-center text-xs leading-tight"><Icon name="play" className="h-3 w-3 shrink-0" />{suite.label}</Link>
        <button onClick={ouvrir} className="btn-outline text-xs">Aperçu</button>
        <Link to={`/cas/${c.id}`} className="btn-ghost text-xs">Fiche</Link>
      </div>
    </div>
  );
});
