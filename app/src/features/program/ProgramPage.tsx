import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  format, parseISO, isSameDay, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, addDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCases, useSimulations, useFachbegriffe, useProgramConfig } from '@/hooks/useData';
import { generateProgram, programStats, programEnd } from '@/lib/program';
import type { ProgramBlock, ProgramDay } from '@/db/types';
import { ProgramSetup } from './ProgramSetup';
import { Icon } from '@/components/icons';
import { ScoreBar, EmptyState } from '@/components/ui';

const BLOCK_META: Record<ProgramBlock['kind'], { icon: string; badge: string; label: string }> = {
  simulation: { icon: 'stethoscope', badge: 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300', label: 'Simulation' },
  drill: { icon: 'id', badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300', label: 'Drill' },
  fachwissen: { icon: 'brain', badge: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', label: 'Fachwissen' },
  aufklaerung: { icon: 'syringe', badge: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300', label: 'Aufklärung' },
  revision: { icon: 'history', badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', label: 'Révision' },
};
type View = 'jour' | 'semaine' | 'mois';

export function ProgramPage() {
  const config = useProgramConfig();
  const cases = useCases();
  const sims = useSimulations();
  const begriffe = useFachbegriffe();
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<View>('semaine');
  const [selected, setSelected] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const days = useMemo(() => {
    if (!config || !cases || !sims || !begriffe) return [];
    return generateProgram(config, { cases, sims, begriffe }, 40);
  }, [config, cases, sims, begriffe]);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const stats = useMemo(() => (config && cases && sims && begriffe ? programStats(config, { cases, sims, begriffe }) : null), [config, cases, sims, begriffe]);

  if (config === undefined || !cases || !sims || !begriffe) return <div className="text-slate-400">Chargement…</div>;
  if (config === null) {
    return (
      <>
        <EmptyState icon="🗓️" title="Aucun programme encore" hint="Configure ta préparation pour obtenir un plan quotidien adaptatif." />
        <ProgramSetup onDone={() => { /* la live-query rafraîchit automatiquement */ }} />
      </>
    );
  }
  if (editing) return <ProgramSetup onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;

  const end = programEnd(config);
  // Prévision : prochaines simulations à venir (hors aujourd'hui).
  const upcoming = days.flatMap((d) => d.blocks.filter((b) => b.kind === 'simulation').map((b) => ({ date: d.date, b })))
    .filter((x) => x.date > format(new Date(), 'yyyy-MM-dd')).slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programme</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Objectif : {config.examDate ? `examen le ${format(end, 'd MMM yyyy', { locale: fr })}` : `${config.weeks} semaines`}
            {stats?.daysUntilExam != null && <> · <b className="text-brand-600 dark:text-brand-300">J-{stats.daysUntilExam}</b></>}
          </p>
        </div>
        <button onClick={() => setEditing(true)} className="btn-outline text-sm">⚙️ Ajuster</button>
      </header>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard icon="🔥" label="Assiduité" value={`${stats.adherencePct}%`} sub={`${stats.workedDays}/${stats.plannedDaysElapsed} jours`} />
          <StatCard icon="⏱️" label="Temps investi" value={`${Math.floor(stats.totalSpentMin / 60)}h${String(stats.totalSpentMin % 60).padStart(2, '0')}`} sub="cumulé" />
          <StatCard icon="🎯" label="Reste à couvrir" value={`${stats.backlogUnits}`} sub="couches de cas" />
          <StatCard icon="📚" label="Cas au programme" value={`${cases.length}`} sub="× 3 couches" />
        </div>
      )}

      {/* Sélecteur de vue */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
          {(['jour', 'semaine', 'mois'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 font-medium capitalize ${view === v ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'jour' && <DayView day={byDate.get(selected)} date={selected} onPick={setSelected} />}
      {view === 'semaine' && <WeekView byDate={byDate} selected={selected} onPick={(d) => { setSelected(d); setView('jour'); }} />}
      {view === 'mois' && <MonthView byDate={byDate} onPick={(d) => { setSelected(d); setView('jour'); }} />}

      {/* Prévision */}
      {upcoming.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">🔮 À venir</h2>
          <div className="space-y-2">
            {upcoming.map(({ date, b }, i) => (
              <Link key={i} to={b.caseId ? `/simulation/${b.caseId}/pre` : '/cas'} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:border-brand-400 dark:border-slate-800">
                <span className="w-16 shrink-0 text-xs font-medium text-slate-400">{format(parseISO(date), 'EEE d', { locale: fr })}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${BLOCK_META.simulation.badge}`}><Icon name="stethoscope" className="h-4 w-4" /></span>
                <span className="flex-1 text-sm">{b.label}</span>
                {b.layer && <span className="chip bg-slate-100 text-[10px] dark:bg-slate-800">Couche {b.layer}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">{icon} {label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

// ------------------------------------------------------------------- Vue Jour
function DayView({ day, date, onPick }: { day?: ProgramDay; date: string; onPick: (d: string) => void }) {
  const d = parseISO(date);
  const move = (delta: number) => onPick(format(addDays(d, delta), 'yyyy-MM-dd'));
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-brand-50/50 px-5 py-3 dark:border-slate-800 dark:bg-brand-900/10">
        <button onClick={() => move(-1)} className="btn-ghost text-xs">←</button>
        <h2 className="font-semibold capitalize">{format(d, 'EEEE d MMMM', { locale: fr })}</h2>
        <button onClick={() => move(1)} className="btn-ghost text-xs">→</button>
      </div>
      <div className="p-4">
        {day && day.blocks.length > 0 ? (
          <div className="space-y-2">{day.blocks.map((b, i) => <BlockRow key={i} b={b} />)}</div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">{day?.isOff ? 'Jour off programmé 🌙 — récupère !' : 'Rien de prévu ce jour.'}</p>
        )}
      </div>
    </section>
  );
}

function BlockRow({ b }: { b: ProgramBlock }) {
  const meta = BLOCK_META[b.kind];
  const to = b.kind === 'simulation' && b.caseId ? `/simulation/${b.caseId}/pre` : b.kind === 'drill' ? '/fachbegriffe/drill' : b.caseId ? `/cas/${b.caseId}` : '/cas';
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-brand-400 dark:border-slate-800">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}><Icon name={meta.icon} className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{b.label}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {meta.label} · {b.estMin} min
          {b.layer && <span className="chip py-0 text-[10px] bg-slate-100 dark:bg-slate-800">Couche {b.layer} · {b.assistance === 'assiste' ? 'Assisté' : 'Autonome'}</span>}
        </div>
      </div>
      <span className="shrink-0 text-slate-300">▶</span>
    </Link>
  );
}

// ---------------------------------------------------------------- Vue Semaine
function WeekView({ byDate, selected, onPick }: { byDate: Map<string, ProgramDay>; selected: string; onPick: (d: string) => void }) {
  const start = startOfWeek(parseISO(selected), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {week.map((date) => {
        const k = format(date, 'yyyy-MM-dd');
        const d = byDate.get(k);
        const today = isSameDay(date, new Date());
        const planned = d?.blocks.reduce((s, b) => s + b.estMin, 0) ?? 0;
        const pct = planned ? Math.min(100, Math.round((d!.spentMin / planned) * 100)) : d?.worked ? 100 : 0;
        return (
          <button key={k} onClick={() => onPick(k)} className={`card p-3 text-left transition-all hover:border-brand-400 ${today ? 'ring-1 ring-brand-400' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold capitalize">{format(date, 'EEE d', { locale: fr })}</div>
              {d?.isOff ? <span className="text-xs text-slate-400">off 🌙</span> : d?.worked ? <span className="text-xs text-emerald-500">✓</span> : null}
            </div>
            {!d?.isOff && (
              <>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(d?.blocks ?? []).slice(0, 6).map((b, i) => (
                    <span key={i} title={b.label} className={`flex h-6 w-6 items-center justify-center rounded ${BLOCK_META[b.kind].badge}`}><Icon name={BLOCK_META[b.kind].icon} className="h-3.5 w-3.5" /></span>
                  ))}
                  {(!d || d.blocks.length === 0) && <span className="text-[11px] text-slate-400">—</span>}
                </div>
                {planned > 0 && <div className="mt-2"><ScoreBar pct={pct} showValue={false} /></div>}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Vue Mois
function MonthView({ byDate, onPick }: { byDate: Map<string, ProgramDay>; onPick: (d: string) => void }) {
  const monthStart = startOfMonth(new Date());
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  return (
    <div className="card p-4">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-slate-400">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const k = format(date, 'yyyy-MM-dd');
          const d = byDate.get(k);
          const today = isSameDay(date, new Date());
          const inMonth = isSameMonth(date, monthStart);
          const sims = d?.blocks.filter((b) => b.kind === 'simulation').length ?? 0;
          return (
            <button key={k} onClick={() => onPick(k)}
              className={`min-h-[52px] rounded-lg border p-1.5 text-left transition-colors hover:border-brand-400 ${today ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-100 dark:border-slate-800'} ${inMonth ? '' : 'opacity-40'}`}>
              <div className="text-[11px] font-medium">{format(date, 'd')}</div>
              {d && !d.isOff && sims > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {Array.from({ length: Math.min(sims, 3) }).map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-brand-500" />)}
                </div>
              )}
              {d?.isOff && <div className="mt-1 text-[9px] text-slate-400">off</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
