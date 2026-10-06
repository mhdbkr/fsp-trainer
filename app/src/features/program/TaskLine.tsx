// ============================================================================
// La ligne d'une tâche du plan figé.
//
// ⚠️ POINT DE RACCORD AVEC LE CHANTIER C5 (`feat/s3-primitives`).
// L'étiquette proprement dite appartient à `<TaskLabel>` (C5,
// `components/TaskLabel.tsx`). Elle n'est PAS réécrite ici : ce fichier rend le
// CONTENEUR (glyphe, explication, action, coche) et appelle l'étiquette au seul
// endroit du chantier où elle est montée. Au merge, `TaskAnatomy` ci-dessous
// devient un `<TaskLabel task={task} />` d'une ligne.
//
// Trois changements de contrat demandés à C5, par `main` (voir le rapport) :
//   1. `TaskLabel` doit accepter `TaskInstance`, pas `ProgramBlock` (ADR-0017
//      remplace le second par le premier). Les champs lus sont identiques.
//   2. `TASK_GLYPH` doit gagner la clé `'examen-blanc'` — `TaskKind` a six
//      valeurs, `ProgramBlockKind` en avait cinq.
//   3. `taskSubject()` devient l'IDENTITÉ : `TaskInstance.label` est désormais
//      le seul nom du sujet. La cale de transition peut disparaître.
// ============================================================================
import { ARTICLE } from '@/components/visuals/CaseDialText';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DayPlan, SimTeil, TaskInstance, TaskKind, TrainingEvent } from '@/db/types';
import { TEILE } from '@/lib/simScope';
import { Icon } from '@/components/icons';
import { markTaskDone } from '@/lib/journal';
import { estTacheDeCas, evaluerTache } from '@/lib/program/completion';
import { dureesTeile } from '@/lib/program/durees';
import { erreursTransversales, libelleItem, texteRappel } from '@/lib/program/erreurs';
import { teileDeTache } from '@/lib/program/tacheDeCas';
import { debutJour } from '@/lib/program/fuseau';
import { useToday } from '@/lib/today';
import { useDayPlan, useTrainingEvents } from './useProgram';
import { useAllTerms, useFavorites } from '@/hooks/useData';
import { loadDrillContext, type DrillContext } from '@/lib/collections/drillContext';
import { queueCounts } from '@/lib/collections/drillQueue';
import { drillFavorisNote } from '@/lib/program/dayPlan';

export const TASK_META: Record<TaskKind, { icon: string; badge: string; bar: string; label: string }> = {
  simulation: { icon: 'stethoscope', badge: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300', bar: 'bg-brand-500', label: 'Simulation' },
  drill: { icon: 'id', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300', bar: 'bg-sky-400', label: 'Drill' },
  fachwissen: { icon: 'brain', badge: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', bar: 'bg-violet-400', label: 'Fachwissen' },
  aufklaerung: { icon: 'syringe', badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', bar: 'bg-amber-400', label: 'Aufklärung' },
  revision: { icon: 'history', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', bar: 'bg-emerald-400', label: 'Révision' },
  'examen-blanc': { icon: 'flag', badge: 'bg-signal-100 text-signal-600 dark:bg-signal-900/30 dark:text-signal-300', bar: 'bg-signal-500', label: 'Examen à blanc' },
};

/** Où mène une tâche. Une seule table, partagée par toutes les vues. */
export function taskLink(t: TaskInstance, reste?: readonly SimTeil[]): string {
  // R-C4 : la tâche voyage avec la partie (`task=`), la sauvegarde la coche si la partie la satisfait (I-A).
  if ((t.kind === 'simulation' || t.kind === 'examen-blanc' || t.kind === 'revision') && t.caseId) {
    // S4-2 (revue I1) : la ligne dit « il te reste la Dokumentation » ⇒ on part de là. `reste` = ce qui reste DANS la
    // journée (tâche entamée), sinon ce que la tâche porte. Le cas entier part du début. La tâche reste « entamée » tant
    // que tout le reste n'est pas joué (§12.3). [S4-3] `?depart=` : le Teil de DÉPART, jamais le périmètre — la partie
    // porte les trois Teile (simulation-run.md §10.3) ; toute tâche de cas se lance ainsi, `revision` comprise (m8).
    const r = t.teil ? [t.teil] : reste ?? t.teile ?? [];
    const depart = r.length && (r[0] !== 'anamnese' || r.length === 1) ? r[0] : undefined;
    return `/simulation/${t.caseId}/pre?${new URLSearchParams({ ...(depart ? { depart } : {}), task: t.id })}`;
  }
  if (t.kind === 'drill') return `/fachbegriffe/drill${t.caseId ? `?case=${encodeURIComponent(t.caseId)}` : t.specialty ? `?specialty=${encodeURIComponent(t.specialty)}` : ''}`;
  if (t.kind === 'fachwissen') return t.caseId ? `/cas/${t.caseId}` : '/fachwissen';
  return t.caseId ? `/cas/${t.caseId}` : '/simulation';
}

export const taskCta = (t: TaskInstance): string =>
  t.kind === 'drill' ? 'Réviser' : t.kind === 'fachwissen' ? 'Lire' : 'Lancer';

/** Zone « portée » : le Teil SEUL, et absente sur un run complet — on lit la
 *  complétude à l'absence de pastille, pas à un mot de plus. */
function ScopeTag({ teil }: { teil: NonNullable<TaskInstance['teil']> }) {
  const t = TEILE.find((x) => x.key === teil);
  return t ? <span className="dim-tag gap-1.5"><Icon name={t.icon} className="h-3.5 w-3.5 shrink-0" aria-hidden />{t.label}</span> : null;
}


/** « la Dokumentation et la Fallvorstellung » — ce qui reste d'un cas, dans l'ordre d'examen. */
export const resteTexte = (teile: readonly SimTeil[]): string => {
  const mots = teile.map((t) => ARTICLE[t]);
  return mots.length > 1 ? `${mots.slice(0, -1).join(', ')} et ${mots[mots.length - 1]}` : mots[0] ?? '';
};

/** Ce que la ligne d'une tâche dit EN PLUS de la tâche figée : ce qui reste du cas (« il te reste la Dokumentation · 10 min »)
 *  et le rappel d'une erreur transversale (§13.3), dit avec ses chiffres. Lu dans le journal, jamais stocké. */
export interface LectureTache { reste?: { teile: SimTeil[]; min: number }; rappel?: string; soiree?: string; aRejouer?: true; entamee?: true }

/** Une tâche d'un trait entamée à part (I5) : rien ne « reste », le cas reprend au début. « D'un trait » est dans la raison. */
const A_REJOUER = "À reprendre depuis l'Anamnese";

export function lectureDuPlan(plan: DayPlan, events: readonly TrainingEvent[]): Map<string, LectureTache> {
  const out = new Map<string, LectureTache>();
  const durees = dureesTeile(events);
  // Le rappel a été posé sur le journal d'AVANT le jour (INV-55) : ses chiffres se relisent sur le même.
  const signaux = plan.tasks.some((t) => t.rappel) ? erreursTransversales(events.filter((e) => e.at < debutJour(plan.date, plan.tz))) : [];
  // Soirée courte (revue pédagogique) : la tâche FORCÉE — la première tâche de cas — fait dépasser le budget du jour ;
  // on l'annonce en deux soirées. Jamais pour un examen à blanc ni une tâche d'un trait : ils se jouent d'un trait.
  let cumul = 0, forcee = false;
  for (const t of plan.tasks) {
    cumul += t.estMin;
    const premiereDeCas = !forcee && (t.kind === 'simulation' || t.kind === 'revision' || t.kind === 'examen-blanc');
    if (premiereDeCas) forcee = true;
    if (t.doneAt !== undefined) continue;
    const l: LectureTache = {};
    if (estTacheDeCas(t.kind) && t.teile) {                                     // un plan série 3 dit son Teil par sa pastille
      const e = evaluerTache(t, events, plan.tz);
      // D'un trait entamée à part : ce qui a été joué ne compte pas pour elle, rien ne « reste » (I5).
      // Entamée : les minutes de ce qui reste ; sinon l'estimation figée avec la tâche.
      if (t.dUnTrait && e.avancement.length > 0) l.aRejouer = true;
      else if (e.reste.length > 0 && e.reste.length < 3) l.reste = { teile: e.reste, min: e.avancement.length ? e.reste.reduce((s, k) => s + durees[k], 0) : t.estMin };
      // m6 (S4-2) : entamée, la raison figée au matin (« jamais travaillé ») se lirait fausse ; la ligne dit ce qui reste.
      if (e.avancement.length > 0 && !l.aRejouer) l.entamee = true;
    }
    if (premiereDeCas && t.kind !== 'examen-blanc' && t.dUnTrait !== true && cumul > plan.targetMin) {
      const teile = l.reste?.teile ?? teileDeTache(t);
      if (teile.length > 1) l.soiree = `Ce soir ${ARTICLE[teile[0]]} (${durees[teile[0]]} min) · demain la suite.`;
    }
    if (t.rappel) {
      const s = signaux.find((x) => x.item === t.rappel);
      l.rappel = s ? texteRappel(s) : `Rappel : « ${libelleItem(t.rappel) ?? t.rappel} ».`;
    }
    if (l.reste || l.rappel || l.soiree || l.aRejouer || l.entamee) out.set(t.id, l);
  }
  return out;
}

/** L'anatomie — sujet, portée, état, coût. Le type, la couche, l'assistance et
 *  la durée se lisent DANS LES CHAMPS : plus aucune concaténation, et la vue ne
 *  les ré-affiche pas à côté. */
export function TaskAnatomy({ task, reste, aRejouer, lien }: { task: TaskInstance; reste?: LectureTache['reste']; aRejouer?: boolean; lien?: string }) {
  const state = [
    task.assistance === 'assiste' ? 'assisté' : task.assistance === 'autonome' ? 'autonome' : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* S4-5 : sur le Programme, le titre OUVRE la tâche (une seule action « lancer » par écran : « Commencer par … »). */}
      {lien
        ? <Link to={lien} data-cta={taskCta(task)} className="min-w-0 flex-[1_1_100%] [overflow-wrap:anywhere] font-medium text-slate-800 decoration-brand-300 underline-offset-2 hover:underline dark:text-slate-100">{task.label}</Link>
        : <span className="min-w-0 flex-[1_1_100%] [overflow-wrap:anywhere] font-medium text-slate-800 dark:text-slate-100">{task.label}</span>}
      {task.teil && <ScopeTag teil={task.teil} />}
      {reste && <span className="dim-tag shrink-0">Il te reste {resteTexte(reste.teile)}</span>}
      {aRejouer && <span className="dim-tag shrink-0">{A_REJOUER}</span>}
      {state && <span className="label shrink-0">{state}</span>}
      <span className="mono-tag tnum shrink-0">{reste?.min ?? task.estMin} min</span>
    </div>
  );
}

/** « dont N favoris de ta séance » sous la tâche drill du jour (lot F point 4). Lu à l'AFFICHAGE — favoris vivants,
 *  file que le drill servirait maintenant (`queueCounts`) — jamais stocké : le plan figé (INV-55) n'en dépend pas.
 *  Monté seulement sur la tâche drill à faire du jour : le glossaire n'est lu que là. */
function DrillFavoris() {
  const terms = useAllTerms();
  const favorites = useFavorites();
  const [ctx, setCtx] = useState<DrillContext | null>(null);
  useEffect(() => { let vivant = true; loadDrillContext().then((c) => { if (vivant) setCtx(c); }).catch((e) => console.warn('[drill-favoris]', e)); return () => { vivant = false; }; }, []);
  const n = useMemo(() => (ctx && terms && favorites
    ? queueCounts(terms, { newLimit: ctx.remaining, maxReviews: ctx.reviewsRemaining, relevance: { ...ctx.relevance, favorites } }).favorites
    : 0), [ctx, terms, favorites]);
  const note = drillFavorisNote(n);
  return note ? <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{note}</div> : null;
}

/**
 * Une tâche, cochable — TOUTES les tâches, pas seulement les simulations à
 * couche : Fachwissen, examen à blanc et reprise de partie faible n'avaient
 * aucune action « fait » (`ProgramPage.tsx:375-380`).
 *
 * Cocher écrit un événement dans le journal et pose `doneAt`. Rien d'autre ne
 * bouge : aucune tâche ne prend la place.
 */
export function TaskLine({ task, readOnly = false, showReason = true, lecture, lancer = true, lien = true }: { task: TaskInstance; readOnly?: boolean; showReason?: boolean; lecture?: LectureTache; lancer?: boolean; lien?: boolean }) {
  const meta = TASK_META[task.kind];
  const done = task.doneAt !== undefined;
  const today = useToday((s) => s.day);
  return (
    <div className={`rounded-xl border transition-colors ${done ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.badge}`} title={meta.label}>
          <Icon name={meta.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-[10rem] flex-1">
          <TaskAnatomy task={task} reste={done ? undefined : lecture?.reste} aRejouer={!done && lecture?.aRejouer} lien={!lancer && lien && !done && !readOnly ? taskLink(task, lecture?.reste?.teile) : undefined} />
          {/* Le « pourquoi aujourd'hui », figé avec la tâche. */}
          {showReason && !(lecture?.entamee && !done) && <div className="mt-0.5 text-[11px] text-slate-400">{task.reason}</div>}
          {/* Le rappel d'une erreur transversale : un fait, sans jugement (T2). */}
          {!done && lecture?.rappel && <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{lecture.rappel}</div>}
          {!done && lecture?.soiree && <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{lecture.soiree}</div>}
          {!done && !readOnly && task.kind === 'drill' && task.date === today && <DrillFavoris />}
        </div>
        {done ? (
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
            <Icon name="check" className="h-3.5 w-3.5" />Fait
          </span>
        ) : readOnly ? null : (
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button" onClick={() => markTaskDone(task)} title="Marquer faite"
              className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
            >✓ Fait</button>
            {lancer && (
              <Link to={taskLink(task, lecture?.reste?.teile)} className="btn-primary gap-1 px-3 py-1.5 text-xs">
                <Icon name="play" className="h-3 w-3" />{taskCta(task)}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Le « pourquoi » que PLUSIEURS tâches à faire partagent mot pour mot (≥ 3) :
 *  il se dit une fois, au lieu d'être recopié sur chaque ligne. */
export function raisonCommune(tasks: TaskInstance[]): { reason: string; n: number } | null {
  const n = new Map<string, number>();
  for (const t of tasks) if (t.doneAt === undefined) n.set(t.reason, (n.get(t.reason) ?? 0) + 1);
  const [reason, count] = [...n.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return reason !== undefined && count! >= 3 ? { reason, n: count! } : null;
}

/** Le plan du jour : le titre entier d'abord, le « pourquoi » ensuite — et une
 *  raison commune dite une seule fois, au-dessus des lignes qui la partagent. */
/** `lancer = false` (Programme, S4-5) : les lignes gardent « Fait », perdent « Lancer » ; le titre ouvre la tâche. */
/** `lecture` : ce qui reste et les rappels, déjà lus par l'écran qui monte la liste (le Programme) — sans elle, la liste
 *  relit le plan et le journal, et montre la raison figée tant que ses requêtes ne sont pas revenues. */
export function TaskList({ tasks, lancer = true, sansLien, lecture: lue }: { tasks: TaskInstance[]; lancer?: boolean; sansLien?: string; lecture?: Map<string, LectureTache> }) {
  // Ce qui reste et les rappels (l'accueil monte cette liste) : lus sur le plan FIGÉ du jour (son fuseau) et le journal.
  const date = tasks[0]?.date;
  const today = useToday((s) => s.day);
  const plan = useDayPlan(date);
  const events = useTrainingEvents();
  const relue = useMemo(() => (!lue && plan && events && date === today ? lectureDuPlan(plan, events) : new Map<string, LectureTache>()), [lue, plan, events, date, today]);
  const lecture = lue ?? relue;
  const commune = raisonCommune(tasks.filter((t) => !lecture.get(t.id)?.entamee));      // m6 : une tâche entamée ne dit plus sa raison
  return (
    <div className="space-y-2">
      {commune && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="label">Même raison pour les {commune.n} cas</span> · {commune.reason}
        </p>
      )}
      {tasks.map((t) => <TaskLine key={t.id} task={t} lancer={lancer} lien={t.id !== sansLien} lecture={lecture.get(t.id)} showReason={!commune || t.doneAt !== undefined || t.reason !== commune.reason} />)}
    </div>
  );
}
