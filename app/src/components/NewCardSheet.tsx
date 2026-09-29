// ============================================================================
// Mini-fiche de création (F4a D4/D5 → F4b P8) = la carte EN TRAIN DE SE FAIRE :
// le mot en grand (police du recto, crayon discret pour corriger), la
// Bedeutung en italique éditable sur place (miroitement pendant la proposition
// IA), la phrase de contexte en petit, mot surligné ; pied : bande de decks
// (s'il existe un deck manuel) + « Créer la carte ». Plus de 4 mots : les
// pastilles d'abord, le mot touché « vole » à sa place. Champs sans bordure
// (soulignement fin au survol/focus). Ouverture : la carte s'étend (ancrée
// sous la sélection sur ordinateur, depuis le bas sur téléphone) ; « Créer »
// → elle se pose dans la pilule de confirmation (`onClose(dy)`). Clavier :
// focus sur la Bedeutung, Entrée crée, Échap ferme. Fermer n'écrit rien.
// Le mot choisi peut recouper deux cas déjà connus (revue re-revue C7) :
//   - un terme du GLOSSAIRE (N2) : sa Bedeutung s'affiche en lecture, aucun
//     appel IA, jamais de doublon `pt-` (I1), « Créer » range le terme publié.
//   - une CARTE PERSONNELLE déjà là, y compris en attente de suppression D10
//     (N1) : sa propre Bedeutung préremplit le champ, aucun appel IA ; seule
//     une saisie EXPLICITE de l'utilisateur (`typed.current`), différente de
//     celle stockée, déclenche `updatePersonalExplanation` — jamais une
//     réponse IA qu'on n'a pas demandée.
// Sinon (mot réellement nouveau) : IA (`askBedeutung`), une demande par mot,
// jetée si le mot change avant la réponse (m3). IA indisponible : « Écris la
// signification ».
// ============================================================================
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { db } from '@/db/db';
import { useDecks, useFachbegriffe, usePersonalTerms } from '@/hooks/useData';
import { addTermToDeck } from '@/lib/collections';
import { cleanSelection, createPersonalTerm, personalTermId, PT_LIMITS, updatePersonalExplanation } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { lookupTerm } from '@/lib/dictionary';
import { askBedeutung, canAskAi } from '@/lib/onlineAi';
import { expand, flyFrom, m, settleOrClose } from '@/lib/motion';
import { useCardToast } from '@/store/cardToast';
import { ContextSentence } from './TermSheet';
import { Icon } from './icons';
import { Portal } from './Portal';

export const CHIP_THRESHOLD = 4;
/** Mots d'une sélection longue, nettoyés, sans doublon (≥ 2 lettres). */
export function selectionWords(selection: string): string[] {
  return [...new Set(selection.split(/\s+/).map(cleanSelection).filter((w) => w.length >= 2))];
}

/** Hauteur réservée sous l'ancre (ordinateur) : la carte ne sort jamais par le bas. */
const CARD_H = 400;
const CARD_W = 352;   // w-[22rem]

/** `onClose(dy)` : `dy` = descente jusqu'à la pilule (« se poser ») ; absent = simple fermeture. */
export function NewCardSheet({ selection, sentence, caseId, at, onClose }: {
  selection: string; sentence: string; caseId?: string; at?: { x: number; bottom: number }; onClose: (settleDy?: number) => void;
}) {
  const decks = useDecks();
  const manualDecks = (decks ?? []).filter((d) => d.kind === 'manual');
  const begriffeRaw = useFachbegriffe();
  const personalTerms = usePersonalTerms();
  const begriffe = begriffeRaw ?? [];
  // Tant que l'un des deux n'a pas fini de charger (Dexie, asynchrone), on ne
  // sait pas encore si le mot est déjà connu (N1/N2) — attendre plutôt que de
  // lancer l'IA pour rien (le `knownRef` ci-dessous rattrape aussi le cas où
  // la réponse IA d'un appel déjà parti arrive après coup).
  const loading = begriffeRaw === undefined || personalTerms === undefined;
  const show = useCardToast((s) => s.show);
  const chips = selectionWords(selection).length > CHIP_THRESHOLD ? selectionWords(selection) : null;
  const [word, setWord] = useState(chips ? '' : cleanSelection(selection));
  const [bedeutung, setBedeutung] = useState('');
  const [ai, setAi] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [deckId, setDeckId] = useState(FAVORITES_DECK_ID);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const asked = useRef<string | null>(null);
  const typed = useRef(false);
  const wordRef = useRef(word);
  const busy = useRef(false);
  const autoFilled = useRef(false);   // Bedeutung reprise du glossaire / de la carte, pas tapée
  const firstChipRef = useRef<HTMLButtonElement>(null);
  const bedeutungRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const wordRowRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const flightFrom = useRef<DOMRect | null>(null);
  useEffect(() => { wordRef.current = word; }, [word]);
  // Le mot touché en pastille « vole » à sa place (FLIP natif, lib/motion).
  useLayoutEffect(() => { flyFrom(wordRowRef.current, flightFrom.current); flightFrom.current = null; }, [word]);

  // Le mot choisi touche-t-il un terme déjà publié, ou une carte personnelle
  // déjà là (y compris en attente de suppression : elle reste en base tant
  // que le délai D10 n'a pas expiré) ? Dans les deux cas, pas d'IA (N1/N2).
  // Le glossaire et les cartes personnelles chargent chacun en asynchrone
  // (Dexie) : `known` en réf toujours à jour évite qu'une réponse IA partie
  // AVANT que l'un des deux ait chargé n'écrase, à son retour, une Bedeutung
  // devenue connue entretemps.
  const hit = word ? lookupTerm(word, begriffe) : null;
  const existingPt = !hit && word ? personalTerms?.find((p) => p.id === personalTermId(word)) : undefined;
  const knownRef = useRef({ hit, existingPt });
  useEffect(() => { knownRef.current = { hit, existingPt }; });

  // Focus initial (revue I5) : la première pastille s'il y en a, sinon la Bedeutung.
  useEffect(() => {
    (chips ? firstChipRef.current : bedeutungRef.current)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!word || loading) return;
    if (hit) { asked.current = word; setAi('idle'); if (!typed.current) { setBedeutung(hit.translationSimple ?? ''); autoFilled.current = true; } return; }
    if (existingPt) { asked.current = word; setAi('idle'); if (!typed.current) { setBedeutung(existingPt.explanation ?? ''); autoFilled.current = true; } return; }
    // Le mot n'est plus un terme connu : ne pas garder la Bedeutung d'un autre mot (re-revue C7 m-c).
    if (autoFilled.current && !typed.current) { setBedeutung(''); autoFilled.current = false; }
    // UN appel IA par mot choisi (mot réellement nouveau), jeté si le mot
    // demandé n'est plus le mot courant à la réponse (m3), OU si le glossaire
    // / les cartes personnelles révèlent entretemps que le mot était déjà
    // connu (course entre l'IA et Dexie, `knownRef` ci-dessous).
    if (asked.current !== null || !canAskAi()) { if (!canAskAi()) setAi('failed'); return; }
    asked.current = word; setAi('loading');
    const requested = word;
    askBedeutung(word, sentence || undefined)
      .then((b) => {
        if (wordRef.current !== requested) { setAi('idle'); return; }   // plus de « propose… » éternel (m-b)
        if (knownRef.current.hit || knownRef.current.existingPt) return;
        if (!typed.current) setBedeutung(b);
        setAi(b ? 'idle' : 'failed');
      })
      .catch(() => { setAi(wordRef.current === requested ? 'failed' : 'idle'); });
  }, [word, sentence, hit, existingPt, loading]);

  const canCreate = !!word.trim() && word.length <= PT_LIMITS.term && !submitting && !loading &&   // pas de doublon du glossaire avant son chargement (m-a)
    (!!hit || !!bedeutung.trim());
  // Se poser : de son centre jusqu'à la pilule de confirmation (bas de l'écran, ~32 px).
  const settleDy = () => {
    const r = cardRef.current?.getBoundingClientRect();
    return r && r.height ? Math.max(0, window.innerHeight - 32 - (r.top + r.height / 2)) : 96;
  };
  const create = async () => {
    if (!canCreate || busy.current) return;
    busy.current = true; setSubmitting(true); setError(null);
    try {
      // Le mot choisi touche en fait un terme déjà publié : le ranger lui, jamais de doublon (I1/N2).
      if (hit) {
        await addTermToDeck(deckId, hit.id, caseId ? { caseId } : {});
        show({ kind: 'saved', term: hit, deckId, ...(caseId ? { caseId } : {}) });
        onClose(settleDy());
        return;
      }
      const { id, created } = await createPersonalTerm({ term: word, explanation: bedeutung, context: sentence, caseId });
      // Une saisie EXPLICITE différente de la Bedeutung déjà enregistrée : la
      // conserver. Jamais une réponse IA qu'on n'a pas demandée (N1).
      const nextExplanation = bedeutung.trim();
      if (!created && typed.current && nextExplanation && nextExplanation !== (existingPt?.explanation ?? '')) await updatePersonalExplanation(id, nextExplanation);
      await addTermToDeck(deckId, id, caseId ? { caseId } : {});
      const pt = await db.personal_terms.get(id);
      if (pt) show({ kind: 'saved', term: toView(pt), deckId, ...(caseId ? { caseId } : {}) });
      onClose(settleDy());
      // Le verrou (`busy`/`submitting`) reste TENU après succès : la carte
      // s'anime en sortie mais reste montée quelques ms (`exit="gone"`) — un
      // second clic pendant ce délai ne doit rien réémettre.
    } catch { busy.current = false; setSubmitting(false); setError('Impossible de créer la carte : réessaie.'); }
  };

  // Ordinateur (sm+) : ancrée sous la sélection, jamais hors écran ; téléphone : depuis le bas.
  const anchorStyle = at && typeof window !== 'undefined' ? {
    '--nc-top': `${Math.max(8, Math.min(at.bottom + 8, window.innerHeight - CARD_H))}px`,
    '--nc-left': `${Math.max(16, Math.min(at.x - CARD_W / 2, window.innerWidth - CARD_W - 16))}px`,
  } as React.CSSProperties : undefined;
  const field = 'w-full min-h-11 border-b border-transparent bg-transparent transition-colors hover:border-slate-300 focus:border-brand-500 dark:hover:border-white/20';
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } };

  return (
    <Portal>
      <m.div ref={cardRef} role="dialog" aria-label="Nouvelle carte" data-keep-open style={anchorStyle}
        {...expand} exit="gone" variants={{ gone: settleOrClose }}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        className={`glass-full fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-[22rem] origin-bottom space-y-3 rounded-2xl p-4 text-sm ${at ? 'sm:inset-x-auto sm:bottom-auto sm:left-[var(--nc-left)] sm:top-[var(--nc-top)] sm:w-[22rem] sm:origin-top sm:max-h-[calc(100dvh-var(--nc-top)-8px)] sm:overflow-y-auto' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="label pt-1">{hit ? 'Déjà dans le glossaire' : 'Ma carte'}</p>
          <button type="button" aria-label="Fermer" onClick={() => onClose()} className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/50 dark:hover:bg-white/10">✕</button>
        </div>
        {chips && (
          <div>
            <p className="label mb-1.5">Touche le mot à garder</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((w, i) => (
                <button key={w} ref={i === 0 ? firstChipRef : undefined} type="button" aria-pressed={word === w}
                  onClick={(e) => { flightFrom.current = e.currentTarget.getBoundingClientRect(); setWord(w); typed.current = false; setBedeutung(''); asked.current = null; }}
                  className={`min-h-11 rounded-full px-3 ring-1 ${word === w ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-white/50 dark:ring-white/20 dark:hover:bg-white/10'}`}>{w}</button>
              ))}
            </div>
          </div>
        )}
        {word && (
          <>
            <div ref={wordRowRef} className="flex items-center gap-1">
              <input ref={wordInputRef} aria-label="Mot" value={word} maxLength={PT_LIMITS.term} onChange={(e) => setWord(e.target.value)} onKeyDown={onEnter}
                className={`${field} min-w-0 font-display text-2xl font-bold tracking-tightish text-slate-900 dark:text-white`} />
              <button type="button" aria-label="Corriger le mot" onClick={() => { wordInputRef.current?.focus(); wordInputRef.current?.select(); }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/50 hover:text-slate-600 dark:text-slate-300 dark:hover:bg-white/10"><Icon name="pen" className="h-4 w-4" title="Corriger" /></button>
            </div>
            <label className="label" htmlFor="nc-bedeutung">Bedeutung</label>
            <input ref={bedeutungRef} id="nc-bedeutung" aria-label="Bedeutung" value={bedeutung} maxLength={PT_LIMITS.explanation} readOnly={!!hit}
              placeholder={ai === 'loading' ? 'Doctopus propose…' : 'Écris la signification'}
              aria-busy={ai === 'loading' || undefined}
              onChange={(e) => { if (hit) return; typed.current = true; setBedeutung(e.target.value); }} onKeyDown={onEnter}
              className={`${field} text-base italic placeholder:text-slate-400 ${hit ? 'cursor-default text-slate-600 hover:!border-transparent focus:!border-transparent dark:text-slate-300' : 'text-slate-700 dark:text-slate-200'} ${ai === 'loading' ? 'animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(21_131_117/0.14),transparent)] bg-[length:200%_100%]' : ''}`} />
            {sentence && (
              <div>
                <p className="label mb-1">Contexte</p>
                <ContextSentence sentence={sentence} word={word} className="text-xs leading-relaxed" />
              </div>
            )}
            {manualDecks.length > 0 && (
              <div role="group" aria-label="Deck" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
                {[{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...manualDecks].map((d) => (
                  <button key={d.id} type="button" aria-pressed={deckId === d.id} onClick={() => setDeckId(d.id)}
                    className={`min-h-11 shrink-0 rounded-full px-3 ring-1 ${deckId === d.id ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-white/50 dark:ring-white/20 dark:hover:bg-white/10'}`}>{d.name}</button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { void create(); }} disabled={!canCreate} className="btn-primary min-h-11 w-full rounded-full disabled:opacity-40">{hit ? 'Ranger' : 'Créer la carte'}</button>
            {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </>
        )}
      </m.div>
    </Portal>
  );
}
