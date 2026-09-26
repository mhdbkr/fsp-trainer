import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Icon } from '@/components/icons';
import { useAllTerms, useDecks, useDeckTerms, useFavorites, useCase } from '@/hooks/useData';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { isPersonalView, rateTerm } from '@/lib/collections/allTerms';
import { registerLine } from '@/components/TermRegister';
import { FAVORITES_DECK_ID } from '@/db/types';
import { reviewSrs, type Grade } from '@/lib/srs';
import { markIntroduced, markReviewed } from '@/lib/srsBudget';
import { termsOfDeck } from '@/lib/collections/query';
import { termsOfCase } from '@/lib/collections/caseTerms';
import { buildDrillQueue, nextDueAt, queueCounts } from '@/lib/collections/drillQueue';
import { loadDrillContext, type DrillContext } from '@/lib/collections/drillContext';
import { drillMinutes, recentCaseAnchor } from '@/lib/collections/relevance';
import { useSimSession } from '@/store/simSession';

const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };

// ponytail: masquage naïf (occurrences du terme entier, insensible à la casse) — pas de
// tokenizer linguistique ; suffisant pour un seul terme dans une phrase de contexte.
function maskTerm(text: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '…');
}

// Drill SM-2 bidirectionnel. Priorité aux termes de la spécialité/pathologie
// du cas travaillé, puis progression libre (couverture inclusive).
// Un deck (ou les favoris) borne la file : jamais un terme hors du deck.
export function DrillPage() {
  const begriffe = useAllTerms();
  const decks = useDecks();
  const deckTerms = useDeckTerms();
  const favorites = useFavorites();
  const [params] = useSearchParams();
  const prioritySpecialty = params.get('specialty');
  const priorityPathology = params.get('pathology');
  const deckId = params.get('deck');
  const deck = deckId === FAVORITES_DECK_ID ? FAV_DECK : decks?.find((d) => d.id === deckId);
  const caseId = params.get('case');
  const theCase = useCase(caseId ?? undefined);
  // Seuls les événements qui définissent les termes d'un cas : sinon chaque
  // `srs.reviewed` (même table) relançait la requête et recalculait le pool.
  const events = useLiveQuery(() => db.progress_events.where('type').anyOf(['term.favorited', 'deck.term_added']).toArray(), [], undefined);
  const simSnapshot = useSimSession((s) => s.snapshot);
  const simMinimized = useSimSession((s) => s.minimized);

  const [queue, setQueue] = useState<AnyTerm[]>([]);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState<'term2simple' | 'simple2term'>('term2simple');
  const [stats, setStats] = useState({ done: 0, again: 0 });
  const [ctx, setCtx] = useState<DrillContext | null>(null);

  useEffect(() => { loadDrillContext().then(setCtx); }, []);

  // Pool borné au deck (ou tout le glossaire hors deck) ; la file de drill ne sort jamais de ce pool.
  // ?case prime sur ?deck : ancré sur les termes du cas (liés ∪ marqués pendant la session, F2a).
  const pool = useMemo(
    () => (!begriffe ? [] : caseId && theCase ? termsOfCase(caseId, begriffe, theCase, events ?? []) : deck ? termsOfDeck(deck, begriffe, deckTerms ?? [], favorites ?? []) : begriffe),
    [begriffe, caseId, theCase, events, deck, deckTerms, favorites],
  );
  const buildQueue = useCallback(
    (c: DrillContext | null = ctx) => buildDrillQueue(pool, { prioritySpecialty, priorityPathology, newLimit: c?.remaining ?? 0, maxReviews: c?.reviewsRemaining, relevance: c?.relevance }),
    [pool, prioritySpecialty, priorityPathology, ctx],
  );

  useEffect(() => {
    if (begriffe && ctx && !started) setQueue(buildQueue());
  }, [begriffe, ctx, started, buildQueue]);

  const qc = useMemo(
    () => queueCounts(pool, { prioritySpecialty, priorityPathology, newLimit: ctx?.remaining ?? 0, maxReviews: ctx?.reviewsRemaining, relevance: ctx?.relevance }),
    [pool, ctx, prioritySpecialty, priorityPathology],
  );

  if (!begriffe || !ctx) return <div className="text-slate-400">Chargement…</div>;

  const next = nextDueAt(pool);
  const anchor = recentCaseAnchor(queue, ctx.relevance);
  const minutes = drillMinutes(qc.due + qc.fresh);
  // Recharge le contexte AVANT de rebâtir la file : « Nouvelle session » après une
  // session ne doit pas ignorer le budget du jour que l'écran vient d'annoncer.
  // S'il ne reste rien, on revient à l'accueil (« Rien à réviser… »).
  const start = async () => {
    const fresh = await loadDrillContext();
    setCtx(fresh);
    const q = buildQueue(fresh);
    setIdx(0); setRevealed(false); setStats({ done: 0, again: 0 });
    if (q.length === 0) { setStarted(false); return; }
    setQueue(q); setStarted(true);
  };

  // Sortie de la session en pause si elle porte sur CE cas (FB2 : reprendre le
  // Runner là où on l'a laissé, même route que ResumeSessionBar) ; sinon retour
  // à la fiche du cas (mode ?case), au deck (mode ?deck), ou au glossaire.
  const exitTo = () => {
    if (caseId) {
      if (simSnapshot?.caseId === caseId && simMinimized) {
        return `/simulation/${caseId}/run${simSnapshot.teil ? `?teil=${simSnapshot.teil}` : ''}`;
      }
      return `/cas/${caseId}`;
    }
    return deckId ? `/fachbegriffe?deck=${deckId}` : '/fachbegriffe';
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <h1 className="text-2xl font-bold">Drill Fachbegriffe{caseId && theCase ? ` · Termes de ${theCase.name}` : deck ? ` · ${deck.name}` : ''}</h1>
        <div className="card p-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Icon name="nav-abc" className="h-8 w-8" /></div>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {qc.due} dus · {qc.fresh} nouveaux · budget du jour {ctx.daily.newPerDay}{prioritySpecialty ? ` · priorité ${prioritySpecialty}` : ''}{qc.due + qc.fresh > 0 ? ` · ≈ ${minutes} min` : ''}.
            Répétition espacée (SM-2), cartes bidirectionnelles.
          </p>
          {anchor && <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">Ancré sur ton cas récent : {anchor.name}</p>}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm">Sens :</span>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
              <button onClick={() => setDirection('term2simple')} className={`rounded px-2 py-1 ${direction === 'term2simple' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Terme → sens</button>
              <button onClick={() => setDirection('simple2term')} className={`rounded px-2 py-1 ${direction === 'simple2term' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Sens → terme</button>
            </div>
          </div>
          {qc.due + qc.fresh === 0 ? (
            caseId && theCase ? (
              <>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Icon name="check" className="h-4 w-4" />
                  Rien à réviser dans ce cas aujourd'hui.
                </p>
                <Link to={`/fachbegriffe/drill?specialty=${encodeURIComponent(theCase.specialty)}`} className="btn-primary mt-3">Réviser la spécialité {theCase.specialty}</Link>
                <Link to="/fachbegriffe/drill" className="btn-outline mt-3 ml-2">Drill global</Link>
              </>
            ) : deck ? (
              <>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Icon name="check" className="h-4 w-4" />
                  Rien à réviser dans « {deck.name} » aujourd'hui.{next ? ` Prochain terme dû : ${new Date(next).toLocaleDateString('fr-FR')}.` : ''}
                </p>
                <Link to="/fachbegriffe/drill" className="btn-outline mt-3">Drill global</Link>
              </>
            ) : (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Icon name="check" className="h-4 w-4" />Rien à réviser aujourd'hui — les nouveaux termes reviennent demain (budget {ctx.daily.newPerDay}/jour).</p>
            )
          ) : (
            <button onClick={start} className="btn-primary mt-5 gap-1.5 px-8 py-3 text-base"><Icon name="play" className="h-4 w-4" />Commencer</button>
          )}
        </div>
        <Link to={exitTo()} className="btn-ghost">← {caseId ? 'Retour au cas' : 'Glossaire'}</Link>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <div className="card p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"><Icon name="spark" className="h-8 w-8" /></div>
          <h1 className="mt-2 text-2xl font-bold">Session terminée</h1>
          <p className="text-slate-500 dark:text-slate-400">{stats.done} cartes revues · {stats.again} à retravailler</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={start} className="btn-primary">Nouvelle session</button>
            <Link to="/" className="btn-outline">Accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  const card = queue[idx];
  // Terme personnel étoilé avant explication (I-1, review) : jamais de face
  // vide, et jamais la réponse offerte au recto. Sans explication : le
  // contexte (s'il existe) va au dos labellisé « Contexte » (Terme → sens),
  // ou masqué au recto (Sens → terme, ponytail : \b + regex simple, pas de
  // tokenizer — suffit pour un seul terme masqué).
  const reformulation = registerLine(card);
  const hasReformulation = reformulation.length > 0;
  const context = isPersonalView(card) ? card.context : undefined;
  let front: string;
  let back: string;
  let backLabel: string | null = null;
  if (hasReformulation) {
    front = direction === 'term2simple' ? card.term : card.translationSimple;
    back = direction === 'term2simple' ? reformulation : card.term;
  } else if (context) {
    if (direction === 'term2simple') { front = card.term; back = context; backLabel = 'Contexte'; }
    else { front = maskTerm(context, card.term); back = card.term; }
  } else {
    front = card.term;
    back = 'Carte personnelle — pas encore d\'explication';
  }

  const grade = async (g: Grade) => {
    const wasNew = card.srs.state === 'Neu';
    await rateTerm(card, g);
    const newSrs = reviewSrs(card.srs, g);
    if (wasNew) void markIntroduced();
    else void markReviewed();
    setStats((s) => ({ done: s.done + 1, again: s.again + (g < 3 ? 1 : 0) }));
    if (g < 3) {
      // remet la carte en fin de file pour la revoir dans la session
      setQueue((q) => [...q, { ...card, srs: newSrs }]);
    }
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <Link to={exitTo()} className="hover:text-brand-600">✕ Quitter</Link>
        <span>{idx + 1} / {queue.length}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      {/* Flashcard 3D — retournement rotateY : recto = question, verso = réponse.
          Pédagogiquement juste (une carte se retourne) + « un peu de 3D » sobre. */}
      <div className="[perspective:1200px]">
        <div className={`relative h-[320px] transition-transform duration-500 [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
          {/* Recto */}
          <div className="card absolute inset-0 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
            <div className="label">{direction === 'term2simple' ? 'Fachbegriff' : 'Bedeutung'} · {card.specialty}</div>
            <div className="mt-4 font-display text-2xl font-bold tracking-tightish">{front}</div>
            {direction === 'term2simple' && card.pronunciation && <div className="mt-1 font-mono text-sm text-slate-400">/{card.pronunciation}/</div>}
            <button onClick={() => setRevealed(true)} className="btn-outline mt-8">Révéler (Leertaste)</button>
          </div>
          {/* Verso */}
          <div className="card absolute inset-0 flex flex-col items-center justify-center overflow-y-auto p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="label">{front}</div>
            {backLabel && <div className="label">{backLabel}</div>}
            <div className="mt-3 text-xl font-semibold text-brand-700 dark:text-brand-300">{back}</div>
            {direction === 'term2simple' && card.register && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{card.register.anamnese}</p>}
            {card.definitionDetailed && <p className="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">{card.definitionDetailed}</p>}
          </div>
        </div>
      </div>

      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          <GradeBtn label="Wieder" sub="<1 min" color="rose" onClick={() => grade(0)} />
          <GradeBtn label="Schwer" sub="1 j" color="amber" onClick={() => grade(3)} />
          <GradeBtn label="Gut" sub={`${card.srs.repetitions >= 2 ? Math.round(card.srs.interval * card.srs.easeFactor) || 6 : card.srs.repetitions === 1 ? 6 : 1} j`} color="emerald" onClick={() => grade(4)} />
          <GradeBtn label="Einfach" sub="+" color="sky" onClick={() => grade(5)} />
        </div>
      )}

      <KeyboardShortcuts revealed={revealed} onReveal={() => setRevealed(true)} onGrade={grade} />
    </div>
  );
}

function GradeBtn({ label, sub, color, onClick }: { label: string; sub: string; color: 'rose' | 'amber' | 'emerald' | 'sky'; onClick: () => void }) {
  const cls = {
    rose: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300',
  }[color];
  return (
    <button onClick={onClick} className={`rounded-lg py-3 text-center transition-colors ${cls}`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="text-[10px] opacity-70">{sub}</div>
    </button>
  );
}

function KeyboardShortcuts({ revealed, onReveal, onGrade }: { revealed: boolean; onReveal: () => void; onGrade: (g: Grade) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === ' ' && !revealed) { e.preventDefault(); onReveal(); }
      else if (revealed) {
        if (e.key === '1') onGrade(0);
        else if (e.key === '2') onGrade(3);
        else if (e.key === '3') onGrade(4);
        else if (e.key === '4') onGrade(5);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [revealed, onReveal, onGrade]);
  return null;
}
