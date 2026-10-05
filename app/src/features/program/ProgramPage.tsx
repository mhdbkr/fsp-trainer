// ============================================================================
// Programme — le plan FIGÉ du jour, le champ de couverture, le calendrier.
//
// Ce qui a été retiré, et pourquoi (ADR-0020, audit §8) :
//  • le bandeau de sérénité et la tuile « Assiduité » — basés sur un
//    `adherencePct` aveugle au drill : une journée entière de drill affichait
//    0 % et déclenchait « Léger retard ». Ils punissaient le travail réel ;
//  • la tuile « Prêt·e » — c'était « Reste à couvrir » inversé. Deux tuiles
//    pour une information ;
//  • les jauges « Où le plan met l'accent » — leur explication décrivait un
//    seuil binaire quand l'algorithme était continu ;
//  • « Prochaines échéances » — doublon de la vue Semaine ;
//  • « Ajouter une révision » / « Reporter » / « Réinitialiser » — le plan ne
//    se recalcule plus, donc il n'y a plus rien à rattraper à la main. La
//    seule action sur un jour figé est « Replanifier ».
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCases, useProgramConfig } from '@/hooks/useData';
import { useCaseProgress, useDayPlans, useProjectedDays, useTrainingEvents } from './useProgram';
import { planProgress, programEnd, replanifier, sessionDuJour, taperDays } from '@/lib/program';
import { setIntensity, setModus } from '@/lib/programAdjust';
import { useToday } from '@/lib/today';
import { joursRestants } from '@/lib/program/trajectory';
import type { DayPlan, Intensity, TaskInstance, TaskKind } from '@/db/types';
import { ProgramSetup } from './ProgramSetup';
import { RattrapageLine } from './RattrapageLine';
import { TaskLine, TASK_META } from './TaskLine';
import { CoverageField } from './CoverageField';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui';

type View = 'semaine' | 'mois';

export function ProgramPage() {
  const config = useProgramConfig();
  const cases = useCases();
  const progress = useCaseProgress();
  const plans = useDayPlans();
  const events = useTrainingEvents();
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View>('semaine');
  const today = useToday((s) => s.day);
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  // I-1 : minuit passé, le jour choisi suit aujourd'hui s'il VALAIT aujourd'hui ;
  // un jour choisi à la main reste choisi.
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current === today) return;
    if (selected === prevToday.current) { setSelected(today); setAnchor(today); }
    prevToday.current = today;
  }, [today, selected]);
  const dayRef = useRef<HTMLDivElement>(null);
  const focusDay = (d: string) => {
    setSelected(d); setAnchor(d);
    setTimeout(() => dayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  const byDate = useMemo(() => new Map((plans ?? []).map((p) => [p.date, p])), [plans]);
  // I6 : la projection NON FIGÉE des jours à venir visibles (calendrier + jour choisi).
  const calDates = useMemo(() => [...visibleDates(view, anchor), selected], [view, anchor, selected]);
  const projected = useProjectedDays(calDates) ?? NO_PROJECTION;
  const taper = useMemo(() => (config ? taperDays(config) : new Set<string>()), [config]);

  if (config === undefined || !cases || !progress || !plans || !events) return <div className="text-slate-400">Chargement…</div>;
  if (config === null) {
    return (
      <>
        <EmptyState icon="nav-calendar" title="Aucun programme encore" hint="Configure ta préparation : le plan de chaque journée sera figé à sa première ouverture." />
        <ProgramSetup onDone={() => { /* live-query */ }} />
      </>
    );
  }
  if (editing) return <ProgramSetup initial={config} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;

  const end = programEnd(config);
  const jRestants = joursRestants(config);                       // I10 : la formule de la frise, pas une seconde

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programme</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {config.examDate ? `Examen le ${format(end, 'd MMM yyyy', { locale: fr })}` : `${config.weeks} semaines`}
            {jRestants !== null && <> · <b className="text-brand-600 dark:text-brand-300">J-{jRestants}</b></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModusSwitch value={config.modus === 'specialite' || config.modus === 'examen-blanc' ? config.modus : 'auto'} onChange={(m) => setModus(config, m === 'auto' ? null : m)} />
          <IntensitySwitch value={config.intensity} onChange={(i) => setIntensity(config, i)} />
          <button type="button" onClick={() => setEditing(true)} className="btn-outline gap-1.5 text-sm">
            <Icon name="gear" className="h-4 w-4" />Ajuster
          </button>
        </div>
      </header>

      <RattrapageLine />

      <div ref={dayRef} className="scroll-mt-24">
        <DaySurface date={selected} plan={byDate.get(selected) ?? null} projection={projected.get(selected)} isTaper={taper.has(selected)} onPick={focusDay} />
      </div>

      <CoverageField cases={cases} progress={progress} />

      <Calendar view={view} setView={setView} anchor={anchor} setAnchor={setAnchor}
        byDate={byDate} projected={projected} selected={selected} taper={taper} examISO={format(end, 'yyyy-MM-dd')}
        onFocusDay={focusDay} onZoomToDay={(d) => { setView('semaine'); setAnchor(d); setSelected(d); }} />
    </div>
  );
}

// --- La surface du jour ------------------------------------------------------

const NO_PROJECTION = new Map<string, TaskInstance[]>();

/** Les jours affichés par le calendrier — ceux dont on demande la projection. */
function visibleDates(view: View, anchor: string): string[] {
  const a = parseISO(anchor);
  const days = view === 'semaine'
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(a, { weekStartsOn: 1 }), i))
    : eachDayOfInterval({ start: startOfWeek(startOfMonth(a), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(a), { weekStartsOn: 1 }) });
  return days.map((d) => format(d, 'yyyy-MM-dd'));
}

function DaySurface({ date, plan, projection, isTaper, onPick }: {
  date: string; plan: DayPlan | null; projection?: TaskInstance[]; isTaper: boolean; onPick: (d: string) => void;
}) {
  const d = parseISO(date);
  const today = useToday((s) => s.day);                    // m-4
  const isToday = date === today;
  const isPast = date < today;
  const { faites: done, total } = planProgress(plan);
  const session = sessionDuJour(plan);
  const [busy, setBusy] = useState(false);

  return (
    <section className="card overflow-hidden border-brand-200 dark:border-brand-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-brand-50/50 px-4 py-3 dark:border-slate-800 dark:bg-brand-900/10">
        <button type="button" onClick={() => onPick(format(addDays(d, -1), 'yyyy-MM-dd'))} className="btn-ghost px-2 text-sm" title="Jour précédent">←</button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="flex flex-wrap items-center justify-center gap-2 font-semibold capitalize">
            {format(d, 'EEEE d MMMM', { locale: fr })}
            {isToday && <span className="chip bg-brand-600 py-0 text-[10px] text-white">Aujourd'hui</span>}
            {isTaper && <span className="chip bg-signal-500 py-0 text-[10px] text-white"><Icon name="target" className="h-2.5 w-2.5" />Dernière ligne droite</span>}
          </h2>
          <div className="text-[11px] text-slate-400">
            {plan ? `${done}/${total} fait${done > 1 ? 's' : ''} · ${plan.tasks.reduce((s, t) => s + t.estMin, 0)} min prévues` : '—'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isToday && <button type="button" onClick={() => onPick(today)} className="btn-ghost px-2 text-xs" title="Revenir à aujourd'hui"><Icon name="target" className="h-3.5 w-3.5" /></button>}
          <button type="button" onClick={() => onPick(format(addDays(d, 1), 'yyyy-MM-dd'))} className="btn-ghost px-2 text-sm" title="Jour suivant">→</button>
        </div>
      </div>

      <div className="p-4">
        {!plan && projection?.length ? (
          <>
            <p className="mb-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-center text-[12px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Projection, non figée : ce jour sera figé à sa première ouverture et peut changer d'ici là.
            </p>
            <div className="space-y-2 opacity-80">
              {projection.map((t) => <TaskLine key={t.id} task={t} readOnly />)}
            </div>
          </>
        ) : !plan ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {isPast
              // Un jour sans plan est un jour où l'app n'a pas été ouverte. Il
              // s'affiche vide, JAMAIS « en retard » : rien ne s'accumule.
              ? 'Journée non ouverte — rien n\'a été figé ce jour-là.'
              : 'Ce jour sera figé à sa première ouverture.'}
          </p>
        ) : plan.tasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Jour off — récupère bien.</p>
        ) : (
          <>
            <div className="space-y-2">
              {plan.tasks.map((t) => <TaskLine key={t.id} task={t} readOnly={isPast} />)}
            </div>
            {session === null && (
              <p className="mt-3 text-center text-[13px] text-emerald-600 dark:text-emerald-300">
                Journée terminée. Rien d'autre n'est proposé — c'est voulu.
              </p>
            )}
            {isToday && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-[11px] text-slate-400">
                  Ce plan est figé. Cocher marque fait ; rien ne prend la place.
                </p>
                <button
                  type="button" disabled={busy}
                  onClick={async () => {
                    if (!confirm('Replanifier la journée ? Les tâches déjà faites sont conservées ; les autres sont remplacées.')) return;
                    setBusy(true); try { await replanifier(date); } finally { setBusy(false); }
                  }}
                  className="btn-outline gap-1.5 text-xs"
                >
                  <Icon name="refresh" className="h-3.5 w-3.5" />Replanifier la journée
                </button>
              </div>
            )}
            {plan.replannedAt && (
              <p className="mt-2 text-center text-[10px] text-slate-400">Replanifiée à {format(new Date(plan.replannedAt), 'HH:mm')}.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// --- Réglages ----------------------------------------------------------------

/**
 * Le réglage EXPLICITE du mode — il n'en reste que deux (ADR-0021 décision 1). Tout le reste est observé en silence :
 * l'app suit la façon de travailler du candidat, sans la lui proposer ni la lui demander (« Automatique »).
 * Changer de mode ne réécrit AUCUN jour déjà figé.
 */
type ModusChoix = 'auto' | 'specialite' | 'examen-blanc';
const MODUS_META: { id: ModusChoix; label: string; hint: string }[] = [
  { id: 'auto', label: 'Automatique', hint: 'Le plan suit ta façon de travailler.' },
  { id: 'specialite', label: 'Spécialité', hint: 'Une spécialité travaillée à fond, puis la suivante.' },
  { id: 'examen-blanc', label: 'Examen blanc', hint: 'Des runs complets chronométrés, sans assistance.' },
];

function ModusSwitch({ value, onChange }: { value: ModusChoix; onChange: (m: ModusChoix) => void }) {
  const current = MODUS_META.find((m) => m.id === value)!;
  return (
    <label className="flex items-center gap-1.5" title={current.hint}>
      <span className="label hidden sm:inline">Avancement</span>
      <select value={value} onChange={(e) => onChange(e.target.value as ModusChoix)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900">
        {MODUS_META.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
    </label>
  );
}

const INTENSITY_META: { id: Intensity; label: string; icon: string }[] = [
  { id: 'leicht', label: 'Léger', icon: 'leaf' }, { id: 'mittel', label: 'Moyen', icon: 'bolt' }, { id: 'intensiv', label: 'Intensif', icon: 'flame' },
];
function IntensitySwitch({ value, onChange }: { value: Intensity; onChange: (i: Intensity) => void }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-ink-700" title="Intensité — volume des jours à venir">
      {INTENSITY_META.map((m) => (
        <button key={m.id} type="button" onClick={() => onChange(m.id)}
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 font-medium transition-colors ${value === m.id ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-200' : 'text-slate-500'}`}>
          <Icon name={m.icon} className="h-3.5 w-3.5" /><span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// --- Calendrier --------------------------------------------------------------

interface CalProps {
  view: View; setView: (v: View) => void; anchor: string; setAnchor: (d: string) => void;
  byDate: Map<string, DayPlan>; projected: Map<string, TaskInstance[]>; selected: string; taper: Set<string>; examISO: string;
  onFocusDay: (d: string) => void; onZoomToDay: (d: string) => void;
}

function Calendar(p: CalProps) {
  const today = useToday((s) => s.day);                    // m-4
  const a = parseISO(p.anchor);
  const step = (dir: 1 | -1) => p.setAnchor(format(p.view === 'semaine' ? addWeeks(a, dir) : addMonths(a, dir), 'yyyy-MM-dd'));
  const periodLabel = p.view === 'semaine'
    ? `Semaine du ${format(startOfWeek(a, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}`
    : format(a, 'MMMM yyyy', { locale: fr });

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} className="btn-ghost px-2 text-sm" title="Période précédente">◀</button>
          <div className="min-w-[9.5rem] text-center text-sm font-semibold capitalize">{periodLabel}</div>
          <button type="button" onClick={() => step(1)} className="btn-ghost px-2 text-sm" title="Période suivante">▶</button>
          <button type="button" onClick={() => p.setAnchor(today)} className="btn-ghost ml-1 px-2 text-xs">Aujourd'hui</button>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
          {(['semaine', 'mois'] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => p.setView(v)}
              className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${p.view === v ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>
      </div>
      {p.view === 'semaine' ? <WeekView {...p} anchor={a} /> : <MonthView {...p} anchor={a} />}
      <p className="mt-3 text-center text-[11px] text-slate-400">
        Un jour se fige à sa première ouverture. Les jours à venir montrent une projection, non figée, en pointillé.
      </p>
    </section>
  );
}

/** Deux dimensions dans 1,5 px étaient illisibles (`LoadBar`, audit §8) : une
 *  seule barre d'AVANCEMENT, et le détail des natures en pastilles. */
function DayCell({ plan, kinds, projection }: { plan?: DayPlan; kinds: TaskKind[]; projection?: TaskInstance[] }) {
  if (!plan && projection?.length) {
    return (
      <div className="flex items-center justify-between rounded-md border border-dashed border-slate-300 px-1.5 py-1 dark:border-slate-700" title="Projection, non figée">
        <span className="text-[10px] text-slate-400">projection</span>
        <span className="text-[11px] tnum text-slate-400">≈ {projection.reduce((m, t) => m + t.estMin, 0)} min</span>
      </div>
    );
  }
  if (!plan || plan.tasks.length === 0) return null;
  const { faites: done, total } = planProgress(plan);
  return (
    <>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1">
          {kinds.slice(0, 4).map((k) => (
            <span key={k} title={TASK_META[k].label} className={`flex h-5 w-5 items-center justify-center rounded ${TASK_META[k].badge}`}>
              <Icon name={TASK_META[k].icon} className="h-3 w-3" />
            </span>
          ))}
        </div>
        <span className="text-[11px] font-medium tnum text-slate-400">{done}/{total}</span>
      </div>
    </>
  );
}

function WeekView({ anchor, byDate, projected, selected, taper, onFocusDay }: Omit<CalProps, 'anchor'> & { anchor: Date }) {
  const today = useToday((s) => s.day);
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((date) => {
        const k = format(date, 'yyyy-MM-dd');
        const plan = byDate.get(k);
        const kinds = [...new Set((plan?.tasks ?? []).map((t) => t.kind))];
        return (
          <button key={k} type="button" onClick={() => onFocusDay(k)}
            className={`card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400 ${k === selected ? 'border-brand-500 ring-1 ring-brand-400' : k === today ? 'ring-1 ring-brand-300' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold capitalize">{format(date, 'EEE d', { locale: fr })}</div>
              {taper.has(k) && <Icon name="target" className="h-3.5 w-3.5 text-signal-500" title="Dernière ligne droite" />}
            </div>
            <div className="mt-2"><DayCell plan={plan} kinds={kinds} projection={projected.get(k)} /></div>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, byDate, projected, selected, taper, examISO, onZoomToDay }: Omit<CalProps, 'anchor'> & { anchor: Date }) {
  const today = useToday((s) => s.day);
  const monthStart = startOfMonth(anchor);
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  });
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const k = format(date, 'yyyy-MM-dd');
          const plan = byDate.get(k);
          const { faites: done, total } = planProgress(plan);
          return (
            <button key={k} type="button" onClick={() => onZoomToDay(k)}
              className={`flex min-h-[58px] flex-col rounded-lg border p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400
                ${k === selected ? 'border-brand-500 ring-1 ring-brand-400' : k === today ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20' : taper.has(k) ? 'border-signal-200 dark:border-signal-900/40' : 'border-slate-100 dark:border-slate-800'}
                ${isSameMonth(date, monthStart) ? '' : 'opacity-40'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold">{format(date, 'd')}</span>
                {k === examISO
                  ? <Icon name="flag" className="h-3.5 w-3.5 text-signal-500" title="Jour de l'examen" />
                  : total > 0 && done === total ? <Icon name="check" className="h-3 w-3 text-emerald-500" /> : null}
              </div>
              {total === 0 && projected.get(k) && (
                <div className="mt-auto h-1 w-full rounded-full border border-dashed border-slate-300 dark:border-slate-700" title="Projection, non figée" />
              )}
              {total > 0 && (
                <div className="mt-auto">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                  </div>
                  <div className="mt-1 text-right text-[10px] font-medium tnum text-slate-400">{done}/{total}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
