import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, parseISO, isSameDay, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval,
  isSameMonth, addDays, addWeeks, addMonths, differenceInCalendarDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCases, useSimulations, useFachbegriffe, useProgramConfig } from '@/hooks/useData';
import { generateProgram, programStats, programEnd, disciplineStats, type DisciplineStat } from '@/lib/program';
import { markLayerDone, postponeCase, addExtra, removeExtra, toggleSkipDrill, setIntensity, resetAdjust } from '@/lib/programAdjust';
import type { Case, Intensity, ProgramBlock, ProgramConfig, ProgramDay } from '@/db/types';
import { ProgramSetup } from './ProgramSetup';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui';

export const BLOCK_META: Record<ProgramBlock['kind'], { icon: string; badge: string; bar: string; label: string }> = {
  simulation: { icon: 'stethoscope', badge: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300', bar: 'bg-brand-500', label: 'Simulation' },
  drill: { icon: 'id', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300', bar: 'bg-sky-400', label: 'Drill' },
  fachwissen: { icon: 'brain', badge: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', bar: 'bg-violet-400', label: 'Fachwissen' },
  aufklaerung: { icon: 'syringe', badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', bar: 'bg-amber-400', label: 'Aufklärung' },
  revision: { icon: 'history', badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300', bar: 'bg-emerald-400', label: 'Révision' },
};
type View = 'semaine' | 'mois';
const todayISO = () => format(new Date(), 'yyyy-MM-dd');
const plannedMinOf = (d?: ProgramDay) => d?.blocks.reduce((s, b) => s + b.estMin, 0) ?? 0;
const isTaperDay = (d?: ProgramDay) => !!d?.blocks.some((b) => b.phase === 'taper');

export function ProgramPage() {
  const config = useProgramConfig();
  const cases = useCases();
  const sims = useSimulations();
  const begriffe = useFachbegriffe();
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View>('semaine');
  const [anchor, setAnchor] = useState<string>(todayISO());   // période affichée dans le calendrier
  const [selected, setSelected] = useState<string>(todayISO()); // jour au focus (surface du jour)
  const dayRef = useRef<HTMLDivElement>(null);
  const scrollToDay = () => setTimeout(() => dayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  const focusDay = (d: string) => { setSelected(d); setAnchor(d); scrollToDay(); };

  // Horizon : couvrir tout le programme jusqu'à l'examen (borné), pour que la
  // navigation semaine/mois ait toujours du contenu à montrer.
  const horizon = useMemo(() => {
    if (!config) return 40;
    return Math.min(200, Math.max(40, differenceInCalendarDays(programEnd(config), new Date()) + 1));
  }, [config]);

  const days = useMemo(() => {
    if (!config || !cases || !sims || !begriffe) return [];
    return generateProgram(config, { cases, sims, begriffe }, horizon);
  }, [config, cases, sims, begriffe, horizon]);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const stats = useMemo(() => (config && cases && sims && begriffe ? programStats(config, { cases, sims, begriffe }) : null), [config, cases, sims, begriffe]);
  const disciplines = useMemo(() => (config && cases && sims ? disciplineStats(config, cases, sims) : []), [config, cases, sims]);

  if (config === undefined || !cases || !sims || !begriffe) return <div className="text-slate-400">Chargement…</div>;
  if (config === null) {
    return (
      <>
        <EmptyState icon="nav-calendar" title="Aucun programme encore" hint="Configure ta préparation pour obtenir un plan quotidien adaptatif." />
        <ProgramSetup onDone={() => { /* la live-query rafraîchit automatiquement */ }} />
      </>
    );
  }
  if (editing) return <ProgramSetup initial={config} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;

  const end = programEnd(config);
  const readiness = cases.length ? Math.round(100 * (1 - (stats?.backlogUnits ?? 0) / (cases.length * 3))) : 0;
  // Prochaines échéances clés : simulations + examens à blanc à venir (hors aujourd'hui).
  const upcoming = days
    .flatMap((d) => d.blocks.filter((b) => b.kind === 'simulation' || b.id?.startsWith('mock:')).map((b) => ({ date: d.date, b })))
    .filter((x) => x.date > todayISO()).slice(0, 6);

  return (
    <div className="space-y-6">
      <style>{`@keyframes progFade{from{opacity:0;transform:translateY(6px) scale(.994)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){.prog-anim{animation:none!important}}`}</style>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programme</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Objectif : {config.examDate ? `examen le ${format(end, 'd MMM yyyy', { locale: fr })}` : `${config.weeks} semaines`}
            {stats?.daysUntilExam != null && <> · <b className="text-brand-600 dark:text-brand-300">J-{stats.daysUntilExam}</b></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IntensitySwitch value={config.intensity} onChange={(i) => setIntensity(config, i)} />
          <button onClick={() => { if (confirm('Réinitialiser tous les ajustements manuels (tâches faites, reports, révisions ajoutées) ?')) resetAdjust(config); }}
            className="btn-ghost text-sm" title="Repartir d'un plan propre">↻</button>
          <button onClick={() => setEditing(true)} className="btn-outline gap-1.5 text-sm"><Icon name="gear" className="h-4 w-4" />Ajuster</button>
        </div>
      </header>

      {/* Bandeau de sérénité — état honnête + prochaine action, jamais culpabilisant */}
      {stats && <SerenityBanner stats={stats} readiness={readiness} hasExam={config.examDate != null} onFocusToday={() => focusDay(todayISO())} />}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard icon="flame" label="Assiduité" value={`${stats.adherencePct}%`} sub={`${stats.workedDays}/${stats.plannedDaysElapsed} jours`} />
          <StatCard icon="clock" label="Temps investi" value={`${Math.floor(stats.totalSpentMin / 60)}h${String(stats.totalSpentMin % 60).padStart(2, '0')}`} sub="cumulé" />
          <StatCard icon="target" label="Reste à couvrir" value={`${stats.backlogUnits}`} sub="couches de cas" />
          <StatCard icon="gauge" label="Prêt·e" value={`${readiness}%`} sub="couches faites" />
        </div>
      )}

      {/* Surface d'édition du JOUR sélectionné — c'est ici qu'on agit */}
      <div ref={dayRef} className="scroll-mt-24">
        <DaySection day={byDate.get(selected)} date={selected} onPick={focusDay} config={config} cases={cases} />
      </div>

      {/* Où le plan met l'accent — rend visible le raisonnement adaptatif */}
      {disciplines.length > 0 && <DisciplinePanel stats={disciplines} />}

      {/* Calendrier navigable — zoom Mois → Semaine → Jour, période paginable */}
      <Calendar
        view={view} setView={setView} anchor={anchor} setAnchor={setAnchor}
        byDate={byDate} selected={selected}
        onFocusDay={focusDay}
        onZoomToDay={(d) => { setView('semaine'); setAnchor(d); setSelected(d); }}
        end={end}
      />

      {/* Prochaines échéances — agenda clair des simulations et examens à blanc */}
      {upcoming.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="clock" className="h-5 w-5 text-brand-500" /> Prochaines échéances</h2>
          <div className="space-y-2">
            {upcoming.map(({ date, b }, i) => {
              const meta = BLOCK_META[b.kind];
              const inDays = differenceInCalendarDays(parseISO(date), new Date());
              return (
                <Link key={i} to={b.caseId ? `/simulation/${b.caseId}/pre` : '/cas'}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-brand-400 dark:border-slate-800">
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-sm font-bold capitalize leading-tight">{format(parseISO(date), 'EEE', { locale: fr })}</div>
                    <div className="text-[11px] text-slate-400">{format(parseISO(date), 'd MMM', { locale: fr })}</div>
                  </div>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}><Icon name={meta.icon} className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.label}</div>
                    {b.reason && <div className="truncate text-[11px] text-slate-400">{b.reason}</div>}
                  </div>
                  {b.layer && <span className="chip shrink-0 bg-slate-100 text-[10px] dark:bg-slate-800">Couche {b.layer}</span>}
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">dans {inDays} j</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="label flex items-center gap-1.5"><Icon name={icon} className="h-3.5 w-3.5 text-brand-500" />{label}</div>
      <div className="mt-1.5 text-2xl font-bold tnum">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

// --- Bandeau de sérénité -----------------------------------------------------
function SerenityBanner({ stats, readiness, hasExam, onFocusToday }: {
  stats: { adherencePct: number; daysUntilExam: number | null; backlogUnits: number; plannedDaysElapsed: number };
  readiness: number; hasExam: boolean; onFocusToday: () => void;
}) {
  // On ne juge l'assiduité qu'après quelques jours planifiés, pour ne pas alarmer au démarrage.
  const behind = stats.plannedDaysElapsed >= 3 && stats.adherencePct < 60;
  const tone = behind
    ? { cls: 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/15 dark:to-orange-900/10 dark:border-amber-900/40', icon: 'nav-compass', iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
        title: 'Léger retard — rien de grave', msg: 'Le plan a déjà rééquilibré tes prochains jours. Concentre-toi sur la séance du jour, une à la fois.' }
    : { cls: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-900/15 dark:to-teal-900/10 dark:border-emerald-900/40', icon: 'check', iconCls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
        title: 'Tu es dans les temps', msg: hasExam ? 'Continue à ce rythme et tu arriveras rodé·e le jour J.' : 'Continue à ce rythme, ta préparation avance bien.' };
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-gradient-to-br p-4 ${tone.cls}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.iconCls}`}><Icon name={tone.icon} className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{tone.title}</div>
        <p className="text-[13px] text-slate-600 dark:text-slate-300">{tone.msg}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-lg font-bold tabular-nums">{readiness}%</div>
          <div className="text-[10px] text-slate-400">Prêt·e</div>
        </div>
        <button onClick={onFocusToday} className="btn-primary shrink-0 px-4 py-2 text-sm">Séance du jour →</button>
      </div>
    </div>
  );
}

// --- Réglage rapide de l'intensité ------------------------------------------
const INTENSITY_META: { id: Intensity; label: string; icon: string }[] = [
  { id: 'leicht', label: 'Léger', icon: 'leaf' }, { id: 'mittel', label: 'Moyen', icon: 'bolt' }, { id: 'intensiv', label: 'Intensif', icon: 'flame' },
];
function IntensitySwitch({ value, onChange }: { value: Intensity; onChange: (i: Intensity) => void }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-ink-700" title="Intensité — ajuste le volume quotidien">
      {INTENSITY_META.map((m) => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 font-medium transition-colors ${value === m.id ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-200' : 'text-slate-500'}`}>
          <Icon name={m.icon} className="h-3.5 w-3.5" /><span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// --- Surface d'édition du jour sélectionné ----------------------------------
function DaySection({ day, date, onPick, config, cases }: {
  day?: ProgramDay; date: string; onPick: (d: string) => void; config: ProgramConfig; cases: Case[];
}) {
  const d = parseISO(date);
  const isToday = date === todayISO();
  const move = (delta: number) => onPick(format(addDays(d, delta), 'yyyy-MM-dd'));
  const [adding, setAdding] = useState(false);
  const blocks = day?.blocks ?? [];
  const plannedMin = plannedMinOf(day);
  const taper = isTaperDay(day);

  return (
    <section className="card overflow-hidden border-brand-200 dark:border-brand-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-brand-50/50 px-4 py-3 dark:border-slate-800 dark:bg-brand-900/10">
        <button onClick={() => move(-1)} className="btn-ghost px-2 text-sm" title="Jour précédent">←</button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="flex items-center justify-center gap-2 font-semibold capitalize">
            {isToday && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
            {format(d, 'EEEE d MMMM', { locale: fr })}
            {isToday && <span className="chip bg-brand-600 py-0 text-[10px] text-white">Aujourd'hui</span>}
            {taper && <span className="chip bg-amber-500 py-0 text-[10px] text-white"><Icon name="target" className="h-2.5 w-2.5" /> Dernière ligne droite</span>}
          </h2>
          <div className="text-[11px] text-slate-400">
            {day?.isOff ? 'Jour off — repos' : plannedMin > 0 ? `${blocks.length} tâche${blocks.length > 1 ? 's' : ''} · ~${plannedMin} min` : 'Rien de prévu'}
            {day?.worked && <span className="ml-1.5 text-emerald-500">· ✓ travaillé</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isToday && <button onClick={() => onPick(todayISO())} className="btn-ghost px-2 text-xs" title="Revenir à aujourd'hui"><Icon name="target" className="h-3.5 w-3.5" /></button>}
          <button onClick={() => move(1)} className="btn-ghost px-2 text-sm" title="Jour suivant">→</button>
        </div>
      </div>

      <div className="p-4">
        {blocks.length > 0 ? (
          <div className="space-y-2">{blocks.map((b, i) => <BlockRow key={b.id ?? i} b={b} date={date} config={config} onPick={onPick} />)}</div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">{day?.isOff ? 'Jour off programmé — récupère bien.' : 'Aucune tâche planifiée ce jour.'}</p>
        )}

        {adding ? (
          <AddRevision cases={cases} onAdd={(c) => {
            addExtra(config, { date, kind: 'revision', label: `Révision : ${c.name}`, caseId: c.id, specialty: c.specialty, estMin: 20 });
            setAdding(false);
          }} onCancel={() => setAdding(false)} />
        ) : (
          <button onClick={() => setAdding(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-300 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-900/10">
            <span className="text-base leading-none">+</span> Ajouter une révision ce jour
          </button>
        )}
      </div>
    </section>
  );
}

// --- Panneau « Où le plan met l'accent » (par discipline) -------------------
const PRIO_META: Record<DisciplineStat['priority'], { label: string; cls: string }> = {
  haute: { label: 'Priorité haute', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  moyenne: { label: 'Moyenne', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  basse: { label: 'Maîtrisée', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};
function DisciplinePanel({ stats }: { stats: DisciplineStat[] }) {
  return (
    <section className="card p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="brain" className="h-5 w-5 text-brand-500" />
        <h2 className="font-semibold">Où le plan met l'accent</h2>
      </div>
      <p className="mb-3 text-[11px] text-slate-400">Le plan se recalcule seul selon ton avancement et tes scores par discipline — les disciplines faibles ou prioritaires passent devant.</p>
      <div className="space-y-2.5">
        {stats.map((s) => {
          const pct = Math.round((s.layersDone / s.layersTotal) * 100);
          return (
            <div key={s.specialty} className="flex items-center gap-3">
              <div className="w-32 shrink-0 truncate text-sm font-medium" title={s.specialty}>{s.specialty}</div>
              <div className="min-w-0 flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
                </div>
              </div>
              <div className="w-10 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{pct}%</div>
              <div className="w-14 shrink-0 text-right text-[11px] tabular-nums">
                {s.avgScore != null ? <span className={s.avgScore >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{s.avgScore}%</span> : <span className="text-slate-300">—</span>}
              </div>
              <span className={`chip shrink-0 hidden py-0 text-[9px] sm:inline ${PRIO_META[s.priority].cls}`}>{PRIO_META[s.priority].label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-slate-400">
        <span>Barre = couches faites</span><span>Chiffre coloré = score moyen</span>
      </div>
    </section>
  );
}

// --- Légende des types de blocs ---------------------------------------------
function Legend() {
  return (
    <div className="hidden items-center gap-3 text-[11px] text-slate-400 sm:flex">
      {(['simulation', 'revision', 'fachwissen', 'drill'] as ProgramBlock['kind'][]).map((k) => (
        <span key={k} className="flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm ${BLOCK_META[k].bar}`} />{BLOCK_META[k].label}
        </span>
      ))}
    </div>
  );
}

export function AddRevision({ cases, onAdd, onCancel }: { cases: Case[]; onAdd: (c: Case) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const list = cases.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-900/10">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold">Réviser quel cas ?</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-rose-500">✕</button>
      </div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer un cas…"
        className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900" />
      <div className="space-y-1">
        {list.map((c) => (
          <button key={c.id} onClick={() => onAdd(c)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white dark:hover:bg-slate-800">
            <Icon name="history" className="h-4 w-4 text-slate-400" /><span className="flex-1 truncate">{c.name}</span><span className="text-slate-300">+</span>
          </button>
        ))}
        {list.length === 0 && <p className="px-2 py-1 text-xs text-slate-400">Aucun cas.</p>}
      </div>
    </div>
  );
}

export function BlockRow({ b, date, config, onPick }: { b: ProgramBlock; date: string; config: ProgramConfig; onPick: (d: string) => void }) {
  const meta = BLOCK_META[b.kind];
  const to = b.kind === 'simulation' && b.caseId ? `/simulation/${b.caseId}/pre` : b.kind === 'drill' ? '/fachbegriffe/drill' : b.caseId ? `/cas/${b.caseId}` : '/simulation';
  const cta = b.kind === 'simulation' ? 'Lancer' : b.kind === 'drill' ? 'Réviser' : 'Ouvrir';
  const doneNextDay = (days: number) => { if (b.caseId) postponeCase(config, b.caseId, days); onPick(format(addDays(parseISO(date), days), 'yyyy-MM-dd')); };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}><Icon name={meta.icon} className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{b.label}{b.manual && <span className="ml-1 rounded bg-brand-100 px-1 text-[10px] font-bold text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">Ajouté</span>}</div>
          {/* Micro-raison — transparence : pourquoi cette tâche, aujourd'hui */}
          {b.reason && <div className="truncate text-[11px] text-slate-400">{b.reason}</div>}
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            {meta.label} · {b.estMin} min
            {b.layer && <span className="chip py-0 text-[10px] bg-slate-100 dark:bg-slate-800">Couche {b.layer} · {b.assistance === 'assiste' ? 'Assisté' : 'Autonome'}</span>}
          </div>
        </div>
        <Link to={to} className="btn-primary shrink-0 gap-1 px-3 py-1.5 text-xs"><Icon name="play" className="h-3 w-3" />{cta}</Link>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-1.5 dark:border-slate-800">
        {b.kind === 'simulation' && b.caseId && b.layer && (
          <>
            <ActionBtn icon="✓" label="Fait" tone="emerald" onClick={() => markLayerDone(config, b.caseId!, b.layer!)} title="Marquer fait — le plan se réajuste" />
            <ReporterMenu onPick={doneNextDay} />
          </>
        )}
        {b.kind === 'drill' && (
          <ActionBtn icon="✕" label="Sauter aujourd'hui" tone="rose" onClick={() => toggleSkipDrill(config, date)} title="Annuler le drill de ce jour" />
        )}
        {b.manual && b.id && (
          <ActionBtn icon="✕" label="Retirer" tone="rose" onClick={() => removeExtra(config, b.id!)} title="Retirer cette tâche ajoutée" />
        )}
        {b.kind === 'revision' && !b.manual && (
          <span className="text-[11px] text-slate-400">Répétition générale — conditions réelles</span>
        )}
        {b.kind === 'fachwissen' && (
          <span className="text-[11px] text-slate-400">Théorie liée au cas</span>
        )}
      </div>
    </div>
  );
}

const ACTION_TONE = {
  emerald: 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20',
  amber: 'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20',
  rose: 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20',
  slate: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
};
function ActionBtn({ icon, label, tone, onClick, title }: { icon: string; label: string; tone: keyof typeof ACTION_TONE; onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${ACTION_TONE[tone]}`}>
      <span>{icon}</span>{label}
    </button>
  );
}

function ReporterMenu({ onPick }: { onPick: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  const opts = [{ label: 'Demain', d: 1 }, { label: 'Dans 2 jours', d: 2 }, { label: 'Semaine prochaine', d: 7 }];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${ACTION_TONE.amber}`} title="Reporter cette tâche">
        <span>⤳</span>Reporter <span className="text-[9px]">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {opts.map((o) => (
              <button key={o.d} onClick={() => { onPick(o.d); setOpen(false); }} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                {o.label} <span className="text-slate-400">(+{o.d}j)</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ====================================================================== CALENDRIER
// Un seul composant navigable : période paginable (◀ ▶), bascule fluide Semaine/Mois
// façon zoom, et clic sur un jour qui « zoome » vers le jour (surface du haut).
function Calendar({ view, setView, anchor, setAnchor, byDate, selected, onFocusDay, onZoomToDay, end }: {
  view: View; setView: (v: View) => void; anchor: string; setAnchor: (d: string) => void;
  byDate: Map<string, ProgramDay>; selected: string;
  onFocusDay: (d: string) => void; onZoomToDay: (d: string) => void; end: Date;
}) {
  const a = parseISO(anchor);
  const step = (dir: 1 | -1) => setAnchor(format(view === 'semaine' ? addWeeks(a, dir) : addMonths(a, dir), 'yyyy-MM-dd'));
  const periodLabel = view === 'semaine'
    ? `Semaine du ${format(startOfWeek(a, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}`
    : format(a, 'MMMM yyyy', { locale: fr });

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="btn-ghost px-2 text-sm" title="Période précédente">◀</button>
          <div className="min-w-[9.5rem] text-center text-sm font-semibold capitalize">{periodLabel}</div>
          <button onClick={() => step(1)} className="btn-ghost px-2 text-sm" title="Période suivante">▶</button>
          <button onClick={() => setAnchor(todayISO())} className="btn-ghost ml-1 px-2 text-xs" title="Revenir à aujourd'hui">Aujourd'hui</button>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
            {(['semaine', 'mois'] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${view === v ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      </div>
      <div key={`${view}-${anchor}`} className="prog-anim" style={{ animation: 'progFade .22s ease' }}>
        {view === 'semaine'
          ? <WeekView anchor={a} byDate={byDate} selected={selected} onPick={onFocusDay} />
          : <MonthView anchor={a} byDate={byDate} selected={selected} onZoom={onZoomToDay} end={end} />}
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">
        {view === 'mois' ? 'Clique un jour pour zoomer sur sa semaine' : 'Clique un jour pour ouvrir sa séance en haut'}
      </p>
    </section>
  );
}

// Petite barre de charge segmentée par type de tâche — lit la « nature » du jour.
function LoadBar({ day, target, height = 'h-1.5' }: { day?: ProgramDay; target: number; height?: string }) {
  if (!day || day.isOff || day.blocks.length === 0) return null;
  const byKind = new Map<ProgramBlock['kind'], number>();
  for (const b of day.blocks) byKind.set(b.kind, (byKind.get(b.kind) ?? 0) + b.estMin);
  const planned = plannedMinOf(day);
  const fill = Math.max(12, Math.min(100, Math.round((planned / Math.max(target, 1)) * 100)));
  return (
    <div className={`flex ${height} overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800`} style={{ width: `${fill}%` }} title={`~${planned} min`}>
      {[...byKind].map(([k, min]) => (
        <div key={k} className={BLOCK_META[k].bar} style={{ width: `${(min / planned) * 100}%` }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Vue Semaine
function WeekView({ anchor, byDate, selected, onPick }: { anchor: Date; byDate: Map<string, ProgramDay>; selected: string; onPick: (d: string) => void }) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {week.map((date) => {
        const k = format(date, 'yyyy-MM-dd');
        const d = byDate.get(k);
        const today = isSameDay(date, new Date());
        const isSel = k === selected;
        const kinds = new Set((d?.blocks ?? []).map((b) => b.kind));
        const count = d?.blocks.length ?? 0;
        const taper = isTaperDay(d);
        return (
          <button key={k} onClick={() => onPick(k)}
            className={`card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400 ${isSel ? 'border-brand-500 ring-1 ring-brand-400' : today ? 'ring-1 ring-brand-300' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold capitalize">{format(date, 'EEE d', { locale: fr })}</div>
              {d?.isOff ? <span className="text-[11px] text-slate-400">off</span> : d?.worked ? <span className="text-xs text-emerald-500">✓</span> : taper ? <Icon name="target" className="h-3.5 w-3.5 text-amber-500" title="Dernière ligne droite" /> : null}
            </div>
            {!d?.isOff && (
              <>
                <div className="mt-2"><LoadBar day={d} target={d?.targetMin ?? 120} /></div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    {[...kinds].slice(0, 4).map((kk) => (
                      <span key={kk} title={BLOCK_META[kk].label} className={`flex h-5 w-5 items-center justify-center rounded ${BLOCK_META[kk].badge}`}><Icon name={BLOCK_META[kk].icon} className="h-3 w-3" /></span>
                    ))}
                    {count === 0 && <span className="text-[11px] text-slate-400">—</span>}
                  </div>
                  {count > 0 && <span className="text-[11px] font-medium text-slate-400">{count} tâche{count > 1 ? 's' : ''}</span>}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Vue Mois
function MonthView({ anchor, byDate, selected, onZoom, end }: { anchor: Date; byDate: Map<string, ProgramDay>; selected: string; onZoom: (d: string) => void; end: Date }) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const examISO = format(end, 'yyyy-MM-dd');
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const k = format(date, 'yyyy-MM-dd');
          const d = byDate.get(k);
          const today = isSameDay(date, new Date());
          const isSel = k === selected;
          const inMonth = isSameMonth(date, monthStart);
          const count = d?.blocks.length ?? 0;
          const isExam = k === examISO;
          const taper = isTaperDay(d);
          const kinds = [...new Set((d?.blocks ?? []).map((b) => b.kind))];
          return (
            <button key={k} onClick={() => onZoom(k)}
              className={`flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-400
                ${isSel ? 'border-brand-500 ring-1 ring-brand-400' : today ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20' : taper ? 'border-amber-200 dark:border-amber-900/40' : 'border-slate-100 dark:border-slate-800'}
                ${inMonth ? '' : 'opacity-40'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${today ? 'text-brand-600 dark:text-brand-300' : ''}`}>{format(date, 'd')}</span>
                {isExam ? <Icon name="flag" className="h-3.5 w-3.5 text-signal-500" title="Jour de l'examen" /> : d?.worked ? <span className="text-[10px] text-emerald-500">✓</span> : taper ? <Icon name="target" className="h-3 w-3 text-amber-500" /> : null}
              </div>
              {d?.isOff ? (
                <div className="mt-auto text-[9px] text-slate-400">off</div>
              ) : count > 0 ? (
                <div className="mt-auto space-y-1">
                  <LoadBar day={d} target={d?.targetMin ?? 120} height="h-1" />
                  <div className="flex items-center gap-0.5">
                    {kinds.slice(0, 3).map((kk) => <span key={kk} className={`h-1.5 w-1.5 rounded-full ${BLOCK_META[kk].bar}`} title={BLOCK_META[kk].label} />)}
                    <span className="ml-auto text-[10px] font-medium text-slate-400">{count}</span>
                  </div>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
