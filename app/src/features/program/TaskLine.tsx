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
import { Link } from 'react-router-dom';
import type { TaskInstance, TaskKind } from '@/db/types';
import { TEILE } from '@/lib/simScope';
import { Icon } from '@/components/icons';
import { markTaskDone } from '@/lib/journal';

export const TASK_META: Record<TaskKind, { icon: string; badge: string; bar: string; label: string }> = {
  simulation: { icon: 'stethoscope', badge: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300', bar: 'bg-brand-500', label: 'Simulation' },
  drill: { icon: 'id', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300', bar: 'bg-sky-400', label: 'Drill' },
  fachwissen: { icon: 'brain', badge: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', bar: 'bg-violet-400', label: 'Fachwissen' },
  aufklaerung: { icon: 'syringe', badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', bar: 'bg-amber-400', label: 'Aufklärung' },
  revision: { icon: 'history', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', bar: 'bg-emerald-400', label: 'Révision' },
  'examen-blanc': { icon: 'flag', badge: 'bg-signal-100 text-signal-600 dark:bg-signal-900/30 dark:text-signal-300', bar: 'bg-signal-500', label: 'Examen à blanc' },
};

/** Où mène une tâche. Une seule table, partagée par toutes les vues. */
export function taskLink(t: TaskInstance): string {
  // R-C4 : la tâche voyage avec la partie (`task=`), la sauvegarde la coche si la partie la satisfait (I-A).
  if ((t.kind === 'simulation' || t.kind === 'examen-blanc') && t.caseId) return `/simulation/${t.caseId}/pre?${new URLSearchParams({ ...(t.teil ? { teil: t.teil } : {}), task: t.id })}`;
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

/** L'anatomie — sujet, portée, état, coût. Le type, la couche, l'assistance et
 *  la durée se lisent DANS LES CHAMPS : plus aucune concaténation, et la vue ne
 *  les ré-affiche pas à côté. */
export function TaskAnatomy({ task }: { task: TaskInstance }) {
  const state = [
    task.layer !== undefined ? `Couche ${task.layer}` : null,
    task.assistance === 'assiste' ? 'assisté' : task.assistance === 'autonome' ? 'autonome' : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="min-w-0 flex-[1_1_100%] [overflow-wrap:anywhere] font-medium text-slate-800 dark:text-slate-100">{task.label}</span>
      {task.teil && <ScopeTag teil={task.teil} />}
      {state && <span className="label shrink-0">{state}</span>}
      <span className="mono-tag tnum shrink-0">{task.estMin} min</span>
    </div>
  );
}

/**
 * Une tâche, cochable — TOUTES les tâches, pas seulement les simulations à
 * couche : Fachwissen, examen à blanc et reprise de partie faible n'avaient
 * aucune action « fait » (`ProgramPage.tsx:375-380`).
 *
 * Cocher écrit un événement dans le journal et pose `doneAt`. Rien d'autre ne
 * bouge : aucune tâche ne prend la place.
 */
export function TaskLine({ task, readOnly = false, showReason = true }: { task: TaskInstance; readOnly?: boolean; showReason?: boolean }) {
  const meta = TASK_META[task.kind];
  const done = task.doneAt !== undefined;
  return (
    <div className={`rounded-xl border transition-colors ${done ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.badge}`} title={meta.label}>
          <Icon name={meta.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-[10rem] flex-1">
          <TaskAnatomy task={task} />
          {/* Le « pourquoi aujourd'hui », figé avec la tâche. */}
          {showReason && <div className="mt-0.5 text-[11px] text-slate-400">{task.reason}</div>}
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
            <Link to={taskLink(task)} className="btn-primary gap-1 px-3 py-1.5 text-xs">
              <Icon name="play" className="h-3 w-3" />{taskCta(task)}
            </Link>
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
export function TaskList({ tasks }: { tasks: TaskInstance[] }) {
  const commune = raisonCommune(tasks);
  return (
    <div className="space-y-2">
      {commune && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <span className="label">Même raison pour les {commune.n} cas</span> · {commune.reason}
        </p>
      )}
      {tasks.map((t) => <TaskLine key={t.id} task={t} showReason={!commune || t.doneAt !== undefined || t.reason !== commune.reason} />)}
    </div>
  );
}
