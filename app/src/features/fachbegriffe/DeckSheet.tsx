import { useState } from 'react';
import type { Deck, DeckQuery, Specialty, Srs, Center } from '@/db/types';
import { createDeck, renameDeck, setDeckQuery, deleteDeck } from '@/lib/collections';

interface Props { mode: 'create' | 'edit'; deck?: Deck; initialQuery?: DeckQuery; specialties: Specialty[]; centers: Center[]; onClose: (createdId?: string, opts?: { deleted?: boolean }) => void }
const STATES: Srs['state'][] = ['Neu', 'Gelernt', 'Zu wiederholen'];

/** Feuille de création / gestion d'un deck. Une seule responsabilité : nom, type, filtres, suppression. */
export function DeckSheet({ mode, deck, initialQuery, specialties, centers, onClose }: Props) {
  const [name, setName] = useState(deck?.name ?? '');
  const [kind, setKind] = useState<'manual' | 'smart'>(deck?.kind ?? 'manual');
  const [query, setQuery] = useState<DeckQuery>(deck?.query ?? initialQuery ?? {});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof DeckQuery, v: string) => setQuery((q) => ({ ...q, [k]: v || undefined }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      if (mode === 'create') { const id = await createDeck(name, kind, kind === 'smart' ? query : undefined); onClose(id); return; }
      if (deck) { if (deck.name !== name) await renameDeck(deck.id, name); if (deck.kind === 'smart') await setDeckQuery(deck.id, query); }
      onClose();
    } catch (err) { setError((err as Error).message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : (err as Error).message); }
  };
  const remove = async () => { if (deck && confirm(`Supprimer le deck « ${deck.name} » ? Les termes restent dans le glossaire.`)) { await deleteDeck(deck.id); onClose(undefined, { deleted: true }); } };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={() => onClose()} />
      <form onSubmit={submit} role="dialog" aria-label={mode === 'create' ? 'Nouveau deck' : 'Gérer le deck'} className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md space-y-3 rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-1/3 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="label">{mode === 'create' ? 'Nouveau deck' : 'Deck'}</div>
        <label className="block text-sm"><span className="label">Nom du deck</span><input aria-label="Nom du deck" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="input w-full" autoFocus /></label>
        {mode === 'create' && (
          <div role="radiogroup" aria-label="Type" className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'manual'} onChange={() => setKind('manual')} aria-label="Liste manuelle" />Liste manuelle</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'smart'} onChange={() => setKind('smart')} aria-label="Deck intelligent" />Deck intelligent</label>
          </div>
        )}
        {kind === 'smart' && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label><span className="label">Recherche</span><input aria-label="Recherche" value={query.q ?? ''} onChange={(e) => set('q', e.target.value)} className="input w-full" /></label>
            <label><span className="label">Spécialité</span><select aria-label="Spécialité" value={query.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)} className="input w-full"><option value="">Toutes</option>{specialties.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">État</span><select aria-label="État" value={query.state ?? ''} onChange={(e) => set('state', e.target.value)} className="input w-full"><option value="">Tous</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">Centre</span><select aria-label="Centre" value={query.center ?? ''} onChange={(e) => set('center', e.target.value)} className="input w-full"><option value="">Tous</option>{centers.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-signal-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {mode === 'edit' && deck ? <button type="button" onClick={remove} className="text-xs text-signal-600 hover:underline">Supprimer</button> : <span />}
          <div className="flex gap-2"><button type="button" onClick={() => onClose()} className="btn-outline">Annuler</button><button type="submit" className="btn-primary">{mode === 'create' ? 'Créer' : 'Enregistrer'}</button></div>
        </div>
      </form>
    </>
  );
}
