import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useFachbegriffe, useFavorites } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { termsOfCase } from '@/lib/collections/caseTerms';
import { toggleFavorite } from '@/lib/collections';
import { counts } from '@/lib/stats';
import { SRS_TONE } from '@/lib/srsTone';
import { Icon } from '@/components/icons';

// Termes du cas (liés ∪ marqués pendant ce cas), ordre publié : diagnostic →
// spécifiques → contextuels. Référence LIBRE (F2a D6) : n'écrit ni résultat ni
// assistance. Partagé par le runner (tiroir) et la page du cas (inline).
interface Props { caseId: string; mode: 'drawer' | 'inline'; onClose?: () => void; onDrill: () => void }
export function CaseTermsPanel({ caseId, mode, onClose, onDrill }: Props) {
  const begriffe = useFachbegriffe(); const favorites = useFavorites();
  const theCase = useLiveQuery(() => db.cases.get(caseId), [caseId]);
  const events = useLiveQuery(() => db.progress_events.where('type').anyOf(['term.favorited', 'deck.term_added']).toArray(), []);
  const openGlossary = useUi((s) => s.openGlossary);
  const [q, setQ] = useState('');
  const terms = useMemo(() => (begriffe && theCase ? termsOfCase(caseId, begriffe, theCase, events ?? []) : []), [begriffe, theCase, events, caseId]);
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return n ? terms.filter((t) => `${t.term} ${t.translationSimple}`.toLowerCase().includes(n)) : terms; }, [terms, q]);
  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.termId)), [favorites]);
  const c = counts(terms);
  // Tiroir (runner) : vrai dialogue — Échap ferme, le focus entre dans le
  // panneau à l'ouverture et revient au déclencheur (chip) à la fermeture.
  const asideRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose; // le runner se rend à 1 Hz : pas de re-focus à chaque tick
  const drawer = mode === 'drawer';
  useEffect(() => {
    if (!drawer) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    asideRef.current?.focus();
    // Une carte Fachbegriff ouverte par-dessus prend Échap en premier.
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !useUi.getState().glossaryTerm) onCloseRef.current?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); opener?.focus(); };
  }, [drawer]);
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 p-3">
        <div><div className="label">Fachbegriffe du cas ({terms.length})</div><div className="text-xs text-slate-500">{c.due} dus · {c.fresh} nouveaux</div></div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onDrill} className="btn-primary min-h-11 gap-1.5 text-sm"><Icon name="nav-abc" className="h-4 w-4" />Drill ces termes</button>
          {onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="btn-ghost min-h-11 min-w-11 justify-center">✕</button>}
        </div>
      </div>
      <div className="px-3 pb-2"><input type="search" role="searchbox" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="input w-full" /></div>
      <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {shown.map((t) => { const fav = favSet.has(t.id); const tone = SRS_TONE[t.srs.state]; return (
          <li key={t.id} className="flex min-h-11 items-center gap-2 px-2">
            <button type="button" onClick={() => openGlossary(t)} className="flex min-w-0 flex-1 flex-col items-start px-2 text-left"><span className="truncate font-semibold text-brand-700 dark:text-brand-300">{t.term}</span><span className="truncate text-xs text-slate-500">{t.translationSimple}</span></button>
            <span role="img" aria-label={t.srs.state} className={`chip shrink-0 ${tone.chip}`}>{t.srs.state === 'Zu wiederholen' ? '↻' : t.srs.state[0]}</span>
            <button type="button" aria-pressed={fav} aria-label={fav ? `Retirer des favoris : ${t.term}` : `Ajouter aux favoris : ${t.term}`} onClick={() => { void toggleFavorite(t.id, { caseId }); }} className={`h-11 w-11 shrink-0 text-lg ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
          </li>); })}
        {shown.length === 0 && <li className="p-4 text-sm text-slate-500">Aucun terme.</li>}
      </ul>
    </>
  );
  if (mode === 'inline') return <div className="card flex max-h-[60vh] flex-col p-0">{body}</div>;
  return (<>
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
    <aside ref={asideRef} role="dialog" aria-modal="true" aria-label="Fachbegriffe du cas" tabIndex={-1} className="glass glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col outline-none">{body}</aside>
  </>);
}
