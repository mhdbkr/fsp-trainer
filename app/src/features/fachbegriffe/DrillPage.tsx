import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Icon } from '@/components/icons';
import { useAllTerms, useDecks, useDeckTerms, useFavorites, useCase } from '@/hooks/useData';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { isPersonalView, rateTerm } from '@/lib/collections/allTerms';
import { CardFlip, type CardDirection } from '@/components/CardFlip';
import { FAVORITES_DECK_ID } from '@/db/types';
import { reviewSrs, type Grade } from '@/lib/srs';
import { markIntroduced, markReviewed } from '@/lib/srsBudget';
import { termsOfDeck } from '@/lib/collections/query';
import { termsOfCase } from '@/lib/collections/caseTerms';
import { buildDrillQueue, nextDueAt, queueCounts } from '@/lib/collections/drillQueue';
import { loadDrillContext, type DrillContext } from '@/lib/collections/drillContext';
import { drillMinutes, recentCaseAnchor } from '@/lib/collections/relevance';
import { useSimSession } from '@/store/simSession';
import { useCountUp } from '@/lib/motion';
import { getActiveUserId } from '@/lib/auth/accounts';
import { logTraining } from '@/lib/journal';
import { now } from '@/lib/clock';

const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };

// Sens mémorisé (G1-6) : préférence locale par compte, sur le modèle de `variantPrefs`.
const dirKey = () => `doctopus-drill-direction:${getActiveUserId() ?? 'anon'}`;
function readDirection(): CardDirection {
  try { return localStorage.getItem(dirKey()) === 'simple2term' ? 'simple2term' : 'term2simple'; } catch { return 'term2simple'; }
}
function saveDirection(d: CardDirection): void {
  try { localStorage.setItem(dirKey(), d); } catch { /* stockage indisponible : le choix vaut pour la visite */ }
}

// Drill bidirectionnel. Priorité aux termes de la spécialité/pathologie
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
  const [direction, setDirection] = useState<CardDirection>(readDirection);
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

  // R-C3 : la séance entre dans le journal — à la fin, ou au démontage si au
  // moins une carte a été notée (quitter en cours de route, c'est du travail
  // fait). Une seule fois par séance. ≥ 1 min : à 0 min, une séance qui coche
  // la tâche drill serait une « coche nue » absorbable (isCocheNue).
  const startedAt = useRef<number | null>(null);
  const logged = useRef(false);
  const noted = useRef(0);                                 // compté AU CLIC : quitter juste après avoir noté compte
  const journaliser = useRef(() => {});
  journaliser.current = () => {
    if (logged.current || startedAt.current === null || noted.current === 0) return;
    logged.current = true;
    void logTraining({ kind: 'drill', spentMin: Math.max(1, Math.round((now() - startedAt.current) / 60_000)), ...(caseId ? { caseId } : {}) })
      .catch((e) => console.warn('[journal]', e));
  };
  const finished = started && queue.length > 0 && idx >= queue.length;
  useEffect(() => { if (finished) journaliser.current(); }, [finished]);
  useEffect(() => () => journaliser.current(), []);

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
    startedAt.current = now(); logged.current = false; noted.current = 0;   // R-C3 : une séance commence
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
    // Carte d'embarquement (F4b P7) : la portée, trois relevés, le sens, UNE action.
    const total = qc.due + qc.fresh;
    const newInPool = pool.filter((b) => b.srs.state === 'Neu').length;
    const budgetLimits = newInPool > qc.fresh;   // le budget du jour retient des nouveaux
    const scope = caseId && theCase ? `Termes de ${theCase.name}` : deck ? deck.name : prioritySpecialty ?? 'Tous les termes';
    const showPriority = prioritySpecialty && scope !== prioritySpecialty;
    const showAnchor = anchor && anchor.caseId !== caseId;
    const emptyDeck = !!deck && !caseId && pool.length === 0;
    const tomorrowNew = Math.min(newInPool - qc.fresh, ctx.daily.newPerDay);
    // L'exemple ne cite JAMAIS queue[0] (file déterministe : ce serait la réponse) : un terme du
    // pool hors file du jour (avec Bedeutung), sinon la dernière carte de la file si > 1, sinon rien.
    // File pas encore bâtie (l'effet suit le premier rendu) : pas d'exemple, sinon il citerait la future queue[0].
    const first = !queue.length ? undefined : pool.find((b) => !queue.some((q) => q.id === b.id) && b.translationSimple) ?? (queue.length > 1 ? queue[queue.length - 1] : undefined);
    const example = (d: CardDirection) => (!first ? '' : d === 'term2simple' ? `${first.term} → ?` : first.translationSimple ? `${first.translationSimple} → ?` : '');
    // Prochain terme dû : un terme déjà vu qui revient, ou demain si le budget retient des nouveaux.
    const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
    const nextAt = budgetLimits ? Math.min(next ?? Infinity, tomorrow.getTime()) : next;
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <section className="card p-6">
          <p className="eyebrow">Drill Fachbegriffe</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">{scope}</h1>
          {(showPriority || showAnchor) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {showPriority && <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">Priorité {prioritySpecialty}</span>}
              {showAnchor && anchor && <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">Ton cas récent : {anchor.name}</span>}
            </div>
          )}
          {emptyDeck ? (
            <>
              <p className="mt-5 text-slate-600 dark:text-slate-300">Ce deck est encore vide — range des termes depuis leur fiche.</p>
              <Link to="/fachbegriffe/drill" className="btn-outline mt-3">Drill global</Link>
            </>
          ) : total === 0 ? (
            <>
              <p className="mt-5 font-medium text-emerald-700 dark:text-emerald-400">
                À jour ✓{nextAt ? ` — prochain terme dû le ${new Date(nextAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}
              </p>
              {caseId && theCase ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/fachbegriffe/drill?specialty=${encodeURIComponent(theCase.specialty)}`} className="btn-primary">Réviser la spécialité {theCase.specialty}</Link>
                  <Link to="/fachbegriffe/drill" className="btn-outline">Drill global</Link>
                </div>
              ) : deck && <Link to="/fachbegriffe/drill" className="btn-outline mt-3">Drill global</Link>}
            </>
          ) : (
            <>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Readout label="à revoir" value={qc.due} />
                <Readout label="nouveaux" value={qc.fresh} />
                <Readout label="min environ" value={minutes} />
              </dl>
              {budgetLimits && tomorrowNew > 0 && <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Encore {tomorrowNew} {tomorrowNew === 1 ? 'nouveau' : 'nouveaux'} demain</p>}
              <fieldset className="mt-5">
                <legend className="label mb-1.5">Sens</legend>
                <div className="grid grid-cols-2 gap-2">
                  {DIRECTIONS.map((d) => (
                    <button key={d.id} type="button" aria-pressed={direction === d.id} onClick={() => { setDirection(d.id); saveDirection(d.id); }}
                      className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-left transition-colors hover:border-brand-300 aria-pressed:border-brand-500 aria-pressed:bg-brand-50 dark:border-ink-600 dark:aria-pressed:bg-brand-900/30">
                      <span className="block text-sm font-semibold">{d.label}</span>
                      {example(d.id) && <span className="block font-mono text-xs text-slate-500 dark:text-slate-400">{example(d.id)}</span>}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button type="button" onClick={start} className="btn-primary mt-5 min-h-11 w-full gap-1.5 text-base">
                <Icon name="play" className="h-4 w-4" />Commencer
              </button>
            </>
          )}
        </section>
        <div className="text-center"><Link to={exitTo()} className="btn-ghost">← {caseId ? 'Retour au cas' : 'Glossaire'}</Link></div>
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

  const frozen = queue[idx];
  // La file (`queue`) est une copie figée au démarrage : une Bedeutung modifiée pendant la
  // session (carte personnelle, TermSheet) doit s'afficher — relire le contenu vivant depuis
  // `begriffe` (live), garder le SRS de la file pour l'ordre de notation.
  const live = begriffe.find((b) => b.id === frozen.id);
  const card = live ? { ...frozen, translationSimple: live.translationSimple, ...(isPersonalView(live) && live.context !== undefined ? { context: live.context } : {}) } : frozen;

  const grade = async (g: Grade) => {
    noted.current += 1;                                    // R-C3 : avant tout await
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

      <CardFlip card={card} direction={direction} revealed={revealed} onFlip={() => setRevealed(true)} hint=" (Leertaste)" />

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

const DIRECTIONS: { id: CardDirection; label: string }[] = [
  { id: 'term2simple', label: 'Fachbegriff → Bedeutung' },
  { id: 'simple2term', label: 'Bedeutung → Fachbegriff' },
];

/** Un relevé de la carte d'embarquement : chiffre en mono, compté une fois (P10). */
function Readout({ label, value }: { label: string; value: number }) {
  const n = useCountUp(value);
  return (
    <div data-readout={label} className="flex flex-col-reverse rounded-xl bg-slate-50 py-3 dark:bg-white/5">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-mono text-2xl font-semibold tabular-nums">{n}</dd>
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
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;   // ne vole pas la frappe d'un éditeur ouvert (I1)
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
