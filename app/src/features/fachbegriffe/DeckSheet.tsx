import { useEffect, useMemo, useRef, useState } from 'react';
import type { DeckQuery, Specialty, Srs, Center } from '@/db/types';
import { createDeck } from '@/lib/collections';
import { useAllTerms } from '@/hooks/useData';
import { trapFocus } from '@/lib/trapFocus';

interface Props { initialQuery?: DeckQuery; onClose: (createdId?: string) => void }
const STATES: Srs['state'][] = ['Neu', 'Gelernt', 'Zu wiederholen'];

/** Feuille de création d'un deck : nom, type, filtres. Ouverte par « Nouveau deck »
 *  du tiroir de gestion (DeckManager, seule entrée de création) ; renommer et
 *  supprimer y vivent aussi. Au-dessus du tiroir (z-70) ; rend le focus à l'ouvreur. */
export function DeckSheet({ initialQuery, onClose }: Props) {
  const begriffe = useAllTerms();
  const specialties = useMemo(() => [...new Set((begriffe ?? []).map((b) => b.specialty))].filter(Boolean).sort() as Specialty[], [begriffe]);
  const centers = useMemo(() => [...new Set((begriffe ?? []).flatMap((b) => b.centers))].sort() as Center[], [begriffe]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'manual' | 'smart'>('manual');
  const [query, setQuery] = useState<DeckQuery>(initialQuery ?? {});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof DeckQuery, v: string) => setQuery((q) => ({ ...q, [k]: v || undefined }));

  const formRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try { onClose(await createDeck(name, kind, kind === 'smart' ? query : undefined)); }
    catch (err) { setError((err as Error).message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : (err as Error).message); }
  };

  return (
    <>
      <div className="fixed inset-0 z-[65] bg-slate-900/20" onClick={() => onClose()} />
      <form ref={formRef} onKeyDown={(e) => trapFocus(e, formRef.current)} onSubmit={submit} role="dialog" aria-modal="true" aria-label="Nouveau deck" className="glass-full fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-w-md flex-col gap-4 rounded-t-2xl px-5 pb-5 pt-4 sm:inset-auto sm:left-1/2 sm:top-1/3 sm:w-full sm:-translate-x-1/2 sm:rounded-2xl">
        <h2 className="sheet-title">Nouveau deck</h2>
        <label className="block"><span className="field-label">Nom du deck</span><input aria-label="Nom du deck" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field-line text-[15px]" autoFocus /></label>
        <div role="radiogroup" aria-label="Type" className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'manual'} onChange={() => setKind('manual')} aria-label="Liste manuelle" />Liste manuelle</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'smart'} onChange={() => setKind('smart')} aria-label="Deck intelligent" />Deck intelligent</label>
        </div>
        {kind === 'smart' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <label><span className="field-label">Recherche</span><input aria-label="Recherche" value={query.q ?? ''} onChange={(e) => set('q', e.target.value)} className="field-line" /></label>
            <label><span className="field-label">Spécialité</span><select aria-label="Spécialité" value={query.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)} className="field-line"><option value="">Toutes</option>{specialties.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="field-label">État</span><select aria-label="État" value={query.state ?? ''} onChange={(e) => set('state', e.target.value)} className="field-line"><option value="">Tous</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="field-label">Centre</span><select aria-label="Centre" value={query.center ?? ''} onChange={(e) => set('center', e.target.value)} className="field-line"><option value="">Tous</option>{centers.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="-mx-5 flex justify-end gap-2 border-t border-slate-900/[0.06] px-5 pt-4 dark:border-white/10"><button type="button" onClick={() => onClose()} className="btn-outline min-h-11">Annuler</button><button type="submit" className="btn-primary-glass min-h-11">Créer</button></div>
      </form>
    </>
  );
}
