import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Icon } from '@/components/icons';
import { useAllTerms, useDecks, useDeckTerms, useFavorites, useCase } from '@/hooks/useData';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { isPersonalView, rateTerm } from '@/lib/collections/allTerms';
import { CardFlip, type CardDirection } from '@/components/CardFlip';
import { useSwap } from '@/components/useSwap';
import { FAVORITES_DECK_ID } from '@/db/types';
import { reviewSrs, type Grade } from '@/lib/srs';
import { markIntroduced, markReviewed } from '@/lib/srsBudget';
import { termsOfDeck } from '@/lib/collections/query';
import { caseFavoriteIds, termsOfCase } from '@/lib/collections/caseTerms';
import { buildDrillQueue, nextDueAt, queueCounts } from '@/lib/collections/drillQueue';
import { loadDrillContext, type DrillContext } from '@/lib/collections/drillContext';
import { drillMinutes, recentCaseAnchor } from '@/lib/collections/relevance';
import { routeDeReprise, useSimSession } from '@/store/simSession';
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
  // Lot F point 3 : le drill qui suit un cas commence par les favoris posés pendant ce cas.
  const leadIds = useMemo(() => (caseId ? caseFavoriteIds(caseId, events ?? [], favorites ?? []) : undefined), [caseId, events, favorites]);
  // m2 : UNE source de favoris, la liste vivante — jamais l'instantané chargé avec le contexte.
  const relevanceOf = useCallback((c: DrillContext | null) => (c ? { ...c.relevance, favorites: favorites ?? [] } : undefined), [favorites]);
  const buildQueue = useCallback(
    (c: DrillContext | null = ctx) => buildDrillQueue(pool, { prioritySpecialty, priorityPathology, newLimit: c?.remaining ?? 0, maxReviews: c?.reviewsRemaining, relevance: relevanceOf(c), leadIds }),
    [pool, prioritySpecialty, priorityPathology, ctx, leadIds, relevanceOf],
  );

  useEffect(() => {
    if (begriffe && ctx && favorites && !started) setQueue(buildQueue());
  }, [begriffe, ctx, favorites, started, buildQueue]);

  const qc = useMemo(
    () => queueCounts(pool, { prioritySpecialty, priorityPathology, newLimit: ctx?.remaining ?? 0, maxReviews: ctx?.reviewsRemaining, relevance: relevanceOf(ctx), leadIds }),
    [pool, ctx, prioritySpecialty, priorityPathology, leadIds, relevanceOf],
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

  // ── L'ÉTAT DE SORTIE (s3-primitives T6) ──────────────────────────────────
  // Il y avait deux états (`revealed` vrai/faux) pour TROIS moments : question,
  // réponse, passage. Le troisième n'était pas modélisé, donc `setRevealed(false)`
  // et `setIdx(i+1)` tombaient dans le même commit : la face recto portait déjà le
  // mot suivant au frame 0 d'une rotation de 500 ms, il surgissait de biais vers
  // 250 ms, pendant que le verso — la réponse qu'on venait de noter — se vidait
  // d'un coup. `useSwap` donne ce moment manquant à toute l'app ; ici il retient
  // la CARTE affichée (pas seulement son index : une « Nouvelle session »
  // remplace la file entière, un index retenu pointerait alors la mauvaise carte)
  // et le dénominateur du compteur, le temps de la sortie.
  // Appelé avant tout retour anticipé : c'est un hook.
  const { value: shown, leaving } = useSwap(idx, { idx, total: queue.length, card: queue[idx] as AnyTerm | undefined });

  if (!begriffe || !ctx) return <div className="text-slate-400">Chargement…</div>;

  const next = nextDueAt(pool, Date.now(), favorites ?? []);
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
        return routeDeReprise(simSnapshot);
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
              <DirectionChoice value={direction} sample={first?.translationSimple ? first : undefined} onChange={(d) => { setDirection(d); saveDirection(d); }} />
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

  // Fin de session = plus de carte RETENUE. Gaté sur le swap et non sur `idx`
  // pour que la dernière carte ait droit à sa sortie comme les autres.
  if (!shown.card) {
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

  const frozen = shown.card;
  // La file (`queue`) est une copie figée au démarrage : une Bedeutung modifiée pendant la
  // session (carte personnelle, TermSheet) doit s'afficher — relire le contenu vivant depuis
  // `begriffe` (live), garder le SRS de la file pour l'ordre de notation.
  const live = begriffe.find((b) => b.id === frozen.id);
  const card = live ? { ...frozen, translationSimple: live.translationSimple, ...(isPersonalView(live) && live.context !== undefined ? { context: live.context } : {}) } : frozen;
  // Pendant la sortie on continue de montrer la RÉPONSE : c'est la carte qu'on
  // vient de noter qui s'en va, pas une carte vide qui tourne.
  const showAnswer = revealed || leaving;

  const grade = (g: Grade) => {
    noted.current += 1;                                    // R-C3 : compté au clic
    const wasNew = card.srs.state === 'Neu';
    const newSrs = reviewSrs(card.srs, g);
    // Le retour visuel part AVANT l'écriture IndexedDB. `await rateTerm(...)`
    // précédait tout rendu : le délai clic → début d'animation valait la latence
    // disque (~5 à ~60 ms selon la pression), donc jamais le même d'un clic à
    // l'autre — c'était la source mesurée du caractère « saccadé », indépendante
    // du bug de contenu. L'écriture n'a aucune raison de tenir l'image.
    setStats((s) => ({ done: s.done + 1, again: s.again + (g < 3 ? 1 : 0) }));
    if (g < 3) {
      // remet la carte en fin de file pour la revoir dans la session
      setQueue((q) => [...q, { ...card, srs: newSrs }]);
    }
    setRevealed(false);
    setIdx((i) => i + 1);
    void rateTerm(card, g).then(() => { if (wasNew) void markIntroduced(); else void markReviewed(); });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <Link to={exitTo()} className="hover:text-brand-600">✕ Quitter</Link>
        {/* `tnum` : sans chiffres tabulaires la ligne sautillait au passage de
            9 à 10. Position ET dénominateur viennent du swap — le compteur
            change avec la carte, jamais avant elle. */}
        <span className="tnum">{shown.idx + 1} / {shown.total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        {/* `transition-all` sans durée tombait sur les 150 ms `ease` par défaut de
            Tailwind — la seule courbe de l'app qui n'est pas la nôtre. Et on
            anime `transform`, pas `width` : une largeur relance la mise en page
            à chaque frame, un `scaleX` depuis la gauche reste sur le compositeur. */}
        <div className="h-full origin-left bg-brand-500 transition-transform duration-300 ease-fluid motion-reduce:transition-none" style={{ transform: `scaleX(${shown.idx / Math.max(shown.total, 1)})` }} />
      </div>

      {/* La carte et ses notes sortent ENSEMBLE : ce sont un seul objet à
          l'écran. `key` sur le bloc : l'entrant est un nouveau nœud, il naît
          donc recto, sans rotation inverse à rattraper (faute (a) de l'audit). */}
      <div key={shown.idx} className={leaving ? 'swap-out' : 'swap-in'}>
        <CardFlip card={card} direction={direction} revealed={showAnswer} onFlip={(r) => { if (!leaving) setRevealed(r); }} />

        {showAnswer && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            <GradeBtn label="Wieder" sub="<1 min" color="rose" onClick={() => grade(0)} />
            <GradeBtn label="Schwer" sub="1 j" color="amber" onClick={() => grade(3)} />
            <GradeBtn label="Gut" sub={`${card.srs.repetitions >= 2 ? Math.round(card.srs.interval * card.srs.easeFactor) || 6 : card.srs.repetitions === 1 ? 6 : 1} j`} color="emerald" onClick={() => grade(4)} />
            <GradeBtn label="Einfach" sub="+" color="sky" onClick={() => grade(5)} />
          </div>
        )}
      </div>

      {/* AUCUNE touche pendant la sortie : l'objet visé n'est plus là. Ni
          notation, ni Espace — qui retournait la carte SUIVANTE avant qu'elle
          entre : la réponse s'affichait avant la question (fix-s3 I1). */}
      <KeyboardShortcuts off={leaving} revealed={revealed} onReveal={() => setRevealed(true)} onGrade={grade} />
    </div>
  );
}

const DIRECTIONS: { id: CardDirection; from: string; to: string; hint: string }[] = [
  { id: 'term2simple', from: 'Fachbegriff', to: 'Bedeutung', hint: 'Tu vois le mot, tu donnes le sens.' },
  { id: 'simple2term', from: 'Bedeutung', to: 'Fachbegriff', hint: 'Tu vois le sens, tu retrouves le mot.' },
];

/** Choix du sens (F4c) : chaque option MONTRE son sens — une carte d'exemple qui se
 *  retourne au survol / focus ; à l'arrivée, celle du sens retenu se retourne une fois d'elle-même.
 *  Exemple = un terme hors de la file du jour (jamais la réponse à venir) ; sans exemple sûr,
 *  les mots « Fachbegriff » / « Bedeutung ». La démo (animation) et le survol (transition)
 *  tournent sur DEUX enveloppes distinctes : les rotations se composent, sans saut. */
function DirectionChoice({ value, sample, onChange }: { value: CardDirection; sample?: AnyTerm; onChange: (d: CardDirection) => void }) {
  const [initial] = useState(value);
  return (
    <fieldset className="mt-6">
      <legend className="field-label mb-2">Sens</legend>
      <div className="grid grid-cols-2 gap-3">
        {DIRECTIONS.map((d) => {
          const on = value === d.id;
          const term = sample?.term ?? 'Fachbegriff';
          const sense = sample?.translationSimple ?? 'Bedeutung';
          const [front, back] = d.id === 'term2simple' ? [term, sense] : [sense, term];
          const faceCls = 'grid place-items-center overflow-hidden rounded-xl px-2 text-center [backface-visibility:hidden] [grid-area:1/1] [overflow-wrap:anywhere] [hyphens:auto]';
          return (
            <button key={d.id} type="button" aria-pressed={on} onClick={() => onChange(d.id)}
              className="group rounded-2xl border border-slate-200 bg-white/40 p-2.5 text-left transition-[transform,border-color,background-color] duration-300 ease-fluid hover:-translate-y-0.5 hover:border-brand-300 aria-pressed:border-brand-500 aria-pressed:bg-brand-50/70 motion-reduce:hover:translate-y-0 dark:border-ink-600 dark:bg-white/[0.03] dark:aria-pressed:border-brand-400 dark:aria-pressed:bg-brand-900/30">
              <span aria-hidden className="block [perspective:800px]">
                <span className={`block [transform-style:preserve-3d] ${d.id === initial ? 'animate-demo-flip' : ''}`}>
                <span className="grid h-[4.5rem] transition-transform duration-700 ease-fluid [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]">
                  <span data-example={sample ? 'front' : undefined} className={`${faceCls} bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-ink-700 dark:text-white dark:ring-white/10 ${d.id === 'term2simple' ? 'font-display text-base font-bold leading-tight tracking-tightish sm:text-lg' : 'text-[13px] leading-snug'}`} lang="de"><span className="line-clamp-2">{front}</span></span>
                  <span className={`${faceCls} bg-brand-600 text-white [transform:rotateY(180deg)] dark:bg-brand-500 ${d.id === 'term2simple' ? 'text-[13px] leading-snug' : 'font-display text-base font-bold leading-tight tracking-tightish sm:text-lg'}`} lang="de"><span className="line-clamp-2">{back}</span></span>
                </span>
                </span>
              </span>
              <span className="mt-3 flex flex-wrap items-center gap-x-1.5 px-1 font-display text-[15px] font-semibold tracking-tightish text-slate-900 dark:text-white">
                {d.from} <span className="whitespace-nowrap"><span className="inline-block text-brand-600 transition-transform duration-300 ease-fluid group-hover:translate-x-0.5 dark:text-brand-300">→</span> {d.to}</span>
              </span>
              <span className="mt-0.5 block px-1 pb-0.5 text-xs text-slate-500 dark:text-slate-400">{d.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

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

function KeyboardShortcuts({ off, revealed, onReveal, onGrade }: { off: boolean; revealed: boolean; onReveal: () => void; onGrade: (g: Grade) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;   // ne vole pas la frappe d'un éditeur ouvert (I1)
      if (off) { if (e.key === ' ') e.preventDefault(); return; }   // pendant la sortie : Espace ne fait pas non plus défiler
      if (e.key === ' ' && !revealed && !target?.closest('button, a, summary')) { e.preventDefault(); onReveal(); }   // Espace sur un bouton focalisé (Recto…) l'active, lui
      else if (revealed) {
        if (e.key === '1') onGrade(0);
        else if (e.key === '2') onGrade(3);
        else if (e.key === '3') onGrade(4);
        else if (e.key === '4') onGrade(5);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [off, revealed, onReveal, onGrade]);
  return null;
}
