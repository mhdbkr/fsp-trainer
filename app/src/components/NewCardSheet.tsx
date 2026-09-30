// ============================================================================
// Mini-fiche de création (F4a D4/D5) : ★ sur un mot hors glossaire. Le mot
// (modifiable), sa Bedeutung, le Contexte = la seule phrase qui le contient
// (mot surligné), le deck (Favoris par défaut), « Créer ». Plus de 4 mots
// sélectionnés : on touche le mot à garder. Fermer sans créer n'écrit rien.
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
import { useEffect, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { db } from '@/db/db';
import { useDecks, useFachbegriffe, usePersonalTerms } from '@/hooks/useData';
import { addTermToDeck } from '@/lib/collections';
import { cleanSelection, createPersonalTerm, personalTermId, PT_LIMITS, updatePersonalExplanation } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { lookupTerm } from '@/lib/dictionary';
import { askBedeutung, canAskAi } from '@/lib/onlineAi';
import { useCardToast } from '@/store/cardToast';
import { ContextSentence } from './TermSheet';
import { Portal } from './Portal';

export const CHIP_THRESHOLD = 4;
/** Mots d'une sélection longue, nettoyés, sans doublon (≥ 2 lettres). */
export function selectionWords(selection: string): string[] {
  return [...new Set(selection.split(/\s+/).map(cleanSelection).filter((w) => w.length >= 2))];
}

export function NewCardSheet({ selection, sentence, caseId, onClose }: { selection: string; sentence: string; caseId?: string; onClose: () => void }) {
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
  useEffect(() => { wordRef.current = word; }, [word]);

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
  const create = async () => {
    if (!canCreate || busy.current) return;
    busy.current = true; setSubmitting(true); setError(null);
    try {
      // Le mot choisi touche en fait un terme déjà publié : le ranger lui, jamais de doublon (I1/N2).
      if (hit) {
        await addTermToDeck(deckId, hit.id, caseId ? { caseId } : {});
        show({ kind: 'saved', term: hit, deckId, ...(caseId ? { caseId } : {}) });
        onClose();
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
      onClose();
    } catch { setError('Impossible de créer la carte : réessaie.'); }
    finally { busy.current = false; setSubmitting(false); }
  };

  return (
    <Portal>
      <div role="dialog" aria-label="Nouvelle carte" data-keep-open
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        className="glass glass-edge fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-md space-y-3 rounded-xl p-4 text-sm motion-safe:animate-fade-in-fast">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{hit ? 'Déjà dans le glossaire' : 'Nouvelle carte'}</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} className="btn-ghost h-11 w-11 justify-center">✕</button>
        </div>
        {chips && (
          <div>
            <p className="label mb-1">Touche le mot à garder</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((w, i) => (
                <button key={w} ref={i === 0 ? firstChipRef : undefined} type="button" aria-pressed={word === w}
                  onClick={() => { setWord(w); typed.current = false; setBedeutung(''); asked.current = null; }}
                  className={`min-h-11 rounded-full px-3 ring-1 ${word === w ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-white/10'}`}>{w}</button>
              ))}
            </div>
          </div>
        )}
        {word && (
          <>
            <label className="block"><span className="label">Mot</span>
              <input value={word} maxLength={PT_LIMITS.term} onChange={(e) => setWord(e.target.value)} className="input mt-1 min-h-11 w-full" />
            </label>
            <label className="block"><span className="label">Bedeutung</span>
              <input ref={bedeutungRef} value={bedeutung} maxLength={PT_LIMITS.explanation} readOnly={!!hit}
                placeholder={ai === 'loading' ? 'Doctopus propose…' : 'Écris la signification'}
                aria-busy={ai === 'loading' || undefined}
                onChange={(e) => { if (hit) return; typed.current = true; setBedeutung(e.target.value); }}
                className={`input mt-1 min-h-11 w-full ${hit ? 'bg-slate-50 dark:bg-white/5' : ''}`} />
            </label>
            {sentence && <div><span className="label">Contexte</span><ContextSentence sentence={sentence} word={word} /></div>}
            {manualDecks.length > 0 && (
              <div>
                <span className="label">Deck</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...manualDecks].map((d) => (
                    <button key={d.id} type="button" aria-pressed={deckId === d.id} onClick={() => setDeckId(d.id)}
                      className={`min-h-11 rounded-full px-3 ring-1 ${deckId === d.id ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-white/10'}`}>{d.name}</button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={() => { void create(); }} disabled={!canCreate} className="btn-primary min-h-11 w-full disabled:opacity-40">{hit ? 'Ranger' : 'Créer'}</button>
            {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </>
        )}
      </div>
    </Portal>
  );
}
