import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAllTerms, useDecks, useDeckTerms, useFavorites, useTermsInDecks } from '@/hooks/useData';
import { Icon } from '@/components/icons';
import { useUi } from '@/store/ui';
import { counts as termCounts } from '@/lib/stats';
import type { Specialty, Srs, Center, DeckQuery } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import { EmptyState } from '@/components/ui';
import { applyQuery, termsOfDeck } from '@/lib/collections/query';
import { removeFromDeck, setDeckQuery } from '@/lib/collections';
import { loadDrillContext } from '@/lib/collections/drillContext';
import { drillMinutes } from '@/lib/collections/relevance';
import { sortDe, letterOf } from './letters';
import { TermList, type TermListHandle } from './TermList';
import { AlphabetRail } from './AlphabetRail';
import { DeckTabs } from './DeckTabs';
import { DeckManager } from './DeckManager';
import { AnimatePresence } from '@/lib/motion';
import { SrsSettingsSheet } from './SrsSettingsSheet';

const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };

export function FachbegriffePage() {
  // useDecks()/useDeckTerms()/useTermsInDecks() filtrent déjà les decks en
  // attente de suppression (Annuler 5 s, F4b P6) : un deck supprimé depuis le
  // tiroir d'un terme disparaît déjà de ces onglets, sans refiltre ici.
  const begriffe = useAllTerms(); const decks = useDecks();
  const deckTerms = useDeckTerms(); const favorites = useFavorites(); const inDecks = useTermsInDecks();
  const openGlossary = useUi((s) => s.openGlossary);
  const [params, setParams] = useSearchParams();
  const activeId = params.get('deck');
  const [filters, setFilters] = useState<DeckQuery>({});
  const [manager, setManager] = useState(false);   // renommer / supprimer : le même tiroir que depuis la fiche d'un terme (F4b P6)
  const listRef = useRef<TermListHandle>(null);
  const pendingIdRef = useRef<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [srsSheet, setSrsSheet] = useState(false);
  const reloadCtx = () => { loadDrillContext().then((ctx) => setRemaining(ctx.remaining)); };
  useEffect(reloadCtx, []);

  const activeDeck = activeId === FAVORITES_DECK_ID ? FAV_DECK : decks?.find((d) => d.id === activeId);
  const isSmart = activeDeck?.kind === 'smart' && activeDeck.id !== FAVORITES_DECK_ID;
  // Sur un deck intelligent, la barre affiche la requête du deck ; ailleurs, les filtres locaux.
  const effective: DeckQuery = useMemo(() => (isSmart ? { ...(activeDeck as { query?: DeckQuery }).query, ...filters } : filters), [isSmart, activeDeck, filters]);
  const dirty = isSmart && JSON.stringify(effective) !== JSON.stringify((activeDeck as { query?: DeckQuery }).query ?? {});

  const specialties = useMemo(() => [...new Set((begriffe ?? []).map((b) => b.specialty))].sort() as Specialty[], [begriffe]);
  const centers = useMemo(() => [...new Set((begriffe ?? []).flatMap((b) => b.centers))].sort() as Center[], [begriffe]);
  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.termId)), [favorites]);

  const shown = useMemo(() => {
    if (!begriffe) return [];
    const base = activeDeck && !isSmart ? termsOfDeck(activeDeck, begriffe, deckTerms ?? [], favorites ?? []) : begriffe;
    return applyQuery(effective, base).sort(sortDe);
  }, [begriffe, activeDeck, isSmart, deckTerms, favorites, effective]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {}; if (!begriffe) return c;
    c[FAVORITES_DECK_ID] = favSet.size;
    for (const d of decks ?? []) c[d.id] = termsOfDeck(d, begriffe, deckTerms ?? [], favorites ?? []).length;
    return c;
  }, [begriffe, decks, deckTerms, favorites, favSet]);
  const available = useMemo(() => new Set(shown.map((b) => letterOf(b.term))), [shown]);
  const select = (id: string | null) => { setFilters({}); setParams(id ? { deck: id } : {}); };
  // Repli sur « Tous » si l'onglet actif ne correspond plus à aucun deck (supprimé / id inconnu
  // dans l'URL) — sauf pendant la fenêtre transitoire juste après createDeck, où le deck vient
  // d'être créé mais la live query n'a pas encore émis le nouveau tableau.
  useEffect(() => {
    if (!decks || !activeId || activeId === FAVORITES_DECK_ID) return;
    if (decks.some((d) => d.id === activeId)) { if (pendingIdRef.current === activeId) pendingIdRef.current = null; return; }
    if (pendingIdRef.current === activeId) return;
    select(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks, activeId]);

  if (!begriffe || !decks) return <div className="text-slate-400">Chargement…</div>;
  const c = termCounts(activeDeck ? shown : begriffe);
  const due = c.due;
  const fresh = Math.min(c.fresh, remaining);
  const drillHref = activeId ? `/fachbegriffe/drill?deck=${activeId}` : '/fachbegriffe/drill';
  const set = (k: keyof DeckQuery, v: string) => setFilters((f) => ({ ...f, [k]: v || undefined }));

  const empty = shown.length === 0 && (
    activeId === FAVORITES_DECK_ID ? <EmptyState icon="nav-abc" title="Aucun favori" hint="Marque un terme d'une ★ pour le retrouver ici." />
    : isSmart ? <EmptyState icon="nav-abc" title="Aucun terme ne correspond aujourd'hui" hint="Ce deck suit ton SRS : les termes y entrent et en sortent tout seuls quand leur état change." />
    : activeDeck ? <EmptyState icon="nav-abc" title="Deck vide" hint="Ajoute des termes depuis une fiche ou avec ★." />
    : <EmptyState icon="nav-abc" title="Aucun terme" />);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Vocabulaire</div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Fachbegriffe</h1>
          <p className="text-slate-500 dark:text-slate-400">
            <b className="text-amber-600 dark:text-amber-400">{due} dus</b> · <b className="text-brand-600 dark:text-brand-400">{fresh} nouveaux proposés</b> · {c.learned} appris
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setManager(true)} className="btn-outline min-h-11 gap-1.5" aria-label="Gérer les decks"><Icon name="gear" className="h-4 w-4 shrink-0" /><span className="hidden sm:inline">Decks</span></button>
          <button type="button" onClick={() => setSrsSheet(true)} className="btn-outline min-h-11 gap-1.5" aria-label="Répétitions"><Icon name="gear" className="h-4 w-4" /><span className="hidden sm:inline">Répétitions</span></button>
          <Link to={drillHref} aria-label={`Drill${activeDeck ? ` · ${activeDeck.name}` : ''} (${due + fresh})${due + fresh > 0 ? `, environ ${drillMinutes(due + fresh)} min` : ''}`} className="btn-primary group gap-1.5 whitespace-nowrap">
            <Icon name="nav-abc" className="h-4 w-4" />{`Drill${activeDeck ? ` · ${activeDeck.name}` : ''} (${due + fresh})`}
            {due + fresh > 0 && <DrillClock minutes={drillMinutes(due + fresh)} />}
          </Link>
        </div>
      </header>

      <DeckTabs decks={decks} activeId={activeId} counts={counts} onSelect={select} />

      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[160px] flex-1"><label className="label">Recherche</label><input value={effective.q ?? ''} onChange={(e) => set('q', e.target.value)} placeholder="Terme, traduction…" className="input mt-1" /></div>
        <div><label className="label">Spécialité</label><select value={effective.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)} className="input mt-1"><option value="">Toutes</option>{specialties.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label">État</label><select value={effective.state ?? ''} onChange={(e) => set('state', e.target.value)} className="input mt-1"><option value="">Tous</option>{(['Neu', 'Gelernt', 'Zu wiederholen'] as Srs['state'][]).map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label className="label">Centre</label><select value={effective.center ?? ''} onChange={(e) => set('center', e.target.value)} className="input mt-1"><option value="">Tous</option>{centers.map((c) => <option key={c}>{c}</option>)}</select></div>
        {dirty && <div className="flex gap-2"><button type="button" onClick={async () => { await setDeckQuery(activeId!, effective); setFilters({}); }} className="btn-primary text-xs">Enregistrer dans le deck</button><button type="button" onClick={() => setFilters({})} className="btn-outline text-xs">Annuler</button></div>}
      </div>

      {empty || (
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <TermList ref={listRef} terms={shown} inDecks={inDecks} onOpen={openGlossary}
              onRemove={activeDeck && !isSmart && activeId !== FAVORITES_DECK_ID ? (t) => { void removeFromDeck(activeId!, t.id); } : undefined} />
          </div>
          <AlphabetRail available={available} onJump={(l) => listRef.current?.jumpTo(l)} />
        </div>
      )}

      <AnimatePresence>
        {manager && <DeckManager key="deck-manager" decks={decks ?? []} counts={counts} onClose={() => setManager(false)}
          initialQuery={filters} onCreated={(createdId) => { setManager(false); pendingIdRef.current = createdId; select(createdId); }} />}
      </AnimatePresence>
      {srsSheet && <SrsSettingsSheet onClose={() => { setSrsSheet(false); reloadCtx(); }} />}
    </div>
  );
}

/** La durée du drill dans le bouton (F4c, retour 3 oct. : plus de « ≈ 14 min » à côté) :
 *  une horloge et sa durée ; au survol / focus, les aiguilles font un tour. La largeur du
 *  bouton ne bouge jamais (rien ne glisse à côté). */
function DrillClock({ minutes }: { minutes: number }) {
  const hand = 'origin-[12px_12px] transition-transform duration-700 ease-fluid motion-reduce:transition-none';
  return (
    <span aria-hidden data-drill-clock className="ml-1 flex items-center border-l border-white/30 pl-2">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 12V7.2" className={`${hand} group-hover:rotate-[360deg] group-focus-visible:rotate-[360deg]`} />
        <path d="M12 12l3 1.8" className={`${hand} group-hover:rotate-[30deg] group-focus-visible:rotate-[30deg]`} />
      </svg>
      <span className="whitespace-nowrap pl-1.5 font-mono text-xs tabular-nums opacity-90">{minutes} min</span>
    </span>
  );
}
